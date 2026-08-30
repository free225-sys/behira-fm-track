'use client';

import { useMemo, useState } from 'react';

import { Badge, Button, Card, Field } from './ui';

export type CostsWorkspaceItem = {
  id:string;
  anomaly:string;
  asset:string;
  title:string;
  kind:string;
  amount:number | null;
  due:string;
  state:string;
};

type CostFilter = 'all' | 'documented' | 'above-threshold' | 'missing';

function formatMoney(value:number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
}

function stateTone(state:string) {
  if (state === 'Approuvée') return 'success';
  if (state === 'Refusée') return 'critical';
  if (state === 'Renvoyée à Facility Manager') return 'orange';
  return 'neutral';
}

export function CostsWorkspace({ items, audience, threshold, onOpenDossier }: {
  items:CostsWorkspaceItem[];
  audience:'administration' | 'facility';
  threshold:number;
  onOpenDossier:(id:string)=>void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CostFilter>('all');
  const documentedItems = useMemo(() => items.filter((item) => item.amount !== null), [items]);
  const documentedTotal = documentedItems.reduce((total,item) => total + (item.amount ?? 0),0);
  const overThresholdCount = documentedItems.filter((item) => (item.amount ?? 0) >= threshold).length;
  const missingCount = items.length - documentedItems.length;
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.id} ${item.anomaly} ${item.asset} ${item.title} ${item.kind} ${item.state}`.toLocaleLowerCase('fr').includes(normalizedQuery);
      const matchesFilter = filter === 'all'
        || (filter === 'documented' && item.amount !== null)
        || (filter === 'above-threshold' && item.amount !== null && item.amount >= threshold)
        || (filter === 'missing' && item.amount === null);
      return matchesQuery && matchesFilter;
    });
  }, [filter, items, query, threshold]);

  return <section className="costs-workspace" aria-labelledby="costs-workspace-title">
    <header className="costs-workspace-hero">
      <div>
        <p className="design-kicker">PILOTAGE</p>
        <h2 id="costs-workspace-title" className="visually-hidden">Coûts</h2>
        <p>{audience === 'administration' ? 'Coûts documentés soumis à arbitrage. Les décisions restent dans l’espace Administration.' : 'Coûts documentés liés aux dossiers. Les arbitrages au-delà du seuil restent réservés à l’Administration.'}</p>
      </div>
      <Badge tone={audience === 'administration' ? 'blue' : 'neutral'}>{audience === 'administration' ? 'VUE GLOBALE' : 'LECTURE OPÉRATIONNELLE'}</Badge>
    </header>

    <section className="costs-summary" aria-label="Synthèse des coûts disponibles">
      <Card className="costs-summary-card">
        <span>MONTANTS RENSEIGNÉS</span><strong>{formatMoney(documentedTotal)}</strong><small>Somme des arbitrages visibles</small>
      </Card>
      <Card className="costs-summary-card">
        <span>DOSSIERS CHIFFRÉS</span><strong>{documentedItems.length}</strong><small>sur {items.length} arbitrages visibles</small>
      </Card>
      <Card className="costs-summary-card">
        <span>AU-DESSUS DU SEUIL</span><strong>{overThresholdCount}</strong><small>Seuil confirmé : {formatMoney(threshold)}</small>
      </Card>
      <Card className="costs-summary-card is-insufficient">
        <span>BUDGET · ENGAGÉ · PAYÉ</span><strong>Données insuffisantes</strong><small>Aucune source canonique disponible</small>
      </Card>
    </section>

    <Card as="section" className="costs-catalogue">
      <div className="costs-catalogue-head">
        <div><p className="design-kicker">DOSSIERS FINANCIERS</p><h3>Montants et arbitrages</h3><p>Un montant soumis à décision n’est pas considéré comme engagé ou payé.</p></div>
        <span className="panel-count">{filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''}</span>
      </div>
      <div className="costs-filters">
        <Field label="Rechercher un dossier">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Décision, anomalie, équipement…" />
        </Field>
        <Field label="Disponibilité du montant">
          <select value={filter} onChange={(event) => setFilter(event.target.value as CostFilter)}>
            <option value="all">Tous les arbitrages</option>
            <option value="documented">Montant renseigné</option>
            <option value="above-threshold">Au-dessus du seuil</option>
            <option value="missing">Montant non renseigné</option>
          </select>
        </Field>
      </div>

      {missingCount > 0 && <div className="costs-data-notice" role="note"><span aria-hidden="true">i</span><p><b>{missingCount} arbitrage{missingCount > 1 ? 's' : ''} sans montant</b><small>Ces dossiers restent visibles mais ne sont pas inclus dans le total documenté.</small></p></div>}

      {filteredItems.length === 0 ? <div className="costs-empty" role="status"><span aria-hidden="true">⌕</span><div><h3>Aucun dossier trouvé</h3><p>Élargissez la recherche ou choisissez un autre filtre.</p></div></div> : <div className="costs-list">
        {filteredItems.map((item) => {
          const overThreshold = item.amount !== null && item.amount >= threshold;
          return <Card key={item.id} className="costs-case-card">
            <div className="costs-case-heading">
              <span className="costs-case-mark" aria-hidden="true">₣</span>
              <div><small>{item.asset} · {item.id} · {item.anomaly}</small><h3>{item.title}</h3></div>
              <div className="costs-case-badges"><Badge tone={item.kind === 'Risque' ? 'critical' : 'orange'}>{item.kind}</Badge><Badge tone={stateTone(item.state)}>{item.state}</Badge></div>
            </div>
            <div className="costs-case-body">
              <div className="costs-amount">
                <span>MONTANT DE DÉCISION</span>
                <strong>{item.amount === null ? 'Non renseigné' : formatMoney(item.amount)}</strong>
                <small>{item.amount === null ? 'Aucun montant enregistré pour cet arbitrage' : overThreshold ? 'Validation de l’Administration requise' : 'Dans la délégation du Facility Manager'}</small>
              </div>
              <dl className="costs-case-facts">
                <div><dt>Échéance</dt><dd>{item.due || 'Non renseignée'}</dd></div>
                <div><dt>Seuil applicable</dt><dd>{formatMoney(threshold)}</dd></div>
                <div><dt>Montant engagé</dt><dd>Non renseigné</dd></div>
                <div><dt>Montant payé</dt><dd>Non renseigné</dd></div>
              </dl>
              <div className="costs-case-action"><p>{audience === 'administration' && overThreshold ? 'Arbitrage global attendu dans l’Accueil Administration.' : 'Consultation financière sans nouvelle action accordée.'}</p>{item.anomaly.startsWith('ANO-') && <Button variant="secondary" onClick={() => onOpenDossier(item.anomaly)}>Ouvrir le dossier</Button>}</div>
            </div>
          </Card>;
        })}
      </div>}
    </Card>
  </section>;
}
