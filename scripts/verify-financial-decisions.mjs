import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const migration = read("supabase/migrations/20260831143754_c10_financial_decisions.sql");
const test = read("supabase/tests/014_c10_financial_decisions.sql");
const data = read("app/lib/supabase/data.ts");
const mutations = read("app/lib/supabase/mutations.ts");
const page = read("app/page.tsx");
const workspace = read("app/components/CostsWorkspace.tsx");
const styles = read("app/globals.css");
const types = read("app/lib/supabase/database.types.ts");

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

for (const marker of [
  "create table if not exists public.business_parameters",
  "financial_decision_threshold",
  "400000",
  "threshold_amount_snapshot",
  "submit_anomaly_cost_decision",
  "review_anomaly_cost_decision",
  "submission_idempotency_key",
  "review_idempotency_key",
  "COST_SUBMITTED",
  "COST_APPROVED",
  "COST_REJECTED",
  "alter table public.business_parameters enable row level security",
  "revoke all on function public.prepare_cost_decision() from public, anon, authenticated",
]) check(migration.includes(marker), `Migration C10 incomplète : ${marker}`);

for (const marker of [
  "A sub-threshold amount stays in the Facility Manager delegation",
  "An amount at the threshold is assigned to the Administration",
  "Facility Manager cannot approve an Administration decision",
  "A final financial decision cannot be silently edited",
  "A field agent cannot submit a financial decision",
  "Anonymous users cannot submit a financial decision",
]) check(test.includes(marker), `Test C10 manquant : ${marker}`);

check(data.includes('.from("costs")'), "Le snapshot ne charge pas les coûts canoniques");
check(data.includes('.from("business_parameters")'), "Le snapshot ne charge pas le seuil canonique");
check(data.includes("OperationalCostDecision"), "Le contrat frontend des décisions financières est absent");
check(mutations.includes('client.rpc("submit_anomaly_cost_decision"'), "La soumission financière n'utilise pas la RPC canonique");
check(mutations.includes('client.rpc("review_anomaly_cost_decision"'), "L'arbitrage Administration n'utilise pas la RPC canonique");
check(page.includes("snapshot.costs.map(mapOperationalCostDecision)"), "L'interface réelle reste alimentée par la maquette financière");
check(page.includes("snapshot.financialDecisionParameter"), "Le seuil réel n'est pas propagé dans l'interface");
check(workspace.includes("Rattacher un coût estimatif à un dossier"), "Le formulaire Facility Manager est absent");
check(workspace.includes("Motif obligatoire"), "La décision Administration n'exige pas de motif visible");
check(workspace.includes("idempotencyKey"), "Le formulaire ne conserve pas la clé d'idempotence");
check(styles.includes(".cost-submission-form"), "Le formulaire financier n'a pas de mise en page partagée");
check(styles.includes(".cost-review-form"), "Le panneau d'arbitrage n'a pas de mise en page partagée");
check(types.includes("business_parameters:"), "Les types Supabase ne contiennent pas le paramètre financier");
check(types.includes("submit_anomaly_cost_decision:"), "Les types Supabase ne contiennent pas la RPC de soumission");
check(!/350_?000|350000/.test(`${page}\n${workspace}\n${migration}`), "Un ancien seuil de 350 000 FCFA subsiste dans le code actif C10");

if (failures.length) {
  console.error("C10 financial decision verification failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log("C10 financial decisions verification passed (threshold, RLS, idempotency, history, live UI and generated types)." );
