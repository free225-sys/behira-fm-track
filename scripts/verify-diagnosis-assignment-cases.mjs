import assert from 'node:assert/strict';

export async function verifyDiagnosisAssignment({db,sql,asRole,identities,test,reject,submit,snapshot,decide,issueChecks}) {
 await asRole('field_agent');
 const report=await submit(crypto.randomUUID(),issueChecks);
 await asRole('facility_manager');
 const reviewed=await decide(report.report_id,await snapshot(report.report_id),'anomaly','RECETTE affectation',['ats_auto'],'NORMAL','Diagnostic à affecter');
 const reference=reviewed.anomaly_reference;
 const state=async()=>(await sql('select * from public.anti_zombie_summary_v where anomaly_id=$1',[reviewed.anomaly_id]))[0];
 const version=(await state()).version_no,key=crypto.randomUUID();
 const assign=async(agent='TEST-field_agent',comment='Diagnostic à réaliser',id=key,base=version)=>(await sql('select public.assign_ge01_diagnosis($1,$2,$3,$4,$5) r',[reference,agent,comment,base,id]))[0].r;
 const agents=async()=>(await sql('select public.get_ge01_diagnosis_assignees() r'))[0].r.filter(a=>a.reference===reference);
 await test('diagnosis: FM receives scoped active agents without personal contact data',async()=>{
  const list=await agents();assert.ok(list.some(a=>a.employeeCode==='TEST-field_agent'));
  for(const row of list) assert.deepEqual(Object.keys(row).sort(),['employeeCode','label','reference']);
 });
 for(const role of ['field_agent','direction','read_only']) {
  await asRole(role);
  await test(`diagnosis: ${role} cannot assign or export the agent directory`,async()=>{
   await reject(()=>assign(),'42501');assert.deepEqual(await agents(),[]);
  });
 }
 await asRole('anon');await test('diagnosis: anonymous RPC rejected',()=>reject(()=>agents(),'42501'));
 await asRole('facility_manager');
 await test('diagnosis: forged owner, empty comment, stale version rejected',async()=>{
  await reject(()=>assign('TEST-direction'),'23514');
  await reject(()=>assign('TEST-field_agent',' '),'22023');
  await reject(()=>assign('TEST-field_agent','Diagnostic à réaliser',key,0),'40001');
 });
 await db.exec('reset role');
 await sql("update public.profiles set account_status='suspended' where id=$1",[identities.field_agent.profileId]);
 await asRole('facility_manager');
 await test('diagnosis: locked account absent and rejected even with a previously selected code',async()=>{
  assert.equal((await agents()).some(a=>a.employeeCode==='TEST-field_agent'),false);
  await reject(()=>assign(),'23514');
 });
 await db.exec('reset role');await sql("update public.profiles set account_status='active' where id=$1",[identities.field_agent.profileId]);
 await asRole('facility_manager');
 let result;
 await test('diagnosis: assignment persists owner and canonical diagnostic action',async()=>{
  result=await assign();assert.equal(result.replayed,false);
  const row=await state();assert.equal(row.next_action_code,'PERFORM_DIAGNOSIS');
  assert.equal(row.next_action_assigned_profile_id,identities.field_agent.profileId);
  assert.equal(row.responsible_profile_id,identities.field_agent.profileId);
  assert.equal((await agents()).length,0);
 });
 const assignedState=await state();
 await test('diagnosis: lost-response retry returns stored result without new version',async()=>{
  assert.deepEqual(await assign(),{...result,replayed:true});
  assert.equal((await state()).version_no,assignedState.version_no);
 });
 await test('diagnosis: changed retry payload conflicts; second command cannot reassign',async()=>{
  await reject(()=>assign('TEST-field_agent','Autre commentaire'),'23505');
  await reject(()=>assign('TEST-field_agent','Diagnostic à réaliser',crypto.randomUUID(),assignedState.version_no),'23514');
 });
 await test('diagnosis: receipt and internal one-shot command cannot be forged',async()=>{
  await reject(()=>sql('delete from ge01_private.ge01_assignment_receipts where request_id=$1',[key]),'42501');
  await reject(()=>sql('select ge01_private.assign_ge01_diagnosis_once($1,$2,$3,$4,$5)',[reference,'TEST-field_agent','Contournement',version,crypto.randomUUID()]),'42501');
 });
 await asRole('field_agent');
 await sql('select public.complete_qualification_action($1,$2,$3,$4,$5)',[reference,assignedState.next_action_id,'Diagnostic terrain terminé',crypto.randomUUID(),assignedState.version_no]);
 await asRole('facility_manager');
 await test('diagnosis: late retry never rewinds a diagnosis already completed',async()=>{
  const before=await state();assert.equal(before.next_action_code,'CHOOSE_TREATMENT_BRANCH');
  assert.equal((await assign()).replayed,true);assert.equal((await state()).version_no,before.version_no);
 });
}
