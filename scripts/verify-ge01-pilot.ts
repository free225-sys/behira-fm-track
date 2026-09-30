import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import {
  buildGe01Payload,
  createEmptyGe01Draft,
  formatGe01CheckValue,
  GE01_FIELD_DEFINITIONS,
  queueGe01Draft,
  restoreGe01Draft,
  type Ge01Draft,
  validateCompleteGe01Draft,
} from "../app/lib/ge01/report.ts";

const expectedCodes = [
  "date",
  "heure",
  "intervenant",
  "heures_moteur",
  "demarrages_24h",
  "duree_essai",
  "demarrage_reussi",
  "fonctionnement_correct",
  "retour_auto",
  "temperature_local",
  "proprete_local",
  "niveau_carburant",
  "niveau_huile",
  "temperature_eau",
  "tension_batterie",
  "bruit_vibration",
  "fumee",
  "mode_ge",
  "ats_auto",
  "alarme_mc4",
  "maintenance_dmc",
  "statut_global",
];

function completeDraft(overrides: Partial<Ge01Draft> = {}): Ge01Draft {
  return {
    ...createEmptyGe01Draft(new Date("2026-09-10T08:15:00"), "11111111-1111-4111-8111-111111111111"),
    engineHours: "1842.5",
    starts24h: "2",
    testDuration: "12.5",
    startOutcome: "success",
    functioningCorrect: "yes",
    returnAuto: "yes",
    temperatureLocal: "Normal",
    cleanliness: "Conforme",
    fuelLevel: { value: "64.5", unavailable: false, reason: "" },
    oilLevel: { value: "91", unavailable: false, reason: "" },
    waterTemperature: { value: "82.4", unavailable: false, reason: "" },
    batteryVoltage: { value: "25.7", unavailable: false, reason: "" },
    abnormalNoise: "no",
    smoke: "Aucune",
    geAuto: "yes",
    atsAuto: "yes",
    alarmMc4: "Aucune alarme",
    finalStatus: "Opérationnel",
    confirmed: true,
    step: 3,
    ...overrides,
  };
}

function findCheck(payload: ReturnType<typeof buildGe01Payload>, code: string) {
  const check = payload.checks.find((item) => item.code === code);
  assert.ok(check, `Réponse manquante : ${code}`);
  return check;
}

assert.deepEqual(GE01_FIELD_DEFINITIONS.map((field) => field.code), expectedCodes, "les 22 clés doivent rester ordonnées et exactes");
assert.equal(new Set(expectedCodes).size, 22, "les clés GE-01 doivent être uniques");

const empty = createEmptyGe01Draft(new Date("2026-09-10T08:15:00"));
assert.equal(empty.startOutcome, "", "le résultat de l’essai ne doit pas être présélectionné");
assert.equal(empty.functioningCorrect, "", "la conformité de fonctionnement ne doit pas être présélectionnée");
assert.equal(empty.returnAuto, "", "le retour AUTO ne doit pas être présélectionné");
assert.equal(empty.geAuto, "", "le mode GE ne doit pas être présélectionné");
assert.equal(empty.atsAuto, "", "le mode ATS ne doit pas être présélectionné");
assert.ok(Object.keys(validateCompleteGe01Draft(empty)).length > 0, "un brouillon vide ne doit pas être transmissible");

const normal = completeDraft();
assert.deepEqual(validateCompleteGe01Draft(normal), {}, "un contrôle quotidien complet doit être transmissible");
const payload = buildGe01Payload(normal, "Évariste");
assert.equal(payload.equipmentCode, "GE-01");
assert.equal(payload.reportType, "technical_round");
assert.equal(payload.checks.length, 22, "les 22 réponses doivent être conservées dans le rapport");
assert.deepEqual(payload.checks.map((check) => check.code), expectedCodes);
assert.ok(!("anomaly" in payload), "un rapport GE-01 ne doit pas créer automatiquement une anomalie");
assert.ok(!("score" in payload), "aucun score ne doit entrer dans le contrat GE-01");
assert.equal(Boolean(empty.isTest), false, "un nouveau brouillon reste réel par défaut");
assert.equal(payload.isTest, undefined, "le contrat réel historique ne reçoit pas de marqueur fictif");
const fictitiousDraft = completeDraft({ isTest: true });
const fictitiousPayload = buildGe01Payload(fictitiousDraft, "Évariste");
assert.equal(fictitiousPayload.isTest, true);
assert.equal(fictitiousPayload.testAttested, true);
assert.deepEqual(fictitiousPayload.checks, payload.checks, "la recette conserve exactement les 22 réponses");
assert.throws(() => buildGe01Payload({ ...fictitiousDraft, confirmed: false }, "Évariste"));
assert.equal(restoreGe01Draft(JSON.parse(JSON.stringify(fictitiousDraft))).isTest, true, "la classification survit à la restauration");
let queuedFictitious: unknown;
await queueGe01Draft(fictitiousDraft, "Évariste", "ge01:daily:recette:v1", {
  enqueueRound: async value => { queuedFictitious = JSON.parse(JSON.stringify(value)); },
  deleteDraft: async id => { assert.equal(id, "ge01:daily:recette:v1", "le brouillon réel ne doit pas être supprimé"); },
});
const {sentAt: queuedAt, ...queuedBody} = queuedFictitious as typeof fictitiousPayload;
assert.ok(queuedAt && !Number.isNaN(Date.parse(queuedAt)), 'horodatage de mise en file conservé');
assert.deepEqual(queuedBody, fictitiousPayload, "la file conserve attestation et classification");

for (const check of payload.checks) {
  const typedValues = [check.valueNumeric, check.valueText, check.valueBoolean].filter((value) => value !== undefined);
  assert.ok(typedValues.length <= 1, `${check.code} contient plusieurs valeurs typées`);
}

const monthly = findCheck(payload, "maintenance_dmc");
assert.equal(monthly.status, "not_applicable");
assert.equal(monthly.valueBoolean, undefined, "le quotidien ne doit pas enregistrer un faux entretien mensuel à Non");

assert.equal(findCheck(payload, "retour_auto").valueBoolean, true);
assert.equal(findCheck(payload, "mode_ge").valueBoolean, true);
assert.equal(findCheck(payload, "ats_auto").valueBoolean, true);
assert.notEqual(findCheck(payload, "retour_auto").code, findCheck(payload, "mode_ge").code);
assert.notEqual(findCheck(payload, "mode_ge").code, findCheck(payload, "ats_auto").code);

const failed = buildGe01Payload(completeDraft({
  startOutcome: "failed",
  testDuration: "",
  functioningCorrect: "not_observed",
  returnAuto: "yes",
  finalStatus: "Intervention", photoExceptionReason: "Appareil photo indisponible pendant cet essai",
}), "Évariste");
assert.equal(findCheck(failed, "demarrage_reussi").valueBoolean, false, "un démarrage réellement échoué doit rester Non");
assert.equal(findCheck(failed, "duree_essai").valueNumeric, undefined, "une durée inconnue après échec ne doit pas devenir zéro");
assert.equal(findCheck(failed, "duree_essai").status, "not_checked");

const impossible = buildGe01Payload(completeDraft({
  startOutcome: "not_performed",
  testDuration: "",
  testExceptionReason: "Accès au local interdit pendant l’alarme incendie.",
  functioningCorrect: "",
  returnAuto: "",
  finalStatus: "Surveillance", photoExceptionReason: "Appareil photo indisponible pendant cet essai",
}), "Évariste");
for (const code of ["duree_essai", "demarrage_reussi", "fonctionnement_correct", "retour_auto"]) {
  const check = findCheck(impossible, code);
  assert.equal(check.status, "not_checked", `${code} doit signaler un essai non réalisé`);
  assert.equal(check.valueNumeric, undefined);
  assert.equal(check.valueBoolean, undefined);
  assert.match(check.notes ?? "", /prévu mais non réalisé/i);
}

const unavailable = buildGe01Payload(completeDraft({
  fuelLevel: { value: "", unavailable: true, reason: "Jauge illisible." },
  temperatureLocal: "Très chaud",
  abnormalNoise: "yes",
  finalStatus: "Critique", photoExceptionReason: "Appareil photo indisponible pendant cet essai",
}), "Évariste");
assert.equal(findCheck(unavailable, "niveau_carburant").status, "not_checked");
assert.equal(findCheck(unavailable, "niveau_carburant").valueNumeric, undefined);
assert.equal(findCheck(unavailable, "temperature_local").status, "alert", "une observation défavorable valide doit rester transmissible");
assert.equal(findCheck(unavailable, "bruit_vibration").status, "alert", "un écart explicitement déclaré doit rester transmissible");

assert.equal(findCheck(payload, "intervenant").valueText, "Évariste");
assert.equal(findCheck(payload, "date").valueText, normal.date);
assert.equal(findCheck(payload, "heure").valueText, normal.time);
assert.equal(payload.performedAt, new Date(`${normal.date}T${normal.time}:00Z`).toISOString(), 'la saisie reste en heure Abidjan quel que soit le fuseau du téléphone');
assert.equal(formatGe01CheckValue(findCheck(payload, "statut_global")), "Opérationnel", "la consultation Faustin doit afficher l’état déclaré, même s’il reste non validé");

const beforeReload = completeDraft({
  starts24h: "0",
  atsAuto: "no",
  finalStatus: "Surveillance", photoExceptionReason: "Appareil photo indisponible pendant cet essai",
  comment: "Dernière réponse conservée avant l’envoi.",
});
const restored = restoreGe01Draft(
  JSON.parse(JSON.stringify(beforeReload)) as Ge01Draft,
  new Date("2026-09-10T09:00:00"),
  () => "22222222-2222-4222-8222-222222222222",
);
assert.equal(restored.submissionId, beforeReload.submissionId, "le rechargement doit conserver l’identifiant idempotent");
assert.equal(restored.starts24h, "0", "le rechargement doit conserver un zéro réellement saisi");
assert.equal(restored.atsAuto, "no", "le rechargement doit conserver une réponse Non");
assert.equal(restored.comment, beforeReload.comment, "le rechargement doit conserver la dernière réponse textuelle");

let queuedPayload: ReturnType<typeof buildGe01Payload> | undefined;
let queuedId = "";
let deletedDraftId = "";
await queueGe01Draft(restored, "Agent de test GE-01", "ge01:daily:v1", {
  enqueueRound: async (nextPayload, clientMutationId) => {
    queuedPayload = nextPayload;
    queuedId = clientMutationId;
  },
  deleteDraft: async (draftId) => {
    deletedDraftId = draftId;
  },
});
assert.ok(queuedPayload, "la transmission locale doit recevoir un payload");
assert.equal(queuedId, restored.submissionId, "la file doit recevoir le même identifiant après rechargement");
assert.equal(deletedDraftId, "ge01:daily:v1", "le brouillon ne doit être supprimé qu’après la mise en file");
assert.equal(findCheck(queuedPayload, "demarrages_24h").valueNumeric, 0, "la dernière valeur zéro ne doit pas être perdue à l’envoi");
assert.equal(findCheck(queuedPayload, "ats_auto").valueBoolean, false, "la dernière réponse Non ne doit pas être perdue à l’envoi");
assert.equal(queuedPayload.summary, beforeReload.comment, "le dernier commentaire ne doit pas être perdu à l’envoi");

const componentSource = await readFile(new URL("../app/components/Ge01Pilot.tsx", import.meta.url), "utf8");
assert.match(componentSource, /loadDraft<Ge01Draft>\(draftId\)/, "le brouillon doit être restauré");
assert.match(componentSource, /saveDraft\(draftId, draft\)/, "le brouillon doit être sauvegardé automatiquement");
assert.match(componentSource, /submissionLock\.current/, "le double appui doit être verrouillé côté interface");
assert.match(componentSource, /queueGe01Draft\(draft, agentName, draftId/, "la transmission doit utiliser le brouillon courant");
assert.match(componentSource, /confirmation ne signifie pas qu’il l’a lu ou validé/i, "le reçu serveur ne doit pas être présenté comme une lecture Faustin");
assert.match(componentSource, /DÉMO SANS SAUVEGARDE/, "la démonstration doit annoncer l’absence de persistance");
assert.match(componentSource, /SAUVEGARDE EN COURS/, "la sauvegarde active doit être visible");
assert.match(componentSource, /BROUILLON SAUVEGARDÉ/, "la sauvegarde réussie doit être visible");
assert.match(componentSource, /ÉCHEC SAUVEGARDE/, "un échec de sauvegarde doit être visible");
assert.doesNotMatch(componentSource, /BROUILLON AUTO|Photo facultative|AUCUN SCORE|lot suivant/i, "l’interface ne doit pas promettre une fonction absente ni parler de l’avancement du lot");

const dataSource = await readFile(new URL("../app/lib/supabase/data.ts", import.meta.url), "utf8");
assert.match(dataSource, /\.from\("reports"\)/);
assert.match(dataSource, /\.from\("report_checks"\)/);
assert.match(dataSource, /linkedEquipment\?\.code !== "GE-01"/);

console.log("GE-01: 22 champs, essai quotidien, AUTO, N/A mensuel, offline et lecture Faustin vérifiés.");
