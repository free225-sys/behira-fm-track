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
 assert.equal(sql("select count(*) from supabase_migrations.schema_migrations where version='20260921110427';").trim(),'1','Apply and back up the local candidate first');
 sql('update public.recette_configuration set enabled=true where singleton;');
 const roles=unwrap(await admin.from('roles').select('id,code'));
 const equipment=unwrap(await admin.from('equipment').select('id,code').in('code',['GE-01','WILO-01']));
 const setup=async(role,code='GE-01')=>{
  const suffix=crypto.randomUUID().slice(0,8),password=crypto.randomUUID()+'aA!9',email=`daily-${suffix}@test.invalid`;
  const user=unwrap(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
  const entry={userId:user.id,profileId:crypto.randomUUID(),employeeCode:'LOCAL-DAILY-'+suffix};created.push(entry);
  unwrap(await admin.from('profiles').insert({id:entry.profileId,auth_user_id:user.id,employee_code:'LOCAL-DAILY-'+suffix,display_name:'RECETTE GE photos '+role,account_status:'active',must_change_password:false}));
  unwrap(await admin.from('user_roles').insert({profile_id:entry.profileId,role_id:roles.find(r=>r.code===role).id,...(role==='field_agent'?{equipment_id:equipment.find(e=>e.code===code).id}:{})}));
  const client=make();unwrap(await client.auth.signInWithPassword({email,password}));return {...entry,client,email,password};
 };
 const agent=await setup('field_agent'),fm=await setup('facility_manager'),direction=await setup('direction');
 const {createEmptyGe01Draft,buildGe01Payload}=await loadModule('app/lib/ge01/report.ts');
 const {submitQueuedFieldRound,reviewGe01Report}=await loadModule('app/lib/supabase/mutations.ts');
 const {loadOperationalSnapshot}=await loadModule('app/lib/supabase/data.ts');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a/dsAAAAASUVORK5CYII=','base64');
 const draft={...createEmptyGe01Draft(new Date(Date.now()-60000),crypto.randomUUID()),isTest:true,engineHours:'123,5',starts24h:'0',testDuration:'12',testStartTime:'08:00',startOutcome:'success',functioningCorrect:'yes',returnAuto:'yes',temperatureLocal:'Normal',cleanliness:'Conforme',fuelLevel:{value:'70',unavailable:false,reason:''},oilLevel:{value:'95',unavailable:false,reason:''},waterTemperature:{value:'82',unavailable:false,reason:''},batteryVoltage:{value:'26',unavailable:false,reason:''},abnormalNoise:'no',smoke:'Aucune',geAuto:'yes',atsAuto:'no',alarmMc4:'Aucune alarme',finalStatus:'Intervention',confirmed:true,step:3,comment:'RECETTE LOCALE — FICTIVE — photo PNG de test',evidence:['mc4','engine_counter','defect'].map(purpose=>({id:crypto.randomUUID(),purpose,file:new File([png],purpose+'.png',{type:'image/png'})}))};
 const payload={...buildGe01Payload(draft,'RECETTE agent'),sentAt:new Date().toISOString()};

 const receipt=await submitQueuedFieldRound(agent.client,draft.submissionId,payload);reportId=receipt.report_id;
 const report=(await loadOperationalSnapshot(fm.client,true)).reports.find(r=>r.id===reportId);
 const issue=await reviewGe01Report(fm.client,report,{decision:'anomaly',comment:'RECETTE affectation diagnostic',checkCodes:['ats_auto'],priorityCode:'NORMAL',anomalyTitle:'RECETTE diagnostic fictif'});
 const outside=await setup('field_agent','WILO-01');
 const current=async()=>(await loadOperationalSnapshot(fm.client,true)).anomalies.find(a=>a.id===issue.anomalyReference);
 let anomaly=await current();
 const {requiresFmDecision}=await loadModule('app/lib/connected-presentation.ts');
 await test('actual reader: FM qualification follows action assignee, not technical owner',async()=>{
  assert.equal(anomaly.workflow.assignedToCurrentUser,false);
  assert.equal(anomaly.workflow.actionAssignedToCurrentUser,true);
  assert.equal(requiresFmDecision(anomaly),true);
 });

 const args={p_reference:issue.anomalyReference,p_employee_code:agent.employeeCode,p_comment:'RECETTE — diagnostic affecté',p_base_version_no:anomaly.workflow.version,p_idempotency_key:crypto.randomUUID()};
 const assign=async(client=fm.client,patch={})=>unwrap(await client.rpc('assign_ge01_diagnosis',{...args,...patch}));
 await test('actual reader: scoped agent available, other equipment excluded',async()=>{
  assert.ok(anomaly.eligibleDiagnosisAssignees.some(a=>a.employeeCode===agent.employeeCode));
  assert.equal(anomaly.eligibleDiagnosisAssignees.some(a=>a.employeeCode===outside.employeeCode),false);
 });
 await test('actual API: agent and Administration cannot assign',async()=>{
  await assert.rejects(()=>assign(agent.client));await assert.rejects(()=>assign(direction.client));
 });
 await test('actual API: selected agent scope rechecked at submission',async()=>assert.rejects(()=>assign(fm.client,{p_employee_code:outside.employeeCode})));
 await test('actual API: concurrent retries produce one assignment and one next action',async()=>{
  const replies=await Promise.all([assign(),assign()]);assert.deepEqual(replies.map(r=>r.replayed).sort(),[false,true]);
  anomaly=await current();assert.equal(anomaly.workflow.actionCode,'PERFORM_DIAGNOSIS');assert.equal(anomaly.workflow.assignedProfileId,agent.profileId);assert.equal(requiresFmDecision(anomaly),false);
  const actions=unwrap(await fm.client.from('anomaly_actions').select('id').eq('anomaly_id',issue.anomalyId).eq('state','pending'));assert.equal(actions.length,1);
 });
 await test('actual API: altered retry content rejected',async()=>assert.rejects(()=>assign(fm.client,{p_comment:'Autre décision'})));
 await test('actual reader: assigned dossier no longer offers qualification owners',async()=>assert.deepEqual((await current()).eligibleDiagnosisAssignees,[]));
 const real=make(false);unwrap(await real.auth.signInWithPassword({email:fm.email,password:fm.password}));
 await test('actual API: real mode cannot replay a recette assignment',async()=>assert.rejects(()=>assign(real)));
 await test('actual API: original request remains replayable after reload',async()=>assert.equal((await assign()).replayed,true));
}catch(error){console.error(error.message);process.exitCode=1;}
finally{
 // Keep FK-linked fictitious records as test evidence, but deactivate test identities.
 for(const client of clients)await client.auth.signOut();
 for(const user of created){const banned=await admin.auth.admin.updateUserById(user.userId,{ban_duration:'876000h'});if(banned.error){console.error('Test identity cleanup failed');process.exitCode=1;}unwrap(await admin.from('user_roles').delete().eq('profile_id',user.profileId));}
 sql(`update public.recette_configuration set enabled=${enabledBefore==='t'?'true':'false'} where singleton;`);
 const output=fileURLToPath(new URL('../../../tmp/diagnosis-assignment-local/',import.meta.url));mkdirSync(output,{recursive:true});
 writeFileSync(output+'api-results.json',JSON.stringify({passed:results.length,results,reportId,createdLocalProfiles:created,recetteFlagRestored:true,remoteWrites:false,success:!process.exitCode},null,2));
 console.log(`${results.length} local Auth/PostgREST/Storage checks passed; recette flag restored; test identities disabled.`);
}
