\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'agent.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('10000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'viewer.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles set auth_user_id = '10000000-0000-0000-0000-000000000001', account_status = 'active' where employee_code = 'EVAR-ELEC';
insert into public.profiles(employee_code, display_name, account_status, data_status, source_system, source_notes, auth_user_id)
values ('READ-FIX', 'Lecture seule fixture', 'active', 'confirmed', 'pgTAP', 'Fixture transactionnelle uniquement', '10000000-0000-0000-0000-000000000002');

insert into public.user_roles(profile_id, role_id)
values ((select id from public.profiles where employee_code = 'READ-FIX'), (select id from public.roles where code = 'read_only'));

do $$
begin
  if exists (select 1 from public.roles where code = 'vendor' and is_active) then
    raise exception 'Vendor role must be inactive';
  end if;

  begin
    insert into public.user_roles(profile_id, role_id, vendor_id)
    values (
      (select id from public.profiles where employee_code = 'EVAR-ELEC'),
      (select id from public.roles where code = 'vendor'),
      (select id from public.vendors where code = 'DMC')
    );
    raise exception 'Vendor role assignment unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

insert into public.anomalies(reference, title, description, equipment_id, category_id, priority_id, current_status_id, reported_by_profile_id)
values
  (null, 'TEST RLS GE', 'Visible par Evariste', (select id from public.equipment where code = 'GE-01'), (select id from public.categories where code = 'ELEC'), (select id from public.priority_definitions where code = 'PRIORITY'), (select id from public.status_definitions where code = 'NOUVEAU'), (select id from public.profiles where employee_code = 'EVAR-ELEC')),
  (null, 'TEST RLS WILO', 'Hors périmètre Evariste', (select id from public.equipment where code = 'WILO-01'), (select id from public.categories where code = 'EAU'), (select id from public.priority_definitions where code = 'PRIORITY'), (select id from public.status_definitions where code = 'NOUVEAU'), (select id from public.profiles where employee_code = 'SYL-PLB')),
  (null, 'TEST RLS PRESTATAIRE REFERENCE', 'Entreprise affectée sans compte utilisateur', (select id from public.equipment where code = 'RIA-01'), (select id from public.categories where code = 'INC'), (select id from public.priority_definitions where code = 'PRIORITY'), (select id from public.status_definitions where code = 'NOUVEAU'), (select id from public.profiles where employee_code = 'FAU-FM'));

update public.anomalies set assigned_vendor_id = (select id from public.vendors where code = 'SECURISYS') where title = 'TEST RLS PRESTATAIRE REFERENCE';

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

do $$
declare v_count integer;
begin
  select count(*) into v_count from public.anomalies where title like 'TEST RLS%';
  if v_count <> 1 then raise exception 'Field agent perimeter leak: expected 1 anomaly, got %', v_count; end if;
  if not exists (select 1 from public.anomalies where title = 'TEST RLS GE') then raise exception 'Field agent cannot read the anomaly in their equipment scope'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000002', true);

do $$
declare v_count integer; v_updated integer;
begin
  select count(*) into v_count from public.anomalies where title like 'TEST RLS%';
  if v_count <> 3 then raise exception 'Read-only fixture cannot consult all expected anomalies: got %', v_count; end if;
  update public.anomalies set description = 'Modification interdite' where title = 'TEST RLS GE';
  get diagnostics v_updated = row_count;
  if v_updated <> 0 then raise exception 'Read-only role modified an anomaly'; end if;
end;
$$;

reset role;
select extensions.pass('internal role RLS, inactive vendor role and read-only perimeter checks passed');
select * from extensions.finish();
rollback;
