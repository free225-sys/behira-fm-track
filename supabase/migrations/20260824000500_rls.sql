begin;

create or replace function public.current_vendor_id()
returns uuid
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select p.vendor_id
  from public.profiles p
  where p.id = public.current_profile_id()
  limit 1;
$$;

create or replace function public.can_access_zone(p_zone_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    public.has_any_role(array['direction', 'facility_manager', 'read_only'])
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.profile_id = public.current_profile_id()
        and r.code = 'field_agent'
        and ur.zone_id = p_zone_id
        and ur.valid_from <= now()
        and (ur.valid_until is null or ur.valid_until > now())
    );
$$;

create or replace function public.can_access_equipment(p_equipment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    public.has_any_role(array['direction', 'facility_manager', 'read_only'])
    or exists (
      select 1
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id
      where ur.profile_id = public.current_profile_id()
        and r.code = 'field_agent'
        and ur.equipment_id = p_equipment_id
        and ur.valid_from <= now()
        and (ur.valid_until is null or ur.valid_until > now())
    );
$$;

create or replace function public.can_access_anomaly(p_anomaly_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.anomalies a
    where a.id = p_anomaly_id
      and (
        public.has_any_role(array['direction', 'facility_manager', 'read_only'])
        or (
          public.has_role('field_agent')
          and (
            a.reported_by_profile_id = public.current_profile_id()
            or a.assigned_profile_id = public.current_profile_id()
            or public.can_access_equipment(a.equipment_id)
            or public.can_access_zone(a.zone_id)
          )
        )
        or (
          public.has_role('vendor')
          and (
            a.assigned_vendor_id = public.current_vendor_id()
            or exists (
              select 1 from public.work_orders wo
              where wo.anomaly_id = a.id
                and wo.assigned_vendor_id = public.current_vendor_id()
            )
          )
        )
      )
  );
$$;

create or replace function public.can_access_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.reports r
    where r.id = p_report_id
      and (
        public.has_any_role(array['direction', 'facility_manager', 'read_only'])
        or (
          public.has_role('field_agent')
          and (
            r.reported_by_profile_id = public.current_profile_id()
            or public.can_access_equipment(r.equipment_id)
            or public.can_access_zone(r.zone_id)
          )
        )
      )
  );
$$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  update public.notifications n
  set status = 'read', read_at = coalesce(read_at, now())
  where n.id = p_notification_id
    and (
      n.recipient_profile_id = public.current_profile_id()
      or n.recipient_vendor_id = public.current_vendor_id()
      or exists (
        select 1
        from public.user_roles ur
        where ur.profile_id = public.current_profile_id()
          and ur.role_id = n.recipient_role_id
          and ur.valid_from <= now()
          and (ur.valid_until is null or ur.valid_until > now())
      )
    );

  if not found then
    raise exception 'Notification not found or not accessible'
      using errcode = '42501';
  end if;
end;
$$;

create or replace function public.validate_anomaly_risk(
  p_anomaly_id uuid,
  p_decision text,
  p_comment text
)
returns void
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if not public.has_role('direction') then
    raise exception 'Only Direction can validate a risk decision'
      using errcode = '42501';
  end if;
  if p_decision not in ('approved', 'rejected', 'not_required') then
    raise exception 'Invalid risk decision'
      using errcode = '22023';
  end if;
  if p_decision in ('approved', 'rejected') and nullif(btrim(p_comment), '') is null then
    raise exception 'A risk validation comment is required'
      using errcode = '23514';
  end if;

  update public.anomalies
  set risk_validation_status = p_decision,
      risk_validation_comment = nullif(btrim(p_comment), ''),
      risk_validated_by_profile_id = case when p_decision = 'not_required' then null else public.current_profile_id() end,
      risk_validated_at = case when p_decision = 'not_required' then null else now() end
  where id = p_anomaly_id;

  if not found then
    raise exception 'Anomaly not found'
      using errcode = 'P0002';
  end if;
end;
$$;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'reference_counters', 'roles', 'vendors', 'zones', 'priority_definitions',
    'categories', 'equipment', 'equipment_zones', 'equipment_vendors',
    'workflow_stages', 'status_definitions', 'status_transitions', 'sla_rules',
    'threshold_rules', 'notification_rules', 'profiles', 'user_roles',
    'report_imports', 'reports', 'report_checks', 'anomalies', 'qualifications',
    'work_orders', 'interventions', 'proofs', 'costs', 'notifications',
    'anomaly_history', 'audit_events'
  ] loop
    execute format('alter table public.%I enable row level security', v_table);
    execute format('revoke all on public.%I from anon', v_table);
  end loop;
end;
$$;

revoke all on public.reference_counters from authenticated;
revoke all on public.audit_events from authenticated;
grant select on public.roles, public.vendors, public.zones, public.priority_definitions,
  public.categories, public.equipment, public.equipment_zones, public.equipment_vendors,
  public.workflow_stages, public.status_definitions, public.status_transitions,
  public.sla_rules, public.threshold_rules, public.notification_rules,
  public.profiles, public.user_roles,
  public.report_imports, public.reports, public.report_checks, public.anomalies,
  public.qualifications, public.work_orders, public.interventions, public.proofs,
  public.costs, public.notifications, public.anomaly_history, public.audit_events
to authenticated;

grant insert, update, delete on public.vendors, public.zones, public.priority_definitions,
  public.categories, public.equipment, public.equipment_zones, public.equipment_vendors,
  public.workflow_stages, public.status_definitions, public.status_transitions,
  public.sla_rules, public.threshold_rules, public.notification_rules
to authenticated;

grant insert, update, delete on public.report_imports, public.reports, public.report_checks,
  public.anomalies, public.qualifications, public.work_orders, public.interventions,
  public.proofs, public.costs
to authenticated;

drop policy if exists reference_read on public.roles;
create policy reference_read on public.roles for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.vendors;
create policy reference_read on public.vendors for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.zones;
create policy reference_read on public.zones for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.priority_definitions;
create policy reference_read on public.priority_definitions for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.categories;
create policy reference_read on public.categories for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.equipment;
create policy reference_read on public.equipment for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.equipment_zones;
create policy reference_read on public.equipment_zones for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.equipment_vendors;
create policy reference_read on public.equipment_vendors for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.workflow_stages;
create policy reference_read on public.workflow_stages for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.status_definitions;
create policy reference_read on public.status_definitions for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.status_transitions;
create policy reference_read on public.status_transitions for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.sla_rules;
create policy reference_read on public.sla_rules for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.threshold_rules;
create policy reference_read on public.threshold_rules for select to authenticated using (public.current_profile_id() is not null);
drop policy if exists reference_read on public.notification_rules;
create policy reference_read on public.notification_rules for select to authenticated using (public.current_profile_id() is not null);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'vendors', 'zones', 'priority_definitions', 'categories', 'equipment',
    'equipment_zones', 'equipment_vendors', 'workflow_stages', 'status_definitions',
    'status_transitions', 'sla_rules', 'threshold_rules', 'notification_rules'
  ] loop
    execute format('drop policy if exists reference_manage on public.%I', v_table);
    execute format(
      'create policy reference_manage on public.%I for all to authenticated using (public.has_role(''facility_manager'')) with check (public.has_role(''facility_manager''))',
      v_table
    );
  end loop;
end;
$$;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (
  id = public.current_profile_id()
  or public.has_any_role(array['direction', 'facility_manager', 'read_only'])
);

drop policy if exists user_roles_read on public.user_roles;
create policy user_roles_read on public.user_roles for select to authenticated
using (
  profile_id = public.current_profile_id()
  or public.has_any_role(array['direction', 'facility_manager', 'read_only'])
);

drop policy if exists report_imports_read on public.report_imports;
create policy report_imports_read on public.report_imports for select to authenticated
using (
  imported_by_profile_id = public.current_profile_id()
  or public.has_any_role(array['direction', 'facility_manager', 'read_only'])
);
drop policy if exists report_imports_write on public.report_imports;
create policy report_imports_write on public.report_imports for insert to authenticated
with check (
  imported_by_profile_id = public.current_profile_id()
  and public.has_any_role(array['field_agent', 'facility_manager'])
);
drop policy if exists report_imports_manage on public.report_imports;
create policy report_imports_manage on public.report_imports for update to authenticated
using (public.has_role('facility_manager')) with check (public.has_role('facility_manager'));

drop policy if exists reports_read on public.reports;
create policy reports_read on public.reports for select to authenticated using (public.can_access_report(id));
drop policy if exists reports_create on public.reports;
create policy reports_create on public.reports for insert to authenticated
with check (
  reported_by_profile_id = public.current_profile_id()
  and public.has_any_role(array['field_agent', 'facility_manager'])
  and (equipment_id is null or public.can_access_equipment(equipment_id) or public.has_role('facility_manager'))
  and (zone_id is null or public.can_access_zone(zone_id) or public.has_role('facility_manager'))
);
drop policy if exists reports_update on public.reports;
create policy reports_update on public.reports for update to authenticated
using (
  public.has_role('facility_manager')
  or (reported_by_profile_id = public.current_profile_id() and report_status = 'draft')
)
with check (
  public.has_role('facility_manager')
  or (
    reported_by_profile_id = public.current_profile_id()
    and report_status in ('draft', 'submitted')
  )
);

drop policy if exists report_checks_read on public.report_checks;
create policy report_checks_read on public.report_checks for select to authenticated using (public.can_access_report(report_id));
drop policy if exists report_checks_write on public.report_checks;
create policy report_checks_write on public.report_checks for all to authenticated
using (
  public.has_role('facility_manager')
  or exists (select 1 from public.reports r where r.id = report_id and r.reported_by_profile_id = public.current_profile_id() and r.report_status = 'draft')
)
with check (
  public.has_role('facility_manager')
  or exists (select 1 from public.reports r where r.id = report_id and r.reported_by_profile_id = public.current_profile_id() and r.report_status = 'draft')
);

drop policy if exists anomalies_read on public.anomalies;
create policy anomalies_read on public.anomalies for select to authenticated using (public.can_access_anomaly(id));
drop policy if exists anomalies_create on public.anomalies;
create policy anomalies_create on public.anomalies for insert to authenticated
with check (
  public.has_any_role(array['direction', 'facility_manager'])
  or (
    public.has_role('field_agent')
    and reported_by_profile_id = public.current_profile_id()
    and (equipment_id is null or public.can_access_equipment(equipment_id))
    and (zone_id is null or public.can_access_zone(zone_id))
  )
);
drop policy if exists anomalies_manage on public.anomalies;
create policy anomalies_manage on public.anomalies for update to authenticated
using (public.has_role('facility_manager'))
with check (public.has_role('facility_manager'));

drop policy if exists anomaly_history_read on public.anomaly_history;
create policy anomaly_history_read on public.anomaly_history for select to authenticated using (public.can_access_anomaly(anomaly_id));

drop policy if exists qualifications_read on public.qualifications;
create policy qualifications_read on public.qualifications for select to authenticated using (public.can_access_anomaly(anomaly_id));
drop policy if exists qualifications_manage on public.qualifications;
create policy qualifications_manage on public.qualifications for all to authenticated
using (public.has_role('facility_manager')) with check (public.has_role('facility_manager'));

drop policy if exists work_orders_read on public.work_orders;
create policy work_orders_read on public.work_orders for select to authenticated using (public.can_access_anomaly(anomaly_id));
drop policy if exists work_orders_manage on public.work_orders;
create policy work_orders_manage on public.work_orders for all to authenticated
using (public.has_any_role(array['direction', 'facility_manager']))
with check (public.has_any_role(array['direction', 'facility_manager']));

drop policy if exists interventions_read on public.interventions;
create policy interventions_read on public.interventions for select to authenticated using (public.can_access_anomaly(anomaly_id));
drop policy if exists interventions_create on public.interventions;
create policy interventions_create on public.interventions for insert to authenticated
with check (
  public.has_role('facility_manager')
  or (
    public.has_role('field_agent')
    and performed_by_profile_id = public.current_profile_id()
    and exists (select 1 from public.work_orders wo where wo.id = work_order_id and wo.assigned_profile_id = public.current_profile_id())
  )
  or (
    public.has_role('vendor')
    and performed_by_vendor_id = public.current_vendor_id()
    and exists (select 1 from public.work_orders wo where wo.id = work_order_id and wo.assigned_vendor_id = public.current_vendor_id())
  )
);
drop policy if exists interventions_update on public.interventions;
create policy interventions_update on public.interventions for update to authenticated
using (
  public.has_role('facility_manager')
  or performed_by_profile_id = public.current_profile_id()
  or performed_by_vendor_id = public.current_vendor_id()
)
with check (
  public.has_role('facility_manager')
  or performed_by_profile_id = public.current_profile_id()
  or performed_by_vendor_id = public.current_vendor_id()
);

drop policy if exists proofs_read on public.proofs;
create policy proofs_read on public.proofs for select to authenticated
using (
  (anomaly_id is not null and public.can_access_anomaly(anomaly_id))
  or (report_id is not null and public.can_access_report(report_id))
  or exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_anomaly(wo.anomaly_id))
  or exists (select 1 from public.interventions i where i.id = intervention_id and public.can_access_anomaly(i.anomaly_id))
);
drop policy if exists proofs_create on public.proofs;
create policy proofs_create on public.proofs for insert to authenticated
with check (
  (
    public.has_role('facility_manager')
    or submitted_by_profile_id = public.current_profile_id()
    or submitted_by_vendor_id = public.current_vendor_id()
  )
  and (
    (anomaly_id is not null and public.can_access_anomaly(anomaly_id))
    or (report_id is not null and public.can_access_report(report_id))
    or exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_anomaly(wo.anomaly_id))
    or exists (select 1 from public.interventions i where i.id = intervention_id and public.can_access_anomaly(i.anomaly_id))
  )
);
drop policy if exists proofs_verify on public.proofs;
create policy proofs_verify on public.proofs for update to authenticated
using (public.has_role('facility_manager')) with check (public.has_role('facility_manager'));

drop policy if exists costs_read on public.costs;
create policy costs_read on public.costs for select to authenticated
using (
  public.has_any_role(array['direction', 'facility_manager', 'read_only'])
  or (anomaly_id is not null and public.can_access_anomaly(anomaly_id))
);
drop policy if exists costs_create on public.costs;
create policy costs_create on public.costs for insert to authenticated
with check (
  public.has_role('facility_manager')
  or (
    public.has_role('vendor')
    and vendor_id = public.current_vendor_id()
    and approval_status = 'pending'
    and cost_type = 'estimate'
    and (
      (anomaly_id is not null and public.can_access_anomaly(anomaly_id))
      or exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_anomaly(wo.anomaly_id))
      or exists (select 1 from public.interventions i where i.id = intervention_id and public.can_access_anomaly(i.anomaly_id))
    )
  )
);
drop policy if exists costs_manage on public.costs;
create policy costs_manage on public.costs for update to authenticated
using (public.has_any_role(array['direction', 'facility_manager']))
with check (public.has_any_role(array['direction', 'facility_manager']));

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated
using (
  recipient_profile_id = public.current_profile_id()
  or recipient_vendor_id = public.current_vendor_id()
  or exists (
    select 1 from public.user_roles ur
    where ur.profile_id = public.current_profile_id()
      and ur.role_id = recipient_role_id
      and ur.valid_from <= now()
      and (ur.valid_until is null or ur.valid_until > now())
  )
  or public.has_role('facility_manager')
);

drop policy if exists audit_read on public.audit_events;
create policy audit_read on public.audit_events for select to authenticated
using (public.has_any_role(array['direction', 'facility_manager', 'read_only']));

revoke all on function public.current_vendor_id() from public;
revoke all on function public.can_access_zone(uuid) from public;
revoke all on function public.can_access_equipment(uuid) from public;
revoke all on function public.can_access_anomaly(uuid) from public;
revoke all on function public.can_access_report(uuid) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.validate_anomaly_risk(uuid, text, text) from public;
grant execute on function public.current_vendor_id() to authenticated, service_role;
grant execute on function public.can_access_zone(uuid) to authenticated, service_role;
grant execute on function public.can_access_equipment(uuid) to authenticated, service_role;
grant execute on function public.can_access_anomaly(uuid) to authenticated, service_role;
grant execute on function public.can_access_report(uuid) to authenticated, service_role;
grant execute on function public.mark_notification_read(uuid) to authenticated, service_role;
grant execute on function public.validate_anomaly_risk(uuid, text, text) to authenticated, service_role;

commit;
