# Audit externe BEHIRA FM Track — 2026-08-27

- **Date de l'audit :** 2026-08-27
- **Répertoire audité :** `C:\Users\HP PC\Documents\Codex\2026-08-24\behira-fm-track-prototype\work\site`
- **Branche et commit :** Git non disponible dans le répertoire audité (`git rev-parse --show-toplevel` échoue avec « not a git repository »). Aucun `.git` détecté.
- **Rôle tenu :** auditeur externe en lecture seule. Codex reste Dev Lead ; aucune recommandation ci-dessous n'est appliquée.

## Fichiers effectivement examinés

- `docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md`, `docs/prompts/AUDIT_EXTERNE_PROMPT.md` (intégral)
- `docs/DECISION_ACCES_PRESTATAIRES.md`, `docs/AUTH_FRONTEND_SIMULEE.md`, `docs/PREPRODUCTION.md` (intégral)
- `supabase/README.md` (intégral)
- Les 12 migrations de `supabase/migrations/*.sql` (intégral)
- `supabase/seed.sql` (intégral)
- Les 5 fichiers `supabase/tests/*.sql` (intégral)
- `supabase/fixtures/demo_anomalies.sql`, `supabase/scripts/setup-local-auth.ps1`, `supabase/scripts/seed-local-auth.mjs` (intégral)
- `app/lib/supabase/config.ts`, `client.ts`, `auth.ts`, `data.ts`, `mutations.ts` (intégral) ; `database.types.ts` (2365 lignes, parcouru par recherche ciblée du nom des tables, non ligne à ligne)
- `app/page.tsx` (1226 lignes) : lecture intégrale des lignes 1-700 et 1130-1226 ; lecture ciblée par recherche de motifs pour les lignes 700-1130
- `scripts/verify-lot0.mjs`, `verify-supabase-readiness.mjs`, `verify-operational-workflow.mjs`, `verify-personas.mjs`, `verify-auth.mjs`, `preflight-preproduction.mjs`, `verify-first-password-change.mjs` (intégral)
- `package.json`, `pnpm-workspace.yaml`, `.env.example` (intégral) ; `package-lock.json` et `pnpm-lock.yaml` comparés par horodatage et par échantillonnage ciblé (résolution du paquet `next`), non diffés intégralement
- `.github/workflows/quality.yml`, `.github/workflows/supabase-preproduction.yml` (intégral)
- `outputs/BEHIRA_audit_visuel_complet_report.md`, `outputs/BEHIRA_authentification_frontend_report.md` (intégral, traités comme contexte historique secondaire uniquement)

**Non consultés délibérément :** `.env.local`, `.env.supabase.local` (exclus par consigne, jamais ouverts) ; `supabase/config.toml` ; `app/layout.tsx` ; `app/globals.css` (non ouvert directement — conclusions déduites des assertions vérifiées par `scripts/verify-personas.mjs:39-42,68-70` et `scripts/verify-auth.mjs:23-24`) ; `scripts/verify-local-auth.mjs`, `verify-fm-track-connection.mjs`, `audit-visual-styles.mjs` (listés, non ouverts) ; `node_modules/`, `.next/`, `.vinext/`, `.wrangler/`, `.openai/`, `dist/` (artefacts de build).

## Limites rencontrées

- Aucun accès Supabase distant, Dashboard ou base locale en exécution : les migrations n'ont pas été rejouées, la RLS n'a pas été testée en conditions réelles. L'analyse Supabase est fondée uniquement sur la lecture statique du SQL versionné et des tests pgTAP.
- `app/lib/supabase/database.types.ts` (2365 lignes) a été analysé par recherche de motifs plutôt que lu intégralement ; le décompte des tables en dérive.
- `app/globals.css` n'a pas été ouvert directement.
- `package-lock.json` (364 Ko) et `pnpm-lock.yaml` (219 Ko) n'ont pas été diffés intégralement ; la dérive documentée en Constat P1-06 repose sur les horodatages et un échantillon ciblé.
- `outputs/*.md` datent du 24 août 2026, avant le retrait de l'accès prestataire (26 août) : traités uniquement comme contexte historique, jamais comme référence normative.
- Aucun test applicatif (navigateur, `npm run build`, `npm run test:db`) n'a été exécuté : conforme à l'interdiction d'installer des dépendances ou de modifier l'état du dépôt.

---

## 1. Verdict exécutif

Le socle Supabase (schéma, RLS, audit, verrou de mot de passe temporaire, périmètres agents, retrait de l'accès prestataire) est solide, cohérent et couvert par des tests pgTAP ciblés : aucune faille P0 exploitable identifiée dans le code versionné. Le cycle métier cœur (constat → qualification → intervention → preuve → clôture critique verrouillée) est réellement persistant et testé de bout en bout. En revanche, le produit reste loin du mandat « zéro dossier zombie » : aucune des trois formules de score (équipement, bâtiment, agent) n'a de contrepartie en base au-delà d'un champ statique ; il n'existe aucune gestion des devis/réception/réserves reliée aux tables `costs` ; et aucune interface d'administration des utilisateurs n'existe pour Frédéric malgré l'exigence FR-06. L'écran de démonstration conserve un flux d'import de rapport en contradiction directe avec la décision métier validée, et un test automatisé (`verify:personas`) impose cette contradiction. Une dérive de lockfile (`next` 16.3.2 vs 16.3.3) menace la reproductibilité de `npm ci` en CI. Aucun mode hors ligne, pagination ou compression média n'existe — cohérent avec des décisions encore ouvertes, mais à trancher avant Phase 4.

---

## 2. Matrice de conformité

| Exigence du PRD | État dans le code | Écart | Risque | Recommandation | Preuve fichier:ligne |
|---|---|---|---|---|---|
| FR-01 Dossier complet avec responsable/prochaine action/échéance | `anomalies`, `work_orders`, `interventions`, `proofs` persistés et enchaînés par RPC | Aucune colonne « prochaine action », « acteur bloquant » ni « justification du retard » dans le schéma | Le dossier peut avancer sans que la règle anti-zombie (§8.3 PRD) soit vérifiable en base | Ajouter colonnes dédiées ou vue `dossier_zombie` avec contrainte | `supabase/migrations/20260824000300_operations.sql:62-97` (colonnes absentes) |
| FR-02 Cycle à 3 branches (interne sans coût / interne avec coût / externe) | `status_transitions` + `advance_anomaly_workflow` gèrent interne vs prestataire | La distinction « interne sans coût » vs « interne avec coût » n'existe pas comme branche formelle (`decision_code` n'a pas de valeur dédiée) | Suivi financier d'une intervention interne payante non distingué d'une intervention gratuite | Ajouter une valeur `decision_code` ou un indicateur `has_cost` sur `qualifications` | `supabase/migrations/20260824000300_operations.sql:106` ; `supabase/seed.sql:255-281` |
| FR-03 Saisie directe, aucun import requis | `create_field_anomaly` RPC fonctionnelle | L'UI conserve un onglet « Import d'un rapport » simulé qui génère 3 fausses anomalies | Contradiction visible avec la décision validée §15 ; confusion utilisateur en démonstration/recette | Retirer l'onglet ou le requalifier explicitement « désactivé » | `app/page.tsx:1217,1222-1223` vs `docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md:120,583` |
| FR-04 Centre de décision Faustin | Composant `Manager` avec onglets qualifier/retards/preuves | Segmentation calculée côté client sur l'ensemble des dossiers chargés ; aucune vue devis/réserves | Montera mal en charge avec un volume réel ; ne couvre pas §9.2 en entier | Ajouter vues serveur filtrées + écrans devis/réserves | `app/page.tsx:1177-1184` ; `app/lib/supabase/data.ts:80-179` |
| FR-05 Clôture critique verrouillée y compris par API directe | Trigger `prepare_anomaly` + `has_accepted_proof`, testé | Aucun | Aucun | RAS — à conserver | `supabase/migrations/20260824000400_business_rules.sql:170-179` ; `supabase/tests/002_workflow_audit.sql:64-69` |
| FR-06 Gestion des utilisateurs par l'Administration sans exposition de clé serveur | Non implémenté dans l'application | Aucun écran « Utilisateurs et accès » ; aucune RPC d'administration de compte ; seul un script local hors app utilise `service_role` | Frédéric ne peut pas créer/désactiver un agent depuis l'app comme l'exige §6.1 et le critère de succès §18 | Concevoir un composant serveur (route handler / edge function) dédié, testé comme `supabase/tests/005` | Aucune vue trouvée dans `app/page.tsx` ; `supabase/scripts/seed-local-auth.mjs:1-79` (hors app) |
| FR-07 Périmètres stricts par équipement/zone | `can_access_equipment`/`can_access_zone`, testé pour Évariste/Sylvain/Laetitia | Aucun | Aucun | RAS — à conserver | `supabase/migrations/20260826170559_normalize_internal_agent_scopes.sql:68-90` ; `supabase/tests/004_internal_vendor_reports.sql:36-38,60-61` |
| FR-08 Interdire tout accès prestataire | Rôle `vendor` désactivé, trigger `prevent_vendor_role_assignment`, testé | Aucun | Aucun | RAS — à conserver | `supabase/migrations/20260826162326_remove_vendor_access_internal_vendor_report_upload.sql:4-57` ; `supabase/tests/003_rls.sql:18-35` |
| FR-09 Dépôt interne de rapport prestataire | `has_permission`, `profile_permissions`, `register_vendor_intervention_report`, validation Faustin, testé | Aucun majeur | Aucun | RAS — à conserver | `supabase/migrations/20260826162326_....sql:620-802` ; `supabase/tests/004_internal_vendor_reports.sql` |
| FR-10 Devis, coûts, validations | Table `costs` + RLS d'approbation Direction | Aucune UI reliée ; le formulaire de rapport prestataire n'a qu'un champ texte « Coût indiqué » non relié à `public.costs` | Direction ne peut pas réellement arbitrer un seuil financier via l'app | Construire un écran devis/coûts relié à `costs`, avec seuil configurable | `supabase/migrations/20260824000300_operations.sql:182-202` ; `app/page.tsx:1087` |
| FR-11 Réception et réserves | Non implémenté comme entité structurée ; seul `reserve_notes` texte libre existe | Pas de statut de réserve, ni responsable/échéance de levée | Réserves non traçables comme l'exige §8.2 points 12-13 | Ajouter une table `reserves` (responsable, échéance, preuve de levée) | `supabase/migrations/20260826162326_....sql:97` (colonne texte seule) |
| FR-12 Score de santé équipement | Non implémenté ; `equipment.health_score` est un champ statique saisi au seed | Écart total avec la pondération 30/25/20/15/10 §10.1 | KPI affiché non explicable ni recalculé | Créer une fonction de calcul versionnée + historique par équipement | `supabase/migrations/20260824000200_reference_data.sql:86` ; aucune fonction de calcul dans les 12 migrations |
| FR-13 Score global du bâtiment | Non implémenté | Écart total avec la formule 70/15/10/5 et le plafond à 50 en cas d'équipement vital indisponible | KPI Direction absent malgré le critère « vérifiable par test » | Implémenter la formule + tests pgTAP dédiés | Aucune table ni fonction « building_score » trouvée |
| FR-14 Score de traitement des agents | Non implémenté | Écart total | Gouvernance RH impossible à valider sans mécanisme concret | Implémenter avec limitation d'accès dès la conception | Aucune table « agent_score » trouvée |
| FR-15 Alertes et dossiers zombies | Tables `notifications` et `notification_rules` peuplées au seed | Aucun déclencheur (trigger, cron, edge function) constaté qui peuple `notifications` selon les règles | Les relances/échéances définies ne se déclenchent jamais en pratique | Implémenter le déclencheur manquant | `supabase/migrations/20260824000300_operations.sql:204-223` (table seule) ; aucun trigger « notification » dans les 12 migrations |
| FR-16 Consolidation technique/cleaning/paysager | Non implémenté ; catégories `NET`/`ESP` existent mais aucune vue consolidée | Écart | Risque de sources multiples si construit sans vue commune (point de vigilance §14.12) | Construire une vue SQL consolidée par famille de catégorie | `supabase/seed.sql:139-160` |
| FR-17 Historique et audit | `anomaly_history` + `audit_events` génériques, triggers systématiques, testé | Aucun majeur | Aucun | RAS — à conserver | `supabase/migrations/20260824000400_business_rules.sql:196-247,353-428` ; `supabase/tests/002_workflow_audit.sql:85-91` |
| FR-18 Parcours mobile optimisé | CSS responsive avec points de rupture 430/700/900/1180px, vérifié statiquement | Non testé visuellement dans le cadre de cet audit (lecture seule, aucun lancement d'app) | Risque UX résiduel non contrôlé | Confirmer par test manuel réel avant recette | `scripts/verify-personas.mjs:39-41` (assertions CSS) — non vérifié visuellement ici |
| Zones : 76 vs 78 (§14.1) | Seed contient 76 zones, confirmé par test et script statique | La source du chiffre « 78 » n'apparaît nulle part dans le dépôt | Écart de référentiel externe non résolu | Confirmer la source de vérité avec le métier | `supabase/seed.sql:34-109` (76 lignes) ; `supabase/tests/001_schema_seed.sql:14` ; `scripts/verify-supabase-readiness.mjs:77` ; « 78 » : non trouvé dans le dépôt |
| `report_imports` (§14.2) | Table et RLS actives, mais jamais appelées par le frontend | Table orpheline vs décision « aucun import requis » | Dette de schéma, confusion possible pour un futur développeur | Décider explicitement : dépréciation documentée ou suppression en migration ultérieure | `supabase/migrations/20260824000300_operations.sql:3-20` ; `supabase/migrations/20260825000100_service_role_access.sql:291-305` ; aucune référence dans `app/lib/supabase/*.ts` |
| Verrou mot de passe temporaire (§7.3, §12) | Mécanisme `must_change_password` implémenté et testé | Le seul script de provisioning réel (`seed-local-auth.mjs`) ne positionne jamais `must_change_password=true` | Le chemin de création de compte effectivement utilisé ne prouve pas l'invariant en pratique | Aligner le script de provisioning réel sur le pattern de `supabase/tests/005` | `supabase/scripts/seed-local-auth.mjs:36-74` (pas de `must_change_password`) vs `supabase/tests/005_first_password_change.sql:16-22` |

---

## 3. Constats P0, P1 et P2

Aucun constat P0 n'a été retenu : le socle sécurité/RLS/audit est robuste et testé, et les écarts fonctionnels identifiés relèvent de fonctionnalités non encore développées dont l'absence n'empêche ni la sécurité, ni l'intégrité des données déjà en place, conformément à la consigne de ne pas classer P0 une simple fonctionnalité manquante.

### P1-01 — Aucune interface d'administration des utilisateurs (FR-06)
**Fait observé :** aucune vue « Utilisateurs et accès » dans `app/page.tsx` ; le seul mécanisme de création de compte est un script local (`supabase/scripts/seed-local-auth.mjs`) utilisant `service_role` en variable d'environnement, hors de l'application. **Impact :** Frédéric ne peut pas créer/désactiver un agent ni réinitialiser un mot de passe depuis l'app, contrairement à §6.1 et au critère de succès §18. **Preuve :** `app/page.tsx` (aucune occurrence de « Utilisateurs ») ; `supabase/scripts/seed-local-auth.mjs:1-79`. **Recommandation :** concevoir un composant serveur sécurisé dédié avant la Phase 5. **Validation nécessaire :** Administration + Dev Lead.

### P1-02 — Scores équipement, bâtiment et agent totalement absents de la base (FR-12/13/14)
**Fait observé :** seuls deux champs numériques statiques existent (`equipment.health_score`, `reports.score`) ; aucune fonction, aucune table de score bâtiment/agent, aucun historique de formule. **Impact :** les tableaux de bord Direction/Faustin affichent des indicateurs non calculés, non explicables, non historisés — contraire à §10 et §12. **Preuve :** `supabase/migrations/20260824000200_reference_data.sql:86` ; `supabase/migrations/20260824000300_operations.sql:34` ; aucune fonction « score » dans les 12 migrations. **Recommandation :** concevoir le calcul et son versionnement dès la Phase 2/3, avant tout affichage. **Validation nécessaire :** Dev Lead + Administration (gouvernance) + Faustin.

### P1-03 — Contradiction entre l'UI de démonstration et la décision « aucun import requis »
**Fait observé :** `app/page.tsx` conserve un onglet « Import d'un rapport » qui simule l'extraction de 3 anomalies fictives ; `scripts/verify-personas.mjs` impose la présence de ce texte, ce qui bloquerait sa suppression sans modifier le test. **Impact :** contredit directement §5 point 2 et §15 du PRD ; un développeur qui retire l'import casse la vérification automatisée. **Preuve :** `app/page.tsx:1217,1222-1223` ; `scripts/verify-personas.mjs:61-63` ; `docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md:120,583`. **Recommandation :** retirer l'onglet et son test associé, ou le requalifier explicitement comme fonctionnalité écartée. **Validation nécessaire :** Dev Lead.

### P1-04 — Devis, réception et réserves non reliés aux données financières (FR-10/FR-11)
**Fait observé :** la table `costs` existe avec RLS d'approbation par la Direction, mais le seul point d'entrée UI est un champ texte libre « Coût indiqué » dans le formulaire de dépôt de rapport prestataire, non relié à `public.costs` ; aucune structure de réserve avec responsable/échéance. **Impact :** aucun arbitrage de seuil financier réellement pilotable par Faustin/Direction. **Preuve :** `app/page.tsx:1087` ; `supabase/migrations/20260824000300_operations.sql:182-202` ; `supabase/migrations/20260826162326_....sql:97`. **Recommandation :** construire les écrans devis/réception/réserves en Phase 5, avec table `reserves` dédiée. **Validation nécessaire :** Faustin + Administration.

### P1-05 — Aucun déclencheur n'alimente les règles de notification (FR-15)
**Fait observé :** `notification_rules` et `notifications` sont peuplées au seed, mais aucun trigger, cron ou edge function ne génère de ligne dans `notifications` selon ces règles. **Impact :** les relances/échéances/escalades définies dans le référentiel ne se déclenchent jamais dans le code actuel. **Preuve :** `supabase/migrations/20260824000300_operations.sql:204-223` ; absence confirmée de déclencheur dans les 12 migrations. **Recommandation :** implémenter le mécanisme d'émission avant que Faustin ne dépende de ces alertes. **Validation nécessaire :** Dev Lead.

### P1-06 — Dérive de lockfile menaçant la reproductibilité de la CI
**Fait observé :** `pnpm-lock.yaml` (généré 2026-08-27 02:08, résolvant `next@16.3.3`) est postérieur et incohérent avec `package-lock.json` (généré 2026-08-25 01:18, pinné sur `next@16.3.2`), lui-même antérieur à la dernière modification de `package.json` (2026-08-26 19:26). La CI (`quality.yml`) exécute `npm ci`, qui échoue si `package.json` et `package-lock.json` divergent. **Impact potentiel :** blocage de la CI et donc de la recette/livraison si `npm ci` rejette le lockfile désynchronisé — non confirmé par exécution (installation interdite dans cet audit). **Preuve :** horodatages `package.json`, `package-lock.json`, `pnpm-lock.yaml` ; `next@16.3.2` (`package-lock.json`, entrée `node_modules/next`) vs `next@16.3.3` (`pnpm-lock.yaml`) ; `.github/workflows/quality.yml:20-21`. **Recommandation :** régénérer `package-lock.json` avec `npm install` puis vérifier `npm ci` en CI ; clarifier quel gestionnaire de paquets fait foi (le `pnpm-workspace.yaml` récent suggère un usage local de pnpm non aligné avec la CI npm). **Validation nécessaire :** Dev Lead.

### P1-07 — Le seul script de provisioning réel ne pose pas le verrou de première connexion
**Fait observé :** `supabase/scripts/seed-local-auth.mjs` crée/actualise les comptes Auth et positionne `account_status: "active"` sans jamais définir `must_change_password=true` ni `temporary_password_set_at`, alors que ces colonnes existent précisément pour cet usage et sont testées ailleurs. **Impact :** le chemin de provisioning effectivement exécuté ne prouve pas en pratique l'invariant « aucun droit métier avant changement du mot de passe temporaire » (§7.1 point 7, §12). **Preuve :** `supabase/scripts/seed-local-auth.mjs:36-74` ; comparer avec `supabase/tests/005_first_password_change.sql:16-22` et `scripts/verify-first-password-change.mjs:49-66` qui, eux, positionnent bien le verrou. **Recommandation :** aligner le futur outil d'administration réel (P1-01) sur le pattern déjà testé, avec mot de passe temporaire généré aléatoirement (pas le mot de passe démo partagé). **Validation nécessaire :** Dev Lead + Administration.

### P2-01 — Absence de pagination sur le registre des anomalies
**Fait observé :** `loadOperationalSnapshot` charge l'intégralité de la table `anomalies` sans `.range()` ni limite. **Scénario d'échec :** au-delà de quelques centaines de dossiers réels, le registre chargera l'intégralité des lignes côté client à chaque ouverture. **Preuve :** `app/lib/supabase/data.ts:94`. **Recommandation :** ajouter pagination/filtre serveur avant la Phase 6 (pilote réel). **Validation :** Dev Lead.

### P2-02 — Rôle `read_only` par défaut très large si activé un jour
**Fait observé :** `read_only` est inclus dans la quasi-totalité des politiques `has_any_role(['direction','facility_manager','read_only'])`, y compris pour `audit_events` (données personnelles potentielles dans `old_data`/`new_data`). Aucun compte `read_only` n'existe actuellement (`profiles` LECTURE supprimé/suspendu). **Scénario d'échec :** si un compte Lecture seule est créé sans revue de ce périmètre, il verra l'intégralité de l'audit et des coûts, ce qui n'a pas été validé métier (§16 point 6). **Preuve :** `supabase/migrations/20260824000500_rls.sql:477-479` (politique `audit_read`). **Recommandation :** documenter/valider le périmètre exact de `read_only` avant toute création de compte. **Validation :** Administration.

### P2-03 — Table `report_imports` orpheline
**Fait observé :** table, index et politiques RLS actifs, jamais appelés par le frontend. **Impact :** dette de schéma sans risque de sécurité actif (RLS correcte). **Preuve :** `supabase/migrations/20260824000300_operations.sql:3-20` ; aucune référence dans `app/lib/supabase/*.ts`. **Recommandation :** décider explicitement dépréciation documentée vs suppression en migration future. **Validation :** Dev Lead.

### P2-04 — Bouton « Exporter » du registre sans action câblée
**Fait observé :** le bouton « ⇩ Exporter » n'a pas de gestionnaire `onClick`. **Impact :** confusion utilisateur mineure en démonstration. **Preuve :** `app/page.tsx:1171`. **Recommandation :** retirer ou implémenter avant recette. **Validation :** Dev Lead.

---

## 4. Analyse par rôle

**Administration de la SCI Groupe Behira / Frédéric (`direction`).** Rôle actif en base, lecture globale confirmée par RLS (`has_any_role(['direction', ...])` sur la quasi-totalité des tables), approbation exclusive des coûts (`validate_cost_approval`, `supabase/migrations/20260824000400_business_rules.sql:331-351`) et des décisions de risque (`validate_anomaly_risk`). Aucune capacité de gestion des utilisateurs n'existe dans l'app (voir P1-01) : l'écart le plus significatif entre le PRD §6.1 et le code actuel. Les tableaux de bord Direction dans `app/page.tsx:955-994` sont alimentés par des données de démonstration statiques (`seedEscalations`), pas par les tables `costs`/`anomalies` réelles pour les blocs Coûts/Performance.

**Faustin (`facility_manager`).** Rôle le plus outillé côté base : qualification (`advance_anomaly_workflow`), gestion du référentiel (`reference_manage`), validation des preuves et des rapports prestataires, seul rôle pouvant clôturer (`p_target = 'Clôturée'` réservé à `facility_manager`, `supabase/migrations/20260826162326_....sql:...`). Le composant `Manager` (`app/page.tsx:1177-1184`) couvre qualifier/retards/preuves mais pas devis/réception/réserves (P1-04).

**Évariste (agent GE-01).** Périmètre strictement limité à `GE-01` par `user_roles` et `can_access_equipment`, vérifié par `supabase/tests/001_schema_seed.sql:35-39` et `004_internal_vendor_reports.sql:33-51`. Permission nominative `upload_vendor_intervention_report` active et testée. Aucune capacité de validation finale, conforme au PRD.

**Sylvain (agent WILO-01/RIA-01/IRR-01).** Périmètre multi-équipement correctement modélisé (trois lignes `user_roles`), testé de façon symétrique à Évariste (`supabase/tests/001_schema_seed.sql:40-44` ; `004_internal_vendor_reports.sql:54-68`).

**Laetitia (agente RND-LET / assistante).** Rattachée au seul équipement `RND-LET`, sans permission de dépôt prestataire — confirmé par le test `004_internal_vendor_reports.sql:70-90` (rejet explicite). Le PRD §6.5 exige une séparation visuelle entre ses tâches d'agente et d'assistante ; le composant `LaetitiaWorkspace` (`app/page.tsx:1094-1120`, non lu intégralement dans cet audit) n'a pas été vérifié en détail sur ce point précis — à confirmer visuellement.

**Prestataires sans accès.** Rôle `vendor` désactivé (`is_active=false`), trigger `prevent_vendor_role_assignment` empêchant toute nouvelle affectation, comptes suspendus par migration, aucun persona ni portail dans le frontend (confirmé par `scripts/verify-personas.mjs:53-57`). Les entreprises restent des données de référence (`vendors`) rattachées aux interventions/coûts/rapports, conformément à `docs/DECISION_ACCES_PRESTATAIRES.md`. Traitement cohérent et robuste.

---

## 5. Analyse Supabase fondée sur le dépôt uniquement

**Schéma.** 31 tables au total dans `database.types.ts` généré ; 26 d'entre elles sont suivies explicitement par `scripts/verify-lot0.mjs:34-41` (le différentiel de 5 — `workflow_stages`, `status_transitions`, `equipment_zones`, `equipment_vendors`, `reference_counters` — correspond à des tables structurelles/techniques non comptées par ce script, pas à une incohérence). Toutes les tables métier sensibles ont RLS activée (`alter table ... enable row level security`, `supabase/migrations/20260824000500_rls.sql:192-205`) et un `revoke all ... from anon` systématique.

**Auth.** Identité portée par `auth.users`, résolution du profil exclusivement via `current_profile_id()` (fonction `SECURITY DEFINER`, jamais via des métadonnées modifiables côté client). Le verrou de première connexion (`must_change_password`) est intégré directement dans `current_profile_id()` (`supabase/migrations/20260826183000_require_first_password_change.sql:28-41`), ce qui neutralise en cascade tous les rôles/permissions/RLS tant que le mot de passe temporaire n'est pas changé — architecture robuste et testée (`supabase/tests/005_first_password_change.sql`). Point faible : le script de provisioning réel ne l'active pas (P1-07).

**RLS.** Politiques cohérentes, revues à trois reprises entre le 24 et le 26 août pour retirer l'accès prestataire et resserrer le périmètre agent (`can_access_anomaly` ne dépend plus de `reported_by_profile_id`/`assigned_profile_id` depuis `20260826170559_normalize_internal_agent_scopes.sql:68-90` — c'est-à-dire que l'ouverture d'une question au PRD §16 point 6 est en réalité déjà tranchée dans le code en faveur du périmètre strict, ce qui doit être confirmé comme décision définitive plutôt que laissé « ouvert »).

**Fonctions privilégiées.** Toutes les fonctions `SECURITY DEFINER` ont un `search_path` fixé explicitement (`set search_path = public, auth, pg_temp` ou équivalent), pratique correcte contre le détournement de search_path. `20260826122445_harden_function_execution.sql` applique une posture *deny-by-default* (`revoke execute ... from public, anon, authenticated` puis `grant` nominatif), ce qui répond directement à l'alerte Supabase mentionnée en §14.7 du PRD sur les fonctions `SECURITY DEFINER` trop permissives. Aucune fonction accordée à `anon` n'a été trouvée.

**Storage.** Deux buckets privés (`anomaly-proofs`, `vendor-intervention-reports`), `public=false`, `file_size_limit=10485760`, types MIME restreints à JPG/PNG/WebP/PDF. Les politiques Storage réutilisent les fonctions RLS applicatives (`public.can_access_anomaly`) et vérifient que le chemin commence par l'UUID de l'agent authentifié pour les rapports prestataires (`(storage.foldername(name))[1] = auth.uid()::text`), empêchant un agent autorisé de déposer sous l'identité d'un autre.

**Permissions/audit.** `audit_events` alimentée par un trigger générique sur 16 tables, lecture réservée à `direction`/`facility_manager`/`read_only` (voir P2-02 pour la portée de ce dernier). `anomaly_history` capture chaque transition avec acteur et `change_set`. Le mécanisme d'audit est désactivé pendant le seed (`app.seed_mode = 'on'`), évitant de polluer l'audit avec les données de référence — bonne pratique.

---

## 6. Cycle métier de bout en bout

| Étape | État | Preuve |
|---|---|---|
| Ronde/reporting | Implémenté via `create_field_anomaly`, qui crée un `report` et une `anomaly` liés en une transaction | `supabase/migrations/20260826000100_operational_workflow.sql:76-165` |
| Ticket | `anomalies` avec référence générée serveur (`ANO-AAAA-000000`) | `supabase/migrations/20260824000100_foundation.sql:27-53` |
| Qualification | `advance_anomaly_workflow(p_target='Affectée')`, réservé à `facility_manager`, avec affectation automatique agent/prestataire | `supabase/migrations/20260826162326_....sql:425-483` |
| Diagnostic | Modélisé par `interventions.outcome='diagnosis_only'` au démarrage | `supabase/migrations/20260824000300_operations.sql:132-150` |
| Décision (3 branches) | Partiellement modélisée (voir écart FR-02 en matrice) | — |
| Intervention | `interventions` + `work_orders`, testé de bout en bout | `scripts/verify-operational-workflow.mjs:51-58` |
| Devis et validations | Table `costs` existe, non reliée à l'UI (P1-04) | `supabase/migrations/20260824000300_operations.sql:182-202` |
| Réception | Non modélisée comme étape distincte | — |
| Réserves | Champ texte libre uniquement (`reserve_notes`) | `supabase/migrations/20260826162326_....sql:97` |
| Preuves | `proofs` avec verrou critique, testé | `supabase/tests/002_workflow_audit.sql:64-83` |
| Clôture | Verrouillée par trigger, y compris contre un appel API direct | `supabase/migrations/20260824000400_business_rules.sql:170-179` |
| Prévention (récurrence) | Règle de notification déclarée (`NTF-3_ANOMALIES_M_ME_EQUIPEMENT_30_JOURS`) mais aucun déclencheur (P1-05) | `supabase/seed.sql:343` |

Le cycle est donc réel et testé jusqu'à la clôture technique, mais s'arrête net avant les étapes financières (devis, réception, réserves) et la boucle de prévention automatisée.

---

## 7. Scores et données personnelles

**Faisabilité.** Les trois formules du PRD (§10.1-10.3) sont précises et calculables en SQL (pondérations numériques, plafonds explicites), mais aucune n'est implémentée (P1-02). Le risque principal signalé par le PRD lui-même — qu'une absence de contrôle récent améliore artificiellement un score — n'a pas de garde-fou possible à évaluer puisqu'aucun calcul n'existe encore.

**Explicabilité.** Aucun mécanisme de versionnement de formule ni d'historique de score n'existe en base ; à concevoir dès la première implémentation pour respecter §10.4 (« chaque changement de formule doit être versionné et historisé »).

**Données manquantes/biais.** Le champ `equipment.health_score` est une valeur figée au seed (ex. `GE-01`: 75, `RIA-01`: 85) sans lien avec les anomalies réelles — actuellement trompeur s'il était affiché tel quel en production.

**Accès.** `direction` et `facility_manager` ont un accès complet confirmé par les RLS actuelles. La visibilité par un agent de son propre score n'est câblée nulle part (aucune donnée à afficher). Le rôle `read_only`, non utilisé actuellement, hériterait par défaut du même accès complet que `direction`/`facility_manager` sur les scores et l'audit si un compte était créé (P2-02) — point à trancher avant toute activation.

**Risques RH/juridiques.** Le PRD (§12, §16 point 23) demande explicitement une validation RH et juridique avant mise en production du score agent ; rien dans le dépôt ne montre qu'une telle revue a eu lieu ou est planifiée avec un interlocuteur identifié. C'est une décision métier bloquante pour la Phase 5/7, pas un défaut technique.

---

## 8. Résilience terrain et médias

**Réseau instable / mode hors ligne.** Aucune trace de queue de synchronisation, de détection `navigator.onLine`, de service worker ou de stockage local différé n'a été trouvée dans `app/` (recherche ciblée sans résultat). Cohérent avec le fait que la décision reste ouverte (§16 point 19), mais signifie que l'architecture actuelle des formulaires ne pourrait pas absorber un mode hors ligne sans refonte des mutations (`app/lib/supabase/mutations.ts` effectue des appels RPC/Storage synchrones, sans file d'attente).

**Conflits de synchronisation.** Non applicable en l'absence de mode hors ligne ; à concevoir en même temps que la décision d'architecture.

**Cycle de vie des photos/PDF.** Bonne pratique constatée : `uploadAnomalyProof` (`app/lib/supabase/mutations.ts:64-102`) attend la confirmation du `storage.upload` avant d'appeler `register_anomaly_proof`, et supprime le fichier Storage si l'enregistrement RPC échoue — respecte l'exigence « ne jamais déclarer une preuve enregistrée tant que le stockage distant n'a pas confirmé » (§12). En revanche : aucune compression côté client, aucune reprise d'upload en cas de coupure, taille limitée à 10 Mo côté base (`p_size_bytes > 10485760` rejeté) mais sans retour progressif ni file d'attente en cas d'échec réseau partiel.

---

## 9. Questions métier manquantes

Limitées aux points réellement bloquants et non déjà listés de façon suffisante dans le PRD §16 :

1. Le code a déjà tranché la visibilité des dossiers agents en faveur d'un périmètre strict (`can_access_anomaly` ne dépend plus de `reported_by_profile_id`) depuis le 26 août — cette décision doit-elle être formellement validée comme définitive, ou le PRD doit-il être mis à jour pour ne plus la lister comme « ouverte » (§16 point 6) ?
2. Le rôle `read_only`, hérite par défaut d'un accès complet aux coûts et à l'audit (P2-02) : quel périmètre exact doit-il avoir le jour où un compte Lecture seule sera réellement créé ?
3. La table `report_imports` doit-elle être supprimée, ou conservée en dépréciation documentée pour une éventuelle migration initiale de données historiques ?
4. Quel outil (npm ou pnpm) doit faire foi pour l'installation et la CI, étant donné la dérive de lockfile constatée (P1-06) ?
5. Le mot de passe temporaire réel remis à un agent doit-il être généré aléatoirement par compte (comme le montre `scripts/verify-first-password-change.mjs`), ou le mot de passe démo partagé restera-t-il utilisé au-delà de la phase de démonstration ?

---

## 10. Roadmap recommandée

La roadmap proposée en §17 du PRD est globalement cohérente et bien séquencée (gate Phase 0 → validation métier → maquettes → cœur opérationnel → rondes → pilotage/scores → pilote réel → durcissement). Corrections proposées :

- **Phase 3 (cœur opérationnel)** devrait explicitement inclure la résolution de P1-03 (retrait de l'incohérence import) et P1-07 (alignement du provisioning sur le verrou de mot de passe), car ce sont des corrections de dette immédiate sur le socle déjà livré, pas de nouvelles fonctionnalités — les traiter avant la Phase 4 évite de les propager dans le pilote terrain.
- **Phase 4 (rondes et reportings)** ne peut pas démarrer sereinement tant que la décision sur le mode hors ligne (§16 point 19) n'est pas prise : l'architecture des formulaires en dépend directement (voir Section 8). Ajouter un jalon explicite de décision avant le début de cette phase, pas seulement en Phase 1.
- **Phase 5 (pilotage, finance, scores)** est correctement positionnée pour les scores et devis/réception/réserves, mais sa durée indicative de 2 semaines paraît optimiste au vu de l'absence totale de code existant pour les trois formules de score (P1-02) et pour le module financier (P1-04) — à rediscuter avec le Dev Lead au moment du chiffrage détaillé.
- **Gate de Phase 0** (« aucun P0 non compris ou sans propriétaire ») est atteignable : aucun P0 n'a été retenu par cet audit, sous réserve que les propriétaires des 7 constats P1 soient désignés.
- Ajouter un jalon explicite « vérification `npm ci` en environnement propre » avant la fin de la Phase 0, pour lever le doute sur P1-06 sans attendre la CI réelle.

---

## 11. Éléments à conserver

- Le schéma relationnel complet (référentiel, cycle, exécution, autorisations nominatives) et ses 12 migrations versionnées : cohérent, testé, sans dette de sécurité identifiée.
- Le mécanisme de verrou de clôture critique (`prepare_anomaly`, `guard_closed_critical_proof`) : correctement irréversible même par appel API direct.
- L'architecture RLS et les fonctions `SECURITY DEFINER` à `search_path` fixé, avec la posture *deny-by-default* introduite le 26 août.
- Le verrou de première connexion (`must_change_password`) intégré au cœur de `current_profile_id()` : élégant et déjà testé (`supabase/tests/005`).
- Le retrait complet et testé de l'accès prestataire (rôle désactivé, trigger de garde, comptes suspendus, RLS Storage).
- La séparation stricte entre mode démonstration et intégration Supabase réelle (`NEXT_PUBLIC_USE_SUPABASE`, `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK`), avec garde-fous vérifiés statiquement (`scripts/verify-supabase-readiness.mjs`, `scripts/verify-lot0.mjs`).
- La suite de vérifications statiques et pgTAP (`scripts/verify-*.mjs`, `supabase/tests/*.sql`) : à étendre plutôt qu'à remplacer, à mesure que de nouvelles fonctionnalités sont ajoutées.
- Le typage TypeScript généré (`database.types.ts`) et la structure des modules `app/lib/supabase/` (config/client/auth/data/mutations) : séparation des responsabilités propre, à réutiliser pour les futurs modules (devis, réserves, scores, administration des utilisateurs).

---

## 12. Décisions prioritaires du Dev Lead

1. Statuer sur la contradiction import (P1-03) : retirer l'onglet et le test associé, ou documenter formellement pourquoi il reste.
2. Vérifier `npm ci` en environnement propre et régénérer le lockfile faisant foi (P1-06) avant toute autre modification de `package.json`.
3. Désigner un propriétaire pour la conception de l'écran d'administration des utilisateurs (P1-01), prérequis à la Phase 5 et au critère de succès §18.
4. Décider si la visibilité stricte par périmètre déjà implémentée dans le code (`can_access_anomaly`) doit être actée comme décision définitive du PRD §16 point 6.
5. Planifier la conception des trois formules de score (P1-02) suffisamment tôt pour respecter la Phase 5, en coordination avec la validation RH/juridique du score agent (§12, §16 point 23).
6. Trancher le périmètre du rôle `read_only` (P2-02) avant toute création d'un premier compte Lecture seule.
7. Aligner le futur outil de provisioning de comptes sur le pattern déjà testé du verrou de mot de passe temporaire (P1-07), plutôt que sur le script de démonstration actuel.
