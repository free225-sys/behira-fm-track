\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('b5000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c5.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b5000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c5.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b5000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c5.direction@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b5000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'c5.locked@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('b5000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'c5.outscope@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = 'b5000000-0000-0000-0000-000000000001',
    account_status = 'active', must_change_password = false
where employee_code = 'EVAR-ELEC';
update public.profiles
set auth_user_id = 'b5000000-0000-0000-0000-000000000002',
    account_status = 'active', must_change_password = false
where employee_code = 'FAU-FM';
update public.profiles
set auth_user_id = 'b5000000-0000-0000-0000-000000000003',
    account_status = 'active', must_change_password = false
where employee_code = 'DIR-FRED';
update public.profiles
set auth_user_id = 'b5000000-0000-0000-0000-000000000004',
    account_status = 'active', must_change_password = true,
    temporary_password_set_at = now(), password_changed_at = null
where employee_code = 'SYL-PLB';
update public.profiles
set auth_user_id = 'b5000000-0000-0000-0000-000000000005',
    account_status = 'active', must_change_password = false
where employee_code = 'LET-RND';

do $$
declare
  v_main uuid;
  v_normal uuid;
  v_generic_requirement uuid;
begin
  if has_table_privilege('anon', 'public.anomaly_proof_requirements', 'SELECT')
    or not has_table_privilege('authenticated', 'public.anomaly_proof_requirements', 'SELECT')
    or has_table_privilege('authenticated', 'public.anomaly_proof_requirements', 'INSERT')
    or has_table_privilege('authenticated', 'public.anomaly_proof_requirements', 'UPDATE')
    or has_table_privilege('authenticated', 'public.proof_requirement_evidence', 'INSERT')
    or has_function_privilege('anon', 'public.review_anomaly_proof(text,uuid,text,text,uuid,integer,timestamptz)', 'EXECUTE')
    or not has_function_privilege('authenticated', 'public.review_anomaly_proof(text,uuid,text,text,uuid,integer,timestamptz)', 'EXECUTE') then
    raise exception 'C5 grants are unsafe or incomplete';
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'anomaly_proof_requirements' and c.relrowsecurity
  ) or not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'proof_requirement_evidence' and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on C5 dossier tables';
  end if;

  if (select count(*) from public.proof_type_definitions) <> 7
    or (select count(*) from public.proof_type_definitions where is_active and validation_status = 'confirmed') <> 3
    or (select count(*) from public.proof_rule_sets where status = 'published') <> 1
    or (select count(*) from public.proof_requirement_rules where is_active and validation_status = 'confirmed') <> 1
    or exists (
      select 1 from public.proof_requirement_rules
      where equipment_id is not null or category_id is not null
    ) then
    raise exception 'C5 activated an unconfirmed proof type or equipment/category matrix';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id, detected_at, resolved_at
  ) values (
    null, 'TEST C5 CRITIQUE', 'Exigences de preuve C5',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'CRITICAL'),
    (select id from public.status_definitions where code = 'RESOLU'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    now(), now()
  ) returning id into v_main;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id, detected_at
  ) values (
    null, 'TEST C5 RIA NON CRITIQUE', 'Politique générale sans type exact validé',
    (select id from public.equipment where code = 'RIA-01'),
    (select id from public.categories where code = 'INC'),
    (select id from public.priority_definitions where code = 'NORMAL'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    (select id from public.profiles where employee_code = 'SYL-PLB'),
    (select id from public.profiles where employee_code = 'SYL-PLB'),
    now()
  ) returning id into v_normal;

  select id into v_generic_requirement
  from public.anomaly_proof_requirements
  where anomaly_id = v_main and source_rule_id is not null;
  if v_generic_requirement is null
    or (select count(*) from public.anomaly_proof_requirements where anomaly_id = v_main) <> 1
    or (select proof_type_mode from public.anomaly_proof_requirements where id = v_generic_requirement) <> 'any_accepted'
    or (select label_snapshot from public.anomaly_proof_requirements where id = v_generic_requirement) <> 'Au moins une preuve acceptée conforme au dossier'
    or exists (select 1 from public.anomaly_proof_requirements where anomaly_id = v_normal) then
    raise exception 'The confirmed critical requirement was not applied conservatively';
  end if;

  perform set_config('behira.c5_main', v_main::text, true);
  perform set_config('behira.c5_main_ref', (select reference from public.anomalies where id = v_main), true);
  perform set_config('behira.c5_normal', v_normal::text, true);
  perform set_config('behira.c5_normal_ref', (select reference from public.anomalies where id = v_normal), true);
  perform set_config('behira.c5_generic_requirement', v_generic_requirement::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000001', true);

do $$
begin
  if (select count(*) from public.anomaly_proof_requirements
      where anomaly_id = current_setting('behira.c5_main')::uuid) <> 1
    or (select count(*) from public.proof_type_definitions) <> 3
    or (select count(*) from public.proof_rule_sets) <> 0
    or (select count(*) from public.proof_requirement_rules) <> 0 then
    raise exception 'Agent proof catalogue or RLS visibility is incorrect';
  end if;

  begin
    insert into public.anomaly_proof_requirements(
      anomaly_id, proof_type_mode, label_snapshot, minimum_count,
      acceptance_criteria_snapshot, is_mandatory, origin, application_comment,
      created_by_profile_id, application_idempotency_key, application_base_version_no
    ) values (
      current_setting('behira.c5_main')::uuid, 'any_accepted', 'Injection agent', 1,
      '{}'::jsonb, true, 'facility_manager', 'Injection agent',
      public.current_profile_id(), gen_random_uuid(), 1
    );
    raise exception 'Agent inserted a proof requirement directly';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.add_anomaly_proof_requirement(
      current_setting('behira.c5_main_ref'), 'photo', 'Photo agent', 1,
      '{}'::jsonb, 'Tentative agent', gen_random_uuid(),
      (select version_no from public.anomalies where id = current_setting('behira.c5_main')::uuid), null
    );
    raise exception 'Agent added a proof requirement through the RPC';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_base integer;
  v_result jsonb;
  v_replay jsonb;
  v_requirement_id uuid;
begin
  select version_no into v_base
  from public.anomalies where id = current_setting('behira.c5_main')::uuid;
  perform set_config('behira.c5_add_base', v_base::text, true);

  v_result := public.add_anomaly_proof_requirement(
    current_setting('behira.c5_main_ref'),
    'photo',
    'Photo lisible de l’état après intervention',
    1,
    jsonb_build_object('lisible', true),
    'Renforcement demandé après contrôle du dossier',
    'b5000000-0000-0000-0000-000000000101',
    v_base,
    '2026-08-30 19:00:00+00'::timestamptz
  );
  v_requirement_id := (v_result ->> 'requirement_id')::uuid;
  if (v_result ->> 'version_no')::integer <> v_base + 1
    or (select origin from public.anomaly_proof_requirements where id = v_requirement_id) <> 'facility_manager'
    or (select state from public.anomaly_proof_requirements where id = v_requirement_id) <> 'pending' then
    raise exception 'Facility Manager requirement reinforcement failed';
  end if;
  perform set_config('behira.c5_specific_requirement', v_requirement_id::text, true);

  v_replay := public.add_anomaly_proof_requirement(
    current_setting('behira.c5_main_ref'),
    'photo',
    'Photo lisible de l’état après intervention',
    1,
    jsonb_build_object('lisible', true),
    'Renforcement demandé après contrôle du dossier',
    'b5000000-0000-0000-0000-000000000101',
    v_base,
    '2026-08-30 19:00:00+00'::timestamptz
  );
  if not (v_replay ->> 'replayed')::boolean
    or (select count(*) from public.anomaly_proof_requirements
        where anomaly_id = current_setting('behira.c5_main')::uuid) <> 2 then
    raise exception 'Requirement idempotent replay duplicated data';
  end if;

  begin
    perform public.add_anomaly_proof_requirement(
      current_setting('behira.c5_main_ref'), 'photo', 'Contenu différent', 1,
      '{}'::jsonb, 'Même clé', 'b5000000-0000-0000-0000-000000000101',
      v_base, '2026-08-30 19:00:00+00'::timestamptz
    );
    raise exception 'Changed requirement replay unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.add_anomaly_proof_requirement(
      current_setting('behira.c5_main_ref'), 'other', 'Type non validé', 1,
      '{}'::jsonb, 'Ne pas activer les matrices non confirmées', gen_random_uuid(),
      (select version_no from public.anomalies where id = current_setting('behira.c5_main')::uuid), null
    );
    raise exception 'Inactive proof type unexpectedly became operational';
  exception when check_violation then
    null;
  end;
end;
$$;

reset role;

do $$
declare
  v_proof_id uuid;
begin
  begin
    update public.proof_requirement_rules
    set label = 'Réécriture interdite'
    where code = 'CRITICAL_ACCEPTED_PROOF';
    raise exception 'Published proof rule was rewritten';
  exception when check_violation then
    null;
  end;

  begin
    update public.anomalies
    set current_status_id = (select id from public.status_definitions where code = 'CLOTURE'),
        closure_comment = 'Clôture avant preuve'
    where id = current_setting('behira.c5_main')::uuid;
    raise exception 'Closure with pending requirements unexpectedly succeeded';
  exception when check_violation then
    if sqlerrm not like '%mandatory proof requirement%' then raise; end if;
  end;

  insert into public.proofs(
    reference, anomaly_id, proof_type, storage_bucket, storage_path,
    mime_type, submitted_by_profile_id, verification_status
  ) values (
    null, current_setting('behira.c5_main')::uuid, 'photo',
    'anomaly-proofs', 'tests/c5-photo.jpg', 'image/jpeg',
    (select id from public.profiles where employee_code = 'EVAR-ELEC'), 'pending'
  ) returning id into v_proof_id;
  perform set_config('behira.c5_photo_proof', v_proof_id::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000003', true);

do $$
begin
  begin
    perform public.review_anomaly_proof(
      current_setting('behira.c5_main_ref'),
      current_setting('behira.c5_photo_proof')::uuid,
      'accepted', 'Tentative Administration', gen_random_uuid(),
      (select version_no from public.anomalies where id = current_setting('behira.c5_main')::uuid), null
    );
    raise exception 'Direction reviewed proof';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000004', true);

do $$
begin
  if (select count(*) from public.anomaly_proof_requirements) <> 0
    or (select count(*) from public.proof_type_definitions) <> 0 then
    raise exception 'Locked profile can read C5 business data';
  end if;
  begin
    perform public.review_anomaly_proof(
      current_setting('behira.c5_main_ref'),
      current_setting('behira.c5_photo_proof')::uuid,
      'accepted', null, gen_random_uuid(), 1, null
    );
    raise exception 'Locked profile reviewed proof';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000005', true);

do $$
begin
  if exists (
    select 1 from public.anomaly_proof_requirements
    where anomaly_id = current_setting('behira.c5_main')::uuid
  ) then
    raise exception 'Out-of-scope agent can read GE-01 proof requirements';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_base integer;
  v_result jsonb;
  v_replay jsonb;
begin
  select version_no into v_base
  from public.anomalies where id = current_setting('behira.c5_main')::uuid;
  perform set_config('behira.c5_review_base', v_base::text, true);

  v_result := public.review_anomaly_proof(
    current_setting('behira.c5_main_ref'),
    current_setting('behira.c5_photo_proof')::uuid,
    'accepted', 'Photo contrôlée et lisible',
    'b5000000-0000-0000-0000-000000000201', v_base, null
  );
  if (v_result ->> 'version_no')::integer <> v_base + 1
    or (select verification_status from public.proofs
        where id = current_setting('behira.c5_photo_proof')::uuid) <> 'accepted'
    or (select reviewed_by_profile_id from public.proofs
        where id = current_setting('behira.c5_photo_proof')::uuid) is distinct from public.current_profile_id()
    or (select state from public.anomaly_proof_requirements
        where id = current_setting('behira.c5_generic_requirement')::uuid) <> 'satisfied'
    or (select state from public.anomaly_proof_requirements
        where id = current_setting('behira.c5_specific_requirement')::uuid) <> 'pending'
    or (select count(*) from public.proof_requirement_evidence) <> 1 then
    raise exception 'Proof review did not preserve validation and requirement separation';
  end if;

  v_replay := public.review_anomaly_proof(
    current_setting('behira.c5_main_ref'),
    current_setting('behira.c5_photo_proof')::uuid,
    'accepted', 'Photo contrôlée et lisible',
    'b5000000-0000-0000-0000-000000000201', v_base, null
  );
  if not (v_replay ->> 'replayed')::boolean then
    raise exception 'Proof review replay was not idempotent';
  end if;

  begin
    perform public.review_anomaly_proof(
      current_setting('behira.c5_main_ref'),
      current_setting('behira.c5_photo_proof')::uuid,
      'accepted', 'Commentaire différent',
      'b5000000-0000-0000-0000-000000000201', v_base, null
    );
    raise exception 'Changed proof review replay unexpectedly succeeded';
  exception when invalid_parameter_value then
    null;
  end;
end;
$$;

reset role;

do $$
begin
  begin
    update public.anomalies
    set current_status_id = (select id from public.status_definitions where code = 'CLOTURE'),
        closure_comment = 'Une exigence typée reste attendue'
    where id = current_setting('behira.c5_main')::uuid;
    raise exception 'Closure ignored a pending typed requirement';
  exception when check_violation then
    if sqlerrm not like '%mandatory proof requirement%' then raise; end if;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_base integer;
  v_result jsonb;
  v_replay jsonb;
begin
  select version_no into v_base
  from public.anomalies where id = current_setting('behira.c5_main')::uuid;
  perform set_config('behira.c5_link_base', v_base::text, true);
  v_result := public.link_proof_to_requirement(
    current_setting('behira.c5_main_ref'),
    current_setting('behira.c5_specific_requirement')::uuid,
    current_setting('behira.c5_photo_proof')::uuid,
    'b5000000-0000-0000-0000-000000000202', v_base
  );
  if (v_result ->> 'version_no')::integer <> v_base + 1
    or (select state from public.anomaly_proof_requirements
        where id = current_setting('behira.c5_specific_requirement')::uuid) <> 'satisfied'
    or (select count(*) from public.proof_requirement_evidence) <> 2 then
    raise exception 'Explicit typed evidence link failed';
  end if;

  v_replay := public.link_proof_to_requirement(
    current_setting('behira.c5_main_ref'),
    current_setting('behira.c5_specific_requirement')::uuid,
    current_setting('behira.c5_photo_proof')::uuid,
    'b5000000-0000-0000-0000-000000000202', v_base
  );
  if not (v_replay ->> 'replayed')::boolean
    or (select count(*) from public.proof_requirement_evidence) <> 2 then
    raise exception 'Evidence link replay duplicated data';
  end if;
end;
$$;

reset role;

do $$
declare
  v_rejected_proof uuid;
begin
  begin
    delete from public.anomaly_proof_requirements
    where id = current_setting('behira.c5_specific_requirement')::uuid;
    raise exception 'Historical proof requirement was deleted';
  exception when check_violation then
    null;
  end;

  update public.anomalies
  set current_status_id = (select id from public.status_definitions where code = 'CLOTURE'),
      closure_comment = 'Toutes les exigences sont satisfaites'
  where id = current_setting('behira.c5_main')::uuid;
  if not exists (
    select 1 from public.anomalies a
    join public.status_definitions s on s.id = a.current_status_id
    where a.id = current_setting('behira.c5_main')::uuid and s.code = 'CLOTURE'
  ) then
    raise exception 'Satisfied proof requirements did not release closure';
  end if;

  insert into public.proofs(
    reference, anomaly_id, proof_type, storage_bucket, storage_path,
    mime_type, submitted_by_profile_id, verification_status
  ) values (
    null, current_setting('behira.c5_normal')::uuid, 'report',
    'anomaly-proofs', 'tests/c5-rejected.pdf', 'application/pdf',
    (select id from public.profiles where employee_code = 'SYL-PLB'), 'pending'
  ) returning id into v_rejected_proof;
  perform set_config('behira.c5_rejected_proof', v_rejected_proof::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_base integer;
begin
  select version_no into v_base
  from public.anomalies where id = current_setting('behira.c5_normal')::uuid;
  perform public.review_anomaly_proof(
    current_setting('behira.c5_normal_ref'),
    current_setting('behira.c5_rejected_proof')::uuid,
    'rejected', 'Rapport incomplet : mesure finale absente',
    'b5000000-0000-0000-0000-000000000203', v_base, null
  );

  if (select verification_status from public.proofs
      where id = current_setting('behira.c5_rejected_proof')::uuid) <> 'rejected'
    or (select rejection_reason from public.proofs
        where id = current_setting('behira.c5_rejected_proof')::uuid) <> 'Rapport incomplet : mesure finale absente'
    or (select reviewed_by_profile_id from public.proofs
        where id = current_setting('behira.c5_rejected_proof')::uuid) is distinct from public.current_profile_id()
    or (select reviewed_at from public.proofs
        where id = current_setting('behira.c5_rejected_proof')::uuid) is null then
    raise exception 'Rejected proof provenance is incomplete';
  end if;

  if not exists (
    select 1
    from public.anomaly_history h
    join public.business_event_definitions e on e.id = h.event_definition_id
    where h.anomaly_id = current_setting('behira.c5_normal')::uuid
      and e.code = 'PROOF_REJECTED'
      and h.actor_profile_id = public.current_profile_id()
      and h.comment = 'Rapport incomplet : mesure finale absente'
  ) then
    raise exception 'Rejected proof history is incomplete';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', 'b5000000-0000-0000-0000-000000000003', true);

do $$
begin
  if (select count(*) from public.anomaly_proof_requirements
      where anomaly_id = current_setting('behira.c5_main')::uuid) <> 2
    or not exists (
      select 1
      from public.anomaly_history h
      join public.business_event_definitions e on e.id = h.event_definition_id
      where h.anomaly_id = current_setting('behira.c5_main')::uuid
        and e.code = 'PROOF_REQUIREMENT_APPLIED'
    )
    or not exists (
      select 1
      from public.anomaly_history h
      join public.business_event_definitions e on e.id = h.event_definition_id
      where h.anomaly_id = current_setting('behira.c5_main')::uuid
        and e.code = 'PROOF_REQUIREMENT_REINFORCED'
    )
    or (select count(*)
        from public.anomaly_history h
        join public.business_event_definitions e on e.id = h.event_definition_id
        where h.anomaly_id = current_setting('behira.c5_main')::uuid
          and e.code = 'PROOF_REQUIREMENT_SATISFIED') <> 2 then
    raise exception 'Administration audit visibility or C5 history is incomplete';
  end if;
end;
$$;

reset role;
select extensions.pass('C5 proof rules, immutable snapshots, explicit evidence, review provenance, closure guard, idempotency and RLS passed');
select * from extensions.finish();
rollback;
