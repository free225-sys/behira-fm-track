'use client';

import { useRef, useState, type FormEvent } from 'react';
import { Button, Card, Field } from './ui';

export function ReopenDossierPanel({ mode, busy, onSubmit }: {
  mode: 'reopen' | 'review';
  busy: boolean;
  onSubmit: (comment: string, requestId: string) => Promise<boolean>;
}) {
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const requestId = useRef<string | null>(null);
  const isReopen = mode === 'reopen';
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const reason = comment.trim();
    if (reason.length < 10) { setError('Décrivez le motif en au moins dix caractères.'); return; }
    if (busy) return;
    requestId.current ??= crypto.randomUUID();
    setError('');
    const saved = await onSubmit(reason, requestId.current);
    if (!saved) setError('Décision non confirmée. Actualisez le dossier avant de réessayer.');
  };
  return <Card as="section" className="dossier-description" aria-label={isReopen ? 'Rouvrir le dossier' : 'Réexaminer le dossier rouvert'}>
    <div className="panel-head"><div><p className="design-kicker">{isReopen ? 'RÉOUVERTURE' : 'RÉEXAMEN'}</p><h3>{isReopen ? 'Rouvrir le dossier' : 'Réexaminer le dossier rouvert'}</h3></div></div>
    <p>{isReopen ? 'La clôture précédente restera dans l’historique. Une nouvelle échéance sera calculée et le FM recevra le réexamen.' : 'Votre conclusion sera historisée. Le dossier retournera ensuite à la qualification et à l’affectation.'}</p>
    <form onSubmit={submit}>
      <Field label={isReopen ? 'Motif de réouverture' : 'Conclusion du réexamen'}><textarea required minLength={10} maxLength={4000} rows={3} placeholder={isReopen ? 'Expliquez la réouverture — 10 caractères minimum.' : 'Décrivez votre conclusion — 10 caractères minimum.'} value={comment} onChange={(event) => { setComment(event.target.value); requestId.current=null; setError(''); }} /><small>10 caractères minimum, hors espaces en début et fin.</small></Field>
      {error ? <p role="alert" className="hint is-bad">{error}</p> : null}
      <Button type="submit" disabled={busy || comment.trim().length < 10}>{busy ? 'Enregistrement…' : isReopen ? 'Rouvrir et transmettre au FM' : 'Confirmer le réexamen'}</Button>
    </form>
  </Card>;
}
