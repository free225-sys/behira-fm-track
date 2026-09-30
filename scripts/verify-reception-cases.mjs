import assert from 'node:assert/strict';

export async function verifyReception({db,sql,asRole,identities,test,reject,reference,anomalyId,advance,deposit,reviewProof,state}) {
  const first=await state();
  const key=crypto.randomUUID();
  const decide=(decision='returned',comment='Résultat insuffisant : reprendre le contrôle final.',version=first.version_no,id=key)=>
    sql('select public.receive_intervention($1,$2,$3,$4,$5) result',[reference,decision,comment,version,id]);
  for(const role of ['field_agent','direction','read_only','anon']) {
    await asRole(role);await test(`reception: ${role} cannot decide`,()=>reject(()=>decide(),'42501'));
  }
  await asRole('facility_manager');
  await test('reception: legacy closure cannot bypass reception',()=>reject(()=>advance('Clôturée'),'23514'));
  await test('reception: missing reason and stale version rejected',async()=>{
    await reject(()=>decide('returned',''),'22023');
    await reject(()=>decide('returned','Motif complet de retour au responsable.',first.version_no-1),'40001');
  });
  await test('reception: return preserves result and sends correction to agent',async()=>{
    const receipt=(await decide())[0].result;
    assert.equal(receipt.decision,'returned');
    const row=await state();assert.equal(row.status_code,'INTERVENTION_INTERNE_PLANIFIEE');
    assert.equal(new Date(row.due_at).getTime(),new Date(first.due_at).getTime(),'Return preserves the original SLA deadline');
    assert.equal(row.next_action_assigned_profile_id,identities.field_agent.profileId);
    assert.equal((await sql('select count(*)::int n from public.interventions where anomaly_id=$1 and ended_at is not null',[anomalyId]))[0].n,1);
    assert.equal((await decide())[0].result.replayed,true);
    await reject(()=>decide('accepted'),'22023');
    await reject(()=>sql("update public.intervention_receptions set comment='altération' where anomaly_id=$1",[anomalyId]),'42501');
  });
  await asRole('field_agent');
  await advance('En intervention','Reprise après retour motivé du FM.');
  await advance('En validation','Correction terminée, nouveau contrôle conforme.');
  await test('reception: previous accepted proof does not certify the correction',async()=>{
    assert.equal((await state()).next_action_code,'GE01_SUBMIT_PROOF');
  });
  const proof=await deposit();await reviewProof(proof.proof_id,'accepted','Nouvelle preuve de la correction contrôlée.');
  await test('reception: acceptance closes atomically and remains idempotent',async()=>{
    const version=(await state()).version_no,id=crypto.randomUUID();
    const result=(await decide('accepted','Correction réceptionnée et dossier clôturé.',version,id))[0].result;
    assert.equal(result.status_code,'CLOTURE');assert.equal((await state()).is_closed,true);
    assert.equal((await decide('accepted','Correction réceptionnée et dossier clôturé.',version,id))[0].result.replayed,true);
    assert.equal((await sql('select count(*)::int n from public.intervention_receptions where anomaly_id=$1',[anomalyId]))[0].n,2);
  });
  await test('reception: other data mode cannot read or mutate these receptions',async()=>{
    const headers=(await sql("select current_setting('request.headers',true) value"))[0].value;
    await sql("select set_config('request.headers',$1,false)",[process.env.GE01_RECIPE_TEST==='1'?'{}':'{"x-behira-data-mode":"recette"}']);
    assert.equal((await sql('select count(*)::int n from public.intervention_receptions where anomaly_id=$1',[anomalyId]))[0].n,0);
    await reject(()=>decide(),'42501');
    await sql("select set_config('request.headers',$1,false)",[headers||'{}']);
  });
  await db.exec('reset role');
  const equipment=(await sql("select id from public.equipment where code='WILO-01'"))[0].id;
  const oldScope=(await sql('select equipment_id from public.user_roles where profile_id=$1',[identities.field_agent.profileId]))[0].equipment_id;
  await sql('update public.user_roles set equipment_id=$1 where profile_id=$2',[equipment,identities.field_agent.profileId]);
  const generic=(await sql(`insert into public.anomalies(reference,title,description,equipment_id,category_id,priority_id,current_status_id,reported_by_profile_id,assigned_profile_id,source_report_id,is_test)
    select null,'RECETTE réception WILO','Fixture de recette isolée',$2,category_id,priority_id,
    (select id from public.status_definitions where code='A_QUALIFIER'),reported_by_profile_id,assigned_profile_id,source_report_id,is_test
    from public.anomalies where id=$1 returning id,reference`,[anomalyId,equipment]))[0];
  await asRole('facility_manager');
  const genericState=async()=>(await sql('select * from public.anti_zombie_summary_v where anomaly_id=$1',[generic.id]))[0];
  const genericAdvance=target=>sql('select public.advance_anomaly_workflow($1,$2,$3)',[generic.reference,target,'Recette intervention générique.']);
  await genericAdvance('Affectée');await asRole('field_agent');await genericAdvance('En intervention');await genericAdvance('En validation');
  await asRole('facility_manager');
  await test('reception: non-GE equipment has an FM queue and motivated return',async()=>{
    assert.equal((await genericState()).next_action_code,'RECEIVE_INTERVENTION');
    await sql("select public.receive_intervention($1,'returned','Reprendre le contrôle WILO non conforme.',$2,$3)",[generic.reference,(await genericState()).version_no,crypto.randomUUID()]);
    assert.equal((await genericState()).next_action_code,'EXECUTE_INTERVENTION');
    assert.match((await genericState()).next_action_comment,/WILO non conforme/);
  });
  await asRole('field_agent');await genericAdvance('En intervention');await genericAdvance('En validation');await asRole('facility_manager');
  await test('reception: non-GE correction is receivable and closes',async()=>{
    await sql("select public.receive_intervention($1,'accepted','Correction WILO contrôlée et acceptée.',$2,$3)",[generic.reference,(await genericState()).version_no,crypto.randomUUID()]);
    assert.equal((await genericState()).is_closed,true);
  });
  await db.exec('reset role');await sql('update public.user_roles set equipment_id=$1 where profile_id=$2',[oldScope,identities.field_agent.profileId]);await asRole('facility_manager');
}
