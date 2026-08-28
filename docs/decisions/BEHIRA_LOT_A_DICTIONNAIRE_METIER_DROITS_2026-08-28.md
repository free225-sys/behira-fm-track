# BEHIRA FM Track — Lot A

## Dictionnaire métier canonique et matrice des droits de la règle anti-dossier-zombie

Date : 28 août 2026  
Checkpoint d’entrée : `d39a320`  
Statut : proposition documentaire soumise à validation métier  
Périmètre : huit informations de `AntiZombieSummary`  
Intervention : aucune modification du code, de l’interface, de Supabase, des migrations, des rôles, des permissions, des données ou de la version publiée

## 1. Résultat du lot A

Les règles documentaires permettent de confirmer le socle suivant :

- le dossier est la source de vérité opérationnelle ;
- le statut appartient au workflow autorisé ;
- un responsable et une échéance peuvent manquer pendant le constat, mais deviennent obligatoires à la fin de la qualification par Faustin ;
- la prochaine action appartient au dossier, jamais à une file ou à un écran ;
- un blocage doit être explicable, daté et historisé ;
- une preuve attendue est distincte d’une preuve déposée, acceptée ou refusée ;
- la dernière activité provient exclusivement de l’historique métier ;
- les prestataires n’ont aucun accès, même lorsqu’une entreprise externe participe à l’intervention ;
- toute action importante doit être attribuée, datée et historisée.

Cinq arbitrages métier restent réellement nécessaires avant de pouvoir geler le modèle : la nature du responsable, la gouvernance de la prochaine action, le cycle du blocage, la matrice de preuves et la portée hors ligne des modifications de dossier. Les options et recommandations sont présentées en section 9.

## 2. Hiérarchie des sources de vérité

Lorsque deux documents se contredisent, la source la plus récente et explicitement validée prévaut.

| Rang | Source | Statut dans ce lot | Utilisation |
|---:|---|---|---|
| 1 | Instruction `GO — Lot A` du 28 août 2026 | Autorité du lot | Périmètre, livrables et interdiction d’implémenter. |
| 2 | `docs/PRD_BEHIRA_FM_TRACK_REVUE_EXTERNE_CLAUDE_CODE.md`, version 0.2 du 27 août | Cible métier consolidée après validation de l’Administration | Principes non négociables, responsabilités, cycle, anti-zombie, décisions confirmées et points ouverts. |
| 3 | `outputs/BEHIRA_ECARTS_CIBLE_VALIDEE_2026-08-27.md` | Réponses confirmées de l’Administration | Réalignement du dossier, hors ligne, preuve contextuelle et responsabilités cibles. |
| 4 | `docs/DECISION_ACCES_PRESTATAIRES.md`, décision du 26 août | Décision métier explicite | Aucun accès prestataire ; dépôt interne par Évariste/Sylvain ; validation Faustin. |
| 5 | `Cahier_des_charges_BEHIRA_Pilotage_Technique_Maintenance_Feuille_de_route_v3.docx`, 19 juin, tables 12, 15, 16, 18, 21, 24, 25, 34, 39, 42 et 45 | Source métier historique | Qualification, action suivante, responsable, SLA, preuve, historique, écrans et RACI. |
| 6 | `BEHIRA_00_referentiel_central_donnees_v3_agents_tiers_zones.xlsx`, onglets `03_Agents`, `05_Categories`, `06_Priorites_SLA`, `07_Statuts`, `09_Notifications`, `11_Droits` | Référentiel historique structuré | Vocabulaires, statuts, SLA, catégories, acteurs et ancienne matrice de droits. |
| 7 | `ETAT d’avancement – FM_GB TRACK – 19 juin 2026.docx`, étapes 1 à 3 | Contexte historique | Importance du registre, de la qualification et de la page Faustin. |
| 8 | `docs/audits/BEHIRA_AUDIT_PROVENANCE_ANTIZOMBIE_2026-08-28.md` | Constat technique, pas décision métier | Sources actuelles, données absentes et risques de raccordement. |
| 9 | Maquettes, prototype et code | Preuve d’existant uniquement | Ne créent aucune règle métier. |

### Règles historiques explicitement remplacées

- L’import JSON quotidien décrit en juin est remplacé par la saisie directe dans l’application.
- Le rôle et l’écran prestataire décrits en juin sont remplacés par l’absence totale d’accès prestataire.
- Les notifications email/WhatsApp envisagées en juin sont remplacées, pour la première version, par les alertes dans l’application.
- La capacité d’affectation attribuée à la Direction dans l’ancien onglet `11_Droits` ne prévaut pas sur la cible récente : Faustin est le pivot de qualification et d’affectation ; l’Administration arbitre les coûts, risques et blocages importants.

## 3. Convention métier

Dans ce document, le **dossier** est l’enveloppe opérationnelle complète d’un problème, dont la racine technique actuelle est l’anomalie. Il contient ou relie le constat, la qualification, la décision, l’intervention, les preuves et l’historique.

Les seuls rôles applicatifs utilisés sont les rôles existants :

- **Administration** : rôle technique `direction` ;
- **Facility Manager** : rôle `facility_manager` ;
- **Agent terrain** : rôle `field_agent`, utilisé par Évariste, Sylvain et Laetitia selon leurs périmètres et permissions ;
- **Lecture seule** : rôle `read_only`, actuellement sans compte attribué ;
- **Prestataire** : rôle historique `vendor`, désactivé. Il ne reçoit aucun droit et n’est pas une option d’accès cible.

Aucun rôle spécifique « Laetitia », « Évariste », « Sylvain » ou « Frédéric » n’est créé : leurs capacités résultent du rôle, du périmètre et, si nécessaire, d’une permission nominative existante.

## 4. Dictionnaire canonique des huit informations

### 4.1 Statut du dossier

| Attribut | Définition retenue |
|---|---|
| Nom métier | Statut du dossier |
| Définition exacte | État courant autorisé du dossier dans le cycle Constat → Qualification → Décision → Intervention → Preuve → Clôture. |
| Entité propriétaire | Dossier, rattaché à une étape du workflow. |
| Enregistré ou calculé | Enregistré ; l’étape est obtenue par la définition du statut. |
| Type recommandé | Référence obligatoire vers le référentiel existant des statuts ; jamais un texte libre. |
| Obligatoire | Oui dès la création du constat. |
| Devient obligatoire | Constat. |
| Source documentaire | Cahier, tables 12, 26 et 39 ; Excel `07_Statuts` ; PRD 8.2, 8.3 et FR-02. |
| Règle confirmée | Oui : cycle contrôlé, transitions autorisées et historisées. |
| Source actuelle | `anomalies.current_status_id` → `status_definitions.stage_id`. |
| Source canonique cible | Le statut courant du dossier ; aucune copie dans le composant. |
| Événement de création | Création du constat/ticket par le système après saisie directe. |
| Événement de mise à jour | Transition métier autorisée, effectuée par le rôle habilité. |
| Historique | Ancien statut, nouveau statut, acteur, date, étape et commentaire éventuel. |
| Hors ligne | La ronde peut créer localement un constat en attente de synchronisation ; le statut officiel n’existe qu’après confirmation serveur. Les transitions de dossier hors ligne ne sont pas encore confirmées. |
| Affichage si absent | `Statut non renseigné` ; cet état constitue une anomalie de données bloquante. |

### 4.2 Responsable du dossier

| Attribut | Définition retenue |
|---|---|
| Nom métier | Responsable du dossier |
| Définition exacte | Personne interne qui porte la responsabilité opérationnelle de faire avancer le dossier, même si l’exécution implique une entreprise externe. |
| Entité propriétaire | Dossier. |
| Enregistré ou calculé | Enregistré. |
| Type recommandé | Référence facultative puis obligatoire vers un profil interne actif. Cette recommandation dépend de l’arbitrage A1. |
| Obligatoire | Non pendant Constat/À qualifier ; oui à la sortie de Qualification et jusqu’à Clôture. |
| Devient obligatoire | Fin de Qualification. |
| Source documentaire | Cahier, tables 12, 16, 21, 24, 39, 42 et 45 ; PRD 6.2, 8.2, 8.3, FR-01 et 9.2. |
| Règle confirmée | Oui pour l’obligation à la qualification et l’affectation par Faustin. La possibilité qu’une entreprise externe soit le responsable canonique reste à arbitrer. |
| Source actuelle | `anomalies.assigned_profile_id`, avec une affectation distincte possible dans `work_orders`. |
| Source canonique cible | Responsable interne unique du dossier ; l’entreprise externe reste liée à l’intervention/ordre et peut être acteur bloquant. |
| Événement de création | Qualification et affectation par Faustin. |
| Événement de mise à jour | Réaffectation motivée par Faustin ; arbitrage Administration seulement dans les cas explicitement escaladés. |
| Historique | Ancien responsable, nouveau responsable, auteur, date et motif. Aucune suppression de l’identité historique. |
| Hors ligne | Lecture cache possible ; affectation/réaffectation en ligne recommandée jusqu’à définition des conflits. |
| Affichage si absent | `Responsable non attribué`. Avant la fin de Qualification : état transitoire attendu ; après : dossier zombie à corriger. |

### 4.3 Prochaine action

| Attribut | Définition retenue |
|---|---|
| Nom métier | Prochaine action du dossier |
| Définition exacte | Action concrète et immédiatement attendue pour faire progresser le dossier, avec un exécutant identifiable et un cycle `à faire / terminée / remplacée / annulée`. |
| Entité propriétaire | Dossier, sous forme d’une action liée ; jamais l’écran Faustin. |
| Enregistré ou calculé | Enregistré. Une suggestion peut être calculée, mais ne devient canonique qu’après création/confirmation de l’action. |
| Type recommandé | Entité structurée : code contrôlé, libellé, exécutant profil ou rôle, état, dates, source et commentaire facultatif. |
| Obligatoire | Oui pour tout dossier non clôturé. |
| Devient obligatoire | Dès Constat par une action système « qualification attendue », puis remplacée à la fin de chaque étape. Cette mécanique est une recommandation à valider. |
| Source documentaire | Cahier, tables 16, 24, 42 et règle UX table 43 ; PRD 2, 5.8, 8.3, FR-01 et FR-15. |
| Règle confirmée | Oui : elle appartient au dossier et doit être attribuée, datée et historisée. Son catalogue et sa gouvernance restent à arbitrer. |
| Source actuelle | Aucune source canonique ; la file Faustin et les libellés de notification ne sont pas valides. |
| Source canonique cible | Action courante active liée au dossier. |
| Événement de création | Création du constat pour l’action de qualification ; validation d’une étape pour l’action suivante. |
| Événement de mise à jour | Terminaison, remplacement, annulation ou changement d’exécutant ; jamais écrasement silencieux. |
| Historique | Ancienne action conservée avec statut final, auteur, dates, motif et action qui la remplace. |
| Hors ligne | L’agent peut consulter l’action mise en cache ; son achèvement hors ligne exige idempotence et gestion des conflits, encore à arbitrer. |
| Affichage si absent | `Prochaine action non renseignée` et signalement dossier zombie. |

### 4.4 Échéance / SLA

| Attribut | Définition retenue |
|---|---|
| Nom métier | Échéance courante du dossier |
| Définition exacte | Date et heure limites de l’étape courante, obtenues à partir du SLA applicable et conservées sur le dossier. |
| Entité propriétaire | Dossier, déterminée par l’étape. |
| Enregistré ou calculé | Calculée depuis la règle SLA, puis enregistrée comme instantané. |
| Type recommandé | `timestamptz` + référence de la règle SLA et raison d’une éventuelle dérogation. |
| Obligatoire | Oui dès la création pour la qualification, puis pour chaque phase active. |
| Devient obligatoire | Constat. |
| Source documentaire | Cahier, tables 12, 25, 26, 39 et 45 ; Excel `06_Priorites_SLA` et `09_Notifications` ; PRD 8.3 et FR-01. |
| Règle confirmée | Oui pour le calcul par priorité et l’obligation. Le recalcul après requalification et les dérogations restent à arbitrer. |
| Source actuelle | `qualification_due_at`, `intervention_due_at`, `work_orders.due_at`, calcul initial par `resolve_sla_deadlines`. |
| Source canonique cible | Une échéance courante clairement nommée selon l’étape ; la prochaine action l’utilise par défaut afin d’éviter deux dates concurrentes. |
| Événement de création | Création du dossier pour le SLA de qualification ; entrée dans une nouvelle étape pour le SLA suivant. |
| Événement de mise à jour | Requalification, dérogation motivée ou changement d’étape. |
| Historique | Ancienne date, nouvelle date, règle appliquée, auteur, motif et date du changement. |
| Hors ligne | Affichage de la dernière échéance synchronisée ; calcul et modification officiels côté serveur. |
| Affichage si absent | `Échéance non renseignée` et alerte de donnée obligatoire manquante. |

### 4.5 Acteur bloquant

| Attribut | Définition retenue |
|---|---|
| Nom métier | Acteur bloquant principal |
| Définition exacte | Personne, rôle, entreprise externe ou système dont l’action manquante empêche réellement le dossier de progresser. |
| Entité propriétaire | Blocage actif lié au dossier. |
| Enregistré ou calculé | Enregistré ; ne doit jamais être déduit d’un simple statut d’attente. |
| Type recommandé | Type d’acteur contrôlé + référence conditionnelle vers profil, rôle existant, entreprise de référence ou libellé système. |
| Obligatoire | Seulement lorsqu’un blocage est déclaré. |
| Devient obligatoire | Immédiatement à la déclaration du blocage. |
| Source documentaire | PRD 3, 4, 6.2, 8.3, 9.1-9.2 et FR-15 ; cible validée du 27 août, P0. |
| Règle confirmée | Oui pour l’existence et la visibilité. Catégories d’acteurs, déclarants et résolveurs restent à arbitrer. |
| Source actuelle | Absente. `EN_ATTENTE_DEVIS` et `EN_ATTENTE_PREUVE` ne suffisent pas. |
| Source canonique cible | Blocage non résolu lié au dossier. |
| Événement de création | Déclaration explicite avec acteur, motif, date et auteur. |
| Événement de mise à jour | Résolution ou remplacement explicite ; pas d’écrasement. |
| Historique | Cycle complet conservé : déclaration, acteur, motif, auteur, résolution, résolveur et commentaire. |
| Hors ligne | Consultation cache possible ; déclaration/résolution hors ligne à décider selon les conflits. |
| Affichage si absent | Sans blocage : `Aucun blocage déclaré`. Blocage incomplet : `Informations de blocage à compléter`. |

### 4.6 Motif du blocage

| Attribut | Définition retenue |
|---|---|
| Nom métier | Motif du blocage ou du retard |
| Définition exacte | Cause opérationnelle expliquant pourquoi le dossier ne peut pas avancer ou pourquoi l’échéance est dépassée. |
| Entité propriétaire | Blocage lié au dossier ; justification de retard liée au dossier lorsqu’aucun blocage n’est déclaré. |
| Enregistré ou calculé | Enregistré. Le retard est calculé, sa justification ne l’est pas. |
| Type recommandé | Catégorie contrôlée à valider + commentaire libre obligatoire ; aucun catalogue n’est créé dans ce lot. |
| Obligatoire | Oui pour tout blocage ; oui dès qu’un dossier dépasse son échéance sans résolution immédiate. |
| Devient obligatoire | À la déclaration du blocage ou au premier traitement du dossier après dépassement. |
| Source documentaire | Cahier, notifications de retard et règle UX ; PRD 2, 3, 5.8, 8.3 et FR-15. |
| Règle confirmée | Oui pour la justification. La taxonomie et le délai accordé pour justifier un retard restent à arbitrer. |
| Source actuelle | Absente. Les raisons de décision, rejets de preuve et commentaires de risque ont d’autres finalités. |
| Source canonique cible | Motif du blocage actif ou justification de retard dédiée. |
| Événement de création | Déclaration du blocage ou justification du retard. |
| Événement de mise à jour | Ajout de complément sans effacer le motif initial ; résolution dans un champ distinct. |
| Historique | Catégorie, commentaire, auteur, date, compléments et résolution. |
| Hors ligne | Consultation cache ; saisie différée seulement après décision sur les conflits et horodatages. |
| Affichage si absent | `Motif non renseigné` lorsqu’il est requis ; sinon `Aucun retard ou blocage signalé`. |

### 4.7 Preuve attendue

| Attribut | Définition retenue |
|---|---|
| Nom métier | Exigence de preuve du dossier |
| Définition exacte | Pièce ou information précise encore nécessaire pour démontrer l’exécution ou autoriser la validation : type, quantité et critères d’acceptation. |
| Entité propriétaire | Dossier, sous forme d’exigence liée à la catégorie, gravité, équipement, étape, intervention ou décision. |
| Enregistré ou calculé | Instanciée et enregistrée sur le dossier à partir d’une règle ou d’une décision explicite. |
| Type recommandé | Liste d’exigences structurées : type existant, libellé, quantité, critères, source, état `attendue/satisfaite/levée` et preuve acceptée associée. |
| Obligatoire | La nécessité générale doit être déterminée au plus tard à la fin de Qualification ; l’exigence exacte peut être renforcée à la Décision. Ce point doit être validé. |
| Devient obligatoire | Fin de Qualification, puis verrouillée avant Intervention lorsque la branche est connue. |
| Source documentaire | Cahier, tables 18, 32, 39, 46-51 et 54 ; Excel `05_Categories` et `07_Statuts` ; PRD 5.6-5.7, 8.3, FR-05 et décision ouverte 16.6. |
| Règle confirmée | Oui : contextualité, distinction attendu/déposé/accepté/refusé et verrou critique. Matrice exacte encore ouverte. |
| Source actuelle | `categories.proof_policy` et `status_definitions.requires_proof` donnent seulement une obligation générale ; `proofs` décrit les pièces reçues. |
| Source canonique cible | Exigence dossier instanciée, séparée des preuves déposées. |
| Événement de création | Qualification ou Décision selon la règle applicable. |
| Événement de mise à jour | Renforcement motivé, satisfaction par une preuve acceptée, refus de la preuve ou levée exceptionnelle autorisée. |
| Historique | Exigence initiale, modifications, preuve liée, validateur, refus et éventuelle levée. |
| Hors ligne | Exigences lisibles en cache ; dépôt média différé avec empreinte et état visible ; satisfaction seulement après confirmation Storage et validation serveur. |
| Affichage si absent | `Preuve attendue non définie`. Ne jamais afficher une preuve déposée comme si elle définissait l’exigence. |

### 4.8 Dernière activité

| Attribut | Définition retenue |
|---|---|
| Nom métier | Dernière activité métier du dossier |
| Définition exacte | Événement métier le plus récent, avec date/heure, action, acteur, étape et commentaire éventuel. |
| Entité propriétaire | Historique. |
| Enregistré ou calculé | Chaque événement est enregistré en append-only ; la dernière activité est calculée par tri déterministe. |
| Type recommandé | Projection d’un événement : `occurred_at`, code et libellé d’action, acteur, étape, commentaire, identifiant de départage. |
| Obligatoire | Oui dès la création du dossier. |
| Devient obligatoire | Constat. |
| Source documentaire | Cahier, tables 15, 24, 39 et 42 ; PRD 5.8, 7.2, 8.3, FR-02, FR-17 et exigences de traçabilité. |
| Règle confirmée | Oui : source historique réelle, événements sensibles attribués et horodatés. Le catalogue exhaustif des activités doit être gelé. |
| Source actuelle | `anomaly_history`, incomplet ; `audit_events` reste technique et ne remplace pas l’historique métier. |
| Source canonique cible | Dernier événement éligible de l’historique métier. Jamais `updated_at`. |
| Événement de création | Création du constat ; ensuite chaque transition, affectation, décision, action, blocage, intervention, preuve, validation, réserve, clôture et réouverture. |
| Événement de mise à jour | Aucun événement n’est modifié ; correction par événement compensatoire. |
| Historique | Il s’agit de la source elle-même, immuable/append-only. |
| Hors ligne | Événement local marqué `en attente`; il ne devient activité officielle qu’après synchronisation et horodatage serveur, avec conservation de l’heure client séparée. |
| Affichage si absent | `Historique indisponible` ; absence considérée comme défaut de traçabilité. |

## 5. Matrice des droits par information

### 5.1 Statut

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration (`direction`) | Tous les dossiers. | Non, statut initial système. | Réouverture confirmée ; autres transitions seulement si une règle métier l’autorise. | Pas de suppression ; contrôle a posteriori des clôtures critiques. | Arbitrages et revue de clôture sensible. | Lecture cache à concevoir ; écriture non confirmée. |
| Facility Manager | Tous les dossiers. | Non, statut initial système. | Qualification, décision, transitions pilotées et clôture. | Clôture et réouverture confirmées. | Validation technique et preuve. | Écriture de dossier hors ligne : décision nécessaire. |
| Agent terrain | Dossiers de son périmètre. | Indirectement via constat/ronde. | Étapes d’une intervention qui lui est affectée, pas le workflow global. | Termine son action ; ne clôture pas le dossier critique. | Aucune validation finale. | Création de ronde confirmée ; transition de dossier à décider. |
| Lecture seule | Périmètre cible à confirmer ; l’existant donne une lecture globale. | Non. | Non. | Non. | Non. | Cache en lecture seulement. |
| Prestataire désactivé | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

### 5.2 Responsable

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration | Tous. | Non en fonctionnement courant. | Arbitrage exceptionnel seulement ; l’ancien droit d’affectation est remplacé par la cible Faustin. | Pas d’effacement ; réaffectation tracée si arbitrage. | Contrôle des escalades. | Lecture cache ; écriture non recommandée. |
| Facility Manager | Tous. | Affecte à la Qualification. | Réaffecte avec motif. | Ne retire pas sans remplaçant après Qualification. | Garant de la présence du responsable. | En ligne recommandé. |
| Agent terrain | Dossiers de son périmètre. | Non. | Non ; l’acceptation explicite d’une affectation reste à décider. | Peut demander réaffectation, sans l’imposer. | Non. | Lecture cache. |
| Lecture seule | Lecture selon périmètre à confirmer. | Non. | Non. | Non. | Non. | Cache en lecture. |
| Prestataire désactivé | Aucun accès ; une entreprise peut rester liée à l’intervention. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

### 5.3 Prochaine action

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration | Toutes. | Action d’arbitrage uniquement si ce cas est validé. | Décision nécessaire. | Peut terminer une action d’arbitrage lui appartenant ; pas de suppression. | Valide les décisions au-dessus du seuil et les risques importants. | Lecture cache ; action hors ligne non recommandée. |
| Facility Manager | Toutes. | Oui à la Qualification et lors de ses décisions. | Remplace/réattribue avec motif. | Termine, annule ou remplace selon workflow. | Garant qu’un dossier ouvert possède une action. | Décision nécessaire. |
| Agent terrain | Actions de son périmètre. | Proposition éventuelle à décider ; pas de création libre recommandée. | Ne modifie pas le libellé canonique ; peut renseigner avancement/commentaire. | Termine l’action qui lui est affectée. | Non, sauf confirmation d’exécution. | Achèvement différé à concevoir avec conflits. |
| Lecture seule | Lecture selon périmètre à confirmer. | Non. | Non. | Non. | Non. | Cache en lecture. |
| Prestataire désactivé | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

### 5.4 Échéance / SLA

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration | Toutes. | Non, calcul système. | Dérogation éventuelle : décision nécessaire. | Pas de suppression. | Peut valider une dérogation sensible si cette règle est retenue. | Lecture cache. |
| Facility Manager | Toutes. | Non, calcul système. | Requalification ou demande de dérogation motivée. | Pas de suppression. | Contrôle de la cohérence. | Calcul officiel en ligne. |
| Agent terrain | Échéances de son périmètre. | Non. | Non. | Non. | Non. | Lecture cache avec date de synchronisation. |
| Lecture seule | Lecture selon périmètre à confirmer. | Non. | Non. | Non. | Non. | Cache en lecture. |
| Prestataire désactivé | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

### 5.5 Acteur bloquant

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration | Tous. | Peut déclarer un blocage d’arbitrage si retenu. | Seulement ses blocages ou arbitrages. | Résout les blocages relevant de l’Administration. | Contrôle des blocages importants. | Lecture cache ; écriture à décider. |
| Facility Manager | Tous. | Oui recommandé. | Corrige un blocage incomplet avec trace. | Résout ou réouvre ; aucune suppression. | Garant de complétude. | Déclaration/résolution hors ligne à décider. |
| Agent terrain | Dossiers de son périmètre. | Oui recommandé sur une action affectée. | Complète sa déclaration ; ne change pas silencieusement l’acteur. | Propose ou effectue la résolution selon règle à valider. | Non. | À décider avec gestion des conflits. |
| Lecture seule | Lecture selon périmètre à confirmer. | Non. | Non. | Non. | Non. | Cache en lecture. |
| Prestataire désactivé | Aucun accès, mais une entreprise peut être référencée comme acteur bloquant externe. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

### 5.6 Motif du blocage ou du retard

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration | Tous. | Pour ses arbitrages et justifications. | Ajoute un complément ; n’efface pas l’original. | Résolution dans un champ distinct. | Peut valider un motif d’exception financière/urgence. | Lecture cache ; saisie à décider. |
| Facility Manager | Tous. | Oui. | Ajoute un complément et corrige avec trace. | Résout sans supprimer le motif initial. | Garant qu’un retard/blocage est justifié. | À décider. |
| Agent terrain | Dossiers de son périmètre. | Oui pour son action/blocage si retenu. | Complément seulement. | Peut proposer la résolution ; droit final à arbitrer. | Non. | À décider. |
| Lecture seule | Lecture selon périmètre à confirmer. | Non. | Non. | Non. | Non. | Cache en lecture. |
| Prestataire désactivé | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

### 5.7 Preuve attendue

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration | Toutes. | Pas en fonctionnement courant ; exigence exceptionnelle à décider. | Ne modifie pas la règle courante sans gouvernance. | Levée exceptionnelle : décision nécessaire. | Contrôle a posteriori des clôtures critiques. | Lecture cache. |
| Facility Manager | Toutes. | Instancie/confirme à Qualification ou Décision. | Renforce ou corrige avec motif. | Marque satisfaite après preuve acceptée ; levée exceptionnelle à encadrer. | Seul validateur final des rapports prestataires et preuves de clôture. | Exigence lisible hors ligne ; validation en ligne. |
| Agent terrain | Exigences de son périmètre. | Non ; peut proposer une pièce. | Non. | Dépose la preuve, mais ne déclare pas lui-même l’exigence satisfaite. | Non. | Fichier en attente possible ; jamais « validé » avant serveur. |
| Lecture seule | Lecture selon périmètre à confirmer. | Non. | Non. | Non. | Non. | Cache en lecture. |
| Prestataire désactivé | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

### 5.8 Dernière activité / historique

| Rôle existant | Lecture | Création | Modification | Résolution/suppression | Validation | Hors ligne |
|---|---|---|---|---|---|---|
| Administration | Historique de tous les dossiers. | Indirectement par ses actions métier. | Jamais. | Jamais ; événement compensatoire uniquement. | Peut auditer les événements sensibles. | Cache lisible ; événement local non officiel. |
| Facility Manager | Historique de tous les dossiers. | Indirectement par ses actions métier. | Jamais. | Jamais. | Contrôle de complétude. | Cache lisible ; officiel après synchronisation. |
| Agent terrain | Historique des dossiers de son périmètre. | Indirectement par ses actions métier. | Jamais. | Jamais. | Non. | Événement en attente identifiable localement. |
| Lecture seule | Lecture selon périmètre à confirmer. | Non. | Non. | Non. | Non. | Cache en lecture. |
| Prestataire désactivé | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. | Aucun. |

## 6. Matrice des champs par étape

Codes : **O** obligatoire, **F** facultatif, **C** conditionnel, **NA** non applicable, **V** verrouillé/historique, **M** modifiable par rôle habilité, **D** décision nécessaire.

| Étape | Statut | Responsable | Prochaine action | Échéance/SLA | Acteur bloquant | Motif | Preuve attendue | Dernière activité |
|---|---|---|---|---|---|---|---|---|
| Constat | **O**, créé système | **F**, absence normale | **O/D** : action de qualification générée recommandée | **O**, SLA qualification | **C** si blocage réel | **C** si blocage/retard | **F/D** : preuve source distincte ; exigence de clôture à définir | **O**, création du constat |
| Qualification | **O/M** Faustin | **O** à la sortie | **O** à la sortie | **O**, recalcul selon priorité confirmée | **C** | **O** si blocage/retard | **O/D** : besoin général à confirmer | **O**, décision, affectation et motif |
| Décision | **O/M** Faustin ou arbitrage autorisé | **O/M** si réaffectation | **O/M**, action de la branche | **O/M** selon branche, dérogation tracée | **C** | **O** si blocage/retard | **O/M** : exigence précise avant exécution | **O**, branche, coût, auteur et motif |
| Intervention | **O/M** dans transitions autorisées | **O/V**, réaffectable par Faustin | **O/M** selon avancement | **O/V**, modification motivée seulement | **C/M** | **O** si blocage/retard | **O/V**, renforcement Faustin seulement | **O**, début, actions, fin, acteur |
| Preuve | **O/M** | **O** jusqu’à validation | **O** : déposer ou valider la preuve | **O**, échéance courante | **C** | **O** si blocage/retard | **O/V**, état attendue/déposée/acceptée/refusée séparé | **O**, dépôt et décision de validation |
| Clôture | **O/V** ; modifiable uniquement par réouverture | **V**, identité conservée | **NA** si clôturé ; nouvelle action si réouvert | **V**, aucune échéance active | **NA**, aucun blocage actif autorisé | **V**, motifs conservés | **O/V**, exigences satisfaites ou levées selon règle autorisée | **O**, clôture, validateur, preuve et éventuelle réouverture |

### Point de cohérence

La matrice évite de rendre le responsable obligatoire trop tôt : un constat peut arriver dans la file « Dossiers sans responsable ». En revanche, la Qualification ne peut être terminée sans responsable, prochaine action et échéance. La preuve attendue dès Constat demeure le seul conflit à arbitrer : le PRD l’exige pour tout dossier ouvert, tandis que les documents équipement permettent de la déterminer plus fiablement après qualification et choix de branche.

## 7. Décisions déjà confirmées

1. Objectif prioritaire : zéro dossier zombie.
2. Cycle : Constat → Qualification → Décision → Intervention → Preuve → Clôture.
3. Faustin qualifie et affecte ; l’Administration arbitre les coûts, risques et blocages importants.
4. Responsable et échéance sont obligatoires à la sortie de Qualification, pas nécessairement au premier constat.
5. La prochaine action appartient au dossier et doit être attribuée, datée et historisée.
6. Une anomalie critique ne peut être clôturée sans preuve acceptée.
7. Faustin clôture techniquement avec preuve conforme ; l’Administration contrôle ensuite les clôtures sensibles.
8. Faustin et l’Administration peuvent rouvrir un dossier avec motif et lien vers la clôture précédente.
9. Les preuves obligatoires varient selon le type de dossier ; WILO-01 n’est pas une règle générale.
10. Les prestataires n’ont aucun compte ni accès ; ils restent des entreprises de référence.
11. Évariste et Sylvain peuvent déposer des rapports prestataires uniquement dans leurs périmètres validés ; Faustin les valide.
12. Les agents ne voient que les dossiers de leur périmètre.
13. Le seuil initial de décision de l’Administration est de 350 000 FCFA ; Faustin décide sous ce seuil, avec exception d’urgence grave tracée.
14. Les alertes de première version restent dans l’application.
15. Les rondes doivent fonctionner hors ligne et se synchroniser sans perte ni doublon.
16. L’historique métier doit être attribué, daté et append-only pour les événements sensibles.

## 8. Événements constituant une activité métier

### Inclus dans l’historique métier

- création d’un constat ou dossier ;
- qualification, changement de priorité et affectation/réaffectation ;
- création, terminaison, remplacement ou annulation d’une prochaine action ;
- décision de branche et arbitrage financier, y compris urgence ;
- déclaration, complément et résolution d’un blocage ;
- changement motivé d’échéance ;
- début, mise à jour significative et fin d’intervention ;
- création ou modification d’une exigence de preuve ;
- dépôt, acceptation ou refus d’une preuve ;
- création, levée ou refus de réserve ;
- clôture et réouverture ;
- changement sensible de droit lorsqu’il affecte la capacité à traiter le dossier.

### Exclus de la dernière activité métier

- rafraîchissement d’écran ;
- lecture d’un dossier sans action ;
- recalcul d’un affichage sans changement de règle ou de résultat persistant ;
- mise à jour automatique de `updated_at` ;
- renouvellement de session ou appel technique sans effet métier ;
- synchronisation qui ne fait que confirmer un événement déjà enregistré, sans créer de doublon.

Cette liste est une recommandation de dictionnaire à valider ; elle n’ajoute aucun statut ni aucune étape.

## 9. Arbitrages métier réellement nécessaires

### A1 — Le responsable peut-il être externe ?

| Option | Effet |
|---|---|
| A. Profil interne uniquement | Un utilisateur BEHIRA reste toujours comptable de l’avancement ; l’entreprise externe est liée à l’intervention ou au blocage. |
| B. Profil interne ou entreprise externe | Reprend l’ancien cahier, mais crée un responsable sans compte capable d’agir dans l’application. |

**Recommandation Dev Lead : option A.** Elle respecte l’absence d’accès prestataire et évite qu’un dossier paraisse attribué alors que personne dans l’outil ne peut le faire avancer.

### A2 — Comment renseigner et remplacer la prochaine action ?

| Option | Effet |
|---|---|
| A. Texte libre | Souple, mais difficile à filtrer, notifier, tester et comparer. |
| B. Liste contrôlée uniquement | Fiable, mais peut être trop rigide pour les cas terrain. |
| C. Code contrôlé + libellé/commentaire facultatif | Permet automatisation et adaptation sans perdre la cohérence. |

**Recommandation Dev Lead : option C.** Le système crée l’action initiale de qualification ; Faustin crée/confirme l’action issue d’une décision ; l’agent termine l’action qui lui est attribuée ; toute nouvelle action clôt ou remplace explicitement l’ancienne. La prochaine action utilise par défaut l’échéance courante du dossier afin d’éviter deux délais concurrents.

### A3 — Comment gouverner l’échéance après requalification ?

| Option | Effet |
|---|---|
| A. Conserver toujours l’échéance initiale | Simple mais peut devenir incohérent après changement de priorité ou de branche. |
| B. Recalcul automatique silencieux | Cohérent avec la nouvelle règle, mais détruit la traçabilité de l’engagement initial. |
| C. Recalcul avec conservation de l’ancienne échéance et motif | Cohérent et auditable. |

**Recommandation Dev Lead : option C.** Une éventuelle dérogation manuelle doit être motivée et historisée. La personne autorisée à l’approuver selon le niveau de risque reste à confirmer.

### A4 — Quel cycle pour le blocage ?

| Option | Effet |
|---|---|
| A. Un statut « bloqué » et un commentaire | Trop pauvre : acteur, dates et résolution restent ambigus. |
| B. Un blocage actif principal avec historique des blocages successifs | Simple pour le cockpit et suffisamment traçable pour le MVP. |
| C. Plusieurs blocages actifs simultanés | Plus réaliste sur les dossiers complexes, mais plus lourd à piloter. |

**Recommandation Dev Lead : option B pour le MVP.** Catégories d’acteur recommandées : profil interne, rôle existant, entreprise externe de référence ou système. Faustin et l’agent affecté pourraient déclarer ; l’Administration résoudrait ses arbitrages et Faustin les autres blocages. Ces droits doivent être validés avant implémentation.

### A5 — Comment déterminer la preuve attendue ?

| Option | Effet |
|---|---|
| A. Règle fixe par équipement | Simple mais insuffisante pour les différentes gravités et branches. |
| B. Décision libre de Faustin pour chaque dossier | Flexible mais incohérente à grande échelle. |
| C. Règles contextuelles + confirmation/renforcement par Faustin | Combine cohérence et traitement des exceptions. |

**Recommandation Dev Lead : option C.** Priorité proposée : décision explicite du Facility Manager, puis combinaison équipement/catégorie/gravité, puis étape par défaut. L’exigence doit être instanciée sur le dossier et ne pas changer rétroactivement si le référentiel évolue. La matrice exacte demeure à fournir par le métier.

### A6 — Quelles modifications de dossier sont permises hors ligne ?

| Option | Effet |
|---|---|
| A. Rondes seulement | Besoin confirmé, risque de conflit limité. Les décisions de Faustin restent en ligne. |
| B. Rondes + exécution des actions et preuves | Plus utile sur le terrain, mais nécessite outbox, médias différés et conflits. |
| C. Toutes les opérations, y compris décisions et affectations | Très complexe et risqué pour les arbitrages simultanés. |

**Recommandation Dev Lead : option B à terme, par étapes.** Commencer par les rondes confirmées, puis autoriser la réalisation d’une action et la préparation d’une preuve hors ligne. Maintenir qualification, affectation, validation, clôture et gestion des droits en ligne pour la première version.

## 10. Impacts de la cible proposée

| Domaine | Impact attendu après validation, sans implémentation dans ce lot |
|---|---|
| UX | `AntiZombieSummary` pourra afficher une donnée canonique, les absences resteront explicites et les états transitoires seront distingués des erreurs après qualification. |
| Supabase | Sources existantes conservées pour statut/responsable/SLA ; concepts additifs nécessaires pour actions, blocages et exigences de preuve ; historique enrichi. |
| RLS | Lecture toujours fondée sur le périmètre du dossier ; écritures par rôle et fonction transactionnelle ; aucun accès prestataire ou `anon`. |
| Historique | Journal métier append-only couvrant actions, blocages, preuves, décisions, échéances, clôture et réouverture. |
| Hors ligne | Outbox, identifiants idempotents, versions de base, horodatage serveur, cache marqué et file média séparée. |
| Données anciennes | Aucun remplissage inventé ; file de complétude Faustin pour les dossiers existants. La préproduction ne contient actuellement aucun dossier opérationnel. |
| Sécurité | Les futures vues doivent respecter la RLS (`security_invoker` ou fonction avec contrôle explicite) ; aucune clé serveur côté client. |

## 11. Découpage proposé des futures migrations — aucune migration créée

| Future migration | Objet | Dépendance de validation |
|---|---|---|
| M1 — Référentiel et conventions | Types contrôlés nécessaires, sans modifier les statuts ni rôles existants. | A2, A4, A5. |
| M2 — Actions du dossier | Entité de prochaine action, unicité de l’action courante, historique et RLS. | A2, A3. |
| M3 — Blocages | Déclaration/résolution, acteur polymorphe contrôlé, motif et RLS. | A4. |
| M4 — Exigences de preuve | Exigences dossier, satisfaction par preuve acceptée et règles de levée. | A5 et matrice métier. |
| M5 — Historique métier complet | Catalogue d’événements, commentaires, étape, départage et événements des tables liées. | Validation section 8. |
| M6 — Lecture AntiZombie | Vue `security_invoker` ou RPC de lecture composant les sources canoniques sans dupliquer les règles dans React. | M2 à M5. |
| M7 — Résilience hors ligne | Idempotence, versions, synchronisation et médias en attente. | A6. |

Chaque migration future devra être additive, réexécutable dans l’environnement de test, accompagnée de pgTAP/RLS et d’un plan de retour arrière. La bascule frontend restera un lot séparé après recette Supabase.

## 12. Captures réelles du composant accepté

Ces images proviennent du rendu local réel du checkpoint `8d26974`. Elles valident la présentation ; les valeurs de repli visibles restent nécessaires tant que les sources canoniques ne sont pas raccordées.

### Desktop

![AntiZombieSummary réel dans le cockpit Faustin sur desktop](../../outputs/design/anti-zombie-faustin-desktop.png)

### Mobile

![AntiZombieSummary réel dans le cockpit Faustin sur mobile](../../outputs/design/anti-zombie-faustin-mobile.png)

## 13. Formulaire de validation métier proposé

Pour geler le dictionnaire, l’Administration et Faustin doivent seulement confirmer ou corriger les six choix suivants :

1. Responsable canonique interne uniquement : **oui / non**.
2. Prochaine action = code contrôlé + commentaire facultatif : **oui / non**.
3. Recalcul de l’échéance avec conservation de l’ancienne valeur : **oui / non**.
4. Un seul blocage principal actif pour le MVP : **oui / non**.
5. Preuve attendue = règle contextuelle confirmée/renforcée par Faustin : **oui / non**.
6. Hors ligne première version = rondes, puis actions/preuves terrain ; décisions sensibles en ligne : **oui / non**.

Toute réponse `non` devra préciser l’option retenue. Aucune migration ne doit commencer tant que ces choix et la matrice de preuves ne sont pas validés.

## 14. Pause du chantier

Le lot A est terminé sur le plan documentaire. Le dictionnaire, les droits, les étapes, les décisions confirmées, les arbitrages, les impacts et le découpage des futures migrations sont prêts pour validation. Aucun changement produit ou distant n’a été effectué. Le chantier reste en pause.
