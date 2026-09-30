import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import {
  acceptConnectedSnapshot,
  rejectConnectedSnapshot,
  validatedScore,
} from "../app/lib/connected-data-policy.ts";

const emptySnapshot = {
  anomalies: [],
  equipment: [],
  vendors: [],
  workOrders: [],
  reports: [],
  costs: [],
};
const acceptedEmpty = acceptConnectedSnapshot(emptySnapshot);

assert.equal(acceptedEmpty.dataState, "live", "Une réponse serveur vide doit rester un succès connecté.");
assert.deepEqual(acceptedEmpty.anomalies, [], "Une liste d'anomalies vide ne doit pas recevoir de démonstration.");
assert.deepEqual(acceptedEmpty.equipment, [], "Une liste d'équipements vide ne doit pas recevoir de démonstration.");

const failure = rejectConnectedSnapshot();
assert.equal(failure.dataState, "error", "Une erreur serveur doit être exposée explicitement.");
assert.deepEqual(failure.anomalies, [], "Une erreur serveur ne doit pas exposer les anomalies de démonstration.");
assert.deepEqual(failure.equipment, [], "Une erreur serveur ne doit pas exposer les équipements de démonstration.");

assert.equal(validatedScore(null, false), null, "Un score absent doit rester absent.");
assert.equal(validatedScore(0, false), null, "Un score non validé, même égal à zéro, ne doit pas être affiché.");
assert.equal(validatedScore(82, false), null, "Un score non validé ne doit pas être affiché.");
assert.equal(validatedScore(0, true), 0, "Un véritable zéro validé ne doit pas être confondu avec une absence.");
assert.equal(validatedScore(82, true), 82, "Un score validé doit rester inchangé.");

const root = fileURLToPath(new URL("..", import.meta.url));
const page = readFileSync(`${root}/app/page.tsx`, "utf8");
const data = readFileSync(`${root}/app/lib/supabase/data.ts`, "utf8");

assert.ok(page.includes("acceptConnectedSnapshot(snapshot)"), "Le succès connecté doit passer par la frontière dédiée.");
assert.ok(page.includes("rejectConnectedSnapshot()"), "L'erreur connectée doit vider les collections métier.");
assert.ok(!page.includes("if (snapshot.anomalies.length)"), "Une réponse vide ne doit pas conserver les anomalies de démonstration.");
assert.ok(!page.includes("setDataState('fallback')"), "Le mode connecté ne doit pas basculer silencieusement vers la démonstration.");
assert.ok(page.includes("Aucune donnée de démonstration n’est affichée à sa place."), "L'erreur doit être expliquée explicitement.");
assert.ok(data.includes("const EQUIPMENT_HEALTH_SCORES_VALIDATED = false") && data.includes("validatedScore(item.health_score, EQUIPMENT_HEALTH_SCORES_VALIDATED)"), "Les scores d'équipement doivent rester masqués jusqu'à validation.");
assert.ok(!data.includes("health_score ?? 0"), "Une absence de score ne doit jamais devenir zéro.");

console.log("Connected data policy passed: empty, error, and unvalidated-score boundaries are explicit.");
