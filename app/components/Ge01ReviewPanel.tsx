"use client";

import { useRef, useState } from "react";
import type { OperationalReport } from "../lib/supabase/data";
import { GE01_PRIORITIES, ge01ConformityBlocker, validateGe01Review, type Ge01Review, type Ge01ReviewInput } from "../lib/ge01/review";
import { Button, Field, Select } from "./ui";
import { SavingStatus } from "./DossierContinuity";

export type Ge01ReviewHandler = (report: OperationalReport, input: Ge01ReviewInput) => Promise<Ge01Review>;

export function Ge01ReviewPanel({ report, onReview, onOpenAnomaly }: {
  report: OperationalReport;
  onReview?: Ge01ReviewHandler;
  onOpenAnomaly?: (reference: string) => void;
}) {
  const [decision, setDecision] = useState<"" | "conform" | "anomaly">("");
  const [comment, setComment] = useState("");
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("");
  const [codes, setCodes] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Ge01Review | null>(null);
  const lock = useRef(false);
  const review = receipt ?? report.review;
  const blocker = ge01ConformityBlocker(report);

  if (review) return <section className="ge-review-result" aria-label="Décision de Faustin" role="status">
    <h3>{review.decision === "conform" ? "Rapport examiné — conforme" : "Rapport examiné — anomalie ouverte"}</h3>
    <p>{review.reviewedBy} · {new Date(review.reviewedAt).toLocaleString("fr-FR")}</p>
    <p>{review.comment}</p>
    {review.checkCodes.length > 0 ? <p>Contrôles concernés : {review.checkCodes.map((code) => report.checks.find((check) => check.code === code)?.label ?? code).join(", ")}</p> : null}
    {review.anomalyReference ? <><p>Dossier lié : <strong>{review.anomalyReference}</strong></p>
      {onOpenAnomaly ? <Button variant="secondary" onClick={() => onOpenAnomaly(review.anomalyReference!)}>Ouvrir le dossier pour poursuivre son traitement</Button> : null}</> : null}
  </section>;
  if (report.review === undefined || !onReview) return <section className="ge-review-unavailable" role="status">
    <h3>Examen indisponible dans cet environnement</h3><p>Le rapport reste consultable. Aucune validation n’a été enregistrée.</p>
  </section>;
  if (report.ge01Status?.blockers.includes('transmission_unconfirmed')) return <p role="status">Réception des photos en cours ou non attestée. Actualisez avant d’examiner le rapport.</p>;
  if (report.reportStatus !== "submitted") return <p role="status">Ce rapport n’est pas en attente d’examen.</p>;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (lock.current) return;
    if (!decision || !confirmed) { setError("Choisissez une décision et confirmez votre examen."); return; }
    const input: Ge01ReviewInput = { decision, comment, checkCodes: codes, priorityCode: priority, anomalyTitle: title };
    const issue = validateGe01Review(report, input);
    if (issue) { setError(issue); return; }
    lock.current = true; setBusy(true); setError("");
    try { setReceipt(await onReview(report, input)); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Décision non confirmée. Actualisez la file avant de réessayer."); }
    finally { lock.current = false; setBusy(false); }
  };
  return <form className="ge-review-form" onSubmit={submit} aria-label="Examiner le rapport">
    <h3>Décision de Faustin</h3>
    <fieldset disabled={busy}>
      <legend>Suite à donner au rapport</legend>
      <label><input type="radio" name={`review-${report.id}`} value="conform" checked={decision === "conform"} disabled={Boolean(blocker)} onChange={() => { setDecision("conform"); setConfirmed(false); }} /> Confirmer la conformité</label>
      {blocker ? <p className="ge-review-note">{blocker}</p> : null}
      <label><input type="radio" name={`review-${report.id}`} value="anomaly" checked={decision === "anomaly"} onChange={() => { setDecision("anomaly"); setConfirmed(false); }} /> Qualifier un écart et ouvrir une anomalie</label>
      {decision === "anomaly" ? <>
        <Field label="Titre de l’anomalie"><input required maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></Field>
        <Field label="Priorité confirmée"><Select aria-label="Priorité confirmée" required value={priority} onChange={(event) => setPriority(event.target.value)}><option value="">Choisir une priorité</option>{GE01_PRIORITIES.map(([code, label]) => <option key={code} value={code}>{label}</option>)}</Select></Field>
        <fieldset className="ge-review-checks"><legend>Contrôles concernés</legend>
          {report.checks.map((check) => <label key={check.code}><input type="checkbox" checked={codes.includes(check.code)} onChange={(event) => setCodes((previous) => event.target.checked ? [...previous, check.code] : previous.filter((code) => code !== check.code))} />{check.label}</label>)}
        </fieldset>
        <p className="ge-review-note">L’anomalie restera liée à ce rapport. Son affectation et son traitement se poursuivront dans le dossier.</p>
      </> : null}
      <Field label={decision === "anomaly" ? "Écart constaté et motif de la décision" : "Motif de l’examen"}><textarea aria-label={decision === "anomaly" ? "Écart constaté et motif de la décision" : "Motif de l’examen"} required maxLength={4000} value={comment} onChange={(event) => setComment(event.target.value)} /></Field>
      <label className="ge-review-confirm"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />J’ai examiné les réponses et je confirme cette décision.</label>
      {error ? <p role="alert" className="ge-field-error">{error}</p> : null}
      <Button type="submit" aria-busy={busy} disabled={busy || !decision || !confirmed}>{busy ? "Enregistrement…" : decision === "anomaly" ? "Enregistrer et ouvrir l’anomalie" : "Enregistrer l’examen"}</Button>
      <SavingStatus busy={busy} />
    </fieldset>
  </form>;
}
