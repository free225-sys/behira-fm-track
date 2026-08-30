'use client';

import { useMemo, useState } from 'react';

import { Badge, Card, Field } from './ui';

export type EquipmentWorkspaceItem = {
  code:string;
  label:string;
  health:number;
  state:string;
};

type StateFilter = 'all' | string;

function equipmentTone(health:number) {
  if (health < 70) return 'critical';
  if (health < 90) return 'orange';
  return 'success';
}

function healthLabel(health:number) {
  if (health < 70) return 'Action requise';
  if (health < 90) return 'À surveiller';
  return 'Sain';
}

export function EquipmentWorkspace({ equipment }: { equipment:EquipmentWorkspaceItem[] }) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  const states = useMemo(
    () => Array.from(new Set(equipment.map((item) => item.state))).sort((a,b) => a.localeCompare(b, 'fr')),
    [equipment],
  );
  const filteredEquipment = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return equipment.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.code} ${item.label} ${item.state}`.toLocaleLowerCase('fr').includes(normalizedQuery);
      const matchesState = stateFilter === 'all' || item.state === stateFilter;
      return matchesQuery && matchesState;
    });
  }, [equipment, query, stateFilter]);

  const averageHealth = equipment.length
    ? Math.round(equipment.reduce((total,item) => total + item.health,0) / equipment.length)
    : 0;
  const watchedCount = equipment.filter((item) => item.health < 90).length;
  const criticalCount = equipment.filter((item) => item.health < 70).length;

  return <section className="equipment-workspace" aria-labelledby="equipment-workspace-title">
    <header className="equipment-workspace-hero">
      <div>
        <p className="design-kicker">LE BÂTIMENT</p>
        <h2 id="equipment-workspace-title" className="visually-hidden">Équipements</h2>
        <p>Parc technique déjà disponible. Les informations absentes restent explicitement signalées.</p>
      </div>
      <span className="mockup-label">Données existantes</span>
    </header>

    <section className="equipment-summary" aria-label="Synthèse du parc technique">
      <Card className="equipment-summary-card">
        <span>ÉQUIPEMENTS SUIVIS</span><strong>{equipment.length}</strong><small>Références visibles</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>SANTÉ MOYENNE</span><strong>{averageHealth}<small>/100</small></strong><small>Moyenne des scores disponibles</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>À SURVEILLER</span><strong>{watchedCount}</strong><small>Score inférieur à 90, règle existante</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>ACTION REQUISE</span><strong>{criticalCount}</strong><small>Score inférieur à 70, règle existante</small>
      </Card>
    </section>

    <Card as="section" className="equipment-catalogue">
      <div className="equipment-catalogue-head">
        <div><p className="design-kicker">CATALOGUE</p><h3>Équipements suivis</h3><p>Rechercher une référence ou filtrer par état enregistré.</p></div>
        <span className="panel-count">{filteredEquipment.length} résultat{filteredEquipment.length > 1 ? 's' : ''}</span>
      </div>
      <div className="equipment-filters">
        <Field label="Rechercher un équipement">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, libellé ou état" />
        </Field>
        <Field label="État enregistré">
          <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)}>
            <option value="all">Tous les états</option>
            {states.map((state) => <option key={state} value={state}>{state}</option>)}
          </select>
        </Field>
      </div>

      {filteredEquipment.length === 0 ? <div className="equipment-empty" role="status">
        <span aria-hidden="true">⌕</span><div><h3>Aucun équipement trouvé</h3><p>Élargissez la recherche ou choisissez un autre état.</p></div>
      </div> : <div className="equipment-destination-grid" aria-live="polite">
        {filteredEquipment.map((item) => <Card key={item.code} className="equipment-destination-card">
          <header>
            <span className="equipment-destination-mark" aria-hidden="true">{item.code.split('-')[0].slice(0,2)}</span>
            <div><small>{item.code}</small><h3>{item.label}</h3></div>
            <Badge tone={equipmentTone(item.health)}>{item.state}</Badge>
          </header>
          <div className="equipment-health-row">
            <div><span>SCORE DE SANTÉ</span><strong>{item.health}<small>/100</small></strong></div>
            <p className={`kpi-status ${item.health < 70 ? 'is-danger' : item.health < 90 ? 'is-watch' : 'is-good'}`}>{healthLabel(item.health)}</p>
          </div>
          <div className="equipment-health-track" role="progressbar" aria-label={`${item.label}, score de santé ${item.health} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.health}>
            <i className={equipmentTone(item.health)} style={{width:`${item.health}%`}} />
          </div>
          <dl className="equipment-known-facts">
            <div><dt>Fraîcheur du score</dt><dd>Non renseignée</dd></div>
            <div><dt>Facteurs explicatifs</dt><dd>Données insuffisantes</dd></div>
            <div><dt>Dernière intervention</dt><dd>Non renseignée</dd></div>
            <div><dt>Prochaine maintenance</dt><dd>Non renseignée</dd></div>
          </dl>
        </Card>)}
      </div>}
    </Card>
  </section>;
}

