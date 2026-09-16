export type UUID = string;
export type Instant = string;
export type LocalDate = string;
export type EquipmentCode = 'GE-01' | 'WILO-01' | 'RIA-01' | 'ASC-A1' | 'ASC-A2' | 'IRR-01';
export type SourceRef = { kind: string; id: UUID; version: string | null };
export type InsufficientCode =
  | 'coverage_below_minimum'
  | 'critical_data_missing'
  | 'no_eligible_equipment'
  | 'no_valid_controls'
  | 'functional_state_missing'
  | 'formula_pending'
  | 'equipment_weights_pending'
  | 'domain_data_missing'
  | 'freshness_policy_pending'
  | 'conflicting_evidence'
  | 'risk_rules_pending'
  | 'source_missing'
  | 'planning_pending';

export type FinancialThreshold = {
  parameterId: UUID;
  code: 'financial_decision_threshold';
  value: number;
  unit: 'FCFA';
  effectiveDate: LocalDate;
  effectiveFrom: Instant;
  effectiveTo: Instant | null;
  recordedAt: Instant;
  authority: string;
  source: SourceRef;
};

export type ScorePalier = 'critical' | 'watch' | 'ok';

export type CapCause = {
  equipmentId: UUID;
  equipmentCode: EquipmentCode;
  equipmentName: string;
  reasonCode: 'critical_equipment_unavailable';
  reasonDetail: string | null;
  source: SourceRef;
  decisionId: UUID | null;
  decisionDeadline: Instant | null;
};

export type BuildingScore =
  | { state: 'normal'; final: number; raw: number; updatedAt: Instant }
  | {
      state: 'capped';
      final: number;
      raw: number;
      cap: 69;
      cause: CapCause | null;
      causes: CapCause[];
      causeCount: number;
      hiddenCauseCount: number;
      decisionDeadline: Instant | null;
      updatedAt: Instant;
    }
  | {
      state: 'not_computable';
      final: null;
      raw: null;
      missingControls: { equipmentCode: EquipmentCode; equipmentName: string; missingItem: string }[];
      missingReasons: InsufficientCode[];
      hiddenMissingControlCount: number;
      updatedAt: Instant;
    };

export type Insufficient = { status: 'insufficient'; reasonCode: InsufficientCode; detail: string | null };

export type Availability =
  | { status: 'ok'; percent: number; functionalCount: number; controlledCount: number }
  | Insufficient;

export type Coverage =
  | { status: 'ok'; percent: number; currentCount: number; totalCount: number }
  | Insufficient;

export type AtRiskReason =
  | 'degraded'
  | 'unavailable'
  | 'control_expired'
  | 'control_missing'
  | 'redundancy_loss'
  | 'recurrence_threshold'
  | 'active_high_or_critical_ticket'
  | 'open_reserve'
  | 'measure_near_or_beyond_threshold';

export type AtRiskEquipment =
  | {
      status: 'ok';
      total: number;
      breakdown: { reason: AtRiskReason; count: number }[];
      displayBreakdown: { unavailable: number; degraded: number; control: number; other: number };
      items: {
        equipmentId: UUID;
        code: EquipmentCode;
        name: string;
        reasons: AtRiskReason[];
        primaryReason: AtRiskReason;
      }[];
      hiddenItemCount: number;
    }
  | Insufficient;


export type EquipmentOperationalStatus = 'available' | 'degraded' | 'unavailable' | 'control_due';

export type RoundSummary = {
  state: 'due' | 'done' | 'none';
  missedYesterday: boolean | null;
  deadline: Instant | null;
  deadlineStatus: 'scheduled' | 'day_only' | 'not_configured' | 'not_applicable';
  doneAt: Instant | null;
};

export type EquipmentCard = {
  id: UUID;
  code: EquipmentCode;
  name: string;
  family: string | null;
  zone: string | null;
  zoneId: UUID | null;
  criticality: 'critical' | 'priority' | null;
  operationalStatus: EquipmentOperationalStatus | null;
  technicalState: 'available' | 'degraded' | 'unavailable' | null;
  isFunctional: boolean | null;
  statusSource: SourceRef | null;
  controlValidity: 'valid' | 'expired' | 'missing' | 'incomplete' | 'policy_pending';
  controlValidUntil: Instant | null;
  score: number | null;
  scoreProvisional: boolean;
  scoreFormulaVersionId: UUID | null;
  scoreWeight: number | null;
  scoreWeightVersionId: UUID | null;
  lastControlAt: Instant | null;
  lastControlReportId: UUID | null;
  responsible: string | null;
  responsibleProfileId: UUID | null;
  todaysRound: RoundSummary | null;
  dossierCount: number | null;
};

export type AudienceId = 'administration' | 'facility' | 'electricite' | 'eau_incendie' | 'rondes_assistance';

export type Perimeter =
  | { kind: 'all' }
  | { kind: 'codes'; equipmentCodes: EquipmentCode[]; zoneIds: UUID[]; roundModuleCodes: 'RND-LET'[] };

export type UiSession = {
  profileId: UUID;
  audience: AudienceId;
  displayName: string;
  perimeter: Perimeter;
  scopeVersion: string;
  demo: boolean;
};

export type CounterUnavailableReason = 'not_authorized' | 'source_missing' | 'rule_pending';

export type BuildingHealthSnapshot = {
  schemaVersion: 'behira.lot0.v1';
  snapshotId: UUID;
  siteCode: 'BEHIRA';
  siteLabel: string;
  siteTimezone: string;
  dataMode: 'production' | 'demo' | 'recette';
  generatedAt: Instant;
  asOf: Instant;
  validUntil: Instant;
  sourceRevision: string;
  scopeVersion: string;
  ruleSetVersionId: UUID | null;
  threshold: FinancialThreshold;
  score: BuildingScore;
  availability: Availability;
  coverage: Coverage;
  atRisk: AtRiskEquipment;
  pendingDecisions: number | null;
  overdueCritical: number | null;
  openReserves: number | null;
  counterUnavailableReasons: Partial<Record<'pendingDecisions' | 'overdueCritical' | 'openReserves', CounterUnavailableReason>>;
  equipment: EquipmentCard[];
};

export type DomainPoints = {
  domain: 'equipment' | 'safety' | 'zones' | 'continuity';
  weight: number;
  obtained: number | null;
  max: number;
  status: 'ok' | 'insufficient';
  reasonCode: InsufficientCode | null;
}[];

export type ScoreHistory = {
  date: LocalDate;
  snapshotId: UUID;
  state: 'normal' | 'capped' | 'not_computable';
  final: number | null;
  raw: number | null;
}[];

export type TodaysRound = {
  roundId: UUID;
  equipmentCode: EquipmentCode | null;
  zoneId: UUID | null;
  agentId: UUID | null;
  agentName: string | null;
  scheduledDate: LocalDate;
  deadline: Instant | null;
  deadlineStatus: 'scheduled' | 'day_only' | 'not_configured';
  state: 'due' | 'overdue' | 'draft' | 'done';
  doneAt: Instant | null;
  result: 'compliant' | 'anomaly' | 'impossible' | null;
  missedYesterday: boolean | null;
};

export type ReportTracking = {
  reportId: UUID | null;
  clientMutationId: UUID;
  equipmentCode: EquipmentCode | null;
  zoneId: UUID | null;
  sentAt: Instant;
  confirmedAt: Instant | null;
  readAt: Instant | null;
  qualifiedAt: Instant | null;
  result: 'compliant' | 'anomaly' | 'impossible';
  stage: 'sent' | 'confirmed' | 'read' | 'qualified';
};

export type ArbitrationDecision =
  | { outcome: 'approved'; by: UUID; at: Instant; reason: string | null }
  | { outcome: 'refused' | 'returned'; by: UUID; at: Instant; reason: string };

export type ArbitrationItem = {
  id: UUID;
  reference: string;
  anomalyId: UUID;
  anomalyReference: string;
  equipmentCode: EquipmentCode | null;
  zoneId: UUID | null;
  subject: string;
  type: 'risk' | 'cost' | 'arbitration' | 'sensitive_closure';
  severity: 'critical' | 'high' | 'medium' | 'normal' | 'low';
  amount: number | null;
  deadline: Instant | null;
  overdue: boolean | null;
  deadlineSource: SourceRef | null;
  proposedBy: string;
  proposedByProfileId: UUID;
  recommendation: string | null;
  proofs: { id: UUID | null; requirementCode: string | null; label: string; status: 'attached' | 'missing' | 'expected' | 'inconclusive' }[];
  history: { at: Instant; event: string; actorProfileId: UUID | null }[];
  decision: ArbitrationDecision | null;
};

export type V2Section<T> =
  | { status: 'not_implemented' | 'not_authorized'; data: null }
  | { status: 'ready'; data: T };

export type BuildingHealthV2Extensions = {
  domainPoints: V2Section<DomainPoints>;
  scoreHistory: V2Section<ScoreHistory>;
  todaysRounds: V2Section<TodaysRound[]>;
  reportTracking: V2Section<ReportTracking[]>;
  arbitrationQueue: V2Section<ArbitrationItem[]>;
};

export type ThresholdPosition = 'missing' | 'below' | 'at_or_above';
