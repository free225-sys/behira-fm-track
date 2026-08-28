# BEHIRA FM Track — Audit de provenance `AntiZombieSummary`

Date : 28 août 2026  
Checkpoint audité : `8d26974`  
Périmètre : application locale et projet Supabase de préproduction `fm_track` (`polmebcfablztzojgwoo`)  
Mode d’intervention : lecture seule ; aucune modification du code, de l’interface, de Supabase ou des migrations

## 1. Verdict

Le composant `AntiZombieSummary` est prêt sur le plan visuel, responsive et accessibilité, mais il n’est pas encore raccordable sans réserve aux données métier.

Sur les huit informations attendues :

- trois ont une source métier réelle mais leur exposition frontend reste partielle : **statut**, **responsable**, **échéance/SLA** ;
- une dispose d’un historique métier réel mais incomplet et non chargé par le frontend : **dernière activité** ;
- une dispose seulement de règles générales, sans exigence précise rattachée au dossier : **preuve attendue** ;
- trois n’ont aucune source canonique rattachée au dossier : **prochaine action**, **acteur bloquant**, **motif du blocage ou du retard**.

La file active du cockpit Faustin, les libellés génériques de notification et les textes WILO ne doivent donc pas devenir des sources métier. Les valeurs de repli du composant restent le comportement correct tant que les raccordements manquants ne sont pas validés et implémentés.

## 2. Méthode et état des données

L’audit a porté sur :

- le contrat et le rendu de `AntiZombieSummary` ;
- l’adaptateur Faustin et le chargement opérationnel du frontend ;
- les 12 migrations versionnées, le seed et les politiques RLS ;
- les fonctions de SLA, de workflow, de preuve, d’historique et d’audit ;
- le schéma réellement déployé sur `fm_track`, interrogé en lecture seule.

État constaté sur la préproduction au moment de l’audit :

| Structure | Nombre de lignes |
|---|---:|
| `anomalies` | 0 |
| `qualifications` | 0 |
| `work_orders` | 0 |
| `interventions` | 0 |
| `proofs` | 0 |
| `anomaly_history` | 0 |
| `notifications` | 0 |
| `audit_events` | 38 |

Les 38 événements d’audit concernent surtout la configuration et les opérations administratives déjà réalisées. Ils ne fournissent aucun exemple de dossier métier réel.

Légende :

- **Existant** : source canonique et exploitable telle quelle ;
- **Partiel** : une source réelle existe, mais elle est incomplète, ambiguë ou non exposée au composant ;
- **Absent** : aucune source fiable rattachée au dossier.

## 3. Matrice synthétique de provenance

| Information | Définition métier exacte | Source actuelle | Enregistrée ou calculée | État |
|---|---|---|---|---|
| Statut | État métier courant du dossier dans le cycle Constat → Qualification → Décision → Intervention → Preuve → Clôture. | `anomalies.current_status_id` → `status_definitions` → `workflow_stages`. | Enregistré ; le frontend le réduit ensuite à 5 états. | **Partiel** |
| Responsable | Personne interne actuellement responsable de faire avancer le dossier, distincte de l’auteur du constat et de l’intervenant historique. | `anomalies.assigned_profile_id`; doublon possible dans `work_orders.assigned_profile_id`. | Enregistré, souvent affecté par le workflow. | **Partiel** |
| Prochaine action | Action concrète, actuelle et dossier-spécifique à exécuter ensuite, avec un responsable et un état de réalisation. | Aucune source canonique. L’UI utilise la file Faustin ; `work_orders.instructions` et `notification_rules.expected_action` ne satisfont pas le contrat. | Déduite localement dans l’UI. | **Absent** |
| Échéance / SLA | Date limite métier applicable à l’étape actuelle, issue de la règle SLA résolue et figée sur le dossier. | `anomalies.qualification_due_at`, `anomalies.intervention_due_at`; copie éventuelle dans `work_orders.due_at`; calcul initial par `resolve_sla_deadlines`. | Calculée à la création puis enregistrée ; retard calculé côté navigateur. | **Partiel** |
| Acteur bloquant | Personne, rôle, entité externe ou système dont l’action manque et empêche réellement la poursuite du dossier. | Aucun champ ni cycle de blocage. | Non enregistré. | **Absent** |
| Motif du blocage ou du retard | Cause explicite et datée expliquant l’immobilisation ou le dépassement de délai, avec déclarant et résolution. | Aucun motif générique. Des commentaires spécialisés existent, mais ne représentent pas un blocage. | Non enregistré. | **Absent** |
| Preuve attendue | Exigence précise encore à fournir pour ce dossier : type, quantité minimale et éventuels critères d’acceptation. | `categories.proof_policy` et `status_definitions.requires_proof` indiquent seulement si une preuve peut être requise. | Règle générale enregistrée ; exigence dossier précise absente. | **Partiel** |
| Dernière activité | Dernier événement métier du dossier avec date/heure, action, acteur et étape. | `anomaly_history`, enrichi par `status_definitions.stage_id`; `audit_events` est un audit technique séparé. | Enregistrée par trigger pour certains changements seulement. | **Partiel** |

## 4. Matrice détaillée — sources, usages et gouvernance

### 4.1 Statut

| Dimension | Résultat |
|---|---|
| Définition | Statut métier courant du dossier, appartenant à une étape du workflow. |
| Source actuelle | `anomalies.current_status_id`. |
| Table / colonne / type / fonction | UUID obligatoire vers `status_definitions.id`; étape via `status_definitions.stage_id`; transitions contrôlées par `status_transitions` et `prepare_anomaly()`. |
| Fichiers et composants utilisateurs | `app/lib/supabase/data.ts:94,99,129` charge et transforme le statut ; `app/page.tsx:1238-1250` alimente `AntiZombieSummary`; `app/components/AntiZombieSummary.tsx`. |
| Valeur enregistrée ou calculée | Le statut canonique est enregistré. `mapStatus()` le réduit ensuite à cinq libellés UI, ce qui masque notamment les états Décision et les différents états d’attente. |
| Rôles autorisés à consulter | Direction, Facility Manager, rôle générique Lecture seule et agent terrain ayant accès au dossier, via `can_access_anomaly`. Aucun accès prestataire. |
| Rôles autorisés à modifier | Par workflow : Facility Manager pour qualifier/affecter et clôturer ; agent interne affecté ou Facility Manager pour démarrer/terminer une intervention. En mise à jour directe de `anomalies`, seul le Facility Manager est autorisé. |
| Événement de création | Création du dossier avec le statut initial prévu par `create_field_anomaly`. |
| Événements de mise à jour | Appels à `advance_anomaly_workflow`; toute transition doit exister dans `status_transitions`. |
| Hors ligne | Aucun mécanisme réel de file, synchronisation ou conflit. Le mode WILO affiché est une simulation UI ; le repli démo n’écrit pas le statut distant. |
| État | **Partiel** : source canonique présente, mais le composant reçoit actuellement un statut simplifié. |

### 4.2 Responsable

| Dimension | Résultat |
|---|---|
| Définition | Personne interne portant actuellement la responsabilité opérationnelle de faire avancer le dossier. Une entreprise prestataire reste une référence métier mais n’accède pas à l’outil. |
| Source actuelle | Source dossier : `anomalies.assigned_profile_id`. Source d’exécution potentiellement divergente : `work_orders.assigned_profile_id` ou `assigned_vendor_id`. |
| Table / colonne / type / fonction | UUID facultatif vers `profiles`; affectation automatique par `advance_anomaly_workflow`; contrainte d’un seul destinataire dans `work_orders`. |
| Fichiers et composants utilisateurs | `app/lib/supabase/data.ts:94,143-147`; `app/page.tsx:1238-1250`; `AntiZombieSummary`. |
| Valeur enregistrée ou calculée | Enregistrée. Le frontend remplace toutefois un profil introuvable par « Agent affecté » et une absence par « Non affectée », ensuite normalisée en « Responsable non attribué ». |
| Rôles autorisés à consulter | Mêmes droits que le dossier via `can_access_anomaly`. |
| Rôles autorisés à modifier | Affectation canonique du dossier : Facility Manager. La Direction et le Facility Manager peuvent gérer les ordres de travail, ce qui crée un risque de divergence avec l’affectation du dossier. |
| Événement de création | Lors de la qualification/affectation par Faustin ; le RPC recherche d’abord un agent interne éligible dans le périmètre équipement. |
| Événements de mise à jour | Réaffectation du dossier par le Facility Manager ; modification séparée possible d’un ordre de travail par Direction/Facility Manager. |
| Hors ligne | Aucune réaffectation hors ligne persistante ; le repli UI n’est pas synchronisable. |
| État | **Partiel** : une source dossier existe, mais la relation avec le responsable de l’ordre de travail doit être rendue non ambiguë. |

### 4.3 Prochaine action

| Dimension | Résultat |
|---|---|
| Définition | Action unique et immédiatement attendue pour faire progresser le dossier, rattachée au dossier, attribuable, datable et clôturable. |
| Source actuelle | Aucune source canonique. L’adaptateur Faustin utilise `tab` : « Obtenir la preuve » pour la file preuve, sinon « Confirmer le diagnostic ». |
| Tables / colonnes candidates | `work_orders.instructions`, `qualifications.decision_reason`, `interventions.summary`, `notification_rules.expected_action`, `threshold_rules.automatic_action`, statut/étape et `anomaly_history`. Aucune ne représente une action courante dossier-spécifique avec cycle de vie. |
| Fichiers et composants utilisateurs | `app/page.tsx:1238-1249` pour Faustin ; une autre règle indépendante existe dans le dossier central à `app/page.tsx:1368`. Ces deux déductions ne produisent pas toujours le même libellé. |
| Valeur enregistrée ou calculée | Seulement déduite dans l’interface, selon la vue active ou le statut simplifié. |
| Rôles autorisés à consulter | Sans objet tant que la source n’existe pas. Les sources candidates ont des droits différents. |
| Rôles autorisés à modifier | Sans objet. `work_orders` est gérable par Direction/Facility Manager ; les règles de notification par Facility Manager, mais aucune n’est la prochaine action canonique. |
| Événement de création | Absent. |
| Événement de mise à jour | Absent ; aucune clôture, annulation ou remplacement d’action n’est historisé. |
| Hors ligne | Absent. La valeur UI n’est ni stockée, ni synchronisée, ni protégée contre les conflits. |
| État | **Absent**. |

### 4.4 Échéance / SLA

| Dimension | Résultat |
|---|---|
| Définition | Échéance applicable à la phase courante, calculée depuis la priorité, la catégorie, l’équipement et le calendrier SLA, puis conservée sur le dossier. |
| Source actuelle | Qualification : `anomalies.qualification_due_at`; intervention : `anomalies.intervention_due_at`; ordre : `work_orders.due_at`. |
| Table / colonne / type / fonction | `timestamptz`; fonction `resolve_sla_deadlines()` ; règles `sla_rules`. |
| Fichiers et composants utilisateurs | `app/lib/supabase/data.ts:94,131,148` choisit la date et calcule le retard ; `app/page.tsx:1238-1250`; `AntiZombieSummary`. |
| Valeur enregistrée ou calculée | Les dates sont calculées à l’insertion puis enregistrées. Le retard est calculé dans le navigateur avec `Date.now()`. |
| Rôles autorisés à consulter | Mêmes droits que le dossier. Les règles SLA sont lisibles par tout profil authentifié. |
| Rôles autorisés à modifier | Dates du dossier : Facility Manager en mise à jour directe. Règles SLA : Facility Manager. Date d’ordre : Direction ou Facility Manager. |
| Événement de création | Trigger `prepare_anomaly()` à l’insertion ; `work_orders.due_at` copie ensuite `intervention_due_at`. |
| Événements de mise à jour | Mise à jour explicite seulement. Le trigger actuel ne recalcule pas les SLA si la priorité, la catégorie ou l’équipement change après la création. |
| Hors ligne | Pas de calcul serveur disponible hors connexion ni de réconciliation au retour réseau. L’affichage peut utiliser une date de démonstration locale. |
| État | **Partiel** : données réelles présentes, mais sélection de phase simplifiée, possible péremption après requalification et divergence dossier/ordre. |

### 4.5 Acteur bloquant

| Dimension | Résultat |
|---|---|
| Définition | Acteur concret dont l’intervention, la décision, le devis, la validation ou l’information est attendue et bloque le dossier. |
| Source actuelle | Aucune. Les statuts `EN_ATTENTE_DEVIS` ou `EN_ATTENTE_PREUVE` indiquent seulement une situation d’attente. |
| Table / colonne / type / fonction | Aucune colonne `blocking_*`, aucune table de blocage et aucune fonction de déclaration/résolution. |
| Fichiers et composants utilisateurs | `app/page.tsx:1246` force actuellement `isBlocked:false`; `AntiZombieSummary` affiche donc « Aucun blocage déclaré ». |
| Valeur enregistrée ou calculée | Non enregistrée et non calculable de façon fiable. Un prestataire, une personne, un rôle ou un système ne peuvent pas être distingués. |
| Rôles autorisés à consulter | Sans objet. |
| Rôles autorisés à modifier | Sans objet. |
| Événement de création | Absent. |
| Événement de mise à jour | Absent, y compris la résolution. |
| Hors ligne | Absent. |
| État | **Absent**. |

### 4.6 Motif du blocage ou du retard

| Dimension | Résultat |
|---|---|
| Définition | Explication explicite de la cause du blocage ou du dépassement, conservée avec la date, le déclarant et sa résolution. |
| Source actuelle | Aucune source générique. `qualifications.decision_reason`, `anomalies.risk_validation_comment`, `proofs.rejection_reason`, `vendor_intervention_reports.rejection_reason` et `anomalies.closure_comment` sont des commentaires spécialisés. |
| Table / colonne / type / fonction | Aucun champ de blocage. `anomaly_history.comment` existe mais le trigger actuel ne le renseigne pas. |
| Fichiers et composants utilisateurs | `app/page.tsx:1247` transmet `null`; le contrat affiche « Motif non renseigné » si retard/blocage, sinon « Aucun retard ou blocage signalé ». |
| Valeur enregistrée ou calculée | Non enregistrée. Le simple fait d’être en retard est calculé, mais sa cause ne l’est pas. |
| Rôles autorisés à consulter | Sans objet pour un motif de blocage canonique. |
| Rôles autorisés à modifier | Sans objet. |
| Événement de création | Absent. |
| Événement de mise à jour | Absent ; aucune résolution ni conservation du motif initial. |
| Hors ligne | Absent. |
| État | **Absent**. |

### 4.7 Preuve attendue

| Dimension | Résultat |
|---|---|
| Définition | Liste explicite des pièces encore requises pour ce dossier, distincte des preuves déjà déposées et validées. |
| Source actuelle | Règles générales : `categories.proof_policy` et `status_definitions.requires_proof`. Preuves reçues : `proofs`, mais elles ne décrivent pas ce qui était attendu. |
| Tables / colonnes / types / fonctions | `proof_policy` (`never`, `optional`, `always`, `critical_only`, `conditional`), booléen `requires_proof`; `proofs.proof_type` et `verification_status`; verrou critique `has_accepted_proof()`. |
| Fichiers et composants utilisateurs | `app/lib/supabase/data.ts:101,124-125,149-150` ne charge que les preuves reçues ; `app/page.tsx:1249` code en dur WILO-01 ; `AntiZombieSummary`. |
| Valeur enregistrée ou calculée | Le besoin général est enregistré. Le type, le nombre et les critères attendus par dossier ne le sont pas. WILO-01 est une convention de maquette, pas une règle canonique. |
| Rôles autorisés à consulter | Catégories/statuts : tous les profils authentifiés. Preuves reçues : tout rôle ayant accès au dossier. |
| Rôles autorisés à modifier | Règles de référence : Facility Manager. Dépôt : Facility Manager ou agent interne autorisé ayant accès au dossier. Validation : Facility Manager uniquement. |
| Événement de création | La politique générale est seedée. Aucune exigence précise n’est instanciée au constat, à la qualification, à la décision ou au passage en attente de preuve. |
| Événements de mise à jour | Les preuves déposées changent d’état `pending/accepted/rejected`; aucune exigence attendue n’est marquée satisfaite, remplacée ou levée. |
| Hors ligne | Aucun upload réel différé, aucune compression et aucun rattachement idempotent. L’écran WILO simule seulement une ronde prête à synchroniser. |
| État | **Partiel**. |

### 4.8 Dernière activité / historique

| Dimension | Résultat |
|---|---|
| Définition | Dernier événement métier significatif du dossier avec date et heure, action compréhensible, acteur et étape du workflow. |
| Source actuelle | `anomaly_history`; étape déductible par jointure de `to_status_id` vers `status_definitions.stage_id`. `audit_events` reste une piste technique séparée. |
| Table / colonnes / fonction | `event_type`, `from_status_id`, `to_status_id`, `actor_profile_id`, `comment`, `change_set`, `occurred_at`, `transaction_id`; trigger `record_anomaly_history()`. |
| Fichiers et composants utilisateurs | Types générés dans `app/lib/supabase/database.types.ts:182-245`; le chargeur `app/lib/supabase/data.ts` ne lit pas `anomaly_history`; `app/page.tsx:1250` transmet `null`. |
| Valeur enregistrée ou calculée | Enregistrée pour création et changements de statut, priorité, affectation ou réarmement. Le trigger ne renseigne jamais `comment`. |
| Rôles autorisés à consulter | Tous les rôles pouvant consulter le dossier via `can_access_anomaly`. |
| Rôles autorisés à modifier | Aucun rôle en écriture directe ; le trigger `SECURITY DEFINER` ajoute les lignes. |
| Événement de création | Insertion d’une anomalie, puis changements ciblés sur l’anomalie. |
| Événements de mise à jour | L’historique est append-only dans le comportement actuel, mais il ne couvre pas automatiquement une qualification, un ordre, une intervention, une preuve ou un coût si aucune des cinq colonnes surveillées de l’anomalie ne change. |
| Hors ligne | Aucun journal local réconciliable. `occurred_at` est produit par le serveur, donc fiable seulement après écriture en ligne. |
| État | **Partiel** : vraie base métier, mais couverture insuffisante et non chargée par le frontend. `updated_at` ne doit pas la remplacer. |

## 5. Contrôles particuliers

### 5.1 Prochaine action : examen de toutes les pistes

| Piste | Constat | Verdict |
|---|---|---|
| Dossier `anomalies` | Aucun champ d’action courante. | Non trouvée. |
| Étape active du workflow | Le statut indique une phase, mais plusieurs actions peuvent être possibles dans une même phase. | Insuffisant pour une action exacte. |
| Qualification / décision | `decision_code` et `decision_reason` décrivent une décision passée. | Pas une action courante. |
| Intervention | `summary`, `outcome` et `technical_details` décrivent le travail en cours ou passé. | Pas une action pilotable. |
| Ordre de travail | `instructions` se rapproche d’une consigne, mais il n’existe pas de notion de tâche active unique, d’état d’action, de remplacement ni de clôture. Plusieurs ordres peuvent exister. | Candidat partiel, non canonique. |
| Notification | `notification_rules.expected_action` est un modèle générique par événement. La table `notifications` ne copie pas cette valeur et aucune notification opérationnelle n’existe actuellement. | Pas dossier-spécifique. |
| Historique | Il décrit ce qui s’est passé, non ce qui doit se passer. | Ne doit pas être inversé en action future. |
| File Faustin | `qualify`, `late` ou `proof` est l’état de l’écran, pas celui du dossier. | Source rejetée. |

Conclusion : la **prochaine action est absente**. Elle ne doit plus être déduite de la file active dans le futur raccordement canonique.

### 5.2 Blocage : cycle actuellement impossible

Le schéma ne permet pas d’enregistrer de manière liée :

1. la déclaration d’un blocage ;
2. l’acteur qui bloque ;
3. le motif ;
4. la date de début ;
5. l’utilisateur ayant déclaré le blocage ;
6. la résolution, sa date et son auteur ;
7. la conservation du cycle dans l’historique.

Les statuts d’attente, les commentaires de risque, les raisons de décision et les rejets de preuve ne doivent pas être convertis automatiquement en blocage : ils n’ont pas la même sémantique et ne contiennent pas tous les éléments obligatoires.

### 5.3 Preuve attendue : portée réelle des règles

- **Type d’anomalie / catégorie** : oui, mais seulement sous forme de politique générale `proof_policy`.
- **Équipement** : aucune règle de preuve attendue structurée n’a été trouvée.
- **Gravité / priorité** : `critical_only` permet une condition générale ; le verrou critique vérifie uniquement l’existence d’au moins une preuve acceptée.
- **Étape du workflow** : `status_definitions.requires_proof` indique un besoin, sans type ni critères.
- **Règle de validation** : la preuve déposée a un état de vérification ; cela ne définit pas l’exigence initiale.
- **Décision du Facility Manager** : aucune exigence de preuve précise n’est enregistrée lors de la qualification ou de la décision.

Conclusion : WILO-01 ne peut pas servir de règle globale. L’exigence exacte doit être instanciée sur chaque dossier.

### 5.4 Dernière activité : qualité réelle de l’historique

`anomaly_history` contient bien :

- la date et l’heure (`occurred_at`) ;
- l’action technique (`event_type`) ;
- l’acteur (`actor_profile_id`, potentiellement nul hors contexte utilisateur) ;
- les statuts avant/après, permettant de retrouver l’étape.

Il manque toutefois :

- un libellé métier complet pour toutes les actions ;
- le commentaire transmis aux RPC, car `record_anomaly_history()` ne remplit pas `comment` ;
- les événements métier qui ne modifient pas les colonnes surveillées de `anomalies` ;
- le chargement de cet historique dans le frontend.

`anomalies.updated_at` n’est donc pas une preuve suffisante de dernière activité métier. Il peut changer pour une modification technique ou ne pas changer lors d’un événement dans une table liée.

## 6. Structures et fichiers concernés

### Supabase

- `supabase/migrations/20260824000200_reference_data.sql:66,130,199,221` : politiques de preuve, obligation par statut, actions automatiques de seuil et actions de notification.
- `supabase/migrations/20260824000300_operations.sql:62-97` : dossier, statut, responsable et échéances.
- `supabase/migrations/20260824000300_operations.sql:99-179` : qualification, ordre de travail, intervention et preuves déposées.
- `supabase/migrations/20260824000300_operations.sql:204-252` : notifications, historique métier et audit technique.
- `supabase/migrations/20260824000400_business_rules.sql:69-146` : résolution et enregistrement initial des SLA.
- `supabase/migrations/20260824000400_business_rules.sql:196-253` : historique partiel du dossier.
- `supabase/migrations/20260826162326_remove_vendor_access_internal_vendor_report_upload.sql:392-565` : workflow opérationnel final et droits métier par étape.
- `supabase/migrations/20260826165211_grant_internal_vendor_report_permissions.sql:68-93` : accès final au dossier par rôle et périmètre.
- `supabase/seed.sql:139-156,229-281,284-355` : catégories, statuts, transitions, SLA et modèles de notification.

### Frontend

- `app/components/anti-zombie-contract.ts` : contrat d’entrée et valeurs de repli.
- `app/components/AntiZombieSummary.tsx` : rendu des huit informations.
- `app/page.tsx:1238-1250` : adaptateur Faustin provisoire.
- `app/page.tsx:1321` : intégration unique dans Faustin.
- `app/page.tsx:1368` : déduction indépendante de prochaine action dans le dossier central, non raccordée à ce lot.
- `app/lib/supabase/data.ts:13-25` : type opérationnel simplifié.
- `app/lib/supabase/data.ts:80-150` : sélection distante, simplification du statut, responsable, échéance et preuves reçues.
- `app/lib/supabase/database.types.ts` : types générés qui exposent les structures présentes mais non chargées.

## 7. Proposition minimale de raccordement — sans implémentation

### 7.1 Principes

Conserver les sources existantes lorsqu’elles sont valides :

- statut et responsable depuis `anomalies` ;
- échéances depuis les instantanés SLA du dossier ;
- dernière activité depuis un historique métier renforcé ;
- ne jamais recopier ces valeurs dans le composant.

Ajouter uniquement les concepts absents : action courante, blocage et exigence de preuve dossier. Exposer ensuite une vue ou une fonction de lecture unique, sans nouvelle permission d’action.

### 7.2 Modèle minimal proposé

#### A. `anomaly_actions`

Une ligne représente une action dossier, avec au maximum une action `pending` désignée comme courante.

Champs proposés :

| Champ | Obligation | Rôle |
|---|---|---|
| `id uuid` | obligatoire | Identité générée côté client ou serveur. |
| `anomaly_id uuid` | obligatoire | Dossier concerné. |
| `action_code text` | obligatoire | Code stable et contrôlé. |
| `label text` | obligatoire | Action lisible, sans la déduire de l’UI. |
| `assigned_profile_id uuid` | facultatif | Exécutant précis lorsqu’il est connu. |
| `assigned_role_id uuid` | facultatif | Rôle attendu si la personne n’est pas encore nommée. |
| `due_at timestamptz` | facultatif | Échéance propre à l’action si différente du SLA dossier. |
| `status text` | obligatoire | `pending`, `completed`, `cancelled`. |
| `source_type`, `source_id` | facultatifs | Qualification, ordre, intervention ou décision ayant créé l’action. |
| `created_by_profile_id`, `created_at` | obligatoires | Traçabilité. |
| `completed_by_profile_id`, `completed_at` | facultatifs | Clôture de l’action. |
| `idempotency_key uuid`, `base_version integer` | obligatoires pour la synchronisation | Prévention des doublons et conflits futurs. |

Règles proposées : une seule action courante par dossier ; tout remplacement clôture ou annule l’ancienne action et écrit un événement d’historique.

#### B. `anomaly_blocks`

| Champ | Obligation | Rôle |
|---|---|---|
| `id`, `anomaly_id` | obligatoires | Identité et dossier. |
| `blocking_party_type` | obligatoire | `profile`, `role`, `external`, `system`. |
| `blocking_profile_id` / `blocking_role_id` / `blocking_label` | conditionnels | Un seul acteur explicite selon le type. |
| `reason` | obligatoire | Motif du blocage. |
| `declared_at`, `declared_by_profile_id` | obligatoires | Déclaration. |
| `resolved_at`, `resolved_by_profile_id`, `resolution_comment` | facultatifs jusqu’à résolution | Fin du blocage. |
| `idempotency_key`, `base_version` | obligatoires pour la synchronisation | Déduplication et conflits. |

Règles proposées : un dossier n’est « bloqué » que s’il possède un blocage non résolu ; acteur et motif sont obligatoires à la création ; la résolution ne supprime jamais la ligne.

#### C. `anomaly_proof_requirements`

Cette table représente ce qui est attendu, distinctement de `proofs`, qui représente ce qui a été fourni.

| Champ | Obligation | Rôle |
|---|---|---|
| `id`, `anomaly_id` | obligatoires | Identité et dossier. |
| `proof_type` | obligatoire | Type attendu compatible avec le référentiel des preuves. |
| `label` | obligatoire | Formulation métier précise. |
| `minimum_count` | obligatoire, défaut 1 | Quantité exigée. |
| `acceptance_criteria jsonb` | facultatif | Critères de validation si définis. |
| `source_policy` | obligatoire | `category`, `status`, `priority`, `equipment`, `fm_decision`. |
| `source_id` | facultatif | Règle ou décision d’origine. |
| `status` | obligatoire | `pending`, `satisfied`, `waived`. |
| `fulfilled_by_proof_id` | facultatif | Preuve acceptée satisfaisant l’exigence. |
| `created_by_profile_id`, `created_at`, `resolved_at` | traçabilité | Cycle de vie. |

Règle proposée : instancier une exigence au moment de la qualification ou d’une décision explicite du Facility Manager. Ne pas recalculer silencieusement l’exigence historique si les règles de référence changent.

#### D. Historique et lecture consolidée

- conserver `anomaly_history` comme journal métier append-only ;
- y ajouter systématiquement les événements `action_created/completed/replaced`, `block_declared/resolved`, `proof_required/submitted/accepted/rejected`, ainsi que les événements d’ordre et d’intervention ;
- renseigner `comment`, `actor_profile_id`, `occurred_at` serveur et l’étape concernée ;
- créer ensuite une vue `security_invoker` ou une fonction de lecture respectant `can_access_anomaly`, par exemple `get_anti_zombie_summary`, qui compose les sources sans recalculer les règles métier dans React.

Le nom et la forme exacts de la vue ou du RPC restent à valider après le dictionnaire métier.

### 7.3 Droits RLS proposés

| Donnée | Lecture | Création / modification proposées |
|---|---|---|
| Action courante | Tout rôle ayant `can_access_anomaly`. | Facility Manager ; agent affecté uniquement pour marquer sa propre action terminée, si cette règle est validée. Direction : lecture, sauf pouvoir d’arbitrage explicitement confirmé. |
| Blocage | Tout rôle ayant accès au dossier. | Facility Manager et agent interne affecté pour déclarer ; résolution par déclarant ou Facility Manager. Les droits exacts doivent être validés métier. |
| Exigence de preuve | Tout rôle ayant accès au dossier. | Facility Manager pour créer/lever ; satisfaction automatique uniquement après preuve acceptée. |
| Historique | Tout rôle ayant accès au dossier. | Écriture par fonctions transactionnelles uniquement, jamais par insertion frontend libre. |

Les vues futures doivent utiliser `security_invoker` ou appliquer explicitement `can_access_anomaly`. Aucun droit `anon`, aucun accès prestataire et aucune élévation de permission ne sont proposés.

### 7.4 Stratégie pour les anciens dossiers

- ne pas inventer de prochaine action, de blocage, de motif ou de preuve attendue ;
- laisser les valeurs absentes et conserver les libellés de repli visibles ;
- prévoir une file de revue Facility Manager « Informations anti-zombie à compléter » ;
- ne pas reconstruire un faux historique depuis `updated_at` ;
- n’instancier une preuve attendue historique qu’après confirmation métier ;
- conserver les statuts, responsables et échéances déjà présents.

La préproduction ne contenant actuellement aucun dossier opérationnel, le déploiement futur pourrait être purement additif et sans backfill de données métier.

### 7.5 Hors ligne

Le produit ne dispose pas aujourd’hui d’un vrai mode hors ligne. Pour éviter des données contradictoires lors d’un futur lot :

- générer les UUID et clés d’idempotence côté client ;
- conserver les commandes dans une outbox locale chiffrable, pas dans le simple état React ;
- envoyer `base_version` et refuser ou résoudre explicitement les modifications concurrentes ;
- horodater l’événement métier côté serveur, tout en conservant séparément l’heure client si nécessaire ;
- mettre les fichiers de preuve dans une file séparée avec empreinte SHA-256 ;
- en lecture hors ligne, marquer la synthèse comme « données en cache » avec date de dernière synchronisation ;
- tant que ce lot n’existe pas, ne pas prétendre qu’une modification de dossier est persistée hors connexion.

### 7.6 Migration et retour arrière envisagés

Sans créer de migration maintenant, l’approche future recommandée est :

1. migration additive des nouvelles tables, contraintes, index et RLS ;
2. fonctions transactionnelles de création/résolution et enrichissement de l’historique ;
3. vue/RPC de lecture consolidée ;
4. activation frontend derrière un drapeau local ;
5. recette en préproduction avant extension au registre et au dossier central.

Retour arrière : désactiver d’abord le nouveau raccordement frontend ; conserver les données ajoutées ; préférer une migration corrective à une suppression destructive. Une suppression des tables ne serait acceptable qu’avant toute utilisation réelle, après vérification qu’elles sont vides et export de sécurité.

### 7.7 Tests nécessaires

- pgTAP des contraintes : action courante unique, blocage complet, résolution traçable, exigence de preuve satisfaite seulement par une preuve acceptée ;
- tests RLS pour Direction, Facility Manager, agents dans/hors périmètre, rôle Lecture seule, `anon` et absence de prestataire ;
- tests des fonctions transactionnelles, idempotence et conflits de version ;
- tests SLA après changement de priorité/catégorie/équipement ;
- tests d’historique pour chaque événement métier et tri déterministe `occurred_at` + identifiant ;
- tests de l’adaptateur sur données complètes, nulles et anciennes ;
- tests hors ligne : reprise, doublon, conflit, échec upload, reconnexion et ordre des événements ;
- tests de performance et index sur la vue/RPC de synthèse ;
- non-régression du seuil de décision de 350 000 FCFA, du verrou critique et des permissions existantes.

## 8. Risques métier et techniques

| Risque | Effet |
|---|---|
| Prochaine action déduite de l’écran | Deux utilisateurs peuvent voir une action différente pour le même dossier. |
| Responsable dossier et responsable ordre divergents | La responsabilité devient contestable et le dossier peut rester sans pilote réel. |
| SLA non recalculé après requalification | Un dossier peut être affiché à tort en retard ou dans les délais. |
| Statuts réduits à cinq états | Les situations Décision, attente devis et attente preuve perdent leur précision. |
| Blocage inféré d’un statut d’attente | L’acteur et la cause risquent d’être faux. |
| Preuve attendue confondue avec preuve déposée | Un dossier peut paraître complet alors que la pièce exigée n’est pas définie. |
| Historique incomplet | La « dernière activité » peut ignorer une intervention, une preuve ou une décision réelle. |
| Repli automatique vers la démo | L’absence de données distantes peut être masquée par des données fictives. |
| Calcul du retard côté navigateur | Heure locale incorrecte ou fuseau mal configuré peuvent altérer l’indicateur. |
| Future vue mal sécurisée | Une vue `SECURITY DEFINER` ou sans filtre pourrait contourner la RLS. |
| Écritures hors ligne sans idempotence | Doublons, ordre incohérent et écrasement de décisions. |

## 9. Découpage proposé en petits lots

| Lot | Contenu | Condition de sortie |
|---|---|---|
| A — Validation métier | Valider les définitions, la notion de responsable, les droits de déclaration/résolution d’un blocage et la matrice de preuves. | Dictionnaire approuvé par l’Administration et Faustin. |
| B — Fiabilisation des sources existantes | Statut canonique non simplifié dans le modèle de lecture, règle claire responsable dossier/ordre, stratégie de recalcul SLA. | Tests SQL et aucun changement visuel. |
| C — Prochaine action | Ajouter le cycle `anomaly_actions`, son historique et ses RLS. | Une action dossier unique, traçable et remplaçable. |
| D — Blocage | Ajouter déclaration et résolution de `anomaly_blocks`. | Acteur, motif, dates et auteurs toujours disponibles. |
| E — Preuve attendue | Ajouter les exigences dossier et leur satisfaction par preuve acceptée. | Aucun code en dur WILO et distinction attendu/reçu. |
| F — Historique consolidé | Couvrir tous les événements métier et fournir la dernière activité réelle. | Date, action, acteur et étape garantis. |
| G — Raccordement Faustin | Ajouter la vue/RPC et remplacer uniquement l’adaptateur provisoire de Faustin. | Huit champs canoniques, replis conservés, aucune permission ajoutée. |
| H — Résilience hors ligne | Outbox, idempotence, conflits et pièces jointes différées. | Recette réseau coupé/reconnexion sans perte ni doublon. |
| I — Extension éventuelle | Après nouvelle validation, seulement alors étudier registre et dossier central. | GO séparé obligatoire. |

## 10. Captures réelles du checkpoint accepté

Ces captures proviennent du rendu local réel du composant au checkpoint `8d26974`. Elles documentent la présentation validée, pas la présence de données canoniques manquantes.

### Desktop — cockpit Faustin

![Capture desktop réelle du cockpit Faustin avec AntiZombieSummary](../../outputs/design/anti-zombie-faustin-desktop.png)

### Mobile — cockpit Faustin

![Capture mobile réelle du cockpit Faustin avec AntiZombieSummary](../../outputs/design/anti-zombie-faustin-mobile.png)

## 11. Décisions à valider avant toute implémentation

1. Le « responsable » affiché est-il toujours le pilote global du dossier ou l’exécutant de l’action courante ?
2. La Direction peut-elle modifier une action ou seulement arbitrer/lire ?
3. Un agent affecté peut-il déclarer et résoudre lui-même un blocage ?
4. Autorise-t-on plusieurs blocages simultanés ou un seul blocage actif par dossier ?
5. Qui définit la preuve exacte : règle de référence, Facility Manager à la qualification, ou combinaison des deux ?
6. Une modification de priorité doit-elle recalculer les échéances, et faut-il conserver l’ancienne échéance dans l’historique ?
7. Quelle activité doit primer si plusieurs événements ont exactement la même heure ?

## 12. Pause du chantier

L’audit est terminé. Aucun raccordement, aucune migration, aucune nouvelle règle, aucune modification d’interface et aucune publication n’ont été réalisés. Le chantier est remis en pause dans l’attente d’une validation explicite.
