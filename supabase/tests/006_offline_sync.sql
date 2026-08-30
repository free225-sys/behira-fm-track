\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
)
values
  ('40000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'offline-agent.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('40000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'offline-viewer.fixture@example.invalid', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

update public.profiles
set auth_user_id = '40000000-0000-0000-0000-000000000001',
    account_status = 'active',
    must_change_password = false
where employee_code = 'EVAR-ELEC';

insert into public.profiles(employee_code, display_name, account_status, data_status, source_system, source_notes, auth_user_id)
values ('READ-OFFLINE', 'Lecture seule hors ligne', 'active', 'confirmed', 'pgTAP', 'Fixture transactionnelle uniquement', '40000000-0000-0000-0000-000000000002');
insert into public.user_roles(profile_id, role_id)
values ((select id from public.profiles where employee_code = 'READ-OFFLINE'), (select id from public.roles where code = 'read_only'));

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);

do $$
declare
  v_round_mutation uuid := '41000000-0000-0000-0000-000000000001';
  v_round jsonb;
  v_replay jsonb;
  v_report_id uuid;
begin
  v_round := public.submit_field_round_offline(
    v_round_mutation,
    'GE-01',
    'technical_round',
    now() - interval '2 minutes',
    'Batterie sous surveillance pendant la ronde.',
    jsonb_build_array(
      jsonb_build_object('code', 'MODE_AUTO', 'label', 'Mode automatique', 'status', 'ok', 'value_boolean', true),
      jsonb_build_object('code', 'BATTERIE', 'label', 'Tension batterie', 'status', 'alert', 'value_numeric', 11.6, 'unit', 'V')
    ),
    'Tension batterie sous le seuil',
    'Mesure terrain à 11,6 V.',
    'Haute'
  );
  v_report_id := (v_round->>'report_id')::uuid;

  if coalesce((v_round->>'replayed')::boolean, true) then
    raise exception 'The first field round was incorrectly marked as replayed';
  end if;
  if (select report_status from public.reports where id = v_report_id) <> 'submitted' then
    raise exception 'The queued field round was not submitted atomically';
  end if;
  if (select count(*) from public.report_checks where report_id = v_report_id) <> 2 then
    raise exception 'The queued field round lost its checks';
  end if;

  v_replay := public.submit_field_round_offline(
    v_round_mutation,
    'GE-01',
    'technical_round',
    (select performed_at from public.reports where id = v_report_id),
    'Batterie sous surveillance pendant la ronde.',
    jsonb_build_array(
      jsonb_build_object('code', 'MODE_AUTO', 'label', 'Mode automatique', 'status', 'ok', 'value_boolean', true),
      jsonb_build_object('code', 'BATTERIE', 'label', 'Tension batterie', 'status', 'alert', 'value_numeric', 11.6, 'unit', 'V')
    ),
    'Tension batterie sous le seuil',
    'Mesure terrain à 11,6 V.',
    'Haute'
  );
  if not coalesce((v_replay->>'replayed')::boolean, false) or (v_replay->>'report_id')::uuid <> v_report_id then
    raise exception 'Idempotent field round replay did not return the original report';
  end if;

  begin
    perform public.submit_field_round_offline(
      v_round_mutation, 'GE-01', 'technical_round',
      (select performed_at from public.reports where id = v_report_id),
      'Contenu différent',
      jsonb_build_array(jsonb_build_object('code', 'MODE_AUTO', 'label', 'Mode automatique', 'status', 'ok', 'value_boolean', true)),
      null, null, null
    );
    raise exception 'A reused mutation id with different content was accepted';
  exception when unique_violation then
    null;
  end;

  begin
    perform public.submit_field_round_offline(
      '41000000-0000-0000-0000-000000000002', 'WILO-01', 'technical_round', now(), 'Hors perimetre',
      jsonb_build_array(jsonb_build_object('code', 'TEST', 'label', 'Test', 'status', 'ok')), null, null, null
    );
    raise exception 'An out-of-scope field round was accepted';
  exception when insufficient_privilege then
    null;
  end;

end;
$$;

reset role;
insert into storage.objects(id, bucket_id, name, owner_id, metadata)
select
  gen_random_uuid(),
  'anomaly-proofs',
  a.id::text || '/42000000-0000-0000-0000-000000000001-preuve.jpg',
  '40000000-0000-0000-0000-000000000001',
  jsonb_build_object('size', 1024, 'mimetype', 'image/jpeg')
from public.reports r
join public.anomalies a on a.source_report_id = r.id
where r.client_mutation_id = '41000000-0000-0000-0000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000001', true);
do $$
declare
  v_proof_mutation uuid := '42000000-0000-0000-0000-000000000001';
  v_anomaly_id uuid;
  v_anomaly_reference text;
  v_storage_path text;
  v_proof jsonb;
  v_proof_replay jsonb;
begin
  select a.id, a.reference into v_anomaly_id, v_anomaly_reference
  from public.reports r
  join public.anomalies a on a.source_report_id = r.id
  where r.client_mutation_id = '41000000-0000-0000-0000-000000000001';
  v_storage_path := v_anomaly_id::text || '/' || v_proof_mutation::text || '-preuve.jpg';

  v_proof := public.register_anomaly_proof_offline(
    v_proof_mutation, v_anomaly_reference, v_storage_path,
    'image/jpeg', 1024, 'photo', now() - interval '1 minute'
  );
  if coalesce((v_proof->>'replayed')::boolean, true) then
    raise exception 'The first proof was incorrectly marked as replayed';
  end if;
  v_proof_replay := public.register_anomaly_proof_offline(
    v_proof_mutation, v_anomaly_reference, v_storage_path,
    'image/jpeg', 1024, 'photo',
    (select captured_at from public.proofs where id = (v_proof->>'proof_id')::uuid)
  );
  if not coalesce((v_proof_replay->>'replayed')::boolean, false)
     or (v_proof_replay->>'proof_id')::uuid <> (v_proof->>'proof_id')::uuid then
    raise exception 'Idempotent proof replay did not return the original proof';
  end if;
end;
$$;

select set_config('request.jwt.claim.sub', '40000000-0000-0000-0000-000000000002', true);
do $$
begin
  begin
    perform public.submit_field_round_offline(
      '41000000-0000-0000-0000-000000000003', 'GE-01', 'technical_round', now(), 'Lecture seule',
      jsonb_build_array(jsonb_build_object('code', 'TEST', 'label', 'Test', 'status', 'ok')), null, null, null
    );
    raise exception 'A read-only profile submitted a field round';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
select extensions.pass('offline round and proof sync is scoped, idempotent and conflict-safe');
select * from extensions.finish();
rollback;
