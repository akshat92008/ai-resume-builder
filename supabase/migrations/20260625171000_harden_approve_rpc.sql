-- Recreate the function with security definer and set search_path
create or replace function public.approve_order_and_update_plan(p_order_id text, p_admin_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_allowed_statuses text[] := array['created', 'pending', 'submitted'];
  v_invalid_statuses text[] := array['approved', 'rejected', 'cancelled', 'failed'];
begin
  -- 1. Fetch the order by id
  select * into v_order from public.orders where id = p_order_id;
  
  -- 2. Raise exception if order does not exist
  if not found then
    raise exception 'Order not found.';
  end if;

  -- 3 & 4. Validate status
  if v_order.status = any(v_invalid_statuses) then
    raise exception 'Cannot approve order with status: %', v_order.status;
  end if;
  
  if not (v_order.status = any(v_allowed_statuses)) then
    raise exception 'Invalid order status: %', v_order.status;
  end if;

  -- 5. Validate order.user_id is not null
  if v_order.user_id is null then
    raise exception 'Order must belong to a user.';
  end if;

  -- 6. Update profiles
  update public.profiles
  set 
    plan = v_order.plan,
    plan_status = 'active',
    updated_at = now()
  where id = v_order.user_id;

  if not found then
    raise exception 'Profile for user % not found.', v_order.user_id;
  end if;

  -- 7. Update orders
  update public.orders
  set 
    status = 'approved',
    approved_at = now(),
    approved_by = p_admin_id,
    updated_at = now()
  where id = p_order_id;

  -- 8. Return the updated order row
  select * into v_order from public.orders where id = p_order_id;
  
  return to_jsonb(v_order);
end;
$$;

-- Revoke execute from all to ensure it's not callable by authenticated or anon
revoke execute on function public.approve_order_and_update_plan(text, uuid) from public, anon, authenticated;

-- Grant execute only to service_role
grant execute on function public.approve_order_and_update_plan(text, uuid) to service_role;
