\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c6000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c6.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c6000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c6.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c6000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c6.direction@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c6000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'c6.locked@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c6000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'c6.outscope@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = 'c6000000-0000-0000-0000-000000000001',
    account_status = 'active', must_change_password = false
where employee_code = 'EVAR-ELEC';
update public.profiles
set auth_user_id = 'c6000000-0000-0000-0000-000000000002',
    account_status = 'active', must_change_password = false
where employee_code = 'FAU-FM';
update public.profiles
set auth_user_id = 'c6000000-0000-0000-0000-000000000003',
    account_status = 'active', must_change_password = false
where employee_code = 'DIR-FRED';
update public.profiles
set auth_user_id = 'c6000000-0000-0000-0000-000000000004',
    account_status = 'active', must_change_password = true,
    temporary_password_set_at = now(), password_changed_at = null
where employee_code = 'SYL-PLB';
update public.profiles
set auth_user_id = 'c6000000-0000-0000-0000-000000000005',
    account_status = 'active', must_change_password = false
where employee_code = 'LET-RND';

do $$
declare
  v_main uuid;
  v_missing uuid;
  v_deadline uuid;
begin
  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'anti_zombie_summary_v'
      and c.relkind = 'v'
      and coalesce(c.reloptions, '{}'::text[]) @> array['security_invoker=true']
  ) then
    raise exception 'Canonical anti-zombie view is missing or does not use security_invoker';
  end if;

  if has_table_privilege('anon', 'public.anti_zombie_summary_v', 'SELECT')
    or not has_table_privilege('authenticated', 'public.anti_zombie_summary_v', 'SELECT')
    or has_table_privilege('authenticated', 'public.anti_zombie_summary_v', 'INSERT')
    or has_table_privilege('authenticated', 'public.anti_zombie_summary_v', 'UPDATE')
    or has_table_privilege('authenticated', 'public.anti_zombie_summary_v', 'DELETE') then
    raise exception 'Canonical projection grants are unsafe';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id,
    qualification_due_at
  ) values (
    null,
    'TEST C6 PROJECTION COMPLETE',
    'Fixture transactionnelle C6',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'CRITICAL'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    now() - interval '2 hours'
  ) returning id into v_main;

  select id into v_deadline
  from public.anomaly_deadlines
  where anomaly_id = v_main and superseded_at is null;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id,
    qualification_due_at
  ) values (
    null,
    'TEST C6 PROJECTION MISSING',
    'Fixture des absences explicites C6',
    (select id from public.equipment where code = 'RIA-01'),
    (select id from public.categories where code = 'INC'),
    (select id from public.priority_definitions where code = 'NORMAL'),
    (select id from public.status_definitions where code = 'NOUVEAU'),
    (select id from public.profiles where employee_code = 'FAU-FM'),
    now() + interval '2 hours'
  ) returning id into v_missing;

  if v_deadline is null then
    raise exception 'C6 complete fixture has no canonical deadline';
  end if;
  perform set_config('behira.c6_main', v_main::text, true);
  perform set_config('behira.c6_main_ref', (select reference from public.anomalies where id = v_main), true);
  perform set_config('behira.c6_missing', v_missing::text, true);
  perform set_config('behira.c6_deadline', v_deadline::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_result jsonb;
begin
  v_result := public.declare_anomaly_block(
    current_setting('behira.c6_main_ref'),
    'DIAGNOSIS_PENDING',
    'Accès technique requis avant le diagnostic',
    'external', null, null, 'Exploitant technique externe', null,
    'c6000000-0000-0000-0000-000000000101', 1, null
  );
  if (v_result ->> 'version_no')::integer <> 2 then
    raise exception 'C6 block fixture did not update the dossier';
  end if;

  v_result := public.record_anomaly_delay_justification(
    current_setting('behira.c6_main_ref'),
    current_setting('behira.c6_deadline')::uuid,
    'QUALIFICATION_OVERDUE',
    'Accès obtenu après dépassement du délai',
    'c6000000-0000-0000-0000-000000000102', 2, null
  );
  if (v_result ->> 'version_no')::integer <> 3 then
    raise exception 'C6 delay fixture did not update the dossier';
  end if;
end;
$$;

do $$
declare
  v_row public.anti_zombie_summary_v%rowtype;
begin
  select * into v_row
  from public.anti_zombie_summary_v
  where anomaly_id = current_setting('behira.c6_main')::uuid;

  if v_row.anomaly_id is null
    or v_row.dossier_state <> 'open'
    or v_row.status_code <> 'A_QUALIFIER'
    or v_row.stage_code <> 'QUALIFICATION'
    or v_row.responsible_name <> 'Évariste DJE'
    or v_row.responsible_missing
    or v_row.next_action_code <> 'QUALIFY_ASSIGN'
    or v_row.next_action_label <> 'Qualifier et affecter'
    or v_row.next_action_missing
    or v_row.deadline_id is null
    or not v_row.is_delayed
    or not v_row.is_blocked
    or v_row.blocking_actor_type <> 'external'
    or v_row.blocking_actor_label <> 'Exploitant technique externe'
    or v_row.block_reason_code <> 'DIAGNOSIS_PENDING'
    or v_row.blocking_or_delay_reason not like 'Diagnostic technique attendu%Accès technique requis%'
    or v_row.blocking_information_incomplete
    or v_row.pending_proof_requirement_count <> 1
    or v_row.expected_proof_label <> 'Au moins une preuve acceptée conforme au dossier'
    or v_row.expected_proof_missing
    or jsonb_array_length(v_row.pending_proof_requirements) <> 1
    or v_row.last_activity_code <> 'DELAY_JUSTIFICATION_CREATED'
    or v_row.last_activity_actor_label <> 'Évariste DJE'
    or v_row.last_activity_stage_code <> 'QUALIFICATION'
    or v_row.last_activity_occurred_at is null
    or v_row.history_missing then
    raise exception 'C6 projection does not compose the eight canonical sources correctly: %', row_to_json(v_row);
  end if;

  if v_row.blocking_or_delay_reason like '%Accès obtenu après dépassement%'
    or v_row.delay_reason_code <> 'QUALIFICATION_OVERDUE' then
    raise exception 'Active block did not take precedence over the recorded delay justification';
  end if;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_row public.anti_zombie_summary_v%rowtype;
begin
  select * into v_row
  from public.anti_zombie_summary_v
  where anomaly_id = current_setting('behira.c6_missing')::uuid;
  if v_row.anomaly_id is null
    or not v_row.responsible_missing
    or not v_row.next_action_missing
    or v_row.is_delayed
    or v_row.is_blocked
    or v_row.blocking_or_delay_reason is not null
    or not v_row.expected_proof_missing
    or v_row.pending_proof_requirement_count <> 0
    or v_row.history_missing then
    raise exception 'C6 projection missing-value flags are incorrect: %', row_to_json(v_row);
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000003', true);
do $$
begin
  if (select count(*) from public.anti_zombie_summary_v
      where anomaly_id in (
        current_setting('behira.c6_main')::uuid,
        current_setting('behira.c6_missing')::uuid
      )) <> 2 then
    raise exception 'Administration cannot read the global canonical projection';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000005', true);
do $$
begin
  if exists (
    select 1 from public.anti_zombie_summary_v
    where anomaly_id = current_setting('behira.c6_main')::uuid
  ) then
    raise exception 'Out-of-scope agent read the canonical projection';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c6000000-0000-0000-0000-000000000004', true);
do $$
begin
  if exists (
    select 1 from public.anti_zombie_summary_v
    where anomaly_id = current_setting('behira.c6_main')::uuid
  ) then
    raise exception 'First-login locked profile read the canonical projection';
  end if;
end;
$$;

reset role;
select extensions.pass('C6 canonical projection, server delay, block precedence, proof requirements, history provenance, missing flags and RLS passed');
select * from extensions.finish();
rollback;
