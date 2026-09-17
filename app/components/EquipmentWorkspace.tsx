'use client';

import { useMemo, useState } from 'react';

import type { EquipmentCard, EquipmentOperationalStatus } from '../lib/ui-contract/building-health.ts';
import { BrandIcon, Card, Field, Select } from './ui';
import { DemoScenarioSelect, EquipmentTable } from './shared';

export type EquipmentWorkspaceItem = EquipmentCard;

type StateFilter = 'all' | EquipmentOperationalStatus | 'unknown' | 'at_risk';

const STATUS_FILTERS: Array<{ value: StateFilter; label: string }> = [
  { value: 'all', label: 'Tous les statuts' },
  { value: 'at_risk', label: 'À risque' },
  { value: 'available', label: 'Disponible' },
  { value: 'degraded', label: 'Dégradé' },
  { value: 'unavailable', label: 'Indisponible' },
  { value: 'control_due', label: 'Contrôle à renouveler' },
  { value: 'unknown', label: 'Statut non établi' },
];

export function EquipmentWorkspace({ equipment }: { equipment: EquipmentCard[] }) {
  const [query, setQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<StateFilter>('all');

  const counts = useMemo(() => ({
    available: equipment.filter((item) => item.operationalStatus === 'available').length,
    degraded: equipment.filter((item) => item.operationalStatus === 'degraded').length,
    unavailable: equipment.filter((item) => item.operationalStatus === 'unavailable').length,
    controlDue: equipment.filter((item) => item.operationalStatus === 'control_due').length,
    unknown: equipment.filter((item) => item.operationalStatus == null).length,
  }), [equipment]);

  const filteredEquipment = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return equipment.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.code} ${item.name} ${item.zone ?? ''}`.toLocaleLowerCase('fr').includes(normalizedQuery);
      const matchesState = stateFilter === 'all'
        || (stateFilter === 'unknown' ? item.operationalStatus == null : stateFilter === 'at_risk'
          ? item.operationalStatus === 'degraded' || item.operationalStatus === 'unavailable' || item.operationalStatus === 'control_due'
          : item.operationalStatus === stateFilter);
      return matchesQuery && matchesState;
    });
  }, [equipment, query, stateFilter]);

  return <section className="equipment-workspace" aria-labelledby="equipment-workspace-title">
    <header className="equipment-workspace-hero">
      <div>
        <p className="design-kicker">LE BÂTIMENT</p>
        <h2 id="equipment-workspace-title" className="visually-hidden">Équipements</h2>
        <p>Parc technique suivi. Un statut inconnu n’affiche pas de chiffre.</p>
      </div>
      <span className="mockup-label">Démo</span>
    </header>
    <DemoScenarioSelect />

    <section className="equipment-summary" aria-label="Synthèse du parc technique">
      <Card className="equipment-summary-card">
        <span>ÉQUIPEMENTS SUIVIS</span><strong>{equipment.length}</strong><small>Six références du site</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>DISPONIBLE</span><strong>{counts.available}</strong><small>Statut métier</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>DÉGRADÉ</span><strong>{counts.degraded}</strong><small>Statut métier</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>INDISPONIBLE</span><strong>{counts.unavailable}</strong><small>Statut métier</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>CONTRÔLE À RENOUVELER</span><strong>{counts.controlDue}</strong><small>Statut métier</small>
      </Card>
      <Card className="equipment-summary-card">
        <span>STATUT INCONNU</span><strong>{counts.unknown}</strong><small>Statut métier</small>
      </Card>
    </section>

    <Card as="section" className="equipment-catalogue">
      <div className="equipment-catalogue-head">
        <div><p className="design-kicker">CATALOGUE</p><h3>Équipements suivis</h3><p>Recherche et filtre par statut métier. Tableau groupé par famille.</p></div>
        <span className="panel-count">{filteredEquipment.length} résultat{filteredEquipment.length > 1 ? 's' : ''}</span>
      </div>
      <div className="equipment-filters">
        <Field label="Rechercher un équipement" size="search">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Code, nom ou zone" />
        </Field>
        <Field label="Statut métier" size="select">
          <Select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as StateFilter)}>
            {STATUS_FILTERS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
        </Field>
      </div>

      {filteredEquipment.length === 0 ? <div className="equipment-empty" role="status">
        <BrandIcon name="search" size={18} /><div><h3>Aucun équipement trouvé</h3><p>Élargissez la recherche ou choisissez un autre statut.</p></div>
      </div> : <EquipmentTable equipment={filteredEquipment} />}
    </Card>
  </section>;
}
