import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

const { module: { requiresFmDecision, pendingFmDossierIds, managerActionQueueIds } } = await runnerImport(
  fileURLToPath(new URL('../app/lib/connected-presentation.ts', import.meta.url)),
  { configFile: false, logLevel: 'silent' },
);
const source = {
  financialDecisionParameter: { value: 400000 },
  equipment: ['GE-01', 'RIA-01', 'DEMO-GE-01'].map(code => ({ id: code, code, label: code })),
  reports: [{ id: 'report-1', equipmentCode: 'GE-01', submittedAt: '2026-09-16T10:00:00Z', performedAt: '2026-09-16T09:30:00Z' }],
  anomalies: [
    { id: 'A', asset: 'GE-01', status: 'À qualifier', priority: 'Haute', delayed: false },
    { id: 'B', asset: 'RIA-01', status: 'Affectée', priority: 'Haute', delayed: false },
    { id: 'C', asset: 'GE-01', status: 'En intervention', priority: 'Haute', delayed: false },
  ],
  costs: [
    { anomalyReference: 'A', decisionScope: 'facility_manager', approvalStatus: 'pending' },
    { anomalyReference: 'A', decisionScope: 'facility_manager', approvalStatus: 'pending' },
    { anomalyReference: 'B', decisionScope: 'administration', approvalStatus: 'pending' },
    { anomalyReference: 'B', decisionScope: 'administration', approvalStatus: 'approved' },
  ],
};
assert.deepEqual([...pendingFmDossierIds(source)], ['A'], 'One dossier with multiple pending costs counts once for FM');
assert.equal(requiresFmDecision(source.anomalies[1]), false);
assert.equal(requiresFmDecision(source.anomalies[2]), false);
assert.equal(requiresFmDecision({ status: 'En validation', workflow: { assignedToCurrentUser: false, actionAssignedToCurrentUser: true, actionCode: 'GE01_CLOSE' } }), true);
assert.equal(requiresFmDecision({ status: 'En validation', workflow: { assignedToCurrentUser: true, actionAssignedToCurrentUser: false, actionCode: 'GE01_CLOSE' } }), false);
assert.equal(requiresFmDecision({ status: 'Clôturée', workflow: { assignedToCurrentUser: false, actionAssignedToCurrentUser: true, actionCode: 'GE01_CLOSE' } }), false);
assert.deepEqual([...pendingFmDossierIds({ ...source, costs: [...source.costs, { anomalyReference: 'B', decisionScope: 'facility_manager', approvalStatus: 'pending' }] })], ['A', 'B'], 'An assigned dossier awaiting an FM financial decision belongs in the queue');
const canonicalQueueCases = [
  { id:'receipt', status:'En intervention', workflow:{ actionCode:'RECEIVE_INTERVENTION', actionAssignedToCurrentUser:true } },
  { id:'reopened', status:'À qualifier', workflow:{ actionCode:'REVIEW_REOPENED_DOSSIER', actionAssignedToCurrentUser:true } },
  { id:'delivered-report', status:'En validation', workflow:{ actionCode:'GE01_REVIEW_PROOF', actionAssignedToCurrentUser:true } },
  { id:'other-manager', status:'En intervention', workflow:{ actionCode:'RECEIVE_INTERVENTION', actionAssignedToCurrentUser:false } },
  { id:'closed', status:'Clôturée', workflow:{ actionCode:'REVIEW_REOPENED_DOSSIER', actionAssignedToCurrentUser:true } },
];
assert.deepEqual([...managerActionQueueIds(canonicalQueueCases, 'RECEIVE_INTERVENTION')], ['receipt']);
assert.deepEqual([...managerActionQueueIds(canonicalQueueCases, 'REVIEW_REOPENED_DOSSIER')], ['reopened']);
assert.equal(requiresFmDecision(canonicalQueueCases[0]), true);
assert.equal(requiresFmDecision(canonicalQueueCases[1]), true);
console.log('Connected presentation: FM queue grain and required-action assertions passed.');

// Recette V35 : un constat créé par un agent (qualification sans titulaire) doit apparaître dans la file du FM, et seulement du FM.
{
  const { module: { actionIsForCurrentUser } } = await runnerImport(fileURLToPath(new URL('../app/lib/supabase/data.ts', import.meta.url)), { configFile: false, logLevel: 'silent' });
  assert.equal(actionIsForCurrentUser({ next_action_code:'QUALIFY_ASSIGN', next_action_assigned_profile_id:null }, 'fm', true), true);
  assert.equal(actionIsForCurrentUser({ next_action_code:'QUALIFY_ASSIGN', next_action_assigned_profile_id:null }, 'agent', false), false);
  assert.equal(actionIsForCurrentUser({ next_action_code:'QUALIFY_ASSIGN', next_action_assigned_profile_id:'other-fm' }, 'fm', true), false);
  assert.equal(actionIsForCurrentUser({ next_action_code:'PERFORM_DIAGNOSIS', next_action_assigned_profile_id:null }, 'fm', true), false);
  assert.equal(actionIsForCurrentUser({ next_action_code:'PERFORM_DIAGNOSIS', next_action_assigned_profile_id:'agent' }, 'agent', false), true);
  assert.equal(actionIsForCurrentUser(undefined, 'fm', true), false);
  console.log('Qualification sans titulaire : visible du seul Facility Manager.');
}

