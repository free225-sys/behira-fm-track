import assert from 'node:assert/strict';
import {runnerImport} from 'vite';
import {fileURLToPath} from 'node:url';
export async function verifyRia({db,sql,asRole,identities,test,reject,recipeRun}) {
 const {module:ria}=await runnerImport(fileURLToPath(new URL('../app/lib/ria/report.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
 const d=ria.emptyRiaDraft();d.performedAt=new Date(Date.now()-10000).toISOString();
 for(const [key,,type] of ria.RIA_FIELDS)d.answers[key]=type==='bool'?(['gmp_fault','gmp_stop','isg_fault'].includes(key)?'no':'yes'):type==='number'?'5':type.split('|')[0];
 const normalized=(patch={})=>ria.riaChecks({...d,answers:{...d.answers,...patch}});
 const raw=checks=>checks.map(c=>({code:c.code,label:c.label,status:c.status,unit:c.unit,notes:c.notes,value_numeric:c.valueNumeric,value_boolean:c.valueBoolean,value_text:c.valueText}));
 const analyze=async(patch={})=>(await sql('select health_private.ria_analysis($1::jsonb) a',[JSON.stringify(normalized(patch))]))[0].a;
 await db.exec('reset role;begin');
 const originalReject=reject;reject=async(fn,code)=>{await db.exec('savepoint ria_error');try{await originalReject(fn,code);}finally{await db.exec('rollback to ria_error;release ria_error');}};
 try {
  await asRole('facility_manager');
  for(const [name,patch,state,score] of [
   ['nominal',{},'available',100],['low alert',{pressure_p1:'4.4',pressure_p2:'4.4'},'degraded',96],
   ['lower alert boundary',{pressure_p1:'4.5',pressure_p2:'4.5'},'available',100],
   ['upper alert boundary',{pressure_p1:'5.5',pressure_p2:'5.5'},'available',100],
   ['critical boundary',{pressure_p1:'4.25',pressure_p2:'4.25'},'degraded',96],
   ['pressure critical',{pressure_p1:'4.24',pressure_p2:'4.24'},'degraded',40],
   ['real zero',{pressure_p1:'0',pressure_p2:'0'},'unavailable',40],
   ['loss of function at 2.5',{pressure_p1:'2.5',pressure_p2:'2.5'},'unavailable',40],
   ['one pump',{ria1:'no'},'degraded',96],['both pumps',{ria1:'no',ria2:'no'},'unavailable',59],
   ['valves single root cause',{suction:'no',discharge:'no'},'unavailable',30],
   ['GMP OFF',{gmp_mode:'Off'},'unavailable',40],['manual',{gmp_mode:'Manuel non justifié'},'degraded',59],
   ['mean pressure',{pressure_p1:'4.4',pressure_p2:'4.8'},'available',100],
   ['unreliable gauges',{pressure_p1:'4',pressure_p2:'5.3'},null,null],
  ]) await test(`RIA ${name}`,async()=>{const a=await analyze(patch);assert.equal(a.technicalState,state);assert.equal(a.score,score);});
  await test('RIA absent value requires reason and never becomes zero',async()=>{
   assert.throws(()=>normalized({pressure_p1:''}));
   const checks=ria.riaChecks({...d,answers:{...d.answers,pressure_p1:'unknown'},reasons:{pressure_p1:'Manomètre illisible'}});
   const a=(await sql('select health_private.ria_analysis($1) a',[JSON.stringify(checks)]))[0].a;
   assert.equal(a.complete,false);assert.equal(a.score,null);
  });
  await test('RIA negative pressure rejected on both client and server',async()=>{
   assert.throws(()=>normalized({pressure_p1:'-1'}));const checks=normalized();checks.find(x=>x.code==='pressure_p1').valueNumeric=-1;
   await reject(()=>sql('select health_private.ria_analysis($1)',[JSON.stringify(checks)]),'23514');
  });
  await test('RIA forged derived valves refused',async()=>{const checks=normalized({suction:'no'});checks.find(x=>x.code==='valves_open').valueBoolean=true;await reject(()=>sql('select health_private.ria_analysis($1)',[JSON.stringify(checks)]),'23514');});
  const photos=['gmp','isg','gauges','room'].map((purpose,i)=>({id:crypto.randomUUID(),purpose,mimeType:'image/png',size:68,sha256:String(i+1).repeat(64)}));
  const key=crypto.randomUUID();
  const submit=async(patch={},manifest=photos,id=key)=>(await sql('select public.submit_ria_round_offline($1,$2,$3,$4,$5,$6,$7) r',[id,d.performedAt,'Contrôle local de test',JSON.stringify(raw(normalized(patch))),JSON.stringify(manifest),recipeRun,recipeRun]))[0].r;
  await asRole('field_agent');await test('RIA GE-only agent cannot submit',()=>reject(()=>submit(),'42501'));
  await db.exec('reset role');await sql("update public.user_roles set equipment_id=(select id from public.equipment where code='RIA-01') where profile_id=$1",[identities.field_agent.profileId]);
  await asRole('field_agent');let r;
  await test('RIA scoped agent submits raw source without health score',async()=>{r=await submit();assert.ok(r.report_id);assert.equal((await sql('select public.get_ria_rounds() r'))[0].r[0].clientMutationId,key);assert.equal((await sql('select public.get_ria_rounds() r'))[0].r[0].reviewedAt,null);});
  await test('RIA repeat send returns same report',async()=>assert.equal((await submit()).report_id,r.report_id));
  await test('RIA changed answer or manifest with same key conflicts',async()=>{await reject(()=>submit({ria1:'no'}),'23505');await reject(()=>submit({},photos.slice(0,3)),'23505');});
  await test('RIA cannot confirm before all files arrive',()=>reject(()=>sql('select public.confirm_ria_round($1)',[r.report_id]),'23514'));
  for(const p of photos)await sql("insert into storage.objects(bucket_id,name,owner_id,metadata) values('health-proofs',$1,$2,$3)",[`${r.report_id}/${p.id}-${p.sha256}`,identities.field_agent.userId,JSON.stringify({size:p.size,mimetype:p.mimeType})]);
  await test('RIA final photo confirms transmission idempotently',async()=>{const one=(await sql('select public.confirm_ria_round($1) t',[r.report_id]))[0].t;assert.deepEqual((await sql('select public.confirm_ria_round($1) t',[r.report_id]))[0].t,one);});
  await test('RIA agent cannot accept a photo as FM',()=>reject(()=>sql('select public.register_health_proof($1,$2,$3)',[photos[0].id,r.report_id,`${r.report_id}/${photos[0].id}-${photos[0].sha256}`]),'42501'));
  await asRole('facility_manager');
  for(const p of photos)await sql('select public.register_health_proof($1,$2,$3)',[p.id,r.report_id,`${r.report_id}/${p.id}-${p.sha256}`]);
  const a=await analyze();const data={complete:true,technicalState:a.technicalState,fieldMap:a.fieldMap,findings:a.findings,proofMap:Object.fromEntries(photos.map(p=>[p.purpose,p.id]))};
  const updated=(await sql('select updated_at from public.reports where id=$1',[r.report_id]))[0].updated_at;
  await test('RIA FM read is recorded and replayed',async()=>{for(let i=0;i<2;i++)await sql("select public.examine_ria_report($1,$2,'read','Rapport lu')",[r.report_id,updated]);assert.ok((await sql('select public.get_ria_rounds() r'))[0].r[0].readAt);});
  await test('RIA return requires a reason',()=>reject(()=>sql("select public.examine_ria_report($1,$2,'return','')",[r.report_id,updated]),'23514'));
  const reviewId=crypto.randomUUID();const review=(override=data,id=reviewId)=>sql("select public.review_health_source($1,'equipment','RIA-01',$2,$3,$4,$5,$6)",[id,r.report_id,updated,JSON.stringify(override),photos.map(p=>p.id),'Revue locale des photos']);
  await test('RIA FM cannot invent a penalty absent from observations',()=>reject(()=>review({...data,findings:[{checkCode:'clean',severity:'alert',cause:'clean',rule:'observation'}],technicalState:'degraded'}),'23514'));
  await test('RIA FM review makes score admissible',async()=>{await review();const s=(await sql('select public.get_building_health_snapshot() s'))[0].s;assert.equal(s.equipment.find(e=>e.code==='RIA-01').score,100);});
  await test('RIA FM review retry is idempotent',async()=>{await review();assert.equal((await sql("select count(*)::int n from public.health_source_reviews where report_id=$1",[r.report_id]))[0].n,1);});
  await test('RIA cannot return an accepted control',()=>reject(()=>sql("select public.examine_ria_report($1,$2,'return','Nouvelle visite')",[r.report_id,updated]),'23514'));
  const incomplete=await submit({},[],crypto.randomUUID());await sql('select public.confirm_ria_round($1)',[incomplete.report_id]);
  const incompleteUpdated=(await sql('select updated_at from public.reports where id=$1',[incomplete.report_id]))[0].updated_at;
  await test('RIA return is visible to the scoped agent',async()=>{await sql("select public.examine_ria_report($1,$2,'return','Photos requises')",[incomplete.report_id,incompleteUpdated]);await asRole('field_agent');assert.equal((await sql('select public.get_ria_rounds() r'))[0].r.find(x=>x.id===incomplete.report_id).returnReason,'Photos requises');});
  await asRole('facility_manager');
  for(const scenario of [
    {name:'normal no photo',patch:{},reason:'',ok:true},
    {name:'anomaly without photo or reason',patch:{clean:'no'},reason:'',ok:false},
    {name:'anomaly justified photo impossibility',patch:{clean:'no'},reason:'Appareil photo hors service',ok:true},
  ]) await test(`RIA photo policy: ${scenario.name}`,async()=>{
    const checks=normalized(scenario.patch);
    if(scenario.reason)checks.push({code:'PHOTO_EXCEPTION',label:'Photo impossible',status:'ok',valueText:scenario.reason});
    const rr=(await sql('select public.submit_ria_round_offline($1,$2,$3,$4,$5,$6,$7) r',[crypto.randomUUID(),d.performedAt,'Photo policy local',JSON.stringify(raw(checks)),'[]',recipeRun,recipeRun]))[0].r;
    await sql('select public.confirm_ria_round($1)',[rr.report_id]);
    const aa=await analyze(scenario.patch);
    const updatedAt=(await sql('select updated_at from public.reports where id=$1',[rr.report_id]))[0].updated_at;
    const run=()=>sql("select public.review_health_source($1,'equipment','RIA-01',$2,$3,$4,$5,$6)",[crypto.randomUUID(),rr.report_id,updatedAt,JSON.stringify({complete:true,technicalState:aa.technicalState,findings:aa.findings,fieldMap:aa.fieldMap,proofMap:{}}),[],'Examen local de la justification']);
    if(scenario.ok)await run();else await reject(run,'23514');
  });
  await asRole('anon');await test('RIA anonymous read denied',()=>reject(()=>sql('select public.get_ria_rounds()'),'42501'));
 }finally{await db.exec('rollback;reset role');}
}

