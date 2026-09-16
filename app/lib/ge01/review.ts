import type { Ge01Draft, Ge01Measure, Ge01StartOutcome } from './report';
import type { MeasureStatus } from './thresholds';
import { evaluateBattery, evaluateFuel, evaluateOil, evaluateWater, parseMeasure, statusFromValue } from './thresholds.ts';

export type ReviewStatus = 'ok' | 'alert' | 'critical' | 'missing' | 'na' | 'neutral';

export type ReviewItem = {
  id: string;
  step: number;
  label: string;
  value: string;
  status: ReviewStatus;
};

export const MEASURE_UNAVAILABLE_REASONS = ['Accès bloqué', 'Jauge HS', 'Autre'] as const;

export const FINAL_STATUS_OPTIONS = [
  { value: 'Opérationnel', label: 'Conforme' },
  { value: 'Intervention', label: 'Anomalie à signaler' },
  { value: 'Critique', label: 'Urgence' },
] as const;

export function finalStatusLabel(value: Ge01Draft['finalStatus']) {
  return FINAL_STATUS_OPTIONS.find((option) => option.value === value)?.label ?? (value || '—');
}

function measureStatus(measure: Ge01Measure, evaluate: (value: number) => MeasureStatus): MeasureStatus | null {
  if (measure.unavailable) return null;
  return statusFromValue(measure.value, evaluate);
}

export function collectMeasureStatuses(draft: Ge01Draft) {
  return {
    fuel: measureStatus(draft.fuelLevel, evaluateFuel),
    oil: measureStatus(draft.oilLevel, evaluateOil),
    water: measureStatus(draft.waterTemperature, evaluateWater),
    battery: measureStatus(draft.batteryVoltage, evaluateBattery),
  };
}

export function countMeasureStatuses(draft: Ge01Draft) {
  const statuses = Object.values(collectMeasureStatuses(draft));
  return {
    ok: statuses.filter((status) => status === 'ok').length,
    alert: statuses.filter((status) => status === 'alert').length,
    critical: statuses.filter((status) => status === 'critical').length,
  };
}

export function suggestFinalStatus(draft: Ge01Draft): '' | 'Opérationnel' | 'Intervention' | 'Critique' {
  const measures = collectMeasureStatuses(draft);
  const measureValues = Object.values(measures);
  const hasCritical = measureValues.includes('critical')
    || draft.startOutcome === 'failed'
    || draft.smoke === 'Noire'
    || draft.abnormalNoise === 'yes'
    || draft.alarmMc4 === 'Alarme affichée'
    || draft.geAuto === 'no'
    || draft.atsAuto === 'no';
  if (hasCritical) return 'Critique';
  const hasAlert = measureValues.includes('alert')
    || draft.temperatureLocal === 'Chaud'
    || draft.temperatureLocal === 'Très chaud'
    || draft.cleanliness === 'Écart constaté'
    || (draft.smoke !== '' && draft.smoke !== 'Aucune' && draft.smoke !== 'Non observée')
    || draft.startOutcome === 'not_performed';
  if (hasAlert) return 'Intervention';
  const hasOkMeasure = measureValues.some((status) => status === 'ok');
  if (hasOkMeasure || draft.startOutcome === 'success') return 'Opérationnel';
  return '';
}

function displayOrMissing(value: string) {
  return value.trim() ? value : 'Manquant';
}

function measureReview(id: string, label: string, measure: Ge01Measure, unit: string, evaluate: (value: number) => MeasureStatus): ReviewItem {
  if (measure.unavailable) {
    return { id, step: 1, label, value: measure.reason.trim() ? `Impossible · ${measure.reason}` : 'Manquant', status: measure.reason.trim() ? 'na' : 'missing' };
  }
  const parsed = parseMeasure(measure.value);
  if (parsed == null) return { id, step: 1, label, value: 'Manquant', status: 'missing' };
  const status = evaluate(parsed);
  return { id, step: 1, label, value: `${parsed} ${unit}`, status };
}

function startLabel(outcome: Ge01StartOutcome) {
  if (outcome === 'success') return 'Effectué';
  if (outcome === 'failed') return 'Échoué';
  if (outcome === 'not_performed') return 'Impossible';
  return 'Manquant';
}

function observedLabel(value: string, map: Record<string, string>) {
  if (!value) return 'Manquant';
  return map[value] ?? value;
}

export function buildReviewItems(draft: Ge01Draft, agentName: string): ReviewItem[] {
  const smokeMap = { Aucune: 'Normale', Blanche: 'Blanche', Noire: 'Noire', 'Non observée': 'Non vue', Bleue: 'Bleue' };
  const noiseMap = { yes: 'Présents', no: 'Absents', not_observed: 'Non vérifié' };
  const autoMap = { yes: 'Oui', no: 'Non', not_observed: 'Non vérifié' };
  const alarmMap = { 'Aucune alarme': 'Aucune', 'Alarme affichée': 'Active', 'Non observée': 'Non vérifié' };
  const items: ReviewItem[] = [
    { id: 'date', step: 0, label: 'Date du contrôle', value: displayOrMissing(draft.date), status: draft.date ? 'neutral' : 'missing' },
    { id: 'time', step: 0, label: 'Heure du contrôle', value: displayOrMissing(draft.time), status: draft.time ? 'neutral' : 'missing' },
    { id: 'intervenant', step: 0, label: 'Intervenant', value: agentName, status: 'neutral' },
    { id: 'engineHours', step: 0, label: 'Heures compteur moteur', value: draft.engineHours ? `${draft.engineHours} h` : 'Manquant', status: draft.engineHours ? 'neutral' : 'missing' },
    { id: 'starts24h', step: 0, label: 'Démarrages 24 h', value: draft.starts24h === '' ? 'Manquant' : draft.starts24h, status: draft.starts24h === '' ? 'missing' : 'neutral' },
    { id: 'temperatureLocal', step: 1, label: 'État thermique', value: observedLabel(draft.temperatureLocal, { Normal: 'Normal', Chaud: 'Chaud', 'Très chaud': 'Chaud', 'Non observé': 'Non vérifié' }), status: draft.temperatureLocal ? (draft.temperatureLocal === 'Chaud' || draft.temperatureLocal === 'Très chaud' ? 'alert' : 'ok') : 'missing' },
    { id: 'cleanliness', step: 1, label: 'Propreté', value: observedLabel(draft.cleanliness, { Conforme: 'Conforme', 'Écart constaté': 'Eau ou saleté', 'Non observé': 'Non vérifié' }), status: draft.cleanliness ? (draft.cleanliness === 'Écart constaté' ? 'alert' : 'ok') : 'missing' },
    measureReview('fuelLevel', 'Niveau carburant', draft.fuelLevel, '%', evaluateFuel),
    measureReview('oilLevel', 'Niveau huile moteur', draft.oilLevel, '%', evaluateOil),
    measureReview('waterTemperature', 'Température eau', draft.waterTemperature, '°C', evaluateWater),
    measureReview('batteryVoltage', 'Tension batterie', draft.batteryVoltage, 'V', evaluateBattery),
    { id: 'abnormalNoise', step: 1, label: 'Bruit ou vibrations', value: observedLabel(draft.abnormalNoise, noiseMap), status: draft.abnormalNoise ? (draft.abnormalNoise === 'yes' ? 'alert' : 'ok') : 'missing' },
    { id: 'smoke', step: 1, label: 'Fumée', value: observedLabel(draft.smoke, smokeMap), status: draft.smoke ? (draft.smoke === 'Noire' || draft.smoke === 'Blanche' || draft.smoke === 'Bleue' ? 'alert' : 'ok') : 'missing' },
    { id: 'startOutcome', step: 2, label: 'Essai de démarrage', value: startLabel(draft.startOutcome), status: draft.startOutcome ? (draft.startOutcome === 'failed' ? 'critical' : draft.startOutcome === 'not_performed' ? 'alert' : 'ok') : 'missing' },
    ...(draft.startOutcome === 'success' ? [
      { id: 'testStartTime', step: 2, label: 'Heure de l’essai', value: displayOrMissing(draft.testStartTime), status: draft.testStartTime ? 'neutral' as const : 'missing' as const },
      { id: 'returnAuto', step: 2, label: 'Retour en AUTO', value: observedLabel(draft.returnAuto, autoMap), status: draft.returnAuto ? (draft.returnAuto === 'no' ? 'alert' as const : 'ok' as const) : 'missing' as const },
    ] : []),
    ...(draft.startOutcome === 'failed' ? [
      { id: 'startAttempts', step: 2, label: 'Tentatives', value: draft.startAttempts === '' || Number(draft.startAttempts) < 1 ? 'Manquant' : draft.startAttempts, status: Number(draft.startAttempts) >= 1 ? 'critical' as const : 'missing' as const },
      { id: 'startSymptom', step: 2, label: 'Symptôme', value: displayOrMissing(draft.startSymptom), status: draft.startSymptom.trim() ? 'critical' as const : 'missing' as const },
    ] : []),
    ...(draft.startOutcome === 'not_performed' ? [
      { id: 'testExceptionReason', step: 2, label: 'Motif essai impossible', value: displayOrMissing(draft.testExceptionReason), status: draft.testExceptionReason.trim() ? 'alert' as const : 'missing' as const },
    ] : []),
    { id: 'geAuto', step: 2, label: 'Groupe en AUTO', value: observedLabel(draft.geAuto, autoMap), status: draft.geAuto ? (draft.geAuto === 'no' ? 'critical' : 'ok') : 'missing' },
    { id: 'atsAuto', step: 2, label: 'ATS en AUTO', value: observedLabel(draft.atsAuto, autoMap), status: draft.atsAuto ? (draft.atsAuto === 'no' ? 'critical' : 'ok') : 'missing' },
    { id: 'alarmMc4', step: 2, label: 'Alarme MC4', value: draft.alarmMc4 === 'Alarme affichée' ? (draft.alarmDetails.trim() || 'Active') : observedLabel(draft.alarmMc4, alarmMap), status: draft.alarmMc4 ? (draft.alarmMc4 === 'Alarme affichée' ? 'alert' : 'ok') : 'missing' },
    { id: 'maintenance_dmc', step: 2, label: 'Entretien DMC', value: 'Non applicable', status: 'na' },
    { id: 'finalStatus', step: 3, label: 'État final', value: draft.finalStatus ? finalStatusLabel(draft.finalStatus) : 'Manquant', status: draft.finalStatus ? 'neutral' : 'missing' },
    { id: 'confirmed', step: 3, label: 'Confirmation', value: draft.confirmed ? 'Confirmé' : 'Manquant', status: draft.confirmed ? 'ok' : 'missing' },
  ];
  return items;
}

export function missingReviewCount(items: ReviewItem[]) {
  return items.filter((item) => item.status === 'missing').length;
}
