'use client';

import { useId, useMemo, type CSSProperties } from 'react';

export type HealthAudience = 'administration' | 'facility' | 'electricite' | 'eau_incendie' | 'rondes_assistance';
export type HealthEquipment = { code: string; label: string; health: number; state: string };
export type HealthAnomaly = { id: string; priority: string; status: string; asset: string; delayed?: boolean };
export type HealthDataState = 'demo' | 'loading' | 'live' | 'fallback';
type HealthView = 'manager' | 'equipment' | 'dashboard' | 'registry' | 'report';

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

export function ScoreRing({ value }: { value: number | null }) {
  const uid = useId();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = value === null ? circumference : circumference * (1 - value / 100);
  const tone = value === null ? 'unavailable' : barTone(value);
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
    <div className={`building-score-ring is-${tone}`} aria-label={value === null ? 'Score de santé du bâtiment non calculable, données insuffisantes' : `Score de santé du bâtiment ${value} sur 100, ${statusWord(value)}`}>
      <svg viewBox="0 0 128 128" role="img" aria-labelledby={`${uid}-title ${uid}-desc`}>
        <title id={`${uid}-title`}>Score de santé du bâtiment</title>
        <desc id={`${uid}-desc`}>{value === null ? 'Le score actuel ne peut pas être calculé faute de données métier validées. L’échelle de référence va de 0 à 100.' : `Le score actuel est de ${value} sur 100, seuil de surveillance 70, seuil sain 90.`}</desc>
        <circle className="score-ring-track" cx="64" cy="64" r={radius} />
        <circle className="score-ring-zone is-danger" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.7} ${circumference}`} />
        <circle className="score-ring-zone is-warning" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.2} ${circumference}`} strokeDashoffset={-circumference * 0.7} />
        <circle className="score-ring-zone is-success" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.1} ${circumference}`} strokeDashoffset={-circumference * 0.9} />
        <line className="score-ring-tick" {...t70} />
        <line className="score-ring-tick" {...t90} />
        {value !== null ? <circle className={`score-ring-value is-${tone}`} cx="64" cy="64" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} /> : null}
      </svg>
      <div><strong>{value ?? '—'}</strong><span>/100</span><small>{value === null ? 'Non calculable' : statusWord(value)}</small></div>
    </div>
  );
}

function HealthScale({
  building,
  items,
}: {
  building: number | null;
  items: Array<{ code: string; label: string; health: number | null; mine?: boolean }>;
}) {
  const uid = useId();
  return (
    <figure className="health-scale" style={{ '--building': `${building ?? 0}%` } as CSSProperties}>
      <figcaption>
        <span>ÉCHELLE COMMUNE 0–100</span>
        <b>Bâtiment et équipements sur le même axe</b>
      </figcaption>
      <div className="health-scale-grid" role="img" aria-labelledby={`${uid}-title`}>
        <p id={`${uid}-title`} className="visually-hidden">
          Score bâtiment non calculable. {items.map((item) => `${item.label} : score non calculable`).join('. ')}
        </p>
        <div className="health-scale-spacer" aria-hidden="true" />
        <div className="health-scale-axis" aria-hidden="true">
          <i className="zone is-danger" />
          <i className="zone is-warning" />
          <i className="zone is-success" />
          {building !== null ? <b className="building-mark" style={{ left: `${building}%` }}>{building}</b> : <b className="building-mark is-unavailable">N/C</b>}
          <span className="tick is-0">0</span>
          <span className="tick is-70">70</span>
          <span className="tick is-90">90</span>
          <span className="tick is-100">100</span>
        </div>
        <div className="health-scale-spacer" aria-hidden="true" />
        {items.map((item) => {
          return (
            <div className={`health-lollipop is-unavailable${item.mine ? ' is-mine' : ''}`} key={item.code}>
              <span className="health-lollipop-name">
                <b>{item.code.replace('DEMO-', '')}</b>
                <small>{item.label}{item.mine ? ' · vous' : ''}</small>
              </span>
              <div className="health-lollipop-track">
                {building !== null ? <i className="ref" aria-hidden="true" /> : null}
                <i className="stem is-unavailable" />
              </div>
              <strong>—</strong>
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
  dataState,
  onNavigate,
}: {
  audience: HealthAudience;
  anomalies: HealthAnomaly[];
  equipment: HealthEquipment[];
  dataState: HealthDataState;
  onNavigate: (view: HealthView) => void;
}) {
  const copy = COPY[audience];
  const perimeter = PERIMETER[audience];
  const canOpenEquipment = audience === 'facility' || audience === 'administration';
  const ranked = useMemo(() => [...equipment].sort((a, b) => a.code.localeCompare(b.code)), [equipment]);
  const openAnomalies = anomalies.filter((item) => item.status !== 'Clôturée');
  const criticalCount = openAnomalies.filter((item) => item.priority === 'Critique').length;
  const delayedCount = openAnomalies.filter((item) => item.delayed).length;
  const stateLabel = dataState === 'demo'
    ? 'DÉMO · NON CALCULABLE'
    : dataState === 'loading'
      ? 'PARTIELLE · CHARGEMENT'
      : 'PARTIELLE · NON CALCULABLE';
  const sourceLabel = dataState === 'demo'
    ? 'Données de démonstration exclues du calcul'
    : dataState === 'loading'
      ? 'Chargement des sources métier'
      : dataState === 'fallback'
        ? 'Données de repli incomplètes'
        : 'Données métier partielles';
  const missingData = [
    'criticité des équipements validée',
    'règles et pondérations approuvées',
    'couverture des mesures, maintenances et anomalies',
    'historique d’instantanés datés',
  ];
  const gravity = [
    { label: 'Critique', count: openAnomalies.filter((item) => item.priority === 'Critique').length, tone: 'danger' },
    { label: 'Haute', count: openAnomalies.filter((item) => item.priority === 'Haute').length, tone: 'warning' },
    { label: 'Moyenne', count: openAnomalies.filter((item) => item.priority === 'Moyenne').length, tone: 'info' },
    { label: 'Faible', count: openAnomalies.filter((item) => item.priority === 'Faible').length, tone: 'neutral' },
  ];
  const domains = DOMAINS.map((domain) => {
    const items = equipment.filter((item) => domain.codes.includes(item.code));
    return { ...domain, score: null, mine: items.some((item) => inPerimeter(item.code, perimeter)) && perimeter !== null };
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
          <span className="mockup-label">{stateLabel}</span>
          <button type="button" className="health-link" onClick={() => onNavigate(copy.primary.view)}>{copy.primary.label} →</button>
        </div>
      </header>

      <div className="health-cockpit-hero">
        <article className="panel health-score-panel">
          <div className="health-score-lead">
            <span>SCORE GLOBAL · SCI GROUPE BEHIRA</span>
            <p className="health-score-figure">
              <strong>—</strong>
              <span>/100</span>
            </p>
            <p className="kpi-status is-unavailable">Score non calculable — données insuffisantes</p>
            <p>{sourceLabel}.</p>
          </div>
          <div className="health-kpi-grid">
            <button type="button" className="health-kpi is-action" onClick={() => onNavigate(criticalTarget)} aria-label={`${criticalCount} alertes critiques sur ${openAnomalies.length} dossiers ouverts. ${copy.primary.label}.`}>
              <span>ALERTES CRITIQUES</span>
              <strong className="is-danger">{criticalCount}</strong>
              <p>sur {openAnomalies.length} ouverts</p>
            </button>
            <div className="health-kpi">
              <span>ÉQUIPEMENTS ÉVALUABLES</span>
              <strong>0<small>/{equipment.length}</small></strong>
              <p>règles non validées</p>
            </div>
            <div className="health-kpi">
              <span>ÉTAT DES DONNÉES</span>
              <strong className="health-data-word">Partiel</strong>
              <p>{dataState === 'demo' ? 'démonstration' : dataState === 'loading' ? 'chargement' : 'non calculable'}</p>
            </div>
            <div className="health-kpi">
              <span>EN RETARD</span>
              <strong className={delayedCount ? 'is-danger' : ''}>{delayedCount}</strong>
              <p>sur {openAnomalies.length} actifs</p>
            </div>
          </div>
          <HealthScale
            building={null}
            items={ranked.map((item) => ({
              code: item.code,
              label: item.label,
              health: null,
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
          <span className="mockup-label">{equipment.length} modules · scores non calculables</span>
        </div>
        <div className="health-equip-board" role="list">
          {ranked.map((item) => {
            const mine = perimeter !== null && inPerimeter(item.code, perimeter);
            const foreign = perimeter !== null && !inPerimeter(item.code, perimeter);
            const target = tileTarget(item.code);
            const className = `health-equip-tile is-unavailable${mine ? ' is-mine' : ''}${foreign ? ' is-foreign' : ''}`;
            const body = (
              <>
                <span className="health-equip-code">{item.code}{mine ? ' · vous' : ''}</span>
                <strong>—<small>/100</small></strong>
                <p>{item.label}</p>
                <span className="kpi-status is-unavailable">Non calculable</span>
                <div className="score-bar-track is-unavailable" role="img" aria-label={`${item.label}, score non calculable faute de données suffisantes`}>
                  <i />
                </div>
              </>
            );
            return target
              ? <button type="button" role="listitem" className={`${className} is-action`} key={item.code} onClick={() => onNavigate(target)} aria-label={`${item.label}, score non calculable. Ouvrir.`}>{body}</button>
              : <div role="listitem" className={className} key={item.code}>{body}</div>;
          })}
        </div>
        {perimeter
          ? <p className="health-equip-hint">Cadre bleu = votre périmètre. Les autres modules restent visibles pour le score du site.</p>
          : <div className="chart-legend">
              <span><i className="neutral" /> Scores suspendus jusqu’à validation métier</span>
            </div>}
      </article>

      <div className="health-cockpit-body">
        <article className="panel health-domain-panel">
          <div className="analytics-card-head"><div><span>VENTILATION</span><h3>Santé par domaine</h3></div></div>
          <div className="health-domain-grid">
            {domains.map((domain) => (
              <div key={domain.id} className={domain.mine ? 'is-mine' : ''}>
                <span>{domain.label}{domain.mine ? ' · vous' : ''}</span>
                <strong>—<small>/100</small></strong>
                <div className="score-bar-track is-unavailable" role="img" aria-label={`${domain.label}, score non calculable`}>
                  <i />
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
            <b>Score non calculable — données insuffisantes</b>
            <p>Données manquantes : {missingData.join(' · ')}. Aucune criticité, tendance ou performance agent n’est déduite.</p>
          </div>
        </aside>
      </div>
    </section>
  );
}
