import { Field } from './ui';
import { activeWiloFields, isWiloFieldHidden, type WiloAnswers } from '../lib/wilo/report';
import { RoundDateTimeFields } from './shared/RoundDateTimeFields';

const TONES = ['normal', 'watch', 'critical'] as const;

/** Gravité croissante : la première option est l'état attendu, la dernière l'état le plus grave. */
function toneFor(index: number, total: number) {
  if (total <= 1) return 'normal';
  if (index === 0) return 'normal';
  if (index === total - 1) return TONES[2];
  return TONES[1];
}

function ChoiceSet({ code, label, options, value, onChange }: {
  code: string; label: string; options: [string, string][]; value: string; onChange: (value: string) => void;
}) {
  return <div className="choice-set" role="group" aria-label={label}>
    {options.map(([option, text], index) => {
      const selected = value === option;
      return <button
        type="button"
        key={`${code}-${option}`}
        className={`choice-chip tone-${toneFor(index, options.length)} ${selected ? 'is-selected' : ''}`}
        aria-pressed={selected}
        onClick={() => onChange(selected ? '' : option)}
      >{text}</button>;
    })}
  </div>;
}

export function WiloSupplement({ step, answers, reasons, pressure, onChange, onReason }: {
  step:number; answers:WiloAnswers; reasons:WiloAnswers; pressure:string;
  onChange:(code:string,value:string)=>void; onReason:(code:string,value:string)=>void;
}) {
  const fields = activeWiloFields(answers,pressure).filter(field=>field[3]===step && !isWiloFieldHidden(field[0], answers));
  if (fields.length === 0) return null;
  return <div className="surpresseur-fields wilo-supplement">
    <h4 className="wilo-supplement-title">Observations complémentaires</h4>
    <div className="wilo-supplement-grid">{fields.map(([code,label,type])=>{
    const numeric = type === 'bar' || type === '%';
    const unverified = answers[code]==='unknown';
    const answered = Boolean(answers[code]) && !unverified;
    const options:[string,string][] = type==='bool' ? [['yes','Oui'],['no','Non']] : type.split('|').map(v=>[v,v] as [string,string]);
    return <div key={code} className={`wilo-field ${unverified ? 'is-unverified' : ''}`}>
      {type==='datetime' ? <fieldset disabled={unverified}><legend>{label}</legend><RoundDateTimeFields value={unverified?'':answers[code]??''} onChange={v=>onChange(code,v)}/><p className="field-hint">Au moins 10 minutes après le premier relevé. Ce contrôle ne demande aucun réglage du coffret.</p></fieldset>
        : numeric || type==='time'
          ? <Field label={label}><input inputMode={numeric?'decimal':'text'} placeholder={type==='time'?'HH:MM':undefined} disabled={unverified} value={unverified?'':answers[code]??''} onChange={e=>onChange(code,e.target.value)}/></Field>
          : <><span className="field-label" id={`${code}-label`}>{label}</span><ChoiceSet code={code} label={label} options={options} value={unverified?'':answers[code]??''} onChange={v=>onChange(code,v)}/></>}
      {(numeric || type==='time' || type==='datetime')
        ? <><p className="measure-empty">{!answers[code]||unverified?'Valeur non renseignée · À COMPLÉTER':null}</p><label className="wilo-unverified-toggle"><input type="checkbox" checked={unverified} onChange={e=>onChange(code,e.target.checked?'unknown':'')}/> Mesure impossible à relever</label></>
        : <div className="wilo-field-foot">
            {answered ? null : <small className="field-hint">{unverified ? 'Contrôle non effectué : précisez pourquoi.' : 'À renseigner pendant la ronde.'}</small>}
            <button type="button" className="linkbtn wilo-unverified-link" aria-pressed={unverified} onClick={()=>onChange(code,unverified?'':'unknown')}>{unverified ? 'Je peux finalement vérifier' : 'Je ne peux pas vérifier'}</button>
          </div>}
      {unverified&&<Field label={`Motif — ${label}`}><input value={reasons[code]??''} onChange={e=>onReason(code,e.target.value)} placeholder="Précisez pourquoi le contrôle n’a pas pu être effectué"/></Field>}
    </div>;
  })}</div></div>;
}
