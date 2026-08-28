\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values (
  '30000000-0000-0000-0000-000000000001',
  'authenticated', 'authenticated', 'first-login.fixture@example.invalid',
  'temporary-hash', now(), '{}'::jsonb, '{}'::jsonb, now(), now()
);

update public.profiles
set auth_user_id = '30000000-0000-0000-0000-000000000001',
    account_status = 'active',
    must_change_password = true,
    temporary_password_set_at = now(),
    password_changed_at = null
where employee_code = 'EVAR-ELEC';

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_gate jsonb;
begin
  v_gate := public.get_my_auth_gate();
  if coalesce((v_gate ->> 'must_change_password')::boolean, false) is not true then
    raise exception 'First-login gate is not exposed to the authenticated account';
  end if;
  if public.current_profile_id() is not null then
    raise exception 'Locked profile unexpectedly received business access';
  end if;
  if public.has_role('field_agent') or public.has_permission('upload_vendor_intervention_report') then
    raise exception 'Locked profile retained business permissions';
  end if;
end;
$$;

reset role;
update auth.users
set encrypted_password = 'changed-hash', updated_at = now()
where id = '30000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '30000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_gate jsonb;
begin
  v_gate := public.get_my_auth_gate();
  if coalesce((v_gate ->> 'must_change_password')::boolean, true) is not false then
    raise exception 'Profile was not unlocked after an actual Auth password update';
  end if;
  if public.current_profile_id() is null or not public.has_role('field_agent') then
    raise exception 'Business access was not restored after password change';
  end if;
  if (v_gate ->> 'password_changed_at') is null then
    raise exception 'Password change proof timestamp is missing';
  end if;
end;
$$;

reset role;
select extensions.pass('first-login gate blocks RLS and unlocks only after an auth password change');
select * from extensions.finish();
rollback;
