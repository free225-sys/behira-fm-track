'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import type { DemoScoreScenario } from '../../lib/ui-contract/fixtures.ts';
import { Select } from '../ui';

const OPTIONS: { value: DemoScoreScenario; label: string }[] = [
  { value: 'not_computable', label: 'Non calculable' },
  { value: 'normal', label: 'Normal' },
  { value: 'capped', label: 'Plafonné' },
];

const DemoScenarioContext = createContext<{
  scenario: DemoScoreScenario;
  setScenario: (next: DemoScoreScenario) => void;
} | null>(null);

export function DemoScenarioProvider({ children }: { children: ReactNode }) {
  const [scenario, setScenario] = useState<DemoScoreScenario>('not_computable');
  const value = useMemo(() => ({ scenario, setScenario }), [scenario]);
  return <DemoScenarioContext.Provider value={value}>{children}</DemoScenarioContext.Provider>;
}

export function useDemoScoreScenario() {
  return useContext(DemoScenarioContext) ?? { scenario: 'not_computable' as const, setScenario: () => {} };
}

export function DemoScenarioSelect() {
  const ctx = useContext(DemoScenarioContext);
  if (!ctx) return null;
  return (
    <div className="demo-scenario-bar">
      <label className="demo-scenario-line">
        <span>Scénario de démonstration</span>
        <Select
          aria-label="Scénario de démonstration"
          value={ctx.scenario}
          onChange={(event) => ctx.setScenario(event.target.value as DemoScoreScenario)}
        >
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </Select>
      </label>
    </div>
  );
}
