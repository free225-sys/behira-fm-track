import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const data = read("app/lib/supabase/data.ts");
const page = read("app/page.tsx");

const checks = [
  ["projection typée des ordres de travail", data.includes("export type OperationalWorkOrder") && data.includes("workOrders: OperationalWorkOrder[]")],
  ["profil canonique résolu côté serveur", data.includes('client.rpc("current_profile_id")')],
  ["file limitée au profil connecté", data.includes('.eq("assigned_profile_id", currentProfileId)')],
  ["statuts métier existants uniquement", data.includes('.in("status", ["planned", "accepted", "in_progress", "completed"])')],
  ["RLS complétée par un filtre explicite", data.includes('.from("work_orders")') && data.includes('assigned_profile_id')],
  ["références OT et anomalie conservées", data.includes("id: item.reference") && data.includes("anomalyReference: anomaly.id")],
  ["file réelle injectée dans l’espace agent", page.includes("workOrders={workOrders}") && page.includes("liveMode ? workOrders : demoTasks")],
  ["chargement et file vide explicites", page.includes("Chargement de vos affectations") && page.includes("Aucun ordre de travail attribué")],
  ["actions simulées absentes en mode réel", page.includes("tab === 'active' && !liveMode") && page.includes("!liveMode && action && activeTask")],
  ["données de démonstration séparées", page.includes("const [demoTasks, setDemoTasks]") && page.includes("Vue terrain de démonstration")],
];

const failures = checks.filter(([, passed]) => !passed);
for (const [label, passed] of checks) console.log(`${passed ? "✓" : "✗"} ${label}`);
if (failures.length) throw new Error(`${failures.length} contrôle(s) C9-FIX-02 en échec`);
console.log(`\n${checks.length} contrôles C9-FIX-02 réussis.`);
