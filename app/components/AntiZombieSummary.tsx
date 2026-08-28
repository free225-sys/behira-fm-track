import { useId } from 'react';

import { normalizeAntiZombieSummary, type AntiZombieSummaryData } from './anti-zombie-contract';

export function AntiZombieSummary({ data, variant = 'standard' }: { data: AntiZombieSummaryData; variant?:'compact'|'standard'|'detailed' }) {
  const headingId = useId();
  const summary = normalizeAntiZombieSummary(data);

  const fields = [
    { label:'Prochaine action', value:summary.nextAction, priority:true, missing:summary.nextAction === 'Prochaine action non renseignée' },
    { label:'Responsable', value:summary.responsible, priority:true, missing:summary.responsible === 'Responsable non attribué' },
    { label:'SLA / Échéance', value:summary.deadlineOrSla, priority:true, missing:summary.deadlineOrSla === 'Échéance non renseignée' },
    { label:'Acteur bloquant', value:summary.blockingActor, priority:true, missing:summary.isBlocked && summary.blockingActor === 'Acteur bloquant non renseigné' },
    { label:'Étape actuelle', value:summary.status, state:`Dossier ${summary.dossierState.toLowerCase()}` },
    { label:'Motif du blocage ou du retard', value:summary.blockingOrDelayReason, missing:summary.blockingOrDelayReason === 'Motif non renseigné' },
    { label:'Preuve attendue', value:summary.expectedProof, meta:summary.expectedProofState, missing:summary.expectedProof === 'Preuve attendue non définie' },
    { label:'Dernière activité', value:summary.lastActivityLabel, meta:summary.lastActivityMeta, missing:summary.lastActivityLabel === 'Historique indisponible' },
  ];

  return (
    <section className={`anti-zombie-summary anti-zombie-${variant}`} aria-labelledby={headingId} tabIndex={0}>
      <header className="anti-zombie-summary-head">
        <span aria-hidden="true">AZ</span>
        <div>
          <p>CONTINUITÉ DE TRAITEMENT</p>
          <h4 id={headingId}>Synthèse de pilotage</h4>
        </div>
        <strong>{summary.isBlocked ? 'BLOQUÉ' : summary.isDelayed ? 'EN RETARD' : 'NORMALE'}</strong>
      </header>

      {summary.blockingInformationIncomplete && (
        <p className="anti-zombie-alert" role="alert">Informations de blocage à compléter</p>
      )}

      <dl className="anti-zombie-fields">
        {fields.map((field) => (
          <div className={`${field.priority ? 'priority' : 'secondary'}${field.missing ? ' missing' : ''}`} key={field.label}>
            <dt>{field.label}</dt>
            <dd>{field.value}</dd>
            {field.meta && <small>{field.meta}</small>}
            {field.state && <small>{field.state}</small>}
          </div>
        ))}
      </dl>
    </section>
  );
}
