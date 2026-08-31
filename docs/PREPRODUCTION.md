# BEHIRA FM/GB TRACK — passage en préproduction

## Objectif

Valider le produit sur un projet Supabase isolé avant toute donnée réelle ou
ouverture aux utilisateurs. La pile locale ne doit jamais être exposée sur
Internet.

## État au 31 août 2026

- Projet Supabase `fm_track` actif en région `eu-west-1`.
- Vingt et une migrations versionnées appliquées, dont le retrait des accès
  prestataires, les deux droits de dépôt internes, le verrou de première
  connexion, le hors-ligne terrain et les contrats anti-dossier-zombie C1 à C6.
- Référentiel V3 chargé : rôles, profils métier non connectés, équipements,
  zones, prestataires, catégories, SLA, statuts et seuils.
- Cinq utilisateurs internes Supabase Auth auto-confirmés, reliés aux cinq profils
  métier validés, sans invitation par email.
- Les cinq comptes sont verrouillés par RLS jusqu’au changement effectif de leur
  mot de passe temporaire ; ce changement est confirmé par un trigger Auth.
- Évariste et Sylvain sont les seuls détenteurs actifs de
  `upload_vendor_intervention_report`; le profil Lecture seule précréé a été retiré.
- Frontend local raccordé avec une clé publique et un mode démonstration de
  secours sans écriture distante.
- Les cinq identifiants temporaires ont été vérifiés en connexion réelle sans
  changer les mots de passe de leurs titulaires. Le changement obligatoire et
  la restauration du rôle ont été validés avec une fixture distante supprimée.
- La recette C8 distante a réussi avec annulation transactionnelle : 46/46 tables
  publiques sous RLS, 6 étapes, 29 correspondances action/étape et aucun résidu.

Restent à confirmer avant la préproduction ouverte : l’organisation
propriétaire définitive, la région validée par la Direction et l’URL du
frontend utilisée pour les redirections Auth. La lecture de la configuration
Auth distante montre également que les inscriptions publiques sont encore
autorisées ; elles doivent être désactivées avant d'exposer l'écran de connexion.

Ne transmettre aucune clé dans un message, un document ou le dépôt. Les
variables sont saisies directement dans les secrets de l’environnement de
préproduction.

## Variables frontend de préproduction

- `NEXT_PUBLIC_USE_SUPABASE` : `true`
- `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK` : `true` pendant la recette, puis `false`
  avant la production
- `NEXT_PUBLIC_SUPABASE_URL` : URL HTTPS du projet
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` : clé publique du projet

La clé `service_role` ne doit jamais recevoir le préfixe `NEXT_PUBLIC_` et ne
doit jamais être utilisée par le navigateur.

## Procédure recommandée

1. Exécuter `npm run test:fm-track`, puis `npm run preflight:preprod` localement.
2. Faire confirmer le propriétaire, la région et l’URL de préproduction.
3. Configurer les URL Auth et désactiver les inscriptions publiques.
4. Distribuer individuellement les identifiants temporaires depuis le classeur
   local protégé ; ne jamais transmettre le classeur collectivement.
5. Faire changer le mot de passe à la première connexion avant toute recette métier.
6. Configurer les variables publiques du frontend de préproduction et couper
   le mode démonstration de secours.
7. Exécuter la recette ci-dessous avant toute production.

Le workflow manuel `supabase-preproduction.yml` réalise toujours un `dry-run`
avant l’application. Il n’importe jamais les fixtures de démo. Le référentiel
de production reste appliqué séparément avec le seed idempotent contrôlé.

La clôture C8, les migrations appliquées, les critères d'arrêt et les preuves de
nettoyage sont consignés dans `C8_RECETTE_ET_DRY_RUN_PREPRODUCTION.md`. La recette
humaine des cinq comptes est définie séparément dans
`C9_RECETTE_METIER_5_COMPTES_PREPRODUCTION.md`.

## Recette métier minimale

| Profil | Contrôle attendu |
|---|---|
| Agent terrain | Créer un constat sur son périmètre et voir uniquement ses dossiers autorisés |
| Évariste | Déposer uniquement sur GE-01 et soumettre la preuve à Faustin |
| Sylvain | Déposer uniquement sur WILO-01, RIA-01 ou IRR-01 et soumettre la preuve à Faustin |
| Laetitia | Accéder à RND-LET sans pouvoir déposer un rapport prestataire |
| Facility Manager | Qualifier, affecter, suivre l’intervention, valider la preuve et clôturer |
| Direction | Consulter tous les risques et valider les décisions autorisées |
| Lecture seule | Aucun compte actuellement ; rôle générique conservé pour un futur utilisateur nommé |

Les prestataires ne participent jamais à la connexion ni à la recette RLS :
ils n’ont aucun compte. Leurs entreprises restent des références affectables.
La matrice nominative est confirmée : Évariste et Sylvain uniquement. Frédéric
conserve la vue Direction et Faustin reste le validateur exclusif.

Parcours bloquant : créer une anomalie critique, terminer l’intervention,
tenter une clôture sans preuve — la base doit la refuser — puis déposer et
valider la preuve avant clôture.

## Feu vert production

- Préflight et recette réussis.
- RLS et Storage contrôlés avec chaque rôle réel.
- URL Auth, domaine, emails transactionnels et politique de mot de passe validés.
- Sauvegardes et restauration testées selon le plan Supabase retenu.
- Propriétaire métier, administrateur technique et procédure de support nommés.
- Données personnelles minimisées et durée de conservation des preuves validée.
- Aucun compte fictif, fixture `FIX-*` ou clé serveur dans le frontend.

Après ce feu vert, créer un second projet Supabase distinct pour la production
et appliquer exactement les mêmes migrations versionnées.
