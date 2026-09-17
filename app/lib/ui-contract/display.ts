import type {
  AtRiskEquipment,
  AtRiskReason,
  AudienceId,
  BuildingScore,
  EquipmentOperationalStatus,
  Insufficient,
  InsufficientCode,
  Perimeter,
  ScorePalier,
  ThresholdPosition,
  UiSession,
} from './building-health.ts';

type EquipmentCriticality = NonNullable<import('./building-health.ts').EquipmentCard['criticality']>;
type ControlValidity = import('./building-health.ts').EquipmentCard['controlValidity'];

const CONTROL_REASONS: InsufficientCode[] = [
  'coverage_below_minimum',
  'no_valid_controls',
  'critical_data_missing',
];

export const PRIMARY_REASON_ORDER: AtRiskReason[] = [
  'unavailable',
  'degraded',
  'control_expired',
  'control_missing',
  'active_high_or_critical_ticket',
  'redundancy_loss',
  'recurrence_threshold',
  'open_reserve',
  'measure_near_or_beyond_threshold',
];

const DEMO_TO_CANONICAL: Record<string, string> = {
  'DEMO-ASC-1/2': 'ASC-A1 · ASC-A2',
  'DEMO-ASC-1': 'ASC-A1',
  'DEMO-ASC-2': 'ASC-A2',
  'DEMO-GE': 'GE-01',
  'DEMO-EAU': 'WILO-01',
  'DEMO-SSI': 'RIA-01',
  'DEMO-ESP': 'IRR-01',
  'DEMO-RND': 'RND-LET',
};

const DEMO_REPLACEMENTS: Array<[string, string]> = [
  ['DEMO-ASC-1/2', 'ASC-A1 · ASC-A2'],
  ['DEMO-ASC-1', 'ASC-A1'],
  ['DEMO-ASC-2', 'ASC-A2'],
  ['DEMO-GE', 'GE-01'],
  ['DEMO-EAU', 'WILO-01'],
  ['DEMO-SSI', 'RIA-01'],
  ['DEMO-ESP', 'IRR-01'],
  ['DEMO-RND', 'RND-LET'],
];

export function displayAssetCode(code: string | null | undefined): string {
  if (!code) return '—';
  return DEMO_TO_CANONICAL[code] ?? code;
}

export function displayAssetText(value: string): string {
  return DEMO_REPLACEMENTS.reduce((text, [from, to]) => text.replaceAll(from, to), value);
}

export function asciiInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const letter = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '')[0]?.toUpperCase() ?? '';
  if (parts.length === 1) {
    const chars = parts[0].normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
    return chars.slice(0, 2) || '—';
  }
  return `${letter(parts[0])}${letter(parts[1])}` || '—';
}

export function palierFromScore(value: number): ScorePalier {
  if (value < 70) return 'critical';
  if (value < 90) return 'watch';
  return 'ok';
}

export function displayRawScore(value: number): number {
  return Math.floor(value + 0.5);
}

export function palierTone(palier: ScorePalier): 'danger' | 'warning' | 'success' {
  if (palier === 'critical') return 'danger';
  if (palier === 'watch') return 'warning';
  return 'success';
}

export function palierBadgeTone(palier: ScorePalier): 'critical' | 'orange' | 'success' {
  if (palier === 'critical') return 'critical';
  if (palier === 'watch') return 'orange';
  return 'success';
}

export function palierRangeLabel(palier: ScorePalier): string {
  if (palier === 'critical') return '0–69';
  if (palier === 'watch') return '70–89';
  return '90–100';
}

export function palierSituationLabel(palier: ScorePalier): string {
  if (palier === 'critical') return 'Situation dégradée';
  if (palier === 'watch') return 'À surveiller';
  return 'Situation saine';
}

export function statusLabel(status: EquipmentOperationalStatus): string {
  if (status === 'available') return 'Disponible';
  if (status === 'degraded') return 'Dégradé';
  if (status === 'unavailable') return 'Indisponible';
  return 'Contrôle à renouveler';
}

export function statusBadgeTone(status: EquipmentOperationalStatus): 'success' | 'orange' | 'critical' {
  if (status === 'available') return 'success';
  if (status === 'unavailable') return 'critical';
  return 'orange';
}

export function controlValidityLabel(value: ControlValidity): string | null {
  if (value === 'expired') return 'Contrôle périmé';
  if (value === 'missing') return 'Contrôle manquant';
  if (value === 'incomplete') return 'Contrôle incomplet';
  return null;
}

export function criticalityLabel(criticality: EquipmentCriticality): string {
  return criticality === 'critical' ? 'Critique' : 'Prioritaire';
}

export function familyLabel(family: string | null): string {
  if (family === 'electricity') return 'Électricité';
  if (family === 'water') return 'Eau';
  if (family === 'fire') return 'Incendie';
  if (family === 'lifts') return 'Ascenseurs';
  if (family === 'landscape') return 'Paysage';
  return 'Autres';
}

export function atRiskReasonLabel(reason: AtRiskReason): string {
  const labels: Record<AtRiskReason, string> = {
    degraded: 'Dégradé',
    unavailable: 'Indisponible',
    control_expired: 'Contrôle périmé',
    control_missing: 'Contrôle manquant',
    redundancy_loss: 'Perte de redondance',
    recurrence_threshold: 'Récurrence au seuil',
    active_high_or_critical_ticket: 'Ticket haut ou critique',
    open_reserve: 'Réserve ouverte',
    measure_near_or_beyond_threshold: 'Mesure proche ou hors seuil',
  };
  return labels[reason];
}

export function primaryReasonOf(reasons: AtRiskReason[]): AtRiskReason {
  return PRIMARY_REASON_ORDER.find((reason) => reasons.includes(reason)) ?? reasons[0];
}

export function orderedReasons(reasons: AtRiskReason[], primary: AtRiskReason): AtRiskReason[] {
  const rest = reasons.filter((reason) => reason !== primary);
  return [primary, ...PRIMARY_REASON_ORDER.filter((reason) => rest.includes(reason))];
}

export function insufficientReasonLabel(code: InsufficientCode): string {
  const labels: Record<InsufficientCode, string> = {
    coverage_below_minimum: 'Couverture inférieure au minimum de 80 %.',
    critical_data_missing: 'Une donnée critique manque.',
    no_eligible_equipment: 'Aucun équipement éligible.',
    no_valid_controls: 'Aucun contrôle valide n’est disponible.',
    functional_state_missing: 'L’état de fonctionnement n’est pas établi.',
    formula_pending: 'La formule de score est en attente de validation.',
    equipment_weights_pending: 'Les pondérations d’équipement sont en attente.',
    domain_data_missing: 'Des données de domaine manquent.',
    freshness_policy_pending: 'La règle de fraîcheur des contrôles est en attente.',
    conflicting_evidence: 'Les preuves sont contradictoires.',
    risk_rules_pending: 'Les règles d’équipements à risque sont en attente.',
    source_missing: 'La source n’est pas raccordée.',
    planning_pending: 'Le planning des rondes n’est pas établi.',
  };
  return labels[code];
}

export function insufficientCopy(value: Insufficient): string {
  return value.detail?.trim() || insufficientReasonLabel(value.reasonCode);
}

export function formatMoney(value: number): string {
  const grouped = new Intl.NumberFormat('fr-FR').format(value).replace(/[\u00a0\u202f]/g, ' ');
  return `${grouped} FCFA`;
}

export function formatCompactMoney(value: number): string {
  if (value >= 1_000_000) {
    const millions = value / 1_000_000;
    const formatted = millions.toLocaleString('fr-FR', {
      minimumFractionDigits: millions % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).replace(/[\u00a0\u202f]/g, ' ');
    return `${formatted} M`;
  }
  return formatMoney(value);
}

export function formatDayTime(value: string | null | undefined, timeZone = 'Africa/Abidjan'): string | null {
  if (!value || !value.includes('T')) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  const day = get('day');
  const month = get('month');
  const hour = get('hour');
  const minute = get('minute');
  if (!day || !month || !hour || !minute) return null;
  return `le ${day}/${month} à ${hour}:${minute}`;
}

export function formatInstant(value: string, timeZone = 'Africa/Abidjan'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date).replace(',', ' ·');
}

export function formatTime(value: string, timeZone = 'Africa/Abidjan'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);
}

export function formatWeekdayDate(value: string, timeZone = 'Africa/Abidjan'): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const raw = new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone,
  }).format(date);
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

export function thresholdPosition(amount: number | null | undefined, threshold: number): ThresholdPosition {
  if (amount == null || !Number.isFinite(amount)) return 'missing';
  if (amount < threshold) return 'below';
  return 'at_or_above';
}

export function availabilityLabel(functionalCount: number, controlledCount: number): string {
  return `${functionalCount} fonctionnel${functionalCount > 1 ? 's' : ''} sur ${controlledCount} contrôlé${controlledCount > 1 ? 's' : ''}`;
}

export function coverageLabel(currentCount: number, totalCount: number): string {
  return `${currentCount} à jour sur ${totalCount}`;
}

export function atRiskVentilation(atRisk: AtRiskEquipment): string | null {
  if (atRisk.status !== 'ok') return null;
  const parts = atRisk.displayBreakdown;
  if (atRisk.total === 0 && parts.unavailable + parts.degraded + parts.control + parts.other === 0) {
    return 'Aucun équipement à risque';
  }
  const details = [
    parts.unavailable ? `${parts.unavailable} indisponible${parts.unavailable > 1 ? 's' : ''}` : null,
    parts.degraded ? `${parts.degraded} dégradé${parts.degraded > 1 ? 's' : ''}` : null,
    parts.control ? `${parts.control} contrôle${parts.control > 1 ? 's' : ''}` : null,
    parts.other ? `${parts.other} autre${parts.other > 1 ? 's' : ''}` : null,
  ].filter(Boolean);
  return details.length ? `${atRisk.total} : ${details.join(', ')}` : String(atRisk.total);
}

export function atRiskHiddenCaption(hiddenItemCount: number): string | null {
  if (hiddenItemCount <= 0) return null;
  return `dont ${hiddenItemCount} hors de votre périmètre`;
}

export function pendingDecisionsLabel(audience: AudienceId): string {
  return audience === 'administration' ? 'Arbitrages en attente' : 'Dossiers à traiter';
}

export function perimeterCopy(session: UiSession): string {
  const perimeter: Perimeter = session.perimeter;
  if (perimeter.kind === 'all') return 'Ensemble du site';
  if (perimeter.equipmentCodes.length > 0) {
    const codes = perimeter.equipmentCodes;
    if (codes.length === 1) return `Votre périmètre : ${codes[0]}`;
    return `Votre périmètre : ${codes.slice(0, -1).join(', ')} et ${codes[codes.length - 1]}`;
  }
  return 'Votre périmètre : rondes et constats';
}

export function shouldOfferControlPlanning(score: BuildingScore): boolean {
  if (score.state !== 'not_computable') return false;
  if (score.missingControls.length > 0) return true;
  return score.missingReasons.some((reason) => CONTROL_REASONS.includes(reason));
}

export function scoreFigure(score: BuildingScore): number | null {
  if (score.state === 'not_computable') return null;
  return score.final;
}

export function reportStageLabel(stage: 'sent' | 'confirmed' | 'read' | 'qualified'): string {
  if (stage === 'sent') return 'Envoyée';
  if (stage === 'confirmed') return 'Confirmée';
  if (stage === 'read') return 'Lue par le FM';
  return 'Qualifiée';
}

export function roundStateLabel(state: 'due' | 'overdue' | 'draft' | 'done'): string {
  if (state === 'overdue') return 'Heure limite dépassée';
  if (state === 'draft') return 'Brouillon';
  if (state === 'done') return 'Faite';
  return 'À faire';
}

export function roundSubjectLabel(round: { equipmentCode?: string | null }): string {
  if (round.equipmentCode) return round.equipmentCode;
  return 'RND-LET';
}

export function roundResultLabel(result: 'compliant' | 'anomaly' | 'impossible' | null): string | null {
  if (result === 'compliant') return 'Conforme';
  if (result === 'anomaly') return 'Anomalie';
  if (result === 'impossible') return 'Impossible';
  return null;
}
