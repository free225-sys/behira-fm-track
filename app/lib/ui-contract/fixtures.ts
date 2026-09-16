import type {
  AtRiskReason,
  AudienceId,
  BuildingHealthSnapshot,
  CapCause,
  EquipmentCard,
  EquipmentCode,
  FinancialThreshold,
  Instant,
  Perimeter,
  ReportTracking,
  TodaysRound,
  UiSession,
  UUID,
} from './building-health.ts';
import { primaryReasonOf } from './display.ts';

const AS_OF: Instant = '2026-09-16T08:00:00Z';

function id(suffix: string): UUID {
  return `00000000-0000-4000-a000-${suffix.padStart(12, '0')}`;
}

function source(kind: string, suffix: string, version: string | null = '1') {
  return { kind, id: id(suffix), version };
}

export const DEMO_THRESHOLD: FinancialThreshold = {
  parameterId: id('threshold'),
  code: 'financial_decision_threshold',
  value: 400000,
  unit: 'FCFA',
  effectiveDate: '2026-08-30',
  effectiveFrom: '2026-08-30T00:00:00Z',
  effectiveTo: null,
  recordedAt: '2026-08-30T12:04:00Z',
  authority: 'Administration de SCI Groupe Behira',
  source: source('business_parameter', 'threshold'),
};

export const EQUIPMENT_META: Record<EquipmentCode, { name: string; family: string; zone: string; criticality: 'critical' | 'priority' }> = {
  'GE-01': { name: 'Groupe électrogène ELCOS', family: 'electricity', zone: 'RDC · Local groupe', criticality: 'critical' },
  'WILO-01': { name: 'Surpresseur', family: 'water', zone: 'Sous-sol · Local surpresseur', criticality: 'critical' },
  'RIA-01': { name: 'Pompe incendie', family: 'fire', zone: 'Sous-sol · Local incendie', criticality: 'critical' },
  'ASC-A1': { name: 'Ascenseur A1', family: 'lifts', zone: 'Tour A · Ascenseur 1', criticality: 'priority' },
  'ASC-A2': { name: 'Ascenseur A2', family: 'lifts', zone: 'Tour A · Ascenseur 2', criticality: 'priority' },
  'IRR-01': { name: 'Irrigation', family: 'landscape', zone: 'Extérieur · Jardin nord', criticality: 'priority' },
};

function card(
  code: EquipmentCode,
  patch: Partial<EquipmentCard> & Pick<EquipmentCard, 'operationalStatus' | 'score'>,
): EquipmentCard {
  const meta = EQUIPMENT_META[code];
  return {
    id: id(code.replace('-', '')),
    code,
    name: meta.name,
    family: meta.family,
    zone: meta.zone,
    zoneId: id(`zone-${code}`),
    criticality: meta.criticality,
    technicalState: patch.operationalStatus === 'control_due' ? 'available' : patch.operationalStatus,
    isFunctional: patch.operationalStatus === 'unavailable' ? false : patch.operationalStatus == null ? null : true,
    statusSource: source('equipment_status', code.replace('-', '')),
    controlValidity: patch.controlValidity ?? 'valid',
    controlValidUntil: patch.controlValidUntil ?? '2026-09-17T08:00:00Z',
    scoreProvisional: true,
    scoreFormulaVersionId: null,
    scoreWeight: patch.scoreWeight ?? null,
    scoreWeightVersionId: null,
    lastControlAt: patch.lastControlAt ?? '2026-09-15T07:30:00Z',
    lastControlReportId: id(`report-${code}`),
    responsible: patch.responsible ?? null,
    responsibleProfileId: patch.responsibleProfileId ?? null,
    todaysRound: patch.todaysRound ?? { state: 'due', missedYesterday: false, deadline: null, deadlineStatus: 'not_configured', doneAt: null },
    dossierCount: patch.dossierCount ?? 0,
    ...patch,
  };
}

function snapshot(partial: Pick<BuildingHealthSnapshot, 'score' | 'availability' | 'coverage' | 'atRisk' | 'equipment'> & Partial<BuildingHealthSnapshot>): BuildingHealthSnapshot {
  return {
    schemaVersion: 'behira.lot0.v1',
    snapshotId: id('snap'),
    siteCode: 'BEHIRA',
    siteLabel: 'SCI Groupe Behira',
    siteTimezone: 'Africa/Abidjan',
    dataMode: 'demo',
    generatedAt: AS_OF,
    asOf: AS_OF,
    validUntil: '2026-09-16T08:15:00Z',
    sourceRevision: 'ui-fixtures',
    scopeVersion: 'demo-1',
    ruleSetVersionId: null,
    threshold: DEMO_THRESHOLD,
    pendingDecisions: null,
    overdueCritical: null,
    openReserves: null,
    counterUnavailableReasons: {
      pendingDecisions: 'source_missing',
      overdueCritical: 'source_missing',
      openReserves: 'source_missing',
    },
    ...partial,
  };
}

function riskItem(code: EquipmentCode, reasons: AtRiskReason[]) {
  return {
    equipmentId: id(code.replace('-', '')),
    code,
    name: EQUIPMENT_META[code].name,
    reasons,
    primaryReason: primaryReasonOf(reasons),
  };
}

function riaCause(overrides: Partial<CapCause> = {}): CapCause {
  return {
    equipmentId: id('RIA01'),
    equipmentCode: 'RIA-01',
    equipmentName: EQUIPMENT_META['RIA-01'].name,
    reasonCode: 'critical_equipment_unavailable',
    reasonDetail: 'Équipement critique indisponible.',
    source: source('operational_event', 'ria-cap'),
    decisionId: id('dec-ria'),
    decisionDeadline: '2026-09-16T10:30:00Z',
    ...overrides,
  };
}

const PARK: EquipmentCard[] = [
  card('GE-01', { operationalStatus: 'degraded', score: 86, responsible: 'Agent Électricité Démo', dossierCount: 2 }),
  card('WILO-01', { operationalStatus: 'degraded', score: 78, responsible: 'Agent Eau & Incendie Démo', dossierCount: 1 }),
  card('RIA-01', { operationalStatus: null, score: null, technicalState: null, isFunctional: null, responsible: 'Agent Eau & Incendie Démo', dossierCount: 1 }),
  card('ASC-A1', { operationalStatus: 'available', score: 84, criticality: 'priority', responsible: 'Agent Électricité Démo' }),
  card('ASC-A2', { operationalStatus: 'degraded', score: 84, criticality: 'priority', responsible: 'Agent Électricité Démo', dossierCount: 1 }),
  card('IRR-01', { operationalStatus: 'available', score: 98, criticality: 'priority', responsible: 'Agente Rondes & Assistance Démo' }),
];

export const fixtureScoreNormal = snapshot({
  snapshotId: id('score-normal'),
  score: { state: 'normal', final: 82, raw: 82, updatedAt: AS_OF },
  availability: { status: 'ok', percent: 80, functionalCount: 4, controlledCount: 5 },
  coverage: { status: 'ok', percent: 83, currentCount: 5, totalCount: 6 },
  atRisk: {
    status: 'ok',
    total: 3,
    breakdown: [
      { reason: 'degraded', count: 3 },
      { reason: 'active_high_or_critical_ticket', count: 2 },
    ],
    displayBreakdown: { unavailable: 0, degraded: 3, control: 0, other: 0 },
    items: [
      riskItem('GE-01', ['degraded', 'active_high_or_critical_ticket']),
      riskItem('WILO-01', ['degraded']),
      riskItem('ASC-A2', ['degraded', 'active_high_or_critical_ticket']),
    ],
    hiddenItemCount: 0,
  },
  equipment: PARK,
  pendingDecisions: 4,
  overdueCritical: 2,
  openReserves: null,
  counterUnavailableReasons: { openReserves: 'source_missing' },
});

export const fixtureScoreCapped = snapshot({
  snapshotId: id('score-capped'),
  score: {
    state: 'capped',
    final: 69,
    raw: 82,
    cap: 69,
    cause: riaCause(),
    causes: [riaCause()],
    causeCount: 1,
    hiddenCauseCount: 0,
    decisionDeadline: '2026-09-16T10:30:00Z',
    updatedAt: AS_OF,
  },
  availability: { status: 'ok', percent: 80, functionalCount: 4, controlledCount: 5 },
  coverage: { status: 'ok', percent: 83, currentCount: 5, totalCount: 6 },
  atRisk: {
    status: 'ok',
    total: 3,
    breakdown: [
      { reason: 'unavailable', count: 1 },
      { reason: 'degraded', count: 2 },
      { reason: 'control_expired', count: 1 },
    ],
    displayBreakdown: { unavailable: 1, degraded: 1, control: 1, other: 0 },
    items: [
      riskItem('RIA-01', ['unavailable']),
      riskItem('GE-01', ['degraded']),
      riskItem('WILO-01', ['control_expired']),
    ],
    hiddenItemCount: 0,
  },
  equipment: PARK.map((item) => item.code === 'RIA-01'
    ? card('RIA-01', { operationalStatus: 'unavailable', score: 61, isFunctional: false, technicalState: 'unavailable' })
    : item),
  pendingDecisions: 4,
  overdueCritical: 2,
  openReserves: null,
  counterUnavailableReasons: { openReserves: 'source_missing' },
});

export const fixtureScoreNotComputable = snapshot({
  snapshotId: id('score-not-computable'),
  score: {
    state: 'not_computable',
    final: null,
    raw: null,
    missingControls: [],
    missingReasons: ['formula_pending', 'equipment_weights_pending'],
    hiddenMissingControlCount: 0,
    updatedAt: AS_OF,
  },
  availability: { status: 'insufficient', reasonCode: 'functional_state_missing', detail: null },
  coverage: { status: 'insufficient', reasonCode: 'freshness_policy_pending', detail: null },
  atRisk: { status: 'insufficient', reasonCode: 'risk_rules_pending', detail: null },
  equipment: PARK,
});

export const fixtureScoreCappedRaw61 = snapshot({
  ...fixtureScoreCapped,
  snapshotId: id('score-capped-61'),
  score: {
    state: 'capped',
    final: 61,
    raw: 61,
    cap: 69,
    cause: riaCause(),
    causes: [riaCause()],
    causeCount: 1,
    hiddenCauseCount: 0,
    decisionDeadline: '2026-09-16T10:30:00Z',
    updatedAt: AS_OF,
  },
});

export const fixtureMultipleCapCauses = snapshot({
  ...fixtureScoreCapped,
  snapshotId: id('score-capped-multi'),
  score: {
    state: 'capped',
    final: 69,
    raw: 82,
    cap: 69,
    cause: riaCause(),
    causes: [
      riaCause(),
      riaCause({
        equipmentId: id('GE01'),
        equipmentCode: 'GE-01',
        equipmentName: EQUIPMENT_META['GE-01'].name,
        decisionId: id('dec-ge'),
        decisionDeadline: '2026-09-16T15:00:00Z',
      }),
    ],
    causeCount: 2,
    hiddenCauseCount: 0,
    decisionDeadline: '2026-09-16T10:30:00Z',
    updatedAt: AS_OF,
  },
});

export const fixtureCoverageExact80 = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('coverage-80'),
  coverage: { status: 'ok', percent: 80, currentCount: 4, totalCount: 5 },
});

export const fixtureFormulaMissingControlsPresent = snapshot({
  snapshotId: id('formula-missing'),
  score: {
    state: 'not_computable',
    final: null,
    raw: null,
    missingControls: [],
    missingReasons: ['formula_pending'],
    hiddenMissingControlCount: 0,
    updatedAt: AS_OF,
  },
  availability: { status: 'ok', percent: 80, functionalCount: 4, controlledCount: 5 },
  coverage: { status: 'ok', percent: 83, currentCount: 5, totalCount: 6 },
  atRisk: { status: 'insufficient', reasonCode: 'risk_rules_pending', detail: null },
  equipment: PARK,
});

export const fixtureMissingControls = snapshot({
  snapshotId: id('missing-controls'),
  score: {
    state: 'not_computable',
    final: null,
    raw: null,
    missingControls: [
      { equipmentCode: 'WILO-01', equipmentName: EQUIPMENT_META['WILO-01'].name, missingItem: 'Contrôle de pression' },
    ],
    missingReasons: ['no_valid_controls'],
    hiddenMissingControlCount: 0,
    updatedAt: AS_OF,
  },
  availability: { status: 'insufficient', reasonCode: 'no_valid_controls', detail: null },
  coverage: { status: 'insufficient', reasonCode: 'coverage_below_minimum', detail: null },
  atRisk: { status: 'insufficient', reasonCode: 'no_valid_controls', detail: null },
  equipment: PARK,
});

export const fixtureDualRiskReasons = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('risk-dual'),
  atRisk: {
    status: 'ok',
    total: 1,
    breakdown: [
      { reason: 'degraded', count: 1 },
      { reason: 'active_high_or_critical_ticket', count: 1 },
    ],
    displayBreakdown: { unavailable: 0, degraded: 1, control: 0, other: 0 },
    items: [
      riskItem('GE-01', ['degraded', 'active_high_or_critical_ticket']),
    ],
    hiddenItemCount: 0,
  },
});

export const fixtureUnavailableAndExpired = snapshot({
  ...fixtureScoreCapped,
  snapshotId: id('unavail-expired'),
  equipment: [
    card('RIA-01', {
      operationalStatus: 'unavailable',
      technicalState: 'unavailable',
      isFunctional: false,
      score: 61,
      controlValidity: 'expired',
      lastControlAt: '2026-08-01T07:00:00Z',
    }),
  ],
});

export const fixtureRoundDoneMissedYesterday = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('round-done-missed'),
  equipment: [
    card('GE-01', {
      operationalStatus: 'degraded',
      score: 86,
      todaysRound: {
        state: 'done',
        missedYesterday: true,
        deadline: '2026-09-16T10:00:00Z',
        deadlineStatus: 'scheduled',
        doneAt: '2026-09-16T07:40:00Z',
      },
    }),
  ],
});

export const fixtureUnknownDeadline = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('deadline-unknown'),
  equipment: [
    card('WILO-01', {
      operationalStatus: 'degraded',
      score: 78,
      todaysRound: {
        state: 'due',
        missedYesterday: null,
        deadline: null,
        deadlineStatus: 'not_configured',
        doneAt: null,
      },
    }),
  ],
});

export const fixtureControlDue = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('control-due'),
  equipment: [
    card('ASC-A1', {
      operationalStatus: 'control_due',
      technicalState: 'available',
      score: null,
      lastControlAt: '2026-08-10T08:00:00Z',
      controlValidity: 'expired',
    }),
  ],
});

export const fixtureStatusAvailable = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('status-available'),
  equipment: [card('IRR-01', { operationalStatus: 'available', score: 98, scoreWeight: null })],
});

export const fixtureRiaDegraded = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('ria-degraded'),
  equipment: [card('RIA-01', { operationalStatus: 'degraded', score: 61 })],
});

export const fixtureRiaUnavailable = snapshot({
  ...fixtureScoreCapped,
  snapshotId: id('ria-unavailable'),
});

export const fixtureStatusUnknown = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('status-unknown'),
  equipment: [card('RIA-01', { operationalStatus: null, score: null, technicalState: null, isFunctional: null })],
});

export const fixtureDegradedAndExpired = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('degraded-expired'),
  equipment: [
    card('GE-01', {
      operationalStatus: 'degraded',
      score: 86,
      controlValidity: 'expired',
      lastControlAt: '2026-08-01T07:00:00Z',
    }),
  ],
  atRisk: {
    status: 'ok',
    total: 1,
    breakdown: [
      { reason: 'degraded', count: 1 },
      { reason: 'control_expired', count: 1 },
    ],
    displayBreakdown: { unavailable: 0, degraded: 1, control: 0, other: 0 },
    items: [riskItem('GE-01', ['degraded', 'control_expired'])],
    hiddenItemCount: 0,
  },
});

export const fixtureAtRiskZero = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('risk-zero'),
  atRisk: {
    status: 'ok',
    total: 0,
    breakdown: [],
    displayBreakdown: { unavailable: 0, degraded: 0, control: 0, other: 0 },
    items: [],
    hiddenItemCount: 0,
  },
});

export const fixtureAtRiskOther = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('risk-other'),
  atRisk: {
    status: 'ok',
    total: 2,
    breakdown: [
      { reason: 'active_high_or_critical_ticket', count: 1 },
      { reason: 'open_reserve', count: 1 },
    ],
    displayBreakdown: { unavailable: 0, degraded: 0, control: 0, other: 2 },
    items: [
      riskItem('ASC-A1', ['active_high_or_critical_ticket']),
      riskItem('IRR-01', ['open_reserve']),
    ],
    hiddenItemCount: 0,
  },
});

export const fixturePendingFacility = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('pending-facility'),
  pendingDecisions: 4,
  overdueCritical: 2,
  counterUnavailableReasons: { openReserves: 'source_missing' },
});

export const fixturePendingAdmin = snapshot({
  ...fixtureScoreNormal,
  snapshotId: id('pending-admin'),
  pendingDecisions: 4,
  overdueCritical: 2,
  counterUnavailableReasons: { openReserves: 'source_missing' },
});

export const fixtureRoundedCases = {
  raw6949: snapshot({ ...fixtureScoreNormal, snapshotId: id('round-6949'), score: { state: 'normal', final: 69, raw: 69.49, updatedAt: AS_OF } }),
  raw6950: snapshot({ ...fixtureScoreNormal, snapshotId: id('round-6950'), score: { state: 'normal', final: 70, raw: 69.5, updatedAt: AS_OF } }),
  raw8949: snapshot({ ...fixtureScoreNormal, snapshotId: id('round-8949'), score: { state: 'normal', final: 89, raw: 89.49, updatedAt: AS_OF } }),
  raw8950: snapshot({ ...fixtureScoreNormal, snapshotId: id('round-8950'), score: { state: 'normal', final: 90, raw: 89.5, updatedAt: AS_OF } }),
  capped8240: snapshot({
    ...fixtureScoreCapped,
    snapshotId: id('round-capped-8240'),
    score: { ...fixtureScoreCapped.score, final: 69, raw: 82.4 },
  }),
  capped6150: snapshot({
    ...fixtureScoreCapped,
    snapshotId: id('round-capped-6150'),
    score: { ...fixtureScoreCapped.score, final: 62, raw: 61.5 },
  }),
};

export const demoTodaysRounds: TodaysRound[] = [
  {
    roundId: id('round-ge'),
    equipmentCode: 'GE-01',
    zoneId: id('zone-GE-01'),
    agentId: id('profile-electricite'),
    agentName: 'Agent Électricité Démo',
    scheduledDate: '2026-09-16',
    deadline: '2026-09-16T10:00:00Z',
    deadlineStatus: 'scheduled',
    state: 'due',
    doneAt: null,
    result: null,
    missedYesterday: false,
  },
  {
    roundId: id('round-asc2'),
    equipmentCode: 'ASC-A2',
    zoneId: id('zone-ASC-A2'),
    agentId: id('profile-electricite'),
    agentName: 'Agent Électricité Démo',
    scheduledDate: '2026-09-16',
    deadline: '2026-09-16T08:30:00Z',
    deadlineStatus: 'scheduled',
    state: 'overdue',
    doneAt: null,
    result: null,
    missedYesterday: true,
  },
  {
    roundId: id('round-asc1'),
    equipmentCode: 'ASC-A1',
    zoneId: id('zone-ASC-A1'),
    agentId: id('profile-electricite'),
    agentName: 'Agent Électricité Démo',
    scheduledDate: '2026-09-16',
    deadline: '2026-09-16T09:00:00Z',
    deadlineStatus: 'scheduled',
    state: 'done',
    doneAt: '2026-09-16T07:15:00Z',
    result: 'compliant',
    missedYesterday: false,
  },
  {
    roundId: id('round-wilo-draft'),
    equipmentCode: 'WILO-01',
    zoneId: id('zone-WILO-01'),
    agentId: id('profile-eau_incendie'),
    agentName: 'Agent Eau & Incendie Démo',
    scheduledDate: '2026-09-16',
    deadline: '2026-09-16T10:30:00Z',
    deadlineStatus: 'scheduled',
    state: 'draft',
    doneAt: null,
    result: null,
    missedYesterday: false,
  },
  {
    roundId: id('round-ria'),
    equipmentCode: 'RIA-01',
    zoneId: id('zone-RIA-01'),
    agentId: id('profile-eau_incendie'),
    agentName: 'Agent Eau & Incendie Démo',
    scheduledDate: '2026-09-16',
    deadline: '2026-09-16T10:30:00Z',
    deadlineStatus: 'scheduled',
    state: 'due',
    doneAt: null,
    result: null,
    missedYesterday: false,
  },
];

export const demoReportTracking: ReportTracking[] = [
  {
    reportId: id('track-ge'),
    clientMutationId: id('mut-ge'),
    equipmentCode: 'GE-01',
    zoneId: id('zone-GE-01'),
    sentAt: '2026-09-16T07:20:00Z',
    confirmedAt: '2026-09-16T07:21:00Z',
    readAt: null,
    qualifiedAt: null,
    result: 'compliant',
    stage: 'confirmed',
  },
  {
    reportId: id('track-asc1'),
    clientMutationId: id('mut-asc1'),
    equipmentCode: 'ASC-A1',
    zoneId: id('zone-ASC-A1'),
    sentAt: '2026-09-16T07:15:00Z',
    confirmedAt: '2026-09-16T07:16:00Z',
    readAt: '2026-09-16T07:40:00Z',
    qualifiedAt: '2026-09-16T08:00:00Z',
    result: 'compliant',
    stage: 'qualified',
  },
  {
    reportId: id('track-wilo'),
    clientMutationId: id('mut-wilo'),
    equipmentCode: 'WILO-01',
    zoneId: id('zone-WILO-01'),
    sentAt: '2026-09-15T16:10:00Z',
    confirmedAt: null,
    readAt: null,
    qualifiedAt: null,
    result: 'anomaly',
    stage: 'sent',
  },
];

function perimeterFor(audience: AudienceId): Perimeter {
  if (audience === 'administration' || audience === 'facility') return { kind: 'all' };
  if (audience === 'electricite') {
    return { kind: 'codes', equipmentCodes: ['GE-01', 'ASC-A1', 'ASC-A2'], zoneIds: [], roundModuleCodes: [] };
  }
  if (audience === 'eau_incendie') {
    return { kind: 'codes', equipmentCodes: ['WILO-01', 'RIA-01', 'IRR-01'], zoneIds: [], roundModuleCodes: [] };
  }
  return { kind: 'codes', equipmentCodes: [], zoneIds: [id('zone-rnd')], roundModuleCodes: ['RND-LET'] };
}

export function sessionForAudience(audience: AudienceId, displayName: string, demo = true): UiSession {
  return {
    profileId: id(`profile-${audience}`),
    audience,
    displayName,
    perimeter: perimeterFor(audience),
    scopeVersion: 'demo-1',
    demo,
  };
}

function inPerimeter(code: EquipmentCode, perimeter: Perimeter) {
  if (perimeter.kind === 'all') return true;
  return perimeter.equipmentCodes.includes(code);
}

export type DemoScoreScenario = 'not_computable' | 'normal' | 'capped';

const DEMO_SCORE_SCENARIOS: Record<DemoScoreScenario, BuildingHealthSnapshot> = {
  not_computable: fixtureScoreNotComputable,
  normal: fixtureScoreNormal,
  capped: fixtureScoreCapped,
};

export function demoHomeSnapshot(session: UiSession, scenario: DemoScoreScenario = 'not_computable'): BuildingHealthSnapshot {
  const agent = session.audience === 'electricite' || session.audience === 'eau_incendie' || session.audience === 'rondes_assistance';
  const source = DEMO_SCORE_SCENARIOS[scenario];
  const equipment = source.equipment.filter((item) => inPerimeter(item.code, session.perimeter));
  const atRisk = source.atRisk.status !== 'ok' || session.perimeter.kind === 'all'
    ? source.atRisk
    : {
        ...source.atRisk,
        items: source.atRisk.items.filter((item) => inPerimeter(item.code, session.perimeter)),
        hiddenItemCount: source.atRisk.items.filter((item) => !inPerimeter(item.code, session.perimeter)).length,
      };
  return snapshot({
    snapshotId: id(`home-${session.audience}-${scenario}`),
    score: source.score,
    availability: source.availability,
    coverage: source.coverage,
    atRisk,
    equipment,
    pendingDecisions: agent ? null : source.pendingDecisions ?? 4,
    overdueCritical: agent ? null : source.overdueCritical ?? 2,
    openReserves: agent ? null : source.openReserves,
    counterUnavailableReasons: agent
      ? { pendingDecisions: 'not_authorized', overdueCritical: 'not_authorized', openReserves: 'not_authorized' }
      : source.counterUnavailableReasons,
  });
}

export function demoRoundsFor(session: UiSession): TodaysRound[] {
  if (session.perimeter.kind === 'all') return demoTodaysRounds;
  return demoTodaysRounds.filter((item) => item.equipmentCode && inPerimeter(item.equipmentCode, session.perimeter));
}
