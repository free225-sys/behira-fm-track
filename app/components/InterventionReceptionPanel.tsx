'use client';
import { useRef, useState, type FormEvent } from 'react';
import { Button, Card, Field, Select } from './ui';
import { SavingStatus } from './DossierContinuity';

export type ReceptionHandler = (decision:'accepted'|'returned',comment:string,requestId:string)=>Promise<boolean>;
export function InterventionReceptionPanel({summary,proofRequired,proofAccepted,busy,onSubmit,onOpenProofs}:{
  summary:string;proofRequired:boolean;proofAccepted:boolean;busy:boolean;onSubmit:ReceptionHandler;onOpenProofs:()=>void;
}) {
  const [decision,setDecision]=useState<'accepted'|'returned'>('accepted');
  const [comment,setComment]=useState('');
  const [confirmed,setConfirmed]=useState(false);
  const [error,setError]=useState('');
  const requestId=useRef<string|null>(null),sending=useRef(false);
  const canAccept=!proofRequired||proofAccepted;
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(busy||sending.current||!confirmed||comment.trim().length<10||(decision==='accepted'&&!canAccept))return;
    sending.current=true;requestId.current??=crypto.randomUUID();setError('');
    try { if(!await onSubmit(decision,comment.trim(),requestId.current))setError('Décision non confirmée. Consultez le message et actualisez le dossier avant de réessayer.'); }
    finally {sending.current=false;}
  };
  const changed=()=>{setConfirmed(false);requestId.current=null;setError('');};
  return <Card as="section" className="ge01-workflow-panel" aria-label="Réception de l’intervention">
    <h3>Réception de l’intervention</h3><p><strong>Compte rendu transmis</strong></p><p>{summary||'Compte rendu non disponible.'}</p>
    <Button variant="secondary" onClick={onOpenProofs}>Consulter les preuves</Button>
    {proofRequired&&!proofAccepted&&<p role="status">Une preuve de cette intervention doit être acceptée avant la clôture.</p>}
    <form onSubmit={submit}>
      <Field label="Décision de réception"><Select value={decision} disabled={busy} onChange={e=>{setDecision(e.target.value as 'accepted'|'returned');changed();}}>
        <option value="accepted">Accepter et clôturer</option><option value="returned">Renvoyer à l’agent pour reprise</option>
      </Select></Field>
      <Field label={decision==='returned'?'Motif du retour et corrections attendues':'Conclusion de la réception'}>
        <textarea required minLength={10} maxLength={4000} rows={3} placeholder={decision==='returned'?'Décrivez les corrections attendues — 10 caractères minimum.':'Décrivez votre conclusion — 10 caractères minimum.'} value={comment} disabled={busy} onChange={e=>{setComment(e.target.value);changed();}} />
      </Field>
      <small>10 caractères minimum, hors espaces en début et fin.</small>
      {decision==='returned'&&<p>L’agent retrouvera le travail à reprendre et votre motif. L’échéance existante est conservée.</p>}
      <label className="ge-confirmation"><input type="checkbox" checked={confirmed} disabled={busy} onChange={e=>setConfirmed(e.target.checked)} /><span>{decision==='accepted'?'Je confirme la réception et la clôture de ce dossier.':'Je confirme le retour de cette intervention à l’agent.'}</span></label>
      {error&&<p role="alert">{error}</p>}
      <Button type="submit" aria-busy={busy} disabled={busy||!confirmed||comment.trim().length<10||(decision==='accepted'&&!canAccept)}>{busy?'Enregistrement…':decision==='accepted'?'Accepter et clôturer':'Renvoyer pour reprise'}</Button>
      <SavingStatus busy={busy} />
    </form>
  </Card>;
}
