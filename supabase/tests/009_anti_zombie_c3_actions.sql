\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('90000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c3.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('90000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c3.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('90000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c3.direction@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('90000000-0000-0000-0000-000000000004', 'authenticated', 'authenticated', 'c3.locked@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = '90000000-0000-0000-0000-000000000001',
    account_status = 'active',
    must_change_password = false
where employee_code = 'EVAR-ELEC';

update public.profiles
set auth_user_id = '90000000-0000-0000-0000-000000000002',
    account_status = 'active',
    must_change_password = false
where employee_code = 'FAU-FM';

update public.profiles
set auth_user_id = '90000000-0000-0000-0000-000000000003',
    account_status = 'active',
    must_change_password = false
where employee_code = 'DIR-FRED';

update public.profiles
set auth_user_id = '90000000-0000-0000-0000-000000000004',
    account_status = 'active',
    must_change_password = true,
    temporary_password_set_at = now(),
    password_changed_at = null
where employee_code = 'SYL-PLB';

do $$
declare
  v_anomaly uuid;
  v_system_exit_anomaly uuid;
  v_initial_action uuid;
begin
  if has_table_privilege('anon', 'public.anomaly_actions', 'SELECT')
    or not has_table_privilege('authenticated', 'public.anomaly_actions', 'SELECT')
    or has_table_privilege('authenticated', 'public.anomaly_actions', 'INSERT')
    or has_table_privilege('authenticated', 'public.anomaly_actions', 'UPDATE')
    or has_table_privilege('authenticated', 'public.anomaly_actions', 'DELETE') then
    raise exception 'C3 action grants are unsafe';
  end if;

  if has_function_privilege(
      'anon',
      'public.set_anomaly_next_action(text,text,uuid,text,uuid,integer)',
      'EXECUTE'
    )
    or has_function_privilege(
      'anon',
      'public.complete_qualification_action(text,uuid,text,uuid,integer)',
      'EXECUTE'
    )
    or not has_function_privilege(
      'authenticated',
      'public.set_anomaly_next_action(text,text,uuid,text,uuid,integer)',
      'EXECUTE'
    )
    or has_function_privilege(
      'authenticated',
      'public.validate_anomaly_action_row()',
      'EXECUTE'
    ) then
    raise exception 'C3 function execution grants are unsafe';
  end if;

  if not exists (
    select 1
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'anomaly_actions'
      and c.relrowsecurity
  ) then
    raise exception 'RLS is not enabled on anomaly_actions';
  end if;

  if exists (
    select 1
    from public.next_action_codes
    where code in ('QUALIFY_ASSIGN', 'PERFORM_DIAGNOSIS', 'CHOOSE_TREATMENT_BRANCH')
      and requires_comment
  ) or not exists (
    select 1 from public.next_action_codes
    where code = 'OTHER' and requires_comment and not is_active
  ) then
    raise exception 'C3 comment rules do not match the validated controlled-code contract';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id
  ) values (
    null,
    'TEST C3 ACTIONS',
    'Fixture transactionnelle C3',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'PRIORITY'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC')
  ) returning id into v_anomaly;

  select aa.id into v_initial_action
  from public.anomaly_actions aa
  join public.next_action_codes c on c.id = aa.action_code_id
  where aa.anomaly_id = v_anomaly
    and aa.state = 'pending'
    and c.code = 'QUALIFY_ASSIGN';

  if v_initial_action is null
    or (select assigned_profile_id from public.anomaly_actions where id = v_initial_action) is not null
    or (select count(*) from public.anomaly_actions where anomaly_id = v_anomaly and state = 'pending') <> 1
    or not exists (
      select 1
      from public.anomaly_history h
      join public.business_event_definitions e on e.id = h.event_definition_id
      where h.anomaly_id = v_anomaly
        and e.code = 'ACTION_CREATED'
        and h.source_table = 'anomaly_actions'
        and h.source_record_id = v_initial_action
        and h.actor_label_snapshot = 'Système BEHIRA'
    ) then
    raise exception 'Entering Qualification did not create one canonical unassigned action with provenance';
  end if;

  begin
    insert into public.anomaly_actions(
      anomaly_id, action_code_id, state, source_kind, source_record_id,
      idempotency_key, base_version_no
    ) values (
      v_anomaly,
      (select id from public.next_action_codes where code = 'QUALIFY_ASSIGN'),
      'pending', 'qualification', v_anomaly, gen_random_uuid(), 1
    );
    raise exception 'A second pending action unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id, assigned_profile_id
  ) values (
    null,
    'TEST C3 SYSTEM EXIT',
    'Fixture annulation système C3',
    (select id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'PRIORITY'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC')
  ) returning id into v_system_exit_anomaly;

  update public.anomalies
  set current_status_id = (
    select id from public.status_definitions where code = 'INTERVENTION_INTERNE_PLANIFIEE'
  )
  where id = v_system_exit_anomaly;

  if not exists (
    select 1
    from public.anomaly_actions
    where anomaly_id = v_system_exit_anomaly
      and state = 'cancelled'
      and cancelled_by_profile_id is null
      and cancelled_by_system
      and cancellation_reason is not null
  ) or not exists (
    select 1
    from public.anomaly_history h
    join public.business_event_definitions e on e.id = h.event_definition_id
    where h.anomaly_id = v_system_exit_anomaly
      and e.code = 'ACTION_CANCELLED'
      and h.actor_label_snapshot = 'Système BEHIRA'
  ) then
    raise exception 'System Qualification exit did not preserve an explicit cancellation provenance';
  end if;

  perform set_config('behira.c3_anomaly', v_anomaly::text, true);
  perform set_config('behira.c3_reference', (select reference from public.anomalies where id = v_anomaly), true);
  perform set_config('behira.c3_initial_action', v_initial_action::text, true);
end;
$$;

set local role authenticated;
select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000004', true);

do $$
begin
  if (select count(*) from public.anomaly_actions
      where anomaly_id = current_setting('behira.c3_anomaly')::uuid) <> 0 then
    raise exception 'First-password lock leaked canonical actions';
  end if;

  begin
    perform public.set_anomaly_next_action(
      current_setting('behira.c3_reference'), 'QUALIFY_ASSIGN', null, null,
      '90000000-0000-0000-0000-000000000091', 1
    );
    raise exception 'Locked profile changed a canonical action';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);

do $$
begin
  if (select count(*) from public.anomaly_actions
      where anomaly_id = current_setting('behira.c3_anomaly')::uuid) <> 1 then
    raise exception 'Scoped responsible agent cannot read the canonical action';
  end if;

  begin
    insert into public.anomaly_actions(
      anomaly_id, action_code_id, state, source_kind, source_record_id,
      idempotency_key, base_version_no
    ) values (
      current_setting('behira.c3_anomaly')::uuid,
      (select id from public.next_action_codes where code = 'QUALIFY_ASSIGN'),
      'pending', 'qualification', current_setting('behira.c3_anomaly')::uuid,
      gen_random_uuid(), 1
    );
    raise exception 'Agent directly inserted a canonical action';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform public.set_anomaly_next_action(
      current_setting('behira.c3_reference'), 'QUALIFY_ASSIGN', null, null,
      '90000000-0000-0000-0000-000000000092', 1
    );
    raise exception 'Agent selected a Facility Manager action';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000002', true);

do $$
declare
  v_result jsonb;
  v_replay jsonb;
  v_qualify uuid;
  v_diagnosis uuid;
begin
  v_result := public.set_anomaly_next_action(
    current_setting('behira.c3_reference'),
    'QUALIFY_ASSIGN',
    (select id from public.profiles where employee_code = 'FAU-FM'),
    null,
    '90000000-0000-0000-0000-000000000093',
    1
  );
  v_qualify := (v_result ->> 'action_id')::uuid;

  if (v_result ->> 'action_code') <> 'QUALIFY_ASSIGN'
    or (v_result ->> 'version_no')::integer <> 2
    or (v_result ->> 'replayed')::boolean
    or (select state from public.anomaly_actions
        where id = current_setting('behira.c3_initial_action')::uuid) <> 'superseded'
    or (select assigned_profile_id from public.anomaly_actions where id = v_qualify)
      <> (select id from public.profiles where employee_code = 'FAU-FM') then
    raise exception 'Facility Manager did not atomically assign the canonical Qualification action';
  end if;

  begin
    perform public.set_anomaly_next_action(
      current_setting('behira.c3_reference'), 'PERFORM_DIAGNOSIS', null, null,
      '90000000-0000-0000-0000-000000000094', 2
    );
    raise exception 'Qualification sequence was skipped';
  exception when check_violation then
    null;
  end;

  v_result := public.complete_qualification_action(
    current_setting('behira.c3_reference'), v_qualify,
    'Qualification et affectation confirmées',
    '90000000-0000-0000-0000-000000000095',
    2
  );
  v_diagnosis := (v_result ->> 'next_action_id')::uuid;

  if (v_result ->> 'next_action_code') <> 'PERFORM_DIAGNOSIS'
    or (v_result ->> 'version_no')::integer <> 3
    or (select state from public.anomaly_actions where id = v_qualify) <> 'completed'
    or (select assigned_profile_id from public.anomaly_actions where id = v_diagnosis)
      <> (select id from public.profiles where employee_code = 'EVAR-ELEC')
    or (select count(*) from public.anomaly_actions
        where anomaly_id = current_setting('behira.c3_anomaly')::uuid and state = 'pending') <> 1 then
    raise exception 'QUALIFY_ASSIGN did not produce exactly one diagnosis action for the responsible agent';
  end if;

  v_replay := public.complete_qualification_action(
    current_setting('behira.c3_reference'), v_qualify,
    'Qualification et affectation confirmées',
    '90000000-0000-0000-0000-000000000095',
    2
  );
  if not (v_replay ->> 'replayed')::boolean
    or (v_replay ->> 'next_action_id')::uuid <> v_diagnosis
    or (select count(*) from public.anomaly_actions
        where anomaly_id = current_setting('behira.c3_anomaly')::uuid and state = 'pending') <> 1 then
    raise exception 'Qualification completion is not idempotent';
  end if;

  begin
    perform public.complete_qualification_action(
      current_setting('behira.c3_reference'), v_qualify,
      'Contenu différent interdit',
      '90000000-0000-0000-0000-000000000095',
      2
    );
    raise exception 'An idempotency key was reused with different content';
  exception when invalid_parameter_value then
    null;
  end;

  begin
    perform public.set_anomaly_next_action(
      current_setting('behira.c3_reference'), 'PERFORM_DIAGNOSIS', null, null,
      '90000000-0000-0000-0000-000000000096', 2
    );
    raise exception 'A stale dossier version unexpectedly succeeded';
  exception when serialization_failure then
    null;
  end;

  perform set_config('behira.c3_diagnosis', v_diagnosis::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_result jsonb;
  v_replay jsonb;
  v_branch uuid;
begin
  v_result := public.complete_qualification_action(
    current_setting('behira.c3_reference'),
    current_setting('behira.c3_diagnosis')::uuid,
    'Diagnostic terrain terminé',
    '90000000-0000-0000-0000-000000000097',
    3
  );
  v_branch := (v_result ->> 'next_action_id')::uuid;

  if (v_result ->> 'next_action_code') <> 'CHOOSE_TREATMENT_BRANCH'
    or (v_result ->> 'version_no')::integer <> 4
    or (select state from public.anomaly_actions
        where id = current_setting('behira.c3_diagnosis')::uuid) <> 'completed'
    or (select assigned_profile_id from public.anomaly_actions where id = v_branch)
      <> (select id from public.profiles where employee_code = 'FAU-FM') then
    raise exception 'Diagnosis did not produce the Facility Manager branch-choice action';
  end if;

  v_replay := public.complete_qualification_action(
    current_setting('behira.c3_reference'),
    current_setting('behira.c3_diagnosis')::uuid,
    'Diagnostic terrain terminé',
    '90000000-0000-0000-0000-000000000097',
    3
  );
  if not (v_replay ->> 'replayed')::boolean
    or (v_replay ->> 'next_action_id')::uuid <> v_branch then
    raise exception 'Diagnosis completion is not idempotent';
  end if;

  perform set_config('behira.c3_branch', v_branch::text, true);
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000002', true);

do $$
begin
  begin
    perform public.complete_qualification_action(
      current_setting('behira.c3_reference'),
      current_setting('behira.c3_branch')::uuid,
      null,
      '90000000-0000-0000-0000-000000000098',
      4
    );
    raise exception 'Branch choice was completed without the future branch transaction';
  exception when check_violation then
    null;
  end;

  if (select count(*) from public.anomaly_actions
      where anomaly_id = current_setting('behira.c3_anomaly')::uuid and state = 'pending') <> 1
    or not exists (
      select 1
      from public.anomaly_actions aa
      join public.next_action_codes c on c.id = aa.action_code_id
      where aa.id = current_setting('behira.c3_branch')::uuid
        and aa.state = 'pending'
        and c.code = 'CHOOSE_TREATMENT_BRANCH'
    ) then
    raise exception 'Branch action was not preserved pending for the next transaction lot';
  end if;

  if (select count(*)
      from public.anomaly_history h
      join public.business_event_definitions e on e.id = h.event_definition_id
      where h.anomaly_id = current_setting('behira.c3_anomaly')::uuid
        and e.code in ('ACTION_CREATED', 'ACTION_COMPLETED', 'ACTION_REPLACED')) < 6 then
    raise exception 'C3 action history is incomplete';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '90000000-0000-0000-0000-000000000003', true);

do $$
begin
  if (select count(*) from public.anomaly_actions
      where anomaly_id = current_setting('behira.c3_anomaly')::uuid) <> 4 then
    raise exception 'Direction cannot read the complete action timeline';
  end if;

  begin
    perform public.set_anomaly_next_action(
      current_setting('behira.c3_reference'), 'CHOOSE_TREATMENT_BRANCH', null, null,
      '90000000-0000-0000-0000-000000000099', 4
    );
    raise exception 'Direction changed a Facility Manager action';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
select extensions.pass('C3 canonical Qualification actions, sequence, history, idempotency, RLS and system provenance passed');
select * from extensions.finish();
rollback;
