import { useId } from 'react';
import { Badge } from './ui';

import { normalizeAntiZombieSummary, type AntiZombieSummaryData } from './anti-zombie-contract';

const UNSET = [
  'Responsable non attribué',
  'Acteur attendu non renseigné',
  'Prochaine action non renseignée',
  'Échéance non renseignée',
  'Aucun blocage déclaré',
  'Motif non renseigné',
  'Preuve attendue non définie',
  'Historique indisponible',
];

export function AntiZombieSummary({ data, variant = 'standard', hideMissing = false }: { data: AntiZombieSummaryData; variant?:'compact'|'standard'|'detailed'; hideMissing?: boolean }) {
  const headingId = useId();
  const summary = normalizeAntiZombieSummary(data);
  const stateTone = summary.isBlocked ? 'danger' : summary.isDelayed ? 'warning' : 'neutral';
  const continuity = summary.isBlocked ? 'Bloqué' : summary.isDelayed ? 'En retard' : 'NORMALE';

  const fields = [
    { label:'Prochaine action', value:summary.nextAction, meta:summary.nextActionDetail, priority:true, missing:summary.nextAction === 'Prochaine action non renseignée' },
    { label:'Acteur attendu', value:summary.expectedActor, priority:true, missing:summary.expectedActor === 'Acteur attendu non renseigné' },
    { label:'Responsable interne', value:summary.responsible, priority:true, missing:summary.responsible === 'Responsable non attribué' },
    { label:'SLA / Échéance', value:summary.deadlineOrSla, priority:true, missing:summary.deadlineOrSla === 'Échéance non renseignée' },
    { label:'Acteur bloquant', value:summary.blockingActor, priority:true, missing:summary.isBlocked && summary.blockingActor === 'Acteur bloquant non renseigné' },
    { label:'Étape actuelle', value:summary.status, state:`Dossier ${summary.dossierState.toLowerCase()}` },
    { label:'Motif du blocage ou du retard', value:summary.blockingOrDelayReason, missing:summary.blockingOrDelayReason === 'Motif non renseigné' },
    { label:'Preuve attendue', value:summary.expectedProof, meta:summary.expectedProofState, missing:summary.expectedProof === 'Preuve attendue non définie' },
    { label:'Dernière activité', value:summary.lastActivityLabel, meta:summary.lastActivityMeta, missing:summary.lastActivityLabel === 'Historique indisponible' },
  ];
  const visible = hideMissing
    ? fields.filter((field) => !field.missing && !UNSET.includes(String(field.value ?? '')))
    : fields;

  return (
    <section className={`anti-zombie-summary anti-zombie-${variant}`} aria-labelledby={headingId} tabIndex={0}>
      <header className="anti-zombie-summary-head">
        <span aria-hidden="true">AZ</span>
        <div>
          <p>CONTINUITÉ DE TRAITEMENT</p>
          <h4 id={headingId}>Synthèse de pilotage</h4>
        </div>
        <Badge tone={stateTone === 'danger' ? 'critical' : stateTone === 'warning' ? 'orange' : 'neutral'}>{continuity === 'NORMALE' ? 'Normale' : continuity}</Badge>
      </header>

      {summary.blockingInformationIncomplete && (
        <p className="anti-zombie-alert" role="alert">Informations de blocage à compléter</p>
      )}

      <dl className="anti-zombie-fields">
        {visible.map((field) => (
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
