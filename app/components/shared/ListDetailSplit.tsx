'use client';

import type { ReactNode } from 'react';

export function ListDetailSplit({
  listLabel,
  list,
  detail,
}: {
  listLabel: string;
  list: ReactNode;
  detail: ReactNode;
}) {
  return (
    <div className="list-detail-split">
      <section className="list-detail-list" aria-label={listLabel}>{list}</section>
      <aside className="list-detail-detail">{detail}</aside>
    </div>
  );
}
