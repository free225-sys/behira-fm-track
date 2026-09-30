import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runnerImport } from 'vite';

// Local recipe only: preserve synthetic decisions and history for human inspection.
const phase = process.argv[2];
assert.ok(['prepare', 'checks', 'verify'].includes(phase), 'Use prepare, checks or verify');
const root = new URL('../', import.meta.url);
const output = new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/FINANCE_LOCALE_RESULTATS.json', root);
const env = Object.fromEntries((await readFile(new URL('.env.supabase.local', root), 'utf8')).split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1)]; }));
assert.ok(['localhost', '127.0.0.1', '[::1]'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname), 'Local target required');
assert.ok(process.env.BEHIRA_LOCAL_AUTH_PASSWORD, 'Local test password required');
const make = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const fm = make(), admin = make(), agent = make();
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const load = async p => (await runnerImport(fileURLToPath(new URL(p, root)), { configFile: false, logLevel: 'silent' })).module;
let record;
try { record = JSON.parse(await readFile(output, 'utf8')); }
catch (error) { if (error.code !== 'ENOENT') throw error; record = { environment: 'local', roundKey: crypto.randomUUID(), createdAt: new Date().toISOString(), steps: [] }; }
const save = async () => { await mkdir(new URL('.', output), { recursive: true }); await writeFile(output, JSON.stringify(record, null, 2) + '\n'); };
const check = async (label, operation) => { await operation(); record.steps.push({ label, result: 'PASS', at: new Date().toISOString() }); await save(); console.log('PASS ' + label); };
const denied = async (operation, code) => { await assert.rejects(operation, error => error.code === code); };
try {
  await Promise.all([['facility.manager@demo.behira.invalid', fm], ['direction@demo.behira.invalid', admin], ['electricite@demo.behira.invalid', agent]].map(async ([email, client]) => unwrap(await client.auth.signInWithPassword({ email, password: process.env.BEHIRA_LOCAL_AUTH_PASSWORD }))));
  const { loadOperationalSnapshot } = await load('app/lib/supabase/data.ts');
  const { submitQueuedFieldRound, reviewGe01Report, submitAnomalyCostDecision, reviewAnomalyCostDecision } = await load('app/lib/supabase/mutations.ts');
  const submit = (client, input) => submitAnomalyCostDecision(client, input);
  const review = (client, reference, decision, comment) => reviewAnomalyCostDecision(client, { costReference: reference, decision, comment, idempotencyKey: crypto.randomUUID() });
  if (phase === 'prepare') {
    assert.ok(!record.reference, 'A recipe already exists; use verify, do not duplicate it');
    const { createEmptyGe01Draft, buildGe01Payload } = await load('app/lib/ge01/report.ts');
    const { getAuthenticatedProfileGate } = await load('app/lib/supabase/auth.ts');
    const profile = await getAuthenticatedProfileGate(agent);
    record.payload ??= buildGe01Payload({ ...createEmptyGe01Draft(new Date(), record.roundKey), engineHours: '126', starts24h: '0', testDuration: '12', startOutcome: 'success', functioningCorrect: 'yes', returnAuto: 'yes', temperatureLocal: 'Normal', cleanliness: 'Conforme', fuelLevel: { value: '70', unavailable: false, reason: '' }, oilLevel: { value: '95', unavailable: false, reason: '' }, waterTemperature: { value: '82', unavailable: false, reason: '' }, batteryVoltage: { value: '26', unavailable: false, reason: '' }, abnormalNoise: 'no', smoke: 'Aucune', geAuto: 'yes', atsAuto: 'no', alarmMc4: 'Aucune alarme', finalStatus: 'Opérationnel', confirmed: true, step: 3, comment: 'RECETTE FINANCIÈRE LOCALE — aucun achat, engagement ou paiement réel.' }, profile.displayName);
    await save();
    const receipt = await submitQueuedFieldRound(agent, record.roundKey, record.payload);
    const report = (await loadOperationalSnapshot(fm)).reports.find(r => r.id === receipt.report_id);
    const decision = await reviewGe01Report(fm, report, { decision: 'anomaly', comment: 'RECETTE FINANCIÈRE LOCALE : dossier isolé pour vérifier le seuil et les arbitrages.', checkCodes: ['ats_auto'], priorityCode: 'URGENT', anomalyTitle: 'RECETTE FINANCIÈRE — seuil et arbitrage' });
    record.reference = decision.anomalyReference; record.anomalyId = decision.anomalyId; record.reportReference = report.reference;
    record.inputs = [399999, 400000, 450000].map(amount => ({ anomalyReference: record.reference, amount, budgetType: 'opex', description: `RECETTE LOCALE ${amount} FCFA — estimation fictive, aucun achat ni paiement.`, idempotencyKey: crypto.randomUUID() }));
    record.costs = [];
    await save();
    for (const input of record.inputs) { record.costs.push(await submit(fm, input)); await save(); }
  }
  if (phase !== 'verify') {
    assert.equal(record.costs?.length, 3, 'Three prepared costs required');
    await check('399999 FCFA remains within FM delegation; 400000 and 450000 await Administration', async () => {
      assert.equal(record.costs[0].approval_status, 'approved'); assert.equal(record.costs[0].decision_scope, 'facility_manager');
      for (const c of record.costs.slice(1)) { assert.equal(c.approval_status, 'pending'); assert.equal(c.decision_scope, 'administration'); }
    });
    await check('Identical submission replay does not create another cost', async () => { const replay = await submit(fm, record.inputs[0]); assert.equal(replay.cost_id, record.costs[0].cost_id); assert.equal(replay.replayed, true); });
    await check('Agent cannot submit a cost', () => denied(() => submit(agent, { ...record.inputs[0], idempotencyKey: crypto.randomUUID() }), '42501'));
    await check('FM cannot approve a decision at the Administration threshold', () => denied(() => review(fm, record.costs[1].cost_reference, 'approved', 'RECETTE : tentative hors délégation'), '42501'));
    await check('Administration decision requires a reason', () => denied(() => review(admin, record.costs[1].cost_reference, 'approved', ''), '22023'));
    await check('Closed GE01 dossier refuses any new cost', () => denied(() => submit(fm, { ...record.inputs[0], anomalyReference: 'ANO-2026-000004', idempotencyKey: crypto.randomUUID() }), '23514'));
  } else {
    assert.ok(record.reference, 'Run prepare first');
    const costs = unwrap(await fm.from('costs').select('id,reference,amount,approval_status,decision_scope,threshold_amount_snapshot,review_comment,reviewed_by_profile_id,review_idempotency_key').eq('anomaly_id', record.anomalyId).order('amount'));
    await check('Browser decisions persist: FM approval, Administration approval and motivated refusal', async () => {
      assert.equal(costs.length, 3); assert.deepEqual(costs.map(c => c.approval_status), ['approved', 'approved', 'rejected']);
      for (const c of costs) assert.equal(Number(c.threshold_amount_snapshot), 400000);
      for (const c of costs.slice(1)) { assert.match(c.review_comment, /RECETTE/); assert.ok(c.reviewed_by_profile_id); }
      record.finalCosts = costs;
    });
    await check('Final refusal cannot be silently changed to an approval', () => denied(() => review(admin, costs[2].reference, 'approved', 'RECETTE : tentative de modification finale'), '23514'));
    await check('Exact replay of browser approval returns the same decision', async () => {
      const c = costs[1]; const replay = await reviewAnomalyCostDecision(admin, { costReference: c.reference, decision: 'approved', comment: c.review_comment, idempotencyKey: c.review_idempotency_key });
      assert.equal(replay.cost_id, c.id); assert.equal(replay.replayed, true);
    });
    await check('Financial history retains three submissions and three attributed decisions', async () => {
      const history = unwrap(await fm.from('anomaly_history').select('event_type,actor_profile_id,comment,source_record_id,occurred_at').in('source_record_id', costs.map(c => c.id)).order('occurred_at'));
      assert.equal(history.filter(e => e.event_type === 'cost_submitted').length, 3);
      assert.equal(history.filter(e => e.event_type === 'cost_approved').length, 2);
      assert.equal(history.filter(e => e.event_type === 'cost_rejected').length, 1);
      assert.ok(history.every(e => e.actor_profile_id)); record.history = history;
    });
    await check('Application reads canonical FCFA threshold and all three decisions', async () => {
      const snapshot = await loadOperationalSnapshot(fm); assert.equal(snapshot.financialDecisionParameter.unit, 'FCFA'); assert.equal(snapshot.financialDecisionParameter.value, 400000);
      assert.equal(snapshot.costs.filter(c => c.anomalyReference === record.reference).length, 3);
      assert.equal(snapshot.reports.find(r => r.reference === record.reportReference).checks.length, 22);
    });
  }
  console.log(JSON.stringify({ phase, reference: record.reference, costs: record.costs.map(c => c.cost_reference), checks: record.steps.length }));
} finally { await Promise.all([fm.auth.signOut({ scope: 'local' }), admin.auth.signOut({ scope: 'local' }), agent.auth.signOut({ scope: 'local' })]); }
