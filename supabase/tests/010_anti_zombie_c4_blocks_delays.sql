\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('a0000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c4.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c4.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c4.direction@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'c4.locked@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('a0000000-0000-0000-0000-000000000005', 'authenticated', 'authenticated', 'c4.outscope@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = 'a0000000-0000-0000-0000-000000000001',
    account_status = 'active', must_change_password = false
where employee_code = 'EVAR-ELEC';
update public.profiles
set auth_user_id = 'a0000000-0000-0000-0000-000000000002',
    account_status = 'active', must_change_password = false
where employee_code = 'FAU-FM';
update public.profiles
set auth_user_id = 'a0000000-0000-0000-0000-000000000003',
    account_status = 'active', must_change_password = false
where employee_code = 'DIR-FRED';
update public.profiles
set auth_user_id = 'a0000000-0000-0000-0000-000000000004',
    account_status = 'active', must_change_password = true,
    temporary_password_set_at = now(), password_changed_at = null
where employee_code = 'SYL-PLB';
update public.profiles
set auth_user_id = 'a0000000-0000-0000-0000-000000000005',
    account_status = 'active', must_change_password = false
where employee_code = 'LET-RND';

do $$
declare
  v_main uuid;
  v_admin uuid;
  v_closure uuid;
  v_future uuid;
  v_deadline uuid;
  v_future_deadline uuid;
begin
  if has_table_privilege('anon', 'public.anomaly_blocks', 'SELECT')
    or has_table_privilege('anon', 'public.anomaly_delay_justifications', 'SELECT')
    or not has_table_privilege('authenticated', 'public.anomaly_blocks', 'SELECT')
    or not has_table_privilege('authenticated', 'public.anomaly_delay_justifications', 'SELECT')
    or has_table_privilege('authenticated', 'public.anomaly_blocks', 'INSERT')
    or has_table_privilege('authenticated', 'public.anomaly_blocks', 'UPDATE')
    or has_table_privilege('authenticated', 'public.anomaly_blocks', 'DELETE')
    or has_table_privilege('authenticated', 'public.anomaly_delay_justifications', 'INSERT')
    or has_table_privilege('authenticated', 'public.anomaly_delay_justifications', 'UPDATE')
    or has_table_privilege('authenticated', 'public.anomaly_delay_justifications', 'DELETE') then
    raise exception 'C4 table grants are unsafe';
  end if;

  if has_function_privilege(
      'anon',
      'public.declare_anomaly_block(text,text,text,text,uuid,uuid,text,uuid,uuid,integer,timestamptz)',
      'EXECUTE'
    ) or has_function_privilege(
      'anon',
      'public.record_anomaly_delay_justification(text,uuid,text,text,uuid,integer,timestamptz)',
      'EXECUTE'
    ) or not has_function_privilege(
      'authenticated',
      'public.confirm_anomaly_block_resolution(text,uuid,text,text,uuid,integer,timestamptz)',
      'EXECUTE'
    ) then
    raise exception 'C4 function grants are unsafe';
  end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'anomaly_blocks' and c.relrowsecurity
  ) or not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'anomaly_delay_justifications' and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on both C4 tables';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id,
    detected_at, qualification_due_at
  ) values (
    null, 'TEST C4 PRINCIPAL', 'Blocage et retard C4',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'PRIORITY'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    now(), now() - interval '1 day'
  ) returning id into v_main;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id,
    detected_at, qualification_due_at
  ) values (
    null, 'TEST C4 ADMINISTRATION', 'Arbitrage Administration C4',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'PRIORITY'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    now(), now() - interval '1 day'
  ) returning id into v_admin;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id,
    detected_at, resolved_at
  ) values (
    null, 'TEST C4 CLOTURE', 'Verrou de clôture C4',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'NORMAL'),
    (select id from public.status_definitions where code = 'RESOLU'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    now() - interval '10 days', now()
  ) returning id into v_closure;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id, detected_at
  ) values (
    null, 'TEST C4 FUTUR', 'Échéance non dépassée C4',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'LOW'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    now()
  ) returning id into v_future;

  select id into v_deadline from public.anomaly_deadlines
  where anomaly_id = v_main and superseded_at is null;
  select id into v_future_deadline from public.anomaly_deadlines
  where anomaly_id = v_future and superseded_at is null;

  if v_deadline is null
    or (select due_at from public.anomaly_deadlines where id = v_deadline) >= now()
    or v_future_deadline is null
    or (select due_at from public.anomaly_deadlines where id = v_future_deadline) <= now() then
    raise exception 'C4 overdue and future deadline fixtures are invalid';
  end if;

  perform set_config('behira.c4_main', v_main::text, true);
  perform set_config('behira.c4_main_ref', (select reference from public.anomalies where id = v_main), true);
  perform set_config('behira.c4_admin', v_admin::text, true);
  perform set_config('behira.c4_admin_ref', (select reference from public.anomalies where id = v_admin), true);
  perform set_config('behira.c4_closure', v_closure::text, true);
  perform set_config('behira.c4_closure_ref', (select reference from public.anomalies where id = v_closure), true);
  perform set_config('behira.c4_future_ref', (select reference from public.anomalies where id = v_future), true);
  perform set_config('behira.c4_deadline', v_deadline::text, true);
  perform set_config('behira.c4_future_deadline', v_future_deadline::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_result jsonb;
  v_replay jsonb;
  v_block uuid;
begin
  begin
    insert into public.anomaly_blocks(
      anomaly_id, block_reason_code_id, reason_detail, blocking_actor_type,
      blocking_external_label, blocking_actor_label_snapshot,
      declared_by_profile_id, declaration_idempotency_key,
      declaration_base_version_no
    ) values (
      current_setting('behira.c4_main')::uuid,
      (select id from public.block_reason_codes where code = 'DIAGNOSIS_PENDING'),
      'Écriture directe interdite', 'external', 'Tiers', 'Tiers',
      (select id from public.profiles where employee_code = 'EVAR-ELEC'),
      gen_random_uuid(), 1
    );
    raise exception 'Agent directly inserted a canonical block';
  exception when insufficient_privilege then
    null;
  end;

  v_result := public.declare_anomaly_block(
    current_setting('behira.c4_main_ref'),
    'DIAGNOSIS_PENDING',
    'Accès technique requis avant le diagnostic',
    'external', null, null, 'Exploitant technique externe', null,
    'a0000000-0000-0000-0000-000000000101', 1, '2026-08-30 18:00:00+00'::timestamptz
  );
  v_block := (v_result ->> 'block_id')::uuid;

  if (v_result ->> 'version_no')::integer <> 2
    or (v_result ->> 'replayed')::boolean
    or (select state from public.anomaly_blocks where id = v_block) <> 'active'
    or (select blocking_actor_label_snapshot from public.anomaly_blocks where id = v_block)
      <> 'Exploitant technique externe' then
    raise exception 'Assigned agent did not create the canonical external block';
  end if;

  v_replay := public.declare_anomaly_block(
    current_setting('behira.c4_main_ref'),
    'DIAGNOSIS_PENDING',
    'Accès technique requis avant le diagnostic',
    'external', null, null, 'Exploitant technique externe', null,
    'a0000000-0000-0000-0000-000000000101', 1, '2026-08-30 18:00:00+00'::timestamptz
  );
  if not (v_replay ->> 'replayed')::boolean
    or (v_replay ->> 'block_id')::uuid <> v_block then
    raise exception 'Block declaration replay is not idempotent';
  end if;

  begin
    perform public.declare_anomaly_block(
      current_setting('behira.c4_main_ref'),
      'DIAGNOSIS_PENDING', 'Contenu différent',
      'external', null, null, 'Exploitant technique externe', null,
      'a0000000-0000-0000-0000-000000000101', 1, '2026-08-30 18:00:00+00'::timestamptz
    );
    raise exception 'A declaration idempotency key accepted different content';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.declare_anomaly_block(
      current_setting('behira.c4_main_ref'),
      'PROOF_PENDING', 'Deuxième blocage interdit',
      'external', null, null, 'Autre tiers', null,
      'a0000000-0000-0000-0000-000000000102', 2, null
    );
    raise exception 'A second active block unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;

  v_result := public.propose_anomaly_block_resolution(
    current_setting('behira.c4_main_ref'), v_block,
    'Accès obtenu, diagnostic désormais possible',
    'a0000000-0000-0000-0000-000000000103', 2, null
  );
  if (v_result ->> 'version_no')::integer <> 3
    or (select state from public.anomaly_blocks where id = v_block) <> 'resolution_proposed' then
    raise exception 'Agent resolution proposal was not persisted';
  end if;

  begin
    perform public.confirm_anomaly_block_resolution(
      current_setting('behira.c4_main_ref'), v_block,
      'DEPENDENCY_RECEIVED', null,
      'a0000000-0000-0000-0000-000000000104', 3, null
    );
    raise exception 'Agent confirmed their own operational block resolution';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('behira.c4_first_block', v_block::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000004', true);

do $$
begin
  if (select count(*) from public.anomaly_blocks
      where anomaly_id = current_setting('behira.c4_main')::uuid) <> 0 then
    raise exception 'First-password lock leaked C4 block data';
  end if;
  begin
    perform public.declare_anomaly_block(
      current_setting('behira.c4_main_ref'),
      'DIAGNOSIS_PENDING', 'Tentative profil verrouillé',
      'external', null, null, 'Tiers', null,
      'a0000000-0000-0000-0000-000000000105', 3, null
    );
    raise exception 'Locked profile declared a block';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_result jsonb;
  v_replay jsonb;
  v_vendor_block uuid;
  v_closure_block uuid;
begin
  v_result := public.confirm_anomaly_block_resolution(
    current_setting('behira.c4_main_ref'),
    current_setting('behira.c4_first_block')::uuid,
    'DEPENDENCY_RECEIVED', null,
    'a0000000-0000-0000-0000-000000000106', 3, null
  );
  if (v_result ->> 'version_no')::integer <> 4
    or (select state from public.anomaly_blocks
        where id = current_setting('behira.c4_first_block')::uuid) <> 'resolved'
    or (select resolution_detail from public.anomaly_blocks
        where id = current_setting('behira.c4_first_block')::uuid) <> 'Élément attendu reçu' then
    raise exception 'Facility Manager did not confirm the operational block resolution';
  end if;

  v_replay := public.confirm_anomaly_block_resolution(
    current_setting('behira.c4_main_ref'),
    current_setting('behira.c4_first_block')::uuid,
    'DEPENDENCY_RECEIVED', null,
    'a0000000-0000-0000-0000-000000000106', 3, null
  );
  if not (v_replay ->> 'replayed')::boolean then
    raise exception 'Block resolution replay is not idempotent';
  end if;

  v_result := public.declare_anomaly_block(
    current_setting('behira.c4_main_ref'),
    'QUOTE_PENDING', 'Devis DMC attendu pour décision',
    'vendor', null, (select id from public.vendors where code = 'DMC'), null,
    current_setting('behira.c4_first_block')::uuid,
    'a0000000-0000-0000-0000-000000000107', 4, null
  );
  v_vendor_block := (v_result ->> 'block_id')::uuid;
  if (v_result ->> 'version_no')::integer <> 5
    or (select blocking_actor_label_snapshot from public.anomaly_blocks where id = v_vendor_block)
      <> 'DM COMPANY'
    or (select previous_block_id from public.anomaly_blocks where id = v_vendor_block)
      <> current_setting('behira.c4_first_block')::uuid then
    raise exception 'Referenced vendor block or reopening chain is incomplete';
  end if;

  v_result := public.propose_anomaly_block_resolution(
    current_setting('behira.c4_main_ref'), v_vendor_block,
    'Devis reçu et rattaché au dossier',
    'a0000000-0000-0000-0000-000000000108', 5, null
  );
  v_result := public.confirm_anomaly_block_resolution(
    current_setting('behira.c4_main_ref'), v_vendor_block,
    'DEPENDENCY_RECEIVED', 'Devis exploitable reçu',
    'a0000000-0000-0000-0000-000000000109', 6, null
  );
  if (v_result ->> 'version_no')::integer <> 7
    or exists (
      select 1 from public.anomaly_blocks
      where anomaly_id = current_setting('behira.c4_main')::uuid
        and state in ('active', 'resolution_proposed')
    ) then
    raise exception 'Second block was not resolved without losing its predecessor';
  end if;

  v_result := public.declare_anomaly_block(
    current_setting('behira.c4_closure_ref'),
    'PROOF_PENDING', 'Pièce attendue avant clôture',
    'internal', (select id from public.profiles where employee_code = 'EVAR-ELEC'), null, null, null,
    'a0000000-0000-0000-0000-000000000110', 1, null
  );
  v_closure_block := (v_result ->> 'block_id')::uuid;

  perform set_config('behira.c4_vendor_block', v_vendor_block::text, true);
  perform set_config('behira.c4_closure_block', v_closure_block::text, true);
end;
$$;

reset role;
do $$
begin
  begin
    update public.anomalies
    set current_status_id = (select id from public.status_definitions where code = 'CLOTURE'),
        closure_comment = 'Clôture interdite avec blocage actif'
    where id = current_setting('behira.c4_closure')::uuid;
    raise exception 'A dossier with an active block was closed';
  exception when check_violation then
    if position('active block' in sqlerrm) = 0 then
      raise;
    end if;
  end;

  begin
    delete from public.anomaly_blocks
    where id = current_setting('behira.c4_first_block')::uuid;
    raise exception 'A historical block was deleted';
  exception when check_violation then
    null;
  end;
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_result jsonb;
  v_replay jsonb;
  v_first uuid;
  v_second uuid;
begin
  v_result := public.record_anomaly_delay_justification(
    current_setting('behira.c4_main_ref'),
    current_setting('behira.c4_deadline')::uuid,
    'QUALIFICATION_OVERDUE',
    'Accès technique obtenu après dépassement du SLA',
    'a0000000-0000-0000-0000-000000000111', 7, null
  );
  v_first := (v_result ->> 'justification_id')::uuid;
  if (v_result ->> 'version_no')::integer <> 8
    or (select state from public.anomaly_delay_justifications where id = v_first) <> 'active' then
    raise exception 'Agent delay justification was not recorded';
  end if;

  v_replay := public.record_anomaly_delay_justification(
    current_setting('behira.c4_main_ref'),
    current_setting('behira.c4_deadline')::uuid,
    'QUALIFICATION_OVERDUE',
    'Accès technique obtenu après dépassement du SLA',
    'a0000000-0000-0000-0000-000000000111', 7, null
  );
  if not (v_replay ->> 'replayed')::boolean
    or (v_replay ->> 'justification_id')::uuid <> v_first then
    raise exception 'Delay justification replay is not idempotent';
  end if;

  v_result := public.record_anomaly_delay_justification(
    current_setting('behira.c4_main_ref'),
    current_setting('behira.c4_deadline')::uuid,
    'QUALIFICATION_OVERDUE',
    'Diagnostic repris ; justification complétée',
    'a0000000-0000-0000-0000-000000000112', 8, null
  );
  v_second := (v_result ->> 'justification_id')::uuid;
  if (v_result ->> 'version_no')::integer <> 9
    or (select state from public.anomaly_delay_justifications where id = v_first) <> 'superseded'
    or (select previous_justification_id from public.anomaly_delay_justifications where id = v_second) <> v_first
    or (select count(*) from public.anomaly_delay_justifications
        where deadline_id = current_setting('behira.c4_deadline')::uuid and state = 'active') <> 1 then
    raise exception 'Agent delay complement did not preserve the previous justification';
  end if;

  begin
    perform public.record_anomaly_delay_justification(
      current_setting('behira.c4_main_ref'),
      current_setting('behira.c4_deadline')::uuid,
      'INTERVENTION_OVERDUE', 'Changement de code interdit à l’agent',
      'a0000000-0000-0000-0000-000000000113', 9, null
    );
    raise exception 'Agent changed the controlled delay code';
  exception when insufficient_privilege then
    null;
  end;

  perform set_config('behira.c4_delay_second', v_second::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000005', true);
do $$
begin
  if (select count(*) from public.anomaly_blocks) <> 0
    or (select count(*) from public.anomaly_delay_justifications) <> 0 then
    raise exception 'Out-of-scope agent can read C4 data';
  end if;
  begin
    perform public.declare_anomaly_block(
      current_setting('behira.c4_main_ref'),
      'DIAGNOSIS_PENDING', 'Tentative hors périmètre',
      'external', null, null, 'Tiers', null,
      'a0000000-0000-0000-0000-000000000114', 9, null
    );
    raise exception 'Out-of-scope agent declared a block';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', true);
do $$
declare
  v_result jsonb;
begin
  begin
    perform public.record_anomaly_delay_justification(
      current_setting('behira.c4_main_ref'),
      current_setting('behira.c4_deadline')::uuid,
      'INTERVENTION_OVERDUE', 'Code incompatible avec la Qualification',
      'a0000000-0000-0000-0000-000000000115', 9, null
    );
    raise exception 'Incompatible delay reason unexpectedly succeeded';
  exception when check_violation then
    null;
  end;

  v_result := public.record_anomaly_delay_justification(
    current_setting('behira.c4_main_ref'),
    current_setting('behira.c4_deadline')::uuid,
    'QUALIFICATION_OVERDUE',
    'Justification consolidée par le Facility Manager',
    'a0000000-0000-0000-0000-000000000116', 9, null
  );
  if (v_result ->> 'version_no')::integer <> 10
    or (select count(*) from public.anomaly_delay_justifications
        where deadline_id = current_setting('behira.c4_deadline')::uuid and state = 'active') <> 1 then
    raise exception 'Facility Manager did not replace the current delay justification';
  end if;

  begin
    perform public.record_anomaly_delay_justification(
      current_setting('behira.c4_future_ref'),
      current_setting('behira.c4_future_deadline')::uuid,
      'QUALIFICATION_OVERDUE', 'Échéance encore future',
      'a0000000-0000-0000-0000-000000000117', 1, null
    );
    raise exception 'A non-overdue deadline accepted a delay justification';
  exception when check_violation then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', true);
do $$
declare
  v_result jsonb;
  v_admin_block uuid;
begin
  begin
    perform public.record_anomaly_delay_justification(
      current_setting('behira.c4_main_ref'),
      current_setting('behira.c4_deadline')::uuid,
      'QUALIFICATION_OVERDUE', 'Direction hors arbitrage',
      'a0000000-0000-0000-0000-000000000118', 10, null
    );
    raise exception 'Direction justified a non-Administration delay';
  exception when insufficient_privilege then
    null;
  end;

  v_result := public.declare_anomaly_block(
    current_setting('behira.c4_admin_ref'),
    'ADMIN_DECISION_PENDING', 'Arbitrage de l’Administration requis',
    'internal', (select id from public.profiles where employee_code = 'DIR-FRED'), null, null, null,
    'a0000000-0000-0000-0000-000000000119', 1, null
  );
  v_admin_block := (v_result ->> 'block_id')::uuid;
  v_result := public.propose_anomaly_block_resolution(
    current_setting('behira.c4_admin_ref'), v_admin_block,
    'Arbitrage enregistré par l’Administration',
    'a0000000-0000-0000-0000-000000000120', 2, null
  );
  perform set_config('behira.c4_admin_block', v_admin_block::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000002', true);
do $$
begin
  begin
    perform public.confirm_anomaly_block_resolution(
      current_setting('behira.c4_admin_ref'),
      current_setting('behira.c4_admin_block')::uuid,
      'DECISION_RECORDED', null,
      'a0000000-0000-0000-0000-000000000121', 3, null
    );
    raise exception 'Facility Manager confirmed an Administration block';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000003', true);
do $$
declare
  v_result jsonb;
begin
  v_result := public.confirm_anomaly_block_resolution(
    current_setting('behira.c4_admin_ref'),
    current_setting('behira.c4_admin_block')::uuid,
    'DECISION_RECORDED', null,
    'a0000000-0000-0000-0000-000000000122', 3, null
  );
  if (v_result ->> 'version_no')::integer <> 4
    or (select state from public.anomaly_blocks
        where id = current_setting('behira.c4_admin_block')::uuid) <> 'resolved'
    or (select count(*) from public.anomaly_blocks) <> 4 then
    raise exception 'Direction did not confirm its arbitration block or lost global visibility';
  end if;

  if (select count(*)
      from public.anomaly_history h
      join public.business_event_definitions e on e.id = h.event_definition_id
      where h.anomaly_id = current_setting('behira.c4_main')::uuid
        and e.code in (
          'BLOCK_DECLARED', 'BLOCK_RESOLUTION_PROPOSED', 'BLOCK_RESOLVED',
          'DELAY_JUSTIFICATION_CREATED', 'DELAY_JUSTIFICATION_REPLACED'
        )) <> 9 then
    raise exception 'C4 block and delay history is incomplete or duplicated';
  end if;
end;
$$;

reset role;
select extensions.pass('C4 blocks, resolution separation, overdue justifications, history, idempotency, closure guard and RLS passed');
select * from extensions.finish();
rollback;
