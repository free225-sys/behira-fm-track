begin;

-- C10-A establishes one canonical financial threshold and one auditable path
-- from a dossier to a cost decision. It does not create a new workflow stage.

create table if not exists public.business_parameters (
  id uuid primary key default gen_random_uuid(),
  code text not null check (code ~ '^[a-z0-9_]+$'),
  label text not null,
  numeric_value numeric(14,2) not null check (numeric_value >= 0),
  unit text not null,
  effective_from timestamptz not null default clock_timestamp(),
  effective_to timestamptz,
  created_by_profile_id uuid references public.profiles(id) on delete restrict,
  justification text not null check (length(btrim(justification)) > 0),
  source_document text not null,
  created_at timestamptz not null default clock_timestamp(),
  check (effective_to is null or effective_to > effective_from)
);

create unique index if not exists business_parameters_one_active_code_idx
  on public.business_parameters(code)
  where effective_to is null;

create index if not exists business_parameters_history_idx
  on public.business_parameters(code, effective_from desc);

create index if not exists business_parameters_created_by_idx
  on public.business_parameters(created_by_profile_id)
  where created_by_profile_id is not null;

insert into public.business_parameters(
  code, label, numeric_value, unit, effective_from,
  created_by_profile_id, justification, source_document
)
select
  'financial_decision_threshold',
  'Seuil de décision de l’Administration',
  400000,
  'FCFA',
  clock_timestamp(),
  null,
  'Seuil métier confirmé par DEC-014 ; première version canonique C10.',
  'docs/design/DECISIONS.md#DEC-014'
where not exists (
  select 1
  from public.business_parameters
  where code = 'financial_decision_threshold'
    and effective_to is null
);

alter table public.costs
  add column if not exists threshold_parameter_id uuid references public.business_parameters(id) on delete restrict,
  add column if not exists threshold_amount_snapshot numeric(14,2),
  add column if not exists decision_scope text,
  add column if not exists reviewed_by_profile_id uuid references public.profiles(id) on delete restrict,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_comment text,
  add column if not exists submission_idempotency_key uuid,
  add column if not exists review_idempotency_key uuid;

alter table public.costs
  drop constraint if exists costs_decision_scope_check;
alter table public.costs
  add constraint costs_decision_scope_check
  check (decision_scope is null or decision_scope in ('facility_manager', 'administration'));

alter table public.costs
  drop constraint if exists costs_decision_snapshot_check;
alter table public.costs
  add constraint costs_decision_snapshot_check
  check (
    decision_scope is null
    or (
      threshold_parameter_id is not null
      and threshold_amount_snapshot is not null
      and threshold_amount_snapshot > 0
    )
  );

alter table public.costs
  drop constraint if exists costs_decision_review_check;
alter table public.costs
  add constraint costs_decision_review_check
  check (
    decision_scope is null
    or (
      (approval_status = 'pending'
        and reviewed_by_profile_id is null
        and reviewed_at is null
        and review_comment is null)
      or
      (approval_status in ('approved', 'rejected')
        and reviewed_by_profile_id is not null
        and reviewed_at is not null
        and nullif(btrim(review_comment), '') is not null)
    )
  );

create unique index if not exists costs_submission_idempotency_idx
  on public.costs(submitted_by_profile_id, submission_idempotency_key)
  where submission_idempotency_key is not null;

create unique index if not exists costs_review_idempotency_idx
  on public.costs(review_idempotency_key)
  where review_idempotency_key is not null;

create index if not exists costs_decision_queue_idx
  on public.costs(decision_scope, approval_status, created_at desc)
  where decision_scope is not null;

create index if not exists costs_threshold_parameter_idx
  on public.costs(threshold_parameter_id)
  where threshold_parameter_id is not null;

create index if not exists costs_reviewed_by_profile_idx
  on public.costs(reviewed_by_profile_id)
  where reviewed_by_profile_id is not null;

insert into public.business_event_definitions(
  code, label, is_activity, is_sensitive, is_active,
  validation_status, sort_order, source_document
) values
  ('COST_SUBMITTED', 'Coût soumis', true, true, true, 'confirmed', 210, 'C10_FINANCIAL_DECISIONS'),
  ('COST_APPROVED', 'Coût approuvé', true, true, true, 'confirmed', 220, 'C10_FINANCIAL_DECISIONS'),
  ('COST_REJECTED', 'Coût refusé', true, true, true, 'confirmed', 230, 'C10_FINANCIAL_DECISIONS')
on conflict (code) do update set
  label = excluded.label,
  is_activity = excluded.is_activity,
  is_sensitive = excluded.is_sensitive,
  is_active = excluded.is_active,
  validation_status = excluded.validation_status,
  sort_order = excluded.sort_order,
  source_document = excluded.source_document;

create or replace function public.financial_decision_threshold_fcfa()
returns numeric
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select bp.numeric_value
  from public.business_parameters bp
  where bp.code = 'financial_decision_threshold'
    and bp.effective_to is null
    and bp.effective_from <= clock_timestamp()
  order by bp.effective_from desc, bp.id desc
  limit 1;
$$;

create or replace function public.prepare_cost_decision()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_parameter public.business_parameters%rowtype;
  v_actor uuid;
begin
  if new.cost_type <> 'estimate' then
    return new;
  end if;

  if new.anomaly_id is null then
    raise exception 'A financial decision estimate must be attached to an anomaly'
      using errcode = '23514';
  end if;

  if new.amount <= 0 then
    raise exception 'A financial decision amount must be greater than zero'
      using errcode = '23514';
  end if;

  select * into v_parameter
  from public.business_parameters
  where code = 'financial_decision_threshold'
    and effective_to is null
    and effective_from <= clock_timestamp()
  order by effective_from desc, id desc
  limit 1;

  if v_parameter.id is null then
    raise exception 'The canonical financial decision threshold is unavailable'
      using errcode = '55000';
  end if;

  v_actor := public.current_profile_id();
  if v_actor is null then
    raise exception 'An active internal profile is required'
      using errcode = '42501';
  end if;

  new.submitted_by_profile_id := v_actor;
  new.threshold_parameter_id := v_parameter.id;
  new.threshold_amount_snapshot := v_parameter.numeric_value;
  new.decision_scope := case
    when new.amount >= v_parameter.numeric_value then 'administration'
    else 'facility_manager'
  end;

  if new.decision_scope = 'facility_manager' then
    new.approval_status := 'approved';
    new.approved_by_profile_id := v_actor;
    new.approved_at := clock_timestamp();
    new.reviewed_by_profile_id := v_actor;
    new.reviewed_at := new.approved_at;
    new.review_comment := coalesce(
      nullif(btrim(new.review_comment), ''),
      'Décision enregistrée dans la délégation du Facility Manager.'
    );
  else
    new.approval_status := 'pending';
    new.approved_by_profile_id := null;
    new.approved_at := null;
    new.reviewed_by_profile_id := null;
    new.reviewed_at := null;
    new.review_comment := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_cost_decision on public.costs;
create trigger prepare_cost_decision
before insert on public.costs
for each row execute function public.prepare_cost_decision();

create or replace function public.validate_cost_approval()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.approval_status in ('approved', 'rejected')
    and (tg_op = 'INSERT' or old.approval_status is distinct from new.approval_status)
    and auth.uid() is not null then
    if new.decision_scope = 'facility_manager'
      and not public.has_any_role(array['facility_manager', 'direction']) then
      raise exception 'Only the Facility Manager can decide within the delegation'
        using errcode = '42501';
    elsif new.decision_scope = 'administration'
      and not public.has_role('direction') then
      raise exception 'Only the Administration can review this financial decision'
        using errcode = '42501';
    elsif new.decision_scope is null
      and new.approval_status = 'approved'
      and not public.has_role('direction') then
      raise exception 'Only Direction can approve a legacy cost'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.guard_cost_decision_update()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if old.decision_scope is null then
    return new;
  end if;

  if new.anomaly_id is distinct from old.anomaly_id
    or new.work_order_id is distinct from old.work_order_id
    or new.intervention_id is distinct from old.intervention_id
    or new.vendor_id is distinct from old.vendor_id
    or new.cost_type is distinct from old.cost_type
    or new.budget_type is distinct from old.budget_type
    or new.amount is distinct from old.amount
    or new.currency is distinct from old.currency
    or new.description is distinct from old.description
    or new.submitted_by_profile_id is distinct from old.submitted_by_profile_id
    or new.threshold_parameter_id is distinct from old.threshold_parameter_id
    or new.threshold_amount_snapshot is distinct from old.threshold_amount_snapshot
    or new.decision_scope is distinct from old.decision_scope
    or new.submission_idempotency_key is distinct from old.submission_idempotency_key then
    raise exception 'A submitted financial decision is immutable; create a new cost record'
      using errcode = '23514';
  end if;

  if old.approval_status <> 'pending' then
    if new is distinct from old then
      raise exception 'A financial review decision is final'
        using errcode = '23514';
    end if;
    return new;
  end if;

  if new.approval_status not in ('approved', 'rejected') then
    raise exception 'A pending financial decision may only be approved or rejected'
      using errcode = '23514';
  end if;

  if old.decision_scope = 'administration' and not public.has_role('direction') then
    raise exception 'Only the Administration can review this financial decision'
      using errcode = '42501';
  end if;

  if nullif(btrim(new.review_comment), '') is null then
    raise exception 'A motivated financial decision is required'
      using errcode = '23514';
  end if;

  if new.reviewed_by_profile_id is distinct from public.current_profile_id()
    or new.reviewed_at is null
    or new.review_idempotency_key is null then
    raise exception 'The financial review audit fields are incomplete'
      using errcode = '23514';
  end if;

  if new.approval_status = 'approved' then
    if new.approved_by_profile_id is distinct from new.reviewed_by_profile_id
      or new.approved_at is distinct from new.reviewed_at then
      raise exception 'The financial approval audit fields are inconsistent'
        using errcode = '23514';
    end if;
  elsif new.approved_by_profile_id is not null or new.approved_at is not null then
    raise exception 'A rejected cost cannot carry approval fields'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists guard_cost_decision_update on public.costs;
create trigger guard_cost_decision_update
before update on public.costs
for each row execute function public.guard_cost_decision_update();

create or replace function public.capture_cost_decision_history()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid;
  v_actor_label text;
  v_stage uuid;
  v_event uuid;
  v_event_code text;
  v_comment text;
begin
  if new.decision_scope is null or new.anomaly_id is null then
    return new;
  end if;

  select sd.stage_id into v_stage
  from public.anomalies a
  join public.status_definitions sd on sd.id = a.current_status_id
  where a.id = new.anomaly_id;

  if tg_op = 'INSERT' then
    v_actor := new.submitted_by_profile_id;
    select display_name into v_actor_label from public.profiles where id = v_actor;
    select id into v_event from public.business_event_definitions
      where code = 'COST_SUBMITTED' and is_active;

    insert into public.anomaly_history(
      anomaly_id, event_type, actor_profile_id, actor_label_snapshot,
      comment, change_set, occurred_at, event_definition_id,
      workflow_stage_id, source_table, source_record_id
    ) values (
      new.anomaly_id, 'cost_submitted', v_actor, v_actor_label,
      new.description,
      jsonb_build_object(
        'cost_reference', new.reference,
        'amount', new.amount,
        'currency', new.currency,
        'budget_type', new.budget_type,
        'decision_scope', new.decision_scope,
        'threshold_snapshot', new.threshold_amount_snapshot,
        'approval_status', new.approval_status
      ),
      new.created_at, v_event, v_stage, 'costs', new.id
    );

    if new.approval_status = 'approved' then
      select id into v_event from public.business_event_definitions
        where code = 'COST_APPROVED' and is_active;
      insert into public.anomaly_history(
        anomaly_id, event_type, actor_profile_id, actor_label_snapshot,
        comment, change_set, occurred_at, event_definition_id,
        workflow_stage_id, source_table, source_record_id
      ) values (
        new.anomaly_id, 'cost_approved', new.reviewed_by_profile_id, v_actor_label,
        new.review_comment,
        jsonb_build_object(
          'cost_reference', new.reference,
          'amount', new.amount,
          'decision_scope', new.decision_scope,
          'approval_status', new.approval_status
        ),
        new.reviewed_at, v_event, v_stage, 'costs', new.id
      );
    end if;
  elsif new.approval_status is distinct from old.approval_status then
    v_actor := new.reviewed_by_profile_id;
    select display_name into v_actor_label from public.profiles where id = v_actor;
    v_event_code := case when new.approval_status = 'approved'
      then 'COST_APPROVED' else 'COST_REJECTED' end;
    v_comment := new.review_comment;
    select id into v_event from public.business_event_definitions
      where code = v_event_code and is_active;

    insert into public.anomaly_history(
      anomaly_id, event_type, actor_profile_id, actor_label_snapshot,
      comment, change_set, occurred_at, event_definition_id,
      workflow_stage_id, source_table, source_record_id
    ) values (
      new.anomaly_id,
      case when new.approval_status = 'approved' then 'cost_approved' else 'cost_rejected' end,
      v_actor, v_actor_label, v_comment,
      jsonb_build_object(
        'cost_reference', new.reference,
        'amount', new.amount,
        'decision_scope', new.decision_scope,
        'old_approval_status', old.approval_status,
        'new_approval_status', new.approval_status
      ),
      new.reviewed_at, v_event, v_stage, 'costs', new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists capture_cost_decision_history on public.costs;
create trigger capture_cost_decision_history
after insert or update of approval_status on public.costs
for each row execute function public.capture_cost_decision_history();

create or replace function public.submit_anomaly_cost_decision(
  p_anomaly_reference text,
  p_amount numeric,
  p_budget_type text,
  p_description text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid;
  v_anomaly public.anomalies%rowtype;
  v_existing public.costs%rowtype;
  v_cost public.costs%rowtype;
begin
  if not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can submit a financial decision'
      using errcode = '42501';
  end if;

  if p_idempotency_key is null then
    raise exception 'An idempotency key is required' using errcode = '22023';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'The amount must be greater than zero' using errcode = '22023';
  end if;
  if p_budget_type not in ('opex', 'capex') then
    raise exception 'Invalid budget type' using errcode = '22023';
  end if;
  if nullif(btrim(p_description), '') is null then
    raise exception 'A financial decision reason is required' using errcode = '22023';
  end if;

  v_actor := public.current_profile_id();
  select * into v_existing
  from public.costs
  where submitted_by_profile_id = v_actor
    and submission_idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.amount is distinct from p_amount
      or v_existing.budget_type is distinct from p_budget_type
      or v_existing.description is distinct from btrim(p_description)
      or not exists (
        select 1 from public.anomalies a
        where a.id = v_existing.anomaly_id
          and a.reference = p_anomaly_reference
      ) then
      raise exception 'The idempotency key was already used with another payload'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'cost_id', v_existing.id,
      'cost_reference', v_existing.reference,
      'approval_status', v_existing.approval_status,
      'decision_scope', v_existing.decision_scope,
      'threshold_amount', v_existing.threshold_amount_snapshot,
      'replayed', true
    );
  end if;

  select * into v_anomaly
  from public.anomalies
  where reference = p_anomaly_reference
  for share;

  if v_anomaly.id is null or not public.can_access_anomaly(v_anomaly.id) then
    raise exception 'Dossier not found or not accessible' using errcode = '42501';
  end if;
  if v_anomaly.closed_at is not null then
    raise exception 'A closed dossier cannot receive a new financial decision'
      using errcode = '23514';
  end if;

  insert into public.costs(
    reference, anomaly_id, cost_type, budget_type, amount, currency,
    approval_status, submitted_by_profile_id, description,
    review_comment, submission_idempotency_key
  ) values (
    null, v_anomaly.id, 'estimate', p_budget_type, p_amount, 'XOF',
    'pending', v_actor, btrim(p_description),
    case when p_amount < public.financial_decision_threshold_fcfa()
      then btrim(p_description) else null end,
    p_idempotency_key
  ) returning * into v_cost;

  return jsonb_build_object(
    'cost_id', v_cost.id,
    'cost_reference', v_cost.reference,
    'approval_status', v_cost.approval_status,
    'decision_scope', v_cost.decision_scope,
    'threshold_amount', v_cost.threshold_amount_snapshot,
    'replayed', false
  );
end;
$$;

create or replace function public.review_anomaly_cost_decision(
  p_cost_reference text,
  p_decision text,
  p_comment text,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security invoker
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid;
  v_cost public.costs%rowtype;
  v_existing public.costs%rowtype;
  v_reviewed_at timestamptz;
begin
  if not public.has_role('direction') then
    raise exception 'Only the Administration can review this financial decision'
      using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected') then
    raise exception 'Invalid financial review decision' using errcode = '22023';
  end if;
  if nullif(btrim(p_comment), '') is null then
    raise exception 'A motivated financial decision is required' using errcode = '22023';
  end if;
  if p_idempotency_key is null then
    raise exception 'An idempotency key is required' using errcode = '22023';
  end if;

  select * into v_existing
  from public.costs
  where review_idempotency_key = p_idempotency_key;

  if v_existing.id is not null then
    if v_existing.reference is distinct from p_cost_reference
      or v_existing.approval_status is distinct from p_decision
      or v_existing.review_comment is distinct from btrim(p_comment) then
      raise exception 'The review idempotency key was already used with another payload'
        using errcode = '23505';
    end if;

    return jsonb_build_object(
      'cost_id', v_existing.id,
      'cost_reference', v_existing.reference,
      'approval_status', v_existing.approval_status,
      'replayed', true
    );
  end if;

  select * into v_cost
  from public.costs
  where reference = p_cost_reference
  for update;

  if v_cost.id is null then
    raise exception 'Financial decision not found' using errcode = 'P0002';
  end if;
  if v_cost.decision_scope <> 'administration' then
    raise exception 'This financial decision is not assigned to the Administration'
      using errcode = '23514';
  end if;
  if v_cost.approval_status <> 'pending' then
    raise exception 'The financial decision already has a final status'
      using errcode = '23514';
  end if;

  v_actor := public.current_profile_id();
  v_reviewed_at := clock_timestamp();

  update public.costs
  set approval_status = p_decision,
      reviewed_by_profile_id = v_actor,
      reviewed_at = v_reviewed_at,
      review_comment = btrim(p_comment),
      review_idempotency_key = p_idempotency_key,
      approved_by_profile_id = case when p_decision = 'approved' then v_actor else null end,
      approved_at = case when p_decision = 'approved' then v_reviewed_at else null end
  where id = v_cost.id
  returning * into v_cost;

  return jsonb_build_object(
    'cost_id', v_cost.id,
    'cost_reference', v_cost.reference,
    'approval_status', v_cost.approval_status,
    'replayed', false
  );
end;
$$;

alter table public.business_parameters enable row level security;

drop policy if exists business_parameters_read on public.business_parameters;
create policy business_parameters_read
on public.business_parameters for select to authenticated
using (public.has_any_role(array['direction', 'facility_manager']));

drop policy if exists costs_create on public.costs;
create policy costs_create
on public.costs for insert to authenticated
with check (
  public.has_role('facility_manager')
  and submitted_by_profile_id = public.current_profile_id()
  and cost_type = 'estimate'
  and vendor_id is null
  and anomaly_id is not null
  and public.can_access_anomaly(anomaly_id)
);

drop policy if exists costs_manage on public.costs;
create policy costs_manage
on public.costs for update to authenticated
using (public.has_any_role(array['direction', 'facility_manager']))
with check (public.has_any_role(array['direction', 'facility_manager']));

revoke all on table public.business_parameters from anon, authenticated;
grant select on table public.business_parameters to authenticated;
grant select, insert, update on table public.business_parameters to service_role;

revoke all on function public.financial_decision_threshold_fcfa() from public, anon;
revoke all on function public.submit_anomaly_cost_decision(text, numeric, text, text, uuid) from public, anon;
revoke all on function public.review_anomaly_cost_decision(text, text, text, uuid) from public, anon;
revoke all on function public.prepare_cost_decision() from public, anon, authenticated;
revoke all on function public.guard_cost_decision_update() from public, anon, authenticated;
revoke all on function public.capture_cost_decision_history() from public, anon, authenticated;

grant execute on function public.financial_decision_threshold_fcfa() to authenticated, service_role;
grant execute on function public.submit_anomaly_cost_decision(text, numeric, text, text, uuid) to authenticated, service_role;
grant execute on function public.review_anomaly_cost_decision(text, text, text, uuid) to authenticated, service_role;

commit;
