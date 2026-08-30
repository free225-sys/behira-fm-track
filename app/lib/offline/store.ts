import type { OfflineDraft, OfflineQueueItem, QueueCounts } from "./types";
import { emptyQueueCounts } from "./types";

const DATABASE_NAME = "behira-field-offline-v1";
const DATABASE_VERSION = 1;
const QUEUE_STORE = "sync-queue";
const DRAFT_STORE = "drafts";
export const OFFLINE_QUEUE_EVENT = "behira:offline-queue-changed";

let databasePromise: Promise<IDBDatabase> | undefined;

function openDatabase() {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("Le stockage hors ligne n’est pas disponible sur cet appareil."));
  }
  if (databasePromise) return databasePromise;

  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(QUEUE_STORE)) {
        const queue = database.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        queue.createIndex("ownerUserId", "ownerUserId", { unique: false });
      }
      if (!database.objectStoreNames.contains(DRAFT_STORE)) {
        const drafts = database.createObjectStore(DRAFT_STORE, { keyPath: "key" });
        drafts.createIndex("ownerUserId", "ownerUserId", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Impossible d’ouvrir le stockage hors ligne."));
    request.onblocked = () => reject(new Error("Le stockage hors ligne est utilisé par une autre version de l’application."));
  });
  return databasePromise;
}

async function requestResult<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Échec du stockage local."));
  });
}

async function runTransaction<T>(
  storeName: typeof QUEUE_STORE | typeof DRAFT_STORE,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
) {
  const database = await openDatabase();
  const transaction = database.transaction(storeName, mode);
  const completion = new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Transaction locale interrompue."));
    transaction.onabort = () => reject(transaction.error ?? new Error("Transaction locale annulée."));
  });
  const result = await requestResult(operation(transaction.objectStore(storeName)));
  await completion;
  return result;
}

function notifyQueueChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OFFLINE_QUEUE_EVENT));
}

export async function putQueueItem(item: OfflineQueueItem) {
  await runTransaction(QUEUE_STORE, "readwrite", (store) => store.put(item));
  notifyQueueChanged();
  return item;
}

export async function getQueueItem(id: string) {
  return runTransaction(QUEUE_STORE, "readonly", (store) => store.get(id)) as Promise<OfflineQueueItem | undefined>;
}

export async function listQueueItems(ownerUserId: string) {
  const items = await runTransaction(QUEUE_STORE, "readonly", (store) => store.index("ownerUserId").getAll(ownerUserId)) as OfflineQueueItem[];
  return items.sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function patchQueueItem(id: string, patch: Partial<OfflineQueueItem>) {
  const current = await getQueueItem(id);
  if (!current) return undefined;
  const next = { ...current, ...patch, updatedAt: new Date().toISOString() } as OfflineQueueItem;
  return putQueueItem(next);
}

export async function retryFailedQueueItems(ownerUserId: string) {
  const items = await listQueueItems(ownerUserId);
  const failed = items.filter((item) => item.status === "failed");
  for (const item of failed) {
    await putQueueItem({ ...item, status: "pending", attempts: 0, nextAttemptAt: undefined, lastError: undefined, updatedAt: new Date().toISOString() });
  }
  return failed.length;
}

export async function recoverStaleQueueItems(ownerUserId: string) {
  const items = await listQueueItems(ownerUserId);
  const staleBefore = Date.now() - 60_000;
  const stale = items.filter((item) => item.status === "syncing" && Date.parse(item.updatedAt) < staleBefore);
  for (const item of stale) {
    await putQueueItem({ ...item, status: "pending", lastError: "Synchronisation interrompue ; reprise automatique.", updatedAt: new Date().toISOString() });
  }
  return stale.length;
}

export async function pruneSyncedQueueItems(ownerUserId: string) {
  const items = await listQueueItems(ownerUserId);
  const expiredBefore = Date.now() - 24 * 60 * 60 * 1000;
  const expired = items.filter((item) => item.status === "synced" && item.syncedAt && Date.parse(item.syncedAt) < expiredBefore);
  for (const item of expired) {
    await runTransaction(QUEUE_STORE, "readwrite", (store) => store.delete(item.id));
  }
  if (expired.length) notifyQueueChanged();
  return expired.length;
}

export async function getQueueCounts(ownerUserId: string): Promise<QueueCounts> {
  const counts = { ...emptyQueueCounts };
  for (const item of await listQueueItems(ownerUserId)) counts[item.status] += 1;
  counts.actionable = counts.pending + counts.syncing + counts.failed + counts.conflict;
  return counts;
}

export async function saveDraft<T>(ownerUserId: string, draftId: string, value: T) {
  const draft: OfflineDraft<T> = {
    key: `${ownerUserId}:${draftId}`,
    ownerUserId,
    value,
    updatedAt: new Date().toISOString(),
  };
  await runTransaction(DRAFT_STORE, "readwrite", (store) => store.put(draft));
  return draft;
}

export async function loadDraft<T>(ownerUserId: string, draftId: string) {
  return runTransaction(DRAFT_STORE, "readonly", (store) => store.get(`${ownerUserId}:${draftId}`)) as Promise<OfflineDraft<T> | undefined>;
}

export async function deleteDraft(ownerUserId: string, draftId: string) {
  await runTransaction(DRAFT_STORE, "readwrite", (store) => store.delete(`${ownerUserId}:${draftId}`));
}
