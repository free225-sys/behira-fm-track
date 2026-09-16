'use client';

import type { ReactNode } from 'react';

export function SegmentedControl<T extends string>({
  label,
  value,
  options,
  error,
  columns = 3,
  onChange,
  footer,
}: {
  label?: string;
  value: T | '';
  options: Array<{ value: T; label: string }>;
  error?: string;
  columns?: 2 | 3 | 4;
  onChange: (value: T) => void;
  footer?: ReactNode;
}) {
  const colClass = columns === 4 ? 'four' : columns === 2 ? 'two' : 'three';
  return (
    <fieldset className={`ge-choice-field segmented-control ${error ? 'has-error' : ''}`}>
      {label ? <legend>{label}</legend> : null}
      <div className={`ge-choice-grid ${colClass}`} role="group">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            className={value === option.value ? 'selected' : ''}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
      {footer}
      {error ? <small className="ge-field-error" role="alert">{error}</small> : null}
    </fieldset>
  );
}
