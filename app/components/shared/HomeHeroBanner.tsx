'use client';

import type { ReactNode } from 'react';

export function HomeHeroBanner({
  kicker,
  title,
  meta,
  demo = false,
  score,
  due,
  aside,
  actions,
  bleed = false,
  sync,
  children,
}: {
  kicker?: string;
  title?: string;
  meta?: ReactNode;
  demo?: boolean;
  score?: ReactNode;
  due?: ReactNode;
  aside?: ReactNode;
  actions?: ReactNode;
  bleed?: boolean;
  sync?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <header className={`home-hero-banner${score ? ' has-score' : ''}${due ? ' has-due' : ''}${aside ? ' has-aside' : ''}${bleed ? ' is-bleed' : ''}`}>
      <div className="home-hero-copy">
        {kicker ? <p className="home-hero-kicker">{kicker}</p> : null}
        {title ? <p className="home-hero-title">{title}</p> : null}
        {meta ? <p className="home-hero-meta">{meta}</p> : null}
        {sync}
      </div>
      {due ? <div className="home-hero-due">{due}</div> : null}
      {score ? <div className="home-hero-score">{score}</div> : null}
      {aside ? <div className="home-hero-aside">{aside}</div> : null}
      <div className="home-hero-actions">
        {demo ? <span className="mockup-label">Démo</span> : null}
        {actions}
      </div>
      {children}
    </header>
  );
}
