'use client';

import { useState, type CSSProperties } from 'react';

import { ge01NowStamp } from '../lib/ge01/report';
import { displayAssetCode } from '../lib/ui-contract/display.ts';
import { SyncStatusNotice } from './SyncStatusNotice';
import { RoundPilotHeader, SegmentedControl } from './shared';
import { Badge, BrandIcon, Button, Select } from './ui';

type Answer = '' | 'ok' | 'alert';
type Asset = 'wilo' | 'ria';

const wiloSteps = ['Contexte', 'Pression', 'Pompes', 'Sécurité', 'Synthèse'];
const riaSteps = ['Local', 'Coffret'];
const observationOptions = [
  { value: 'ok' as const, label: 'Conforme' },
  { value: 'alert' as const, label: 'À signaler' },
  { value: 'unseen' as const, label: 'Non observé' },
];

function readMeasure(raw: string) {
  const trimmed = raw.trim().replace(',', '.');
  if (!trimmed) return Number.NaN;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : Number.NaN;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  const letter = (value: string) => value.normalize('NFD').replace(/\p{M}/gu, '')[0]?.toUpperCase() ?? '';
  if (parts.length === 1) {
    const chars = parts[0].normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
    return chars.slice(0, 2) || '—';
  }
  return `${letter(parts[0])}${letter(parts[1])}` || '—';
}

function MeasureRange({ label, value, min, max, unit, pending = false }: { label: string; value: number; min: number; max: number; unit: string; pending?: boolean }) {
  const valid = Number.isFinite(value);
  const inRange = valid && !pending && value >= min && value <= max;
  const span = max - min;
  const position = !valid || pending ? 0 : span === 0 ? (value === min ? 50 : value < min ? 0 : 100) : Math.max(0, Math.min(100, ((value - min) / span) * 100));
  const tone = !valid ? 'unknown' : pending ? 'pending' : inRange ? 'in-range' : 'out-range';
  const status = !valid ? 'À COMPLÉTER' : pending ? 'VALEUR SAISIE' : inRange ? 'DANS LA PLAGE' : 'HORS PLAGE';
  const described = pending
    ? `${label} : ${valid ? value : 'valeur absente'} ${unit}. Valeur à confirmer par SECURISYS.`
    : `${label} : ${valid ? value : 'valeur absente'} ${unit}, plage attendue ${min} à ${max} ${unit}`;
  return (
    <article className={`measure-range ${tone}`}>
      <div>
        <span>{label}</span>
        <b>{valid ? `${value.toLocaleString('fr-FR')} ${unit}` : 'Valeur non renseignée'}</b>
        <em>{status}</em>
      </div>
      <div className="measure-range-track" aria-label={described}>
        <i style={{ '--measure-position': `${position}%` } as CSSProperties} />
      </div>
      <small>{pending ? <span>Valeur à confirmer par SECURISYS</span> : <><span>Minimum {min.toLocaleString('fr-FR')} {unit}</span><span>Maximum {max.toLocaleString('fr-FR')} {unit}</span></>}</small>
    </article>
  );
}

function StepRail({ labels, step, onStep }: { labels: string[]; step: number; onStep: (index: number) => void }) {
  return (
    <div className="round-step-rail">
      <nav className={`surpresseur-progress${labels.length === 2 ? ' is-two' : ''}`} aria-label="Progression de la ronde">
        {labels.map((item, index) => {
          const reached = index < step;
          return (
            <button
              key={item}
              type="button"
              className={index === step ? 'active' : reached ? 'done' : 'locked'}
              aria-current={index === step ? 'step' : undefined}
              disabled={index > step}
              aria-label={reached ? `Revenir à ${item}` : index > step ? `${item}, pas encore atteinte` : item}
              onClick={() => index <= step && onStep(index)}
            >
              <span>{reached ? '✓' : index + 1}</span>
              <b>{item}</b>
            </button>
          );
        })}
      </nav>
      <p className="round-step-hint">Une étape déjà franchie reste accessible pour revenir en arrière. Les suivantes s’ouvrent une à une.</p>
    </div>
  );
}

function CheckGrid({ items, checks, onCycle }: { items: Array<[string, string, string]>; checks: Record<string, Answer>; onCycle: (key: string) => void }) {
  return (
    <div className="check-grid">
      {items.map(([key, title, detail]) => {
        const answer = checks[key] ?? '';
        const tone = answer === 'ok' ? 'checked' : answer === 'alert' ? 'unchecked' : 'unset';
        const mark = answer === 'ok' ? '✓' : answer === 'alert' ? '!' : '·';
        const caption = answer === 'ok' ? 'Conforme' : answer === 'alert' ? 'À signaler' : 'À renseigner';
        return (
          <button type="button" key={key} className={tone} onClick={() => onCycle(key)}>
            <span>{mark}</span>
            <p><b>{title}</b><small>{detail}</small></p>
            <em>{caption}</em>
          </button>
        );
      })}
    </div>
  );
}

export function EauRounds({ agentName, draftNote, onSubmit }: { agentName: string; draftNote: string; onSubmit: () => void }) {
  const stamp = ge01NowStamp();
  const [asset, setAsset] = useState<Asset>('wilo');
  const [wiloStep, setWiloStep] = useState(0);
  const [riaStep, setRiaStep] = useState(0);
  const [wiloDate, setWiloDate] = useState(stamp.date);
  const [wiloTime, setWiloTime] = useState(stamp.time);
  const [riaDate, setRiaDate] = useState(stamp.date);
  const [riaTime, setRiaTime] = useState(stamp.time);
  const [pressure, setPressure] = useState('');
  const [tankLevel, setTankLevel] = useState('');
  const [observation, setObservation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [checks, setChecks] = useState<Record<string, Answer>>({});
  const [riaAnswers, setRiaAnswers] = useState<Record<string, '' | 'ok' | 'alert' | 'unseen'>>({});
  const [riaPressure, setRiaPressure] = useState('');

  const pressureValue = readMeasure(pressure);
  const tankValue = readMeasure(tankLevel);
  const riaPressureValue = readMeasure(riaPressure);
  const hasPressureAlert = Number.isFinite(pressureValue) && (pressureValue < 4.5 || pressureValue > 5.5);
  const pumpKeys = ['auto', 'p1', 'p2', 'leak', 'valves', 'alarm'];
  const answeredChecks = pumpKeys.filter((key) => checks[key] === 'ok' || checks[key] === 'alert').length;
  const wiloComplete = Number.isFinite(pressureValue) && Number.isFinite(tankValue) && answeredChecks === pumpKeys.length;
  const cycle = (key: string) => setChecks((items) => {
    const order: Answer[] = ['', 'ok', 'alert'];
    const next = order[(order.indexOf(items[key] ?? '') + 1) % order.length];
    return { ...items, [key]: next };
  });

  const wiloCode = displayAssetCode('DEMO-EAU');
  const riaCode = displayAssetCode('DEMO-SSI');

  return (
    <>
      <div className="workspace-tabs parameters-tabs round-asset-tabs" role="tablist" aria-label="Équipement de la ronde">
        <button type="button" role="tab" aria-selected={asset === 'wilo'} className={asset === 'wilo' ? 'active' : ''} onClick={() => setAsset('wilo')}>{wiloCode} · Eau</button>
        <button type="button" role="tab" aria-selected={asset === 'ria'} className={asset === 'ria' ? 'active' : ''} onClick={() => setAsset('ria')}>{riaCode} · Incendie</button>
      </div>

      {asset === 'wilo' ? (
        <>
          <RoundPilotHeader
            title={`${wiloCode} · Ronde quotidienne du surpresseur`}
            subtitle="Cinq étapes · fréquence quotidienne"
            badge={<Badge tone="neutral">BROUILLON LOCAL</Badge>}
          />
          <SyncStatusNotice state="demo-volatile" label="État de la ronde Surpresseur" />
          <StepRail labels={wiloSteps} step={wiloStep} onStep={setWiloStep} />
          <section className="surpresseur-layout">
            <article className="panel surpresseur-form-card">
              <div className="surpresseur-section-head"><div><span>ÉTAPE {wiloStep + 1} SUR 5</span><h3>{wiloSteps[wiloStep]}</h3></div><span className="mockup-label">MAQUETTE INTERACTIVE</span></div>

              {wiloStep === 0 && (
                <div className="surpresseur-fields ge-fields">
                  <div className="ge-field-grid">
                    <div className="field">
                      <span>Intervenant</span>
                      <div className="ge-agent-chip">
                        <span className="ge-agent-avatar" aria-hidden="true">{initials(agentName)}</span>
                        <b>{agentName}</b>
                        <BrandIcon name="lock" className="ge-agent-lock" />
                      </div>
                      <small>Session authentifiée</small>
                    </div>
                    <div className="field">
                      <span>Date et heure du contrôle</span>
                      <div className="ge-datetime-row">
                        <input type="date" value={wiloDate} aria-label="Date du contrôle" lang="fr" onChange={(event) => setWiloDate(event.target.value)} />
                        <input type="time" step={60} value={wiloTime} aria-label="Heure du contrôle" lang="fr" onChange={(event) => setWiloTime(event.target.value.slice(0, 5))} />
                        <Button variant="secondary" className="ge-now-button" onClick={() => { const next = ge01NowStamp(); setWiloDate(next.date); setWiloTime(next.time); }}>
                          <BrandIcon name="clock" />
                          Maintenant
                        </Button>
                      </div>
                    </div>
                  </div>
                  <label className="field">Type de ronde<Select defaultValue="Quotidienne"><option>Quotidienne</option><option>Après intervention</option><option>Contrôle exceptionnel</option></Select></label>
                  <div className="surpresseur-callout"><span>i</span><p><b>Contrôle terrain</b><small>Vérifier les pompes et relever la pression observée. Ne déclarez que les écarts constatés. Aucune réponse n’est présélectionnée.</small></p></div>
                </div>
              )}

              {wiloStep === 1 && (
                <div className="surpresseur-fields">
                  <div className="measure-grid">
                    <label><span>Pression réseau</span><div><input value={pressure} inputMode="decimal" placeholder="—" aria-label="Pression réseau" onChange={(event) => setPressure(event.target.value)} /><b>bar</b></div><small>Valeur normale : 5 bar. En deçà de 4,5 ou au-delà de 5,5 : état à surveiller. Vide ≠ 0.</small></label>
                    <label><span>Niveau bâche</span><div><input value={tankLevel} inputMode="decimal" placeholder="—" aria-label="Niveau bâche" onChange={(event) => setTankLevel(event.target.value)} /><b>%</b></div><small>Plage de contrôle : 40 à 100 %. Vide ≠ 0.</small></label>
                  </div>
                  <div className="measure-range-grid">
                    <MeasureRange label="Pression réseau" value={pressureValue} min={4.5} max={5.5} unit="bar" />
                    <MeasureRange label="Niveau de bâche" value={tankValue} min={40} max={100} unit="%" />
                  </div>
                  {hasPressureAlert && <div className="measure-alert"><span>!</span><div><b>État à surveiller</b><small>Valeur normale : 5 bar. En deçà de 4,5 ou au-delà de 5,5, la pression est à surveiller.</small></div></div>}
                  <label className="field">Stabilité du manomètre<Select defaultValue=""><option value="">Choisir</option><option>Stable</option><option>Oscillation légère</option><option>Oscillation importante</option></Select></label>
                </div>
              )}

              {wiloStep === 2 && (
                <div className="surpresseur-fields">
                  <CheckGrid
                    checks={checks}
                    onCycle={cycle}
                    items={[['auto', 'Mode automatique actif', 'Commande générale'], ['p1', 'Pompe P1 disponible', 'Pompe prioritaire'], ['p2', 'Pompe P2 disponible', 'Pompe de secours'], ['leak', 'Absence de fuite active', 'Collecteur et raccords']]}
                  />
                </div>
              )}

              {wiloStep === 3 && (
                <div className="surpresseur-fields">
                  <CheckGrid checks={checks} onCycle={cycle} items={[['valves', 'Vannes en position normale', 'Aspiration et refoulement'], ['alarm', 'Aucune alarme active', 'Coffret et supervision']]} />
                  <label className="field">Observation terrain<textarea value={observation} placeholder="Observation factuelle ou précision sur un écart." onChange={(event) => setObservation(event.target.value)} /></label>
                </div>
              )}

              {wiloStep === 4 && (
                <div className="surpresseur-fields">
                  <div className="round-summary">
                    <div><span>MESURES</span><b className={hasPressureAlert ? 'warning' : ''}>{Number.isFinite(pressureValue) ? `${pressureValue.toLocaleString('fr-FR')} bar` : '— bar'}</b><small>Pression réseau</small></div>
                    <div><span>NIVEAU</span><b>{Number.isFinite(tankValue) ? `${tankValue.toLocaleString('fr-FR')} %` : '— %'}</b><small>Bâche de stockage</small></div>
                    <div><span>CONTRÔLES</span><b>{answeredChecks}/6</b><small>Réponses saisies</small></div>
                  </div>
                  {!wiloComplete ? (
                    <div className="surpresseur-callout"><span>i</span><p><b>Contrôle incomplet</b><small>Renseignez les deux mesures et les six contrôles avant de conclure. Une case vide n’est ni un zéro ni un écart.</small></p></div>
                  ) : hasPressureAlert ? (
                    <div className="proposed-finding"><span>!</span><div><p>CONSTAT PROPOSÉ</p><h4>Pression réseau à surveiller</h4><small>Valeur normale 5 bar. La saisie est en deçà de 4,5 ou au-delà de 5,5.</small></div><Badge tone="orange">À QUALIFIER</Badge></div>
                  ) : (
                    <div className="surpresseur-callout"><span>i</span><p><b>Aucun écart déclaré</b><small>Les mesures saisies sont dans la plage. Aucun constat n’est proposé automatiquement.</small></p></div>
                  )}
                  <label className="confirmation-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Je confirme que les valeurs correspondent à la ronde réalisée sur {wiloCode}.</span></label>
                </div>
              )}

              <div className="surpresseur-actions">
                <button className="secondary-button" type="button" disabled={wiloStep === 0} onClick={() => setWiloStep((value) => Math.max(0, value - 1))}>← Précédent</button>
                <p>{draftNote}</p>
                {wiloStep < 4 ? <button className="primary-button" type="button" onClick={() => setWiloStep((value) => Math.min(4, value + 1))}>Continuer →</button> : <button className="primary-button" type="button" onClick={onSubmit}>Valider la maquette</button>}
              </div>
            </article>
            <aside className="surpresseur-aside">
              <article className="panel next-action-card"><p className="design-kicker">À SURVEILLER</p><span className="next-action-icon">!</span><h3>Réarmement provisoire</h3><p>Un réarmement ne suffit pas à clôturer une anomalie. Le diagnostic et la preuve restent nécessaires.</p><div><span>Responsable pressenti</span><b>{agentName}</b></div></article>
              <article className="panel score-explain-card"><div><span>{wiloCode}</span><b>Indisponible</b></div><p className="analytics-note">Aucune valeur de score n’est affichée avant validation de la méthode et de ses données sources.</p></article>
            </aside>
          </section>
        </>
      ) : (
        <>
          <RoundPilotHeader
            title={`${riaCode} · Ronde quotidienne du réseau incendie`}
            subtitle="Deux étapes · local et coffret"
            badge={<Badge tone="neutral">BROUILLON LOCAL</Badge>}
          />
          <p className="ria-round-note">Cadence à confirmer · heure d’Abidjan. Les réglages des pressostats et les essais spécialisés relèvent de SECURISYS. Valeur de pression à confirmer par SECURISYS.</p>
          <SyncStatusNotice state="demo-volatile" label="État de la ronde incendie" />
          <StepRail labels={riaSteps} step={riaStep} onStep={setRiaStep} />
          <section className="surpresseur-layout">
            <article className="panel surpresseur-form-card">
              <div className="surpresseur-section-head"><div><span>ÉTAPE {riaStep + 1} SUR 2</span><h3>{riaSteps[riaStep]}</h3></div><span className="mockup-label">MAQUETTE INTERACTIVE</span></div>
              {riaStep === 0 && (
                <div className="surpresseur-fields ge-fields">
                  <div className="field">
                    <span>Date et heure de réalisation (Abidjan)</span>
                    <div className="ge-datetime-row">
                      <input type="date" value={riaDate} aria-label="Date de réalisation" lang="fr" onChange={(event) => setRiaDate(event.target.value)} />
                      <input type="time" step={60} value={riaTime} aria-label="Heure de réalisation" lang="fr" onChange={(event) => setRiaTime(event.target.value.slice(0, 5))} />
                      <Button variant="secondary" className="ge-now-button" onClick={() => { const next = ge01NowStamp(); setRiaDate(next.date); setRiaTime(next.time); }}>
                        <BrandIcon name="clock" />
                        Maintenant
                      </Button>
                    </div>
                  </div>
                  {[['access', 'Accès au local dégagé'], ['floor', 'Sol du local'], ['clean', 'Local propre'], ['light', 'Éclairage fonctionnel'], ['smell', 'Absence d’odeur de brûlé'], ['temp', 'Température du local normale']].map(([key, label]) => (
                    <SegmentedControl
                      key={key}
                      label={label}
                      columns={3}
                      value={riaAnswers[key] ?? ''}
                      options={observationOptions}
                      onChange={(value) => setRiaAnswers((items) => ({ ...items, [key]: value }))}
                    />
                  ))}
                </div>
              )}
              {riaStep === 1 && (
                <div className="surpresseur-fields ge-fields">
                  {[['cabinet', 'Coffret accessible'], ['alarm', 'Aucune alarme active'], ['auto', 'Mode automatique']].map(([key, label]) => (
                    <SegmentedControl
                      key={key}
                      label={label}
                      columns={3}
                      value={riaAnswers[key] ?? ''}
                      options={observationOptions}
                      onChange={(value) => setRiaAnswers((items) => ({ ...items, [key]: value }))}
                    />
                  ))}
                  <div className="measure-grid">
                    <label>
                      <span>Pression manomètre</span>
                      <div><input value={riaPressure} inputMode="decimal" placeholder="—" aria-label="Pression manomètre" onChange={(event) => setRiaPressure(event.target.value)} /><b>bar</b></div>
                      <small>Valeur à confirmer par SECURISYS. Une case vide n’est pas un zéro.</small>
                    </label>
                  </div>
                  <MeasureRange label="Pression manomètre" value={riaPressureValue} min={5} max={5} unit="bar" pending />
                </div>
              )}
              <div className="surpresseur-actions">
                <button className="secondary-button" type="button" disabled={riaStep === 0} onClick={() => setRiaStep((value) => Math.max(0, value - 1))}>← Précédent</button>
                <p>{draftNote}</p>
                {riaStep < 1 ? <button className="primary-button" type="button" onClick={() => setRiaStep(1)}>Continuer →</button> : <button className="primary-button" type="button" onClick={onSubmit}>Valider la maquette</button>}
              </div>
            </article>
            <aside className="surpresseur-aside">
              <article className="panel score-explain-card"><div><span>{riaCode}</span><b>Indisponible</b></div><p className="analytics-note">RIA-01 n’est pas tranché. Aucun score n’est inventé pour cette ronde.</p></article>
            </aside>
          </section>
        </>
      )}
    </>
  );
}
