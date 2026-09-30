import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runnerImport } from 'vite';

// Synthetic local scenarios only. Keep receipts so a second run cannot duplicate work.
const phase = process.argv[2];
assert.ok(['prepare', 'finish', 'verify'].includes(phase));
const root = new URL('../', import.meta.url);
const output = new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/INTERVENTION_COUT_RESULTATS.json', root);
const env = Object.fromEntries((await readFile(new URL('.env.supabase.local', root), 'utf8')).split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname));
assert.ok(process.env.BEHIRA_LOCAL_AUTH_PASSWORD);
const make = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const fm = make(), agent = make();
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const load = async p => (await runnerImport(fileURLToPath(new URL(p, root)), { configFile: false, logLevel: 'silent' })).module;
let record;
try { record = JSON.parse(await readFile(output, 'utf8')); }
catch (e) { if (e.code !== 'ENOENT') throw e; record = { environment: 'local', cases: [], steps: [] }; }
const save = async () => { await mkdir(new URL('.', output), { recursive: true }); await writeFile(output, JSON.stringify(record, null, 2) + '\n'); };
const check = async (label, fn) => { await fn(); record.steps.push({ label, result: 'PASS', at: new Date().toISOString() }); await save(); console.log('PASS ' + label); };
try {
  await Promise.all([['facility.manager@demo.behira.invalid', fm], ['electricite@demo.behira.invalid', agent]].map(async ([email, c]) => unwrap(await c.auth.signInWithPassword({ email, password: process.env.BEHIRA_LOCAL_AUTH_PASSWORD }))));
  const { loadOperationalSnapshot } = await load('app/lib/supabase/data.ts');
  const { submitQueuedFieldRound, reviewGe01Report, submitAnomalyCostDecision, uploadQueuedAnomalyProof } = await load('app/lib/supabase/mutations.ts');
  const { getAuthenticatedProfileGate } = await load('app/lib/supabase/auth.ts');
  const profile = await getAuthenticatedProfileGate(agent);
  const row = async c => unwrap(await fm.from('anti_zombie_summary_v').select('*').eq('reference', c.reference).single());
  const order = async c => unwrap(await fm.from('work_orders').select('*').eq('anomaly_id', c.anomalyId).not('authorized_cost_id', 'is', null).maybeSingle());
  if (phase === 'prepare') {
    assert.equal(record.cases.length, 0, 'Recipe already prepared; do not duplicate');
    const finance = JSON.parse(await readFile(new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/FINANCE_LOCALE_RESULTATS.json', root), 'utf8'));
    record.cases.push({ branch: 'vendor', reference: finance.reference, anomalyId: finance.anomalyId, costReference: finance.finalCosts.find(c => c.amount === 400000).reference });
    await save();
    const { createEmptyGe01Draft, buildGe01Payload } = await load('app/lib/ge01/report.ts');
    const key = crypto.randomUUID();
    const payload = buildGe01Payload({ ...createEmptyGe01Draft(new Date(), key), engineHours: '127', starts24h: '0', testDuration: '12', startOutcome: 'success', functioningCorrect: 'yes', returnAuto: 'yes', temperatureLocal: 'Normal', cleanliness: 'Conforme', fuelLevel: { value: '70', unavailable: false, reason: '' }, oilLevel: { value: '95', unavailable: false, reason: '' }, waterTemperature: { value: '82', unavailable: false, reason: '' }, batteryVoltage: { value: '26', unavailable: false, reason: '' }, abnormalNoise: 'no', smoke: 'Aucune', geAuto: 'yes', atsAuto: 'no', alarmMc4: 'Aucune alarme', finalStatus: 'Opérationnel', confirmed: true, step: 3, comment: 'RECETTE LOCALE — intervention avec coût fictif, aucun achat ni paiement réel.' }, profile.displayName);
    const receipt = await submitQueuedFieldRound(agent, key, payload);
    const report = (await loadOperationalSnapshot(fm)).reports.find(r => r.id === receipt.report_id);
    const decision = await reviewGe01Report(fm, report, { decision: 'anomaly', comment: 'RECETTE LOCALE : coût lié au traitement interne.', checkCodes: ['ats_auto'], priorityCode: 'URGENT', anomalyTitle: 'RECETTE GE01 — intervention interne avec coût' });
    const c = { branch: 'internal_with_cost', reference: decision.anomalyReference, anomalyId: decision.anomalyId };
    record.cases.push(c); await save();
    c.costReference = (await submitAnomalyCostDecision(fm, { anomalyReference: c.reference, amount: 399999, budgetType: 'opex', description: 'RECETTE : estimation fictive du traitement interne.', idempotencyKey: crypto.randomUUID() })).cost_reference;
    await save();
    for (const c of record.cases) {
      let current = await row(c);
      unwrap(await fm.rpc('assign_ge01_diagnosis', { p_reference: c.reference, p_employee_code: 'EVAR-ELEC', p_comment: 'RECETTE : diagnostic affecté à Évariste.', p_base_version_no: current.version_no, p_idempotency_key: crypto.randomUUID() }));
      current = await row(c);
      unwrap(await agent.rpc('complete_qualification_action', { p_reference: c.reference, p_action_id: current.next_action_id, p_comment: 'RECETTE : diagnostic confirmé ; traitement avec coût à autoriser par Faustin.', p_base_version_no: current.version_no, p_idempotency_key: crypto.randomUUID() }));
      await check(`${c.branch}: financial approval still requires explicit FM choice`, async () => { assert.equal((await row(c)).next_action_code, 'CHOOSE_TREATMENT_BRANCH'); assert.equal(await order(c), null); });
    }
  } else {
    assert.equal(record.cases.length, 2);
    for (const c of record.cases) {
      let w = await order(c);
      // The vendor authorization must come from the UI; exercise internal variant through the same public API.
      if (!w && phase === 'finish' && c.branch === 'internal_with_cost') {
        const current = await row(c);
        unwrap(await fm.rpc('authorize_ge01_cost_intervention', { p_reference: c.reference, p_branch: c.branch, p_cost_reference: c.costReference, p_vendor_code: null, p_comment: 'RECETTE : intervention interne autorisée sur coût approuvé ; aucun achat réel.', p_base_version_no: current.version_no, p_idempotency_key: crypto.randomUUID() }));
        w = await order(c);
      }
      assert.ok(w, `Authorize ${c.reference} in the FM interface first`);
      await check(`${c.branch}: approved cost and responsible agent visible in application`, async () => {
        const snap = await loadOperationalSnapshot(agent); const a = snap.anomalies.find(a => a.id === c.reference);
        assert.equal(a.treatment.costReference, c.costReference); assert.equal(a.treatment.branch, c.branch);
        assert.ok(a.workflow.assignedToCurrentUser); assert.ok(snap.workOrders.some(o => o.id === w.reference));
        if (c.branch === 'vendor') assert.ok(a.treatment.vendorLabel);
      });
      await check(`${c.branch}: exact authorization replay creates no duplicate`, async () => {
        const vendor = w.assigned_vendor_id ? unwrap(await fm.from('vendors').select('code').eq('id', w.assigned_vendor_id).single()).code : null;
        const replay = unwrap(await fm.rpc('authorize_ge01_cost_intervention', { p_reference: c.reference, p_branch: c.branch, p_cost_reference: c.costReference, p_vendor_code: vendor, p_comment: w.instructions, p_base_version_no: 0, p_idempotency_key: w.authorization_idempotency_key }));
        assert.equal(replay.replayed, true); assert.equal(replay.work_order_id, w.id);
      });
      if (phase === 'finish' && !(await row(c)).is_closed) {
        unwrap(await agent.rpc('advance_anomaly_workflow', { p_reference: c.reference, p_target: 'En intervention', p_comment: 'RECETTE : début simulé, aucune intervention réelle.' }));
        unwrap(await agent.rpc('advance_anomaly_workflow', { p_reference: c.reference, p_target: 'En validation', p_comment: 'RECETTE : résultat simulé, contrôle ATS conforme.' }));
        await check(`${c.branch}: completion requests proof from internal agent`, async () => { assert.equal((await row(c)).next_action_code, 'GE01_SUBMIT_PROOF'); });
        const proof = await uploadQueuedAnomalyProof(agent, crypto.randomUUID(), { anomalyId: c.anomalyId, anomalyReference: c.reference, proofType: 'pv', capturedAt: new Date().toISOString(), file: new File([await readFile(new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/GE01_JUSTIFICATIF_TEST.pdf', root))], 'GE01_PREUVE_COUT_FICTIF.pdf', { type: 'application/pdf' }) });
        await check(`${c.branch}: uploaded proof returns control to FM`, async () => assert.equal((await row(c)).next_action_code, 'GE01_REVIEW_PROOF'));
        unwrap(await fm.rpc('review_anomaly_proof', { p_reference: c.reference, p_proof_id: proof.proof_id, p_decision: 'accepted', p_comment: 'RECETTE : justificatif fictif accepté.', p_idempotency_key: crypto.randomUUID(), p_base_version_no: (await row(c)).version_no }));
        unwrap(await fm.rpc('advance_anomaly_workflow', { p_reference: c.reference, p_target: 'Clôturée', p_comment: 'RECETTE : clôture après contrôle, aucun paiement réel.' }));
      }
      await check(`${c.branch}: closure retains a single attributed financial authorization`, async () => {
        const current = await row(c); assert.equal(current.is_closed, true); assert.equal(current.next_action_id, null); assert.equal(current.pending_proof_requirement_count, 0);
        const a = (await loadOperationalSnapshot(fm)).anomalies.find(a => a.id === c.reference);
        assert.equal(a.treatment.costReference, c.costReference); assert.equal(a.proof, true);
        const events = a.history.filter(e => e.code === 'GE01_TREATMENT_AUTHORIZED'); assert.equal(events.length, 1); assert.ok(events[0].actor);
        c.workOrderReference = w.reference; c.finalSummary = current; c.history = a.history;
      });
    }
  }
  await save(); console.log(JSON.stringify({ phase, cases: record.cases.map(c => ({ reference: c.reference, branch: c.branch, cost: c.costReference })), checks: record.steps.length }));
} finally { await Promise.all([fm.auth.signOut({ scope: 'local' }), agent.auth.signOut({ scope: 'local' })]); }
