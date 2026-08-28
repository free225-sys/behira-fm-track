\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('20000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'evariste.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'sylvain.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'laetitia.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'direction.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('20000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'facility.manager.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles set auth_user_id = '20000000-0000-0000-0000-000000000001', account_status = 'active' where employee_code = 'EVAR-ELEC';
update public.profiles set auth_user_id = '20000000-0000-0000-0000-000000000002', account_status = 'active' where employee_code = 'SYL-PLB';
update public.profiles set auth_user_id = '20000000-0000-0000-0000-000000000003', account_status = 'active' where employee_code = 'LET-RND';
update public.profiles set auth_user_id = '20000000-0000-0000-0000-000000000004', account_status = 'active' where employee_code = 'DIR-FRED';
update public.profiles set auth_user_id = '20000000-0000-0000-0000-000000000005', account_status = 'active' where employee_code = 'FAU-FM';

insert into public.anomalies(reference, title, description, equipment_id, category_id, priority_id, current_status_id, reported_by_profile_id, assigned_profile_id)
values
  (null, 'TEST RAPPORT GE AUTORISE', 'Périmètre Évariste', (select id from public.equipment where code = 'GE-01'), (select id from public.categories where code = 'ELEC'), (select id from public.priority_definitions where code = 'PRIORITY'), (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), (select id from public.profiles where employee_code = 'EVAR-ELEC'), null),
  (null, 'TEST RAPPORT ASC HORS PERIMETRE', 'Affectation ne doit pas contourner le périmètre', (select id from public.equipment where code = 'ASC-A1'), (select id from public.categories where code = 'ELEC'), (select id from public.priority_definitions where code = 'PRIORITY'), (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), (select id from public.profiles where employee_code = 'EVAR-ELEC'), (select id from public.profiles where employee_code = 'EVAR-ELEC')),
  (null, 'TEST RAPPORT RIA AUTORISE', 'Périmètre Sylvain', (select id from public.equipment where code = 'RIA-01'), (select id from public.categories where code = 'INC'), (select id from public.priority_definitions where code = 'CRITICAL'), (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), (select id from public.profiles where employee_code = 'SYL-PLB'), null),
  (null, 'TEST RAPPORT RND REFUSE', 'Laetitia sans permission de dépôt', (select id from public.equipment where code = 'RND-LET'), (select id from public.categories where code = 'NET'), (select id from public.priority_definitions where code = 'NORMAL'), (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE'), (select id from public.profiles where employee_code = 'LET-RND'), null);

set local role authenticated;
select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000001', true);

do $$
declare v_anomaly_id uuid; v_reference text; v_path text; v_result jsonb; v_outside uuid;
begin
  if not public.has_permission('upload_vendor_intervention_report') then raise exception 'Evariste permission is missing'; end if;
  select id, reference into v_anomaly_id, v_reference from public.anomalies where title = 'TEST RAPPORT GE AUTORISE';
  select id into v_outside from public.anomalies where title = 'TEST RAPPORT ASC HORS PERIMETRE';
  if not public.can_access_anomaly(v_anomaly_id) or public.can_access_anomaly(v_outside) then
    raise exception 'Evariste equipment perimeter is not enforced';
  end if;
  v_path := '20000000-0000-0000-0000-000000000001/' || v_anomaly_id || '/rapport-dmc.pdf';
  insert into storage.objects(bucket_id, name, owner_id, metadata)
  values ('vendor-intervention-reports', v_path, '20000000-0000-0000-0000-000000000001', '{}'::jsonb);
  v_result := public.register_vendor_intervention_report(v_reference, 'DMC', v_path, 'application/pdf', 2048, 'intervention_report', current_date, 'Contrôle GE réalisé par DMC.');
  if v_result ->> 'validation_status' <> 'pending' then raise exception 'Evariste report must await validation'; end if;

  begin
    insert into storage.objects(bucket_id, name, owner_id, metadata)
    values ('vendor-intervention-reports', '20000000-0000-0000-0000-000000000001/' || v_outside || '/hors-perimetre.pdf', '20000000-0000-0000-0000-000000000001', '{}'::jsonb);
    raise exception 'Evariste uploaded outside GE-01';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);
do $$
declare v_anomaly_id uuid; v_reference text; v_path text; v_ge uuid; v_result jsonb;
begin
  if not public.has_permission('upload_vendor_intervention_report') then raise exception 'Sylvain permission is missing'; end if;
  select id, reference into v_anomaly_id, v_reference from public.anomalies where title = 'TEST RAPPORT RIA AUTORISE';
  select id into v_ge from public.anomalies where title = 'TEST RAPPORT GE AUTORISE';
  if not public.can_access_anomaly(v_anomaly_id) or public.can_access_anomaly(v_ge) then raise exception 'Sylvain equipment perimeter is not enforced'; end if;
  v_path := '20000000-0000-0000-0000-000000000002/' || v_anomaly_id || '/rapport-securisys.pdf';
  insert into storage.objects(bucket_id, name, owner_id, metadata)
  values ('vendor-intervention-reports', v_path, '20000000-0000-0000-0000-000000000002', '{}'::jsonb);
  v_result := public.register_vendor_intervention_report(v_reference, 'SECURISYS', v_path, 'application/pdf', 4096, 'pv', current_date, 'Contrôle RIA réalisé par SECURISYS.');
  if v_result ->> 'validation_status' <> 'pending' then raise exception 'Sylvain report must await validation'; end if;
end;
$$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000003', true);
do $$
declare v_anomaly_id uuid; v_reference text; v_path text;
begin
  if public.has_permission('upload_vendor_intervention_report') then raise exception 'Laetitia unexpectedly has upload permission'; end if;
  select id, reference into v_anomaly_id, v_reference from public.anomalies where title = 'TEST RAPPORT RND REFUSE';
  if not public.can_access_anomaly(v_anomaly_id) then raise exception 'Laetitia cannot access RND-LET'; end if;
  v_path := '20000000-0000-0000-0000-000000000003/' || v_anomaly_id || '/rapport-refuse.pdf';
  begin
    insert into storage.objects(bucket_id, name, owner_id, metadata)
    values ('vendor-intervention-reports', v_path, '20000000-0000-0000-0000-000000000003', '{}'::jsonb);
    raise exception 'Laetitia Storage upload unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.register_vendor_intervention_report(v_reference, 'ALTA-VENTURE', v_path, 'application/pdf', 100, 'intervention_report', current_date, 'Dépôt interdit');
    raise exception 'Laetitia report registration unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000004', true);
do $$
declare v_count integer; v_report_reference text;
begin
  if public.has_permission('upload_vendor_intervention_report') then raise exception 'Direction unexpectedly has upload permission'; end if;
  select count(*) into v_count from public.anomalies where title like 'TEST RAPPORT%';
  if v_count <> 4 then raise exception 'Direction lost consolidated anomaly access'; end if;
  select reference into v_report_reference from public.vendor_intervention_reports order by created_at limit 1;
  begin
    perform public.verify_vendor_intervention_report(v_report_reference, 'accepted', 'Tentative Direction');
    raise exception 'Direction validated a vendor report';
  exception when insufficient_privilege then null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000005', true);
do $$
declare v_report_reference text; v_result jsonb; v_anomaly_id uuid;
begin
  if public.has_permission('upload_vendor_intervention_report') then raise exception 'Facility Manager unexpectedly has upload permission'; end if;
  select reference, anomaly_id into v_report_reference, v_anomaly_id
  from public.vendor_intervention_reports where summary like 'Contrôle RIA%';
  v_result := public.verify_vendor_intervention_report(v_report_reference, 'accepted', 'Rapport et pièce jointe contrôlés par Faustin.');
  if v_result ->> 'validation_status' <> 'accepted' then raise exception 'Facility Manager validation failed'; end if;
  if not public.has_accepted_proof(v_anomaly_id) then raise exception 'Accepted vendor report did not become an accepted proof'; end if;
end;
$$;

reset role;

do $$
begin
  if (select count(*) from public.profile_permissions where revoked_at is null) <> 2 then
    raise exception 'Exactly two active production permissions are required';
  end if;
  if exists (
    select 1 from public.profile_permissions pp join public.profiles p on p.id = pp.profile_id
    where pp.revoked_at is null and p.employee_code not in ('EVAR-ELEC', 'SYL-PLB')
  ) then raise exception 'Unexpected active permission holder'; end if;
end;
$$;

set local role anon;
do $$
declare v_count integer;
begin
  select count(*) into v_count from storage.objects where bucket_id = 'vendor-intervention-reports';
  if v_count <> 0 then raise exception 'Anonymous role can read private vendor report objects'; end if;
end;
$$;
reset role;

select extensions.pass('named permissions, equipment perimeters, private Storage and Faustin-only validation passed');
select * from extensions.finish();
rollback;
