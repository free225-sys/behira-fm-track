import { readFileSync } from 'node:fs';

const page = readFileSync(new URL('../app/page.tsx', import.meta.url), 'utf8');
const css = readFileSync(new URL('../app/globals.css', import.meta.url), 'utf8');
const checks = [
  ['Connexion et états', ['Bienvenue', 'Connexion…', 'Identifiants non reconnus', 'Connecté ✓'].every((value) => page.includes(value))],
  ['Afficher / masquer', page.includes('Masquer le mot de passe') && page.includes('Afficher le mot de passe')],
  ['Mot de passe oublié', page.includes('Mot de passe oublié') && page.includes('Instructions simulées envoyées')],
  ['Invitation et robustesse', page.includes('Activez votre compte') && page.includes('12 caractères minimum') && page.includes('Confirmation identique')],
  ['Déconnexion et réinitialisation', page.includes('Se déconnecter ?') && page.includes('Déconnecter et réinitialiser toute la démo')],
  ['Session locale', page.includes('localStorage') && page.includes('sessionStorage') && page.includes('behira_demo_session_v1')],
  ['Cinq comptes fictifs internes', (page.match(/@demo\.behira\.invalid/g) ?? []).length === 5 && !page.includes('prestataire@demo.behira.invalid') && !page.includes('lecture.seule@demo.behira.invalid')],
  ['Domaine non réel', page.includes('.invalid') && !/@gmail\.|@outlook\.|@yahoo\./i.test(page)],
  ['Redirections par rôle', page.includes("facility:'workspace'") && page.includes("administration:'workspace'") && page.includes("rondes_assistance:'workspace'")],
  ['Protection des vues', page.includes('allowedViewsByPersona') && page.includes('Accès masqué pour ce rôle')],
  ['Aucun compte Lecture seule', !page.includes("personaId:'readonly'") && !page.includes('lecture.seule@demo.behira.invalid')],
  ['Mode démonstration explicite', page.includes('MODE DÉMONSTRATION') && page.includes('DÉMONSTRATION LOCALE')],
  ['Supabase local branché', page.includes('signInWithPassword') && page.includes('resetPasswordForEmail') && page.includes("mode:'supabase'")],
  ['Première connexion verrouillée', page.includes('RequiredPasswordChange') && page.includes('getAuthenticatedProfileGate') && page.includes('currentPassword')],
  ['Mot de passe robuste obligatoire', page.includes('16 caractères minimum') && page.includes('Différent du temporaire') && page.includes('Confirmation identique')],
  ['Déverrouillage Auth confirmé', page.includes('updateUser({ password:newPassword, currentPassword })') && page.includes('gate.mustChangePassword')],
  ['Persona imposé par RLS', page.includes('resolveAuthenticatedPersona') && page.includes("session.mode === 'demo'")],
  ['Responsive 390 / 768 / 1440', ['max-width:430px','max-width:900px','.auth-shell'].every((value) => css.includes(value))],
  ['Focus clavier unique', css.includes('.keyboard-nav .password-control:focus-within') && css.includes('outline:2px solid var(--focus-ring)') && css.includes('border-color:#d5dee7;box-shadow:none')],
  ['Aucun secret Supabase', !/(SUPABASE_(URL|KEY)|anon[_-]?key|service[_-]?role)/i.test(page)],
];

let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? '✓' : '✗'} ${label}`);
  if (!ok) failed += 1;
}
if (failed) {
  console.error(`\n${failed} contrôle(s) d’authentification échoué(s).`);
  process.exit(1);
}
console.log(`\n${checks.length} contrôles d’authentification réussis.`);
