import assert from 'node:assert/strict';

import {
  C11_LOCAL_PROVISIONAL_POLICY,
  classifyEquipmentScore,
  evaluateEquipmentScore,
  type EquipmentScoreComponentInput,
  type EquipmentScorePolicy,
} from '../app/lib/scoring/equipment-score-core.ts';
import {
  evaluateWiloPilotReadiness,
  WILO_PILOT_MISSING_DATA,
} from '../app/lib/scoring/wilo-score-pilot.ts';

const evaluatedAt = '2026-09-03T09:00:00.000Z';
const confirmedPolicy: EquipmentScorePolicy = {
  ...C11_LOCAL_PROVISIONAL_POLICY,
  approvalStatus: 'confirmed',
};

const component = (
  code: EquipmentScoreComponentInput['code'],
  normalizedScore: number,
  options: Partial<EquipmentScoreComponentInput> = {},
): EquipmentScoreComponentInput => ({
  code,
  normalizedScore,
  completenessPercent: 100,
  source: {
    kind: 'commissioning_record',
    status: 'confirmed',
    reference: `TEST-${code}`,
  },
  freshness: {
    status: 'fresh',
    observedAt: '2026-09-03T08:00:00.000Z',
  },
  criticalInputsComplete: true,
  ...options,
});

const completeInputs = [
  component('availability_continuity', 100),
  component('open_anomalies', 80),
  component('preventive_maintenance', 60),
  component('threshold_controls', 90),
  component('reliability_recurrences', 70),
];

const complete = evaluateEquipmentScore(completeInputs, evaluatedAt, confirmedPolicy);
assert.equal(complete.status, 'calculated');
assert.equal(complete.coveragePercent, 100);
assert.equal(complete.score, 82.5);
assert.equal(complete.band, 'orange');
assert.equal(complete.publishable, true);
console.log('✓ calcul déterministe complet, sans redistribution des poids');

const partial = evaluateEquipmentScore([
  component('availability_continuity', 100),
  component('open_anomalies', 100),
  component('preventive_maintenance', 100, { completenessPercent: 50 }),
  component('threshold_controls', 100),
  component('reliability_recurrences', 100, {
    normalizedScore: null,
    completenessPercent: 0,
    source: { kind: null, status: 'missing' },
    freshness: { status: 'unknown' },
    missingData: ['Historique de récidive absent'],
  }),
], evaluatedAt, confirmedPolicy);
assert.equal(partial.status, 'partial');
assert.equal(partial.coveragePercent, 80);
assert.equal(partial.score, 80);
assert.equal(partial.publishable, false);
assert.deepEqual(partial.missingData, ['Historique de récidive absent']);
console.log('✓ couverture minimale à 80 %, résultat partiel clairement non publiable');

const insufficient = evaluateEquipmentScore([
  ...completeInputs.slice(0, 2),
  component('preventive_maintenance', 100, { completenessPercent: 45 }),
  completeInputs[3],
], evaluatedAt, confirmedPolicy);
assert.equal(insufficient.coveragePercent, 79);
assert.equal(insufficient.status, 'non_calculable');
assert.equal(insufficient.score, null);
assert.equal(insufficient.band, null);
console.log('✓ couverture inférieure à 80 % : aucun score numérique');

const criticalGap = evaluateEquipmentScore(completeInputs.map((input) => (
  input.code === 'threshold_controls'
    ? { ...input, criticalInputsComplete: false }
    : input
)), evaluatedAt, confirmedPolicy);
assert.equal(criticalGap.coveragePercent, 100);
assert.equal(criticalGap.status, 'non_calculable');
assert.equal(criticalGap.score, null);
assert.deepEqual(criticalGap.criticalGaps, ['threshold_controls']);
console.log('✓ donnée critique absente : le seuil de couverture ne contourne pas le verrou');

const stale = evaluateEquipmentScore(completeInputs.map((input) => (
  input.code === 'threshold_controls'
    ? { ...input, freshness: { status: 'stale' as const, observedAt: '2026-08-01T08:00:00.000Z' } }
    : input
)), evaluatedAt, confirmedPolicy);
assert.equal(stale.coveragePercent, 85);
assert.equal(stale.status, 'partial');
assert.equal(stale.components.find(({ code }) => code === 'threshold_controls')?.included, false);
console.log('✓ donnée périmée : réduction de couverture, jamais assimilation à une panne');

const provisionalSource = evaluateEquipmentScore(completeInputs.map((input) => (
  input.code === 'reliability_recurrences'
    ? { ...input, source: { kind: 'internal_draft' as const, status: 'provisional' as const } }
    : input
)), evaluatedAt, confirmedPolicy);
assert.equal(provisionalSource.coveragePercent, 90);
assert.equal(provisionalSource.status, 'partial');
assert.equal(provisionalSource.publishable, false);
console.log('✓ source provisoire exclue du calcul canonique');

const unreferencedDraft = evaluateEquipmentScore(completeInputs.map((input) => (
  input.code === 'reliability_recurrences'
    ? { ...input, source: { kind: 'internal_draft' as const, status: 'confirmed' as const } }
    : input
)), evaluatedAt, confirmedPolicy);
assert.equal(unreferencedDraft.coveragePercent, 90);
assert.equal(unreferencedDraft.status, 'partial');
assert.ok(unreferencedDraft.components.at(-1)?.exclusionReasons.includes('Brouillon interne non canonique'));
console.log('✓ un brouillon interne ne devient pas canonique par simple marquage');

assert.equal(classifyEquipmentScore(69, confirmedPolicy), 'red');
assert.equal(classifyEquipmentScore(70, confirmedPolicy), 'orange');
assert.equal(classifyEquipmentScore(89, confirmedPolicy), 'orange');
assert.equal(classifyEquipmentScore(90, confirmedPolicy), 'green');
console.log('✓ bornes locales 0–69 / 70–89 / 90–100 couvertes');

const wilo = evaluateWiloPilotReadiness(evaluatedAt);
assert.equal(wilo.status, 'non_calculable');
assert.equal(wilo.displayState, 'Score non calculable — données insuffisantes');
assert.equal(wilo.score, null);
assert.equal(wilo.band, null);
assert.equal(wilo.coveragePercent, 0);
assert.equal(wilo.publishable, false);
for (const missing of WILO_PILOT_MISSING_DATA) {
  assert.ok(wilo.missingData.includes(missing), `Donnée WILO manquante non exposée : ${missing}`);
}
console.log('✓ WILO-01 reste non calculable et sans valeur inventée');

assert.throws(
  () => evaluateEquipmentScore([...completeInputs, completeInputs[0]], evaluatedAt, confirmedPolicy),
  /dupliquée/,
);
assert.throws(
  () => evaluateEquipmentScore([
    ...completeInputs,
    { ...completeInputs[0], code: 'unknown_component' },
  ] as EquipmentScoreComponentInput[], evaluatedAt, confirmedPolicy),
  /n’appartient pas à la formule C11/,
);
assert.throws(
  () => evaluateEquipmentScore(completeInputs, 'date-invalide', confirmedPolicy),
  /date d’évaluation/,
);
console.log('✓ entrées dupliquées et horloge implicite refusées');

const localOnly = evaluateEquipmentScore(completeInputs, evaluatedAt);
assert.equal(localOnly.status, 'calculated');
assert.equal(localOnly.publishable, false);
console.log('✓ politique provisoire locale : un résultat testable ne devient jamais publiable');

console.log('\n11 groupes de contrôles C11-Cœur réussis.');
