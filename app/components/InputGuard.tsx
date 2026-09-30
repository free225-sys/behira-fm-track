'use client';

import { useEffect } from 'react';
import {
  cleanText, INTEGER_REJECTED_MESSAGE, isCleanText, NUMBER_REJECTED_MESSAGE,
  sanitizeDecimal, sanitizeInteger, TEXT_REJECTED_MESSAGE,
} from '../lib/input-rules';

type Kind = 'text' | 'decimal' | 'integer';
type Field = HTMLInputElement | HTMLTextAreaElement;

const SKIPPED_TYPES = new Set(['password', 'checkbox', 'radio', 'file', 'date', 'time', 'datetime-local', 'month', 'week', 'hidden', 'color', 'range', 'submit', 'button', 'reset', 'image']);
const DEFAULT_MAX = { input: 200, textarea: 2000 };

/** Champ concerné et règle applicable. Un champ peut s'exclure avec data-free-text (ex. mot de passe affiché). */
export function fieldKind(el: EventTarget | null): Kind | null {
  if (!(el instanceof HTMLInputElement) && !(el instanceof HTMLTextAreaElement)) return null;
  if (el.readOnly || el.disabled || el.dataset.freeText !== undefined) return null;
  if (el instanceof HTMLInputElement) {
    if (SKIPPED_TYPES.has(el.type) || el.autocomplete === 'current-password' || el.autocomplete === 'new-password') return null;
    if (el.type === 'number') return el.step && !Number.isInteger(Number(el.step)) ? 'decimal' : 'integer';
    if (el.inputMode === 'decimal') return 'decimal';
    if (el.inputMode === 'numeric') return 'integer';
  }
  return 'text';
}

const nativeSetter = (el: Field) => Object.getOwnPropertyDescriptor(Object.getPrototypeOf(el), 'value')?.set;

/** Remplace la valeur sans passer par React, puis laisse l'évènement « input » informer React. */
function setValue(el: Field, value: string, caret?: number) {
  nativeSetter(el)?.call(el, value);
  if (caret !== undefined) { try { el.setSelectionRange(caret, caret); } catch { /* type=number */ } }
}

function selection(el: Field): [number, number] {
  try { return [el.selectionStart ?? el.value.length, el.selectionEnd ?? el.value.length]; } catch { return [el.value.length, el.value.length]; }
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
function notify(message: string) {
  let box = document.getElementById('input-guard-message');
  if (!box) {
    box = document.createElement('div');
    box.id = 'input-guard-message';
    box.className = 'input-guard-message';
    box.setAttribute('role', 'status');
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  box.textContent = message;
  box.dataset.visible = 'true';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { if (box) box.dataset.visible = 'false'; }, 3500);
}

function numericFix(kind: Kind, value: string): string {
  if (kind === 'integer') return value.replace(/\D/g, '');
  let seen = false;
  return value.replace(/[^\d.,]/g, '').replace(/[.,]/g, (c) => (seen ? '' : ((seen = true), c)));
}

function onBeforeInput(event: Event) {
  const e = event as InputEvent;
  const el = e.target as Field;
  const kind = fieldKind(el);
  if (!kind || !e.inputType?.startsWith('insert') || e.inputType === 'insertCompositionText' || e.data == null) return;
  const [start, end] = selection(el);
  if (kind === 'text') {
    if (isCleanText(e.data)) return;
    e.preventDefault();
    const kept = cleanText(e.data);
    if (kept) {
      const value = el.value.slice(0, start) + kept + el.value.slice(end);
      setValue(el, value, start + kept.length);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
    notify(TEXT_REJECTED_MESSAGE);
    return;
  }
  const next = el.value.slice(0, start) + e.data + el.value.slice(end);
  const ok = el instanceof HTMLInputElement && el.type === 'number' ? /^\d*$/.test(e.data) || (kind === 'decimal' && /^[\d.]*$/.test(e.data)) : (kind === 'decimal' ? sanitizeDecimal(next) : sanitizeInteger(next)) !== null;
  if (!ok) { e.preventDefault(); notify(kind === 'decimal' ? NUMBER_REJECTED_MESSAGE : INTEGER_REJECTED_MESSAGE); }
}

/** Filet de sécurité : saisie prédictive, glisser-déposer, remplissage automatique, fin de composition. */
function sanitizeNow(el: Field) {
  const kind = fieldKind(el);
  if (!kind || (el instanceof HTMLInputElement && el.type === 'number')) return;
  const [, end] = selection(el);
  if (kind === 'text') {
    if (isCleanText(el.value)) return;
    const before = el.value.slice(0, end);
    setValue(el, cleanText(el.value), cleanText(before).length);
    notify(TEXT_REJECTED_MESSAGE);
    return;
  }
  const valid = kind === 'decimal' ? sanitizeDecimal(el.value) : sanitizeInteger(el.value);
  if (valid !== null) return;
  setValue(el, numericFix(kind, el.value), numericFix(kind, el.value.slice(0, end)).length);
  notify(kind === 'decimal' ? NUMBER_REJECTED_MESSAGE : INTEGER_REJECTED_MESSAGE);
}

function onInput(event: Event) {
  if ((event as InputEvent).isComposing) return;
  sanitizeNow(event.target as Field);
}

function onCompositionEnd(event: Event) {
  const el = event.target as Field;
  if (!fieldKind(el)) return;
  const before = el.value;
  sanitizeNow(el);
  if (el.value !== before) el.dispatchEvent(new Event('input', { bubbles: true }));
}

function onFocusIn(event: Event) {
  const el = event.target as Field;
  if (fieldKind(el) === 'text' && el.maxLength < 0) el.maxLength = el instanceof HTMLTextAreaElement ? DEFAULT_MAX.textarea : DEFAULT_MAX.input;
}

/** Garde-fou de saisie commun à toute l'application (décision du 30/09/2026). */
export function InputGuard() {
  useEffect(() => {
    document.addEventListener('beforeinput', onBeforeInput, true);
    document.addEventListener('input', onInput, true);
    document.addEventListener('compositionend', onCompositionEnd, true);
    document.addEventListener('focusin', onFocusIn, true);
    return () => {
      document.removeEventListener('beforeinput', onBeforeInput, true);
      document.removeEventListener('input', onInput, true);
      document.removeEventListener('compositionend', onCompositionEnd, true);
      document.removeEventListener('focusin', onFocusIn, true);
    };
  }, []);
  return null;
}
