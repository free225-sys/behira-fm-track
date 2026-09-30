import assert from 'node:assert/strict';

export async function verifyRecette({ db, sql, asRole, payload, test, reject, decide, snapshot, realReportId, realAnomalyId }) {
  const headers = testMode => sql("select set_config('request.headers',$1,false)", [JSON.stringify(testMode ? {'x-behira-data-mode':'recette'} : {})]);
  const checks = JSON.stringify(payload.checks.map(c => ({ code:c.code,label:c.label,status:c.status,value_numeric:c.valueNumeric,value_text:c.valueText,value_boolean:c.valueBoolean,unit:c.unit,notes:c.notes })));
  const submit = (id=crypto.randomUUID(), isTest=true, attested=true) => sql("select public.submit_field_round_offline($1,'GE-01','technical_round',$2,$3,$4::jsonb,p_is_test=>$5,p_test_attested=>$6) r", [id,payload.performedAt,payload.summary,checks,isTest,attested]).then(rows=>rows[0].r);
  await asRole('field_agent'); await headers(false);
  await test('legacy real payload keeps its exact original hash',async()=>{
    const row=(await sql(`select client_payload_hash = encode(extensions.digest(convert_to(jsonb_build_object(
      'equipment_code','GE-01','report_type','technical_round','performed_at',$2::timestamptz,
      'summary',btrim($3::text),'checks',$4::jsonb,'anomaly_title',null,'anomaly_description',null,'priority_label',null
    )::text,'UTF8'),'sha256'),'hex') matches from public.reports where id=$1`,[realReportId,payload.performedAt,payload.summary,checks]))[0];
    assert.equal(row.matches,true);
  });
  await asRole('field_agent'); await headers(true);
  await test('recette disabled: forged client marker rejected',()=>reject(()=>submit(),'42501'));
  await test('authenticated user cannot enable recipe',()=>reject(()=>sql('update public.recette_configuration set enabled=true'),'42501'));
  await db.exec('reset role; update public.recette_configuration set enabled=true;');
  await asRole('field_agent');
  await test('fictitious attestation required on server',()=>reject(()=>submit(crypto.randomUUID(),true,false),'42501'));
  await test('fictitious attestation cannot certify a real round',()=>reject(()=>submit(crypto.randomUUID(),false,true),'23514'));
  const id=crypto.randomUUID(); const report=await submit(id);
  await test('recipe receipt and stored classification agree',async()=>{
    assert.equal(report.is_test,true);
    const row=(await sql('select is_test,raw_payload from public.reports where id=$1',[report.report_id]))[0];
    assert.equal(row.is_test,true); assert.equal(row.raw_payload.attestation,'fictional_v1');
  });
  await test('recipe replay gives exactly one report',async()=>{
    assert.equal((await submit(id)).report_id,report.report_id);
    assert.equal((await sql('select count(*)::int n from public.reports where client_mutation_id=$1',[id]))[0].n,1);
  });
  await asRole('facility_manager');
  await test('classification cannot be changed by direct update',()=>reject(()=>sql('update public.reports set is_test=false where id=$1',[report.report_id]),'23514'));
  await test('attestation cannot be removed by direct update',()=>reject(()=>sql("update public.reports set raw_payload='{}'::jsonb where id=$1",[report.report_id]),'23514'));
  await test('recipe workspace cannot read real reports',async()=>assert.equal((await sql('select id from public.reports where id=$1',[realReportId])).length,0));
  await test('FM cannot insert checks into a report from the other workspace',()=>reject(()=>sql("insert into public.report_checks(report_id,check_code,label,check_status) values($1,'injected','Cross-space injection','not_checked')",[realReportId]),'42501'));
  await headers(false);
  await test('legacy client without mode header cannot read fictitious report or checks',async()=>{
    assert.equal((await sql('select id from public.reports where id=$1',[report.report_id])).length,0);
    assert.equal((await sql('select id from public.report_checks where report_id=$1',[report.report_id])).length,0);
    assert.equal((await sql('select id from public.reports where id=$1',[realReportId])).length,1);
  });
  await asRole('field_agent');
  await test('mutation id cannot be replayed in a different mode',()=>reject(()=>submit(id,false,false),'23505'));
  await headers(true); await asRole('facility_manager');
  const review=await decide(report.report_id,await snapshot(report.report_id),'anomaly','Écart fictif pour recette',['ats_auto'],'NORMAL','RECETTE — anomalie fictive');
  const anomalyId=review.anomaly_id;
  await test('FM-created anomaly inherits immutable classification',async()=>assert.equal((await sql('select is_test from public.anomalies where id=$1',[anomalyId]))[0].is_test,true));
  await test('recipe anomaly cannot become real',()=>reject(()=>sql('update public.anomalies set is_test=false where id=$1',[anomalyId]),'23514'));
  // A mixed parent is either inaccessible under the selected workspace or explicitly rejected.
  await test('proof cannot link fictitious anomaly to real report',async()=>{
    await assert.rejects(()=>sql("insert into public.proofs(reference,anomaly_id,report_id,proof_type) values(null,$1,$2,'comment')",[anomalyId,realReportId]),e=>['42501','23514'].includes(e.code));
  });
  await test('external notification never enters delivery queue',async()=>{
    await db.exec('reset role');
    await sql("insert into public.notifications(reference,anomaly_id,recipient_profile_id,severity,channel,subject,body) values(null,$1,public.current_profile_id(),'info','email','TEST','TEST')",[anomalyId]);
    assert.equal((await sql("select count(*)::int n from public.notifications where anomaly_id=$1 and channel='email'",[anomalyId]))[0].n,0);
  });
  await asRole('facility_manager');
  await headers(false);
  await test('legacy FM cannot see recipe anomaly in canonical projection',async()=>{
    assert.equal((await sql('select id from public.anomalies where id=$1',[anomalyId])).length,0);
    assert.equal((await sql('select anomaly_id from public.anti_zombie_summary_v where anomaly_id=$1',[anomalyId])).length,0);
    assert.equal((await sql('select id from public.anomalies where id=$1',[realAnomalyId])).length,1);
  });
  await db.exec('reset role; update public.recette_configuration set enabled=false;');
  await headers(true); await asRole('field_agent');
  await test('disabled environment blocks queued fictitious retry',()=>reject(()=>submit(id),'42501'));
  await headers(false);
}
