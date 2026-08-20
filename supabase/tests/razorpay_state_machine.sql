begin;

select plan(12);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values (
  '00000000-0000-0000-0000-000000000091'::uuid,
  'authenticated',
  'authenticated',
  'razorpay-state-machine@example.test',
  '',
  now(),
  '{}'::jsonb,
  '{}'::jsonb,
  now(),
  now()
);

select is(
  public.apply_razorpay_subscription_event(
    'evt-created-1', 'subscription.created', 100,
    '00000000-0000-0000-0000-000000000091'::uuid,
    'cust_state_machine', 'sub_state_machine', 'created', 'free', null, false
  ),
  'applied',
  'checkout-created subscription mapping is applied'
);

select is(
  (select status from public.user_subscriptions where user_id = '00000000-0000-0000-0000-000000000091'::uuid),
  'free',
  'pre-payment subscription remains free'
);

select is(
  public.apply_razorpay_subscription_event(
    'evt-created-1', 'subscription.created', 100,
    '00000000-0000-0000-0000-000000000091'::uuid,
    'cust_state_machine', 'sub_state_machine', 'created', 'free', null, false
  ),
  'duplicate',
  'duplicate provider event is idempotent'
);

select is(
  public.apply_razorpay_subscription_event(
    'evt-active-1', 'subscription.activated', 200,
    null,
    'cust_state_machine', 'sub_state_machine', 'active', 'pro', '2030-01-01T00:00:00Z'::timestamptz, false
  ),
  'applied',
  'activation webhook upgrades entitlement'
);

select is(
  (select status from public.user_subscriptions where razorpay_subscription_id = 'sub_state_machine'),
  'pro',
  'active subscription is Pro'
);

select is(
  public.apply_razorpay_subscription_event(
    'evt-stale-cancel', 'subscription.cancelled', 150,
    null,
    'cust_state_machine', 'sub_state_machine', 'cancelled', 'free', null, false
  ),
  'stale',
  'out-of-order older cancellation is rejected as stale'
);

select is(
  (select razorpay_status from public.user_subscriptions where razorpay_subscription_id = 'sub_state_machine'),
  'active',
  'stale webhook cannot roll back provider state'
);

select is(
  public.apply_razorpay_subscription_event(
    'evt-scheduled-cancel', 'subscription.updated', 250,
    null,
    'cust_state_machine', 'sub_state_machine', 'active', 'pro', '2030-01-01T00:00:00Z'::timestamptz, true
  ),
  'applied',
  'scheduled cancellation is applied without early downgrade'
);

select ok(
  (select status = 'pro' and cancel_at_period_end is true from public.user_subscriptions where razorpay_subscription_id = 'sub_state_machine'),
  'scheduled cancellation preserves Pro through current period'
);

select is(
  public.apply_razorpay_subscription_event(
    'evt-cancelled-final', 'subscription.cancelled', 300,
    null,
    'cust_state_machine', 'sub_state_machine', 'cancelled', 'free', null, false
  ),
  'applied',
  'final cancellation/downgrade is applied'
);

select ok(
  (select status = 'free' and razorpay_status = 'cancelled' and cancel_at_period_end is false from public.user_subscriptions where razorpay_subscription_id = 'sub_state_machine'),
  'cancelled subscription is downgraded to Free'
);

select is(
  (select count(*)::int from public.razorpay_webhook_events where event_id like 'evt-%'),
  5,
  'unique applied and stale events are durably recorded once'
);

select * from finish();
rollback;
