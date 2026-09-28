'use client';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Button, Card, Field, Select } from './ui';
import { RoundPilotHeader } from './shared/RoundPilotHeader';
import { RoundDateTimeFields } from './shared/RoundDateTimeFields';
import { OfflineSyncStatus } from './OfflineSyncStatus';
import { RIA_FIELDS, RIA_PHOTOS, riaHasAnomaly, emptyRiaDraft, riaPayload, type RiaDraft, type RiaPhoto } from '../lib/ria/report';
import type { useOfflineSync } from '../lib/offline/useOfflineSync';
import { getBrowserSupabaseClient } from '../lib/supabase/client';
import type { Json } from '../lib/supabase/database.types';

type Round = {id:string;clientMutationId:string;reference:string;performedAt:string;updatedAt:string;confirmedAt:string|null;reviewedAt:string|null;reason:string|null;readAt:string|null;returnReason:string|null;anomalyReference:string|null;
 checks:{code:string;label?:string;status:string;valueText?:string;valueNumeric?:number;valueBoolean?:boolean;notes?:string}[];
 analysis:{complete:boolean;missing:string[];technicalState:string|null;findings:Json[];fieldMap:Record<string,string>;critical:boolean;score:number|null}};
const stamp=(s:string)=>new Intl.DateTimeFormat('fr-FR',{timeZone:'Africa/Abidjan',dateStyle:'short',timeStyle:'short'}).format(new Date(s));
const draftKey='ria:daily:v1';
const message=(e:unknown)=>e instanceof Error?e.message:typeof e==='object'&&e&&'message' in e?String(e.message):'Opération impossible. Réessayez.';

export function RiaRoundSpace({manager,enabled,offlineSync,onRefresh,onOpenAnomaly}:{manager:boolean;enabled:boolean;offlineSync:ReturnType<typeof useOfflineSync>;onRefresh:()=>void;onOpenAnomaly:(id:string)=>void}) {
 const [rounds,setRounds]=useState<Round[]>([]),[error,setError]=useState(''),[loading,setLoading]=useState(false),[selected,setSelected]=useState<string|null>(null);
 const refresh=useCallback(async()=>{
   if(!enabled)return;setLoading(true);setError('');
   try{const r=await getBrowserSupabaseClient().rpc('get_ria_rounds');if(r.error)throw r.error;setRounds((r.data??[]) as unknown as Round[]);}
   catch(e){setError(message(e));}finally{setLoading(false);}
 },[enabled]);
 useEffect(()=>{void refresh();},[refresh,offlineSync.latestRoundReceipt]);
 if(!enabled)return <Card role="status">La ronde RIA-01 nécessite une connexion avec le compte réel habilité. Aucun contrôle n’est simulé.</Card>;
 const report=rounds.find(r=>r.id===selected);
 return <section aria-label="Ronde RIA-01">
  <RoundPilotHeader title="RIA-01 · Réseau incendie" subtitle="Cinq étapes · contrôle quotidien" badge={<span className="mockup-label">Saisie terrain</span>}/><Card><p>Cadence à confirmer · heure d’Abidjan. Les réglages des pressostats et les essais spécialisés relèvent de SECURISYS.</p><p>Valeur de pression de référence à confirmer par SECURISYS.</p></Card>
  {!manager&&<RiaForm offlineSync={offlineSync} rounds={rounds}/>}
  <Card><h3>{manager?'Rapports RIA à examiner':'Historique RIA-01'}</h3><Button variant="secondary" disabled={loading} onClick={()=>void refresh()}>Actualiser les rapports RIA</Button>
   {error&&<p role="alert">{error}</p>}{loading&&<p role="status">Chargement…</p>}{!loading&&!error&&rounds.length===0&&<p>Aucun rapport RIA-01 reçu.</p>}
   {rounds.map(r=><div key={r.id}><Button variant="ghost" onClick={()=>setSelected(r.id)}>{r.reference} · {stamp(r.performedAt)}</Button><p>{r.reviewedAt?'Contrôle validé par le FM':r.returnReason?`Nouveau contrôle demandé : ${r.returnReason}`:r.readAt?'Lu — examen FM en cours':r.confirmedAt?'Reçu — revue FM attendue':'Photos en cours de réception'}</p></div>)}
  </Card>
  {report&&<RiaReview key={report.id} report={report} manager={manager} onOpenAnomaly={onOpenAnomaly} onDone={()=>{void refresh();onRefresh();}}/>}
 </section>;
}
export function RiaForm({offlineSync:s,rounds=[]}:{offlineSync:ReturnType<typeof useOfflineSync>;rounds?:Round[]}) {
 const [draft,setDraft]=useState<RiaDraft|null>(null),[error,setError]=useState(''),[saveState,setSaveState]=useState('Chargement du brouillon…'),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[step,setStep]=useState(0);
 const [furthestStep,setFurthestStep]=useState(0);
 useEffect(()=>setFurthestStep(value=>Math.max(value,step)),[step]);
 const lock=useRef(false),writes=useRef(Promise.resolve());
 useEffect(()=>{let active=true;void s.loadDraft<RiaDraft>(draftKey).then(d=>{if(active){setDraft(d?.value??emptyRiaDraft());setSaveState('Brouillon chargé');}}).catch(e=>setError(message(e)));return()=>{active=false;};},[s.loadDraft]);
 const save=useCallback((next:RiaDraft)=>{setSaveState('Enregistrement…');const write=writes.current.catch(()=>{}).then(()=>s.saveDraft(draftKey,next)).then(()=>{setSaveState('Brouillon enregistré sur cet appareil');});writes.current=write;return write;},[s.saveDraft]);
 const change=(next:RiaDraft)=>{setDraft(next);setConfirmed(false);void save(next).catch(e=>{setError(message(e));setSaveState('Brouillon non enregistré');});};
 const submit=async()=>{
  if(!draft||lock.current||draft.queued)return;lock.current=true;setBusy(true);setError('');
  try{const payload=riaPayload(draft);if(!confirmed)throw new Error('Confirmez les observations avant l’envoi.');await writes.current;await s.enqueueRound(payload,draft.id);const next={...draft,queued:true};setDraft(next);await save(next);}
  catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);}
 };
 const receivedReference=draft?(s.latestRoundReceipt?.queueId===draft.id?s.latestRoundReceipt.reportReference:rounds.find(r=>r.clientMutationId===draft.id&&r.confirmedAt)?.reference):undefined;
 useEffect(()=>{if(draft?.queued&&receivedReference&&draft.confirmedReference!==receivedReference){const next={...draft,confirmedReference:receivedReference};setDraft(next);void save(next).catch(e=>setError(message(e)));}},[draft,receivedReference,save]);
 if(!draft)return <Card role="status">{error||saveState}</Card>;
 const sections=[RIA_FIELDS.slice(0,6),RIA_FIELDS.slice(6,15),RIA_FIELDS.slice(15,20),RIA_FIELDS.slice(20),[]];
 const labels=['Local','Coffrets','Pressions et pressostats','Pompes et réseau','Synthèse et envoi'];
 const confirmedReference=receivedReference??draft.confirmedReference;
 const receipt=s.latestRoundReceipt?.queueId===draft.id?s.latestRoundReceipt:null;
 const addPhoto=async(purpose:RiaPhoto['purpose'],file?:File)=>{
  if(!file)return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size<1||file.size>10485760){setError('Photo : JPG, PNG ou WebP, 10 Mo maximum.');return;}
  change({...draft,photos:[...draft.photos.filter(p=>p.purpose!==purpose),{id:crypto.randomUUID(),purpose,file}]});
 };
 return <Card><div className="panel-head"><div><h3>{draft.queued?'Ronde transmise':'Contrôle quotidien du réseau incendie'}</h3><p>Réalisation : {stamp(draft.performedAt)}</p></div></div>
  <OfflineSyncStatus enabled online={s.online} running={s.running} counts={s.counts} latestIssue={s.latestIssue} latestRoundReceipt={receipt} onRetry={()=>void s.retryFailed().then(()=>s.synchronize())}/>
  {draft.queued?<><p role="status">{confirmedReference?`${confirmedReference} — rapport et photos confirmés par le serveur.`:'Rapport protégé dans la file d’envoi. Attendez la confirmation serveur.'}</p><Button variant="secondary" disabled={!confirmedReference} onClick={()=>{const next=emptyRiaDraft();change(next);setStep(0);setFurthestStep(0);}}>Nouvelle ronde hors planning</Button></>:<>
   <div className="surpresseur-progress connected-round-progress" aria-label="Étapes RIA">{labels.map((label,i)=><button type="button" key={label} className={i===step?'active':i<step?'done':''} disabled={i>Math.max(step,furthestStep)} aria-current={i===step?'step':undefined} onClick={()=>setStep(i)}><span>{i<step?'✓':i+1}</span><b>{label}</b></button>)}</div>
  <fieldset disabled={busy}><legend>{labels[step]}</legend><div className="two-fields">
    {step===0&&<RoundDateTimeFields value={draft.performedAt} onChange={performedAt=>change({...draft,performedAt})}/>}
    {sections[step].map(([code,label,type])=><div key={code}><Field label={label}>{type==='number'?<input inputMode="decimal" value={draft.answers[code]==='unknown'?'':draft.answers[code]??''} disabled={draft.answers[code]==='unknown'} onChange={e=>change({...draft,answers:{...draft.answers,[code]:e.target.value}})}/>:<div className="choice-row" role="group" aria-label={label}>{[...(type==='bool'?[['yes','Oui'],['no','Non']]:type.split('|').map(v=>[v,v])),['unknown','Non vérifié']].map(([value,text])=><button type="button" key={value} className={`choice-button ${draft.answers[code]===value?'is-selected':''}`} aria-pressed={draft.answers[code]===value} onClick={()=>change({...draft,answers:{...draft.answers,[code]:value}})}>{text}</button>)}</div>}</Field>
     {type==='number'&&(!draft.answers[code]?.trim()||draft.answers[code]==='unknown')&&<p className="measure-empty"><span>Valeur non renseignée</span> · <b>À COMPLÉTER</b></p>}
     {type==='number'&&<label><input type="checkbox" checked={draft.answers[code]==='unknown'} onChange={e=>change({...draft,answers:{...draft.answers,[code]:e.target.checked?'unknown':''}})}/> Non relevé</label>}
     {draft.answers[code]==='unknown'&&<Field label="Motif de non-vérification"><input value={draft.reasons[code]??''} onChange={e=>change({...draft,reasons:{...draft.reasons,[code]:e.target.value}})}/></Field>}
    </div>)}
   </div>
   {step===4&&<><p>Sans anomalie : aucune photo requise. En cas d’anomalie : joignez une photo ou expliquez pourquoi elle est impossible.</p>
    {Object.entries(RIA_PHOTOS).filter(([purpose])=>(riaHasAnomaly(draft)&&purpose==='defect')||draft.photos.some(p=>p.purpose===purpose)).map(([purpose,label])=><Field key={purpose} label={label}><input type="file" accept="image/jpeg,image/png,image/webp" onChange={e=>void addPhoto(purpose as RiaPhoto['purpose'],e.target.files?.[0])}/><small>{draft.photos.find(p=>p.purpose===purpose)?.file.name??'Aucune photo'}</small></Field>)}
    {riaHasAnomaly(draft)&&!draft.photos.some(p=>p.purpose==='defect')&&<Field label="Photo impossible — motif obligatoire"><textarea maxLength={2000} value={draft.photoExceptionReason??''} onChange={e=>change({...draft,photoExceptionReason:e.target.value})}/></Field>}
    <Field label="Observations et actions constatées"><textarea value={draft.summary} onChange={e=>change({...draft,summary:e.target.value})}/></Field>
    <details><summary>Vérifier les réponses avant envoi</summary>{RIA_FIELDS.map(([code,label])=><p key={code}>{label} : {draft.answers[code]==='yes'?'Oui':draft.answers[code]==='no'?'Non':draft.answers[code]==='unknown'?`Non vérifié — ${draft.reasons[code]??''}`:draft.answers[code]||'Valeur non renseignée · À COMPLÉTER'}</p>)}</details>
    <label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> Je confirme que ces observations correspondent au contrôle réalisé.</label>
   </>}
   </fieldset>
   <p role="status" className="field-hint">{saveState}</p>{step>0&&<Button variant="secondary" onClick={()=>setStep(step-1)}>Précédent</Button>}{step<4?<Button onClick={()=>setStep(step+1)}>Continuer</Button>:<Button disabled={busy||!confirmed} onClick={()=>void submit()}>{busy?'Mise en file…':'Transmettre le rapport RIA'}</Button>}
  </>}{error&&<p role="alert">{error}</p>}
 <aside className="score-explain-card is-compact"><div><span>RIA-01</span><b>Indisponible</b></div><p className="analytics-note">Aucune valeur de score n’est affichée avant validation de la méthode et de ses données sources.</p></aside>
 </Card>;
}
export function RiaReview({report:r,manager,onDone,onOpenAnomaly}:{report:Round;manager:boolean;onDone:()=>void;onOpenAnomaly:(id:string)=>void}) {
 const [reason,setReason]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[confirmed,setConfirmed]=useState(false),[seen,setSeen]=useState<string[]>([]);
 const [preview,setPreview]=useState<string|null>(null);const id=useRef(crypto.randomUUID()),lock=useRef(false);
 useEffect(()=>()=>{if(preview)URL.revokeObjectURL(preview);},[preview]);
 const manifest=JSON.parse(r.checks.find(c=>c.code==='RIA_MANIFEST')?.valueText??'[]') as {id:string;purpose:string;sha256:string}[];
 const exception=r.checks.find(c=>c.code==='PHOTO_EXCEPTION')?.valueText?.trim();
 const required=r.analysis.findings.length>0&&!exception?['defect']:[];
 const missing=required.filter(p=>!manifest.some(m=>m.purpose===p));
 const canReview=manager&&!r.reviewedAt&&!r.returnReason&&r.confirmedAt&&r.analysis.complete&&missing.length===0;
 const examine=async(decision:'read'|'return')=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{const result=await getBrowserSupabaseClient().rpc('examine_ria_report',{p_report_id:r.id,p_updated_at:r.updatedAt,p_decision:decision,p_reason:decision==='read'?'Rapport lu':reason.trim()});if(result.error)throw result.error;onDone();}catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);}};
 const view=async(m:typeof manifest[number])=>{setError('');try{const x=await getBrowserSupabaseClient().storage.from('health-proofs').download(`${r.id}/${m.id}-${m.sha256}`);if(x.error)throw x.error;setPreview(URL.createObjectURL(x.data));setSeen(v=>[...new Set([...v,m.id])]);}catch(e){setError(message(e));}};
 const review=async()=>{
  if(lock.current||!canReview)return;lock.current=true;setBusy(true);setError('');
  try{
   const c=getBrowserSupabaseClient();const ids:string[]=[],proofMap:Record<string,string>={};
   for(const m of manifest){const p=await c.rpc('register_health_proof',{p_id:m.id,p_report_id:r.id,p_storage_path:`${r.id}/${m.id}-${m.sha256}`});if(p.error)throw p.error;ids.push(m.id);proofMap[m.purpose]=m.id;}
   const result=await c.rpc('review_health_source',{p_id:id.current,p_kind:'equipment',p_subject:'RIA-01',p_report_id:r.id,p_source_updated_at:r.updatedAt,p_payload:{complete:true,technicalState:r.analysis.technicalState,fieldMap:r.analysis.fieldMap,findings:r.analysis.findings,proofMap},p_evidence_ids:ids,p_reason:reason.trim()});
   if(result.error)throw result.error;onDone();
  }catch(e){setError(message(e));}finally{lock.current=false;setBusy(false);}
 };
 const label=(code:string)=>code==='pressure_unreliable'?'Pressions non fiables : écart entre manomètres ≥ 1,3 bar':code==='manual_justification_review'?'Mode manuel justifié : confirmation technique nécessaire':RIA_FIELDS.find(x=>x[0]===code)?.[1]??code;
 return <Card><h3>{r.reference} · {stamp(r.performedAt)}</h3><p>{r.reviewedAt?`Revu le ${stamp(r.reviewedAt)} — ${r.reason}`:'Revue FM attendue'}</p>
  <p>{r.analysis.complete?'Contrôles renseignés':'Contrôle incomplet : '+r.analysis.missing.map(label).join(', ')}</p>
  {r.returnReason&&<p role="status">Nouveau contrôle demandé par le FM : {r.returnReason}</p>}
  {manager&&!r.readAt&&r.confirmedAt&&<Button variant="secondary" disabled={busy} onClick={()=>void examine('read')}>J’ai lu ce rapport RIA</Button>}
  {r.checks.filter(c=>!['RIA_MANIFEST','RIA_RULE_VERSION','RIA_RULE_SNAPSHOT','gmp_auto','gmp_off','valves_open','leak'].includes(c.code)).map(c=><p key={c.code}><strong>{label(c.code)}</strong> : {c.status==='not_checked'?`Non vérifié — ${c.notes}`:c.valueNumeric??(typeof c.valueBoolean==='boolean'?c.valueBoolean?'Oui':'Non':c.valueText)}</p>)}
  <p>Écarts relevés : {r.analysis.findings.length}. {r.analysis.complete?'État proposé : '+({available:'Disponible',degraded:'Dégradé',unavailable:'Indisponible'}[r.analysis.technicalState??'']??'Inconnu'):''}</p>
  {r.anomalyReference&&<Button onClick={()=>onOpenAnomaly(r.anomalyReference!)}>Ouvrir le dossier {r.anomalyReference}</Button>}
  <h4>Photos</h4>{manifest.map(m=><Button key={m.id} variant="secondary" onClick={()=>void view(m)}>{RIA_PHOTOS[m.purpose as keyof typeof RIA_PHOTOS]??m.purpose}{seen.includes(m.id)?' · consultée':''}</Button>)}
  {preview&&<img src={preview} alt="Preuve du contrôle RIA-01" style={{maxWidth:'100%',maxHeight:480,objectFit:'contain'}}/>}
  {missing.length>0&&<p>Photo d’anomalie ou motif d’impossibilité manquant : {missing.map(k=>RIA_PHOTOS[k as keyof typeof RIA_PHOTOS]).join(', ')}. Nouvelle ronde complète nécessaire pour alimenter le score.</p>}
  {manager&&!r.reviewedAt&&!r.returnReason&&r.confirmedAt&&<Field label="Commentaire de revue FM"><textarea disabled={busy} value={reason} onChange={e=>setReason(e.target.value)}/></Field>}
  {canReview&&<><label><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/> J’ai examiné les observations, les photos éventuelles et le motif d’impossibilité éventuel ; je confirme le constat technique proposé.</label><Button disabled={busy||!confirmed||!reason.trim()||manifest.some(m=>!seen.includes(m.id))} onClick={()=>void review()}>{busy?'Enregistrement…':'Valider le contrôle RIA'}</Button></>}
  {manager&&!r.reviewedAt&&!r.returnReason&&r.confirmedAt&&<Button variant="secondary" disabled={busy||!reason.trim()} onClick={()=>void examine('return')}>Demander un nouveau contrôle</Button>}
  {error&&<p role="alert">{error}</p>}
 </Card>;
}

export function RiaRoundNavigation({children,ria,existingLabel='GE-01 · Électricité'}:{children:ReactNode;ria:ReactNode;existingLabel?:string}) {
 const [tab,setTab]=useState<'existing'|'ria'>('existing');
 return <><div className="workspace-tabs" role="tablist" aria-label="Équipement de la ronde"><button role="tab" aria-selected={tab==='existing'} className={tab==='existing'?'active':''} onClick={()=>setTab('existing')}>{existingLabel}</button><button role="tab" aria-selected={tab==='ria'} className={tab==='ria'?'active':''} onClick={()=>setTab('ria')}>RIA-01 · Incendie</button></div>{tab==='ria'?ria:children}</>;
}
