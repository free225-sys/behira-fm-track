# BEHIRA FM Track — Lot B2 documentaire

## Fermeture des décisions métier et correction des incohérences de `AntiZombieSummary`

Date : 28 août 2026

Checkpoint d'entrée : `2c2d564`

Statut : proposition documentaire soumise à validation avant toute migration

Périmètre : catalogues, gouvernance, droits, preuves, données canoniques, historique, hors ligne et backlog visuel de la règle anti-dossier-zombie

Intervention : aucun code, aucune interface, aucune migration, aucune politique RLS, aucun rôle, aucun droit, aucune donnée Supabase et aucune publication modifiés

## 1. Résultat du lot B2

Le lot B2 ferme les ambiguïtés visibles dans les captures et propose les règles minimales nécessaires pour préparer un premier lot de migration sans l'exécuter.

Les conclusions principales sont :

- `Sylvain DOUANE` dans le formulaire Faustin est une valeur préremplie de maquette, pas le responsable canonique ;
- `28/08/2026` dans le formulaire est une proposition sans heure et non enregistrée, pas l'échéance canonique ;
- `Confirmer le diagnostic` est actuellement déduit de la file Faustin et n'est pas une prochaine action enregistrée ;
- `Choisir la branche de traitement` est une commande proposée dans le formulaire, visible trop tôt tant que le diagnostic n'a pas été confirmé ;
- `ACTIF` est aujourd'hui un indicateur calculé à partir de l'absence de retard ou de blocage, pas un état du cycle de vie ;
- la future synthèse doit afficher seulement des données confirmées par le serveur ;
- une proposition ou un brouillon reste visuellement séparé jusqu'à la réussite de la transaction et au retour de la projection canonique ;
- les décisions sensibles, validations finales et clôtures restent en ligne.

## 2. Hiérarchie des sources

L'ordre d'autorité appliqué est :

1. instruction `GO — Lot B2` du 28 août 2026 ;
2. validations du lot A et du lot B ;
3. PRD consolidé `docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md` ;
4. réponses validées de l'Administration dans `outputs/BEHIRA_ECARTS_CIBLE_VALIDEE_2026-08-27.md` ;
5. décision `docs/DECISION_ACCES_PRESTATAIRES.md` ;
6. cahier des charges et référentiel V3 cités dans le lot A ;
7. schéma, migrations et seed existants comme preuve technique ;
8. captures et maquette comme preuve de l'existant, jamais comme source de règle métier.

## 3. Constat exact issu des captures et du code

| Élément visible | Constat technique | Qualification métier |
|---|---|---|
| `Responsable non attribué` | La synthèse lit `Anomaly.owner`, qui vaut `Non affectée`, puis l'adaptateur le transforme en absence. | Valeur courante de démonstration du dossier. |
| `Sylvain DOUANE` | Le `<select>` utilise seulement un `defaultValue` selon l'équipement ; la valeur n'est pas pilotée par un état et aucun appel d'écriture ne l'enregistre. | Proposition préremplie de maquette, non canonique. |
| `Aujourd'hui · 12:00` | La synthèse affiche `Anomaly.due`, fourni par les données de démonstration ou le mapping Supabase existant. | Échéance courante affichée ; dans la maquette, elle reste une donnée de démonstration. |
| `28/08/2026` | Le champ date possède un `defaultValue="2026-08-28"`, sans heure ni écriture. | Nouvelle date proposée, incomplète et non enregistrée. |
| `Confirmer le diagnostic` | L'adaptateur déduit le texte depuis la file active : preuve ou autre file. | Texte de démonstration, pas une action canonique. |
| `Choisir la branche de traitement` | Le formulaire est toujours affiché dans la fiche de décision Faustin et ses choix restent locaux. | Commande proposée ; elle ne doit devenir disponible qu'après diagnostic confirmé. |
| `ACTIF` | Le composant affiche `ACTIF` lorsque `isBlocked` et `isDelayed` sont faux. | Indicateur de continuité calculé, pas statut ou étape. |
| `À qualifier` | Vient de `Anomaly.status`, lui-même simplifié dans le frontend. | Statut opérationnel du workflow, à raccorder au statut Supabase exact. |

Références de code constatées :

- adaptateur de synthèse : `app/page.tsx:1238-1250` ;
- état local du formulaire : `app/page.tsx:1258-1260` ;
- responsable et date préremplis : `app/page.tsx:1331-1332` ;
- mention « aucune écriture en base » : `app/page.tsx:1340` ;
- badge `ACTIF` et libellé actuel : `app/components/AntiZombieSummary.tsx:25-28`.

## 4. Règle valeur canonique, proposition et brouillon

### 4.1 Définitions

| Notion | Définition | Peut alimenter `AntiZombieSummary` |
|---|---|---|
| Valeur actuelle canonique | Valeur confirmée par une transaction serveur, conforme aux contraintes, RLS et règles métier, avec version et événement d'historique. | Oui. |
| Modification proposée | Valeur saisie dans un formulaire mais non encore envoyée ou validée. | Non. |
| Brouillon local | Proposition enregistrée sur l'appareil ou dans un espace de brouillon distinct, sans effet sur le dossier. | Non. |
| Modification en cours | Requête envoyée mais sans réponse de succès. | Non. |
| Modification enregistrée | Transaction confirmée, historique écrit et version du dossier incrémentée. | Oui, après retour de la projection canonique. |
| Donnée hors ligne en attente | Opération placée dans l'outbox mais non synchronisée. | Non ; elle s'affiche séparément comme proposition locale. |

### 4.2 Règle applicable aux cinq informations modifiables

| Information | Valeur actuelle | Proposition | Moment de bascule canonique |
|---|---|---|---|
| Responsable | `anomalies.assigned_profile_id` confirmé. | Profil choisi dans le formulaire. | Après transaction autorisée, historique d'affectation et nouvelle version. |
| Échéance | Échéance active dans `anomaly_deadlines`. | Date, heure, justification et origine proposées. | Après création d'une nouvelle échéance, remplacement explicite de l'ancienne et historique complet. |
| Prochaine action | Unique action `pending` du dossier. | Code, exécutant et commentaire proposés. | Après terminaison/remplacement atomique de l'action précédente et création de la nouvelle. |
| Blocage | Unique blocage non résolu. | Acteur, catégorie et précision saisis. | Après transaction de déclaration et événement d'historique. |
| Preuves attendues | Exigences actives instanciées sur le dossier. | Renforcement proposé par Faustin. | Après ajout ou remplacement explicite, sans suppression silencieuse d'une exigence obligatoire. |

### 4.3 Actualisation de la projection

La projection n'est actualisée qu'après :

1. authentification et contrôle du profil ;
2. validation des droits, du périmètre et de la version de base ;
3. écriture atomique des objets métier ;
4. écriture de l'événement d'historique ;
5. incrément de `anomalies.version_no` ;
6. commit de la transaction ;
7. retour de la nouvelle ligne canonique ou relecture de `anti_zombie_summary_v` pour la version retournée.

Le frontend ne transforme pas une saisie locale en état courant par simple mise à jour optimiste. Après un échec, la proposition reste visible comme non enregistrée et la synthèse conserve la valeur serveur précédente.

## 5. État du dossier, étape, statut et continuité

Les captures mélangent actuellement trois notions.

| Notion cible | Source | Exemple pour la capture | Libellé UI proposé |
|---|---|---|---|
| État du dossier | `status_definitions.is_closed` du statut courant | `Ouvert` | `État du dossier` |
| Étape actuelle | `status_definitions.stage_id` → `workflow_stages` | `Qualification` | `Étape actuelle` |
| Statut opérationnel | `anomalies.current_status_id` → `status_definitions` | `À qualifier` | Sous-libellé de l'étape ou `Statut opérationnel` si nécessaire |
| Continuité du traitement | Calcul : blocage actif, retard serveur, sinon normal | `Normale` dans la capture | `Continuité du traitement` |

Règles :

- aucun nouvel état ou statut n'est créé ;
- `Ouvert`/`Clôturé` est un libellé dérivé de `is_closed`, pas une nouvelle colonne ;
- la condition de traitement suit la priorité `Bloquée` puis `En retard` puis `Normale` ;
- `ACTIF` est abandonné dans le futur backlog, car il peut être confondu avec l'état du cycle de vie ;
- la case actuelle `Statut : À qualifier` devient `Étape actuelle : Qualification` avec le détail `À qualifier` ;
- la projection expose séparément `is_closed`, `stage_code/label`, `status_code/label` et la condition de traitement calculée.

## 6. Catalogue initial des prochaines actions

Le catalogue utilise uniquement les six étapes et les statuts existants. Une action ne crée jamais une étape supplémentaire.

Abréviations : `ADM` Administration, `FM` Facility Manager, `AGT` agent terrain autorisé, `SYS` système.

| Ordre | Code stable | Libellé utilisateur | Étape | Statuts compatibles | Sélection | Acteur attendu | Commentaire | Actif | Événement terminal | Action suivante éventuelle |
|---:|---|---|---|---|---|---|---|---|---|---|
| 10 | `QUALIFY_ASSIGN` | Qualifier et affecter | Qualification | `NOUVEAU`, `A_QUALIFIER` | FM | FM | Facultatif, obligatoire si exception | Oui | Qualification initiale et responsable enregistrés | `PERFORM_DIAGNOSIS` |
| 20 | `PERFORM_DIAGNOSIS` | Réaliser et confirmer le diagnostic | Qualification | `A_QUALIFIER` | FM | AGT responsable | Obligatoire | Oui | Diagnostic enregistré par l'agent | `CHOOSE_TREATMENT_BRANCH` |
| 30 | `CHOOSE_TREATMENT_BRANCH` | Choisir la branche de traitement | Qualification vers Décision/Intervention | `A_QUALIFIER` | FM | FM | Décision motivée obligatoire | Oui | Branche A, B, C, surveillance, urgence ou fausse alerte enregistrée | Selon branche |
| 40 | `MONITOR_REASSESS` | Surveiller et réévaluer | Décision | `SOUS_SURVEILLANCE` | FM | AGT responsable | Obligatoire pour le résultat | Oui | Contrôle de surveillance enregistré | Répéter, intervenir ou préparer la preuve |
| 50 | `OBTAIN_QUOTE` | Obtenir et rattacher le devis | Décision | `INTERVENTION_PRESTATAIRE`, `EN_ATTENTE_DEVIS` | FM | AGT interne désigné ; Laetitia si son périmètre administratif est validé | Facultatif ; référence du besoin obligatoire | Oui | Devis rattaché au dossier | `SUBMIT_ADMIN_ARBITRATION` ou `PLAN_INTERVENTION` |
| 60 | `SUBMIT_ADMIN_ARBITRATION` | Soumettre l'arbitrage à l'Administration | Décision | `A_QUALIFIER`, `SOUS_SURVEILLANCE`, `EN_ATTENTE_DEVIS`, `INTERVENTION_PRESTATAIRE` | FM | ADM | Obligatoire | Oui | Décision Administration enregistrée | `PLAN_INTERVENTION`, nouvelle demande ou surveillance |
| 70 | `PLAN_INTERVENTION` | Planifier l'intervention | Intervention | `CORRECTION_INTERNE_SIMPLE`, `INTERVENTION_INTERNE_PLANIFIEE`, `INTERVENTION_PRESTATAIRE`, `URGENCE_IMMEDIATE` | FM | Responsable interne | Instructions obligatoires | Oui | Ordre de travail planifié | `EXECUTE_INTERVENTION` |
| 80 | `EXECUTE_INTERVENTION` | Réaliser l'intervention | Intervention | `CORRECTION_INTERNE_SIMPLE`, `INTERVENTION_INTERNE_PLANIFIEE`, `INTERVENTION_PRESTATAIRE`, `URGENCE_IMMEDIATE`, `EN_COURS` | FM | AGT responsable | Compte rendu obligatoire | Oui | Intervention terminée ou résultat provisoire enregistré | `RECEIVE_INTERVENTION` ou `SUBMIT_REQUIRED_PROOF` |
| 90 | `FOLLOW_UP_BLOCKER` | Relancer et traiter le blocage | Toute étape non clôturée | Tout statut non fermé | FM ou ADM selon blocage | Responsable interne | Obligatoire | Oui | Résolution du blocage confirmée | Nouvelle action issue de l'étape courante |
| 100 | `RECEIVE_INTERVENTION` | Contrôler la réception | Intervention/Preuve | `EN_COURS`, `RESOLU` | FM | FM | Obligatoire si réserve/refus | Oui | Réception acceptée ou réserves créées | `LIFT_RESERVATIONS`, `SUBMIT_REQUIRED_PROOF` ou `VALIDATE_PROOF` |
| 110 | `LIFT_RESERVATIONS` | Corriger et lever les réserves | Preuve | `REFUS_CLOTURE`, `EN_COURS`, `RESOLU` | FM | Responsable interne | Obligatoire | Oui | Réserve levée avec preuve | `VALIDATE_PROOF` |
| 120 | `SUBMIT_REQUIRED_PROOF` | Déposer les preuves attendues | Intervention/Preuve | `EN_COURS`, `EN_ATTENTE_PREUVE`, `RESOLU`, `REFUS_CLOTURE` | FM ou SYS | AGT responsable ou agent interne autorisé | Facultatif hors métadonnées obligatoires | Oui | Dépôt Storage et enregistrement DB confirmés | `VALIDATE_PROOF` |
| 130 | `VALIDATE_PROOF` | Contrôler les preuves | Preuve | `EN_ATTENTE_PREUVE`, `RESOLU`, `REFUS_CLOTURE` | SYS ou FM | FM | Obligatoire en cas de refus | Oui | Preuve acceptée ou refusée | `CLOSE_DOSSIER` ou nouvelle preuve |
| 140 | `CLOSE_DOSSIER` | Clôturer techniquement le dossier | Clôture | `RESOLU`, `EN_ATTENTE_PREUVE` | FM | FM | Obligatoire | Oui | Clôture autorisée, verrou critique contrôlé | Aucune |
| 150 | `REVIEW_REOPENED_DOSSIER` | Réexaminer le dossier rouvert | Qualification/Intervention | `CLOTURE` avant réouverture | FM ou ADM | FM | Motif obligatoire | Non | Réouverture enregistrée et liée à la clôture précédente | `PERFORM_DIAGNOSIS` ou action adaptée |
| 999 | `OTHER` | Autre action | Toute étape non clôturée | Tout statut non fermé | FM ; ADM pour ses arbitrages | Profil interne autorisé | **Obligatoire** | Oui, jamais par défaut | Événement explicitement défini lors de la sélection | À choisir explicitement |

### 6.1 Règle d'usage de `OTHER`

- `OTHER` n'est jamais proposé comme valeur par défaut ;
- il apparaît après les codes contrôlés ;
- son commentaire décrit l'action, le résultat attendu et l'événement de terminaison ;
- son usage est suivi afin d'identifier un éventuel code manquant ;
- un volume élevé déclenche une revue du catalogue, pas une généralisation du texte libre.

### 6.2 Cohérence de la capture

Pour le dossier `A_QUALIFIER` de la capture :

1. action canonique attendue au début : `QUALIFY_ASSIGN` ;
2. après affectation à Sylvain confirmée : `PERFORM_DIAGNOSIS` ;
3. après diagnostic enregistré par Sylvain : `CHOOSE_TREATMENT_BRANCH` ;
4. après décision Faustin : création de l'action correspondant à la branche.

`Confirmer le diagnostic` et `Choisir la branche de traitement` sont donc successives dans le métier, mais le formulaire actuel les présente simultanément. La future UI devra masquer ou désactiver la branche tant que le diagnostic n'est pas confirmé. La synthèse ne doit jamais déduire l'action de l'écran visible.

Le statut `A_QUALIFIER` peut couvrir les trois sous-actions de Qualification sans créer un nouveau statut. La transition vers la branche existante n'a lieu qu'après `CHOOSE_TREATMENT_BRANCH`.

## 7. Catalogues des motifs de blocage et de retard

### 7.1 Motifs de blocage principal

| Code | Libellé | Origine documentaire | Statut de proposition | Précision libre |
|---|---|---|---|---|
| `DIAGNOSIS_PENDING` | Diagnostic technique attendu | Cycle PRD : diagnostic avant décision | Confirmé par le cycle | Obligatoire pour identifier l'attente |
| `QUOTE_PENDING` | Devis attendu | Statut `EN_ATTENTE_DEVIS`, pièces financières | Confirmé | Obligatoire : entreprise et demande |
| `ADMIN_DECISION_PENDING` | Décision de l'Administration attendue | Seuil 350 000 FCFA, risques et blocages importants | Confirmé | Obligatoire : décision attendue |
| `EXTERNAL_INTERVENTION_PENDING` | Intervention externe attendue | Branche C et notification de retard | Confirmé | Obligatoire : entreprise et engagement |
| `PROOF_PENDING` | Preuve attendue | Statut `EN_ATTENTE_PREUVE` et notifications | Confirmé | Obligatoire : exigence manquante |
| `RESERVATION_OPEN` | Réserve non levée | Réception, réserves et notification dédiée | Confirmé | Obligatoire : réserve concernée |
| `INTERNAL_DEPENDENCY` | Dépendance interne non réalisée | Responsable/prochaine action anti-zombie | Recommandation à valider | Obligatoire : équipe ou action attendue |
| `SITE_ACCESS_CONSTRAINT` | Accès au site ou à l'équipement impossible | Non confirmé explicitement dans les sources prioritaires | Recommandation à valider | Obligatoire |
| `OTHER` | Autre blocage | Besoin de couverture des exceptions | Recommandation contrôlée | **Obligatoire** |

Un blocage en attente de prestataire référence l'entreprise dans `blocking_vendor_id` ou un libellé externe, sans compte, session, rôle ni permission prestataire.

### 7.2 Motifs de retard

| Code | Libellé | Origine documentaire | Statut |
|---|---|---|---|
| `QUALIFICATION_OVERDUE` | Qualification non réalisée dans le délai | Notification « anomalie non qualifiée sous 24 h » | Confirmé |
| `INTERVENTION_OVERDUE` | Intervention non terminée dans le délai | Notification « intervention en retard » | Confirmé |
| `QUOTE_OVERDUE` | Devis non reçu dans le délai | Statut `EN_ATTENTE_DEVIS` et suivi devis | Confirmé dans le principe ; délai exact à valider |
| `PROOF_OVERDUE` | Preuve non déposée dans le délai | Notification après intervention | Confirmé dans le principe ; délai exact à valider |
| `RESERVATION_OVERDUE` | Réserve non levée dans le délai | Notification « réserves non levées » | Confirmé dans le principe |
| `ROUND_OVERDUE` | Ronde attendue non enregistrée | Notifications de ronde | Confirmé |
| `ARBITRATION_OVERDUE` | Arbitrage non rendu dans le délai | Rôle Administration et seuil de décision | Recommandation à valider ; délai absent |
| `OTHER` | Autre motif de retard | Couverture contrôlée | Recommandation ; précision obligatoire |

Le retard est calculé par le serveur. Le code explique la cause ; il ne crée pas le retard.

### 7.3 Motifs de résolution

| Code | Libellé | Statut |
|---|---|---|
| `DEPENDENCY_RECEIVED` | Élément attendu reçu | Recommandation issue du cycle |
| `DECISION_RECORDED` | Décision enregistrée | Confirmé par la traçabilité des décisions |
| `INTERVENTION_COMPLETED` | Intervention terminée | Confirmé par le cycle |
| `PROOF_ACCEPTED` | Preuve acceptée | Confirmé |
| `RESERVATION_LIFTED` | Réserve levée | Confirmé |
| `BLOCK_DECLARED_IN_ERROR` | Blocage déclaré par erreur | Recommandation ; justification obligatoire |
| `OTHER` | Autre résolution | Recommandation ; commentaire obligatoire |

### 7.4 Cycle du blocage

Le dossier de blocage distingue explicitement :

| Information | Contenu attendu |
|---|---|
| Motif contrôlé | `block_reason_code_id` issu du catalogue actif. |
| Précision libre | `reason_detail`, obligatoire pour rendre le cas compréhensible. |
| Type d'acteur | Interne, entreprise externe référencée, externe libre ou système. |
| Acteur bloquant | Référence exacte ou libellé figé ; un externe n'obtient aucun compte. |
| Déclaration | `declared_by_profile_id` et `declared_at` résolus par le serveur. |
| Proposition de résolution | Auteur, date et commentaire de la personne constatant la fin du blocage. |
| Confirmation de résolution | `resolved_by_profile_id`, `resolved_at`, code et motif de résolution. |
| Historique | Événements de déclaration, complément, proposition, confirmation et éventuelle réouverture. |

1. Un rôle autorisé déclare le blocage avec catégorie, précision, acteur et date serveur.
2. Le blocage devient l'unique blocage actif du dossier.
3. Le responsable interne suit l'action même si l'acteur bloquant est externe.
4. La personne qui constate la fin propose la résolution.
5. L'autorité compétente confirme la résolution.
6. La date, l'auteur et le motif de résolution sont enregistrés.
7. Un nouveau blocage peut ensuite être créé ; le précédent reste immuable dans l'historique.

## 8. Gouvernance complète des échéances

### 8.1 Principes

- l'échéance canonique contient toujours une date, une heure et un fuseau (`timestamptz`) ;
- `Aujourd'hui` est uniquement un format d'affichage ;
- l'action courante utilise l'échéance du dossier dans le MVP ; aucune seconde échéance d'action n'est créée ;
- un blocage ne suspend pas automatiquement le SLA ;
- une extension exige une nouvelle échéance historisée ;
- un recalcul crée une nouvelle ligne, il ne modifie pas silencieusement l'ancienne ;
- une clôture n'a plus d'échéance active ;
- une réouverture crée une nouvelle échéance sans réutiliser ni effacer l'ancienne.

### 8.2 Matrice par étape

| Étape | Création | Modification directe | Demande de modification | Justification | Calcul ou saisie | Retard | Pendant blocage | Réouverture | Conservation |
|---|---|---|---|---|---|---|---|---|---|
| Constat | SYS à la création, depuis SLA de qualification et priorité initiale | Aucune | FM peut demander correction d'une priorité erronée | Obligatoire si recalcul | Calcul serveur | `due_at < heure serveur` et dossier non fermé | Le compteur continue | Non applicable | Ligne initiale conservée |
| Qualification | SYS lors de la priorité confirmée | FM déclenche le recalcul ; pas de saisie libre silencieuse | AGT peut signaler une impossibilité ; ADM pour cas sensible | Toujours obligatoire | Recalcul serveur depuis SLA | Même règle | Le compteur continue ; extension explicite possible | Réouverture vers Qualification : nouvelle échéance | Ancienne/nouvelle, auteur, heure, origine |
| Décision | SYS selon branche et priorité | FM sous délégation ; ADM valide les cas ≥ 350 000 FCFA, critiques ou de risque majeur | AGT et Laetitia peuvent demander avec motif | Toujours obligatoire | Calcul ; dérogation manuelle autorisée avec contrôle | Même règle | Pas de pause automatique | Nouvelle échéance selon étape choisie | Chaîne complète |
| Intervention | SYS selon SLA interne ou externe | FM pour opérationnel ; ADM si critique, sécurité ou engagement ≥ 350 000 FCFA | AGT responsable peut demander | Toujours obligatoire | Calcul ; dérogation explicite | Même règle | Le blocage reste visible et peut produire du retard | Nouvelle échéance d'intervention | Chaîne complète |
| Preuve | SYS à l'entrée lorsque le délai de preuve sera validé | FM ; ADM seulement pour exception sensible | AGT peut demander un délai de dépôt | Toujours obligatoire | **Durée exacte à valider** ; pas de valeur inventée | Calcul serveur dès qu'une règle existe | Pas de pause automatique | Nouvelle échéance de preuve si étape choisie | Chaîne complète |
| Clôture | Aucune échéance active | Aucune | Non applicable | Non applicable | Non applicable | Pas de retard actif | Aucun blocage actif autorisé | FM ou ADM rouvre avec motif ; SYS crée la nouvelle échéance | Toutes les échéances passées restent consultables |

### 8.3 Autorité de dérogation proposée

- Faustin peut valider une extension opérationnelle non critique dans sa délégation ;
- l'Administration valide une extension concernant un dossier critique de sécurité, un engagement à partir de 350 000 FCFA ou un arbitrage qui lui appartient ;
- l'agent ne modifie jamais l'échéance ; il soumet une demande motivée ;
- la fonction serveur enregistre ancienne valeur, nouvelle valeur, auteur, date/heure, justification et origine `automatic` ou `manual` ;
- l'urgence grave ne supprime pas la traçabilité : elle permet l'exécution avant accord, avec information immédiate et motif.

## 9. Matrice des droits de déclaration et de résolution

| Capacité | Administration | Facility Manager | Agent terrain | Lecture seule | Prestataire désactivé |
|---|---|---|---|---|---|
| Déclarer un blocage | Oui pour arbitrage, coût, risque ou blocage Administration | Oui pour tout dossier opérationnel | Oui sur dossier et action de son périmètre | Non | Non |
| Modifier le motif | Complément sur son blocage ; jamais effacement | Complément/correction tracée | Complément sur sa déclaration avant confirmation | Non | Non |
| Proposer la résolution | Oui | Oui | Oui sur dossier/action de son périmètre | Non | Non |
| Confirmer la résolution | Oui pour blocage Administration | Oui pour blocage opérationnel ; confirme les propositions agents | Non | Non | Non |
| Rouvrir un blocage | Oui pour ses arbitrages | Oui pour opérationnel, avec motif | Non ; nouvelle proposition à Faustin | Non | Non |
| Consulter l'historique | Tous les dossiers | Tous les dossiers | Dossiers de son périmètre | Selon périmètre à confirmer | Aucun |
| Créer une prochaine action | Oui pour action d'arbitrage qui lui appartient | Oui, responsable principal du catalogue opérationnel | Non ; peut proposer dans un commentaire/événement | Non | Non |
| Modifier/remplacer une prochaine action | Oui pour ses arbitrages | Oui, avec historique | Non ; peut terminer l'action qui lui est affectée | Non | Non |
| Modifier une échéance | Cas sensibles selon section 8 | Cas opérationnels sous délégation | Non | Non | Non |
| Demander une échéance différente | Oui | Oui | Oui avec justification | Non | Non |
| Demander une preuve supplémentaire | Oui pour contrôle sensible ; Faustin l'instancie | Oui, peut renforcer l'exigence | Peut proposer, sans créer l'exigence | Non | Non |
| Déposer une preuve | Non en fonctionnement courant | Non en fonctionnement courant ; toute exception future interdit l'auto-validation | Oui dans son périmètre ; permission spéciale Évariste/Sylvain pour rapport prestataire | Non | Non |
| Valider/refuser une preuve | Contrôle a posteriori sensible, pas validation opérationnelle courante | Oui, validateur opérationnel | Non | Non | Non |

Règle de séparation : la personne qui signale la fin du blocage ne confirme pas automatiquement sa résolution. Un agent propose ; Faustin confirme. Pour un blocage relevant de l'Administration, l'Administration confirme.

## 10. Matrice des preuves

### 10.1 États distincts

| Objet | Rôle |
|---|---|
| Règle contextuelle | Référentiel versionné déterminant les exigences selon équipement, catégorie, gravité, étape ou branche. |
| Preuve attendue appliquée | Instantané historisé de l'exigence sur un dossier précis. |
| Preuve déposée | Fichier, commentaire ou mesure reçu, encore en attente. |
| Preuve validée | Preuve acceptée par Faustin et liée à une ou plusieurs exigences. |
| Preuve refusée | Preuve rejetée avec motif obligatoire ; l'exigence reste non satisfaite. |

### 10.2 Matrice fondée sur les contextes confirmés

`À valider` signifie que la politique générale existe dans les documents, mais que le type exact de pièce n'est pas confirmé. Aucune règle automatique ne doit être activée tant que ce point n'est pas validé.

| Contexte | Gravité | Étape | Type de preuve | Obligatoire | Demande | Dépôt | Validation | Refus | Hors ligne | Statut |
|---|---|---|---|---|---|---|---|---|---|---|
| Toute anomalie critique | Critique | Avant Clôture | Preuve conforme au type de dossier ; type exact contextuel | Oui | FM | AGT responsable ou agent interne autorisé | FM | Oui, motif obligatoire | Préparation/dépôt futur ; validation en ligne | Confirmé |
| Sécurité incendie `INC` / RIA | Toutes selon `proof_policy=always` | Intervention/Preuve | Mesure de contrôle, photo et/ou rapport/PV à préciser | Oui dans le principe | FM | Sylvain ou agent autorisé du périmètre | FM | Oui | Dépôt futur ; validation en ligne | Politique confirmée, types à valider |
| Ascenseurs `ASC` | Toutes selon `always` | Intervention/Preuve | Rapport/PV d'intervention et contrôle de remise en service à préciser | Oui dans le principe | FM | Agent interne rattachant le rapport | FM | Oui | Dépôt futur | Politique confirmée, types à valider |
| Infiltration `INF` | Toutes selon `always` | Intervention/Preuve | Photos avant/après et contrôle de non-récidive proposés | Oui dans le principe | FM | Agent du périmètre | FM | Oui | Dépôt futur | Types recommandés à valider |
| Espaces verts `ESP` | Toutes selon `always` | Intervention/Preuve | Photo après correction proposée | Oui dans le principe | FM | Agent du périmètre | FM | Oui | Dépôt futur | Type recommandé à valider |
| Coût / budget `COUT` | Toutes selon `always` | Décision/Réception | Devis, bon de commande, bon à payer selon étape | Oui dans le principe | FM ou ADM selon seuil | Laetitia ou profil interne habilité | FM pour preuve dossier ; ADM pour décision ≥ seuil | Oui | En ligne pour validation financière | Documents cités, règle de combinaison à valider |
| Électricité `ELEC` | Critique seulement | Intervention/Preuve | Mesure, photo ou rapport DMC selon anomalie | Oui si critique | FM | Évariste dans GE-01 | FM | Oui | Dépôt futur | Politique confirmée, type exact à valider |
| Irrigation `IRR` | Critique seulement | Intervention/Preuve | Photo, mesure ou rapport ALTA VENTURE selon anomalie | Oui si critique | FM | Sylvain dans IRR-01 ou agent autorisé | FM | Oui | Dépôt futur | Politique confirmée, type exact à valider |
| Eau/plomberie `EAU` | Conditionnelle | Qualification/Décision | À déterminer selon fuite, pression, vanne et branche | Selon règle à définir | FM | Sylvain dans son périmètre | FM | Oui | Dépôt futur | Déclencheurs à valider |
| Nettoyage `NET` | Conditionnelle | Qualification/Décision | Photo après correction proposée | Selon règle à définir | FM | Laetitia dans RND-LET | FM | Oui | Dépôt futur | Déclencheurs/type à valider |
| Sûreté `SEC` | Conditionnelle | Qualification/Décision | Photo, rapport ou contrôle fonctionnel à préciser | Selon règle à définir | FM | Agent du périmètre futur | FM | Oui | À définir | Post-MVP / à valider |
| Climatisation `CVC` | Conditionnelle | Qualification/Décision | Rapport, mesure ou photo à préciser | Selon règle à définir | FM | Agent du périmètre futur | FM | Oui | À définir | Post-MVP / à valider |
| Document manquant `DOC` | Toutes | Décision | Le document manquant est l'objet du dossier ; `proof_policy=never` actuel | Non automatiquement | FM | Profil chargé de l'obtenir | FM si rattaché comme preuve | Oui | En ligne ou futur dépôt | Confirmé par seed, cohérence à surveiller |
| Rapport d'intervention prestataire | Selon dossier | Intervention/Preuve | Rapport ou PV privé, métadonnées, coût et réserves | Selon exigence dossier | FM | Évariste GE-01 ou Sylvain WILO/RIA/IRR | FM seul | Oui, justification obligatoire | Upload futur ; validation en ligne | Circuit confirmé |
| WILO-01, photo manomètre + rapport | Non défini | Intervention/Preuve | Photo du manomètre et rapport | Non activé | FM | Sylvain | FM | Oui | Futur | **Maquette uniquement ; validation pilote requise** |

### 10.3 Règles de gouvernance des preuves

- Faustin instancie ou confirme les exigences à la Qualification/Décision ;
- une règle publiée produit un instantané sur le dossier ;
- une modification ultérieure de la règle n'altère jamais cet instantané ;
- Faustin peut ajouter une exigence ou renforcer les critères ;
- une exigence obligatoire n'est jamais supprimée silencieusement ;
- toute levée exceptionnelle exige rôle, motif, auteur, date et événement ; le rôle autorisé reste un arbitrage final ;
- un rejet conserve la preuve, son auteur, sa date et le motif ;
- la satisfaction exige une preuve acceptée, pas seulement déposée ;
- le verrou critique existant reste inchangé.

## 11. Historique métier unique

### 11.1 Contenu minimal d'un événement

- `anomaly_id` ;
- `event_definition_id` ou code contrôlé ;
- `occurred_at` officiel ;
- `actor_profile_id` déterminé par la session ;
- `workflow_stage_id` ;
- ancienne valeur éventuelle ;
- nouvelle valeur éventuelle ;
- justification éventuelle ;
- origine `online` ou `offline_sync` ;
- `client_occurred_at` si hors ligne ;
- `server_received_at` ;
- `idempotency_key` ;
- `transaction_id` et source métier.

### 11.2 Anti-falsification

- le client ne fournit jamais l'auteur officiel ; il est résolu depuis la session et le profil actif ;
- le client ne fournit jamais `occurred_at` officiel ; le serveur l'établit ou valide explicitement un événement hors ligne ;
- aucune politique client `UPDATE` ou `DELETE` sur `anomaly_history` ;
- les événements sont créés par la même transaction que l'action métier ;
- une correction produit un événement compensatoire ;
- `updated_at` n'est jamais la dernière activité ;
- la dernière activité est le dernier événement `is_activity=true` visible selon la RLS du rôle connecté.

Deux rôles peuvent voir une dernière activité différente si le dernier événement global contient une information sensible non autorisée. La projection doit alors retourner le dernier événement visible, pas contourner la RLS.

## 12. Hors ligne

### 12.1 Ordre confirmé

1. Rondes et constats.
2. Actions et preuves terrain.
3. Autres fonctions compatibles après retour d'expérience.

Restent en ligne : qualification finale, branche de traitement, affectation, arbitrage financier, décision sensible, validation/refus final d'une preuve, confirmation de résolution sensible et clôture.

### 12.2 Contrat d'une opération hors ligne

| Champ | Rôle |
|---|---|
| `idempotency_key` | Identifiant unique stable entre les nouvelles tentatives. |
| `operation_type` | Action ou dépôt autorisé hors ligne. |
| `anomaly_id` | Dossier concerné. |
| `base_version_no` | Version canonique connue. |
| `client_occurred_at` | Heure terrain informative. |
| `sync_status` | `queued`, `syncing`, `synced`, `conflict`, `failed`. |
| `attempt_count`, `last_attempt_at` | Reprise contrôlée. |
| `payload_hash` | Détection d'une réutilisation incohérente de clé. |
| `media_state` | État séparé de l'upload. |

Règles :

- même clé et même contenu : résultat initial retourné, sans doublon ;
- même clé et contenu différent : rejet ;
- version obsolète : conflit explicite, pas d'écrasement ;
- ordre officiel : transaction serveur et dépendances, avec heure terrain conservée séparément ;
- une donnée en attente apparaît à côté de la valeur canonique, jamais à sa place ;
- l'upload média et l'écriture DB doivent tous deux réussir ;
- une preuve n'est jamais validée hors ligne.

## 13. Contrôles Supabase obligatoires

La future spécification d'exécution impose :

- RLS sur chaque nouvelle table exposée ;
- exposition Data API décidée explicitement objet par objet ;
- `GRANT` et `REVOKE` explicites ;
- aucune autorisation basée sur `user_metadata` ;
- rôle, profil actif, périmètre et permission nominative vérifiés ;
- politiques séparées par opération ;
- politique `SELECT` nécessaire pour chaque `UPDATE` ;
- `UPDATE` avec `USING` et `WITH CHECK` ;
- projection `security_invoker = true` ;
- RLS correcte sur toutes les tables sous-jacentes ;
- index sur `anomaly_id`, états actifs, FK, colonnes de tri, de jointure et de politique ;
- aucun `INSERT`, `UPDATE` ou `DELETE` client direct dans l'historique ;
- aucun privilège prestataire ou `anon` ;
- absence de deux sources canoniques ;
- tests positifs et négatifs par rôle et opération.

Les fonctions restent `SECURITY INVOKER` par défaut. Une fonction `SECURITY DEFINER` est interdite par défaut. Si elle devient indispensable, elle est placée dans un schéma non exposé, utilise un `search_path` verrouillé, qualifie toutes les relations, vérifie explicitement l'utilisateur, révoque l'exécution à `PUBLIC`, `anon` et aux rôles non autorisés, puis reçoit des tests d'abus et de contournement RLS.

Ces règles suivent les recommandations Supabase actuelles sur la [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), la [sécurisation de la Data API](https://supabase.com/docs/guides/api/securing-your-api), les [fonctions](https://supabase.com/docs/guides/database/functions) et les [vues `security_invoker`](https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0010_security_definer_view).

## 14. Mise à jour de la projection cible

`anti_zombie_summary_v` devra exposer :

- `anomaly_id`, `version_no` ;
- `is_closed`, `dossier_state_label` dérivé ;
- `stage_code`, `stage_label` ;
- `status_code`, `status_label` ;
- `treatment_condition` calculée : `blocked`, `delayed`, `normal` ;
- responsable canonique ;
- prochaine action canonique active ;
- échéance canonique avec date/heure, SLA et origine ;
- blocage actif, acteur et motif ;
- justification du retard si aucun blocage actif ;
- exigences de preuve actives ;
- dernière activité métier visible ;
- indicateurs de complétude.

La projection ne contient aucun champ `proposed_*`, aucun brouillon et aucune valeur locale non synchronisée. Les propositions sont gérées dans un contrat UI séparé.

## 15. Corrections documentaires des incohérences observées

| Incohérence | Règle documentaire corrective | Futur backlog UI |
|---|---|---|
| Synthèse sans responsable, formulaire avec Sylvain | La synthèse a raison : seul `assigned_profile_id` confirmé est canonique. | Libeller le select `Nouveau responsable proposé` et afficher `Valeur actuelle : non attribuée`. |
| Deux échéances différentes | `Aujourd'hui 12:00` est actuelle ; `28/08/2026` est une proposition incomplète. | Afficher actuelle et proposée, exiger heure et fuseau. |
| Diagnostic et branche simultanés | Diagnostic précède la décision de branche. | Masquer/désactiver la branche avant événement `diagnosis_completed`. |
| `ACTIF` et `À qualifier` | `ACTIF` n'est pas un statut ; `À qualifier` est le statut opérationnel. | Remplacer par `Continuité du traitement : Normale` et `Étape actuelle : Qualification — À qualifier`. |
| Libellé « Lecture anti-dossier dormant » | Formulation technique et négative. | Remplacer par `Continuité de traitement`. |
| Échéance relative seule | La valeur canonique exacte est masquée. | Afficher relatif + date/heure exacte accessible. |
| Valeurs de petite taille | Lisibilité perfectible. | Renforcer légèrement libellés et valeurs, minimum 12 px maintenu. |
| Mobile | Les huit informations sont présentes. | Conserver les huit, avec action, responsable, échéance et blocage en premier. |

Ce backlog est enregistré uniquement. Aucun écran n'est modifié dans ce lot.

## 16. Registre des décisions B2

### D1 — Séparation canonique / proposition

| Dimension | Décision |
|---|---|
| Règle issue des documents | Chaque action importante est enregistrée, attribuée et historisée. |
| Constat code/capture | Formulaire et synthèse affichent des valeurs différentes sans les qualifier. |
| Recommandation | La synthèse lit uniquement la projection serveur ; les propositions restent dans le formulaire. |
| Alternatives | Mise à jour optimiste du résumé ; rejetée pour les opérations sensibles. |
| Impact métier | Évite de croire qu'un responsable ou délai est déjà engagé. |
| Impact UX | Libellés `Actuel`, `Proposé`, `Non enregistré`. |
| Impact Supabase/RLS | Transaction, version, historique puis relecture sous RLS. |
| Impact hors ligne | Proposition locale séparée jusqu'à synchronisation. |
| Risque | Perte de saisie si brouillon non géré ; à traiter dans le lot hors ligne. |
| Décision proposée | Adoptée comme règle cible. |
| Validation encore nécessaire | Aucune sur le principe. |

### D2 — État, étape, statut et continuité

| Dimension | Décision |
|---|---|
| Règle issue des documents | Le workflow possède six étapes et des statuts contrôlés. |
| Constat code/capture | `ACTIF` et `À qualifier` semblent deux statuts. |
| Recommandation | Séparer état ouvert/fermé, étape, statut opérationnel et condition de continuité. |
| Alternatives | Conserver `ACTIF` comme statut ; rejetée car non canonique. |
| Impact métier | Lecture non ambiguë. |
| Impact UX | `Étape actuelle : Qualification — À qualifier`; continuité séparée. |
| Impact Supabase/RLS | Champs dérivés de tables existantes et blocage/retard. |
| Impact hors ligne | Dernière valeur synchronisée marquée comme telle. |
| Risque | Surinformation si les quatre notions sont toutes visibles. |
| Décision proposée | Afficher étape + statut ; garder l'état/continuité dans le bandeau. |
| Validation encore nécessaire | Choix final du libellé `Continuité de traitement`. |

### D3 — Ordre diagnostic puis branche

| Dimension | Décision |
|---|---|
| Règle issue des documents | Qualification/affectation, diagnostic agent, décision de branche. |
| Constat code/capture | Diagnostic et branche sont simultanément présentés. |
| Recommandation | Trois actions successives dans `A_QUALIFIER`, sans nouveau statut. |
| Alternatives | Ajouter un statut diagnostic ; non retenue dans ce lot. |
| Impact métier | Respect du cycle validé. |
| Impact UX | Progression guidée et branche indisponible avant diagnostic. |
| Impact Supabase/RLS | Actions canoniques séparées, même statut jusqu'à décision. |
| Impact hors ligne | Diagnostic agent pourra être synchronisé plus tard ; décision reste en ligne. |
| Risque | Le libellé `À qualifier` couvre plusieurs sous-actions. |
| Décision proposée | Retenue pour éviter un nouveau statut. |
| Validation encore nécessaire | Confirmer que le diagnostic peut rester dans l'étape Qualification. |

### D4 — Échéance unique du dossier

| Dimension | Décision |
|---|---|
| Règle issue des documents | Chaque dossier possède une échéance et tout changement est historisé. |
| Constat code/capture | Deux dates semblent concurrentes. |
| Recommandation | Une échéance dossier active ; l'action l'utilise dans le MVP. |
| Alternatives | Échéance distincte par action ; différée jusqu'à besoin confirmé. |
| Impact métier | Engagement unique et compréhensible. |
| Impact UX | Valeur actuelle exacte et proposition séparée. |
| Impact Supabase/RLS | `anomaly_deadlines` append-only, calcul serveur. |
| Impact hors ligne | Lecture cache ; modification en ligne. |
| Risque | Certaines actions courtes pourraient nécessiter un objectif distinct. |
| Décision proposée | Une échéance pour le MVP. |
| Validation encore nécessaire | Durée de l'étape Preuve et délais de devis/arbitrage. |

### D5 — Blocage : proposition puis confirmation de résolution

| Dimension | Décision |
|---|---|
| Règle issue des documents | Un blocage possède acteur, motif, dates et historique. |
| Constat code/capture | Aucun blocage structuré ; `isBlocked=false`. |
| Recommandation | Un blocage actif ; agent propose la résolution, Faustin confirme ; Administration confirme ses arbitrages. |
| Alternatives | Laisser le déclarant résoudre seul ; rejetée pour agents. |
| Impact métier | Responsabilité claire. |
| Impact UX | États `Actif`, `Résolution proposée`, `Résolu`. |
| Impact Supabase/RLS | Politiques et commandes distinctes. |
| Impact hors ligne | Lecture cache ; confirmation en ligne. |
| Risque | Blocage restant ouvert si confirmation oubliée. |
| Décision proposée | Retenue avec alerte de résolution en attente. |
| Validation encore nécessaire | Autoriser ou non un agent à confirmer certains blocages simples à terme. |

### D6 — Preuve contextuelle et instantanée

| Dimension | Décision |
|---|---|
| Règle issue des documents | Preuves différentes selon dossier ; critique non clôturable sans preuve acceptée. |
| Constat code/capture | WILO est codé en dur ; autres exigences absentes. |
| Recommandation | Règles versionnées, exigences instanciées, dépôt et validation séparés. |
| Alternatives | Règle fixe par équipement ; rejetée. |
| Impact métier | Cohérence et non-rétroactivité. |
| Impact UX | Liste précise des pièces encore attendues. |
| Impact Supabase/RLS | Tables règles/exigences/preuves, validation FM. |
| Impact hors ligne | Dépôt différé ; satisfaction en ligne. |
| Risque | Matrice incomplète au lancement. |
| Décision proposée | Démarrer avec contextes confirmés uniquement. |
| Validation encore nécessaire | Types exacts, déclencheurs conditionnels et droit de levée exceptionnelle. |

### D7 — Historique comme seule dernière activité

| Dimension | Décision |
|---|---|
| Règle issue des documents | Historique attribué, horodaté, append-only. |
| Constat code/capture | L'historique est `null`; `updated_at` existe mais n'est pas métier. |
| Recommandation | Dernier événement autorisé et visible, jamais `updated_at`. |
| Alternatives | Dernière modification de ligne ; rejetée. |
| Impact métier | Activité explicable. |
| Impact UX | Action, acteur, étape, date et commentaire. |
| Impact Supabase/RLS | Historique non modifiable, auteur serveur, vue invoker. |
| Impact hors ligne | Heure client conservée, heure serveur officielle. |
| Risque | Dernière activité différente selon droits ; comportement documenté. |
| Décision proposée | Retenue. |
| Validation encore nécessaire | Catalogue final des événements et durée de conservation. |

### D8 — Sécurité Supabase

| Dimension | Décision |
|---|---|
| Règle issue des documents | Droits côté base, aucun accès prestataire, aucune clé serveur client. |
| Constat code/capture | Le composant ne confère pas de droit ; modèle futur multi-table. |
| Recommandation | RLS par table/opération, grants explicites, vue invoker, fonctions invoker. |
| Alternatives | Fonction definer générale ; interdite par défaut. |
| Impact métier | Respect effectif des responsabilités. |
| Impact UX | Refus explicites plutôt que boutons seulement masqués. |
| Impact Supabase/RLS | Tests positifs/négatifs, pas de `user_metadata`. |
| Impact hors ligne | Autorisation revalidée au serveur à la synchronisation. |
| Risque | Jointures RLS complexes et performance. |
| Décision proposée | Retenue avec index et tests d'abus. |
| Validation encore nécessaire | Liste exacte des objets exposés à la Data API. |

## 17. Premier lot de migration proposé — non exécuté

### Lot C1 proposé : référentiels et garde-fous d'historique

Périmètre volontairement réduit :

1. créer les référentiels `next_action_codes`, `next_action_code_stages`, `block_reason_codes`, `delay_reason_codes`, `block_resolution_codes` et `business_event_definitions` ;
2. charger uniquement les codes B2 validés, avec statut actif/inactif et provenance ;
3. enrichir `anomaly_history` avec étape, source, heures client/serveur et idempotence ;
4. interdire `UPDATE`/`DELETE` client sur l'historique ;
5. définir grants, revokes, RLS de lecture et index ;
6. ne créer encore aucune action, échéance, blocage ou exigence opérationnelle ;
7. ne raccorder aucun écran.

Gate avant C1 : validation des codes actifs, confirmation du diagnostic dans l'étape Qualification et décision sur les codes marqués « recommandation à valider ».

## 18. Plan de tests RLS du futur lot C1

| Cas | Résultat attendu |
|---|---|
| `anon` lit un catalogue ou l'historique | Refus. |
| Utilisateur Auth sans profil actif | Refus. |
| Profil verrouillé `must_change_password` | Aucun rôle ni accès métier. |
| Administration lit les catalogues et l'historique global | Autorisé. |
| Faustin lit les catalogues et l'historique global | Autorisé. |
| Agent lit les catalogues actifs | Autorisé si nécessaire à l'UI. |
| Agent lit l'historique dans son périmètre | Autorisé. |
| Agent lit l'historique hors périmètre | Refus. |
| Lecture seule lit selon périmètre futur | À tester après définition du périmètre ; aucune écriture. |
| Vendor désactivé tente toute opération | Refus. |
| Client tente d'insérer directement un événement | Refus. |
| Client tente de modifier/supprimer un événement | Refus. |
| Client falsifie auteur ou heure | Refus ou valeurs ignorées et résolues côté serveur. |
| Mutation de `user_metadata` pour obtenir un rôle | Aucun effet. |
| Vue `security_invoker` lit un dossier hors périmètre | Aucune ligne. |
| Fonction non autorisée appelée directement | Refus d'exécution. |
| Rejeu d'une même clé d'idempotence | Un seul événement. |
| Même clé avec contenu différent | Rejet. |
| Requête sur colonnes RLS indexées | Plan contrôlé sans scan évitable. |

## 19. Risques et stratégie de retour arrière

### 19.1 Risques

- catalogue trop large ou mal compris par Faustin ;
- statut `A_QUALIFIER` couvrant plusieurs sous-actions ;
- délais de preuve, devis et arbitrage non définis ;
- matrice de preuve encore incomplète ;
- ambiguïté du périmètre administratif de Laetitia pour les devis ;
- confirmation de résolution oubliée ;
- événement sensible masqué produisant une dernière activité différente selon le rôle ;
- RLS coûteuse sans index adaptés ;
- exposition Data API involontaire ;
- utilisation abusive de `OTHER` ;
- conflits hors ligne lors du futur lot actions/preuves.

### 19.2 Retour arrière futur

- C1 reste additif et sans données opérationnelles ;
- si aucun événement nouveau n'existe, les référentiels et colonnes peuvent être retirés par migration inverse contrôlée ;
- dès qu'un événement est créé, aucun historique n'est supprimé : retour fonctionnel et correction en avant ;
- la projection et les droits sont retirés avant les tables ;
- aucun ancien champ n'est supprimé dans C1 ;
- sauvegarde, dry-run local, préproduction et vérification des migrations avant toute application distante.

## 20. Arbitrages restant réellement nécessaires

1. Confirmer que le diagnostic agent reste dans l'étape Qualification et le statut `A_QUALIFIER` jusqu'au choix de branche.
2. Valider les codes d'action actifs et les trois catégories de blocage marquées comme recommandations.
3. Fixer les délais des preuves, devis et arbitrages Administration.
4. Valider les types exacts de preuve par contexte et les déclencheurs des politiques `conditional`.
5. Décider qui peut lever exceptionnellement une preuve obligatoire et dans quels cas.
6. Confirmer le périmètre de Laetitia pour préparer/rattacher les devis sans élargir ses droits techniques.
7. Définir le périmètre du rôle Lecture seule avant activation d'un compte.
8. Valider le catalogue final des événements et les durées de conservation.
9. Choisir définitivement le libellé `Continuité de traitement` pour le futur lot UI.

## 21. Pause du chantier

Le lot B2 est terminé sur le plan documentaire. Il ferme les règles de valeur canonique, clarifie les captures, propose les catalogues, la gouvernance des échéances, les droits, la matrice de preuves, les contrôles Supabase, le premier lot de migration, les tests et le retour arrière.

**Aucune migration, aucun code, aucun écran, aucun rôle, aucun droit, aucune donnée Supabase et aucune version publiée n'ont été modifiés.**

Le chantier reste en pause jusqu'à validation explicite du présent document et des neuf arbitrages de la section 20.
