'use client';

import { type KeyboardEvent } from 'react';

export function CountStepper({
  label,
  value,
  error,
  hint,
  min = 0,
  groupLabel,
  ariaMinus,
  ariaPlus,
  className,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  hint?: string;
  min?: number;
  groupLabel: string;
  ariaMinus: string;
  ariaPlus: string;
  className?: string;
  onChange: (value: string) => void;
}) {
  const count = Math.max(min, Math.trunc(Number(value) || 0));
  const atMin = count <= min;

  function setCount(next: number) {
    onChange(String(Math.max(min, Math.trunc(next))));
  }

  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'ArrowUp' || event.key === 'ArrowRight') {
      event.preventDefault();
      setCount(count + 1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowLeft') {
      event.preventDefault();
      setCount(count - 1);
    } else if (event.key === 'Home') {
      event.preventDefault();
      setCount(min);
    }
  }

  return (
    <div className={['field count-stepper-field', error ? 'is-invalid' : '', className].filter(Boolean).join(' ')}>
      <span>{label}</span>
      <div
        className="count-stepper ge-stepper"
        role="group"
        aria-label={groupLabel}
        onKeyDown={onKeyDown}
      >
        <button
          type="button"
          className="count-stepper-btn ge-stepper-btn"
          aria-label={ariaMinus}
          disabled={atMin}
          onClick={() => setCount(count - 1)}
        >
          −
        </button>
        <span
          className="count-stepper-value ge-stepper-value"
          role="spinbutton"
          tabIndex={0}
          aria-valuemin={min}
          aria-valuenow={count}
          aria-live="polite"
          onKeyDown={onKeyDown}
        >
          {value === '' ? 0 : count}
        </span>
        <button
          type="button"
          className="count-stepper-btn ge-stepper-btn"
          aria-label={ariaPlus}
          onClick={() => setCount(count + 1)}
        >
          +
        </button>
      </div>
      {error ? <small className="ge-field-error" role="alert">{error}</small> : null}
      {hint ? <small>{hint}</small> : null}
    </div>
  );
}
