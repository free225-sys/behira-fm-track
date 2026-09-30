import type { ReactNode } from 'react';

export type BadgeTone = 'critical' | 'high' | 'orange' | 'medium' | 'low' | 'success' | 'blue' | 'purple' | 'neutral';

const icons: Record<string, string> = {
  critical: '!',
  high: '▲',
  orange: '▲',
  medium: '•',
  low: '•',
  success: '✓',
  blue: '•',
  purple: '•',
  neutral: '•',
};

export function Badge({ children, tone = 'neutral', className = '' }: { children: ReactNode; tone?: string; className?: string }) {
  return (
    <span className={`badge badge-${tone}${className ? ` ${className}` : ''}`}>
      <span className="badge-icon" aria-hidden="true">{icons[tone] ?? '•'}</span>
      <span className="badge-label">{children}</span>
    </span>
  );
}