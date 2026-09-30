import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const data = read("app/lib/supabase/data.ts");
const mutations = read("app/lib/supabase/mutations.ts");
const page = read("app/page.tsx");

// DESIGN-069: agents open the canonical dossier for proof consultation/replacement.
const checks = [
  ["projection typée des ordres de travail", data.includes("export type OperationalWorkOrder") && data.includes("workOrders: OperationalWorkOrder[]")],
  ["profil canonique résolu côté serveur", data.includes('client.rpc("current_profile_id")')],
  ["file limitée aux ordres attribués ou au suivi prestataire du profil connecté", data.includes('item.assigned_profile_id !== currentProfileId') && data.includes("item.ge01_treatment_branch === 'vendor' && anomaly.workflow.assignedToCurrentUser")],
  ["statuts métier existants uniquement", data.includes('.in("status", ["planned", "accepted", "in_progress", "completed"])')],
  ["RLS complétée par un filtre explicite", data.includes('.from("work_orders")') && data.includes('assigned_profile_id')],
  ["références OT et anomalie conservées", data.includes("id: item.reference") && data.includes("anomalyReference: anomaly.id") && data.includes("anomalyDatabaseId: anomaly.databaseId")],
  ["file réelle injectée dans l’espace agent", page.includes("current.source?.workOrders") && page.includes("const tasks: AgentTask[] = current.live ?")],
  ["chargement et file vide explicites", page.includes("<ConnectedDataStatus") && page.includes("Aucune action dans cette file.")],
  ["actions simulées isolées du mode réel", page.includes("{current.live ? <div className=\"task-actions\">") && page.includes("Appliquer dans la démonstration")],
  ["cycle réel rattaché à la référence canonique", page.includes("persistAssignedIntervention") && page.includes("order.anomalyReference") && page.includes("'En intervention'|'En validation'")],
  ["preuve terrain mise dans la file hors ligne existante", page.includes("persistAssignedProof") && page.includes("offlineSync.enqueueProof") && page.includes("order.anomalyDatabaseId")],
  ["états de preuve distincts", data.includes("proofPending: anomaly.proofPending") && page.includes("task.proofPending ? 'À valider'") && page.includes("ACCEPTÉE")],
  ["acceptation et refus Facility Manager visibles", page.includes("Refuser avec motif") && page.includes("Accepter la preuve") && page.includes("proofReviewDecision === 'rejected'")],
  ["motif de refus obligatoire côté interface", page.includes("proofReviewDecision === 'rejected' && !proofReviewComment.trim()")],
  ["métadonnées de preuve projetées depuis la source canonique", data.includes("export type OperationalProof") && data.includes("storage_bucket, storage_path") && data.includes("proofsByAnomalyId")],
  ["bucket privé imposé pour la consultation", mutations.includes('const PROOF_BUCKET = "anomaly-proofs"') && mutations.includes("createAnomalyProofConsultationUrl")],
  ["lien de consultation temporaire sans URL publique", mutations.includes("createSignedUrl(storagePath, 5 * 60)") && !mutations.includes("getPublicUrl")],
  ["consultation image et PDF proposée dans le dossier", page.includes("Consulter") && page.includes("Ouvrir dans un nouvel onglet") && page.includes("proofPreview.proof.mimeType?.startsWith('image/')")],
  ["preuve consultable depuis la file personnelle de l’agent", data.includes("proofs: anomaly.proofs") && page.includes("onClick={()=>onOpen(task.id)}") && page.includes("onConsultProof={consultProof}")],
  ["états accepté, refusé et à valider conservés", page.includes("ACCEPTÉE") && page.includes("REFUSÉE") && page.includes("À VALIDER")],
  ["refus consultable dans le dossier ouvert depuis la carte agent", page.includes("Ouvrir le dossier") && page.includes("REFUSÉE") && page.includes("Déposer la preuve corrigée")],
  ["motif canonique du refus affiché sans invention", page.includes("proof.verificationStatus === 'rejected' && proof.rejectionReason") && page.includes("{proof.rejectionReason}")],
  ["nouveau dépôt présenté comme remplacement", page.includes("'Déposer la preuve corrigée' : 'Déposer un justificatif'")],
  ["historique canonique projeté depuis anomaly_history", data.includes('from("anomaly_history")') && data.includes("historyByAnomalyId") && data.includes("history: historyByAnomalyId.get(item.id) ?? []")],
  ["libellé, acteur, étape et heure proviennent des référentiels métier", data.includes('from("business_event_definitions")') && data.includes('from("workflow_stages")') && data.includes("actor_label_snapshot") && data.includes("occurredAt: history.occurred_at")],
  ["historique réel injecté dans le dossier", page.includes("const historyEvents = anomaly.history ?? []") && page.includes("Événements métier du dossier") && page.includes("formatHistoryMoment(event.occurredAt)")],
  ["état indisponible conservé uniquement en absence d’événement", page.includes("historyEvents.length > 0 ?") && page.includes("Historique métier indisponible")],
  ["données de démonstration séparées", page.includes("const [demoTasks, setTasks]") && page.includes("]).values()] : demoTasks;")],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? "✓" : "✗"} ${label}`);
if (failures.length) throw new Error(`${failures.length} contrôle(s) C9-FIX-06 en échec`);
console.log(`\n${checks.length} contrôles C9-FIX-06 réussis.`);
