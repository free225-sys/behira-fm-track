import assert from 'node:assert/strict';

export async function verifyReopen({sql,asRole,identities,test,reject,reference,anomalyId}) {
  const state=async()=>(await sql('select * from public.anti_zombie_summary_v where anomaly_id=$1',[anomalyId]))[0];
  const before=await state();
  assert.equal(before.is_closed,true);
  const original=(await sql('select closed_at,closure_comment from public.anomalies where id=$1',[anomalyId]))[0];
  const key=crypto.randomUUID();
  const reason='Nouvelle panne observée après la clôture précédente.';
  const reopen=(version=before.version_no,requestKey=key,motive=reason)=>sql(
    'select public.reopen_closed_dossier($1,$2,$3,$4) result',[reference,motive,version,requestKey]);
  for(const role of ['field_agent','read_only','anon']){
    await asRole(role);
    await test(`reopen: ${role} cannot reopen`,()=>reject(()=>reopen(),'42501'));
  }
  const reopenActor=process.env.GE01_RECIPE_TEST==='1'?'direction':'facility_manager';
  await asRole(reopenActor);
  await test('reopen: reason and optimistic version required',async()=>{
    await reject(()=>reopen(before.version_no,crypto.randomUUID(),'  '),'22023');
    await reject(()=>reopen(before.version_no-1,crypto.randomUUID()),'40001');
  });
  let opened;
  await test(`reopen: ${reopenActor} retains closure and creates FM review plus new deadline`,async()=>{
    opened=(await reopen())[0].result;
    const row=await state();
    assert.equal(row.status_code,'A_QUALIFIER');
    assert.equal(row.next_action_code,'REVIEW_REOPENED_DOSSIER');
    assert.equal(row.next_action_assigned_profile_id,identities.facility_manager.profileId);
    assert.ok(new Date(row.due_at)>new Date());
    const previous=(await sql("select change_set,comment from public.anomaly_history where anomaly_id=$1 and event_type='dossier_reopened'",[anomalyId]))[0];
    assert.equal(previous.comment,reason);
    assert.equal(new Date(previous.change_set.previous_closed_at).getTime(),new Date(original.closed_at).getTime());
    assert.equal(previous.change_set.previous_closure_comment,original.closure_comment);
    assert.equal((await sql('select closed_at,resolved_at from public.anomalies where id=$1',[anomalyId]))[0].closed_at,null);
    assert.equal((await sql('select count(*)::int n from public.anomaly_deadlines where anomaly_id=$1 and superseded_at is null',[anomalyId]))[0].n,1);
  });
  await test('reopen: retry is stable and changed payload conflicts',async()=>{
    assert.equal((await reopen())[0].result.review_action_id,opened.review_action_id);
    assert.equal((await reopen())[0].result.replayed,true);
    await reject(()=>reopen(before.version_no,key,'Autre motif de réouverture du dossier.'),'22023');
    await reject(()=>reopen(before.version_no,crypto.randomUUID()),'40001');
  });
  const reviewVersion=(await state()).version_no;
  const reviewKey=crypto.randomUUID();
  const review=async(comment='Réexamen confirmé : lancer une nouvelle qualification.',version=reviewVersion,requestKey=reviewKey)=>
    sql('select public.review_reopened_dossier($1,$2,$3,$4) result',[reference,comment,version,requestKey]);
  await asRole('direction');
  await test('reopen: Administration cannot perform the FM review',()=>reject(()=>review(),'42501'));
  await asRole('facility_manager');
  await test('reopen: FM review records conclusion then hands off to qualification',async()=>{
    const result=(await review())[0].result;
    assert.equal(result.next_action_code,'QUALIFY_ASSIGN');
    assert.equal((await state()).next_action_code,'QUALIFY_ASSIGN');
    assert.equal((await review())[0].result.replayed,true);
    await reject(()=>review('Conclusion de réexamen différente et motivée.'),'22023');
    assert.equal((await sql("select count(*)::int n from public.anomaly_history where anomaly_id=$1 and event_type='reopened_reviewed'",[anomalyId]))[0].n,1);
  });
}
