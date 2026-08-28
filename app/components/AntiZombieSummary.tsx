import { useId } from 'react';

import { normalizeAntiZombieSummary, type AntiZombieSummaryData } from './anti-zombie-contract';

export function AntiZombieSummary({ data }: { data: AntiZombieSummaryData }) {
  const headingId = useId();
  const summary = normalizeAntiZombieSummary(data);

  const fields = [
    { label:'Prochaine action', value:summary.nextAction, priority:true, missing:summary.nextAction === 'Prochaine action non renseignée' },
    { label:'Responsable', value:summary.responsible, priority:true, missing:summary.responsible === 'Responsable non attribué' },
    { label:'SLA / Échéance', value:summary.deadlineOrSla, priority:true, missing:summary.deadlineOrSla === 'Échéance non renseignée' },
    { label:'Acteur bloquant', value:summary.blockingActor, priority:true, missing:summary.isBlocked && summary.blockingActor === 'Acteur bloquant non renseigné' },
    { label:'Statut', value:summary.status, state:summary.isBlocked ? 'Bloqué' : summary.isDelayed ? 'En retard' : 'État actuel' },
    { label:'Motif du blocage ou du retard', value:summary.blockingOrDelayReason, missing:summary.blockingOrDelayReason === 'Motif non renseigné' },
    { label:'Preuve attendue', value:summary.expectedProof, missing:summary.expectedProof === 'Preuve attendue non définie' },
    { label:'Dernière activité', value:summary.lastActivityLabel, meta:summary.lastActivityMeta, missing:summary.lastActivityLabel === 'Historique indisponible' },
  ];

  return (
    <section className="anti-zombie-summary" aria-labelledby={headingId} tabIndex={0}>
      <header className="anti-zombie-summary-head">
        <span aria-hidden="true">AZ</span>
        <div>
          <p>LECTURE ANTI-DOSSIER DORMANT</p>
          <h4 id={headingId}>Synthèse de pilotage</h4>
        </div>
        <strong>{summary.isBlocked ? 'BLOQUÉ' : summary.isDelayed ? 'EN RETARD' : 'ACTIF'}</strong>
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
