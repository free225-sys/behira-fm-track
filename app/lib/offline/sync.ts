import type { SupabaseClient } from "@supabase/supabase-js";

import { submitQueuedFieldRound, uploadQueuedAnomalyProof } from "../supabase/mutations";
import type { Database, Json } from "../supabase/database.types";
import { listQueueItems, patchQueueItem, recoverStaleQueueItems } from "./store";
import type { OfflineQueueItem } from "./types";

type SyncErrorShape = {
  code?: string;
  message?: string;
  status?: number;
  statusCode?: number | string;
};

export type SyncRunResult = {
  synced: number;
  failed: number;
  conflicts: number;
  deferred: number;
};

function errorShape(error: unknown): SyncErrorShape {
  if (!error || typeof error !== "object") return { message: String(error) };
  return error as SyncErrorShape;
}

function errorMessage(error: unknown) {
  const message = errorShape(error).message?.trim() || "Synchronisation impossible.";
  return message.slice(0, 320);
}

function isConflict(error: unknown) {
  const { code, message } = errorShape(error);
  return code === "23505" || Boolean(message?.toLowerCase().includes("mutation id"));
}

function isTransient(error: unknown) {
  const { code, message, status, statusCode } = errorShape(error);
  const numericStatus = Number(status ?? statusCode);
  if (Number.isFinite(numericStatus) && (numericStatus === 408 || numericStatus === 409 || numericStatus === 429 || numericStatus >= 500)) return true;
  if (code && ["PGRST000", "PGRST001", "PGRST002", "PGRST003"].includes(code)) return true;
  return error instanceof TypeError || /fetch|network|timeout|connexion|hors ligne/i.test(message ?? "");
}

function retryDelay(attempts: number) {
  return Math.min(5 * 60_000, 2_000 * 2 ** Math.max(0, attempts - 1));
}

async function syncItem(client: SupabaseClient<Database>, item: OfflineQueueItem): Promise<Json> {
  if (item.kind === "field-round") return submitQueuedFieldRound(client, item.id, item.payload);
  return uploadQueuedAnomalyProof(client, item.id, item.payload);
}

export async function runOfflineSync(
  client: SupabaseClient<Database>,
  ownerUserId: string,
  onSynced?: (item: OfflineQueueItem, result: Json) => void | Promise<void>,
): Promise<SyncRunResult> {
  const result: SyncRunResult = { synced: 0, failed: 0, conflicts: 0, deferred: 0 };
  if (typeof navigator !== "undefined" && !navigator.onLine) return { ...result, deferred: 1 };

  const { data, error } = await client.auth.getUser();
  if (error || !data.user || data.user.id !== ownerUserId) {
    throw new Error("La session active ne correspond pas à la file locale.");
  }

  await recoverStaleQueueItems(ownerUserId);
  const now = Date.now();
  const items = (await listQueueItems(ownerUserId)).filter((item) =>
    item.status === "pending" && (!item.nextAttemptAt || Date.parse(item.nextAttemptAt) <= now),
  );

  for (const item of items) {
    const attempts = item.attempts + 1;
    await patchQueueItem(item.id, { status: "syncing", attempts, lastError: undefined, nextAttemptAt: undefined });
    try {
      const serverResult = await syncItem(client, item);
      const syncedAt = new Date().toISOString();
      await patchQueueItem(item.id, { status: "synced", syncedAt, serverResult, lastError: undefined });
      result.synced += 1;
      await onSynced?.(item, serverResult);
    } catch (syncError) {
      const lastError = errorMessage(syncError);
      if (isConflict(syncError)) {
        await patchQueueItem(item.id, { status: "conflict", lastError });
        result.conflicts += 1;
      } else if (isTransient(syncError) && attempts < 5) {
        await patchQueueItem(item.id, {
          status: "pending",
          lastError,
          nextAttemptAt: new Date(Date.now() + retryDelay(attempts)).toISOString(),
        });
        result.deferred += 1;
      } else {
        await patchQueueItem(item.id, { status: "failed", lastError });
        result.failed += 1;
      }
    }
  }

  return result;
}
