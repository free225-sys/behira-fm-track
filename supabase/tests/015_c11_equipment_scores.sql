\set ON_ERROR_STOP on

begin;
select extensions.plan(35);

select extensions.has_table('public', 'equipment_score_formula_versions', 'C11 stores versioned equipment score formulas');
select extensions.has_table('public', 'equipment_score_formula_components', 'C11 stores formula components separately');
select extensions.has_table('public', 'equipment_score_assignments', 'C11 stores versioned equipment assignments');
select extensions.has_table('public', 'equipment_availability_observations', 'C11 provides a canonical availability source');
select extensions.has_table('public', 'preventive_maintenance_plans', 'C11 provides canonical preventive plans');
select extensions.has_table('public', 'preventive_maintenance_occurrences', 'C11 provides canonical preventive occurrences');
select extensions.has_table('public', 'equipment_score_snapshots', 'C11 stores immutable score snapshots');
select extensions.has_table('public', 'equipment_score_snapshot_components', 'C11 snapshots remain explainable by component');

select extensions.is(
  (select status from public.equipment_score_formula_versions
   where code = 'equipment_health' and version_no = 1),
  'draft',
  'The C11 formula is not activated without business validation'
);

select extensions.is(
  (select sum(weight_pct) from public.equipment_score_formula_components c
   join public.equipment_score_formula_versions f on f.id = c.formula_version_id
   where f.code = 'equipment_health' and f.version_no = 1),
  100::numeric,
  'The five validated component weights total 100 percent'
);

select extensions.is(
  (select count(*) from public.equipment_score_formula_components c
   join public.equipment_score_formula_versions f on f.id = c.formula_version_id
   where f.code = 'equipment_health' and f.version_no = 1
     and c.rule_status = 'pending' and c.calculation_rule is null),
  5::bigint,
  'No component calculation rule is invented'
);

select extensions.ok(
  exists (
    select 1
    from public.equipment_score_assignments esa
    join public.equipment e on e.id = esa.equipment_id
    where e.code = 'WILO-01'
      and esa.validation_status = 'pending'
      and esa.criticality_code is null
      and esa.criticality_coefficient is null
      and esa.effective_to is null
  ),
  'WILO-01 is registered as a pilot without invented criticality'
);

select extensions.is(
  (select count(*) from public.equipment_score_snapshots),
  0::bigint,
  'The migration publishes no numeric or non-calculable snapshot by itself'
);

select extensions.ok(
  (
    select bool_and(c.relrowsecurity)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = any(array[
        'equipment_score_formula_versions',
        'equipment_score_formula_components',
        'equipment_score_assignments',
        'equipment_availability_observations',
        'preventive_maintenance_plans',
        'preventive_maintenance_occurrences',
        'equipment_score_snapshots',
        'equipment_score_snapshot_components'
      ])
  ),
  'RLS protects every C11 table'
);

select extensions.ok(
  not has_table_privilege('anon', 'public.equipment_score_snapshots', 'SELECT')
  and not has_table_privilege('anon', 'public.equipment_score_formula_versions', 'SELECT'),
  'Anonymous users cannot read C11 configuration or scores'
);

select extensions.ok(
  not has_function_privilege(
    'anon',
    'public.get_equipment_score_readiness(text,timestamptz,timestamptz)',
    'EXECUTE'
  ),
  'Anonymous users cannot call the C11 readiness gate'
);

select extensions.ok(
  has_function_privilege(
    'authenticated',
    'public.get_equipment_score_readiness(text,timestamptz,timestamptz)',
    'EXECUTE'
  ),
  'Authenticated internal users may call the readiness gate before RLS checks'
);

select extensions.ok(
  not has_table_privilege('authenticated', 'public.equipment_score_snapshots', 'INSERT')
  and not has_table_privilege('authenticated', 'public.equipment_score_formula_versions', 'UPDATE'),
  'Authenticated users cannot write score configuration or snapshots directly'
);

select extensions.throws_ok(
  $$
    update public.equipment_score_formula_versions
    set status = 'active'
    where code = 'equipment_health' and version_no = 1
  $$,
  '23514',
  'Equipment score formula cannot be activated before all business decisions are confirmed',
  'The database rejects premature formula activation'
);

do $$
declare
  v_snapshot uuid;
begin
  insert into public.equipment_score_snapshots(
    equipment_id, formula_version_id, assignment_id,
    period_start, period_end, input_cutoff_at,
    calculation_status, completeness_pct, missing_components, explanation
  )
  select e.id, f.id, esa.id,
         '2026-08-01 00:00:00+00'::timestamptz,
         '2026-08-31 00:00:00+00'::timestamptz,
         '2026-08-31 00:00:00+00'::timestamptz,
         'non_calculable', 0,
         array['availability_continuity', 'preventive_maintenance'],
         jsonb_build_object('reason', 'transactional_test')
  from public.equipment e
  join public.equipment_score_assignments esa
    on esa.equipment_id = e.id and esa.effective_to is null
  join public.equipment_score_formula_versions f on f.id = esa.formula_version_id
  where e.code = 'WILO-01'
  returning id into v_snapshot;

  perform set_config('behira.c11_snapshot', v_snapshot::text, true);
end;
$$;

select extensions.throws_ok(
  format(
    'update public.equipment_score_snapshots set explanation = %L::jsonb where id = %L',
    '{"changed":true}', current_setting('behira.c11_snapshot')
  ),
  '23514',
  'Equipment score snapshots are immutable; create a new snapshot',
  'A published score snapshot cannot be rewritten'
);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('c1100000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'c11.fm@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c1100000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'c11.sylvain@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('c1100000-0000-0000-0000-000000000003', 'authenticated', 'authenticated', 'c11.evariste@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = 'c1100000-0000-0000-0000-000000000001',
    account_status = 'active', must_change_password = false
where employee_code = 'FAU-FM';
update public.profiles
set auth_user_id = 'c1100000-0000-0000-0000-000000000002',
    account_status = 'active', must_change_password = false
where employee_code = 'SYL-PLB';
update public.profiles
set auth_user_id = 'c1100000-0000-0000-0000-000000000003',
    account_status = 'active', must_change_password = false
where employee_code = 'EVAR-ELEC';

set local role authenticated;
select set_config('request.jwt.claim.sub', 'c1100000-0000-0000-0000-000000000001', true);

select extensions.ok(
  not (public.get_equipment_score_readiness(
    'WILO-01',
    '2026-08-01 00:00:00+00'::timestamptz,
    '2026-09-01 00:00:00+00'::timestamptz
  )->>'calculable')::boolean,
  'Facility Manager receives a non-calculable WILO result'
);

select extensions.is(
  public.get_equipment_score_readiness(
    'WILO-01',
    '2026-08-01 00:00:00+00'::timestamptz,
    '2026-09-01 00:00:00+00'::timestamptz
  )->>'display_state',
  'Score non calculable — données insuffisantes',
  'The readiness gate uses the approved explicit fallback'
);

select extensions.ok(
  (public.get_equipment_score_readiness(
    'WILO-01',
    '2026-08-01 00:00:00+00'::timestamptz,
    '2026-09-01 00:00:00+00'::timestamptz
  )->'missing_configuration') ? 'equipment_criticality',
  'Missing WILO criticality is explicit'
);

select extensions.ok(
  (public.get_equipment_score_readiness(
    'WILO-01',
    '2026-08-01 00:00:00+00'::timestamptz,
    '2026-09-01 00:00:00+00'::timestamptz
  )->'missing_configuration') ? 'component_calculation_rules',
  'Unconfirmed component rules are explicit'
);

select extensions.ok(
  (public.get_equipment_score_readiness(
    'WILO-01',
    '2026-08-01 00:00:00+00'::timestamptz,
    '2026-09-01 00:00:00+00'::timestamptz
  )->'missing_data') ? 'availability_observations',
  'Missing availability observations are explicit'
);

select extensions.ok(
  (public.get_equipment_score_readiness(
    'WILO-01',
    '2026-08-01 00:00:00+00'::timestamptz,
    '2026-09-01 00:00:00+00'::timestamptz
  )->'missing_data') ? 'preventive_maintenance_plan',
  'Missing preventive maintenance planning is explicit'
);

select extensions.throws_ok(
  $$
    select public.get_equipment_score_readiness(
      'WILO-01',
      '2026-09-01 00:00:00+00'::timestamptz,
      '2026-08-01 00:00:00+00'::timestamptz
    )
  $$,
  '22007',
  'A valid explicit score period is required',
  'The readiness gate rejects an invalid period'
);

select set_config('request.jwt.claim.sub', 'c1100000-0000-0000-0000-000000000002', true);

select extensions.is(
  (select count(*) from public.equipment_score_assignments),
  1::bigint,
  'Sylvain can read the WILO pilot in his equipment perimeter'
);

select extensions.lives_ok(
  $$
    select public.get_equipment_score_readiness(
      'WILO-01',
      '2026-08-01 00:00:00+00'::timestamptz,
      '2026-09-01 00:00:00+00'::timestamptz
    )
  $$,
  'Sylvain can inspect WILO score readiness'
);

select set_config('request.jwt.claim.sub', 'c1100000-0000-0000-0000-000000000003', true);

select extensions.is(
  (select count(*) from public.equipment_score_assignments),
  0::bigint,
  'Evariste cannot read the WILO pilot outside his equipment perimeter'
);

select extensions.throws_ok(
  $$
    select public.get_equipment_score_readiness(
      'WILO-01',
      '2026-08-01 00:00:00+00'::timestamptz,
      '2026-09-01 00:00:00+00'::timestamptz
    )
  $$,
  '42501',
  'Equipment is unavailable or outside the current perimeter',
  'Evariste cannot inspect WILO score readiness outside his scope'
);

reset role;

select extensions.is(
  (select count(*) from public.equipment_score_formula_versions
   where status = 'active'),
  0::bigint,
  'No equipment score formula is active after the pilot tests'
);

select extensions.is(
  (select count(*) from public.equipment_score_formula_components
   where rule_status = 'confirmed'),
  0::bigint,
  'No calculation rule is silently confirmed by the pilot'
);

select extensions.is(
  (select score from public.equipment_score_snapshots
   where id = current_setting('behira.c11_snapshot')::uuid),
  null::numeric,
  'A non-calculable snapshot never carries a numeric score'
);

select extensions.ok(
  cardinality(
    (select missing_components from public.equipment_score_snapshots
     where id = current_setting('behira.c11_snapshot')::uuid)
  ) > 0,
  'A non-calculable snapshot records the missing components'
);

select * from extensions.finish();
rollback;
