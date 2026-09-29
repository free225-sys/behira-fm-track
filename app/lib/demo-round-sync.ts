'use client';
import { useMemo } from 'react';
import type { useOfflineSync } from './offline/useOfflineSync';
import type { OfflineDraft } from './offline/types';

// DEC-000: ephemeral memory; no durable queue and no remote client.
export function useDemoRoundSync(): ReturnType<typeof useOfflineSync> {
  return useMemo(() => {
    const drafts = new Map<string, OfflineDraft<unknown>>();
    return {
      online: false, running: false, lastRun: null, latestRoundReceipt: null,
      latestIssue: null, ge01Drafts: [], ge01Pending: [],
      counts: { pending: 0, syncing: 0, synced: 0, failed: 0, conflict: 0, actionable: 0 },
      synchronize: async () => null,
      retryFailed: async () => 0,
      enqueueRound: async (_payload, id) => id,
      enqueueProof: async () => 'demo-proof',
      saveDraft: async <T,>(id: string, value: T) => {
        const draft = { key: id, ownerUserId: 'demo', value, updatedAt: new Date().toISOString() };
        drafts.set(id, draft);
        return draft;
      },
      loadDraft: async <T,>(id: string) => drafts.get(id) as OfflineDraft<T> | undefined,
      deleteDraft: async (id: string) => { drafts.delete(id); },
    };
  }, []);
}
