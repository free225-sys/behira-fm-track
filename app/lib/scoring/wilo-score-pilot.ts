import {
  C11_LOCAL_PROVISIONAL_POLICY,
  evaluateEquipmentScore,
  type EquipmentScoreComponentInput,
  type EquipmentScoreResult,
} from './equipment-score-core.ts';

export const WILO_PILOT_MISSING_DATA = [
  'Consigne de pression de service confirmée sur le contrôleur WILO-01',
  'Seuils de pression approuvés pour WILO-01',
  'Règles internes de notation des cinq composantes',
  'Criticité métier confirmée de WILO-01',
  'Observations de disponibilité confirmées sur la période',
  'Plan et occurrences de maintenance préventive confirmés',
  'Règle canonique de rapprochement des récidives',
] as const;

const unavailableComponent = (
  code: EquipmentScoreComponentInput['code'],
  missingData: readonly string[],
  criticalInputsComplete = true,
): EquipmentScoreComponentInput => ({
  code,
  normalizedScore: null,
  completenessPercent: 0,
  source: {
    kind: null,
    status: 'missing',
  },
  freshness: {
    status: 'unknown',
  },
  criticalInputsComplete,
  missingData,
});

export function evaluateWiloPilotReadiness(evaluatedAt: string): EquipmentScoreResult {
  const result = evaluateEquipmentScore([
    unavailableComponent('availability_continuity', [WILO_PILOT_MISSING_DATA[4]]),
    unavailableComponent('open_anomalies', [WILO_PILOT_MISSING_DATA[2]]),
    unavailableComponent('preventive_maintenance', [WILO_PILOT_MISSING_DATA[5]]),
    unavailableComponent(
      'threshold_controls',
      [WILO_PILOT_MISSING_DATA[0], WILO_PILOT_MISSING_DATA[1]],
      false,
    ),
    unavailableComponent(
      'reliability_recurrences',
      [WILO_PILOT_MISSING_DATA[6]],
    ),
  ], evaluatedAt, C11_LOCAL_PROVISIONAL_POLICY);

  return {
    ...result,
    missingData: [...WILO_PILOT_MISSING_DATA],
  };
}
