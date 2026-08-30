\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

-- C8 is a transactional release recipe: all fixtures disappear with the final
-- rollback. It exercises the existing C1-C7 contracts without adding schema or
-- bypassing the authenticated commands that own each business transition.
insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c8000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c8.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c8000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c8.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c8000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c8.direction@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c8000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'c8.outscope@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = 'c8000000-0000-0000-0000-000000000001',
    account_status = 'active', must_change_password = false
where employee_code = 'EVAR-ELEC';
update public.profiles
set auth_user_id = 'c8000000-0000-0000-0000-000000000002',
    account_status = 'active', must_change_password = false
where employee_code = 'FAU-FM';
update public.profiles
set auth_user_id = 'c8000000-0000-0000-0000-000000000003',
    account_status = 'active', must_change_password = false
where employee_code = 'DIR-FRED';
update public.profiles
set auth_user_id = 'c8000000-0000-0000-0000-000000000004',
    account_status = 'active', must_change_password = false
where employee_code = 'LET-RND';

do $$
declare
  v_report_id uuid;
  v_anomaly_id uuid;
  v_reference text;
  v_initial_action_id uuid;
  v_deadline_id uuid;
begin
  insert into public.reports(
    reference, report_type, equipment_id, zone_id, reported_by_profile_id,
    performed_at, submitted_at, report_status, analysis, raw_payload
  ) values (
    null,
    'field_observation',
    (select id from public.equipment where code = 'GE-01'),
    (select primary_zone_id from public.equipment where code = 'GE-01'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    clock_timestamp(), clock_timestamp(), 'submitted',
    'Constat C8 représentatif, supprimé par rollback.',
    jsonb_build_object('source', 'c8_transactional_release_recipe')
  ) returning id into v_report_id;

  insert into public.anomalies(
    reference, title, description, equipment_id, zone_id, category_id,
    priority_id, current_status_id, source_report_id,
    reported_by_profile_id, assigned_profile_id,
    detected_at, qualification_due_at, intervention_due_at
  ) values (
    null,
    'TEST C8 DOSSIER CANONIQUE',
    'Fixture transactionnelle couvrant C1 à C7.',
    (select id from public.equipment where code = 'GE-01'),
    (select primary_zone_id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'CRITICAL'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    v_report_id,
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    clock_timestamp() - interval '2 days',
    clock_timestamp() - interval '1 day',
    clock_timestamp() + interval '1 day'
  ) returning id, reference into v_anomaly_id, v_reference;

  select aa.id into v_initial_action_id
  from public.anomaly_actions aa
  join public.next_action_codes c on c.id = aa.action_code_id
  where aa.anomaly_id = v_anomaly_id and aa.state = 'pending'
    and c.code = 'QUALIFY_ASSIGN';
  select d.id into v_deadline_id
  from public.anomaly_deadlines d
  where d.anomaly_id = v_anomaly_id and d.superseded_at is null;

  if v_reference is null
    or v_reference !~ '^ANO-[0-9]{4}-[0-9]{6}$'
    or v_initial_action_id is null
    or v_deadline_id is null
    or (select due_at from public.anomaly_deadlines where id = v_deadline_id) >= clock_timestamp()
    or (select count(*) from public.anomaly_proof_requirements
        where anomaly_id = v_anomaly_id and state = 'pending') <> 1
    or not exists (
      select 1 from public.anomaly_history h
      join public.business_event_definitions e on e.id = h.event_definition_id
      where h.anomaly_id = v_anomaly_id and e.code = 'ANOMALY_CREATED'
    ) then
    raise exception 'C8 initial dossier did not activate C1, C2, C3 and C5 canonically';
  end if;

  perform set_config('behira.c8_anomaly', v_anomaly_id::text, true);
  perform set_config('behira.c8_reference', v_reference, true);
  perform set_config('behira.c8_report', v_report_id::text, true);
  perform set_config('behira.c8_deadline', v_deadline_id::text, true);
end;
$$;

-- Facility Manager owns qualification and the initial controlled action.
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_base integer;
  v_set jsonb;
  v_replay jsonb;
  v_complete jsonb;
begin
  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;

  v_set := public.set_anomaly_next_action(
    p_reference => current_setting('behira.c8_reference'),
    p_action_code => 'QUALIFY_ASSIGN',
    p_assigned_profile_id => (select id from public.profiles where employee_code = 'FAU-FM'),
    p_comment => 'Qualification C8 préparée par le Facility Manager',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000101',
    p_base_version_no => v_base
  );
  v_replay := public.set_anomaly_next_action(
    p_reference => current_setting('behira.c8_reference'),
    p_action_code => 'QUALIFY_ASSIGN',
    p_assigned_profile_id => (select id from public.profiles where employee_code = 'FAU-FM'),
    p_comment => 'Qualification C8 préparée par le Facility Manager',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000101',
    p_base_version_no => v_base
  );
  if (v_set ->> 'action_code') <> 'QUALIFY_ASSIGN'
    or not (v_replay ->> 'replayed')::boolean
    or (v_replay ->> 'action_id') <> (v_set ->> 'action_id') then
    raise exception 'C8 next-action command is not deterministic and idempotent';
  end if;

  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  v_complete := public.complete_qualification_action(
    p_reference => current_setting('behira.c8_reference'),
    p_action_id => (v_set ->> 'action_id')::uuid,
    p_comment => 'Responsable et diagnostic confirmés',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000102',
    p_base_version_no => v_base
  );
  if (v_complete ->> 'next_action_code') <> 'PERFORM_DIAGNOSIS'
    or not exists (
      select 1 from public.anomaly_actions aa
      join public.next_action_codes c on c.id = aa.action_code_id
      where aa.id = (v_complete ->> 'next_action_id')::uuid
        and aa.state = 'pending' and c.code = 'PERFORM_DIAGNOSIS'
        and aa.assigned_profile_id = (select id from public.profiles where employee_code = 'EVAR-ELEC')
    ) then
    raise exception 'C8 Qualification did not hand diagnosis to the responsible agent';
  end if;
  perform set_config('behira.c8_diagnosis_action', v_complete ->> 'next_action_id', true);
end;
$$;

-- The assigned agent declares the block and justifies the genuinely overdue
-- canonical deadline. The view must prefer the active block reason.
select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_base integer;
  v_result jsonb;
  v_block_id uuid;
  v_row public.anti_zombie_summary_v%rowtype;
begin
  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  v_result := public.declare_anomaly_block(
    p_reference => current_setting('behira.c8_reference'),
    p_reason_code => 'DIAGNOSIS_PENDING',
    p_reason_detail => 'Accès au local technique attendu pour poursuivre le diagnostic',
    p_blocking_actor_type => 'external',
    p_blocking_profile_id => null,
    p_blocking_vendor_id => null,
    p_blocking_external_label => 'Exploitant technique externe',
    p_previous_block_id => null,
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000103',
    p_base_version_no => v_base,
    p_client_occurred_at => null
  );
  v_block_id := (v_result ->> 'block_id')::uuid;

  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  perform public.record_anomaly_delay_justification(
    p_reference => current_setting('behira.c8_reference'),
    p_deadline_id => current_setting('behira.c8_deadline')::uuid,
    p_reason_code => 'QUALIFICATION_OVERDUE',
    p_reason_detail => 'Le diagnostic dépendait de l’accès au local technique',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000104',
    p_base_version_no => v_base,
    p_client_occurred_at => null
  );

  select * into v_row from public.anti_zombie_summary_v
  where anomaly_id = current_setting('behira.c8_anomaly')::uuid;
  if v_row.status_code <> 'A_QUALIFIER'
    or v_row.responsible_name <> 'Évariste DJE'
    or v_row.next_action_code <> 'PERFORM_DIAGNOSIS'
    or not v_row.is_delayed
    or not v_row.is_blocked
    or v_row.blocking_actor_label <> 'Exploitant technique externe'
    or v_row.block_reason_code <> 'DIAGNOSIS_PENDING'
    or v_row.blocking_or_delay_reason not like 'Diagnostic technique attendu%Accès au local technique attendu%'
    or v_row.blocking_or_delay_reason like '%Le diagnostic dépendait%'
    or v_row.pending_proof_requirement_count <> 1
    or v_row.expected_proof_label <> 'Au moins une preuve acceptée conforme au dossier'
    or v_row.last_activity_code <> 'DELAY_JUSTIFICATION_CREATED'
    or v_row.last_activity_actor_label <> 'Évariste DJE'
    or v_row.last_activity_stage_code <> 'QUALIFICATION'
    or v_row.last_activity_occurred_at is null then
    raise exception 'C8 projection did not compose the eight canonical fields: %', row_to_json(v_row);
  end if;

  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  perform public.propose_anomaly_block_resolution(
    p_reference => current_setting('behira.c8_reference'),
    p_block_id => v_block_id,
    p_comment => 'Accès obtenu et diagnostic réalisable',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000105',
    p_base_version_no => v_base,
    p_client_occurred_at => null
  );
  perform set_config('behira.c8_block', v_block_id::text, true);
end;
$$;

-- Faustin confirms resolution, then the agent completes diagnosis.
select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_base integer;
begin
  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  perform public.confirm_anomaly_block_resolution(
    p_reference => current_setting('behira.c8_reference'),
    p_block_id => current_setting('behira.c8_block')::uuid,
    p_resolution_code => 'DEPENDENCY_RECEIVED',
    p_comment => 'Accès confirmé par le Facility Manager',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000106',
    p_base_version_no => v_base,
    p_client_occurred_at => null
  );
end;
$$;

select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_base integer;
  v_result jsonb;
begin
  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  v_result := public.complete_qualification_action(
    p_reference => current_setting('behira.c8_reference'),
    p_action_id => current_setting('behira.c8_diagnosis_action')::uuid,
    p_comment => 'Diagnostic terrain C8 terminé',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000107',
    p_base_version_no => v_base
  );
  if (v_result ->> 'next_action_code') <> 'CHOOSE_TREATMENT_BRANCH' then
    raise exception 'C8 diagnosis did not return the treatment decision to Facility Manager';
  end if;
  perform set_config('behira.c8_branch_action', v_result ->> 'next_action_id', true);
end;
$$;

-- The existing operational workflow owns the branch transition. It must cancel
-- the remaining Qualification action rather than leave a zombie action.
select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000002', true);

do $$
begin
  perform public.advance_anomaly_workflow(
    current_setting('behira.c8_reference'),
    'Affectée',
    'Branche interne validée pour la recette C8'
  );
  if (select state from public.anomaly_actions
      where id = current_setting('behira.c8_branch_action')::uuid) <> 'cancelled'
    or (select assigned_profile_id from public.anomalies
        where id = current_setting('behira.c8_anomaly')::uuid)
      <> (select id from public.profiles where employee_code = 'EVAR-ELEC')
    or not exists (
      select 1 from public.anomaly_deadlines d
      join public.workflow_stages s on s.id = d.workflow_stage_id
      where d.anomaly_id = current_setting('behira.c8_anomaly')::uuid
        and d.superseded_at is null and s.code = 'INTERVENTION'
    ) then
    raise exception 'C8 branch transition left an action, assignee or deadline inconsistent';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000001', true);
select public.advance_anomaly_workflow(
  current_setting('behira.c8_reference'), 'En intervention', 'Intervention C8 démarrée'
);
select public.advance_anomaly_workflow(
  current_setting('behira.c8_reference'), 'En validation', 'Intervention C8 terminée'
);

-- A critical dossier cannot close while the applied proof requirement remains
-- pending. Faustin may strengthen it, but proof submission stays distinct.
select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_base integer;
  v_result jsonb;
  v_requirement_id uuid;
  v_proof jsonb;
  v_proof_id uuid;
begin
  begin
    perform public.advance_anomaly_workflow(
      current_setting('behira.c8_reference'), 'Clôturée', 'Clôture prématurée C8'
    );
    raise exception 'C8 critical dossier closed before accepted proof';
  exception when check_violation then
    null;
  end;

  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  v_result := public.add_anomaly_proof_requirement(
    p_reference => current_setting('behira.c8_reference'),
    p_proof_type_code => 'photo',
    p_label => 'Photo lisible de l’équipement après intervention',
    p_minimum_count => 1,
    p_acceptance_criteria => jsonb_build_object('lisible', true),
    p_comment => 'Renforcement C8 demandé par le Facility Manager',
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000108',
    p_base_version_no => v_base,
    p_client_occurred_at => null
  );
  v_requirement_id := (v_result ->> 'requirement_id')::uuid;

  v_proof := public.register_anomaly_proof(
    p_reference => current_setting('behira.c8_reference'),
    p_storage_path => current_setting('behira.c8_anomaly') || '/preuve-c8.png',
    p_mime_type => 'image/png',
    p_size_bytes => 24,
    p_proof_type => 'photo'
  );
  v_proof_id := (v_proof ->> 'proof_id')::uuid;
  if (v_proof ->> 'verification_status') <> 'accepted'
    or (select count(*) from public.proofs
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid) <> 1
    or (select count(*) from public.anomaly_proof_requirements
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid and state = 'pending') <> 1 then
    raise exception 'C8 proof submission was confused with complete requirement satisfaction';
  end if;

  select version_no into v_base from public.anomalies
  where id = current_setting('behira.c8_anomaly')::uuid;
  perform public.link_proof_to_requirement(
    p_reference => current_setting('behira.c8_reference'),
    p_requirement_id => v_requirement_id,
    p_proof_id => v_proof_id,
    p_idempotency_key => 'c8000000-0000-0000-0000-000000000109',
    p_base_version_no => v_base
  );
  if exists (
    select 1 from public.anomaly_proof_requirements
    where anomaly_id = current_setting('behira.c8_anomaly')::uuid and state = 'pending'
  ) then
    raise exception 'C8 accepted proof did not satisfy all applicable requirements';
  end if;

  perform public.advance_anomaly_workflow(
    current_setting('behira.c8_reference'), 'Clôturée', 'Dossier C8 clôturé avec preuve acceptée'
  );
end;
$$;

-- Global and scoped readers receive one canonical row; out-of-scope and
-- first-login-locked profiles receive none.
select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000003', true);
do $$
begin
  if (select count(*) from public.anti_zombie_summary_v
      where anomaly_id = current_setting('behira.c8_anomaly')::uuid) <> 1 then
    raise exception 'Administration cannot read the completed C8 projection';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000004', true);
do $$
begin
  if exists (
    select 1 from public.anti_zombie_summary_v
    where anomaly_id = current_setting('behira.c8_anomaly')::uuid
  ) then
    raise exception 'Out-of-scope agent read the GE-01 C8 dossier';
  end if;
end;
$$;

reset role;
update public.profiles
set must_change_password = true,
    temporary_password_set_at = clock_timestamp(),
    password_changed_at = null
where employee_code = 'EVAR-ELEC';
set local role authenticated;
select set_config('request.jwt.claim.sub', 'c8000000-0000-0000-0000-000000000001', true);
do $$
begin
  if exists (
    select 1 from public.anti_zombie_summary_v
    where anomaly_id = current_setting('behira.c8_anomaly')::uuid
  ) then
    raise exception 'First-login lock leaked the in-scope C8 dossier';
  end if;
end;
$$;

reset role;
do $$
begin
  if not exists (
    select 1 from public.anomalies a
    join public.status_definitions s on s.id = a.current_status_id
    where a.id = current_setting('behira.c8_anomaly')::uuid
      and s.code = 'CLOTURE' and a.closed_at is not null
  )
    or (select count(*) from public.qualifications
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid) <> 1
    or (select count(*) from public.work_orders
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid) <> 1
    or (select count(*) from public.interventions
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid) <> 1
    or (select count(*) from public.proofs
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid) <> 1
    or (select count(*) from public.anomaly_blocks
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid and state = 'resolved') <> 1
    or (select count(*) from public.anomaly_history
        where anomaly_id = current_setting('behira.c8_anomaly')::uuid) < 15 then
    raise exception 'C8 final dossier lifecycle or audit trail is incomplete';
  end if;
end;
$$;

select extensions.pass(
  'C8 canonical dossier: C1-C7 provenance, workflow, block, delay, proof, projection, RLS and transactional cleanup passed'
);
select * from extensions.finish();
rollback;
