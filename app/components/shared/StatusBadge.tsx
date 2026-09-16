'use client';

import type { EquipmentCard, EquipmentOperationalStatus } from '../../lib/ui-contract/building-health.ts';
import {
  controlValidityLabel,
  palierBadgeTone,
  palierFromScore,
  palierRangeLabel,
  statusBadgeTone,
  statusLabel,
} from '../../lib/ui-contract/display.ts';
import { Badge } from '../ui';

export function MetierStatusBadge({ status }: { status: EquipmentOperationalStatus | null }) {
  if (!status) return <Badge tone="neutral">Statut inconnu</Badge>;
  return <Badge tone={statusBadgeTone(status)}>{statusLabel(status)}</Badge>;
}

export function ControlValidityBadge({ value }: { value: EquipmentCard['controlValidity'] }) {
  const label = controlValidityLabel(value);
  if (!label) return null;
  return <Badge tone="orange">{label}</Badge>;
}

export function PalierBadge({ value }: { value: number | null }) {
  if (value == null) return <Badge tone="neutral">Score non fourni</Badge>;
  const palier = palierFromScore(value);
  return <Badge tone={palierBadgeTone(palier)}>{palierRangeLabel(palier)}</Badge>;
}

export function DelayBadge({ delayed, date }: { delayed: boolean; date?: string | null }) {
  if (!delayed) return null;
  return <Badge tone="critical">En retard{date ? ` · ${date}` : ''}</Badge>;
}
