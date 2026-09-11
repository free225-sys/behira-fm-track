'use client';

import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Select } from './select';

// Only the shared Select controls are visible. The hidden proxy preserves
// HH:mm, native form validity and the input-shaped onChange contract.
export function TimeInput({ value, defaultValue, onChange, name, id, required, disabled, min, max, step,
  'aria-label': label = 'Horaire', 'aria-invalid': invalid, 'aria-describedby': describedBy,
}: InputHTMLAttributes<HTMLInputElement>) {
  const initial = String(value ?? defaultValue ?? '');
  const [local, setLocal] = useState(initial);
  const [parts, setParts] = useState(initial.split(':'));
  const emitted = useRef<string | null>(null);
  const proxy = useRef<HTMLInputElement>(null);
  const group = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const incoming = String(value ?? defaultValue ?? '');
    if (incoming !== emitted.current) setParts(incoming.split(':'));
  }, [value, defaultValue]);
  const [hours = '', minutes = ''] = parts;
  const change = (index: number, next: string) => {
    const updated = [hours, minutes];
    updated[index] = next;
    setParts(updated);
    const time = updated.every(Boolean) ? updated.join(':') : '';
    emitted.current = time;
    if (value === undefined) setLocal(time);
    if (proxy.current) {
      proxy.current.value = time;
      onChange?.({ target: proxy.current, currentTarget: proxy.current } as ChangeEvent<HTMLInputElement>);
    }
  };
  return <div className="time-input" id={id} ref={group} role="group" aria-label={label}>
    <input hidden className="app-select-proxy" type="time" ref={proxy} name={name}
      value={value === undefined ? local : String(value)} required={required} disabled={disabled}
      min={min} max={max} step={step} tabIndex={-1} aria-hidden="true" onChange={() => {}}
      onInvalid={event => { event.preventDefault(); group.current?.querySelector<HTMLButtonElement>('button')?.focus(); }} />
    <Select aria-label="Heures" aria-invalid={invalid} aria-describedby={describedBy} required={required}
      disabled={disabled} value={hours} onChange={event => change(0, event.target.value)}>
      <option value="">Heures</option>
      {Array.from({ length: 24 }, (_, hour) => <option key={hour} value={String(hour).padStart(2, '0')}>{String(hour).padStart(2, '0')}</option>)}
    </Select>
    <Select aria-label="Minutes" aria-invalid={invalid} aria-describedby={describedBy} required={required}
      disabled={disabled} value={minutes} onChange={event => change(1, event.target.value)}>
      <option value="">Minutes</option>
      {Array.from({ length: 60 }, (_, minute) => <option key={minute} value={String(minute).padStart(2, '0')}>{String(minute).padStart(2, '0')}</option>)}
    </Select>
  </div>;
}
