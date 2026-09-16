import type { ReactNode } from 'react';

export type FieldSize = 'number' | 'measure' | 'time' | 'date' | 'select' | 'standard' | 'search' | 'long';

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return <small id={id} className="field-error" role="alert">{message}</small>;
}

export function Field({
  label,
  className,
  error,
  size,
  children,
}: {
  label: ReactNode;
  className?: string;
  error?: string;
  size?: FieldSize;
  children: ReactNode;
}) {
  return (
    <label className={['field', size ? `is-${size}` : '', error ? 'is-invalid' : '', className].filter(Boolean).join(' ')}>
      {label}
      {children}
      <FieldError message={error} />
    </label>
  );
}
