import type { DomainPoints, V2Section } from '../lib/ui-contract/building-health';
import { InsufficientNote } from './shared';

const labels = { equipment:'Équipements', safety:'Sécurité', zones:'Zones', continuity:'Continuité' };
const points = new Intl.NumberFormat('fr-FR', { maximumFractionDigits:2 });

/** Display server subtotals only. No score or missing-value substitution in UI. */
export function DomainPointsSummary({ section }: { section?: V2Section<DomainPoints> }) {
  if (!section || section.status !== 'ready') return <InsufficientNote title="Points par domaine non disponibles" detail="Les preuves nécessaires au calcul ne sont pas encore disponibles pour cet espace." />;
  return <ul className="health-missing-list" aria-label="Points par domaine">
    {section.data.map(row => <li key={row.domain}><strong>{labels[row.domain]}</strong>{' : '}
      {row.status === 'ok' && row.obtained !== null ? `${points.format(row.obtained)} / ${row.max}` : 'Données insuffisantes'}
    </li>)}
  </ul>;
}
