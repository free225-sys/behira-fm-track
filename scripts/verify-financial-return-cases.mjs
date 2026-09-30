import assert from 'node:assert/strict';

export async function verifyFinancialReturns({db,sql,asRole,identities,test,reject,recipeRun,submit,snapshot,decide,issueChecks}) {
 await asRole('field_agent');
 const report=await submit(crypto.randomUUID(),issueChecks);
 await asRole('facility_manager');
 const review=await decide(report.report_id,await snapshot(report.report_id),'anomaly','RECETTE — arbitrage à compléter',['ats_auto'],'NORMAL','Arbitrage à compléter');
 const reference=review.anomaly_reference;
 const state=async()=>(await sql('select * from public.anti_zombie_summary_v where anomaly_id=$1',[review.anomaly_id]))[0];
 await sql('select public.assign_ge01_diagnosis($1,$2,$3,$4,$5)',[reference,'TEST-field_agent','Diagnostic de recette',(await state()).version_no,crypto.randomUUID()]);
 const pending=async()=>(await sql('select public.get_building_health_snapshot() s'))[0].s.pendingDecisions;
 const fmBefore=await pending();
 const cost=async(amount=400000,parent=null,key=crypto.randomUUID(),reason='Devis à examiner')=>
  (await sql('select public.submit_anomaly_cost_decision($1,$2,$3,$4,$5,$6) r',[reference,amount,'opex',reason,key,parent]))[0].r;
 const initial=await cost();
 const reviewKey=crypto.randomUUID();
 const returned=async(decision='returned',comment='Devis incomplet : détailler les pièces',key=reviewKey,ref=initial.cost_reference)=>
  (await sql('select public.review_anomaly_cost_decision($1,$2,$3,$4) r',[ref,decision,comment,key]))[0].r;
 for(const role of ['facility_manager','field_agent','read_only','anon']) {
  await asRole(role);await test(`financial return: ${role} cannot return an arbitration`,()=>reject(()=>returned(),'42501'));
 }
 await asRole('direction');const adminBefore=await pending();
 await test('financial return: blank reason and null decision rejected',async()=>{
  await reject(()=>returned('returned','  '),'22023');await reject(()=>returned(null),'22023');
 });
 await test('financial return: motivated immutable audit without closing dossier',async()=>{
  assert.equal((await returned()).approval_status,'returned');
  const row=(await sql('select * from public.costs where id=$1',[initial.cost_id]))[0];
  assert.equal(row.approval_status,'returned');assert.equal(row.approved_at,null);assert.equal(row.approved_by_profile_id,null);
  assert.equal(row.reviewed_by_profile_id,identities.direction.profileId);assert.equal(row.is_test,recipeRun);
  assert.equal((await state()).is_closed,false);assert.equal(await pending(),adminBefore-1);
  const history=await sql("select comment,change_set from public.anomaly_history where source_record_id=$1 and event_type='cost_returned'",[initial.cost_id]);
  assert.equal(history.length,1);assert.equal(history[0].comment,'Devis incomplet : détailler les pièces');
 });
 await test('financial return: retry unchanged creates no duplicate event; changed payload conflicts',async()=>{
  assert.equal((await returned()).replayed,true);await reject(()=>returned('rejected'),'23505');
  await reject(()=>returned('approved','Autre décision',crypto.randomUUID()),'23514');
  await reject(()=>sql("update public.costs set review_comment='Autre motif' where id=$1",[initial.cost_id]),'23514');
  assert.equal((await sql("select count(*)::int n from public.anomaly_history where source_record_id=$1 and event_type='cost_returned'",[initial.cost_id]))[0].n,1);
 });
 await asRole('facility_manager');
 await test('financial return: same dossier moves into FM pending counter once',async()=>assert.equal(await pending(),fmBefore+1));
 const replacementKey=crypto.randomUUID();let replacement;
 await test('financial return: revised estimate keeps original, relation and threshold boundary',async()=>{
  replacement=await cost(400000,initial.cost_reference,replacementKey,'Devis complété');
  assert.notEqual(replacement.cost_id,initial.cost_id);assert.equal(replacement.approval_status,'pending');
  const row=(await sql('select * from public.costs where id=$1',[replacement.cost_id]))[0];
  assert.equal(row.replaces_cost_id,initial.cost_id);assert.equal(Number(row.threshold_amount_snapshot),400000);assert.equal(row.decision_scope,'administration');
  assert.equal(await pending(),fmBefore);
  assert.equal((await sql('select approval_status from public.costs where id=$1',[initial.cost_id]))[0].approval_status,'returned');
 });
 await test('financial return: resubmission retry is stable; competing or changed revisions rejected',async()=>{
  assert.equal((await cost(400000,initial.cost_reference,replacementKey,'Devis complété')).cost_id,replacement.cost_id);
  await reject(()=>cost(410000,initial.cost_reference,replacementKey,'Devis complété'),'23505');
  await reject(()=>cost(420000,initial.cost_reference),'23505');
  await reject(()=>cost(420000,replacement.cost_reference),'23514');
 });
 await asRole('direction');
 await test('financial return: new arbitration re-enters Administration pending count',async()=>assert.equal(await pending(),adminBefore));
 await returned('returned','Deuxième complément nécessaire',crypto.randomUUID(),replacement.cost_reference);
 await asRole('facility_manager');
 await test('financial return: second revision below threshold is FM-approved without double-counting old returns',async()=>{
  const last=await cost(399999,replacement.cost_reference);
  assert.equal(last.approval_status,'approved');assert.equal(last.decision_scope,'facility_manager');assert.equal(await pending(),fmBefore);
  await reject(()=>sql('update public.costs set replaces_cost_id=null where id=$1',[last.cost_id]),'23514');
 });
 await test('financial return: other data mode cannot see known returned references',async()=>{
  await db.exec('reset role; begin');
  try{
   await sql('select set_config($1,$2,true)',['request.headers',JSON.stringify({'x-behira-data-mode':recipeRun?'real':'recette'})]);
   if(!recipeRun)await sql('update public.recette_configuration set enabled=true');
   await asRole('facility_manager');assert.equal((await sql('select id from public.costs where id=$1',[initial.cost_id])).length,0);
  }finally{await db.exec('rollback; reset role');}
 });
}
