'use client';

import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react';

import type { EquipmentCode, TodaysRound } from '../../lib/ui-contract/building-health.ts';
import { EQUIPMENT_META } from '../../lib/ui-contract/fixtures.ts';
import { formatTime, roundResultLabel, roundStateLabel, roundSubjectLabel } from '../../lib/ui-contract/display.ts';

export type RoundChoiceId = 'WILO-01' | 'RIA-01' | 'IRR-01' | 'GE-01' | 'RND-LET';

export type RoundChoice = { id: RoundChoiceId; label: string; hint: string };

/** Même ordre sur l’accueil et la page Rondes. Le Facility Manager est raccordé au lot suivant. */
export const ROUND_CHOICES: Record<'eau_incendie' | 'electricite' | 'rondes_assistance', RoundChoice[]> = {
  eau_incendie: [
    { id: 'WILO-01', label: 'WILO-01 · Eau', hint: 'Surpresseur' },
    { id: 'RIA-01', label: 'RIA-01 · Incendie', hint: 'Réseau incendie' },
    { id: 'IRR-01', label: 'IRR-01 · Irrigation', hint: 'Arrosage et jardinières' },
  ],
  electricite: [
    { id: 'GE-01', label: 'GE-01 · Électricité', hint: 'Groupe électrogène' },
  ],
  rondes_assistance: [
    { id: 'RND-LET', label: 'RND-LET · Rondes', hint: 'Cleaning et jardinage' },
  ],
};

export function choiceForRound(round: TodaysRound, choices: RoundChoice[]): RoundChoiceId | null {
  if (round.equipmentCode && choices.some((item) => item.id === round.equipmentCode)) return round.equipmentCode as RoundChoiceId;
  if (!round.equipmentCode && choices.some((item) => item.id === 'RND-LET')) return 'RND-LET';
  return null;
}

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
  return 'Rondes de services · zones';
}

function deadlinePill(round: TodaysRound) {
  if (round.state === 'overdue' && round.deadline) return { label: `Avant ${formatTime(round.deadline)}`, tone: 'bad' as const };
  if (round.deadline) return { label: `Avant ${formatTime(round.deadline)}`, tone: 'sig' as const };
  return { label: roundStateLabel(round.state), tone: 'mute' as const };
}

export function StartRoundPicker({
  rounds,
  choices = [],
  value,
  onSelect,
  onChoose,
  onOffPlan,
}: {
  rounds: TodaysRound[];
  choices?: RoundChoice[];
  value?: RoundChoiceId | null;
  onSelect?: (round: TodaysRound) => void;
  onChoose?: (id: RoundChoiceId) => void;
  onOffPlan?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [catalog, setCatalog] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const labelId = useId();
  const listId = useId();
  const switching = value !== undefined;
  const sorted = useMemo(
    () => [...rounds].sort((a, b) => {
      const delta = rank(a) - rank(b);
      if (delta !== 0) return delta;
      return (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');
    }),
    [rounds],
  );
  const startable = sorted.filter((item) => item.state !== 'done' && (choices.length === 0 || choiceForRound(item, choices)));
  const allDone = startable.length === 0;
  const singleDue = !switching && startable.length === 1 && startable[0].state === 'due';
  const current = choices.find((item) => item.id === value) ?? choices[0];
  const primaryLabel = switching
    ? (current?.label ?? 'Choisir la ronde')
    : allDone
      ? 'Ronde hors planning'
      : singleDue
        ? `Démarrer la ronde ${startable[0].equipmentCode ? startable[0].equipmentCode as EquipmentCode : 'RND-LET'}`
        : 'Démarrer une ronde';
  const showCatalog = switching || catalog || (allDone && choices.length > 0);
  const opensPanel = switching || !singleDue;

  const close = (restoreFocus = false) => {
    setOpen(false);
    setCatalog(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onPointer);
    };
  }, [open]);

  const chooseRound = (round: TodaysRound) => {
    const id = choices.length ? choiceForRound(round, choices) : null;
    if (id) onChoose?.(id);
    else onSelect?.(round);
    close(true);
  };

  const chooseCatalog = (id: RoundChoiceId) => {
    onChoose?.(id);
    if (!onChoose) onOffPlan?.();
    close(true);
  };

  const startPrimary = () => {
    if (switching) {
      setCatalog(true);
      setOpen((next) => !next);
      return;
    }
    if (allDone) {
      if (choices.length === 0) {
        onOffPlan?.();
        return;
      }
      setCatalog(true);
      setOpen(true);
      setActiveIndex(0);
      return;
    }
    if (singleDue) {
      chooseRound(startable[0]);
      return;
    }
    setCatalog(false);
    setOpen((next) => !next);
  };

  const optionCount = showCatalog ? choices.length : sorted.length;
  const focusOption = (index: number) => {
    if (!optionCount) return;
    const next = (index + optionCount) % optionCount;
    setActiveIndex(next);
    window.requestAnimationFrame(() => optionRefs.current[next]?.focus());
  };

  const onTriggerKeyDown = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    if (!opensPanel) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) startPrimary();
      focusOption(event.key === 'ArrowDown' ? 0 : optionCount - 1);
    }
  };

  const onListKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Home') {
      event.preventDefault();
      focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      focusOption(optionCount - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <div className={`start-round-picker${switching ? ' is-switch' : ''}${open ? ' is-open' : ''}`} ref={rootRef}>
      <div className="start-round-actions">
        {opensPanel ? (
          <button ref={triggerRef} type="button" className={switching ? 'start-round-switch' : 'primary-button'} onClick={startPrimary} onKeyDown={onTriggerKeyDown} aria-expanded={open} aria-haspopup="listbox" aria-controls={open ? listId : undefined} aria-label={switching ? 'Ronde à effectuer' : undefined} aria-invalid={switching && choices.length === 0 ? true : undefined} disabled={switching && choices.length === 0}>
            {switching ? <span>{primaryLabel}</span> : primaryLabel}
            {switching ? <i aria-hidden="true" /> : !singleDue ? <span className="start-round-caret" aria-hidden="true" /> : null}
          </button>
        ) : (
          <button ref={triggerRef} type="button" className="primary-button" onClick={startPrimary}>
            {primaryLabel}
          </button>
        )}
      </div>
      {open ? (
        <div className={`start-round-panel${showCatalog ? ' is-catalog' : ''}`} role="listbox" id={listId} aria-labelledby={labelId} onKeyDown={onListKeyDown}>
          <p id={labelId} className="start-round-heading">{showCatalog ? 'Choisir la ronde' : 'Rondes du jour, votre périmètre'}</p>
          {showCatalog && choices.length === 0 ? <p className="start-round-error" role="alert">Aucune ronde disponible pour ce profil.</p> : null}
          <ul className="start-round-list">
            {showCatalog ? choices.map((choice, index) => (
              <li key={choice.id}>
                <button
                  ref={(node) => { optionRefs.current[index] = node; }}
                  type="button"
                  role="option"
                  aria-selected={value === choice.id}
                  className={`start-round-item is-free${value === choice.id ? ' is-selected' : ''}${activeIndex === index ? ' is-active' : ''}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => chooseCatalog(choice.id)}
                >
                  <span className="start-round-copy">
                    <b>{choice.label}</b>
                    <small>{choice.hint}</small>
                  </span>
                  {value === choice.id ? <span className="start-round-pill is-sig">En cours</span> : null}
                </button>
              </li>
            )) : sorted.map((round, index) => {
              const done = round.state === 'done' || (choices.length > 0 && !choiceForRound(round, choices));
              const result = roundResultLabel(round.result);
              const pill = deadlinePill(round);
              return (
                <li key={round.roundId}>
                  <button
                    ref={(node) => { optionRefs.current[index] = node; }}
                    type="button"
                    role="option"
                    aria-selected={false}
                    aria-disabled={done || undefined}
                    className={`start-round-item is-${round.state}${activeIndex === index ? ' is-active' : ''}`}
                    disabled={done}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => {
                      if (done) return;
                      chooseRound(round);
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
          {!showCatalog ? (
            <>
              <div className="start-round-sep" />
              <button type="button" className="start-round-item is-free" onClick={() => {
                if (choices.length === 0) {
                  onOffPlan?.();
                  close(true);
                  return;
                }
                setCatalog(true);
                setActiveIndex(0);
              }}>
                <span className="start-round-copy">
                  <b>Ronde hors planning</b>
                  <small>Choisir un équipement ou une zone</small>
                </span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
