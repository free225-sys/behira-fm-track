export type AntiZombieHistoryActivity = {
  label: string;
  occurredAt: string;
  actor?: string | null;
  stage?: string | null;
};

export type AntiZombieSummaryData = {
  dossierState?: string | null;
  status?: string | null;
  responsible?: string | null;
  expectedActor?: string | null;
  nextAction?: string | null;
  nextActionDetail?: string | null;
  nextActionAssignee?: string | null;
  deadline?: string | null;
  slaLabel?: string | null;
  isDelayed?: boolean;
  isBlocked?: boolean;
  blockingActor?: string | null;
  blockingOrDelayReason?: string | null;
  expectedProof?: string | null;
  expectedProofState?: string | null;
  lastHistoryActivity?: AntiZombieHistoryActivity | null;
  blockingInformationIncomplete?: boolean | null;
};

export type NormalizedAntiZombieSummary = {
  dossierState: string;
  status: string;
  responsible: string;
  expectedActor: string;
  nextAction: string;
  nextActionDetail: string | null;
  deadlineOrSla: string;
  blockingActor: string;
  blockingOrDelayReason: string;
  expectedProof: string;
  expectedProofState: string | null;
  lastActivityLabel: string;
  lastActivityMeta: string | null;
  isDelayed: boolean;
  isBlocked: boolean;
  blockingInformationIncomplete: boolean;
};

const clean = (value?: string | null) => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

export function normalizeAntiZombieSummary(data: AntiZombieSummaryData): NormalizedAntiZombieSummary {
  const dossierState = clean(data.dossierState) ?? 'Ouvert';
  const status = clean(data.status) ?? 'Étape non renseignée';
  const responsible = clean(data.responsible) ?? 'Responsable non attribué';
  const expectedActor = clean(data.nextActionAssignee) ?? clean(data.expectedActor) ?? 'Acteur attendu non renseigné';
  const nextAction = clean(data.nextAction) ?? 'Prochaine action non renseignée';
  const nextActionDetail = clean(data.nextActionDetail);
  const deadline = clean(data.deadline);
  const slaLabel = clean(data.slaLabel);
  const blockingActor = clean(data.blockingActor);
  const blockingOrDelayReason = clean(data.blockingOrDelayReason);
  const expectedProof = clean(data.expectedProof) ?? 'Preuve attendue non définie';
  const expectedProofState = clean(data.expectedProofState);
  const historyLabel = clean(data.lastHistoryActivity?.label);
  const historyDate = clean(data.lastHistoryActivity?.occurredAt);
  const historyActor = clean(data.lastHistoryActivity?.actor);
  const historyStage = clean(data.lastHistoryActivity?.stage);
  const hasUsableHistory = Boolean(historyLabel && historyDate);

  return {
    dossierState,
    status,
    responsible,
    expectedActor,
    nextAction,
    nextActionDetail,
    deadlineOrSla: deadline && slaLabel ? `${deadline} · ${slaLabel}` : deadline ?? slaLabel ?? 'Échéance non renseignée',
    blockingActor: data.isBlocked ? blockingActor ?? 'Acteur bloquant non renseigné' : 'Aucun blocage déclaré',
    blockingOrDelayReason: blockingOrDelayReason ?? (data.isBlocked || data.isDelayed ? 'Motif non renseigné' : 'Aucun retard ou blocage signalé'),
    expectedProof,
    expectedProofState,
    lastActivityLabel: hasUsableHistory ? historyLabel! : 'Historique indisponible',
    lastActivityMeta: hasUsableHistory ? [historyDate, historyActor, historyStage].filter(Boolean).join(' · ') : null,
    isDelayed: Boolean(data.isDelayed),
    isBlocked: Boolean(data.isBlocked),
    blockingInformationIncomplete: data.blockingInformationIncomplete
      ?? Boolean(data.isBlocked && (!blockingActor || !blockingOrDelayReason)),
  };
}