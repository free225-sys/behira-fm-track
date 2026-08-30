\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('70000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c1.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('70000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c1.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('70000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c1.locked@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = '70000000-0000-0000-0000-000000000001',
    account_status = 'active',
    must_change_password = false
where employee_code = 'EVAR-ELEC';

update public.profiles
set auth_user_id = '70000000-0000-0000-0000-000000000002',
    account_status = 'active',
    must_change_password = false
where employee_code = 'FAU-FM';

update public.profiles
set auth_user_id = '70000000-0000-0000-0000-000000000003',
    account_status = 'active',
    must_change_password = true,
    temporary_password_set_at = now(),
    password_changed_at = null
where employee_code = 'SYL-PLB';

do $$
declare
  v_anomaly uuid;
  v_history uuid;
  v_event uuid;
  v_stage uuid;
  v_duplicate_key uuid := '70000000-0000-0000-0000-000000000099';
begin
  if (select count(*) from public.next_action_codes) <> 16
    or exists (select 1 from public.next_action_codes where is_active)
    or exists (select 1 from public.next_action_codes where validation_status <> 'to_confirm') then
    raise exception 'C1 next-action candidates must remain inactive until catalogue validation';
  end if;

  if (select count(*) from public.block_reason_codes) <> 9
    or (select count(*) from public.block_reason_codes where is_active) <> 6 then
    raise exception 'C1 block reason catalogue counts are incorrect';
  end if;

  if (select count(*) from public.delay_reason_codes) <> 8
    or (select count(*) from public.delay_reason_codes where is_active) <> 6 then
    raise exception 'C1 delay reason catalogue counts are incorrect';
  end if;

  if (select count(*) from public.block_resolution_codes) <> 7
    or (select count(*) from public.block_resolution_codes where is_active) <> 5 then
    raise exception 'C1 block resolution catalogue counts are incorrect';
  end if;

  if (select count(*) from public.business_event_definitions) <> 6
    or (select count(*) from public.business_event_definitions where is_activity) <> 5 then
    raise exception 'Only existing history event kinds may be active in C1';
  end if;

  if (select count(*) from public.next_action_code_stages) <> 29 then
    raise exception 'C1 workflow compatibility catalogue is incomplete';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'next_action_codes'
      and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on next_action_codes';
  end if;

  if has_table_privilege('anon', 'public.next_action_codes', 'SELECT')
    or not has_table_privilege('authenticated', 'public.next_action_codes', 'SELECT')
    or has_table_privilege('authenticated', 'public.next_action_codes', 'INSERT')
    or has_table_privilege('authenticated', 'public.anomaly_history', 'UPDATE')
    or has_table_privilege('authenticated', 'public.anomaly_history', 'DELETE') then
    raise exception 'C1 grants do not enforce read-only catalogues and append-only client history';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id
  ) values (
    null,
    'TEST C1 HISTORY',
    'Fixture transactionnelle C1',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'PRIORITY'),
    (select id from public.status_definitions where code = 'NOUVEAU'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC')
  ) returning id into v_anomaly;

  select h.id, h.event_definition_id, h.workflow_stage_id
  into v_history, v_event, v_stage
  from public.anomaly_history h
  where h.anomaly_id = v_anomaly
  order by h.occurred_at desc, h.id desc
  limit 1;

  if v_history is null
    or v_event <> (select id from public.business_event_definitions where code = 'ANOMALY_CREATED')
    or v_stage <> (select id from public.workflow_stages where code = 'CONSTAT')
    or not exists (
      select 1 from public.anomaly_history
      where id = v_history
        and source_table = 'anomalies'
        and source_record_id = v_anomaly
        and server_received_at is not null
    ) then
    raise exception 'C1 history provenance was not recorded by the existing workflow trigger';
  end if;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    source_table, source_record_id, idempotency_key
  ) values (
    v_anomaly,
    'c1_idempotency_fixture',
    (select id from public.business_event_definitions where code = 'ANOMALY_UPDATED'),
    (select id from public.workflow_stages where code = 'CONSTAT'),
    'anomalies',
    v_anomaly,
    v_duplicate_key
  );

  begin
    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      source_table, source_record_id, idempotency_key
    ) values (
      v_anomaly,
      'c1_duplicate_fixture',
      (select id from public.business_event_definitions where code = 'ANOMALY_UPDATED'),
      (select id from public.workflow_stages where code = 'CONSTAT'),
      'anomalies',
      v_anomaly,
      v_duplicate_key
    );
    raise exception 'Duplicate history idempotency key unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000003', true);

do $$
begin
  if (select count(*) from public.block_reason_codes) <> 0
    or (select count(*) from public.business_event_definitions) <> 0 then
    raise exception 'First-password lock leaked C1 reference data';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000001', true);

do $$
begin
  if (select count(*) from public.next_action_codes) <> 0 then
    raise exception 'Agent can see inactive next-action candidates';
  end if;
  if (select count(*) from public.block_reason_codes) <> 6
    or (select count(*) from public.delay_reason_codes) <> 6
    or (select count(*) from public.block_resolution_codes) <> 5 then
    raise exception 'Agent cannot read exactly the confirmed active C1 catalogues';
  end if;

  begin
    insert into public.block_reason_codes(
      code, label, source_document, validation_status, is_active
    ) values ('UNAUTHORIZED', 'Interdit', 'pgTAP', 'confirmed', true);
    raise exception 'Agent inserted a catalogue row';
  exception when insufficient_privilege then
    null;
  end;

  begin
    update public.anomaly_history set comment = 'Interdit';
    raise exception 'Agent updated append-only history';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '70000000-0000-0000-0000-000000000002', true);

do $$
begin
  if (select count(*) from public.next_action_codes) <> 16 then
    raise exception 'Facility Manager cannot review inactive next-action candidates';
  end if;
end;
$$;

reset role;
select extensions.pass('C1 catalogues, provenance, idempotence, grants and RLS checks passed');
select * from extensions.finish();
rollback;
