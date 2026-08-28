begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'anomaly-proofs',
  'anomaly-proofs',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.proof_object_anomaly_id(p_name text)
returns uuid
language plpgsql
immutable
set search_path = public, storage, pg_temp
as $$
declare
  v_segment text;
begin
  v_segment := (storage.foldername(p_name))[1];
  if v_segment is null or v_segment !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return v_segment::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

drop policy if exists anomaly_proofs_read on storage.objects;
create policy anomaly_proofs_read on storage.objects
for select to authenticated
using (
  bucket_id = 'anomaly-proofs'
  and public.can_access_anomaly(public.proof_object_anomaly_id(name))
);

drop policy if exists anomaly_proofs_upload on storage.objects;
create policy anomaly_proofs_upload on storage.objects
for insert to authenticated
with check (
  bucket_id = 'anomaly-proofs'
  and public.has_any_role(array['facility_manager', 'field_agent', 'vendor'])
  and public.can_access_anomaly(public.proof_object_anomaly_id(name))
);

drop policy if exists anomaly_proofs_cleanup on storage.objects;
create policy anomaly_proofs_cleanup on storage.objects
for delete to authenticated
using (
  bucket_id = 'anomaly-proofs'
  and public.can_access_anomaly(public.proof_object_anomaly_id(name))
  and (owner_id = auth.uid()::text or public.has_role('facility_manager'))
);

create or replace function public.resolve_anomaly_id(p_reference text)
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select a.id
  from public.anomalies a
  where a.reference = btrim(p_reference)
     or a.reference = 'FIX-' || btrim(p_reference)
  order by (a.reference = btrim(p_reference)) desc
  limit 1;
$$;

create or replace function public.create_field_anomaly(
  p_equipment_code text,
  p_title text,
  p_description text,
  p_priority_label text
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth, pg_temp
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_equipment public.equipment%rowtype;
  v_priority_id uuid;
  v_category_id uuid;
  v_status_id uuid;
  v_report_id uuid;
  v_anomaly public.anomalies%rowtype;
begin
  if v_actor is null or not public.has_any_role(array['field_agent', 'facility_manager']) then
    raise exception 'Only a field agent or Facility Manager can create a field anomaly'
      using errcode = '42501';
  end if;

  if nullif(btrim(p_title), '') is null then
    raise exception 'Anomaly title is required' using errcode = '23514';
  end if;

  select * into v_equipment
  from public.equipment e
  where e.code = upper(btrim(p_equipment_code)) and e.is_active;

  if v_equipment.id is null then
    raise exception 'Equipment not found' using errcode = 'P0002';
  end if;
  if not public.has_role('facility_manager') and not public.can_access_equipment(v_equipment.id) then
    raise exception 'Equipment is outside the current user perimeter' using errcode = '42501';
  end if;

  select pd.id into v_priority_id
  from public.priority_definitions pd
  where pd.is_active
    and pd.code = case btrim(p_priority_label)
      when 'Critique' then 'CRITICAL'
      when 'Haute' then 'URGENT'
      when 'Moyenne' then 'PRIORITY'
      when 'Faible' then 'LOW'
      else 'NORMAL'
    end;

  select c.id into v_category_id
  from public.categories c
  where c.code = case
    when v_equipment.code = 'RIA-01' then 'INC'
    when v_equipment.code like 'ASC-%' then 'ASC'
    when v_equipment.code = 'WILO-01' then 'EAU'
    when v_equipment.code = 'IRR-01' then 'IRR'
    when v_equipment.code = 'RND-LET' then 'SEC'
    else 'ELEC'
  end;

  select sd.id into v_status_id from public.status_definitions sd where sd.code = 'A_QUALIFIER';

  insert into public.reports (
    reference, report_type, equipment_id, zone_id, reported_by_profile_id,
    performed_at, submitted_at, report_status, analysis, raw_payload
  ) values (
    null, 'field_observation', v_equipment.id, v_equipment.primary_zone_id, v_actor,
    now(), now(), 'submitted', nullif(btrim(p_description), ''),
    jsonb_build_object('source', 'behira_frontend', 'persistence', 'supabase_local')
  ) returning id into v_report_id;

  insert into public.anomalies (
    reference, title, description, equipment_id, zone_id, category_id,
    priority_id, current_status_id, source_report_id, reported_by_profile_id
  ) values (
    null, btrim(p_title), coalesce(nullif(btrim(p_description), ''), 'Constat terrain sans détail complémentaire.'),
    v_equipment.id, v_equipment.primary_zone_id, v_category_id,
    v_priority_id, v_status_id, v_report_id, v_actor
  ) returning * into v_anomaly;

  return jsonb_build_object(
    'anomaly_id', v_anomaly.id,
    'reference', v_anomaly.reference,
    'report_id', v_report_id,
    'status_code', 'A_QUALIFIER'
  );
end;
$$;

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
  v_vendor uuid := public.current_vendor_id();
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
      join public.roles r on r.id = ur.role_id and r.code = 'field_agent'
      join public.profiles p on p.id = ur.profile_id and p.account_status = 'active'
      where ur.equipment_id = v_anomaly.equipment_id
        and ur.valid_from <= now() and (ur.valid_until is null or ur.valid_until > now())
      order by ur.created_at
      limit 1;
    end if;

    if v_assigned_profile is null and v_assigned_vendor is null then
      select ev.vendor_id into v_assigned_vendor
      from public.equipment_vendors ev
      where ev.equipment_id = v_anomaly.equipment_id
      order by ev.is_primary desc, ev.created_at
      limit 1;
    end if;

    if v_assigned_profile is null and v_assigned_vendor is null then
      raise exception 'No eligible internal agent or vendor is configured for this equipment' using errcode = '23514';
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
      or (v_vendor is not null and v_anomaly.assigned_vendor_id = v_vendor)
    ) then
      raise exception 'Only the assigned party or Facility Manager can start intervention' using errcode = '42501';
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
      or (v_vendor is not null and v_anomaly.assigned_vendor_id = v_vendor)
    ) then
      raise exception 'Only the assigned party or Facility Manager can finish intervention' using errcode = '42501';
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
  v_vendor uuid := public.current_vendor_id();
  v_anomaly_id uuid := public.resolve_anomaly_id(p_reference);
  v_proof public.proofs%rowtype;
  v_accepted boolean := public.has_role('facility_manager');
begin
  if v_anomaly_id is null or not public.can_access_anomaly(v_anomaly_id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
  end if;
  if not public.has_any_role(array['facility_manager', 'field_agent', 'vendor']) then
    raise exception 'The current role cannot submit proof' using errcode = '42501';
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
    case when v_vendor is null then v_actor else null end,
    v_vendor,
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
  v_anomaly_id uuid := public.resolve_anomaly_id(p_reference);
  v_proof public.proofs%rowtype;
begin
  if not public.has_role('facility_manager') then
    raise exception 'Only the Facility Manager can verify proof' using errcode = '42501';
  end if;
  if p_decision not in ('accepted', 'rejected') then
    raise exception 'Invalid proof decision' using errcode = '22023';
  end if;
  if p_decision = 'rejected' and nullif(btrim(p_comment), '') is null then
    raise exception 'A rejection reason is required' using errcode = '23514';
  end if;

  select * into v_proof from public.proofs
  where anomaly_id = v_anomaly_id and verification_status = 'pending'
  order by created_at desc limit 1 for update;
  if v_proof.id is null then
    raise exception 'No pending proof found' using errcode = 'P0002';
  end if;

  update public.proofs
  set verification_status = p_decision,
      verified_by_profile_id = case when p_decision = 'accepted' then public.current_profile_id() else null end,
      verified_at = case when p_decision = 'accepted' then now() else null end,
      rejection_reason = case when p_decision = 'rejected' then btrim(p_comment) else null end
  where id = v_proof.id;

  return jsonb_build_object('proof_id', v_proof.id, 'verification_status', p_decision);
end;
$$;

revoke all on function public.proof_object_anomaly_id(text) from public;
revoke all on function public.resolve_anomaly_id(text) from public;
revoke all on function public.create_field_anomaly(text, text, text, text) from public;
revoke all on function public.advance_anomaly_workflow(text, text, text) from public;
revoke all on function public.register_anomaly_proof(text, text, text, bigint, text) from public;
revoke all on function public.verify_latest_anomaly_proof(text, text, text) from public;

grant execute on function public.proof_object_anomaly_id(text) to authenticated, service_role;
grant execute on function public.resolve_anomaly_id(text) to authenticated, service_role;
grant execute on function public.create_field_anomaly(text, text, text, text) to authenticated, service_role;
grant execute on function public.advance_anomaly_workflow(text, text, text) to authenticated, service_role;
grant execute on function public.register_anomaly_proof(text, text, text, bigint, text) to authenticated, service_role;
grant execute on function public.verify_latest_anomaly_proof(text, text, text) to authenticated, service_role;

commit;
