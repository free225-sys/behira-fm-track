"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getBrowserSupabaseClient } from "../supabase/client";
import { runOfflineSync, type SyncRunResult } from "./sync";
import {
  deleteDraft,
  getQueueCounts,
  listQueueItems,
  loadDraft,
  OFFLINE_QUEUE_EVENT,
  pruneSyncedQueueItems,
  putQueueItem,
  retryFailedQueueItems,
  saveDraft,
} from "./store";
import type { AnomalyProofPayload, FieldRoundPayload, OfflineQueueItem, QueueCounts, SyncedFieldRoundReceipt } from "./types";
import { emptyQueueCounts } from "./types";
import type { Ge01Draft } from '../ge01/report';

type OfflineSyncOptions = {
  enabled: boolean;
  userId?: string;
  onSynced?: (item: OfflineQueueItem) => void | Promise<void>;
};

function fieldRoundReceipt(item: OfflineQueueItem): SyncedFieldRoundReceipt | null {
  if (item.kind !== "field-round" || item.status !== "synced" || !item.serverResult || Array.isArray(item.serverResult) || typeof item.serverResult !== "object") return null;
  const reportReference = typeof item.serverResult.report_reference === "string" ? item.serverResult.report_reference : "";
  if (!reportReference) return null;
  return {
    isTest: item.serverResult.is_test === true,
    queueId: item.id,
    equipmentCode: item.payload.equipmentCode,
    reportReference,
    anomalyReference: typeof item.serverResult.anomaly_reference === "string" ? item.serverResult.anomaly_reference : undefined,
    syncedAt: item.syncedAt,
  };
}

export function useOfflineSync({ enabled, userId, onSynced }: OfflineSyncOptions) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [counts, setCounts] = useState<QueueCounts>(emptyQueueCounts);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<SyncRunResult | null>(null);
  const [latestRoundReceipt, setLatestRoundReceipt] = useState<SyncedFieldRoundReceipt | null>(null);
  const [ge01Drafts, setGe01Drafts] = useState<{date: string; isTest: boolean}[]>([]);
  const [ge01Pending, setGe01Pending] = useState<{id: string; isTest: boolean; sentAt: string; date: string}[]>([]);
  const [latestIssue, setLatestIssue] = useState<{ status:"failed"|"conflict"; message:string } | null>(null);
  const runningRef = useRef(false);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => { onSyncedRef.current = onSynced; }, [onSynced]);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setCounts(emptyQueueCounts);
      setLatestIssue(null);
      setLatestRoundReceipt(null);
      setGe01Drafts([]); setGe01Pending([]);
      return;
    }
    const [nextCounts, items, realDraft, testDraft] = await Promise.all([getQueueCounts(userId), listQueueItems(userId),
      loadDraft<Ge01Draft>(userId, 'ge01:daily:v1'), loadDraft<Ge01Draft>(userId, 'ge01:daily:recette:v1')]);
    setGe01Drafts([realDraft, testDraft].flatMap(item => item ? [{date:item.value.date,isTest:item.value.isTest===true}] : []));
    setGe01Pending(items.flatMap(item => item.kind==='field-round' && item.payload.equipmentCode==='GE-01' && item.status!=='synced'
      ? [{id:item.id,isTest:item.payload.isTest===true,sentAt:item.createdAt,date:item.payload.performedAt.slice(0,10)}] : []));
    setCounts(nextCounts);
    const issue = [...items].reverse().find((item) => (item.status === "failed" || item.status === "conflict") && item.lastError);
    setLatestIssue(issue ? { status:issue.status as "failed"|"conflict", message:issue.lastError ?? "Synchronisation à vérifier." } : null);
    setLatestRoundReceipt([...items].reverse().map(fieldRoundReceipt).find((receipt): receipt is SyncedFieldRoundReceipt => Boolean(receipt)) ?? null);
  }, [enabled, userId]);

  const synchronize = useCallback(async () => {
    if (!enabled || !userId || runningRef.current || (typeof navigator !== "undefined" && !navigator.onLine)) return null;
    runningRef.current = true;
    setRunning(true);
    try {
      const result = await runOfflineSync(getBrowserSupabaseClient(), userId, async (item) => {
        await onSyncedRef.current?.(item);
      }, getBrowserSupabaseClient);
      setLastRun(result);
      await pruneSyncedQueueItems(userId);
      await refresh();
      return result;
    } catch (error) {
      // Automatic timers and online events do not have a caller awaiting errors.
      // Surface the failure while preserving the owner's queued data.
      setLatestIssue({ status: "failed", message: error instanceof Error ? error.message : "Synchronisation indisponible ; la copie locale est conservée." });
      return null;
    } finally {
      runningRef.current = false;
      setRunning(false);
    }
  }, [enabled, refresh, userId]);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); void synchronize(); };
    const handleOffline = () => setOnline(false);
    const handleQueue = () => void refresh();
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener(OFFLINE_QUEUE_EVENT, handleQueue);
    const bootstrap = window.setTimeout(() => {
      void refresh().then(() => synchronize()).catch(() => undefined);
    }, 0);
    const timer = window.setInterval(() => { if (navigator.onLine) void synchronize(); }, 30_000);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(OFFLINE_QUEUE_EVENT, handleQueue);
      window.clearInterval(timer);
      window.clearTimeout(bootstrap);
    };
  }, [refresh, synchronize]);

  const enqueue = useCallback(async (item: OfflineQueueItem) => {
    if (!enabled || !userId || item.ownerUserId !== userId) throw new Error("File hors ligne indisponible pour cette session.");
    await putQueueItem(item);
    await refresh();
    if (navigator.onLine) void synchronize();
    return item.id;
  }, [enabled, refresh, synchronize, userId]);

  const enqueueRound = useCallback(async (payload: FieldRoundPayload, clientMutationId: string) => {
    if (!userId) throw new Error("Session authentifiée requise.");
    const now = new Date().toISOString();
    return enqueue({ id: clientMutationId, ownerUserId: userId, kind: "field-round", payload, status: "pending", attempts: 0, createdAt: now, updatedAt: now });
  }, [enqueue, userId]);

  const enqueueProof = useCallback(async (payload: AnomalyProofPayload) => {
    if (!userId) throw new Error("Session authentifiée requise.");
    const now = new Date().toISOString();
    return enqueue({ id: crypto.randomUUID(), ownerUserId: userId, kind: "anomaly-proof", payload, status: "pending", attempts: 0, createdAt: now, updatedAt: now });
  }, [enqueue, userId]);

  const retryFailed = useCallback(async () => {
    if (!userId) return 0;
    const count = await retryFailedQueueItems(userId);
    await refresh();
    if (navigator.onLine) void synchronize();
    return count;
  }, [refresh, synchronize, userId]);

  const saveOfflineDraft = useCallback(<T,>(draftId: string, value: T) => {
    if (!userId) return Promise.reject(new Error("Session authentifiée requise."));
    return saveDraft(userId, draftId, value);
  }, [userId]);

  const loadOfflineDraft = useCallback(<T,>(draftId: string) => {
    if (!userId) return Promise.resolve(undefined);
    return loadDraft<T>(userId, draftId);
  }, [userId]);

  const deleteOfflineDraft = useCallback((draftId: string) => {
    if (!userId) return Promise.resolve();
    return deleteDraft(userId, draftId);
  }, [userId]);

  return {
    online,
    counts,
    running,
    lastRun,
    latestRoundReceipt,
    ge01Drafts,
    ge01Pending,
    latestIssue,
    synchronize,
    enqueueRound,
    enqueueProof,
    retryFailed,
    saveDraft: saveOfflineDraft,
    loadDraft: loadOfflineDraft,
    deleteDraft: deleteOfflineDraft,
  };
}
