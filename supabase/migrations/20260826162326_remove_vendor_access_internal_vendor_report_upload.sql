begin;

-- Vendors remain assignable business references. They are never application users.
update public.roles
set is_active = false,
    description = 'Référentiel entreprise uniquement — aucun compte ni accès direct à l’outil'
where code = 'vendor';

update public.profiles p
set account_status = 'suspended'
where p.vendor_id is not null
   or exists (
     select 1
     from public.user_roles ur
     join public.roles r on r.id = ur.role_id
     where ur.profile_id = p.id and r.code = 'vendor'
   );

delete from public.user_roles ur
using public.roles r
where ur.role_id = r.id and r.code = 'vendor';

-- The optional read-only account is not validated in the latest user list.
update public.profiles
set account_status = 'suspended', data_status = 'to_confirm'
where employee_code = 'LECTURE';
delete from public.user_roles ur
using public.profiles p, public.roles r
where ur.profile_id = p.id
  and ur.role_id = r.id
  and p.employee_code = 'LECTURE'
  and r.code = 'read_only';

alter table public.profiles
  drop constraint if exists profiles_no_active_vendor_account;
alter table public.profiles
  add constraint profiles_no_active_vendor_account
  check (vendor_id is null or account_status <> 'active');

create or replace function public.prevent_vendor_role_assignment()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if exists (select 1 from public.roles r where r.id = new.role_id and r.code = 'vendor') then
    raise exception 'Vendor access is disabled; vendors are reference data only'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_vendor_role_assignment on public.user_roles;
create trigger prevent_vendor_role_assignment
before insert or update of role_id on public.user_roles
for each row execute function public.prevent_vendor_role_assignment();

update public.notification_rules
set primary_role_code = 'facility_manager',
    copy_role_code = 'direction',
    expected_action = 'Relancer le prestataire hors outil et consigner le retour.'
where code = 'NTF-RESERVES_NON_LEVEES';

create table if not exists public.profile_permissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  permission_code text not null check (permission_code = 'upload_vendor_intervention_report'),
  granted_by_profile_id uuid references public.profiles(id),
  granted_at timestamptz not null default now(),
  valid_until timestamptz,
  revoked_at timestamptz,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, permission_code),
  check (valid_until is null or valid_until > granted_at),
  check (revoked_at is null or revoked_at >= granted_at)
);

create index if not exists profile_permissions_active_idx
  on public.profile_permissions(profile_id, permission_code)
  where revoked_at is null;

create table if not exists public.vendor_intervention_reports (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  work_order_id uuid references public.work_orders(id),
  intervention_id uuid references public.interventions(id),
  vendor_id uuid not null references public.vendors(id),
  uploaded_by_profile_id uuid not null references public.profiles(id),
  report_type text not null default 'intervention_report'
    check (report_type in ('intervention_report', 'pv', 'quote', 'photo_bundle')),
  report_date date not null,
  summary text not null,
  reserve_notes text,
  cost_amount numeric(14,2) check (cost_amount is null or cost_amount >= 0),
  currency char(3) not null default 'XOF' check (currency ~ '^[A-Z]{3}$'),
  storage_bucket text not null default 'vendor-intervention-reports'
    check (storage_bucket = 'vendor-intervention-reports'),
  storage_path text not null unique,
  mime_type text not null
    check (mime_type in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf')),
  size_bytes bigint not null check (size_bytes between 1 and 10485760),
  validation_status text not null default 'pending'
    check (validation_status in ('pending', 'accepted', 'rejected')),
  validated_by_profile_id uuid references public.profiles(id),
  validated_at timestamptz,
  rejection_reason text,
  proof_id uuid unique references public.proofs(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((validation_status = 'accepted') = (validated_at is not null)),
  check (validation_status <> 'rejected' or rejection_reason is not null)
);

create index if not exists vendor_intervention_reports_anomaly_idx
  on public.vendor_intervention_reports(anomaly_id, created_at desc);
create index if not exists vendor_intervention_reports_validation_idx
  on public.vendor_intervention_reports(validation_status, created_at desc);
create index if not exists vendor_intervention_reports_uploader_idx
  on public.vendor_intervention_reports(uploaded_by_profile_id, created_at desc);

drop trigger if exists set_profile_permissions_updated_at on public.profile_permissions;
create trigger set_profile_permissions_updated_at
before update on public.profile_permissions
for each row execute function public.set_updated_at();

drop trigger if exists set_vendor_intervention_reports_updated_at on public.vendor_intervention_reports;
create trigger set_vendor_intervention_reports_updated_at
before update on public.vendor_intervention_reports
for each row execute function public.set_updated_at();

drop trigger if exists assign_vendor_intervention_reports_reference on public.vendor_intervention_reports;
create trigger assign_vendor_intervention_reports_reference
before insert on public.vendor_intervention_reports
for each row execute function public.assign_business_reference('RPI');

drop trigger if exists audit_profile_permissions on public.profile_permissions;
create trigger audit_profile_permissions
after insert or update or delete on public.profile_permissions
for each row execute function public.capture_audit_event();

drop trigger if exists audit_vendor_intervention_reports on public.vendor_intervention_reports;
create trigger audit_vendor_intervention_reports
after insert or update or delete on public.vendor_intervention_reports
for each row execute function public.capture_audit_event();

create or replace function public.has_permission(p_permission_code text)
returns boolean
language sql
stable
security definer
set search_path = public, auth, pg_temp
as $$
  select
    p_permission_code = 'upload_vendor_intervention_report'
    and public.has_role('field_agent')
    and exists (
      select 1
      from public.profile_permissions pp
      where pp.profile_id = public.current_profile_id()
        and pp.permission_code = p_permission_code
        and pp.revoked_at is null
        and (pp.valid_until is null or pp.valid_until > now())
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
      or exists (
        select 1
        from public.user_roles ur
        join public.roles r on r.id = ur.role_id and r.is_active
        where ur.profile_id = public.current_profile_id()
          and ur.role_id = n.recipient_role_id
          and ur.valid_from <= now()
          and (ur.valid_until is null or ur.valid_until > now())
      )
    );

  if not found then
    raise exception 'Notification not found or not accessible' using errcode = '42501';
  end if;
end;
$$;

alter table public.profile_permissions enable row level security;
alter table public.vendor_intervention_reports enable row level security;
revoke all on public.profile_permissions, public.vendor_intervention_reports from anon, authenticated;
grant select on public.profile_permissions, public.vendor_intervention_reports to authenticated;

drop policy if exists profile_permissions_read on public.profile_permissions;
create policy profile_permissions_read on public.profile_permissions
for select to authenticated
using (
  profile_id = public.current_profile_id()
  or public.has_any_role(array['direction', 'facility_manager', 'read_only'])
);

drop policy if exists vendor_intervention_reports_read on public.vendor_intervention_reports;
create policy vendor_intervention_reports_read on public.vendor_intervention_reports
for select to authenticated
using (
  uploaded_by_profile_id = public.current_profile_id()
  or public.has_any_role(array['direction', 'facility_manager', 'read_only'])
);

drop policy if exists interventions_create on public.interventions;
create policy interventions_create on public.interventions for insert to authenticated
with check (
  public.has_role('facility_manager')
  or (
    public.has_role('field_agent')
    and performed_by_profile_id = public.current_profile_id()
    and performed_by_vendor_id is null
    and exists (
      select 1 from public.work_orders wo
      where wo.id = work_order_id and wo.assigned_profile_id = public.current_profile_id()
    )
  )
);

drop policy if exists interventions_update on public.interventions;
create policy interventions_update on public.interventions for update to authenticated
using (
  public.has_role('facility_manager')
  or (performed_by_profile_id = public.current_profile_id() and performed_by_vendor_id is null)
)
with check (
  public.has_role('facility_manager')
  or (performed_by_profile_id = public.current_profile_id() and performed_by_vendor_id is null)
);

drop policy if exists proofs_create on public.proofs;
create policy proofs_create on public.proofs for insert to authenticated
with check (
  submitted_by_vendor_id is null
  and (
    public.has_role('facility_manager')
    or submitted_by_profile_id = public.current_profile_id()
  )
  and (
    (anomaly_id is not null and public.can_access_anomaly(anomaly_id))
    or (report_id is not null and public.can_access_report(report_id))
    or exists (select 1 from public.work_orders wo where wo.id = work_order_id and public.can_access_anomaly(wo.anomaly_id))
    or exists (select 1 from public.interventions i where i.id = intervention_id and public.can_access_anomaly(i.anomaly_id))
  )
);

drop policy if exists costs_create on public.costs;
create policy costs_create on public.costs for insert to authenticated
with check (public.has_role('facility_manager'));

drop policy if exists notifications_read on public.notifications;
create policy notifications_read on public.notifications for select to authenticated
using (
  recipient_profile_id = public.current_profile_id()
  or exists (
    select 1
    from public.user_roles ur
    join public.roles r on r.id = ur.role_id and r.is_active
    where ur.profile_id = public.current_profile_id()
      and ur.role_id = recipient_role_id
      and ur.valid_from <= now()
      and (ur.valid_until is null or ur.valid_until > now())
  )
  or public.has_role('facility_manager')
);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'vendor-intervention-reports',
  'vendor-intervention-reports',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.vendor_report_object_anomaly_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = public, storage, pg_temp
as $$
declare
  v_segment text;
begin
  v_segment := (storage.foldername(p_name))[2];
  if v_segment is null or v_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v_segment::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

drop policy if exists anomaly_proofs_upload on storage.objects;
create policy anomaly_proofs_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'anomaly-proofs'
  and public.has_any_role(array['facility_manager', 'field_agent'])
  and public.can_access_anomaly(public.proof_object_anomaly_id(name))
);

drop policy if exists vendor_intervention_reports_read on storage.objects;
create policy vendor_intervention_reports_read on storage.objects
for select to authenticated
using (
  bucket_id = 'vendor-intervention-reports'
  and exists (
    select 1 from public.vendor_intervention_reports vr
    where vr.storage_path = name
      and (
        vr.uploaded_by_profile_id = public.current_profile_id()
        or public.has_any_role(array['direction', 'facility_manager', 'read_only'])
      )
  )
);

drop policy if exists vendor_intervention_reports_upload on storage.objects;
create policy vendor_intervention_reports_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'vendor-intervention-reports'
  and public.has_permission('upload_vendor_intervention_report')
  and (storage.foldername(name))[1] = auth.uid()::text
  and public.can_access_anomaly(public.vendor_report_object_anomaly_id(name))
);

drop policy if exists vendor_intervention_reports_cleanup on storage.objects;
create policy vendor_intervention_reports_cleanup on storage.objects
for delete to authenticated
using (
  bucket_id = 'vendor-intervention-reports'
  and owner_id::text = auth.uid()::text
  and public.has_permission('upload_vendor_intervention_report')
  and not exists (
    select 1 from public.vendor_intervention_reports vr
    where vr.storage_path = name and vr.validation_status = 'accepted'
  )
);

commit;

begin;

create or replace function public.advance_anomaly_workflow(
  p_reference text,
  p_target text,
  p_comment text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_anomaly public.anomalies%rowtype;
  v_current_code text;
  v_target_code text;
  v_assigned_profile uuid;
  v_assigned_vendor uuid;
  v_work_order public.work_orders%rowtype;
  v_intervention public.interventions%rowtype;
begin
  select a.* into v_anomaly
  from public.anomalies a
  where a.id = public.resolve_anomaly_id(p_reference)
  for update of a;

  select sd.code into v_current_code
  from public.status_definitions sd
  where sd.id = v_anomaly.current_status_id;

  if v_anomaly.id is null or not public.can_access_anomaly(v_anomaly.id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;

  if p_target = 'Affectée' then
    if not public.has_role('facility_manager') or v_current_code <> 'A_QUALIFIER' then
      raise exception 'Only the Facility Manager can qualify an anomaly awaiting qualification' using errcode = '42501';
    end if;

    v_assigned_profile := v_anomaly.assigned_profile_id;
    v_assigned_vendor := v_anomaly.assigned_vendor_id;

    if v_assigned_profile is null and v_assigned_vendor is null then
      select ur.profile_id into v_assigned_profile
      from public.user_roles ur
      join public.roles r on r.id = ur.role_id and r.code = 'field_agent' and r.is_active
      join public.profiles p on p.id = ur.profile_id and p.account_status = 'active'
      where ur.equipment_id = v_anomaly.equipment_id
        and ur.valid_from <= now() and (ur.valid_until is null or ur.valid_until > now())
      order by ur.created_at
      limit 1;
    end if;

    if v_assigned_profile is null and v_assigned_vendor is null then
      select ev.vendor_id into v_assigned_vendor
      from public.equipment_vendors ev
      join public.vendors v on v.id = ev.vendor_id and v.status in ('active', 'to_integrate')
      where ev.equipment_id = v_anomaly.equipment_id
      order by ev.is_primary desc, ev.created_at
      limit 1;
    end if;

    if v_assigned_profile is null and v_assigned_vendor is null then
      raise exception 'No eligible internal agent or vendor reference is configured for this equipment' using errcode = '23514';
    end if;

    insert into public.qualifications (
      anomaly_id, qualified_by_profile_id, confirmed_priority_id, confirmed_category_id,
      decision_code, decision_reason, risk_assessment
    ) values (
      v_anomaly.id, v_actor, v_anomaly.priority_id, v_anomaly.category_id,
      case when v_assigned_vendor is null then 'internal_work_order' else 'vendor_work_order' end,
      coalesce(nullif(btrim(p_comment), ''), 'Qualification et affectation depuis le poste de pilotage.'),
      case when exists(select 1 from public.priority_definitions pd where pd.id = v_anomaly.priority_id and pd.is_critical)
        then 'Risque critique à maintenir visible jusqu’à la clôture.' else 'Risque évalué selon la priorité confirmée.' end
    );

    insert into public.work_orders (
      reference, anomaly_id, work_order_type, assigned_profile_id, assigned_vendor_id,
      instructions, scheduled_start_at, due_at, created_by_profile_id
    ) values (
      null, v_anomaly.id, case when v_assigned_vendor is null then 'internal' else 'vendor' end,
      v_assigned_profile, v_assigned_vendor,
      coalesce(nullif(btrim(p_comment), ''), 'Diagnostiquer, intervenir et joindre une preuve.'),
      null, v_anomaly.intervention_due_at, v_actor
    );

    v_target_code := case when v_assigned_vendor is null then 'INTERVENTION_INTERNE_PLANIFIEE' else 'INTERVENTION_PRESTATAIRE' end;
    update public.anomalies
    set assigned_profile_id = v_assigned_profile,
        assigned_vendor_id = v_assigned_vendor,
        current_status_id = (select id from public.status_definitions where code = v_target_code)
    where id = v_anomaly.id;

  elsif p_target = 'En intervention' then
    if v_current_code not in ('INTERVENTION_INTERNE_PLANIFIEE', 'INTERVENTION_PRESTATAIRE', 'URGENCE_IMMEDIATE') then
      raise exception 'The anomaly is not ready to start intervention' using errcode = '23514';
    end if;
    if not (
      public.has_role('facility_manager')
      or v_anomaly.assigned_profile_id = v_actor
    ) then
      raise exception 'Only the assigned internal agent or Facility Manager can start intervention' using errcode = '42501';
    end if;

    select * into v_work_order from public.work_orders
    where anomaly_id = v_anomaly.id and status <> 'cancelled'
    order by created_at desc limit 1 for update;
    if v_work_order.id is null then
      raise exception 'No active work order exists for this anomaly' using errcode = '23514';
    end if;

    update public.work_orders set status = 'in_progress' where id = v_work_order.id;
    insert into public.interventions (
      reference, anomaly_id, work_order_id, performed_by_profile_id, performed_by_vendor_id,
      started_at, outcome, recovery_type, summary
    ) values (
      null, v_anomaly.id, v_work_order.id,
      case when v_work_order.assigned_vendor_id is null then v_work_order.assigned_profile_id else null end,
      v_work_order.assigned_vendor_id,
      now(), 'diagnosis_only', 'none', coalesce(nullif(btrim(p_comment), ''), 'Intervention démarrée.')
    );
    update public.anomalies set current_status_id = (select id from public.status_definitions where code = 'EN_COURS') where id = v_anomaly.id;
    v_target_code := 'EN_COURS';

  elsif p_target = 'En validation' then
    if v_current_code <> 'EN_COURS' then
      raise exception 'Only an intervention in progress can be submitted for validation' using errcode = '23514';
    end if;
    if not (
      public.has_role('facility_manager')
      or v_anomaly.assigned_profile_id = v_actor
    ) then
      raise exception 'Only the assigned internal agent or Facility Manager can finish intervention' using errcode = '42501';
    end if;

    select * into v_intervention from public.interventions
    where anomaly_id = v_anomaly.id and ended_at is null
    order by started_at desc limit 1 for update;
    if v_intervention.id is null then
      raise exception 'No intervention in progress exists for this anomaly' using errcode = '23514';
    end if;

    update public.interventions
    set ended_at = now(), outcome = 'resolved', recovery_type = 'permanent_repair',
        summary = coalesce(nullif(btrim(p_comment), ''), 'Intervention terminée, preuve attendue avant clôture.')
    where id = v_intervention.id;
    update public.work_orders set status = 'completed', completed_at = now() where id = v_intervention.work_order_id;
    update public.anomalies set current_status_id = (select id from public.status_definitions where code = 'EN_ATTENTE_PREUVE') where id = v_anomaly.id;
    v_target_code := 'EN_ATTENTE_PREUVE';

  elsif p_target = 'Clôturée' then
    if not public.has_role('facility_manager') then
      raise exception 'Only the Facility Manager can close an anomaly' using errcode = '42501';
    end if;
    if v_current_code not in ('EN_ATTENTE_PREUVE', 'RESOLU') then
      raise exception 'The anomaly is not ready for closure' using errcode = '23514';
    end if;
    update public.anomalies
    set current_status_id = (select id from public.status_definitions where code = 'CLOTURE'),
        closure_comment = coalesce(nullif(btrim(p_comment), ''), 'Clôture validée par le Facility Manager.')
    where id = v_anomaly.id;
    v_target_code := 'CLOTURE';
  else
    raise exception 'Unsupported workflow target' using errcode = '22023';
  end if;

  return jsonb_build_object('anomaly_id', v_anomaly.id, 'reference', v_anomaly.reference, 'status_code', v_target_code);
end;
$$;

create or replace function public.register_anomaly_proof(
  p_reference text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_proof_type text default 'photo'
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_anomaly_id uuid := public.resolve_anomaly_id(p_reference);
  v_proof public.proofs%rowtype;
  v_accepted boolean := public.has_role('facility_manager');
begin
  if v_anomaly_id is null or not public.can_access_anomaly(v_anomaly_id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;
  if v_actor is null or not public.has_any_role(array['facility_manager', 'field_agent']) then
    raise exception 'The current internal role cannot submit proof' using errcode = '42501';
  end if;
  if public.proof_object_anomaly_id(p_storage_path) is distinct from v_anomaly_id then
    raise exception 'Storage path does not match the anomaly' using errcode = '23514';
  end if;
  if p_size_bytes <= 0 or p_size_bytes > 10485760 then
    raise exception 'Proof size must be between 1 byte and 10 MB' using errcode = '23514';
  end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    raise exception 'Unsupported proof MIME type' using errcode = '23514';
  end if;
  if p_proof_type not in ('photo', 'report', 'pv') then
    raise exception 'Unsupported proof type' using errcode = '23514';
  end if;

  insert into public.proofs (
    reference, anomaly_id, proof_type, storage_bucket, storage_path, mime_type,
    submitted_by_profile_id, submitted_by_vendor_id, verification_status,
    verified_by_profile_id, verified_at, metadata
  ) values (
    null, v_anomaly_id, p_proof_type, 'anomaly-proofs', p_storage_path, p_mime_type,
    v_actor, null,
    case when v_accepted then 'accepted' else 'pending' end,
    case when v_accepted then v_actor else null end,
    case when v_accepted then now() else null end,
    jsonb_build_object('size_bytes', p_size_bytes, 'source', 'behira_frontend')
  ) returning * into v_proof;

  return jsonb_build_object(
    'proof_id', v_proof.id,
    'reference', v_proof.reference,
    'verification_status', v_proof.verification_status
  );
end;
$$;

create or replace function public.register_vendor_intervention_report(
  p_anomaly_reference text,
  p_vendor_code text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_report_type text,
  p_report_date date,
  p_summary text,
  p_reserve_notes text default null,
  p_cost_amount numeric default null,
  p_work_order_reference text default null,
  p_intervention_reference text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, storage, pg_temp
as $$
declare
  v_auth_user uuid := auth.uid();
  v_actor uuid := public.current_profile_id();
  v_anomaly_id uuid := public.resolve_anomaly_id(p_anomaly_reference);
  v_vendor public.vendors%rowtype;
  v_work_order_id uuid;
  v_intervention_id uuid;
  v_report public.vendor_intervention_reports%rowtype;
begin
  if v_auth_user is null or v_actor is null or not public.has_permission('upload_vendor_intervention_report') then
    raise exception 'Explicit internal permission is required to upload a vendor report' using errcode = '42501';
  end if;
  if v_anomaly_id is null or not public.can_access_anomaly(v_anomaly_id) then
    raise exception 'Anomaly not found or outside the agent perimeter' using errcode = '42501';
  end if;
  if nullif(btrim(p_summary), '') is null then
    raise exception 'A report summary is required' using errcode = '23514';
  end if;
  if p_report_date is null or p_report_date > current_date then
    raise exception 'Report date must be provided and cannot be in the future' using errcode = '23514';
  end if;
  if p_report_type not in ('intervention_report', 'pv', 'quote', 'photo_bundle') then
    raise exception 'Unsupported vendor report type' using errcode = '23514';
  end if;
  if p_size_bytes <= 0 or p_size_bytes > 10485760 then
    raise exception 'Report size must be between 1 byte and 10 MB' using errcode = '23514';
  end if;
  if p_mime_type not in ('image/jpeg', 'image/png', 'image/webp', 'application/pdf') then
    raise exception 'Unsupported report MIME type' using errcode = '23514';
  end if;
  if (storage.foldername(p_storage_path))[1] is distinct from v_auth_user::text
     or public.vendor_report_object_anomaly_id(p_storage_path) is distinct from v_anomaly_id then
    raise exception 'Storage path does not match the authenticated user and anomaly' using errcode = '23514';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'vendor-intervention-reports'
      and o.name = p_storage_path
      and o.owner_id::text = v_auth_user::text
  ) then
    raise exception 'The private report object was not uploaded by the current user' using errcode = '23514';
  end if;

  select * into v_vendor
  from public.vendors v
  where v.code = upper(btrim(p_vendor_code)) and v.status in ('active', 'to_integrate');
  if v_vendor.id is null then
    raise exception 'Active vendor reference not found' using errcode = 'P0002';
  end if;

  if nullif(btrim(p_work_order_reference), '') is not null then
    select wo.id into v_work_order_id
    from public.work_orders wo
    where wo.reference = btrim(p_work_order_reference)
      and wo.anomaly_id = v_anomaly_id
      and wo.assigned_vendor_id = v_vendor.id;
    if v_work_order_id is null then
      raise exception 'Work order does not match the anomaly and vendor' using errcode = '23514';
    end if;
  end if;

  if nullif(btrim(p_intervention_reference), '') is not null then
    select i.id into v_intervention_id
    from public.interventions i
    where i.reference = btrim(p_intervention_reference)
      and i.anomaly_id = v_anomaly_id
      and i.performed_by_vendor_id = v_vendor.id
      and (v_work_order_id is null or i.work_order_id = v_work_order_id);
    if v_intervention_id is null then
      raise exception 'Intervention does not match the anomaly and vendor' using errcode = '23514';
    end if;
  end if;

  insert into public.vendor_intervention_reports (
    reference, anomaly_id, work_order_id, intervention_id, vendor_id,
    uploaded_by_profile_id, report_type, report_date, summary, reserve_notes,
    cost_amount, storage_path, mime_type, size_bytes, metadata
  ) values (
    null, v_anomaly_id, v_work_order_id, v_intervention_id, v_vendor.id,
    v_actor, p_report_type, p_report_date, btrim(p_summary), nullif(btrim(p_reserve_notes), ''),
    p_cost_amount, p_storage_path, p_mime_type, p_size_bytes,
    jsonb_build_object('source', 'behira_frontend', 'submitted_on_behalf_of_vendor', true)
  ) returning * into v_report;

  return jsonb_build_object(
    'report_id', v_report.id,
    'reference', v_report.reference,
    'validation_status', v_report.validation_status
  );
end;
$$;

create or replace function public.verify_vendor_intervention_report(
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
  v_actor uuid := public.current_profile_id();
  v_report public.vendor_intervention_reports%rowtype;
  v_proof_id uuid;
begin
  if not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can validate a vendor report' using errcode = '42501';
  end if;
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Invalid vendor report decision' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(btrim(p_comment), '') is null then
    raise exception 'A rejection reason is required' using errcode = '23514';
  end if;

  select * into v_report
  from public.vendor_intervention_reports vr
  where vr.reference = btrim(p_reference)
  for update;
  if v_report.id is null then
    raise exception 'Vendor report not found' using errcode = 'P0002';
  end if;
  if v_report.validation_status <> 'pending' then
    raise exception 'Vendor report has already been reviewed' using errcode = '23514';
  end if;

  if p_decision = 'accepted' then
    insert into public.proofs (
      reference, anomaly_id, work_order_id, intervention_id, proof_type,
      storage_bucket, storage_path, mime_type, submitted_by_profile_id,
      submitted_by_vendor_id, verification_status, verified_by_profile_id,
      verified_at, metadata
    ) values (
      null, v_report.anomaly_id, v_report.work_order_id, v_report.intervention_id,
      case v_report.report_type when 'pv' then 'pv' when 'quote' then 'quote' else 'report' end,
      v_report.storage_bucket, v_report.storage_path, v_report.mime_type,
      v_report.uploaded_by_profile_id, null, 'accepted', v_actor, now(),
      jsonb_build_object(
        'vendor_intervention_report_id', v_report.id,
        'vendor_id', v_report.vendor_id,
        'submitted_on_behalf_of_vendor', true
      )
    ) returning id into v_proof_id;
  end if;

  update public.vendor_intervention_reports
  set validation_status = p_decision,
      validated_by_profile_id = v_actor,
      validated_at = case when p_decision = 'accepted' then now() else null end,
      rejection_reason = case when p_decision = 'rejected' then btrim(p_comment) else null end,
      proof_id = v_proof_id,
      metadata = metadata || jsonb_build_object('review_comment', coalesce(nullif(btrim(p_comment), ''), 'Validé par le Facility Manager'))
  where id = v_report.id;

  return jsonb_build_object(
    'report_id', v_report.id,
    'reference', v_report.reference,
    'validation_status', p_decision,
    'proof_id', v_proof_id
  );
end;
$$;

revoke all on function public.prevent_vendor_role_assignment() from public, anon, authenticated;
revoke all on function public.has_permission(text) from public, anon, authenticated;
revoke all on function public.vendor_report_object_anomaly_id(text) from public, anon, authenticated;
revoke all on function public.register_vendor_intervention_report(text, text, text, text, bigint, text, date, text, text, numeric, text, text) from public, anon, authenticated;
revoke all on function public.verify_vendor_intervention_report(text, text, text) from public, anon, authenticated;
revoke all on function public.current_vendor_id() from public, anon, authenticated, service_role;

grant execute on function public.has_permission(text) to authenticated, service_role;
grant execute on function public.vendor_report_object_anomaly_id(text) to authenticated, service_role;
grant execute on function public.register_vendor_intervention_report(text, text, text, text, bigint, text, date, text, text, numeric, text, text) to authenticated, service_role;
grant execute on function public.verify_vendor_intervention_report(text, text, text) to authenticated, service_role;

drop function if exists public.current_vendor_id();

commit;
