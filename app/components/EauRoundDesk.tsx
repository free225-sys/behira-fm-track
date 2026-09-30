'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IrrForm } from './IrrRound';
import { Field } from './ui';
import { ROUND_CHOICES, StartRoundPicker, type RoundChoiceId } from './shared';
import type { useOfflineSync } from '../lib/offline/useOfflineSync';

type Sync = ReturnType<typeof useOfflineSync>;

/**
 * Une seule surface de choix pour WILO-01, RIA-01 et IRR-01.
 * Les trois formulaires restent montés : changer de ronde ne démonte pas le brouillon
 * (IndexedDB côté connecté, mémoire locale en démonstration) ni le mode Recette (`isTest`).
 */
export function EauRoundDesk({
  initialRound,
  isTest,
  persistenceEnabled,
  offlineSync,
  flash,
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
  renderDemo: (round: 'WILO-01' | 'RIA-01') => ReactNode;
  renderWilo: (history: ReactNode) => ReactNode;
  renderRia: () => ReactNode;
  renderHistory: (equipment: 'WILO-01' | 'IRR-01') => ReactNode;
}) {
  const choices = ROUND_CHOICES.eau_incendie;
  const allowed = (id: RoundChoiceId | null): id is RoundChoiceId => Boolean(id && choices.some((item) => item.id === id));
  const [round, setRound] = useState<RoundChoiceId>(allowed(initialRound) ? initialRound : 'WILO-01');
  const localDrafts = useRef(new Map<string, unknown>());
  const demoSync = useRef<Sync | null>(null);
  if (!demoSync.current) {
    demoSync.current = {
      ...offlineSync,
      saveDraft: async (key, value) => {
        localDrafts.current.set(String(key), value);
        return { key: String(key), ownerUserId: 'demo', value, updatedAt: new Date().toISOString() };
      },
      loadDraft: async (key) => (localDrafts.current.has(String(key)) ? { key: String(key), ownerUserId: 'demo', value: localDrafts.current.get(String(key)), updatedAt: '' } : undefined),
      deleteDraft: async (key) => { localDrafts.current.delete(String(key)); },
      enqueueRound: async () => { throw new Error('Simulation : aucune donnée n’est envoyée.'); },
    } as Sync;
  }
  const sync = persistenceEnabled ? offlineSync : demoSync.current;

  useEffect(() => {
    if (initialRound && choices.some((item) => item.id === initialRound)) setRound(initialRound);
  }, [initialRound, choices]);

  const wiloHistory = <div className="round-history">{renderHistory('WILO-01')}</div>;
  const irrHistory = <div className="round-history">{renderHistory('IRR-01')}</div>;
  const demoRound = round === 'RIA-01' ? 'RIA-01' : 'WILO-01';

  return <>
    <div className="round-choice-bar">
      <Field label="Ronde à effectuer" size="select">
        <StartRoundPicker rounds={[]} choices={choices} value={round} onChoose={setRound} />
      </Field>
    </div>
    {!persistenceEnabled && <div hidden={round === 'IRR-01'}>{renderDemo(demoRound)}</div>}
    {persistenceEnabled && <div hidden={round !== 'WILO-01'}>{renderWilo(wiloHistory)}</div>}
    {persistenceEnabled && <div hidden={round !== 'RIA-01'}>{renderRia()}</div>}
    <div hidden={round !== 'IRR-01'}>
      <section className="surpresseur-layout" aria-label="Ronde IRR-01">
        <div className="round-column">
          <IrrForm isTest={isTest} offlineSync={sync} flash={flash} />
        </div>
        <aside className="surpresseur-aside">{irrHistory}</aside>
      </section>
    </div>
  </>;
}
