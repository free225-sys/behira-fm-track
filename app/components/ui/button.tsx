'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary';

const variantClass: Record<ButtonVariant, string> = {
  primary: 'primary-button',
  secondary: 'secondary-button',
};

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  children: ReactNode;
}>(function Button({ variant = 'primary', className, type = 'button', children, ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={[variantClass[variant], className].filter(Boolean).join(' ')}
      {...props}
    >
      {children}
    </button>
  );
});
