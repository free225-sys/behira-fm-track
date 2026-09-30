import type { FieldCheckInput } from '../offline/types';
import { reasonError, reasonProblem } from '../input-rules';

// Ronde IRR-01 (irrigation / espaces verts) — décision du porteur de projet du 30/09/2026.
// Sources : référentiel central v3 (01_Equipements!10, 08_Seuils!19-21) et clés de revue santé IRR-01
// (cabinet_dry, rainbird_auto, pump, pressure, leak, zoneN_moisture, zoneN_drippers).
// Les libellés de zones sont à confirmer par le métier (référentiel : « RDC, Atriums, Étages 1, 2, 4 »).
export const IRR_RULE_VERSION = 'irr.20260930.v1';
export const IRR_STEPS = ['Contexte', 'Local technique', 'Jardinières', 'Synthèse'] as const;

export const IRR_ZONES = [
  ['zone1', 'Zone 1 · RDC'],
  ['zone2', 'Zone 2 · Atriums'],
  ['zone3', 'Zone 3 · Étage 1'],
  ['zone4', 'Zone 4 · Étage 2'],
  ['zone5', 'Zone 5 · Étage 4'],
] as const;

export type IrrFieldType = 'bool' | 'bar' | string;
export type IrrField = readonly [code: string, label: string, type: IrrFieldType, step: number, hint?: string];

export const IRR_FIELDS: IrrField[] = [
  ['cabinet_state', 'Coffret irrigation', 'Sec|Condensation|Humide / eau', 1, 'Humide ou eau dans le coffret : risque électrique, alerte critique.'],
  ['rainbird_auto', 'Programmateur Rain Bird en AUTO', 'bool', 1],
  ['pump', 'Pompe d’irrigation disponible', 'bool', 1],
  ['pressure', 'Pression irrigation', 'bar', 1, 'Plage normale : 1,5 à 3,5 bar (à confirmer). Critique sous 0,5 bar.'],
  ['leak_kind', 'Fuite visible', 'Aucune|Suintement|Active', 1],
  ...IRR_ZONES.flatMap(([zone, label]) => [
    [`${zone}_moisture`, `${label} — humidité du sol correcte`, 'bool', 2] as const,
    [`${zone}_drippers`, `${label} — goutteurs fonctionnels`, 'bool', 2] as const,
  ]),
];

export type IrrAnswers = Record<string, string>;
export type IrrDraft = {
  id: string;
  performedAt: string;
  answers: IrrAnswers;
  reasons: IrrAnswers;
  summary: string;
  photoExceptionReason: string;
  queued: boolean;
};

export const emptyIrrDraft = (): IrrDraft => ({
  id: crypto.randomUUID(),
  performedAt: new Date().toISOString(),
  answers: {},
  reasons: {},
  summary: '',
  photoExceptionReason: '',
  queued: false,
});

export function measuredBar(value: string): number | null {
  const text = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}

/** Seuils du référentiel (08_Seuils!19) : 1,5–3,5 normal ; 0,5–1,5 ou > 3,5 alerte ; < 0,5 critique. */
export function irrPressureState(value: string): 'missing' | 'normal' | 'alert' | 'critical' {
  const n = measuredBar(value);
  if (n === null) return 'missing';
  if (n < 0.5) return 'critical';
  if (n < 1.5 || n > 3.5) return 'alert';
  return 'normal';
}

function fieldStatus(code: string, value: string): FieldCheckInput['status'] {
  if (code === 'pressure') {
    const state = irrPressureState(value);
    return state === 'critical' ? 'critical' : state === 'alert' ? 'alert' : 'ok';
  }
  if (code === 'cabinet_state') return value === 'Humide / eau' ? 'critical' : value === 'Condensation' ? 'alert' : 'ok';
  if (code === 'leak_kind') return value === 'Active' ? 'critical' : value === 'Suintement' ? 'alert' : 'ok';
  return value === 'no' ? 'alert' : 'ok';
}

/** Réponses manquantes (ni valeur ni « Non vérifié » avec motif), pour la synthèse. */
export function irrMissing(draft: IrrDraft): string[] {
  return IRR_FIELDS.filter(([code]) => {
    const value = draft.answers[code];
    if (!value) return true;
    if (value === 'unknown') return reasonError(draft.reasons[code], code) !== null;
    return false;
  }).map(([, label]) => label);
}

export function irrFindings(draft: IrrDraft): string[] {
  return IRR_FIELDS.filter(([code]) => {
    const value = draft.answers[code];
    return Boolean(value) && value !== 'unknown' && fieldStatus(code, value) !== 'ok';
  }).map(([, label]) => label);
}

export function irrChecks(draft: IrrDraft): FieldCheckInput[] {
  const checks: FieldCheckInput[] = [{ code: 'IRR_RULE_VERSION', label: 'Version des règles IRR', status: 'ok', valueText: IRR_RULE_VERSION }];
  for (const [code, label, type] of IRR_FIELDS) {
    const value = draft.answers[code];
    if (!value || value === 'unknown') {
      { const problem = reasonError(draft.reasons[code], label); if (problem) throw new Error(problem); }
      checks.push({ code, label, status: 'not_checked', notes: draft.reasons[code].trim() });
      continue;
    }
    const status = fieldStatus(code, value);
    if (type === 'bar') {
      const n = measuredBar(value);
      if (n === null) throw new Error(`${label} : valeur positive ou nulle attendue.`);
      checks.push({ code, label, status, valueNumeric: n, unit: 'bar' });
    } else if (type === 'bool') {
      if (!['yes', 'no'].includes(value)) throw new Error(`${label} : réponse invalide.`);
      checks.push({ code, label, status, valueBoolean: value === 'yes' });
    } else {
      if (!type.split('|').includes(value)) throw new Error(`${label} : réponse invalide.`);
      checks.push({ code, label, status, valueText: value });
    }
  }
  // Clés de revue santé déduites (mêmes codes que la revue FM IRR-01).
  const derived = (code: string, label: string, source: string, value: boolean | undefined) => checks.push(value === undefined
    ? { code, label, status: 'not_checked', notes: draft.reasons[source]?.trim() || 'Observation source non vérifiée' }
    : { code, label, status: value ? 'ok' : 'alert', valueBoolean: value });
  const cabinet = draft.answers.cabinet_state;
  derived('cabinet_dry', 'Coffret irrigation sec', 'cabinet_state', !cabinet || cabinet === 'unknown' ? undefined : cabinet === 'Sec');
  const leak = draft.answers.leak_kind;
  if (!leak || leak === 'unknown') derived('leak', 'Fuite présente', 'leak_kind', undefined);
  else checks.push({ code: 'leak', label: 'Fuite présente', status: leak === 'Aucune' ? 'ok' : 'alert', valueBoolean: leak !== 'Aucune' });
  if (draft.photoExceptionReason.trim()) { const problem = reasonProblem(draft.photoExceptionReason, 'Motif d’absence de photo'); if (problem) throw new Error(problem); }
  if (draft.photoExceptionReason.trim()) checks.push({ code: 'PHOTO_EXCEPTION', label: 'Motif d’impossibilité de photo', status: 'ok', valueText: draft.photoExceptionReason.trim() });
  return checks;
}
