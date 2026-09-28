import { Field, Select } from './ui';
import { activeWiloFields, type WiloAnswers } from '../lib/wilo/report';
import { RoundDateTimeFields } from './shared/RoundDateTimeFields';

export function WiloSupplement({ step, answers, reasons, pressure, onChange, onReason }: {
  step:number; answers:WiloAnswers; reasons:WiloAnswers; pressure:string;
  onChange:(code:string,value:string)=>void; onReason:(code:string,value:string)=>void;
}) {
  const fields = activeWiloFields(answers,pressure).filter(field=>field[3]===step);
  if (fields.length === 0) return null;
  return <div className="surpresseur-fields wilo-supplement"><h4 className="wilo-supplement-title">Observations complémentaires</h4><div className="wilo-supplement-grid">{activeWiloFields(answers,pressure).filter(field=>field[3]===step).map(([code,label,type])=>{
    const numeric = type === 'bar' || type === '%';
    return <div key={code}>
      {type==='datetime' ? <fieldset disabled={answers[code]==='unknown'}><legend>{label}</legend><RoundDateTimeFields value={answers[code]==='unknown'?'':answers[code]??''} onChange={v=>onChange(code,v)}/><p>Au moins 10 minutes après le premier relevé. Ce contrôle ne demande aucun réglage du coffret.</p></fieldset> : <Field label={label}>{numeric || type==='time' ? <input inputMode={numeric?'decimal':'text'} placeholder={type==='time'?'HH:MM':undefined} disabled={answers[code]==='unknown'} value={answers[code]==='unknown'?'':answers[code]??''} onChange={e=>onChange(code,e.target.value)}/>
        : <Select value={answers[code]??''} onChange={e=>onChange(code,e.target.value)}><option value="">À contrôler</option>{(type==='bool'?[['yes','Oui'],['no','Non']]:type.split('|').map(v=>[v,v])).map(([v,text])=><option key={v} value={v}>{text}</option>)}<option value="unknown">Non vérifié</option></Select>}</Field>}
      {(numeric || type==='time' || type==='datetime') && <><p className="measure-empty">{!answers[code]||answers[code]==='unknown'?'Valeur non renseignée · À COMPLÉTER':null}</p><label><input type="checkbox" checked={answers[code]==='unknown'} onChange={e=>onChange(code,e.target.checked?'unknown':'')}/> Non relevé</label></>}
      {answers[code]==='unknown'&&<Field label={`Motif — ${label}`}><input value={reasons[code]??''} onChange={e=>onReason(code,e.target.value)} placeholder="Précisez pourquoi le contrôle n’a pas pu être effectué"/></Field>}
    </div>;
  })}</div></div>;
}
