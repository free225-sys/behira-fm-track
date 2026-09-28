'use client';
import { useRef, useState } from 'react';
import type { Ge01Operations } from '../lib/ge01/operations';
import { Button, Card, Field, Select } from './ui';
export type Ge01AssignmentHandler = (input: {id:string;date:string;agentId:string;reason:string}) => Promise<void>;
export function Ge01Planning({ planning, onAssign }: {planning:Ge01Operations;onAssign?:Ge01AssignmentHandler}) {
  const [agentId,setAgent] = useState(''); const [reason,setReason] = useState('');
  const [busy,setBusy] = useState(false); const [error,setError] = useState('');
  const mutationId = useRef(''); const lock=useRef(false);
  const round=planning.rounds[0];
  return <Card>
    <h3>Ronde GE-01 du jour</h3>
    <p>{round ? `Avant 23:59, heure d’Abidjan · ${round.agentName ?? 'Responsable à désigner parmi les agents habilités'}.` : 'Aucune ronde quotidienne attendue aujourd’hui.'}</p>
    {planning.assignment && <p>Désignation enregistrée : {planning.assignment.reason}</p>}
    {round && onAssign && <form className="ge-fields" onSubmit={async event => {
      event.preventDefault(); if(lock.current)return;lock.current=true;setBusy(true);setError('');
      mutationId.current ||= crypto.randomUUID();
      try { await onAssign({id:mutationId.current,date:round.scheduledDate,agentId,reason});setReason('');setAgent('');mutationId.current=''; }
      catch(failure){setError(failure instanceof Error ? failure.message : 'Désignation non enregistrée.');}
      finally{lock.current=false;setBusy(false);}
    }}>
      <Field label="Responsable ou suppléant pour aujourd’hui"><Select required disabled={busy || round.state==='done'} value={agentId} onChange={event=>{setAgent(event.target.value);mutationId.current='';}}>
        <option value="">Choisir un agent habilité</option>{planning.eligibleAgents.map(agent=><option key={agent.id} value={agent.id}>{agent.name}</option>)}
      </Select></Field>
      <Field label="Motif de la désignation"><input required maxLength={2000} disabled={busy || round.state==='done'} value={reason} onChange={event=>{setReason(event.target.value);mutationId.current='';}} /></Field>
      <Button type="submit" disabled={busy || round.state==='done' || !agentId || !reason.trim()}>Enregistrer la désignation</Button>
      {error && <p role="alert">{error}</p>}
    </form>}
  </Card>;
}
