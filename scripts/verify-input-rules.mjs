// Règles de saisie (30/09/2026) : mêmes cas que supabase/tests/018_clean_text_guard.sql (écran et serveur alignés).
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {runnerImport} from 'vite';
const {module:r}=await runnerImport(fileURLToPath(new URL('../app/lib/input-rules.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
const {module:irr}=await runnerImport(fileURLToPath(new URL('../app/lib/irr/report.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
let n=0;const t=(name,fn)=>{fn();n++;};
const accepted=['Pression 3,5 bar — pompe P2 à l’arrêt (40 %) « ok » !','€ 1 200','≥ 6 bar','naïve Œuvre','ligne 1\nligne 2','[a-b] \\ x','Heure 10:35','2026-09-30T11:33:00.000Z','Réf. ANO-2026-000010 / lot #3 & co @FM'];
const refused=['😀','Test ✓','★ bien','x™','©','→','❤️','👍🏽','a​b','|','~','{}','ok\u0007','♥'];
t('textes usuels acceptés',()=>accepted.forEach(x=>assert.equal(r.isCleanText(x),true,x)));
t('émojis, symboles décoratifs et caractères invisibles refusés',()=>refused.forEach(x=>assert.equal(r.isCleanText(x),false,x)));
t('collage mixte : le texte utile est conservé',()=>assert.equal(r.cleanText('Local 🔒 fermé ✓'),'Local  fermé '));
t('mesure décimale : chiffres et un seul séparateur',()=>{assert.equal(r.sanitizeDecimal('2,5'),'2,5');assert.equal(r.sanitizeDecimal('2.5'),'2.5');assert.equal(r.sanitizeDecimal('2,5,3'),null);assert.equal(r.sanitizeDecimal('2a'),null);assert.equal(r.sanitizeDecimal('-1'),null);});
t('entier : chiffres seulement',()=>{assert.equal(r.sanitizeInteger('1200'),'1200');assert.equal(r.sanitizeInteger('1 200'),null);assert.equal(r.sanitizeInteger('12.5'),null);});
t('motif : vide, espaces, trop court ou avec symbole refusé',()=>{assert.match(r.reasonProblem('   '),/à renseigner/);assert.match(r.reasonProblem('ok'),/5 lettres ou chiffres/);assert.match(r.reasonProblem('.....'),/5 lettres ou chiffres/);assert.match(r.reasonProblem('Local ✓ fermé'),/émojis/);assert.equal(r.reasonProblem('Local fermé'),null);});
t('IRR : un motif trop court reste une réponse manquante',()=>{const d={...irr.emptyIrrDraft(),answers:{pump:'unknown'},reasons:{pump:'ok'}};assert.ok(irr.irrMissing(d).includes('Pompe d’irrigation disponible'));d.reasons.pump='Local fermé à clé';assert.ok(!irr.irrMissing(d).includes('Pompe d’irrigation disponible'));});
console.log(`${n} contrôles des règles de saisie réussis.`);
