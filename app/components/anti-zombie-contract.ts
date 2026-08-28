export type AntiZombieHistoryActivity = {
  label: string;
  occurredAt: string;
  actor?: string | null;
};

export type AntiZombieSummaryData = {
  status?: string | null;
  responsible?: string | null;
  nextAction?: string | null;
  deadline?: string | null;
  slaLabel?: string | null;
  isDelayed?: boolean;
  isBlocked?: boolean;
  blockingActor?: string | null;
  blockingOrDelayReason?: string | null;
  expectedProof?: string | null;
  lastHistoryActivity?: AntiZombieHistoryActivity | null;
};

export type NormalizedAntiZombieSummary = {
  status: string;
  responsible: string;
  nextAction: string;
  deadlineOrSla: string;
  blockingActor: string;
  blockingOrDelayReason: string;
  expectedProof: string;
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
  const status = clean(data.status) ?? 'Statut non renseigné';
  const responsible = clean(data.responsible) ?? 'Responsable non attribué';
  const nextAction = clean(data.nextAction) ?? 'Prochaine action non renseignée';
  const deadline = clean(data.deadline);
  const slaLabel = clean(data.slaLabel);
  const blockingActor = clean(data.blockingActor);
  const blockingOrDelayReason = clean(data.blockingOrDelayReason);
  const expectedProof = clean(data.expectedProof) ?? 'Preuve attendue non définie';
  const historyLabel = clean(data.lastHistoryActivity?.label);
  const historyDate = clean(data.lastHistoryActivity?.occurredAt);
  const historyActor = clean(data.lastHistoryActivity?.actor);
  const hasUsableHistory = Boolean(historyLabel && historyDate);

  return {
    status,
    responsible,
    nextAction,
    deadlineOrSla: deadline && slaLabel ? `${deadline} · ${slaLabel}` : deadline ?? slaLabel ?? 'Échéance non renseignée',
    blockingActor: data.isBlocked ? blockingActor ?? 'Acteur bloquant non renseigné' : 'Aucun blocage déclaré',
    blockingOrDelayReason: blockingOrDelayReason ?? (data.isBlocked || data.isDelayed ? 'Motif non renseigné' : 'Aucun retard ou blocage signalé'),
    expectedProof,
    lastActivityLabel: hasUsableHistory ? historyLabel! : 'Historique indisponible',
    lastActivityMeta: hasUsableHistory ? `${historyDate}${historyActor ? ` · ${historyActor}` : ''}` : null,
    isDelayed: Boolean(data.isDelayed),
    isBlocked: Boolean(data.isBlocked),
    blockingInformationIncomplete: Boolean(data.isBlocked && (!blockingActor || !blockingOrDelayReason)),
  };
}
