# BEHIRA FM Track — Lot B documentaire

## Spécification technique du modèle cible de la règle anti-dossier-zombie

Date : 28 août 2026

Checkpoint d'entrée : `3a12396`

Statut : spécification technique proposée, sans implémentation

Périmètre : sources canoniques des huit informations de `AntiZombieSummary`

Intervention : aucune migration, aucun changement de code, aucune modification de RLS, aucune donnée générée et aucune publication

## 1. Résultat du lot B

Le modèle cible retenu est **hybride** :

- le statut courant et le responsable interne restent portés par le dossier `anomalies` ;
- les concepts qui ont un cycle de vie propre sont enregistrés dans des tables métier dédiées : échéances, prochaines actions, blocages, justifications de retard et exigences de preuve ;
- l'historique métier existant `anomaly_history` est enrichi et devient le journal append-only unique ;
- une projection de lecture Supabase compose les huit sources pour `AntiZombieSummary` sans déplacer la logique métier dans React ;
- les anciennes colonnes restent temporairement disponibles pendant la transition, mais elles cessent d'être canoniques dès la bascule contrôlée ;
- aucune liste métier évolutive n'est figée dans un enum PostgreSQL.

Cette solution maintient un accès rapide au dossier tout en garantissant la traçabilité, l'idempotence, la gestion des conflits et la conservation des états successifs.

## 2. Décisions métier prises en compte

La présente spécification applique les validations reçues après le lot A :

1. Le responsable canonique est un utilisateur interne autorisé. Un prestataire peut être intervenant, partie concernée ou acteur bloquant, sans devenir automatiquement responsable du dossier et sans obtenir un compte.
2. Un dossier peut rester temporairement sans responsable pendant le Constat et la Qualification. Il ne peut pas sortir de Qualification sans responsable interne valide.
3. La prochaine action appartient au dossier. Elle utilise un code contrôlé et un commentaire facultatif ; si le code `OTHER`/« Autre » est utilisé, le commentaire est obligatoire.
4. Une prochaine action ne crée pas une nouvelle étape : elle est toujours compatible avec l'étape active du workflow existant.
5. Toute échéance créée ou modifiée conserve l'ancienne valeur, la nouvelle valeur, l'auteur, la date et l'heure, la justification et l'origine manuelle ou automatique.
6. Un seul blocage principal peut être actif à la fois dans le MVP. La résolution du précédent est obligatoire avant la création d'un nouveau blocage.
7. L'acteur bloquant peut être interne, externe ou système ; un acteur externe n'a pas besoin d'un compte.
8. La preuve attendue est instanciée sur le dossier à partir d'une règle contextuelle confirmée. Faustin peut la renforcer ou la compléter, mais jamais supprimer silencieusement une exigence obligatoire.
9. La règle de preuve, l'exigence appliquée au dossier, la preuve déposée et sa validation ou son refus restent quatre objets distincts.
10. Les rondes sont la première capacité hors ligne. Les actions et preuves terrain viennent ensuite. Les décisions sensibles, arbitrages financiers, validations finales et clôtures restent en ligne.
11. Le seuil de décision de 350 000 FCFA, le verrou critique sans preuve acceptée, les rôles existants et l'absence d'accès prestataire ne sont pas modifiés.

## 3. Principes d'architecture

### 3.1 Une seule source canonique par information

Chaque champ affiché par `AntiZombieSummary` possède exactement une source canonique. Les autres champs existants sont soit des données de compatibilité, soit des détails d'exécution, jamais une seconde vérité concurrente.

### 3.2 Écritures transactionnelles et événements append-only

Les opérations qui modifient plusieurs objets doivent être atomiques. Par exemple, remplacer une prochaine action signifie terminer ou remplacer l'action courante, créer la nouvelle action et écrire les événements d'historique dans une même transaction.

L'historique n'est jamais réécrit ni supprimé. Une correction produit un nouvel événement compensatoire.

### 3.3 Identifiants métier contrôlés, pas d'enum métier rigide

Les codes de prochaine action, catégories de blocage, motifs de retard, types de preuve et événements métier sont des référentiels en table. Ils peuvent être activés ou désactivés sans migration de type PostgreSQL.

Les petits états techniques stables, comme `pending`, `completed`, `cancelled` ou `superseded`, peuvent rester des textes protégés par une contrainte `CHECK`. Ils décrivent le mécanisme interne, pas un vocabulaire métier destiné à évoluer par l'Administration.

### 3.4 Sécurité par défaut

Toutes les tables opérationnelles futures auront RLS activée. Aucun accès `anon` et aucun accès prestataire ne seront accordés. Les vues de lecture devront utiliser `security_invoker = true` afin de respecter les politiques des tables sous-jacentes.

Les fonctions sont `SECURITY INVOKER` par défaut. Toute exception `SECURITY DEFINER` devra être justifiée, avoir un `search_path` explicite, contrôler l'identité et le rôle métier dans son corps, révoquer l'exécution à `PUBLIC` et `anon`, puis n'accorder que l'appel strictement nécessaire.

Ces choix suivent les recommandations Supabase actuelles sur la [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), les [fonctions de base de données](https://supabase.com/docs/guides/database/functions) et les [vues `security_invoker`](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0010_security_definer_view). Le changement annoncé par Supabase sur l'exposition explicite des nouvelles tables à la Data API sera pris en compte au moment des migrations ; aucune table ne sera exposée par simple effet de bord.

## 4. Comparaison des options de modélisation

### 4.1 Option A — Ajouter toutes les colonnes sur `anomalies`

Exemples : `next_action_code`, `blocking_actor`, `blocking_reason`, `expected_proof`, `current_due_at`.

| Critère | Évaluation |
|---|---|
| Lecture du dossier | Très simple et rapide. |
| Traçabilité | Faible sans tables supplémentaires ; les anciennes valeurs sont écrasées. |
| Blocages successifs | Difficiles à conserver proprement. |
| Échéances successives | Impossible sans dupliquer les anciennes valeurs dans du JSON ou un historique parallèle. |
| Preuves attendues multiples | Mauvaise adaptation à une liste d'exigences. |
| Règles de preuve versionnées | Non adaptées à une simple colonne. |
| Hors ligne et conflits | Un gros enregistrement devient un point de conflit fréquent. |
| RLS | Simple en lecture, mais trop grossière en écriture. |
| Risque de sources concurrentes | Élevé avec `work_orders`, `proofs` et `anomaly_history`. |

**Conclusion : non retenue comme modèle complet.** Elle convient seulement aux attributs réellement courants et uniques du dossier.

### 4.2 Option B — Tout placer dans des tables métier dédiées

| Critère | Évaluation |
|---|---|
| Traçabilité | Excellente. |
| Cycles de vie | Très bien représentés. |
| Lecture du cockpit | Plus coûteuse en jointures. |
| Statut et responsable | Sur-modélisés alors qu'ils sont déjà canoniques sur le dossier. |
| Compatibilité avec l'existant | Bascule plus risquée et duplication temporaire importante. |
| Hors ligne | Bonne granularité et meilleure idempotence. |
| Complexité | Plus forte pour les requêtes, les politiques et le frontend. |

**Conclusion : non retenue seule.** Elle déplacerait inutilement deux sources déjà solides.

### 4.3 Option C — Modèle hybride retenu

Le dossier conserve :

- `current_status_id` comme statut courant ;
- `assigned_profile_id` comme responsable interne courant ;
- `version_no` comme base de concurrence optimiste.

Des tables dédiées portent :

- les échéances successives ;
- les prochaines actions ;
- les blocages successifs ;
- les justifications de retard ;
- les règles et exigences de preuve ;
- l'historique métier enrichi.

Une projection de lecture assemble ces données. Cette option est retenue parce qu'elle limite la migration, évite l'écrasement des faits historiques et permet une synchronisation hors ligne progressive.

## 5. Vue d'ensemble du modèle cible

```text
anomalies
 ├── current_status_id ──────────────> status_definitions
 ├── assigned_profile_id ────────────> profiles (interne autorisé)
 ├── 1,n anomaly_deadlines ──────────> sla_rules / workflow_stages
 ├── 1,n anomaly_actions ────────────> next_action_codes
 ├── 1,n anomaly_blocks ─────────────> profiles / vendors / externe / système
 ├── 1,n anomaly_delay_justifications
 ├── 1,n anomaly_proof_requirements ─> proof_requirement_rules
 ├── 1,n proofs (pièces déposées)
 └── 1,n anomaly_history ────────────> business_event_definitions

anti_zombie_summary_v
 └── compose les huit sources ci-dessus sous RLS, sans les modifier
```

## 6. Tables et colonnes proposées

Les noms ci-dessous sont des noms cibles. Ils ne sont pas créés dans ce lot.

### 6.1 `anomalies` — dossier courant existant

| Colonne | État | Rôle cible |
|---|---|---|
| `id uuid` | Existante | Identifiant du dossier. |
| `current_status_id uuid not null` | Existante | Source canonique du statut. |
| `assigned_profile_id uuid null` | Existante | Source canonique du responsable interne. |
| `assigned_vendor_id uuid null` | Existante, à déprécier comme responsable | Peut rester transitoirement pour compatibilité, mais ne représente plus le responsable canonique. |
| `qualification_due_at timestamptz` | Existante, compatibilité | Ne sera plus canonique après bascule vers `anomaly_deadlines`. |
| `intervention_due_at timestamptz` | Existante, compatibilité | Ne sera plus canonique après bascule. |
| `version_no integer not null` | Existante | Contrôle optimiste des écritures concurrentes. |

Contrainte métier future : à la sortie de Qualification, `assigned_profile_id` doit pointer vers un profil actif disposant d'un rôle interne autorisé et du périmètre du dossier. La contrainte est validée dans la commande transactionnelle et dans un garde-fou serveur ; un simple FK ne suffit pas.

### 6.2 `next_action_codes` — référentiel des prochaines actions

| Colonne | Type proposé | Règle |
|---|---|---|
| `id` | `uuid` | Clé primaire. |
| `code` | `text` | Unique, stable, non réutilisé. |
| `label` | `text` | Libellé visible. |
| `description` | `text` | Explication métier. |
| `requires_comment` | `boolean` | `true` pour `OTHER`/« Autre ». |
| `is_active` | `boolean` | Désactivation sans suppression. |
| `sort_order` | `integer` | Ordre d'affichage. |
| `created_at`, `updated_at` | `timestamptz` | Horodatages serveur. |
| `created_by_profile_id`, `updated_by_profile_id` | `uuid` | Traçabilité administrative. |

Le code `OTHER` n'est créé que si le catalogue métier le confirme. S'il existe, une contrainte transactionnelle impose un commentaire non vide.

### 6.3 `next_action_code_stages` — compatibilité avec le workflow

| Colonne | Type proposé | Règle |
|---|---|---|
| `action_code_id` | `uuid` | FK vers `next_action_codes`. |
| `workflow_stage_id` | `uuid` | FK vers `workflow_stages`. |
| `is_default_for_stage` | `boolean` | Au plus un code par défaut par étape. |

Clé primaire composée `(action_code_id, workflow_stage_id)`. Une action ne peut être créée que si son code est autorisé pour l'étape courante. Cette association ne crée aucune nouvelle étape métier.

### 6.4 `anomaly_actions` — prochaine action du dossier

| Colonne | Type proposé | Règle |
|---|---|---|
| `id` | `uuid` | Clé primaire. |
| `anomaly_id` | `uuid` | FK obligatoire vers `anomalies`. |
| `action_code_id` | `uuid` | FK obligatoire vers `next_action_codes`. |
| `assigned_profile_id` | `uuid` | Exécutant interne autorisé. |
| `comment` | `text` | Facultatif, sauf code imposant un commentaire. |
| `state` | `text` + `CHECK` | `pending`, `completed`, `cancelled`, `superseded`. |
| `source_kind` | `text` | Constat, qualification, décision, intervention, preuve ou réouverture. |
| `source_record_id` | `uuid` | Lien facultatif vers la décision ou l'objet à l'origine. |
| `created_by_profile_id`, `created_at` | `uuid`, `timestamptz` | Auteur et date serveur. |
| `completed_by_profile_id`, `completed_at` | `uuid`, `timestamptz` | Renseignés pour `completed`. |
| `superseded_by_action_id`, `superseded_at`, `superseded_by_profile_id` | FK, date, FK | Chaîne de remplacement explicite. |
| `cancellation_reason` | `text` | Obligatoire pour `cancelled`. |
| `idempotency_key` | `uuid` | Unique pour la reprise hors ligne. |
| `base_version_no` | `integer` | Version du dossier connue par le client. |
| `client_occurred_at` | `timestamptz` | Heure terrain informative. |
| `server_received_at` | `timestamptz` | Heure de confirmation serveur. |

Contraintes :

- index unique partiel : une seule action `pending` par dossier ;
- l'exécutant est un profil interne actif et autorisé ;
- `OTHER` exige `comment` ;
- le code est compatible avec l'étape active ;
- le MVP n'ajoute pas une seconde échéance propre à l'action : l'action utilise l'échéance courante du dossier. Un éventuel objectif distinct sera un futur arbitrage métier.

### 6.5 `anomaly_deadlines` — échéances successives

| Colonne | Type proposé | Règle |
|---|---|---|
| `id` | `uuid` | Clé primaire. |
| `anomaly_id` | `uuid` | FK obligatoire vers `anomalies`. |
| `workflow_stage_id` | `uuid` | Étape concernée. |
| `sla_rule_id` | `uuid null` | Règle SLA ayant produit l'échéance. |
| `due_at` | `timestamptz` | Nouvelle valeur canonique. |
| `origin` | `text` + `CHECK` | `automatic` ou `manual`. |
| `justification` | `text` | Obligatoire pour une modification ; décrit aussi la règle automatique appliquée. |
| `previous_deadline_id` | `uuid null` | FK vers l'échéance précédente. |
| `created_by_profile_id` | `uuid null` | `null` seulement pour une opération système identifiée. |
| `created_at` | `timestamptz` | Date/heure serveur. |
| `superseded_at`, `superseded_by_profile_id` | date, FK | Fin de validité, jamais suppression. |
| `idempotency_key` | `uuid` | Unique. |
| `base_version_no` | `integer` | Détection de conflit. |

Contraintes :

- une seule échéance active par dossier ;
- la création initiale et chaque recalcul sont de nouvelles lignes ;
- l'ancienne ligne n'est jamais écrasée ;
- le changement écrit également un événement avec ancienne valeur, nouvelle valeur, auteur, date/heure, justification et origine ;
- le retard est calculé côté base à partir de l'échéance active et de l'heure serveur, jamais à partir de l'horloge du navigateur.

### 6.6 `block_reason_codes` — motifs contrôlés de blocage

| Colonne | Type proposé | Règle |
|---|---|---|
| `id`, `code`, `label` | `uuid`, `text`, `text` | Référentiel évolutif. |
| `requires_comment` | `boolean` | Indique si le détail libre est obligatoire. |
| `is_active`, `sort_order` | `boolean`, `integer` | Gouvernance sans suppression. |

Le commentaire de déclaration reste obligatoire dans le MVP, même lorsqu'un code est choisi, afin de rendre le blocage compréhensible.

### 6.7 `anomaly_blocks` — cycle des blocages

| Colonne | Type proposé | Règle |
|---|---|---|
| `id` | `uuid` | Clé primaire. |
| `anomaly_id` | `uuid` | FK obligatoire. |
| `block_reason_code_id` | `uuid null` | Catégorie contrôlée, si disponible. |
| `reason_detail` | `text` | Motif précis obligatoire. |
| `blocking_profile_id` | `uuid null` | Acteur interne. |
| `blocking_vendor_id` | `uuid null` | Entreprise externe connue, sans compte. |
| `blocking_external_label` | `text null` | Externe non référencé. |
| `blocking_system_code` | `text null` | Système ou dépendance technique contrôlée. |
| `blocking_actor_label_snapshot` | `text` | Libellé conservé pour l'historique. |
| `declared_by_profile_id`, `declared_at` | FK, date | Auteur et date serveur. |
| `resolved_by_profile_id`, `resolved_at` | FK, date | Résolution explicite. |
| `resolution_reason` | `text` | Obligatoire à la résolution. |
| `replaced_by_block_id` | `uuid null` | Chaîne facultative vers le blocage suivant. |
| `idempotency_key`, `base_version_no` | `uuid`, `integer` | Synchronisation et conflit. |

Contraintes :

- exactement une des références d'acteur est renseignée ;
- un seul blocage non résolu par dossier, via index unique partiel ;
- un nouveau blocage est refusé tant que le précédent n'est pas résolu, sauf commande atomique « résoudre puis créer » ;
- aucune suppression ;
- un vendeur référencé reste un acteur externe et n'obtient aucun rôle, compte ou permission.

### 6.8 `delay_reason_codes` et `anomaly_delay_justifications`

Le motif d'un retard sans blocage réel ne doit pas être forcé dans `anomaly_blocks`.

`delay_reason_codes` suit le même principe de référentiel évolutif que les motifs de blocage.

| Colonne de `anomaly_delay_justifications` | Type proposé | Règle |
|---|---|---|
| `id` | `uuid` | Clé primaire. |
| `anomaly_id` | `uuid` | FK obligatoire. |
| `deadline_id` | `uuid` | Échéance dépassée concernée. |
| `delay_reason_code_id` | `uuid null` | Catégorie contrôlée. |
| `reason_detail` | `text` | Explication obligatoire. |
| `declared_by_profile_id`, `declared_at` | FK, date | Traçabilité. |
| `superseded_at`, `superseded_by_profile_id` | date, FK | Complément/remplacement sans écrasement. |
| `superseded_by_id` | `uuid null` | Chaîne vers la nouvelle justification. |
| `idempotency_key`, `base_version_no` | `uuid`, `integer` | Reprise et conflit. |

Une justification courante au maximum est active pour une échéance. Si un blocage actif existe, son motif est affiché en priorité ; sinon, lorsque l'échéance est dépassée, la justification active de cette échéance est la source canonique.

### 6.9 `proof_type_definitions` — types de preuve évolutifs

La contrainte texte actuelle de `proofs.proof_type` est suffisante pour l'existant mais rigide pour une matrice métier évolutive. La cible introduit un référentiel `proof_type_definitions` avec `code`, `label`, `is_active`, `mime_types`, `max_file_size` et ordre d'affichage. La migration des données existantes vers une FK est différée jusqu'à validation de la matrice de preuve.

### 6.10 `proof_rule_sets` et `proof_requirement_rules` — règles contextuelles

`proof_rule_sets` versionne et publie un ensemble cohérent de règles :

- `id`, `code`, `version_no` ;
- `status` technique : `draft`, `published`, `retired` ;
- `effective_from`, `effective_to` ;
- `published_by_profile_id`, `published_at` ;
- unicité `(code, version_no)`.

`proof_requirement_rules` porte les conditions et le résultat :

| Colonne | Type proposé | Règle |
|---|---|---|
| `rule_set_id` | `uuid` | Version de règle. |
| `equipment_id`, `category_id`, `priority_id` | `uuid null` | Contexte matériel et gravité. |
| `workflow_stage_id`, `action_code_id` | `uuid null` | Contexte de processus. |
| `proof_type_id` | `uuid` | Type de preuve demandé. |
| `label` | `text` | Libellé attendu. |
| `minimum_count` | `integer` | Au moins 1. |
| `acceptance_criteria` | `jsonb` | Critères structurés et versionnés. |
| `is_mandatory` | `boolean` | Exigence obligatoire ou complémentaire. |
| `precedence` | `integer` | Résolution déterministe des règles. |
| `is_active` | `boolean` | Désactivation sans suppression. |

Au moins un critère contextuel est renseigné. La règle WILO-01 n'est pas codée en dur : elle devient, si le métier la confirme, une règle de ce catalogue parmi d'autres.

### 6.11 `anomaly_proof_requirements` — exigences appliquées au dossier

| Colonne | Type proposé | Règle |
|---|---|---|
| `id` | `uuid` | Clé primaire. |
| `anomaly_id` | `uuid` | FK obligatoire. |
| `source_rule_id` | `uuid null` | Règle source, nulle pour un renforcement explicite autorisé. |
| `source_rule_set_version` | `integer null` | Version appliquée. |
| `proof_type_id` | `uuid` | Type attendu. |
| `label_snapshot` | `text` | Libellé figé. |
| `minimum_count` | `integer` | Quantité figée. |
| `acceptance_criteria_snapshot` | `jsonb` | Critères figés. |
| `origin` | `text` + `CHECK` | `rule` ou `facility_manager`. |
| `state` | `text` + `CHECK` | `pending`, `satisfied`, `waived`, `superseded`. |
| `created_by_profile_id`, `created_at` | FK, date | Auteur et date. |
| `superseded_at`, `superseded_by_profile_id`, `superseded_by_requirement_id` | date, FK, FK | Modification explicite. |
| `satisfied_at`, `satisfied_by_profile_id` | date, FK | Validation Facility Manager. |
| `waived_at`, `waived_by_profile_id`, `waiver_reason` | date, FK, texte | Levée exceptionnelle, droit restant à valider. |
| `idempotency_key`, `base_version_no` | `uuid`, `integer` | Reprise et conflit. |

Règles :

- l'instance est un instantané ; une modification future du référentiel ne change pas les dossiers existants ;
- Faustin peut ajouter ou renforcer une exigence ;
- une exigence obligatoire ne peut pas être supprimée ; elle ne peut être que satisfaite, remplacée par une exigence plus forte, ou levée explicitement selon un droit restant à confirmer ;
- une preuve déposée dans `proofs` ne satisfait pas automatiquement l'exigence ; seule son acceptation par Faustin déclenche le lien de satisfaction ;
- une exigence peut être satisfaite par une ou plusieurs preuves acceptées via une table de liaison `proof_requirement_evidence(requirement_id, proof_id, linked_at, linked_by_profile_id)`.

### 6.12 `business_event_definitions` et enrichissement de `anomaly_history`

`business_event_definitions` contient : `id`, `code`, `label`, `is_activity`, `is_sensitive`, `is_active`, `sort_order`.

`anomaly_history` reste la table unique d'historique métier. Les colonnes proposées en complément de l'existant sont :

| Colonne | Rôle |
|---|---|
| `event_definition_id` | Code contrôlé de l'événement. |
| `workflow_stage_id` | Étape concernée. |
| `source_table`, `source_record_id` | Fait métier ayant produit l'événement. |
| `actor_profile_id` | Auteur interne, déjà présent. |
| `actor_label_snapshot` | Identité lisible conservée. |
| `occurred_at` | Heure métier officielle validée par le serveur, déjà présente. |
| `client_occurred_at` | Heure déclarée par un appareil hors ligne. |
| `server_received_at` | Heure de réception et de validation serveur. |
| `comment` | Justification lisible, déjà présente. |
| `change_set` | Anciennes et nouvelles valeurs structurées, déjà présent. |
| `idempotency_key` | Empêche les événements en double. |
| `transaction_id` | Regroupement transactionnel, déjà présent. |

La FK actuelle `anomaly_history.anomaly_id ... on delete cascade` devra être réévaluée : la cible préfère l'absence de suppression physique des dossiers ou une relation restrictive afin de ne jamais effacer l'historique métier.

## 7. Source canonique des huit informations

| Information | Source canonique cible | Enregistrée ou calculée | Règle de sélection |
|---|---|---|---|
| Statut | `anomalies.current_status_id` → `status_definitions` | Enregistrée | Statut courant unique du dossier. |
| Responsable | `anomalies.assigned_profile_id` → `profiles` | Enregistrée | Profil interne actif ; absence admise seulement avant la fin de Qualification. |
| Prochaine action | `anomaly_actions` | Enregistrée | Unique ligne `state = 'pending'` du dossier. |
| Échéance / SLA | `anomaly_deadlines` | Enregistrée après calcul | Unique échéance non remplacée ; règle SLA et origine jointes. |
| Acteur bloquant | `anomaly_blocks` | Enregistrée | Acteur du blocage non résolu ; aucun blocage n'est déduit d'un statut d'attente. |
| Motif blocage ou retard | `anomaly_blocks.reason_detail` ou `anomaly_delay_justifications.reason_detail` | Enregistrée | Motif du blocage actif prioritaire ; sinon justification de l'échéance active dépassée. |
| Preuve attendue | `anomaly_proof_requirements` | Enregistrée comme instantané | Exigences actives `pending`, avec règles et critères figés. |
| Dernière activité | `anomaly_history` + `business_event_definitions` | Calculée | Dernier événement `is_activity = true`, tri déterministe ; jamais `updated_at`. |

## 8. Dérivation de la dernière activité

La projection sélectionne, pour chaque dossier, le dernier événement éligible selon :

1. `business_event_definitions.is_activity = true` ;
2. `occurred_at desc` ;
3. `server_received_at desc` ;
4. `anomaly_history.id desc` comme départage déterministe.

Le résultat contient au minimum : date et heure, libellé de l'action, acteur, étape et commentaire éventuel.

Un événement hors ligne conserve son heure terrain dans `client_occurred_at`, mais l'heure officielle est validée par le serveur et sa réception est conservée séparément. Une horloge client aberrante ne doit pas pouvoir déplacer arbitrairement l'ordre officiel.

Ne sont pas des activités : lecture d'écran, rafraîchissement, renouvellement de session, modification automatique de `updated_at` ou accusé de synchronisation déjà enregistré.

## 9. Projection de lecture `anti_zombie_summary_v`

La projection future, nom logique `anti_zombie_summary_v`, retourne un contrat stable :

- identifiants et libellés du statut ;
- identifiant et nom du responsable ;
- code, libellé, commentaire et exécutant de la prochaine action ;
- échéance, SLA, origine et indicateur de retard calculé côté serveur ;
- acteur et motif du blocage actif ;
- justification du retard lorsqu'il n'existe pas de blocage ;
- liste agrégée des exigences de preuve actives ;
- dernière activité complète ;
- drapeaux de complétude permettant d'afficher les replis déjà validés.

La vue utilise `security_invoker = true`, n'accorde rien à `anon` et ne donne aucun droit d'écriture. Elle respecte la RLS de chaque table sous-jacente. Si les performances exigent une fonction, celle-ci reste en lecture seule et soumise aux mêmes contrôles.

## 10. Stratégie d'historisation

Chaque commande métier écrit simultanément :

1. le nouvel état courant ;
2. la nouvelle ligne de cycle de vie, lorsqu'elle existe ;
3. un événement `anomaly_history` ;
4. le numéro de version du dossier ;
5. l'identifiant idempotent de l'opération.

Événements minimaux :

- création de dossier ;
- changement de statut ;
- affectation et réaffectation ;
- prochaine action créée, terminée, remplacée ou annulée ;
- échéance créée ou recalculée, avec ancienne/nouvelle valeur et origine ;
- blocage déclaré, complété et résolu ;
- retard justifié ;
- exigence de preuve appliquée, renforcée, satisfaite, refusée ou levée ;
- preuve déposée, acceptée ou rejetée ;
- intervention commencée ou terminée ;
- décision et arbitrage ;
- clôture et réouverture.

`audit_events` reste un journal technique de changements de lignes. Il ne devient pas la source de la dernière activité métier.

## 11. Politiques RLS proposées

### 11.1 Règles communes

- RLS activée sur chaque table future.
- Aucune politique ni privilège pour `anon`.
- Le rôle historique `vendor` reste désactivé, sans politique et sans compte.
- La lecture opérationnelle réutilise `can_access_anomaly(anomaly_id)` et le périmètre existant.
- Être `authenticated` n'est jamais suffisant : le profil actif, le rôle métier, le périmètre et le verrou de première connexion sont vérifiés.
- Aucun `DELETE` métier direct sur les actions, blocages, échéances, exigences ou historique.
- Les colonnes utilisées par la RLS sont indexées.
- Une opération `UPDATE` possède une politique `SELECT`, une clause `USING` et une clause `WITH CHECK` cohérentes.

### 11.2 Matrice par rôle

| Objet | Administration (`direction`) | Faustin (`facility_manager`) | Agent terrain (`field_agent`) | Lecture seule | Prestataire / anon |
|---|---|---|---|---|---|
| Dossier et synthèse | Lecture globale | Lecture globale | Lecture de son périmètre | Lecture selon périmètre à confirmer | Aucun accès |
| Responsable | Lecture ; arbitrage exceptionnel tracé | Affecte/réaffecte un interne autorisé | Lecture seulement | Lecture | Aucun |
| Prochaine action | Lecture ; agit sur une action d'arbitrage qui lui est affectée | Crée/remplace/annule ; contrôle la compatibilité | Termine l'action qui lui est affectée dans son périmètre | Lecture | Aucun |
| Échéance | Lecture ; valide une dérogation sensible si cette gouvernance est confirmée | Déclenche requalification ou dérogation motivée | Lecture | Lecture | Aucun |
| Blocage | Déclare/résout ses blocages d'arbitrage | Déclare, complète et résout les blocages opérationnels | Déclare sur son action/périmètre ; résolution finale selon décision restante | Lecture | Aucun accès ; peut seulement être référencé comme acteur externe |
| Justification de retard | Lecture et justification de ses arbitrages | Crée/complète | Crée sur son action si autorisé | Lecture | Aucun |
| Règles de preuve | Lecture | Administration fonctionnelle contrôlée à définir | Lecture des exigences appliquées uniquement | Lecture | Aucun |
| Exigences de preuve | Lecture | Instancie, confirme, renforce et valide | Lecture ; dépose une preuve distincte | Lecture | Aucun |
| Preuves déposées | Lecture | Accepte/refuse | Dépose dans son périmètre ; Évariste/Sylvain conservent leur permission nominative de rapport prestataire | Lecture selon périmètre | Aucun |
| Historique | Lecture globale ; écrit indirectement par ses actions | Lecture globale ; écrit indirectement | Lecture de son périmètre ; écrit indirectement | Lecture | Aucun |

Les écritures complexes passent par des commandes transactionnelles. Les fonctions sont `SECURITY INVOKER` lorsque les politiques et contraintes suffisent. Si une élévation devient indispensable, elle doit être exceptionnelle, auditée et durcie selon les règles de la section 3.4.

## 12. Impacts hors ligne

### 12.1 Ordre de livraison confirmé

1. Rondes et constats.
2. Réalisation d'actions et préparation/dépôt de preuves terrain.
3. Autres fonctions compatibles, uniquement après retour d'expérience.

Restent obligatoirement en ligne : qualification finale, affectation, arbitrage financier, décision sensible, validation/refus final d'une preuve et clôture.

### 12.2 Modèle minimal de synchronisation future

Chaque commande hors ligne contient :

- `operation_id`/`idempotency_key` unique généré sur l'appareil ;
- type d'opération et entité ;
- `base_version_no` du dossier ;
- heure terrain `client_occurred_at` ;
- charge utile minimale ;
- état local `queued`, `syncing`, `synced`, `conflict`, `failed` ;
- nombre de tentatives et dernière erreur non sensible.

Le serveur :

- refuse le doublon en retournant le résultat initial ;
- vérifie la version de base ;
- refuse ou met en conflit une opération obsolète ;
- horodate la réception ;
- écrit une seule fois l'événement métier ;
- ne considère une preuve disponible qu'après réussite Storage + écriture DB ;
- ne considère une exigence satisfaite qu'après validation en ligne par Faustin.

Le cockpit affiche la date de dernière synchronisation et distingue une donnée confirmée d'une donnée locale en attente.

## 13. Correspondance avec le modèle `Anomaly` actuel

| Champ frontend actuel | Cible | Règle de transition |
|---|---|---|
| `status` texte simplifié | Statut `code` + `label` de la projection | Le mapping 14 → 5 ne doit plus définir la vérité métier ; il peut rester un regroupement visuel. |
| `owner` texte | `responsible_profile_id` + nom | L'identifiant devient la référence ; le nom est une présentation. |
| `due` texte formaté | `due_at` + SLA + origine | Le formatage reste dans l'UI, le calcul reste en base. |
| `delayed` calcul navigateur | `is_delayed` calculé côté serveur | Évite la divergence d'horloge. |
| `proof` / `proofPending` | Preuves déposées et état de validation | Ne définit pas la preuve attendue. |
| Prochaine action issue de la file | `anomaly_actions` active | Suppression de la déduction depuis l'onglet Faustin. |
| Blocage forcé à `false` | `anomaly_blocks` actif | Source réelle. |
| Preuve WILO codée en dur | `anomaly_proof_requirements` | Règle contextuelle, jamais généralisation UI. |
| Historique `null` | Dernier `anomaly_history` éligible | Source réelle avec acteur et étape. |

Un DTO de lecture dédié, par exemple `AntiZombieSummaryRow`, doit être généré depuis Supabase. L'adaptateur React ne fait que formater les valeurs et appliquer les libellés de repli ; il ne calcule ni le SLA, ni le retard, ni la règle de preuve, ni le blocage.

## 14. Stratégie pour éviter deux sources concurrentes

1. Publier un registre de propriété des champs, identique à la section 7.
2. Introduire les nouvelles tables de façon additive.
3. Écrire uniquement par commandes transactionnelles pendant la transition.
4. Alimenter temporairement les anciennes colonnes d'échéance depuis la nouvelle source, dans un seul sens, si la compatibilité frontend l'exige.
5. Interdire toute écriture directe de l'ancienne source dès la bascule.
6. Faire lire `AntiZombieSummary` uniquement depuis la projection cible.
7. Ajouter des tests de non-divergence pendant la période transitoire.
8. Déprécier explicitement `assigned_vendor_id` comme responsable et les anciennes échéances comme sources canoniques.
9. Ne supprimer les anciens champs qu'après recette, observation et sauvegarde ; aucune suppression dans les premières migrations.

## 15. Ordre proposé des futures migrations

Chaque étape reste soumise à un GO explicite.

| Ordre | Migration future | Contenu | Dépendance |
|---:|---|---|---|
| M1 | Référentiels métier | Codes d'action et compatibilité par étape ; motifs de blocage/retard ; définitions d'événements ; types de preuve cibles. | Validation des catalogues minimaux. |
| M2 | Historique enrichi | Colonnes de provenance, étape, idempotence, heures client/serveur ; garde append-only. | Catalogue d'événements. |
| M3 | Échéances | `anomaly_deadlines`, contrainte d'unicité active, historique ancien/nouveau, compatibilité avec SLA existant. | Gouvernance des dérogations. |
| M4 | Prochaines actions | `anomaly_actions`, unicité active, compatibilité workflow, règle `OTHER`. | Catalogue des actions. |
| M5 | Blocages et retards | `anomaly_blocks`, `anomaly_delay_justifications`, acteurs internes/externes, cycles de résolution. | Droits de résolution finaux. |
| M6 | Règles de preuve | Types, rule sets versionnés, règles contextuelles, exigences dossier et liaisons vers preuves. | Matrice métier et règle de levée. |
| M7 | Commandes et invariants | Fonctions transactionnelles, triggers d'historique, concurrence optimiste, idempotence. | M2 à M6. |
| M8 | RLS et privilèges | Politiques, grants explicites, absence `anon`/vendor, tests par rôle. | Matrice de droits figée. |
| M9 | Projection de lecture | `anti_zombie_summary_v` `security_invoker`, index et contrat généré. | M2 à M8. |
| M10 | Compatibilité et bascule | Raccordement unidirectionnel des anciens champs, contrôle de non-divergence, marquage déprécié. | Recette base. |
| M11 | Contrat frontend | Types Supabase et adaptateur de lecture ; lot code séparé, sans logique métier dupliquée. | GO UI distinct. |
| M12 | Résilience terrain | Outbox rondes, puis actions/preuves, gestion des conflits et reprise média. | Recette en ligne et plan hors ligne. |

## 16. Stratégie de retour arrière

1. Migrations initiales additives : aucune colonne existante supprimée.
2. Activation par bascule de lecture contrôlée ; le frontend peut revenir au contrat précédent sans perte des nouvelles lignes.
3. Avant toute migration distante : sauvegarde, dry-run local et préproduction, inventaire des objets et tests pgTAP.
4. Si une migration échoue avant utilisation, son script de retrait supprime seulement les objets vides qu'elle vient de créer.
5. Dès qu'une table reçoit des événements métier, le retour arrière devient un **retour fonctionnel** : désactiver la nouvelle lecture/commande, conserver les données et corriger en avant. Aucune suppression de faits historiques.
6. Les fonctions et vues sont retirées avant les tables si une désactivation est nécessaire.
7. Les anciennes colonnes ne sont retirées qu'après une période d'observation et une décision séparée.

## 17. Plan de tests

### 17.1 Schéma et contraintes

- une seule action `pending`, une seule échéance active et un seul blocage actif par dossier ;
- acteur bloquant exactement défini ;
- commentaire obligatoire pour `OTHER` ;
- code d'action compatible avec l'étape ;
- responsable interne actif obligatoire à la sortie de Qualification ;
- impossibilité de supprimer un événement métier.

### 17.2 Échéances

- création automatique depuis le SLA ;
- recalcul conservant ancienne/nouvelle valeur, auteur, date/heure, justification et origine ;
- dérogation manuelle motivée ;
- aucun changement silencieux ;
- retard calculé avec l'heure serveur.

### 17.3 Blocages et retards

- blocage interne, prestataire référencé, externe libre et système ;
- refus d'un second blocage actif ;
- résolution puis nouveau blocage dans une transaction ;
- conservation du motif et du résolveur ;
- justification d'un retard sans faux blocage.

### 17.4 Preuves

- sélection déterministe de la règle contextuelle ;
- instantané inchangé après publication d'une nouvelle version de règle ;
- renforcement par Faustin ;
- impossibilité de supprimer silencieusement une exigence obligatoire ;
- preuve déposée distincte de l'exigence ;
- satisfaction uniquement par preuve acceptée ;
- maintien du verrou de clôture critique.

### 17.5 Historique et dernière activité

- chaque commande écrit un événement avec acteur, étape et date ;
- les événements techniques sont exclus ;
- tri déterministe ;
- événement hors ligne avec heures client et serveur ;
- idempotence : une reprise ne duplique pas l'activité.

### 17.6 RLS et sécurité

- matrice complète Administration, Faustin, agent dans/hors périmètre, Lecture seule, vendor désactivé et anon ;
- accès aux vues respectant les tables sous-jacentes ;
- aucun privilège implicite sur les fonctions ;
- aucune clé serveur côté frontend ;
- aucune écriture possible tant que `must_change_password` est actif ;
- tests de concurrence et tentative de contournement par appels directs.

### 17.7 Hors ligne

- reprise après coupure ;
- même `idempotency_key` rejoué ;
- conflit de `version_no` ;
- fichier envoyé mais ligne DB échouée, et inversement ;
- reprise d'upload ;
- état local visible jusqu'à confirmation ;
- aucune validation finale ou clôture hors ligne.

### 17.8 Non-régression

- seuil Administration de 350 000 FCFA ;
- droits nominatifs Évariste/Sylvain pour le dépôt de rapports prestataires ;
- absence d'accès prestataire ;
- cycle Constat → Qualification → Décision → Intervention → Preuve → Clôture ;
- authentification et verrou de première connexion ;
- contrôles existants Lot 0 à Lot 3.

## 18. Risques et décisions restantes

| Sujet | Risque | Décision attendue avant migration |
|---|---|---|
| Catalogue de prochaines actions | Codes incomplets ou trop génériques. | Liste MVP, libellés et compatibilité par étape. |
| Gouvernance des échéances | Dérogation non autorisée ou engagement modifié abusivement. | Qui approuve selon risque, priorité ou montant. |
| Motifs de blocage/retard | Taxonomie trop rigide ou inutilisable. | Liste MVP et cas `Autre`. |
| Résolution par l'agent | Un agent pourrait lever un blocage qui nécessite Faustin. | Agent propose ou résout directement selon catégorie. |
| Matrice de preuve | Règles contradictoires ou couverture insuffisante. | Matrice équipement/catégorie/gravité/étape et ordre de priorité. |
| Levée d'une preuve obligatoire | Contournement du contrôle de clôture. | Rôle autorisé, motifs et cas exceptionnels. |
| Lecture seule | Périmètre non défini et aucun compte attribué. | Périmètre avant activation d'un compte. |
| Catalogue d'événements | Dernière activité incohérente si les événements sont mal classés. | Liste finale et attribut `is_activity`. |
| Suppression des dossiers | `on delete cascade` peut effacer l'historique. | Interdire la suppression physique ou passer à une conservation restrictive. |
| Preuve type actuelle | `proofs.proof_type` est un `CHECK` rigide. | Calendrier de migration vers référentiel, sans casser les preuves existantes. |
| Exposition Data API | Une table ou fonction pourrait être exposée involontairement. | Liste blanche explicite des objets API lors du lot RLS. |
| Volume et performance | La projection joint plusieurs tables. | Index, pagination et seuils de performance à mesurer en préproduction. |
| Données anciennes | Des dossiers historiques pourraient rester incomplets. | Stratégie de complétude sans inventer de valeurs. La préproduction ne contient actuellement aucun dossier opérationnel. |

## 19. Captures réelles du composant accepté

Les captures ci-dessous sont les véritables PNG du rendu local du checkpoint `8d26974`. Elles sont également jointes directement au message de livraison du lot B.

### Desktop

![AntiZombieSummary — cockpit Faustin desktop](../../outputs/design/anti-zombie-faustin-desktop.png)

### Mobile

![AntiZombieSummary — cockpit Faustin mobile](../../outputs/design/anti-zombie-faustin-mobile.png)

## 20. Pause du chantier

Le lot B est terminé au niveau documentaire uniquement. Il définit le modèle cible, les sources canoniques, l'historisation, les droits, la trajectoire hors ligne, l'ordre des migrations, le retour arrière et les tests.

**Aucune migration, aucun code, aucune donnée, aucune politique RLS et aucune version publiée n'ont été modifiés.**

Le chantier doit rester en pause jusqu'à validation explicite de cette spécification et des décisions restantes de la section 18.
