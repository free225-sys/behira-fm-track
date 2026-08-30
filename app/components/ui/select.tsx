'use client';

import {
  Children,
  isValidElement,
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react';
import { createPortal } from 'react-dom';

type Option = { value: string; label: string; disabled?: boolean };

function readOptions(children: ReactNode): Option[] {
  return Children.toArray(children).flatMap((child) => {
    if (!isValidElement(child) || child.type !== 'option') return [];
    const rawValue = child.props.value;
    const label = typeof child.props.children === 'string' || typeof child.props.children === 'number'
      ? String(child.props.children)
      : String(rawValue ?? '');
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
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  const options = readOptions(children);
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(String(defaultValue ?? options[0]?.value ?? ''));
  const value = controlled !== undefined ? String(controlled) : uncontrolled;
  const selected = options.find((item) => item.value === value) ?? options[0];
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const listId = useId();

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
    if (controlled === undefined) setUncontrolled(next);
    onChange?.({ target: { value: next }, currentTarget: { value: next } } as never);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const openUp = Boolean(rect && rect.bottom + 248 > window.innerHeight && rect.top > 248);

  return (
    <div className={['app-select', open ? 'is-open' : '', className].filter(Boolean).join(' ')} ref={rootRef}>
      {name ? <input type="hidden" name={name} value={value} /> : null}
      <button
        ref={buttonRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        aria-required={required}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setOpen(true);
          }
        }}
      >
        <span>{selected?.label || 'Choisir'}</span>
        <i aria-hidden="true" />
      </button>
      {open && rect && createPortal(
        <ul
          id={listId}
          role="listbox"
          className="app-select-list"
          aria-label={ariaLabel}
          style={openUp
            ? { left: rect.left, width: Math.max(rect.width, 160), bottom: window.innerHeight - rect.top + 4 }
            : { left: rect.left, width: Math.max(rect.width, 160), top: rect.bottom + 4 }}
          onMouseDown={(event) => event.preventDefault()}
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
