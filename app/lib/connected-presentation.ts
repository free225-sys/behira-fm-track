import type { OperationalSnapshot, OperationalAnomaly } from './supabase/data';


export function requiresFmDecision(item: Pick<OperationalAnomaly, 'status' | 'workflow'>) {
  if (item.status === 'Clôturée') return false;
  if (item.workflow) return item.workflow.actionAssignedToCurrentUser &&
    ['QUALIFY_ASSIGN', 'CHOOSE_TREATMENT_BRANCH', 'VERIFY_PROOF', 'GE01_VERIFY_PROOF', 'GE01_REVIEW_PROOF', 'GE01_CLOSE', 'RECEIVE_CLOSE', 'RECEIVE_INTERVENTION', 'REVIEW_REOPENED_DOSSIER'].includes(item.workflow.actionCode ?? '');
  return item.status === 'À qualifier' || item.status === 'En validation';
}

// A reception is an assigned intervention-reception action, not a report
// delivery receipt. A reopened dossier likewise requires its own pending action.
export function managerActionQueueIds(
  anomalies: Pick<OperationalAnomaly, 'id' | 'status' | 'workflow'>[],
  actionCode: 'RECEIVE_INTERVENTION' | 'REVIEW_REOPENED_DOSSIER',
): Set<string> {
  return new Set(anomalies.filter(item =>
    item.status !== 'Clôturée' &&
    item.workflow?.actionAssignedToCurrentUser === true &&
    item.workflow.actionCode === actionCode,
  ).map(item => item.id));
}

export function pendingFmDossierIds(source: Pick<OperationalSnapshot, 'anomalies' | 'costs'>): Set<string> {
  const pendingCosts = new Set(source.costs.filter(c => (c.decisionScope === 'facility_manager' && c.approvalStatus === 'pending') || (c.approvalStatus === 'returned' && !c.replacedByCostReference)).map(c => c.anomalyReference));
  return new Set(source.anomalies.filter(a => a.status !== 'Clôturée' && (requiresFmDecision(a) || pendingCosts.has(a.id))).map(a => a.id));
}
