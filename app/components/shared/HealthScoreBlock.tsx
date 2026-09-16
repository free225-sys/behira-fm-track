'use client';

import type { BuildingHealthSnapshot } from '../../lib/ui-contract/building-health.ts';
import {
  coverageLabel,
  displayRawScore,
  formatInstant,
  insufficientCopy,
  insufficientReasonLabel,
  palierFromScore,
  palierSituationLabel,
  palierTone,
  shouldOfferControlPlanning,
} from '../../lib/ui-contract/display.ts';
import { PalierBadge } from './StatusBadge';

export function HealthScoreBlock({
  snapshot,
  variant = 'full',
  onPlan,
}: {
  snapshot: BuildingHealthSnapshot;
  variant?: 'full' | 'compact' | 'banner';
  onPlan?: () => void;
}) {
  const { score, coverage } = snapshot;
  if (score.state === 'not_computable') {
    const plan = shouldOfferControlPlanning(score);
    const missing = (
      <ul className="health-missing-list">
        {score.missingReasons.map((reason) => <li key={reason}>{insufficientReasonLabel(reason)}</li>)}
        {score.missingControls.map((item) => (
          <li key={`${item.equipmentCode}-${item.missingItem}`}>{item.equipmentCode} · {item.missingItem}{item.equipmentName ? ` · ${item.equipmentName}` : ''}</li>
        ))}
        {score.hiddenMissingControlCount > 0 ? <li>{score.hiddenMissingControlCount} contrôle{score.hiddenMissingControlCount > 1 ? 's' : ''} hors périmètre</li> : null}
      </ul>
    );
    return (
      <div className={`health-score-lead is-not-computable is-${variant}`}>
        <div className="health-score-lead-copy">
          <span>Santé du bâtiment</span>
          <p className="health-score-figure"><strong>—</strong></p>
          <p className="health-score-state">Non calculable</p>
          {variant === 'compact' ? (
            <p className="health-score-meta">{insufficientReasonLabel(score.missingReasons[0] ?? 'formula_pending')}</p>
          ) : null}
          {plan && onPlan && variant !== 'banner' ? <button type="button" className="health-link" onClick={onPlan}>Planifier les contrôles</button> : null}
        </div>
        {variant === 'full' ? missing : null}
      </div>
    );
  }

  const palier = palierFromScore(score.final);
  return (
    <div className={`health-score-lead is-${score.state} is-${variant}`}>
      <span>Santé du bâtiment</span>
      <p className="health-score-figure">
        <strong className={`is-${palierTone(palier)}`}>{score.final}</strong>
        <span>/100</span>
      </p>
      <p className={`health-score-situation is-${palierTone(palier)}`}>{palierSituationLabel(palier)}</p>
      {variant === 'full' ? <PalierBadge value={score.final} /> : null}
      {score.state === 'capped' && variant === 'full' ? (
        <div className="health-score-cap" role="status">
          <p>Plafond {score.cap} appliqué · score brut {displayRawScore(score.raw)}</p>
          {score.cause ? (
            <p>{score.cause.equipmentCode} · {score.cause.equipmentName}{score.cause.reasonDetail ? ` · ${score.cause.reasonDetail}` : ''}</p>
          ) : score.hiddenCauseCount > 0 ? <p>Cause hors droits de lecture.</p> : null}
          {variant === 'full' && score.causeCount > 1 ? <p>{score.causeCount} cause{score.causeCount > 1 ? 's' : ''} au total{score.hiddenCauseCount ? ` · ${score.hiddenCauseCount} hors périmètre` : ''}.</p> : null}
          {score.decisionDeadline ? <p>Décision attendue {formatInstant(score.decisionDeadline, snapshot.siteTimezone)}.</p> : null}
        </div>
      ) : variant === 'full' ? (
        <p className="health-score-meta">
          {coverage.status === 'ok' ? `Couverture ${coverage.percent} % · ${coverageLabel(coverage.currentCount, coverage.totalCount)}` : insufficientCopy(coverage)}
          {score.updatedAt ? ` · Mis à jour ${formatInstant(score.updatedAt, snapshot.siteTimezone)}` : ''}
        </p>
      ) : null}
    </div>
  );
}
