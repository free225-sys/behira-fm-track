\set ON_ERROR_STOP on

begin;
select extensions.plan(1);

do $$
declare
  v_fm uuid;
  v_critical uuid;
  v_category uuid;
  v_equipment uuid;
  v_status_new uuid;
  v_status_qualify uuid;
  v_status_emergency uuid;
  v_status_progress uuid;
  v_status_resolved uuid;
  v_status_closed uuid;
  v_anomaly uuid;
  v_reset_anomaly uuid;
  v_work_order uuid;
  v_history_count integer;
begin
  select id into v_fm from public.profiles where employee_code = 'FAU-FM';
  update public.profiles
  set account_status = 'active', must_change_password = false
  where id = v_fm;
  select id into v_critical from public.priority_definitions where code = 'CRITICAL';
  select id into v_category from public.categories where code = 'INC';
  select id into v_equipment from public.equipment where code = 'RIA-01';
  select id into v_status_new from public.status_definitions where code = 'NOUVEAU';
  select id into v_status_qualify from public.status_definitions where code = 'A_QUALIFIER';
  select id into v_status_emergency from public.status_definitions where code = 'URGENCE_IMMEDIATE';
  select id into v_status_progress from public.status_definitions where code = 'EN_COURS';
  select id into v_status_resolved from public.status_definitions where code = 'RESOLU';
  select id into v_status_closed from public.status_definitions where code = 'CLOTURE';

  if v_status_closed is null then
    raise exception 'Required CLOTURE status is missing from the reference seed';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id
  ) values (
    null, 'TEST - RIA critique', 'Fixture transactionnelle', v_equipment, v_category,
    v_critical, v_status_new, v_fm
  ) returning id into v_anomaly;

  if (select reference from public.anomalies where id = v_anomaly) !~ '^ANO-[0-9]{4}-[0-9]{6}$' then
    raise exception 'Anomaly reference was not generated server-side';
  end if;
  if (select qualification_due_at from public.anomalies where id = v_anomaly) is null then
    raise exception 'SLA deadlines were not calculated';
  end if;

  update public.anomalies set current_status_id = v_status_qualify where id = v_anomaly;
  insert into public.qualifications(
    anomaly_id, qualified_by_profile_id, confirmed_priority_id, confirmed_category_id,
    decision_code, decision_reason
  ) values (
    v_anomaly, v_fm, v_critical, v_category, 'immediate_emergency', 'Fixture critique'
  );
  update public.anomalies set current_status_id = v_status_emergency where id = v_anomaly;
  update public.anomalies set current_status_id = v_status_progress where id = v_anomaly;
  update public.anomalies set current_status_id = v_status_resolved, resolved_at = now() where id = v_anomaly;

  begin
    update public.anomalies set current_status_id = v_status_closed where id = v_anomaly;
    raise exception 'Critical anomaly closed without proof';
  exception when check_violation then
    null;
  end;

  insert into public.proofs(
    reference, anomaly_id, proof_type, submitted_by_profile_id,
    verification_status, verified_by_profile_id, verified_at
  ) values (
    null, v_anomaly, 'comment', v_fm, 'accepted', v_fm, now()
  );
  update public.anomalies
  set current_status_id = v_status_closed, closure_comment = 'Preuve contrôlée'
  where id = v_anomaly;

  if (select closed_at from public.anomalies where id = v_anomaly) is null then
    raise exception 'Valid critical closure did not set closed_at';
  end if;

  select count(*) into v_history_count from public.anomaly_history where anomaly_id = v_anomaly;
  if v_history_count < 6 then
    raise exception 'Anomaly history is incomplete: % events', v_history_count;
  end if;
  if not exists (select 1 from public.audit_events where table_name = 'anomalies' and record_id = v_anomaly) then
    raise exception 'Audit event was not captured';
  end if;

  insert into public.anomalies(
    reference, title, description, equipment_id, category_id, priority_id,
    current_status_id, reported_by_profile_id
  ) values (
    null, 'TEST - Réarmement', 'Réarmement provisoire', v_equipment, v_category,
    v_critical, v_status_new, v_fm
  ) returning id into v_reset_anomaly;

  insert into public.work_orders(
    reference, anomaly_id, work_order_type, assigned_profile_id, instructions,
    created_by_profile_id
  ) values (
    null, v_reset_anomaly, 'internal', v_fm, 'Réarmement de test', v_fm
  ) returning id into v_work_order;

  insert into public.interventions(
    reference, anomaly_id, work_order_id, performed_by_profile_id,
    started_at, ended_at, outcome, recovery_type, summary
  ) values (
    null, v_reset_anomaly, v_work_order, v_fm,
    now() - interval '10 minutes', now(), 'partially_resolved', 'temporary_reset',
    'Service rétabli provisoirement'
  );

  insert into public.proofs(
    reference, anomaly_id, proof_type, submitted_by_profile_id,
    verification_status, verified_by_profile_id, verified_at
  ) values (
    null, v_reset_anomaly, 'comment', v_fm, 'accepted', v_fm, now()
  );

  update public.anomalies set current_status_id = v_status_qualify where id = v_reset_anomaly;
  update public.anomalies set current_status_id = v_status_emergency where id = v_reset_anomaly;
  update public.anomalies set current_status_id = v_status_progress where id = v_reset_anomaly;
  update public.anomalies set current_status_id = v_status_resolved, resolved_at = now() where id = v_reset_anomaly;

  begin
    update public.anomalies set current_status_id = v_status_closed where id = v_reset_anomaly;
    raise exception 'Temporary reset was treated as closure';
  exception when check_violation then
    null;
  end;
end;
$$;

select extensions.pass('critical proof lock, temporary reset, SLA, history and audit checks passed');
select * from extensions.finish();
rollback;
