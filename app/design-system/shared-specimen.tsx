'use client';

import { useState } from 'react';

import {
  ControlValidityBadge,
  DemoScenarioProvider,
  DemoScenarioSelect,
  EquipmentTable,
  HealthScoreBlock,
  HomeHeroBanner,
  InsufficientNote,
  KpiStrip,
  ListDetailSplit,
  PalierBadge,
  MetierStatusBadge,
  ReportTrackingLine,
  ScoreScale,
  SegmentedControl,
  StartRoundPicker,
} from '../components/shared';
import { Badge } from '../components/ui';
import { fixtureScoreCapped, fixtureScoreNotComputable, demoReportTracking, demoTodaysRounds } from '../lib/ui-contract/fixtures.ts';

export function SharedSpecimen() {
  const [choice, setChoice] = useState<'a' | 'b' | 'c' | ''>('');
  return (
    <DemoScenarioProvider>
      <section className="ds-section">
        <h2>Composants partagés — clôture 16 septembre 2026</h2>
        <p className="ds-hint">Bandeau d’accueil, score à trois états, échelle 0–100, badges métier/palier, KPI, tableau équipements, segmenté, sélecteur de ronde, suivi de rapport, liste + détail, note d’insuffisance, scénario démo.</p>

        <HomeHeroBanner kicker="Santé du bâtiment" title="SCI Groupe Behira" meta="Composant partagé · accueil" demo actions={<span className="health-link">Ouvrir Dossiers →</span>} />

        <div style={{ margin: '16px 0' }}>
          <DemoScenarioSelect />
        </div>

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
          { id: 'a', label: 'Équipements à risque', value: 3, detail: '3 : 1 indisponible, 1 dégradé, 1 contrôle' },
          { id: 'b', label: 'Dossiers à traiter', value: 4, detail: 'File À traiter, aucun filtre par défaut' },
          { id: 'c', label: 'Disponibilité', value: '—', detail: 'Données insuffisantes.', insufficient: true },
        ]} />

        <div style={{ margin: '16px 0' }}>
          <InsufficientNote title="Poids de domaine non raccordés" detail="La formule et les pondérations d’équipement sont en attente de validation. Aucune courbe historique n’est affichée." />
        </div>

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
          listLabel="Dossiers"
          list={<p className="ds-hint">Liste unique. Filtres en pastilles, aucun actif par défaut. Hygiène et paysage dans À qualifier, badge d’origine et Hors score.</p>}
          detail={<p className="ds-hint">Panneau : type, priorité, responsable, échéance datetime-local vide, coût vide, note vide. Détails de traitement repliés. Historique en bas. Motif obligatoire pour Refuser et Renvoyer.</p>}
        />
      </section>

      <section className="ds-section">
        <h2>Décisions à prendre</h2>
        <p className="ds-hint">Bouton à droite, libellé selon l’étape. Qualifier n’écrase pas le titre.</p>
        <div className="fm-decision-list" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <article className="dec-row">
            <span className="queue-mark high" aria-hidden="true" />
            <div>
              <h3>RIA-01, Pression réseau incendie instable</h3>
              <p>À qualifier avant arbitrage.</p>
              <span>Aujourd’hui · 12:00</span>
            </div>
            <button type="button" className="primary-button qualify-action">Qualifier</button>
          </article>
          <article className="dec-row">
            <span className="queue-mark critical" aria-hidden="true" />
            <div>
              <h3>ASC-A2, Arrêts intermittents au niveau R+7</h3>
              <p>Montant au-dessus du seuil.</p>
              <span>Aujourd’hui · 17:00</span>
            </div>
            <button type="button" className="secondary-button">Soumettre à l’Administration</button>
          </article>
          <article className="dec-row">
            <span className="queue-mark high" aria-hidden="true" />
            <div>
              <h3>GE-01, Niveau carburant inférieur au seuil</h3>
              <p>Preuve jointe, clôture à valider.</p>
              <span>Aujourd’hui · 16:00</span>
            </div>
            <button type="button" className="secondary-button">Valider</button>
          </article>
        </div>
      </section>

      <section className="ds-section">
        <h2>Filtres Dossiers</h2>
        <p className="ds-hint">Rangée unique de pastilles avec compteur. Aucun filtre actif par défaut (onglet À traiter complet).</p>
        <div className="ds-badges">
          <button type="button" className="chip">À qualifier 2</button>
          <button type="button" className="chip">À décider 1</button>
          <button type="button" className="chip">Au-dessus du seuil 1</button>
          <button type="button" className="chip">En retard 1</button>
          <button type="button" className="chip">Sans responsable 0</button>
        </div>
      </section>

      <section className="ds-section">
        <h2>Hygiène et paysage</h2>
        <p className="ds-hint">Un seul bouton Qualifier. Code canonique dans le titre. Pas de Réponse de l’Administration sur l’accueil FM.</p>
        <div className="hygiene-list" style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
          <article style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
            <div>
              <h3>WILO-01 · deuxième réarmement en 7 jours</h3>
              <p>Service rétabli provisoirement, diagnostic demandé.</p>
            </div>
            <button type="button" className="primary-button qualify-action">Qualifier</button>
          </article>
        </div>
      </section>

      <section className="ds-section">
        <h2>Mes actions (agent)</h2>
        <p className="ds-hint">Badge et référence au-dessus du titre, faits sur une ligne, boutons à droite, badges non tronqués, retards en premier.</p>
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
          <article className="act-row late">
            <span className="act-bar is-bad" />
            <div className="task-copy">
              <div className="task-status"><Badge tone="critical">En retard</Badge><span className="task-ref">ACT-081</span></div>
              <h3>ASC-A2, Contrôle cabine R+7</h3>
              <p>Arrêts intermittents signalés.</p>
              <div className="facts"><span>Risque : <b>Usagers bloqués</b></span><span>Échéance : <b>Hier · 18:00</b></span><span>Preuve : <b>Manquante</b></span></div>
            </div>
            <div className="task-actions"><button type="button" className="secondary-button">Ouvrir</button></div>
          </article>
        </div>
      </section>
    </DemoScenarioProvider>
  );
}
