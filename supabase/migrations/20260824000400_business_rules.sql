begin;

create or replace function public.current_profile_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.id
  from public.profiles p
  where p.auth_user_id = auth.uid()
    and p.account_status = 'active'
  limit 1;
$$;

create or replace function public.has_role(p_role_code text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = public.current_profile_id()
      and r.code = p_role_code
      and r.is_active
      and ur.valid_from <= now()
      and (ur.valid_until is null or ur.valid_until > now())
  );
$$;

create or replace function public.has_any_role(p_role_codes text[])
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id
    where ur.profile_id = public.current_profile_id()
      and r.code = any(p_role_codes)
      and r.is_active
      and ur.valid_from <= now()
      and (ur.valid_until is null or ur.valid_until > now())
  );
$$;

create or replace function public.assign_business_reference()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reference is null or btrim(new.reference) = '' then
    new.reference := public.next_business_reference(tg_argv[0]);
  end if;
  return new;
end;
$$;

create or replace function public.resolve_sla_deadlines(
  p_priority_id uuid,
  p_category_id uuid,
  p_equipment_id uuid,
  p_started_at timestamptz default now()
)
returns table(qualification_due_at timestamptz, intervention_due_at timestamptz)
language sql
stable
set search_path = public, pg_temp
as $$
  select
    p_started_at + make_interval(mins => sr.qualification_minutes),
    p_started_at + make_interval(mins => sr.internal_intervention_minutes)
  from public.sla_rules sr
  where sr.is_active
    and sr.priority_id = p_priority_id
    and (sr.category_id is null or sr.category_id = p_category_id)
    and (sr.equipment_id is null or sr.equipment_id = p_equipment_id)
    and sr.effective_from <= p_started_at::date
    and (sr.effective_to is null or sr.effective_to >= p_started_at::date)
  order by
    (sr.equipment_id is not null) desc,
    (sr.category_id is not null) desc,
    sr.effective_from desc
  limit 1;
$$;

create or replace function public.has_accepted_proof(p_anomaly_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.proofs p
    left join public.work_orders wo on wo.id = p.work_order_id
    left join public.interventions i on i.id = p.intervention_id
    where p.verification_status = 'accepted'
      and (
        p.anomaly_id = p_anomaly_id
        or wo.anomaly_id = p_anomaly_id
        or i.anomaly_id = p_anomaly_id
      )
  );
$$;

create or replace function public.prepare_anomaly()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
declare
  v_is_closed boolean;
  v_is_critical boolean;
  v_qualification_due_at timestamptz;
  v_intervention_due_at timestamptz;
begin
  if tg_op = 'INSERT' then
    if new.reference is null or btrim(new.reference) = '' then
      new.reference := public.next_business_reference('ANO');
    end if;

    if new.qualification_due_at is null or new.intervention_due_at is null then
      select d.qualification_due_at, d.intervention_due_at
      into v_qualification_due_at, v_intervention_due_at
      from public.resolve_sla_deadlines(
        new.priority_id,
        new.category_id,
        new.equipment_id,
        new.detected_at
      ) d;

      new.qualification_due_at := coalesce(new.qualification_due_at, v_qualification_due_at);
      new.intervention_due_at := coalesce(new.intervention_due_at, v_intervention_due_at);
    end if;
  else
    new.version_no := old.version_no + 1;

    if new.current_status_id is distinct from old.current_status_id
       and not exists (
         select 1
         from public.status_transitions st
         where st.from_status_id = old.current_status_id
           and st.to_status_id = new.current_status_id
           and st.is_active
       ) then
      raise exception 'Workflow transition is not allowed'
        using errcode = '23514';
    end if;
  end if;

  select sd.is_closed, pd.is_critical
  into v_is_closed, v_is_critical
  from public.status_definitions sd
  cross join public.priority_definitions pd
  where sd.id = new.current_status_id
    and pd.id = new.priority_id;

  if v_is_closed then
    if new.recovery_state = 'temporary_reset' then
      raise exception 'A temporary reset is a provisional recovery and cannot close an anomaly'
        using errcode = '23514';
    end if;

    if v_is_critical and not public.has_accepted_proof(new.id) then
      raise exception 'A critical anomaly cannot be closed without an accepted proof'
        using errcode = '23514';
    end if;

    new.resolved_at := coalesce(new.resolved_at, now());
    new.closed_at := coalesce(new.closed_at, now());
  else
    new.closed_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_anomaly on public.anomalies;
create trigger prepare_anomaly
before insert or update on public.anomalies
for each row execute function public.prepare_anomaly();

create or replace function public.record_anomaly_history()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text := 'updated';
begin
  if tg_op = 'INSERT' then
    v_event_type := 'created';
  elsif new.current_status_id is distinct from old.current_status_id then
    v_event_type := 'status_changed';
  elsif new.priority_id is distinct from old.priority_id then
    v_event_type := 'priority_changed';
  elsif new.assigned_profile_id is distinct from old.assigned_profile_id
     or new.assigned_vendor_id is distinct from old.assigned_vendor_id then
    v_event_type := 'assignment_changed';
  elsif new.recovery_state is distinct from old.recovery_state then
    v_event_type := 'recovery_changed';
  end if;

  insert into public.anomaly_history(
    anomaly_id,
    event_type,
    from_status_id,
    to_status_id,
    actor_profile_id,
    change_set
  ) values (
    new.id,
    v_event_type,
    case when tg_op = 'UPDATE' then old.current_status_id end,
    new.current_status_id,
    public.current_profile_id(),
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
    end
  );
  return new;
end;
$$;

drop trigger if exists record_anomaly_history on public.anomalies;
create trigger record_anomaly_history
after insert or update of current_status_id, priority_id, assigned_profile_id, assigned_vendor_id, recovery_state
on public.anomalies
for each row execute function public.record_anomaly_history();

create or replace function public.apply_intervention_recovery()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.recovery_type = 'temporary_reset' then
    update public.anomalies
    set recovery_state = 'temporary_reset',
        temporary_restored_at = coalesce(new.ended_at, now()),
        resolved_at = null,
        closed_at = null
    where id = new.anomaly_id;
  elsif new.recovery_type in ('restored', 'permanent_repair') then
    update public.anomalies
    set recovery_state = new.recovery_type,
        temporary_restored_at = null,
        resolved_at = case when new.outcome = 'resolved' then coalesce(new.ended_at, now()) else resolved_at end
    where id = new.anomaly_id;
  end if;
  return new;
end;
$$;

drop trigger if exists apply_intervention_recovery on public.interventions;
create trigger apply_intervention_recovery
after insert or update of recovery_type, outcome, ended_at on public.interventions
for each row execute function public.apply_intervention_recovery();

create or replace function public.guard_closed_critical_proof()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_anomaly_id uuid;
  v_is_closed_critical boolean;
begin
  v_anomaly_id := coalesce(old.anomaly_id, new.anomaly_id);
  if v_anomaly_id is null then
    select coalesce(wo.anomaly_id, i.anomaly_id)
    into v_anomaly_id
    from (select coalesce(old.work_order_id, new.work_order_id) work_order_id,
                 coalesce(old.intervention_id, new.intervention_id) intervention_id) x
    left join public.work_orders wo on wo.id = x.work_order_id
    left join public.interventions i on i.id = x.intervention_id;
  end if;

  if v_anomaly_id is null then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  select sd.is_closed and pd.is_critical
  into v_is_closed_critical
  from public.anomalies a
  join public.status_definitions sd on sd.id = a.current_status_id
  join public.priority_definitions pd on pd.id = a.priority_id
  where a.id = v_anomaly_id;

  if coalesce(v_is_closed_critical, false) and not public.has_accepted_proof(v_anomaly_id) then
    raise exception 'The last accepted proof of a closed critical anomaly cannot be removed or rejected'
      using errcode = '23514';
  end if;
  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

drop trigger if exists guard_closed_critical_proof on public.proofs;
create constraint trigger guard_closed_critical_proof
after delete or update
on public.proofs
deferrable initially immediate
for each row execute function public.guard_closed_critical_proof();

create or replace function public.validate_cost_approval()
returns trigger
language plpgsql
set search_path = public, auth, pg_temp
as $$
begin
  if new.approval_status = 'approved'
     and (tg_op = 'INSERT' or old.approval_status is distinct from new.approval_status)
     and auth.uid() is not null
     and not public.has_role('direction') then
    raise exception 'Only Direction can approve a cost'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists validate_cost_approval on public.costs;
create trigger validate_cost_approval
before insert or update of approval_status on public.costs
for each row execute function public.validate_cost_approval();

create or replace function public.capture_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_old jsonb;
  v_new jsonb;
  v_record_id uuid;
  v_changed_fields text[] := '{}'::text[];
  v_headers text;
begin
  if current_setting('app.seed_mode', true) = 'on' then
    if tg_op = 'DELETE' then return old; else return new; end if;
  end if;

  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;
  v_record_id := coalesce(new.id, old.id);

  if tg_op = 'UPDATE' then
    select coalesce(array_agg(k order by k), '{}'::text[])
    into v_changed_fields
    from (
      select jsonb_object_keys(coalesce(v_old, '{}'::jsonb) || coalesce(v_new, '{}'::jsonb)) k
    ) keys
    where v_old -> k is distinct from v_new -> k;
  end if;

  v_headers := nullif(current_setting('request.headers', true), '');

  insert into public.audit_events(
    table_name,
    record_id,
    event_type,
    actor_auth_user_id,
    actor_profile_id,
    old_data,
    new_data,
    changed_fields,
    request_id
  ) values (
    tg_table_name,
    v_record_id,
    tg_op,
    auth.uid(),
    public.current_profile_id(),
    v_old,
    v_new,
    v_changed_fields,
    case when v_headers is null then null else v_headers::jsonb ->> 'x-request-id' end
  );

  if tg_op = 'DELETE' then return old; else return new; end if;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'profiles', 'user_roles', 'equipment', 'zones', 'vendors', 'sla_rules',
    'status_definitions', 'threshold_rules', 'notification_rules', 'reports',
    'anomalies', 'qualifications', 'work_orders', 'interventions', 'proofs', 'costs'
  ] loop
    execute format('drop trigger if exists audit_%I on public.%I', v_table, v_table);
    execute format(
      'create trigger audit_%I after insert or update or delete on public.%I for each row execute function public.capture_audit_event()',
      v_table,
      v_table
    );
  end loop;
end;
$$;

do $$
declare
  v_table text;
  v_prefix text;
begin
  for v_table, v_prefix in
    select * from (values
      ('report_imports', 'IMP'),
      ('reports', 'REP'),
      ('work_orders', 'OT'),
      ('interventions', 'INT'),
      ('proofs', 'PRV'),
      ('costs', 'CST'),
      ('notifications', 'NTF')
    ) as refs(table_name, prefix)
  loop
    execute format('drop trigger if exists assign_%I_reference on public.%I', v_table, v_table);
    execute format(
      'create trigger assign_%I_reference before insert on public.%I for each row execute function public.assign_business_reference(%L)',
      v_table,
      v_table,
      v_prefix
    );
  end loop;
end;
$$;

revoke all on function public.current_profile_id() from public;
revoke all on function public.has_role(text) from public;
revoke all on function public.has_any_role(text[]) from public;
revoke all on function public.has_accepted_proof(uuid) from public;
grant execute on function public.current_profile_id() to authenticated, service_role;
grant execute on function public.has_role(text) to authenticated, service_role;
grant execute on function public.has_any_role(text[]) to authenticated, service_role;
grant execute on function public.has_accepted_proof(uuid) to authenticated, service_role;

commit;
