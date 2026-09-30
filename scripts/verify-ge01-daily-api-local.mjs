import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdirSync,writeFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {runnerImport} from 'vite';

// Opt-in integration test: actual LOCAL Auth, PostgREST and private Storage.
// No reset, no seed, no existing user's credentials changed, no remote target.
const root=fileURLToPath(new URL('../',import.meta.url));
const docker=process.env.DOCKER_EXE ?? 'C:/Users/HP PC/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const cli=root+'node_modules/.pnpm/@supabase+cli-windows-x64@2.115.0/node_modules/@supabase/cli-windows-x64/bin/supabase.exe';
const sql=query=>execFileSync(docker,['exec','-i','supabase_db_behira-fm-track','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:query,encoding:'utf8',windowsHide:true});
const config=JSON.parse(execFileSync(cli,['status','-o','json'],{cwd:root,env:{...process.env,SUPABASE_TELEMETRY_DISABLED:'1'},encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const url=config.API_URL;
if(!url||new URL(url).origin!=='http://127.0.0.1:54321'||!config.ANON_KEY||!config.SERVICE_ROLE_KEY)throw Error('Only the loopback Supabase stack is permitted');
const unwrap=({data,error})=>{if(error)throw Error(`${error.code??'API'}: ${error.message}`);return data;};
const admin=createClient(url,config.SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const clients=[],created=[],results=[];
const make=(recette=true)=>{const c=createClient(url,config.ANON_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:recette?{'x-behira-data-mode':'recette'}:{}}});clients.push(c);return c;};
const test=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
const loadModule=async path=>(await runnerImport(root+path,{configFile:false,logLevel:'silent'})).module;
const enabledBefore=sql('select enabled from public.recette_configuration where singleton;').trim();
assert.ok(['t','f'].includes(enabledBefore));
let reportId;
try{
 assert.equal(sql("select count(*) from supabase_migrations.schema_migrations where version='20260917123248';").trim(),'1','Apply and back up the local candidate first');
 sql('update public.recette_configuration set enabled=true where singleton;');
 const roles=unwrap(await admin.from('roles').select('id,code'));
 const equipment=unwrap(await admin.from('equipment').select('id,code').in('code',['GE-01','WILO-01']));
 const setup=async(role,code='GE-01')=>{
  const suffix=crypto.randomUUID().slice(0,8),password=crypto.randomUUID()+'aA!9',email=`daily-${suffix}@test.invalid`;
  const user=unwrap(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
  const entry={userId:user.id,profileId:crypto.randomUUID()};created.push(entry);
  unwrap(await admin.from('profiles').insert({id:entry.profileId,auth_user_id:user.id,employee_code:'LOCAL-DAILY-'+suffix,display_name:'RECETTE GE photos '+role,account_status:'active',must_change_password:false}));
  unwrap(await admin.from('user_roles').insert({profile_id:entry.profileId,role_id:roles.find(r=>r.code===role).id,...(role==='field_agent'?{equipment_id:equipment.find(e=>e.code===code).id}:{})}));
  const client=make();unwrap(await client.auth.signInWithPassword({email,password}));return {...entry,client,email,password};
 };
 const agent=await setup('field_agent'),fm=await setup('facility_manager'),outsider=await setup('field_agent','WILO-01');
 const {createEmptyGe01Draft,buildGe01Payload}=await loadModule('app/lib/ge01/report.ts');
 const {submitQueuedFieldRound,reviewGe01Report}=await loadModule('app/lib/supabase/mutations.ts');
 const {loadOperationalSnapshot}=await loadModule('app/lib/supabase/data.ts');
 const {readGe01Operations}=await loadModule('app/lib/ge01/operations.ts');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/dsAAAAASUVORK5CYII=','base64');
 const draft={...createEmptyGe01Draft(new Date(Date.now()-60000),crypto.randomUUID()),isTest:true,engineHours:'123,5',starts24h:'0',testDuration:'12',testStartTime:'08:00',startOutcome:'success',functioningCorrect:'yes',returnAuto:'yes',temperatureLocal:'Normal',cleanliness:'Conforme',fuelLevel:{value:'70',unavailable:false,reason:''},oilLevel:{value:'95',unavailable:false,reason:''},waterTemperature:{value:'82',unavailable:false,reason:''},batteryVoltage:{value:'26',unavailable:false,reason:''},abnormalNoise:'no',smoke:'Aucune',geAuto:'yes',atsAuto:'yes',alarmMc4:'Aucune alarme',finalStatus:'Opérationnel',confirmed:true,step:3,comment:'RECETTE LOCALE — FICTIVE — photo PNG de test',evidence:['mc4','engine_counter'].map(purpose=>({id:crypto.randomUUID(),purpose,file:new File([png],purpose+'.png',{type:'image/png'})}))};
 const payload={...buildGe01Payload(draft,'RECETTE agent'),sentAt:new Date().toISOString()};
 const rpc=agent.client.rpc.bind(agent.client);let loseFirstRegistration=true;
 agent.client.rpc=async(...args)=>{const r=await rpc(...args);if(args[0]==='submit_ge01_round_offline'&&!r.error)reportId=r.data.report_id;if(args[0]==='register_ge01_evidence'&&!r.error&&loseFirstRegistration){loseFirstRegistration=false;throw Error('Simulated lost response after actual registration');}return r;};
 const status=async()=>readGe01Operations(unwrap(await fm.client.rpc('get_ge01_operations'))).reports.find(r=>r.reportId===reportId);
 const report=async()=>(await loadOperationalSnapshot(fm.client,true)).reports.find(r=>r.id===reportId);
 await test('actual upload survives a lost registration response; full receipt remains pending',async()=>{
  await assert.rejects(()=>submitQueuedFieldRound(agent.client,draft.submissionId,payload),/Simulated lost response/);
  const r=await status();assert.equal(r.confirmedAt,null);assert.equal(r.evidence.length,1);
 });
 await test('FM cannot approve while the second photo is still pending',async()=>{
  await assert.rejects(async()=>reviewGe01Report(fm.client,await report(),{decision:'conform',comment:'RECETTE contrôle',checkCodes:[]}),/photos|transmission|reçues|preuves/i);
 });
 await test('actual transport retry confirms both photos without duplicating report or evidence',async()=>{
  const receipt=await submitQueuedFieldRound(agent.client,draft.submissionId,payload);assert.equal(receipt.report_id,reportId);
  await submitQueuedFieldRound(agent.client,draft.submissionId,payload);
  const r=await status();assert.ok(r.confirmedAt);assert.equal(r.evidence.length,2);assert.ok(r.blockers.includes('fm_review_pending'));
 });
 const path=(await status()).evidence[0].storagePath;
 await test('authorized FM downloads the exact bytes from the private bucket',async()=>{
  const blob=unwrap(await fm.client.storage.from('round-proofs').download(path));assert.deepEqual(Buffer.from(await blob.arrayBuffer()),png);
  const response=await fetch(`${url}/storage/v1/object/public/round-proofs/${path}`);assert.notEqual(response.status,200);
 });
 const real=make(false);unwrap(await real.auth.signInWithPassword({email:fm.email,password:fm.password}));
 await test('production audience and out-of-scope agent cannot read the fictitious report or photos',async()=>{
  for(const client of [real,outsider.client]){assert.deepEqual(unwrap(await client.from('reports').select('id').eq('id',reportId)),[]);assert.ok((await client.storage.from('round-proofs').download(path)).error);}
 });
 await test('owner cannot overwrite or delete accepted evidence',async()=>{
  assert.ok((await agent.client.storage.from('round-proofs').update(path,new File([png],'replace.png',{type:'image/png'}))).error);
  const removal=await agent.client.storage.from('round-proofs').remove([path]);assert.ok(removal.error||removal.data.length===0);
  assert.ok(unwrap(await fm.client.storage.from('round-proofs').download(path)));
 });
 await test('FM read is explicit, role-restricted and idempotent',async()=>{
  assert.ok((await agent.client.rpc('mark_ge01_report_read',{p_report_id:reportId})).error);
  const first=unwrap(await fm.client.rpc('mark_ge01_report_read',{p_report_id:reportId}));
  assert.equal(unwrap(await fm.client.rpc('mark_ge01_report_read',{p_report_id:reportId})),first);assert.ok((await status()).readAt);
 });
 await test('FM examination snapshots both proofs and admits a complete control',async()=>{
  await reviewGe01Report(fm.client,await report(),{decision:'conform',comment:'RECETTE — vérification des deux photos fictives',checkCodes:[]});
  assert.deepEqual((await status()).blockers,[]);
  const review=unwrap(await fm.client.from('ge01_report_reviews').select('evidence_snapshot').eq('report_id',reportId).single());assert.equal(review.evidence_snapshot.length,2);
 });
 await test('calendar is Abidjan; Saturday control remains valid until Monday at the same hour',async()=>{
  const op=readGe01Operations(unwrap(await fm.client.rpc('get_ge01_operations')));assert.equal(op.timezone,'Africa/Abidjan');
  assert.equal(new Date(unwrap(await fm.client.rpc('ge01_valid_until',{p_performed_at:'2026-09-19T08:00:00Z'}))).toISOString(),'2026-09-21T08:00:00.000Z');
 });
 await test('recorded substitute requires FM and reason; retry preserves one audit entry',async()=>{
  const tomorrow=new Date(Date.now()+86400000);if(tomorrow.getUTCDay()===0)tomorrow.setUTCDate(tomorrow.getUTCDate()+1);
  const args={p_id:crypto.randomUUID(),p_date:tomorrow.toISOString().slice(0,10),p_agent_id:agent.profileId,p_reason:'RECETTE — suppléance fictive'};
  assert.ok((await agent.client.rpc('assign_ge01_round',args)).error);
  assert.ok((await fm.client.rpc('assign_ge01_round',{...args,p_reason:''})).error);
  assert.equal(unwrap(await fm.client.rpc('assign_ge01_round',args)),args.p_id);assert.equal(unwrap(await fm.client.rpc('assign_ge01_round',args)),args.p_id);
 });
 await test('an examined fictitious round still cannot become a production score',async()=>{
  const health=unwrap(await real.rpc('get_building_health_snapshot'));assert.equal(health.score.final,null);
  assert.equal(health.equipment.find(e=>e.code==='GE-01').lastControlAt===payload.performedAt,false);
 });
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 // Keep FK-linked fictitious records as test evidence, but deactivate test identities.
 for(const client of clients)await client.auth.signOut();
 for(const user of created){const banned=await admin.auth.admin.updateUserById(user.userId,{ban_duration:'876000h'});if(banned.error){console.error('Test identity cleanup failed');process.exitCode=1;}unwrap(await admin.from('user_roles').delete().eq('profile_id',user.profileId));}
 sql(`update public.recette_configuration set enabled=${enabledBefore==='t'?'true':'false'} where singleton;`);
 const output=fileURLToPath(new URL('../../../tmp/ge01-daily-local/',import.meta.url));mkdirSync(output,{recursive:true});
 writeFileSync(output+'api-results.json',JSON.stringify({passed:results.length,results,reportId,createdLocalProfiles:created,recetteFlagRestored:true,remoteWrites:false,success:!process.exitCode},null,2));
 console.log(`${results.length} local Auth/PostgREST/Storage checks passed; recette flag restored; test identities disabled.`);
}
