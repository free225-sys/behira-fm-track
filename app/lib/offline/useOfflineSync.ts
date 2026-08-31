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
import type { AnomalyProofPayload, FieldRoundPayload, OfflineQueueItem, QueueCounts } from "./types";
import { emptyQueueCounts } from "./types";

type OfflineSyncOptions = {
  enabled: boolean;
  userId?: string;
  onSynced?: (item: OfflineQueueItem) => void | Promise<void>;
};

export function useOfflineSync({ enabled, userId, onSynced }: OfflineSyncOptions) {
  const [online, setOnline] = useState(() => typeof navigator === "undefined" ? true : navigator.onLine);
  const [counts, setCounts] = useState<QueueCounts>(emptyQueueCounts);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState<SyncRunResult | null>(null);
  const [latestIssue, setLatestIssue] = useState<{ status:"failed"|"conflict"; message:string } | null>(null);
  const runningRef = useRef(false);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => { onSyncedRef.current = onSynced; }, [onSynced]);

  const refresh = useCallback(async () => {
    if (!enabled || !userId) {
      setCounts(emptyQueueCounts);
      setLatestIssue(null);
      return;
    }
    const [nextCounts, items] = await Promise.all([getQueueCounts(userId), listQueueItems(userId)]);
    setCounts(nextCounts);
    const issue = [...items].reverse().find((item) => (item.status === "failed" || item.status === "conflict") && item.lastError);
    setLatestIssue(issue ? { status:issue.status as "failed"|"conflict", message:issue.lastError ?? "Synchronisation à vérifier." } : null);
  }, [enabled, userId]);

  const synchronize = useCallback(async () => {
    if (!enabled || !userId || runningRef.current || (typeof navigator !== "undefined" && !navigator.onLine)) return null;
    runningRef.current = true;
    setRunning(true);
    try {
      const result = await runOfflineSync(getBrowserSupabaseClient(), userId, async (item) => {
        await onSyncedRef.current?.(item);
      });
      setLastRun(result);
      await pruneSyncedQueueItems(userId);
      await refresh();
      return result;
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
