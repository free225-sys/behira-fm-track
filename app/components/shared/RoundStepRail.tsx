'use client';

import { forwardRef, useEffect, useRef, type CSSProperties } from 'react';

/** Un seul rail pour GE-01, WILO, RIA, IRR et la maquette. L’appelant décide jusqu’où on peut revenir. */
export const RoundStepRail = forwardRef<HTMLElement, {
  labels: string[];
  step: number;
  furthest?: number;
  onStep: (index: number) => void;
  label: string;
}>(function RoundStepRail({ labels, step, furthest = step, onStep, label }, ref) {
  const localRef = useRef<HTMLElement | null>(null);
  const reachable = Math.max(step, furthest);
  const style = labels.length === 5 ? undefined : { gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` } as CSSProperties;
  const signature = labels.join('\u0001');
  useEffect(() => {
    const nav = localRef.current;
    const active = nav?.querySelector<HTMLButtonElement>('button.active');
    if (!nav || !active || nav.scrollWidth <= nav.clientWidth + 1) return;
    const left = active.offsetLeft - (nav.clientWidth - active.offsetWidth) / 2;
    nav.scrollTo({ left: Math.max(0, left) });
  }, [step, signature]);
  return (
    <nav
      ref={(node) => {
        localRef.current = node;
        if (typeof ref === 'function') ref(node);
        else if (ref) ref.current = node;
      }}
      className={`surpresseur-progress connected-round-progress${labels.length === 2 ? ' is-two' : ''}`}
      style={style}
      aria-label={label}
    >
      {labels.map((item, index) => (
        <button
          key={item}
          type="button"
          className={index === step ? 'active' : index < step ? 'done' : ''}
          aria-current={index === step ? 'step' : undefined}
          disabled={index > reachable}
          onClick={() => onStep(index)}
        >
          <span>{index < step ? '✓' : index + 1}</span>
          <b>{item}</b>
        </button>
      ))}
    </nav>
  );
});
