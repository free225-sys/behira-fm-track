import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runnerImport } from 'vite';

// Explicit phases: prepare a local case, replace its rejected proof, verify UI closure.
const phase=process.argv[2];
assert.ok(['prepare','replace','verify'].includes(phase), 'Use prepare, replace or verify');
const root=new URL('../',import.meta.url);
const output=new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/CONTINUITE_GE01_RESULTATS.json',root);
const env=Object.fromEntries((await readFile(new URL('.env.supabase.local',root),'utf8')).split(/\r?\n/).filter(l=>l&&!l.startsWith('#')).map(l=>{const i=l.indexOf('=');return[l.slice(0,i),l.slice(i+1)];}));
const url=env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(url).hostname),'Local target required');
assert.ok(process.env.BEHIRA_LOCAL_AUTH_PASSWORD,'Local test password required');
const make=()=>createClient(url,env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const fm=make(),agent=make();
const unwrap=({data,error})=>{if(error)throw error;return data;};
const load=async p=>(await runnerImport(fileURLToPath(new URL(p,root)),{configFile:false,logLevel:'silent'})).module;
let record;
try {record=JSON.parse(await readFile(output,'utf8'));} catch(error) {if(error.code!=='ENOENT')throw error;record={environment:'local',roundMutation:crypto.randomUUID(),steps:[]};}
const save=async()=>{await mkdir(new URL('.',output),{recursive:true});await writeFile(output,JSON.stringify(record,null,2)+'\n');};
const check=async(label,operation)=>{await operation();record.steps.push({label,result:'PASS',at:new Date().toISOString()});await save();console.log('PASS '+label);};
try {
  await Promise.all([['facility.manager@demo.behira.invalid',fm],['electricite@demo.behira.invalid',agent]].map(async([email,c])=>unwrap(await c.auth.signInWithPassword({email,password:process.env.BEHIRA_LOCAL_AUTH_PASSWORD}))));
  const {getAuthenticatedProfileGate}=await load('app/lib/supabase/auth.ts');
  const fmProfile=await getAuthenticatedProfileGate(fm),agentProfile=await getAuthenticatedProfileGate(agent);
  const {loadOperationalSnapshot}=await load('app/lib/supabase/data.ts');
  const {submitQueuedFieldRound,reviewGe01Report,uploadQueuedAnomalyProof}=await load('app/lib/supabase/mutations.ts');
  const row=async()=>unwrap(await fm.from('anti_zombie_summary_v').select('*').eq('reference',record.reference).single());
  const proofs=async()=>unwrap(await fm.from('proofs').select('id,reference,verification_status,rejection_reason').eq('anomaly_id',record.anomalyId).order('created_at'));
  const deposit=async(key,name)=>uploadQueuedAnomalyProof(agent,key,{
    anomalyId:record.anomalyId,anomalyReference:record.reference,proofType:'pv',capturedAt:new Date().toISOString(),
    file:new File([await readFile(new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/GE01_JUSTIFICATIF_TEST.pdf',root))],name,{type:'application/pdf'}),
  });
  if(phase==='prepare') {
    assert.ok(!record.reference,'A recipe already exists; do not create a duplicate');await save();
    const {createEmptyGe01Draft,buildGe01Payload}=await load('app/lib/ge01/report.ts');
    const payload=buildGe01Payload({...createEmptyGe01Draft(new Date(),record.roundMutation),engineHours:'125',starts24h:'0',testDuration:'12',startOutcome:'success',functioningCorrect:'yes',returnAuto:'yes',temperatureLocal:'Normal',cleanliness:'Conforme',fuelLevel:{value:'70',unavailable:false,reason:''},oilLevel:{value:'95',unavailable:false,reason:''},waterTemperature:{value:'82',unavailable:false,reason:''},batteryVoltage:{value:'26',unavailable:false,reason:''},abnormalNoise:'no',smoke:'Aucune',geAuto:'yes',atsAuto:'no',alarmMc4:'Aucune alarme',finalStatus:'Opérationnel',confirmed:true,step:3,comment:'RECETTE LOCALE continuité et preuve corrigée — aucune intervention réelle.'},agentProfile.displayName);
    const submitted=await submitQueuedFieldRound(agent,record.roundMutation,payload);
    const report=(await loadOperationalSnapshot(fm)).reports.find(r=>r.id===submitted.report_id);
    const decision=await reviewGe01Report(fm,report,{decision:'anomaly',comment:'RECETTE LOCALE : scénario ATS et correction de justificatif.',checkCodes:['ats_auto'],priorityCode:'URGENT',anomalyTitle:'RECETTE GE01 — preuve à corriger'});
    record.reference=decision.anomalyReference;record.anomalyId=decision.anomalyId;record.reportReference=report.reference;record.firstKey=crypto.randomUUID();record.secondKey=crypto.randomUUID();await save();
    let current=await row();
    unwrap(await fm.rpc('assign_ge01_diagnosis',{p_reference:record.reference,p_employee_code:'EVAR-ELEC',p_comment:'RECETTE LOCALE : diagnostic affecté à Évariste.',p_base_version_no:current.version_no,p_idempotency_key:crypto.randomUUID()}));
    current=await row();
    unwrap(await agent.rpc('complete_qualification_action',{p_reference:record.reference,p_action_id:current.next_action_id,p_comment:'RECETTE LOCALE : ATS hors AUTO confirmé ; retour en AUTO simulé proposé.',p_base_version_no:current.version_no,p_idempotency_key:crypto.randomUUID()}));
    unwrap(await fm.rpc('advance_anomaly_workflow',{p_reference:record.reference,p_target:'Affectée',p_comment:'Branche A — interne sans coût. RECETTE LOCALE : intervention simulée autorisée.'}));
    await check('Intervention attributed to Évariste with canonical proof requirement',async()=>{const r=await row();assert.equal(r.next_action_code,'GE01_EXECUTE');assert.equal(r.next_action_assigned_profile_id,agentProfile.profileId);assert.equal(r.pending_proof_requirement_count,1);});
    unwrap(await agent.rpc('advance_anomaly_workflow',{p_reference:record.reference,p_target:'En intervention',p_comment:'RECETTE LOCALE : début simulé.'}));
    unwrap(await agent.rpc('advance_anomaly_workflow',{p_reference:record.reference,p_target:'En validation',p_comment:'RECETTE LOCALE : retour en AUTO et contrôle final simulés ; aucune intervention réelle.'}));
    await check('Finished intervention waits for agent proof',async()=>assert.equal((await row()).next_action_code,'GE01_SUBMIT_PROOF'));
    record.firstProof=await deposit(record.firstKey,'GE01_PREUVE_TEST_INITIALE.pdf');await save();
    await check('Stored proof hands review to Faustin',async()=>{const r=await row();assert.equal(r.next_action_code,'GE01_REVIEW_PROOF');assert.equal(r.next_action_assigned_profile_id,fmProfile.profileId);});
  } else if(phase==='replace') {
    assert.ok(record.reference,'Run prepare first');
    await check('UI refusal returns correction and reason to Évariste',async()=>{const r=await row();assert.equal(r.next_action_code,'GE01_REPLACE_PROOF');assert.equal(r.next_action_assigned_profile_id,agentProfile.profileId);assert.match(r.next_action_comment,/RECETTE/);assert.equal((await proofs())[0].verification_status,'rejected');record.refusedSummary=r;});
    record.secondProof=await deposit(record.secondKey,'GE01_PREUVE_TEST_CORRIGEE.pdf');await save();
    await check('Replacement preserves refusal and awaits a fresh FM decision',async()=>{const p=await proofs();assert.equal(p.length,2);assert.equal(p[0].verification_status,'rejected');assert.equal(p[1].verification_status,'pending');assert.equal((await row()).next_action_code,'GE01_REVIEW_PROOF');});
  } else {
    await check('UI acceptance and closure persist without pending action or deadline',async()=>{const r=await row();assert.equal(r.is_closed,true);assert.equal(r.next_action_id,null);assert.equal(r.deadline_id,null);assert.equal(r.pending_proof_requirement_count,0);record.closedSummary=r;});
    await check('Original refusal and corrected acceptance both remain in the dossier',async()=>{const p=await proofs();assert.equal(p.length,2);assert.deepEqual(p.map(x=>x.verification_status),['rejected','accepted']);record.proofs=p;});
    await check('Browser projection retains proof description, closure and 22 source answers',async()=>{const snapshot=await loadOperationalSnapshot(fm);const a=snapshot.anomalies.find(a=>a.id===record.reference);assert.match(a.antiZombieSummary.nextAction,/clôturé/);assert.match(a.antiZombieSummary.expectedProof,/GE-01/);assert.equal(a.antiZombieSummary.expectedProofState,'Dernier justificatif accepté');assert.equal(snapshot.reports.find(r=>r.reference===record.reportReference).checks.length,22);record.history=a.history;});
  }
  console.log(JSON.stringify({phase,reference:record.reference,report:record.reportReference,checks:record.steps.length}));
} finally {await Promise.all([fm.auth.signOut({scope:'local'}),agent.auth.signOut({scope:'local'})]);}
