'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

type Option = { value: string; label: string; disabled?: boolean };

function optionText(children: ReactNode): string {
  return Children.toArray(children).map(child => isValidElement<{ children?: ReactNode }>(child)
    ? optionText(child.props.children) : String(child)).join('');
}

function readOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement<{ value?: string | number; children?: ReactNode; disabled?: boolean }>(child) || child.type !== 'option') return [];
    const rawValue = child.props.value;
    const label = optionText(child.props.children);
    return [{
      value: rawValue != null ? String(rawValue) : label,
      label,
      disabled: Boolean(child.props.disabled),
    }];
  });
}

export function Select({
  value: controlled,
  defaultValue,
  onChange,
  children,
  disabled,
  required,
  className,
  id,
  name,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  'aria-invalid': ariaInvalid,
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const options = readOptions(children);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const value = controlled !== undefined ? String(controlled) : uncontrolled;
  const selected = options.find((item) => item.value === value) ?? options[0];
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const nativeRef = useRef<HTMLSelectElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const listId = useId();
  const buttonId = id ?? `${listId}-trigger`;
  const positioned = rect !== null;

  useEffect(() => {
    if (open && positioned) {
      const selected = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)');
      (selected ?? listRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)'))?.focus();
    }
  }, [open, positioned]);

  useEffect(() => {
    if (!open) return undefined;
    const place = () => {
      const node = buttonRef.current;
      if (node) setRect(node.getBoundingClientRect());
    };
    place();
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !(event.target as HTMLElement | null)?.closest?.('.app-select-list')) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (next: string) => {
    if (nativeRef.current?.matches(':disabled')) { setOpen(false); return; }
    if (controlled === undefined) setUncontrolled(next);
    if (nativeRef.current) {
      nativeRef.current.value = next;
      onChange?.({ target: nativeRef.current, currentTarget: nativeRef.current } as ChangeEvent<HTMLSelectElement>);
    }
    setOpen(false);
    buttonRef.current?.focus();
  };

  const openUp = Boolean(rect && rect.bottom + 248 > window.innerHeight && rect.top > 248);
  const listWidth = rect ? Math.min(Math.max(rect.width, 160), document.documentElement.clientWidth - 16) : 160;
  const listLeft = rect ? Math.max(8, Math.min(rect.left, document.documentElement.clientWidth - listWidth - 8)) : 8;

  return (
    <div className={['app-select', open ? 'is-open' : '', className].filter(Boolean).join(' ')} ref={rootRef}>
      <button
        ref={buttonRef}
        type="button"
        id={buttonId}
        role="combobox"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={ariaInvalid}
        aria-required={required}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{selected?.label || 'Choisir'}</span>
        <i aria-hidden="true" />
      </button>
      <select hidden ref={nativeRef} className="app-select-proxy" tabIndex={-1} aria-hidden="true" name={name} value={value} disabled={disabled} required={required} onChange={() => {}} onInvalid={(event) => { event.preventDefault(); buttonRef.current?.focus(); setOpen(true); }}>
        {children}
      </select>
      {open && rect && createPortal(
        <ul
          id={listId}
          ref={listRef}
          role="listbox"
          className="app-select-list"
          aria-label={ariaLabel}
          aria-labelledby={ariaLabel ? undefined : buttonId}
          style={openUp
            ? { left: listLeft, width: listWidth, bottom: window.innerHeight - rect.top + 4 }
            : { left: listLeft, width: listWidth, top: rect.bottom + 4 }}
          onMouseDown={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            const buttons = Array.from(listRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
            const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
            if (['ArrowDown','ArrowUp','Home','End'].includes(event.key)) {
              event.preventDefault();
              const index = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length;
              buttons[index]?.focus();
            } else if (event.key === 'Escape' || event.key === 'Tab') {
              if (event.key === 'Escape') event.preventDefault();
              setOpen(false);
              buttonRef.current?.focus();
            }
          }}
        >
          {options.map((item) => (
            <li key={item.value} role="presentation">
              <button
                type="button"
                role="option"
                aria-selected={item.value === value}
                disabled={item.disabled}
                className={item.value === value ? 'is-selected' : undefined}
                onClick={() => choose(item.value)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>,
        document.body,
      )}
    </div>
  );
}
