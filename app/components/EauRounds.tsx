'use client';

import { useState, type CSSProperties } from 'react';

import { ge01NowStamp } from '../lib/ge01/report';
import { displayAssetCode } from '../lib/ui-contract/display.ts';
import { wiloPressureState } from '../lib/wilo/report';
import { SyncStatusNotice } from './SyncStatusNotice';
import { RoundModeBadge, RoundPilotHeader, RoundStepRail, SegmentedControl } from './shared';
import { Badge, BrandIcon, Button, Field, Select } from './ui';

type ControlAnswer = '' | 'ok' | 'ko' | 'unknown';
type Asset = 'wilo' | 'ria';

const wiloSteps = ['Contexte', 'Pression', 'Pompes', 'Sécurité', 'Synthèse'];
const riaSteps = ['Local', 'Coffret'];
const observationOptions = [
  { value: 'ok' as const, label: 'Conforme' },
  { value: 'alert' as const, label: 'Anomalie' },
  { value: 'unknown' as const, label: 'Non vérifié' },
];
const roundTypes = ['Quotidienne', 'Après intervention', 'Contrôle exceptionnel'];
const pumpKeys = ['auto', 'p1', 'p2', 'leak', 'valves', 'alarm'];

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

function MeasureRange({ label, value, min, max, unit, embedded = false }: { label: string; value: number; min: number; max: number; unit: string; embedded?: boolean }) {
  const valid = Number.isFinite(value);
  const inRange = valid && value >= min && value <= max;
  const span = max - min;
  const position = !valid ? 0 : span === 0 ? (value === min ? 50 : value < min ? 0 : 100) : Math.max(0, Math.min(100, ((value - min) / span) * 100));
  return (
    <article className={`measure-range ${embedded ? 'is-embedded' : ''} ${!valid ? 'unknown' : inRange ? 'in-range' : 'out-range'}`}>
      <div>
        {embedded ? null : <span>{label}</span>}
        <b>{valid ? `${value.toLocaleString('fr-FR')} ${unit}` : 'Valeur non renseignée'}</b>
        <em>{valid ? (inRange ? 'DANS LA PLAGE' : 'HORS PLAGE') : 'À COMPLÉTER'}</em>
      </div>
      <div className="measure-range-track" aria-label={`${label} : ${valid ? value : 'valeur absente'} ${unit}, plage attendue ${min} à ${max} ${unit}`}>
        <i style={{ '--measure-position': `${position}%` } as CSSProperties} />
      </div>
      <small><span>Minimum {min} {unit}</span><span>Maximum {max} {unit}</span></small>
    </article>
  );
}

function MockControl({ title, detail, value, reason, onChoose, onReason }: {
  title: string; detail: string; value: ControlAnswer; reason: string;
  onChoose: (value: ControlAnswer) => void; onReason: (value: string) => void;
}) {
  return (
    <div className={`control-choice ${value === 'ko' ? 'is-anomaly' : ''}`} role="group" aria-label={title}>
      <p><b>{title}</b><small>{detail}</small></p>
      <div className="choice-set">
        <button type="button" className={`choice-chip ${value === 'ok' ? 'is-selected' : ''}`} aria-pressed={value === 'ok'} onClick={() => onChoose(value === 'ok' ? '' : 'ok')}>Conforme</button>
        <button type="button" className={`choice-chip ${value === 'ko' ? 'is-selected is-anomaly' : ''}`} aria-pressed={value === 'ko'} onClick={() => onChoose(value === 'ko' ? '' : 'ko')}>Anomalie</button>
        <button type="button" className={`choice-chip ${value === 'unknown' ? 'is-selected' : ''}`} aria-pressed={value === 'unknown'} onClick={() => onChoose(value === 'unknown' ? '' : 'unknown')}>Non vérifié</button>
      </div>
      {value === '' ? <small className="field-hint">À contrôler pendant la ronde.</small> : null}
      {value === 'unknown' ? <Field label={`Motif — ${title}`}><input value={reason} onChange={(event) => onReason(event.target.value)} placeholder="Précisez pourquoi le contrôle n’a pas pu être effectué" /></Field> : null}
    </div>
  );
}

export function EauRounds({ agentName, draftNote, onSubmit, asset: assetProp, showTabs = true }: { agentName: string; draftNote: string; onSubmit: () => void; asset?: Asset; showTabs?: boolean }) {
  const stamp = ge01NowStamp();
  const [assetState, setAsset] = useState<Asset>('wilo');
  const asset = assetProp ?? assetState;
  const [wiloStep, setWiloStep] = useState(0);
  const [riaStep, setRiaStep] = useState(0);
  const [wiloDate, setWiloDate] = useState(stamp.date);
  const [wiloTime, setWiloTime] = useState(stamp.time);
  const [riaDate, setRiaDate] = useState(stamp.date);
  const [riaTime, setRiaTime] = useState(stamp.time);
  const [roundType, setRoundType] = useState('');
  const [pressure, setPressure] = useState('');
  const [tankLevel, setTankLevel] = useState('');
  const [observation, setObservation] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [riaConfirmed, setRiaConfirmed] = useState(false);
  const [photoReason, setPhotoReason] = useState('');
  const [checks, setChecks] = useState<Record<string, ControlAnswer>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [riaAnswers, setRiaAnswers] = useState<Record<string, '' | 'ok' | 'alert' | 'unknown'>>({});
  const [riaPressure, setRiaPressure] = useState('');

  const pressureValue = readMeasure(pressure);
  const tankValue = readMeasure(tankLevel);
  const riaPressureValue = readMeasure(riaPressure);
  const pressureState = wiloPressureState(pressure);
  const hasPressureAlert = pressureState === 'alert' || pressureState === 'critical';
  const controlDone = (key: string) => checks[key] === 'ok' || checks[key] === 'ko' || (checks[key] === 'unknown' && Boolean(reasons[key]?.trim()));
  const answeredChecks = pumpKeys.filter((key) => controlDone(key)).length;
  const measuresDone = (Number.isFinite(pressureValue) || Boolean(reasons.pressure?.trim())) && (Number.isFinite(tankValue) && tankValue >= 0 && tankValue <= 100 || Boolean(reasons.tank?.trim()));
  const hasFinding = hasPressureAlert || pumpKeys.some((key) => checks[key] === 'ko');
  const wiloComplete = measuresDone && answeredChecks === pumpKeys.length && (!hasFinding || Boolean(photoReason.trim()));
  const choose = (key: string, value: ControlAnswer) => {
    setChecks((items) => ({ ...items, [key]: value }));
    if (value !== 'unknown') setReasons((items) => ({ ...items, [key]: '' }));
    setConfirmed(false);
  };

  const wiloCode = displayAssetCode('DEMO-EAU');
  const riaCode = displayAssetCode('DEMO-SSI');
  const controls: Array<[string, string, string]> = [
    ['auto', 'Mode automatique actif', 'Commande générale'],
    ['p1', 'Pompe P1 disponible', 'Pompe prioritaire'],
    ['p2', 'Pompe P2 disponible', 'Pompe de secours'],
    ['leak', 'Absence de fuite active', 'Collecteur et raccords'],
    ['valves', 'Vannes en position normale', 'Aspiration et refoulement'],
    ['alarm', 'Aucune alarme active', 'Coffret et supervision'],
  ];

  return (
    <>
      {showTabs && <div className="workspace-tabs parameters-tabs round-asset-tabs" role="tablist" aria-label="Équipement de la ronde">
        <button type="button" role="tab" aria-selected={asset === 'wilo'} className={asset === 'wilo' ? 'active' : ''} onClick={() => setAsset('wilo')}>{wiloCode} · Eau</button>
        <button type="button" role="tab" aria-selected={asset === 'ria'} className={asset === 'ria' ? 'active' : ''} onClick={() => setAsset('ria')}>{riaCode} · Incendie</button>
      </div>}

      {asset === 'wilo' ? (
        <>
          <RoundPilotHeader
            title={`${wiloCode} · Ronde quotidienne du surpresseur`}
            subtitle="Cinq étapes · fréquence quotidienne"
            badge={<RoundModeBadge persistenceEnabled={false} />}
          />
          <SyncStatusNotice state="demo-volatile" label="État de la ronde Surpresseur" />
          <RoundStepRail labels={wiloSteps} step={wiloStep} onStep={setWiloStep} label="Progression de la ronde" />
          <section className="surpresseur-layout">
            <article className="panel surpresseur-form-card">
              <div className="surpresseur-section-head"><div><span>ÉTAPE {wiloStep + 1} SUR 5</span><h3>{wiloSteps[wiloStep]}</h3></div></div>

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
                  <div className="control-choice" role="group" aria-label="Type de ronde">
                    <p><b>Type de ronde</b><small>Aucune réponse n’est présélectionnée.</small></p>
                    <div className="choice-set">
                      {roundTypes.map((item) => <button key={item} type="button" className={`choice-chip ${roundType === item ? 'is-selected' : ''}`} aria-pressed={roundType === item} onClick={() => setRoundType(roundType === item ? '' : item)}>{item}</button>)}
                    </div>
                  </div>
                  <div className="surpresseur-callout"><span>i</span><p><b>Contrôle terrain</b><small>Vérifier les pompes et relever la pression observée. Ne déclarez que les écarts constatés. Aucune réponse n’est présélectionnée.</small></p></div>
                </div>
              )}

              {wiloStep === 1 && (
                <div className="surpresseur-fields">
                  <div className="measure-grid">
                    <label><span>Pression affichée au coffret</span><div><input value={pressure} inputMode="decimal" placeholder="—" aria-label="Pression réseau" onChange={(event) => { setPressure(event.target.value); setConfirmed(false); }} /><b>bar</b></div><small>Plage normale : 4,5 à 5,5 bar, bornes incluses. Critique sous 4 ou au-dessus de 6. Vide ≠ 0.</small><MeasureRange embedded label="Pression affichée au coffret" value={pressure.trim() === '' ? Number.NaN : pressureValue} min={4.5} max={5.5} unit="bar" /></label>
                    <label><span>Niveau bâche</span><div><input value={tankLevel} inputMode="decimal" placeholder="—" aria-label="Niveau bâche" onChange={(event) => { setTankLevel(event.target.value); setConfirmed(false); }} /><b>%</b></div><small>Pourcentage réellement mesuré, de 0 à 100 %. Vide ≠ 0.</small><MeasureRange embedded label="Niveau de bâche" value={tankLevel.trim() === '' ? Number.NaN : tankValue} min={0} max={100} unit="%" /></label>
                  </div>
                  {hasPressureAlert && <div className="measure-alert"><span>!</span><div><b>Écart constaté</b><small>{pressureState === 'critical' ? 'Pression critique (sous 4 ou au-dessus de 6 bar). Un constat critique sera proposé à Facility Manager.' : 'La pression saisie est hors de la plage métier. Un constat sera proposé à Facility Manager.'}</small></div></div>}
                  <label className="field">Stabilité du manomètre<Select defaultValue=""><option value="">Choisir</option><option>Stable</option><option>Oscillation légère</option><option>Oscillation importante</option></Select></label>
                </div>
              )}

              {wiloStep === 2 && (
                <div className="surpresseur-fields">
                  <div className="control-choice-grid">
                    {controls.slice(0, 4).map(([key, title, detail]) => <MockControl key={key} title={title} detail={detail} value={checks[key] ?? ''} reason={reasons[key] ?? ''} onChoose={(value) => choose(key, value)} onReason={(value) => setReasons((items) => ({ ...items, [key]: value }))} />)}
                  </div>
                </div>
              )}

              {wiloStep === 3 && (
                <div className="surpresseur-fields">
                  <div className="control-choice-grid">
                    {controls.slice(4).map(([key, title, detail]) => <MockControl key={key} title={title} detail={detail} value={checks[key] ?? ''} reason={reasons[key] ?? ''} onChoose={(value) => choose(key, value)} onReason={(value) => setReasons((items) => ({ ...items, [key]: value }))} />)}
                  </div>
                  <label className="field">Observation terrain<textarea value={observation} placeholder="Observation factuelle ou précision sur un écart." onChange={(event) => setObservation(event.target.value)} /></label>
                </div>
              )}

              {wiloStep === 4 && (
                <div className="surpresseur-fields">
                  <div className="round-summary">
                    <div><span>MESURES</span><b className={hasPressureAlert ? 'warning' : ''}>{Number.isFinite(pressureValue) ? `${pressureValue.toLocaleString('fr-FR')} bar` : 'Valeur non renseignée'}</b><small>{Number.isFinite(pressureValue) ? 'Pression réseau' : 'À COMPLÉTER'}</small></div>
                    <div><span>NIVEAU</span><b>{Number.isFinite(tankValue) ? `${tankValue.toLocaleString('fr-FR')} %` : 'Valeur non renseignée'}</b><small>{Number.isFinite(tankValue) ? 'Bâche de stockage' : 'À COMPLÉTER'}</small></div>
                    <div><span>CONTRÔLES</span><b>{answeredChecks}/6</b><small>Réponses saisies</small></div>
                  </div>
                  {!wiloComplete ? (
                    <div className="surpresseur-callout"><span>i</span><p><b>Contrôle incomplet</b><small>Renseignez les deux mesures et les six contrôles avant de conclure. Une case vide n’est ni un zéro ni un écart.</small></p></div>
                  ) : hasPressureAlert ? (
                    <div className="proposed-finding"><span>!</span><div><p>CONSTAT PROPOSÉ</p><h4>Pression surpresseur hors plage attendue</h4><small>Priorité proposée : {pressureState === 'critical' ? 'Critique' : 'Haute'} · Transmission à la file de qualification de Facility Manager.</small></div><Badge tone="orange">À QUALIFIER</Badge></div>
                  ) : hasFinding ? (
                    <div className="proposed-finding"><span>!</span><div><p>CONSTAT PROPOSÉ</p><h4>Écart constaté pendant la ronde</h4><small>Transmission à la file de qualification de Facility Manager.</small></div><Badge tone="orange">À QUALIFIER</Badge></div>
                  ) : (
                    <div className="surpresseur-callout"><span>i</span><p><b>Aucun écart déclaré</b><small>Les mesures saisies sont dans la plage. Aucun constat n’est proposé automatiquement.</small></p></div>
                  )}
                  {hasFinding && <Field label="Photo non jointe — motif obligatoire"><textarea maxLength={2000} value={photoReason} onChange={(event) => setPhotoReason(event.target.value)} /></Field>}
                  {hasFinding && !photoReason.trim() && <p role="status">Indiquez le motif d’absence de photo ; vous pourrez joindre une preuve au dossier après synchronisation.</p>}
                  <label className="confirmation-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Je confirme que les valeurs correspondent à la ronde réalisée sur {wiloCode}.</span></label>
                </div>
              )}

              <div className="surpresseur-actions">
                <button className="secondary-button" type="button" disabled={wiloStep === 0} onClick={() => setWiloStep((value) => Math.max(0, value - 1))}>← Précédent</button>
                <p>{draftNote}</p>
                {wiloStep < 4 ? <button className="primary-button" type="button" onClick={() => setWiloStep((value) => Math.min(4, value + 1))}>Continuer →</button> : <button className="primary-button" type="button" disabled={!wiloComplete || !confirmed} onClick={onSubmit}>Valider la maquette</button>}
              </div>
            </article>
            <aside className="surpresseur-aside">
              <article className="panel next-action-card"><p className="design-kicker">À SURVEILLER</p><h3>Aucun réarmement déclaré</h3><p>Aucun réarmement n’a été indiqué pour cette ronde.</p></article>
              <article className="panel score-explain-card is-compact"><div><span>{wiloCode}</span><b>Indisponible</b></div><p className="analytics-note">Aucune valeur de score n’est affichée avant validation de la méthode et de ses données sources.</p></article>
            </aside>
          </section>
        </>
      ) : (
        <>
          <RoundPilotHeader
            title={`${riaCode} · Ronde quotidienne du réseau incendie`}
            subtitle="Deux étapes · local et coffret"
            badge={<RoundModeBadge persistenceEnabled={false} />}
          />
          <p className="ria-round-note">Cadence à confirmer · heure d’Abidjan. Les réglages des pressostats et les essais spécialisés relèvent de SECURISYS. Valeur de pression de référence à confirmer par SECURISYS.</p>
          <SyncStatusNotice state="demo-volatile" label="État de la ronde incendie" />
          <RoundStepRail labels={riaSteps} step={riaStep} onStep={setRiaStep} label="Progression de la ronde" />
          <section className="surpresseur-layout">
            <article className="panel surpresseur-form-card">
              <div className="surpresseur-section-head"><div><span>ÉTAPE {riaStep + 1} SUR 2</span><h3>{riaSteps[riaStep]}</h3></div></div>
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
                      <small>Valeur de pression de référence à confirmer par SECURISYS. Une case vide n’est pas un zéro.</small>
                    </label>
                  </div>
                  <MeasureRange label="Pression manomètre" value={riaPressureValue} min={4.5} max={5.5} unit="bar" />
                  <label className="confirmation-line"><input type="checkbox" checked={riaConfirmed} onChange={(event) => setRiaConfirmed(event.target.checked)} /><span>Je confirme que ces observations correspondent au contrôle réalisé.</span></label>
                </div>
              )}
              <div className="surpresseur-actions">
                <button className="secondary-button" type="button" disabled={riaStep === 0} onClick={() => setRiaStep((value) => Math.max(0, value - 1))}>← Précédent</button>
                <p>{draftNote}</p>
                {riaStep < 1 ? <button className="primary-button" type="button" onClick={() => setRiaStep(1)}>Continuer →</button> : <button className="primary-button" type="button" disabled={!riaConfirmed} onClick={onSubmit}>Valider la maquette</button>}
              </div>
            </article>
            <aside className="surpresseur-aside">
              <article className="panel score-explain-card is-compact"><div><span>SCORE RIA</span><b>Indisponible</b></div><p className="analytics-note">RIA-01 n’est pas tranché. Aucun score n’est inventé pour cette ronde.</p></article>
            </aside>
          </section>
        </>
      )}
    </>
  );
}
