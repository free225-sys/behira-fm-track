import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { runnerImport } from "vite";

const root = fileURLToPath(new URL("..", import.meta.url));
const [{ module: componentModule }, { module: reportModule }] = await Promise.all([
  runnerImport(`${root}/app/components/Ge01Pilot.tsx`, { root, configFile: false, logLevel: "silent" }),
  runnerImport(`${root}/app/lib/ge01/report.ts`, { root, configFile: false, logLevel: "silent" }),
]);
const { Ge01ReportInbox } = componentModule;
const { GE01_FIELD_DEFINITIONS } = reportModule;

const checks = GE01_FIELD_DEFINITIONS.map((field) => ({
    code: field.code,
    label: field.label,
    status: "ok",
    valueText: `Valeur de test ${field.code}`,
}));
const replace = (code, value) => {
  const index = checks.findIndex((check) => check.code === code);
  checks[index] = { code, label: GE01_FIELD_DEFINITIONS[index].label, ...value };
};

replace("date", { status: "ok", valueText: "2026-09-10" });
replace("heure", { status: "ok", valueText: "08:15" });
replace("intervenant", { status: "ok", valueText: "Agent de test local" });
replace("demarrages_24h", { status: "ok", valueNumeric: 0, unit: "démarrage(s)" });
replace("duree_essai", { status: "not_checked", notes: "Essai quotidien prévu mais non réalisé : accès de test impossible." });
replace("demarrage_reussi", { status: "alert", valueBoolean: false });
replace("retour_auto", { status: "not_checked", notes: "Non contrôlé après essai impossible." });
replace("mode_ge", { status: "ok", valueBoolean: true });
replace("ats_auto", { status: "alert", valueBoolean: false });
replace("maintenance_dmc", { status: "not_applicable", notes: "Contrôle quotidien : entretien mensuel non demandé." });
replace("statut_global", { status: "not_checked", valueText: "Surveillance", notes: "Déclaration de test non validée." });

const report = {
    id: "test-ge01-local-0001",
    reference: "TEST-GE01-0001",
    reportType: "technical_round",
    reportStatus: "submitted",
    equipmentCode: "GE-01",
    equipmentLabel: "Groupe électrogène — données de test",
    reportedBy: "Agent de test local",
    performedAt: "2026-09-10T08:15:00.000Z",
    submittedAt: "2026-09-10T08:16:00.000Z",
    analysis: "Jeu de données local isolé, sans écriture Supabase.",
    checks,
};

const content = renderToStaticMarkup(React.createElement(Ge01ReportInbox, { reports: [report], connected: true }));
const checksMarkup = content.match(/<div class="ge-report-checks">([\s\S]*?)<\/div><div class="ge-report-comment">/)?.[1] ?? "";

assert.match(content, /TEST-GE01-0001/);
assert.match(content, /Agent de test local/);
assert.match(content, /0 démarrage\(s\)/, "un zéro réel doit être affiché");
assert.match(content, /Essai quotidien prévu mais non réalisé/, "une impossibilité doit être affichée sans faux zéro");
assert.match(content, /Démarrage réussi<\/dt><dd>Non<\/dd>/, "un échec réel doit être affiché à Non");
assert.match(content, /ATS actuellement en AUTO<\/dt><dd>Non<\/dd>/, "un faux booléen doit rester visible");
assert.match(content, /Non applicable/, "le DMC quotidien doit être affiché N\/A");
assert.match(content, /Surveillance/, "l’état final déclaré doit rester visible");
assert.equal((checksMarkup.match(/<dt>/g) ?? []).length, 22, "les 22 réponses doivent être rendues dans le détail Faustin");
for (const field of GE01_FIELD_DEFINITIONS) assert.ok(content.includes(field.label), `libellé absent : ${field.code}`);
assert.doesNotMatch(content, /Aucun rapport GE-01 transmis|Données serveur indisponibles en démonstration/);

if (process.argv[2]) {
  const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");
  const document = `<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vérification locale Faustin — GE-01</title><style>${css}\nbody{margin:0;padding:32px;background:var(--background);font-family:Arial,sans-serif}.ge-verification-banner{margin:0 0 24px;padding:12px 16px;border:2px solid var(--warning-border);background:var(--warning-surface);color:var(--warning-text);font-weight:850}.ge-verification-shell{max-width:1180px;margin:auto}</style></head><body><div class="ge-verification-shell"><div class="ge-verification-banner">DONNÉES DE TEST LOCALES — AUCUNE ÉCRITURE SUPABASE</div>${content}</div></body></html>`;
  await writeFile(process.argv[2], document, "utf8");
}

console.log("GE-01 render: 22 réponses, zéro, Non, impossibilité et N/A affichés dans la vue Faustin.");
