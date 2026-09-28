'use client';
import { Button } from '../ui';

/** Abidjan uses UTC year-round. Keep the persisted ISO timestamp unchanged until edited. */
export function RoundDateTimeFields({value,onChange}:{value:string;onChange:(value:string)=>void}) {
  const update=(date:string,time:string)=>{
    if(!date||!time)return;
    const next=new Date(`${date}T${time}:00Z`);
    if(Number.isFinite(next.getTime()))onChange(next.toISOString());
  };
  return <div className="field"><span>Date et heure du contrôle (Abidjan)</span><div className="ge-datetime-row">
    <input type="date" required lang="fr" aria-label="Date du contrôle" value={value.slice(0,10)} onChange={e=>update(e.target.value,value.slice(11,16))}/>
    <input type="time" required aria-label="Heure du contrôle (Abidjan)" value={value.slice(11,16)} onChange={e=>update(value.slice(0,10),e.target.value)}/>
    <Button type="button" variant="secondary" onClick={()=>onChange(new Date().toISOString())}>Maintenant</Button>
  </div></div>;
}
