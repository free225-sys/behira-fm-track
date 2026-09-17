'use client';

import type { ReactNode } from 'react';

import { displayAssetCode, formatMoney } from '../lib/ui-contract/display.ts';
import { DemoScenarioSelect } from './shared';
import { Badge } from './ui';

export type DossiersTab = 'atraiter' | 'tous' | 'clotures';

export type DossierQueueItem = {
  id: string;
  asset: string;
  title: string;
  location?: string;
  priority: 'Critique' | 'Haute' | 'Moyenne' | 'Faible';
  status: string;
  due: string;
  delayed?: boolean;
  owner?: string | null;
  amount?: number | null;
  origin?: string;
  horsScore?: boolean;
};

function priorityTone(priority: DossierQueueItem['priority']) {
  return priority === 'Critique' ? 'critical' : priority === 'Haute' ? 'high' : priority === 'Moyenne' ? 'medium' : 'low';
}

export function dossierActionLabel(item: DossierQueueItem, threshold: number): string {
  if (item.status === 'À qualifier' || item.horsScore) return 'Qualifier';
  if (!item.owner || item.owner === 'Non affectée') return 'Réaffecter';
  if (item.amount != null && item.amount >= threshold) return 'Soumettre à l’Administration';
  if (item.status === 'En validation' || item.status === 'Affectée' || item.status === 'En intervention') return 'Valider';
  return 'Ouvrir';
}

export function DossierQueueRow({
  item,
  active = false,
  threshold = 400000,
  onOpen,
  actionClassName,
}: {
  item: DossierQueueItem;
  active?: boolean;
  threshold?: number;
  onOpen: () => void;
  actionClassName?: string;
}) {
  const action = dossierActionLabel(item, threshold);
  return (
    <article className={`dossier-queue-row${active ? ' is-active' : ''}${item.delayed ? ' is-late' : ''}`}>
      <button type="button" className="dossier-queue-main" onClick={onOpen} aria-pressed={active}>
        <span className={`queue-mark ${priorityTone(item.priority)}`} aria-hidden="true">{item.priority.charAt(0)}</span>
        <div>
          <span><span className="equipment-reference">{displayAssetCode(item.asset)}</span> · {item.id}</span>
          <b>{item.title}</b>
          <small>{item.delayed ? 'En retard · ' : ''}{item.due}{item.location ? ` · ${item.location}` : ''}</small>
        </div>
        <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
      </button>
      <button
        type="button"
        className={actionClassName ?? (item.status === 'À qualifier' ? 'primary-button qualify-action' : 'secondary-button')}
        onClick={onOpen}
      >
        {action}
      </button>
    </article>
  );
}

export function DossiersWorkspace({
  tab,
  onTab,
  threshold,
  query,
  onQuery,
  counts,
  children,
}: {
  tab: DossiersTab;
  onTab: (tab: DossiersTab) => void;
  threshold: number;
  query: string;
  onQuery: (value: string) => void;
  counts: { atraiter: number; tous: number; clotures: number };
  children: ReactNode;
}) {
  return (
    <section className="dossiers-workspace">
      <header className="dossiers-hero is-bleed">
        <div className="dossiers-hero-row">
          <div>
            <h1 className="home-hero-title">Dossiers</h1>
            <p className="home-hero-meta">Constats, notifications, tickets et arbitrages au même endroit. Seuil de délégation : {formatMoney(threshold)}.</p>
          </div>
          <label className="search-box dossiers-search dossiers-search-on-navy">
            <span>⌕</span>
            <input
              aria-label="Rechercher un dossier"
              placeholder="Code, équipement, zone ou titre"
              value={query}
              onChange={(event) => onQuery(event.target.value)}
            />
          </label>
        </div>
        <div className="dossiers-tabs workspace-tabs" role="tablist" aria-label="Onglets des dossiers">
          <button type="button" role="tab" aria-selected={tab === 'atraiter'} className={tab === 'atraiter' ? 'active' : ''} onClick={() => onTab('atraiter')}>À traiter <span>{counts.atraiter}</span></button>
          <button type="button" role="tab" aria-selected={tab === 'tous'} className={tab === 'tous' ? 'active' : ''} onClick={() => onTab('tous')}>Tous <span>{counts.tous}</span></button>
          <button type="button" role="tab" aria-selected={tab === 'clotures'} className={tab === 'clotures' ? 'active' : ''} onClick={() => onTab('clotures')}>Clôturés <span>{counts.clotures}</span></button>
        </div>
      </header>
      <DemoScenarioSelect />
      {children}
    </section>
  );
}
