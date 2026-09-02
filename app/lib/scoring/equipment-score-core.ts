export const EQUIPMENT_SCORE_COMPONENT_WEIGHTS = {
  availability_continuity: 30,
  open_anomalies: 25,
  preventive_maintenance: 20,
  threshold_controls: 15,
  reliability_recurrences: 10,
} as const;

export type EquipmentScoreComponentCode = keyof typeof EQUIPMENT_SCORE_COMPONENT_WEIGHTS;
export type ScoreSourceKind =
  | 'commissioning_record'
  | 'manufacturer_documentation'
  | 'signed_maintainer_report'
  | 'dated_field_observation'
  | 'internal_draft';
export type ScoreSourceStatus = 'confirmed' | 'provisional' | 'missing';
export type ScoreFreshnessStatus = 'fresh' | 'stale' | 'unknown';
export type EquipmentScoreStatus = 'calculated' | 'partial' | 'non_calculable';
export type EquipmentScoreBand = 'red' | 'orange' | 'green';

export const SCORE_SOURCE_PRIORITY: readonly ScoreSourceKind[] = [
  'commissioning_record',
  'manufacturer_documentation',
  'signed_maintainer_report',
  'dated_field_observation',
  'internal_draft',
];

export interface EquipmentScorePolicy {
  approvalStatus: 'provisional' | 'confirmed';
  minimumCoveragePercent: number;
  bands: {
    orangeMinimum: number;
    greenMinimum: number;
  };
}

export const C11_LOCAL_PROVISIONAL_POLICY: EquipmentScorePolicy = {
  approvalStatus: 'provisional',
  minimumCoveragePercent: 80,
  bands: {
    orangeMinimum: 70,
    greenMinimum: 90,
  },
};

export interface EquipmentScoreComponentInput {
  code: EquipmentScoreComponentCode;
  normalizedScore: number | null;
  completenessPercent: number;
  source: {
    kind: ScoreSourceKind | null;
    status: ScoreSourceStatus;
    reference?: string;
  };
  freshness: {
    status: ScoreFreshnessStatus;
    observedAt?: string;
  };
  criticalInputsComplete: boolean;
  missingData?: readonly string[];
}

export interface EquipmentScoreComponentResult {
  code: EquipmentScoreComponentCode;
  weightPercent: number;
  eligibleCompletenessPercent: number;
  coverageContribution: number;
  weightedScoreContribution: number | null;
  included: boolean;
  exclusionReasons: string[];
}

export interface EquipmentScoreResult {
  status: EquipmentScoreStatus;
  displayState: string;
  score: number | null;
  band: EquipmentScoreBand | null;
  coveragePercent: number;
  publishable: boolean;
  evaluatedAt: string;
  missingData: string[];
  criticalGaps: EquipmentScoreComponentCode[];
  components: EquipmentScoreComponentResult[];
}

const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

function assertPercentage(value: number, label: string) {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    throw new RangeError(`${label} doit être compris entre 0 et 100.`);
  }
}

function validatePolicy(policy: EquipmentScorePolicy) {
  assertPercentage(policy.minimumCoveragePercent, 'La couverture minimale');
  assertPercentage(policy.bands.orangeMinimum, 'Le seuil orange');
  assertPercentage(policy.bands.greenMinimum, 'Le seuil vert');
  if (policy.bands.greenMinimum <= policy.bands.orangeMinimum) {
    throw new RangeError('Le seuil vert doit être strictement supérieur au seuil orange.');
  }
}

export function classifyEquipmentScore(
  score: number,
  policy: EquipmentScorePolicy,
): EquipmentScoreBand {
  assertPercentage(score, 'Le score');
  validatePolicy(policy);
  if (score >= policy.bands.greenMinimum) return 'green';
  if (score >= policy.bands.orangeMinimum) return 'orange';
  return 'red';
}

export function evaluateEquipmentScore(
  inputs: readonly EquipmentScoreComponentInput[],
  evaluatedAt: string,
  policy: EquipmentScorePolicy = C11_LOCAL_PROVISIONAL_POLICY,
): EquipmentScoreResult {
  validatePolicy(policy);
  if (!Number.isFinite(Date.parse(evaluatedAt))) {
    throw new RangeError('La date d’évaluation doit être explicite et valide.');
  }

  const expectedCodes = Object.keys(EQUIPMENT_SCORE_COMPONENT_WEIGHTS) as EquipmentScoreComponentCode[];
  const expectedCodeSet = new Set<string>(expectedCodes);
  const inputsByCode = new Map<EquipmentScoreComponentCode, EquipmentScoreComponentInput>();

  for (const input of inputs) {
    if (!expectedCodeSet.has(input.code)) {
      throw new Error(`La composante ${input.code} n’appartient pas à la formule C11.`);
    }
    if (inputsByCode.has(input.code)) {
      throw new Error(`La composante ${input.code} est dupliquée.`);
    }
    assertPercentage(input.completenessPercent, `La complétude de ${input.code}`);
    if (input.normalizedScore !== null) {
      assertPercentage(input.normalizedScore, `Le score normalisé de ${input.code}`);
    }
    inputsByCode.set(input.code, input);
  }

  const missingData = new Set<string>();
  const criticalGaps: EquipmentScoreComponentCode[] = [];
  const components: EquipmentScoreComponentResult[] = expectedCodes.map((code) => {
    const input = inputsByCode.get(code);
    const weightPercent = EQUIPMENT_SCORE_COMPONENT_WEIGHTS[code];
    const exclusionReasons: string[] = [];

    if (!input) {
      missingData.add(`Composante absente : ${code}`);
      return {
        code,
        weightPercent,
        eligibleCompletenessPercent: 0,
        coverageContribution: 0,
        weightedScoreContribution: null,
        included: false,
        exclusionReasons: ['Composante absente'],
      };
    }

    for (const item of input.missingData ?? []) missingData.add(item);
    if (input.source.status !== 'confirmed') {
      exclusionReasons.push(input.source.status === 'missing' ? 'Source absente' : 'Source provisoire non canonique');
    }
    if (input.source.kind === null) exclusionReasons.push('Type de source non renseigné');
    if (input.source.kind === 'internal_draft') exclusionReasons.push('Brouillon interne non canonique');
    if (
      input.source.status === 'confirmed'
      && input.source.kind !== null
      && input.source.kind !== 'internal_draft'
      && !input.source.reference?.trim()
    ) {
      exclusionReasons.push('Référence de source absente');
    }
    if (input.freshness.status !== 'fresh') {
      exclusionReasons.push(input.freshness.status === 'stale' ? 'Donnée périmée' : 'Fraîcheur inconnue');
    }
    if (input.normalizedScore === null) exclusionReasons.push('Score normalisé absent');
    if (!input.criticalInputsComplete) criticalGaps.push(code);

    const included = exclusionReasons.length === 0;
    const eligibleCompletenessPercent = included ? input.completenessPercent : 0;
    const coverageContribution = roundToTwoDecimals(
      weightPercent * eligibleCompletenessPercent / 100,
    );
    const weightedScoreContribution = included && input.normalizedScore !== null
      ? roundToTwoDecimals(weightPercent * eligibleCompletenessPercent / 100 * input.normalizedScore / 100)
      : null;

    return {
      code,
      weightPercent,
      eligibleCompletenessPercent,
      coverageContribution,
      weightedScoreContribution,
      included,
      exclusionReasons,
    };
  });

  const coveragePercent = roundToTwoDecimals(
    components.reduce((total, component) => total + component.coverageContribution, 0),
  );
  const canCalculate = coveragePercent >= policy.minimumCoveragePercent && criticalGaps.length === 0;

  if (!canCalculate) {
    return {
      status: 'non_calculable',
      displayState: 'Score non calculable — données insuffisantes',
      score: null,
      band: null,
      coveragePercent,
      publishable: false,
      evaluatedAt,
      missingData: [...missingData],
      criticalGaps,
      components,
    };
  }

  // Les poids non couverts restent à zéro : ils ne sont jamais redistribués.
  const score = roundToTwoDecimals(
    components.reduce((total, component) => total + (component.weightedScoreContribution ?? 0), 0),
  );
  const status: EquipmentScoreStatus = coveragePercent === 100 ? 'calculated' : 'partial';

  return {
    status,
    displayState: status === 'calculated' ? 'Score calculé' : 'Score partiel — données incomplètes',
    score,
    band: classifyEquipmentScore(score, policy),
    coveragePercent,
    publishable: status === 'calculated' && policy.approvalStatus === 'confirmed',
    evaluatedAt,
    missingData: [...missingData],
    criticalGaps,
    components,
  };
}
