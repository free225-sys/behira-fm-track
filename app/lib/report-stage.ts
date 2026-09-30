/**
 * C8 / C9 — vocabulaire unique des états d'un rapport de ronde (GE-01, WILO-01, RIA-01).
 * Brouillon → Envoyé → Reçu par le serveur → Lu par le FM → Examiné.
 */
export type ReportStageInput = {
  confirmedAt?: string | null;
  readAt?: string | null;
  reviewedAt?: string | null;
  reviewDecision?: 'conform' | 'anomaly' | null;
  returnReason?: string | null;
  now?: Date;
};

export const UNREAD_ALERT_HOURS = 48;

function unreadSuffix(confirmedAt: string, now: Date) {
  const hours = (now.getTime() - Date.parse(confirmedAt)) / 3_600_000;
  if (!Number.isFinite(hours) || hours < UNREAD_ALERT_HOURS) return '';
  const days = Math.floor(hours / 24);
  return ` · non lu depuis ${days} j`;
}

export function reportStageLabel({ confirmedAt, readAt, reviewedAt, reviewDecision, returnReason, now = new Date() }: ReportStageInput) {
  if (returnReason) return `Nouveau contrôle demandé : ${returnReason}`;
  if (reviewDecision === 'conform') return 'Examiné — conforme';
  if (reviewDecision === 'anomaly') return 'Examiné — anomalie ouverte';
  if (reviewedAt) return 'Examiné par le FM';
  if (readAt) return 'Lu par le FM — examen en cours';
  if (confirmedAt) return `Reçu — en attente de lecture par le FM${unreadSuffix(confirmedAt, now)}`;
  return 'Envoyé — réception à confirmer';
}
