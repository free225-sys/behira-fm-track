import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {runnerImport} from 'vite';

const root=fileURLToPath(new URL('../',import.meta.url));
const docker='C:/Users/HP PC/AppData/Local/Programs/DockerDesktop/resources/bin/docker.exe';
const cli=root+'node_modules/.pnpm/@supabase+cli-windows-x64@2.115.0/node_modules/@supabase/cli-windows-x64/bin/supabase.exe';
const localSql=query=>execFileSync(docker,['exec','-i','supabase_db_behira-fm-track','psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-At'],{input:query,encoding:'utf8',windowsHide:true});
const config=JSON.parse(execFileSync(cli,['status','-o','json'],{cwd:root,env:{...process.env,SUPABASE_TELEMETRY_DISABLED:'1'},encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
const url=config.API_URL, key=config.ANON_KEY, serviceKey=config.SERVICE_ROLE_KEY;
if(!url||new URL(url).hostname!=='127.0.0.1'||new URL(url).port!=='54321'||!key||!serviceKey)throw Error('Local Supabase configuration required; no remote writes permitted');
const unwrap=({data,error})=>{if(error)throw Error(error.code ? `${error.code}: ${error.message}` : error.message);return data;};
const results=[]; const test=async(name,fn)=>{await fn();results.push(name);console.log('PASS '+name);};
const admin=createClient(url,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});
const make=(isTest=false)=>createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false},global:{headers:isTest?{'x-behira-data-mode':'recette'}:{}}});
const clients=[]; const created=[];
const loadModule=async path=>(await runnerImport(root+path,{configFile:false,logLevel:'silent'})).module;
try{
  // Apply only this new additive migration to the loopback stack. No reset or seed.
  if(localSql("select count(*) from information_schema.columns where table_schema='public' and table_name='reports' and column_name='is_test';").trim()==='0'){
    localSql(readFileSync(root+'supabase/migrations/20260912231659_ge01_recette_isolation.sql','utf8'));
  }
  localSql('update public.recette_configuration set enabled=true;');
  const roles=unwrap(await admin.from('roles').select('id,code'));
  const equipment=unwrap(await admin.from('equipment').select('id').eq('code','GE-01').single());
  const setup=async role=>{
    const suffix=crypto.randomUUID().slice(0,8), password=crypto.randomUUID()+'aA!9';
    const email=`recette-${role}-${suffix}@test.invalid`;
    const user=unwrap(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
    const profileId=crypto.randomUUID(), employeeCode='LOCAL-RECETTE-'+suffix;
    unwrap(await admin.from('profiles').insert({id:profileId,auth_user_id:user.id,employee_code:employeeCode,display_name:'RECETTE '+role,account_status:'active',must_change_password:false}));
    unwrap(await admin.from('user_roles').insert({profile_id:profileId,role_id:roles.find(r=>r.code===role).id,...(role==='field_agent'?{equipment_id:equipment.id}:{})}));
    const client=make(true);clients.push(client);unwrap(await client.auth.signInWithPassword({email,password}));
    created.push({profileId,userId:user.id,employeeCode});
    return {client,email,password,profileId,employeeCode};
  };
  const agent=await setup('field_agent'), fm=await setup('facility_manager');
  const {createEmptyGe01Draft,buildGe01Payload}=await loadModule('app/lib/ge01/report.ts');
  const mutations=await loadModule('app/lib/supabase/mutations.ts');
  const {loadOperationalSnapshot}=await loadModule('app/lib/supabase/data.ts');
  const draft={...createEmptyGe01Draft(new Date(Date.now()-60000),crypto.randomUUID()),isTest:true,engineHours:'123,5',starts24h:'0',testDuration:'12',startOutcome:'success',functioningCorrect:'yes',returnAuto:'yes',temperatureLocal:'Normal',cleanliness:'Conforme',fuelLevel:{value:'70',unavailable:false,reason:''},oilLevel:{value:'95',unavailable:false,reason:''},waterTemperature:{value:'82',unavailable:false,reason:''},batteryVoltage:{value:'26',unavailable:false,reason:''},abnormalNoise:'no',smoke:'Aucune',geAuto:'yes',atsAuto:'no',alarmMc4:'Aucune alarme',finalStatus:'Intervention',confirmed:true,step:3,comment:'RECETTE LOCALE — DONNÉES FICTIVES — AUCUN ENGAGEMENT RÉEL'};
  const payload=buildGe01Payload(draft,'RECETTE agent');
  const report=await mutations.submitQueuedFieldRound(agent.client,draft.submissionId,payload);
  await test('real API: marked receipt and 22 answers reach FM',async()=>{
    assert.equal(report.is_test,true);const r=(await loadOperationalSnapshot(fm.client,true)).reports.find(r=>r.id===report.report_id);assert.equal(r.isTest,true);assert.equal(r.checks.length,22);assert.equal(r.checks.find(c=>c.code==='heures_moteur').valueNumeric,123.5);
  });
  await test('real API: replay is idempotent',async()=>assert.equal((await mutations.submitQueuedFieldRound(agent.client,draft.submissionId,payload)).report_id,report.report_id));
  const operationalReport=(await loadOperationalSnapshot(fm.client,true)).reports.find(r=>r.id===report.report_id);
  const review=await mutations.reviewGe01Report(fm.client,operationalReport,{decision:'anomaly',comment:'RECETTE — écart fictif AUTO',checkCodes:['ats_auto'],priorityCode:'NORMAL',anomalyTitle:'RECETTE — dossier fictif Storage'});
  const ref=review.anomalyReference;
  const state=async()=>unwrap(await fm.client.from('anti_zombie_summary_v').select('*').eq('anomaly_id',review.anomalyId).single());
  unwrap(await fm.client.rpc('assign_ge01_diagnosis',{p_reference:ref,p_employee_code:agent.employeeCode,p_comment:'RECETTE diagnostic',p_base_version_no:(await state()).version_no,p_idempotency_key:crypto.randomUUID()}));
  const diag=await state();
  unwrap(await agent.client.rpc('complete_qualification_action',{p_reference:ref,p_action_id:diag.next_action_id,p_comment:'RECETTE diagnostic fictif',p_idempotency_key:crypto.randomUUID(),p_base_version_no:diag.version_no}));
  await mutations.advanceAnomalyWorkflow(fm.client,ref,'Affectée','RECETTE — interne sans coût');
  await mutations.advanceAnomalyWorkflow(agent.client,ref,'En intervention','RECETTE début fictif');
  await mutations.advanceAnomalyWorkflow(agent.client,ref,'En validation','RECETTE fin fictive');
  const bytes=readFileSync(root+'../../output/pdf/recette-ge01-v18/INTERNE_SANS_COUT.pdf');
  const proofPayload={isTest:true,anomalyId:review.anomalyId,anomalyReference:ref,file:new File([bytes],'RECETTE_FICTIVE.pdf',{type:'application/pdf'}),capturedAt:new Date().toISOString(),proofType:'pv'};
  const mutationId=crypto.randomUUID();let proof;
  await test('Storage: custom recipe header permits actual upload and registration',async()=>{
    proof=await mutations.uploadQueuedAnomalyProof(agent.client,mutationId,proofPayload);
    assert.ok(proof.proof_id);const row=unwrap(await fm.client.from('proofs').select('is_test,storage_path').eq('id',proof.proof_id).single());assert.equal(row.is_test,true);
  });
  await test('Storage: authorized FM obtains and reads actual signed piece',async()=>{
    const row=unwrap(await fm.client.from('proofs').select('storage_path').eq('id',proof.proof_id).single());
    const signed=unwrap(await fm.client.storage.from('anomaly-proofs').createSignedUrl(row.storage_path,60));
    const response=await fetch(signed.signedUrl);assert.equal(response.status,200);assert.equal((await response.arrayBuffer()).byteLength,bytes.length);
  });
  const legacy=make();clients.push(legacy);unwrap(await legacy.auth.signInWithPassword({email:fm.email,password:fm.password}));
  await test('older client cannot see fictitious report, checks, dossier or piece',async()=>{
    for(const [table,column,id] of [['reports','id',report.report_id],['report_checks','report_id',report.report_id],['anomalies','id',review.anomalyId],['proofs','id',proof.proof_id]])assert.equal(unwrap(await legacy.from(table).select('*').eq(column,id)).length,0,table);
  });
  await test('Storage: older client cannot sign a known fictitious object path',async()=>{
    const row=unwrap(await fm.client.from('proofs').select('storage_path').eq('id',proof.proof_id).single());
    assert.ok((await legacy.storage.from('anomaly-proofs').createSignedUrl(row.storage_path,60)).error);
  });
  const output=root+'tmp/recette-mode-local';mkdirSync(output,{recursive:true});writeFileSync(output+'/api-results.json',JSON.stringify({results,reportId:report.report_id,anomalyId:review.anomalyId,proofId:proof.proof_id,createdLocalProfiles:created,remoteWrites:false},null,2));
  console.log(`${results.length} local Auth/PostgREST/Storage checks passed; no remote writes.`);
}catch(error){console.error(error.message);process.exitCode=1;}
finally{for(const client of clients)await client.auth.signOut();}
