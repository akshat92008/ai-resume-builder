-- Razorpay paid-GA persistence and webhook idempotency.

alter table public.user_subscriptions
  add column if not exists razorpay_customer_id text unique,
  add column if not exists razorpay_subscription_id text unique,
  add column if not exists razorpay_status text,
  add column if not exists last_razorpay_event_created bigint not null default 0;

create table if not exists public.razorpay_webhook_events (
  event_id text primary key,
  event_type text not null,
  event_created bigint not null,
  result text not null check (result in ('applied', 'stale', 'duplicate')),
  processed_at timestamptz not null default now()
);

alter table public.razorpay_webhook_events enable row level security;
revoke all on table public.razorpay_webhook_events from anon, authenticated;

create index if not exists idx_razorpay_webhook_events_processed_at
  on public.razorpay_webhook_events(processed_at desc);

create or replace function public.apply_razorpay_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created bigint,
  p_user_id uuid,
  p_customer_id text,
  p_subscription_id text,
  p_provider_status text,
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
    raise exception 'Razorpay event metadata is required';
  end if;

  if p_subscription_id is null then
    raise exception 'Razorpay subscription id is required';
  end if;

  if p_status not in ('free', 'pro') then
    raise exception 'Unsupported subscription status';
  end if;

  if exists (select 1 from public.razorpay_webhook_events where event_id = p_event_id) then
    return 'duplicate';
  end if;

  if p_user_id is not null then
    insert into public.user_subscriptions (
      user_id,
      razorpay_customer_id,
      razorpay_subscription_id,
      razorpay_status,
      status,
      current_period_end,
      cancel_at_period_end,
      last_razorpay_event_created,
      updated_at
    ) values (
      p_user_id,
      p_customer_id,
      p_subscription_id,
      p_provider_status,
      p_status,
      p_current_period_end,
      coalesce(p_cancel_at_period_end, false),
      p_event_created,
      now()
    )
    on conflict (user_id) do update set
      razorpay_customer_id = coalesce(excluded.razorpay_customer_id, public.user_subscriptions.razorpay_customer_id),
      razorpay_subscription_id = excluded.razorpay_subscription_id,
      razorpay_status = excluded.razorpay_status,
      status = excluded.status,
      current_period_end = excluded.current_period_end,
      cancel_at_period_end = excluded.cancel_at_period_end,
      last_razorpay_event_created = excluded.last_razorpay_event_created,
      updated_at = now()
    where public.user_subscriptions.last_razorpay_event_created <= excluded.last_razorpay_event_created;

    if not found then v_result := 'stale'; end if;
  else
    if not exists (
      select 1 from public.user_subscriptions where razorpay_subscription_id = p_subscription_id
    ) then
      raise exception 'Razorpay subscription mapping is not ready';
    end if;

    update public.user_subscriptions
      set razorpay_customer_id = coalesce(p_customer_id, razorpay_customer_id),
          razorpay_status = p_provider_status,
          status = p_status,
          current_period_end = p_current_period_end,
          cancel_at_period_end = coalesce(p_cancel_at_period_end, false),
          last_razorpay_event_created = p_event_created,
          updated_at = now()
      where razorpay_subscription_id = p_subscription_id
        and last_razorpay_event_created <= p_event_created;

    if not found then v_result := 'stale'; end if;
  end if;

  insert into public.razorpay_webhook_events(event_id, event_type, event_created, result)
  values (p_event_id, p_event_type, p_event_created, v_result);

  return v_result;
end;
$$;

revoke all on function public.apply_razorpay_subscription_event(text, text, bigint, uuid, text, text, text, text, timestamptz, boolean)
  from public, anon, authenticated;
grant execute on function public.apply_razorpay_subscription_event(text, text, bigint, uuid, text, text, text, text, timestamptz, boolean)
  to service_role;
