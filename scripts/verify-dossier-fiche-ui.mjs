import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runnerImport } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const read = (rel) => readFile(path.join(root, rel), 'utf8');
const [{ module: workflowModule }, { module: reopenModule }, { module: originModule }, { module: continuityModule }] = await Promise.all([
  runnerImport(path.join(root, 'app/components/Ge01WorkflowPanel.tsx'), { root, configFile: false, logLevel: 'silent' }),
  runnerImport(path.join(root, 'app/components/ReopenDossierPanel.tsx'), { root, configFile: false, logLevel: 'silent' }),
  runnerImport(path.join(root, 'app/components/DossierOriginMeasures.tsx'), { root, configFile: false, logLevel: 'silent' }),
  runnerImport(path.join(root, 'app/components/DossierContinuity.tsx'), { root, configFile: false, logLevel: 'silent' }),
]);
const { Ge01WorkflowPanel, workflowHoldText } = workflowModule;
const { ReopenDossierPanel } = reopenModule;
const { DossierOriginMeasures, numericOriginChecks } = originModule;
const { SAVING_STATUS_TEXT, DossierOverviewAction } = continuityModule;

const noop = async () => false;
const base = {
  status: 'À qualifier',
  proof: false,
  antiZombieSummary: { expectedActor: 'Évariste K.', nextAction: 'Réaliser et confirmer le diagnostic', deadline: 'Aujourd’hui · 18:00' },
  workflow: { actionCode: 'PERFORM_DIAGNOSIS', assignedToCurrentUser: true },
};

const diagnose = renderToStaticMarkup(React.createElement(Ge01WorkflowPanel, {
  anomaly: base,
  isManager: false,
  isAgent: true,
  busy: false,
  onSubmit: noop,
  onRefresh: () => {},
  onOpenProofs: () => {},
  onOpenCosts: () => {},
}));
assert.match(diagnose, /Confirmer le diagnostic/);
assert.match(diagnose, /disabled=""/);
assert.match(diagnose, /Le commentaire est obligatoire\./);
assert.match(diagnose, /Acteur attendu : Évariste K\./);
assert.doesNotMatch(diagnose, /aria-busy="true"/);

const watcher = renderToStaticMarkup(React.createElement(Ge01WorkflowPanel, {
  anomaly: { ...base, workflow: { actionCode: 'PERFORM_DIAGNOSIS', assignedToCurrentUser: false } },
  isManager: false,
  isAgent: true,
  busy: false,
  onSubmit: noop,
  onRefresh: () => {},
  onOpenProofs: () => {},
  onOpenCosts: () => {},
}));
assert.doesNotMatch(watcher, />Confirmer le diagnostic<\/button>/);
assert.match(watcher, /Cette étape attend le diagnostic de l’agent affecté/);
assert.match(watcher, /Acteur attendu : Évariste K\./);

const saving = renderToStaticMarkup(React.createElement(ReopenDossierPanel, { mode: 'reopen', busy: true, onSubmit: noop }));
assert.match(saving, /aria-busy="true"/);
assert.match(saving, /Enregistrement…/);
assert.ok(saving.includes(SAVING_STATUS_TEXT));
assert.equal(SAVING_STATUS_TEXT, 'Enregistrement en cours. Restez sur cette page.');

const unlinked = renderToStaticMarkup(React.createElement(DossierOriginMeasures, {
  sourceReportId: null,
  checks: [],
}));
assert.equal(unlinked.includes('Mesure d’origine non reliée à cette fiche'), true);
assert.doesNotMatch(unlinked, /11,6|5,8|7,2|28/);

const linked = renderToStaticMarkup(React.createElement(DossierOriginMeasures, {
  sourceReportId: 'report-1',
  sourceReportReference: 'RPT-2026-000014',
  checks: [
    { code: 'pression', label: 'Pression de refoulement', status: 'critical', valueNumeric: 2.8, unit: 'bar' },
    { code: 'note', label: 'Commentaire', status: 'ok', valueText: 'La phrase dit 11,6 V mais ce n’est pas une mesure.' },
    { code: 'vu', label: 'Fuite vue', status: 'alert', valueBoolean: true },
  ],
}));
assert.match(linked, /Rapport d’origine : <strong>RPT-2026-000014<\/strong>/);
assert.match(linked, /Pression de refoulement/);
assert.match(linked, /2,8 bar/);
assert.match(linked, /Critique/);
assert.doesNotMatch(linked, /11,6/);
assert.doesNotMatch(linked, /Fuite vue/);
assert.equal(numericOriginChecks([
  { code: 'a', label: 'A', status: 'ok', valueText: '28 %' },
  { code: 'b', label: 'B', status: 'ok', valueNumeric: 4.5, unit: 'bar' },
]).map((item) => item.code).join(','), 'b');

const linkedWithoutNumber = renderToStaticMarkup(React.createElement(DossierOriginMeasures, {
  sourceReportId: 'report-2',
  sourceReportReference: 'RPT-2026-000015',
  checks: [{ code: 'vu', label: 'Fuite vue', status: 'ok', valueBoolean: false }],
}));
assert.match(linkedWithoutNumber, /RPT-2026-000015/);
assert.match(linkedWithoutNumber, /ne contient pas de mesure chiffrée/);
assert.doesNotMatch(linkedWithoutNumber, /Mesure d’origine non reliée/);

const linkedButUnavailable = renderToStaticMarkup(React.createElement(DossierOriginMeasures, {
  sourceReportId: 'report-hidden',
  sourceReportReference: null,
  checks: [],
}));
assert.match(linkedButUnavailable, /Rapport d’origine relié ; ses mesures ne sont pas disponibles sur cette fiche/);
assert.doesNotMatch(linkedButUnavailable, /Mesure d’origine non reliée/);

const holdBase = {
  permitted: true, proofLocked: false, confirming: false, comment: 'Diagnostic déjà rédigé.', expectedActor: 'Faustin S.',
  assignNeedsChoice: false, branch: null, approvedCostCount: 0, costChosen: false, vendorCount: 0, vendorChosen: false,
};
assert.match(workflowHoldText({ ...holdBase, command: 'branch', branch: 'internal_with_cost', approvedCostCount: 1, costChosen: false }), /Choisissez la décision financière approuvée\./);
assert.doesNotMatch(workflowHoldText({ ...holdBase, command: 'branch', branch: 'internal_with_cost', approvedCostCount: 0, costChosen: false }), /Choisissez la décision financière approuvée/);
assert.match(workflowHoldText({ ...holdBase, command: 'branch', branch: 'vendor', approvedCostCount: 1, costChosen: true, vendorCount: 2, vendorChosen: false }), /Choisissez l’entreprise\./);
assert.doesNotMatch(workflowHoldText({ ...holdBase, command: 'branch', branch: 'vendor', approvedCostCount: 1, costChosen: true, vendorCount: 0, vendorChosen: false }), /Choisissez l’entreprise/);

const branchActor = { expectedActor: 'Faustin S.', nextAction: 'Choisir le traitement', deadline: 'Aujourd’hui · 18:00' };
const chooseCost = renderToStaticMarkup(React.createElement(Ge01WorkflowPanel, {
  anomaly: { status: 'À qualifier', proof: false, antiZombieSummary: branchActor, workflow: { actionCode: 'CHOOSE_TREATMENT_BRANCH' }, financialOptions: [{ reference: 'CST-1', amount: 120000, status: 'approved' }], eligibleVendors: [] },
  isManager: true, isAgent: false, busy: false, onSubmit: noop, onRefresh: () => {}, onOpenProofs: () => {}, onOpenCosts: () => {},
}));
assert.match(chooseCost, /Autoriser le traitement choisi/);
assert.match(chooseCost, /disabled=""/);
assert.match(chooseCost, /Choisissez la décision financière approuvée\./);
assert.doesNotMatch(chooseCost, /Aucun coût approuvé disponible/);

const noApprovedCost = renderToStaticMarkup(React.createElement(Ge01WorkflowPanel, {
  anomaly: { status: 'À qualifier', proof: false, antiZombieSummary: branchActor, workflow: { actionCode: 'CHOOSE_TREATMENT_BRANCH' }, financialOptions: [{ reference: 'CST-2', amount: 80000, status: 'pending' }], eligibleVendors: [] },
  isManager: true, isAgent: false, busy: false, onSubmit: noop, onRefresh: () => {}, onOpenProofs: () => {}, onOpenCosts: () => {},
}));
assert.match(noApprovedCost, /Aucun coût approuvé disponible/);
assert.doesNotMatch(noApprovedCost, /Choisissez la décision financière approuvée/);

const card = (props) => renderToStaticMarkup(React.createElement(DossierOverviewAction, {
  title: 'Contrôler la preuve',
  responsibleLine: 'Responsable interne actuel : PREST-GE.',
  externalActor: null,
  busy: false,
  onPrimary: () => {},
  readOnly: false,
  receiving: false,
  reviewingReopened: false,
  reopenAvailable: false,
  ge01Connected: false,
  ...props,
}));
const proofCard = card({ proofRequiresAttention: true, overThreshold: false, hasNextStatus: true, primaryLabel: 'Ouvrir les preuves' });
assert.match(proofCard, />Ouvrir les preuves<\/button>/);
assert.match(proofCard, /ACTION PRINCIPALE/);
assert.doesNotMatch(proofCard, /RAPPEL/);
assert.doesNotMatch(proofCard, /Ce bloc ne lance rien/);

const financeCard = card({ proofRequiresAttention: false, overThreshold: true, hasNextStatus: true, primaryLabel: 'Examiner la décision financière' });
assert.match(financeCard, />Examiner la décision financière<\/button>/);
assert.doesNotMatch(financeCard, /next-step-reminder/);

const validateCard = card({ proofRequiresAttention: false, overThreshold: false, hasNextStatus: true, primaryLabel: 'Valider : Clôturée' });
assert.match(validateCard, /RAPPEL/);
assert.match(validateCard, /À faire avec « Valider l’étape », en haut de la fiche\./);
assert.doesNotMatch(validateCard, /<button/);
assert.doesNotMatch(validateCard, /Ce bloc ne lance rien/);

const receptionCard = card({ receiving: true, proofRequiresAttention: false, overThreshold: false, hasNextStatus: false, primaryLabel: 'Réceptionner l’intervention' });
assert.match(receptionCard, /À faire dans le panneau de réception ci-dessous\./);
assert.doesNotMatch(receptionCard, /<button/);

const reopenCard = card({ reopenAvailable: true, proofRequiresAttention: false, overThreshold: false, hasNextStatus: false, primaryLabel: 'Rouvrir le dossier', title: 'Réouverture possible' });
assert.match(reopenCard, /À faire dans le panneau de réouverture\./);

const connectedCard = card({ ge01Connected: true, proofRequiresAttention: false, overThreshold: false, hasNextStatus: false, primaryLabel: 'Confirmer le diagnostic' });
assert.match(connectedCard, /À faire dans le bloc Continuité de traitement\./);

const consultCard = card({ readOnly: true, proofRequiresAttention: false, overThreshold: false, hasNextStatus: true, primaryLabel: 'Consulter les repères du dossier' });
assert.match(consultCard, /PROCHAINE ÉTAPE/);
assert.match(consultCard, /Consultation uniquement/);
assert.doesNotMatch(consultCard, /ACTION PRINCIPALE/);
assert.doesNotMatch(consultCard, /<button/);

const [data, page, continuity] = await Promise.all([
  read('app/lib/supabase/data.ts'),
  read('app/page.tsx'),
  read('app/components/DossierContinuity.tsx'),
]);
assert.equal((data.match(/from\("anomalies"\)/g) ?? []).length, 1);
assert.equal((data.match(/from\("report_checks"\)/g) ?? []).length, 1);
assert.match(data, /source_report_id/);
assert.match(data, /originChecks: item\.source_report_id \? checksByReportId\.get\(item\.source_report_id\)/);
assert.match(page, /DossierOriginMeasures/);
assert.match(page, /<DossierOverviewAction/);
assert.doesNotMatch(page, /Ce bloc ne lance rien/);
assert.doesNotMatch(page, /L’action se fait plus haut sur cette fiche/);
assert.match(continuity, /Enregistrement en cours\. Restez sur cette page\./);
assert.equal((continuity.match(/Enregistrement en cours\. Restez sur cette page\./g) ?? []).length, 1);

console.log('Fiche dossier : motif du bouton, mesure d’origine, attente unique et rappel sans second bouton.');
