-- Production billing hardening: durable Stripe webhook idempotency and ordering.

alter table public.user_subscriptions
  add column if not exists last_stripe_event_created bigint not null default 0;

create table if not exists public.stripe_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  result text not null check (result in ('applied', 'stale', 'duplicate')),
  processed_at timestamptz not null default now()
);

alter table public.stripe_webhook_events enable row level security;
revoke all on table public.stripe_webhook_events from anon, authenticated;

create index if not exists idx_stripe_webhook_events_processed_at
  on public.stripe_webhook_events(processed_at desc);

create or replace function public.apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_status text,
  p_current_period_end timestamptz,
  p_cancel_at_period_end boolean
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_result text := 'applied';
begin
  if p_event_id is null or p_event_type is null or p_event_created is null then
    raise exception 'Stripe event metadata is required';
  end if;

  if p_status not in ('free', 'pro') then
    raise exception 'Unsupported subscription status';
  end if;

  if exists (select 1 from public.stripe_webhook_events where event_id = p_event_id) then
    return 'duplicate';
  end if;

  if p_user_id is not null then
    insert into public.user_subscriptions (
      user_id,
      stripe_customer_id,
      stripe_subscription_id,
      status,
      current_period_end,
      cancel_at_period_end,
      last_stripe_event_created,
      updated_at
    ) values (
      p_user_id,
      p_customer_id,
      p_subscription_id,
      p_status,
      p_current_period_end,
      coalesce(p_cancel_at_period_end, false),
      p_event_created,
      now()
    )
    on conflict (user_id) do update set
      stripe_customer_id = excluded.stripe_customer_id,
      stripe_subscription_id = excluded.stripe_subscription_id,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      last_stripe_event_created = excluded.last_stripe_event_created,
      updated_at = now()
    where public.user_subscriptions.last_stripe_event_created <= excluded.last_stripe_event_created;

    if not found then v_result := 'stale'; end if;
  else
    if p_subscription_id is null then
      raise exception 'Stripe subscription id is required';
    end if;

    if not exists (
      select 1 from public.user_subscriptions where stripe_subscription_id = p_subscription_id
    ) then
      -- Do not acknowledge an event before checkout has established the user mapping.
      -- Returning an error keeps the webhook retryable instead of losing billing state.
      raise exception 'Stripe subscription mapping is not ready';
    end if;

    update public.user_subscriptions
      set stripe_customer_id = coalesce(p_customer_id, stripe_customer_id),
          status = p_status,
          current_period_end = p_current_period_end,
          cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
          last_stripe_event_created = p_event_created,
          updated_at = now()
      where stripe_subscription_id = p_subscription_id
        and last_stripe_event_created <= p_event_created;

    if not found then v_result := 'stale'; end if;
  end if;

  insert into public.stripe_webhook_events(event_id, event_type, event_created, result)
  values (p_event_id, p_event_type, p_event_created, v_result);

  return v_result;
end;
$$;

revoke all on function public.apply_stripe_subscription_event(text, text, bigint, uuid, text, text, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_stripe_subscription_event(text, text, bigint, uuid, text, text, text, timestamptz, boolean)
  to service_role;
