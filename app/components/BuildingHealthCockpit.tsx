'use client';

import { useId, useState, type ReactNode } from 'react';

import type {
  AudienceId,
  BuildingHealthSnapshot,
  EquipmentCard,
  TodaysRound,
  UiSession,
} from '../lib/ui-contract/building-health.ts';
import {
  atRiskHiddenCaption,
  atRiskVentilation,
  availabilityLabel,
  coverageLabel,
  displayRawScore,
  formatMoney,
  formatTime,
  formatWeekdayDate,
  insufficientCopy,
  insufficientReasonLabel,
  palierFromScore,
  palierTone,
  pendingDecisionsLabel,
  perimeterCopy,
  scoreFigure,
  shouldOfferControlPlanning,
} from '../lib/ui-contract/display.ts';
import {
  DemoScenarioSelect,
  EquipmentTable,
  HealthScoreBlock,
  HomeHeroBanner,
  InsufficientNote,
  KpiStrip,
  MetierStatusBadge,
  ControlValidityBadge,
  ScoreScale,
  StartRoundPicker,
} from './shared';

export type HealthAudience = AudienceId;
export type HealthEquipment = { code: string; label: string; health: number; state: string };
export type HealthAnomaly = { id: string; priority: string; status: string; asset: string; delayed?: boolean };
type HealthView = 'manager' | 'equipment' | 'dashboard' | 'registry' | 'report';

const COPY: Record<AudienceId, { kicker: string; primary: { view: HealthView; label: string } }> = {
  facility: { kicker: 'Santé du bâtiment', primary: { view: 'manager', label: 'Ouvrir Dossiers' } },
  administration: { kicker: 'Arbitrages', primary: { view: 'dashboard', label: 'Ouvrir Pilotage' } },
  electricite: { kicker: 'Ma journée', primary: { view: 'report', label: 'Ouvrir Rondes' } },
  eau_incendie: { kicker: 'Ma journée', primary: { view: 'report', label: 'Ouvrir Rondes' } },
  rondes_assistance: { kicker: 'Ma journée', primary: { view: 'report', label: 'Ouvrir Rondes' } },
};

export function ScoreRing({ value }: { value: number }) {
  const uid = useId();
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  const palier = palierFromScore(value);
  const tone = palierTone(palier);
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
    <div className={`building-score-ring is-${tone}`} aria-label={`Score ${value} sur 100`}>
      <svg viewBox="0 0 128 128" role="img" aria-labelledby={`${uid}-title ${uid}-desc`}>
        <title id={`${uid}-title`}>Score de santé du bâtiment</title>
        <desc id={`${uid}-desc`}>Le score actuel est de {value} sur 100. Paliers 70 et 90.</desc>
        <circle className="score-ring-track" cx="64" cy="64" r={radius} />
        <circle className="score-ring-zone is-danger" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.7} ${circumference}`} />
        <circle className="score-ring-zone is-warning" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.2} ${circumference}`} strokeDashoffset={-circumference * 0.7} />
        <circle className="score-ring-zone is-success" cx="64" cy="64" r={radius} strokeDasharray={`${circumference * 0.1} ${circumference}`} strokeDashoffset={-circumference * 0.9} />
        <line className="score-ring-tick" {...t70} />
        <line className="score-ring-tick" {...t90} />
        <circle className={`score-ring-value is-${tone}`} cx="64" cy="64" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <div><strong>{value}</strong><span>/100</span></div>
    </div>
  );
}

function AgentEquipmentList({ items }: { items: EquipmentCard[] }) {
  if (items.length === 0) {
    return <InsufficientNote title="Aucun équipement dans ce périmètre" />;
  }
  return (
    <div className="agent-equip-shortlist">
      <span>Vos équipements</span>
      <ul>
        {items.map((item) => {
          const palier = item.score == null ? null : palierFromScore(item.score);
          return (
            <li key={item.id}>
              <b className="equipment-reference">{item.code}</b>
              {item.score == null
                ? <em>—</em>
                : <em className={palier ? `is-${palierTone(palier)}` : undefined}>{item.score}</em>}
              <span className="status-stack">
                <MetierStatusBadge status={item.operationalStatus} />
                <ControlValidityBadge value={item.controlValidity} />
              </span>
            </li>
          );
        })}
      </ul>
      <p className="health-equip-hint">Scores sur 100, provisoires tant que la formule n’est pas validée.</p>
    </div>
  );
}

function atRiskCaption(atRisk: BuildingHealthSnapshot['atRisk']) {
  if (atRisk.status !== 'ok') return null;
  const ventilation = atRiskVentilation(atRisk);
  const hidden = atRiskHiddenCaption(atRisk.hiddenItemCount);
  return [ventilation, hidden].filter(Boolean).join(' · ');
}

function agentHello(count: number) {
  if (count <= 0) return 'Bonjour, aucune action ne vous attend';
  if (count === 1) return 'Bonjour, 1 action vous attend';
  return `Bonjour, ${count} actions vous attendent`;
}

function adminHello(count: number) {
  if (count <= 0) return 'Aucun arbitrage n’attend votre décision';
  if (count === 1) return '1 arbitrage attend votre décision';
  return `${count} arbitrages attendent votre décision`;
}

export function BuildingHealthCockpit({
  snapshot,
  session,
  onNavigate,
  rounds = [],
  actionCount = 0,
  causeActions,
  bannerExtras,
  children,
}: {
  snapshot: BuildingHealthSnapshot;
  session: UiSession;
  onNavigate: (view: HealthView) => void;
  rounds?: TodaysRound[];
  actionCount?: number;
  causeActions?: ReactNode;
  bannerExtras?: ReactNode;
  children?: ReactNode;
}) {
  const copy = COPY[session.audience];
  const agent = session.audience === 'electricite' || session.audience === 'eau_incendie' || session.audience === 'rondes_assistance';
  const admin = session.audience === 'administration';
  const facility = session.audience === 'facility';
  const canOpenEquipment = session.audience === 'facility' || session.audience === 'administration';
  const ranked = [...snapshot.equipment].sort((a, b) => (a.score ?? 101) - (b.score ?? 101));
  const atRisk = snapshot.atRisk;
  const reasons = snapshot.counterUnavailableReasons;
  const dueCount = rounds.length;
  const firstDeadline = rounds
    .filter((item) => item.deadline && item.state !== 'done')
    .sort((a, b) => (a.deadline ?? '').localeCompare(b.deadline ?? ''))[0];
  const missedYesterday = rounds.find((item) => item.missedYesterday);
  const notComputable = snapshot.score.state === 'not_computable';
  const [eqQuery, setEqQuery] = useState('');
  const [eqRisk, setEqRisk] = useState(false);
  const weekday = formatWeekdayDate(snapshot.asOf, snapshot.siteTimezone);
  const figure = scoreFigure(snapshot.score);
  const palier = figure == null ? null : palierFromScore(figure);

  const kpiItems = [
    atRisk.status === 'insufficient'
      ? { id: 'risk', label: 'Équipements à risque', value: '—', detail: `Données insuffisantes. ${insufficientCopy(atRisk)}`, insufficient: true }
      : { id: 'risk', label: 'Équipements à risque', value: atRisk.total, detail: atRiskCaption(atRisk), onClick: () => onNavigate(canOpenEquipment ? 'equipment' : 'report') },
    snapshot.availability.status === 'insufficient'
      ? { id: 'avail', label: 'Disponibilité', value: '—', detail: `Données insuffisantes. ${insufficientCopy(snapshot.availability)}`, insufficient: true }
      : { id: 'avail', label: 'Disponibilité', value: <>{snapshot.availability.percent}<small>%</small></>, detail: availabilityLabel(snapshot.availability.functionalCount, snapshot.availability.controlledCount) },
    snapshot.coverage.status === 'insufficient'
      ? { id: 'cov', label: 'Couverture', value: '—', detail: `Données insuffisantes. ${insufficientCopy(snapshot.coverage)}`, insufficient: true }
      : { id: 'cov', label: 'Couverture', value: <>{snapshot.coverage.percent}<small>%</small></>, detail: coverageLabel(snapshot.coverage.currentCount, snapshot.coverage.totalCount) },
    { id: 'pending', label: facility ? 'Dossiers à traiter' : pendingDecisionsLabel(session.audience), value: snapshot.pendingDecisions ?? '—', detail: snapshot.pendingDecisions == null ? 'Données insuffisantes. Source non raccordée.' : undefined, insufficient: snapshot.pendingDecisions == null, hidden: reasons.pendingDecisions === 'not_authorized', onClick: snapshot.pendingDecisions != null && canOpenEquipment ? () => onNavigate('manager') : undefined },
    { id: 'overdue', label: 'Critiques hors délai', value: snapshot.overdueCritical ?? '—', detail: snapshot.overdueCritical == null ? 'Données insuffisantes. Source non raccordée.' : undefined, insufficient: snapshot.overdueCritical == null, hidden: reasons.overdueCritical === 'not_authorized' },
    { id: 'reserves', label: 'Réserves ouvertes', value: snapshot.openReserves ?? '—', detail: snapshot.openReserves == null ? 'Données insuffisantes. Source non raccordée.' : undefined, insufficient: snapshot.openReserves == null, hidden: reasons.openReserves === 'not_authorized' },
  ];

  const dueMeta = [
    firstDeadline?.deadline ? `Première échéance ${formatTime(firstDeadline.deadline, snapshot.siteTimezone)}` : null,
    missedYesterday ? `${missedYesterday.equipmentCode ?? 'Zone'} manquée hier` : null,
  ].filter(Boolean).join(', ');

  const bannerTitle = admin
    ? 'Arbitrages'
    : agent
      ? agentHello(actionCount)
      : undefined;
  const bannerKicker = admin ? weekday : agent ? undefined : `${copy.kicker}, ${weekday}`;
  const bannerMeta = admin
    ? `${adminHello(actionCount)}. Seuil d’approbation en vigueur : ${formatMoney(snapshot.threshold.value)}.`
    : agent
      ? `${weekday}. ${perimeterCopy(session)}.`
      : undefined;

  const causeColumn = !agent && !admin && snapshot.score.state === 'capped' ? (
    <div className="health-cause-column">
      <p className="home-hero-kicker">Cause du plafond</p>
      <p className="health-cause-title">{snapshot.score.cause ? `${snapshot.score.cause.equipmentCode} indisponible` : snapshot.score.hiddenCauseCount > 0 ? 'Cause hors droits de lecture' : 'Cause non renseignée'}</p>
      {snapshot.score.cause ? <p className="home-hero-meta">{snapshot.score.cause.equipmentName}{snapshot.score.cause.reasonDetail ? ` · ${snapshot.score.cause.reasonDetail}` : ''}. Score brut {displayRawScore(snapshot.score.raw)}.</p> : null}
      {snapshot.score.decisionDeadline ? <p className="health-cause-req">Qualifier avant {formatTime(snapshot.score.decisionDeadline, snapshot.siteTimezone)}</p> : null}
      <div className="health-cause-acts">
        {causeActions ?? (
          <>
            <button type="button" className="primary-button qualify-action" onClick={() => onNavigate('manager')}>Qualifier</button>
            <button type="button" className="health-link" onClick={() => onNavigate(copy.primary.view)}>{copy.primary.label} →</button>
          </>
        )}
      </div>
    </div>
  ) : null;

  const missingAside = facility && notComputable ? (
    <div className="health-missing-column">
      <p className="home-hero-kicker">Ce qui manque pour calculer</p>
      <ul className="health-missing-list">
        {snapshot.score.missingReasons.map((reason) => <li key={reason}>{insufficientReasonLabel(reason)}</li>)}
        {snapshot.score.missingControls.map((item) => (
          <li key={`${item.equipmentCode}-${item.missingItem}`}>{item.equipmentCode} · {item.missingItem}{item.equipmentName ? ` · ${item.equipmentName}` : ''}</li>
        ))}
        {snapshot.score.hiddenMissingControlCount > 0 ? <li>{snapshot.score.hiddenMissingControlCount} contrôle{snapshot.score.hiddenMissingControlCount > 1 ? 's' : ''} hors périmètre</li> : null}
      </ul>
      {shouldOfferControlPlanning(snapshot.score) ? <button type="button" className="health-link" onClick={() => onNavigate('report')}>Planifier les contrôles</button> : null}
    </div>
  ) : null;

  const adminMini = admin ? (
    <div className="health-admin-mini">
      <p className="home-hero-kicker">Santé du bâtiment</p>
      {figure == null ? (
        <>
          <p className="health-admin-mini-value">—</p>
          <p className="home-hero-meta">Non calculable. {insufficientCopy({ status: 'insufficient', reasonCode: snapshot.score.missingReasons[0] ?? 'formula_pending', detail: null })}</p>
        </>
      ) : (
        <>
          <p className={`health-admin-mini-value is-${palier ? palierTone(palier) : 'muted'}`}>{figure}<small> /100{snapshot.score.state === 'capped' ? ', plafonné' : ''}</small></p>
          <p className="home-hero-meta">
            {snapshot.score.cause ? `${snapshot.score.cause.equipmentCode} indisponible. ` : null}
            Score brut {displayRawScore(snapshot.score.raw)}
            {snapshot.coverage.status === 'ok' ? `, couverture ${snapshot.coverage.percent} %` : ''}.
            <button type="button" className="health-link" onClick={() => onNavigate('dashboard')}>Voir l’accueil du FM</button>
          </p>
        </>
      )}
    </div>
  ) : null;

  const bannerActions = agent
    ? <StartRoundPicker rounds={rounds} onSelect={() => onNavigate('report')} onOffPlan={() => onNavigate('report')} />
    : causeColumn || admin ? null : <button type="button" className="health-link" onClick={() => onNavigate(copy.primary.view)}>{copy.primary.label} →</button>;

  const filteredEquipment = ranked.filter((item) => {
    if (eqRisk && item.operationalStatus === 'available') return false;
    if (!eqQuery.trim()) return true;
    const hay = `${item.code} ${item.name} ${item.zone ?? ''}`.toLowerCase();
    return hay.includes(eqQuery.trim().toLowerCase());
  });

  return (
    <section className={`building-health-cockpit${admin ? ' is-admin' : ''}${facility ? ' is-facility' : ''}${agent ? ' is-agent' : ''}`} aria-labelledby="building-health-title">
      <h2 id="building-health-title" className="visually-hidden">Santé du bâtiment · {snapshot.siteLabel}</h2>
      <HomeHeroBanner
        kicker={bannerKicker}
        title={bannerTitle}
        meta={bannerMeta}
        demo={false}
        bleed
        sync={agent ? <span className="home-hero-sync"><i aria-hidden="true" />Tout est synchronisé</span> : undefined}
        due={agent ? (
          <div>
            <p className="home-hero-due-value">{dueCount} ronde{dueCount > 1 ? 's' : ''} aujourd’hui</p>
            <p className="home-hero-due-meta">{dueMeta || 'Aucune échéance renseignée'}</p>
          </div>
        ) : undefined}
        score={!agent && !admin ? (
          <div className="home-hero-score-stack">
            <HealthScoreBlock snapshot={snapshot} variant="banner" onPlan={() => onNavigate('report')} />
            {notComputable ? null : (
              <>
                <ScoreScale score={snapshot.score} items={ranked} variant="axis" />
                <p className="home-hero-score-meta">
                  {snapshot.score.state === 'capped' ? `Plafond ${snapshot.score.cap} appliqué` : null}
                  {snapshot.coverage.status === 'ok' ? ` · Couverture ${snapshot.coverage.percent} %` : null}
                  {snapshot.score.updatedAt ? ` · Mis à jour à ${formatTime(snapshot.score.updatedAt, snapshot.siteTimezone)}` : null}
                </p>
              </>
            )}
          </div>
        ) : undefined}
        aside={adminMini ?? causeColumn ?? missingAside}
        actions={bannerActions}
      >
        {bannerExtras}
      </HomeHeroBanner>
      {session.demo ? <DemoScenarioSelect /> : null}

      {agent ? (
        <article className={`sheet health-agent-band${notComputable ? ' is-not-computable' : ''}`}>
          {notComputable
            ? <p className="health-agent-score-line">Score du bâtiment : non calculable pour le moment</p>
            : (
              <>
                <div className="health-agent-score-col">
                  <HealthScoreBlock snapshot={snapshot} variant="compact" onPlan={() => onNavigate('report')} />
                </div>
                <div className="health-agent-scale-col">
                  <ScoreScale score={snapshot.score} items={ranked} variant="axis" />
                  {snapshot.score.state === 'capped' ? (
                    <p className="health-agent-why">Plafond appliqué{snapshot.score.cause ? ` : ${snapshot.score.cause.equipmentCode} est indisponible` : ''}. Score brut {displayRawScore(snapshot.score.raw)}{snapshot.score.updatedAt ? `, mis à jour à ${formatTime(snapshot.score.updatedAt, snapshot.siteTimezone)}` : ''}.</p>
                  ) : null}
                </div>
              </>
            )}
          <AgentEquipmentList items={ranked} />
        </article>
      ) : (
        <>
          {admin ? null : <KpiStrip items={kpiItems} />}
          {children}
          {admin ? null : (
            <article className="sheet health-equipment-panel">
              <div className="analytics-card-head">
                <div>
                  <h3>Équipements</h3>
                  <p>Parc technique, du plus faible au plus sain, regroupés par famille.</p>
                </div>
                <div className="health-equip-tools">
                  <label className="search-box dossiers-search">
                    <span>⌕</span>
                    <input aria-label="Rechercher un équipement" placeholder="Code, nom ou zone" value={eqQuery} onChange={(event) => setEqQuery(event.target.value)} />
                  </label>
                  <button type="button" className={`chip${eqRisk ? '' : ' is-pressed'}`} aria-pressed={!eqRisk} onClick={() => setEqRisk(false)}>Tous</button>
                  <button type="button" className={`chip${eqRisk ? ' is-pressed' : ''}`} aria-pressed={eqRisk} onClick={() => setEqRisk(true)}>À risque</button>
                  <button type="button" className="health-link" onClick={() => onNavigate('equipment')}>Ouvrir Équipements →</button>
                </div>
              </div>
              {filteredEquipment.length === 0
                ? <InsufficientNote title="Aucun équipement ne correspond. Effacez la recherche ou choisissez Tous." />
                : <EquipmentTable equipment={filteredEquipment} onOpen={() => onNavigate('equipment')} atRiskOnly={false} />}
            </article>
          )}
        </>
      )}
    </section>
  );
}
