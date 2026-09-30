import {verifyWaterRecette} from './verify-water-recette-cases.mjs';
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL, fileURLToPath } from "node:url";
import { runnerImport } from "vite";
import { verifyRecette } from './verify-ge01-recette-cases.mjs';
import { verifyHealthSnapshot } from './verify-health-snapshot-cases.mjs';
import { verifyHealthEngine } from './verify-health-engine-cases.mjs';
import { verifyHealthSources } from './verify-health-source-cases.mjs';
import { verifyRia } from './verify-ria-cases.mjs';
import { verifyGe01Daily } from './verify-ge01-daily-cases.mjs';
import { verifyFinancialReturns } from './verify-financial-return-cases.mjs';
import { verifyDiagnosisAssignment } from './verify-diagnosis-assignment-cases.mjs';
import { verifyReception } from './verify-reception-cases.mjs';
import { verifyReopen } from './verify-reopen-cases.mjs';

// Isolated PostgreSQL engine. Auth JWT identity and Storage schemas are test fixtures;
// this does not claim to test GoTrue, PostgREST, or a deployed Supabase environment.
const runtime = process.env.GE01_PGLITE_ROOT;
if (!runtime) throw new Error("GE01_PGLITE_ROOT must point to an isolated @electric-sql/pglite installation.");
const { PGlite } = await import(pathToFileURL(resolve(runtime, "dist/index.js")).href);
const { pgcrypto } = await import(pathToFileURL(resolve(runtime, "dist/contrib/pgcrypto.js")).href);
const db = new PGlite({ extensions: { pgcrypto } });
const root = new URL("../", import.meta.url);
const sql = async (query, args = []) => (await db.query(query, args)).rows;
try {
  await db.exec(`
    create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create schema storage; create schema extensions;
    create table auth.users(id uuid primary key, email text, encrypted_password text);
    create function auth.uid() returns uuid language sql stable as
      'select nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
    create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(), bucket_id text, name text, owner uuid, owner_id text, metadata jsonb);
    alter table storage.objects enable row level security;
    create function storage.foldername(text) returns text[] language sql immutable as
      'select (string_to_array($1, ''/''))[1:array_length(string_to_array($1, ''/''),1)-1]';
    grant usage on schema public, auth, storage, extensions to authenticated, anon, service_role;
    grant select,insert,update,delete on storage.objects to authenticated;
  `);
  const files = (await readdir(new URL("supabase/migrations/", root))).filter((name) => name.endsWith(".sql")).sort();
  let thresholdBeforeConfirmation;
  for (const name of files) {
    if (name === '20260916181540_lot1_threshold_effective_date.sql') {
      thresholdBeforeConfirmation = (await sql("select effective_from, created_at from public.business_parameters where code='financial_decision_threshold' and source_document='docs/design/DECISIONS.md#DEC-014'"))[0];
    }
    const migration = (await readFile(new URL(`supabase/migrations/${name}`, root), "utf8"))
      .replace(/create extension if not exists pgtap with schema extensions;/g, "-- pgTAP omitted: assertions are executed by Node.");
    try { await db.exec(migration); }
    catch (error) { throw new Error(`Migration ${name}: ${error.message}`, { cause: error }); }
  }
  await db.exec(await readFile(new URL("supabase/seed.sql", root), "utf8"));
  console.log(`PostgreSQL: ${files.length} migrations and reference seed applied in isolation.`);

  // Create dedicated identities without changing seeded human accounts.
  const identities = {};
  for (const role of ["facility_manager", "field_agent", "direction", "read_only"]) {
    const userId = crypto.randomUUID(); const profileId = crypto.randomUUID();
    await sql("insert into auth.users(id,email) values($1,$2)", [userId, `${role}@test.invalid`]);
    await sql("insert into public.profiles(id,auth_user_id,employee_code,display_name,account_status) values($1,$2,$3,$4,'active')", [profileId, userId, `TEST-${role}`, `Test ${role}`]);
    await sql("insert into public.user_roles(profile_id,role_id) select $1,id from public.roles where code=$2", [profileId, role]);
    identities[role] = { userId, profileId };
  }
  const equipmentId = (await sql("select id from public.equipment where code='GE-01'"))[0].id;
  const recipeRun = process.env.GE01_RECIPE_TEST === '1';
  if (recipeRun) {
    await db.exec('update public.recette_configuration set enabled=true;');
    await sql("select set_config('request.headers',$1,false)", [JSON.stringify({'x-behira-data-mode':'recette'})]);
  }
  await sql("update public.user_roles set equipment_id=$1 where profile_id=$2", [equipmentId, identities.field_agent.profileId]);
  const { module: reports } = await runnerImport(fileURLToPath(new URL("app/lib/ge01/report.ts", root)), { configFile: false, logLevel: "silent" });
  const { module: reviews } = await runnerImport(fileURLToPath(new URL("app/lib/ge01/review.ts", root)), { configFile: false, logLevel: "silent" });
  const payload = reports.buildGe01Payload({
    ...reports.createEmptyGe01Draft(new Date(Date.now()-60_000), crypto.randomUUID()),
    engineHours:"120", starts24h:"0", testDuration:"12", startOutcome:"success", functioningCorrect:"yes", returnAuto:"yes",
    temperatureLocal:"Normal", cleanliness:"Conforme", fuelLevel:{value:"70",unavailable:false,reason:""},
    oilLevel:{value:"95",unavailable:false,reason:""}, waterTemperature:{value:"82",unavailable:false,reason:""},
    batteryVoltage:{value:"26",unavailable:false,reason:""}, abnormalNoise:"no", smoke:"Aucune", geAuto:"yes", atsAuto:"yes",
    alarmMc4:"Aucune alarme", finalStatus:"Opérationnel", confirmed:true, step:3,
  }, "Test field_agent");
  const asRole = async (role) => {
    await db.exec("reset role");
    await sql("select set_config('request.jwt.claim.sub',$1,false)", [identities[role]?.userId ?? ""]);
    await db.exec(`set role ${role === "anon" ? "anon" : "authenticated"}`);
  };
  let passed = 0;
  const test = async (label, operation) => { await operation(); passed++; console.log(`PASS ${label}`); };
  await test('confirmed threshold calendar date preserves amount and historical timestamps', async () => {
    const rows = await sql("select numeric_value::integer as amount, confirmed_effective_date::text as effect, effective_from, created_at, effect_confirmed_at, effect_confirmation_source from public.business_parameters where code='financial_decision_threshold' and source_document='docs/design/DECISIONS.md#DEC-014'");
    assert.equal(rows.length, 1);
    assert.equal(rows[0].amount, 400000);
    assert.equal(rows[0].effect, '2026-08-30');
    assert.ok(rows[0].effective_from && rows[0].created_at && rows[0].effect_confirmed_at);
    assert.deepEqual(rows[0].effective_from, thresholdBeforeConfirmation.effective_from);
    assert.deepEqual(rows[0].created_at, thresholdBeforeConfirmation.created_at);
    assert.match(rows[0].effect_confirmation_source, /Confirmation explicite utilisateur/);
  });
  const reject = async (operation, code) => {
    await assert.rejects(operation, (error) => { assert.equal(error.code, code, `expected SQLSTATE ${code}: ${error.message}`); return true; }, `expected SQLSTATE ${code}`);
  };
  const submit = async (mutationId = crypto.randomUUID(), checks = payload.checks) => {
    await asRole("field_agent");
    return (await sql(`select public.submit_field_round_offline($1,'GE-01','technical_round',$2,$3,$4::jsonb${recipeRun ? ',p_is_test=>true,p_test_attested=>true' : ''}) as receipt`, [
      mutationId, payload.performedAt, payload.summary, JSON.stringify(checks.map((c) => ({
        code:c.code,label:c.label,status:c.status,value_numeric:c.valueNumeric,value_text:c.valueText,
        value_boolean:c.valueBoolean,unit:c.unit,notes:c.notes,
      }))),
    ]))[0].receipt;
  };
  const snapshot = async (id) => (await sql("select updated_at, public.ge01_checks_snapshot(id) as checks from public.reports where id=$1", [id]))[0];
  const decide = async (id, snap, decision="conform", comment="Examen de test conforme", codes=[], priority=null, title=null) =>
    (await sql("select public.review_ge01_report($1,$2,$3,$4,$5::jsonb,$6::text[],$7,$8) as review", [id,decision,comment,snap.updated_at,JSON.stringify(snap.checks),codes,priority,title]))[0].review;

  const submissionId = crypto.randomUUID();
  const normal = await submit(submissionId);
  await test("22 raw answers, real zero and no automatic anomaly", async () => {
    const checks = await snapshot(normal.report_id);
    assert.equal(checks.checks.length,22);
    assert.equal(checks.checks.find((c)=>c.code==='demarrages_24h').valueNumeric,0);
    assert.equal((await sql("select count(*)::int as n from public.anomalies where source_report_id=$1",[normal.report_id]))[0].n,0);
    assert.deepEqual(checks.checks,reviews.ge01ChecksSnapshot(payload.checks));
  });
  await test("round retry returns the same report", async () => assert.equal((await submit(submissionId)).report_id,normal.report_id));
  const snap = await snapshot(normal.report_id);
  for (const role of ["field_agent","direction","read_only","anon"]) {
    await test(`${role} cannot review`, async () => { await asRole(role); await reject(()=>decide(normal.report_id,snap),"42501"); });
  }
  await asRole("facility_manager");
  await test("stale answers rejected", () => reject(()=>decide(normal.report_id,{...snap,checks:[]}),"40001"));
  await test("stale report timestamp rejected", () => reject(()=>decide(normal.report_id,{...snap,updated_at:"2000-01-01"}),"40001"));
  let normalReview;
  await test("FM conformity recorded without anomaly or score", async () => {
    normalReview = await decide(normal.report_id,snap);
    assert.equal(normalReview.decision,"conform"); assert.equal(normalReview.anomaly_id,null);
    assert.equal(normalReview.reviewed_by_profile_id,identities.facility_manager.profileId);
    assert.equal((await sql("select score from public.reports where id=$1",[normal.report_id]))[0].score,null);
  });
  await test("same decision retry is idempotent", async () => assert.equal((await decide(normal.report_id,snap)).reviewed_at,normalReview.reviewed_at));
  await test("conflicting second decision refused",()=>reject(()=>decide(normal.report_id,snap,"conform","Autre décision"),"23505"));
  await test("review cannot be overwritten",()=>reject(()=>sql("update public.ge01_report_reviews set comment='overwrite' where report_id=$1",[normal.report_id]),"42501"));
  await test("reviewed raw answers cannot be overwritten",()=>reject(()=>sql("update public.report_checks set value_numeric=99 where report_id=$1 and check_code='heures_moteur'",[normal.report_id]),"23514"));
  await test("reviewed source report cannot be overwritten",()=>reject(()=>sql("update public.reports set analysis='overwrite' where id=$1",[normal.report_id]),"23514"));
  await test("agent can replay its round after review",async()=>assert.equal((await submit(submissionId)).report_id,normal.report_id));

  const issueChecks = payload.checks.map(c=>c.code==='ats_auto'?{...c,status:'alert',valueBoolean:false}:c);
  const issue = await submit(crypto.randomUUID(),issueChecks);
  await asRole("facility_manager"); const issueSnap = await snapshot(issue.report_id);
  await test("declared issue cannot be validated conform",()=>reject(()=>decide(issue.report_id,issueSnap),"23514"));
  await test("unknown priority refused",()=>reject(()=>decide(issue.report_id,issueSnap,"anomaly","ATS à examiner",["ats_auto"],"MADE_UP","ATS"),"23514"));
  await test("foreign check code refused",()=>reject(()=>decide(issue.report_id,issueSnap,"anomaly","ATS à examiner",["unknown"],"URGENT","ATS"),"23514"));
  let issueReview;
  await test("FM opens one anomaly preserving report/agent/answers", async()=>{
    issueReview = await decide(issue.report_id,issueSnap,"anomaly","ATS à examiner",["ats_auto"],"URGENT","ATS hors AUTO");
    const anomaly=(await sql("select * from public.anomalies where id=$1",[issueReview.anomaly_id]))[0];
    assert.equal(anomaly.source_report_id,issue.report_id);assert.equal(anomaly.reported_by_profile_id,identities.field_agent.profileId);
    assert.equal(anomaly.equipment_id,equipmentId);assert.ok(issueReview.anomaly_reference);
    assert.deepEqual((await snapshot(issue.report_id)).checks,issueSnap.checks);
    assert.equal((await sql("select count(*)::int n from public.anomaly_actions where anomaly_id=$1 and state='pending'",[anomaly.id]))[0].n,1);
  });
  await test("anomaly retry creates no duplicate",async()=>{
    assert.equal((await decide(issue.report_id,issueSnap,"anomaly","ATS à examiner",["ats_auto"],"URGENT","ATS hors AUTO")).anomaly_id,issueReview.anomaly_id);
    assert.equal((await sql("select count(*)::int n from public.anomalies where source_report_id=$1",[issue.report_id]))[0].n,1);
  });
  const unknown = await submit(crypto.randomUUID(),payload.checks.map(c=>c.code==='duree_essai'?{code:c.code,label:c.label,status:'not_checked',notes:'Essai impossible'}:c));
  await asRole("facility_manager");
  const unknownSnap = await snapshot(unknown.report_id);
  await test("unobserved control cannot be declared conform",()=>reject(()=>decide(unknown.report_id,unknownSnap),"23514"));
  await test("review RPC is invoker-only and unavailable to anonymous callers",async()=>{
    const grants=(await sql("select p.prosecdef, has_function_privilege('anon',p.oid,'execute') as anonymous from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='review_ge01_report'"))[0];
    assert.equal(grants.prosecdef,false);assert.equal(grants.anonymous,false);
  });
  const clientReport=await submit();await asRole('facility_manager');const clientSnap=await snapshot(clientReport.report_id);
  const {module:mutations}=await runnerImport(fileURLToPath(new URL('app/lib/supabase/mutations.ts',root)),{configFile:false,logLevel:'silent'});
  await test("frontend mutation preserves the complete RPC contract",async()=>{
    const client={rpc:async(name,args)=>{
      assert.equal(name,'review_ge01_report');
      const result=await decide(args.p_report_id,{updated_at:args.p_expected_updated_at,checks:args.p_expected_checks},args.p_decision,args.p_comment,args.p_check_codes,args.p_priority_code??null,args.p_anomaly_title??null);
      return {data:result,error:null};
    }};
    const receipt=await mutations.reviewGe01Report(client,{
      id:clientReport.report_id,reportType:'technical_round',reportStatus:'submitted',equipmentCode:'GE-01',
      updatedAt:clientSnap.updated_at,checks:payload.checks,review:null,
    },{decision:'conform',comment:'Examen via client',checkCodes:[]});
    assert.equal(receipt.decision,'conform');assert.equal(receipt.comment,'Examen via client');assert.equal(receipt.anomalyId,null);
  });
  await test("C10 delegation threshold remains 400000",async()=>{
    const threshold=(await sql("select numeric_value from public.business_parameters where code='financial_decision_threshold' and effective_to is null"))[0];
    assert.equal(Number(threshold.numeric_value),400000);
  });
  const ref = issueReview.anomaly_reference;
  const state = async () => (await sql("select * from public.anti_zombie_summary_v where anomaly_id=$1", [issueReview.anomaly_id]))[0];
  const advance = (target, comment='Recette de test') => sql('select public.advance_anomaly_workflow($1,$2,$3)',[ref,target,comment]);
  await test('GE01 legacy transition cannot skip diagnosis',()=>reject(()=>advance('Affectée'),'23514'));
  const originalVersion = (await state()).version_no;
  const assign = (employee='TEST-field_agent', version=originalVersion) => sql('select public.assign_ge01_diagnosis($1,$2,$3,$4,$5)',[ref,employee,'Diagnostic requis',version,crypto.randomUUID()]);
  await test('GE01 out-of-scope assignment refused',()=>reject(()=>assign('TEST-read_only'),'23514'));
  await asRole('field_agent');
  await test('GE01 agent cannot assign',()=>reject(()=>assign(),'42501'));
  await asRole('facility_manager');
  await test('GE01 assignment atomically starts diagnosis and retains Qualification',async()=>{
    await assign(); const row=await state();
    assert.equal(row.status_code,'A_QUALIFIER'); assert.equal(row.next_action_code,'PERFORM_DIAGNOSIS');
    assert.equal(row.responsible_profile_id,identities.field_agent.profileId);
  });
  await test('GE01 repeated stale assignment changes nothing',()=>reject(()=>assign(),'40001'));
  await test('GE01 assignment alone cannot start intervention',()=>reject(()=>advance('Affectée'),'23514'));
  await asRole('field_agent');
  await test('GE01 assigned agent confirms diagnosis before FM branch decision',async()=>{
    const row=await state();
    await sql('select public.complete_qualification_action($1,$2,$3,$4,$5)',[ref,row.next_action_id,'Recette : ATS hors AUTO confirmé',crypto.randomUUID(),row.version_no]);
    assert.equal((await state()).next_action_code,'CHOOSE_TREATMENT_BRANCH');
  });
  await asRole('facility_manager');
  await test('GE01 FM branch creates one internal work order',async()=>{
    await advance('Affectée','Branche A — interne sans coût. Recette.');
    assert.equal((await sql('select count(*)::int n from public.work_orders where anomaly_id=$1',[issueReview.anomaly_id]))[0].n,1);
    assert.equal((await state()).next_action_code,'GE01_EXECUTE');
    assert.equal((await state()).next_action_assigned_profile_id,identities.field_agent.profileId);
  });
  await asRole('field_agent');
  await test('GE01 assigned agent starts and finishes intervention',async()=>{ await advance('En intervention'); await advance('En validation','Recette : AUTO rétabli'); });
  await test('GE01 agent cannot close',()=>reject(()=>advance('Clôturée'),'42501'));
  await asRole('facility_manager');
  await test('GE01 closure without accepted evidence refused',()=>reject(()=>advance('Clôturée'),'23514'));
  await test('GE01 next action and proof requirement persist after intervention',async()=>{
    const row=await state(); assert.equal(row.next_action_code,'GE01_SUBMIT_PROOF');
    assert.equal(row.next_action_assigned_profile_id,identities.field_agent.profileId);
    assert.equal(row.pending_proof_requirement_count,1);
    const branch=(await sql("select aa.state from public.anomaly_actions aa join public.next_action_codes c on c.id=aa.action_code_id where aa.anomaly_id=$1 and c.code='CHOOSE_TREATMENT_BRANCH'",[issueReview.anomaly_id]))[0];
    assert.equal(branch.state,'completed');
  });
  const deposit=async()=>{
    await asRole('field_agent');
    return (await sql('select public.register_anomaly_proof($1,$2,$3,$4,$5) as result',[ref,`${issueReview.anomaly_id}/${crypto.randomUUID()}.pdf`,'application/pdf',1024,'report']))[0].result;
  };
  const reviewProof=async(id,decision,comment,key=crypto.randomUUID(),version=null)=>{
    await asRole('facility_manager');
    return (await sql('select public.review_anomaly_proof($1,$2,$3,$4,$5,$6) as result',[ref,id,decision,comment,key,version??(await state()).version_no]))[0].result;
  };
  const firstProof=await deposit();
  await test('GE01 deposit hands control to the branch FM',async()=>{
    const row=await state(); assert.equal(row.next_action_code,'GE01_REVIEW_PROOF');
    assert.equal(row.next_action_assigned_profile_id,identities.facility_manager.profileId);
  });
  await test('GE01 rejection requires a reason',()=>reject(()=>reviewProof(firstProof.proof_id,'rejected',''),'23514'));
  const rejectionKey=crypto.randomUUID(), rejectionVersion=(await state()).version_no;
  await reviewProof(firstProof.proof_id,'rejected','Recette : résultat final illisible',rejectionKey,rejectionVersion);
  await test('GE01 rejection returns a corrective action and reason to the agent',async()=>{
    const row=await state(); assert.equal(row.next_action_code,'GE01_REPLACE_PROOF');
    assert.equal(row.next_action_assigned_profile_id,identities.field_agent.profileId);
    assert.match(row.next_action_comment,/résultat final illisible/);
  });
  await test('GE01 replayed rejection does not duplicate actions',async()=>{
    const before=await state(); await reviewProof(firstProof.proof_id,'rejected','Recette : résultat final illisible',rejectionKey,rejectionVersion);
    assert.equal((await state()).next_action_id,before.next_action_id);
  });
  await test('GE01 rejected proof cannot close the dossier',()=>reject(()=>advance('Clôturée'),'23514'));
  const secondProof=await deposit();
  await test('GE01 corrected proof preserves original rejection and waits for FM',async()=>{
    assert.equal((await state()).next_action_code,'GE01_REVIEW_PROOF');
    assert.equal((await sql('select verification_status from public.proofs where id=$1',[firstProof.proof_id]))[0].verification_status,'rejected');
    assert.equal((await sql('select count(*)::int n from public.proofs where anomaly_id=$1',[issueReview.anomaly_id]))[0].n,2);
  });
  await reviewProof(secondProof.proof_id,'accepted','Recette : justificatif corrigé conforme');
  await test('GE01 acceptance prepares closure and satisfies requirement',async()=>{
    const row=await state(); assert.equal(row.next_action_code,'RECEIVE_INTERVENTION');
    assert.equal(row.next_action_assigned_profile_id,identities.facility_manager.profileId);
    assert.equal(row.pending_proof_requirement_count,0);
  });
  await verifyReception({db,sql,asRole,identities,test,reject,reference:ref,anomalyId:issueReview.anomaly_id,advance,deposit,reviewProof,state});
  await test('GE01 closure clears action and deadline while retaining history',async()=>{
    const row=await state(); assert.equal(row.is_closed,true); assert.equal(row.next_action_id,null); assert.equal(row.deadline_id,null);
    assert.ok((await sql("select count(*)::int n from public.anomaly_history where anomaly_id=$1 and event_type='proof_rejected'",[issueReview.anomaly_id]))[0].n);
  });
  await test('GE01 closed proof cannot be replaced',()=>reject(()=>deposit(),'23514'));
  await asRole('anon');
  await test('GE01 internal synchronizer is unavailable to anonymous RPC callers',()=>reject(()=>sql("select private.sync_ge01_continuity($1,'proof',$1)",[issueReview.anomaly_id]),'42501'));
  // Financial approval and FM execution authorization are separate decisions.
  for (const branch of ['internal_with_cost','vendor']) {
    const submitted=await submit(crypto.randomUUID(),payload.checks.map(c=>c.code==='ats_auto'?{...c,status:'alert',valueBoolean:false}:c));
    await asRole('facility_manager');
    const reviewed=await decide(submitted.report_id,await snapshot(submitted.report_id),'anomaly','Recette coût',['ats_auto'],'URGENT',`Recette ${branch}`);
    const refCost=reviewed.anomaly_reference;
    const view=async()=>(await sql('select * from public.anti_zombie_summary_v where anomaly_id=$1',[reviewed.anomaly_id]))[0];
    const cost=(await sql("select public.submit_anomaly_cost_decision($1,400000,'opex','Recette coût autorisé',$2) as r",[refCost,crypto.randomUUID()]))[0].r;
    await sql('select public.assign_ge01_diagnosis($1,$2,$3,$4,$5)',[refCost,'TEST-field_agent','Diagnostic requis',(await view()).version_no,crypto.randomUUID()]);
    await asRole('field_agent');
    const diagnosis=await view();
    await sql('select public.complete_qualification_action($1,$2,$3,$4,$5)',[refCost,diagnosis.next_action_id,'Diagnostic confirmé',crypto.randomUUID(),diagnosis.version_no]);
    await asRole('facility_manager');
    const vendor=branch==='vendor'?(await sql('select v.code from public.equipment_vendors ev join public.vendors v on v.id=ev.vendor_id where ev.equipment_id=$1 order by ev.is_primary desc limit 1',[equipmentId]))[0].code:null;
    const key=crypto.randomUUID();
    const authorize=async(costRef=cost.cost_reference,requestKey=key,version=null,vendorCode=vendor)=>sql('select public.authorize_ge01_cost_intervention($1,$2,$3,$4,$5,$6,$7) as r',[refCost,branch,costRef,vendorCode,'Recette autorisation',version??(await view()).version_no,requestKey]);
    await test(`${branch}: pending cost cannot authorize work`,()=>reject(()=>authorize(),'23514'));
    const refusedCost=(await sql("select public.submit_anomaly_cost_decision($1,450000,'opex','Recette coût refusé',$2) as r",[refCost,crypto.randomUUID()]))[0].r;
    await asRole('direction');
    await sql("select public.review_anomaly_cost_decision($1,'rejected','Recette : refus motivé',$2)",[refusedCost.cost_reference,crypto.randomUUID()]);
    await asRole('facility_manager');
    await test(`${branch}: refused cost cannot authorize work`,()=>reject(()=>authorize(refusedCost.cost_reference),'23514'));
    await test(`${branch}: legacy workflow cannot bypass financial authorization`,()=>reject(()=>sql("select public.advance_anomaly_workflow($1,'Affectée','Recette')",[refCost]),'23514'));
    assert.equal((await sql('select count(*)::int n from public.work_orders where anomaly_id=$1',[reviewed.anomaly_id]))[0].n,0);
    await asRole('direction');
    await sql("select public.review_anomaly_cost_decision($1,'approved','Recette Administration',$2)",[cost.cost_reference,crypto.randomUUID()]);
    await test(`${branch}: Administration approval does not create a work order`,async()=>assert.equal((await sql('select count(*)::int n from public.work_orders where anomaly_id=$1',[reviewed.anomaly_id]))[0].n,0));
    await test(`${branch}: Administration cannot replace FM authorization`,()=>reject(()=>authorize(),'42501'));
    await asRole('field_agent');
    await test(`${branch}: agent cannot authorize expenditure`,()=>reject(()=>authorize(),'42501'));
    await asRole('facility_manager');
    await test(`${branch}: stale dossier authorization rejected`,()=>reject(()=>authorize(cost.cost_reference,key,0),'40001'));
    if(branch==='vendor') await test('Vendor outside the equipment reference is rejected',()=>reject(()=>authorize(cost.cost_reference,key,null,'NO-SUCH-VENDOR'),'23514'));
    const authorized=(await authorize())[0].r;
    await test(`${branch}: FM links approved cost and retains internal responsibility`,async()=>{
      const w=(await sql('select * from public.work_orders where id=$1',[authorized.work_order_id]))[0];
      assert.equal(w.authorized_cost_id,cost.cost_id); assert.equal(w.ge01_treatment_branch,branch);
      assert.equal((await view()).responsible_profile_id,identities.field_agent.profileId);
      assert.equal((await view()).next_action_code,branch==='vendor'?'GE01_FOLLOW_VENDOR':'GE01_EXECUTE');
      assert.equal((await view()).pending_proof_requirement_count,1);
    });
    await test(`${branch}: authorization replay creates no second order`,async()=>assert.equal((await authorize())[0].r.work_order_id,authorized.work_order_id));
    await test(`${branch}: authorized cost link cannot be changed`,()=>reject(()=>sql('update public.work_orders set authorized_cost_id=null where id=$1',[authorized.work_order_id]),'23514'));
    await test(`${branch}: authorized order cannot be deleted`,()=>reject(()=>sql('delete from public.work_orders where id=$1',[authorized.work_order_id]),'23514'));
    await asRole('field_agent');
    await sql("select public.advance_anomaly_workflow($1,'En intervention','Recette début')",[refCost]);
    await sql("select public.advance_anomaly_workflow($1,'En validation','Recette résultat')",[refCost]);
    await test(`${branch}: assigned internal agent follows work through proof`,async()=>assert.equal((await view()).next_action_code,'GE01_SUBMIT_PROOF'));
    const proof=(await sql('select public.register_anomaly_proof($1,$2,$3,$4,$5) as r',[refCost,`${reviewed.anomaly_id}/${crypto.randomUUID()}.pdf`,'application/pdf',1024,'pv']))[0].r;
    await asRole('facility_manager');
    await sql("select public.review_anomaly_proof($1,$2,'accepted','Recette preuve',$3,$4)",[refCost,proof.proof_id,crypto.randomUUID(),(await view()).version_no]);
    await sql("select public.receive_intervention($1,'accepted','Recette réception et clôture',$2,$3)",[refCost,(await view()).version_no,crypto.randomUUID()]);
    await test(`${branch}: closure keeps cost authorization history`,async()=>{
      assert.equal((await view()).is_closed,true);assert.equal((await view()).next_action_id,null);
      assert.equal((await sql("select count(*)::int n from public.anomaly_history where anomaly_id=$1 and event_type='ge01_treatment_authorized'",[reviewed.anomaly_id]))[0].n,1);
    });
  }
  await verifyHealthSnapshot({db,sql,asRole,identities,test,reject,recipeRun,submit,snapshot,decide,issueChecks});
  await verifyHealthEngine({db,sql,asRole,test,reject});
  await verifyGe01Daily({db,sql,asRole,identities,test,reject,recipeRun,payload,snapshot,decide});
  await verifyHealthSources({db,sql,asRole,identities,test,reject,recipeRun,payload,snapshot,decide});
  await verifyRia({db,sql,asRole,identities,test,reject,recipeRun});
  await verifyFinancialReturns({db,sql,asRole,identities,test,reject,recipeRun,submit,snapshot,decide,issueChecks});
  await verifyDiagnosisAssignment({db,sql,asRole,identities,test,reject,recipeRun,submit,snapshot,decide,issueChecks});
  await verifyReopen({sql,asRole,identities,test,reject,reference:ref,anomalyId:issueReview.anomaly_id});
  if (!recipeRun) await verifyWaterRecette({db,sql,asRole,identities,test,reject});
  if (!recipeRun) await verifyRecette({db,sql,asRole,payload,test,reject,decide,snapshot,realReportId:normal.report_id,realAnomalyId:issueReview.anomaly_id});
  if (recipeRun) {
    await test('all recipe descendants keep the classification through closure',async()=>{
      await db.exec('reset role');
      for (const table of ['reports','anomalies','work_orders','proofs','costs']) {
        const counts=(await sql(`select count(*)::int n from public.${table} where not is_test`))[0];
        assert.equal(counts.n,0,table);
        assert.ok((await sql(`select count(*)::int n from public.${table} where is_test`))[0].n > 0, table+' recipe rows exist');
      }
    });
  }
  console.log(`GE-01 PostgreSQL integration (${recipeRun ? 'recette' : 'réel + isolation'}): ${passed} scenarios passed; no remote writes.`);
} catch (error) {
  console.error(error.message);
  if (error.cause) console.error(error.cause.message);
  process.exitCode = 1;
} finally { await db.close(); }
