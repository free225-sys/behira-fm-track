export type FieldCheckInput = {
  code: string;
  label: string;
  status: 'ok' | 'alert' | 'critical' | 'not_applicable' | 'not_checked';
  valueNumeric?: number;
  valueText?: string;
  valueBoolean?: boolean;
  unit?: string;
  notes?: string;
};

export type FieldRoundPayload = {
  equipmentCode: string;
  reportType: 'technical_round' | 'cleaning_gardening_round' | 'wilo_round';
  performedAt: string;
  summary: string;
  checks: FieldCheckInput[];
};

export type QueueCounts = {
  pending: number;
  syncing: number;
  synced: number;
  failed: number;
  conflict: number;
  actionable: number;
};

export type SyncedFieldRoundReceipt = {
  queueId: string;
  equipmentCode: string;
  reportReference: string;
  anomalyReference?: string;
  syncedAt?: string;
};

export const emptyQueueCounts: QueueCounts = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflict: 0,
  actionable: 0,
};
