'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function IconButton({
  className,
  type = 'button',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      type={type}
      className={['icon-button', className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
}
