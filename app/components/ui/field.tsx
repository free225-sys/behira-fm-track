import type { ReactNode } from 'react';

export function Field({
  label,
  className,
  children,
}: {
  label: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={['field', className].filter(Boolean).join(' ')}>
      {label}
      {children}
    </label>
  );
}
