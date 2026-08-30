\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('80000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c2.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('80000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c2.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = '80000000-0000-0000-0000-000000000001',
    account_status = 'active',
    must_change_password = false
where employee_code = 'EVAR-ELEC';

update public.profiles
set auth_user_id = '80000000-0000-0000-0000-000000000002',
    account_status = 'active',
    must_change_password = false
where employee_code = 'FAU-FM';

do $$
declare
  v_anomaly uuid;
  v_rls_anomaly uuid;
  v_first_deadline uuid;
  v_second_deadline uuid;
  v_third_deadline uuid;
  v_qualification_due_at timestamptz;
  v_intervention_due_at timestamptz;
begin
  if has_table_privilege('anon', 'public.anomaly_deadlines', 'SELECT')
    or not has_table_privilege('authenticated', 'public.anomaly_deadlines', 'SELECT')
    or has_table_privilege('authenticated', 'public.anomaly_deadlines', 'INSERT')
    or has_table_privilege('authenticated', 'public.anomaly_deadlines', 'UPDATE')
    or has_table_privilege('authenticated', 'public.anomaly_deadlines', 'DELETE') then
    raise exception 'C2 deadline grants are unsafe';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'anomaly_deadlines'
      and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on anomaly_deadlines';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id
  ) values (
    null,
    'TEST C2 ÉCHÉANCE',
    'Fixture transactionnelle C2',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'PRIORITY'),
    (select id from public.status_definitions where code = 'NOUVEAU'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC')
  ) returning id, qualification_due_at, intervention_due_at
    into v_anomaly, v_qualification_due_at, v_intervention_due_at;

  select id into v_first_deadline
  from public.anomaly_deadlines
  where anomaly_id = v_anomaly and superseded_at is null;

  if v_first_deadline is null
    or (select due_at from public.anomaly_deadlines where id = v_first_deadline) <> v_qualification_due_at
    or (select source_kind from public.anomaly_deadlines where id = v_first_deadline) <> 'sla_snapshot'
    or (select origin from public.anomaly_deadlines where id = v_first_deadline) <> 'automatic'
    or (select ws.code
        from public.anomaly_deadlines d
        join public.workflow_stages ws on ws.id = d.workflow_stage_id
        where d.id = v_first_deadline) <> 'CONSTAT' then
    raise exception 'Initial canonical deadline does not match the existing SLA snapshot';
  end if;

  if not exists (
    select 1
    from public.anomaly_history h
    join public.business_event_definitions e on e.id = h.event_definition_id
    where h.anomaly_id = v_anomaly
      and e.code = 'DEADLINE_CREATED'
      and h.source_table = 'anomaly_deadlines'
      and h.source_record_id = v_first_deadline
      and h.change_set ->> 'new_due_at' is not null
      and h.change_set ->> 'origin' = 'automatic'
      and h.change_set ->> 'justification' is not null
  ) then
    raise exception 'Initial deadline history is incomplete';
  end if;

  update public.anomalies
  set current_status_id = (select id from public.status_definitions where code = 'A_QUALIFIER')
  where id = v_anomaly;

  select id into v_second_deadline
  from public.anomaly_deadlines
  where anomaly_id = v_anomaly and superseded_at is null;

  if v_second_deadline is null
    or v_second_deadline = v_first_deadline
    or (select previous_deadline_id from public.anomaly_deadlines where id = v_second_deadline) <> v_first_deadline
    or (select superseded_by_deadline_id from public.anomaly_deadlines where id = v_first_deadline) <> v_second_deadline
    or (select due_at from public.anomaly_deadlines where id = v_second_deadline) <> v_qualification_due_at
    or (select ws.code
        from public.anomaly_deadlines d
        join public.workflow_stages ws on ws.id = d.workflow_stage_id
        where d.id = v_second_deadline) <> 'QUALIFICATION' then
    raise exception 'Qualification transition did not preserve and historize the canonical deadline';
  end if;

  update public.anomalies
  set current_status_id = (select id from public.status_definitions where code = 'INTERVENTION_INTERNE_PLANIFIEE')
  where id = v_anomaly;

  select id into v_third_deadline
  from public.anomaly_deadlines
  where anomaly_id = v_anomaly and superseded_at is null;

  if v_third_deadline is null
    or (select due_at from public.anomaly_deadlines where id = v_third_deadline) <> v_intervention_due_at
    or (select previous_deadline_id from public.anomaly_deadlines where id = v_third_deadline) <> v_second_deadline
    or (select ws.code
        from public.anomaly_deadlines d
        join public.workflow_stages ws on ws.id = d.workflow_stage_id
        where d.id = v_third_deadline) <> 'INTERVENTION' then
    raise exception 'Intervention transition did not select the existing intervention deadline';
  end if;

  begin
    update public.anomalies
    set intervention_due_at = intervention_due_at + interval '1 hour'
    where id = v_anomaly;
    raise exception 'A silent legacy deadline modification unexpectedly succeeded';
  exception when check_violation then
    null;
  end;

  begin
    insert into public.anomaly_deadlines(
      anomaly_id, workflow_stage_id, due_at, origin, justification,
      source_kind, idempotency_key, base_version_no
    ) values (
      v_anomaly,
      (select id from public.workflow_stages where code = 'INTERVENTION'),
      v_intervention_due_at,
      'automatic',
      'Doublon interdit',
      'stage_transition',
      gen_random_uuid(),
      1
    );
    raise exception 'A second active deadline unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;

  update public.anomalies
  set current_status_id = (select id from public.status_definitions where code = 'EN_COURS')
  where id = v_anomaly;
  update public.anomalies
  set current_status_id = (select id from public.status_definitions where code = 'RESOLU'),
      resolved_at = now()
  where id = v_anomaly;
  update public.anomalies
  set current_status_id = (select id from public.status_definitions where code = 'CLOTURE'),
      closure_comment = 'Clôture C2 non critique'
  where id = v_anomaly;

  if exists (
    select 1 from public.anomaly_deadlines
    where anomaly_id = v_anomaly and superseded_at is null
  ) or (select count(*) from public.anomaly_deadlines where anomaly_id = v_anomaly) < 4
    or not exists (
      select 1
      from public.anomaly_history h
      join public.business_event_definitions e on e.id = h.event_definition_id
      where h.anomaly_id = v_anomaly
        and e.code = 'DEADLINE_CLEARED'
        and h.change_set ->> 'old_due_at' is not null
        and h.change_set ->> 'new_due_at' is null
        and h.actor_label_snapshot is not null
    ) then
    raise exception 'Closure did not clear the active deadline while preserving history';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id
  ) values (
    null,
    'TEST C2 RLS',
    'Fixture RLS C2',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'PRIORITY'),
    (select id from public.status_definitions where code = 'NOUVEAU'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC')
  ) returning id into v_rls_anomaly;

  perform set_config('behira.c2_rls_anomaly', v_rls_anomaly::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000001', true);

do $$
begin
  if (select count(*) from public.anomaly_deadlines
      where anomaly_id = current_setting('behira.c2_rls_anomaly')::uuid) <> 1 then
    raise exception 'Scoped agent cannot read the canonical deadline';
  end if;

  begin
    insert into public.anomaly_deadlines(
      anomaly_id, workflow_stage_id, due_at, origin, justification,
      source_kind, idempotency_key, base_version_no
    ) values (
      current_setting('behira.c2_rls_anomaly')::uuid,
      (select id from public.workflow_stages where code = 'CONSTAT'),
      now(),
      'automatic',
      'Écriture interdite',
      'sla_snapshot',
      gen_random_uuid(),
      1
    );
    raise exception 'Agent inserted a canonical deadline';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '80000000-0000-0000-0000-000000000002', true);

do $$
begin
  if (select count(*) from public.anomaly_deadlines
      where anomaly_id = current_setting('behira.c2_rls_anomaly')::uuid) <> 1 then
    raise exception 'Facility Manager cannot read the canonical deadline';
  end if;
end;
$$;

reset role;
select extensions.pass('C2 canonical deadline, history, no-silent-change, grants and RLS checks passed');
select * from extensions.finish();
rollback;
