begin;

alter table public.reports
  add column if not exists client_mutation_id uuid,
  add column if not exists client_payload_hash text;

alter table public.proofs
  add column if not exists client_mutation_id uuid,
  add column if not exists client_payload_hash text;

alter table public.reports
  drop constraint if exists reports_client_payload_hash_check;
alter table public.reports
  add constraint reports_client_payload_hash_check
  check (client_payload_hash is null or client_payload_hash ~ '^[a-f0-9]{64}$');

alter table public.proofs
  drop constraint if exists proofs_client_payload_hash_check;
alter table public.proofs
  add constraint proofs_client_payload_hash_check
  check (client_payload_hash is null or client_payload_hash ~ '^[a-f0-9]{64}$');

create unique index if not exists reports_actor_client_mutation_uidx
  on public.reports (reported_by_profile_id, client_mutation_id)
  where client_mutation_id is not null;

create unique index if not exists proofs_actor_client_mutation_uidx
  on public.proofs (submitted_by_profile_id, client_mutation_id)
  where submitted_by_profile_id is not null and client_mutation_id is not null;

comment on column public.reports.client_mutation_id is
  'Identifiant idempotent genere par le terminal pour une ronde mise en file hors ligne.';
comment on column public.reports.client_payload_hash is
  'Empreinte du contenu canonique associe a client_mutation_id ; interdit une reutilisation avec un autre contenu.';
comment on column public.proofs.client_mutation_id is
  'Identifiant idempotent genere par le terminal pour une preuve mise en file hors ligne.';
comment on column public.proofs.client_payload_hash is
  'Empreinte du contenu canonique associe a client_mutation_id ; interdit une reutilisation avec un autre contenu.';

-- Une ronde rattachee a un equipement doit conserver sa zone principale, meme si
-- l'agent est autorise par perimetre equipement plutot que par une affectation de
-- zone distincte. Cette extension reste bornee a la zone principale de
-- l'equipement auquel l'agent a deja acces.
drop policy if exists reports_create on public.reports;
create policy reports_create on public.reports for insert to authenticated
with check (
  reported_by_profile_id = public.current_profile_id()
  and public.has_any_role(array['field_agent', 'facility_manager'])
  and (equipment_id is null or public.can_access_equipment(equipment_id) or public.has_role('facility_manager'))
  and (
    zone_id is null
    or public.can_access_zone(zone_id)
    or public.has_role('facility_manager')
    or exists (
      select 1
      from public.equipment e
      where e.id = reports.equipment_id
        and e.primary_zone_id = reports.zone_id
        and public.can_access_equipment(e.id)
    )
  )
);

drop policy if exists anomalies_create on public.anomalies;
create policy anomalies_create on public.anomalies for insert to authenticated
with check (
  public.has_any_role(array['direction', 'facility_manager'])
  or (
    public.has_role('field_agent')
    and reported_by_profile_id = public.current_profile_id()
    and (equipment_id is null or public.can_access_equipment(equipment_id))
    and (
      zone_id is null
      or public.can_access_zone(zone_id)
      or exists (
        select 1
        from public.equipment e
        where e.id = anomalies.equipment_id
          and e.primary_zone_id = anomalies.zone_id
          and public.can_access_equipment(e.id)
      )
    )
  )
);

create or replace function public.submit_field_round_offline(
  p_client_mutation_id uuid,
  p_equipment_code text,
  p_report_type text,
  p_performed_at timestamptz,
  p_summary text,
  p_checks jsonb,
  p_anomaly_title text default null,
  p_anomaly_description text default null,
  p_priority_label text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_equipment public.equipment%rowtype;
  v_report public.reports%rowtype;
  v_payload_hash text;
  v_anomaly public.anomalies%rowtype;
  v_priority_id uuid;
  v_category_id uuid;
  v_status_id uuid;
  v_check jsonb;
  v_check_code text;
  v_check_status text;
  v_value_count integer;
begin
  if v_actor is null or not public.has_any_role(array['field_agent', 'facility_manager']) then
    raise exception 'Only a field agent or Facility Manager can submit a field round'
      using errcode = '42501';
  end if;
  if p_client_mutation_id is null then
    raise exception 'Client mutation id is required' using errcode = '23514';
  end if;
  if p_report_type not in ('technical_round', 'cleaning_gardening_round', 'wilo_round') then
    raise exception 'Unsupported field round type' using errcode = '22023';
  end if;
  if p_performed_at is null or p_performed_at > now() + interval '5 minutes' then
    raise exception 'Invalid field round date' using errcode = '22007';
  end if;
  if jsonb_typeof(p_checks) <> 'array' or jsonb_array_length(p_checks) = 0 then
    raise exception 'At least one field check is required' using errcode = '23514';
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

  v_payload_hash := encode(extensions.digest(
    convert_to(jsonb_build_object(
      'equipment_code', v_equipment.code,
      'report_type', p_report_type,
      'performed_at', p_performed_at,
      'summary', coalesce(btrim(p_summary), ''),
      'checks', p_checks,
      'anomaly_title', nullif(btrim(p_anomaly_title), ''),
      'anomaly_description', nullif(btrim(p_anomaly_description), ''),
      'priority_label', nullif(btrim(p_priority_label), '')
    )::text, 'UTF8'),
    'sha256'
  ), 'hex');

  select * into v_report
  from public.reports r
  where r.reported_by_profile_id = v_actor
    and r.client_mutation_id = p_client_mutation_id;
  if v_report.id is not null then
    if v_report.client_payload_hash is distinct from v_payload_hash then
      raise exception 'Client mutation id already belongs to another field round'
        using errcode = '23505';
    end if;
    select * into v_anomaly from public.anomalies a where a.source_report_id = v_report.id limit 1;
    return jsonb_build_object(
      'report_id', v_report.id,
      'report_reference', v_report.reference,
      'anomaly_id', v_anomaly.id,
      'anomaly_reference', v_anomaly.reference,
      'replayed', true
    );
  end if;

  for v_check in select value from jsonb_array_elements(p_checks)
  loop
    if jsonb_typeof(v_check) <> 'object' then
      raise exception 'Every field check must be an object' using errcode = '22023';
    end if;
    v_check_code := nullif(btrim(v_check->>'code'), '');
    v_check_status := v_check->>'status';
    if v_check_code is null or nullif(btrim(v_check->>'label'), '') is null then
      raise exception 'Every field check requires a code and label' using errcode = '23514';
    end if;
    if v_check_status not in ('ok', 'alert', 'critical', 'not_applicable', 'not_checked') then
      raise exception 'Unsupported field check status' using errcode = '22023';
    end if;
    v_value_count := (case when v_check ? 'value_numeric' and v_check->'value_numeric' <> 'null'::jsonb then 1 else 0 end)
      + (case when v_check ? 'value_text' and v_check->'value_text' <> 'null'::jsonb then 1 else 0 end)
      + (case when v_check ? 'value_boolean' and v_check->'value_boolean' <> 'null'::jsonb then 1 else 0 end);
    if v_value_count > 1 then
      raise exception 'A field check can contain only one typed value' using errcode = '23514';
    end if;
  end loop;

  begin
    insert into public.reports (
      reference, report_type, equipment_id, zone_id, reported_by_profile_id,
      performed_at, report_status, analysis, raw_payload,
      client_mutation_id, client_payload_hash
    ) values (
      null, p_report_type, v_equipment.id, v_equipment.primary_zone_id, v_actor,
      p_performed_at, 'draft', nullif(btrim(p_summary), ''),
      jsonb_build_object('source', 'behira_frontend', 'capture', 'offline_capable'),
      p_client_mutation_id, v_payload_hash
    );
    -- Sous RLS, INSERT ... RETURNING peut evaluer la politique SELECT avant que
    -- can_access_report() ne voie la nouvelle ligne. La lecture separee conserve
    -- les memes droits sans contourner la politique.
    select * into v_report
    from public.reports r
    where r.reported_by_profile_id = v_actor
      and r.client_mutation_id = p_client_mutation_id;
  exception when unique_violation then
    select * into v_report
    from public.reports r
    where r.reported_by_profile_id = v_actor
      and r.client_mutation_id = p_client_mutation_id;
    if v_report.id is null or v_report.client_payload_hash is distinct from v_payload_hash then
      raise exception 'Client mutation id conflict for field round' using errcode = '23505';
    end if;
    select * into v_anomaly from public.anomalies a where a.source_report_id = v_report.id limit 1;
    return jsonb_build_object(
      'report_id', v_report.id,
      'report_reference', v_report.reference,
      'anomaly_id', v_anomaly.id,
      'anomaly_reference', v_anomaly.reference,
      'replayed', true
    );
  end;

  insert into public.report_checks (
    report_id, check_code, label, value_numeric, value_text, value_boolean,
    unit, check_status, notes
  )
  select
    v_report.id,
    btrim(item->>'code'),
    btrim(item->>'label'),
    case when item ? 'value_numeric' and item->'value_numeric' <> 'null'::jsonb then (item->>'value_numeric')::numeric end,
    case when item ? 'value_text' and item->'value_text' <> 'null'::jsonb then item->>'value_text' end,
    case when item ? 'value_boolean' and item->'value_boolean' <> 'null'::jsonb then (item->>'value_boolean')::boolean end,
    nullif(btrim(item->>'unit'), ''),
    item->>'status',
    nullif(btrim(item->>'notes'), '')
  from jsonb_array_elements(p_checks) item;

  if nullif(btrim(p_anomaly_title), '') is not null then
    select pd.id into v_priority_id
    from public.priority_definitions pd
    where pd.is_active
      and pd.code = case btrim(coalesce(p_priority_label, 'Normale'))
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

    insert into public.anomalies (
      reference, title, description, equipment_id, zone_id, category_id,
      priority_id, current_status_id, source_report_id, reported_by_profile_id,
      occurred_at, detected_at
    ) values (
      null, btrim(p_anomaly_title),
      coalesce(nullif(btrim(p_anomaly_description), ''), 'Constat terrain sans detail complementaire.'),
      v_equipment.id, v_equipment.primary_zone_id, v_category_id,
      v_priority_id, v_status_id, v_report.id, v_actor,
      p_performed_at, p_performed_at
    );
    select * into v_anomaly
    from public.anomalies a
    where a.source_report_id = v_report.id
    limit 1;
  end if;

  update public.reports
  set report_status = 'submitted', submitted_at = now()
  where id = v_report.id
  returning * into v_report;

  return jsonb_build_object(
    'report_id', v_report.id,
    'report_reference', v_report.reference,
    'anomaly_id', v_anomaly.id,
    'anomaly_reference', v_anomaly.reference,
    'replayed', false
  );
end;
$$;

create or replace function public.register_anomaly_proof_offline(
  p_client_mutation_id uuid,
  p_reference text,
  p_storage_path text,
  p_mime_type text,
  p_size_bytes bigint,
  p_proof_type text default 'photo',
  p_captured_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := public.current_profile_id();
  v_anomaly_id uuid := public.resolve_anomaly_id(p_reference);
  v_proof public.proofs%rowtype;
  v_payload_hash text;
  v_accepted boolean := public.has_role('facility_manager');
  v_object_owner text;
  v_object_size bigint;
  v_object_mime text;
begin
  if v_actor is null or not public.has_any_role(array['facility_manager', 'field_agent']) then
    raise exception 'The current role cannot submit proof' using errcode = '42501';
  end if;
  if p_client_mutation_id is null then
    raise exception 'Client mutation id is required' using errcode = '23514';
  end if;
  if v_anomaly_id is null or not public.can_access_anomaly(v_anomaly_id) then
    raise exception 'Anomaly not found or not accessible' using errcode = '42501';
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
  if p_captured_at is not null and p_captured_at > now() + interval '5 minutes' then
    raise exception 'Invalid proof capture date' using errcode = '22007';
  end if;

  v_payload_hash := encode(extensions.digest(
    convert_to(jsonb_build_object(
      'reference', btrim(p_reference),
      'storage_path', p_storage_path,
      'mime_type', p_mime_type,
      'size_bytes', p_size_bytes,
      'proof_type', p_proof_type,
      'captured_at', p_captured_at
    )::text, 'UTF8'),
    'sha256'
  ), 'hex');

  select * into v_proof
  from public.proofs p
  where p.submitted_by_profile_id = v_actor
    and p.client_mutation_id = p_client_mutation_id;
  if v_proof.id is not null then
    if v_proof.client_payload_hash is distinct from v_payload_hash then
      raise exception 'Client mutation id already belongs to another proof'
        using errcode = '23505';
    end if;
    return jsonb_build_object(
      'proof_id', v_proof.id,
      'reference', v_proof.reference,
      'verification_status', v_proof.verification_status,
      'replayed', true
    );
  end if;

  select o.owner_id, nullif(o.metadata->>'size', '')::bigint, o.metadata->>'mimetype'
  into v_object_owner, v_object_size, v_object_mime
  from storage.objects o
  where o.bucket_id = 'anomaly-proofs' and o.name = p_storage_path;
  if v_object_owner is null then
    raise exception 'Uploaded proof object was not found' using errcode = 'P0002';
  end if;
  if v_object_owner is distinct from auth.uid()::text then
    raise exception 'Uploaded proof object does not belong to the current user' using errcode = '42501';
  end if;
  if v_object_size is distinct from p_size_bytes or v_object_mime is distinct from p_mime_type then
    raise exception 'Uploaded proof metadata does not match the queued proof' using errcode = '23514';
  end if;

  begin
    insert into public.proofs (
      reference, anomaly_id, proof_type, storage_bucket, storage_path, mime_type,
      captured_at, submitted_by_profile_id, verification_status,
      verified_by_profile_id, verified_at, metadata,
      client_mutation_id, client_payload_hash
    ) values (
      null, v_anomaly_id, p_proof_type, 'anomaly-proofs', p_storage_path, p_mime_type,
      p_captured_at, v_actor,
      case when v_accepted then 'accepted' else 'pending' end,
      case when v_accepted then v_actor else null end,
      case when v_accepted then now() else null end,
      jsonb_build_object('size_bytes', p_size_bytes, 'source', 'behira_offline_queue'),
      p_client_mutation_id, v_payload_hash
    ) returning * into v_proof;
  exception when unique_violation then
    select * into v_proof
    from public.proofs p
    where p.submitted_by_profile_id = v_actor
      and p.client_mutation_id = p_client_mutation_id;
    if v_proof.id is null or v_proof.client_payload_hash is distinct from v_payload_hash then
      raise exception 'Client mutation id conflict for proof' using errcode = '23505';
    end if;
    return jsonb_build_object(
      'proof_id', v_proof.id,
      'reference', v_proof.reference,
      'verification_status', v_proof.verification_status,
      'replayed', true
    );
  end;

  return jsonb_build_object(
    'proof_id', v_proof.id,
    'reference', v_proof.reference,
    'verification_status', v_proof.verification_status,
    'replayed', false
  );
end;
$$;

comment on function public.register_anomaly_proof_offline(uuid, text, text, text, bigint, text, timestamptz) is
  'SECURITY DEFINER requis pour verifier l objet prive storage.objects ; controles explicites du role, perimetre, proprietaire, chemin, MIME et taille avant insertion.';

revoke all on function public.submit_field_round_offline(uuid, text, text, timestamptz, text, jsonb, text, text, text) from public, anon;
revoke all on function public.register_anomaly_proof_offline(uuid, text, text, text, bigint, text, timestamptz) from public, anon;
grant execute on function public.submit_field_round_offline(uuid, text, text, timestamptz, text, jsonb, text, text, text) to authenticated, service_role;
grant execute on function public.register_anomaly_proof_offline(uuid, text, text, text, bigint, text, timestamptz) to authenticated, service_role;

commit;
