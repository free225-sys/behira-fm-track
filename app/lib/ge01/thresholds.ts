export type MeasureStatus = 'ok' | 'alert' | 'critical';
export type TestKind = 'run' | 'start';

export function sanitizeNumeric(raw: string): string {
  let result = '';
  let seenSeparator = false;
  for (const char of raw.normalize('NFKC')) {
    if (char >= '0' && char <= '9') {
      result += char;
      continue;
    }
    if ((char === '.' || char === ',' || char === '٫') && !seenSeparator) {
      result += '.';
      seenSeparator = true;
    }
  }
  return result;
}

export function sanitizeInteger(raw: string): string {
  return sanitizeNumeric(raw).split('.')[0];
}

export function parseMeasure(raw: string): number | null {
  if (!raw || raw === '.') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function evaluateFuel(value: number): MeasureStatus {
  return value >= 64 ? 'ok' : 'critical';
}

export function evaluateOil(value: number): MeasureStatus {
  if (value >= 90 && value <= 100) return 'ok';
  return 'critical';
}

export function evaluateWater(value: number): MeasureStatus {
  if (value < 95) return 'ok';
  if (value <= 100) return 'alert';
  return 'critical';
}

export function evaluateBattery(value: number): MeasureStatus {
  if (value > 25) return 'ok';
  if (value >= 23) return 'alert';
  return 'critical';
}

export function evaluateDuration(value: number, kind: TestKind | ''): MeasureStatus | null {
  if (!kind) return null;
  if (kind === 'run') {
    if (value >= 10 && value <= 20) return 'ok';
    if ((value >= 7 && value < 10) || (value > 20 && value <= 25)) return 'alert';
    return 'critical';
  }
  if (value >= 4 && value <= 7) return 'ok';
  if ((value >= 3 && value < 4) || (value > 7 && value <= 10)) return 'alert';
  return 'critical';
}

export function statusFromValue(
  raw: string,
  evaluate: (value: number) => MeasureStatus | null,
): MeasureStatus | null {
  const value = parseMeasure(raw);
  if (value === null) return null;
  return evaluate(value);
}

export const MEASURE_HINTS = {
  fuel: [
    { status: 'ok' as const, text: 'OK : ≥ 64 %' },
    { status: 'critical' as const, text: 'Critique : < 64 %' },
  ],
  oil: [
    { status: 'ok' as const, text: 'OK : 90–100 %' },
    { status: 'critical' as const, text: 'Critique : < 90 %' },
  ],
  water: [
    { status: 'ok' as const, text: 'OK : < 95 °C' },
    { status: 'alert' as const, text: 'Alerte : 95–100 °C' },
    { status: 'critical' as const, text: 'Critique : > 100 °C' },
  ],
  battery: [
    { status: 'ok' as const, text: 'OK : > 25 V' },
    { status: 'alert' as const, text: 'Alerte : 23–25 V' },
    { status: 'critical' as const, text: 'Critique : < 23 V' },
  ],
  durationStart: [
    { status: 'ok' as const, text: 'OK : 4–7 min' },
    { status: 'alert' as const, text: 'Alerte : 3–<4 ou 7–10 min' },
    { status: 'critical' as const, text: 'Critique : < 3 ou > 10 min' },
  ],
};
