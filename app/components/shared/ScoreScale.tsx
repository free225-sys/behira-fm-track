'use client';

import { useId, type CSSProperties } from 'react';

import type { BuildingScore, EquipmentCard } from '../../lib/ui-contract/building-health.ts';
import { displayRawScore, palierFromScore, palierTone, scoreFigure } from '../../lib/ui-contract/display.ts';

export function ScoreScale({
  score,
  items,
  variant = 'full',
}: {
  score: BuildingScore;
  items: EquipmentCard[];
  variant?: 'full' | 'axis';
}) {
  const uid = useId();
  const final = scoreFigure(score);
  if (final == null) {
    return (
      <figure className={`health-scale is-insufficient is-${variant}`}>
        <figcaption>
          <span>ÉCHELLE COMMUNE 0–100</span>
          <b>Score bâtiment non calculable</b>
        </figcaption>
        <p className="health-insufficient">Aucun point n’est placé tant que le score final n’est pas fourni.</p>
      </figure>
    );
  }
  const shown = final;
  const rawShown = displayRawScore(score.state === 'not_computable' ? shown : score.raw);
  return (
    <figure className={`health-scale is-${variant} is-${palierTone(palierFromScore(shown))}`} style={{ '--building': `${shown}%`, '--building-raw': `${rawShown}%` } as CSSProperties}>
      {variant === 'full' ? (
        <figcaption>
          <span>ÉCHELLE COMMUNE 0–100</span>
          <b>Point = score final · trait = score brut</b>
        </figcaption>
      ) : (
        <figcaption className="visually-hidden">
          <span>ÉCHELLE COMMUNE 0–100</span>
          <b>Point = score final · trait = score brut</b>
        </figcaption>
      )}
      <div className="health-scale-axis" role="img" aria-labelledby={`${uid}-title`}>
        <p id={`${uid}-title`} className="visually-hidden">
          Score bâtiment {shown} sur 100{rawShown !== shown ? `, score brut ${rawShown}` : ''}. {items.map((item) => `${item.name} ${item.score == null ? 'sans score' : item.score}`).join('. ')}
        </p>
        <span className="zone is-danger" />
        <span className="zone is-warning" />
        <span className="zone is-success" />
        {rawShown !== shown ? <i className="health-raw-mark" aria-hidden="true" /> : null}
        <b className="building-mark">{shown}</b>
        <span className="tick is-0">0</span>
        <span className="tick is-70">70</span>
        <span className="tick is-90">90</span>
        <span className="tick is-100">100</span>
      </div>
      {variant === 'full' ? (
        <>
          <div className="health-scale-grid">
            {items.map((item) => {
              if (item.score == null) {
                return (
                  <div key={item.id} className="health-lollipop is-missing">
                    <div className="health-lollipop-name"><b>{item.code}</b><small>{item.name}</small></div>
                    <div className="health-lollipop-track" />
                    <strong>—</strong>
                  </div>
                );
              }
              const shownItem = item.score;
              const tone = palierTone(palierFromScore(item.score));
              return (
                <div key={item.id} className={`health-lollipop is-${tone}`} style={{ '--value': `${shownItem}%` } as CSSProperties}>
                  <div className="health-lollipop-name"><b>{item.code}</b><small>{item.name}</small></div>
                  <div className="health-lollipop-track">
                    <i className="ref" />
                    <i className="stem" />
                    <i className="dot" />
                  </div>
                  <strong>{shownItem}</strong>
                </div>
              );
            })}
          </div>
          <p className="health-scale-legend"><span className="is-danger">0–69</span><span className="is-watch">70–89</span><span className="is-ok">90–100</span><span className="is-building">point = final · trait = brut</span></p>
        </>
      ) : null}
    </figure>
  );
}
