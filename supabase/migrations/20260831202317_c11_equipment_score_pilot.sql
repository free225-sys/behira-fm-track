begin;

-- C11-B establishes a canonical, explainable equipment-score model without
-- activating a formula or inventing missing business decisions. The pilot is
-- deliberately restricted to WILO-01 and remains non-calculable until every
-- mandatory rule and data source has been confirmed.

create table if not exists public.equipment_score_formula_versions (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  version_no integer not null check (version_no > 0),
  label text not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'retired')),
  score_period_days integer check (score_period_days is null or score_period_days > 0),
  freshness_max_hours integer check (freshness_max_hours is null or freshness_max_hours > 0),
  minimum_completeness_pct numeric(5,2)
    check (minimum_completeness_pct is null or minimum_completeness_pct between 0 and 100),
  green_min_score numeric(5,2)
    check (green_min_score is null or green_min_score between 0 and 100),
  orange_min_score numeric(5,2)
    check (orange_min_score is null or orange_min_score between 0 and 100),
  unavailability_definition text,
  recurrence_window_days integer
    check (recurrence_window_days is null or recurrence_window_days > 0),
  recurrence_definition text,
  source_document text not null,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  unique (code, version_no),
  check (effective_to is null or effective_from is not null),
  check (effective_to is null or effective_to > effective_from),
  check (
    (green_min_score is null and orange_min_score is null)
    or (
      green_min_score is not null
      and orange_min_score is not null
      and green_min_score > orange_min_score
    )
  )
);

create unique index if not exists equipment_score_formula_one_active_idx
  on public.equipment_score_formula_versions(code)
  where status = 'active';

create index if not exists equipment_score_formula_created_by_idx
  on public.equipment_score_formula_versions(created_by_profile_id)
  where created_by_profile_id is not null;

create table if not exists public.equipment_score_formula_components (
  id uuid primary key default gen_random_uuid(),
  formula_version_id uuid not null
    references public.equipment_score_formula_versions(id) on delete cascade,
  component_code text not null,
  label text not null,
  weight_pct numeric(5,2) not null check (weight_pct > 0 and weight_pct <= 100),
  source_kind text not null,
  rule_status text not null default 'pending'
    check (rule_status in ('pending', 'confirmed')),
  calculation_rule jsonb,
  created_at timestamptz not null default clock_timestamp(),
  unique (formula_version_id, component_code),
  check (
    (rule_status = 'pending' and calculation_rule is null)
    or (rule_status = 'confirmed' and calculation_rule is not null)
  )
);

create index if not exists equipment_score_formula_components_formula_idx
  on public.equipment_score_formula_components(formula_version_id);

create table if not exists public.equipment_score_assignments (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  formula_version_id uuid not null
    references public.equipment_score_formula_versions(id) on delete restrict,
  criticality_code text check (criticality_code in ('vital', 'important', 'comfort')),
  criticality_coefficient integer check (criticality_coefficient in (1, 3, 5)),
  effective_from timestamptz,
  effective_to timestamptz,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'confirmed')),
  source_notes text,
  created_at timestamptz not null default clock_timestamp(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  check (effective_to is null or effective_from is not null),
  check (effective_to is null or effective_to > effective_from),
  check (
    (criticality_code is null and criticality_coefficient is null)
    or (criticality_code = 'vital' and criticality_coefficient = 5)
    or (criticality_code = 'important' and criticality_coefficient = 3)
    or (criticality_code = 'comfort' and criticality_coefficient = 1)
  ),
  check (
    validation_status = 'pending'
    or (
      criticality_code is not null
      and criticality_coefficient is not null
      and effective_from is not null
    )
  )
);

create unique index if not exists equipment_score_assignment_one_current_idx
  on public.equipment_score_assignments(equipment_id)
  where effective_to is null;

create index if not exists equipment_score_assignments_formula_idx
  on public.equipment_score_assignments(formula_version_id);

create index if not exists equipment_score_assignments_created_by_idx
  on public.equipment_score_assignments(created_by_profile_id)
  where created_by_profile_id is not null;

create table if not exists public.equipment_availability_observations (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  period_start timestamptz not null,
  period_end timestamptz not null,
  observed_minutes integer not null check (observed_minutes > 0),
  available_minutes integer not null check (available_minutes >= 0),
  data_status text not null default 'to_confirm'
    check (data_status in ('confirmed', 'to_confirm')),
  source_kind text not null,
  source_reference text,
  idempotency_key uuid not null unique,
  recorded_by_profile_id uuid references public.profiles(id) on delete restrict,
  recorded_at timestamptz not null default clock_timestamp(),
  check (period_end > period_start),
  check (available_minutes <= observed_minutes)
);

create index if not exists equipment_availability_period_idx
  on public.equipment_availability_observations(equipment_id, period_end desc, period_start);

create index if not exists equipment_availability_recorded_by_idx
  on public.equipment_availability_observations(recorded_by_profile_id)
  where recorded_by_profile_id is not null;

create table if not exists public.preventive_maintenance_plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  label text not null,
  frequency_days integer not null check (frequency_days > 0),
  active_from date not null,
  active_until date,
  is_active boolean not null default true,
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'confirmed')),
  source_document text,
  created_at timestamptz not null default clock_timestamp(),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  check (active_until is null or active_until >= active_from)
);

create index if not exists preventive_maintenance_plans_equipment_idx
  on public.preventive_maintenance_plans(equipment_id, active_from desc)
  where is_active;

create index if not exists preventive_maintenance_plans_created_by_idx
  on public.preventive_maintenance_plans(created_by_profile_id)
  where created_by_profile_id is not null;

create table if not exists public.preventive_maintenance_occurrences (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null
    references public.preventive_maintenance_plans(id) on delete cascade,
  due_at timestamptz not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'completed', 'missed', 'cancelled')),
  completed_at timestamptz,
  completed_by_profile_id uuid references public.profiles(id) on delete restrict,
  intervention_id uuid references public.interventions(id) on delete restrict,
  proof_id uuid references public.proofs(id) on delete restrict,
  notes text,
  created_at timestamptz not null default clock_timestamp(),
  unique (plan_id, due_at),
  check (
    (status = 'completed' and completed_at is not null)
    or (status <> 'completed' and completed_at is null)
  )
);

create index if not exists preventive_maintenance_occurrences_due_idx
  on public.preventive_maintenance_occurrences(plan_id, due_at desc);

create index if not exists preventive_maintenance_occurrences_completed_by_idx
  on public.preventive_maintenance_occurrences(completed_by_profile_id)
  where completed_by_profile_id is not null;

create index if not exists preventive_maintenance_occurrences_intervention_idx
  on public.preventive_maintenance_occurrences(intervention_id)
  where intervention_id is not null;

create index if not exists preventive_maintenance_occurrences_proof_idx
  on public.preventive_maintenance_occurrences(proof_id)
  where proof_id is not null;

create table if not exists public.equipment_score_snapshots (
  id uuid primary key default gen_random_uuid(),
  equipment_id uuid not null references public.equipment(id) on delete restrict,
  formula_version_id uuid not null
    references public.equipment_score_formula_versions(id) on delete restrict,
  assignment_id uuid not null
    references public.equipment_score_assignments(id) on delete restrict,
  period_start timestamptz not null,
  period_end timestamptz not null,
  input_cutoff_at timestamptz not null,
  calculation_status text not null
    check (calculation_status in ('calculated', 'non_calculable')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  color_state text check (color_state in ('green', 'orange', 'red')),
  completeness_pct numeric(5,2) not null check (completeness_pct between 0 and 100),
  fresh_until timestamptz,
  criticality_code_snapshot text
    check (criticality_code_snapshot in ('vital', 'important', 'comfort')),
  criticality_coefficient_snapshot integer
    check (criticality_coefficient_snapshot in (1, 3, 5)),
  missing_components text[] not null default '{}',
  explanation jsonb not null default '{}'::jsonb,
  calculated_at timestamptz not null default clock_timestamp(),
  unique (equipment_id, formula_version_id, period_start, period_end),
  check (period_end > period_start),
  check (input_cutoff_at >= period_end),
  check (
    (calculation_status = 'non_calculable' and score is null and color_state is null)
    or (
      calculation_status = 'calculated'
      and score is not null
      and color_state is not null
      and criticality_code_snapshot is not null
      and criticality_coefficient_snapshot is not null
      and cardinality(missing_components) = 0
    )
  )
);

create index if not exists equipment_score_snapshots_equipment_latest_idx
  on public.equipment_score_snapshots(equipment_id, calculated_at desc);

create index if not exists equipment_score_snapshots_formula_idx
  on public.equipment_score_snapshots(formula_version_id);

create index if not exists equipment_score_snapshots_assignment_idx
  on public.equipment_score_snapshots(assignment_id);

create table if not exists public.equipment_score_snapshot_components (
  id uuid primary key default gen_random_uuid(),
  snapshot_id uuid not null
    references public.equipment_score_snapshots(id) on delete restrict,
  formula_component_id uuid not null
    references public.equipment_score_formula_components(id) on delete restrict,
  calculation_status text not null
    check (calculation_status in ('calculated', 'partial', 'absent')),
  weight_pct_snapshot numeric(5,2) not null
    check (weight_pct_snapshot > 0 and weight_pct_snapshot <= 100),
  raw_score numeric(5,2) check (raw_score is null or raw_score between 0 and 100),
  weighted_contribution numeric(7,4)
    check (weighted_contribution is null or weighted_contribution between 0 and 100),
  data_points integer not null default 0 check (data_points >= 0),
  missing_reason text,
  input_summary jsonb not null default '{}'::jsonb,
  unique (snapshot_id, formula_component_id),
  check (
    (calculation_status = 'calculated' and raw_score is not null and weighted_contribution is not null and missing_reason is null)
    or (calculation_status in ('partial', 'absent') and weighted_contribution is null and missing_reason is not null)
  )
);

create index if not exists equipment_score_snapshot_components_snapshot_idx
  on public.equipment_score_snapshot_components(snapshot_id);

create index if not exists equipment_score_snapshot_components_formula_component_idx
  on public.equipment_score_snapshot_components(formula_component_id);

create or replace function public.guard_equipment_score_formula_activation()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_weight numeric;
  v_pending integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  if new.score_period_days is null
     or new.freshness_max_hours is null
     or new.minimum_completeness_pct is null
     or new.green_min_score is null
     or new.orange_min_score is null
     or new.unavailability_definition is null
     or new.recurrence_window_days is null
     or new.recurrence_definition is null
     or new.effective_from is null then
    raise exception 'Equipment score formula cannot be activated before all business decisions are confirmed'
      using errcode = '23514';
  end if;

  select coalesce(sum(weight_pct), 0), count(*) filter (where rule_status <> 'confirmed')
  into v_weight, v_pending
  from public.equipment_score_formula_components
  where formula_version_id = new.id;

  if v_weight <> 100 or v_pending <> 0 then
    raise exception 'Equipment score formula components must total 100 and have confirmed rules'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists equipment_score_formula_activation_guard
  on public.equipment_score_formula_versions;
create trigger equipment_score_formula_activation_guard
before insert or update of status on public.equipment_score_formula_versions
for each row execute function public.guard_equipment_score_formula_activation();

create or replace function public.guard_equipment_score_snapshot_immutability()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  raise exception 'Equipment score snapshots are immutable; create a new snapshot'
    using errcode = '23514';
end;
$$;

drop trigger if exists equipment_score_snapshot_immutable
  on public.equipment_score_snapshots;
create trigger equipment_score_snapshot_immutable
before update or delete on public.equipment_score_snapshots
for each row execute function public.guard_equipment_score_snapshot_immutability();

drop trigger if exists equipment_score_snapshot_component_immutable
  on public.equipment_score_snapshot_components;
create trigger equipment_score_snapshot_component_immutable
before update or delete on public.equipment_score_snapshot_components
for each row execute function public.guard_equipment_score_snapshot_immutability();

create or replace function public.get_equipment_score_readiness(
  p_equipment_code text,
  p_period_start timestamptz,
  p_period_end timestamptz
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = public, pg_temp
as $$
declare
  v_equipment public.equipment%rowtype;
  v_formula public.equipment_score_formula_versions%rowtype;
  v_assignment public.equipment_score_assignments%rowtype;
  v_configuration_missing text[] := array[]::text[];
  v_data_missing text[] := array[]::text[];
  v_availability_count integer := 0;
  v_plan_count integer := 0;
  v_occurrence_count integer := 0;
  v_report_count integer := 0;
  v_check_count integer := 0;
  v_open_anomaly_count integer := 0;
  v_pending_rule_count integer := 0;
begin
  if public.current_profile_id() is null then
    raise exception 'An active internal profile is required'
      using errcode = '42501';
  end if;

  if p_period_start is null or p_period_end is null or p_period_end <= p_period_start then
    raise exception 'A valid explicit score period is required'
      using errcode = '22007';
  end if;

  select * into v_equipment
  from public.equipment
  where code = btrim(p_equipment_code)
    and public.can_access_equipment(id)
  limit 1;

  if v_equipment.id is null then
    raise exception 'Equipment is unavailable or outside the current perimeter'
      using errcode = '42501';
  end if;

  select * into v_formula
  from public.equipment_score_formula_versions
  where code = 'equipment_health'
  order by version_no desc
  limit 1;

  if v_formula.id is null then
    v_configuration_missing := array_append(v_configuration_missing, 'formula_version');
  else
    if v_formula.status <> 'active' then
      v_configuration_missing := array_append(v_configuration_missing, 'formula_activation');
    end if;
    if v_formula.score_period_days is null then
      v_configuration_missing := array_append(v_configuration_missing, 'score_period');
    end if;
    if v_formula.freshness_max_hours is null then
      v_configuration_missing := array_append(v_configuration_missing, 'freshness_limit');
    end if;
    if v_formula.minimum_completeness_pct is null then
      v_configuration_missing := array_append(v_configuration_missing, 'minimum_completeness');
    end if;
    if v_formula.green_min_score is null or v_formula.orange_min_score is null then
      v_configuration_missing := array_append(v_configuration_missing, 'color_thresholds');
    end if;
    if v_formula.unavailability_definition is null then
      v_configuration_missing := array_append(v_configuration_missing, 'unavailability_definition');
    end if;
    if v_formula.recurrence_window_days is null or v_formula.recurrence_definition is null then
      v_configuration_missing := array_append(v_configuration_missing, 'recurrence_definition');
    end if;

    select count(*) into v_pending_rule_count
    from public.equipment_score_formula_components
    where formula_version_id = v_formula.id
      and rule_status <> 'confirmed';

    if v_pending_rule_count > 0 then
      v_configuration_missing := array_append(v_configuration_missing, 'component_calculation_rules');
    end if;
  end if;

  select * into v_assignment
  from public.equipment_score_assignments
  where equipment_id = v_equipment.id
    and effective_to is null
  order by created_at desc
  limit 1;

  if v_assignment.id is null
     or v_assignment.validation_status <> 'confirmed'
     or v_assignment.criticality_code is null then
    v_configuration_missing := array_append(v_configuration_missing, 'equipment_criticality');
  end if;

  select count(*) into v_availability_count
  from public.equipment_availability_observations
  where equipment_id = v_equipment.id
    and data_status = 'confirmed'
    and period_start < p_period_end
    and period_end > p_period_start;

  if v_availability_count = 0 then
    v_data_missing := array_append(v_data_missing, 'availability_observations');
  end if;

  select count(*) into v_plan_count
  from public.preventive_maintenance_plans
  where equipment_id = v_equipment.id
    and validation_status = 'confirmed'
    and is_active
    and active_from <= p_period_end::date
    and (active_until is null or active_until >= p_period_start::date);

  select count(*) into v_occurrence_count
  from public.preventive_maintenance_occurrences pmo
  join public.preventive_maintenance_plans pmp on pmp.id = pmo.plan_id
  where pmp.equipment_id = v_equipment.id
    and pmo.due_at >= p_period_start
    and pmo.due_at < p_period_end;

  if v_plan_count = 0 then
    v_data_missing := array_append(v_data_missing, 'preventive_maintenance_plan');
  elsif v_occurrence_count = 0 then
    v_data_missing := array_append(v_data_missing, 'preventive_maintenance_occurrences');
  end if;

  select count(distinct r.id), count(rc.id)
  into v_report_count, v_check_count
  from public.reports r
  left join public.report_checks rc on rc.report_id = r.id
  where r.equipment_id = v_equipment.id
    and r.report_status in ('submitted', 'validated')
    and r.performed_at >= p_period_start
    and r.performed_at < p_period_end;

  if v_report_count = 0 or v_check_count = 0 then
    v_data_missing := array_append(v_data_missing, 'threshold_control_results');
  end if;

  select count(*) into v_open_anomaly_count
  from public.anomalies a
  join public.status_definitions s on s.id = a.current_status_id
  where a.equipment_id = v_equipment.id
    and s.code <> 'CLOTURE';

  return jsonb_build_object(
    'equipment_code', v_equipment.code,
    'formula_code', v_formula.code,
    'formula_version', v_formula.version_no,
    'formula_status', v_formula.status,
    'period_start', p_period_start,
    'period_end', p_period_end,
    'calculable', cardinality(v_configuration_missing) = 0 and cardinality(v_data_missing) = 0,
    'display_state', case
      when cardinality(v_configuration_missing) = 0 and cardinality(v_data_missing) = 0
        then 'Prêt pour calcul contrôlé'
      else 'Score non calculable — données insuffisantes'
    end,
    'missing_configuration', to_jsonb(v_configuration_missing),
    'missing_data', to_jsonb(v_data_missing),
    'source_counts', jsonb_build_object(
      'availability_observations', v_availability_count,
      'preventive_plans', v_plan_count,
      'preventive_occurrences', v_occurrence_count,
      'reports', v_report_count,
      'report_checks', v_check_count,
      'open_anomalies', v_open_anomaly_count
    )
  );
end;
$$;

insert into public.equipment_score_formula_versions(
  code, version_no, label, status, source_document
)
values (
  'equipment_health', 1, 'Santé équipement — formule C11', 'draft',
  'docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md#10'
)
on conflict (code, version_no) do nothing;

insert into public.equipment_score_formula_components(
  formula_version_id, component_code, label, weight_pct, source_kind,
  rule_status, calculation_rule
)
select f.id, v.component_code, v.label, v.weight_pct, v.source_kind,
       'pending', null
from public.equipment_score_formula_versions f
cross join (values
  ('availability_continuity', 'Disponibilité et continuité', 30::numeric, 'equipment_availability_observations'),
  ('weighted_open_anomalies', 'Anomalies ouvertes pondérées', 25::numeric, 'anomalies'),
  ('preventive_maintenance', 'Maintenance préventive dans les délais', 20::numeric, 'preventive_maintenance_occurrences'),
  ('threshold_controls', 'Mesures et contrôles dans les seuils', 15::numeric, 'report_checks'),
  ('reliability_recurrences', 'Fiabilité et récidives', 10::numeric, 'anomalies_and_history')
) as v(component_code, label, weight_pct, source_kind)
where f.code = 'equipment_health' and f.version_no = 1
on conflict (formula_version_id, component_code) do nothing;

insert into public.equipment_score_assignments(
  equipment_id, formula_version_id, validation_status, source_notes
)
select e.id, f.id, 'pending',
       'Pilote C11-B WILO-01 ; criticité et activation en attente de validation métier.'
from public.equipment e
join public.equipment_score_formula_versions f
  on f.code = 'equipment_health' and f.version_no = 1
where e.code = 'WILO-01'
  and not exists (
    select 1 from public.equipment_score_assignments esa
    where esa.equipment_id = e.id and esa.effective_to is null
  );

alter table public.equipment_score_formula_versions enable row level security;
alter table public.equipment_score_formula_components enable row level security;
alter table public.equipment_score_assignments enable row level security;
alter table public.equipment_availability_observations enable row level security;
alter table public.preventive_maintenance_plans enable row level security;
alter table public.preventive_maintenance_occurrences enable row level security;
alter table public.equipment_score_snapshots enable row level security;
alter table public.equipment_score_snapshot_components enable row level security;

drop policy if exists equipment_score_formula_versions_read
  on public.equipment_score_formula_versions;
create policy equipment_score_formula_versions_read
  on public.equipment_score_formula_versions for select to authenticated
  using ((select public.current_profile_id()) is not null);

drop policy if exists equipment_score_formula_components_read
  on public.equipment_score_formula_components;
create policy equipment_score_formula_components_read
  on public.equipment_score_formula_components for select to authenticated
  using ((select public.current_profile_id()) is not null);

drop policy if exists equipment_score_assignments_read
  on public.equipment_score_assignments;
create policy equipment_score_assignments_read
  on public.equipment_score_assignments for select to authenticated
  using ((select public.can_access_equipment(equipment_id)));

drop policy if exists equipment_availability_observations_read
  on public.equipment_availability_observations;
create policy equipment_availability_observations_read
  on public.equipment_availability_observations for select to authenticated
  using ((select public.can_access_equipment(equipment_id)));

drop policy if exists preventive_maintenance_plans_read
  on public.preventive_maintenance_plans;
create policy preventive_maintenance_plans_read
  on public.preventive_maintenance_plans for select to authenticated
  using ((select public.can_access_equipment(equipment_id)));

drop policy if exists preventive_maintenance_occurrences_read
  on public.preventive_maintenance_occurrences;
create policy preventive_maintenance_occurrences_read
  on public.preventive_maintenance_occurrences for select to authenticated
  using (
    exists (
      select 1 from public.preventive_maintenance_plans pmp
      where pmp.id = plan_id
        and (select public.can_access_equipment(pmp.equipment_id))
    )
  );

drop policy if exists equipment_score_snapshots_read
  on public.equipment_score_snapshots;
create policy equipment_score_snapshots_read
  on public.equipment_score_snapshots for select to authenticated
  using ((select public.can_access_equipment(equipment_id)));

drop policy if exists equipment_score_snapshot_components_read
  on public.equipment_score_snapshot_components;
create policy equipment_score_snapshot_components_read
  on public.equipment_score_snapshot_components for select to authenticated
  using (
    exists (
      select 1 from public.equipment_score_snapshots ess
      where ess.id = snapshot_id
        and (select public.can_access_equipment(ess.equipment_id))
    )
  );

revoke all on table public.equipment_score_formula_versions from public, anon, authenticated;
revoke all on table public.equipment_score_formula_components from public, anon, authenticated;
revoke all on table public.equipment_score_assignments from public, anon, authenticated;
revoke all on table public.equipment_availability_observations from public, anon, authenticated;
revoke all on table public.preventive_maintenance_plans from public, anon, authenticated;
revoke all on table public.preventive_maintenance_occurrences from public, anon, authenticated;
revoke all on table public.equipment_score_snapshots from public, anon, authenticated;
revoke all on table public.equipment_score_snapshot_components from public, anon, authenticated;

grant select on table public.equipment_score_formula_versions to authenticated;
grant select on table public.equipment_score_formula_components to authenticated;
grant select on table public.equipment_score_assignments to authenticated;
grant select on table public.equipment_availability_observations to authenticated;
grant select on table public.preventive_maintenance_plans to authenticated;
grant select on table public.preventive_maintenance_occurrences to authenticated;
grant select on table public.equipment_score_snapshots to authenticated;
grant select on table public.equipment_score_snapshot_components to authenticated;

grant select, insert, update, delete on table public.equipment_score_formula_versions to service_role;
grant select, insert, update, delete on table public.equipment_score_formula_components to service_role;
grant select, insert, update, delete on table public.equipment_score_assignments to service_role;
grant select, insert, update, delete on table public.equipment_availability_observations to service_role;
grant select, insert, update, delete on table public.preventive_maintenance_plans to service_role;
grant select, insert, update, delete on table public.preventive_maintenance_occurrences to service_role;
grant select, insert, update, delete on table public.equipment_score_snapshots to service_role;
grant select, insert, update, delete on table public.equipment_score_snapshot_components to service_role;

revoke all on function public.get_equipment_score_readiness(text, timestamptz, timestamptz)
  from public, anon;
grant execute on function public.get_equipment_score_readiness(text, timestamptz, timestamptz)
  to authenticated, service_role;

revoke all on function public.guard_equipment_score_formula_activation()
  from public, anon, authenticated, service_role;
revoke all on function public.guard_equipment_score_snapshot_immutability()
  from public, anon, authenticated, service_role;

comment on table public.equipment_score_formula_versions is
  'Versioned equipment-health formulas. C11 v1 remains draft until all business decisions are confirmed.';
comment on table public.equipment_score_snapshots is
  'Immutable, explainable equipment-score results; non-calculable snapshots never carry a numeric score.';
comment on function public.get_equipment_score_readiness(text, timestamptz, timestamptz) is
  'Read-only C11 readiness gate. It never calculates or publishes a score.';

commit;
