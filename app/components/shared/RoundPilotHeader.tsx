'use client';

import type { ReactNode } from 'react';

export function RoundPilotHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: ReactNode;
}) {
  return (
    <section className="round-pilot-header">
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {badge}
    </section>
  );
}
