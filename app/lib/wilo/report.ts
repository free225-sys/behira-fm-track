import type { FieldCheckInput } from '../offline/types';
import { reasonError, reasonProblem } from '../input-rules';

// Sources: REF-20260901 decisions 17/09 (S03/S04/S06 WILO),
// equipment dictionary 09/09 and WILO technical sheet 28/06 for observations.
// This module proposes findings, never a health score or operational status.
export type WiloAnswers = Record<string, string>;
export const WILO_FIELDS = [
  ['TYPE_RONDE', 'Type de ronde', 'Quotidienne|Après intervention|Contrôle exceptionnel', 0],
  ['MANO_LISIBLE', 'Manomètre lisible', 'Oui|Non', 1],
  ['PRESSION_MANOMETRE', 'Pression lue au manomètre mécanique (bar)', 'bar', 1],
  ['PRESSION_CONFIRMATION', 'Second relevé de pression coffret (bar)', 'bar', 1],
  ['PRESSION_CONFIRMATION_AT', 'Date et heure du second relevé (Abidjan)', 'datetime', 1],
  ['STABILITE_MANOMETRE', 'Stabilité du manomètre', 'Stable|Oscillation légère|Oscillation importante', 1],
  ['ETAT_BACHE', 'Niveau observé de la bâche', 'Normal|Bas|Très bas / manque d’eau', 1],
  ['ETAT_P1', 'État observé P1', 'Marche|Arrêt disponible|Défaut|Écran éteint|Indisponible', 2],
  ['CHARGE_P1', 'Charge affichée P1 (%)', '%', 2],
  ['ETAT_P2', 'État observé P2', 'Marche|Arrêt disponible|Défaut|Écran éteint|Indisponible', 2],
  ['CHARGE_P2', 'Charge affichée P2 (%)', '%', 2],
  ['ALTERNANCE', 'Alternance constatée', 'Oui|Non', 2],
  ['SECOURS_DISPONIBLE', 'Pompe de secours disponible', 'Oui|Non', 2],
  ['MANQUE_EAU', 'Alarme manque d’eau', 'Aucune|Mémorisée|Active', 3],
  ['FUITE_DETAIL', 'Fuite sur collecteurs ou vannes', 'Aucune|Suintement|Fuite continue / flaque', 3],
  ['BRUIT', 'Bruit et vibrations', 'Normal|Vibration légère|Bruit fort / cavitation', 3],
  ['BALLON', 'État visuel du ballon à vessie', 'Normal|À surveiller|Fuite / corrosion / valve suspecte', 3],
  ['COFFRET', 'Coffret, câbles et humidité', 'Normal|Chaud / défaut mémorisé|Odeur brûlé / humidité / défaut actif', 3],
  ['LOCAL', 'Propreté du local', 'Propre et sec|Poussière / humidité légère|Eau au sol / local sale', 3],
  ['REARMEMENT', 'Réarmement effectué', 'bool', 3],
  ['HEURE_REARMEMENT', 'Heure du réarmement (Abidjan, HH:MM)', 'time', 3],
  ['POMPE_REARMEE', 'Pompe ou système réarmé', 'P1|P2|P1 et P2|Système', 3],
  ['RESULTAT_REARMEMENT', 'Résultat du réarmement', 'Retour en service|Défaut persistant|Défaut revenu', 3],
  ['OBSERVATION_REARMEMENT', 'Observation après réarmement', 'Insuffisante|Stable 15 min|Stable 30 min|Stable 1 h', 3],
  ['RECIDIVE_7J', 'Même défaut déjà survenu dans les 7 jours', 'bool', 3],
] as const;
/** DEC-019 : réponses déduites d'une autre question, envoyées au serveur mais plus demandées à l'agent. */
export const WILO_DERIVED_FIELDS = new Set(['SECOURS_DISPONIBLE']);
/** DEC-019 : contrôles de base déduits (P1/P2 de l'état observé, fuite du détail de fuite). */
export const WILO_DERIVED_CONTROLS: Record<string, string> = { p1: 'ETAT_P1', p2: 'ETAT_P2', leak: 'FUITE_DETAIL' };
/** Disponibilité déduite de l'état observé d'une pompe. */
export function pumpAvailability(state: string | undefined): boolean | null {
  if (!state || state === 'unknown') return null;
  return ['Marche', 'Arrêt disponible'].includes(state);
}
/** Absence de fuite active déduite du détail de fuite (un suintement n'est pas une fuite active). */
export function noActiveLeak(detail: string | undefined): boolean | null {
  if (!detail || detail === 'unknown') return null;
  return detail !== 'Fuite continue / flaque';
}
/** Champs non affichés : déduits (DEC-019), ou date du second relevé quand ce relevé est déclaré impossible
 * (son motif vaut pour les deux ; la date est alors envoyée « non vérifiée » avec ce même motif). */
export function isWiloFieldHidden(code: string, answers: WiloAnswers): boolean {
  return WILO_DERIVED_FIELDS.has(code) || (code === 'PRESSION_CONFIRMATION_AT' && answers.PRESSION_CONFIRMATION === 'unknown');
}
export const WILO_RESET_FIELDS = new Set(['HEURE_REARMEMENT', 'POMPE_REARMEE', 'RESULTAT_REARMEMENT', 'OBSERVATION_REARMEMENT', 'RECIDIVE_7J']);
export function activeWiloFields(answers: WiloAnswers, pressure = '') {
  return WILO_FIELDS.filter(([code]) => (!WILO_RESET_FIELDS.has(code) || answers.REARMEMENT === 'yes')
    && (!code.startsWith('PRESSION_CONFIRMATION') || wiloPressureState(pressure)==='critical'));
}
export function measuredNumber(value: string): number | null {
  const text = value.trim().replace(',', '.');
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const n = Number(text);
  return Number.isFinite(n) ? n : null;
}
export function wiloPressureState(value: string): 'missing' | 'normal' | 'alert' | 'critical' {
  const n = measuredNumber(value);
  if (n === null) return 'missing';
  if (n < 4 || n > 6) return 'critical';
  return n < 4.5 || n > 5.5 ? 'alert' : 'normal';
}
export function wiloSupplementChecks(answers: WiloAnswers, reasons: WiloAnswers, pressure = ''): FieldCheckInput[] {
  return activeWiloFields(answers,pressure).map(([code, label, type]) => {
    if (code === 'PRESSION_CONFIRMATION_AT' && answers.PRESSION_CONFIRMATION === 'unknown') {
      return { code, label, status:'not_checked', notes:reasons.PRESSION_CONFIRMATION?.trim() || 'Second relevé non réalisé' };
    }
    const value = answers[code]?.trim();
    if (!value || value === 'unknown') {
      { const problem = reasonError(reasons[code], label); if (problem) throw new Error(problem); }
      return { code, label, status:'not_checked', notes:reasons[code].trim() };
    }
    if (type === 'bar' || type === '%') {
      const n = measuredNumber(value);
      if (n === null || (type === '%' && n > 100)) throw new Error(`${label} : valeur ${type === '%' ? 'de 0 à 100' : 'positive ou nulle'} attendue.`);
      return { code, label, status:'ok', valueNumeric:n, unit:type };
    }
    if (type === 'bool') {
      if (!['yes', 'no'].includes(value)) throw new Error(`${label} : réponse invalide.`);
      return { code, label, status:'ok', valueBoolean:value === 'yes' };
    }
    if (type === 'time') {
      if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) throw new Error(`${label} : heure invalide.`);
      return { code, label, status:'ok', valueText:value, notes:'Africa/Abidjan ; date de la ronde' };
    }
    if (type === 'datetime') {
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error(`${label} : date invalide.`);
      return {code,label,status:'ok',valueText:value};
    }
    if (!(type as string).split('|').includes(value)) throw new Error(`${label} : réponse invalide.`);
    return { code, label, status:'ok', valueText:value };
  });
}
export function wiloSupplementFindings(answers: WiloAnswers, pressure: string): string[] {
  const findings: string[] = [];
  const negative: Record<string, string[]> = {
    MANO_LISIBLE:['Non'], STABILITE_MANOMETRE:['Oscillation légère','Oscillation importante'],
    ETAT_BACHE:['Bas','Très bas / manque d’eau'], ALTERNANCE:['Non'], SECOURS_DISPONIBLE:['Non'],
    MANQUE_EAU:['Mémorisée','Active'], FUITE_DETAIL:['Suintement','Fuite continue / flaque'],
    BRUIT:['Vibration légère','Bruit fort / cavitation'], BALLON:['À surveiller','Fuite / corrosion / valve suspecte'],
    COFFRET:['Chaud / défaut mémorisé','Odeur brûlé / humidité / défaut actif'], LOCAL:['Poussière / humidité légère','Eau au sol / local sale'],
  };
  for (const [code, values] of Object.entries(negative)) if (values.includes(answers[code])) findings.push(code);
  // The recent decision explicitly retains >=98%; the older 90% proposal is not promoted here.
  for (const code of ['CHARGE_P1','CHARGE_P2']) if ((measuredNumber(answers[code] ?? '') ?? -1) >= 98) findings.push(code);
  const p = measuredNumber(pressure), g = measuredNumber(answers.PRESSION_MANOMETRE ?? '');
  if (p !== null && g !== null && Math.round(Math.abs(p-g)*1e9)/1e9 > 0.7) findings.push('PRESSION_MANOMETRE');
  if (answers.REARMEMENT === 'yes') findings.push('REARMEMENT');
  return findings;
}

export function buildWiloChecks(pressure:string, tank:string, controls:Record<string,boolean|null>, answers:WiloAnswers, reasons:WiloAnswers, photoException:string, performedAt?:string):FieldCheckInput[] {
  const extra = wiloSupplementChecks(answers,reasons,pressure);
  if (wiloPressureState(pressure)==='critical' && answers.PRESSION_CONFIRMATION_AT && answers.PRESSION_CONFIRMATION_AT!=='unknown') {
    const second=Date.parse(answers.PRESSION_CONFIRMATION_AT), first=Date.parse(performedAt??'');
    if (!Number.isFinite(first) || second-first<600_000 || second>Date.now()) throw new Error('Second relevé : au moins 10 minutes après le premier, sans date future.');
  }
  const findings = wiloSupplementFindings(answers,pressure);
  const numeric = (code:string,label:string,value:string,unit:string):FieldCheckInput => {
    if (!value.trim() && reasons[code]?.trim()) { const problem = reasonError(reasons[code], label); if (problem) throw new Error(problem); return {code,label,status:'not_checked',notes:reasons[code].trim()}; }
    const n = measuredNumber(value);
    if (n === null || (unit==='%' && n>100)) throw new Error(`${label} : indiquez une mesure valide${unit==='%'?' de 0 à 100':''}, ou un motif de non-relevé.`);
    const state = code==='PRESSION_RESEAU'?wiloPressureState(value):'normal';
    return {code,label,unit,valueNumeric:n,status:state==='critical'?'critical':state==='alert'?'alert':'ok'};
  };
  const base:FieldCheckInput[] = [numeric('PRESSION_RESEAU','Pression coffret',pressure,'bar'),numeric('NIVEAU_BACHE','Niveau de bâche mesuré',tank,'%')];
  for (const [code,label] of [['auto','Mode automatique actif'],['p1','Pompe P1 disponible'],['p2','Pompe P2 disponible'],['leak','Absence de fuite active'],['valves','Vannes en position normale'],['alarm','Aucune alarme active']]) {
    if (typeof controls[code]!=='boolean') {
      // DEC-020 : « Non vérifié » avec motif ; pour un contrôle déduit, le motif est celui de la question source.
      const reason = (reasons[code.toUpperCase()] || (WILO_DERIVED_CONTROLS[code] ? reasons[WILO_DERIVED_CONTROLS[code]] : '') || '').trim();
      if (!reason) throw new Error(`${label} : contrôle à renseigner.`);
      { const problem = reasonError(reason, label); if (problem) throw new Error(problem); }
      base.push({code:code.toUpperCase(),label,status:'not_checked',notes:reason});
      continue;
    }
    base.push({code:code.toUpperCase(),label,status:controls[code]?'ok':'alert',valueBoolean:controls[code]});
  }
  for (const pump of ['p1','p2']) {
    const state=answers[`ETAT_${pump.toUpperCase()}`];
    if (state && state!=='unknown' && controls[pump]!==['Marche','Arrêt disponible'].includes(state)) throw new Error(`État et disponibilité ${pump.toUpperCase()} contradictoires.`);
  }
  if (answers.FUITE_DETAIL && answers.FUITE_DETAIL!=='unknown' && controls.leak !== (answers.FUITE_DETAIL!=='Fuite continue / flaque')) throw new Error('Le détail de fuite contredit le contrôle d’absence de fuite active.');
  if (answers.MANQUE_EAU==='Active' && controls.alarm===true) throw new Error('Alarme manque d’eau active : corrigez le contrôle « Aucune alarme active ».');
  const leak = answers.FUITE_DETAIL;
  if (leak && leak!=='unknown') base.push({code:'FUITE_PRESENTE',label:'Fuite présente',status:leak==='Aucune'?'ok':'alert',valueBoolean:leak!=='Aucune'});
  else base.push({code:'FUITE_PRESENTE',label:'Fuite présente',status:'not_checked',notes:reasons.FUITE_DETAIL||'Détail de fuite non vérifié'});
  if (photoException.trim()) { const problem = reasonProblem(photoException, 'Motif d’absence de photo'); if (problem) throw new Error(problem); }
  if (photoException.trim()) base.push({code:'PHOTO_EXCEPTION',label:'Motif d’impossibilité de photo',status:'ok',valueText:photoException.trim()});
  return [{code:"WILO_RULE_VERSION",label:"Version des règles WILO",status:"ok",valueText:"wilo.20260928.v1"},...base,...extra.map(c=>({...c,status:findings.includes(c.code)?'alert' as const:c.status}))];
}
