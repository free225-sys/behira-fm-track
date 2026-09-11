'use client';

import { useEffect, useRef, useState, type ChangeEvent, type InputHTMLAttributes } from 'react';
import { Select } from './select';
import { TimeInput } from './time-input';

// Date composition uses the shared Select. The ISO value and native form validity
// remain unchanged; the browser's calendar is never exposed.
export function DateInput({ value, defaultValue, onChange, min, max, required, disabled, name, id, 'aria-invalid': invalid }: InputHTMLAttributes<HTMLInputElement>) {
  const initial = String(value ?? defaultValue ?? '');
  const [uncontrolled, setUncontrolled] = useState(initial);
  const isoValue = value === undefined ? uncontrolled : String(value);
  const [parts, setParts] = useState(initial.split('-'));
  const proxy = useRef<HTMLInputElement>(null);
  const emitted = useRef<string | null>(null);
  const group = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const incoming = String(value ?? defaultValue ?? '');
    if (incoming !== emitted.current) setParts(incoming.split('-'));
  }, [value, defaultValue]);
  const [year = '', month = '', day = ''] = parts;
  const currentYear = new Date().getFullYear();
  const from = min ? Number(String(min).slice(0, 4)) : Math.min(currentYear - 100, Number(year) || currentYear);
  const to = max ? Number(String(max).slice(0, 4)) : Math.max(currentYear + 10, Number(year) || currentYear);
  const change = (index: number, next: string) => {
    const updated = [year, month, day];
    updated[index] = next;
    const days = updated[0] && updated[1] ? new Date(Number(updated[0]), Number(updated[1]), 0).getDate() : 31;
    if (Number(updated[2]) > days) updated[2] = '';
    setParts(updated);
    const iso = updated.every(Boolean) ? updated.join('-') : '';
    if (value === undefined) setUncontrolled(iso);
    emitted.current = iso;
    if (proxy.current) {
      proxy.current.value = iso;
      onChange?.({ target: proxy.current, currentTarget: proxy.current } as ChangeEvent<HTMLInputElement>);
    }
  };
  const validDayCount = year && month ? new Date(Number(year), Number(month), 0).getDate() : 31;
  return <div className="date-input" id={id} ref={group} role="group" aria-label="Date">
    <input hidden ref={proxy} className="app-select-proxy" type="date" name={name} value={isoValue} min={min} max={max} required={required} disabled={disabled} tabIndex={-1} aria-hidden="true" onChange={() => {}} onInvalid={(event) => { event.preventDefault(); group.current?.querySelector<HTMLButtonElement>('button')?.focus(); }} />
    <Select aria-invalid={invalid} aria-label="Jour" value={day} disabled={disabled} onChange={event => change(2, event.target.value)}><option value="">Jour</option>{Array.from({ length: validDayCount }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{i + 1}</option>)}</Select>
    <Select aria-invalid={invalid} aria-label="Mois" value={month} disabled={disabled} onChange={event => change(1, event.target.value)}><option value="">Mois</option>{Array.from({ length: 12 }, (_, i) => <option key={i} value={String(i + 1).padStart(2, '0')}>{new Intl.DateTimeFormat('fr-FR', { month: 'long' }).format(new Date(2026, i, 1))}</option>)}</Select>
    <Select aria-invalid={invalid} aria-label="Année" value={year} disabled={disabled} onChange={event => change(0, event.target.value)}><option value="">Année</option>{Array.from({ length: to - from + 1 }, (_, i) => <option key={i} value={String(to - i)}>{to - i}</option>)}</Select>
  </div>;
}

export function DateTimeInput({ defaultValue, value, onChange, name, required, disabled, min, max }: InputHTMLAttributes<HTMLInputElement>) {
  const [local, setLocal] = useState(String(defaultValue ?? ''));
  const current = String(value ?? local);
  const [date = '', time = ''] = current.split('T');
  const proxy = useRef<HTMLInputElement>(null);
  const group = useRef<HTMLDivElement>(null);
  const change = (nextDate: string, nextTime: string) => {
    const next = `${nextDate}T${nextTime}`;
    if (value === undefined) setLocal(next);
    if (proxy.current) {
      proxy.current.value = nextDate && nextTime ? next : '';
      onChange?.({ target: proxy.current, currentTarget: proxy.current } as ChangeEvent<HTMLInputElement>);
    }
  };
  return <div className="date-time-input" ref={group}>
    <input hidden className="app-select-proxy" type="datetime-local" ref={proxy} name={name} value={date && time ? current : ''} required={required} disabled={disabled} min={min} max={max} onChange={() => {}} onInvalid={event => { event.preventDefault(); group.current?.querySelector<HTMLButtonElement>('button')?.focus(); }} />
    <DateInput value={date} min={min ? String(min).split('T')[0] : undefined} max={max ? String(max).split('T')[0] : undefined} disabled={disabled} onChange={event => change(event.target.value, time)} />
    <TimeInput value={time} disabled={disabled} onChange={event => change(date, event.target.value)} />
  </div>;
}
