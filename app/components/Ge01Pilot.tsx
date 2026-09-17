'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';

import {
  createEmptyGe01Draft,
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
  lastStartLabel,
  readLastConfirmedGe01,
  writeLastConfirmedGe01,
  type Ge01LastContext,
} from '../lib/ge01/lastContext';
import {
  buildReviewItems,
  countMeasureStatuses,
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
import { MetierStatusBadge, SegmentedControl, useDemoScoreScenario } from './shared';
import type { EquipmentCard } from '../lib/ui-contract/building-health.ts';
import { controlValidityLabel, formatDayTime } from '../lib/ui-contract/display.ts';
import { EQUIPMENT_META, demoHomeSnapshot, sessionForAudience } from '../lib/ui-contract/fixtures.ts';


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

function CountStepper({
  label,
  value,
  error,
  hint,
  min = 0,
  ariaMinus,
  ariaPlus,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  min?: number;
  ariaMinus: string;
  ariaPlus: string;
  onChange: (value: string) => void;
}) {
  const count = Math.max(min, Math.trunc(Number(value) || 0));
  return (
    <div className={`field ${error ? 'is-invalid' : ''}`}>
      <span>{label}</span>
      <div className="ge-stepper">
        <button type="button" className="ge-stepper-btn" aria-label={ariaMinus} onClick={() => onChange(String(Math.max(min, count - 1)))}>−</button>
        <span className="ge-stepper-value" aria-live="polite">{value === '' ? 0 : count}</span>
        <button type="button" className="ge-stepper-btn" aria-label={ariaPlus} onClick={() => onChange(String(count + 1))}>+</button>
      </div>
      {error ? <small className="ge-field-error" role="alert">{error}</small> : null}
      {hint ? <small>{hint}</small> : null}
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
      label="Démarrages dernières 24 h"
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
  value,
  unit,
  integer = false,
  disabled,
  error,
  status,
  describedBy,
  onChange,
}: {
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
  const current = parseMeasure(measure.value);
  const delta = measure.unavailable ? '' : formatMeasureDelta(current, lastValue, unit);
  return <div className={`ge-measure-field ${error || reasonError ? 'has-error' : ''}`}>
    <div className="ge-measure-head">
      <span>{label}</span>
      {!measure.unavailable && status ? <Badge tone={badgeTone[status]}>{statusLabel[status]}</Badge> : null}
    </div>
    <NumericShell
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

export function Ge01AgentForm({ agentName }: { agentName: string }) {
  const draftId = 'ge01:daily:v1';
  const drafts = useRef(new Map<string, Ge01Draft>());
  const [draft, setDraft] = useState<Ge01Draft>(() => createEmptyGe01Draft(new Date(), crypto.randomUUID()));
  const [draftReady, setDraftReady] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<DraftSaveState>('loading');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submissionState, setSubmissionState] = useState<SubmissionState>('editing');
  const [lastContext, setLastContext] = useState<Ge01LastContext>(DEMO_LAST_CONFIRMED);
  const [nowHint, setNowHint] = useState('Horodatage pré-rempli à l’ouverture');
  const submissionLock = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const { scenario } = useDemoScoreScenario();
  const ge01Equipment = demoHomeSnapshot(sessionForAudience('electricite', agentName), scenario).equipment.find((item) => item.code === 'GE-01') ?? null;

  const update = <K extends keyof Ge01Draft>(key: K, value: Ge01Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key as string]) return current;
      const next = { ...current };
      delete next[key as string];
      return next;
    });
  };
  const updateMeasure = (key: 'fuelLevel' | 'oilLevel' | 'waterTemperature' | 'batteryVoltage', value: Ge01Measure) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key];
      delete next[`${key}Reason`];
      return next;
    });
  };

  useEffect(() => {
    const stored = drafts.current.get(draftId);
    setDraft(restoreGe01Draft(stored, new Date(), () => crypto.randomUUID()));
    setDraftSaveState(stored ? 'saved' : 'idle');
    setDraftReady(true);
    setLastContext(readLastConfirmedGe01(window.localStorage));
  }, []);

  useEffect(() => {
    if (!draftReady || submissionState !== 'editing' || !draft.submissionId) return;
    const timer = window.setTimeout(() => {
      drafts.current.set(draftId, draft);
      setDraftSaveState('saved');
    }, 450);
    saveTimerRef.current = timer;
    return () => window.clearTimeout(timer);
  }, [draft, draftReady, submissionState]);

  const goNext = () => {
    const prepared = draft.step === 0 && draft.starts24h === ''
      ? { ...draft, starts24h: '0' }
      : draft;
    if (prepared !== draft) setDraft(prepared);
    const nextErrors = validateGe01Step(prepared, prepared.step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    update('step', Math.min(3, prepared.step + 1));
  };

  const submit = () => {
    if (submissionLock.current || submitting || submissionState !== 'editing') return;
    const nextErrors = validateCompleteGe01Draft(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    submissionLock.current = true;
    setSubmitting(true);
    const hours = parseMeasure(draft.engineHours);
    writeLastConfirmedGe01({
      engineHours: hours,
      performedOn: draft.date,
      controlStatus: draft.finalStatus === 'Opérationnel' ? 'ok' : draft.finalStatus ? 'anomalie' : lastContext.controlStatus,
      location: lastContext.location,
      building: lastContext.building,
      fuelLevel: draft.fuelLevel.unavailable ? lastContext.fuelLevel : parseMeasure(draft.fuelLevel.value),
      oilLevel: draft.oilLevel.unavailable ? lastContext.oilLevel : parseMeasure(draft.oilLevel.value),
      waterTemperature: draft.waterTemperature.unavailable ? lastContext.waterTemperature : parseMeasure(draft.waterTemperature.value),
      batteryVoltage: draft.batteryVoltage.unavailable ? lastContext.batteryVoltage : parseMeasure(draft.batteryVoltage.value),
      lastStartOutcome: draft.startOutcome || lastContext.lastStartOutcome,
      dmcNextDate: lastContext.dmcNextDate,
    }, window.localStorage);
    setLastContext(readLastConfirmedGe01(window.localStorage));
    setSubmissionState('queued');
    setSubmitting(false);
  };

  const startAnother = () => {
    submissionLock.current = false;
    setSubmitting(false);
    setErrors({});
    setSubmissionState('editing');
    setDraft(createEmptyGe01Draft(new Date(), crypto.randomUUID()));
    setDraftSaveState('idle');
    setNowHint('Horodatage pré-rempli à l’ouverture');
  };

  const reviewItems = buildReviewItems(draft, agentName);
  const missingCount = missingReviewCount(reviewItems);
  const measureCounts = countMeasureStatuses(draft);
  const suggestedFinal = suggestFinalStatus(draft);
  const startChoices: Array<[Ge01StartOutcome, string, string]> = [
    ['success', 'Essai effectué', 'Le groupe a démarré'],
    ['failed', 'Démarrage échoué', 'Une tentative a réellement eu lieu'],
    ['not_performed', 'Essai impossible', 'Prévu, mais non réalisé ou interrompu'],
  ];
  const draftStatus = draftSaveState === 'loading'
    ? { tone: 'blue' as const, badge: 'CHARGEMENT DU BROUILLON', detail: 'Chargement du brouillon…' }
    : draftSaveState === 'saved'
      ? { tone: 'success' as const, badge: 'BROUILLON SAUVEGARDÉ', detail: 'Brouillon local sauvegardé' }
      : { tone: 'neutral' as const, badge: 'BROUILLON LOCAL', detail: 'Brouillon prêt à être sauvegardé' };

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

  if (submissionState !== 'editing') return <>
    <section className="section-heading ge-heading"><div><p className="design-kicker">RONDE QUOTIDIENNE · GE-01</p><h2 className="visually-hidden">Rapport du groupe électrogène</h2><p>Rapport conservé sans création automatique d’anomalie.</p></div><Badge tone="blue">FILE D’ENVOI</Badge></section>
    <Card className="ge-submit-result" role="status"><span>i</span><div><h3>Placé dans la file d’envoi · en attente de confirmation serveur</h3><p>Le rapport reste disponible hors ligne sur cet appareil.</p></div><Button variant="secondary" onClick={startAnother}>Nouvelle ronde</Button></Card>
  </>;

  return <>
    <section className="section-heading ge-heading">
      <div><p className="design-kicker">PILOTE TERRAIN · GE-01</p><h2 className="visually-hidden">Ronde quotidienne du groupe électrogène</h2><p>Contrôle quotidien en quatre étapes. L’essai de démarrage est prévu ; aucune réponse n’est présélectionnée.</p></div>
      <Badge tone={draftStatus.tone}>{draftStatus.badge}</Badge>
    </section>
    <section className="sync-banner is-online" role="status">
      <span className="status-dot online" />
      <div><b>Toutes les saisies sont synchronisées</b><small>File de cet appareil · aucune donnée terrain en attente sur cette session.</small></div>
    </section>
    <nav className="ge-progress" aria-label="Étapes du rapport GE-01">
      {steps.map((label, index) => <button key={label} className={index === draft.step ? 'active' : index < draft.step ? 'done' : ''} aria-current={index === draft.step ? 'step' : undefined} onClick={() => index <= draft.step && update('step', index)}><span>{index < draft.step ? '✓' : index + 1}</span><b>{label}</b></button>)}
    </nav>
    <section className="ge-form-layout">
      <Card className="ge-form-card">
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
              <small>{nowHint}</small>
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
              <label className="secondary-button ge-photo-button">
                Ajouter une photo
                <input className="visually-hidden" type="file" accept="image/*" onChange={(event) => {
                  const files = Array.from(event.target.files ?? []).map((file) => file.name);
                  if (files.length) update('photos', [...draft.photos, ...files]);
                  event.target.value = '';
                }} />
              </label>
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
              <CountStepper label="Tentatives" value={draft.startAttempts} error={errors.startAttempts} min={0} ariaMinus="Retirer une tentative" ariaPlus="Ajouter une tentative" onChange={(value) => update('startAttempts', value)} />
              <Field label="Symptôme constaté" size="standard">
                <input value={draft.startSymptom} aria-invalid={Boolean(errors.startSymptom)} onChange={(event) => update('startSymptom', event.target.value)} placeholder="Décrivez uniquement ce qui a été observé" />
                {errorFor(errors, 'startSymptom')}
              </Field>
            </div>
          </> : null}
          {draft.startOutcome === 'not_performed' ? <Field label="Motif de l’essai impossible" size="long"><textarea value={draft.testExceptionReason} aria-invalid={Boolean(errors.testExceptionReason)} onChange={(event) => update('testExceptionReason', event.target.value)} placeholder="Décrivez la situation sans inventer de procédure" />{errorFor(errors, 'testExceptionReason')}<small>Aucune durée ni échec ne sera enregistré.</small></Field> : null}
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
              <b>GE-01 · {draft.date || '—'} · {draft.time || '—'}</b>
              <small>{agentName}</small>
            </div>
            <ul className="ge-review-counts">
              <li className="is-ok"><b>{measureCounts.ok}</b><span>OK</span></li>
              <li className="is-alert"><b>{measureCounts.alert}</b><span>Alertes</span></li>
              <li className="is-critical"><b>{measureCounts.critical}</b><span>Critiques</span></li>
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
                {item.status === 'missing' ? <Badge tone="orange">Manquant</Badge> : item.status === 'ok' ? <Badge tone="success">OK</Badge> : item.status === 'alert' ? <Badge tone="orange">Alerte</Badge> : item.status === 'critical' ? <Badge tone="critical">Critique</Badge> : item.status === 'na' ? <Badge tone="neutral">N/A</Badge> : null}
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
            <label className="secondary-button ge-photo-button">
              <BrandIcon name="camera" />
              Ajouter une photo
              <input className="visually-hidden" type="file" accept="image/*" onChange={(event) => {
                const files = Array.from(event.target.files ?? []).map((file) => file.name);
                if (files.length) update('photos', [...draft.photos, ...files]);
                event.target.value = '';
              }} />
            </label>
          </div>
          {draft.photos.length ? <small className="ge-photo-list">{draft.photos.length} photo{draft.photos.length > 1 ? 's' : ''} jointe{draft.photos.length > 1 ? 's' : ''} localement : {draft.photos.join(', ')}</small> : null}
          <label className="ge-confirmation"><input type="checkbox" checked={draft.confirmed} onChange={(event) => update('confirmed', event.target.checked)} /><span>Je confirme que ces informations correspondent au contrôle réellement effectué.</span></label>
          {errorFor(errors, 'confirmed')}
          {Object.keys(errors).length ? <p className="ge-missing-summary" role="alert">{Object.keys(errors).length} erreur{Object.keys(errors).length > 1 ? 's' : ''} à corriger avant l’envoi.</p> : null}
        </div> : null}

        <div className="ge-actions"><Button variant="secondary" disabled={draft.step === 0 || submitting} onClick={() => update('step', Math.max(0, draft.step - 1))}>Précédent</Button><p><span className="status-dot online" /> Enregistrement local · réseau disponible</p>{draft.step < 3 ? <Button disabled={submitting} onClick={goNext}>Continuer</Button> : <Button disabled={submitting} aria-busy={submitting} onClick={submit}>{submitting ? 'Transmission…' : 'Transmettre à Facility Manager'}</Button>}</div>
      </Card>
      <aside className="ge-form-aside"><Card><p className="design-kicker">CONTRÔLE QUOTIDIEN</p><h3>Essai de démarrage prévu</h3><p>Une tentative échouée et un essai impossible ne produisent jamais la même réponse.</p></Card><Card><p className="design-kicker">APRÈS L’ENVOI</p><ol><li><span>1</span>Rapport confirmé par le serveur</li><li><span>2</span>Lecture de toutes les réponses par Facility Manager</li><li><span>3</span>Qualification ultérieure si nécessaire</li></ol><small>Aucune intervention n’est créée automatiquement.</small></Card></aside>
    </section>
  </>;
}
