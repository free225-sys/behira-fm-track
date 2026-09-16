'use client';

import type { ReportTracking } from '../../lib/ui-contract/building-health.ts';
import { displayAssetCode, formatInstant, reportStageLabel, roundResultLabel } from '../../lib/ui-contract/display.ts';

export function ReportTrackingLine({
  item,
  onView,
}: {
  item: ReportTracking;
  onView?: () => void;
}) {
  const unread = item.stage === 'sent' || item.stage === 'confirmed';
  const result = roundResultLabel(item.result);
  return (
    <p className={`report-tracking-line${unread ? ' is-unread' : ''}`}>
      <span className="report-tracking-when">{formatInstant(item.sentAt)}</span>
      <span className="report-tracking-ref">{displayAssetCode(item.equipmentCode)}</span>
      {result ? <span className="report-tracking-result">{result}</span> : null}
      <span className="report-tracking-stage">{reportStageLabel(item.stage)}</span>
      {onView ? <button type="button" className="health-link" onClick={onView}>Voir</button> : null}
    </p>
  );
}
