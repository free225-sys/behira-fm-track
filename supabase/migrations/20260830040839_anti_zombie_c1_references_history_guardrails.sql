begin;

-- Lot C1 is intentionally additive. It introduces controlled vocabularies and
-- history provenance only; no operational action, deadline, block or proof
-- requirement is created by this migration.

create table if not exists public.next_action_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]+$'),
  label text not null,
  description text not null,
  requires_comment boolean not null default false,
  is_active boolean not null default false,
  validation_status text not null default 'to_confirm'
    check (validation_status in ('confirmed', 'to_confirm')),
  sort_order smallint not null default 100,
  source_document text not null,
  created_by_profile_id uuid references public.profiles(id),
  updated_by_profile_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (validation_status = 'confirmed' or not is_active)
);

create table if not exists public.next_action_code_stages (
  action_code_id uuid not null references public.next_action_codes(id) on delete restrict,
  workflow_stage_id uuid not null references public.workflow_stages(id) on delete restrict,
  is_default_for_stage boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (action_code_id, workflow_stage_id)
);

create unique index if not exists next_action_code_stages_one_default_idx
  on public.next_action_code_stages(workflow_stage_id)
  where is_default_for_stage;

create table if not exists public.block_reason_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]+$'),
  label text not null,
  requires_comment boolean not null default true,
  is_active boolean not null default false,
  validation_status text not null default 'to_confirm'
    check (validation_status in ('confirmed', 'to_confirm')),
  sort_order smallint not null default 100,
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (validation_status = 'confirmed' or not is_active)
);

create table if not exists public.delay_reason_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]+$'),
  label text not null,
  requires_comment boolean not null default true,
  is_active boolean not null default false,
  validation_status text not null default 'to_confirm'
    check (validation_status in ('confirmed', 'to_confirm')),
  sort_order smallint not null default 100,
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (validation_status = 'confirmed' or not is_active)
);

create table if not exists public.block_resolution_codes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]+$'),
  label text not null,
  requires_comment boolean not null default false,
  is_active boolean not null default false,
  validation_status text not null default 'to_confirm'
    check (validation_status in ('confirmed', 'to_confirm')),
  sort_order smallint not null default 100,
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (validation_status = 'confirmed' or not is_active)
);

create table if not exists public.business_event_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z0-9_]+$'),
  label text not null,
  is_activity boolean not null default true,
  is_sensitive boolean not null default false,
  is_active boolean not null default true,
  validation_status text not null default 'confirmed'
    check (validation_status in ('confirmed', 'to_confirm')),
  sort_order smallint not null default 100,
  source_document text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (validation_status = 'confirmed' or not is_active)
);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'next_action_codes', 'block_reason_codes', 'delay_reason_codes',
    'block_resolution_codes', 'business_event_definitions'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', v_table, v_table);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      v_table,
      v_table
    );
  end loop;
end;
$$;

insert into public.next_action_codes(
  code, label, description, requires_comment, is_active,
  validation_status, sort_order, source_document
) values
  ('QUALIFY_ASSIGN', 'Qualifier et affecter', 'Qualifier le dossier et attribuer un responsable interne.', false, false, 'to_confirm', 10, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('PERFORM_DIAGNOSIS', 'Réaliser et confirmer le diagnostic', 'Réaliser puis enregistrer le diagnostic dans la phase de qualification.', true, false, 'to_confirm', 20, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('CHOOSE_TREATMENT_BRANCH', 'Choisir la branche de traitement', 'Choisir la branche existante après confirmation du diagnostic.', true, false, 'to_confirm', 30, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('MONITOR_REASSESS', 'Surveiller et réévaluer', 'Effectuer le contrôle prévu puis réévaluer le dossier.', true, false, 'to_confirm', 40, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('OBTAIN_QUOTE', 'Obtenir et rattacher le devis', 'Obtenir puis rattacher un devis au dossier.', false, false, 'to_confirm', 50, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('SUBMIT_ADMIN_ARBITRATION', 'Soumettre l’arbitrage à l’Administration', 'Soumettre un arbitrage relevant de l’Administration.', true, false, 'to_confirm', 60, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('PLAN_INTERVENTION', 'Planifier l’intervention', 'Planifier une intervention dans la branche déjà décidée.', true, false, 'to_confirm', 70, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('EXECUTE_INTERVENTION', 'Réaliser l’intervention', 'Réaliser l’intervention attribuée et produire un compte rendu.', true, false, 'to_confirm', 80, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('FOLLOW_UP_BLOCKER', 'Relancer et traiter le blocage', 'Traiter le blocage actif sans créer une nouvelle étape.', true, false, 'to_confirm', 90, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('RECEIVE_INTERVENTION', 'Contrôler la réception', 'Contrôler la réception de l’intervention.', true, false, 'to_confirm', 100, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('LIFT_RESERVATIONS', 'Corriger et lever les réserves', 'Corriger puis faire contrôler les réserves ouvertes.', true, false, 'to_confirm', 110, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('SUBMIT_REQUIRED_PROOF', 'Déposer les preuves attendues', 'Déposer les preuves explicitement exigées pour le dossier.', false, false, 'to_confirm', 120, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('VALIDATE_PROOF', 'Contrôler les preuves', 'Accepter ou refuser les preuves déposées.', true, false, 'to_confirm', 130, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('CLOSE_DOSSIER', 'Clôturer techniquement le dossier', 'Clôturer le dossier après contrôle des verrous existants.', true, false, 'to_confirm', 140, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('REVIEW_REOPENED_DOSSIER', 'Réexaminer le dossier rouvert', 'Réexaminer un dossier rouvert avec son motif.', true, false, 'to_confirm', 150, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('OTHER', 'Autre action', 'Action exceptionnelle contrôlée ; le commentaire est obligatoire.', true, false, 'to_confirm', 999, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md')
on conflict (code) do update set
  label = excluded.label,
  description = excluded.description,
  requires_comment = excluded.requires_comment,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

insert into public.block_reason_codes(
  code, label, requires_comment, is_active, validation_status, sort_order, source_document
) values
  ('DIAGNOSIS_PENDING', 'Diagnostic technique attendu', true, true, 'confirmed', 10, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('QUOTE_PENDING', 'Devis attendu', true, true, 'confirmed', 20, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('ADMIN_DECISION_PENDING', 'Décision de l’Administration attendue', true, true, 'confirmed', 30, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('EXTERNAL_INTERVENTION_PENDING', 'Intervention externe attendue', true, true, 'confirmed', 40, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('PROOF_PENDING', 'Preuve attendue', true, true, 'confirmed', 50, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('RESERVATION_OPEN', 'Réserve non levée', true, true, 'confirmed', 60, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('INTERNAL_DEPENDENCY', 'Dépendance interne non réalisée', true, false, 'to_confirm', 70, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('SITE_ACCESS_CONSTRAINT', 'Accès au site ou à l’équipement impossible', true, false, 'to_confirm', 80, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('OTHER', 'Autre blocage', true, false, 'to_confirm', 999, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md')
on conflict (code) do update set
  label = excluded.label,
  requires_comment = excluded.requires_comment,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

insert into public.delay_reason_codes(
  code, label, requires_comment, is_active, validation_status, sort_order, source_document
) values
  ('QUALIFICATION_OVERDUE', 'Qualification non réalisée dans le délai', true, true, 'confirmed', 10, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('INTERVENTION_OVERDUE', 'Intervention non terminée dans le délai', true, true, 'confirmed', 20, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('QUOTE_OVERDUE', 'Devis non reçu dans le délai', true, true, 'confirmed', 30, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('PROOF_OVERDUE', 'Preuve non déposée dans le délai', true, true, 'confirmed', 40, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('RESERVATION_OVERDUE', 'Réserve non levée dans le délai', true, true, 'confirmed', 50, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('ROUND_OVERDUE', 'Ronde attendue non enregistrée', true, true, 'confirmed', 60, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('ARBITRATION_OVERDUE', 'Arbitrage non rendu dans le délai', true, false, 'to_confirm', 70, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('OTHER', 'Autre motif de retard', true, false, 'to_confirm', 999, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md')
on conflict (code) do update set
  label = excluded.label,
  requires_comment = excluded.requires_comment,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

insert into public.block_resolution_codes(
  code, label, requires_comment, is_active, validation_status, sort_order, source_document
) values
  ('DEPENDENCY_RECEIVED', 'Élément attendu reçu', false, true, 'confirmed', 10, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('DECISION_RECORDED', 'Décision enregistrée', false, true, 'confirmed', 20, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('INTERVENTION_COMPLETED', 'Intervention terminée', false, true, 'confirmed', 30, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('PROOF_ACCEPTED', 'Preuve acceptée', false, true, 'confirmed', 40, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('RESERVATION_LIFTED', 'Réserve levée', false, true, 'confirmed', 50, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('BLOCK_DECLARED_IN_ERROR', 'Blocage déclaré par erreur', true, false, 'to_confirm', 60, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md'),
  ('OTHER', 'Autre résolution', true, false, 'to_confirm', 999, 'BEHIRA_LOT_B2_FERMETURE_DECISIONS_ANTIZOMBIE_2026-08-28.md')
on conflict (code) do update set
  label = excluded.label,
  requires_comment = excluded.requires_comment,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

-- Only event kinds already produced by the existing trigger are activated in
-- C1. The wider event catalogue remains a documented decision for a later lot.
insert into public.business_event_definitions(
  code, label, is_activity, is_sensitive, is_active,
  validation_status, sort_order, source_document
) values
  ('ANOMALY_CREATED', 'Dossier créé', true, false, true, 'confirmed', 10, '20260824000400_business_rules.sql'),
  ('STATUS_CHANGED', 'Statut modifié', true, true, true, 'confirmed', 20, '20260824000400_business_rules.sql'),
  ('PRIORITY_CHANGED', 'Priorité modifiée', true, true, true, 'confirmed', 30, '20260824000400_business_rules.sql'),
  ('ASSIGNMENT_CHANGED', 'Responsable modifié', true, true, true, 'confirmed', 40, '20260824000400_business_rules.sql'),
  ('RECOVERY_CHANGED', 'État de rétablissement modifié', true, true, true, 'confirmed', 50, '20260824000400_business_rules.sql'),
  ('ANOMALY_UPDATED', 'Dossier mis à jour sans activité qualifiée', false, false, true, 'confirmed', 999, '20260824000400_business_rules.sql')
on conflict (code) do update set
  label = excluded.label,
  is_activity = excluded.is_activity,
  is_sensitive = excluded.is_sensitive,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

alter table public.anomaly_history
  add column if not exists event_definition_id uuid references public.business_event_definitions(id) on delete restrict,
  add column if not exists workflow_stage_id uuid references public.workflow_stages(id) on delete restrict,
  add column if not exists source_table text,
  add column if not exists source_record_id uuid,
  add column if not exists actor_label_snapshot text,
  add column if not exists client_occurred_at timestamptz,
  add column if not exists server_received_at timestamptz not null default clock_timestamp(),
  add column if not exists idempotency_key uuid;

create unique index if not exists anomaly_history_idempotency_idx
  on public.anomaly_history(idempotency_key)
  where idempotency_key is not null;
create index if not exists anomaly_history_activity_idx
  on public.anomaly_history(anomaly_id, occurred_at desc, server_received_at desc, id desc);
create index if not exists anomaly_history_event_definition_idx
  on public.anomaly_history(event_definition_id, anomaly_id);
create index if not exists anomaly_history_stage_idx
  on public.anomaly_history(workflow_stage_id, anomaly_id);

update public.anomaly_history h
set event_definition_id = d.id
from public.business_event_definitions d
where h.event_definition_id is null
  and d.code = case h.event_type
    when 'created' then 'ANOMALY_CREATED'
    when 'status_changed' then 'STATUS_CHANGED'
    when 'priority_changed' then 'PRIORITY_CHANGED'
    when 'assignment_changed' then 'ASSIGNMENT_CHANGED'
    when 'recovery_changed' then 'RECOVERY_CHANGED'
    else 'ANOMALY_UPDATED'
  end;

update public.anomaly_history h
set workflow_stage_id = s.stage_id
from public.status_definitions s
where h.workflow_stage_id is null
  and s.id = h.to_status_id;

update public.anomaly_history h
set actor_label_snapshot = p.display_name
from public.profiles p
where h.actor_label_snapshot is null
  and p.id = h.actor_profile_id;

update public.anomaly_history
set source_table = coalesce(source_table, 'anomalies'),
    source_record_id = coalesce(source_record_id, anomaly_id),
    server_received_at = coalesce(server_received_at, occurred_at);

create or replace function public.record_anomaly_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text := 'updated';
  v_event_code text := 'ANOMALY_UPDATED';
  v_event_definition_id uuid;
  v_actor_profile_id uuid;
  v_actor_label text;
  v_workflow_stage_id uuid;
begin
  if tg_op = 'INSERT' then
    v_event_type := 'created';
    v_event_code := 'ANOMALY_CREATED';
  elsif new.current_status_id is distinct from old.current_status_id then
    v_event_type := 'status_changed';
    v_event_code := 'STATUS_CHANGED';
  elsif new.priority_id is distinct from old.priority_id then
    v_event_type := 'priority_changed';
    v_event_code := 'PRIORITY_CHANGED';
  elsif new.assigned_profile_id is distinct from old.assigned_profile_id
     or new.assigned_vendor_id is distinct from old.assigned_vendor_id then
    v_event_type := 'assignment_changed';
    v_event_code := 'ASSIGNMENT_CHANGED';
  elsif new.recovery_state is distinct from old.recovery_state then
    v_event_type := 'recovery_changed';
    v_event_code := 'RECOVERY_CHANGED';
  end if;

  select id into v_event_definition_id
  from public.business_event_definitions
  where code = v_event_code and is_active;

  select stage_id into v_workflow_stage_id
  from public.status_definitions
  where id = new.current_status_id;

  v_actor_profile_id := public.current_profile_id();
  select display_name into v_actor_label
  from public.profiles
  where id = v_actor_profile_id;

  insert into public.anomaly_history(
    anomaly_id,
    event_type,
    event_definition_id,
    workflow_stage_id,
    from_status_id,
    to_status_id,
    actor_profile_id,
    actor_label_snapshot,
    source_table,
    source_record_id,
    change_set,
    server_received_at
  ) values (
    new.id,
    v_event_type,
    v_event_definition_id,
    v_workflow_stage_id,
    case when tg_op = 'UPDATE' then old.current_status_id end,
    new.current_status_id,
    v_actor_profile_id,
    v_actor_label,
    'anomalies',
    new.id,
    case
      when tg_op = 'INSERT' then jsonb_build_object('created', to_jsonb(new))
      else jsonb_strip_nulls(jsonb_build_object(
        'priority_from', old.priority_id,
        'priority_to', new.priority_id,
        'assigned_profile_from', old.assigned_profile_id,
        'assigned_profile_to', new.assigned_profile_id,
        'assigned_vendor_from', old.assigned_vendor_id,
        'assigned_vendor_to', new.assigned_vendor_id,
        'recovery_from', old.recovery_state,
        'recovery_to', new.recovery_state
      ))
    end,
    clock_timestamp()
  );
  return new;
end;
$$;

-- Catalogues are read-only through the Data API in C1. Inactive candidates are
-- visible only to the Administration and Facility Manager for future review.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'next_action_codes', 'next_action_code_stages', 'block_reason_codes',
    'delay_reason_codes', 'block_resolution_codes', 'business_event_definitions'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on table public.%I from public, anon, authenticated', v_table);
    execute format('grant select on table public.%I to authenticated', v_table);
    execute format('grant select, insert, update, delete on table public.%I to service_role', v_table);
  end loop;
end;
$$;

drop policy if exists next_action_codes_read on public.next_action_codes;
create policy next_action_codes_read on public.next_action_codes
for select to authenticated
using (
  public.current_profile_id() is not null
  and (is_active or public.has_any_role(array['direction', 'facility_manager']))
);

drop policy if exists next_action_code_stages_read on public.next_action_code_stages;
create policy next_action_code_stages_read on public.next_action_code_stages
for select to authenticated
using (
  public.current_profile_id() is not null
  and exists (
    select 1
    from public.next_action_codes c
    where c.id = action_code_id
      and (c.is_active or public.has_any_role(array['direction', 'facility_manager']))
  )
);

drop policy if exists block_reason_codes_read on public.block_reason_codes;
create policy block_reason_codes_read on public.block_reason_codes
for select to authenticated
using (
  public.current_profile_id() is not null
  and (is_active or public.has_any_role(array['direction', 'facility_manager']))
);

drop policy if exists delay_reason_codes_read on public.delay_reason_codes;
create policy delay_reason_codes_read on public.delay_reason_codes
for select to authenticated
using (
  public.current_profile_id() is not null
  and (is_active or public.has_any_role(array['direction', 'facility_manager']))
);

drop policy if exists block_resolution_codes_read on public.block_resolution_codes;
create policy block_resolution_codes_read on public.block_resolution_codes
for select to authenticated
using (
  public.current_profile_id() is not null
  and (is_active or public.has_any_role(array['direction', 'facility_manager']))
);

drop policy if exists business_event_definitions_read on public.business_event_definitions;
create policy business_event_definitions_read on public.business_event_definitions
for select to authenticated
using (
  public.current_profile_id() is not null
  and (is_active or public.has_any_role(array['direction', 'facility_manager']))
);

-- The browser cannot insert, update or delete business history. Existing
-- trigger-based writes remain server-side and service cleanup can still cascade
-- fixture dossiers during automated tests.
revoke insert, update, delete on public.anomaly_history from public, anon, authenticated;

revoke all on function public.record_anomaly_history() from public, anon, authenticated;

commit;
