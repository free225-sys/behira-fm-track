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
 assert.equal(sql("select count(*) from supabase_migrations.schema_migrations where version='20260918110651';").trim(),'1','Apply and back up the local candidate first');
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
 const agent=await setup('field_agent'),fm=await setup('facility_manager'),direction=await setup('direction');
 const {createEmptyGe01Draft,buildGe01Payload}=await loadModule('app/lib/ge01/report.ts');
 const {submitQueuedFieldRound,reviewGe01Report,submitAnomalyCostDecision,reviewAnomalyCostDecision}=await loadModule('app/lib/supabase/mutations.ts');
 const {loadOperationalSnapshot}=await loadModule('app/lib/supabase/data.ts');
 const {readGe01Operations}=await loadModule('app/lib/ge01/operations.ts');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/dsAAAAASUVORK5CYII=','base64');
 const draft={...createEmptyGe01Draft(new Date(Date.now()-60000),crypto.randomUUID()),isTest:true,engineHours:'123,5',starts24h:'0',testDuration:'12',testStartTime:'08:00',startOutcome:'success',functioningCorrect:'yes',returnAuto:'yes',temperatureLocal:'Normal',cleanliness:'Conforme',fuelLevel:{value:'70',unavailable:false,reason:''},oilLevel:{value:'95',unavailable:false,reason:''},waterTemperature:{value:'82',unavailable:false,reason:''},batteryVoltage:{value:'26',unavailable:false,reason:''},abnormalNoise:'no',smoke:'Aucune',geAuto:'yes',atsAuto:'no',alarmMc4:'Aucune alarme',finalStatus:'Intervention',confirmed:true,step:3,comment:'RECETTE LOCALE — FICTIVE — photo PNG de test',evidence:['mc4','engine_counter','defect'].map(purpose=>({id:crypto.randomUUID(),purpose,file:new File([png],purpose+'.png',{type:'image/png'})}))};
 const payload={...buildGe01Payload(draft,'RECETTE agent'),sentAt:new Date().toISOString()};

 const receipt=await submitQueuedFieldRound(agent.client,draft.submissionId,payload);reportId=receipt.report_id;
 const report=(await loadOperationalSnapshot(fm.client,true)).reports.find(r=>r.id===reportId);
 const issue=await reviewGe01Report(fm.client,report,{decision:'anomaly',comment:'RECETTE arbitrage renvoyé',checkCodes:['ats_auto'],priorityCode:'NORMAL',anomalyTitle:'RECETTE financière fictive'});
 const request={anomalyReference:issue.anomalyReference,amount:400000,budgetType:'opex',description:'RECETTE — devis incomplet fictif',idempotencyKey:crypto.randomUUID()};
 const first=await submitAnomalyCostDecision(fm.client,request);
 const decision={costReference:first.cost_reference,decision:'returned',comment:'RECETTE — détail des pièces requis',idempotencyKey:crypto.randomUUID()};
 await test('actual API: agent and FM cannot return an Administration decision',async()=>{
  for(const client of [agent.client,fm.client])await assert.rejects(()=>reviewAnomalyCostDecision(client,decision));
 });
 await test('actual API: blank return reason rejected',async()=>assert.rejects(()=>reviewAnomalyCostDecision(direction.client,{...decision,comment:' '})));
 await test('actual API: simultaneous replay produces one returned decision and one audit event',async()=>{
  const response=await Promise.all([reviewAnomalyCostDecision(direction.client,decision),reviewAnomalyCostDecision(direction.client,decision)]);
  assert.ok(response.every(r=>r.approval_status==='returned'));
  const events=unwrap(await fm.client.from('anomaly_history').select('id').eq('source_record_id',first.cost_id).eq('event_type','cost_returned'));assert.equal(events.length,1);
 });
 await test('actual reader: returned state and motive survive reloading the snapshot',async()=>{
  const row=(await loadOperationalSnapshot(fm.client,true)).costs.find(c=>c.id===first.cost_reference);
  assert.equal(row.approvalStatus,'returned');assert.equal(row.reviewComment,decision.comment);assert.equal(row.replacedByCostReference,null);
 });
 const correction={...request,description:'RECETTE — devis détaillé fictif',idempotencyKey:crypto.randomUUID(),replacesCostReference:first.cost_reference};let revised;
 await test('actual API: simultaneous resubmission retry creates exactly one linked new estimate',async()=>{
  const response=await Promise.all([submitAnomalyCostDecision(fm.client,correction),submitAnomalyCostDecision(fm.client,correction)]);
  revised=response[0];assert.equal(response[1].cost_id,revised.cost_id);assert.equal(revised.approval_status,'pending');
  const rows=unwrap(await fm.client.from('costs').select('id').eq('replaces_cost_id',first.cost_id));assert.equal(rows.length,1);
 });
 await test('actual reader: both sides of the revision link are available to the UI',async()=>{
  const costs=(await loadOperationalSnapshot(fm.client,true)).costs;
  assert.equal(costs.find(c=>c.id===first.cost_reference).replacedByCostReference,revised.cost_reference);
  assert.equal(costs.find(c=>c.id===revised.cost_reference).replacesCostReference,first.cost_reference);
 });
 await test('actual API: second different correction cannot replace the original again',async()=>assert.rejects(()=>submitAnomalyCostDecision(fm.client,{...correction,idempotencyKey:crypto.randomUUID(),amount:420000})));
 await test('actual API: a returned estimate retains no approval fields',async()=>{
  const row=unwrap(await fm.client.from('costs').select('approval_status,approved_at').eq('id',first.cost_id).single());assert.equal(row.approval_status,'returned');assert.equal(row.approved_at,null);
 });
 await test('actual API: a later refusal does not close the dossier',async()=>{
  await reviewAnomalyCostDecision(direction.client,{...decision,costReference:revised.cost_reference,decision:'rejected',idempotencyKey:crypto.randomUUID()});
  const anomaly=unwrap(await fm.client.from('anomalies').select('closed_at').eq('id',issue.anomalyId).single());assert.equal(anomaly.closed_at,null);
 });
 const real=make(false);unwrap(await real.auth.signInWithPassword({email:direction.email,password:direction.password}));
 await test('actual API: real mode cannot obtain fictitious arbitration or revision',async()=>{
  assert.deepEqual(unwrap(await real.from('costs').select('id').in('id',[first.cost_id,revised.cost_id])),[]);
  await assert.rejects(()=>reviewAnomalyCostDecision(real,decision));
 });
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 // Keep FK-linked fictitious records as test evidence, but deactivate test identities.
 for(const client of clients)await client.auth.signOut();
 for(const user of created){const banned=await admin.auth.admin.updateUserById(user.userId,{ban_duration:'876000h'});if(banned.error){console.error('Test identity cleanup failed');process.exitCode=1;}unwrap(await admin.from('user_roles').delete().eq('profile_id',user.profileId));}
 sql(`update public.recette_configuration set enabled=${enabledBefore==='t'?'true':'false'} where singleton;`);
 const output=fileURLToPath(new URL('../../../tmp/financial-return-local/',import.meta.url));mkdirSync(output,{recursive:true});
 writeFileSync(output+'api-results.json',JSON.stringify({passed:results.length,results,reportId,createdLocalProfiles:created,recetteFlagRestored:true,remoteWrites:false,success:!process.exitCode},null,2));
 console.log(`${results.length} local Auth/PostgREST/Storage checks passed; recette flag restored; test identities disabled.`);
}
