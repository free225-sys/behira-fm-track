import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runnerImport } from 'vite';

// Prepare the financial scenario through diagnosis only; human cost and authorization remain pending.
const root = new URL('../', import.meta.url);
const output = new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/RECETTE_GUIDEE_GE01_COUT.json', root);
const env = Object.fromEntries((await readFile(new URL('.env.supabase.local', root), 'utf8')).split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname), 'Local target required');
assert.ok(process.env.BEHIRA_LOCAL_AUTH_PASSWORD, 'Local password required');
const make = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const agent = make(), fm = make();
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const load = async p => (await runnerImport(fileURLToPath(new URL(p, root)), { configFile: false, logLevel: 'silent' })).module;
let record;
try { record = JSON.parse(await readFile(output, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; record = { environment: 'local', startedAt: new Date().toISOString(), humanValidation: 'pending', scenario: 'internal_with_cost', roundKey: crypto.randomUUID(), remainingScenarios: ['vendor_with_proof_correction'] }; }
const save = async () => { await mkdir(new URL('.', output), { recursive: true }); await writeFile(output, JSON.stringify(record, null, 2) + '\n'); };
try {
  await Promise.all([['electricite@demo.behira.invalid', agent], ['facility.manager@demo.behira.invalid', fm]].map(async ([email, c]) => unwrap(await c.auth.signInWithPassword({ email, password: process.env.BEHIRA_LOCAL_AUTH_PASSWORD }))));
  const { loadOperationalSnapshot } = await load('app/lib/supabase/data.ts');
  if (!record.receipt) {
    const { getAuthenticatedProfileGate } = await load('app/lib/supabase/auth.ts');
    const { createEmptyGe01Draft, buildGe01Payload } = await load('app/lib/ge01/report.ts');
    const { submitQueuedFieldRound } = await load('app/lib/supabase/mutations.ts');
    const profile = await getAuthenticatedProfileGate(agent);
    record.payload ??= buildGe01Payload({ ...createEmptyGe01Draft(new Date(), record.roundKey), engineHours: '129', starts24h: '0', testDuration: '12', startOutcome: 'success', functioningCorrect: 'yes', returnAuto: 'yes', temperatureLocal: 'Normal', cleanliness: 'Conforme', fuelLevel: { value: '70', unavailable: false, reason: '' }, oilLevel: { value: '95', unavailable: false, reason: '' }, waterTemperature: { value: '82', unavailable: false, reason: '' }, batteryVoltage: { value: '26', unavailable: false, reason: '' }, abnormalNoise: 'no', smoke: 'Aucune', geAuto: 'yes', atsAuto: 'no', alarmMc4: 'Aucune alarme', finalStatus: 'Opérationnel', confirmed: true, step: 3, comment: 'TEST GUIDÉ 2 — données fictives. Diagnostic simulé préparé pour tester une intervention interne avec coût. Aucun achat ni paiement réel.' }, profile.displayName);
    await save();
    record.receipt = await submitQueuedFieldRound(agent, record.roundKey, record.payload);
    await save();
  }
  const snapshot = await loadOperationalSnapshot(fm);
  const report = snapshot.reports.find(r => r.id === record.receipt.report_id);
  assert.ok(report, 'Report visible to FM'); assert.equal(report.checks.length, 22);
  record.reportReference = report.reference;
  record.lastObservedReview = report.review ?? null;
  record.nextHumanStep = report.review ? 'Review existing decision before continuing the guided scenario' : 'Faustin examines the report and decides whether to open an anomaly';
  const { reviewGe01Report } = await load('app/lib/supabase/mutations.ts');
  if (!record.anomalyReference) {
    const decision = report.review ?? await reviewGe01Report(fm, report, {decision:'anomaly',comment:'PRÉPARATION AUTOMATIQUE DU TEST GUIDÉ 2 : dossier fictif pour arbitrage financier humain.',checkCodes:['ats_auto'],priorityCode:'URGENT',anomalyTitle:'TEST GUIDÉ 2 — intervention interne avec coût'});
    record.anomalyReference=decision.anomalyReference; record.anomalyId=decision.anomalyId; await save();
  }
  const state=async()=>unwrap(await fm.from('anti_zombie_summary_v').select('*').eq('reference',record.anomalyReference).single());
  let current=await state();
  if(current.next_action_code==='QUALIFY_ASSIGN') {
    record.assignKey ??= crypto.randomUUID(); await save();
    unwrap(await fm.rpc('assign_ge01_diagnosis',{p_reference:record.anomalyReference,p_employee_code:'EVAR-ELEC',p_comment:'PRÉPARATION AUTOMATIQUE : diagnostic fictif affecté à Évariste.',p_base_version_no:current.version_no,p_idempotency_key:record.assignKey}));
    current=await state();
  }
  if(current.next_action_code==='PERFORM_DIAGNOSIS') {
    record.diagnoseKey ??= crypto.randomUUID(); await save();
    unwrap(await agent.rpc('complete_qualification_action',{p_reference:record.anomalyReference,p_action_id:current.next_action_id,p_comment:'PRÉPARATION AUTOMATIQUE : besoin fictif de matériel pour correction interne. Estimation de test à saisir par Faustin ; aucun achat réel.',p_base_version_no:current.version_no,p_idempotency_key:record.diagnoseKey}));
    current=await state();
  }
  assert.equal(current.next_action_code,'CHOOSE_TREATMENT_BRANCH');
  assert.equal(unwrap(await fm.from('costs').select('id').eq('anomaly_id',record.anomalyId)).length,0,'No financial decision entered automatically');
  record.preparation='Report, anomaly, assignment and diagnosis prepared automatically through local public APIs; financial decision remains for human test.';
  record.nextHumanStep='Faustin submits a synthetic cost of 399999 FCFA';
  record.lastObservedReview = (await loadOperationalSnapshot(fm)).reports.find(r => r.id === record.receipt.report_id)?.review ?? null;
  record.checkedAt = new Date().toISOString(); await save();
  console.log(JSON.stringify({anomaly:record.anomalyReference,nextAction:current.next_action_code,costs:0}));
  console.log(JSON.stringify({ report: report.reference, checks: report.checks.length, review: record.lastObservedReview?.decision ?? 'pending', humanValidation: record.humanValidation }));
} finally { await Promise.all([agent.auth.signOut({ scope: 'local' }), fm.auth.signOut({ scope: 'local' })]); }
