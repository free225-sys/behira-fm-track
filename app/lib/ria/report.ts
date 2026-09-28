import type { FieldCheckInput, FieldRoundPayload } from '../offline/types';

export const RIA_VERSION = 'ria.20260917.v1';
export const RIA_FIELDS = [
  ['access','Accès au local dégagé','bool'], ['floor','Sol du local','Sec|Humide|Eau stagnante'],
  ['clean','Local propre','bool'], ['light','Éclairage fonctionnel','bool'],
  ['odor','Absence d’odeur de brûlé','bool'], ['heat','Température du local normale','bool'],
  ['gmp_power','Coffret GMP sous tension','bool'], ['gmp_mode','Mode du coffret GMP','Auto|Manuel justifié|Manuel non justifié|Off'],
  ['gmp_display','Afficheur GMP lisible','bool'], ['gmp_fault','Voyant défaut GMP actif','bool'],
  ['gmp_stop','STOP enclenché','bool'], ['isg_on','Coffret ISG100 sur ON','bool'],
  ['isg_auto','ISG100 en Auto','bool'], ['isg_fault','Voyant défaut ISG100 actif','bool'],
  ['isg_closed','Coffret ISG100 fermé et propre','bool'],
  ['pressure_p1','Pression P1 (bar)','number'], ['pressure_p2','Pression P2 (bar)','number'],
  ['danfoss_cover','Capots Danfoss présents et intacts','bool'], ['danfoss_cables','Câbles Danfoss intacts et secs','bool'],
  ['danfoss_fixed','Pressostats correctement fixés','bool'],
  ['jockey','Pompe jockey opérationnelle','bool'], ['ria1','Pompe RIA 1 opérationnelle','bool'],
  ['ria2','Pompe RIA 2 opérationnelle','bool'], ['alternation','Alternance des pompes constatée','bool'],
  ['suction','Vanne d’aspiration ouverte','bool'], ['discharge','Vanne de refoulement ouverte','bool'],
  ['leak_kind','Fuite visible','Aucune|Suintement|Active'], ['corrosion','Corrosion','Aucune|Légère|Avancée'],
  ['supports','Supports et brides en bon état','bool'],
] as const;
export const RIA_PHOTOS = { gmp:'Coffret GMP', isg:'Coffret ISG100', gauges:'Manomètres P1 et P2', room:'Local', defect:'Anomalie constatée' };
export type RiaPhoto = {id:string; purpose:keyof typeof RIA_PHOTOS; file:File};
export type RiaDraft = {id:string; performedAt:string; answers:Record<string,string>; reasons:Record<string,string>; photos:RiaPhoto[]; summary:string; queued:boolean; photoExceptionReason?:string; confirmedReference?:string};
export const emptyRiaDraft = ():RiaDraft => ({id:crypto.randomUUID(),performedAt:new Date().toISOString(),answers:{},reasons:{},photos:[],summary:'',queued:false});
export function riaChecks(d:RiaDraft):FieldCheckInput[] {
  const checks:FieldCheckInput[] = RIA_FIELDS.map(([code,label,type]) => {
    const value=d.answers[code];
    if (!value || value==='unknown') {
      if (!d.reasons[code]?.trim()) throw new Error(`${label} : renseignez le contrôle ou le motif de non-vérification.`);
      return {code,label,status:'not_checked',notes:d.reasons[code].trim()};
    }
    if(type==='number') {
      const n=Number(value.replace(',','.'));
      if(!Number.isFinite(n)||n<0) throw new Error(`${label} : valeur positive ou nulle attendue.`);
      return {code,label,status:'ok',valueNumeric:n,unit:'bar'};
    }
    if(type==='bool') {
      if(!['yes','no'].includes(value)) throw new Error(`${label} : réponse invalide.`);
      return {code,label,status:'ok',valueBoolean:value==='yes'};
    }
    if(!type.split('|').includes(value)) throw new Error(`${label} : réponse invalide.`);
    return {code,label,status:'ok',valueText:value};
  });
  const derived = (code:string,value:boolean|undefined) => checks.push({code,label:code,status:value===undefined?'not_checked':'ok',...(value===undefined?{notes:'Observation source non vérifiée'}:{valueBoolean:value})});
  const mode=d.answers.gmp_mode;
  derived('gmp_auto',!mode||mode==='unknown'?undefined:mode==='Auto');
  derived('gmp_off',!mode||mode==='unknown'?undefined:mode==='Off');
  derived('valves_open',[d.answers.suction,d.answers.discharge].some(x=>!x||x==='unknown')?undefined:d.answers.suction==='yes'&&d.answers.discharge==='yes');
  derived('leak',!d.answers.leak_kind||d.answers.leak_kind==='unknown'?undefined:d.answers.leak_kind!=='Aucune');
  if(d.photoExceptionReason?.trim()) checks.push({code:'PHOTO_EXCEPTION',label:'Motif d’impossibilité de photo',status:'ok',valueText:d.photoExceptionReason.trim()});
  return checks;
}
export async function riaManifest(photos:RiaPhoto[]) {
  if(photos.length>8||new Set(photos.map(p=>p.id)).size!==photos.length) throw new Error('Huit photos maximum, sans doublon.');
  return Promise.all(photos.map(async p=>{
    if(!Object.hasOwn(RIA_PHOTOS,p.purpose)||!['image/jpeg','image/png','image/webp'].includes(p.file.type)||p.file.size<1||p.file.size>10*1024*1024) throw new Error('Photo : JPG, PNG ou WebP, 10 Mo maximum.');
    return {id:p.id,purpose:p.purpose,mimeType:p.file.type,size:p.file.size,sha256:Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await p.file.arrayBuffer()))).map(x=>x.toString(16).padStart(2,'0')).join('')};
  }));
}
export function riaHasAnomaly(d:RiaDraft):boolean {
 const a=d.answers;
 const positives=RIA_FIELDS.filter(x=>x[2]==='bool'&&!['gmp_fault','gmp_stop','isg_fault'].includes(x[0])).map(x=>x[0]);
 const p1=Number((a.pressure_p1??'').replace(',','.')),p2=Number((a.pressure_p2??'').replace(',','.'));
 return positives.some(k=>a[k]==='no')||['gmp_fault','gmp_stop','isg_fault'].some(k=>a[k]==='yes')
   ||['Off','Manuel non justifié'].includes(a.gmp_mode)||['Humide','Eau stagnante'].includes(a.floor)
   ||['Suintement','Active'].includes(a.leak_kind)||['Légère','Avancée'].includes(a.corrosion)
   ||(!!a.pressure_p1&&!!a.pressure_p2&&Number.isFinite(p1)&&Number.isFinite(p2)&&((p1+p2)/2<4.5||(p1+p2)/2>5.5||Math.abs(p1-p2)>=0.6-1e-9));
}
export function riaPayload(d:RiaDraft):FieldRoundPayload {
  if(riaHasAnomaly(d)&&!d.photos.some(p=>p.purpose==='defect')&&!d.photoExceptionReason?.trim()) throw new Error('Joignez une photo de l’anomalie ou indiquez pourquoi elle est impossible.');
  return {equipmentCode:'RIA-01',reportType:'technical_round',performedAt:d.performedAt,summary:d.summary,checks:riaChecks(d),riaEvidence:d.photos};
}
