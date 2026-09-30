'use client';

import { Ge01Planning, type Ge01AssignmentHandler } from './Ge01Planning';
import type { Ge01Operations } from '../lib/ge01/operations';
import { Ge01EvidencePicker, Ge01EvidenceGallery, type Ge01ProofLoader } from './Ge01Evidence';
import { useCallback, useMemo, useEffect, useId, useRef, useState, type FormEvent } from 'react';

import {
  createEmptyGe01Draft,
  ge01HasAnomaly,
  queueGe01Draft,
  GE01_FIELD_DEFINITIONS,
  formatGe01CheckValue,
  ge01NowStamp,
  restoreGe01Draft,
  validateCompleteGe01Draft,
  validateGe01Step,
  type Ge01BooleanObservation,
  type Ge01Draft,
  type Ge01Measure,
  type Ge01StartOutcome,
} from '../lib/ge01/report';
import {
  DEMO_LAST_CONFIRMED,
  deltaNoteForDraft,
  evaluateEngineHoursDelta,
  formatEngineHours,
  formatMeasureDelta,
  formatShortDate,
  formatYesterdayValue,
  lastContextFromReports,
  lastStartLabel,
  readLastConfirmedGe01,
  writeLastConfirmedGe01,
  type Ge01LastContext,
} from '../lib/ge01/lastContext';
import {
  buildReviewItems,
  countReviewStatuses,
  formatReviewDate,
  FINAL_STATUS_OPTIONS,
  MEASURE_UNAVAILABLE_REASONS,
  missingReviewCount,
  suggestFinalStatus,
} from '../lib/ge01/review';
import {
  evaluateBattery,
  evaluateFuel,
  evaluateOil,
  evaluateWater,
  MEASURE_HINTS,
  parseMeasure,
  sanitizeInteger,
  sanitizeNumeric,
  statusFromValue,
  type MeasureStatus,
} from '../lib/ge01/thresholds';
import { Badge, BrandIcon, Button, Card, Field } from './ui';
import { CountStepper, MetierStatusBadge, RoundPilotHeader, SegmentedControl, useDemoScoreScenario } from './shared';
import type { EquipmentCard } from '../lib/ui-contract/building-health.ts';
import { controlValidityLabel, formatDayTime } from '../lib/ui-contract/display.ts';
import { EQUIPMENT_META, demoHomeSnapshot, sessionForAudience } from '../lib/ui-contract/fixtures.ts';
import type { OperationalReport } from '../lib/supabase/data';
import type { useOfflineSync } from '../lib/offline/useOfflineSync';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { Ge01ReviewPanel, type Ge01ReviewHandler } from './Ge01ReviewPanel';
type OfflineSyncApi = ReturnType<typeof useOfflineSync>;


type SubmissionState = 'editing' | 'queued' | 'server_confirmed' | 'demo';
type DraftSaveState = 'disabled' | 'loading' | 'idle' | 'saving' | 'saved' | 'error';

const steps = ['Contexte', 'Observations', 'Essai & AUTO', 'Récapitulatif'];
const badgeTone: Record<MeasureStatus, 'success' | 'orange' | 'critical'> = {
  ok: 'success',
  alert: 'orange',
  critical: 'critical',
};
const statusLabel: Record<MeasureStatus, string> = {
  ok: 'OK',
  alert: 'Alerte',
  critical: 'Critique',
};
type MeasureHint = (typeof MEASURE_HINTS)[keyof typeof MEASURE_HINTS];

function errorFor(errors: Record<string, string>, key: string) {
  return errors[key] ? <small className="ge-field-error" role="alert">{errors[key]}</small> : null;
}

function agentInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const letter = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '')[0]?.toUpperCase() ?? '';
  if (parts.length === 1) {
    const chars = parts[0].normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
    return chars.slice(0, 2) || '—';
  }
  return `${letter(parts[0])}${letter(parts[1])}` || '—';
}

function controlValidityMeta(equipment: EquipmentCard | null) {
  if (!equipment) return 'Données insuffisantes';
  const label = controlValidityLabel(equipment.controlValidity)
    ?? (equipment.controlValidity === 'valid' ? 'Contrôle valide' : null);
  const when = formatDayTime(equipment.lastControlAt ?? equipment.controlValidUntil);
  if (!label) return 'Données insuffisantes';
  return when ? `${label} · ${when}` : label;
}

function ContextEquipmentCard({ context, equipment }: { context: Ge01LastContext; equipment: EquipmentCard | null }) {
  const hours = context.engineHours == null ? null : formatEngineHours(context.engineHours);
  const when = formatDayTime(equipment?.lastControlAt ?? null) ?? formatDayTime(context.performedOn);
  const zone = equipment?.zone ?? EQUIPMENT_META['GE-01'].zone;
  const statusMissing = !equipment;
  return (
    <div className="ge-fixed-context">
      <div className="ge-fixed-identity">
        <span className="ge-monogram">GE</span>
        <div>
          <b>GE-01 · Groupe électrogène ELCOS</b>
          <small>Contrôle quotidien · essai de démarrage prévu</small>
        </div>
      </div>
      <dl className="ge-context-markers">
        <div>
          <dt>Dernier relevé compteur</dt>
          <dd>{hours ?? '—'}</dd>
          <small>{hours && when ? when : 'Données insuffisantes'}</small>
        </div>
        <div>
          <dt>État au dernier contrôle</dt>
          <dd>{statusMissing ? '—' : <MetierStatusBadge status={equipment.operationalStatus} />}</dd>
          <small>{statusMissing ? 'Données insuffisantes' : controlValidityMeta(equipment)}</small>
        </div>
        <div>
          <dt>Emplacement</dt>
          <dd>{zone || '—'}</dd>
          <small>{zone ? '\u00a0' : 'Données insuffisantes'}</small>
        </div>
      </dl>
    </div>
  );
}

function StartsStepper({
  value,
  error,
  onChange,
}: {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  return (
    <CountStepper
      className="ge-stepper-field"
      label="Démarrages dernières 24 h"
      groupLabel="Nombre de démarrages"
      value={value}
      error={error}
      hint="Hors essai de ce jour"
      ariaMinus="Retirer un démarrage"
      ariaPlus="Ajouter un démarrage"
      onChange={onChange}
    />
  );
}

function ThresholdHint({ parts }: { parts: MeasureHint }) {
  const text = parts.map((part) => part.text).join(' · ');
  return (
    <p className="ge-threshold-line">
      <BrandIcon name="info" size={14} />
      <span>{text}</span>
    </p>
  );
}

function blockNonNumeric(event: FormEvent<HTMLInputElement>, integer = false) {
  const data = (event.nativeEvent as InputEvent).data;
  if (data == null) return;
  if (integer ? !/^[0-9]+$/.test(data) : !/^[0-9.,]+$/.test(data)) event.preventDefault();
}

function NumericShell({
  id,
  value,
  unit,
  integer = false,
  disabled,
  error,
  status,
  describedBy,
  onChange,
}: {
  id?: string;
  value: string;
  unit: string;
  integer?: boolean;
  disabled?: boolean;
  error?: string;
  status?: MeasureStatus | null;
  describedBy?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={['ge-measure-input', status === 'alert' || status === 'critical' ? `is-${status}` : '', error ? 'has-error' : ''].filter(Boolean).join(' ')}>
      <input
        id={id}
        type="text"
        inputMode={integer ? 'numeric' : 'decimal'}
        autoComplete="off"
        spellCheck={false}
        value={value}
        disabled={disabled}
        aria-invalid={Boolean(error) || status === 'critical'}
        aria-describedby={describedBy}
        onBeforeInput={(event) => blockNonNumeric(event, integer)}
        onChange={(event) => onChange(integer ? sanitizeInteger(event.target.value) : sanitizeNumeric(event.target.value))}
      />
      {unit ? <b aria-hidden="true">{unit}</b> : null}
    </div>
  );
}

function BooleanObservation({
  label,
  value,
  onChange,
  error,
  yesLabel = 'Oui',
  noLabel = 'Non',
  restLabel = 'Non vérifié',
  warning,
}: {
  label: string;
  value: Ge01BooleanObservation;
  onChange: (value: Ge01BooleanObservation) => void;
  error?: string;
  yesLabel?: string;
  noLabel?: string;
  restLabel?: string;
  warning?: string;
}) {
  return (
    <SegmentedControl
      label={label}
      value={value}
      options={[
        { value: 'yes', label: yesLabel },
        { value: 'no', label: noLabel },
        { value: 'not_observed', label: restLabel },
      ]}
      error={error}
      onChange={onChange}
      footer={value === 'no' && warning ? <small className="ge-auto-warning" role="status">{warning}</small> : null}
    />
  );
}

function MeasureField({
  label,
  unit,
  measure,
  lastValue,
  onChange,
  error,
  reasonError,
  status,
  hints,
  hintId,
}: {
  label: string;
  unit: string;
  measure: Ge01Measure;
  lastValue: number | null;
  onChange: (value: Ge01Measure) => void;
  error?: string;
  reasonError?: string;
  status: MeasureStatus | null;
  hints: MeasureHint;
  hintId: string;
}) {
  const inputId = useId();
  const current = parseMeasure(measure.value);
  const delta = measure.unavailable ? '' : formatMeasureDelta(current, lastValue, unit);
  return <div className={`ge-measure-field ${error || reasonError ? 'has-error' : ''}`}>
    <div className="ge-measure-head">
      <label htmlFor={inputId}>{label}</label>
      {!measure.unavailable && status ? <Badge tone={badgeTone[status]}>{statusLabel[status]}</Badge> : null}
    </div>
    <NumericShell
      id={inputId}
      value={measure.value}
      unit={unit}
      disabled={measure.unavailable}
      error={error}
      status={measure.unavailable ? null : status}
      describedBy={hintId}
      onChange={(value) => onChange({ ...measure, value })}
    />
    {error ? <small className="ge-field-error" role="alert">{error}</small> : null}
    <small className="ge-yesterday">{formatYesterdayValue(lastValue, unit)}</small>
    {delta && status ? <small className={`ge-hours-hint is-${status === 'ok' ? 'ok' : 'below'}`}>{delta}</small> : null}
    <ThresholdHint parts={hints} />
    <label className="ge-unavailable-toggle">
      <input
        type="checkbox"
        checked={measure.unavailable}
        onChange={(event) => onChange({ ...measure, unavailable: event.target.checked, value: event.target.checked ? '' : measure.value, reason: event.target.checked ? measure.reason : '' })}
      />
      Mesure impossible
    </label>
    {measure.unavailable ? <div className="ge-reason-field">
      <SegmentedControl
        label="Motif"
        value={MEASURE_UNAVAILABLE_REASONS.find((reason) => reason === measure.reason) ?? ''}
        options={MEASURE_UNAVAILABLE_REASONS.map((reason) => ({ value: reason, label: reason }))}
        error={reasonError}
        onChange={(reason) => onChange({ ...measure, reason })}
      />
    </div> : null}
    <span id={hintId} className="visually-hidden">
      {status ? `État ${statusLabel[status]}. ` : ''}
      {hints.map((part) => part.text).join(' · ')}
    </span>
  </div>;
}

export function Ge01AgentForm({
  isTest = false,
  agentName,
  equipment,
  persistenceEnabled,
  offlineSync,
  flash,
  reports,
}: {
  isTest?: boolean;
  agentName: string;
  equipment?: EquipmentCard | null;
  reports?: OperationalReport[];
  persistenceEnabled: boolean;
  offlineSync: OfflineSyncApi;
  flash: (message: string) => void;
}) {
  const draftId = isTest ? "ge01:daily:recette:v1" : "ge01:daily:v1";
  const emptyDraft = useCallback(() => ({ ...createEmptyGe01Draft(new Date(), crypto.randomUUID()), isTest }), [isTest]);
  const [draft, setDraft] = useState<Ge01Draft>(() => ({ ...createEmptyGe01Draft(), isTest }));
  const [draftReady, setDraftReady] = useState(!persistenceEnabled);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>(persistenceEnabled ? "loading" : "disabled");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>("editing");
  const submissionLock = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const { scenario } = useDemoScoreScenario();
  const ge01Equipment = persistenceEnabled ? equipment ?? null : demoHomeSnapshot(sessionForAudience('electricite', agentName), scenario).equipment.find((item) => item.code === 'GE-01') ?? null;
  const pendingDraftSaveRef = useRef<Promise<unknown> | null>(null);
  const { deleteDraft, enqueueRound, loadDraft, saveDraft } = offlineSync;
  const pendingCurrentRound = offlineSync.ge01Pending?.find(item => item.isTest === isTest && item.date === draft.date);
  const hasPendingCurrentRound = Boolean(pendingCurrentRound);

  // E6 — en mode connecté, le contexte vient du dernier rapport GE-01 reçu par le serveur (et non plus d'un contexte vide).
  const lastContext = useMemo<Ge01LastContext>(() => persistenceEnabled ? lastContextFromReports(reports, isTest) : DEMO_LAST_CONFIRMED, [persistenceEnabled, reports, isTest]);
  const [nowHint, setNowHint] = useState('Horodatage pré-rempli à l’ouverture');
  const update = <K extends keyof Ge01Draft>(key: K, value: Ge01Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };
  const updateMeasure = (key: "fuelLevel" | "oilLevel" | "waterTemperature" | "batteryVoltage", value: Ge01Measure) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      delete next[`${key}Reason`];
      return next;
    });
  };

  useEffect(() => {
    if (!persistenceEnabled) return;
    let cancelled = false;
    loadDraft<Ge01Draft>(draftId).then((stored) => {
      if (cancelled) return;
      const restored = restoreGe01Draft(stored?.value);
      setDraft({ ...restored, isTest, confirmed: false });
      setDraftSaveState(stored ? "saved" : "idle");
    }).catch(() => {
      if (!cancelled) {
        setDraft(emptyDraft());
        setDraftSaveState("error");
      }
    }).finally(() => {
      if (!cancelled) setDraftReady(true);
    });
    return () => { cancelled = true; };
  }, [loadDraft, persistenceEnabled, draftId, isTest, emptyDraft]);

  useEffect(() => {
    if (!persistenceEnabled || !draftReady || hasPendingCurrentRound || submissionState !== "editing" || !draft.submissionId) return;
    const timer = window.setTimeout(() => {
      saveTimerRef.current = null;
      setDraftSaveState("saving");
      const operation = saveDraft(draftId, draft)
        .then(() => setDraftSaveState("saved"))
        .catch(() => setDraftSaveState("error"));
      pendingDraftSaveRef.current = operation;
    }, 450);
    saveTimerRef.current = timer;
    return () => {
      window.clearTimeout(timer);
      if (saveTimerRef.current === timer) saveTimerRef.current = null;
    };
  }, [draft, draftReady, persistenceEnabled, saveDraft, submissionState, draftId, hasPendingCurrentRound]);

  const visibleSubmissionState: SubmissionState = offlineSync.latestRoundReceipt?.queueId === draft.submissionId
    ? "server_confirmed"
    : submissionState;

  const progressRef = useRef<HTMLElement | null>(null);
  const formCardRef = useRef<HTMLDivElement | null>(null);
  const previousStepRef = useRef(draft.step);
  useEffect(() => {
    // Changement d'étape : ramener l'agent en haut de la nouvelle étape au lieu de le laisser en bas du formulaire.
    if (previousStepRef.current === draft.step) return;
    previousStepRef.current = draft.step;
    progressRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [draft.step]);

  const revealFirstError = () => {
    window.requestAnimationFrame(() => {
      const root = formCardRef.current;
      if (!root) return;
      const target = root.querySelector<HTMLElement>('[aria-invalid="true"], .is-invalid, .has-error, .ge-field-error');
      if (!target) return;
      target.scrollIntoView({ block: 'center', behavior: 'instant' });
      const focusable = target.matches('input, textarea, select, button, [tabindex]') ? target : target.querySelector<HTMLElement>('input:not([disabled]), textarea, select, button:not([disabled]), [tabindex="0"]');
      focusable?.focus({ preventScroll: true });
    });
  };

  const goNext = () => {
    const nextErrors = validateGe01Step(draft, draft.step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      revealFirstError();
      return;
    }
    update("step", Math.min(3, draft.step + 1));
  };

  const submit = async () => {
    if (submissionLock.current || submitting || submissionState !== "editing") return;
    const nextErrors = validateCompleteGe01Draft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      const firstError = Object.keys(nextErrors)[0];
      const fieldStep = GE01_FIELD_DEFINITIONS.find((field) => field.code === firstError)?.step;
      if (fieldStep !== undefined) update("step", fieldStep);
      flash("Le rapport contient encore des informations à compléter.");
      return;
    }
    submissionLock.current = true;
    setSubmitting(true);
    try {
      if (!persistenceEnabled) {
        setSubmissionState("demo");
        setSubmitting(false);
        return;
      }
      if (saveTimerRef.current !== null) {
        window.clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      await pendingDraftSaveRef.current?.catch(() => undefined);
      await queueGe01Draft(draft, agentName, draftId, { enqueueRound, deleteDraft });
      setSubmissionState("queued");
      setSubmitting(false);
      flash(offlineSync.online ? "Rapport placé dans la file ; transmission en cours." : "Rapport protégé localement ; envoi automatique au retour du réseau.");
    } catch (error) {
      submissionLock.current = false;
      setSubmitting(false);
      flash(`Rapport non mis en file : ${error instanceof Error ? error.message : "stockage local indisponible"}.`);
    }
  };

  const startAnother = () => {
    submissionLock.current = false;
    setSubmitting(false);
    setErrors({});
    setSubmissionState("editing");
    setDraft(emptyDraft());
    setDraftSaveState(persistenceEnabled ? "idle" : "disabled");
  };

  // C11 — abandon explicite du brouillon local, après confirmation.
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const abandonDraft = async () => {
    try {
      if (persistenceEnabled) await deleteDraft(draftId);
    } catch {
      flash("Le brouillon n’a pas pu être supprimé de cet appareil. Réessayez.");
      return;
    }
    setConfirmAbandon(false);
    setErrors({});
    setDraft(emptyDraft());
    flash("Brouillon abandonné. Aucune donnée n’a été envoyée.");
  };

  const copyRealDraft = async () => {
    const stored = await loadDraft<Ge01Draft>("ge01:daily:v1");
    if (!stored) { flash("Aucun brouillon réel à copier."); return; }
    const copy = { ...restoreGe01Draft(stored.value), submissionId: crypto.randomUUID(), isTest: true, confirmed: false };
    await saveDraft(draftId, copy);
    setDraft(copy);
    flash("Copie de recette créée. Le brouillon réel est conservé. Vérifiez les réponses puis confirmez leur caractère fictif.");
  };

  const reviewItems = buildReviewItems(draft, agentName);
  const missingCount = missingReviewCount(reviewItems);
  const reviewCounts = countReviewStatuses(reviewItems);

  const suggestedFinal = suggestFinalStatus(draft);
  const startChoices: Array<[Ge01StartOutcome, string, string]> = [
    ['success', 'Essai effectué', 'Le groupe a démarré'],
    ['failed', 'Démarrage échoué', 'Une tentative a réellement eu lieu'],
    ['not_performed', 'Essai impossible', 'Prévu, mais non réalisé ou interrompu'],
  ];
  const draftStatus = !persistenceEnabled
    ? { tone: "neutral", badge: "DÉMO SANS SAUVEGARDE", detail: "Démonstration sans persistance" }
    : draftSaveState === "loading"
      ? { tone: "blue", badge: "CHARGEMENT DU BROUILLON", detail: "Chargement du brouillon…" }
      : draftSaveState === "saving"
        ? { tone: "blue", badge: "SAUVEGARDE EN COURS", detail: "Enregistrement du brouillon…" }
        : draftSaveState === "saved"
          ? { tone: "success", badge: "BROUILLON SAUVEGARDÉ", detail: "Brouillon local sauvegardé" }
          : draftSaveState === "error"
            ? { tone: "critical", badge: "ÉCHEC SAUVEGARDE", detail: "Brouillon local non sauvegardé" }
            : { tone: "neutral", badge: "BROUILLON LOCAL", detail: "Brouillon prêt à être sauvegardé" };

  const fuelStatus = draft.fuelLevel.unavailable ? null : statusFromValue(draft.fuelLevel.value, evaluateFuel);
  const oilStatus = draft.oilLevel.unavailable ? null : statusFromValue(draft.oilLevel.value, evaluateOil);
  const waterStatus = draft.waterTemperature.unavailable ? null : statusFromValue(draft.waterTemperature.value, evaluateWater);
  const batteryStatus = draft.batteryVoltage.unavailable ? null : statusFromValue(draft.batteryVoltage.value, evaluateBattery);
  const hoursDelta = evaluateEngineHoursDelta(parseMeasure(draft.engineHours), lastContext.engineHours);
  const hoursStatus = hoursDelta.kind === 'ok' ? 'ok' : hoursDelta.kind ? 'alert' : null;

  const stampNow = () => {
    const stamp = ge01NowStamp();
    setDraft((current) => ({ ...current, date: stamp.date, time: stamp.time }));
    setErrors((current) => {
      const next = { ...current };
      delete next.date;
      delete next.time;
      return next;
    });
    setNowHint('Mis à jour à l’instant');
  };

  const updateEngineHours = (value: string) => {
    const evaluation = evaluateEngineHoursDelta(parseMeasure(value), lastContext.engineHours);
    setDraft((current) => ({
      ...current,
      engineHours: value,
      engineHoursDeltaKind: evaluation.kind,
      engineHoursDeltaNote: deltaNoteForDraft(evaluation),
    }));
    setErrors((current) => {
      if (!current.engineHours) return current;
      const next = { ...current };
      delete next.engineHours;
      return next;
    });
  };

  if (persistenceEnabled && draftReady && visibleSubmissionState === 'editing' && pendingCurrentRound && pendingCurrentRound.id !== draft.submissionId) return <>
    <Card role="status"><h3>Ronde GE-01 déjà enregistrée sur cet appareil</h3><p>Son envoi attend la confirmation du serveur. Le rapport et ses photos sont conservés ; attendez cette confirmation avant de saisir une nouvelle ronde du jour.</p></Card>
    <OfflineSyncStatus enabled online={offlineSync.online} running={offlineSync.running} counts={offlineSync.counts} latestIssue={offlineSync.latestIssue} latestRoundReceipt={null} onRetry={() => void offlineSync.retryFailed().then(() => offlineSync.synchronize())} />
  </>;

  if (visibleSubmissionState !== "editing") return <>
    <RoundPilotHeader title="GE-01 · Rapport du groupe électrogène" subtitle="Rapport conservé sans création automatique d’anomalie." badge={<Badge tone="blue">AUCUN IMPORT</Badge>} />
    <OfflineSyncStatus enabled={persistenceEnabled} online={offlineSync.online} running={offlineSync.running} counts={offlineSync.counts} latestIssue={offlineSync.latestIssue} latestRoundReceipt={Boolean(offlineSync.latestRoundReceipt?.isTest) === isTest ? offlineSync.latestRoundReceipt : null} onRetry={() => void offlineSync.retryFailed().then(() => offlineSync.synchronize())} />
    {isTest && <Badge tone="orange">RECETTE — DONNÉES FICTIVES</Badge>}
    <Card className="ge-submit-result" role="status"><span>{visibleSubmissionState === "server_confirmed" ? <BrandIcon name="check" /> : visibleSubmissionState === "queued" ? <BrandIcon name="refresh" /> : <BrandIcon name="info" />}</span><div><h3>{visibleSubmissionState === "server_confirmed" ? `Rapport ${offlineSync.latestRoundReceipt?.reportReference ?? ""} confirmé par le serveur` : visibleSubmissionState === "queued" ? "Rapport enregistré sur cet appareil" : "Simulation locale terminée"}</h3><p>{visibleSubmissionState === "server_confirmed" ? "Faustin peut désormais le consulter. Cette confirmation ne signifie pas qu’il l’a lu ou validé." : visibleSubmissionState === "queued" ? "Il sera transmis une seule fois dès que la connexion le permet." : "Aucune donnée n’a été envoyée ni présentée comme reçue par Faustin."}</p></div>{visibleSubmissionState !== "queued" ? <Button variant="secondary" onClick={startAnother}>Nouvelle ronde</Button> : null}</Card>
  </>;

  return <>
    <RoundPilotHeader title="GE-01 · Ronde quotidienne du groupe électrogène" subtitle="Quatre étapes · essai de démarrage prévu" badge={<Badge tone={draftStatus.tone}>{draftStatus.badge}</Badge>} />
    <OfflineSyncStatus enabled={persistenceEnabled} online={offlineSync.online} running={offlineSync.running} counts={offlineSync.counts} latestIssue={offlineSync.latestIssue} latestRoundReceipt={Boolean(offlineSync.latestRoundReceipt?.isTest) === isTest ? offlineSync.latestRoundReceipt : null} onRetry={() => void offlineSync.retryFailed().then(() => offlineSync.synchronize())} />
    {isTest && <Card role="status"><Badge tone="orange">RECETTE — DONNÉES FICTIVES</Badge><p>Aucun contrôle matériel réel n’est attesté.</p></Card>}
    <nav ref={progressRef} className="ge-progress" aria-label="Étapes du rapport GE-01">
      {steps.map((label, index) => <button key={label} type="button" className={index === draft.step ? 'active' : index < draft.step ? 'done' : 'is-upcoming'} aria-current={index === draft.step ? 'step' : undefined} disabled={index > draft.step} onClick={() => index <= draft.step && update('step', index)}><span>{index < draft.step ? '✓' : index + 1}</span><b>{label}</b></button>)}
    </nav>
    <section className="ge-form-layout">
      <Card className="ge-form-card">
        <div ref={formCardRef} className="ge-form-card-body">
        <div className="ge-step-head"><div><span>ÉTAPE {draft.step + 1} SUR 4</span><h3>{steps[draft.step]}</h3></div><small>{draftStatus.detail}</small></div>

        {draft.step === 0 ? <div className="ge-fields ge-context-fields">
          <ContextEquipmentCard context={lastContext} equipment={ge01Equipment} />
          <div className="ge-field-grid">
            <div className="field">
              <span>Intervenant</span>
              <div className="ge-agent-chip">
                <span className="ge-agent-avatar" aria-hidden="true">{agentInitials(agentName)}</span>
                <b>{agentName}</b>
                <BrandIcon name="lock" className="ge-agent-lock" />
              </div>
              <small>Session authentifiée</small>
            </div>
            <div className={`field ${errors.date || errors.time ? 'is-invalid' : ''}`}>
              <span>Date et heure du contrôle</span>
              <div className="ge-datetime-row">
                <input
                  id="ge01-date"
                  type="date"
                  value={draft.date}
                  aria-invalid={Boolean(errors.date)}
                  aria-label="Date du contrôle"
                  lang="fr"
                  onChange={(event) => update('date', event.target.value)}
                />
                <input
                  id="ge01-time"
                  type="time"
                  step={60}
                  value={draft.time}
                  aria-invalid={Boolean(errors.time)}
                  aria-label="Heure du contrôle"
                  lang="fr"
                  onChange={(event) => update('time', event.target.value.slice(0, 5))}
                />
                <Button variant="secondary" className="ge-now-button" onClick={stampNow}>
                  <BrandIcon name="clock" />
                  Maintenant
                </Button>
              </div>
              {errorFor(errors, 'date')}
              {errorFor(errors, 'time')}
              <small>{nowHint} · heure d’Abidjan (UTC+0). Vérifiez l’heure des anciens brouillons.</small>
            </div>
            <Field label="Heures compteur moteur" size="measure" className="ge-hours-field">
              <NumericShell
                value={draft.engineHours}
                unit="h"
                error={errors.engineHours}
                status={hoursStatus}
                describedBy="ge-hint-hours"
                onChange={updateEngineHours}
              />
              {errorFor(errors, 'engineHours')}
              <small id="ge-hint-hours" className={`ge-hours-hint is-${hoursDelta.kind || 'idle'}`}>{hoursDelta.message}</small>
            </Field>
            <StartsStepper value={draft.starts24h} error={errors.starts24h} onChange={(value) => update('starts24h', value)} />
          </div>
        </div> : null}

        {draft.step === 1 ? <div className="ge-fields ge-context-fields">
          <div className="ge-field-grid">
            <SegmentedControl
              label="État thermique du local"
              value={draft.temperatureLocal}
              options={[{ value: 'Normal', label: 'Normal' }, { value: 'Chaud', label: 'Chaud' }, { value: 'Non observé', label: 'Non vérifié' }]}
              error={errors.temperatureLocal}
              onChange={(value) => update('temperatureLocal', value)}
            />
            <SegmentedControl
              label="Propreté"
              value={draft.cleanliness}
              options={[{ value: 'Conforme', label: 'Conforme' }, { value: 'Écart constaté', label: 'Eau ou saleté' }, { value: 'Non observé', label: 'Non vérifié' }]}
              error={errors.cleanliness}
              onChange={(value) => update('cleanliness', value)}
            />
          </div>
          <div className="ge-measure-grid">
            <MeasureField label="Niveau carburant" unit="%" measure={draft.fuelLevel} lastValue={lastContext.fuelLevel} onChange={(value) => updateMeasure('fuelLevel', value)} error={errors.fuelLevel} reasonError={errors.fuelLevelReason} status={fuelStatus} hints={MEASURE_HINTS.fuel} hintId="ge-hint-fuel" />
            <MeasureField label="Niveau huile moteur" unit="%" measure={draft.oilLevel} lastValue={lastContext.oilLevel} onChange={(value) => updateMeasure('oilLevel', value)} error={errors.oilLevel} reasonError={errors.oilLevelReason} status={oilStatus} hints={MEASURE_HINTS.oil} hintId="ge-hint-oil" />
            <MeasureField label="Température eau" unit="°C" measure={draft.waterTemperature} lastValue={lastContext.waterTemperature} onChange={(value) => updateMeasure('waterTemperature', value)} error={errors.waterTemperature} reasonError={errors.waterTemperatureReason} status={waterStatus} hints={MEASURE_HINTS.water} hintId="ge-hint-water" />
            <MeasureField label="Tension batterie" unit="V" measure={draft.batteryVoltage} lastValue={lastContext.batteryVoltage} onChange={(value) => updateMeasure('batteryVoltage', value)} error={errors.batteryVoltage} reasonError={errors.batteryVoltageReason} status={batteryStatus} hints={MEASURE_HINTS.battery} hintId="ge-hint-battery" />
          </div>
          <div className="ge-field-grid">
            <BooleanObservation label="Bruit ou vibrations" value={draft.abnormalNoise} onChange={(value) => update('abnormalNoise', value)} error={errors.abnormalNoise} yesLabel="Présents" noLabel="Absents" />
            <SegmentedControl
              label="Fumée"
              value={draft.smoke}
              columns={4}
              options={[{ value: 'Aucune', label: 'Normale' }, { value: 'Noire', label: 'Noire' }, { value: 'Blanche', label: 'Blanche' }, { value: 'Non observée', label: 'Non vue' }]}
              error={errors.smoke}
              onChange={(value) => update('smoke', value)}
            />
          </div>
          {draft.abnormalNoise === 'yes' || draft.smoke === 'Noire' || draft.smoke === 'Blanche' ? (
            <div className="ge-photo-hint" role="status">
              <BrandIcon name="camera" />
              <div>
                <b>Photo recommandée</b>
                <p>Un bruit présent ou une fumée noire/blanche gagne à être documenté.</p>
              </div>
<small>Joignez la photo à l’étape de vérification.</small>
            </div>
          ) : null}
        </div> : null}

        {draft.step === 2 ? <div className="ge-fields ge-context-fields">
          <div className="ge-step-inline-ref">
            <b>Résultat de l’essai de démarrage</b>
            <small>Dernier essai : {lastStartLabel(lastContext.lastStartOutcome)}{lastContext.performedOn ? ` · ${formatShortDate(lastContext.performedOn)}` : ''}</small>
          </div>
          <fieldset className={`ge-choice-field ${errors.startOutcome ? 'has-error' : ''}`}>
            <legend className="visually-hidden">Résultat de l’essai</legend>
            <div className="ge-start-grid">{startChoices.map(([choice, label, detail]) => <button type="button" key={choice} className={draft.startOutcome === choice ? 'selected' : ''} aria-pressed={draft.startOutcome === choice} onClick={() => update('startOutcome', choice)}><b>{label}</b><small>{detail}</small></button>)}</div>
            {errorFor(errors, 'startOutcome')}
          </fieldset>
          {draft.startOutcome === 'success' ? <div className="ge-field-grid">
            <div className={`field ${errors.testStartTime ? 'is-invalid' : ''}`}>
              <span>Heure de l’essai</span>
              <input type="time" step={60} value={draft.testStartTime} aria-invalid={Boolean(errors.testStartTime)} onChange={(event) => update('testStartTime', event.target.value.slice(0, 5))} />
              {errorFor(errors, 'testStartTime')}
            </div>
            <BooleanObservation label="Retour en AUTO après l’essai" value={draft.returnAuto} onChange={(value) => update('returnAuto', value)} error={errors.returnAuto} restLabel="Non vérifié" />
          </div> : null}
          {draft.startOutcome === 'failed' ? <>
            <p className="ge-emergency-note" role="status">Remonté au FM comme urgence potentielle. Aucune durée fictive n’est enregistrée.</p>
            <div className="ge-field-grid">
              <CountStepper label="Tentatives" groupLabel="Nombre de tentatives" value={draft.startAttempts} error={errors.startAttempts} min={0} ariaMinus="Retirer une tentative" ariaPlus="Ajouter une tentative" onChange={(value) => update('startAttempts', value)} />
              <Field label="Symptôme constaté" size="standard">
                <input value={draft.startSymptom} aria-invalid={Boolean(errors.startSymptom)} onChange={(event) => update('startSymptom', event.target.value)} placeholder="Décrivez uniquement ce qui a été observé" />
                {errorFor(errors, 'startSymptom')}
              </Field>
            </div>
          </> : null}
          {draft.startOutcome === 'not_performed' ? <Field label="Motif de l’essai impossible" size="long"><textarea value={draft.testExceptionReason} aria-invalid={Boolean(errors.testExceptionReason)} onChange={(event) => update('testExceptionReason', event.target.value)} placeholder="Décrivez la situation sans inventer de procédure" />{errorFor(errors, 'testExceptionReason')}<small>Aucune durée ni échec ne sera enregistré.</small></Field> : null}
          {draft.startOutcome === 'success' && <Field label="Durée réelle de l’essai (min)"><input inputMode="decimal" value={draft.testDuration} onChange={event=>update('testDuration',event.target.value)} />{errorFor(errors,'testDuration')}</Field>}
          {draft.startOutcome && draft.startOutcome !== 'not_performed' && <>
            <BooleanObservation label="Fonctionnement correct pendant l’essai" value={draft.functioningCorrect} onChange={value=>update('functioningCorrect',value)} error={errors.functioningCorrect} />
            {draft.startOutcome === 'failed' && <BooleanObservation label="Retour AUTO après essai" value={draft.returnAuto} onChange={value=>update('returnAuto',value)} error={errors.returnAuto} />}
          </>}
          <div className="ge-auto-divider"><b>État actuel des automatismes</b><small>Distinct du retour AUTO après l’essai.</small></div>
          <div className="ge-field-grid">
            <BooleanObservation label="Groupe actuellement en AUTO" value={draft.geAuto} onChange={(value) => update('geAuto', value)} error={errors.geAuto} warning="Le groupe n’est pas en AUTO. Signalez-le au Facility Manager." />
            <BooleanObservation label="ATS actuellement en AUTO" value={draft.atsAuto} onChange={(value) => update('atsAuto', value)} error={errors.atsAuto} warning="L’ATS n’est pas en AUTO. Signalez-le au Facility Manager." />
          </div>
          <div className="ge-field-grid">
            <div>
              <SegmentedControl
                label="Alarme du contrôleur MC4"
                value={draft.alarmMc4}
                options={[{ value: 'Aucune alarme', label: 'Aucune' }, { value: 'Alarme affichée', label: 'Active' }, { value: 'Non observée', label: 'Non vérifié' }]}
                error={errors.alarmMc4}
                onChange={(value) => update('alarmMc4', value)}
              />
              {draft.alarmMc4 === 'Alarme affichée' ? <Field label="Code ou texte affiché" size="standard"><input value={draft.alarmDetails} aria-invalid={Boolean(errors.alarmDetails)} onChange={(event) => update('alarmDetails', event.target.value)} />{errorFor(errors, 'alarmDetails')}</Field> : null}
            </div>
            <div className="ge-dmc-line">
              <b>Entretien mensuel DMC</b>
              <p>Non applicable à ce contrôle quotidien.</p>
              <small>Prochaine date : {lastContext.dmcNextDate ? formatShortDate(lastContext.dmcNextDate) : '—'}</small>
            </div>
          </div>
        </div> : null}

        {draft.step === 3 ? <div className="ge-fields ge-context-fields">
          <div className="ge-review-hero">
            <div>
              <span>Contrôle</span>
              <b>GE-01 · {draft.date ? formatReviewDate(draft.date) : '—'} · {draft.time || '—'}</b>
              <small>{agentName}</small>
            </div>
            <ul className="ge-review-counts">
              <li className="is-ok"><b>{reviewCounts.ok}</b><span>Conforme{reviewCounts.ok > 1 ? 's' : ''}</span></li>
              <li className="is-alert"><b>{reviewCounts.alert}</b><span>Alerte{reviewCounts.alert > 1 ? 's' : ''}</span></li>
              <li className="is-critical"><b>{reviewCounts.critical}</b><span>Critique{reviewCounts.critical > 1 ? 's' : ''}</span></li>
              <li className="is-unverified"><b>{reviewCounts.unverified}</b><span>Non vérifié{reviewCounts.unverified > 1 ? 's' : ''}</span></li>
            </ul>
          </div>
          {missingCount ? <p className="ge-missing-summary">{missingCount} information{missingCount > 1 ? 's' : ''} manquante{missingCount > 1 ? 's' : ''} — <a href={`#ge-review-${reviewItems.find((item) => item.status === 'missing')?.id ?? ''}`}>voir les lignes marquées Manquant</a>.</p> : <p className="ge-ready-summary">Toutes les réponses obligatoires sont renseignées.</p>}
          <ul className="ge-review-list">
            {reviewItems.map((item) => (
              <li key={item.id} id={`ge-review-${item.id}`} className={item.status === 'missing' ? 'is-missing' : ''}>
                <div>
                  <span>{item.label}</span>
                  <b>{item.value}</b>
                </div>
                {item.status === 'missing' ? <Badge tone="orange">Manquant</Badge> : item.status === 'ok' ? <Badge tone="success">OK</Badge> : item.status === 'alert' ? <Badge tone="orange">Alerte</Badge> : item.status === 'critical' ? <Badge tone="critical">Critique</Badge> : item.status === 'na' ? <Badge tone="neutral">N/A</Badge> : item.status === 'unverified' ? <Badge tone="neutral">Non vérifié</Badge> : null}
                <Button variant="secondary" className="ge-review-edit" onClick={() => update('step', item.step)}>Modifier</Button>
              </li>
            ))}
          </ul>
          <div>
            <SegmentedControl
              label="État final déclaré"
              value={draft.finalStatus}
              options={FINAL_STATUS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
              error={errors.finalStatus}
              onChange={(value) => update('finalStatus', value)}
            />
            {suggestedFinal ? <small className="ge-suggestion">Suggestion calculée : {FINAL_STATUS_OPTIONS.find((option) => option.value === suggestedFinal)?.label}. Non présélectionnée.</small> : null}
          </div>
          <div className="ge-comment-photo">
            <Field label="Commentaire facultatif" size="long"><textarea value={draft.comment} onChange={(event) => update('comment', event.target.value)} placeholder="Ajoutez une précision utile, sans recopier toutes les réponses" /></Field>
          </div>
          {(ge01HasAnomaly(draft)||(draft.evidence?.length??0)>0)&&<><Ge01EvidencePicker persistent={persistenceEnabled} value={draft.evidence ?? []} onChange={value => update('evidence', value)} />{ge01HasAnomaly(draft)&&!draft.evidence?.some(p=>p.purpose==='defect')&&<Field label="Photo impossible — motif obligatoire"><textarea maxLength={2000} value={draft.photoExceptionReason??''} onChange={e=>update('photoExceptionReason',e.target.value)}/></Field>}</>}
          {!ge01HasAnomaly(draft)&&<p>Aucune photo requise pour un contrôle sans anomalie.</p>}
          {draft.photos.length > 0 && <p role="status">Ancien brouillon : les noms {draft.photos.join(', ')} ne contiennent aucun fichier. Sélectionnez à nouveau ces photos.</p>}
          <label className="ge-confirmation"><input type="checkbox" checked={draft.confirmed} onChange={(event) => update('confirmed', event.target.checked)} /><span>{isTest ? 'Je confirme que ces données sont fictives et servent uniquement à la recette de l’application.' : 'Je confirme que ces informations correspondent au contrôle réellement effectué.'}</span></label>
          {errorFor(errors, 'confirmed')}
          {Object.keys(errors).length ? <p className="ge-missing-summary" role="alert">{Object.keys(errors).length} erreur{Object.keys(errors).length > 1 ? 's' : ''} à corriger avant l’envoi.</p> : null}
        </div> : null}

        <div className="ge-actions"><Button variant="secondary" disabled={draft.step === 0 || submitting} onClick={() => update('step', Math.max(0, draft.step - 1))}>Précédent</Button><p><span className={`status-dot ${persistenceEnabled && offlineSync.online ? "online" : "local"}`} /> {persistenceEnabled ? offlineSync.online ? "Enregistrement local · réseau disponible" : "Enregistrement local · hors connexion" : "Simulation locale sans sauvegarde"}</p>{draft.step < 3 ? <Button disabled={!draftReady || submitting} onClick={goNext}>Continuer</Button> : <Button disabled={!draftReady || submitting} aria-busy={submitting} onClick={submit}>{submitting ? 'Transmission…' : 'Transmettre à Facility Manager'}</Button>}</div>
        <div className="ge-abandon">
          {confirmAbandon ? <div className="vendor-cancel-confirm" role="alertdialog" aria-label="Abandonner le brouillon ?">
            <p>Abandonner ce brouillon ? Toutes les réponses saisies sur cet appareil seront effacées. Rien n’a été envoyé.</p>
            <button type="button" className="secondary-button" onClick={() => setConfirmAbandon(false)}>Garder le brouillon</button>
            <button type="button" className="danger-button" onClick={() => void abandonDraft()}>Abandonner</button>
          </div> : <button type="button" className="ghost-button ge-abandon-button" disabled={submitting} onClick={() => setConfirmAbandon(true)}>Abandonner le brouillon</button>}
        </div>
        </div>
      </Card>
      <aside className="ge-form-aside"><Card><p className="design-kicker">CONTRÔLE QUOTIDIEN</p><h3>Essai de démarrage prévu</h3><p>Une tentative échouée et un essai impossible ne produisent jamais la même réponse.</p></Card><Card><p className="design-kicker">APRÈS L’ENVOI</p><ol><li><span>1</span>Rapport confirmé par le serveur</li><li><span>2</span>Lecture de toutes les réponses par Facility Manager</li><li><span>3</span>Qualification ultérieure si nécessaire</li></ol><small>Aucune intervention n’est créée automatiquement.</small></Card></aside>
    </section>
  </>;
}

function formatMoment(value: string | null) {
  if (!value) return "Non disponible";
  return new Intl.DateTimeFormat("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "Africa/Abidjan" }).format(new Date(value));
}

function reviewStatusLabel(report: OperationalReport) {
  if (report.review) return report.review.decision === "conform" ? "Examiné — conforme" : "Examiné — anomalie ouverte";
  return report.reportStatus === "submitted" ? "Transmis — en attente d’examen" : "Rapport déjà traité";
}

export function Ge01ReportInbox({ reports, connected, onReview, onRead, onLoadProof, planning, onAssign, onOpenAnomaly, onRefresh }: {
  reports: OperationalReport[]; connected: boolean; onReview?: Ge01ReviewHandler;
  planning?: Ge01Operations; onAssign?: Ge01AssignmentHandler;
  onRead?: (report: OperationalReport) => Promise<void>; onLoadProof?: Ge01ProofLoader;
  onOpenAnomaly?: (reference: string) => void; onRefresh?: () => void;
}) {
  const geReports = useMemo(() => reports.filter((report) => report.equipmentCode === "GE-01"), [reports]);
  const [readError, setReadError] = useState('');
  const [reading, setReading] = useState(false);
  const [filter, setFilter] = useState<"all" | "issues" | "clear">("all");
  const filtered = geReports.filter((report) => {
    const hasIssues = report.checks.some((check) => check.status === "alert" || check.status === "critical");
    return filter === "all" || (filter === "issues" ? hasIssues : !hasIssues);
  });
  const [selectedId, setSelectedId] = useState(geReports[0]?.id ?? "");
  const selected = filtered.find((report) => report.id === selectedId) ?? filtered[0];
  const detailHeading = useRef<HTMLHeadingElement>(null);
  const [openRequest, setOpenRequest] = useState(0);
  useEffect(() => {
    if (!openRequest) return;
    detailHeading.current?.focus({ preventScroll: true });
    detailHeading.current?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }, [openRequest]);

  return <>
    <section className="section-heading ge-heading">
      <div><p className="design-kicker">RAPPORTS GE-01 · RÉCEPTION FAUSTIN</p><h2 className="visually-hidden">Rapports du groupe électrogène</h2><p>Tous les contrôles transmis sont consultables, avec leurs valeurs brutes. La consultation ne vaut pas validation.</p></div>
      {onRefresh ? <Button variant="secondary" onClick={onRefresh}>Actualiser la file</Button> : null}
    </section>
    {connected && planning && <Ge01Planning planning={planning} onAssign={onAssign} />}
    <div className="ge-inbox-filters" role="group" aria-label="Filtrer les rapports">
      {([['all', `Tous (${geReports.length})`], ['issues', 'Avec écart'], ['clear', 'Sans écart']] as const).map(([key, label]) => <button key={key} className={filter === key ? "active" : ""} onClick={() => setFilter(key)}>{label}</button>)}
    </div>
    {!connected ? <Card className="ge-empty-state"><span><BrandIcon name="info" /></span><div><h3>Rapports serveur indisponibles</h3><p>La consultation nécessite une session autorisée et le chargement des données serveur. Aucun rapport fictif n’est présenté comme reçu.</p></div></Card> : geReports.length === 0 ? <Card className="ge-empty-state"><span><BrandIcon name="check" /></span><div><h3>Aucun rapport GE-01 transmis</h3><p>La file affichera ici les contrôles conformes comme ceux qui comportent un écart.</p></div></Card> : filtered.length === 0 ? <Card className="ge-empty-state"><span><BrandIcon name="activity" /></span><div><h3>Aucun résultat pour ce filtre</h3><p>Les autres rapports restent disponibles dans la file complète.</p></div></Card> : <section className="ge-inbox-layout">
      <Card className="ge-report-list" aria-label="Rapports GE-01 transmis">
        {filtered.map((report) => <button key={report.id} className={selected?.id === report.id ? "active" : ""} aria-controls="ge01-report-detail" onClick={() => { setSelectedId(report.id); setOpenRequest(value => value + 1); }}>
          <span className="ge-report-mark">GE</span>
          <div><b>{report.reference}</b>{report.isTest && <Badge tone="orange">RECETTE — DONNÉES FICTIVES</Badge>}<small>{formatMoment(report.performedAt)} · {report.reportedBy}</small><em>{reportStatusLabel(report)}</em><small>{reviewStatusLabel(report)}</small></div>
          <span aria-hidden="true"><BrandIcon name="chevronRight" /></span>
        </button>)}
      </Card>
      {selected ? <Card className="ge-report-detail" id="ge01-report-detail" aria-labelledby="ge01-report-detail-title">
        <div className="ge-report-detail-head"><div><p className="design-kicker">CONFIRMÉ PAR LE SERVEUR</p><h3 id="ge01-report-detail-title" ref={detailHeading} tabIndex={-1}>{selected.reference}</h3>{selected.isTest && <Badge tone="orange">RECETTE — DONNÉES FICTIVES</Badge>}<p>Contrôle : {formatMoment(selected.performedAt)} · Envoi : {formatMoment(selected.submittedAt)}</p></div><Badge tone={selected.checks.some((check) => check.status === "alert" || check.status === "critical") ? "orange" : "success"}>{reportStatusLabel(selected)}</Badge></div>
        <dl className="ge-report-meta"><div><dt>Agent</dt><dd>{selected.reportedBy}</dd></div><div><dt>Équipement</dt><dd>GE-01 · {selected.equipmentLabel}</dd></div><div><dt>Statut serveur</dt><dd>{reviewStatusLabel(selected)}</dd></div></dl>
        <div className="ge-report-checks">
          {GE01_FIELD_DEFINITIONS.map((field) => {
            const check = selected.checks.find((item) => item.code === field.code);
            return <div key={field.code} className={check?.status === "alert" || check?.status === "critical" ? "has-issue" : check?.status === "not_applicable" || check?.status === "not_checked" ? "is-neutral" : ""}>
              <dt>{field.label}</dt>
              <dd>{check ? formatGe01CheckValue(check) : "Réponse absente"}</dd>
              <small>{check?.status === "alert" || check?.status === "critical" ? "Écart déclaré par l’agent" : check?.status === "not_applicable" ? "Non applicable au quotidien" : check?.status === "not_checked" ? "Non observé ou non qualifié" : "Valeur déclarée par l’agent"}</small>
            </div>;
          })}
        </div>
        {selected.checks.find(c=>c.code==='PHOTO_EXCEPTION')?.valueText&&<p><strong>Photo impossible :</strong> {selected.checks.find(c=>c.code==='PHOTO_EXCEPTION')?.valueText}</p>}
        {selected.analysis ? <div className="ge-report-comment"><b>Commentaire facultatif</b><p>{selected.analysis}</p></div> : null}
        {selected.ge01Status && <Ge01EvidenceGallery key={selected.id} status={selected.ge01Status} onLoad={onLoadProof} />}
        {selected.ge01Status?.readAt ? <p>Lu par le FM le {formatMoment(selected.ge01Status.readAt)} (Abidjan).</p> : onRead && <Button variant="secondary" disabled={reading} onClick={async () => {
          setReading(true); setReadError('');
          try { await onRead(selected); } catch (error) { setReadError(error instanceof Error ? error.message : 'Lecture non enregistrée.'); } finally { setReading(false); }
        }}>J’ai lu ce rapport</Button>}
        {readError && <p role="alert">{readError}</p>}
        <Ge01ReviewPanel key={`${selected.id}:${selected.updatedAt}`} report={selected} onReview={onReview} onOpenAnomaly={onOpenAnomaly} />
      </Card> : null}
    </section>}
  </>;
}


function reportStatusLabel(report: OperationalReport) {
  const issueCount = report.checks.filter((check) => check.status === "alert" || check.status === "critical").length;
  return issueCount ? `${issueCount} écart${issueCount > 1 ? "s" : ""} déclaré${issueCount > 1 ? "s" : ""}` : "Sans écart déclaré";
}
