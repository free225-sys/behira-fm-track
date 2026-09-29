'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Button,Card,Field} from './ui';
import {getBrowserSupabaseClient} from '../lib/supabase/client';

type Round={id:string;isTest:boolean;reference:string;updatedAt:string;performedAt:string;summary:string|null;readAt:string|null;returnReason:string|null;anomalyReference:string|null;checks:{code:string;label?:string;status:string;valueNumeric?:number;valueText?:string;valueBoolean?:boolean;notes?:string}[]};
export function WiloRoundInbox({isTest,manager,enabled,receiptId,onOpenAnomaly}:{isTest:boolean;manager:boolean;enabled:boolean;receiptId?:string;onOpenAnomaly:(reference:string)=>void}){
 const [rounds,setRounds]=useState<Round[]>([]),[selected,setSelected]=useState(''),[reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const lock=useRef(false);
 const fetchRounds=useCallback(async()=>{
  if(!enabled)return [];
  const result=await getBrowserSupabaseClient(isTest).rpc('get_wilo_rounds');
  if(result.error)throw result.error;
  return (result.data??[]) as unknown as Round[];
 },[enabled,isTest]);
 const refresh=useCallback(async()=>{
  try{const rows=await fetchRounds();setRounds(rows);setError('');}
  catch(e){setError(e instanceof Error?e.message:'Chargement des rapports WILO impossible.');}
 },[fetchRounds]);
 useEffect(()=>{
  let active=true;
  void fetchRounds().then(rows=>{if(active){setRounds(rows);setError('');}},()=>{if(active)setError('Chargement des rapports WILO impossible.');});
  return ()=>{active=false;};
 },[fetchRounds,receiptId]);
 const round=rounds.find(r=>r.id===selected&&r.isTest===isTest);
 const examine=async(decision:'read'|'return')=>{
  if(!round||lock.current)return;lock.current=true;setBusy(true);setError('');
  try{const result=await getBrowserSupabaseClient(isTest).rpc('examine_wilo_report',{p_report_id:round.id,p_updated_at:round.updatedAt,p_decision:decision,p_reason:decision==='read'?'Rapport lu':reason.trim()});if(result.error)throw result.error;await refresh();}
  catch(e){setError(e instanceof Error?e.message:'Examen non enregistré. Actualisez puis réessayez.');}
  finally{lock.current=false;setBusy(false);}
 };
 if(!enabled)return null;
 return <Card><h3>{manager?'Rapports WILO à examiner':'Historique WILO-01'}</h3>
  <Button variant="secondary" disabled={busy} onClick={()=>void refresh()}>Actualiser les rapports WILO</Button>
  {error&&<p role="alert">{error}</p>}
  {!rounds.length&&!error&&<p>Aucun rapport WILO-01 reçu dans cet espace.</p>}
  {rounds.filter(r=>r.isTest===isTest).map(r=><div key={r.id}><Button variant="ghost" onClick={()=>{setSelected(r.id);setReason('');}}>{r.reference} · {new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'short',timeStyle:'short'}).format(new Date(r.performedAt))}</Button><p>{r.returnReason?`Nouveau contrôle demandé : ${r.returnReason}`:r.readAt?'Lu — examen FM en cours':'Reçu — lecture FM attendue'}</p></div>)}
  {round&&<section aria-label="Détail du rapport WILO"><h4>{round.reference}</h4>{round.summary&&<p>{round.summary}</p>}
   {round.checks.filter(c=>c.code!=='WILO_RULE_VERSION').map(c=><p key={c.code}><strong>{c.label??c.code}</strong> : {c.status==='not_checked'?`Non vérifié — ${c.notes??''}`:c.valueNumeric??(typeof c.valueBoolean==='boolean'?c.valueBoolean?'Oui':'Non':c.valueText)}</p>)}
   {round.anomalyReference&&<Button onClick={()=>onOpenAnomaly(round.anomalyReference!)}>Ouvrir le dossier {round.anomalyReference}</Button>}
   {manager&&!round.readAt&&<Button disabled={busy} variant="secondary" onClick={()=>void examine('read')}>J’ai lu ce rapport WILO</Button>}
   {manager&&!round.returnReason&&<><Field label="Motif du nouveau contrôle"><textarea value={reason} onChange={e=>setReason(e.target.value)}/></Field><Button disabled={busy||!reason.trim()} variant="secondary" onClick={()=>void examine('return')}>Demander un nouveau contrôle</Button></>}
   <p>La lecture du rapport ne valide pas un score de santé. Les constats se qualifient dans leur dossier.</p>
  </section>}
 </Card>;
}
