import type { Ge01Draft, Ge01Measure, Ge01StartOutcome } from './report';
import type { MeasureStatus } from './thresholds';
import { evaluateBattery, evaluateFuel, evaluateOil, evaluateWater, parseMeasure, statusFromValue } from './thresholds.ts';

export type ReviewStatus = 'ok' | 'alert' | 'critical' | 'missing' | 'na' | 'neutral' | 'unverified';

/** Valeurs de réponse qui signifient « non vérifié » : jamais comptées comme conformes. */
const UNVERIFIED_VALUES = new Set(['not_observed', 'Non observé', 'Non observée']);

function observedStatus(value: string, isAlert: boolean, alertStatus: 'alert' | 'critical' = 'alert'): ReviewStatus {
  if (!value) return 'missing';
  if (UNVERIFIED_VALUES.has(value)) return 'unverified';
  return isAlert ? alertStatus : 'ok';
}

/** Date ISO (AAAA-MM-JJ) présentée au format JJ/MM/AAAA ; toute autre valeur est rendue telle quelle. */
export function formatReviewDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

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
    { id: 'date', step: 0, label: 'Date du contrôle', value: draft.date ? formatReviewDate(draft.date) : 'Manquant', status: draft.date ? 'neutral' : 'missing' },
    { id: 'time', step: 0, label: 'Heure du contrôle', value: displayOrMissing(draft.time), status: draft.time ? 'neutral' : 'missing' },
    { id: 'intervenant', step: 0, label: 'Intervenant', value: agentName, status: 'neutral' },
    { id: 'engineHours', step: 0, label: 'Heures compteur moteur', value: draft.engineHours ? `${draft.engineHours} h` : 'Manquant', status: draft.engineHours ? 'neutral' : 'missing' },
    { id: 'starts24h', step: 0, label: 'Démarrages 24 h', value: draft.starts24h === '' ? 'Manquant' : draft.starts24h, status: draft.starts24h === '' ? 'missing' : 'neutral' },
    { id: 'temperatureLocal', step: 1, label: 'État thermique', value: observedLabel(draft.temperatureLocal, { Normal: 'Normal', Chaud: 'Chaud', 'Très chaud': 'Chaud', 'Non observé': 'Non vérifié' }), status: observedStatus(draft.temperatureLocal, draft.temperatureLocal === 'Chaud' || draft.temperatureLocal === 'Très chaud') },
    { id: 'cleanliness', step: 1, label: 'Propreté', value: observedLabel(draft.cleanliness, { Conforme: 'Conforme', 'Écart constaté': 'Eau ou saleté', 'Non observé': 'Non vérifié' }), status: observedStatus(draft.cleanliness, draft.cleanliness === 'Écart constaté') },
    measureReview('fuelLevel', 'Niveau carburant', draft.fuelLevel, '%', evaluateFuel),
    measureReview('oilLevel', 'Niveau huile moteur', draft.oilLevel, '%', evaluateOil),
    measureReview('waterTemperature', 'Température eau', draft.waterTemperature, '°C', evaluateWater),
    measureReview('batteryVoltage', 'Tension batterie', draft.batteryVoltage, 'V', evaluateBattery),
    { id: 'abnormalNoise', step: 1, label: 'Bruit ou vibrations', value: observedLabel(draft.abnormalNoise, noiseMap), status: observedStatus(draft.abnormalNoise, draft.abnormalNoise === 'yes') },
    { id: 'smoke', step: 1, label: 'Fumée', value: observedLabel(draft.smoke, smokeMap), status: observedStatus(draft.smoke, draft.smoke === 'Noire' || draft.smoke === 'Blanche' || draft.smoke === 'Bleue') },
    { id: 'startOutcome', step: 2, label: 'Essai de démarrage', value: startLabel(draft.startOutcome), status: draft.startOutcome ? (draft.startOutcome === 'failed' ? 'critical' : draft.startOutcome === 'not_performed' ? 'alert' : 'ok') : 'missing' },
    ...(draft.startOutcome === 'success' ? [
      { id: 'testStartTime', step: 2, label: 'Heure de l’essai', value: displayOrMissing(draft.testStartTime), status: draft.testStartTime ? 'neutral' as const : 'missing' as const },
      { id: 'returnAuto', step: 2, label: 'Retour en AUTO', value: observedLabel(draft.returnAuto, autoMap), status: observedStatus(draft.returnAuto, draft.returnAuto === 'no') },
    ] : []),
    ...(draft.startOutcome === 'failed' ? [
      { id: 'startAttempts', step: 2, label: 'Tentatives', value: draft.startAttempts === '' || Number(draft.startAttempts) < 1 ? 'Manquant' : draft.startAttempts, status: Number(draft.startAttempts) >= 1 ? 'critical' as const : 'missing' as const },
      { id: 'startSymptom', step: 2, label: 'Symptôme', value: displayOrMissing(draft.startSymptom), status: draft.startSymptom.trim() ? 'critical' as const : 'missing' as const },
    ] : []),
    ...(draft.startOutcome === 'not_performed' ? [
      { id: 'testExceptionReason', step: 2, label: 'Motif essai impossible', value: displayOrMissing(draft.testExceptionReason), status: draft.testExceptionReason.trim() ? 'alert' as const : 'missing' as const },
    ] : []),
    { id: 'geAuto', step: 2, label: 'Groupe en AUTO', value: observedLabel(draft.geAuto, autoMap), status: observedStatus(draft.geAuto, draft.geAuto === 'no', 'critical') },
    { id: 'atsAuto', step: 2, label: 'ATS en AUTO', value: observedLabel(draft.atsAuto, autoMap), status: observedStatus(draft.atsAuto, draft.atsAuto === 'no', 'critical') },
    { id: 'alarmMc4', step: 2, label: 'Alarme MC4', value: draft.alarmMc4 === 'Alarme affichée' ? (draft.alarmDetails.trim() || 'Active') : observedLabel(draft.alarmMc4, alarmMap), status: observedStatus(draft.alarmMc4, draft.alarmMc4 === 'Alarme affichée') },
    { id: 'maintenance_dmc', step: 2, label: 'Entretien DMC', value: 'Non applicable', status: 'na' },
    { id: 'finalStatus', step: 3, label: 'État final', value: draft.finalStatus ? finalStatusLabel(draft.finalStatus) : 'Manquant', status: draft.finalStatus ? 'neutral' : 'missing' },
    { id: 'confirmed', step: 3, label: 'Confirmation', value: draft.confirmed ? 'Confirmé' : 'Manquant', status: draft.confirmed ? 'neutral' : 'missing' },
  ];
  return items;
}

/** Compteurs du récapitulatif, calculés sur toutes les lignes affichées (et pas seulement les 4 mesures). */
export function countReviewStatuses(items: ReviewItem[]) {
  const count = (status: ReviewStatus) => items.filter((item) => item.status === status).length;
  return { ok: count('ok'), alert: count('alert'), critical: count('critical'), unverified: count('unverified'), missing: count('missing') };
}

export function missingReviewCount(items: ReviewItem[]) {
  return items.filter((item) => item.status === 'missing').length;
}

import { GE01_FIELD_DEFINITIONS } from "./report";
import type { OperationalReport, OperationalReportCheck } from "../supabase/data";

export type Ge01ReviewInput = {
  decision: "conform" | "anomaly";
  comment: string;
  checkCodes: string[];
  priorityCode?: string;
  anomalyTitle?: string;
};
export type Ge01Review = {
  decision: "conform" | "anomaly";
  reviewedAt: string;
  reviewedBy: string;
  comment: string;
  checkCodes: string[];
  anomalyId: string | null;
  anomalyReference: string | null;
};

export const GE01_PRIORITIES = [
  ["LOW", "Faible"], ["NORMAL", "Normale"], ["PRIORITY", "Moyenne"],
  ["URGENT", "Haute"], ["CRITICAL", "Critique"],
] as const;

export function ge01ChecksSnapshot(checks: OperationalReportCheck[]) {
  return [...checks].sort((a, b) => a.code < b.code ? -1 : a.code > b.code ? 1 : 0).map((check) => ({
    code: check.code, label: check.label, status: check.status,
    valueNumeric: check.valueNumeric ?? null, valueText: check.valueText ?? null,
    valueBoolean: check.valueBoolean ?? null, unit: check.unit ?? null, notes: check.notes ?? null,
  }));
}

export function ge01ConformityBlocker(report: OperationalReport): string | null {
  if (report.reportStatus !== "submitted") return "Ce rapport n’est pas en attente d’examen.";
  if (report.checks.some(check => check.valueNumeric !== undefined && (
    (check.code === 'niveau_carburant' && evaluateFuel(check.valueNumeric) !== 'ok') ||
    (check.code === 'niveau_huile' && evaluateOil(check.valueNumeric) !== 'ok') ||
    (check.code === 'temperature_eau' && evaluateWater(check.valueNumeric) !== 'ok') ||
    (check.code === 'tension_batterie' && evaluateBattery(check.valueNumeric) !== 'ok') ||
    (check.code === 'demarrages_24h' && check.valueNumeric > 7)
  ))) return 'Une mesure dépasse un seuil métier. Examinez l’écart avant de décider de la suite.';
  if (GE01_FIELD_DEFINITIONS.some(({ code }) => !report.checks.some((check) => check.code === code))) {
    return "Des réponses sont absentes. Le rapport ne peut pas être déclaré conforme.";
  }
  if (report.checks.some((check) => check.status === "alert" || check.status === "critical")) {
    return "Un écart est déclaré. Examinez les contrôles concernés avant de décider de la suite.";
  }
  if (report.checks.some((check) => check.code !== "maintenance_dmc" && check.code !== "statut_global" && (
    check.status !== "ok" || (check.valueBoolean === undefined && check.valueNumeric === undefined && !check.valueText?.trim())
  ))) return "Des contrôles n’ont pas été observés. La conformité ne peut pas être confirmée.";
  if (report.checks.find((check) => check.code === "statut_global")?.valueText !== "Opérationnel") {
    return "L’état final déclaré nécessite un examen complémentaire.";
  }
  return null;
}

export function validateGe01Review(report: OperationalReport, input: Ge01ReviewInput): string | null {
  if (report.equipmentCode !== "GE-01" || report.reportType !== "technical_round") return "Rapport GE-01 attendu.";
  if (!input.comment.trim() || input.comment.trim().length > 4000) return "Indiquez un motif de 1 à 4 000 caractères.";
  if (input.decision === "conform") return ge01ConformityBlocker(report);
  if (input.decision !== "anomaly") return "Choisissez une décision.";
  if (!input.anomalyTitle?.trim() || input.anomalyTitle.trim().length > 200) return "Indiquez un titre de 1 à 200 caractères.";
  if (!GE01_PRIORITIES.some(([code]) => code === input.priorityCode)) return "Choisissez la priorité confirmée.";
  if (!input.checkCodes.length || input.checkCodes.some((code) => !report.checks.some((check) => check.code === code))) {
    return "Sélectionnez au moins un contrôle du rapport concerné par l’anomalie.";
  }
  return null;
}

export function decodeGe01Review(value: unknown, reviewerLabel?: string): Ge01Review {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Décision serveur invalide.");
  const row = value as Record<string, unknown>;
  if ((row.decision !== "conform" && row.decision !== "anomaly") || typeof row.reviewed_at !== "string"
    || typeof row.reviewed_by_profile_id !== "string" || typeof row.comment !== "string"
    || !Array.isArray(row.check_codes) || !row.check_codes.every((code) => typeof code === "string")
    || (row.decision === "anomaly" && typeof row.anomaly_id !== "string")) throw new Error("Décision serveur incomplète.");
  return {
    decision: row.decision, reviewedAt: row.reviewed_at,
    reviewedBy: reviewerLabel ?? "Facility Manager", comment: row.comment, checkCodes: row.check_codes as string[],
    anomalyId: typeof row.anomaly_id === "string" ? row.anomaly_id : null,
    anomalyReference: typeof row.anomaly_reference === "string" ? row.anomaly_reference : null,
  };
}
