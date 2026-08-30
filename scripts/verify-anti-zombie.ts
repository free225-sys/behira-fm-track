import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeAntiZombieSummary, type AntiZombieSummaryData } from '../app/components/anti-zombie-contract.ts';
import { adaptCanonicalAntiZombieSummary, type AntiZombieProjectionRow } from '../app/lib/supabase/anti-zombie.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const cases: Array<{ name:string; data:AntiZombieSummaryData; verify:(result:ReturnType<typeof normalizeAntiZombieSummary>)=>void }> = [
  {
    name:'dossier actif complet',
    data:{ status:'Affectée', responsible:'Agent Électricité Démo', nextAction:'Contrôler la batterie', deadline:'28 août · 15:00', slaLabel:'Dans le délai', blockingOrDelayReason:'Aucun retard déclaré', expectedProof:'Photo du voltmètre', lastHistoryActivity:{ label:'Affectation confirmée', occurredAt:'28 août · 09:10', actor:'Facility Manager Démo' } },
    verify:(result) => { assert.equal(result.responsible, 'Agent Électricité Démo'); assert.equal(result.lastActivityLabel, 'Affectation confirmée'); },
  },
  {
    name:'dossier en retard',
    data:{ status:'En intervention', responsible:'Agent Eau & Incendie Démo', nextAction:'Terminer le diagnostic', deadline:'27 août · 12:00', slaLabel:'En retard', isDelayed:true },
    verify:(result) => { assert.equal(result.isDelayed, true); assert.equal(result.blockingOrDelayReason, 'Motif non renseigné'); },
  },
  {
    name:'dossier bloqué complet',
    data:{ status:'Affectée', isBlocked:true, blockingActor:'Administration', blockingOrDelayReason:'Décision financière attendue' },
    verify:(result) => { assert.equal(result.blockingInformationIncomplete, false); assert.equal(result.blockingActor, 'Administration'); },
  },
  {
    name:'dossier bloqué sans acteur',
    data:{ status:'Affectée', isBlocked:true, blockingOrDelayReason:'Accès technique indisponible' },
    verify:(result) => { assert.equal(result.blockingActor, 'Acteur bloquant non renseigné'); assert.equal(result.blockingInformationIncomplete, true); },
  },
  {
    name:'dossier bloqué sans motif',
    data:{ status:'Affectée', isBlocked:true, blockingActor:'Administration' },
    verify:(result) => { assert.equal(result.blockingOrDelayReason, 'Motif non renseigné'); assert.equal(result.blockingInformationIncomplete, true); },
  },
  {
    name:'dossier sans responsable',
    data:{ status:'À qualifier' },
    verify:(result) => assert.equal(result.responsible, 'Responsable non attribué'),
  },
  {
    name:'dossier sans échéance',
    data:{ status:'À qualifier' },
    verify:(result) => assert.equal(result.deadlineOrSla, 'Échéance non renseignée'),
  },
  {
    name:'dossier sans historique',
    data:{ status:'À qualifier', lastHistoryActivity:null },
    verify:(result) => { assert.equal(result.lastActivityLabel, 'Historique indisponible'); assert.equal(result.lastActivityMeta, null); },
  },
];

for (const testCase of cases) {
  const result = normalizeAntiZombieSummary(testCase.data);
  testCase.verify(result);
  console.log(`✓ ${testCase.name}`);
}

const canonical = normalizeAntiZombieSummary(adaptCanonicalAntiZombieSummary({
  is_closed:false,
  stage_label:'Qualification',
  status_label:'À qualifier',
  responsible_name:'Évariste DJE',
  responsible_missing:false,
  next_action_label:'Réaliser et confirmer le diagnostic',
  next_action_comment:'Contrôler la tension batterie',
  next_action_missing:false,
  due_at:'2026-08-30T10:00:00.000Z',
  deadline_missing:false,
  is_delayed:true,
  is_blocked:true,
  blocking_actor_label:'Exploitant technique externe',
  blocking_or_delay_reason:'Diagnostic technique attendu — accès requis',
  blocking_information_incomplete:false,
  expected_proof_label:'Au moins une preuve acceptée conforme au dossier',
  expected_proof_missing:false,
  pending_proof_requirement_count:1,
  history_missing:false,
  last_activity_label:'Blocage déclaré',
  last_activity_occurred_at:'2026-08-30T09:00:00.000Z',
  last_activity_actor_label:'Évariste DJE',
  last_activity_stage_label:'Qualification',
} as AntiZombieProjectionRow));
assert.equal(canonical.status, 'Qualification · À qualifier');
assert.equal(canonical.nextActionDetail, 'Contrôler la tension batterie');
assert.equal(canonical.expectedProofState, '1 exigence en attente');
assert.match(canonical.lastActivityMeta ?? '', /Évariste DJE · Qualification$/);
assert.equal(canonical.blockingInformationIncomplete, false);
console.log('✓ projection canonique C6 adaptée sans recalcul métier');

const [page, component, contract, css, dataSource, canonicalAdapter] = await Promise.all([
  readFile(path.join(root, 'app', 'page.tsx'), 'utf8'),
  readFile(path.join(root, 'app', 'components', 'AntiZombieSummary.tsx'), 'utf8'),
  readFile(path.join(root, 'app', 'components', 'anti-zombie-contract.ts'), 'utf8'),
  readFile(path.join(root, 'app', 'globals.css'), 'utf8'),
  readFile(path.join(root, 'app', 'lib', 'supabase', 'data.ts'), 'utf8'),
  readFile(path.join(root, 'app', 'lib', 'supabase', 'anti-zombie.ts'), 'utf8'),
]);

const managerSource = page.slice(page.indexOf('function Manager('), page.indexOf('function Detail('));
const registrySource = page.slice(page.indexOf('function Registry('), page.indexOf('function Manager('));
const detailSource = page.slice(page.indexOf('function Detail('), page.indexOf('function ' , page.indexOf('function Detail(') + 20));

assert.equal((page.match(/<AntiZombieSummary\s/g) ?? []).length, 3, 'Le composant doit être intégré dans Facility Manager, le registre et le dossier central.');
assert.match(managerSource, /<AntiZombieSummary\s/, 'AntiZombieSummary doit être intégré dans Manager.');
assert.match(managerSource, /antiZombieSummaryForManager\(focus\)/, 'Facility Manager doit consommer la projection canonique C6 avec repli démo explicite.');
assert.match(registrySource, /<AntiZombieSummary\s/, 'Le registre doit intégrer la variante compacte.');
assert.match(detailSource, /<AntiZombieSummary\s/, 'Le dossier central doit intégrer la variante détaillée.');
assert.match(dataSource, /from\("anti_zombie_summary_v"\)\.select\("\*"\)/, 'Le chargement Supabase doit lire la projection canonique unique.');
assert.match(canonicalAdapter, /adaptCanonicalAntiZombieSummary/, 'L’adaptateur Supabase dédié doit rester distinct du composant visuel.');
assert.doesNotMatch(canonicalAdapter, /Date\.now|new Date\(\)\.getTime/, 'L’adaptateur ne doit pas recalculer le retard avec l’horloge du navigateur.');

for (const label of ['Étape actuelle','Responsable','Prochaine action','SLA / Échéance','Acteur bloquant','Motif du blocage ou du retard','Preuve attendue','Dernière activité']) {
  assert.ok(component.includes(label), `Libellé manquant : ${label}`);
}
for (const fallback of ['Responsable non attribué','Prochaine action non renseignée','Échéance non renseignée','Aucun blocage déclaré','Motif non renseigné','Preuve attendue non définie','Historique indisponible','Informations de blocage à compléter']) {
  assert.ok(`${component}\n${contract}`.includes(fallback), `Valeur de repli manquante : ${fallback}`);
}

assert.match(component, /tabIndex=\{0\}/, 'La synthèse doit être atteignable au clavier.');
assert.doesNotMatch(component, /title=/, 'Aucun contenu essentiel ne doit dépendre d’un tooltip.');
assert.match(css, /\.anti-zombie-summary:focus-visible/, 'Le focus clavier de la synthèse doit être visible.');
assert.match(css, /@media \(max-width:700px\)[\s\S]*?\.anti-zombie-fields/, 'La disposition mobile doit être définie.');
assert.match(css, /--font-size-label:12px/, 'Le plancher typographique doit rester fixé à 12 px.');
assert.match(css, /\.anti-zombie-fields dt\{[^}]*font-size:var\(--font-size-label\)/, 'Les libellés doivent consommer le plancher typographique.');
assert.match(css, /\.anti-zombie-fields dd\{[^}]*font-size:var\(--font-size-body\)/, 'Les valeurs essentielles doivent rester au-dessus du plancher typographique.');
assert.match(component, /CONTINUITÉ DE TRAITEMENT/, 'Le libellé métier validé doit remplacer le vocabulaire anti-zombie.');
assert.match(component, /NORMALE/, 'La continuité normale doit être distinguée du statut du workflow.');

console.log('✓ intégration partagée Facility Manager, registre et dossier central');
console.log('✓ huit informations visibles, valeurs de repli et alerte de blocage présentes');
console.log('✓ contrôle statique desktop, mobile, clavier et absence de tooltip');
console.log(`\n${cases.length + 4} contrôles AntiZombieSummary réussis.`);
