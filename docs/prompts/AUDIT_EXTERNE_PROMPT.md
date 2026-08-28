# Prompt de lancement - Audit externe BEHIRA FM Track

Copier le texte ci-dessous dans Claude Code depuis la racine du projet.

---

Je souhaite une contre-analyse externe et rigoureuse du projet BEHIRA FM Track.

## Étape préalable obligatoire

Vérifie que le fichier PRD suivant existe, que son titre commence par `# PRD - BEHIRA FM Track`, puis lis-le entièrement :

`docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md`

Le présent fichier de lancement se trouve à un autre emplacement :

`docs/prompts/AUDIT_EXTERNE_PROMPT.md`

Ne confonds jamais ces deux fichiers. Si le PRD est absent, si son contenu correspond seulement à un prompt de lancement ou si tu n'as pas accès au dépôt, arrête l'audit et indique précisément ce qui manque. Ne simule pas l'analyse.

## Rôle

Tu agis uniquement comme auditeur externe. Codex reste le Dev Lead du projet et décidera, avec validation métier, quelles recommandations intégrer.

Compare le PRD avec :

- les fonctionnalités réellement présentes ;
- l'architecture frontend ;
- le modèle de données Supabase ;
- l'authentification, les rôles et permissions ;
- les politiques RLS, fonctions SQL et espaces Storage ;
- les parcours métier et tests existants ;
- la roadmap proposée.

## Restrictions

- Ne modifie aucun code, migration, configuration, test ou donnée.
- La seule écriture autorisée est `docs/audits/AUDIT_EXTERNE_2026-08-27.md`.
- Aucun `git commit`.
- Aucun `supabase db push`.
- Aucune commande MCP en écriture ou en lecture distante.
- Aucune installation ou mise à jour de dépendance.
- Aucune connexion au projet Supabase distant, au Dashboard Supabase ou à une base locale en exécution.
- L'analyse Supabase doit être fondée uniquement sur les fichiers présents dans le dépôt : migrations, seed, tests, types, clients et documentation.
- N'ouvre pas les fichiers `.env`, `.env.*` ou tout emplacement destiné aux secrets.
- Ne recherche, n'affiche et ne copie aucun mot de passe, jeton, clé privée ou secret.
- Si une valeur ressemblant à un secret apparaît accidentellement dans une sortie ou un fichier autorisé, remplace-la intégralement par `[REDACTED]`. Ne reproduis jamais la valeur, même partiellement.
- Si une exigence n'a aucune trace dans le dépôt, écris `non trouvé` au lieu de supposer.
- Tout constat P0 ou P1 sans preuve `fichier:ligne` doit être marqué `non vérifié`.

## Définitions des priorités

- **P0 - bloquant** : vulnérabilité exploitable, perte ou exposition de données, contournement d'autorisation, rupture d'un parcours métier critique, incohérence de données irréversible ou élément empêchant la recette et la livraison.
- **P1 - important avant production** : écart fonctionnel, sécurité insuffisante, dette d'architecture, défaut d'audit, risque de fiabilité ou problème d'expérience majeur qui doit être corrigé ou explicitement accepté avant la mise en production.
- **P2 - amélioration** : optimisation, finition, simplification ou confort qui n'empêche ni la sécurité, ni la recette, ni la mise en service contrôlée.

Ne classe pas un constat P0 uniquement parce qu'une fonctionnalité du PRD n'est pas encore développée. Évalue son impact au regard du stade actuel du projet.

## Ordre de lecture prioritaire

Examine les sources dans cet ordre :

1. `docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md` ;
2. `docs/DECISION_ACCES_PRESTATAIRES.md`, `docs/AUTH_FRONTEND_SIMULEE.md` et `docs/PREPRODUCTION.md` ;
3. `supabase/README.md`, puis `supabase/migrations/`, `supabase/seed.sql` et `supabase/tests/` ;
4. `app/lib/supabase/`, puis `app/page.tsx` et `app/globals.css` ;
5. les scripts de vérification cités dans le PRD ;
6. `package.json` et le lockfile réellement utilisé ;
7. les rapports historiques dans `outputs/`, uniquement comme contexte secondaire.

Si une source secondaire contredit le PRD ou une décision plus récente, signale la contradiction sans faire de la source secondaire la règle cible.

## Angles d'analyse obligatoires

Recherche notamment :

1. les exigences oubliées ou insuffisamment définies ;
2. les contradictions entre le PRD, le code et la base ;
3. les parcours incomplets ou incohérents ;
4. les risques fonctionnels, techniques, métier et de sécurité ;
5. les droits trop larges ou insuffisamment protégés ;
6. les erreurs ou biais possibles dans la logique des scores ;
7. les problèmes de fraîcheur, complétude ou qualité des données ;
8. les étapes manquantes ou mal ordonnées dans la roadmap ;
9. les composants existants à conserver ;
10. les questions supplémentaires à poser au métier ;
11. le besoin éventuel d'un mode hors ligne et la synchronisation ;
12. l'upload, la compression et la reprise des photos et PDF ;
13. les notifications, relances, échecs et escalades ;
14. la rétention, les sauvegardes et la restauration ;
15. les données personnelles, photos, éventuelle géolocalisation et confidentialité ;
16. la gouvernance RH et juridique du score individuel des agents.

## Format du rapport

Rédige uniquement le rapport :

`docs/audits/AUDIT_EXTERNE_2026-08-27.md`

Commence par indiquer :

- date de l'audit ;
- répertoire audité ;
- branche et commit, s'ils sont disponibles ;
- sinon, la mention `Git non disponible dans le répertoire audité` ;
- fichiers effectivement examinés ;
- limites rencontrées.

Structure ensuite le rapport ainsi :

### 1. Verdict exécutif

Dix lignes maximum.

### 2. Matrice de conformité

Tableau :

`Exigence du PRD | État dans le code | Écart | Risque | Recommandation | Preuve fichier:ligne`

### 3. Constats P0, P1 et P2

Applique strictement les définitions de priorité données dans ce prompt. Pour chaque constat : fait observé, impact, preuve, recommandation et validation nécessaire. Maximum 150 mots par constat.

### 4. Analyse par rôle

- Administration de la SCI Groupe Behira / Frédéric ;
- Faustin ;
- Évariste ;
- Sylvain ;
- Laetitia ;
- prestataires sans accès.

### 5. Analyse Supabase fondée sur le dépôt uniquement

Analyse uniquement les migrations, le seed, les tests, les types, les clients et la documentation présents dans le dépôt. Examine le schéma, Auth, RLS, fonctions, Storage, permissions, audit et changement du mot de passe temporaire. Ne confirme aucun état distant qui n'est pas prouvé par ces fichiers.

### 6. Cycle métier de bout en bout

`Ronde ou reporting -> Ticket -> Qualification -> Diagnostic -> Décision -> Intervention -> Devis et validations -> Réception -> Réserves -> Preuves -> Clôture -> Prévention`

### 7. Scores et données personnelles

Analyse la faisabilité, l'explicabilité, les données manquantes, les biais, les accès et les risques RH ou juridiques des trois niveaux de score.

### 8. Résilience terrain et médias

Analyse le réseau instable, le mode hors ligne éventuel, les conflits de synchronisation et le cycle de vie des photos et documents.

### 9. Questions métier manquantes

Liste uniquement les questions réellement bloquantes.

### 10. Roadmap recommandée

Confirme ou corrige l'ordre, les dépendances, les gates et les critères de validation.

### 11. Éléments à conserver

Identifie ce qu'il serait inutile ou dangereux de reconstruire.

### 12. Décisions prioritaires du Dev Lead

Termine par une liste courte et ordonnée des décisions que le Dev Lead doit examiner.

Ne commence aucune implémentation après le rapport.
