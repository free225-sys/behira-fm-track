// Lot 4 — accueil R sans ronde inventée, une file FM à la fois, secours sans « Sain »,
// Coûts ouvert pour de vrai, décision démo inactive, seuil non recopié.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const dossiers = await readFile(new URL('../app/components/DossiersWorkspace.tsx', import.meta.url), 'utf8');
const inbox = await readFile(new URL('../app/components/WiloRoundInbox.tsx', import.meta.url), 'utf8');
const parameters = await readFile(new URL('../app/components/ParametersWorkspace.tsx', import.meta.url), 'utf8');
const picker = await readFile(new URL('../app/components/shared/StartRoundPicker.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(page, /2026-09-16/, 'l’accueil R n’affiche plus la date du 16 septembre');
assert.doesNotMatch(page, /4 \/ 6 contrôlées/, 'le compteur de zones ne contredit plus les pastilles');
assert.doesNotMatch(page, /Zones du jour/, 'les zones ne sont plus présentées comme la ronde du jour');
assert.match(page, /Exemple d’écran/, 'la liste est un exemple d’écran');
assert.match(page, /Aucun planning de zones n’est raccordé/, 'l’absence de planning est écrite');
assert.match(page, /Ouvrir la saisie RND-LET/, 'le lien vers RND-LET est explicite');
assert.match(page, /className="zone-line"/, 'les lignes d’exemple ne sont pas des boutons');

assert.match(page, /FM_REVIEW_QUEUES/, 'le FM choisit une file');
for (const id of ["'GE-01'", "'WILO-01'", "'RIA-01'", "'IRR-01'", "'ASC'"]) {
  assert.match(page, new RegExp(`id: ${id}`), `la file ${id} est dans le sélecteur`);
}
assert.match(page, /equipment="ASC"/, 'la file ascenseurs passe par WiloRoundInbox');
assert.match(page, /legend="File à examiner"/, 'le sélecteur FM dit qu’il examine une file');
assert.doesNotMatch(page, /<WiloRoundInbox[^>]*\/><WiloRoundInbox/, 'les files ne sont plus empilées');
assert.match(inbox, /get_asc_rounds/, 'ASC appelle get_asc_rounds');
assert.match(inbox, /get_wilo_rounds/, 'WILO appelle toujours get_wilo_rounds');
assert.match(inbox, /get_irr_rounds/, 'IRR appelle toujours get_irr_rounds');
assert.match(picker, /'ASC'/, 'RoundChoiceId inclut ASC');
assert.match(picker, /legend = 'Ronde à effectuer'/, 'le libellé agent du sélecteur ne change pas par défaut');

assert.doesNotMatch(page, /state:'Sain'/, 'le secours démo ne dit plus Sain');
assert.match(page, /state:'Disponible'/, 'le secours reprend le libellé Disponible');

assert.doesNotMatch(page, /next === 'costs'/, 'navigate ne réécrit plus Coûts vers Dossiers');
assert.match(page, /next === 'registry'/, 'Registre ouvre toujours Dossiers');
assert.match(parameters, /Ouvrir les coûts/, 'le bouton des paramètres dit Coûts');
assert.match(page, /view === 'costs' && <CostsWorkspace/, 'l’écran Coûts déjà écrit est atteint');

assert.match(page, /Décision non disponible dans cet écran/, 'la décision démo dit qu’elle n’enregistre rien');
assert.doesNotMatch(page, /<Button variant="secondary">Demander un complément<\/Button>/, 'Demander un complément n’est plus actif');
assert.doesNotMatch(page, /<Button variant="secondary">Refuser<\/Button>/, 'Refuser n’est plus actif');
assert.doesNotMatch(page, /setDecisionDone\(true\)\}>\{/, 'Valider ne simule plus un enregistrement');

assert.doesNotMatch(dossiers, /400000/, 'le seuil 400 000 n’est pas recopié dans Dossiers');
assert.match(dossiers, /threshold: number/, 'le seuil affiché est celui reçu');
assert.match(page, /threshold=\{decisionThreshold\}/, 'la page transmet le seuil du paramètre');

console.log('verify-lot4-ui: ok');
