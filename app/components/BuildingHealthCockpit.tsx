'use client';

import { useId, useMemo, type CSSProperties } from 'react';

export type HealthAudience = 'administration' | 'facility' | 'electricite' | 'eau_incendie' | 'rondes_assistance';
export type HealthEquipment = { code: string; label: string; health: number; state: string };
export type HealthAnomaly = { id: string; priority: string; status: string; asset: string; delayed?: boolean };
type HealthView = 'manager' | 'equipment' | 'dashboard' | 'registry' | 'report';

const BUILDING_SCORE = 82;
const AVAILABILITY = 92;

const PERIMETER: Record<HealthAudience, string[] | null> = {
  administration: null,
  facility: null,
  electricite: ['DEMO-GE', 'DEMO-ASC-1/2', 'DEMO-ASC-1', 'DEMO-ASC-2'],
  eau_incendie: ['DEMO-EAU', 'DEMO-SSI'],
  rondes_assistance: ['DEMO-ESP', 'DEMO-RND'],
};

const DOMAINS = [
  { id: 'elec', label: 'Électricité', codes: ['DEMO-GE', 'DEMO-ASC-1/2'] },
  { id: 'eau', label: 'Eau & incendie', codes: ['DEMO-EAU', 'DEMO-SSI'] },
  { id: 'services', label: 'Espaces & rondes', codes: ['DEMO-ESP', 'DEMO-RND'] },
];

const COPY: Record<HealthAudience, { lead: string; primary: { view: HealthView; label: string } }> = {
  facility: {
    lead: '',
    primary: { view: 'manager', label: 'Ouvrir À traiter' },
  },
  administration: {
    lead: '',
    primary: { view: 'dashboard', label: 'Ouvrir Pilotage' },
  },
  electricite: {
    lead: 'Périmètre encadré : groupe électrogène et ascenseurs.',
    primary: { view: 'report', label: 'Ouvrir Rondes' },
  },
  eau_incendie: {
    lead: 'Périmètre encadré : surpresseur et pompe incendie.',
    primary: { view: 'report', label: 'Ouvrir Rondes' },
  },
  rondes_assistance: {
    lead: 'Périmètre encadré : espaces verts et rondes.',
    primary: { view: 'report', label: 'Ouvrir Rondes' },
  },
};

function inPerimeter(code: string, perimeter: string[] | null) {
  if (!perimeter) return true;
  return perimeter.some((item) => code === item || code.startsWith(item) || item.startsWith(code));
}

function barTone(health: number) {
  if (health < 70) return 'danger';
  if (health < 90) return 'warning';
  return 'success';
}

function statusWord(health: number) {
  if (health < 70) return 'Critique';
  if (health < 90) return 'Surveillance';
  return 'Sain';
}

export function ScoreRing({ value }: { value: number }) {
  const uid = useId();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const tone = barTone(value);
  const tick = (pct: number, inner: number, outer: number) => {
    const angle = (pct / 100) * 2 * Math.PI - Math.PI / 2;
    return {
      x1: 64 + inner * Math.cos(angle),
      y1: 64 + inner * Math.sin(angle),
      x2: 64 + outer * Math.cos(angle),
      y2: 64 + outer * Math.sin(angle),
    };
  };
  const t70 = tick(70, 44, 58);
  const t90 = tick(90, 44, 58);
  return (
    <div className={`building-score-ring is-${tone}`} aria-label={`Score de santé du bâtiment ${value} sur 100, ${statusWord(value)}`}>
      <svg viewBox="0 0 128 128" role="img" aria-labelledby={`${uid}-title ${uid}-desc`}>
        <title id={`${uid}-title`}>Score de santé du bâtiment</title>
        <desc id={`${uid}-desc`}>Le score actuel est de {value} sur 100, seuil de surveillance 70, seuil sain 90.</desc>
        <circle className="score-ring-track" cx="64" cy="64" r={radius} />
        <circle className="score-ring-zone is-danger" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.7} ${circumference}`} />
        <circle className="score-ring-zone is-warning" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.2} ${circumference}`} strokeDashoffset={-circumference * 0.7} />
        <circle className="score-ring-zone is-success" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.1} ${circumference}`} strokeDashoffset={-circumference * 0.9} />
        <line className="score-ring-tick" {...t70} />
        <line className="score-ring-tick" {...t90} />
        <circle className={`score-ring-value is-${tone}`} cx="64" cy="64" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div><strong>{value}</strong><span>/100</span><small>{statusWord(value)}</small></div>
    </div>
  );
}

function HealthScale({
  building,
  items,
}: {
  building: number;
  items: Array<{ code: string; label: string; health: number; mine?: boolean }>;
}) {
  const uid = useId();
  return (
    <figure className="health-scale" style={{ '--building': `${building}%` } as CSSProperties}>
      <figcaption>
        <span>ÉCHELLE COMMUNE 0–100</span>
        <b>Bâtiment et équipements sur le même axe</b>
      </figcaption>
      <div className="health-scale-grid" role="img" aria-labelledby={`${uid}-title`}>
        <p id={`${uid}-title`} className="visually-hidden">
          Score bâtiment {building} sur 100. {items.map((item) => `${item.label} ${item.health}`).join('. ')}
        </p>
        <div className="health-scale-spacer" aria-hidden="true" />
        <div className="health-scale-axis" aria-hidden="true">
          <i className="zone is-danger" />
          <i className="zone is-warning" />
          <i className="zone is-success" />
          <b className="building-mark" style={{ left: `${building}%` }}>{building}</b>
          <span className="tick is-0">0</span>
          <span className="tick is-70">70</span>
          <span className="tick is-90">90</span>
          <span className="tick is-100">100</span>
        </div>
        <div className="health-scale-spacer" aria-hidden="true" />
        {items.map((item) => {
          const tone = barTone(item.health);
          return (
            <div className={`health-lollipop is-${tone}${item.mine ? ' is-mine' : ''}`} key={item.code}>
              <span className="health-lollipop-name">
                <b>{item.code.replace('DEMO-', '')}</b>
                <small>{item.label}{item.mine ? ' · vous' : ''}</small>
              </span>
              <div className="health-lollipop-track">
                <i className="ref" aria-hidden="true" />
                <i className="stem" style={{ width: `${item.health}%` }} />
                <em className="dot" style={{ left: `${item.health}%` }} />
              </div>
              <strong>{item.health}</strong>
            </div>
          );
        })}
      </div>
      <p className="health-scale-legend"><span className="is-danger">0–69 critique</span><span className="is-watch">70–89 surveillance</span><span className="is-ok">90–100 sain</span><span className="is-building">trait = score bâtiment</span></p>
    </figure>
  );
}

export function BuildingHealthCockpit({
  audience,
  anomalies,
  equipment,
  onNavigate,
}: {
  audience: HealthAudience;
  anomalies: HealthAnomaly[];
  equipment: HealthEquipment[];
  onNavigate: (view: HealthView) => void;
}) {
  const copy = COPY[audience];
  const perimeter = PERIMETER[audience];
  const canOpenEquipment = audience === 'facility' || audience === 'administration';
  const ranked = useMemo(
    () => [...equipment].sort((a, b) => a.health - b.health),
    [equipment],
  );
  const openAnomalies = anomalies.filter((item) => item.status !== 'Clôturée');
  const criticalCount = openAnomalies.filter((item) => item.priority === 'Critique').length;
  const delayedCount = openAnomalies.filter((item) => item.delayed).length;
  const watchedCount = equipment.filter((item) => item.health < 90).length;
  const averageEquipment = equipment.length
    ? Math.round(equipment.reduce((total, item) => total + item.health, 0) / equipment.length)
    : 0;
  const weakest = ranked[0];
  const gravity = [
    { label: 'Critique', count: openAnomalies.filter((item) => item.priority === 'Critique').length, tone: 'danger' },
    { label: 'Haute', count: openAnomalies.filter((item) => item.priority === 'Haute').length, tone: 'warning' },
    { label: 'Moyenne', count: openAnomalies.filter((item) => item.priority === 'Moyenne').length, tone: 'info' },
    { label: 'Faible', count: openAnomalies.filter((item) => item.priority === 'Faible').length, tone: 'neutral' },
  ];
  const domains = DOMAINS.map((domain) => {
    const items = equipment.filter((item) => domain.codes.includes(item.code));
    const score = items.length ? Math.round(items.reduce((sum, item) => sum + item.health, 0) / items.length) : 0;
    return { ...domain, score, mine: items.some((item) => inPerimeter(item.code, perimeter)) && perimeter !== null };
  });
  const criticalTarget: HealthView = audience === 'administration' ? 'registry' : audience === 'facility' ? 'manager' : 'report';
  const tileTarget = (code: string): HealthView | null => {
    if (canOpenEquipment) return 'equipment';
    if (inPerimeter(code, perimeter)) return 'report';
    return null;
  };

  return (
    <section className="building-health-cockpit" aria-labelledby="building-health-title">
      <header className="health-cockpit-heading">
        <h2 id="building-health-title" className="visually-hidden">Santé du bâtiment · SCI Groupe Behira</h2>
        <p className="health-site-line">{copy.lead || 'SCI Groupe Behira'}</p>
        <div className="health-cockpit-actions">
          <span className="mockup-label">Démo</span>
          <button type="button" className="health-link" onClick={() => onNavigate(copy.primary.view)}>{copy.primary.label} →</button>
        </div>
      </header>

      <div className="health-cockpit-hero">
        <article className="panel health-score-panel">
          <div className="health-score-lead">
            <span>SCORE GLOBAL · SCI GROUPE BEHIRA</span>
            <p className="health-score-figure">
              <strong>{BUILDING_SCORE}</strong>
              <span>/100</span>
            </p>
            <p className={`kpi-status ${BUILDING_SCORE < 70 ? 'is-danger' : BUILDING_SCORE < 90 ? 'is-watch' : 'is-ok'}`}>{statusWord(BUILDING_SCORE)}</p>
            <p>Plafonné par {weakest ? `${weakest.code} · ${weakest.health}/100` : 'l’équipement vital le plus faible'}.</p>
          </div>
          <div className="health-kpi-grid">
            <button type="button" className="health-kpi is-action" onClick={() => onNavigate(criticalTarget)} aria-label={`${criticalCount} alertes critiques sur ${openAnomalies.length} dossiers ouverts. ${copy.primary.label}.`}>
              <span>ALERTES CRITIQUES</span>
              <strong className="is-danger">{criticalCount}</strong>
              <p>sur {openAnomalies.length} ouverts</p>
            </button>
            <div className="health-kpi">
              <span>PARC À SURVEILLER</span>
              <strong className={watchedCount ? 'is-watch' : ''}>{watchedCount}</strong>
              <p>{watchedCount}/{equipment.length} · moy. {averageEquipment}</p>
            </div>
            <div className="health-kpi">
              <span>DISPONIBILITÉ</span>
              <strong>{AVAILABILITY}<small>%</small></strong>
              <p>technique · démo</p>
            </div>
            <div className="health-kpi">
              <span>EN RETARD</span>
              <strong className={delayedCount ? 'is-danger' : ''}>{delayedCount}</strong>
              <p>sur {openAnomalies.length} actifs</p>
            </div>
          </div>
          <HealthScale
            building={BUILDING_SCORE}
            items={ranked.map((item) => ({
              code: item.code,
              label: item.label,
              health: item.health,
              mine: perimeter !== null && inPerimeter(item.code, perimeter),
            }))}
          />
        </article>
      </div>

      <article className="panel health-equipment-panel">
        <div className="analytics-card-head">
          <div>
            <span>SCORES PAR ÉQUIPEMENT</span>
            <h3>Scan du parc · du plus faible au plus sain</h3>
          </div>
          {copy.secondary
            ? <button type="button" className="health-link" onClick={() => onNavigate(copy.secondary!.view)}>{copy.secondary.label} →</button>
            : <span className="mockup-label">{equipment.length} modules</span>}
        </div>
        <div className="health-equip-board" role="list">
          {ranked.map((item) => {
            const tone = barTone(item.health);
            const mine = perimeter !== null && inPerimeter(item.code, perimeter);
            const foreign = perimeter !== null && !inPerimeter(item.code, perimeter);
            const target = tileTarget(item.code);
            const className = `health-equip-tile is-${tone}${mine ? ' is-mine' : ''}${foreign ? ' is-foreign' : ''}`;
            const body = (
              <>
                <span className="health-equip-code">{item.code}{mine ? ' · vous' : ''}</span>
                <strong>{item.health}<small>/100</small></strong>
                <p>{item.label}</p>
                <span className={`kpi-status is-${tone === 'danger' ? 'danger' : tone === 'warning' ? 'watch' : 'ok'}`}>{statusWord(item.health)}</span>
                <div className="score-bar-track" role="progressbar" aria-label={`${item.label}, ${item.health} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.health}>
                  <i className={tone} style={{ width: `${item.health}%` }} />
                </div>
              </>
            );
            return target
              ? <button type="button" role="listitem" className={`${className} is-action`} key={item.code} onClick={() => onNavigate(target)} aria-label={`${item.label}, ${item.health} sur 100. Ouvrir.`}>{body}</button>
              : <div role="listitem" className={className} key={item.code}>{body}</div>;
          })}
        </div>
        {perimeter
          ? <p className="health-equip-hint">Cadre bleu = votre périmètre. Les autres modules restent visibles pour le score du site.</p>
          : <div className="chart-legend">
              <span><i className="success" /> Sain ≥ 90</span>
              <span><i className="warning" /> Surveillance 70–89</span>
              <span><i className="danger" /> Critique inférieur à 70</span>
            </div>}
      </article>

      <div className="health-cockpit-body">
        <article className="panel health-domain-panel">
          <div className="analytics-card-head"><div><span>VENTILATION</span><h3>Santé par domaine</h3></div></div>
          <div className="health-domain-grid">
            {domains.map((domain) => (
              <div key={domain.id} className={domain.mine ? 'is-mine' : ''}>
                <span>{domain.label}{domain.mine ? ' · vous' : ''}</span>
                <strong>{domain.score}<small>/100</small></strong>
                <div className="score-bar-track" role="progressbar" aria-label={`${domain.label}, ${domain.score} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={domain.score}>
                  <i className={barTone(domain.score)} style={{ width: `${domain.score}%` }} />
                </div>
              </div>
            ))}
          </div>
        </article>

        <article className="panel health-gravity-panel">
          <div className="analytics-card-head"><div><span>EXPOSITION</span><h3>Gravité des dossiers actifs</h3></div><strong>{openAnomalies.length}</strong></div>
          <div className="health-gravity-bar" role="img" aria-label={gravity.map((item) => `${item.label} ${item.count}`).join(', ')}>
            {gravity.map((item) => item.count > 0
              ? <i key={item.label} className={item.tone} style={{ flexGrow: item.count }} title={`${item.label} · ${item.count}`} />
              : null)}
          </div>
          <ul className="health-gravity-legend">
            {gravity.map((item) => (
              <li key={item.label}><i className={item.tone} /><b>{item.count}</b> {item.label}</li>
            ))}
          </ul>
        </article>

        <aside className="insufficient-chart health-trend-note" role="status">
          <span>⌁</span>
          <div>
            <b>Tendance 30 jours indisponible</b>
            <p>Aucun instantané quotidien n’est encore enregistré. Le score du jour reste lisible sans variation inventée.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
