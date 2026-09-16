export const GE01_LAST_CONTEXT_CACHE_KEY = 'behira:ge01:last-confirmed';
export const ENGINE_HOURS_UNUSUAL_DELTA = 48;

export type Ge01ControlMarker = 'ok' | 'anomalie';

export type Ge01LastContext = {
  engineHours: number | null;
  performedOn: string | null;
  controlStatus: Ge01ControlMarker | null;
  location: string | null;
  building: string | null;
  fuelLevel: number | null;
  oilLevel: number | null;
  waterTemperature: number | null;
  batteryVoltage: number | null;
  lastStartOutcome: 'success' | 'failed' | 'not_performed' | null;
  dmcNextDate: string | null;
};

export type EngineHoursDeltaKind = '' | 'ok' | 'below' | 'unusual';

export type EngineHoursDelta = {
  kind: EngineHoursDeltaKind;
  delta: number | null;
  message: string;
};

export const EMPTY_LAST_CONTEXT: Ge01LastContext = {
  engineHours: null,
  performedOn: null,
  controlStatus: null,
  location: null,
  building: null,
  fuelLevel: null,
  oilLevel: null,
  waterTemperature: null,
  batteryVoltage: null,
  lastStartOutcome: null,
  dmcNextDate: null,
};

/** Dernier rapport confirmé du cache de démo, disponible hors ligne. */
export const DEMO_LAST_CONFIRMED: Ge01LastContext = {
  engineHours: 1245,
  performedOn: '2026-09-15',
  controlStatus: 'ok',
  location: 'Local TGBT',
  building: 'Bât. A',
  fuelLevel: 72,
  oilLevel: 95,
  waterTemperature: 88,
  batteryVoltage: 26.2,
  lastStartOutcome: 'success',
  dmcNextDate: '2026-10-01',
};

let memoryCache: Ge01LastContext | undefined;

export function resetLastConfirmedGe01Cache() {
  memoryCache = undefined;
}

export function displayOrDash(value: string | number | null | undefined) {
  if (value == null || value === '') return '—';
  return String(value);
}

export function formatEngineHours(value: number) {
  const grouped = new Intl.NumberFormat('fr-FR').format(value).replace(/[\u00a0\u202f]/g, ' ');
  return `${grouped} h`;
}

export function formatShortDate(isoDate: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  if (!match) return '—';
  return `${match[3]}/${match[2]}`;
}

export function formatYesterdayValue(value: number | null | undefined, unit: string) {
  if (value == null || !Number.isFinite(value)) return 'Hier : —';
  const grouped = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(value).replace(/[\u00a0\u202f]/g, ' ');
  return `Hier : ${grouped} ${unit}`.trim();
}

export function formatMeasureDelta(current: number | null, last: number | null, unit: string) {
  if (current == null || last == null) return '';
  const delta = Math.round((current - last) * 10) / 10;
  const sign = delta > 0 ? '+' : '';
  const grouped = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1 }).format(delta).replace(/[\u00a0\u202f]/g, ' ');
  return `${sign}${grouped} ${unit} vs hier`;
}

export function lastStartLabel(outcome: Ge01LastContext['lastStartOutcome']) {
  if (outcome === 'success') return 'Effectué';
  if (outcome === 'failed') return 'Échoué';
  if (outcome === 'not_performed') return 'Impossible';
  return '—';
}

export function normalizeLastContext(value: Partial<Ge01LastContext> | null | undefined): Ge01LastContext {
  if (!value) return { ...EMPTY_LAST_CONTEXT };
  const hours = typeof value.engineHours === 'number' && Number.isFinite(value.engineHours) ? value.engineHours : null;
  const controlStatus = value.controlStatus === 'ok' || value.controlStatus === 'anomalie' ? value.controlStatus : null;
  const lastStartOutcome = value.lastStartOutcome === 'success' || value.lastStartOutcome === 'failed' || value.lastStartOutcome === 'not_performed'
    ? value.lastStartOutcome
    : null;
  const numberOrNull = (item: unknown) => typeof item === 'number' && Number.isFinite(item) ? item : null;
  return {
    engineHours: hours,
    performedOn: value.performedOn || null,
    controlStatus,
    location: value.location || null,
    building: value.building || null,
    fuelLevel: numberOrNull(value.fuelLevel),
    oilLevel: numberOrNull(value.oilLevel),
    waterTemperature: numberOrNull(value.waterTemperature),
    batteryVoltage: numberOrNull(value.batteryVoltage),
    lastStartOutcome,
    dmcNextDate: value.dmcNextDate || null,
  };
}

export function evaluateEngineHoursDelta(current: number | null, last: number | null): EngineHoursDelta {
  if (last == null) {
    return { kind: '', delta: null, message: 'Aucun relevé précédent.' };
  }
  const lastLabel = formatEngineHours(last);
  if (current == null) {
    return { kind: '', delta: null, message: `Dernier relevé : ${lastLabel}` };
  }
  const delta = Math.round(current - last);
  if (delta < 0) {
    return {
      kind: 'below',
      delta,
      message: `Inférieur au dernier relevé (${delta} h). Vérifiez la saisie.`,
    };
  }
  if (delta > ENGINE_HOURS_UNUSUAL_DELTA) {
    return {
      kind: 'unusual',
      delta,
      message: `+${delta} h depuis le dernier relevé, écart inhabituel.`,
    };
  }
  return {
    kind: 'ok',
    delta,
    message: `+${delta} h depuis le dernier relevé`,
  };
}

export function deltaNoteForDraft(evaluation: EngineHoursDelta) {
  return evaluation.kind === 'below' || evaluation.kind === 'unusual' ? evaluation.message : '';
}

export function readLastConfirmedGe01(storage?: Pick<Storage, 'getItem' | 'setItem'> | null): Ge01LastContext {
  if (memoryCache) return memoryCache;
  try {
    const raw = storage?.getItem(GE01_LAST_CONTEXT_CACHE_KEY);
    if (raw) {
      memoryCache = normalizeLastContext(JSON.parse(raw) as Partial<Ge01LastContext>);
      return memoryCache;
    }
  } catch {
    /* cache illisible : repli démo */
  }
  memoryCache = DEMO_LAST_CONFIRMED;
  try {
    storage?.setItem(GE01_LAST_CONTEXT_CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    /* hors ligne / quota : le cache mémoire suffit */
  }
  return memoryCache;
}

export function writeLastConfirmedGe01(
  context: Ge01LastContext,
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null,
) {
  memoryCache = normalizeLastContext(context);
  try {
    storage?.setItem(GE01_LAST_CONTEXT_CACHE_KEY, JSON.stringify(memoryCache));
  } catch {
    /* le cache mémoire reste disponible pour la session */
  }
  return memoryCache;
}
