import type { Json } from "../supabase/database.types";

export type QueueStatus = "pending" | "syncing" | "synced" | "failed" | "conflict";

export type FieldCheckInput = {
  code: string;
  label: string;
  status: "ok" | "alert" | "critical" | "not_applicable" | "not_checked";
  valueNumeric?: number;
  valueText?: string;
  valueBoolean?: boolean;
  unit?: string;
  notes?: string;
};

export type FieldRoundPayload = {
  equipmentCode: string;
  reportType: "technical_round" | "cleaning_gardening_round" | "wilo_round";
  performedAt: string;
  summary: string;
  checks: FieldCheckInput[];
  anomaly?: {
    title: string;
    description: string;
    priority: "Critique" | "Haute" | "Moyenne" | "Faible" | "Normale";
  };
};

export type AnomalyProofPayload = {
  anomalyReference: string;
  anomalyId: string;
  file: File;
  capturedAt: string;
  proofType: "photo" | "report" | "pv";
};

type QueueItemBase = {
  id: string;
  ownerUserId: string;
  status: QueueStatus;
  attempts: number;
  createdAt: string;
  updatedAt: string;
  nextAttemptAt?: string;
  lastError?: string;
  syncedAt?: string;
  serverResult?: Json;
};

export type FieldRoundQueueItem = QueueItemBase & {
  kind: "field-round";
  payload: FieldRoundPayload;
};

export type AnomalyProofQueueItem = QueueItemBase & {
  kind: "anomaly-proof";
  payload: AnomalyProofPayload;
};

export type OfflineQueueItem = FieldRoundQueueItem | AnomalyProofQueueItem;

export type QueueCounts = Record<QueueStatus, number> & { actionable: number };

export type SyncedFieldRoundReceipt = {
  queueId: string;
  equipmentCode: string;
  reportReference: string;
  anomalyReference?: string;
  syncedAt?: string;
};

export type OfflineDraft<T = unknown> = {
  key: string;
  ownerUserId: string;
  value: T;
  updatedAt: string;
};

export const emptyQueueCounts: QueueCounts = {
  pending: 0,
  syncing: 0,
  synced: 0,
  failed: 0,
  conflict: 0,
  actionable: 0,
};
