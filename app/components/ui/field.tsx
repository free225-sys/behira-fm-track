import type { ReactNode } from 'react';

export function FieldError({ id, message }: { id?: string; message?: string }) {
  if (!message) return null;
  return <small id={id} className="field-error" role="alert">{message}</small>;
}

export function Field({
  label,
  className,
  error,
  children,
}: {
  label: ReactNode;
  className?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className={['field', error ? 'is-invalid' : '', className].filter(Boolean).join(' ')}>
      {label}
      {children}
      <FieldError message={error} />
    </label>
  );
}
