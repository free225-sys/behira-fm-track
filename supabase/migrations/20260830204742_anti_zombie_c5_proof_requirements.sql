begin;

-- C5 publishes only the already-confirmed critical closure invariant. Exact
-- matrices for RIA, lifts, WILO and other equipment remain unconfigured.
insert into public.business_event_definitions(
  code, label, is_activity, is_sensitive, is_active,
  validation_status, sort_order, source_document
) values
  ('PROOF_REQUIREMENT_APPLIED', 'Exigence de preuve appliquée', true, true, true, 'confirmed', 180, 'Validation utilisateur — Lots A, B2 et C5, 30 août 2026'),
  ('PROOF_REQUIREMENT_REINFORCED', 'Exigence de preuve renforcée', true, true, true, 'confirmed', 190, 'Validation utilisateur — Lots A, B2 et C5, 30 août 2026'),
  ('PROOF_REQUIREMENT_EVIDENCE_LINKED', 'Preuve liée à une exigence', true, true, true, 'confirmed', 200, 'Validation utilisateur — Lots A, B2 et C5, 30 août 2026'),
  ('PROOF_REQUIREMENT_SATISFIED', 'Exigence de preuve satisfaite', true, true, true, 'confirmed', 210, 'Validation utilisateur — Lots A, B2 et C5, 30 août 2026'),
  ('PROOF_SUBMITTED', 'Preuve déposée', true, true, true, 'confirmed', 220, 'Validation utilisateur — Lots A, B2 et C5, 30 août 2026'),
  ('PROOF_ACCEPTED', 'Preuve acceptée', true, true, true, 'confirmed', 230, 'Validation utilisateur — Lots A, B2 et C5, 30 août 2026'),
  ('PROOF_REJECTED', 'Preuve refusée', true, true, true, 'confirmed', 240, 'Validation utilisateur — Lots A, B2 et C5, 30 août 2026')
on conflict (code) do update set
  label = excluded.label,
  is_activity = excluded.is_activity,
  is_sensitive = excluded.is_sensitive,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

create table if not exists public.proof_type_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]*$'),
  label text not null check (length(btrim(label)) > 0),
  is_active boolean not null default false,
  validation_status text not null
    check (validation_status in ('confirmed', 'compatibility_only', 'to_confirm')),
  allowed_mime_types text[] not null default '{}'::text[],
  max_file_size_bytes bigint check (max_file_size_bytes is null or max_file_size_bytes > 0),
  sort_order integer not null check (sort_order > 0),
  source_document text not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);

insert into public.proof_type_definitions(
  code, label, is_active, validation_status, allowed_mime_types,
  max_file_size_bytes, sort_order, source_document
) values
  ('photo', 'Photo', true, 'confirmed', array['image/jpeg','image/png','image/webp'], 10485760, 10, 'Type déjà accepté par register_anomaly_proof'),
  ('report', 'Rapport d’intervention', true, 'confirmed', array['application/pdf','image/jpeg','image/png','image/webp'], 10485760, 20, 'Type déjà accepté par register_anomaly_proof'),
  ('pv', 'Procès-verbal', true, 'confirmed', array['application/pdf','image/jpeg','image/png','image/webp'], 10485760, 30, 'Type déjà accepté par register_anomaly_proof'),
  ('invoice', 'Facture', false, 'compatibility_only', '{}'::text[], null, 40, 'Valeur historique de proofs.proof_type ; non activée en C5'),
  ('quote', 'Devis', false, 'compatibility_only', '{}'::text[], null, 50, 'Valeur historique de proofs.proof_type ; non activée en C5'),
  ('comment', 'Commentaire', false, 'compatibility_only', '{}'::text[], null, 60, 'Valeur historique de proofs.proof_type ; non activée en C5'),
  ('other', 'Autre', false, 'to_confirm', '{}'::text[], null, 999, 'Valeur historique de proofs.proof_type ; non activée en C5')
on conflict (code) do update set
  label = excluded.label,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  allowed_mime_types = excluded.allowed_mime_types,
  max_file_size_bytes = excluded.max_file_size_bytes,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document,
  updated_at = clock_timestamp();

create table if not exists public.proof_rule_sets (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[A-Z][A-Z0-9_]*$'),
  version_no integer not null check (version_no > 0),
  status text not null check (status in ('draft', 'published', 'retired')),
  effective_from date not null,
  effective_to date,
  published_by_profile_id uuid references public.profiles(id) on delete restrict,
  published_at timestamptz,
  source_document text not null,
  created_at timestamptz not null default clock_timestamp(),
  unique (code, version_no),
  check (effective_to is null or effective_to >= effective_from),
  check ((status = 'draft') = (published_at is null))
);

insert into public.proof_rule_sets(
  code, version_no, status, effective_from, effective_to,
  published_by_profile_id, published_at, source_document
) values (
  'CORE_CRITICAL_CLOSURE', 1, 'published', date '2026-08-30', null,
  null, clock_timestamp(), 'Cahier des charges : verrou critique avec preuve acceptée'
)
on conflict (code, version_no) do nothing;

create table if not exists public.proof_requirement_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]*$'),
  rule_set_id uuid not null references public.proof_rule_sets(id) on delete restrict,
  equipment_id uuid references public.equipment(id) on delete restrict,
  category_id uuid references public.categories(id) on delete restrict,
  priority_id uuid references public.priority_definitions(id) on delete restrict,
  requires_critical boolean not null default false,
  workflow_stage_id uuid references public.workflow_stages(id) on delete restrict,
  action_code_id uuid references public.next_action_codes(id) on delete restrict,
  proof_type_mode text not null check (proof_type_mode in ('any_accepted', 'specific')),
  proof_type_id uuid references public.proof_type_definitions(id) on delete restrict,
  label text not null check (length(btrim(label)) > 0),
  minimum_count integer not null default 1 check (minimum_count > 0),
  acceptance_criteria jsonb not null default '{}'::jsonb
    check (jsonb_typeof(acceptance_criteria) = 'object'),
  is_mandatory boolean not null default true,
  precedence integer not null default 100 check (precedence > 0),
  is_active boolean not null default true,
  validation_status text not null check (validation_status in ('confirmed', 'to_confirm')),
  source_document text not null,
  created_at timestamptz not null default clock_timestamp(),
  check (requires_critical or num_nonnulls(equipment_id, category_id, priority_id, workflow_stage_id, action_code_id) >= 1),
  check (
    (proof_type_mode = 'any_accepted' and proof_type_id is null)
    or (proof_type_mode = 'specific' and proof_type_id is not null)
  )
);

insert into public.proof_requirement_rules(
  code, rule_set_id, requires_critical, proof_type_mode, proof_type_id,
  label, minimum_count, acceptance_criteria, is_mandatory,
  precedence, is_active, validation_status, source_document
) values (
  'CRITICAL_ACCEPTED_PROOF',
  (select id from public.proof_rule_sets where code = 'CORE_CRITICAL_CLOSURE' and version_no = 1),
  true,
  'any_accepted', null,
  'Au moins une preuve acceptée conforme au dossier',
  1,
  jsonb_build_object(
    'verification_status', 'accepted',
    'exact_type', 'contextual_to_confirm',
    'note', 'Aucun type WILO, RIA, ascenseur ou équipement n’est généralisé en C5'
  ),
  true, 10, true, 'confirmed',
  'Cahier des charges et lot B2 : toute anomalie critique exige une preuve acceptée avant clôture'
)
on conflict (code) do nothing;

create table if not exists public.anomaly_proof_requirements (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  source_rule_id uuid references public.proof_requirement_rules(id) on delete restrict,
  source_rule_set_version integer,
  proof_type_mode text not null check (proof_type_mode in ('any_accepted', 'specific')),
  proof_type_id uuid references public.proof_type_definitions(id) on delete restrict,
  label_snapshot text not null check (length(btrim(label_snapshot)) > 0),
  minimum_count integer not null check (minimum_count > 0),
  acceptance_criteria_snapshot jsonb not null default '{}'::jsonb
    check (jsonb_typeof(acceptance_criteria_snapshot) = 'object'),
  is_mandatory boolean not null default true,
  origin text not null check (origin in ('rule', 'facility_manager')),
  state text not null default 'pending'
    check (state in ('pending', 'satisfied', 'waived', 'superseded')),
  application_comment text not null check (length(btrim(application_comment)) > 0),
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  application_idempotency_key uuid not null unique,
  application_base_version_no integer not null check (application_base_version_no > 0),
  application_client_occurred_at timestamptz,
  satisfied_at timestamptz,
  satisfied_by_profile_id uuid references public.profiles(id) on delete restrict,
  superseded_at timestamptz,
  superseded_by_profile_id uuid references public.profiles(id) on delete restrict,
  superseded_by_requirement_id uuid references public.anomaly_proof_requirements(id) on delete restrict,
  waived_at timestamptz,
  waived_by_profile_id uuid references public.profiles(id) on delete restrict,
  waiver_reason text,
  server_received_at timestamptz not null default clock_timestamp(),
  check (
    (proof_type_mode = 'any_accepted' and proof_type_id is null)
    or (proof_type_mode = 'specific' and proof_type_id is not null)
  ),
  check (
    (origin = 'rule' and source_rule_id is not null and source_rule_set_version is not null)
    or (origin = 'facility_manager' and source_rule_id is null and source_rule_set_version is null and created_by_profile_id is not null)
  ),
  check (superseded_by_requirement_id is distinct from id),
  check (
    (state = 'pending'
      and satisfied_at is null and satisfied_by_profile_id is null
      and superseded_at is null and superseded_by_profile_id is null and superseded_by_requirement_id is null
      and waived_at is null and waived_by_profile_id is null and waiver_reason is null)
    or
    (state = 'satisfied'
      and satisfied_at is not null and satisfied_by_profile_id is not null
      and superseded_at is null and superseded_by_profile_id is null and superseded_by_requirement_id is null
      and waived_at is null and waived_by_profile_id is null and waiver_reason is null)
    or
    (state = 'superseded'
      and satisfied_at is null and satisfied_by_profile_id is null
      and superseded_at is not null and superseded_by_profile_id is not null and superseded_by_requirement_id is not null
      and waived_at is null and waived_by_profile_id is null and waiver_reason is null)
    or
    (state = 'waived'
      and satisfied_at is null and satisfied_by_profile_id is null
      and superseded_at is null and superseded_by_profile_id is null and superseded_by_requirement_id is null
      and waived_at is not null and waived_by_profile_id is not null
      and nullif(btrim(waiver_reason), '') is not null)
  )
);

create table if not exists public.proof_requirement_evidence (
  requirement_id uuid not null references public.anomaly_proof_requirements(id) on delete restrict,
  proof_id uuid not null references public.proofs(id) on delete restrict,
  linked_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  linked_at timestamptz not null default clock_timestamp(),
  idempotency_key uuid not null unique,
  primary key (requirement_id, proof_id)
);

alter table public.proofs
  add column if not exists reviewed_by_profile_id uuid references public.profiles(id) on delete restrict,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_comment text,
  add column if not exists review_idempotency_key uuid,
  add column if not exists review_base_version_no integer,
  add column if not exists review_client_occurred_at timestamptz;

create unique index if not exists proofs_review_idempotency_idx
  on public.proofs(review_idempotency_key)
  where review_idempotency_key is not null;
create index if not exists proof_requirement_rules_rule_set_idx
  on public.proof_requirement_rules(rule_set_id, precedence, id);
create index if not exists proof_requirement_rules_equipment_idx
  on public.proof_requirement_rules(equipment_id) where equipment_id is not null;
create index if not exists proof_requirement_rules_category_idx
  on public.proof_requirement_rules(category_id) where category_id is not null;
create index if not exists proof_requirement_rules_priority_idx
  on public.proof_requirement_rules(priority_id) where priority_id is not null;
create index if not exists proof_requirement_rules_stage_idx
  on public.proof_requirement_rules(workflow_stage_id) where workflow_stage_id is not null;
create index if not exists proof_requirement_rules_action_idx
  on public.proof_requirement_rules(action_code_id) where action_code_id is not null;
create unique index if not exists anomaly_proof_requirements_rule_current_idx
  on public.anomaly_proof_requirements(anomaly_id, source_rule_id)
  where source_rule_id is not null and state in ('pending', 'satisfied');
create index if not exists anomaly_proof_requirements_anomaly_state_idx
  on public.anomaly_proof_requirements(anomaly_id, state, created_at, id);
create index if not exists anomaly_proof_requirements_type_idx
  on public.anomaly_proof_requirements(proof_type_id)
  where proof_type_id is not null and state = 'pending';
create index if not exists anomaly_proof_requirements_created_by_idx
  on public.anomaly_proof_requirements(created_by_profile_id)
  where created_by_profile_id is not null;
create index if not exists anomaly_proof_requirements_satisfied_by_idx
  on public.anomaly_proof_requirements(satisfied_by_profile_id)
  where satisfied_by_profile_id is not null;
create index if not exists anomaly_proof_requirements_superseded_by_profile_idx
  on public.anomaly_proof_requirements(superseded_by_profile_id)
  where superseded_by_profile_id is not null;
create index if not exists anomaly_proof_requirements_superseded_by_requirement_idx
  on public.anomaly_proof_requirements(superseded_by_requirement_id)
  where superseded_by_requirement_id is not null;
create index if not exists anomaly_proof_requirements_waived_by_idx
  on public.anomaly_proof_requirements(waived_by_profile_id)
  where waived_by_profile_id is not null;
create index if not exists proof_requirement_evidence_proof_idx
  on public.proof_requirement_evidence(proof_id, requirement_id);
create index if not exists proof_requirement_evidence_actor_idx
  on public.proof_requirement_evidence(linked_by_profile_id, linked_at desc);
create index if not exists proofs_reviewed_by_idx
  on public.proofs(reviewed_by_profile_id, reviewed_at desc)
  where reviewed_by_profile_id is not null;

alter table public.proof_type_definitions enable row level security;
alter table public.proof_rule_sets enable row level security;
alter table public.proof_requirement_rules enable row level security;
alter table public.anomaly_proof_requirements enable row level security;
alter table public.proof_requirement_evidence enable row level security;

revoke all on table public.proof_type_definitions from public, anon, authenticated;
revoke all on table public.proof_rule_sets from public, anon, authenticated;
revoke all on table public.proof_requirement_rules from public, anon, authenticated;
revoke all on table public.anomaly_proof_requirements from public, anon, authenticated;
revoke all on table public.proof_requirement_evidence from public, anon, authenticated;
grant select on table public.proof_type_definitions to authenticated;
grant select on table public.proof_rule_sets to authenticated;
grant select on table public.proof_requirement_rules to authenticated;
grant select on table public.anomaly_proof_requirements to authenticated;
grant select on table public.proof_requirement_evidence to authenticated;
grant select, insert, update, delete on table public.proof_type_definitions to service_role;
grant select, insert, update, delete on table public.proof_rule_sets to service_role;
grant select, insert, update, delete on table public.proof_requirement_rules to service_role;
grant select, insert, update, delete on table public.anomaly_proof_requirements to service_role;
grant select, insert, update, delete on table public.proof_requirement_evidence to service_role;

create policy proof_type_definitions_read on public.proof_type_definitions
for select to authenticated
using (
  public.current_profile_id() is not null
  and (is_active or public.has_any_role(array['direction', 'facility_manager']))
);

create policy proof_rule_sets_read on public.proof_rule_sets
for select to authenticated
using (public.has_any_role(array['direction', 'facility_manager']));

create policy proof_requirement_rules_read on public.proof_requirement_rules
for select to authenticated
using (public.has_any_role(array['direction', 'facility_manager']));

create policy anomaly_proof_requirements_read on public.anomaly_proof_requirements
for select to authenticated
using (public.can_access_anomaly(anomaly_id));

create policy proof_requirement_evidence_read on public.proof_requirement_evidence
for select to authenticated
using (
  exists (
    select 1
    from public.anomaly_proof_requirements r
    where r.id = requirement_id
      and public.can_access_anomaly(r.anomaly_id)
  )
);

create or replace function private.proof_anomaly_id(p_proof_id uuid)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p.anomaly_id, wo.anomaly_id, i.anomaly_id)
  from public.proofs p
  left join public.work_orders wo on wo.id = p.work_order_id
  left join public.interventions i on i.id = p.intervention_id
  where p.id = p_proof_id;
$$;

create or replace function private.guard_proof_rule_set_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    raise exception 'Proof rule sets are append-only' using errcode = '23514';
  end if;

  if old.status in ('published', 'retired') then
    if old.status = 'published'
      and new.status = 'retired'
      and new.effective_to is not null
      and new.id = old.id
      and new.code = old.code
      and new.version_no = old.version_no
      and new.effective_from = old.effective_from
      and new.published_by_profile_id is not distinct from old.published_by_profile_id
      and new.published_at is not distinct from old.published_at
      and new.source_document = old.source_document then
      return new;
    end if;
    raise exception 'A published proof rule set cannot be rewritten'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger guard_proof_rule_set_row
before update or delete on public.proof_rule_sets
for each row execute function private.guard_proof_rule_set_row();

create or replace function private.guard_proof_requirement_rule_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rule_set_id uuid := coalesce(old.rule_set_id, new.rule_set_id);
  v_status text;
begin
  select status into v_status from public.proof_rule_sets where id = v_rule_set_id;
  if v_status in ('published', 'retired') then
    raise exception 'Rules from a published set are immutable; publish a new version'
      using errcode = '23514';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create trigger guard_proof_requirement_rule_row
before update or delete on public.proof_requirement_rules
for each row execute function private.guard_proof_requirement_rule_row();

create or replace function private.validate_proof_requirement_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_rule record;
  v_is_closed boolean;
  v_validating_role boolean;
  v_link_count integer;
begin
  if tg_op = 'DELETE' then
    raise exception 'Proof requirements are append-only' using errcode = '23514';
  end if;

  select s.is_closed into v_is_closed
  from public.anomalies a
  join public.status_definitions s on s.id = a.current_status_id
  where a.id = new.anomaly_id;
  if coalesce(v_is_closed, false) and tg_op = 'INSERT' then
    raise exception 'A closed dossier cannot receive a proof requirement'
      using errcode = '23514';
  end if;

  if tg_op = 'INSERT' then
    if new.state <> 'pending' then
      raise exception 'A proof requirement must start pending' using errcode = '23514';
    end if;

    if new.origin = 'rule' then
      select
        r.id, r.proof_type_mode, r.proof_type_id, r.label, r.minimum_count,
        r.acceptance_criteria, r.is_mandatory, r.is_active,
        r.validation_status, rs.version_no, rs.status,
        rs.effective_from, rs.effective_to
      into v_rule
      from public.proof_requirement_rules r
      join public.proof_rule_sets rs on rs.id = r.rule_set_id
      where r.id = new.source_rule_id;

      if v_rule.id is null
        or not v_rule.is_active
        or v_rule.validation_status <> 'confirmed'
        or v_rule.status <> 'published'
        or current_date < v_rule.effective_from
        or (v_rule.effective_to is not null and current_date > v_rule.effective_to)
        or new.source_rule_set_version is distinct from v_rule.version_no
        or new.proof_type_mode is distinct from v_rule.proof_type_mode
        or new.proof_type_id is distinct from v_rule.proof_type_id
        or new.label_snapshot is distinct from v_rule.label
        or new.minimum_count is distinct from v_rule.minimum_count
        or new.acceptance_criteria_snapshot is distinct from v_rule.acceptance_criteria
        or new.is_mandatory is distinct from v_rule.is_mandatory then
        raise exception 'The applied proof requirement must be an exact snapshot of a published rule'
          using errcode = '23514';
      end if;
    elsif new.origin = 'facility_manager' then
      if not exists (
        select 1
        from public.profiles p
        join public.user_roles ur on ur.profile_id = p.id
        join public.roles r on r.id = ur.role_id
        where p.id = new.created_by_profile_id
          and p.account_status = 'active'
          and not p.must_change_password
          and r.code = 'facility_manager'
      ) then
        raise exception 'Only an active Facility Manager can add a proof requirement'
          using errcode = '42501';
      end if;
      if new.proof_type_mode <> 'specific'
        or not exists (
          select 1 from public.proof_type_definitions t
          where t.id = new.proof_type_id
            and t.is_active
            and t.validation_status = 'confirmed'
        ) then
        raise exception 'A Facility Manager reinforcement requires an active confirmed proof type'
          using errcode = '23514';
      end if;
    end if;
    return new;
  end if;

  if new.id is distinct from old.id
    or new.anomaly_id is distinct from old.anomaly_id
    or new.source_rule_id is distinct from old.source_rule_id
    or new.source_rule_set_version is distinct from old.source_rule_set_version
    or new.proof_type_mode is distinct from old.proof_type_mode
    or new.proof_type_id is distinct from old.proof_type_id
    or new.label_snapshot is distinct from old.label_snapshot
    or new.minimum_count is distinct from old.minimum_count
    or new.acceptance_criteria_snapshot is distinct from old.acceptance_criteria_snapshot
    or new.is_mandatory is distinct from old.is_mandatory
    or new.origin is distinct from old.origin
    or new.application_comment is distinct from old.application_comment
    or new.created_by_profile_id is distinct from old.created_by_profile_id
    or new.created_at is distinct from old.created_at
    or new.application_idempotency_key is distinct from old.application_idempotency_key
    or new.application_base_version_no is distinct from old.application_base_version_no
    or new.application_client_occurred_at is distinct from old.application_client_occurred_at
    or new.server_received_at is distinct from old.server_received_at then
    raise exception 'A proof requirement snapshot is immutable'
      using errcode = '23514';
  end if;

  if old.state <> 'pending' then
    raise exception 'A completed proof requirement cannot be changed'
      using errcode = '23514';
  end if;
  if new.state = 'waived' then
    raise exception 'Proof requirement waiver is not enabled in C5'
      using errcode = '42501';
  end if;
  if new.state = 'superseded' then
    raise exception 'Proof requirement replacement is not enabled in C5; add a stronger requirement'
      using errcode = '42501';
  end if;
  if new.state <> 'satisfied' then
    raise exception 'Unsupported proof requirement transition' using errcode = '23514';
  end if;

  select exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.profile_id = p.id
    join public.roles r on r.id = ur.role_id
    where p.id = new.satisfied_by_profile_id
      and p.account_status = 'active'
      and not p.must_change_password
      and r.code = 'facility_manager'
  ) into v_validating_role;
  if not v_validating_role then
    raise exception 'Only an active Facility Manager can satisfy a proof requirement'
      using errcode = '42501';
  end if;

  select count(*) into v_link_count
  from public.proof_requirement_evidence e
  join public.proofs p on p.id = e.proof_id
  where e.requirement_id = old.id
    and p.verification_status = 'accepted';
  if v_link_count < old.minimum_count then
    raise exception 'Not enough accepted proofs are linked to satisfy the requirement'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger validate_proof_requirement_row
before insert or update or delete on public.anomaly_proof_requirements
for each row execute function private.validate_proof_requirement_row();

create or replace function private.validate_proof_requirement_evidence_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requirement public.anomaly_proof_requirements%rowtype;
  v_proof public.proofs%rowtype;
  v_proof_anomaly_id uuid;
  v_expected_type text;
begin
  if tg_op <> 'INSERT' then
    raise exception 'Proof-to-requirement links are append-only' using errcode = '23514';
  end if;

  select * into v_requirement
  from public.anomaly_proof_requirements where id = new.requirement_id;
  select * into v_proof from public.proofs where id = new.proof_id;
  v_proof_anomaly_id := private.proof_anomaly_id(new.proof_id);

  if v_requirement.id is null or v_requirement.state <> 'pending' then
    raise exception 'The proof requirement is not pending' using errcode = '23514';
  end if;
  if v_proof.id is null or v_proof.verification_status <> 'accepted' then
    raise exception 'Only an accepted proof can satisfy a requirement' using errcode = '23514';
  end if;
  if v_proof_anomaly_id is distinct from v_requirement.anomaly_id then
    raise exception 'The proof and requirement must belong to the same dossier'
      using errcode = '23514';
  end if;
  if v_requirement.proof_type_mode = 'specific' then
    select code into v_expected_type
    from public.proof_type_definitions where id = v_requirement.proof_type_id;
    if v_proof.proof_type is distinct from v_expected_type then
      raise exception 'The accepted proof type does not match the requirement'
        using errcode = '23514';
    end if;
  end if;
  if not exists (
    select 1
    from public.profiles p
    join public.user_roles ur on ur.profile_id = p.id
    join public.roles r on r.id = ur.role_id
    where p.id = new.linked_by_profile_id
      and p.account_status = 'active'
      and not p.must_change_password
      and r.code = 'facility_manager'
  ) then
    raise exception 'Only an active Facility Manager can link accepted evidence'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger validate_proof_requirement_evidence_row
before insert or update or delete on public.proof_requirement_evidence
for each row execute function private.validate_proof_requirement_evidence_row();

create or replace function private.prepare_proof_review_row()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_anomaly_id uuid;
  v_version integer;
begin
  v_anomaly_id := coalesce(new.anomaly_id, private.proof_anomaly_id(new.id));
  select version_no into v_version from public.anomalies where id = v_anomaly_id;

  if tg_op = 'INSERT' then
    if new.verification_status = 'pending' then
      if new.reviewed_by_profile_id is not null or new.reviewed_at is not null
        or new.review_comment is not null
        or new.review_idempotency_key is not null or new.review_base_version_no is not null then
        raise exception 'A pending proof cannot carry a review decision'
          using errcode = '23514';
      end if;
      return new;
    end if;

    if new.verification_status = 'accepted' then
      new.reviewed_by_profile_id := coalesce(new.reviewed_by_profile_id, new.verified_by_profile_id);
      new.reviewed_at := coalesce(new.reviewed_at, new.verified_at, clock_timestamp());
    elsif new.verification_status = 'rejected' then
      new.reviewed_by_profile_id := coalesce(new.reviewed_by_profile_id, v_actor);
      new.reviewed_at := coalesce(new.reviewed_at, clock_timestamp());
    end if;
    if new.reviewed_by_profile_id is null then
      raise exception 'A decided proof must retain its reviewer' using errcode = '23514';
    end if;
    new.review_idempotency_key := coalesce(new.review_idempotency_key, gen_random_uuid());
    new.review_base_version_no := coalesce(new.review_base_version_no, v_version);
    return new;
  end if;

  if new.verification_status is not distinct from old.verification_status then
    if new.reviewed_by_profile_id is distinct from old.reviewed_by_profile_id
      or new.reviewed_at is distinct from old.reviewed_at
      or new.review_comment is distinct from old.review_comment
      or new.review_idempotency_key is distinct from old.review_idempotency_key
      or new.review_base_version_no is distinct from old.review_base_version_no
      or new.review_client_occurred_at is distinct from old.review_client_occurred_at then
      raise exception 'Proof review provenance is immutable'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if old.verification_status <> 'pending' then
    raise exception 'A proof review decision is final' using errcode = '23514';
  end if;
  if new.verification_status not in ('accepted', 'rejected') then
    raise exception 'Unsupported proof review transition' using errcode = '23514';
  end if;
  if v_actor is null or not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can review proof'
      using errcode = '42501';
  end if;
  if new.verification_status = 'rejected'
    and nullif(btrim(new.rejection_reason), '') is null then
    raise exception 'A rejection reason is required' using errcode = '23514';
  end if;

  new.reviewed_by_profile_id := v_actor;
  new.reviewed_at := clock_timestamp();
  new.review_idempotency_key := coalesce(new.review_idempotency_key, gen_random_uuid());
  new.review_base_version_no := coalesce(new.review_base_version_no, v_version);
  if new.verification_status = 'accepted' then
    new.verified_by_profile_id := v_actor;
    new.verified_at := new.reviewed_at;
    new.rejection_reason := null;
  else
    new.verified_by_profile_id := null;
    new.verified_at := null;
  end if;
  return new;
end;
$$;

create trigger prepare_proof_review_row
before insert or update of verification_status on public.proofs
for each row execute function private.prepare_proof_review_row();

create or replace function private.link_accepted_proof_requirement(
  p_requirement_id uuid,
  p_proof_id uuid,
  p_actor_profile_id uuid,
  p_idempotency_key uuid
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_requirement public.anomaly_proof_requirements%rowtype;
  v_inserted boolean := false;
  v_count integer;
  v_event_definition_id uuid;
  v_stage_id uuid;
  v_actor_label text;
begin
  select * into v_requirement
  from public.anomaly_proof_requirements
  where id = p_requirement_id
  for update;
  if v_requirement.id is null or v_requirement.state <> 'pending' then
    return false;
  end if;

  insert into public.proof_requirement_evidence(
    requirement_id, proof_id, linked_by_profile_id, idempotency_key
  ) values (
    p_requirement_id, p_proof_id, p_actor_profile_id, p_idempotency_key
  )
  on conflict (requirement_id, proof_id) do nothing;
  get diagnostics v_count = row_count;
  v_inserted := v_count = 1;

  if v_inserted then
    select s.stage_id into v_stage_id
    from public.anomalies a
    join public.status_definitions s on s.id = a.current_status_id
    where a.id = v_requirement.anomaly_id;
    select display_name into v_actor_label
    from public.profiles where id = p_actor_profile_id;
    select id into v_event_definition_id
    from public.business_event_definitions
    where code = 'PROOF_REQUIREMENT_EVIDENCE_LINKED' and is_active;

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key, server_received_at
    ) values (
      v_requirement.anomaly_id,
      'proof_requirement_evidence_linked',
      v_event_definition_id,
      v_stage_id,
      p_actor_profile_id,
      coalesce(v_actor_label, 'Facility Manager'),
      'Preuve acceptée liée à une exigence',
      jsonb_build_object('requirement_id', p_requirement_id, 'proof_id', p_proof_id),
      'proof_requirement_evidence',
      p_proof_id,
      p_idempotency_key,
      clock_timestamp()
    );
  end if;

  select count(*) into v_count
  from public.proof_requirement_evidence e
  join public.proofs p on p.id = e.proof_id
  where e.requirement_id = p_requirement_id
    and p.verification_status = 'accepted';

  if v_count >= v_requirement.minimum_count then
    update public.anomaly_proof_requirements
    set state = 'satisfied',
        satisfied_at = clock_timestamp(),
        satisfied_by_profile_id = p_actor_profile_id
    where id = p_requirement_id and state = 'pending';

    if found then
      select id into v_event_definition_id
      from public.business_event_definitions
      where code = 'PROOF_REQUIREMENT_SATISFIED' and is_active;

      insert into public.anomaly_history(
        anomaly_id, event_type, event_definition_id, workflow_stage_id,
        actor_profile_id, actor_label_snapshot, comment, change_set,
        source_table, source_record_id, idempotency_key, server_received_at
      ) values (
        v_requirement.anomaly_id,
        'proof_requirement_satisfied',
        v_event_definition_id,
        v_stage_id,
        p_actor_profile_id,
        coalesce(v_actor_label, 'Facility Manager'),
        'Exigence satisfaite par une preuve acceptée',
        jsonb_build_object(
          'requirement_id', p_requirement_id,
          'proof_id', p_proof_id,
          'minimum_count', v_requirement.minimum_count,
          'accepted_link_count', v_count
        ),
        'anomaly_proof_requirements',
        p_requirement_id,
        gen_random_uuid(),
        clock_timestamp()
      );
    end if;
  end if;
  return v_inserted;
end;
$$;

create or replace function private.apply_published_proof_rules(
  p_anomaly_id uuid,
  p_base_version_no integer
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anomaly record;
  v_rule record;
  v_requirement_id uuid;
  v_key uuid;
  v_event_definition_id uuid;
  v_count integer := 0;
begin
  select a.*, s.stage_id, s.is_closed
  into v_anomaly
  from public.anomalies a
  join public.status_definitions s on s.id = a.current_status_id
  where a.id = p_anomaly_id;
  if v_anomaly.id is null or v_anomaly.is_closed then
    return 0;
  end if;

  select id into v_event_definition_id
  from public.business_event_definitions
  where code = 'PROOF_REQUIREMENT_APPLIED' and is_active;

  for v_rule in
    select
      r.*, rs.version_no as rule_set_version
    from public.proof_requirement_rules r
    join public.proof_rule_sets rs on rs.id = r.rule_set_id
    where r.is_active
      and r.validation_status = 'confirmed'
      and rs.status = 'published'
      and current_date >= rs.effective_from
      and (rs.effective_to is null or current_date <= rs.effective_to)
      and (r.equipment_id is null or r.equipment_id = v_anomaly.equipment_id)
      and (r.category_id is null or r.category_id = v_anomaly.category_id)
      and (r.priority_id is null or r.priority_id = v_anomaly.priority_id)
      and (
        not r.requires_critical
        or exists (
          select 1 from public.priority_definitions p
          where p.id = v_anomaly.priority_id and p.is_critical
        )
      )
      and (r.workflow_stage_id is null or r.workflow_stage_id = v_anomaly.stage_id)
      and (
        r.action_code_id is null
        or exists (
          select 1 from public.anomaly_actions aa
          where aa.anomaly_id = v_anomaly.id
            and aa.action_code_id = r.action_code_id
            and aa.state = 'pending'
        )
      )
      and not exists (
        select 1 from public.anomaly_proof_requirements apr
        where apr.anomaly_id = v_anomaly.id
          and apr.source_rule_id = r.id
          and apr.state in ('pending', 'satisfied')
      )
    order by r.precedence, r.id
  loop
    v_requirement_id := gen_random_uuid();
    v_key := gen_random_uuid();
    insert into public.anomaly_proof_requirements(
      id, anomaly_id, source_rule_id, source_rule_set_version,
      proof_type_mode, proof_type_id, label_snapshot, minimum_count,
      acceptance_criteria_snapshot, is_mandatory, origin, state,
      application_comment, created_by_profile_id,
      application_idempotency_key, application_base_version_no
    ) values (
      v_requirement_id, v_anomaly.id, v_rule.id, v_rule.rule_set_version,
      v_rule.proof_type_mode, v_rule.proof_type_id, v_rule.label,
      v_rule.minimum_count, v_rule.acceptance_criteria,
      v_rule.is_mandatory, 'rule', 'pending',
      'Exigence appliquée automatiquement depuis une règle publiée', null,
      v_key, greatest(coalesce(p_base_version_no, v_anomaly.version_no), 1)
    );

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key, server_received_at
    ) values (
      v_anomaly.id,
      'proof_requirement_applied',
      v_event_definition_id,
      v_anomaly.stage_id,
      null,
      'Système BEHIRA',
      'Exigence appliquée depuis une règle publiée',
      jsonb_build_object(
        'requirement_id', v_requirement_id,
        'rule_code', v_rule.code,
        'rule_set_version', v_rule.rule_set_version,
        'proof_type_mode', v_rule.proof_type_mode,
        'proof_type_id', v_rule.proof_type_id,
        'minimum_count', v_rule.minimum_count,
        'is_mandatory', v_rule.is_mandatory
      ),
      'anomaly_proof_requirements',
      v_requirement_id,
      v_key,
      clock_timestamp()
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function private.apply_published_proof_rules_trigger()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  perform private.apply_published_proof_rules(new.id, new.version_no);
  return new;
end;
$$;

create trigger apply_published_proof_rules
after insert or update of priority_id, category_id, equipment_id, current_status_id
on public.anomalies
for each row execute function private.apply_published_proof_rules_trigger();

create or replace function private.record_proof_activity()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anomaly_id uuid;
  v_stage_id uuid;
  v_event_definition_id uuid;
  v_actor uuid;
  v_actor_label text;
  v_event_code text;
  v_event_type text;
  v_event_key uuid;
  v_requirement record;
begin
  v_anomaly_id := private.proof_anomaly_id(new.id);
  if v_anomaly_id is null then
    return new;
  end if;
  select s.stage_id into v_stage_id
  from public.anomalies a
  join public.status_definitions s on s.id = a.current_status_id
  where a.id = v_anomaly_id;

  if tg_op = 'INSERT' then
    v_actor := new.submitted_by_profile_id;
    select display_name into v_actor_label from public.profiles where id = v_actor;
    select id into v_event_definition_id
    from public.business_event_definitions
    where code = 'PROOF_SUBMITTED' and is_active;
    v_event_key := coalesce(new.client_mutation_id, gen_random_uuid());

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key,
      client_occurred_at, server_received_at
    ) values (
      v_anomaly_id, 'proof_submitted', v_event_definition_id, v_stage_id,
      v_actor, coalesce(v_actor_label, 'Système BEHIRA'),
      'Preuve déposée ; validation distincte',
      jsonb_build_object(
        'proof_id', new.id,
        'proof_type', new.proof_type,
        'verification_status', new.verification_status
      ),
      'proofs', new.id, v_event_key, new.captured_at, clock_timestamp()
    );
  end if;

  if (tg_op = 'INSERT' and new.verification_status in ('accepted', 'rejected'))
    or (tg_op = 'UPDATE'
      and new.verification_status is distinct from old.verification_status
      and new.verification_status in ('accepted', 'rejected')) then
    v_actor := new.reviewed_by_profile_id;
    select display_name into v_actor_label from public.profiles where id = v_actor;
    v_event_code := case when new.verification_status = 'accepted' then 'PROOF_ACCEPTED' else 'PROOF_REJECTED' end;
    v_event_type := case when new.verification_status = 'accepted' then 'proof_accepted' else 'proof_rejected' end;
    select id into v_event_definition_id
    from public.business_event_definitions
    where code = v_event_code and is_active;

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key,
      client_occurred_at, server_received_at
    ) values (
      v_anomaly_id, v_event_type, v_event_definition_id, v_stage_id,
      v_actor, coalesce(v_actor_label, 'Facility Manager'),
      case
        when new.verification_status = 'accepted' then 'Preuve acceptée par le Facility Manager'
        else new.rejection_reason
      end,
      jsonb_build_object(
        'proof_id', new.id,
        'proof_type', new.proof_type,
        'old_verification_status', case when tg_op = 'UPDATE' then old.verification_status else null end,
        'new_verification_status', new.verification_status,
        'rejection_reason', new.rejection_reason
      ),
      'proofs', new.id, coalesce(new.review_idempotency_key, gen_random_uuid()),
      new.review_client_occurred_at, clock_timestamp()
    );

    if new.verification_status = 'accepted' then
      for v_requirement in
        select id
        from public.anomaly_proof_requirements
        where anomaly_id = v_anomaly_id
          and state = 'pending'
          and proof_type_mode = 'any_accepted'
        order by created_at, id
      loop
        perform private.link_accepted_proof_requirement(
          v_requirement.id, new.id, v_actor, gen_random_uuid()
        );
      end loop;
    end if;
  end if;

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly_id;
  return new;
end;
$$;

create trigger record_proof_activity
after insert or update of verification_status on public.proofs
for each row execute function private.record_proof_activity();

create or replace function private.prevent_close_with_pending_proof_requirement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_target_closed boolean;
begin
  if new.current_status_id is not distinct from old.current_status_id then
    return new;
  end if;
  select is_closed into v_target_closed
  from public.status_definitions where id = new.current_status_id;
  if coalesce(v_target_closed, false) and exists (
    select 1 from public.anomaly_proof_requirements r
    where r.anomaly_id = new.id
      and r.is_mandatory
      and r.state = 'pending'
  ) then
    raise exception 'A dossier cannot be closed while a mandatory proof requirement is pending'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger guard_close_pending_proof_requirement
before update of current_status_id on public.anomalies
for each row execute function private.prevent_close_with_pending_proof_requirement();

create or replace function public.add_anomaly_proof_requirement(
  p_reference text,
  p_proof_type_code text,
  p_label text,
  p_minimum_count integer,
  p_acceptance_criteria jsonb,
  p_comment text,
  p_idempotency_key uuid,
  p_base_version_no integer,
  p_client_occurred_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_actor_label text;
  v_anomaly public.anomalies%rowtype;
  v_type public.proof_type_definitions%rowtype;
  v_existing public.anomaly_proof_requirements%rowtype;
  v_requirement_id uuid := gen_random_uuid();
  v_event_definition_id uuid;
  v_stage_id uuid;
  v_new_version integer;
begin
  if v_actor is null or not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can add a proof requirement'
      using errcode = '42501';
  end if;
  if p_idempotency_key is null or p_base_version_no is null or p_base_version_no < 1 then
    raise exception 'An idempotency key and a valid dossier version are required'
      using errcode = '22023';
  end if;
  if nullif(btrim(p_label), '') is null
    or nullif(btrim(p_comment), '') is null
    or p_minimum_count is null or p_minimum_count < 1
    or p_acceptance_criteria is null
    or jsonb_typeof(p_acceptance_criteria) <> 'object' then
    raise exception 'A label, quantity, criteria object and reinforcement reason are required'
      using errcode = '22023';
  end if;

  select a.* into v_anomaly
  from public.anomalies a
  where a.reference = p_reference
  for update of a;
  if v_anomaly.id is null or not public.can_access_anomaly(v_anomaly.id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;
  if exists (
    select 1 from public.status_definitions s
    where s.id = v_anomaly.current_status_id and s.is_closed
  ) then
    raise exception 'A closed dossier cannot receive a proof requirement'
      using errcode = '23514';
  end if;

  select * into v_type
  from public.proof_type_definitions
  where code = lower(btrim(p_proof_type_code))
    and is_active
    and validation_status = 'confirmed';
  if v_type.id is null then
    raise exception 'The proof type is not active and confirmed'
      using errcode = '23514';
  end if;

  select * into v_existing
  from public.anomaly_proof_requirements
  where application_idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.anomaly_id is distinct from v_anomaly.id
      or v_existing.proof_type_mode <> 'specific'
      or v_existing.proof_type_id is distinct from v_type.id
      or v_existing.label_snapshot is distinct from btrim(p_label)
      or v_existing.minimum_count is distinct from p_minimum_count
      or v_existing.acceptance_criteria_snapshot is distinct from p_acceptance_criteria
      or v_existing.application_comment is distinct from btrim(p_comment)
      or v_existing.created_by_profile_id is distinct from v_actor
      or v_existing.application_base_version_no is distinct from p_base_version_no
      or v_existing.application_client_occurred_at is distinct from p_client_occurred_at then
      raise exception 'The idempotency key was already used with different proof requirement content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'requirement_id', v_existing.id,
      'requirement_state', v_existing.state,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;

  insert into public.anomaly_proof_requirements(
    id, anomaly_id, source_rule_id, source_rule_set_version,
    proof_type_mode, proof_type_id, label_snapshot, minimum_count,
    acceptance_criteria_snapshot, is_mandatory, origin, state,
    application_comment, created_by_profile_id,
    application_idempotency_key, application_base_version_no,
    application_client_occurred_at
  ) values (
    v_requirement_id, v_anomaly.id, null, null,
    'specific', v_type.id, btrim(p_label), p_minimum_count,
    p_acceptance_criteria, true, 'facility_manager', 'pending',
    btrim(p_comment), v_actor,
    p_idempotency_key, p_base_version_no, p_client_occurred_at
  );

  select display_name into v_actor_label from public.profiles where id = v_actor;
  select stage_id into v_stage_id
  from public.status_definitions where id = v_anomaly.current_status_id;
  select id into v_event_definition_id
  from public.business_event_definitions
  where code = 'PROOF_REQUIREMENT_REINFORCED' and is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key,
    client_occurred_at, server_received_at
  ) values (
    v_anomaly.id, 'proof_requirement_reinforced', v_event_definition_id, v_stage_id,
    v_actor, v_actor_label, btrim(p_comment),
    jsonb_build_object(
      'requirement_id', v_requirement_id,
      'proof_type_code', v_type.code,
      'label', btrim(p_label),
      'minimum_count', p_minimum_count,
      'acceptance_criteria', p_acceptance_criteria,
      'is_mandatory', true
    ),
    'anomaly_proof_requirements', v_requirement_id, p_idempotency_key,
    p_client_occurred_at, clock_timestamp()
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'requirement_id', v_requirement_id,
    'requirement_state', 'pending',
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

create or replace function public.review_anomaly_proof(
  p_reference text,
  p_proof_id uuid,
  p_decision text,
  p_comment text,
  p_idempotency_key uuid,
  p_base_version_no integer,
  p_client_occurred_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_anomaly public.anomalies%rowtype;
  v_proof public.proofs%rowtype;
  v_existing public.proofs%rowtype;
  v_new_version integer;
begin
  if v_actor is null or not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can review proof'
      using errcode = '42501';
  end if;
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Invalid proof decision' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(btrim(p_comment), '') is null then
    raise exception 'A rejection reason is required' using errcode = '23514';
  end if;
  if p_idempotency_key is null or p_base_version_no is null or p_base_version_no < 1 then
    raise exception 'An idempotency key and a valid dossier version are required'
      using errcode = '22023';
  end if;

  select a.* into v_anomaly
  from public.anomalies a
  where a.reference = p_reference
  for update of a;
  if v_anomaly.id is null or not public.can_access_anomaly(v_anomaly.id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;

  select * into v_existing
  from public.proofs
  where review_idempotency_key = p_idempotency_key;
  if v_existing.id is not null then
    if v_existing.id is distinct from p_proof_id
      or private.proof_anomaly_id(v_existing.id) is distinct from v_anomaly.id
      or v_existing.verification_status is distinct from p_decision
      or coalesce(v_existing.review_comment, '') is distinct from coalesce(nullif(btrim(p_comment), ''), '')
      or v_existing.reviewed_by_profile_id is distinct from v_actor
      or v_existing.review_base_version_no is distinct from p_base_version_no
      or v_existing.review_client_occurred_at is distinct from p_client_occurred_at then
      raise exception 'The idempotency key was already used with different proof review content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'proof_id', v_existing.id,
      'verification_status', v_existing.verification_status,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;

  select * into v_proof
  from public.proofs
  where id = p_proof_id
  for update;
  if v_proof.id is null
    or private.proof_anomaly_id(v_proof.id) is distinct from v_anomaly.id then
    raise exception 'Proof not found on this dossier' using errcode = 'P0002';
  end if;
  if v_proof.verification_status <> 'pending' then
    raise exception 'The proof already has a final review decision'
      using errcode = '23514';
  end if;

  update public.proofs
  set verification_status = p_decision,
      verified_by_profile_id = case when p_decision = 'accepted' then v_actor else null end,
      verified_at = case when p_decision = 'accepted' then clock_timestamp() else null end,
      rejection_reason = case when p_decision = 'rejected' then btrim(p_comment) else null end,
      reviewed_by_profile_id = v_actor,
      reviewed_at = clock_timestamp(),
      review_comment = nullif(btrim(p_comment), ''),
      review_idempotency_key = p_idempotency_key,
      review_base_version_no = p_base_version_no,
      review_client_occurred_at = p_client_occurred_at
  where id = v_proof.id;

  select version_no into v_new_version
  from public.anomalies where id = v_anomaly.id;
  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'proof_id', v_proof.id,
    'verification_status', p_decision,
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

create or replace function public.link_proof_to_requirement(
  p_reference text,
  p_requirement_id uuid,
  p_proof_id uuid,
  p_idempotency_key uuid,
  p_base_version_no integer
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_anomaly public.anomalies%rowtype;
  v_requirement public.anomaly_proof_requirements%rowtype;
  v_proof public.proofs%rowtype;
  v_existing public.proof_requirement_evidence%rowtype;
  v_new_version integer;
begin
  if v_actor is null or not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can link accepted proof'
      using errcode = '42501';
  end if;
  if p_idempotency_key is null or p_base_version_no is null or p_base_version_no < 1 then
    raise exception 'An idempotency key and a valid dossier version are required'
      using errcode = '22023';
  end if;

  select a.* into v_anomaly
  from public.anomalies a
  where a.reference = p_reference
  for update of a;
  if v_anomaly.id is null or not public.can_access_anomaly(v_anomaly.id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;
  select * into v_requirement
  from public.anomaly_proof_requirements
  where id = p_requirement_id
  for update;
  select * into v_proof from public.proofs where id = p_proof_id for update;

  select * into v_existing
  from public.proof_requirement_evidence
  where idempotency_key = p_idempotency_key;
  if v_existing.requirement_id is not null then
    if v_existing.requirement_id is distinct from p_requirement_id
      or v_existing.proof_id is distinct from p_proof_id
      or v_existing.linked_by_profile_id is distinct from v_actor then
      raise exception 'The idempotency key was already used with different evidence link content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'requirement_id', v_existing.requirement_id,
      'proof_id', v_existing.proof_id,
      'requirement_state', (select state from public.anomaly_proof_requirements where id = p_requirement_id),
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;
  if v_requirement.id is null or v_requirement.anomaly_id is distinct from v_anomaly.id then
    raise exception 'Proof requirement not found on this dossier' using errcode = 'P0002';
  end if;
  if v_proof.id is null or private.proof_anomaly_id(v_proof.id) is distinct from v_anomaly.id then
    raise exception 'Proof not found on this dossier' using errcode = 'P0002';
  end if;

  perform private.link_accepted_proof_requirement(
    p_requirement_id, p_proof_id, v_actor, p_idempotency_key
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;
  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'requirement_id', p_requirement_id,
    'proof_id', p_proof_id,
    'requirement_state', (select state from public.anomaly_proof_requirements where id = p_requirement_id),
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

create or replace function public.verify_latest_anomaly_proof(
  p_reference text,
  p_decision text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_anomaly public.anomalies%rowtype;
  v_proof_id uuid;
begin
  if not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can verify proof' using errcode = '42501';
  end if;
  select a.* into v_anomaly
  from public.anomalies a
  where a.reference = p_reference
  for update of a;
  if v_anomaly.id is null then
    raise exception 'Anomaly not found' using errcode = 'P0002';
  end if;
  select id into v_proof_id
  from public.proofs
  where private.proof_anomaly_id(id) = v_anomaly.id
    and verification_status = 'pending'
  order by created_at desc, id desc
  limit 1;
  if v_proof_id is null then
    raise exception 'No pending proof found' using errcode = 'P0002';
  end if;
  return public.review_anomaly_proof(
    p_reference,
    v_proof_id,
    p_decision,
    p_comment,
    gen_random_uuid(),
    v_anomaly.version_no,
    null
  );
end;
$$;

-- Backfill only the confirmed critical rule. No equipment-specific or category-
-- specific requirement is created while its exact proof type remains unvalidated.
do $$
declare
  v_anomaly record;
  v_proof record;
  v_requirement record;
begin
  for v_anomaly in
    select a.id, a.version_no
    from public.anomalies a
    join public.priority_definitions p on p.id = a.priority_id
    join public.status_definitions s on s.id = a.current_status_id
    where p.is_critical and not s.is_closed
    order by a.id
  loop
    perform private.apply_published_proof_rules(v_anomaly.id, v_anomaly.version_no);
  end loop;

  for v_proof in
    select p.id, private.proof_anomaly_id(p.id) as anomaly_id,
           coalesce(p.reviewed_by_profile_id, p.verified_by_profile_id) as actor_id
    from public.proofs p
    where p.verification_status = 'accepted'
      and coalesce(p.reviewed_by_profile_id, p.verified_by_profile_id) is not null
    order by p.id
  loop
    for v_requirement in
      select id
      from public.anomaly_proof_requirements
      where anomaly_id = v_proof.anomaly_id
        and state = 'pending'
        and proof_type_mode = 'any_accepted'
      order by created_at, id
    loop
      perform private.link_accepted_proof_requirement(
        v_requirement.id, v_proof.id, v_proof.actor_id, gen_random_uuid()
      );
    end loop;
  end loop;
end;
$$;

revoke execute on function private.proof_anomaly_id(uuid) from public, anon, authenticated, service_role;
revoke execute on function private.guard_proof_rule_set_row() from public, anon, authenticated, service_role;
revoke execute on function private.guard_proof_requirement_rule_row() from public, anon, authenticated, service_role;
revoke execute on function private.validate_proof_requirement_row() from public, anon, authenticated, service_role;
revoke execute on function private.validate_proof_requirement_evidence_row() from public, anon, authenticated, service_role;
revoke execute on function private.prepare_proof_review_row() from public, anon, authenticated, service_role;
revoke execute on function private.link_accepted_proof_requirement(uuid, uuid, uuid, uuid) from public, anon, authenticated, service_role;
revoke execute on function private.apply_published_proof_rules(uuid, integer) from public, anon, authenticated, service_role;
revoke execute on function private.apply_published_proof_rules_trigger() from public, anon, authenticated, service_role;
revoke execute on function private.record_proof_activity() from public, anon, authenticated, service_role;
revoke execute on function private.prevent_close_with_pending_proof_requirement() from public, anon, authenticated, service_role;

revoke execute on function public.add_anomaly_proof_requirement(text, text, text, integer, jsonb, text, uuid, integer, timestamptz) from public, anon;
revoke execute on function public.review_anomaly_proof(text, uuid, text, text, uuid, integer, timestamptz) from public, anon;
revoke execute on function public.link_proof_to_requirement(text, uuid, uuid, uuid, integer) from public, anon;
revoke execute on function public.verify_latest_anomaly_proof(text, text, text) from public, anon;
grant execute on function public.add_anomaly_proof_requirement(text, text, text, integer, jsonb, text, uuid, integer, timestamptz) to authenticated;
grant execute on function public.review_anomaly_proof(text, uuid, text, text, uuid, integer, timestamptz) to authenticated;
grant execute on function public.link_proof_to_requirement(text, uuid, uuid, uuid, integer) to authenticated;
grant execute on function public.verify_latest_anomaly_proof(text, text, text) to authenticated;

comment on function public.add_anomaly_proof_requirement(text, text, text, integer, jsonb, text, uuid, integer, timestamptz) is
  'Ajoute une exigence typée confirmée sans supprimer ni affaiblir les exigences existantes ; Facility Manager uniquement.';
comment on function public.review_anomaly_proof(text, uuid, text, text, uuid, integer, timestamptz) is
  'Décision idempotente du Facility Manager ; le dépôt, la validation et la satisfaction restent distincts.';
comment on function public.link_proof_to_requirement(text, uuid, uuid, uuid, integer) is
  'Lie explicitement une preuve acceptée à une exigence typée et satisfait seulement après le minimum requis.';

commit;
