import assert from 'node:assert/strict';
import { runnerImport } from 'vite';
import { fileURLToPath } from 'node:url';

export async function verifyHealthSnapshot({db,sql,asRole,identities,test,reject,recipeRun,submit,snapshot,decide,issueChecks}) {
  const {module:{readHealthSnapshot}}=await runnerImport(fileURLToPath(new URL('../app/lib/ui-contract/read-health-snapshot.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
  const read=async()=>readHealthSnapshot((await sql('select public.get_building_health_snapshot() as value'))[0].value,recipeRun?'recette':'production');
  await asRole('facility_manager');
  await test('lot0: complete wire contract, confirmed threshold, honest insufficient metrics',async()=>{
    const s=await read();assert.equal(s.schemaVersion,'behira.lot0.v1');assert.equal(s.threshold.value,400000);
    assert.equal(s.threshold.effectiveDate,'2026-08-30');assert.equal(s.score.state,'not_computable');
    assert.equal(s.score.final,null);assert.ok(s.ruleSetVersionId);
    for(const metric of ['availability','atRisk'])assert.equal(s[metric].status,'insufficient');
    assert.equal(s.coverage.status,'ok');assert.equal(s.coverage.totalCount,6);
    assert.equal(s.coverage.currentCount,0);
    assert.ok(!s.score.missingReasons.includes('formula_pending'));
    assert.ok(!s.score.missingReasons.includes('equipment_weights_pending'));
    assert.ok(!s.score.missingReasons.includes('freshness_policy_pending'));
    assert.equal(s.equipment.reduce((sum,e)=>sum+e.scoreWeight,0),100);
    assert.ok(s.score.missingControls.length>=6);
    assert.deepEqual(s.equipment.map(e=>e.code).sort(),['ASC-A1','ASC-A2','GE-01','IRR-01','RIA-01','WILO-01']);
    assert.equal(s.equipment.find(e=>e.code==='RIA-01').operationalStatus,null);
    assert.equal(s.equipment.find(e=>e.code==='GE-01').controlValidity,'incomplete');
    assert.ok(s.equipment.find(e=>e.code==='GE-01').lastControlReportId);
  });
  await test('lot0: read instances have unique IDs, same source and scope until a change',async()=>{
    const a=await read(),b=await read();assert.notEqual(a.snapshotId,b.snapshotId);
    assert.equal(a.sourceRevision,b.sourceRevision);assert.equal(a.scopeVersion,b.scopeVersion);
    assert.equal(Date.parse(a.validUntil)-Date.parse(a.asOf),300000);
  });
  await test('lot0: reject incompatible mode, fractional final score and broken additive risks',async()=>{
    const s=await read();assert.throws(()=>readHealthSnapshot({...s,dataMode:'demo'},'production'));
    assert.throws(()=>readHealthSnapshot({...s,score:{state:'normal',final:82.5,raw:82.5,updatedAt:s.asOf}},s.dataMode));
    assert.throws(()=>readHealthSnapshot({...s,atRisk:{status:'ok',total:2,hiddenItemCount:2,items:[],breakdown:[],displayBreakdown:{unavailable:1,degraded:0,control:0,other:0}}},s.dataMode));
    assert.throws(()=>readHealthSnapshot({...s,equipment:[{...s.equipment[0],code:'RND-LET'}]},s.dataMode));
  });
  await test('lot0: agent sees only GE-01, no management counters, can read threshold',async()=>{
    await asRole('field_agent');const s=await read();assert.deepEqual(s.equipment.map(e=>e.code),['GE-01']);
    assert.equal(s.pendingDecisions,null);assert.equal(s.counterUnavailableReasons.pendingDecisions,'not_authorized');
    assert.equal(s.overdueCritical,null);assert.equal(s.threshold.value,400000);
    assert.equal(s.coverage.status,'insufficient');
    assert.ok(s.score.missingControls.every(c=>c.equipmentCode==='GE-01'));
    assert.equal((await sql('select count(*)::int n from public.equipment_health_lot0_v'))[0].n,1);
  });
  for(const role of ['anon','read_only']) await test(`lot0: ${role} cannot obtain snapshot`,async()=>{
    await asRole(role);await reject(read,'42501');
  });
  await test('lot0: revoked or inactive scope cannot expose another equipment',async()=>{
    await db.exec('reset role; begin');
    try {
      await sql("insert into public.user_roles(profile_id,role_id) select $1,id from public.roles where code='field_agent' on conflict do nothing",[identities.field_agent.profileId]);
      await asRole('field_agent');const before=await read();
      await db.exec('reset role');
      await sql('update public.user_roles set valid_until=now() where profile_id=$1 and equipment_id is not null',[identities.field_agent.profileId]);
      await asRole('field_agent');const after=await read();assert.equal(after.equipment.length,0);assert.notEqual(after.scopeVersion,before.scopeVersion);
    }finally{await db.exec('rollback; reset role');}
  });
  await test('lot0: locked profile cannot read snapshot',async()=>{
    await db.exec('reset role; begin');
    try {
      await sql("update public.profiles set account_status='suspended' where id=$1",[identities.field_agent.profileId]);
      await asRole('field_agent');await reject(read,'42501');
    }finally{await db.exec('rollback; reset role');}
  });
  await test('lot0: agent cannot modify the financial parameter',async()=>{
    await asRole('field_agent');await reject(()=>sql("update public.business_parameters set numeric_value=1 where code='financial_decision_threshold'"),'42501');
  });
  await test('lot0: missing threshold does not fall back to a constant',async()=>{
    await db.exec('reset role; begin');
    try {
      await sql("update public.business_parameters set confirmed_effective_date=null where code='financial_decision_threshold'");
      await asRole('facility_manager');await reject(read,'P0001');
    }finally{await db.exec('rollback; reset role');}
  });
  await test('lot0: canonical catalogue excludes DEMO and service perimeter',async()=>{
    await db.exec('reset role; begin');
    try {
      await sql("insert into public.equipment(code,family,name) values('DEMO-HEALTH','test','Fictitious')");
      await asRole('facility_manager');assert.equal((await read()).equipment.length,6);
    }finally{await db.exec('rollback; reset role');}
  });
  await test('lot0: one FM dossier for multiple pending estimates, administration counts arbitrations',async()=>{
    await db.exec('reset role; begin');
    try {
      await asRole('facility_manager');const fmBefore=await read();
      await asRole('direction');const adminBefore=await read();
      const report=await submit(crypto.randomUUID(),issueChecks);
      await asRole('facility_manager');
      const anomaly=await decide(report.report_id,await snapshot(report.report_id),'anomaly','Health contract test',['ats_auto'],'URGENT','Test snapshot');
      for(const amount of [100000,200000,400000]) await sql("select public.submit_anomaly_cost_decision($1,$2,'opex','Health test',$3)",[anomaly.anomaly_reference,amount,crypto.randomUUID()]);
      const fmAfter=await read();assert.equal(fmAfter.pendingDecisions,fmBefore.pendingDecisions+1);assert.notEqual(fmAfter.sourceRevision,fmBefore.sourceRevision);
      await asRole('direction');assert.equal((await read()).pendingDecisions,adminBefore.pendingDecisions+1);
    }finally{await db.exec('rollback; reset role');}
  });
  await test('lot0: mode is taken from server request and recette must be enabled',async()=>{
    await db.exec('reset role; begin');
    try {
      await sql("select set_config('request.headers',$1,false)",[JSON.stringify({'x-behira-data-mode':'recette'})]);
      await sql('update public.recette_configuration set enabled=false');
      await asRole('facility_manager');await reject(()=>sql('select public.get_building_health_snapshot()'),'42501');
    }finally{await db.exec('rollback; reset role');}
  });
  await test('lot0: latest control cannot cross production and recette',async()=>{
    await db.exec('reset role; begin');
    try {
      await asRole('facility_manager');const current=await read();
      const control=current.equipment.find(e=>e.code==='GE-01').lastControlReportId;
      assert.ok(control);
      await db.exec('reset role');await sql('update public.recette_configuration set enabled=true');
      const opposite=recipeRun?'production':'recette';
      await sql("select set_config('request.headers',$1,false)",[JSON.stringify({'x-behira-data-mode':opposite})]);
      await asRole('facility_manager');
      const other=readHealthSnapshot((await sql('select public.get_building_health_snapshot() value'))[0].value,opposite);
      assert.notEqual(other.equipment.find(e=>e.code==='GE-01').lastControlReportId,control);
      assert.notEqual(other.sourceRevision,current.sourceRevision);
    }finally{await db.exec('rollback; reset role');}
  });
  await test('lot0: database permissions preserve invoker RLS and deny anonymous grants',async()=>{
    await db.exec('reset role');
    const [permissions]=await sql(`select
      (select not prosecdef from pg_proc where oid='public.get_building_health_snapshot()'::regprocedure) as invoker,
      (select 'security_invoker=true'=any(reloptions) from pg_class where oid='public.equipment_health_lot0_v'::regclass) as view_invoker,
      (select relrowsecurity from pg_class where oid='public.business_parameters'::regclass) as parameter_rls,
      has_function_privilege('anon','public.get_building_health_snapshot()','execute') as anon_rpc,
      has_table_privilege('anon','public.equipment_health_lot0_v','select') as anon_view`);
    assert.deepEqual(permissions,{invoker:true,view_invoker:true,parameter_rls:true,anon_rpc:false,anon_view:false});
  });
}
