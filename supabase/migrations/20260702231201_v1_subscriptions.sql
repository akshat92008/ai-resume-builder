-- Phase 6: Subscriptions and Stripe
create table if not exists public.user_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  status text not null default 'free', -- 'free', 'pro'
  current_period_end timestamptz,
  cancel_at_period_end boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_subscriptions enable row level security;

do $$ begin
  create policy "Users can read their own subscription" on public.user_subscriptions for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;
