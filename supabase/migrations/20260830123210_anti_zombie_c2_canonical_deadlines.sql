begin;

-- C2 uses only the two SLA snapshots already present on anomalies. It does not
-- introduce a duration for quotes, proofs or Administration arbitration.

insert into public.business_event_definitions(
  code, label, is_activity, is_sensitive, is_active,
  validation_status, sort_order, source_document
) values
  ('DEADLINE_CREATED', 'Échéance créée', true, true, true, 'confirmed', 60, 'Validation utilisateur du 30 août 2026 — C2 échéance canonique'),
  ('DEADLINE_REPLACED', 'Échéance remplacée', true, true, true, 'confirmed', 70, 'Validation utilisateur du 30 août 2026 — C2 échéance canonique'),
  ('DEADLINE_CLEARED', 'Échéance terminée', true, true, true, 'confirmed', 80, 'Validation utilisateur du 30 août 2026 — C2 échéance canonique')
on conflict (code) do update set
  label = excluded.label,
  is_activity = excluded.is_activity,
  is_sensitive = excluded.is_sensitive,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

create table if not exists public.anomaly_deadlines (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  workflow_stage_id uuid not null references public.workflow_stages(id) on delete restrict,
  sla_rule_id uuid references public.sla_rules(id) on delete restrict,
  due_at timestamptz not null,
  origin text not null check (origin in ('automatic', 'manual')),
  justification text not null check (length(btrim(justification)) > 0),
  source_kind text not null
    check (source_kind in ('sla_snapshot', 'stage_transition', 'legacy_backfill', 'manual_override')),
  previous_deadline_id uuid references public.anomaly_deadlines(id) on delete restrict,
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  superseded_at timestamptz,
  superseded_by_profile_id uuid references public.profiles(id) on delete restrict,
  superseded_by_deadline_id uuid references public.anomaly_deadlines(id) on delete restrict,
  idempotency_key uuid not null unique,
  base_version_no integer not null check (base_version_no > 0),
  check (
    (superseded_at is null and superseded_by_profile_id is null and superseded_by_deadline_id is null)
    or superseded_at is not null
  ),
  check (previous_deadline_id is distinct from id),
  check (superseded_by_deadline_id is distinct from id),
  check (
    (origin = 'manual' and source_kind = 'manual_override')
    or (origin = 'automatic' and source_kind <> 'manual_override')
  )
);

create unique index if not exists anomaly_deadlines_one_active_idx
  on public.anomaly_deadlines(anomaly_id)
  where superseded_at is null;
create index if not exists anomaly_deadlines_anomaly_timeline_idx
  on public.anomaly_deadlines(anomaly_id, created_at desc, id desc);
create index if not exists anomaly_deadlines_stage_active_idx
  on public.anomaly_deadlines(workflow_stage_id, due_at)
  where superseded_at is null;
create index if not exists anomaly_deadlines_sla_rule_idx
  on public.anomaly_deadlines(sla_rule_id)
  where sla_rule_id is not null;
create index if not exists anomaly_deadlines_previous_idx
  on public.anomaly_deadlines(previous_deadline_id)
  where previous_deadline_id is not null;
create index if not exists anomaly_deadlines_created_by_idx
  on public.anomaly_deadlines(created_by_profile_id)
  where created_by_profile_id is not null;
create index if not exists anomaly_deadlines_superseded_by_profile_idx
  on public.anomaly_deadlines(superseded_by_profile_id)
  where superseded_by_profile_id is not null;
create index if not exists anomaly_deadlines_superseded_by_deadline_idx
  on public.anomaly_deadlines(superseded_by_deadline_id)
  where superseded_by_deadline_id is not null;

alter table public.anomaly_deadlines enable row level security;
revoke all on table public.anomaly_deadlines from public, anon, authenticated;
grant select on table public.anomaly_deadlines to authenticated;
grant select, insert, update, delete on table public.anomaly_deadlines to service_role;

drop policy if exists anomaly_deadlines_read on public.anomaly_deadlines;
create policy anomaly_deadlines_read on public.anomaly_deadlines
for select to authenticated
using (
  (select public.current_profile_id()) is not null
  and public.can_access_anomaly(anomaly_id)
);

create or replace function public.prevent_legacy_deadline_update()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.qualification_due_at is distinct from old.qualification_due_at
     or new.intervention_due_at is distinct from old.intervention_due_at then
    raise exception 'Legacy deadline columns are read-only; use the canonical deadline command'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_legacy_deadline_update on public.anomalies;
create trigger prevent_legacy_deadline_update
before update of qualification_due_at, intervention_due_at on public.anomalies
for each row execute function public.prevent_legacy_deadline_update();

create or replace function public.sync_anomaly_deadline()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_stage_id uuid;
  v_stage_code text;
  v_is_closed boolean;
  v_due_at timestamptz;
  v_source_kind text;
  v_justification text;
  v_sla_rule_id uuid;
  v_actor_profile_id uuid;
  v_actor_label text;
  v_previous public.anomaly_deadlines%rowtype;
  v_new_deadline_id uuid;
  v_deadline_key uuid := gen_random_uuid();
  v_event_code text;
  v_event_type text;
  v_event_definition_id uuid;
begin
  select s.stage_id, ws.code, s.is_closed
  into v_stage_id, v_stage_code, v_is_closed
  from public.status_definitions s
  join public.workflow_stages ws on ws.id = s.stage_id
  where s.id = new.current_status_id;

  if v_stage_code in ('CONSTAT', 'QUALIFICATION') then
    v_due_at := new.qualification_due_at;
  elsif v_stage_code in ('DECISION', 'INTERVENTION', 'PREUVE') then
    v_due_at := new.intervention_due_at;
  else
    v_due_at := null;
  end if;

  select * into v_previous
  from public.anomaly_deadlines
  where anomaly_id = new.id
    and superseded_at is null
  for update;

  v_actor_profile_id := public.current_profile_id();
  select display_name into v_actor_label
  from public.profiles
  where id = v_actor_profile_id;
  v_actor_label := coalesce(v_actor_label, 'Système BEHIRA');

  if v_is_closed or v_due_at is null then
    if v_previous.id is null then
      return new;
    end if;

    update public.anomaly_deadlines
    set superseded_at = clock_timestamp(),
        superseded_by_profile_id = v_actor_profile_id
    where id = v_previous.id;

    select id into v_event_definition_id
    from public.business_event_definitions
    where code = 'DEADLINE_CLEARED' and is_active;

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key, server_received_at
    ) values (
      new.id,
      'deadline_cleared',
      v_event_definition_id,
      v_stage_id,
      v_actor_profile_id,
      v_actor_label,
      'Fin de l’échéance active à la clôture du dossier',
      jsonb_build_object(
        'old_due_at', v_previous.due_at,
        'new_due_at', null,
        'old_stage_id', v_previous.workflow_stage_id,
        'new_stage_id', v_stage_id,
        'origin', 'automatic',
        'justification', 'Clôture du dossier'
      ),
      'anomaly_deadlines',
      v_previous.id,
      v_deadline_key,
      clock_timestamp()
    );

    return new;
  end if;

  if v_previous.id is not null
     and v_previous.workflow_stage_id = v_stage_id
     and v_previous.due_at = v_due_at then
    return new;
  end if;

  select sr.id into v_sla_rule_id
  from public.sla_rules sr
  where sr.is_active
    and sr.priority_id = new.priority_id
    and (sr.category_id is null or sr.category_id = new.category_id)
    and (sr.equipment_id is null or sr.equipment_id = new.equipment_id)
    and sr.effective_from <= new.detected_at::date
    and (sr.effective_to is null or sr.effective_to >= new.detected_at::date)
  order by
    (sr.equipment_id is not null) desc,
    (sr.category_id is not null) desc,
    sr.effective_from desc
  limit 1;

  if v_previous.id is null then
    v_source_kind := 'sla_snapshot';
    v_justification := 'Échéance initiale issue du SLA existant';
    v_event_code := 'DEADLINE_CREATED';
    v_event_type := 'deadline_created';
  else
    update public.anomaly_deadlines
    set superseded_at = clock_timestamp(),
        superseded_by_profile_id = v_actor_profile_id
    where id = v_previous.id;

    v_source_kind := 'stage_transition';
    v_justification := 'Changement d’étape — reprise de l’échéance existante';
    v_event_code := 'DEADLINE_REPLACED';
    v_event_type := 'deadline_replaced';
  end if;

  insert into public.anomaly_deadlines(
    anomaly_id, workflow_stage_id, sla_rule_id, due_at, origin,
    justification, source_kind, previous_deadline_id,
    created_by_profile_id, idempotency_key, base_version_no
  ) values (
    new.id, v_stage_id, v_sla_rule_id, v_due_at, 'automatic',
    v_justification, v_source_kind, v_previous.id,
    v_actor_profile_id, v_deadline_key, new.version_no
  ) returning id into v_new_deadline_id;

  if v_previous.id is not null then
    update public.anomaly_deadlines
    set superseded_by_deadline_id = v_new_deadline_id
    where id = v_previous.id;
  end if;

  select id into v_event_definition_id
  from public.business_event_definitions
  where code = v_event_code and is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key, server_received_at
  ) values (
    new.id,
    v_event_type,
    v_event_definition_id,
    v_stage_id,
    v_actor_profile_id,
    v_actor_label,
    v_justification,
    jsonb_build_object(
      'old_due_at', v_previous.due_at,
      'new_due_at', v_due_at,
      'old_stage_id', v_previous.workflow_stage_id,
      'new_stage_id', v_stage_id,
      'origin', 'automatic',
      'justification', v_justification,
      'previous_deadline_id', v_previous.id,
      'new_deadline_id', v_new_deadline_id
    ),
    'anomaly_deadlines',
    v_new_deadline_id,
    v_deadline_key,
    clock_timestamp()
  );

  return new;
end;
$$;

drop trigger if exists sync_anomaly_deadline on public.anomalies;
drop trigger if exists sync_anomaly_deadline_on_insert on public.anomalies;
drop trigger if exists sync_anomaly_deadline_on_update on public.anomalies;
create trigger sync_anomaly_deadline_on_insert
after insert on public.anomalies
for each row execute function public.sync_anomaly_deadline();
create trigger sync_anomaly_deadline_on_update
after update of current_status_id, qualification_due_at, intervention_due_at on public.anomalies
for each row execute function public.sync_anomaly_deadline();

-- Safe backfill for a project that already contains dossiers. Only the exact
-- deadline snapshots already stored on anomalies are reused.
do $$
declare
  v_anomaly record;
  v_due_at timestamptz;
  v_sla_rule_id uuid;
  v_deadline_id uuid;
  v_event_definition_id uuid;
  v_idempotency_key uuid;
begin
  for v_anomaly in
    select
      a.id,
      a.priority_id,
      a.category_id,
      a.equipment_id,
      a.detected_at,
      a.qualification_due_at,
      a.intervention_due_at,
      a.version_no,
      s.stage_id,
      ws.code as stage_code
    from public.anomalies a
    join public.status_definitions s on s.id = a.current_status_id
    join public.workflow_stages ws on ws.id = s.stage_id
    where not s.is_closed
      and not exists (
        select 1
        from public.anomaly_deadlines d
        where d.anomaly_id = a.id and d.superseded_at is null
      )
    order by a.created_at, a.id
  loop
    v_due_at := case
      when v_anomaly.stage_code in ('CONSTAT', 'QUALIFICATION')
        then v_anomaly.qualification_due_at
      when v_anomaly.stage_code in ('DECISION', 'INTERVENTION', 'PREUVE')
        then v_anomaly.intervention_due_at
      else null
    end;

    if v_due_at is null then
      continue;
    end if;

    select sr.id into v_sla_rule_id
    from public.sla_rules sr
    where sr.is_active
      and sr.priority_id = v_anomaly.priority_id
      and (sr.category_id is null or sr.category_id = v_anomaly.category_id)
      and (sr.equipment_id is null or sr.equipment_id = v_anomaly.equipment_id)
      and sr.effective_from <= v_anomaly.detected_at::date
      and (sr.effective_to is null or sr.effective_to >= v_anomaly.detected_at::date)
    order by
      (sr.equipment_id is not null) desc,
      (sr.category_id is not null) desc,
      sr.effective_from desc
    limit 1;

    v_idempotency_key := gen_random_uuid();

    insert into public.anomaly_deadlines(
      anomaly_id, workflow_stage_id, sla_rule_id, due_at, origin,
      justification, source_kind, created_by_profile_id,
      idempotency_key, base_version_no
    ) values (
      v_anomaly.id,
      v_anomaly.stage_id,
      v_sla_rule_id,
      v_due_at,
      'automatic',
      'Reprise de l’échéance existante sans recalcul',
      'legacy_backfill',
      null,
      v_idempotency_key,
      v_anomaly.version_no
    ) returning id into v_deadline_id;

    select id into v_event_definition_id
    from public.business_event_definitions
    where code = 'DEADLINE_CREATED' and is_active;

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key, server_received_at
    ) values (
      v_anomaly.id,
      'deadline_created',
      v_event_definition_id,
      v_anomaly.stage_id,
      null,
      'Système BEHIRA',
      'Reprise de l’échéance existante sans recalcul',
      jsonb_build_object(
        'old_due_at', null,
        'new_due_at', v_due_at,
        'old_stage_id', null,
        'new_stage_id', v_anomaly.stage_id,
        'origin', 'automatic',
        'justification', 'Reprise de l’échéance existante sans recalcul'
      ),
      'anomaly_deadlines',
      v_deadline_id,
      v_idempotency_key,
      clock_timestamp()
    );
  end loop;
end;
$$;

-- The trigger function is not a public RPC endpoint.
revoke all on function public.prevent_legacy_deadline_update() from public, anon, authenticated;
revoke all on function public.sync_anomaly_deadline() from public, anon, authenticated;

commit;
