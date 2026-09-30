import assert from 'node:assert/strict';

export async function verifyGe01Daily({ db,sql,asRole,identities,test,reject,recipeRun,payload,snapshot,decide }) {
  const iso = value => new Date(value).toISOString();
  await asRole('field_agent');
  for (const [from,to] of [
    ['2026-09-17T07:52:00Z','2026-09-18T07:52:00Z'],
    ['2026-09-19T08:00:00Z','2026-09-21T08:00:00Z'],
    ['2026-09-20T15:00:00Z','2026-09-22T00:00:00Z'],
  ]) await test(`GE calendar: ${from} -> ${to}`,async()=>assert.equal(iso((await sql('select public.ge01_valid_until($1) v',[from]))[0].v),iso(to)));
  const checks=JSON.stringify(payload.checks.map(c=>({code:c.code,label:c.label,status:c.status,value_numeric:c.valueNumeric,value_text:c.valueText,value_boolean:c.valueBoolean,unit:c.unit,notes:c.notes})));
  const sentAt=new Date(Date.now()-1000).toISOString();
  const manifest=['mc4','engine_counter'].map((purpose,i)=>({id:crypto.randomUUID(),purpose,mimeType:'image/jpeg',size:3,sha256:String(i+1).repeat(64)}));
  const mutation=crypto.randomUUID();
  const targetDay=new Date(Date.now()+86400000);if(targetDay.getUTCDay()===0)targetDay.setUTCDate(targetDay.getUTCDate()+1);
  const assignmentId=crypto.randomUUID();
  const assign=(id=assignmentId,agent=identities.field_agent.profileId,reason='Absence du titulaire : suppléance de test')=>
    sql('select public.assign_ge01_round($1,$2,$3,$4) id',[id,targetDay.toISOString().slice(0,10),agent,reason]);
  await test('GE agent cannot designate a substitute',()=>reject(()=>assign(),'42501'));
  await asRole('facility_manager');
  await test('GE FM cannot designate an out-of-scope profile',()=>reject(()=>assign(crypto.randomUUID(),identities.read_only.profileId),'23514'));
  await test('GE substitution requires a reason',()=>reject(()=>assign(crypto.randomUUID(),identities.field_agent.profileId,' '),'23514'));
  await test('GE substitution is recorded with actor and immutable reason',async()=>{
    assert.equal((await assign())[0].id,assignmentId);
    const row=(await sql('select * from public.ge01_round_assignments where id=$1',[assignmentId]))[0];
    assert.equal(row.assigned_by,identities.facility_manager.profileId);assert.equal(row.agent_id,identities.field_agent.profileId);assert.equal(row.is_test,recipeRun);
  });
  await test('GE substitution retry is idempotent; changed content conflicts',async()=>{
    assert.equal((await assign())[0].id,assignmentId);
    await reject(()=>assign(assignmentId,identities.field_agent.profileId,'Autre motif'),'23505');
    await reject(()=>sql('delete from public.ge01_round_assignments where id=$1',[assignmentId]),'42501');
  });
  await asRole('field_agent');
  const submit=(items=manifest,id=mutation,answers=checks)=>sql('select public.submit_ge01_round_offline($1,$2,$3,$4::jsonb,$5::jsonb,$6,$7,$7) r',
    [id,sentAt,payload.summary,answers,JSON.stringify(items),sentAt,recipeRun]).then(rows=>rows[0].r);
  let report;
  await test('GE submission atomically records manifest, no score or automatic anomaly',async()=>{
    report=await submit();
    assert.equal((await sql('select confirmed_at from public.ge01_round_transmissions where report_id=$1',[report.report_id]))[0].confirmed_at,null);
    assert.equal((await sql('select score from public.reports where id=$1',[report.report_id]))[0].score,null);
  });
  await test('GE full submission retry is idempotent',async()=>assert.equal((await submit()).report_id,report.report_id));
  await test('GE changed proof manifest conflicts without replacing it',()=>reject(()=>submit(manifest.slice(0,1)),'23505'));
  await test('GE malformed manifest rejected atomically',async()=>{
    const before=(await sql('select count(*)::int n from public.reports'))[0].n;
    await reject(()=>submit([{...manifest[0],size:10485761}],crypto.randomUUID()),'23514');
    assert.equal((await sql('select count(*)::int n from public.reports'))[0].n,before);
  });
  const path=m=>`${report.report_id}/${m.id}-${m.sha256}`;
  const put=m=>sql("insert into storage.objects(bucket_id,name,owner_id,metadata) values('round-proofs',$1,$2,$3::jsonb)",
    [path(m),identities.field_agent.userId,JSON.stringify({size:m.size,mimetype:m.mimeType})]);
  const register=m=>sql('select public.register_ge01_evidence($1,$2) r',[report.report_id,m.id]);
  await test('GE cannot register absent file',()=>reject(()=>register(manifest[0]),'23514'));
  await test('GE cannot upload undeclared path',()=>reject(()=>sql("insert into storage.objects(bucket_id,name,owner_id) values('round-proofs','random/object',$1)",[identities.field_agent.userId]),'42501'));
  await test('GE cannot spoof Storage owner',()=>reject(()=>sql("insert into storage.objects(bucket_id,name,owner_id) values('round-proofs',$1,$2)",[path(manifest[0]),identities.direction.userId]),'42501'));
  await test('GE first proof received without prematurely confirming full transmission',async()=>{
    await put(manifest[0]);await register(manifest[0]);
    assert.equal((await sql('select confirmed_at from public.ge01_round_transmissions where report_id=$1',[report.report_id]))[0].confirmed_at,null);
  });
  await asRole('facility_manager');
  await test('GE FM cannot review a partially uploaded report',()=>snapshot(report.report_id).then(s=>reject(()=>decide(report.report_id,s),'23514')));
  await test('GE FM cannot register agent evidence',()=>reject(()=>register(manifest[1]),'42501'));
  await asRole('field_agent');
  await test('GE proof retry does not create duplicate',async()=>{
    const first=(await register(manifest[0]))[0].r;
    assert.equal((await register(manifest[0]))[0].r.received_at,first.received_at);
    assert.equal((await sql('select count(*)::int n from public.ge01_round_evidence where report_id=$1',[report.report_id]))[0].n,1);
  });
  await test('GE last proof confirms reception',async()=>{
    await put(manifest[1]);await register(manifest[1]);
    assert.ok((await sql('select confirmed_at from public.ge01_round_transmissions where report_id=$1',[report.report_id]))[0].confirmed_at);
  });
  await test('GE received report still awaits FM review',async()=>{
    const row=(await sql('select * from public.ge01_report_status_v where id=$1',[report.report_id]))[0];
    assert.ok(row.blockers.includes('fm_review_pending'));
    const health=(await sql('select public.get_building_health_snapshot() s'))[0].s;
    assert.equal(health.siteTimezone,'Africa/Abidjan');
    assert.equal(health.equipment.find(e=>e.code==='GE-01').controlValidity,'incomplete');
  });
  for(const role of ['field_agent','direction','read_only','anon']) {
    await asRole(role);
    await test(`GE ${role} cannot attest FM read`,()=>reject(()=>sql('select public.mark_ge01_report_read($1)',[report.report_id]),'42501'));
  }
  await asRole('facility_manager');
  await test('GE first FM read is durable and idempotent',async()=>{
    const first=(await sql('select public.mark_ge01_report_read($1) t',[report.report_id]))[0].t;
    const repeat=(await sql('select public.mark_ge01_report_read($1) t',[report.report_id]))[0].t;
    assert.equal(iso(first),iso(repeat));
  });
  await test('GE FM examination snapshots received evidence and makes a complete control admissible',async()=>{
    await decide(report.report_id,await snapshot(report.report_id));
    const row=(await sql('select * from public.ge01_report_status_v where id=$1',[report.report_id]))[0];
    assert.deepEqual(row.blockers,[]);
    assert.equal(row.evidence.length,2);
    const health=(await sql('select public.get_building_health_snapshot() s'))[0].s;
    assert.equal(health.equipment.find(e=>e.code==='GE-01').controlValidity,'valid');
    assert.equal(health.equipment.find(e=>e.code==='GE-01').score,100);
    assert.equal(health.equipment.find(e=>e.code==='GE-01').technicalState,'available');
    assert.equal(health.coverage.currentCount,1);
    assert.equal(health.score.final,null);
  });
  await asRole('field_agent');
  await test('GE owner replay after review preserves both receipts',async()=>{
    assert.equal((await submit()).report_id,report.report_id); await register(manifest[0]);
  });
  await test('GE evidence cannot be modified or deleted directly',async()=>{
    await reject(()=>sql('delete from public.ge01_round_evidence where report_id=$1',[report.report_id]),'42501');
    assert.equal((await sql("delete from storage.objects where bucket_id='round-proofs' and name=$1 returning id",[path(manifest[0])])).length,0);
    assert.equal((await sql("update storage.objects set name='changed' where bucket_id='round-proofs' and name=$1 returning id",[path(manifest[0])])).length,0);
  });
  await test('GE current planning uses source scope and Abidjan deadline',async()=>{
    const ops=(await sql('select public.get_ge01_operations() o'))[0].o;
    assert.equal(ops.timezone,'Africa/Abidjan');assert.equal(ops.policyVersion,'REF-20260901-v1');
    assert.ok(ops.reports.some(r=>r.reportId===report.report_id && r.readAt));
    if(new Date().getUTCDay()!==0) {
      assert.equal(ops.rounds.length,1);assert.equal(new Date(ops.rounds[0].deadline).getUTCHours(),23);
      assert.equal(new Date(ops.rounds[0].deadline).getUTCMinutes(),59);assert.equal(ops.rounds[0].state,'done');
    } else assert.equal(ops.rounds.length,0);
  });
  await test('GE modes isolate status, evidence, and reads',async()=>{
    await sql("select set_config('request.headers',$1,false)",[JSON.stringify(recipeRun?{}:{'x-behira-data-mode':'recette'})]);
    assert.equal((await sql('select * from public.ge01_report_status_v where id=$1',[report.report_id])).length,0);
    assert.equal((await sql("select * from storage.objects where bucket_id='round-proofs' and name=$1",[path(manifest[0])])).length,0);
    await sql("select set_config('request.headers',$1,false)",[JSON.stringify(recipeRun?{'x-behira-data-mode':'recette'}:{})]);
  });
  await asRole('anon');
  await test('GE anonymous cannot query planning',()=>reject(()=>sql('select public.get_ge01_operations()'),'42501'));
  await asRole('field_agent');
  await test('GE a critical numeric value cannot be confirmed conform despite a forged OK status',async()=>{
    const altered=JSON.parse(checks).map(c=>c.code==='tension_batterie'?{...c,value_numeric:22.5,status:'ok'}:c);
    const critical=await submit([],crypto.randomUUID(),JSON.stringify(altered));
    await asRole('facility_manager');
    await reject(()=>snapshot(critical.report_id).then(s=>decide(critical.report_id,s)),'23514');
    assert.equal((await sql('select * from public.ge01_report_reads where report_id=$1',[critical.report_id])).length,0);
  });
  await test('GE new tables enforce RLS and authenticated callers cannot mutate audit or evidence directly',async()=>{
    for(const table of ['ge01_daily_policy','ge01_round_transmissions','ge01_round_evidence','ge01_report_reads','ge01_round_assignments']) {
      const row=(await sql("select relrowsecurity as rls,has_table_privilege('authenticated',oid,'insert') as ins,has_table_privilege('authenticated',oid,'update') as upd,has_table_privilege('anon',oid,'select') as anon from pg_class where oid=$1::regclass",['public.'+table]))[0];
      assert.deepEqual(row,{rls:true,ins:false,upd:false,anon:false});
    }
  });
  for(const kind of ['normal','anomaly','justified']) await test(`GE photo policy ${kind}`,async()=>{
    await asRole('field_agent');
    const answers=JSON.parse(checks).map(c=>kind!=='normal'&&c.code==='tension_batterie'?{...c,value_numeric:24}:c);
    if(kind==='justified')answers.push({code:'PHOTO_EXCEPTION',label:'Photo impossible',status:'ok',value_text:'Appareil indisponible'});
    const r=await submit([],crypto.randomUUID(),JSON.stringify(answers));
    await asRole('facility_manager');
    if(kind==='normal')await decide(r.report_id,await snapshot(r.report_id));
    const blockers=(await sql('select blockers from public.ge01_report_status_v where id=$1',[r.report_id]))[0].blockers;
    assert.equal(blockers.includes('anomaly_photo_or_reason_missing'),kind==='anomaly');
    assert.equal(blockers.includes('mc4_photo_missing'),false);
    assert.equal(blockers.includes('counter_photo_missing'),false);
    if(kind==='normal')assert.deepEqual(blockers,[]);
  });

}
