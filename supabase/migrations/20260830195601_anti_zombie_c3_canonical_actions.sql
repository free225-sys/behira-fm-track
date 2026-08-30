begin;

-- The validated Qualification sequence is the only operational action
-- catalogue enabled at this stage. Comments stay optional for controlled
-- codes; OTHER remains inactive and always requires a comment.
update public.next_action_codes
set requires_comment = false,
    source_document = 'Validation utilisateur — Lot A et C3, 30 août 2026'
where code in ('QUALIFY_ASSIGN', 'PERFORM_DIAGNOSIS', 'CHOOSE_TREATMENT_BRANCH');

update public.next_action_codes
set requires_comment = true
where code = 'OTHER';

insert into public.business_event_definitions(
  code, label, is_activity, is_sensitive, is_active,
  validation_status, sort_order, source_document
) values
  ('ACTION_CREATED', 'Prochaine action créée', true, true, true, 'confirmed', 90, 'Validation utilisateur du 30 août 2026 — C3 prochaine action canonique'),
  ('ACTION_COMPLETED', 'Prochaine action terminée', true, true, true, 'confirmed', 100, 'Validation utilisateur du 30 août 2026 — C3 prochaine action canonique'),
  ('ACTION_REPLACED', 'Prochaine action remplacée', true, true, true, 'confirmed', 110, 'Validation utilisateur du 30 août 2026 — C3 prochaine action canonique'),
  ('ACTION_CANCELLED', 'Prochaine action annulée', true, true, true, 'confirmed', 120, 'Validation utilisateur du 30 août 2026 — C3 prochaine action canonique')
on conflict (code) do update set
  label = excluded.label,
  is_activity = excluded.is_activity,
  is_sensitive = excluded.is_sensitive,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

create table if not exists public.anomaly_actions (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  action_code_id uuid not null references public.next_action_codes(id) on delete restrict,
  assigned_profile_id uuid references public.profiles(id) on delete restrict,
  comment text,
  state text not null default 'pending'
    check (state in ('pending', 'completed', 'cancelled', 'superseded')),
  source_kind text not null
    check (source_kind in ('qualification', 'legacy_backfill')),
  source_record_id uuid,
  previous_action_id uuid references public.anomaly_actions(id) on delete restrict,
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  created_at timestamptz not null default clock_timestamp(),
  completed_by_profile_id uuid references public.profiles(id) on delete restrict,
  completed_at timestamptz,
  superseded_by_action_id uuid,
  superseded_by_profile_id uuid references public.profiles(id) on delete restrict,
  superseded_at timestamptz,
  cancelled_by_profile_id uuid references public.profiles(id) on delete restrict,
  cancelled_by_system boolean not null default false,
  cancelled_at timestamptz,
  cancellation_reason text,
  idempotency_key uuid not null unique,
  base_version_no integer not null check (base_version_no > 0),
  client_occurred_at timestamptz,
  server_received_at timestamptz not null default clock_timestamp(),
  constraint anomaly_actions_superseded_by_action_fkey
    foreign key (superseded_by_action_id)
    references public.anomaly_actions(id)
    on delete restrict
    deferrable initially deferred,
  check (previous_action_id is distinct from id),
  check (superseded_by_action_id is distinct from id),
  check (
    (state = 'pending'
      and completed_by_profile_id is null and completed_at is null
      and superseded_by_action_id is null and superseded_by_profile_id is null and superseded_at is null
      and cancelled_by_profile_id is null and not cancelled_by_system
      and cancelled_at is null and cancellation_reason is null)
    or
    (state = 'completed'
      and completed_by_profile_id is not null and completed_at is not null
      and superseded_by_action_id is null and superseded_by_profile_id is null and superseded_at is null
      and cancelled_by_profile_id is null and not cancelled_by_system
      and cancelled_at is null and cancellation_reason is null)
    or
    (state = 'superseded'
      and completed_by_profile_id is null and completed_at is null
      and superseded_by_action_id is not null and superseded_by_profile_id is not null and superseded_at is not null
      and cancelled_by_profile_id is null and not cancelled_by_system
      and cancelled_at is null and cancellation_reason is null)
    or
    (state = 'cancelled'
      and completed_by_profile_id is null and completed_at is null
      and superseded_by_action_id is null and superseded_by_profile_id is null and superseded_at is null
      and ((cancelled_by_profile_id is not null and not cancelled_by_system)
        or (cancelled_by_profile_id is null and cancelled_by_system))
      and cancelled_at is not null
      and length(btrim(cancellation_reason)) > 0)
  )
);

create unique index if not exists anomaly_actions_one_pending_idx
  on public.anomaly_actions(anomaly_id)
  where state = 'pending';
create index if not exists anomaly_actions_timeline_idx
  on public.anomaly_actions(anomaly_id, created_at desc, id desc);
create index if not exists anomaly_actions_code_state_idx
  on public.anomaly_actions(action_code_id, state);
create index if not exists anomaly_actions_assignee_pending_idx
  on public.anomaly_actions(assigned_profile_id, created_at)
  where state = 'pending' and assigned_profile_id is not null;
create index if not exists anomaly_actions_previous_idx
  on public.anomaly_actions(previous_action_id)
  where previous_action_id is not null;
create index if not exists anomaly_actions_created_by_idx
  on public.anomaly_actions(created_by_profile_id)
  where created_by_profile_id is not null;
create index if not exists anomaly_actions_completed_by_idx
  on public.anomaly_actions(completed_by_profile_id)
  where completed_by_profile_id is not null;
create index if not exists anomaly_actions_superseded_by_action_idx
  on public.anomaly_actions(superseded_by_action_id)
  where superseded_by_action_id is not null;
create index if not exists anomaly_actions_superseded_by_profile_idx
  on public.anomaly_actions(superseded_by_profile_id)
  where superseded_by_profile_id is not null;
create index if not exists anomaly_actions_cancelled_by_idx
  on public.anomaly_actions(cancelled_by_profile_id)
  where cancelled_by_profile_id is not null;

alter table public.anomaly_actions enable row level security;
revoke all on table public.anomaly_actions from public, anon, authenticated;
grant select on table public.anomaly_actions to authenticated;
grant select, insert, update, delete on table public.anomaly_actions to service_role;

drop policy if exists anomaly_actions_read on public.anomaly_actions;
create policy anomaly_actions_read on public.anomaly_actions
for select to authenticated
using (
  (select public.current_profile_id()) is not null
  and public.can_access_anomaly(anomaly_id)
);

create or replace function public.validate_anomaly_action_row()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_code text;
  v_requires_comment boolean;
  v_is_active boolean;
  v_validation_status text;
  v_stage_id uuid;
  v_equipment_id uuid;
  v_zone_id uuid;
  v_responsible_profile_id uuid;
begin
  if tg_op = 'UPDATE' then
    if old.state <> 'pending' then
      raise exception 'A terminal action is immutable' using errcode = '23514';
    end if;
    if new.state = 'pending' then
      raise exception 'A pending action must be replaced, never edited in place' using errcode = '23514';
    end if;
    if new.anomaly_id is distinct from old.anomaly_id
      or new.action_code_id is distinct from old.action_code_id
      or new.assigned_profile_id is distinct from old.assigned_profile_id
      or new.comment is distinct from old.comment
      or new.source_kind is distinct from old.source_kind
      or new.source_record_id is distinct from old.source_record_id
      or new.previous_action_id is distinct from old.previous_action_id
      or new.created_by_profile_id is distinct from old.created_by_profile_id
      or new.created_at is distinct from old.created_at
      or new.idempotency_key is distinct from old.idempotency_key
      or new.base_version_no is distinct from old.base_version_no
      or new.client_occurred_at is distinct from old.client_occurred_at
      or new.server_received_at is distinct from old.server_received_at then
      raise exception 'Canonical action fields are immutable' using errcode = '23514';
    end if;
    return new;
  end if;

  if new.state <> 'pending' then
    raise exception 'A canonical action must be created in the pending state'
      using errcode = '23514';
  end if;

  select c.code, c.requires_comment, c.is_active, c.validation_status
  into v_code, v_requires_comment, v_is_active, v_validation_status
  from public.next_action_codes c
  where c.id = new.action_code_id;

  if v_code is null or not v_is_active or v_validation_status <> 'confirmed' then
    raise exception 'The next-action code is not active and confirmed' using errcode = '23514';
  end if;

  if (v_requires_comment or v_code = 'OTHER')
    and nullif(btrim(new.comment), '') is null then
    raise exception 'A comment is required for this next-action code' using errcode = '23514';
  end if;

  select s.stage_id, a.equipment_id, a.zone_id, a.assigned_profile_id
  into v_stage_id, v_equipment_id, v_zone_id, v_responsible_profile_id
  from public.anomalies a
  join public.status_definitions s on s.id = a.current_status_id
  where a.id = new.anomaly_id;

  if v_stage_id is null or not exists (
    select 1
    from public.next_action_code_stages cs
    where cs.action_code_id = new.action_code_id
      and cs.workflow_stage_id = v_stage_id
  ) then
    raise exception 'The next-action code is incompatible with the current workflow stage'
      using errcode = '23514';
  end if;

  if new.assigned_profile_id is null then
    if v_code <> 'QUALIFY_ASSIGN' then
      raise exception 'This next action requires an assigned internal profile'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = new.assigned_profile_id
      and p.account_status = 'active'
      and p.vendor_id is null
  ) then
    raise exception 'The next-action assignee must be an active internal profile'
      using errcode = '23514';
  end if;

  if v_code in ('QUALIFY_ASSIGN', 'CHOOSE_TREATMENT_BRANCH') then
    if not exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.profile_id = new.assigned_profile_id
        and r.code = 'facility_manager'
        and r.is_active
        and ur.valid_from <= now()
        and (ur.valid_until is null or ur.valid_until > now())
    ) then
      raise exception 'This Qualification action must be assigned to a Facility Manager'
        using errcode = '23514';
    end if;
  elsif v_code = 'PERFORM_DIAGNOSIS' then
    if new.assigned_profile_id is distinct from v_responsible_profile_id
      or not exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.profile_id = new.assigned_profile_id
          and r.code = 'field_agent'
          and r.is_active
          and ur.valid_from <= now()
          and (ur.valid_until is null or ur.valid_until > now())
          and (
            (v_equipment_id is not null and ur.equipment_id = v_equipment_id)
            or (v_zone_id is not null and ur.zone_id = v_zone_id)
          )
      ) then
      raise exception 'The diagnosis action must be assigned to the responsible agent in scope'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_anomaly_action_row on public.anomaly_actions;
create trigger validate_anomaly_action_row
before insert or update on public.anomaly_actions
for each row execute function public.validate_anomaly_action_row();

create or replace function public.sync_qualification_action_boundary()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_old_stage_code text;
  v_new_stage_code text;
  v_action_id uuid;
  v_action_code_id uuid;
  v_action_code text;
  v_event_definition_id uuid;
  v_actor_profile_id uuid;
  v_actor_label text;
  v_key uuid;
begin
  if tg_op = 'UPDATE' then
    select ws.code into v_old_stage_code
    from public.status_definitions s
    join public.workflow_stages ws on ws.id = s.stage_id
    where s.id = old.current_status_id;
  end if;

  select ws.code into v_new_stage_code
  from public.status_definitions s
  join public.workflow_stages ws on ws.id = s.stage_id
  where s.id = new.current_status_id;

  v_actor_profile_id := public.current_profile_id();
  select p.display_name into v_actor_label
  from public.profiles p
  where p.id = v_actor_profile_id;
  v_actor_label := coalesce(v_actor_label, 'Système BEHIRA');

  if v_new_stage_code = 'QUALIFICATION'
    and coalesce(v_old_stage_code, '') <> 'QUALIFICATION'
    and not exists (
      select 1 from public.anomaly_actions aa
      where aa.anomaly_id = new.id and aa.state = 'pending'
    ) then
    select id into v_action_code_id
    from public.next_action_codes
    where code = 'QUALIFY_ASSIGN' and is_active and validation_status = 'confirmed';

    if v_action_code_id is null then
      raise exception 'The validated Qualification action is unavailable'
        using errcode = '23514';
    end if;

    v_action_id := gen_random_uuid();
    v_key := gen_random_uuid();

    insert into public.anomaly_actions(
      id, anomaly_id, action_code_id, assigned_profile_id, comment,
      state, source_kind, source_record_id, created_by_profile_id,
      idempotency_key, base_version_no
    ) values (
      v_action_id, new.id, v_action_code_id,
      case when public.has_role('facility_manager') then v_actor_profile_id else null end,
      null, 'pending', 'qualification', new.id,
      case when public.has_role('facility_manager') then v_actor_profile_id else null end,
      v_key, new.version_no
    );

    select id into v_event_definition_id
    from public.business_event_definitions
    where code = 'ACTION_CREATED' and is_active;

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key, server_received_at
    ) values (
      new.id, 'action_created', v_event_definition_id,
      (select id from public.workflow_stages where code = 'QUALIFICATION'),
      v_actor_profile_id, v_actor_label,
      'Action initiale de qualification créée par le système',
      jsonb_build_object(
        'old_action_id', null,
        'new_action_id', v_action_id,
        'new_action_code', 'QUALIFY_ASSIGN',
        'assigned_profile_id', case when public.has_role('facility_manager') then v_actor_profile_id else null end,
        'origin', 'system'
      ),
      'anomaly_actions', v_action_id, v_key, clock_timestamp()
    );
  elsif v_old_stage_code = 'QUALIFICATION'
    and v_new_stage_code <> 'QUALIFICATION' then
    select aa.id, c.code
    into v_action_id, v_action_code
    from public.anomaly_actions aa
    join public.next_action_codes c on c.id = aa.action_code_id
    where aa.anomaly_id = new.id and aa.state = 'pending'
    for update of aa;

    if v_action_id is not null then
      update public.anomaly_actions
      set state = 'cancelled',
          cancelled_by_profile_id = v_actor_profile_id,
          cancelled_by_system = (v_actor_profile_id is null),
          cancelled_at = clock_timestamp(),
          cancellation_reason = 'Sortie de l’étape Qualification par le workflow existant'
      where id = v_action_id;

      select id into v_event_definition_id
      from public.business_event_definitions
      where code = 'ACTION_CANCELLED' and is_active;
      v_key := gen_random_uuid();

      insert into public.anomaly_history(
        anomaly_id, event_type, event_definition_id, workflow_stage_id,
        actor_profile_id, actor_label_snapshot, comment, change_set,
        source_table, source_record_id, idempotency_key, server_received_at
      ) values (
        new.id, 'action_cancelled', v_event_definition_id,
        (select id from public.workflow_stages where code = 'QUALIFICATION'),
        v_actor_profile_id, v_actor_label,
        'Action de qualification terminée par la sortie de l’étape',
        jsonb_build_object(
          'old_action_id', v_action_id,
          'old_action_code', v_action_code,
          'new_action_id', null,
          'new_stage_code', v_new_stage_code,
          'reason', 'Sortie de l’étape Qualification par le workflow existant'
        ),
        'anomaly_actions', v_action_id, v_key, clock_timestamp()
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists sync_qualification_action_boundary on public.anomalies;
create trigger sync_qualification_action_boundary
after insert or update of current_status_id on public.anomalies
for each row execute function public.sync_qualification_action_boundary();

create or replace function public.set_anomaly_next_action(
  p_reference text,
  p_action_code text,
  p_assigned_profile_id uuid,
  p_comment text,
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
  v_actor_label text;
  v_anomaly public.anomalies%rowtype;
  v_code public.next_action_codes%rowtype;
  v_current public.anomaly_actions%rowtype;
  v_current_code text;
  v_assignee uuid;
  v_existing public.anomaly_actions%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_event_definition_id uuid;
  v_event_code text;
  v_event_type text;
  v_new_version integer;
begin
  if v_actor is null or not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can create or replace a Qualification action'
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

  select c.* into v_code
  from public.next_action_codes c
  where c.code = p_action_code
    and c.is_active
    and c.validation_status = 'confirmed';
  if v_code.id is null then
    raise exception 'The requested next-action code is not active and confirmed'
      using errcode = '23514';
  end if;

  v_assignee := coalesce(
    p_assigned_profile_id,
    case
      when v_code.code in ('QUALIFY_ASSIGN', 'CHOOSE_TREATMENT_BRANCH') then v_actor
      when v_code.code = 'PERFORM_DIAGNOSIS' then v_anomaly.assigned_profile_id
    end
  );

  select aa.* into v_existing
  from public.anomaly_actions aa
  where aa.idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.anomaly_id is distinct from v_anomaly.id
      or v_existing.action_code_id is distinct from v_code.id
      or v_existing.assigned_profile_id is distinct from v_assignee
      or coalesce(v_existing.comment, '') is distinct from coalesce(nullif(btrim(p_comment), ''), '')
      or v_existing.created_by_profile_id is distinct from v_actor
      or v_existing.base_version_no is distinct from p_base_version_no then
      raise exception 'The idempotency key was already used with different content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'action_id', v_existing.id,
      'action_code', v_code.code,
      'action_state', v_existing.state,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;

  select aa.* into v_current
  from public.anomaly_actions aa
  where aa.anomaly_id = v_anomaly.id and aa.state = 'pending'
  for update;

  if v_current.id is not null then
    select code into v_current_code
    from public.next_action_codes
    where id = v_current.action_code_id;
    if v_current.action_code_id <> v_code.id then
      raise exception 'Complete the current action before selecting the next code'
        using errcode = '23514';
    end if;

    update public.anomaly_actions
    set state = 'superseded',
        superseded_by_action_id = v_new_id,
        superseded_by_profile_id = v_actor,
        superseded_at = clock_timestamp()
    where id = v_current.id;

    v_event_code := 'ACTION_REPLACED';
    v_event_type := 'action_replaced';
  else
    if v_code.code <> 'QUALIFY_ASSIGN' then
      raise exception 'The first Qualification action must be QUALIFY_ASSIGN'
        using errcode = '23514';
    end if;
    v_event_code := 'ACTION_CREATED';
    v_event_type := 'action_created';
  end if;

  insert into public.anomaly_actions(
    id, anomaly_id, action_code_id, assigned_profile_id, comment,
    state, source_kind, source_record_id, previous_action_id,
    created_by_profile_id, idempotency_key, base_version_no
  ) values (
    v_new_id, v_anomaly.id, v_code.id, v_assignee, nullif(btrim(p_comment), ''),
    'pending', 'qualification', v_anomaly.id, v_current.id,
    v_actor, p_idempotency_key, p_base_version_no
  );

  select p.display_name into v_actor_label from public.profiles p where p.id = v_actor;
  select id into v_event_definition_id
  from public.business_event_definitions
  where code = v_event_code and is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key, server_received_at
  ) values (
    v_anomaly.id, v_event_type, v_event_definition_id,
    (select id from public.workflow_stages where code = 'QUALIFICATION'),
    v_actor, v_actor_label, nullif(btrim(p_comment), ''),
    jsonb_build_object(
      'old_action_id', v_current.id,
      'old_action_code', v_current_code,
      'new_action_id', v_new_id,
      'new_action_code', v_code.code,
      'old_assigned_profile_id', v_current.assigned_profile_id,
      'new_assigned_profile_id', v_assignee,
      'comment', nullif(btrim(p_comment), '')
    ),
    'anomaly_actions', v_new_id, p_idempotency_key, clock_timestamp()
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'action_id', v_new_id,
    'action_code', v_code.code,
    'action_state', 'pending',
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

create or replace function public.complete_qualification_action(
  p_reference text,
  p_action_id uuid,
  p_comment text,
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
  v_actor_label text;
  v_anomaly public.anomalies%rowtype;
  v_current public.anomaly_actions%rowtype;
  v_current_code text;
  v_next_code public.next_action_codes%rowtype;
  v_next_assignee uuid;
  v_existing public.anomaly_actions%rowtype;
  v_existing_comment text;
  v_new_id uuid := gen_random_uuid();
  v_event_definition_id uuid;
  v_event_key uuid;
  v_new_version integer;
begin
  if v_actor is null then
    raise exception 'An active internal profile is required' using errcode = '42501';
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

  select aa.* into v_existing
  from public.anomaly_actions aa
  where aa.idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    select h.comment into v_existing_comment
    from public.anomaly_history h
    where h.idempotency_key = p_idempotency_key
      and h.source_table = 'anomaly_actions'
      and h.source_record_id = p_action_id;

    if v_existing.anomaly_id is distinct from v_anomaly.id
      or v_existing.previous_action_id is distinct from p_action_id
      or v_existing.created_by_profile_id is distinct from v_actor
      or coalesce(v_existing_comment, '') is distinct from coalesce(nullif(btrim(p_comment), ''), '')
      or v_existing.base_version_no is distinct from p_base_version_no then
      raise exception 'The idempotency key was already used with different content'
        using errcode = '22023';
    end if;
    select code into v_current_code
    from public.next_action_codes where id = v_existing.action_code_id;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'completed_action_id', p_action_id,
      'next_action_id', v_existing.id,
      'next_action_code', v_current_code,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;

  select aa.* into v_current
  from public.anomaly_actions aa
  where aa.id = p_action_id
    and aa.anomaly_id = v_anomaly.id
    and aa.state = 'pending'
  for update;

  if v_current.id is null then
    raise exception 'The pending Qualification action was not found'
      using errcode = 'P0002';
  end if;

  select code into v_current_code
  from public.next_action_codes
  where id = v_current.action_code_id;

  if v_current_code = 'QUALIFY_ASSIGN' then
    if not public.has_role('facility_manager') then
      raise exception 'Only the Facility Manager can complete qualification and assignment'
        using errcode = '42501';
    end if;
    if v_anomaly.assigned_profile_id is null then
      raise exception 'A responsible internal agent is required before completing qualification'
        using errcode = '23514';
    end if;
    select * into v_next_code
    from public.next_action_codes
    where code = 'PERFORM_DIAGNOSIS' and is_active and validation_status = 'confirmed';
    v_next_assignee := v_anomaly.assigned_profile_id;
  elsif v_current_code = 'PERFORM_DIAGNOSIS' then
    if not public.has_role('facility_manager')
      and v_current.assigned_profile_id is distinct from v_actor then
      raise exception 'Only the assigned agent or Facility Manager can complete the diagnosis'
        using errcode = '42501';
    end if;
    select * into v_next_code
    from public.next_action_codes
    where code = 'CHOOSE_TREATMENT_BRANCH' and is_active and validation_status = 'confirmed';
    v_next_assignee := v_current.created_by_profile_id;
  elsif v_current_code = 'CHOOSE_TREATMENT_BRANCH' then
    raise exception 'The branch choice must be completed by the future branch transaction'
      using errcode = '23514';
  else
    raise exception 'This action is outside the validated C3 Qualification sequence'
      using errcode = '23514';
  end if;

  if v_next_code.id is null then
    raise exception 'The validated next Qualification action is unavailable'
      using errcode = '23514';
  end if;

  update public.anomaly_actions
  set state = 'completed',
      completed_by_profile_id = v_actor,
      completed_at = clock_timestamp()
  where id = v_current.id;

  insert into public.anomaly_actions(
    id, anomaly_id, action_code_id, assigned_profile_id, comment,
    state, source_kind, source_record_id, previous_action_id,
    created_by_profile_id, idempotency_key, base_version_no,
    client_occurred_at
  ) values (
    v_new_id, v_anomaly.id, v_next_code.id, v_next_assignee,
    null, 'pending', 'qualification', v_current.id, v_current.id,
    v_actor, p_idempotency_key, p_base_version_no, null
  );

  select p.display_name into v_actor_label from public.profiles p where p.id = v_actor;
  select id into v_event_definition_id
  from public.business_event_definitions
  where code = 'ACTION_COMPLETED' and is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key, server_received_at
  ) values (
    v_anomaly.id, 'action_completed', v_event_definition_id,
    (select id from public.workflow_stages where code = 'QUALIFICATION'),
    v_actor, v_actor_label, nullif(btrim(p_comment), ''),
    jsonb_build_object(
      'completed_action_id', v_current.id,
      'completed_action_code', v_current_code,
      'next_action_id', v_new_id,
      'next_action_code', v_next_code.code,
      'next_assigned_profile_id', v_next_assignee,
      'comment', nullif(btrim(p_comment), '')
    ),
    'anomaly_actions', v_current.id, p_idempotency_key, clock_timestamp()
  );

  select id into v_event_definition_id
  from public.business_event_definitions
  where code = 'ACTION_CREATED' and is_active;
  v_event_key := gen_random_uuid();

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key, server_received_at
  ) values (
    v_anomaly.id, 'action_created', v_event_definition_id,
    (select id from public.workflow_stages where code = 'QUALIFICATION'),
    v_actor, v_actor_label, 'Action suivante créée après terminaison confirmée',
    jsonb_build_object(
      'previous_action_id', v_current.id,
      'new_action_id', v_new_id,
      'new_action_code', v_next_code.code,
      'assigned_profile_id', v_next_assignee,
      'origin', 'qualification_sequence'
    ),
    'anomaly_actions', v_new_id, v_event_key, clock_timestamp()
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'completed_action_id', v_current.id,
    'next_action_id', v_new_id,
    'next_action_code', v_next_code.code,
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

-- Backfill only dossiers already in Qualification. No action is inferred for
-- another stage because only the Qualification sequence has been validated.
do $$
declare
  v_anomaly record;
  v_action_code_id uuid;
  v_action_id uuid;
  v_event_definition_id uuid;
  v_key uuid;
begin
  select id into v_action_code_id
  from public.next_action_codes
  where code = 'QUALIFY_ASSIGN' and is_active and validation_status = 'confirmed';
  select id into v_event_definition_id
  from public.business_event_definitions
  where code = 'ACTION_CREATED' and is_active;

  for v_anomaly in
    select a.id, a.version_no, s.stage_id
    from public.anomalies a
    join public.status_definitions s on s.id = a.current_status_id
    join public.workflow_stages ws on ws.id = s.stage_id
    where ws.code = 'QUALIFICATION'
      and not s.is_closed
      and not exists (
        select 1 from public.anomaly_actions aa
        where aa.anomaly_id = a.id and aa.state = 'pending'
      )
    order by a.created_at, a.id
  loop
    v_action_id := gen_random_uuid();
    v_key := gen_random_uuid();

    insert into public.anomaly_actions(
      id, anomaly_id, action_code_id, assigned_profile_id, comment,
      state, source_kind, source_record_id, created_by_profile_id,
      idempotency_key, base_version_no
    ) values (
      v_action_id, v_anomaly.id, v_action_code_id, null, null,
      'pending', 'legacy_backfill', v_anomaly.id, null,
      v_key, v_anomaly.version_no
    );

    insert into public.anomaly_history(
      anomaly_id, event_type, event_definition_id, workflow_stage_id,
      actor_profile_id, actor_label_snapshot, comment, change_set,
      source_table, source_record_id, idempotency_key, server_received_at
    ) values (
      v_anomaly.id, 'action_created', v_event_definition_id, v_anomaly.stage_id,
      null, 'Système BEHIRA', 'Reprise de l’action de qualification sans exécutant inventé',
      jsonb_build_object(
        'old_action_id', null,
        'new_action_id', v_action_id,
        'new_action_code', 'QUALIFY_ASSIGN',
        'assigned_profile_id', null,
        'origin', 'legacy_backfill'
      ),
      'anomaly_actions', v_action_id, v_key, clock_timestamp()
    );
  end loop;
end;
$$;

revoke all on function public.validate_anomaly_action_row() from public, anon, authenticated;
revoke all on function public.sync_qualification_action_boundary() from public, anon, authenticated;
revoke all on function public.set_anomaly_next_action(text, text, uuid, text, uuid, integer) from public, anon, authenticated;
revoke all on function public.complete_qualification_action(text, uuid, text, uuid, integer) from public, anon, authenticated;
grant execute on function public.set_anomaly_next_action(text, text, uuid, text, uuid, integer) to authenticated;
grant execute on function public.complete_qualification_action(text, uuid, text, uuid, integer) to authenticated;

commit;
