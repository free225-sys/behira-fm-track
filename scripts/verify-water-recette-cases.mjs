import assert from 'node:assert/strict';
import {runnerImport} from 'vite';
import {fileURLToPath} from 'node:url';
export async function verifyWaterRecette({db,sql,asRole,identities,test,reject}) {
 await db.exec('reset role;begin');
 const fail=async(fn,code)=>{await db.exec('savepoint water_error');try{await reject(fn,code);}finally{await db.exec('rollback to water_error;release water_error');}};
 const mode=async(recipe)=>sql("select set_config('request.headers',$1,true)",[JSON.stringify(recipe?{'x-behira-data-mode':'recette'}:{})]);
 const raw=checks=>JSON.stringify(checks.map(c=>({code:c.code,label:c.label,status:c.status,unit:c.unit,notes:c.notes,value_numeric:c.valueNumeric,value_boolean:c.valueBoolean,value_text:c.valueText})));
 try{
  const {module:wilo}=await runnerImport(fileURLToPath(new URL('../app/lib/wilo/report.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
  const answers={};for(const [code,,type] of wilo.WILO_FIELDS)answers[code]=type==='bool'?'no':type==='bar'?'5':type==='%'?'50':type.split('|')[0];
  const checks=wilo.buildWiloChecks('4.4','70',{auto:true,p1:true,p2:true,leak:true,valves:true,alarm:true},answers,{},'Photo fictive non disponible');
  const at=new Date(Date.now()-60000).toISOString();
  const send=async(id=crypto.randomUUID(),recipe=true,attested=true)=>(await sql("select public.submit_field_round_offline($1,'WILO-01','wilo_round',$2,'Ronde WILO fictive',$3,'Écart WILO fictif','Constat fictif','Moyenne',$4,$5) r",[id,at,raw(checks),recipe,attested]))[0].r;
  await mode(true);await asRole('field_agent');
  await test('water recette: disabled feature blocks submission',()=>fail(()=>send(),'42501'));
  await db.exec('reset role;update public.recette_configuration set enabled=true');
  await asRole('field_agent');
  await test('water recette: GE-only agent cannot submit WILO',()=>fail(()=>send(),'42501'));
  await db.exec('reset role');await sql("update public.user_roles set equipment_id=(select id from public.equipment where code='WILO-01') where profile_id=$1",[identities.field_agent.profileId]);
  await asRole('field_agent');
  await test('water recette: missing explicit attestation rejected',()=>fail(()=>send(crypto.randomUUID(),true,false),'42501'));
  await test('water recette: real payload on recipe connection rejected',()=>fail(()=>send(crypto.randomUUID(),false,false),'42501'));
  const id=crypto.randomUUID();let w;
  await test('water recette: scoped WILO submission and replay are isolated',async()=>{w=await send(id);assert.equal(w.is_test,true);assert.equal((await send(id)).report_id,w.report_id);assert.equal((await sql('select score from public.reports where id=$1',[w.report_id]))[0].score,null);assert.equal((await sql('select is_test from public.anomalies where source_report_id=$1',[w.report_id]))[0].is_test,true);});
  await test('water recette: agent cannot examine own WILO',()=>fail(()=>sql("select public.examine_wilo_report($1,now(),'read','Lu')",[w.report_id]),'42501'));
  await asRole('facility_manager');
  let updated=(await sql('select updated_at from public.reports where id=$1',[w.report_id]))[0].updated_at;
  await test('water recette: WILO read and return have durable audit',async()=>{
   for(let i=0;i<2;i++)await sql("select public.examine_wilo_report($1,$2,'read','Rapport lu')",[w.report_id,updated]);
   await fail(()=>sql("select public.examine_wilo_report($1,$2,'return','')",[w.report_id,updated]),'23514');
   await sql("select public.examine_wilo_report($1,$2,'return','Reprendre le relevé fictif')",[w.report_id,updated]);
   const rows=(await sql('select public.get_wilo_rounds() r'))[0].r;assert.ok(rows.find(x=>x.id===w.report_id).readAt);assert.equal(rows.find(x=>x.id===w.report_id).returnReason,'Reprendre le relevé fictif');
   assert.equal((await sql('select count(*)::int n from public.wilo_report_examinations where report_id=$1',[w.report_id]))[0].n,2);
   assert.equal((await sql("select count(*)::int n from public.audit_events where table_name='wilo_report_examinations' and new_data->>'report_id'=$1",[w.report_id]))[0].n,2);
  });
  await mode(false);
  await test('water recette: real workspace hides WILO reports, exams and anomalies',async()=>{
   assert.equal((await sql('select public.get_wilo_rounds() r'))[0].r.some(x=>x.id===w.report_id),false);
   for(const table of ['report_checks','wilo_report_examinations'])assert.equal((await sql(`select * from public.${table} where report_id=$1`,[w.report_id])).length,0);
   assert.equal((await sql('select id from public.anomalies where source_report_id=$1',[w.report_id])).length,0);
   await fail(()=>sql("select public.examine_wilo_report($1,$2,'read','Rapport lu')",[w.report_id,updated]),'23514');
  });
  const before=(await sql('select public.get_building_health_snapshot() s'))[0].s;
  await mode(true);
  const {module:ria}=await runnerImport(fileURLToPath(new URL('../app/lib/ria/report.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
  const d=ria.emptyRiaDraft();d.performedAt=at;for(const [key,,type] of ria.RIA_FIELDS)d.answers[key]=type==='bool'?(['gmp_fault','gmp_stop','isg_fault'].includes(key)?'no':'yes'):type==='number'?'5':type.split('|')[0];
  const photo={id:crypto.randomUUID(),purpose:'room',mimeType:'image/png',size:68,sha256:'a'.repeat(64)};
  let r;const rkey=crypto.randomUUID();const sendR=async()=>(await sql('select public.submit_ria_round_offline($1,$2,$3,$4,$5,true,true) r',[rkey,at,'RIA fictif',raw(ria.riaChecks(d)),JSON.stringify([photo])]))[0].r;
  await asRole('field_agent');
  await test('water recette: WILO-only agent cannot submit RIA',()=>fail(()=>sendR(),'42501'));
  await db.exec('reset role');await sql("update public.user_roles set equipment_id=(select id from public.equipment where code='RIA-01') where profile_id=$1",[identities.field_agent.profileId]);
  await asRole('field_agent');
  await test('water recette: RIA classification and retry preserved',async()=>{r=await sendR();assert.equal(r.is_test,true);assert.equal((await sendR()).report_id,r.report_id);});
  const path=`${r.report_id}/${photo.id}-${photo.sha256}`;
  await test('water recette: missing RIA evidence blocks receipt',()=>fail(()=>sql('select public.confirm_ria_round($1)',[r.report_id]),'23514'));
  await mode(false);
  await test('water recette: real connection cannot upload fictitious RIA proof',()=>fail(()=>sql("insert into storage.objects(bucket_id,name,owner_id,metadata) values('health-proofs',$1,$2,$3)",[path,identities.field_agent.userId,JSON.stringify({mimetype:'image/png',size:68})]),'42501'));
  await mode(true);await sql("insert into storage.objects(bucket_id,name,owner_id,metadata) values('health-proofs',$1,$2,$3)",[path,identities.field_agent.userId,JSON.stringify({mimetype:'image/png',size:68})]);
  await sql('select public.confirm_ria_round($1)',[r.report_id]);
  await asRole('facility_manager');
  await test('water recette: FM reads evidence and reviews RIA in matching space',async()=>{
   assert.equal((await sql("select name from storage.objects where name=$1",[path])).length,1);
   await sql('select public.register_health_proof($1,$2,$3)',[photo.id,r.report_id,path]);
   updated=(await sql('select updated_at from public.reports where id=$1',[r.report_id]))[0].updated_at;
   const a=(await sql('select public.get_ria_rounds() r'))[0].r.find(x=>x.id===r.report_id).analysis;
   await sql("select public.examine_ria_report($1,$2,'read','Rapport lu')",[r.report_id,updated]);
   await sql("select public.review_health_source($1,'equipment','RIA-01',$2,$3,$4,$5,'Revue fictive complète')",[crypto.randomUUID(),r.report_id,updated,JSON.stringify({complete:true,technicalState:a.technicalState,fieldMap:a.fieldMap,findings:a.findings,proofMap:{room:photo.id}}),[photo.id]]);
   assert.equal((await sql('select is_test from public.health_source_reviews where report_id=$1',[r.report_id]))[0].is_test,true);
  });
  await mode(false);
  await test('water recette: production health excludes reviewed RIA and fictitious evidence',async()=>{
   const after=(await sql('select public.get_building_health_snapshot() s'))[0].s;
   assert.deepEqual(after.equipment,before.equipment);
   assert.equal((await sql("select name from storage.objects where name=$1",[path])).length,0);
   assert.equal((await sql('select public.get_ria_rounds() r'))[0].r.some(x=>x.id===r.report_id),false);
   assert.equal((await sql('select * from public.ria_report_examinations where report_id=$1',[r.report_id])).length,0);
   await fail(()=>sql('select public.confirm_ria_round($1)',[r.report_id]),'42501');
  });
  await db.exec('reset role;update public.recette_configuration set enabled=false');await asRole('facility_manager');await mode(true);
  await test('water recette: disabling feature stops RIA confirmation and hides history',async()=>{await fail(()=>sql('select public.confirm_ria_round($1)',[r.report_id]),'42501');assert.deepEqual((await sql('select public.get_ria_rounds() r'))[0].r,[]);assert.deepEqual((await sql('select public.get_wilo_rounds() r'))[0].r,[]);});
 }finally{await db.exec('rollback;reset role');}
}
