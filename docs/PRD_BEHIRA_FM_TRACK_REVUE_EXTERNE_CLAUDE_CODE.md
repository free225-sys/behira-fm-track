# PRD - BEHIRA FM Track

## Document de cadrage pour revue externe par Claude Code

| Champ | Valeur |
|---|---|
| Produit | BEHIRA FM Track |
| Commanditaire métier | Administration de la SCI Groupe Behira |
| Référents métier | Frédéric AMANY et Faustin SIAPO |
| Dev Lead | Codex |
| Rôle attendu de Claude Code | Auditeur externe en lecture seule |
| Statut | Cible métier consolidée après validation de l'Administration |
| Version | 0.2 - 27 août 2026 |

---

## 1. Mandat confié à Claude Code

Claude Code intervient comme **analyste externe**. Il ne remplace pas le Dev Lead et ne doit pas engager de refonte, modifier le code, changer la base Supabase, créer des comptes ou appliquer des migrations pendant cette mission. La seule écriture autorisée est le rapport final `docs/audits/AUDIT_EXTERNE_2026-08-27.md`.

L'objectif de sa revue est de confronter ce PRD au dépôt existant et de faire ressortir :

1. les exigences oubliées ou insuffisamment définies ;
2. les contradictions entre le besoin métier, l'interface, le modèle de données et les règles d'accès ;
3. les risques de sécurité, de maintenabilité, de qualité des données et d'expérience utilisateur ;
4. les hypothèses non prouvées qui pourraient provoquer une mauvaise orientation du produit ;
5. les éléments existants qu'il serait préférable de conserver ;
6. les étapes manquantes ou mal ordonnées dans la roadmap ;
7. les critères d'acceptation trop vagues ou impossibles à tester ;
8. les questions supplémentaires à poser à l'Administration de la SCI Groupe Behira et à Faustin.

### Contraintes de la revue

- Travailler en lecture seule.
- Ne créer ou modifier aucun fichier en dehors de `docs/audits/AUDIT_EXTERNE_2026-08-27.md`.
- Ne pas afficher, copier ou rechercher des mots de passe, clés privées ou secrets.
- Ne pas contacter le projet Supabase distant et ne pas exécuter d'écriture distante.
- Ne lancer aucun `git commit`, aucun `supabase db push`, aucune commande MCP en écriture et aucune installation de dépendance.
- Distinguer les faits observés dans le dépôt, les exigences exprimées dans ce PRD et les recommandations de Claude.
- Ne pas considérer les fichiers historiques, prototypes ou données de démonstration comme des exigences définitives.
- Ne pas proposer une réécriture totale si une extension sûre de la fondation existante est possible.
- Signaler explicitement les points incertains au lieu de les transformer en décisions.
- Si une exigence n'a aucune trace dans le dépôt, écrire `non trouvé` au lieu de supposer son existence.
- Tout constat P0 ou P1 sans référence `fichier:ligne` doit être marqué `non vérifié`.

### Format de restitution demandé à Claude Code

La restitution attendue doit commencer par la branche et le commit audités lorsqu'ils sont disponibles. Si le dossier n'est pas un dépôt Git, indiquer explicitement `Git non disponible dans le répertoire audité`.

Elle doit contenir :

1. un verdict exécutif de dix lignes maximum ;
2. une matrice `Exigence du PRD / État dans le code / Écart / Risque / Recommandation` ;
3. les constats classés en P0, P1 et P2 ;
4. une analyse des rôles, droits et parcours de chaque utilisateur ;
5. une analyse spécifique Supabase : schéma, RLS, fonctions, Auth, Storage et audit ;
6. une analyse spécifique du cycle métier de bout en bout ;
7. une analyse du calcul et de la gouvernance des scores ;
8. les questions supplémentaires à faire valider par le métier ;
9. une proposition de roadmap corrigée si la roadmap ci-dessous présente des lacunes ;
10. une liste claire des composants ou fondations qu'il ne faut pas reconstruire inutilement.

Chaque constat détaillé doit rester inférieur à 150 mots. Les preuves techniques volumineuses doivent être résumées et référencées, pas copiées intégralement.

---

## 2. Résumé exécutif du produit

BEHIRA FM Track doit devenir le poste central de pilotage de la maintenance d'un bâtiment géré par la SCI Groupe Behira.

Le produit ne doit pas se limiter à afficher un registre d'anomalies. Il doit faire avancer chaque problème depuis sa détection lors d'une ronde ou d'un reporting jusqu'à sa résolution vérifiée, avec un responsable, une décision, une échéance, une prochaine action, un suivi financier si nécessaire et des preuves de clôture.

L'objectif prioritaire est : **zéro dossier zombie**.

Un dossier zombie est un problème connu qui reste sans responsable clairement identifié, sans prochaine action, sans échéance, sans décision ou sans justification de blocage.

Le prototype actuel contient une fondation technique et visuelle réutilisable, mais son centre de gravité fonctionnel est insuffisant. La cible impose une refonte des parcours métier et des écrans structurants, sans réécriture aveugle de la fondation Supabase, de l'authentification, de l'audit ou du stockage sécurisé déjà réalisés.

---

## 3. Problème à résoudre

Le fonctionnement actuel repose sur plusieurs rondes, reportings, fichiers, constats et échanges qui ne garantissent pas qu'une anomalie soit suivie jusqu'à sa résolution complète.

Les principaux risques sont :

- oubli d'un problème après son signalement ;
- absence de responsable ou d'acteur bloquant ;
- retards sans alerte ni justification ;
- décision interne ou externe non formalisée ;
- coûts, devis et validations dispersés ;
- intervention clôturée sans preuve suffisante ;
- réserves non levées ;
- impossibilité de mesurer la santé réelle du bâtiment ;
- difficulté à expliquer la baisse d'un score ;
- droits utilisateurs trop larges, trop faibles ou attribués sans traçabilité.

---

## 4. Vision produit

BEHIRA FM Track doit fournir une source unique, historisée et sécurisée pour :

- exécuter les rondes et reportings directement dans l'application ;
- détecter les écarts et créer les problèmes à qualifier ;
- piloter le cycle complet d'une intervention ;
- suivre les responsabilités, échéances, blocages et preuves ;
- gérer les devis, coûts, validations, réceptions et réserves ;
- présenter les décisions attendues à l'Administration et à Faustin ;
- mesurer la santé du bâtiment et des équipements ;
- mesurer la qualité de traitement des dossiers par les agents ;
- administrer les utilisateurs, leurs rôles et leurs périmètres ;
- conserver une piste d'audit exploitable.

---

## 5. Principes métier non négociables

1. Les reportings sont saisis directement dans l'application.
2. Aucun mécanisme d'import de reporting n'est requis dans le fonctionnement cible.
3. Les prestataires n'ont aucun compte et aucun accès à l'application.
4. Les entreprises prestataires restent des données de référence rattachées aux interventions, contrats, coûts et rapports.
5. Les rapports d'intervention prestataire sont déposés par des agents internes expressément autorisés.
6. Faustin valide ces rapports avant qu'ils deviennent des preuves acceptées.
7. Une anomalie critique ne peut pas être clôturée sans preuve acceptée.
8. Toute action importante doit être attribuée, datée et historisée.
9. Les droits doivent être attachés à des rôles et permissions, pas codés en dur sur le nom d'une personne.
10. Frédéric est actuellement le titulaire du rôle d'Administration de la SCI Groupe Behira et du futur droit de gestion des utilisateurs.
11. Un compte n'est pas supprimé si son historique métier doit être conservé ; il est désactivé.
12. Le score d'un agent ne doit jamais provoquer automatiquement une sanction.
13. Une moyenne favorable ne doit pas masquer la défaillance d'un équipement vital.
14. Le pilote fonctionnel et métier commence par le surpresseur Wilo.
15. Les rondes doivent rester saisissables sans réseau et être synchronisées automatiquement au retour de la connexion.
16. Les agents ne consultent que les dossiers relevant de leur périmètre.
17. Les alertes de la première version sont diffusées dans l'application uniquement.

---

## 6. Utilisateurs et responsabilités

### 6.1 Administration de la SCI Groupe Behira - Frédéric

Responsabilités cibles :

- vision globale du bâtiment et des dossiers ;
- arbitrage des coûts, risques et blocages importants ;
- validation des décisions à partir d'un seuil initial de 350 000 FCFA, modifiable dans le paramétrage par l'Administration ;
- contrôle a posteriori des clôtures critiques effectuées par Faustin avec preuve acceptée ;
- suivi des KPI, coûts, performances et alertes majeures ;
- suivi du score global du bâtiment ;
- consultation des scores de santé des équipements ;
- consultation des scores de traitement des agents et de leur détail explicatif ;
- création, activation et désactivation des agents ;
- attribution des rôles, périmètres, équipements et zones ;
- génération ou réinitialisation d'un mot de passe temporaire ;
- consultation de l'historique des changements d'accès.

Le produit doit attribuer ces capacités au rôle d'Administration, même si Frédéric en est aujourd'hui le titulaire.

### 6.2 Faustin - Facility Manager

Faustin est le pivot opérationnel.

Responsabilités cibles :

- qualifier les constats et anomalies ;
- affecter un responsable ;
- demander ou confirmer un diagnostic ;
- décider entre intervention interne sans coût, intervention interne avec coût ou intervention externe ;
- suivre les échéances, acteurs bloquants et relances ;
- contrôler les preuves ;
- gérer la réception, les réserves et la clôture technique ;
- valider les rapports d'intervention prestataire déposés par les agents autorisés ;
- suivre les KPI, les coûts, les blocages et les performances ;
- suivre le score global du bâtiment ;
- suivre les scores de santé des équipements ;
- suivre les scores de traitement des agents ;
- accéder au détail explicatif de tous ces scores.

Faustin peut consulter les utilisateurs et soumettre une demande de création ou de modification de compte. L'approbation finale des droits sensibles reste du ressort de l'Administration.

Dans la délégation validée, Faustin peut décider seul lorsque le montant est inférieur à 350 000 FCFA. En cas d'urgence grave, il peut faire engager l'intervention avant l'accord de l'Administration, à condition de l'informer immédiatement et de faire tracer le motif de l'urgence.

### 6.3 Évariste - agent technique électricité

- réalise une part importante des rondes techniques électriques ;
- intervient principalement sur le groupe électrogène et les équipements de son périmètre ;
- renseigne diagnostics, actions et preuves ;
- peut déposer un rapport d'entreprise prestataire uniquement dans son périmètre autorisé ;
- ne valide pas définitivement ce rapport.

Périmètre actuellement préparé : `GE-01`.

### 6.4 Sylvain - agent technique eau, incendie et irrigation

- réalise une part importante des rondes eau, incendie et irrigation ;
- renseigne diagnostics, actions et preuves ;
- peut déposer un rapport d'entreprise prestataire uniquement dans son périmètre autorisé ;
- ne valide pas définitivement ce rapport.

Périmètre actuellement préparé : `WILO-01`, `RIA-01` et `IRR-01`.

### 6.5 Laetitia - agente et assistante de direction

Laetitia utilise un seul compte avec plusieurs capacités métier.

- peut effectuer des rondes de cleaning et de jardinage ainsi que des constats terrain ;
- n'est pas l'exécutante principale des rondes techniques ;
- prépare et suit les devis ;
- suit les paiements, autorisations et pièces administratives ;
- consulte les coûts et dossiers de Direction nécessaires à sa mission ;
- lorsqu'elle constate une anomalie pendant une ronde, elle enregistre le constat et le transmet à Faustin pour qualification ;
- ne dispose pas du droit actuel de déposer un rapport prestataire ;
- doit voir une séparation claire entre ses tâches d'agente et ses tâches d'assistante.

### 6.6 Prestataires

- aucun compte ;
- aucune connexion ;
- aucune action directe dans l'application ;
- présence uniquement comme entreprises de référence, parties d'une intervention, d'un devis, d'un contrat ou d'un rapport ;
- rapports téléversés par les agents internes autorisés puis contrôlés par Faustin.

---

## 7. Gestion des comptes et des accès

### 7.1 Parcours de création d'un agent

Depuis l'espace `Utilisateurs et accès`, l'Administration doit pouvoir :

1. saisir le nom, l'email professionnel et la fonction ;
2. choisir un rôle ;
3. attribuer les équipements, zones ou catégories autorisés ;
4. attribuer, si nécessaire, une permission nominative ;
5. créer le compte avec un mot de passe temporaire ;
6. remettre l'identifiant de manière sécurisée au titulaire ;
7. imposer la création d'un nouveau mot de passe à la première connexion ;
8. vérifier que le compte reste privé de tout droit métier avant ce changement ;
9. enregistrer l'opération dans l'audit.

### 7.2 Actions administratives

- activer ou désactiver un compte ;
- réinitialiser l'accès avec un nouveau mot de passe temporaire ;
- modifier un rôle ou un périmètre ;
- révoquer une permission particulière ;
- consulter l'historique des changements ;
- interdire la suppression irréversible d'un compte lié à des opérations historiques.

Faustin peut consulter les comptes et soumettre une demande de création ou de modification. L'Administration demeure seule habilitée à valider une création, une désactivation, un rôle, un périmètre ou toute permission sensible.

### 7.3 Exigences de sécurité

- aucune clé `service_role` ne doit être exposée au navigateur ;
- la création Auth doit passer par un composant serveur sécurisé ;
- chaque action doit vérifier le rôle d'Administration côté serveur ;
- les droits réels doivent être stockés dans des tables protégées, pas dans des métadonnées modifiables par l'utilisateur ;
- le changement de rôle doit être audité ;
- une session active doit être réévaluée lorsqu'un compte est désactivé ou perd un droit sensible.

---

## 8. Parcours métier cible

### 8.1 Ronde ou reporting

1. L'agent choisit une ronde, une zone ou un équipement.
2. L'application charge le formulaire métier correspondant.
3. L'agent saisit contrôles, mesures, observations et preuves.
4. Le reporting est enregistré directement dans la base centrale.
5. Les écarts sont proposés comme anomalies à qualifier.
6. Faustin reçoit ces éléments dans sa file de qualification.
7. La couverture attendue et les reportings manquants deviennent visibles.
8. En l'absence de réseau, la saisie reste disponible localement, son état est visible et l'envoi reprend automatiquement au retour de la connexion sans créer de doublon.

### 8.2 Cycle complet d'un problème

1. Constat ou anomalie issue d'une ronde.
2. Création du ticket.
3. Qualification et affectation par Faustin.
4. Diagnostic par l'agent responsable.
5. Décision explicite sur la branche de traitement.
6. Branche A : intervention interne sans coût.
7. Branche B : intervention interne avec coût.
8. Branche C : intervention externe avec prestataire.
9. Devis, documents et validations nécessaires.
10. Exécution de l'intervention.
11. Réception contradictoire.
12. Acceptation ou création de réserves.
13. Correction et levée des réserves si nécessaire.
14. Contrôle des preuves, PV, rapports et éléments financiers.
15. Clôture technique.
16. Revue de clôture sensible selon les règles de délégation.
17. Analyse de la récurrence et actions de prévention.

Règles de décision validées :

- en dessous de 350 000 FCFA, Faustin décide dans sa délégation ;
- à partir de 350 000 FCFA, l'Administration valide avant engagement, sauf urgence grave ;
- en urgence grave, l'intervention peut commencer avant accord si l'Administration est informée immédiatement et si le motif est tracé ;
- Faustin peut clôturer un dossier critique lorsqu'une preuve conforme au type de dossier a été acceptée ; l'Administration exerce ensuite un contrôle a posteriori ;
- Faustin et l'Administration peuvent rouvrir un dossier clôturé, avec motif et lien vers la clôture précédente.

### 8.3 Règle anti-dossier-zombie

À tout moment, un dossier non clôturé doit posséder :

- un statut autorisé ;
- un responsable ;
- une prochaine action ;
- une échéance ;
- un acteur bloquant si le dossier est bloqué ;
- une justification du retard ou du blocage ;
- une preuve attendue ;
- un historique des transitions.

### 8.4 Rapport d'intervention prestataire

1. Évariste ou Sylvain choisit une entreprise prestataire.
2. L'agent rattache le rapport à une anomalie et une intervention de son périmètre.
3. Il renseigne coût, réserves et informations requises.
4. Le fichier est stocké dans un espace privé.
5. Le rapport reste en attente.
6. Faustin l'accepte ou le refuse avec justification.
7. Un rapport accepté peut devenir une preuve de l'intervention.

---

## 9. Tableaux de bord et vues attendues

### 9.1 Tableau de bord Administration

- actions et décisions attendues ;
- risques critiques ;
- coûts engagés, estimés et écarts ;
- dossiers bloqués et en retard ;
- clôtures sensibles ;
- santé globale du bâtiment ;
- santé des équipements ;
- performance de traitement des agents ;
- tendances et explications ;
- accès à la gestion des utilisateurs.

### 9.2 Centre de décision Faustin

- nouveaux constats à qualifier ;
- anomalies sans responsable ;
- décisions internes ou externes à prendre ;
- retards, blocages et relances ;
- devis en attente ;
- interventions à réceptionner ;
- réserves ouvertes ;
- preuves manquantes ;
- rapports prestataires à valider ;
- KPI, coûts, scores et explications.

### 9.3 Espace agent

- rondes attendues ;
- formulaires adaptés au métier ;
- dossiers affectés ;
- diagnostics et actions à réaliser ;
- demandes d'arbitrage ;
- preuves à fournir ;
- consultation des scores de traitement de tous les agents, avec une présentation identique et explicable ;
- accès limité aux dossiers et données opérationnelles de son propre périmètre.

### 9.4 Espace Laetitia

- rondes de cleaning et de jardinage ;
- création de constats transmis à Faustin pour qualification ;
- préparation et suivi des devis ;
- suivi des paiements, autorisations et pièces ;
- consultation des coûts et dossiers de Direction nécessaires ;
- séparation visuelle des deux fonctions ;
- aucune permission implicite obtenue du seul fait de sa double fonction.

### 9.5 Autres vues structurantes

- registre central des anomalies ;
- dossier complet d'intervention ;
- reportings spécialisés par équipement ;
- ronde rapide et ronde multi-zones ;
- devis, coûts, validations et pièces financières ;
- réception, réserves, PV et signatures ;
- situations consolidées technique, cleaning et paysager ;
- historique et audit ;
- paramétrage des seuils, statuts, SLA et notifications ;
- gestion des zones et du référentiel associé sans migration technique ;
- utilisateurs, rôles, périmètres et permissions.

---

## 10. Modèle de score

### 10.1 Score de santé d'un équipement

Chaque équipement reçoit une note sur 100 accompagnée d'une couleur, d'une tendance, de la date du dernier contrôle et des causes de variation.

Pondération proposée :

- disponibilité et continuité : 30 % ;
- anomalies ouvertes pondérées par gravité : 25 % ;
- maintenance préventive réalisée dans les délais : 20 % ;
- mesures et contrôles dans les seuils : 15 % ;
- fiabilité, récidives et pannes répétées : 10 %.

Une absence de données récentes doit réduire la confiance dans le score et ne doit jamais produire artificiellement un bon résultat.

### 10.2 Score global du bâtiment

Structure validée :

- santé technique des équipements : 70 % ;
- sécurité et conformité : 15 % ;
- état général des zones : 10 % ;
- continuité des services : 5 %.

Pondération des équipements dans la composante technique :

- vital : coefficient 5 ;
- important : coefficient 3 ;
- confort : coefficient 1.

Règle validée : si un équipement vital de sécurité est indisponible, le score global ne peut pas dépasser 50 sur 100 et doit apparaître en rouge.

Les autres plafonds, les seuils de couleur et la fréquence de recalcul restent à confirmer.

### 10.3 Score de traitement d'un agent

Le score doit mesurer la qualité du traitement, pas seulement le volume de dossiers :

- respect des délais ;
- rapidité de prise en charge ;
- qualité des preuves ;
- nombre de dossiers rouverts ;
- difficulté et contexte des interventions, utilisés pour expliquer et corriger les écarts de comparaison.

Les quatre critères validés pour la première formule sont le respect des délais, la rapidité de prise en charge, la qualité des preuves et le nombre de dossiers rouverts. Leur pondération exacte reste à calibrer pendant le pilote Wilo.

Le score doit être explicable, historisé et dissocié du score de santé du patrimoine. Il ne doit entraîner aucune sanction automatique.

### 10.4 Gouvernance des scores

- l'Administration et Faustin voient tous les scores et leur détail explicatif ;
- tous les agents peuvent voir les scores de traitement de tous les agents ;
- cette visibilité ne donne aucun accès supplémentaire aux dossiers hors périmètre ;
- chaque changement de formule doit être versionné et historisé ;
- le score affiché doit indiquer la période, la fraîcheur et la complétude des données utilisées.

---

## 11. Exigences fonctionnelles prioritaires

| ID | Exigence | Priorité | Critère d'acceptation principal |
|---|---|---|---|
| FR-01 | Créer et suivre un dossier complet d'intervention | P0 | Aucun dossier actif ne peut rester sans responsable, prochaine action et échéance |
| FR-02 | Intégrer le cycle complet et ses trois branches | P0 | Chaque transition est autorisée, historisée et cohérente avec la branche choisie |
| FR-03 | Saisir les rondes et reportings directement | P0 | Aucun import de fichier n'est requis pour le fonctionnement quotidien |
| FR-04 | Construire le centre de décision Faustin | P0 | Faustin traite qualification, affectation, décision, réception, réserves et preuves depuis une vue cohérente |
| FR-05 | Protéger la clôture critique | P0 | Une critique sans preuve acceptée ne peut pas être clôturée, y compris par appel direct à l'API |
| FR-06 | Gérer les utilisateurs par l'Administration | P0 | L'Administration peut créer, désactiver et réinitialiser un agent sans exposition de clé serveur ; Faustin peut consulter et soumettre une demande |
| FR-07 | Appliquer les périmètres et permissions | P0 | Un agent ne peut modifier aucune donnée hors de son périmètre |
| FR-08 | Interdire tout accès prestataire | P0 | Aucun rôle, compte, session ou politique active ne permet une connexion prestataire |
| FR-09 | Déposer un rapport prestataire en interne | P0 | Seuls les agents autorisés peuvent déposer dans leur périmètre et Faustin reste validateur |
| FR-10 | Gérer devis, coûts et validations | P1 | Le dossier applique le seuil configurable de 350 000 FCFA, trace les exceptions d'urgence et relie montant, pièces et décision |
| FR-11 | Gérer réception et réserves | P1 | Une réserve possède responsable, échéance et preuve de levée |
| FR-12 | Calculer le score de chaque équipement | P1 | Le score est reproductible et chaque baisse est expliquée |
| FR-13 | Calculer le score global du bâtiment | P1 | La formule 70/15/10/5 et les plafonds vitaux sont vérifiables par test |
| FR-14 | Calculer le score de traitement des agents | P1 | Le résultat tient compte de la qualité et du contexte, pas du volume seul |
| FR-15 | Présenter alertes et dossiers zombies | P1 | Les retards, blocages, reportings manquants et réserves ouvertes sont actionnables |
| FR-16 | Consolider les situations | P1 | Les situations technique, cleaning et paysager sont consultables sans recopies incohérentes |
| FR-17 | Fournir historique et audit | P0 | Toute transition, décision sensible et modification de droits est attribuée et horodatée |
| FR-18 | Optimiser les parcours mobiles | P2 | Les rondes et preuves restent utilisables sans débordement sur mobile |
| FR-19 | Permettre les rondes hors ligne | P0 | Une saisie peut être conservée sans réseau puis synchronisée automatiquement, sans perte ni doublon |
| FR-20 | Administrer le référentiel des zones | P1 | L'Administration peut ajouter, modifier ou désactiver une zone sans intervention technique et sans effacer l'historique |

---

## 12. Exigences non fonctionnelles

### Sécurité

- RLS active sur toutes les tables exposées ;
- autorisation par rôle, périmètre et permission nominative ;
- aucune confiance dans un contrôle uniquement visuel ;
- Storage privé pour les preuves et rapports ;
- aucune clé serveur dans le frontend ;
- fonctions privilégiées non exécutables par des rôles non autorisés ;
- audit des créations de comptes et changements de droits ;
- verrou complet avant changement du mot de passe temporaire.

### Traçabilité

- historique métier immuable ou append-only pour les événements sensibles ;
- auteur, date, ancienne valeur, nouvelle valeur et motif ;
- lien entre réouverture et clôture précédente ;
- conservation de l'identité historique d'un compte désactivé.

### Expérience utilisateur

- interfaces adaptées au rôle ;
- actions prioritaires visibles immédiatement ;
- vocabulaire métier non technique ;
- responsive mobile, tablette et desktop ;
- contrastes et focus clavier accessibles ;
- absence de doubles bordures ou signaux visuels contradictoires ;
- formulaires longs progressifs, sauvegardables et tolérants aux coupures.

### Qualité et performance

- calculs de score déterministes et testables ;
- pagination et filtres pour les registres volumineux ;
- aucune dépendance à des données de démonstration en préproduction réelle ;
- comportement de repli clairement séparé du mode réel ;
- contrôles automatisés des parcours critiques.

### Terrain, réseau et médias

- les rondes doivent fonctionner sans réseau ou avec une connexion instable ;
- définir une file de synchronisation, la résolution des conflits, la prévention des doublons et un état visible pour l'agent ;
- encadrer la taille, le format, la compression et la reprise d'upload des photos et PDF ;
- ne jamais déclarer une preuve enregistrée tant que le stockage distant n'a pas confirmé l'opération ;
- prévoir un comportement explicite lorsque l'upload échoue ou reste en attente.

### Données personnelles et gouvernance

- identifier les données personnelles réellement traitées : identité, activité, photos, commentaires, historique et éventuelle géolocalisation ;
- ne pas ajouter de géolocalisation sans décision métier, justification et information des utilisateurs ;
- définir les durées de conservation, règles d'archivage et procédures de suppression ou d'anonymisation ;
- limiter l'accès aux scores individuels et conserver leur finalité opérationnelle ;
- soumettre la gouvernance du score des agents à une validation RH et juridique appropriée avant mise en production ;
- documenter les sauvegardes, tests de restauration et responsabilités de traitement.

---

## 13. État technique observé au 27 août 2026

### Fondation existante à conserver si l'audit la confirme

- frontend React / Next avec TypeScript ;
- prototype responsive et espaces par persona ;
- authentification réelle Supabase et mode de démonstration séparé ;
- projet Supabase de préproduction configuré ;
- 12 migrations SQL versionnées ;
- 26 tables métier attendues par la vérification statique ;
- 5 profils internes confirmés ;
- RLS, audit et historique ;
- Storage privé pour les preuves ;
- cycle persistant Constat, Qualification, Intervention, Preuve et Clôture ;
- rapports prestataires déposés par les agents internes autorisés ;
- première connexion imposant le changement du mot de passe temporaire ;
- tests SQL, tests du workflow, tests Auth et contrôles statiques.

### Comptes et périmètres préparés

- Frédéric : Administration / Direction, vision globale ;
- Faustin : Facility Manager, vision opérationnelle globale ;
- Évariste : agent `GE-01` et dépôt prestataire autorisé dans ce périmètre ;
- Sylvain : agent `WILO-01`, `RIA-01`, `IRR-01` et dépôt autorisé dans ce périmètre ;
- Laetitia : agente `RND-LET`, sans dépôt prestataire ;
- aucun compte prestataire ;
- aucun compte Kimberley ;
- aucun profil Lecture seule précréé.

### Éléments encore simulés ou incomplets

- architecture actuelle des écrans encore centrée sur le registre d'anomalies ;
- parcours complet devis, validation, réception et réserves incomplet ;
- tableaux de bord et scores non alimentés par les formules métier finales ;
- gestion autonome des utilisateurs par Frédéric non implémentée ;
- certains parcours de Direction, de Faustin et des agents restent des démonstrations ;
- mode de secours par données de démonstration encore présent ;
- décisions métier structurantes du questionnaire désormais validées ; les paramètres techniques et de gouvernance listés en section 16 restent à préciser.

---

## 14. Contradictions ou risques déjà connus à challenger

Claude Code doit examiner en priorité les points suivants :

1. **Nombre de zones** : le référentiel de départ validé contient 76 zones. Le produit doit permettre à l'Administration de faire évoluer cette liste sans modification technique.
2. **Import supprimé mais table historique présente** : la cible exclut l'import quotidien, tandis que le schéma contient encore `report_imports`. Déterminer si cette table doit être dépréciée, renommée, réservée à une migration initiale ou supprimée plus tard.
3. **Visibilité des dossiers par les agents** : la décision impose un périmètre strict ; vérifier que l'interface, les requêtes et la RLS appliquent la même règle.
4. **Visibilité des scores** : tous les agents peuvent voir tous les scores de traitement, sans obtenir accès aux dossiers hors périmètre ; vérifier cette séparation.
5. **Gestion des utilisateurs** : la future interface ne doit jamais exposer une clé serveur ni permettre une élévation de privilège depuis le navigateur.
6. **Désactivation et sessions existantes** : vérifier comment retirer rapidement les droits d'un compte déjà connecté.
7. **Fonctions privilégiées** : des avertissements Supabase relatifs à des fonctions `SECURITY DEFINER` accordées aux utilisateurs authentifiés ont déjà été signalés ; vérifier leur nécessité, leurs contrôles internes et leurs droits d'exécution.
8. **Dépendances** : plusieurs versions du frontend utilisent des plages avec caret ; vérifier le verrouillage effectif par le lockfile et le risque de dérive.
9. **Scores et données manquantes** : éviter qu'une absence de contrôle récent améliore artificiellement un score.
10. **Score agent** : vérifier les biais liés à la difficulté, au volume, au périmètre et à la possibilité de manipulation.
11. **Mode démonstration** : vérifier qu'il ne peut pas être confondu avec la préproduction réelle ou contourner l'authentification.
12. **Sources multiples** : vérifier que le registre central, les tickets, les reportings et les interventions ne deviennent pas plusieurs sources de vérité concurrentes.
13. **Référentiel prestataire** : conserver les entreprises sans réintroduire indirectement un rôle ou un accès prestataire.
14. **Projet non versionné dans ce dossier** : le répertoire de travail actuel ne contient pas de métadonnées Git détectables ; signaler les risques de traçabilité, livraison et retour arrière.
15. **Mode hors ligne requis** : concevoir la synchronisation, les conflits, la prévention des doublons et la reprise des médias avant de finaliser l'architecture des formulaires.
16. **Photos et pièces volumineuses** : vérifier les limites, la compression, la reprise d'upload, les métadonnées et les échecs partiels.
17. **Notifications** : vérifier les canaux, la déduplication, les relances, les préférences, la preuve d'envoi et la gestion des échecs.
18. **Rétention et sauvegardes** : vérifier les durées de conservation, l'archivage, les sauvegardes et la restauration testée.
19. **Données personnelles et score des agents** : analyser les risques de confidentialité, de détournement de finalité, de biais et de décision automatisée. Distinguer les obligations à confirmer avec un conseil RH ou juridique.

---

## 15. Décisions déjà validées

- nom institutionnel : SCI Groupe Behira ;
- objectifs prioritaires conjoints : zéro dossier zombie, résolution plus rapide des situations critiques et meilleur contrôle des coûts ;
- reportings saisis directement dans l'application ;
- absence d'import de reporting dans le fonctionnement cible ;
- aucun accès prestataire ;
- dépôt interne des rapports prestataires ;
- Évariste et Sylvain autorisés dans leurs périmètres préparés ;
- Faustin seul validateur final de ces rapports ;
- Laetitia est agente et assistante de direction ;
- Évariste et Sylvain réalisent la majorité des rondes techniques ;
- accès complet de l'Administration et de Faustin aux scores et aux explications ;
- score global du bâtiment composé à 70/15/10/5 ;
- criticité des équipements pondérée par 5/3/1 ;
- plafond à 50 en cas d'indisponibilité d'un équipement vital de sécurité ;
- comptes internes avec mot de passe temporaire et changement obligatoire ;
- le pilote métier commence par le surpresseur Wilo ;
- seuil initial de validation de l'Administration : 350 000 FCFA, configurable par l'Administration ;
- Faustin décide seul sous ce seuil ;
- une urgence grave autorise l'intervention avant accord, avec information immédiate de l'Administration et justification tracée ;
- Faustin clôture un dossier critique avec preuve conforme et l'Administration contrôle ensuite ;
- Laetitia prépare et suit les devis, paiements, autorisations, coûts et dossiers de Direction nécessaires ; elle réalise aussi les rondes de cleaning et de jardinage ;
- un constat de Laetitia est transmis à Faustin pour qualification ;
- les agents ne voient que les dossiers de leur périmètre ;
- les preuves obligatoires varient selon le type de dossier ;
- les alertes de la première version restent dans l'application ;
- Faustin et l'Administration peuvent rouvrir un dossier clôturé ;
- la recette de la première version porte sur dix dossiers réels ;
- chaque score d'équipement est présenté sur 100 avec un état vert, orange ou rouge ;
- le score agent combine délais, rapidité, qualité des preuves et dossiers rouverts ;
- tous les agents peuvent voir tous les scores de traitement ;
- les rondes fonctionnent hors ligne et se synchronisent automatiquement au retour du réseau ;
- le référentiel initial contient 76 zones et doit devenir administrable ;
- l'Administration doit pouvoir administrer les agents depuis l'application ; Faustin peut consulter et proposer une modification, mais l'Administration valide les droits sensibles ;
- la fondation technique existante doit être réutilisée lorsqu'elle est conforme.

---

## 16. Décisions encore ouvertes

1. Quels seuils exacts séparent les états vert, orange et rouge des scores ?
2. Quels équipements sont classés vitaux, importants ou de confort ?
3. Quelles situations, en plus d'une panne vitale de sécurité, doivent plafonner le score global ?
4. À quelle fréquence les scores sont-ils recalculés et quelle période d'historique doit être visible ?
5. Quelle pondération exacte faut-il appliquer aux quatre critères du score des agents ?
6. Quelle matrice de preuves faut-il définir pour chaque type de dossier ?
7. Quelles alertes dans l'application sont immédiates, regroupées ou relancées, et selon quelle escalade ?
8. Quelles tailles, formats, compressions et reprises d'envoi s'appliquent aux photos et documents ?
9. Quelles règles de conflit s'appliquent lorsque deux personnes modifient hors ligne le même dossier ?
10. Quelles sont les durées de conservation des preuves, rapports, audits et comptes désactivés ?
11. L'application doit-elle collecter une position géographique ?
12. Quelle gouvernance RH et juridique encadre la visibilité collective du score des agents ?

---

## 17. Roadmap de livraison proposée par le Dev Lead

### Phase 0 - Revue externe et consolidation

Durée indicative : 2 à 3 jours.

- revue de ce PRD et du dépôt par Claude Code ;
- classement des écarts et risques ;
- arbitrage des constats par le Dev Lead ;
- mise à jour du registre des décisions ;
- aucune modification fonctionnelle lourde avant la fin de cette phase.

**Livrable :** rapport de contre-analyse et liste des décisions à prendre.

**Gate :** aucun P0 non compris ou sans propriétaire.

### Phase 1 - Validation métier

Durée indicative : 2 à 4 jours selon la disponibilité des décideurs.

- intégrer formellement les réponses de l'Administration ;
- valider le pipeline, les délégations, le pilote Wilo et le seuil de 350 000 FCFA ;
- confirmer le référentiel initial de 76 zones et son administration future ;
- transformer les paramètres techniques encore ouverts en règles testables ;
- geler le périmètre de la première version.

**Livrable :** PRD validé et registre de décisions signé.

**Gate :** aucune règle critique contradictoire.

### Phase 2 - Architecture fonctionnelle et maquettes

Durée indicative : 1 semaine.

- cartographie des écrans par rôle ;
- maquettes Administration, Faustin, agents et Laetitia ;
- dossier d'intervention complet ;
- reporting Wilo pilote ;
- gestion des utilisateurs ;
- états vide, erreur, chargement, blocage et absence de données ;
- états hors ligne, synchronisation, conflit et upload en attente ;
- revue responsive et accessibilité.

**Livrable :** maquettes validées écran par écran.

**Gate :** aucun développement de parcours non validé visuellement et fonctionnellement.

### Phase 3 - P0 : coeur opérationnel

Durée indicative : 2 semaines.

- règle anti-dossier-zombie ;
- diagnostic et trois branches ;
- affectation, prochaine action, échéance et acteur bloquant ;
- preuves contextuelles ;
- verrou de clôture critique ;
- délégation financière de Faustin et exception d'urgence tracée ;
- réouverture par Faustin ou l'Administration ;
- centre de décision Faustin ;
- historique et audit complets ;
- tests RLS et transactions.

**Livrable :** un ticket avance de la création à la clôture sans perte de traçabilité.

**Gate :** tests métier, SQL et sécurité réussis.

### Phase 4 - Rondes et reportings métier

Durée indicative : 2 semaines.

- module pilote Wilo ;
- saisie directe et sauvegarde progressive ;
- saisie hors ligne et synchronisation automatique ;
- anomalies proposées à Faustin ;
- couverture et reporting manquant ;
- extension progressive au groupe électrogène, ascenseurs, irrigation et ronde multi-zones.

**Livrable :** contrôles terrain enregistrés sans manipulation de fichier.

**Gate :** recette terrain du module pilote réussie.

### Phase 5 - Pilotage, finance, scores et administration

Durée indicative : 2 semaines.

- devis, coûts et validations ;
- réception et réserves ;
- tableaux de bord Administration et Faustin ;
- scores équipements, bâtiment et agents ;
- explications et historique des scores ;
- gestion des utilisateurs et des accès ;
- administration du référentiel des zones ;
- alertes et notifications.

**Livrable :** pilotage complet depuis une source unique.

**Gate :** calculs reproductibles, droits testés et décisions actionnables.

### Phase 6 - Pilote réel et recette métier

Durée indicative : 1 à 2 semaines.

- traitement d'au moins dix dossiers réels ;
- participation de l'Administration, Faustin, Évariste, Sylvain et Laetitia ;
- mesure des incompréhensions, erreurs et temps de traitement ;
- correction des défauts bloquants ;
- validation de la première version.

**Livrable :** procès-verbal de recette et liste des écarts résiduels.

**Gate :** accord de mise en service.

### Phase 7 - Durcissement et mise en production

Durée indicative : 3 à 5 jours après recette.

- protection contre les mots de passe compromis ;
- revue finale des fonctions privilégiées et politiques RLS ;
- désactivation du mode démonstration en production ;
- sauvegarde, restauration et surveillance ;
- politique de rétention et contrôle des données personnelles ;
- validation RH et juridique de la gouvernance des scores individuels ;
- procédure de support et formation ;
- plan de retour arrière ;
- versionnement Git et traçabilité de livraison à sécuriser.

**Livrable :** version de production contrôlée et documentée.

**Gate :** aucun risque de sécurité P0/P1 ouvert.

### Durée globale indicative

La cible reste de l'ordre de **8 à 10 semaines**, sous réserve de validations métier rapides, d'un périmètre stable et d'une disponibilité réelle des utilisateurs pour le pilote.

---

## 18. Critères globaux de succès

Le produit pourra être considéré comme correctement livré lorsque :

- aucun dossier actif ne peut rester sans responsable, prochaine action et échéance ;
- les dossiers critiques ne peuvent pas être clôturés sans preuve acceptée ;
- les droits sont appliqués côté base et pas seulement dans l'interface ;
- aucun prestataire ne peut se connecter ;
- les rapports prestataires suivent le circuit interne validé ;
- les reportings sont saisis directement dans l'application ;
- les anomalies détectées arrivent dans la file de qualification de Faustin ;
- l'Administration peut gérer les comptes sans accès à un secret serveur et Faustin peut soumettre une demande sans attribuer lui-même un droit sensible ;
- les scores sont reproductibles, explicables et historisés ;
- une panne vitale ne peut pas être masquée par une moyenne favorable ;
- l'Administration et Faustin voient les décisions, risques, coûts et blocages ;
- les agents peuvent travailler efficacement sur mobile ;
- les rondes Wilo peuvent être saisies hors ligne puis synchronisées sans perte ni doublon ;
- les agents ne voient que leurs dossiers de périmètre, tout en pouvant consulter les scores de traitement validés ;
- chaque action sensible est auditée ;
- dix dossiers réels ont été traités de bout en bout pendant la recette ;
- l'Administration de la SCI Groupe Behira et Faustin ont validé la mise en service.

---

## 19. Fichiers à examiner en priorité dans le dépôt

Claude Code peut commencer sa revue par :

- `app/page.tsx` ;
- `app/globals.css` ;
- `app/lib/supabase/` ;
- `supabase/migrations/` ;
- `supabase/tests/` ;
- `supabase/seed.sql` ;
- `supabase/README.md` ;
- `docs/AUTH_FRONTEND_SIMULEE.md` ;
- `docs/DECISION_ACCES_PRESTATAIRES.md` ;
- `docs/PREPRODUCTION.md` ;
- `scripts/verify-lot0.mjs` ;
- `scripts/verify-auth.mjs` ;
- `scripts/verify-personas.mjs` ;
- `scripts/verify-operational-workflow.mjs` ;
- `scripts/verify-supabase-readiness.mjs` ;
- `package.json` et le lockfile réellement utilisé.

Les rapports historiques dans `outputs/` sont utiles comme preuves de travaux antérieurs, mais ne doivent pas être considérés comme la source de vérité actuelle s'ils contredisent ce PRD ou une décision plus récente.

---

## 20. Attente finale envers Claude Code

Claude Code doit répondre à la question suivante :

> Sur la base du PRD et du dépôt actuel, quels éléments risquent encore d'empêcher BEHIRA FM Track de devenir un outil fiable de pilotage complet de la maintenance, et quelles corrections de cadrage, d'architecture, de sécurité ou de roadmap doivent être décidées avant la reprise du développement ?

La décision finale d'intégrer ou non les recommandations de Claude Code reste sous la responsabilité du Dev Lead, après validation métier par l'Administration de la SCI Groupe Behira et Faustin.
