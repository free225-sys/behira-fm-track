'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { EquipmentCode, TodaysRound } from '../../lib/ui-contract/building-health.ts';
import { EQUIPMENT_META } from '../../lib/ui-contract/fixtures.ts';
import { formatTime, roundResultLabel, roundStateLabel, roundSubjectLabel } from '../../lib/ui-contract/display.ts';

function rank(round: TodaysRound) {
  if (round.state === 'overdue') return 0;
  if (round.state === 'draft') return 1;
  if (round.state === 'due') return 2;
  return 3;
}

function roundHint(round: TodaysRound) {
  if (round.missedYesterday) return 'Contrôle quotidien, ronde d’hier manquée';
  if (round.equipmentCode === 'GE-01') return 'Contrôle quotidien, essai prévu';
  if (round.equipmentCode) return `Contrôle quotidien, ${EQUIPMENT_META[round.equipmentCode]?.name ?? ''}`.trim();
  return 'Ronde de services · RND-LET';
}

function deadlinePill(round: TodaysRound) {
  if (round.state === 'overdue' && round.deadline) return { label: `Avant ${formatTime(round.deadline)}`, tone: 'bad' as const };
  if (round.deadline) return { label: `Avant ${formatTime(round.deadline)}`, tone: 'sig' as const };
  return { label: roundStateLabel(round.state), tone: 'mute' as const };
}

export function StartRoundPicker({
  rounds,
  onSelect,
  onOffPlan,
}: {
  rounds: TodaysRound[];
  onSelect?: (round: TodaysRound) => void;
  onOffPlan?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const labelId = useId();
  const sorted = useMemo(
    () => [...rounds].sort((a, b) => {
      const delta = rank(a) - rank(b);
      if (delta !== 0) return delta;
      return (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');
    }),
    [rounds],
  );
  const openRounds = sorted.filter((item) => item.state !== 'done');
  const allDone = openRounds.length === 0;
  const singleDue = openRounds.length === 1 && openRounds[0].state === 'due' && openRounds[0].equipmentCode;
  const primaryLabel = allDone
    ? 'Ronde hors planning'
    : singleDue
      ? `Démarrer la ronde ${openRounds[0].equipmentCode as EquipmentCode}`
      : 'Démarrer une ronde';

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const startPrimary = () => {
    if (allDone) {
      onOffPlan?.();
      return;
    }
    if (singleDue) {
      onSelect?.(openRounds[0]);
      return;
    }
    setOpen((value) => !value);
  };

  return (
    <div className="start-round-picker" ref={rootRef}>
      <div className="start-round-actions">
        <button type="button" className="primary-button" onClick={startPrimary} aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? labelId : undefined}>
          {primaryLabel} <span className="start-round-caret" aria-hidden="true" />
        </button>
      </div>
      {open ? (
        <div className="start-round-panel" role="dialog" aria-labelledby={labelId}>
          <p id={labelId} className="start-round-heading">Rondes du jour, votre périmètre</p>
          <ul className="start-round-list">
            {sorted.map((round) => {
              const done = round.state === 'done';
              const result = roundResultLabel(round.result);
              const pill = deadlinePill(round);
              return (
                <li key={round.roundId}>
                  <button
                    type="button"
                    className={`start-round-item is-${round.state}`}
                    disabled={done}
                    onClick={() => {
                      if (done) return;
                      onSelect?.(round);
                      setOpen(false);
                    }}
                  >
                    <span className="start-round-copy">
                      <b>{roundSubjectLabel(round)}</b>
                      <small>{done && round.doneAt ? `Faite à ${formatTime(round.doneAt)}${result ? ` · ${result}` : ''}` : roundHint(round)}</small>
                    </span>
                    <span className={`start-round-pill is-${pill.tone}`}>{pill.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="start-round-sep" />
          <button type="button" className="start-round-item is-free" onClick={() => { onOffPlan?.(); setOpen(false); }}>
            <span className="start-round-copy">
              <b>Ronde hors planning</b>
              <small>Choisir un équipement ou une zone</small>
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
}
