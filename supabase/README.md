# BEHIRA FM/GB TRACK — Lot 0 backend

Cette fondation fournit une base Supabase/PostgreSQL locale et un raccordement frontend progressif, sans projet distant, sans clé versionnée et sans déploiement.

## Architecture

- Référentiel : `profiles`, `roles`, `user_roles`, `equipment`, `zones`, `vendors`, `categories`, `priority_definitions`, `sla_rules`, `workflow_stages`, `status_definitions`, `status_transitions`, `threshold_rules`, `notification_rules`.
- Terrain : `report_imports`, `reports`, `report_checks`.
- Registre : `anomalies`, `qualifications`, `anomaly_history`, `audit_events`.
- Exécution : `work_orders`, `interventions`, `proofs`, `costs`, `notifications`, `vendor_intervention_reports`.
- Autorisations nominatives : `profile_permissions` (Évariste et Sylvain uniquement pour le dépôt interne des rapports prestataires).
- Relations de périmètre : `equipment_zones`, `equipment_vendors` et les portées optionnelles de `user_roles`.

Toutes les clés techniques sont des UUID. Les références visibles sont générées côté base (`ANO-AAAA-000001`, `REP-…`, `OT-…`). Les codes métier du référentiel V3 restent uniques.

## Règles garanties dans la base

- Cycle explicite : Constat → Qualification → Décision → Intervention → Preuve → Clôture.
- Transitions vérifiées par `status_transitions`.
- Une anomalie critique ne peut être clôturée sans preuve acceptée.
- La dernière preuve acceptée d’une critique clôturée ne peut pas être supprimée ou rejetée.
- Un réarmement place l’anomalie en `temporary_reset` et bloque la clôture : il s’agit d’un rétablissement provisoire.
- Les échéances de qualification et d’intervention sont calculées depuis les SLA actifs.
- Les mutations importantes alimentent un audit générique et une timeline dédiée aux anomalies.
- L’approbation d’un coût par un utilisateur connecté exige le rôle Direction.

## Seed V3

`seed.sql` est idempotent et contient uniquement le référentiel de production : 76 zones, 11 équipements dont 7 dans le périmètre MVP, 5 profils internes confirmés, 2 permissions nominatives de dépôt, 5 entreprises prestataires de référence, 12 catégories, 5 niveaux de priorité/SLA, 14 statuts et 20 seuils après séparation ASC-A1/A2. Aucun profil Lecture seule n’est précréé.

Les valeurs `À renseigner` deviennent `NULL`. Les lignes ou paramètres encore incertains restent présents avec `data_status = 'to_confirm'` ou `to_fill` et conservent leur provenance (`source_system`, `source_row`, `source_notes`). Aucun email, téléphone ou identifiant de connexion n’est inventé. Les exemples d’anomalies sont isolés dans `fixtures/demo_anomalies.sql` et ne sont jamais appliqués par le seed.

## Ordre d’application

Supabase applique automatiquement les migrations dans l’ordre du nom :

1. `20260824000100_foundation.sql`
2. `20260824000200_reference_data.sql`
3. `20260824000300_operations.sql`
4. `20260824000400_business_rules.sql`
5. `20260824000500_rls.sql`
6. `20260825000100_service_role_access.sql`
7. `20260826000100_operational_workflow.sql`
8. `20260826122445_harden_function_execution.sql`
9. `20260826162326_remove_vendor_access_internal_vendor_report_upload.sql`
10. `20260826165211_grant_internal_vendor_report_permissions.sql`
11. `20260826170559_normalize_internal_agent_scopes.sql`
12. `20260826183000_require_first_password_change.sql`
13. `seed.sql`

La CLI Supabase est installée comme dépendance de développement du projet. Pour
démarrer ou reconstruire la pile locale :

```powershell
npx supabase start
npx supabase db reset
npm run test:db
```

`npm run test:db` reconstruit la base, réapplique volontairement le seed une
seconde fois pour prouver son idempotence, puis exécute les cinq suites pgTAP,
dont le verrou et le déverrouillage de première connexion.
Le script `supabase/tests/run.ps1` propose aussi un mode `psql` si
`BEHIRA_TEST_DATABASE_URL` pointe vers une base de test jetable. Ne jamais
utiliser une base de production pour ces tests, qui créent puis annulent des
fixtures.

## RLS et rattachement futur des comptes

- Direction : lecture globale, pilotage des risques et approbation des coûts.
- Facility Manager : lecture globale, qualification, affectation, suivi, clôture et administration limitée du référentiel.
- Agent terrain : rapports et anomalies de ses équipements/zones, interventions qui lui sont affectées.
- Prestataire : aucun rôle actif, aucun compte, aucune politique RLS et aucun accès Storage.
- Lecture seule : rôle générique conservé, sans profil ni compte précréé.

Les cinq profils internes validés sont reliés à leurs comptes de préproduction
auto-confirmés. Ils restent sans droit métier tant que leur mot de passe
temporaire n’a pas été remplacé. Aucun compte prestataire ou Lecture seule
n’est créé.

Le dépôt d’un rapport d’intervention externe est réalisé par un agent interne
porteur de la permission explicite `upload_vendor_intervention_report`. Cette
permission est séparée du rôle, révocable et bornable dans le temps. Elle est
attribuée à Évariste sur GE-01 et à Sylvain sur WILO-01, RIA-01 et IRR-01.
Laetitia, Frédéric et Faustin n’en disposent pas. Le rapport est stocké dans le bucket privé
`vendor-intervention-reports`, puis validé ou refusé par le Facility Manager.

## Variables futures

Copier `.env.example` vers un fichier local non versionné seulement au moment de l’intégration :

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_USE_SUPABASE` — laisser à `false` tant que le frontend conserve les données de démonstration
- `SUPABASE_SERVICE_ROLE_KEY` — serveur uniquement, jamais dans le frontend

Le client navigateur typé est préparé dans `app/lib/supabase`, mais il n'est
activé que lorsque `NEXT_PUBLIC_USE_SUPABASE=true`. Les types sont générés
depuis la base locale avec :

```powershell
npm run types:supabase > app/lib/supabase/database.types.ts
```

## Authentification locale

Le lot d'intégration local crée cinq comptes internes fictifs en `.invalid`, les rattache
aux profils métier et active le frontend via un fichier `.env.local` ignoré :

```powershell
npm run setup:auth:local
npm run test:auth:local
```

Le mot de passe commun reste celui affiché dans le panneau « Comptes de
démonstration ». Le sélecteur de persona disparaît en mode Supabase : l'espace
est alors déterminé par le profil et les rôles protégés par RLS. Le script
d'administration conserve la clé `service_role` dans `.env.local`, fichier
explicitement ignoré et réservé aux tests locaux. Elle n'est jamais préfixée
`NEXT_PUBLIC_`, transmise au navigateur ou ajoutée au dépôt.

Le même script applique ensuite `fixtures/demo_anomalies.sql`, un jeu local de
huit anomalies clairement préfixées `FIX-` en base. Le dashboard et le registre
chargent ces anomalies, les sept équipements MVP et les compteurs de référentiel
en lecture via RLS. En cas d'indisponibilité locale, le frontend conserve un
repli explicite sur son jeu de démonstration historique.

## Lot 3 — cycle opérationnel persistant

La migration `20260826000100_operational_workflow.sql` ajoute une tranche verticale
utilisable depuis le frontend : création d’un rapport terrain et de son anomalie,
qualification/affectation, ordre de travail, intervention, preuve et clôture. Les
fonctions transactionnelles refusent les sauts de workflow et contrôlent le rôle
appelant. Une critique reste verrouillée tant qu’aucune preuve n’est acceptée.

Les photos et PV sont déposés dans le bucket privé `anomaly-proofs` (10 Mo maximum,
JPG/PNG/WebP/PDF). Le chemin commence par l’UUID de l’anomalie et les politiques
Storage réutilisent le périmètre RLS du dossier. Un agent interne soumet une
preuve en attente ; le Facility Manager peut la valider. Les rapports d’entreprise
utilisent un bucket privé séparé et exigent en plus le droit nominatif. Le test de bout en bout est :

```powershell
npm run test:workflow:local
```

L’import de rapports en lot, les notifications et les arbitrages Direction restent
simulés dans ce lot accéléré. Ils seront traités après validation du parcours cœur.

## Vérifications

- `npm run verify:lot0` : inventaire, règles critiques, RLS, volumes du seed, séparation des fixtures et recherche de secrets.
- `npm run test:db` : contraintes, unicité, idempotence du seed, workflow critique, réarmement, historique/audit et périmètres RLS sur la base locale réelle.
- `npm run test:workflow:local` : cycle API complet, upload Storage privé, verrou critique, historique et refus d’écriture hors rôle.
- `supabase/tests/004_internal_vendor_reports.sql` : succès Évariste/Sylvain dans leur périmètre, refus Laetitia/Frédéric, stockage privé et validation Faustin uniquement.
- `npm run verify:supabase` : client typé présent, activation désactivée par défaut et absence de clé serveur côté navigateur.
- `npx supabase db lint --local --schema public --level warning --fail-on error` : contrôle statique des fonctions et objets du schéma applicatif, sans les faux positifs de l’extension pgTAP.
- `npm run build` : non-régression du frontend existant.

Avant de créer un projet distant, `npm run preflight:preprod` rejoue l’ensemble
des contrôles dans l’ordre et laisse la base locale avec ses huit fixtures. La
procédure de connexion, de recette et de feu vert est décrite dans
`docs/PREPRODUCTION.md`. Aucun seed ou fixture de démonstration ne doit être
appliqué à une base de production.
