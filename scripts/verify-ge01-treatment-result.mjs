import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runnerImport } from 'vite';

// Read back the local browser recipe. No business writes and no hosted target.
const root = new URL('../', import.meta.url);
const env = Object.fromEntries((await readFile(new URL('.env.supabase.local', root), 'utf8'))
  .split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
  }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
assert.ok(url && ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname), 'Local target required');
assert.ok(process.env.BEHIRA_LOCAL_AUTH_PASSWORD, 'BEHIRA_LOCAL_AUTH_PASSWORD required');
const client = createClient(url, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const load = async path => (await runnerImport(fileURLToPath(new URL(path, root)), { configFile: false, logLevel: 'silent' })).module;
const results = [];
const test = (name, operation) => { operation(); results.push({ name, result: 'PASS' }); console.log('PASS ' + name); };
try {
  unwrap(await client.auth.signInWithPassword({ email: 'facility.manager@demo.behira.invalid', password: process.env.BEHIRA_LOCAL_AUTH_PASSWORD }));
  const anomaly = unwrap(await client.from('anomalies').select('*').eq('reference', 'ANO-2026-000002').single());
  assert.match(anomaly.title, /RECETTE GE01/);
  const queries = await Promise.all([
    client.from('proofs').select('*').eq('anomaly_id', anomaly.id),
    client.from('work_orders').select('*').eq('anomaly_id', anomaly.id),
    client.from('interventions').select('*').eq('anomaly_id', anomaly.id),
    client.from('anomaly_history').select('event_type,to_status_id,actor_profile_id,occurred_at,comment,change_set').eq('anomaly_id', anomaly.id).order('occurred_at'),
    client.from('ge01_report_reviews').select('*').eq('report_id', anomaly.source_report_id).single(),
    client.from('profiles').select('id,employee_code').in('employee_code', ['EVAR-ELEC', 'FAU-FM']),
    client.from('anomaly_deadlines').select('*').eq('anomaly_id', anomaly.id).order('created_at'),
  ]);
  const [proofs, workOrders, interventions, history, review, profiles, deadlines] = queries.map(unwrap);
  const agentId = profiles.find(p => p.employee_code === 'EVAR-ELEC').id;
  const fmId = profiles.find(p => p.employee_code === 'FAU-FM').id;
  const { loadOperationalSnapshot } = await load('app/lib/supabase/data.ts');
  const snapshot = await loadOperationalSnapshot(client);
  const dossier = snapshot.anomalies.find(a => a.databaseId === anomaly.id);
  const report = snapshot.reports.find(r => r.id === anomaly.source_report_id);
  const { ge01ChecksSnapshot } = await load('app/lib/ge01/review.ts');
  test('Closed dossier and closure comment persist', () => {
    assert.equal(dossier.status, 'Clôturée'); assert.ok(anomaly.closed_at);
    assert.match(anomaly.closure_comment, /RECETTE LOCALE/);
  });
  test('Source report retains all 22 original answers', () => {
    assert.equal(report.checks.length, 22);
    assert.deepEqual(ge01ChecksSnapshot(report.checks), review.checks_snapshot);
  });
  test('Exactly one completed internal work order and intervention', () => {
    assert.equal(workOrders.length, 1); assert.equal(workOrders[0].status, 'completed');
    assert.equal(workOrders[0].assigned_profile_id, agentId);
    assert.equal(interventions.length, 1); assert.equal(interventions[0].performed_by_profile_id, agentId);
    assert.match(interventions[0].summary, /RECETTE LOCALE/);
  });
  test('Exactly one agent proof accepted by Faustin', () => {
    assert.equal(proofs.length, 1); assert.equal(proofs[0].verification_status, 'accepted');
    assert.equal(proofs[0].submitted_by_profile_id, agentId);
    assert.equal(proofs[0].reviewed_by_profile_id, fmId);
  });
  test('Assigned-agent diagnosis and manager closure are attributed', () => {
    assert.ok(history.some(h => h.actor_profile_id === agentId && h.change_set?.completed_action_code === 'PERFORM_DIAGNOSIS'));
    assert.ok(history.some(h => h.actor_profile_id === fmId && h.to_status_id === anomaly.current_status_id));
    assert.match(dossier.diagnosis, /ATS hors AUTO/);
  });
  test('Deadline history persists and no deadline remains active after closure', () => {
    assert.ok(deadlines.length >= 1); assert.ok(deadlines.every(d => d.superseded_at));
    assert.ok(dossier.history.some(h => h.code === 'DEADLINE_CLEARED' && h.actor === 'Faustin SIAPO'));
  });
  const { createAnomalyProofConsultationUrl } = await load('app/lib/supabase/mutations.ts');
  const signedUrl = await createAnomalyProofConsultationUrl(client, proofs[0].storage_path);
  assert.equal(new URL(signedUrl).origin, new URL(url).origin);
  const response = await fetch(signedUrl);
  assert.ok(response.ok, 'Authenticated proof download');
  const downloaded = Buffer.from(await response.arrayBuffer());
  const fixture = await readFile(new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/GE01_JUSTIFICATIF_TEST.pdf', root));
  const hash = bytes => createHash('sha256').update(bytes).digest('hex');
  test('Private stored PDF downloads with identical bytes', () => assert.equal(hash(downloaded), hash(fixture)));
  const output = new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/TRAITEMENT_GE01_RESULTATS.json', root);
  await mkdir(new URL('.', output), { recursive: true });
  await writeFile(output, JSON.stringify({ checkedAt: new Date().toISOString(), environment: 'local', results,
    anomaly: { reference: anomaly.reference, closedAt: anomaly.closed_at, closureComment: anomaly.closure_comment },
    sourceReport: report.reference, originalAnswers: report.checks.length,
    workOrders, interventions, proof: { reference: proofs[0].reference, status: proofs[0].verification_status, reviewedAt: proofs[0].reviewed_at, sha256: hash(downloaded), bytes: downloaded.length },
    history, deadlines, canonicalSummary: dossier.antiZombieSummary,
  }, null, 2) + '\n');
  console.log(`${results.length} local readback checks passed. No business data modified.`);
} finally { await client.auth.signOut({ scope: 'local' }); }
