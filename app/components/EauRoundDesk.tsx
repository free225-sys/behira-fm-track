'use client';

import { useState, type ReactNode } from 'react';
import { IrrForm } from './IrrRound';
import { ROUND_CHOICES, StartRoundPicker, type RoundChoiceId } from './shared';
import type { useOfflineSync } from '../lib/offline/useOfflineSync';

type Sync = ReturnType<typeof useOfflineSync>;

function pickRound(id: RoundChoiceId | null): RoundChoiceId {
  return id && ROUND_CHOICES.eau_incendie.some((item) => item.id === id) ? id : 'WILO-01';
}

/**
 * Une seule surface de choix pour WILO-01, RIA-01 et IRR-01.
 * Les trois formulaires restent montés : changer de ronde ne démonte pas le brouillon
 * ni le mode Recette (`isTest`). L’ouverture charge une fois chaque liste (lecture),
 * sans second appel à `synchronize`.
 */
export function EauRoundDesk({
  initialRound,
  isTest,
  persistenceEnabled,
  offlineSync,
  flash,
  toolbarEnd,
  renderDemo,
  renderWilo,
  renderRia,
  renderHistory,
}: {
  initialRound: RoundChoiceId | null;
  isTest: boolean;
  persistenceEnabled: boolean;
  offlineSync: Sync;
  flash: (message: string) => void;
  toolbarEnd?: ReactNode;
  renderDemo: (round: 'WILO-01' | 'RIA-01') => ReactNode;
  renderWilo: (history: ReactNode) => ReactNode;
  renderRia: () => ReactNode;
  renderHistory: (equipment: 'WILO-01' | 'IRR-01') => ReactNode;
}) {
  const choices = ROUND_CHOICES.eau_incendie;
  const [round, setRound] = useState<RoundChoiceId>(() => pickRound(initialRound));
  const [seenInitial, setSeenInitial] = useState(initialRound);
  if (initialRound !== seenInitial) {
    setSeenInitial(initialRound);
    setRound(pickRound(initialRound));
  }
  const [demoSync] = useState<Sync | null>(() => {
    if (persistenceEnabled) return null;
    const drafts = new Map<string, unknown>();
    return {
      ...offlineSync,
      saveDraft: async (key, value) => {
        drafts.set(String(key), value);
        return { key: String(key), ownerUserId: 'demo', value, updatedAt: new Date().toISOString() };
      },
      loadDraft: async (key) => (drafts.has(String(key)) ? { key: String(key), ownerUserId: 'demo', value: drafts.get(String(key)), updatedAt: '' } : undefined),
      deleteDraft: async (key) => { drafts.delete(String(key)); },
      enqueueRound: async () => 'demo',
    } as Sync;
  });
  const sync = persistenceEnabled ? offlineSync : demoSync ?? offlineSync;

  const wiloHistory = <div className="round-history">{renderHistory('WILO-01')}</div>;
  const irrHistory = <div className="round-history">{renderHistory('IRR-01')}</div>;
  const demoRound = round === 'RIA-01' ? 'RIA-01' : 'WILO-01';

  return <>
    <div className="round-toolbar">
      <div className="round-choice-bar">
        <StartRoundPicker rounds={[]} choices={choices} value={round} onChoose={setRound} />
      </div>
      {toolbarEnd}
    </div>
    {!persistenceEnabled && <div hidden={round === 'IRR-01'}>{renderDemo(demoRound)}</div>}
    {persistenceEnabled && <div hidden={round !== 'WILO-01'}>{renderWilo(wiloHistory)}</div>}
    {persistenceEnabled && <div hidden={round !== 'RIA-01'}>{renderRia()}</div>}
    <div hidden={round !== 'IRR-01'}>
      <section className="surpresseur-layout round-desk-layout" aria-label="Ronde IRR-01">
        <div className="round-column">
          <IrrForm isTest={isTest} demonstration={!persistenceEnabled} offlineSync={sync} flash={flash} />
        </div>
        <aside className="surpresseur-aside">
          <article className="score-explain-card is-compact">
            <div><span>IRR-01</span><b>Indisponible</b></div>
            <p className="analytics-note">Aucune valeur de score n’est affichée avant validation de la méthode et de ses données sources.</p>
          </article>
          {irrHistory}
        </aside>
      </section>
    </div>
  </>;
}
