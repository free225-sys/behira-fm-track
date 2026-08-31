\set ON_ERROR_STOP on

begin;
select extensions.plan(27);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c1000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c10.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c1000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c10.direction@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c1000000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c10.agent@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = 'c1000000-0000-0000-0000-000000000001',
    account_status = 'active', must_change_password = false
where employee_code = 'FAU-FM';
update public.profiles
set auth_user_id = 'c1000000-0000-0000-0000-000000000002',
    account_status = 'active', must_change_password = false
where employee_code = 'DIR-FRED';
update public.profiles
set auth_user_id = 'c1000000-0000-0000-0000-000000000003',
    account_status = 'active', must_change_password = false
where employee_code = 'EVAR-ELEC';

do $$
declare
  v_report_id uuid;
  v_anomaly_id uuid;
  v_closed_id uuid;
begin
  insert into public.reports(
    reference, report_type, equipment_id, zone_id, reported_by_profile_id,
    performed_at, submitted_at, report_status, analysis, raw_payload
  ) values (
    null, 'field_observation',
    (select id from public.equipment where code = 'GE-01'),
    (select primary_zone_id from public.equipment where code = 'GE-01'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    clock_timestamp(), clock_timestamp(), 'submitted',
    'Constat financier C10 transactionnel.',
    jsonb_build_object('source', 'c10_transactional_test')
  ) returning id into v_report_id;

  insert into public.anomalies(
    reference, title, description, equipment_id, zone_id, category_id,
    priority_id, current_status_id, source_report_id,
    reported_by_profile_id, assigned_profile_id,
    detected_at, qualification_due_at, intervention_due_at
  ) values (
    null, 'TEST C10 DÉCISION FINANCIÈRE',
    'Fixture transactionnelle pour le seuil et les arbitrages.',
    (select id from public.equipment where code = 'GE-01'),
    (select primary_zone_id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'NORMAL'),
    (select id from public.status_definitions where code = 'A_QUALIFIER'),
    v_report_id,
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    clock_timestamp(), clock_timestamp() + interval '1 day',
    clock_timestamp() + interval '3 days'
  ) returning id into v_anomaly_id;

  perform set_config('behira.c10_anomaly', v_anomaly_id::text, true);
  perform set_config(
    'behira.c10_reference',
    (select reference from public.anomalies where id = v_anomaly_id),
    true
  );

  insert into public.anomalies(
    reference, title, description, equipment_id, zone_id, category_id,
    priority_id, current_status_id, reported_by_profile_id, assigned_profile_id,
    detected_at, resolved_at, closed_at
  ) values (
    null, 'TEST C10 DOSSIER CLOS', 'Contrôle du verrou financier après clôture.',
    (select id from public.equipment where code = 'GE-01'),
    (select primary_zone_id from public.equipment where code = 'GE-01'),
    (select id from public.categories where code = 'ELEC'),
    (select id from public.priority_definitions where code = 'NORMAL'),
    (select id from public.status_definitions where code = 'CLOTURE'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    (select id from public.profiles where employee_code = 'EVAR-ELEC'),
    clock_timestamp() - interval '2 days',
    clock_timestamp() - interval '1 day',
    clock_timestamp() - interval '1 day'
  ) returning id into v_closed_id;

  perform set_config(
    'behira.c10_closed_reference',
    (select reference from public.anomalies where id = v_closed_id),
    true
  );
end;
$$;

select extensions.is(
  (select numeric_value from public.business_parameters
   where code = 'financial_decision_threshold' and effective_to is null),
  400000::numeric,
  'C10 publishes the confirmed 400000 FCFA threshold canonically'
);

select extensions.is(
  (select unit from public.business_parameters
   where code = 'financial_decision_threshold' and effective_to is null),
  'FCFA',
  'The canonical threshold carries its unit'
);

select extensions.ok(
  (select relrowsecurity from pg_class where oid = 'public.business_parameters'::regclass),
  'Business parameters are protected by RLS'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.business_parameters', 'SELECT'),
  'Anonymous users have no access to business parameters'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.submit_anomaly_cost_decision(text,numeric,text,text,uuid)',
    'EXECUTE'
  ),
  'Anonymous users cannot submit a financial decision'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.submit_anomaly_cost_decision(text,numeric,text,text,uuid)',
    'EXECUTE'
  ),
  'Authenticated users may call the submission RPC before role checks'
);

select extensions.ok(
  not has_function_privilege(
    'authenticated',
    'public.prepare_cost_decision()',
    'EXECUTE'
  ),
  'Authenticated users cannot execute the internal decision trigger directly'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000001', true);

select extensions.lives_ok(
  format(
    'select public.submit_anomaly_cost_decision(%L, 250000, %L, %L, %L)',
    current_setting('behira.c10_reference'), 'opex',
    'Remplacement préventif dans la délégation FM',
    'c1000000-0000-0000-0000-000000000101'
  ),
  'Facility Manager can record a cost below the threshold'
);

select set_config(
  'behira.c10_facility_cost',
  (select reference from public.costs
   where submission_idempotency_key = 'c1000000-0000-0000-0000-000000000101'),
  true
);

select extensions.is(
  (select decision_scope from public.costs
   where reference = current_setting('behira.c10_facility_cost')),
  'facility_manager',
  'A sub-threshold amount stays in the Facility Manager delegation'
);

select extensions.is(
  (select approval_status from public.costs
   where reference = current_setting('behira.c10_facility_cost')),
  'approved',
  'A sub-threshold decision is persisted as approved'
);

select extensions.is(
  (select threshold_amount_snapshot from public.costs
   where reference = current_setting('behira.c10_facility_cost')),
  400000::numeric,
  'The cost snapshots the threshold used at decision time'
);

select extensions.lives_ok(
  format(
    'select public.submit_anomaly_cost_decision(%L, 250000, %L, %L, %L)',
    current_setting('behira.c10_reference'), 'opex',
    'Remplacement préventif dans la délégation FM',
    'c1000000-0000-0000-0000-000000000101'
  ),
  'A repeated submission is replayed safely'
);

select extensions.is(
  (select count(*) from public.costs
   where submission_idempotency_key = 'c1000000-0000-0000-0000-000000000101'),
  1::bigint,
  'Submission idempotency prevents duplicate costs'
);

select extensions.lives_ok(
  format(
    'select public.submit_anomaly_cost_decision(%L, 400000, %L, %L, %L)',
    current_setting('behira.c10_reference'), 'capex',
    'Remplacement au seuil soumis à l Administration',
    'c1000000-0000-0000-0000-000000000102'
  ),
  'Facility Manager can submit an at-threshold decision'
);

select set_config(
  'behira.c10_admin_cost',
  (select reference from public.costs
   where submission_idempotency_key = 'c1000000-0000-0000-0000-000000000102'),
  true
);

select extensions.is(
  (select decision_scope from public.costs
   where reference = current_setting('behira.c10_admin_cost')),
  'administration',
  'An amount at the threshold is assigned to the Administration'
);

select extensions.is(
  (select approval_status from public.costs
   where reference = current_setting('behira.c10_admin_cost')),
  'pending',
  'Administration arbitration remains pending until reviewed'
);

select extensions.throws_ok(
  format(
    'select public.review_anomaly_cost_decision(%L, %L, %L, %L)',
    current_setting('behira.c10_admin_cost'), 'approved',
    'Tentative hors rôle', 'c1000000-0000-0000-0000-000000000103'
  ),
  '42501',
  'Only the Administration can review this financial decision',
  'Facility Manager cannot approve an Administration decision'
);

select extensions.throws_ok(
  format(
    'select public.submit_anomaly_cost_decision(%L, 120000, %L, %L, %L)',
    current_setting('behira.c10_closed_reference'), 'opex',
    'Décision interdite après clôture',
    'c1000000-0000-0000-0000-000000000104'
  ),
  '23514',
  'A closed dossier cannot receive a new financial decision',
  'A closed dossier rejects new financial decisions'
);

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.business_parameters
   where code = 'financial_decision_threshold' and effective_to is null),
  1::bigint,
  'Administration can read the canonical threshold'
);

select extensions.lives_ok(
  format(
    'select public.review_anomaly_cost_decision(%L, %L, %L, %L)',
    current_setting('behira.c10_admin_cost'), 'approved',
    'Arbitrage CAPEX validé au regard de la continuité de service',
    'c1000000-0000-0000-0000-000000000105'
  ),
  'Administration can approve a pending financial decision'
);

select extensions.is(
  (select approval_status from public.costs
   where reference = current_setting('behira.c10_admin_cost')),
  'approved',
  'The Administration decision is persisted'
);

select extensions.is(
  (select p.employee_code
   from public.costs c
   join public.profiles p on p.id = c.reviewed_by_profile_id
   where c.reference = current_setting('behira.c10_admin_cost')),
  'DIR-FRED',
  'The Administration reviewer is recorded canonically'
);

select extensions.lives_ok(
  format(
    'select public.review_anomaly_cost_decision(%L, %L, %L, %L)',
    current_setting('behira.c10_admin_cost'), 'approved',
    'Arbitrage CAPEX validé au regard de la continuité de service',
    'c1000000-0000-0000-0000-000000000105'
  ),
  'A repeated review is replayed safely'
);

select extensions.throws_ok(
  format(
    'update public.costs set amount = 410000 where reference = %L',
    current_setting('behira.c10_admin_cost')
  ),
  '23514',
  'A submitted financial decision is immutable; create a new cost record',
  'A final financial decision cannot be silently edited'
);

select set_config('request.jwt.claim.sub', 'c1000000-0000-0000-0000-000000000003', true);

select extensions.throws_ok(
  format(
    'select public.submit_anomaly_cost_decision(%L, 100000, %L, %L, %L)',
    current_setting('behira.c10_reference'), 'opex',
    'Tentative agent hors droit',
    'c1000000-0000-0000-0000-000000000106'
  ),
  '42501',
  'Only the Facility Manager can submit a financial decision',
  'A field agent cannot submit a financial decision'
);

select extensions.is(
  (select count(*) from public.business_parameters
   where code = 'financial_decision_threshold'),
  0::bigint,
  'A field agent cannot read Administration parameters'
);

reset role;

select extensions.is(
  (select count(*)
   from public.anomaly_history h
   join public.business_event_definitions e on e.id = h.event_definition_id
   where h.anomaly_id = current_setting('behira.c10_anomaly')::uuid
     and e.code in ('COST_SUBMITTED', 'COST_APPROVED')),
  4::bigint,
  'Cost submissions and approvals are preserved in dossier history'
);

select * from extensions.finish();
rollback;
