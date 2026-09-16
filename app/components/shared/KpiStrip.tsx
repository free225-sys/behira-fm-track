'use client';

import type { ReactNode } from 'react';

export type KpiStripItem = {
  id: string;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  insufficient?: boolean;
  hidden?: boolean;
  onClick?: () => void;
};

export function KpiStrip({ items }: { items: KpiStripItem[] }) {
  return (
    <div className="health-kpi-grid kpi-strip">
      {items.filter((item) => !item.hidden).map((item) => {
        const className = `health-kpi${item.insufficient ? ' is-insufficient' : ''}${item.onClick ? ' is-action' : ''}`;
        const body = (
          <>
            <strong>{item.value}</strong>
            <span>{item.label}</span>
            {item.detail ? <p>{item.detail}</p> : null}
          </>
        );
        return item.onClick
          ? <button key={item.id} type="button" className={className} onClick={item.onClick}>{body}</button>
          : <div key={item.id} className={className}>{body}</div>;
      })}
    </div>
  );
}
