'use client';
import { useEffect, useState } from 'react';
import { GE01_EVIDENCE_LABELS, validateGe01Evidence, type Ge01Evidence, type Ge01EvidencePurpose } from '../lib/ge01/evidence';
import type { Ge01ReportStatus } from '../lib/ge01/operations';
import { Button, Field } from './ui';

export function Ge01EvidencePicker({ value, onChange, persistent }: { value: Ge01Evidence[]; onChange: (value: Ge01Evidence[]) => void; persistent: boolean }) {
  const [error, setError] = useState('');
  return <section aria-label="Photos du contrôle" className="ge-fields">
    <p>Joignez une photo de l’anomalie. Si la prise de photo est impossible, indiquez le motif pour examen par le FM.</p>
    <div className="ge-field-grid">{(['defect'] as Ge01EvidencePurpose[]).map(purpose => <Field key={purpose} label={GE01_EVIDENCE_LABELS[purpose]}>
      <input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => {
        const file = event.target.files?.[0]; event.target.value = '';
        if (!file) return;
        try {
          const next = [...value, { id: crypto.randomUUID(), purpose, file }];
          validateGe01Evidence(next); onChange(next); setError('');
        } catch (failure) { setError(failure instanceof Error ? failure.message : 'Photo non acceptée.'); }
      }} />
    </Field>)}</div>
    {value.map(item => <p key={item.id}>{GE01_EVIDENCE_LABELS[item.purpose]} · {item.file.name} <Button variant="secondary" onClick={() => onChange(value.filter(other => other.id !== item.id))}>Retirer</Button></p>)}
    {error && <p role="alert">{error}</p>}
    <small>JPG, PNG ou WebP · 10 Mo par photo · 6 photos maximum. {persistent ? 'Les fichiers sont conservés avec le brouillon sur cet appareil.' : 'Démonstration : aucune photo n’est envoyée ni sauvegardée.'}</small>
  </section>;
}

export type Ge01ProofLoader = (path: string) => Promise<Blob>;
export function Ge01EvidenceGallery({ status, onLoad }: { status: Ge01ReportStatus; onLoad?: Ge01ProofLoader }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <section aria-label="Preuves reçues">
    <h3>Preuves reçues ({status.evidence.length})</h3>
    {status.evidence.map(proof => <Button key={proof.id} variant="secondary" disabled={!onLoad || busy} onClick={async () => {
      if (!onLoad) return;
      setBusy(true); setError('');
      try { setPreview(URL.createObjectURL(await onLoad(proof.storagePath))); }
      catch (failure) { setError(failure instanceof Error ? failure.message : 'Photo indisponible.'); }
      finally { setBusy(false); }
    }}>Voir : {GE01_EVIDENCE_LABELS[proof.purpose]}</Button>)}
    {preview && <div><img src={preview} alt="Photo du contrôle GE-01" style={{ maxWidth: '100%', maxHeight: 420 }} /><Button variant="secondary" onClick={() => setPreview(null)}>Fermer la photo</Button></div>}
    {error && <p role="alert">{error}</p>}
    <p>{status.blockers.length ? 'Ce contrôle ne remplit pas encore les conditions d’admissibilité à la santé.' : `Contrôle admissible · validité jusqu’au ${new Date(status.validUntil).toLocaleString('fr-FR', { timeZone: 'Africa/Abidjan' })} (Abidjan).`}</p>
    {status.blockers.length > 0 && <ul>{status.blockers.map(code => <li key={code}>{({
      prior_policy: 'Contrôle antérieur à la règle du 17/09/2026.', transmission_unconfirmed: 'Réception complète non confirmée.',
      evidence_manifest_missing: 'Ancien envoi sans manifeste de preuves ; les réponses restent consultables.',
      anomaly_photo_or_reason_missing: 'Photo de l’anomalie ou motif d’impossibilité manquant.', fm_review_pending: 'Examen FM attendu.', mc4_photo_missing: 'Photo MC4 non attestée par l’examen FM.',
      counter_photo_missing: 'Photo du compteur non attestée par l’examen FM.', defect_photo_missing: 'Photo du défaut non attestée par l’examen FM.',
      checks_incomplete: 'Contrôles incomplets.', critical_data_missing: 'Donnée critique manquante ou non vérifiée.',
    } as Record<string,string>)[code] ?? 'Condition d’admissibilité non remplie.'}</li>)}</ul>}
  </section>;
}
