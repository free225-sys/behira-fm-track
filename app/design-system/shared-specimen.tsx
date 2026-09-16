'use client';

import { useState } from 'react';

import {
  ControlValidityBadge,
  EquipmentTable,
  HealthScoreBlock,
  HomeHeroBanner,
  KpiStrip,
  ListDetailSplit,
  PalierBadge,
  MetierStatusBadge,
  ReportTrackingLine,
  ScoreScale,
  SegmentedControl,
  StartRoundPicker,
} from '../components/shared';
import { fixtureScoreCapped, fixtureScoreNotComputable, demoReportTracking, demoTodaysRounds } from '../lib/ui-contract/fixtures.ts';

export function SharedSpecimen() {
  const [choice, setChoice] = useState<'a' | 'b' | 'c' | ''>('');
  return (
    <section className="ds-section">
      <h2>Composants partagés lot 1</h2>
      <p className="ds-hint">Bandeau d’accueil, score à trois états, échelle 0–100, badges métier/palier, KPI, tableau équipements, segmenté, sélecteur de ronde, suivi de rapport, liste + détail.</p>

      <HomeHeroBanner kicker="Santé du bâtiment" title="SCI Groupe Behira" meta="Composant partagé · accueil" demo actions={<span className="health-link">Action unique →</span>} />

      <div className="ds-badges" style={{ margin: '16px 0' }}>
        <MetierStatusBadge status="available" />
        <MetierStatusBadge status="degraded" />
        <MetierStatusBadge status="unavailable" />
        <MetierStatusBadge status="control_due" />
        <MetierStatusBadge status={null} />
        <ControlValidityBadge value="expired" />
        <ControlValidityBadge value="missing" />
        <PalierBadge value={61} />
        <PalierBadge value={78} />
        <PalierBadge value={98} />
      </div>

      <article className="panel" style={{ marginBottom: 16, padding: 16 }}>
        <HealthScoreBlock snapshot={fixtureScoreNotComputable} variant="compact" />
        <ScoreScale score={fixtureScoreCapped.score} items={fixtureScoreCapped.equipment} />
      </article>

      <KpiStrip items={[
        { id: 'a', label: 'ÉQUIPEMENTS À RISQUE', value: 3, detail: '3 : 1 indisponible, 1 dégradé, 1 contrôle' },
        { id: 'b', label: 'DISPONIBILITÉ', value: '—', detail: 'Données insuffisantes.', insufficient: true },
      ]} />

      <div style={{ margin: '16px 0' }}>
        <SegmentedControl
          label="Contrôle segmenté"
          value={choice}
          options={[{ value: 'a', label: 'Premier' }, { value: 'b', label: 'Deuxième' }, { value: 'c', label: 'Troisième' }]}
          onChange={setChoice}
        />
      </div>

      <StartRoundPicker rounds={demoTodaysRounds} />

      <div style={{ margin: '16px 0' }}>
        {demoReportTracking.map((item) => <ReportTrackingLine key={item.clientMutationId} item={item} />)}
      </div>

      <EquipmentTable equipment={fixtureScoreCapped.equipment} atRiskOnly />

      <ListDetailSplit
        listLabel="File d’exemple"
        list={<p className="ds-hint">Liste. Les dossiers réels restent dans À traiter jusqu’au lot 4.</p>}
        detail={<p className="ds-hint">Panneau de détail sticky. Motif obligatoire pour un refus : lots 4 et 6.</p>}
      />
    </section>
  );
}
