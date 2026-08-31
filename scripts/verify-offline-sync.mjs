import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const page = read("app/page.tsx");
const migration = read("supabase/migrations/20260829234552_offline_field_sync_idempotency.sql");
const store = read("app/lib/offline/store.ts");
const sync = read("app/lib/offline/sync.ts");
const hook = read("app/lib/offline/useOfflineSync.ts");
const mutations = read("app/lib/supabase/mutations.ts");
const status = read("app/components/OfflineSyncStatus.tsx");

const checks = [
  ["file IndexedDB versionnée", store.includes('DATABASE_NAME = "behira-field-offline-v1"') && store.includes('createObjectStore(QUEUE_STORE')],
  ["données isolées par utilisateur", store.includes('createIndex("ownerUserId"') && sync.includes('data.user.id !== ownerUserId')],
  ["états pending/syncing/synced/failed/conflict", ["pending", "syncing", "synced", "failed", "conflict"].every((value) => status.includes(value) || read("app/lib/offline/types.ts").includes(value))],
  ["reprise des synchronisations interrompues", store.includes("recoverStaleQueueItems") && sync.includes("recoverStaleQueueItems")],
  ["relance progressive bornée", sync.includes("retryDelay") && sync.includes("attempts < 5")],
  ["conflit sans écrasement", sync.includes('status: "conflict"') && status.includes("Aucun écrasement automatique")],
  ["synchronisation automatique au retour réseau", hook.includes('window.addEventListener("online"')],
  ["brouillons de ronde persistants", page.includes("saveDraft<RoundDraft>") && page.includes("loadDraft<RoundDraft>")],
  ["rondes raccordées à la file réelle", page.includes("await enqueueRound({") && mutations.includes('"submit_field_round_offline"')],
  ["identifiant de ronde stable dans le brouillon", page.includes("submissionId?:string") && page.includes("saveDraft<RoundDraft>(draftId, { submissionId, performedAt")],
  ["horodatage métier stable dans le brouillon", page.includes("performedAt?:string") && page.includes("performedAt,") && !/reportType:'wilo_round',[\s\S]{0,160}performedAt:new Date/.test(page)],
  ["identifiant stable transmis à la file", hook.includes("clientMutationId: string") && hook.includes("id: clientMutationId") && page.includes("}, submissionId);")],
  ["verrou synchrone contre les clics répétés", page.includes("submissionLockRef.current || roundSubmitted") && page.includes("submissionLockRef.current = true")],
  ["boutons verrouillés pendant et après la transmission", page.includes("disabled={!draftReady || submitting || roundSubmitted}") && page.includes("aria-busy={submitting}")],
  ["références serveur restituées à l’écran", sync.includes("syncedItems.push") && page.includes("report_reference") && page.includes("anomaly_reference")],
  ["dernier reçu de ronde restauré depuis la file", hook.includes("fieldRoundReceipt") && hook.includes("equipmentCode: item.payload.equipmentCode") && hook.includes("latestRoundReceipt") && status.includes("Dernière ronde :")],
  ["confirmation globale porte les références", page.includes("Ronde ${roundReceipt.reportReference} synchronisée") && page.includes("constat ${roundReceipt.anomalyReference} créé")],
  ["formulaire déjà synchronisé restauré comme transmis", page.includes("latestReceiptMatchesEquipment") && page.includes("explicitNewRoundAfterLatestReceipt") && page.includes("const roundSubmitted = submitted || Boolean(restoredRoundReceipt)") && page.includes("if (submissionLockRef.current) return")],
  ["nouvelle ronde explicitement distinguée du reçu précédent", page.includes("startedAfterReceiptId") && page.includes("nextStartedAfterReceiptId")],
  ["preuves raccordées à la file réelle", page.includes("offlineSync.enqueueProof") && mutations.includes('"register_anomaly_proof_offline"')],
  ["chemin de preuve déterministe", mutations.includes("clientMutationId") && mutations.includes("upsert: false")],
  ["identifiants uniques côté base", migration.includes("reports_actor_client_mutation_uidx") && migration.includes("proofs_actor_client_mutation_uidx")],
  ["empreinte anti-réutilisation", migration.includes("client_payload_hash") && migration.includes("extensions.digest")],
  ["RPC ronde sous RLS invoker", /submit_field_round_offline[\s\S]+security invoker/i.test(migration)],
  ["RPC preuve durcie", /register_anomaly_proof_offline[\s\S]+security definer/i.test(migration) && migration.includes("Uploaded proof object does not belong to the current user")],
  ["aucun droit anon", migration.includes("from public, anon") && /grant execute on function public\.submit_field_round_offline[\s\S]+to authenticated, service_role/i.test(migration)],
  ["ancienne simulation réseau supprimée", !page.includes("Simuler le retour réseau") && !page.includes("Repasser hors ligne")],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? "✓" : "✗"} ${label}`);
if (failures.length) {
  throw new Error(`${failures.length} contrôle(s) P7B en échec`);
}
console.log(`\n${checks.length} contrôles P7B hors ligne réussis.`);
