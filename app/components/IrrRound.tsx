'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Field } from './ui';
import { RoundPilotHeader } from './shared';
import { RoundDateTimeFields } from './shared/RoundDateTimeFields';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { reasonProblem } from '../lib/input-rules';
import type { useOfflineSync } from '../lib/offline/useOfflineSync';
import {
  emptyIrrDraft, IRR_FIELDS, IRR_STEPS, irrChecks, irrFindings, irrMissing, irrPressureState,
  type IrrDraft, type IrrField,
} from '../lib/irr/report';

type OfflineSyncApi = ReturnType<typeof useOfflineSync>;
const message = (error: unknown) => error instanceof Error ? error.message : 'Opération impossible sur cet appareil.';

function IrrQuestion({ field, draft, onAnswer, onReason }: {
  field: IrrField; draft: IrrDraft; onAnswer: (code: string, value: string) => void; onReason: (code: string, value: string) => void;
}) {
  const [code, label, type, , hint] = field;
  const value = draft.answers[code] ?? '';
  const unverified = value === 'unknown';
  const options: [string, string][] = type === 'bool' ? [['yes', 'Oui'], ['no', 'Non']] : type === 'bar' ? [] : type.split('|').map((item) => [item, item]);
  const pressureState = type === 'bar' && !unverified ? irrPressureState(value) : 'missing';
  return <div className={`wilo-field irr-field ${unverified ? 'is-unverified' : ''}`}>
    {type === 'bar'
      ? <Field label={`${label} (bar)`}><input inputMode="decimal" value={unverified ? '' : value} disabled={unverified} onChange={(e) => onAnswer(code, e.target.value)} /></Field>
      : <>
        <span className="field-label" id={`irr-${code}`}>{label}</span>
        <div className="choice-set" role="group" aria-labelledby={`irr-${code}`}>
          {options.map(([option, text]) => <button key={option} type="button" className={`choice-chip ${value === option ? 'is-selected' : ''}`} aria-pressed={value === option} onClick={() => onAnswer(code, value === option ? '' : option)}>{text}</button>)}
          <button type="button" className={`choice-chip ${unverified ? 'is-selected' : ''}`} aria-pressed={unverified} onClick={() => onAnswer(code, unverified ? '' : 'unknown')}>Non vérifié</button>
        </div>
      </>}
    {type === 'bar' && <label className="wilo-unverified-toggle"><input type="checkbox" checked={unverified} onChange={(e) => onAnswer(code, e.target.checked ? 'unknown' : '')} /> Mesure impossible à relever</label>}
    {pressureState === 'alert' && <p className="measure-alert" role="status">Pression hors plage attendue : un constat sera proposé au FM.</p>}
    {pressureState === 'critical' && <p className="measure-alert" role="status">Pression critique (moins de 0,5 bar) : un constat urgent sera proposé au FM.</p>}
    {hint && <small className="field-hint">{hint}</small>}
    {!value && <small className="field-hint">À renseigner pendant la ronde.</small>}
    {unverified && <Field label={`Motif — ${label}`}><input value={draft.reasons[code] ?? ''} onChange={(e) => onReason(code, e.target.value)} placeholder="Précisez pourquoi le contrôle n’a pas pu être effectué" /></Field>}
  </div>;
}

/** Ronde IRR-01 (irrigation / espaces verts) : même principes que GE-01 et WILO-01 (trois choix, motif, brouillon local). */
export function IrrForm({ isTest = false, offlineSync, flash }: { isTest?: boolean; offlineSync: OfflineSyncApi; flash: (text: string) => void }) {
  const draftKey = `round:eau_incendie:IRR-01${isTest ? ':recette' : ''}`;
  const [draft, setDraft] = useState<IrrDraft | null>(null);
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [testAttested, setTestAttested] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmAbandon, setConfirmAbandon] = useState(false);
  const lock = useRef(false);
  // Dernier brouillon connu : évite qu'une réponse saisie rapidement écrase la précédente (état périmé).
  const draftRef = useRef<IrrDraft | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const { loadDraft, saveDraft, deleteDraft, enqueueRound } = offlineSync;

  useEffect(() => {
    let active = true;
    void loadDraft<IrrDraft>(draftKey).then((stored) => { if (active) { draftRef.current = stored?.value ?? emptyIrrDraft(); setDraft(draftRef.current); } })
      .catch(() => { if (active) { draftRef.current = emptyIrrDraft(); setDraft(draftRef.current); } });
    return () => { active = false; };
  }, [draftKey, loadDraft]);

  const change = useCallback((next: IrrDraft) => {
    draftRef.current = next;
    setDraft(next);
    setConfirmed(false);
    void saveDraft(draftKey, next).catch((e) => setError(message(e)));
  }, [draftKey, saveDraft]);

  const goTo = (next: number) => { setStep(next); progressRef.current?.scrollIntoView({ block: 'start', behavior: 'instant' }); };

  if (!draft) return <Card role="status">Chargement du brouillon IRR-01…</Card>;
  const syncStatus = <OfflineSyncStatus enabled online={offlineSync.online} running={offlineSync.running} counts={offlineSync.counts} latestIssue={offlineSync.latestIssue} latestRoundReceipt={offlineSync.latestRoundReceipt} onRetry={() => void offlineSync.retryFailed().then(() => offlineSync.synchronize())} />;
  if (draft.queued) return <>{syncStatus}<Card role="status"><h3>Ronde IRR-01 enregistrée</h3><p>Elle sera transmise une seule fois dès que la connexion le permet. Facility Manager pourra ensuite la lire.</p><Button variant="secondary" onClick={() => { const next = emptyIrrDraft(); change(next); setStep(0); }}>Nouvelle ronde</Button></Card></>;

  const latest = () => draftRef.current ?? draft;
  const answer = (code: string, value: string) => { const d = latest(); change({ ...d, answers: { ...d.answers, [code]: value } }); };
  const reason = (code: string, value: string) => { const d = latest(); change({ ...d, reasons: { ...d.reasons, [code]: value } }); };
  const missing = irrMissing(draft);
  const findings = irrFindings(draft);

  const submit = async () => {
    if (lock.current || busy) return;
    setError('');
    if (isTest && !testAttested) { setError('Confirmez que les données sont fictives et réservées à la Recette.'); return; }
    if (!confirmed) { setError('Confirmez les observations avant l’envoi.'); return; }
    if (findings.length && !draft.photoExceptionReason.trim()) { setError('Indiquez le motif d’absence de photo ; vous pourrez joindre une preuve au dossier après synchronisation.'); return; }
    if (findings.length) { const problem = reasonProblem(draft.photoExceptionReason, 'Motif d’absence de photo'); if (problem) { setError(problem); return; } }
    lock.current = true; setBusy(true);
    try {
      const checks = irrChecks(draft);
      await enqueueRound({
        isTest, testAttested: isTest && testAttested, equipmentCode: 'IRR-01', reportType: 'technical_round',
        performedAt: draft.performedAt, summary: draft.summary.trim(), checks,
        ...(findings.length ? { anomaly: { title: 'Écart constaté pendant la ronde IRR-01', description: draft.summary.trim() || findings.join(' · '), priority: irrPressureState(draft.answers.pressure ?? '') === 'critical' || draft.answers.cabinet_state === 'Humide / eau' ? 'Haute' as const : 'Moyenne' as const } } : {}),
      }, draft.id);
      change({ ...draft, queued: true });
      flash('Ronde IRR-01 mise en file de transmission.');
    } catch (e) { setError(message(e)); }
    finally { lock.current = false; setBusy(false); }
  };

  const abandon = async () => {
    try { await deleteDraft(draftKey); } catch (e) { setError(message(e)); return; }
    setDraft(emptyIrrDraft()); setStep(0); setConfirmed(false); setConfirmAbandon(false);
    flash('Brouillon abandonné. Aucune donnée n’a été envoyée.');
  };

  return <section aria-label="Ronde IRR-01">
    <RoundPilotHeader title="IRR-01 · Ronde irrigation et jardinières" subtitle="Quatre étapes · local technique puis jardinières" badge={<span className="mockup-label">Saisie terrain</span>} />
    {isTest && <Badge tone="orange">RECETTE — DONNÉES FICTIVES</Badge>}
    {syncStatus}
    <div ref={progressRef} className="surpresseur-progress connected-round-progress" aria-label="Étapes IRR">
      {IRR_STEPS.map((label, index) => <button type="button" key={label} className={index === step ? 'active' : index < step ? 'done' : ''} disabled={index > step} aria-current={index === step ? 'step' : undefined} onClick={() => goTo(index)}><span>{index < step ? '✓' : index + 1}</span><b>{label}</b></button>)}
    </div>
    <Card className="surpresseur-form-card">
      <div className="surpresseur-section-head"><div><span>ÉTAPE {step + 1} SUR {IRR_STEPS.length}</span><h3>{IRR_STEPS[step]}</h3></div></div>
      {step === 0 && <div className="surpresseur-fields"><RoundDateTimeFields value={draft.performedAt} onChange={(value) => { const d = latest(); change({ ...d, performedAt: value }); }} /></div>}
      {(step === 1 || step === 2) && <div className="surpresseur-fields wilo-supplement"><div className="wilo-supplement-grid">
        {IRR_FIELDS.filter((field) => field[3] === step).map((field) => <IrrQuestion key={field[0]} field={field} draft={draft} onAnswer={answer} onReason={reason} />)}
      </div></div>}
      {step === 3 && <div className="surpresseur-fields">
        {missing.length ? <div className="surpresseur-callout"><p><b>{missing.length} réponse{missing.length > 1 ? 's' : ''} manquante{missing.length > 1 ? 's' : ''}</b><small>{missing.join(' · ')}</small></p></div>
          : findings.length ? <div className="proposed-finding"><div><p>CONSTAT PROPOSÉ</p><h4>Écart constaté pendant la ronde IRR-01</h4><small>{findings.join(' · ')}</small></div><Badge tone="orange">À QUALIFIER</Badge></div>
            : <div className="surpresseur-callout"><p><b>Aucun écart déclaré</b><small>La ronde sera conservée sans créer d’anomalie.</small></p></div>}
        <Field label="Observation terrain (facultatif)"><textarea value={draft.summary} onChange={(e) => change({ ...draft, summary: e.target.value })} placeholder="Observation factuelle ou précision sur un écart." /></Field>
        {findings.length > 0 && <Field label="Photo non jointe — motif obligatoire"><textarea maxLength={2000} value={draft.photoExceptionReason} onChange={(e) => change({ ...draft, photoExceptionReason: e.target.value })} /></Field>}
        {isTest && <label className="confirmation-line"><input type="checkbox" checked={testAttested} onChange={(e) => setTestAttested(e.target.checked)} /><span>Je confirme que les données sont fictives, réservées à la Recette.</span></label>}
        <label className="confirmation-line"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} /><span>Je confirme que ces observations correspondent à la ronde réalisée sur IRR-01.</span></label>
      </div>}
      {error && <p className="ge-missing-summary" role="alert">{error}</p>}
      <div className="surpresseur-actions">
        <Button variant="secondary" disabled={step === 0 || busy} onClick={() => goTo(step - 1)}>← Précédent</Button>
        <p><span className={`status-dot ${offlineSync.online ? 'online' : 'local'}`} /> Brouillon local automatique</p>
        {step < 3 ? <Button onClick={() => goTo(step + 1)}>Continuer →</Button> : <Button disabled={busy || missing.length > 0 || !confirmed || (isTest && !testAttested)} aria-busy={busy} onClick={() => void submit()}>{busy ? 'Mise en file…' : 'Terminer la ronde'}</Button>}
      </div>
      <div className="ge-abandon">{confirmAbandon ? <div className="vendor-cancel-confirm" role="alertdialog" aria-label="Abandonner le brouillon ?"><p>Abandonner ce brouillon ? Toutes les réponses saisies sur cet appareil seront effacées. Rien n’a été envoyé.</p><button type="button" className="secondary-button" onClick={() => setConfirmAbandon(false)}>Garder le brouillon</button><button type="button" className="danger-button" onClick={() => void abandon()}>Abandonner</button></div> : <button type="button" className="ghost-button ge-abandon-button" disabled={busy} onClick={() => setConfirmAbandon(true)}>Abandonner le brouillon</button>}</div>
    </Card>
  </section>;
}
