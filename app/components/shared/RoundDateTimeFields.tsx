'use client';
import { Button } from '../ui';
import { useState } from 'react';

/** Abidjan uses UTC year-round. Keep the persisted ISO timestamp unchanged until edited. */
export function RoundDateTimeFields({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const [parts,setParts]=useState({source:value,date:value.slice(0,10),time:value.slice(11,16)});
  if(parts.source!==value)setParts({source:value,date:value.slice(0,10),time:value.slice(11,16)});
  const {date,time}=parts;
  const update=(date:string,time:string)=>{
    if(!date||!time){if(value)onChange('');return;}
    const next=new Date(`${date}T${time}:00Z`);
    if(Number.isFinite(next.getTime()))onChange(next.toISOString());
  };
  return <div className="field"><span>Date et heure du contrôle (Abidjan)</span><div className="ge-datetime-row">
    <input type="date" required lang="fr" aria-label="Date du contrôle" value={date} onChange={e=>{setParts({...parts,date:e.target.value});update(e.target.value,time);}}/>
    <input type="time" required aria-label="Heure du contrôle (Abidjan)" value={time} onChange={e=>{setParts({...parts,time:e.target.value});update(date,e.target.value);}}/>
    <Button type="button" variant="secondary" onClick={()=>onChange(new Date().toISOString())}>Maintenant</Button>
  </div></div>;
}
