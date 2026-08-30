begin;

-- C4 activates no new catalogue candidate. It operationalizes only the six
-- confirmed block reasons, six confirmed delay reasons and five confirmed
-- resolution reasons already loaded by C1.
insert into public.business_event_definitions(
  code, label, is_activity, is_sensitive, is_active,
  validation_status, sort_order, source_document
) values
  ('BLOCK_DECLARED', 'Blocage déclaré', true, true, true, 'confirmed', 130, 'Validation utilisateur — Lot B2 et C4, 30 août 2026'),
  ('BLOCK_RESOLUTION_PROPOSED', 'Résolution de blocage proposée', true, true, true, 'confirmed', 140, 'Validation utilisateur — Lot B2 et C4, 30 août 2026'),
  ('BLOCK_RESOLVED', 'Résolution de blocage confirmée', true, true, true, 'confirmed', 150, 'Validation utilisateur — Lot B2 et C4, 30 août 2026'),
  ('DELAY_JUSTIFICATION_CREATED', 'Justification de retard créée', true, true, true, 'confirmed', 160, 'Validation utilisateur — Lot B2 et C4, 30 août 2026'),
  ('DELAY_JUSTIFICATION_REPLACED', 'Justification de retard remplacée', true, true, true, 'confirmed', 170, 'Validation utilisateur — Lot B2 et C4, 30 août 2026')
on conflict (code) do update set
  label = excluded.label,
  is_activity = excluded.is_activity,
  is_sensitive = excluded.is_sensitive,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists public.anomaly_blocks (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  block_reason_code_id uuid not null references public.block_reason_codes(id) on delete restrict,
  reason_detail text not null check (length(btrim(reason_detail)) > 0),
  blocking_actor_type text not null
    check (blocking_actor_type in ('internal', 'vendor', 'external', 'system')),
  blocking_profile_id uuid references public.profiles(id) on delete restrict,
  blocking_vendor_id uuid references public.vendors(id) on delete restrict,
  blocking_external_label text,
  blocking_system_code text,
  blocking_actor_label_snapshot text not null
    check (length(btrim(blocking_actor_label_snapshot)) > 0),
  state text not null default 'active'
    check (state in ('active', 'resolution_proposed', 'resolved')),
  previous_block_id uuid references public.anomaly_blocks(id) on delete restrict,
  declared_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  declared_at timestamptz not null default clock_timestamp(),
  declaration_idempotency_key uuid not null unique,
  declaration_base_version_no integer not null check (declaration_base_version_no > 0),
  declaration_client_occurred_at timestamptz,
  resolution_proposed_by_profile_id uuid references public.profiles(id) on delete restrict,
  resolution_proposed_at timestamptz,
  resolution_proposal_comment text,
  resolution_proposal_idempotency_key uuid unique,
  resolution_proposal_base_version_no integer check (resolution_proposal_base_version_no > 0),
  resolution_proposal_client_occurred_at timestamptz,
  resolution_code_id uuid references public.block_resolution_codes(id) on delete restrict,
  resolution_detail text,
  resolved_by_profile_id uuid references public.profiles(id) on delete restrict,
  resolved_at timestamptz,
  resolution_idempotency_key uuid unique,
  resolution_base_version_no integer check (resolution_base_version_no > 0),
  resolution_client_occurred_at timestamptz,
  server_received_at timestamptz not null default clock_timestamp(),
  check (previous_block_id is distinct from id),
  check (
    (blocking_actor_type = 'internal'
      and blocking_profile_id is not null
      and blocking_vendor_id is null
      and blocking_external_label is null
      and blocking_system_code is null)
    or
    (blocking_actor_type = 'vendor'
      and blocking_profile_id is null
      and blocking_vendor_id is not null
      and blocking_external_label is null
      and blocking_system_code is null)
    or
    (blocking_actor_type = 'external'
      and blocking_profile_id is null
      and blocking_vendor_id is null
      and nullif(btrim(blocking_external_label), '') is not null
      and blocking_system_code is null)
    or
    (blocking_actor_type = 'system'
      and blocking_profile_id is null
      and blocking_vendor_id is null
      and blocking_external_label is null
      and nullif(btrim(blocking_system_code), '') is not null)
  ),
  check (
    (state = 'active'
      and resolution_proposed_by_profile_id is null
      and resolution_proposed_at is null
      and resolution_proposal_comment is null
      and resolution_proposal_idempotency_key is null
      and resolution_proposal_base_version_no is null
      and resolution_proposal_client_occurred_at is null
      and resolution_code_id is null
      and resolution_detail is null
      and resolved_by_profile_id is null
      and resolved_at is null
      and resolution_idempotency_key is null
      and resolution_base_version_no is null
      and resolution_client_occurred_at is null)
    or
    (state = 'resolution_proposed'
      and resolution_proposed_by_profile_id is not null
      and resolution_proposed_at is not null
      and nullif(btrim(resolution_proposal_comment), '') is not null
      and resolution_proposal_idempotency_key is not null
      and resolution_proposal_base_version_no is not null
      and resolution_code_id is null
      and resolution_detail is null
      and resolved_by_profile_id is null
      and resolved_at is null
      and resolution_idempotency_key is null
      and resolution_base_version_no is null
      and resolution_client_occurred_at is null)
    or
    (state = 'resolved'
      and resolution_proposed_by_profile_id is not null
      and resolution_proposed_at is not null
      and nullif(btrim(resolution_proposal_comment), '') is not null
      and resolution_proposal_idempotency_key is not null
      and resolution_proposal_base_version_no is not null
      and resolution_code_id is not null
      and nullif(btrim(resolution_detail), '') is not null
      and resolved_by_profile_id is not null
      and resolved_at is not null
      and resolution_idempotency_key is not null
      and resolution_base_version_no is not null)
  )
);

create unique index if not exists anomaly_blocks_one_open_idx
  on public.anomaly_blocks(anomaly_id)
  where state in ('active', 'resolution_proposed');
create index if not exists anomaly_blocks_timeline_idx
  on public.anomaly_blocks(anomaly_id, declared_at desc, id desc);
create index if not exists anomaly_blocks_reason_open_idx
  on public.anomaly_blocks(block_reason_code_id, declared_at)
  where state in ('active', 'resolution_proposed');
create index if not exists anomaly_blocks_profile_open_idx
  on public.anomaly_blocks(blocking_profile_id, declared_at)
  where blocking_profile_id is not null and state in ('active', 'resolution_proposed');
create index if not exists anomaly_blocks_vendor_open_idx
  on public.anomaly_blocks(blocking_vendor_id, declared_at)
  where blocking_vendor_id is not null and state in ('active', 'resolution_proposed');
create index if not exists anomaly_blocks_previous_idx
  on public.anomaly_blocks(previous_block_id)
  where previous_block_id is not null;
create index if not exists anomaly_blocks_declared_by_idx
  on public.anomaly_blocks(declared_by_profile_id, declared_at);
create index if not exists anomaly_blocks_proposed_by_idx
  on public.anomaly_blocks(resolution_proposed_by_profile_id, resolution_proposed_at)
  where resolution_proposed_by_profile_id is not null;
create index if not exists anomaly_blocks_resolution_code_idx
  on public.anomaly_blocks(resolution_code_id)
  where resolution_code_id is not null;
create index if not exists anomaly_blocks_resolved_by_idx
  on public.anomaly_blocks(resolved_by_profile_id, resolved_at)
  where resolved_by_profile_id is not null;

create table if not exists public.anomaly_delay_justifications (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  deadline_id uuid not null references public.anomaly_deadlines(id) on delete restrict,
  delay_reason_code_id uuid not null references public.delay_reason_codes(id) on delete restrict,
  reason_detail text not null check (length(btrim(reason_detail)) > 0),
  state text not null default 'active' check (state in ('active', 'superseded')),
  previous_justification_id uuid references public.anomaly_delay_justifications(id) on delete restrict,
  declared_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  declared_at timestamptz not null default clock_timestamp(),
  superseded_by_id uuid,
  superseded_by_profile_id uuid references public.profiles(id) on delete restrict,
  superseded_at timestamptz,
  idempotency_key uuid not null unique,
  base_version_no integer not null check (base_version_no > 0),
  client_occurred_at timestamptz,
  server_received_at timestamptz not null default clock_timestamp(),
  constraint anomaly_delay_justifications_superseded_by_fkey
    foreign key (superseded_by_id)
    references public.anomaly_delay_justifications(id)
    on delete restrict
    deferrable initially deferred,
  check (previous_justification_id is distinct from id),
  check (superseded_by_id is distinct from id),
  check (
    (state = 'active'
      and superseded_by_id is null
      and superseded_by_profile_id is null
      and superseded_at is null)
    or
    (state = 'superseded'
      and superseded_by_id is not null
      and superseded_by_profile_id is not null
      and superseded_at is not null)
  )
);

create unique index if not exists anomaly_delay_justifications_one_active_idx
  on public.anomaly_delay_justifications(deadline_id)
  where state = 'active';
create index if not exists anomaly_delay_justifications_timeline_idx
  on public.anomaly_delay_justifications(anomaly_id, declared_at desc, id desc);
create index if not exists anomaly_delay_justifications_reason_active_idx
  on public.anomaly_delay_justifications(delay_reason_code_id, declared_at)
  where state = 'active';
create index if not exists anomaly_delay_justifications_previous_idx
  on public.anomaly_delay_justifications(previous_justification_id)
  where previous_justification_id is not null;
create index if not exists anomaly_delay_justifications_superseded_by_idx
  on public.anomaly_delay_justifications(superseded_by_id)
  where superseded_by_id is not null;
create index if not exists anomaly_delay_justifications_declared_by_idx
  on public.anomaly_delay_justifications(declared_by_profile_id, declared_at);
create index if not exists anomaly_delay_justifications_superseded_by_profile_idx
  on public.anomaly_delay_justifications(superseded_by_profile_id, superseded_at)
  where superseded_by_profile_id is not null;

alter table public.anomaly_blocks enable row level security;
alter table public.anomaly_delay_justifications enable row level security;
revoke all on table public.anomaly_blocks from public, anon, authenticated;
revoke all on table public.anomaly_delay_justifications from public, anon, authenticated;
grant select on table public.anomaly_blocks to authenticated;
grant select on table public.anomaly_delay_justifications to authenticated;
grant select, insert, update, delete on table public.anomaly_blocks to service_role;
grant select, insert, update, delete on table public.anomaly_delay_justifications to service_role;

drop policy if exists anomaly_blocks_read on public.anomaly_blocks;
create policy anomaly_blocks_read on public.anomaly_blocks
for select to authenticated
using (
  (select public.current_profile_id()) is not null
  and public.can_access_anomaly(anomaly_id)
);

drop policy if exists anomaly_delay_justifications_read on public.anomaly_delay_justifications;
create policy anomaly_delay_justifications_read on public.anomaly_delay_justifications
for select to authenticated
using (
  (select public.current_profile_id()) is not null
  and public.can_access_anomaly(anomaly_id)
);

create or replace function private.validate_anomaly_block_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason_active boolean;
  v_reason_status text;
  v_actor_label text;
  v_resolution_active boolean;
  v_resolution_status text;
  v_resolution_requires_comment boolean;
begin
  if tg_op = 'DELETE' then
    raise exception 'Canonical block records are append-only' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if new.anomaly_id is distinct from old.anomaly_id
      or new.block_reason_code_id is distinct from old.block_reason_code_id
      or new.reason_detail is distinct from old.reason_detail
      or new.blocking_actor_type is distinct from old.blocking_actor_type
      or new.blocking_profile_id is distinct from old.blocking_profile_id
      or new.blocking_vendor_id is distinct from old.blocking_vendor_id
      or new.blocking_external_label is distinct from old.blocking_external_label
      or new.blocking_system_code is distinct from old.blocking_system_code
      or new.blocking_actor_label_snapshot is distinct from old.blocking_actor_label_snapshot
      or new.previous_block_id is distinct from old.previous_block_id
      or new.declared_by_profile_id is distinct from old.declared_by_profile_id
      or new.declared_at is distinct from old.declared_at
      or new.declaration_idempotency_key is distinct from old.declaration_idempotency_key
      or new.declaration_base_version_no is distinct from old.declaration_base_version_no
      or new.declaration_client_occurred_at is distinct from old.declaration_client_occurred_at
      or new.server_received_at is distinct from old.server_received_at then
      raise exception 'Canonical block declaration fields are immutable'
        using errcode = '23514';
    end if;

    if old.state = 'resolved'
      or (old.state = 'active' and new.state <> 'resolution_proposed')
      or (old.state = 'resolution_proposed' and new.state <> 'resolved') then
      raise exception 'The block lifecycle must be active, resolution_proposed, then resolved'
        using errcode = '23514';
    end if;

    if old.state = 'resolution_proposed' and (
      new.resolution_proposed_by_profile_id is distinct from old.resolution_proposed_by_profile_id
      or new.resolution_proposed_at is distinct from old.resolution_proposed_at
      or new.resolution_proposal_comment is distinct from old.resolution_proposal_comment
      or new.resolution_proposal_idempotency_key is distinct from old.resolution_proposal_idempotency_key
      or new.resolution_proposal_base_version_no is distinct from old.resolution_proposal_base_version_no
      or new.resolution_proposal_client_occurred_at is distinct from old.resolution_proposal_client_occurred_at
    ) then
      raise exception 'A resolution proposal is immutable after submission'
        using errcode = '23514';
    end if;

    if new.state = 'resolved' then
      select c.is_active, c.validation_status, c.requires_comment
      into v_resolution_active, v_resolution_status, v_resolution_requires_comment
      from public.block_resolution_codes c
      where c.id = new.resolution_code_id;

      if not coalesce(v_resolution_active, false)
        or v_resolution_status <> 'confirmed' then
        raise exception 'The block resolution code is not active and confirmed'
          using errcode = '23514';
      end if;
      if v_resolution_requires_comment
        and nullif(btrim(new.resolution_detail), '') is null then
        raise exception 'This block resolution requires a comment'
          using errcode = '23514';
      end if;
    end if;
    return new;
  end if;

  if new.state <> 'active' then
    raise exception 'A canonical block must be created in the active state'
      using errcode = '23514';
  end if;

  select c.is_active, c.validation_status
  into v_reason_active, v_reason_status
  from public.block_reason_codes c
  where c.id = new.block_reason_code_id;

  if not coalesce(v_reason_active, false) or v_reason_status <> 'confirmed' then
    raise exception 'The block reason code is not active and confirmed'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from public.anomalies a
    join public.status_definitions s on s.id = a.current_status_id
    where a.id = new.anomaly_id and s.is_closed
  ) then
    raise exception 'A closed dossier cannot receive an active block'
      using errcode = '23514';
  end if;

  if new.blocking_actor_type = 'internal' then
    select p.display_name into v_actor_label
    from public.profiles p
    where p.id = new.blocking_profile_id
      and p.account_status = 'active'
      and p.vendor_id is null;
    if v_actor_label is null then
      raise exception 'The blocking internal actor must be an active internal profile'
        using errcode = '23514';
    end if;
  elsif new.blocking_actor_type = 'vendor' then
    select coalesce(nullif(v.operational_alias, ''), v.legal_name) into v_actor_label
    from public.vendors v
    where v.id = new.blocking_vendor_id
      and v.status in ('active', 'to_integrate');
    if v_actor_label is null then
      raise exception 'The blocking vendor must be an active referenced company'
        using errcode = '23514';
    end if;
  elsif new.blocking_actor_type = 'external' then
    v_actor_label := nullif(btrim(new.blocking_external_label), '');
  elsif new.blocking_actor_type = 'system' then
    v_actor_label := 'Système BEHIRA · ' || btrim(new.blocking_system_code);
  end if;

  if v_actor_label is null then
    raise exception 'The blocking actor is incomplete' using errcode = '23514';
  end if;
  new.blocking_actor_label_snapshot := v_actor_label;
  return new;
end;
$$;

drop trigger if exists validate_anomaly_block_row on public.anomaly_blocks;
create trigger validate_anomaly_block_row
before insert or update or delete on public.anomaly_blocks
for each row execute function private.validate_anomaly_block_row();

create or replace function private.validate_delay_justification_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_reason_active boolean;
  v_reason_status text;
  v_reason_code text;
  v_deadline_anomaly_id uuid;
  v_deadline_stage_code text;
  v_status_code text;
begin
  if tg_op = 'DELETE' then
    raise exception 'Delay justifications are append-only' using errcode = '23514';
  end if;

  if tg_op = 'UPDATE' then
    if old.state <> 'active' or new.state <> 'superseded' then
      raise exception 'A delay justification can only become superseded'
        using errcode = '23514';
    end if;
    if new.anomaly_id is distinct from old.anomaly_id
      or new.deadline_id is distinct from old.deadline_id
      or new.delay_reason_code_id is distinct from old.delay_reason_code_id
      or new.reason_detail is distinct from old.reason_detail
      or new.previous_justification_id is distinct from old.previous_justification_id
      or new.declared_by_profile_id is distinct from old.declared_by_profile_id
      or new.declared_at is distinct from old.declared_at
      or new.idempotency_key is distinct from old.idempotency_key
      or new.base_version_no is distinct from old.base_version_no
      or new.client_occurred_at is distinct from old.client_occurred_at
      or new.server_received_at is distinct from old.server_received_at then
      raise exception 'Canonical delay justification fields are immutable'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.state <> 'active' then
    raise exception 'A delay justification must be created in the active state'
      using errcode = '23514';
  end if;

  select c.is_active, c.validation_status, c.code
  into v_reason_active, v_reason_status, v_reason_code
  from public.delay_reason_codes c
  where c.id = new.delay_reason_code_id;
  if not coalesce(v_reason_active, false) or v_reason_status <> 'confirmed' then
    raise exception 'The delay reason code is not active and confirmed'
      using errcode = '23514';
  end if;

  select d.anomaly_id, ws.code, s.code
  into v_deadline_anomaly_id, v_deadline_stage_code, v_status_code
  from public.anomaly_deadlines d
  join public.workflow_stages ws on ws.id = d.workflow_stage_id
  join public.anomalies a on a.id = d.anomaly_id
  join public.status_definitions s on s.id = a.current_status_id
  where d.id = new.deadline_id;
  if v_deadline_anomaly_id is distinct from new.anomaly_id then
    raise exception 'The delay justification deadline does not belong to the dossier'
      using errcode = '23514';
  end if;

  if not (
    (v_reason_code = 'QUALIFICATION_OVERDUE'
      and v_deadline_stage_code in ('CONSTAT', 'QUALIFICATION'))
    or (v_reason_code = 'INTERVENTION_OVERDUE'
      and v_deadline_stage_code = 'INTERVENTION')
    or (v_reason_code = 'QUOTE_OVERDUE'
      and v_status_code = 'EN_ATTENTE_DEVIS')
    or (v_reason_code = 'PROOF_OVERDUE'
      and v_deadline_stage_code = 'PREUVE')
    or (v_reason_code = 'RESERVATION_OVERDUE'
      and v_status_code = 'REFUS_CLOTURE')
  ) then
    raise exception 'The delay reason is incompatible with the current deadline and workflow state'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_delay_justification_row on public.anomaly_delay_justifications;
create trigger validate_delay_justification_row
before insert or update or delete on public.anomaly_delay_justifications
for each row execute function private.validate_delay_justification_row();

create or replace function private.prevent_close_with_active_block()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.status_definitions s
    where s.id = new.current_status_id and s.is_closed
  ) and exists (
    select 1
    from public.anomaly_blocks b
    where b.anomaly_id = new.id
      and b.state in ('active', 'resolution_proposed')
  ) then
    raise exception 'A dossier with an active block cannot be closed'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_close_with_active_block on public.anomalies;
create trigger prevent_close_with_active_block
before update of current_status_id on public.anomalies
for each row execute function private.prevent_close_with_active_block();

create or replace function public.declare_anomaly_block(
  p_reference text,
  p_reason_code text,
  p_reason_detail text,
  p_blocking_actor_type text,
  p_blocking_profile_id uuid,
  p_blocking_vendor_id uuid,
  p_blocking_external_label text,
  p_previous_block_id uuid,
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
  v_reason public.block_reason_codes%rowtype;
  v_existing public.anomaly_blocks%rowtype;
  v_active_block_id uuid;
  v_new_id uuid := gen_random_uuid();
  v_event_definition_id uuid;
  v_stage_id uuid;
  v_new_version integer;
  v_is_agent_assigned boolean;
begin
  if v_actor is null then
    raise exception 'An active internal profile is required' using errcode = '42501';
  end if;
  if p_idempotency_key is null or p_base_version_no is null or p_base_version_no < 1 then
    raise exception 'An idempotency key and a valid dossier version are required'
      using errcode = '22023';
  end if;
  if p_blocking_actor_type not in ('internal', 'vendor', 'external') then
    raise exception 'Only internal, referenced vendor or external actors can be declared by a user'
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
    raise exception 'A closed dossier cannot receive an active block'
      using errcode = '23514';
  end if;

  select c.* into v_reason
  from public.block_reason_codes c
  where c.code = p_reason_code
    and c.is_active
    and c.validation_status = 'confirmed';
  if v_reason.id is null then
    raise exception 'The block reason code is not active and confirmed'
      using errcode = '23514';
  end if;
  if nullif(btrim(p_reason_detail), '') is null then
    raise exception 'A precise block reason is required' using errcode = '22023';
  end if;

  v_is_agent_assigned := v_anomaly.assigned_profile_id = v_actor
    or exists (
      select 1
      from public.anomaly_actions aa
      where aa.anomaly_id = v_anomaly.id
        and aa.state = 'pending'
        and aa.assigned_profile_id = v_actor
    );

  if public.has_role('facility_manager') then
    null;
  elsif public.has_role('direction') then
    if v_reason.code not in ('ADMIN_DECISION_PENDING', 'QUOTE_PENDING') then
      raise exception 'Direction can declare only a confirmed Administration or cost block in C4'
        using errcode = '42501';
    end if;
  elsif public.has_role('field_agent') and v_is_agent_assigned then
    null;
  else
    raise exception 'The current profile cannot declare a block on this dossier'
      using errcode = '42501';
  end if;

  if p_previous_block_id is not null then
    if not public.has_any_role(array['facility_manager', 'direction'])
      or not exists (
        select 1 from public.anomaly_blocks b
        where b.id = p_previous_block_id
          and b.anomaly_id = v_anomaly.id
          and b.state = 'resolved'
      ) then
      raise exception 'Only an authorized manager can reopen a resolved block from the same dossier'
        using errcode = '42501';
    end if;
  end if;

  if p_blocking_actor_type = 'internal' then
    if p_blocking_profile_id is null
      or p_blocking_vendor_id is not null
      or nullif(btrim(p_blocking_external_label), '') is not null then
      raise exception 'An internal blocker requires exactly one internal profile'
        using errcode = '22023';
    end if;
  elsif p_blocking_actor_type = 'vendor' then
    if p_blocking_profile_id is not null
      or p_blocking_vendor_id is null
      or nullif(btrim(p_blocking_external_label), '') is not null then
      raise exception 'A vendor blocker requires exactly one referenced company'
        using errcode = '22023';
    end if;
  elsif p_blocking_actor_type = 'external' then
    if p_blocking_profile_id is not null
      or p_blocking_vendor_id is not null
      or nullif(btrim(p_blocking_external_label), '') is null then
      raise exception 'A free external blocker requires exactly one explicit label'
        using errcode = '22023';
    end if;
  end if;

  select b.* into v_existing
  from public.anomaly_blocks b
  where b.declaration_idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.anomaly_id is distinct from v_anomaly.id
      or v_existing.block_reason_code_id is distinct from v_reason.id
      or v_existing.reason_detail is distinct from btrim(p_reason_detail)
      or v_existing.blocking_actor_type is distinct from p_blocking_actor_type
      or v_existing.blocking_profile_id is distinct from p_blocking_profile_id
      or v_existing.blocking_vendor_id is distinct from p_blocking_vendor_id
      or coalesce(v_existing.blocking_external_label, '') is distinct from coalesce(nullif(btrim(p_blocking_external_label), ''), '')
      or v_existing.previous_block_id is distinct from p_previous_block_id
      or v_existing.declared_by_profile_id is distinct from v_actor
      or v_existing.declaration_base_version_no is distinct from p_base_version_no
      or v_existing.declaration_client_occurred_at is distinct from p_client_occurred_at then
      raise exception 'The idempotency key was already used with different block content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'block_id', v_existing.id,
      'block_state', v_existing.state,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;

  select b.id into v_active_block_id
  from public.anomaly_blocks b
  where b.anomaly_id = v_anomaly.id
    and b.state in ('active', 'resolution_proposed')
  for update of b;
  if v_active_block_id is not null then
    raise exception 'Resolve the active block before declaring another one'
      using errcode = '23505';
  end if;

  insert into public.anomaly_blocks(
    id, anomaly_id, block_reason_code_id, reason_detail,
    blocking_actor_type, blocking_profile_id, blocking_vendor_id,
    blocking_external_label, blocking_system_code, blocking_actor_label_snapshot,
    state, previous_block_id, declared_by_profile_id,
    declaration_idempotency_key, declaration_base_version_no,
    declaration_client_occurred_at
  ) values (
    v_new_id, v_anomaly.id, v_reason.id, btrim(p_reason_detail),
    p_blocking_actor_type, p_blocking_profile_id, p_blocking_vendor_id,
    nullif(btrim(p_blocking_external_label), ''), null, 'Validé par le serveur',
    'active', p_previous_block_id, v_actor,
    p_idempotency_key, p_base_version_no, p_client_occurred_at
  );

  select p.display_name into v_actor_label from public.profiles p where p.id = v_actor;
  select s.stage_id into v_stage_id
  from public.status_definitions s where s.id = v_anomaly.current_status_id;
  select e.id into v_event_definition_id
  from public.business_event_definitions e where e.code = 'BLOCK_DECLARED' and e.is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key,
    client_occurred_at, server_received_at
  ) values (
    v_anomaly.id, 'block_declared', v_event_definition_id, v_stage_id,
    v_actor, v_actor_label, btrim(p_reason_detail),
    jsonb_build_object(
      'block_id', v_new_id,
      'reason_code', v_reason.code,
      'blocking_actor_type', p_blocking_actor_type,
      'blocking_profile_id', p_blocking_profile_id,
      'blocking_vendor_id', p_blocking_vendor_id,
      'blocking_external_label', nullif(btrim(p_blocking_external_label), ''),
      'previous_block_id', p_previous_block_id
    ),
    'anomaly_blocks', v_new_id, p_idempotency_key,
    p_client_occurred_at, clock_timestamp()
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'block_id', v_new_id,
    'block_state', 'active',
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

create or replace function public.propose_anomaly_block_resolution(
  p_reference text,
  p_block_id uuid,
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
  v_block public.anomaly_blocks%rowtype;
  v_stage_id uuid;
  v_event_definition_id uuid;
  v_new_version integer;
  v_is_agent_assigned boolean;
begin
  if v_actor is null then
    raise exception 'An active internal profile is required' using errcode = '42501';
  end if;
  if p_block_id is null or p_idempotency_key is null
    or p_base_version_no is null or p_base_version_no < 1 then
    raise exception 'Block, idempotency key and valid dossier version are required'
      using errcode = '22023';
  end if;
  if nullif(btrim(p_comment), '') is null then
    raise exception 'A resolution proposal comment is required'
      using errcode = '22023';
  end if;

  select a.* into v_anomaly
  from public.anomalies a
  where a.reference = p_reference
  for update of a;
  if v_anomaly.id is null or not public.can_access_anomaly(v_anomaly.id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;

  select b.* into v_block
  from public.anomaly_blocks b
  where b.id = p_block_id and b.anomaly_id = v_anomaly.id
  for update of b;
  if v_block.id is null then
    raise exception 'Block not found on this dossier' using errcode = 'P0002';
  end if;

  if v_block.resolution_proposal_idempotency_key = p_idempotency_key then
    if v_block.resolution_proposed_by_profile_id is distinct from v_actor
      or v_block.resolution_proposal_comment is distinct from btrim(p_comment)
      or v_block.resolution_proposal_base_version_no is distinct from p_base_version_no
      or v_block.resolution_proposal_client_occurred_at is distinct from p_client_occurred_at then
      raise exception 'The idempotency key was already used with different proposal content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'block_id', v_block.id,
      'block_state', v_block.state,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;
  if v_block.state <> 'active' then
    raise exception 'Only an active block can receive a resolution proposal'
      using errcode = '23514';
  end if;

  v_is_agent_assigned := v_anomaly.assigned_profile_id = v_actor
    or exists (
      select 1
      from public.anomaly_actions aa
      where aa.anomaly_id = v_anomaly.id
        and aa.state = 'pending'
        and aa.assigned_profile_id = v_actor
    );

  if not (
    public.has_any_role(array['facility_manager', 'direction'])
    or (public.has_role('field_agent') and v_is_agent_assigned)
  ) then
    raise exception 'The current profile cannot propose resolution on this block'
      using errcode = '42501';
  end if;

  update public.anomaly_blocks
  set state = 'resolution_proposed',
      resolution_proposed_by_profile_id = v_actor,
      resolution_proposed_at = clock_timestamp(),
      resolution_proposal_comment = btrim(p_comment),
      resolution_proposal_idempotency_key = p_idempotency_key,
      resolution_proposal_base_version_no = p_base_version_no,
      resolution_proposal_client_occurred_at = p_client_occurred_at
  where id = v_block.id;

  select p.display_name into v_actor_label from public.profiles p where p.id = v_actor;
  select s.stage_id into v_stage_id
  from public.status_definitions s where s.id = v_anomaly.current_status_id;
  select e.id into v_event_definition_id
  from public.business_event_definitions e
  where e.code = 'BLOCK_RESOLUTION_PROPOSED' and e.is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key,
    client_occurred_at, server_received_at
  ) values (
    v_anomaly.id, 'block_resolution_proposed', v_event_definition_id, v_stage_id,
    v_actor, v_actor_label, btrim(p_comment),
    jsonb_build_object(
      'block_id', v_block.id,
      'old_state', v_block.state,
      'new_state', 'resolution_proposed'
    ),
    'anomaly_blocks', v_block.id, p_idempotency_key,
    p_client_occurred_at, clock_timestamp()
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'block_id', v_block.id,
    'block_state', 'resolution_proposed',
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

create or replace function public.confirm_anomaly_block_resolution(
  p_reference text,
  p_block_id uuid,
  p_resolution_code text,
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
  v_block public.anomaly_blocks%rowtype;
  v_block_reason_code text;
  v_resolution public.block_resolution_codes%rowtype;
  v_resolution_detail text;
  v_is_administration_block boolean;
  v_stage_id uuid;
  v_event_definition_id uuid;
  v_new_version integer;
begin
  if v_actor is null then
    raise exception 'An active internal profile is required' using errcode = '42501';
  end if;
  if p_block_id is null or p_idempotency_key is null
    or p_base_version_no is null or p_base_version_no < 1 then
    raise exception 'Block, idempotency key and valid dossier version are required'
      using errcode = '22023';
  end if;

  select a.* into v_anomaly
  from public.anomalies a
  where a.reference = p_reference
  for update of a;
  if v_anomaly.id is null or not public.can_access_anomaly(v_anomaly.id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;

  select b.* into v_block
  from public.anomaly_blocks b
  where b.id = p_block_id and b.anomaly_id = v_anomaly.id
  for update of b;
  if v_block.id is null then
    raise exception 'Block not found on this dossier' using errcode = 'P0002';
  end if;

  select c.* into v_resolution
  from public.block_resolution_codes c
  where c.code = p_resolution_code
    and c.is_active
    and c.validation_status = 'confirmed';
  if v_resolution.id is null then
    raise exception 'The block resolution code is not active and confirmed'
      using errcode = '23514';
  end if;
  if v_resolution.requires_comment and nullif(btrim(p_comment), '') is null then
    raise exception 'This block resolution requires a comment'
      using errcode = '22023';
  end if;
  v_resolution_detail := coalesce(nullif(btrim(p_comment), ''), v_resolution.label);

  if v_block.resolution_idempotency_key = p_idempotency_key then
    if v_block.resolved_by_profile_id is distinct from v_actor
      or v_block.resolution_code_id is distinct from v_resolution.id
      or v_block.resolution_detail is distinct from v_resolution_detail
      or v_block.resolution_base_version_no is distinct from p_base_version_no
      or v_block.resolution_client_occurred_at is distinct from p_client_occurred_at then
      raise exception 'The idempotency key was already used with different resolution content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'block_id', v_block.id,
      'block_state', v_block.state,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;
  if v_block.state <> 'resolution_proposed' then
    raise exception 'A resolution must be proposed before confirmation'
      using errcode = '23514';
  end if;

  select c.code into v_block_reason_code
  from public.block_reason_codes c where c.id = v_block.block_reason_code_id;
  v_is_administration_block := v_block_reason_code = 'ADMIN_DECISION_PENDING'
    or (
      v_block.blocking_profile_id is not null
      and exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id
        where ur.profile_id = v_block.blocking_profile_id
          and r.code = 'direction'
          and r.is_active
          and ur.valid_from <= now()
          and (ur.valid_until is null or ur.valid_until > now())
      )
    );

  if v_is_administration_block then
    if not public.has_role('direction') then
      raise exception 'Only Direction can confirm an Administration block resolution'
        using errcode = '42501';
    end if;
  elsif not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can confirm an operational block resolution'
      using errcode = '42501';
  end if;

  update public.anomaly_blocks
  set state = 'resolved',
      resolution_code_id = v_resolution.id,
      resolution_detail = v_resolution_detail,
      resolved_by_profile_id = v_actor,
      resolved_at = clock_timestamp(),
      resolution_idempotency_key = p_idempotency_key,
      resolution_base_version_no = p_base_version_no,
      resolution_client_occurred_at = p_client_occurred_at
  where id = v_block.id;

  select p.display_name into v_actor_label from public.profiles p where p.id = v_actor;
  select s.stage_id into v_stage_id
  from public.status_definitions s where s.id = v_anomaly.current_status_id;
  select e.id into v_event_definition_id
  from public.business_event_definitions e where e.code = 'BLOCK_RESOLVED' and e.is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key,
    client_occurred_at, server_received_at
  ) values (
    v_anomaly.id, 'block_resolved', v_event_definition_id, v_stage_id,
    v_actor, v_actor_label, v_resolution_detail,
    jsonb_build_object(
      'block_id', v_block.id,
      'old_state', v_block.state,
      'new_state', 'resolved',
      'resolution_code', v_resolution.code,
      'resolution_proposed_by_profile_id', v_block.resolution_proposed_by_profile_id
    ),
    'anomaly_blocks', v_block.id, p_idempotency_key,
    p_client_occurred_at, clock_timestamp()
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'block_id', v_block.id,
    'block_state', 'resolved',
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

create or replace function public.record_anomaly_delay_justification(
  p_reference text,
  p_deadline_id uuid,
  p_reason_code text,
  p_reason_detail text,
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
  v_deadline public.anomaly_deadlines%rowtype;
  v_reason public.delay_reason_codes%rowtype;
  v_existing public.anomaly_delay_justifications%rowtype;
  v_current public.anomaly_delay_justifications%rowtype;
  v_new_id uuid := gen_random_uuid();
  v_event_code text;
  v_event_type text;
  v_event_definition_id uuid;
  v_stage_id uuid;
  v_new_version integer;
  v_is_agent_assigned boolean;
begin
  if v_actor is null then
    raise exception 'An active internal profile is required' using errcode = '42501';
  end if;
  if p_deadline_id is null or p_idempotency_key is null
    or p_base_version_no is null or p_base_version_no < 1 then
    raise exception 'Deadline, idempotency key and valid dossier version are required'
      using errcode = '22023';
  end if;
  if nullif(btrim(p_reason_detail), '') is null then
    raise exception 'A precise delay justification is required'
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
    raise exception 'A closed dossier cannot receive a current delay justification'
      using errcode = '23514';
  end if;

  select d.* into v_deadline
  from public.anomaly_deadlines d
  where d.id = p_deadline_id
    and d.anomaly_id = v_anomaly.id
  for update of d;
  if v_deadline.id is null
    or v_deadline.superseded_at is not null
    or v_deadline.due_at >= clock_timestamp() then
    raise exception 'The selected canonical deadline is not active and overdue'
      using errcode = '23514';
  end if;

  select c.* into v_reason
  from public.delay_reason_codes c
  where c.code = p_reason_code
    and c.is_active
    and c.validation_status = 'confirmed';
  if v_reason.id is null then
    raise exception 'The delay reason code is not active and confirmed'
      using errcode = '23514';
  end if;

  v_is_agent_assigned := v_anomaly.assigned_profile_id = v_actor
    or exists (
      select 1
      from public.anomaly_actions aa
      where aa.anomaly_id = v_anomaly.id
        and aa.state = 'pending'
        and aa.assigned_profile_id = v_actor
    );

  if public.has_role('facility_manager') then
    null;
  elsif public.has_role('direction') then
    if v_reason.code <> 'ARBITRATION_OVERDUE' then
      raise exception 'Direction can justify only an active Administration arbitration delay'
        using errcode = '42501';
    end if;
  elsif public.has_role('field_agent') and v_is_agent_assigned then
    null;
  else
    raise exception 'The current profile cannot justify delay on this dossier'
      using errcode = '42501';
  end if;

  select j.* into v_existing
  from public.anomaly_delay_justifications j
  where j.idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.anomaly_id is distinct from v_anomaly.id
      or v_existing.deadline_id is distinct from v_deadline.id
      or v_existing.delay_reason_code_id is distinct from v_reason.id
      or v_existing.reason_detail is distinct from btrim(p_reason_detail)
      or v_existing.declared_by_profile_id is distinct from v_actor
      or v_existing.base_version_no is distinct from p_base_version_no
      or v_existing.client_occurred_at is distinct from p_client_occurred_at then
      raise exception 'The idempotency key was already used with different delay content'
        using errcode = '22023';
    end if;
    return jsonb_build_object(
      'anomaly_id', v_anomaly.id,
      'reference', v_anomaly.reference,
      'justification_id', v_existing.id,
      'justification_state', v_existing.state,
      'version_no', v_anomaly.version_no,
      'replayed', true
    );
  end if;

  if v_anomaly.version_no <> p_base_version_no then
    raise exception 'The dossier version is stale' using errcode = '40001';
  end if;

  select j.* into v_current
  from public.anomaly_delay_justifications j
  where j.deadline_id = v_deadline.id and j.state = 'active'
  for update of j;

  if v_current.id is not null
    and public.has_role('field_agent')
    and not public.has_any_role(array['facility_manager', 'direction'])
    and (
      v_current.declared_by_profile_id is distinct from v_actor
      or v_current.delay_reason_code_id is distinct from v_reason.id
    ) then
    raise exception 'An agent may only complete their own delay justification without changing its code'
      using errcode = '42501';
  end if;

  if v_current.id is not null then
    update public.anomaly_delay_justifications
    set state = 'superseded',
        superseded_by_id = v_new_id,
        superseded_by_profile_id = v_actor,
        superseded_at = clock_timestamp()
    where id = v_current.id;
    v_event_code := 'DELAY_JUSTIFICATION_REPLACED';
    v_event_type := 'delay_justification_replaced';
  else
    v_event_code := 'DELAY_JUSTIFICATION_CREATED';
    v_event_type := 'delay_justification_created';
  end if;

  insert into public.anomaly_delay_justifications(
    id, anomaly_id, deadline_id, delay_reason_code_id, reason_detail,
    state, previous_justification_id, declared_by_profile_id,
    idempotency_key, base_version_no, client_occurred_at
  ) values (
    v_new_id, v_anomaly.id, v_deadline.id, v_reason.id, btrim(p_reason_detail),
    'active', v_current.id, v_actor,
    p_idempotency_key, p_base_version_no, p_client_occurred_at
  );

  select p.display_name into v_actor_label from public.profiles p where p.id = v_actor;
  select s.stage_id into v_stage_id
  from public.status_definitions s where s.id = v_anomaly.current_status_id;
  select e.id into v_event_definition_id
  from public.business_event_definitions e where e.code = v_event_code and e.is_active;

  insert into public.anomaly_history(
    anomaly_id, event_type, event_definition_id, workflow_stage_id,
    actor_profile_id, actor_label_snapshot, comment, change_set,
    source_table, source_record_id, idempotency_key,
    client_occurred_at, server_received_at
  ) values (
    v_anomaly.id, v_event_type, v_event_definition_id, v_stage_id,
    v_actor, v_actor_label, btrim(p_reason_detail),
    jsonb_build_object(
      'deadline_id', v_deadline.id,
      'old_justification_id', v_current.id,
      'new_justification_id', v_new_id,
      'reason_code', v_reason.code,
      'due_at', v_deadline.due_at
    ),
    'anomaly_delay_justifications', v_new_id, p_idempotency_key,
    p_client_occurred_at, clock_timestamp()
  );

  update public.anomalies
  set updated_at = clock_timestamp()
  where id = v_anomaly.id
  returning version_no into v_new_version;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'justification_id', v_new_id,
    'justification_state', 'active',
    'version_no', v_new_version,
    'replayed', false
  );
end;
$$;

revoke all on function private.validate_anomaly_block_row() from public, anon, authenticated;
revoke all on function private.validate_delay_justification_row() from public, anon, authenticated;
revoke all on function private.prevent_close_with_active_block() from public, anon, authenticated;
revoke all on function public.declare_anomaly_block(text, text, text, text, uuid, uuid, text, uuid, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.propose_anomaly_block_resolution(text, uuid, text, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.confirm_anomaly_block_resolution(text, uuid, text, text, uuid, integer, timestamptz) from public, anon, authenticated;
revoke all on function public.record_anomaly_delay_justification(text, uuid, text, text, uuid, integer, timestamptz) from public, anon, authenticated;
grant execute on function public.declare_anomaly_block(text, text, text, text, uuid, uuid, text, uuid, uuid, integer, timestamptz) to authenticated;
grant execute on function public.propose_anomaly_block_resolution(text, uuid, text, uuid, integer, timestamptz) to authenticated;
grant execute on function public.confirm_anomaly_block_resolution(text, uuid, text, text, uuid, integer, timestamptz) to authenticated;
grant execute on function public.record_anomaly_delay_justification(text, uuid, text, text, uuid, integer, timestamptz) to authenticated;

commit;
