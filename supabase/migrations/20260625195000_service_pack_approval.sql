-- Migration: service_pack_approval
-- Conditionally update profiles.plan based on the order plan type to support manual service packs.

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
  select * into v_order from public.orders where id = p_order_id;
  
  if not found then
    raise exception 'Order not found.';
  end if;

  if v_order.status = any(v_invalid_statuses) then
    raise exception 'Cannot approve order with status: %', v_order.status;
  end if;
  
  if not (v_order.status = any(v_allowed_statuses)) then
    raise exception 'Invalid order status: %', v_order.status;
  end if;

  if v_order.user_id is null then
    raise exception 'Order must belong to a user.';
  end if;

  -- Only update profile plan for subscription/access plans
  if v_order.plan = any(array['pro', 'lifetime', 'college']) then
    update public.profiles
    set 
      plan = v_order.plan,
      plan_status = 'active',
      updated_at = now()
    where id = v_order.user_id;

    if not found then
      raise exception 'Profile for user % not found.', v_order.user_id;
    end if;
  end if;

  update public.orders
  set 
    status = 'approved',
    approved_at = now(),
    approved_by = p_admin_id,
    updated_at = now()
  where id = p_order_id;

  select * into v_order from public.orders where id = p_order_id;
  
  return to_jsonb(v_order);
end;
$$;

revoke execute on function public.approve_order_and_update_plan(text, uuid) from public, anon, authenticated;
grant execute on function public.approve_order_and_update_plan(text, uuid) to service_role;
