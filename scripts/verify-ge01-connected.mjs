import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runnerImport } from 'vite';

// Real Auth + PostgREST test. Hard loopback boundary: never runs against a hosted project.
const root = new URL('../', import.meta.url);
const env = Object.fromEntries((await readFile(new URL('.env.supabase.local', root), 'utf8'))
  .split(/\r?\n/).filter(line => line && !line.startsWith('#')).map(line => {
    const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)];
  }));
const url = env.NEXT_PUBLIC_SUPABASE_URL;
if (!url || !['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) {
  throw new Error('This test requires an isolated loopback Supabase stack. Remote writes are forbidden.');
}
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const password = process.env.BEHIRA_LOCAL_AUTH_PASSWORD;
if (!key || !password) throw new Error('Local public key and BEHIRA_LOCAL_AUTH_PASSWORD are required.');
const makeClient = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const agent = makeClient(), fm = makeClient(), fm2 = makeClient(), anonymous = makeClient();
const clients = [agent, fm, fm2];
const results = [], records = [];
const unwrap = ({ data, error }) => { if (error) throw error; return data; };
const test = async (name, action) => { await action(); results.push({ name, result: 'PASS' }); console.log('PASS ' + name); };
const login = async (client, email) => unwrap(await client.auth.signInWithPassword({ email, password }));
const loadModule = async path => (await runnerImport(fileURLToPath(new URL(path, root)), { configFile: false, logLevel: 'silent' })).module;
try {
  const agentSession = await login(agent, 'electricite@demo.behira.invalid');
  const fmSession = await login(fm, 'facility.manager@demo.behira.invalid');
  await login(fm2, 'facility.manager@demo.behira.invalid');
  const { getAuthenticatedProfileGate, resolveAuthenticatedPersona } = await loadModule('app/lib/supabase/auth.ts');
  const agentGate = await getAuthenticatedProfileGate(agent), fmGate = await getAuthenticatedProfileGate(fm);
  await test('Real Auth sessions resolve the two expected roles', async () => {
    assert.equal(await resolveAuthenticatedPersona(agent, agentSession.user.id), 'electricite');
    assert.equal(await resolveAuthenticatedPersona(fm, fmSession.user.id), 'facility');
    assert.equal(fmGate.employeeCode,'FAU-FM');
  });
  unwrap(await fm.from('ge01_report_reviews').select('report_id').limit(1));
  const { createEmptyGe01Draft, buildGe01Payload } = await loadModule('app/lib/ge01/report.ts');
  const { submitQueuedFieldRound, reviewGe01Report } = await loadModule('app/lib/supabase/mutations.ts');
  const { loadOperationalSnapshot } = await loadModule('app/lib/supabase/data.ts');
  const { ge01ChecksSnapshot } = await loadModule('app/lib/ge01/review.ts');
  const draft = { ...createEmptyGe01Draft(new Date(), crypto.randomUUID()), engineHours:'123.5', starts24h:'0',
    testDuration:'12', startOutcome:'success', functioningCorrect:'yes', returnAuto:'yes', temperatureLocal:'Normal',
    cleanliness:'Conforme', fuelLevel:{value:'70',unavailable:false,reason:''}, oilLevel:{value:'95',unavailable:false,reason:''},
    waterTemperature:{value:'82',unavailable:false,reason:''}, batteryVoltage:{value:'26',unavailable:false,reason:''},
    abnormalNoise:'no', smoke:'Aucune', geAuto:'yes', atsAuto:'yes', alarmMc4:'Aucune alarme', finalStatus:'Opérationnel',
    confirmed:true, step:3, comment:'RECETTE GE01 CONNECTÉE LOCALE ' + new Date().toISOString() };
  const payload = buildGe01Payload(draft, agentGate.displayName);
  const roundId = crypto.randomUUID();
  const normal = await submitQueuedFieldRound(agent, roundId, payload);
  records.push({ kind:'conform', ...normal });
  const findReport = async id => {
    const report = (await loadOperationalSnapshot(fm)).reports.find(item => item.id === id);
    assert.ok(report, 'Report must be visible in the real FM operational snapshot'); return report;
  };
  const normalReport = await findReport(normal.report_id);
  await test('Submitted round reaches Faustin with all 22 original answers', async () => {
    assert.equal(normalReport.checks.length,22);
    assert.deepEqual(ge01ChecksSnapshot(normalReport.checks),ge01ChecksSnapshot(payload.checks));
  });
  await test('Replay of the same round returns one canonical reference', async () => {
    assert.equal((await submitQueuedFieldRound(agent,roundId,payload)).report_id,normal.report_id);
  });
  const input = {decision:'conform',comment:'Recette connectée : conformité examinée',checkCodes:[]};
  const rawArgs = { p_report_id:normal.report_id,p_decision:'conform',p_comment:input.comment,
    p_expected_updated_at:normalReport.updatedAt,p_expected_checks:ge01ChecksSnapshot(normalReport.checks) };
  await test('Agent cannot review through the real API', async () => assert.equal((await agent.rpc('review_ge01_report',rawArgs)).error?.code,'42501'));
  await test('Anonymous request cannot review through the real API', async () => assert.ok((await anonymous.rpc('review_ge01_report',rawArgs)).error));
  await test('Stale answers are refused through PostgREST', async () => assert.equal((await fm.rpc('review_ge01_report',{...rawArgs,p_expected_checks:[]})).error?.code,'40001'));
  const normalDecision = await reviewGe01Report(fm,normalReport,input);
  await test('Conformity persists and creates no anomaly', async () => {
    assert.equal(normalDecision.decision,'conform');
    assert.equal((await findReport(normal.report_id)).review?.decision,'conform');
    assert.equal(unwrap(await fm.from('anomalies').select('id').eq('source_report_id',normal.report_id)).length,0);
  });
  await test('Decision replay preserves its original server timestamp', async () => {
    assert.equal((await reviewGe01Report(fm,normalReport,input)).reviewedAt,normalDecision.reviewedAt);
  });
  const issuePayload = buildGe01Payload({...draft,atsAuto:'no'},agentGate.displayName);
  const issue = await submitQueuedFieldRound(agent,crypto.randomUUID(),issuePayload);
  records.push({kind:'anomaly',...issue});
  const issueReport = await findReport(issue.report_id);
  const issueInput = {decision:'anomaly',comment:'Recette : ATS hors AUTO',checkCodes:['ats_auto'],priorityCode:'URGENT',anomalyTitle:'RECETTE GE01 — ATS hors AUTO'};
  await test('Two simultaneous FM sessions create only one anomaly', async () => {
    const [first,second] = await Promise.all([reviewGe01Report(fm,issueReport,issueInput),reviewGe01Report(fm2,issueReport,issueInput)]);
    assert.equal(first.anomalyId,second.anomalyId);
    const linked = unwrap(await fm.from('anomalies').select('id,reported_by_profile_id').eq('source_report_id',issue.report_id));
    assert.equal(linked.length,1); assert.equal(linked[0].reported_by_profile_id,agentGate.profileId);
    records[1].anomaly_id=first.anomalyId; records[1].anomaly_reference=first.anomalyReference;
  });
  await test('Reviewed report and check edits are rejected', async () => {
    assert.equal((await fm.from('reports').update({analysis:'overwrite'}).eq('id',normal.report_id)).error?.code,'23514');
    assert.equal((await fm.from('report_checks').update({value_numeric:999}).eq('report_id',normal.report_id).eq('check_code','heures_moteur')).error?.code,'23514');
  });
  await fm.auth.signOut({scope:'local'});
  await test('Signed-out session cannot review', async () => assert.ok((await fm.rpc('review_ge01_report',rawArgs)).error));
  await login(fm,'facility.manager@demo.behira.invalid');
  await test('New authenticated session reloads both stored decisions', async () => {
    assert.equal((await findReport(normal.report_id)).review?.decision,'conform');
    assert.equal((await findReport(issue.report_id)).review?.decision,'anomaly');
  });
} catch(error) {
  results.push({name:'Execution stopped',result:'FAIL',message:error.message});
  console.error(error.message); process.exitCode=1;
} finally {
  await Promise.allSettled(clients.map(client=>client.auth.signOut({scope:'local'})));
  const output = new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/',root);
  await mkdir(output,{recursive:true});
  await writeFile(new URL('API_GE01_RESULTATS.json',output),JSON.stringify({date:new Date().toISOString(),environment:'loopback-only',results,records,networkRecovery:'Separate browser scenario required'},null,2));
}
