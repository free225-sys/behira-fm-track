# FROM-DEV — passation du développement vers le design

Ce journal utilise le même gabarit que `FROM-DESIGN.md` et `DECISIONS.md`. Ajouter les nouvelles entrées en tête sans réécrire les entrées historiques.

## DEV-024 — C5 local : règles, exigences et validation des preuves

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié, non appliqué à distance
- **Sources métier :** dictionnaire du lot A, modèle du lot B et décisions fermées du lot B2
- **Périmètre :** exigences de preuve canoniques et validation Facility Manager ; aucun nouvel écran, statut, rôle, seuil, accès Prestataire, droit de dérogation ou règle hors ligne

Le modèle C5 sépare désormais quatre objets qui ne doivent jamais être confondus : la règle contextuelle publiée, l’exigence figée appliquée au dossier, la preuve déposée et la décision d’acceptation ou de refus. Les tables `proof_type_definitions`, `proof_rule_sets`, `proof_requirement_rules`, `anomaly_proof_requirements` et `proof_requirement_evidence` portent ces sources canoniques. Une évolution ultérieure d’une règle ne transforme donc pas rétroactivement les anciens dossiers.

La seule automatisation activée est la règle confirmée `CRITICAL_ACCEPTED_PROOF` : tout dossier critique ouvert reçoit l’exigence d’au moins une preuve acceptée avant clôture. Le type exact reste contextuel et à confirmer. Aucune matrice propre à WILO-01, RIA-01, aux ascenseurs, à une catégorie ou à un équipement n’a été inventée. Les types `photo`, `report` et `pv` sont les seuls types actifs et confirmés ; `invoice`, `quote`, `comment` et `other` restent inactifs pour compatibilité ou validation ultérieure.

Faustin peut renforcer le dossier en ajoutant une exigence spécifique fondée sur un type actif, mais il ne peut ni supprimer, ni affaiblir, ni remplacer silencieusement une exigence existante. C5 n’expose aucune commande de dérogation ou de substitution. Une preuve déposée reste `pending` jusqu’à une décision explicite du Facility Manager. Une preuve refusée conserve son motif, son auteur et son heure ; une preuve acceptée ne satisfait une exigence typée qu’après une liaison explicite. Les exigences génériques « toute preuve acceptée » sont reliées automatiquement après acceptation. La clôture reste refusée tant qu’une exigence obligatoire est `pending`, en complément du verrou critique historique.

### Droits, provenance et cohérence

- les agents peuvent déposer les preuves déjà autorisées dans leur périmètre, sans pouvoir les valider, les lier à une exigence ou déclarer une exigence satisfaite ;
- le Facility Manager est le seul rôle opérationnel autorisé à ajouter une exigence spécifique, accepter ou refuser une preuve et effectuer une liaison explicite ;
- l’Administration conserve la lecture globale d’audit sans acquérir les commandes du Facility Manager ; un profil verrouillé ou hors périmètre ne reçoit aucun accès métier ;
- RLS active sur les cinq nouveaux objets, aucun droit `anon`, aucune écriture directe client, fonctions internes inexécutables par les rôles exposés et RPC publiques limitées aux utilisateurs authentifiés puis contrôlées côté serveur ;
- application, renforcement, liaison, satisfaction, dépôt, acceptation et refus sont historisés avec acteur, étape, source, heure serveur et clé d’idempotence ; les replays identiques restent sans doublon et les replays divergents sont refusés ;
- les règles publiées et les instantanés appliqués sont protégés contre les réécritures silencieuses. Le script de recette locale supprime uniquement sa fixture par le conteneur local, sans assouplir cette immutabilité dans le modèle produit.

### Contrôles réalisés

- reconstruction complète : **19 migrations**, seed idempotent et **11/11 suites pgTAP** réussies ;
- recette C5 : règle critique unique, absence de règle équipement inventée, exigence générique automatique, renforcement typé, preuve déposée distincte, acceptation/refus, motif et provenance, liaison explicite, satisfaction, idempotence, version obsolète, immutabilité, verrou de clôture et RLS Administration/FM/agent/hors périmètre/profil verrouillé ;
- lint des schémas `public` et `private` : aucune erreur ; inventaire Lot 0 : **41 tables / 19 migrations / 11 tests SQL** ; types TypeScript Supabase régénérés ;
- cinq comptes Auth locaux, changement obligatoire du premier mot de passe, périmètres RLS, workflow persistant critique, Storage privé et nettoyage de fixture : réussis ;
- audit visuel **92/92**, personas **38/38**, authentification **20/20**, AntiZombieSummary **11/11**, hors ligne **17/17**, résilience **12/12**, lint et build réussis ;
- aucune écriture Supabase distante, aucun secret, aucune publication, aucune modification de l’interface et aucune modification du dossier `tmp/`.

- **Limites explicites :** aucune exigence par équipement, catégorie ou étape n’est activée tant que sa matrice n’est pas validée ; aucune dérogation n’est disponible ; les décisions, validations et clôtures restent en ligne. `AntiZombieSummary` n’est pas encore raccordé à ces sources canoniques.
- **Suite proposée :** C6 local — créer une projection de lecture unique des huit champs canoniques, raccorder l’adaptateur partagé de `AntiZombieSummary`, puis vérifier Faustin, registre et dossier central sans dupliquer la logique métier.

## DEV-023 — C4 local : blocage principal et justification de retard

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié, non appliqué à distance
- **Sources métier :** dictionnaire du lot A, modèle du lot B et décisions fermées du lot B2
- **Périmètre :** blocage principal actif et justification d’un retard déjà constaté sur l’échéance canonique ; aucun nouvel écran, statut, rôle, droit, délai, seuil, pause SLA ou compte Prestataire

Les tables `anomaly_blocks` et `anomaly_delay_justifications` portent désormais les deux sources canoniques C4. Un dossier ne peut avoir qu’un blocage principal ouvert à la fois. Son cycle est strictement `active` → `resolution_proposed` → `resolved` : la personne qui constate la levée propose la résolution, puis le Facility Manager la confirme pour les blocages opérationnels ; l’Administration confirme les blocages d’arbitrage qui lui appartiennent. Un nouveau blocage ne remplace jamais le précédent : le précédent doit être résolu, reste historisé et peut être référencé par le suivant.

L’acteur bloquant est enregistré comme interne, entreprise prestataire de référence, acteur externe libre ou système. Un prestataire reste une référence métier sans compte, rôle ni accès à l’application. Le libellé, le code et l’identité éventuelle sont figés au moment de la déclaration afin qu’une évolution ultérieure du référentiel ne réécrive pas l’histoire.

La justification de retard ne fabrique jamais le retard et ne modifie pas le SLA. Elle ne peut viser qu’une échéance canonique active dont l’heure serveur confirme le dépassement. Une nouvelle justification remplace explicitement la précédente sans la supprimer, avec lien de succession, auteur, motif contrôlé, commentaire, heure serveur, version du dossier et clé d’idempotence. Les motifs sont contrôlés par l’étape ou le statut concerné ; `ROUND_OVERDUE` reste au catalogue mais n’est pas applicable à une échéance d’anomalie faute de modèle canonique de délai de ronde.

### Droits, sécurité et historique

- le Facility Manager peut déclarer les six motifs de blocage confirmés, remplacer une justification et confirmer les résolutions opérationnelles dans son périmètre global ;
- l’Administration peut déclarer et confirmer les blocages `ADMIN_DECISION_PENDING` et `QUOTE_PENDING`, sans acquérir les commandes opérationnelles du Facility Manager ;
- un agent ne peut déclarer ou proposer la résolution que sur un dossier ou une action qui lui est attribué et dans son périmètre ; il ne peut pas confirmer la résolution et ne peut compléter que sa propre justification avec le même motif ;
- RLS active, aucun droit `anon`, lecture limitée par `can_access_anomaly()`, aucune écriture directe client et aucune exécution directe des fonctions de trigger ;
- chaque déclaration, proposition, résolution, création et remplacement écrit atomiquement la donnée, l’historique métier et la nouvelle version du dossier ; les replays identiques sont sans doublon et les replays différents ou versions obsolètes sont refusés ;
- une clôture est refusée tant qu’un blocage `active` ou `resolution_proposed` existe, sans modifier le verrou critique de preuve déjà en place.

### Contrôles réalisés

- reconstruction complète : **18 migrations**, seed idempotent et **10/10 suites pgTAP** réussies ;
- recette C4 : blocage interne, externe et prestataire, instantané de l’acteur, blocage actif unique, proposition puis confirmation séparée, remplacement historisé, retard serveur, compatibilité motif/étape, échéance future refusée, idempotence, version obsolète, clôture bloquée, immutabilité et RLS Administration/FM/agent/hors périmètre/profil verrouillé ;
- lint du schéma `public` : aucune erreur ; inventaire Lot 0 : **36 tables / 18 migrations / 10 tests SQL** ;
- types TypeScript Supabase régénérés ; cinq comptes Auth locaux, changement obligatoire du premier mot de passe, périmètres RLS, workflow persistant critique et Storage privé : réussis ;
- audit visuel **92/92**, personas **38/38**, authentification **20/20**, AntiZombieSummary **11/11**, hors ligne **17/17**, résilience **12/12**, lint et build réussis ;
- aucune écriture Supabase distante, aucun secret, aucune publication, aucune modification de l’interface et aucune modification du dossier `tmp/`.

- **Limites explicites :** `ARBITRATION_OVERDUE` reste inactif conformément au dictionnaire ; `ROUND_OVERDUE` attend un modèle d’échéance de ronde ; les décisions, validations finales et clôtures restent exclusivement en ligne. L’interface n’est pas encore raccordée à ces nouvelles sources.
- **Suite proposée :** C5 local additif — définir et appliquer les exigences de preuve contextuelles au dossier, en séparant la règle, l’exigence figée, la preuve déposée et sa validation. Le raccordement final de `AntiZombieSummary` viendra ensuite, une fois les huit sources canoniques disponibles.

## DEV-022 — C3 local : prochaine action canonique de Qualification

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié, non appliqué à distance
- **Sources métier :** lots A, B, B2 et séquence Qualification validée dans DEV-020
- **Périmètre :** prochaine action du dossier dans l’étape Qualification uniquement ; aucun nouvel écran, statut, rôle, droit, délai, seuil ou calcul métier

La table `anomaly_actions` porte désormais la prochaine action canonique du dossier. Une contrainte partielle garantit qu’un dossier ne possède jamais plus d’une action `pending`. Les actions terminées, remplacées ou annulées restent immuables et reliées à leur succession ; aucun fait historique n’est écrasé. L’action utilise l’échéance canonique du dossier créée en C2 et ne crée donc pas une seconde date concurrente.

La seule séquence active demeure celle validée dans Qualification :

1. `QUALIFY_ASSIGN` — qualifier et affecter, sous responsabilité Facility Manager ;
2. `PERFORM_DIAGNOSIS` — diagnostic attribué au responsable terrain interne et dans son périmètre ;
3. `CHOOSE_TREATMENT_BRANCH` — choix de branche attribué au Facility Manager.

Le système crée l’action initiale lorsqu’un dossier entre en Qualification. Sans acteur authentifié fiable, il conserve volontairement l’état « sans exécutant » au lieu d’inventer un responsable. Faustin peut confirmer ou remplacer l’action courante ; l’agent affecté peut terminer son diagnostic ; Faustin conserve la capacité de le terminer. Chaque opération verrouille le dossier, exige sa version courante et une clé d’idempotence, puis écrit atomiquement l’action suivante, l’historique et la nouvelle version du dossier. Une même clé rejouée par un autre acteur ou avec un contenu différent est refusée.

Les trois codes contrôlés acceptent un commentaire facultatif. Le code `OTHER` reste inactif et conserve la règle de commentaire obligatoire. Aucun saut de séquence n’est autorisé et les trois actions restent dans `A_QUALIFIER` : elles ne créent aucune nouvelle étape métier.

### Sécurité, historique et compatibilité

- RLS active ; aucun droit `anon` ; les profils authentifiés disposent uniquement de `SELECT` dans le périmètre défini par `can_access_anomaly()` ;
- aucune écriture directe client ; seules les deux commandes transactionnelles explicitement accordées sont appelables, tandis que les fonctions de trigger restent inexécutables par les rôles exposés ;
- l’agent ne peut terminer que son diagnostic ; la Direction lit la timeline globale sans acquérir les actions du Facility Manager ; le verrou de première connexion neutralise tout accès métier ;
- toute création, terminaison, substitution ou annulation est reliée à une définition d’événement et conserve acteur, étape, source, commentaire, heure serveur et clé d’idempotence ;
- une sortie par l’ancien workflow annule proprement l’action Qualification encore active. Si aucun utilisateur fiable n’est présent, la provenance est explicitement marquée `Système BEHIRA` sans identité inventée ;
- les champs et RPC Supabase sont présents dans les types TypeScript générés, mais aucun écran ne les consomme encore.

### Contrôles réalisés

- reconstruction complète : **17 migrations**, seed idempotent et **9/9 suites pgTAP** réussies ;
- recette C3 : création système, action active unique, affectation FM, séquence sans saut, diagnostic par l’agent responsable, choix de branche rendu au FM, version obsolète refusée, rejeu identique sans doublon, rejeu différent refusé, annulation système historisée, grants et RLS Administration/FM/agent/profil verrouillé ;
- lint du schéma `public` : aucune erreur ; inventaire Lot 0 : **34 tables / 17 migrations / 9 tests SQL** ;
- cinq comptes Auth locaux, changement obligatoire du premier mot de passe, périmètres RLS, workflow persistant critique et Storage privé : réussis ;
- audit visuel **92/92**, personas **38/38**, authentification **20/20**, AntiZombieSummary **11/11**, hors ligne **17/17**, résilience **12/12**, lint et build réussis ;
- aucune écriture Supabase distante, aucun secret, aucune publication et aucune modification du dossier `tmp/`.

- **Limite explicite :** `CHOOSE_TREATMENT_BRANCH` reste volontairement `pending`. Sa terminaison doit être intégrée à la transaction existante qui choisit réellement la branche ; C3 refuse une clôture isolée qui ferait avancer l’action sans faire avancer le dossier. L’interface continue d’utiliser son adaptateur de démonstration jusqu’au futur lot de projection.
- **Suite proposée :** C4 local additif — modéliser un blocage principal actif et les justifications de retard, avec acteurs internes ou externes, résolution historisée et sans compte Prestataire. Le raccordement de la projection `AntiZombieSummary` reste différé jusqu’aux sources canoniques de blocage et de preuve attendue.

## DEV-021 — C2 local : échéance canonique historisée

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié, non appliqué à distance
- **Source métier :** validation du lot B documentaire et séquence Qualification confirmée dans DEV-020
- **Périmètre :** échéances existantes du dossier uniquement ; aucun nouveau délai, statut, rôle, droit, écran ou calcul métier

La table `anomaly_deadlines` porte désormais une seule échéance active par dossier. Elle reprend exclusivement les deux instantanés SLA existants : `qualification_due_at` pour Constat/Qualification, puis `intervention_due_at` pour Décision/Intervention/Preuve. Aucun délai de devis, preuve, réserve ou arbitrage n’est inventé. Les dossiers préexistants sont repris sans recalcul ; les dossiers clôturés ou sans échéance fiable ne reçoivent aucune valeur artificielle.

Chaque création, remplacement et fin d’échéance produit un événement métier dans `anomaly_history`. L’historique conserve l’ancienne et la nouvelle valeur, l’ancienne et la nouvelle étape, l’auteur, l’origine automatique, la justification, la source et une clé d’idempotence. Une transition d’étape crée une nouvelle version liée à la précédente, même lorsque l’heure limite reste identique. Une clôture termine la version active sans effacer les versions antérieures.

Les anciennes colonnes SLA restent temporairement disponibles aux consommateurs existants, mais leur modification directe après création est refusée : aucun recalcul ou changement silencieux n’est possible. Le futur raccordement applicatif devra lire l’échéance active depuis `anomaly_deadlines` avant de retirer cette compatibilité ; C2 ne crée pas encore de commande manuelle de report d’échéance.

### Sécurité et performance

- RLS active ; aucun droit `anon` ; les profils authentifiés disposent uniquement de `SELECT` dans le périmètre des dossiers déjà autorisés par `can_access_anomaly()` ;
- aucun droit client d’insertion, modification ou suppression ; les écritures sont réalisées par les triggers internes, dont l’exécution directe est révoquée ;
- unicité partielle garantissant une seule échéance active par dossier ; index de timeline, étape/échéance et toutes les clés étrangères ;
- verrouillage de la version active pendant son remplacement et ordre de traitement déterministe pour la reprise initiale.

### Contrôles réalisés

- reconstruction complète : **16 migrations**, seed idempotent et **8/8 suites pgTAP** réussies ;
- recette C2 : instantané SLA initial, transitions Constat → Qualification → Intervention, liens entre versions, refus d’un changement silencieux, unicité active, clôture et conservation historique, grants et RLS agent/Facility Manager ;
- lint du schéma `public` : aucune erreur ; inventaire Lot 0 : **33 tables / 16 migrations / 8 tests SQL** ;
- cinq comptes Auth locaux, changement obligatoire du premier mot de passe, périmètres RLS, workflow persistant critique et Storage privé : réussis ;
- audit visuel **92/92**, personas **38/38**, authentification **20/20**, AntiZombieSummary **11/11**, hors ligne **17/17**, résilience **12/12**, lint et build réussis ;
- aucune écriture Supabase distante, aucun secret, aucune publication et aucune modification du dossier `tmp/`.

- **Limite explicite :** l’échéance n’est pas encore raccordée à l’interface ; celle-ci continue de lire les instantanés historiques jusqu’au lot de projection prévu. La modification manuelle justifiée reste hors périmètre tant que sa commande transactionnelle n’est pas validée.
- **Suite proposée :** C3 local additif — enregistrer la prochaine action au niveau du dossier avec le catalogue Qualification validé, commentaire facultatif et commentaire obligatoire pour `OTHER`, sans créer de nouvelle étape de workflow.

## DEV-020 — Validation de la séquence Qualification

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Validation métier appliquée localement — non publiée, non appliquée à distance
- **Décision utilisateur :** le diagnostic reste dans l’étape `QUALIFICATION` et le statut `A_QUALIFIER` jusqu’au choix de la branche de traitement

La décision active uniquement les trois actions successives déjà décrites dans B2 :

1. `QUALIFY_ASSIGN` — Qualifier et affecter ;
2. `PERFORM_DIAGNOSIS` — Réaliser et confirmer le diagnostic ;
3. `CHOOSE_TREATMENT_BRANCH` — Choisir la branche de traitement.

Ces actions appartiennent au dossier et restent compatibles avec l’étape Qualification ; aucun statut ni aucune étape n’est ajouté. Les treize autres codes C1 restent inactifs. La liste visible par un agent est donc limitée aux trois codes confirmés, tandis que l’Administration et le Facility Manager conservent la possibilité de relire les candidats inactifs avant un futur arbitrage.

Cette validation n’ajoute aucune action opérationnelle à un dossier, ne modifie aucune permission et ne raccorde encore aucun écran. Elle ferme seulement le premier gate métier de B2 et prépare C2 sur l’échéance canonique historisée.

- **Contrôles réalisés :** reconstruction des **15 migrations** et seed idempotent ; **7/7 suites pgTAP** ; inventaire Lot 0 **32 tables / 15 migrations / 7 tests SQL** ; lint du schéma `public` sans erreur ; audit visuel **92/92**, personas **38/38**, authentification **20/20**, AntiZombieSummary **11/11**, hors ligne **17/17**, résilience **12/12**, lint et build réussis.
- **Suite proposée :** C2 local additif — créer `anomaly_deadlines`, reprendre sans invention les échéances déjà calculées et conserver toute future ancienne/nouvelle valeur dans l’historique.

## DEV-019 — C1 local : référentiels anti-dossier-zombie et provenance de l’historique

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié, non appliqué à distance
- **Source métier :** lots A, B et B2 du 28 août 2026
- **Périmètre :** référentiels contrôlés et enrichissement append-only de `anomaly_history` ; aucun raccordement UI ni objet opérationnel

Le premier lot technique de continuité de traitement est volontairement additif. Il crée les référentiels `next_action_codes`, `next_action_code_stages`, `block_reason_codes`, `delay_reason_codes`, `block_resolution_codes` et `business_event_definitions`, puis enrichit l’historique avec l’étape, la source, l’identité lisible de l’acteur, les heures client/serveur et une clé d’idempotence.

### Décisions non inventées

- les 16 codes de prochaine action et leurs compatibilités sont chargés comme **candidats inactifs** ; ils n’accordent aucune capacité et restent réservés à la revue Administration/Facility Manager tant que le catalogue et le maintien du diagnostic dans Qualification ne sont pas explicitement validés ;
- seuls six motifs de blocage, six motifs de retard et cinq motifs de résolution déjà qualifiés comme confirmés dans B2 sont actifs ; les recommandations `INTERNAL_DEPENDENCY`, `SITE_ACCESS_CONSTRAINT`, `ARBITRATION_OVERDUE`, `BLOCK_DECLARED_IN_ERROR` et les variantes `OTHER` concernées restent inactives ;
- le catalogue d’événements actif couvre seulement les six types déjà produits par le trigger historique existant ; `ANOMALY_UPDATED` est explicitement exclu de la dernière activité métier ;
- aucune action, échéance, déclaration de blocage, justification de retard ou exigence de preuve n’est créée ; aucune règle WILO n’est généralisée ;
- aucun statut, rôle, périmètre, permission, seuil financier, verrou critique ou règle hors ligne n’est modifié.

### Sécurité et provenance

- RLS activée sur les six nouveaux objets exposés ; `anon` ne reçoit aucun accès ;
- les profils authentifiés ne disposent que de `SELECT` et le verrou de première connexion continue de neutraliser l’accès métier ;
- les agents ne voient que les codes actifs, tandis que l’Administration et le Facility Manager peuvent relire les candidats inactifs ;
- aucun `INSERT`, `UPDATE` ou `DELETE` client n’est accordé sur `anomaly_history` ;
- chaque nouvel événement produit par `record_anomaly_history()` reçoit sa définition, son étape, sa table et son enregistrement source, son acteur et l’heure serveur ;
- l’index d’idempotence empêche l’enregistrement en double d’un événement porteur de la même clé.

### Contrôles réalisés

- reconstruction complète : **14 migrations**, seed idempotent et **7/7 suites pgTAP** réussies ;
- nouveau test C1 : catalogues, candidats inactifs, provenance, idempotence, grants et RLS Administration/FM/agent réussis ;
- lint du schéma `public` : aucune erreur ; les alertes générales de l’extension pgTAP sont hors schéma produit ;
- inventaire Lot 0 : **32 tables**, 14 migrations et 7 fichiers SQL ;
- cinq comptes Auth locaux, changement obligatoire du premier mot de passe, périmètres RLS, workflow critique et Storage privé : réussis ;
- lint et build frontend réussis ; audit visuel **92/92**, personas **38/38**, authentification **20/20**, AntiZombieSummary **11/11**, résilience **12/12**, hors ligne **17/17**, polices HTTP 200 ;
- aucun secret, appel Supabase distant, publication ou modification du dossier `tmp/`.

- **Suite proposée :** soumettre le catalogue C1 à validation métier. Après validation, ouvrir C2 sur l’échéance canonique historisée, puis C3 sur la prochaine action enregistrée. Le raccordement de `AntiZombieSummary` reste différé jusqu’à l’existence de toutes les sources canoniques nécessaires.

## DEV-018 — Raccordement des checkpoints DESIGN-033 à DESIGN-039 au socle privé

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Sources design :** `e2a3313`, `d95a206`, `0e8ccd1`, `50ee722`
- **Branche privée :** `integration/design-p7b`
- **Périmètre :** interface et documentation design uniquement ; aucune migration, règle métier, permission, donnée ou écriture Supabase distante

Les sept checkpoints validés du miroir public sont maintenant raccordés à l’application privée sans remplacer ses parcours Supabase, son authentification réelle ni sa file hors ligne.

### Raccordements réalisés

- porte d’authentification ramenée à un chrome unique et clair, avec les mêmes mécanismes de session, de mot de passe oublié et de changement obligatoire ;
- Accueil Facility Manager centré sur Santé & performance et renvoi explicite vers À traiter, sans ruban opérationnel dupliqué ;
- menu compact et ruban AQ/SLA/PV avec état actif pétrole, sans double bordure ;
- Pilotage / Parc réduit à un aperçu qui ouvre la destination Équipements ;
- Registre avec un seul titre visuel ;
- dossier central avec un seul cycle, une action principale claire et des onglets pétrole ;
- destinations Équipements, Coûts, Utilisateurs et droits, Seuils et paramètres avec une seule hiérarchie de titre ;
- accueil Rondes & Assistance sans second formulaire de constat, la saisie persistante restant dans Rondes ;
- pilote Surpresseur sans seconde bande navy ni score dupliqué, avec cinq étapes et score WILO conservés dans leur carte dédiée.

### Préservation du socle privé

- les 13 migrations, RLS, rôles, permissions, statuts et seuil de `400 000 FCFA` sont inchangés ;
- les rondes `GE-01`, `RND-LET` et `WILO-01`, les brouillons IndexedDB, la file de synchronisation et les preuves privées restent raccordés ;
- le verrou critique, le changement obligatoire du premier mot de passe et les cinq périmètres métier restent actifs ;
- aucune clé serveur, fixture réelle, publication ou appel Supabase distant n’est ajouté.

### Contrôles réalisés

- lint et build : réussis ;
- audit visuel statique : **92/92** ; personas : **38/38** ; authentification : **20/20** ; AntiZombieSummary : **11/11** ; résilience : **12/12** ; hors ligne : **17/17** ;
- polices Geist servies en HTTP 200 et console navigateur sans erreur ;
- recette navigateur réelle à 390, 768, 1024 et 1440 px : aucun débordement horizontal, plancher visible à 12 px, états actifs pétrole, dossier mobile identité → action → constat, cinq étapes Surpresseur et score WILO unique ;
- reconstruction Supabase locale : 13 migrations, seed, 6/6 suites pgTAP, cinq comptes Auth locaux, changement obligatoire du mot de passe, périmètres RLS, workflow critique et stockage privé réussis ;
- lint du schéma `public` : aucune erreur.

- **Suite proposée :** figer ce checkpoint d’intégration, puis ouvrir le prochain lot produit sur les sources canoniques de la continuité de traitement, sans publier avant une validation explicite.

## DEV-017 — P8 Release candidate : recette visuelle réelle et correctifs ciblés

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — en attente de validation avant publication
- **Checkpoint de départ :** `2c47353`
- **Périmètre :** recette du design unifié et des parcours privés P7B ; aucune migration, règle métier, permission ou écriture Supabase distante

La passe navigateur précédemment impossible a été exécutée sur l'application locale. Les écrans Administration, Facility Manager et Agent Eau & Incendie ont été contrôlés à 1440, 768 et 390 px : navigation et menu Plus, files AQ/SLA/PV, ticket actif, synthèse anti-dossier-zombie, dossier central, registre, Accueil santé & performance et ronde Surpresseur. Les filtres AQ/SLA/PV restent exclusifs, les droits visibles dépendent du persona, le registre et les vues mobiles ne débordent pas, aucun texte visible n'est inférieur à 12 px et la console reste vide.

Deux écarts de rendu ont été confirmés puis corrigés sans toucher au comportement :

- la carte **Score WILO** héritait de la disposition flex de son en-tête ; État, Variation et Fraîcheur sont désormais trois lignes stables sur desktop et mobile ;
- certaines actions principales et commandes de session restaient sous le minimum tactile de 44 px sur mobile ; le sélecteur de persona, la déconnexion, les boutons primaire/secondaire et le détail du score respectent maintenant ce plancher.

Deux garde-fous portent l'audit visuel à **83/83** et protègent ces contrats. La recette complète réussit également : 38/38 contrôles personas, 12/12 résilience, 17/17 hors ligne, 20/20 authentification, 11/11 AntiZombieSummary, polices Geist HTTP 200, lint et build. La base locale a été reconstruite depuis zéro ; les 13 migrations, le seed, les 6/6 suites pgTAP, les cinq comptes locaux, le changement obligatoire du premier mot de passe, les périmètres RLS, le workflow critique et le stockage privé ont tous réussi. Le lint du schéma `public` ne remonte aucune erreur.

Le dossier `tmp/` préexistant reste volontairement non suivi. Aucun secret, déploiement ou appel Supabase distant n'a été ajouté.

- **Suite proposée :** soumettre le checkpoint P8 à validation locale ; après un GO explicite distinct, publier la version de validation.

## DEV-016 — Unification du design validé et du socle privé P7B

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Sources :** design public `9bb0ca9` ; socle privé P7B `f800323`
- **Branche privée :** `integration/design-p7b`

Ce lot réunit sur une base unique le design produit validé du miroir public et l’implémentation privée Supabase/P7B. Il ne refait pas les arbitrages visuels, ne modifie aucun rôle, aucune permission, aucun statut, aucune migration et n’écrit sur aucun projet Supabase distant.

### Raccordements réalisés

- shell horizontal, tokens DEC-013, primitives partagées, spécimen `/design-system` et destinations P2 à P6 repris depuis le checkpoint design validé ;
- authentification Supabase réelle, changement obligatoire du premier mot de passe, projections RLS et mode démonstration conservés depuis le dépôt privé ;
- file IndexedDB P7B reconnectée aux écrans design pour les rondes `GE-01`, `RND-LET` et `WILO-01` ;
- brouillons de ronde enregistrés localement, restaurés après reprise et supprimés après mise en file ;
- preuves de dossier mises en file avec identifiant canonique, état local explicite et synchronisation vers le stockage privé ;
- reprise automatique au retour réseau, idempotence, conflits sans écrasement et reprise manuelle exposés par `OfflineSyncStatus` ;
- le contrat `SyncStatusNotice` distingue désormais six états, dont `queued-local`, sans confondre protection locale et confirmation serveur ;
- le rechargement du registre n’intervient qu’après synchronisation réussie ; les décisions sensibles, validations et clôtures restent en ligne.

### Intégrité métier et Supabase

- les 13 migrations existantes sont inchangées ;
- le seuil de décision reste unique et fixé à `400 000 FCFA` ;
- le verrou critique avec preuve acceptée reste actif côté base ;
- les cinq profils internes, leurs périmètres, le retrait de l’accès prestataire et les deux permissions nominatives de dépôt restent inchangés ;
- aucune clé serveur, donnée réelle, publication ou liaison distante n’est ajoutée.

### Contrôles réalisés

- `pnpm lint` et `pnpm build` : réussis ;
- `pnpm audit:visual` : 81/81 ; `pnpm verify:personas` : 38/38 ;
- `pnpm verify:resilience` : 12/12 ; `pnpm verify:offline` : 17/17 ;
- `pnpm verify:auth` : 20/20 ; `pnpm verify:anti-zombie` : 11/11 ;
- assets Geist servis en HTTP 200 ; préparation Supabase et inventaire Lot 0 réussis ;
- reconstruction complète de la base locale et 6/6 suites pgTAP réussies ;
- connexion et périmètre RLS des cinq profils, première connexion, changement de mot de passe, workflow critique, stockage privé et refus d’écriture non autorisée réussis.

### Limite de recette visuelle

Le navigateur intégré a refusé l’ouverture automatisée de `http://localhost:3000/` avec une politique locale du client. Aucun contournement ni autre moteur d’automatisation n’a été utilisé. La recette de ce lot repose donc sur la compilation, le serveur HTTP, les contrôles statiques responsive/design, les audits fonctionnels et les tests d’intégration locaux. Une passe visuelle humaine reste requise avant publication.

- **Suite proposée :** P8 — recette de release candidate sur les parcours réels, correction des seuls écarts constatés, puis checkpoint soumis à validation explicite avant toute publication.

## DEV-015 — P7A Résilience terrain et contrat d’enregistrement honnête

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** rondes, actions terrain et dépôt de preuve ; aucun schéma, droit ou service Supabase modifié

L’audit de départ a confirmé que le miroir ne possède ni stockage hors ligne durable, ni file de synchronisation, ni idempotence, ni résolution de conflit. Pourtant, le pilote Surpresseur annonçait « Mode hors ligne actif », « Brouillon enregistré localement » et « prêt à synchroniser ». La saisie directe indiquait elle aussi que le brouillon était conservé sur l’appareil. Ces libellés donnaient une garantie que le code ne pouvait pas tenir.

P7A introduit un composant partagé `SyncStatusNotice` et un type `SyncStatusState`. Le contrat distingue cinq états :

- **démonstration locale — non enregistrée** : les valeurs restent dans la page et peuvent être perdues ;
- **connexion requise** : l’action doit écrire directement sur le serveur et ne bénéficie d’aucune reprise automatique ;
- **transmission en cours** : la page doit rester ouverte jusqu’à la réponse ;
- **enregistrement serveur confirmé** : cet état n’est retourné qu’après succès de l’écriture et relecture opérationnelle ;
- **échec d’enregistrement** : la donnée n’est pas présentée comme sauvée et une reprise explicite est proposée lorsque le fichier est encore disponible.

### Raccordements réalisés

- la ronde Surpresseur et la saisie directe ne simulent plus l’état réseau et ne promettent plus une sauvegarde locale ;
- leurs confirmations indiquent qu’aucune donnée n’a été enregistrée, transmise ou mise en file hors ligne ;
- les photos illustratives ne sont plus décrites comme compressées ou synchronisées ;
- les actions des agents et leurs preuves illustratives sont explicitement des interactions de démonstration ;
- le libellé de la double mission Rondes & Assistance parle de brouillons de démonstration, pas de brouillons hors ligne ;
- le dépôt réel de preuve dans le dossier reçoit les états connexion requise, transmission, échec et reprise ; le même fichier peut être renvoyé après erreur ;
- le résultat `server-confirmed` n’est retourné qu’après succès de `uploadAnomalyProof` et du rechargement des données ; le repli de démonstration retourne `demo-volatile`.

Le composant réutilise uniquement les triplets sémantiques, espacements, rayons, contrôles et tailles du design system. Son état d’erreur utilise `role="alert"`, les autres états `role="status"`, le mouvement respecte `prefers-reduced-motion` et le bouton de reprise reste utilisable sur mobile.

### Contrôles réalisés

- `pnpm verify:resilience` : 11/11 contrôles réussis ;
- `pnpm audit:visual` : 81/81 contrôles réussis ;
- `pnpm verify:personas` : 38/38 contrôles réussis ;
- `pnpm verify:anti-zombie` : 11/11 scénarios réussis ;
- `pnpm verify:auth` : 20/20 contrôles réussis ;
- `pnpm verify:fonts`, `pnpm lint` et `pnpm build` : réussis ;
- aucun ancien libellé trompeur détecté ; aucune migration, RLS, permission, clé, environnement ou publication ajouté.

### Limite volontaire

Ce lot ferme le contrat d’interface du miroir public, pas la capacité hors ligne réelle. Une activation durable exige, dans le dépôt privé, une file locale persistante, des identifiants idempotents, des états `pending/synced/conflict/error`, une politique de résolution des conflits, une reprise après fermeture et des tests avec coupure réseau réelle. Tant que ce lot privé n’est pas livré, l’outil ne doit pas promettre un fonctionnement hors connexion.

- **Suite proposée :** P7B dans le dépôt privé pour la persistance hors ligne réelle ; si la livraison visée reste une maquette de validation, passer à P8 avec cette limite explicitement inscrite dans la recette métier.

## DEV-014 — P6 Dossier central et continuité de traitement

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** fiche détaillée d'une anomalie, réutilisation de `AntiZombieSummary`, preuves et historique affiché

L'audit du checkpoint P5 `2bd49ee` a montré que le dossier central possédait déjà une intégration partielle de `AntiZombieSummary` et une grille en trois zones. Le lot P6 ne reconstruit pas ces acquis. Il referme cinq écarts : synthèse reléguée dans une colonne secondaire, faux événements présentés comme historisés, matrice de preuve généralisée sans règle confirmée, action de colonne non raccordée et onglets sans sémantique accessible complète.

La synthèse partagée est désormais placée avant les onglets du dossier. Elle consomme le même adaptateur `adaptDossierToAntiZombieSummary` que le cockpit Facility Manager et le registre : statut, responsable, prochaine action, échéance/SLA, blocage, motif, preuve attendue et dernière activité ne disposent donc pas d'une seconde projection. Les données absentes continuent d'utiliser les valeurs de repli du contrat partagé.

### Historique et preuves

L'onglet Historique ne transforme plus le workflow courant en journal métier. Les mentions « étape validée et historisée » et « historique complet » sont supprimées. Tant qu'aucune source chargée ne fournit action, acteur, étape et horodatage, l'écran affiche **0 événement canonique** et **Historique métier indisponible**. Le constat d'origine et l'étape actuelle apparaissent seulement comme repères, explicitement séparés d'un historique.

La règle particulière de `DEMO-EAU` reste la seule exigence de preuve connue par l'adaptateur. Pour les autres équipements, la fiche affiche **Preuve attendue non définie** et refuse d'inventer une matrice. Une preuve déposée ou acceptée conserve ses états actuels et le contrôle Facility Manager existant.

### Actions et droits

- Administration : consultation seulement ; aucun CTA métier n'est accordé dans la carte d'action ;
- Facility Manager : l'action principale réutilise la transition existante ou ouvre les preuves / la décision financière selon l'état ;
- clôture critique : le bouton de progression est désactivé tant que la preuve n'est pas acceptée ;
- seuil financier : `DECISION_THRESHOLD_FCFA` reste l'unique valeur de décision ;
- onglets : `tablist`, `tab`, `aria-selected`, `aria-controls` et panneaux associés sont reliés.

### Contrôles réalisés

- `pnpm verify:anti-zombie` : 11/11 scénarios réussis, dont données absentes, blocage incomplet et intégration partagée ;
- `pnpm audit:visual` : 81/81 contrôles réussis ;
- `pnpm verify:personas` : 37/37 contrôles réussis ;
- `pnpm verify:fonts`, `pnpm lint` et `pnpm build` : réussis ;
- aucune valeur de preuve, activité historique, permission, migration ou règle Supabase ajoutée.

Le lot reste une fermeture d'interface dans le miroir public. Le raccordement d'un journal métier réel, des blocages canoniques et des exigences de preuve historisées appartient toujours au dépôt privé.

- **Suite proposée :** P7 Terrain et résilience, en commençant par les rondes puis les actions et preuves terrain, avec états de synchronisation explicites avant toute promesse hors ligne.

## DEV-013 — P5 Seuils et paramètres en lecture explicable

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** destination Seuils et paramètres réservée à l'Administration, sans édition de règle réelle

Le lot démarre depuis le checkpoint P4 propre `8482d88`. L'inventaire du miroir distingue une seule valeur métier confirmée — le seuil de décision financière de **400 000 FCFA** — de trois familles seulement partielles : délais SLA par priorité, seuils techniques des équipements et méthodes de calcul des scores. Ces familles ne sont pas transformées en paramètres actifs tant que leurs valeurs, leur portée et leur historique ne sont pas raccordés.

P5 ajoute **Seuils et paramètres** sous le groupe **Administration** du menu **Plus**. La destination est absente du Facility Manager et des trois profils terrain. Elle reçoit `FINANCIAL_DECISION_PARAMETER`, dont la valeur dépend de l'unique constante `DECISION_THRESHOLD_FCFA`; aucun second montant n'est recopié dans le composant. Les consommateurs existants — Coûts, À traiter, dossier central et Accueil Administration — utilisent désormais la même valeur lors de leur rendu.

Le détail présente le nom, la valeur, l'unité, la portée, la date d'effet, l'autorité métier, la justification et les écrans consommateurs. L'historique manquant est signalé explicitement : ancienne valeur, auteur technique, horodatage détaillé et motif enregistré ne sont pas disponibles. Le composant ne contient ni formulaire, ni champ éditable, ni commande de modification.

L'Accueil Administration conserve une synthèse du seuil et renvoie vers la destination autonome. Les textes qui annonçaient un seuil « configurable » ou répétaient `400 000 FCFA` en dur ont été remplacés par une lecture honnête alimentée par la constante commune.

### Contrat d'accès et de sécurité

- Administration : consultation du seuil confirmé et des données manquantes ;
- Facility Manager : aucun accès à la destination, mais conserve la lecture du seuil dans ses décisions autorisées ;
- profils terrain : aucune destination ou donnée de paramétrage ajoutée ;
- miroir public : aucune édition, migration, RLS, secret ou appel d'administration ;
- cible privée future : modification serveur uniquement, avec ancienne et nouvelle valeur, auteur, date, justification et retour arrière.

### Contrôles réalisés

- seuil `400_000` présent une seule fois comme valeur source dans `app/page.tsx` ;
- destination réservée à l'Administration et rangée sous **Plus** ;
- état lecture seule, historique insuffisant et trois familles non raccordées présents ;
- aucune balise de formulaire, aucun champ de saisie ou gestionnaire de modification dans `ParametersWorkspace` ;
- `pnpm audit:visual` : 76/76 contrôles réussis ;
- `pnpm verify:personas` : 36/36 contrôles réussis ;
- `pnpm verify:fonts`, `pnpm lint` et `pnpm build` : réussis.

Le chemin `/seuils-et-parametres` reste réservé pour un futur découpage du routeur. Aucun fichier Supabase, environnement ou déploiement n'est modifié.

- **Suite proposée :** P6 Dossier central, en réutilisant `AntiZombieSummary` sans créer de seconde source pour ses huit champs.

## DEV-012 — P4 Utilisateurs et droits sans administration cliente

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** destination Utilisateurs et droits dans le miroir public, sans compte Auth ni écriture d'administration

Avant l'ouverture de P4, les lots P1 à P3 ont été relus depuis le dépôt et rejoués sur le checkpoint `7e8745b`. L'arbre de travail était propre, la branche contenait uniquement les trois checkpoints produit attendus au-dessus du design `0580270`, et la recette de départ a réussi : 69/69 contrôles visuels, 34/34 contrôles personas, polices HTTP 200, lint et build. Aucune omission bloquante, migration, configuration de publication, clé d'administration ou fichier d'environnement n'a été trouvée dans ces lots.

P4 ajoute **Utilisateurs et droits** sous le groupe **Administration** du menu **Plus**. La destination respecte la délégation de DEC-014 :

- l'Administration peut préparer une création ou une désactivation ;
- le Facility Manager peut uniquement proposer un rôle ou un périmètre, puis attendre la validation de l'Administration ;
- les trois profils terrain ne voient ni la destination ni ses actions ;
- un profil Administration ne peut pas être ciblé par la proposition Facility Manager ;
- les formulaires exigent une justification et rappellent avant l'envoi qu'aucune opération réelle n'est exécutée dans le navigateur.

Les cinq entrées visibles sont qualifiées de **profils de démonstration**. Elles proviennent de la configuration frontend `personas` et ne sont jamais présentées comme cinq comptes Auth existants. Le composant `AccessWorkspace` reçoit un adaptateur explicite `AccessWorkspaceUser` et n'importe aucun client Supabase. Les confirmations de création et de désactivation indiquent qu'aucun compte ni accès réel n'a été modifié.

L'ancien dialogue de création d'agent, imbriqué dans l'Accueil Administration, a été supprimé pour éviter une seconde source fonctionnelle. Son aperçu devient un résumé honnête et renvoie vers la destination autonome. La gestion réelle reste réservée au dépôt privé, à un traitement serveur sécurisé, aux contrôles canoniques de rôle et de périmètre, et à un journal d'audit.

### Contrôles réalisés

- recette préalable P1 à P3 réussie sans erreur ni omission bloquante ;
- destination présente pour Administration et Facility Manager dans **Plus**, avec repère actif ;
- proposition Facility Manager testée, sans rôle Administration disponible ;
- préparation d'une création et d'une désactivation testée côté Administration ;
- destination absente pour Agent Électricité, Agent Eau & Incendie et Agente Rondes & Assistance ;
- rendu 390, 768, 1024 et 1440 px vérifié, sans perte d'information ;
- aucun appel `service_role`, `createUser` ou `deleteUser`, aucune migration, RLS ou configuration de publication ajoutée ;
- `pnpm audit:visual`, `pnpm verify:personas`, `pnpm verify:fonts`, `pnpm lint` et `pnpm build` : réussis.

Le chemin `/utilisateurs-et-droits` reste réservé pour un futur découpage du routeur. Le lot ne modifie aucune donnée, permission réelle, API, Supabase ou configuration de déploiement.

- **Suite proposée :** P5 Seuils et paramètres, d'abord en lecture explicable dans le miroir ; toute modification réelle devra rester canonique, historisée et protégée dans le dépôt privé.

## DEV-011 — P3 Coûts fondé sur les montants réellement documentés

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** destination Coûts en lecture opérationnelle Facility Manager et vue globale Administration

Le lot P3 applique DEC-014 sans créer de donnée financière. La destination **Coûts** est groupée sous **Pilotage** dans le menu **Plus** et reste absente des profils terrain. Elle consomme les arbitrages existants au moyen d'un adaptateur explicite vers `CostsWorkspaceItem`.

`Escalation.amount` est présenté comme un **montant de décision**. Il n'est jamais assimilé silencieusement à un budget, un engagement ou un paiement. Les trois montants présents totalisent 5 250 000 FCFA ; deux arbitrages sans montant restent visibles et sont exclus du total. Le seuil commun `DECISION_THRESHOLD_FCFA` vaut 400 000 FCFA conformément à DEC-014.

Les anciens agrégats statiques de Pilotage — budget engagé, estimation mensuelle et écart projeté — sont retirés du bloc Coûts. La synthèse affiche désormais uniquement le total des montants documentés, le nombre de dossiers chiffrés et le nombre de dossiers au-dessus du seuil, avec l'état explicite **Budget, engagé et payé : données insuffisantes**. Les libellés « engagement » dispersés dans le poste Administration sont remplacés, dans ce périmètre, par « montant de décision » ou « dossiers chiffrés ».

La section financière du dossier n'emploie plus une estimation déduite arbitrairement du code équipement : elle reçoit le montant de l'arbitrage relié à l'anomalie, ou affiche **Non renseigné**. Le faux nom de devis est supprimé. Le seuil Administration n'est plus éditable localement et silencieusement ; sa modification attend le lot P5 et une source canonique historisée.

### Contrat d'accès et d'action

- Facility Manager : lecture opérationnelle et ouverture d'un dossier déjà autorisé ;
- Administration : lecture globale et ouverture du dossier ; l'arbitrage reste dans l'Accueil Administration existant ;
- profils terrain : aucune destination, donnée financière ou action ajoutée ;
- aucune décision nouvelle n'est accordée depuis la vue Coûts.

### Contrôles réalisés

- total documenté : 5 250 000 FCFA sur trois dossiers ;
- filtres : montants renseignés, au-dessus du seuil et montants non renseignés ;
- recherche « batteries » : un résultat exact ;
- accès Administration et Facility Manager présent dans **Plus** ; accès Agent Électricité absent ;
- lien Pilotage → Coûts et retour Dossier → Coûts fonctionnels ;
- rendu 390, 768 et 1024 px vérifié sans perte d'information ;
- `pnpm audit:visual` : 69/69 contrôles réussis ;
- `pnpm verify:personas` : 34/34 contrôles réussis ;
- `pnpm lint`, `pnpm build` et vérification des polices : réussis.

Le lot ne crée aucune route réseau autonome : `/couts` reste réservé pour le futur découpage du routeur. Il ne modifie ni API, donnée, permission réelle, Supabase ou configuration de déploiement. Le coût facultatif saisi dans un rapport prestataire n'est pas agrégé ici, car le miroir ne conserve pas actuellement une collection canonique de ces rapports.

- **Suite proposée :** P4 Utilisateurs et droits, sous forme de contrat et de démonstration sans traitement d'administration dans le navigateur.

## DEV-010 — P2 Équipements après validation des six arbitrages DEC-002

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** destination Équipements en lecture pour l'Administration et le Facility Manager

Wilkam a validé les six recommandations du contrat produit. La décision est consignée dans **DEC-014**. Le lot P2 ajoute une destination **Équipements** groupée sous **Le bâtiment** dans le menu **Plus**. Elle ne remplace aucune des destinations principales et reste absente des trois profils terrain.

La vue consomme exclusivement `equipmentItems`, la source déjà utilisée par Accueil et Pilotage. Elle fournit une synthèse calculée sur les scores disponibles, une recherche par code/libellé/état et un filtre sur les états existants. Aucune fraîcheur, intervention, maintenance ou cause n'est inventée : les absences sont affichées comme **Non renseignée** ou **Données insuffisantes**. La destination réutilise `Card`, `Field` et `Badge`, ainsi que les tokens du système vivant et l'accent teal de DEC-013.

La navigation protège le repère actif : lorsque la destination courante se trouve dans le menu de débordement, le déclencheur **Plus** porte `aria-current="page"`. Le passage d'un persona à un autre ramène vers sa destination autorisée ; aucun accès ne persiste pour un agent non habilité.

### Contrôles réalisés

- recherche « pompe » : un seul équipement correspondant ;
- filtre « Sain » : Irrigation et Rondes & constats uniquement ;
- accès Administration et Facility Manager : présent dans **Plus** ;
- accès Agent Électricité : destination absente et retour vers Accueil ;
- rendu 390, 768 et 1024 px : contenu complet, cartes repliées sans perte d'information et menu actif identifiable ;
- `pnpm audit:visual` : 64/64 contrôles réussis ;
- `pnpm verify:personas` : 33/33 contrôles réussis ;
- `pnpm lint`, `pnpm build` et `pnpm verify:fonts` : réussis, avec les deux polices Geist servies en HTTP 200.

Ce lot ne crée aucune route réseau autonome : `/equipements` reste réservé par DEC-014 pour un futur découpage du routeur. Il ne modifie ni donnée, API, statut métier, permission réelle, Supabase ou configuration de déploiement.

- **Suite proposée :** P3 Coûts, limité aux montants réellement disponibles et à des états explicites lorsque les agrégats ne sont pas justifiables.

## DEV-009 — Reprise Dev Lead après le checkpoint design `0580270`

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Checkpoint design reçu et vérifié localement — roadmap produit reprise
- **Périmètre :** commits `85413e6` et `0580270`, contrat design vivant, recette du miroir et séquencement produit

Le Dev Lead prend acte des deux commits livrés par le design. Les arbitrages **DEC-011**, **DEC-012** et **DEC-013** sont considérés comme clos conformément à la validation de Wilkam. En particulier, aucune nouvelle surface ne doit redéfinir la marque : `--mark #20b2aa` reste réservé au glyphe B, `--teal #0e6a66` porte l'accent courant, `--accent` reste son alias et le triplet `warning` conserve son rôle métier distinct.

Le spécimen `/design-system`, `:root` et les primitives `Button`, `IconButton`, `Badge`, `Field` et `Card` constituent désormais le contrat obligatoire avant toute évolution d'interface. Les entrées DESIGN-030 à DESIGN-032 sont présentes dans la table de suivi de `FROM-DESIGN.md`, mais leurs corps détaillés ne figurent pas dans le journal ; cette lacune documentaire ne rouvre pas les décisions, dont la portée est confirmée par les commits, `DESIGN.md` et `DECISIONS.md`.

### Recette du checkpoint

- `pnpm audit:visual` : réussi, 62 contrôles après ajout du garde-fou sur les libellés de files ;
- `pnpm verify:personas` : réussi, 32 contrôles ;
- `pnpm lint` et `pnpm build` : réussis ;
- `/` et `/design-system` : HTTP 200 ;
- Geist Sans et Mono : HTTP 200, signature WOFF2 valide ;
- contrôle rendu Facility Manager à 390, 768 et 1024 px : sept files visibles, trois compteurs prioritaires visibles, `aria-current` présent et aucun débordement horizontal.

La recette de rendu a détecté une seule exception au contrat DEC-003 : les sept libellés `<small>` des files héritaient de la taille relative du navigateur et rendaient à 9,6 px. Le correctif ne crée aucun style : il applique `var(--font-size-label)` à ces libellés et ajoute un contrôle statique dédié. Aucun rôle, droit, statut, route, jeu de données, handler ou API n'est modifié.

Le checkpoint design est donc **clos dans le miroir local**. Aucune publication ni configuration de déploiement n'est ajoutée dans ce lot. La branche distante reste au checkpoint reçu tant qu'un envoi explicite de ce nouveau commit n'est pas demandé.

### Roadmap produit et technique reprise après DEV-008

| Lot atomique | Objectif | Périmètre autorisé dans le miroir | Condition de sortie |
| --- | --- | --- | --- |
| **P1 — Contrat DEC-002** | Fermer la nomenclature et la matrice des destinations | Documenter la correspondance entre les cinq destinations existantes et les quatre destinations autonomes attendues : Équipements, Coûts, Utilisateurs et droits, Seuils et paramètres. Aucun écran ni accès nouveau dans ce sous-lot. | Noms, source de données, rôle lecteur, rôle acteur, CTA et état vide validés explicitement. |
| **P2 — Équipements** | Extraire une destination autonome à partir du parc déjà visible | Réutiliser les données et composants existants, sans créer de donnée ni modifier `allowedViewsByPersona`. L'activation dans la navigation attend la validation de la matrice P1. | Liste, recherche, santé explicable, état insuffisant, responsive et accès validés. |
| **P3 — Coûts** | Rassembler les montants et arbitrages existants | Vue de lecture et de décision fondée uniquement sur les montants déjà présents ; aucune tendance, facture ou paiement inventé. | Estimé, engagé, seuil, décision et pièces reliés au dossier avec état insuffisant. |
| **P4 — Utilisateurs et droits** | Séparer l'administration fonctionnelle de la démonstration | Dans le miroir : spécification et état de démonstration uniquement. La création réelle d'un compte reste un traitement serveur du dépôt privé, jamais une clé d'administration dans le navigateur. | Matrice des rôles validée, création/désactivation/rattachement de périmètre spécifiés et audités. |
| **P5 — Seuils et paramètres** | Rendre les paramètres métier lisibles et historisables | Présentation des seuils existants sans modification de règle dans le miroir. Toute édition réelle exige modèle canonique, historique et RLS dans le dépôt privé. | Valeur, unité, portée, auteur, justification et historique définis. |
| **P6 — Dossier central** | Réutiliser la synthèse anti-dossier-zombie au niveau détaillé | Recomposition de la fiche avec les composants existants après raccordement canonique des huit champs dans le dépôt privé. | Aucune double source, CTA conforme au rôle, mobile sans perte d'information. |
| **P7 — Terrain et résilience** | Consolider rondes, Surpresseur et double mission Rondes & Assistance | Rondes puis actions/preuves terrain ; synchronisation, idempotence, conflits et reprise après erreur spécifiés avant activation hors ligne. | Scénarios en ligne/hors ligne, preuves, erreurs et reprise testés. |
| **P8 — Recette de livraison** | Préparer la validation métier et la production | Recette par persona, sécurité/RLS dans le dépôt privé, accessibilité, performance, sauvegarde et plan de retour arrière. | GO métier Administration + Facility Manager, puis publication contrôlée hors du miroir public. |

Le lot **P1 — Contrat DEC-002** est livré dans `docs/design/DEC-002_CONTRAT_DESTINATIONS.md`. Il inventorie les cinq destinations existantes, les quatre destinations attendues, leurs sources réelles et leurs lacunes, puis soumet six arbitrages avant codage. L'ajout effectif de destinations ou leur attribution à des personas attend une validation explicite, car il modifierait la navigation visible et potentiellement la matrice d'accès.

## DEV-008 — Arbitrage DEC-007 : cockpit Facility Manager opérationnel d'abord

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté — recette finale et publication en cours
- **Périmètre :** ordre de lecture du cockpit Facility Manager

Wilkam a validé l'option A de DEC-005. DEC-007 consigne l'arbitrage sans réécrire l'historique. Le cockpit présente maintenant un contexte opérationnel compact avec le seuil de délégation, puis les compteurs, la file et son dossier actif, le flux opérationnel, et enfin la synthèse Santé & Performance.

La synthèse de santé reste complète, mais ne masque plus la première action sur les écrans portables courants. Son texte est mis à jour pour ne plus affirmer qu'elle précède les files. Un contrôle automatique protège désormais l'ordre canonique.

- **Suite proposée :** recette responsive finale, publication sur l'URL de validation existante, puis ouverture du lot produit DEC-002.

## DEV-007 — Réponse à DESIGN-015 à DESIGN-017 : recette close et badges sécurisés

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — prêt à figer après arbitrage DEC-005
- **Périmètre :** clôture de recette, badges de statut, décision mono-thème et garde-fous automatiques

Le **GO PUBLICATION** de DESIGN-015 est pris en compte : Geist est chargée, les correctifs Surpresseur et Administration sont maintenus, et la vérification ciblée en 1440 × 900 puis 375 × 812 ne révèle aucun débordement, aucune troncature de badge ni texte sous 12 px.

La forme à rail latéral de DESIGN-017 est conservée. Les variantes de badge portent maintenant leur disposition `inline-flex` et leur rail de 3 px avec une spécificité suffisante pour ne plus être écrasées par une règle de conteneur. Les pastilles d’environnement et de provenance restent volontairement distinctes.

Deux contrôles complètent la recette :

- les badges de statut doivent conserver la disposition partagée et le rail latéral ;
- DEC-006 interdit tout mécanisme `prefers-color-scheme` ou `data-theme` dans la feuille de styles, commentaires exclus.

### Contrôles réalisés

- rendu desktop et mobile : zéro débordement horizontal, badges lisibles et non tronqués ;
- police Geist chargée, `aria-current` présent, aucun texte visible sous 12 px ;
- `pnpm lint`, `pnpm build`, `pnpm audit:visual`, `pnpm verify:personas` : réussis ;
- aucune modification de donnée, de rôle, de permission ou de règle métier ;
- aucune publication effectuée dans ce lot.

- **Suite proposée :** arbitrer DEC-005, figer le checkpoint de design, publier la validation, puis ouvrir le lot produit DEC-002.

## DEV-006 — Réponse à DESIGN-014 : régressions de clôture corrigées

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — publication toujours en attente de la recette éclair Design
- **Périmètre :** Polices auto-hébergées, bandeau Surpresseur grand écran, badge Administration et arbitrage d’ordre du cockpit

Les trois régressions bloquantes de DESIGN-014 sont corrigées sans changement de donnée, de rôle ou de règle métier :

- **R1 — Geist :** les variantes Sans et Mono sont maintenant servies depuis `public/fonts/` aux deux URL attendues par le paquet `geist`. Un contrôle réseau dédié échoue sur tout statut autre que HTTP 200, vérifie la signature WOFF2 et refuse un type de contenu inattendu. Les deux ressources sont également présentes dans le build de déploiement.
- **R2 — Surpresseur :** au palier grand écran, la marge négative et le padding horizontal du bandeau reprennent exactement `clamp(32px,3.2vw,60px)`, la même formule que `.content`. Le contrat est protégé par l’audit statique.
- **R3 — Administration :** le badge `ACCÈS ADMIN` porte désormais `flex:0 0 auto` et `min-width:max-content`, ce qui interdit sa compression dans `.authority-split`.

L’ordre du cockpit n’est pas déclaré acté. **DEC-005** expose les options « priorité opérationnelle DEC-004 » et « vue d’ensemble d’abord », avec un statut explicitement proposé et un arbitrage demandé à Wilkam.

### Contrôles réalisés

- polices Sans et Mono : HTTP 200, signature WOFF2 valide ;
- `pnpm lint`, `pnpm build`, `pnpm audit:visual` : réussis ;
- build de déploiement : les deux fichiers Geist sont présents sous `dist/client/fonts/` ;
- aucun fichier Supabase, secret, rôle ou permission modifié ;
- aucune publication effectuée.

- **Suite proposée :** recette éclair Design sur R1 à R3, arbitrage Wilkam sur DEC-005, puis publication du checkpoint accepté.

## DEV-005 — Correctifs de recette mobile du checkpoint `ec3ec06`

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** `app/globals.css`, `scripts/audit-visual-styles.mjs`

Les trois défauts bloquant la publication signalés dans DESIGN-013 sont corrigés sans modification de l'interface métier :

- toutes les variantes de badge portent désormais leur encre avec le sélecteur à deux classes `.badge.badge-*`, ce qui les protège des règles de couleur liées à la position dans un conteneur ;
- le bandeau de la ronde Surpresseur reprend exactement le retrait mobile de 16 px et ne dépasse plus le viewport à 375 px ;
- le sélecteur des cinq étapes reste borné à la largeur disponible et propose un défilement horizontal visible et tactile ;
- les champs de formulaire et leurs conteneurs peuvent se comprimer malgré une option métier longue, sans élargir la page.

Les nouveaux contrôles statiques protègent ces quatre contrats. La recette de rendu cible « Mes rondes » et l'espace agent à 375 px, ainsi que la couleur calculée du badge « Surveillance ».

- **Suite proposée :** recette rapide du design sur les écrans concernés, puis publication du checkpoint accepté et ouverture du lot DEC-002 sur les destinations autonomes.

## DEV-004 — Lot 6 : encres sémantiques raccordées et contrôlées sur le rendu réel

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** `app/globals.css`, `scripts/audit-visual-styles.mjs`, `scripts/verify-personas.mjs`

Le lot 6 consomme désormais un triplet **surface / bordure / encre** pour chacun des cinq rôles de DESIGN-007 : danger, avertissement, succès, information et neutre. Les tokens de rôle historiques restent réservés aux éléments non textuels — barres, pastilles et graphiques — tandis que les textes posés sur une surface teintée utilisent une encre dédiée respectant le seuil de 4,5:1 à 12 px.

La mesure dans le navigateur a aussi révélé quatre collisions de spécificité que la lecture statique ne montrait pas : le libellé de contexte Facility Manager reprenait l'encre d'un fond clair sur le bandeau bleu ; une règle de tête Direction repeignait les badges ; les badges de la liste utilisateurs héritaient du carré avatar ; les libellés de fraîcheur du score héritaient de l'encre claire de la carte sombre. Ces collisions sont corrigées sans modifier les données, les rôles ni les actions disponibles.

### Vérifications réalisées

- les cinq triplets atteignent au minimum 4,5:1 sur leur surface canonique ;
- 14 combinaisons persona × rubrique contrôlées dans le navigateur : zéro texte visible sous le seuil après correction ;
- Facility Manager vérifié sur ses cinq rubriques à 375, 768 et largeur desktop ;
- le registre, le shell, la navigation, les personas et les parcours existants restent inchangés ;
- le carrousel interne de progression des rondes conserve son défilement horizontal volontaire sur mobile, sans ajout de contenu ni de logique ;
- aucune modification Supabase, migration, permission, règle métier ou publication.

- **Suite proposée :** faire relire ce checkpoint par le design, puis clôturer le socle visuel. Le lot suivant doit porter sur la nomenclature et les destinations autonomes de DEC-002, pas sur une nouvelle variation de palette.

## DEV-003 — Lots 2 à 5 consolidés : shell refondu et vérifié

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** `app/page.tsx`, `app/globals.css`, `scripts/audit-visual-styles.mjs`

Les lots 2, 3 et 4 ont été intégrés dans trois checkpoints distincts, puis la spécification visuelle du lot 5 a été réimplémentée proprement. Le bloc CSS de surcharge fourni comme maquette n'a pas été ajouté : le rail a réellement quitté le balisage et la feuille ne contient plus de sélecteur `.sidebar`.

### Shell et navigation

- `<aside class="sidebar">` est remplacé par un `<header class="app-navigation">` contenant un vrai `<nav>` ;
- un seul catalogue typé alimente le bandeau desktop et la barre mobile ;
- les glyphes Unicode sont remplacés par une petite famille SVG tracée et réservée au mobile ;
- l'état actif combine libellé renforcé, filet ou fond selon la largeur, et `aria-current="page"` ;
- les groupes du futur menu `Plus` reprennent exactement **Mon travail**, **Le bâtiment**, **Pilotage** et **Administration** ; les droits sont filtrés avant le découpage visible/débordement ;
- le déclencheur `Plus` conserve un état actif lorsque la destination courante appartient au débordement ;
- le site, le nom d'utilisateur et le mot-symbole se contractent aux paliers 1240 et 1100 px ;
- la pastille ambre **Démo** reste visible sur desktop et mobile, avec le libellé complet disponible aux technologies d'assistance.

Le menu `Plus` ne s'affiche pas encore dans les cinq profils actuels, car aucun n'a plus de cinq destinations autorisées. Son contrat est prêt, sans création de page ni de permission. Le catalogue complet de DEC-002 reste un lot produit ultérieur : les écrans **Équipements**, **Coûts**, **Utilisateurs et droits** et **Seuils et paramètres** n'existent pas encore comme destinations autonomes. La rubrique historique **Mon espace** reste donc visible pour Facility Manager tant que son contenu n'est pas redistribué ; aucune publication ne doit figer cette exception.

### Première page Facility Manager

- le titre et la rubrique dupliqués ont été retirés du JSX, pas masqués en CSS ;
- la section conserve uniquement la phrase de contexte et le seuil de délégation ;
- l'ordre du DOM est maintenant : contexte, compteurs, file de décisions, flux, scores et tendances ;
- le chrome supérieur mesure 212 px aux largeurs desktop courantes et 220 px entre 701 et 900 px, soit moins d'un quart d'un viewport de test de 900 px ;
- le seuil et les compteurs restent lisibles à 760 px sans chevauchement.

### Registre et contrôles

- le tableau complet, responsable compris, reste visible à 961 px ;
- le repli en cartes s'active à 960 px et conserve priorité, statut, échéance et responsable ;
- le contrôle statique s'appelle désormais **Repli du registre avec responsable** et ne dépend plus d'une chaîne de media query ;
- trois garde-fous supplémentaires protègent l'absence de rail résiduel, l'état courant accessible et la visibilité du marqueur Démo ;
- un contrôle protège aussi la préparation du menu `Plus` groupé.

### Vérifications réalisées

- `pnpm lint` : réussi ;
- `pnpm build` : réussi ;
- `pnpm verify:personas` : 32/32 ;
- `pnpm audit:visual` : 18/18 ;
- rendu réel dans le navigateur : 1440, 1240, 1100, 1024, 961, 960, 760, 701, 700 et 375 px ;
- aucun débordement horizontal et aucun texte visible inférieur à 12 px ;
- focus clavier visible à 2 px, `aria-current` confirmé et aucune erreur console ;
- aucun changement de rôle, permission, règle métier ou source Supabase ; aucune publication.

- **Suite proposée :** valider ce checkpoint de shell, terminer la nomenclature DEC-002 lorsque les destinations autonomes sont définies, puis seulement ouvrir le lot 6 sur les encres sémantiques de DESIGN-007.

## DEV-002 — Réponse à DESIGN-011 : refonte propre du shell avant le lot 6

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Décision transmise — refonte structurelle retenue
- **Périmètre :** Shell de navigation, sémantique de `page.tsx`, catalogue de destinations et contrôle responsive du registre
- **Contexte :** Wilkam a retenu la navigation en bandeau haut. Le caractère réversible de la surcharge CSS n'est donc plus un bénéfice suffisant pour conserver deux mises en page concurrentes. La réversibilité doit être assurée par Git, pas par une seconde architecture laissée active dans la feuille de styles. Par ailleurs, `lot5-bandeau-haut.patch` cible l'état produit par les lots 3 et 4, qui ne sont pas encore intégrés dans la branche de développement courante : il doit servir de spécification visuelle jusqu'à consolidation de cette base, et non être forcé sur le code actuel.

### 1. Shell : refonte propre maintenant

La surcharge appendue ne doit pas devenir l'implémentation finale. Avant le lot 6, le développement doit remplacer proprement le rail desktop par un bandeau haut et supprimer les règles devenues obsolètes.

- garder une seule définition structurelle de `.app-shell`, de la navigation et de `.main-column` ;
- extraire une navigation partagée alimentée par le même catalogue pour le bandeau desktop et la barre basse mobile ;
- employer un élément sémantique de tête et un vrai `<nav>`, plutôt qu'un `<aside>` transformé visuellement en bandeau ;
- conserver le comportement mobile sous 700 px sans dupliquer les droits ni les libellés ;
- intégrer dans cette refonte les résultats visuels validés du lot 5 : bandeau resserré, contexte avant les compteurs, file de décisions avant l'analyse et registre en tableau jusqu'à 961 px ;
- conserver le commit précédent comme point de retour. Aucun bloc CSS de compatibilité permanent ne sera maintenu après validation de la refonte.

### 2. Contenu masqué : deux suppressions acceptées, « Démo » maintenu visible

Le titre et la rubrique qui répètent le `<h1>` de la page doivent sortir du balisage du bloc `manager-command-hero`, pas seulement recevoir `display:none`. La page conserve un seul `<h1>` visible. Le bloc devient une section de contexte opérationnel, nommée de façon accessible, qui contient la phrase explicative et le seuil de délégation.

En revanche, **« Mode démonstration » ne doit pas devenir uniquement perceptible par un lecteur d'écran**. C'est une information de sécurité et d'environnement utile à tous les utilisateurs : elle évite de confondre une action simulée avec une action enregistrée. La version finale affichera un badge compact **« Démo »** près du profil ou du site, avec le libellé accessible complet **« Environnement de démonstration »**. Le traitement CSS de type `clip` est donc refusé comme solution finale pour cette mention.

Une demande de modification de `page.tsx` est requise pour ces trois éléments ; les masquer par CSS reste acceptable uniquement dans la maquette de comparaison.

### 3. Neuf destinations : catalogue conservé, débordement groupé dans « Plus »

Le catalogue de DEC-002 ne doit pas être réduit pour s'adapter au bandeau. Le code actuel n'expose que cinq destinations et `allowedViewsByPersona` en autorise au maximum cinq par profil ; la tension apparaîtra lors de l'implémentation complète du catalogue Administration.

La solution retenue est :

- quatre à six destinations prioritaires visibles selon le persona et la largeur disponible ;
- un bouton **« Plus »** pour les destinations secondaires ;
- des rubriques visibles dans ce menu : **Mon travail**, **Le bâtiment**, **Pilotage**, **Administration** ;
- filtrage par les droits avant répartition entre navigation principale et menu « Plus » : le menu n'accorde jamais un accès supplémentaire ;
- état actif visible lorsque la destination courante se trouve dans « Plus » ;
- clavier complet : Tab, flèches, Entrée, Échap, retour du focus au déclencheur ;
- un seul catalogue typé portant au minimum l'identifiant, le libellé, le groupe, la priorité d'affichage et les personas autorisés. Ce catalogue alimentera ensuite le menu, le `<h1>`, le `<title>` et les routes prévues par DEC-002.

Le menu « Plus » est donc tenable et préférable à la suppression de destinations métier.

### 4. Contrôle « Responsable visible »

La nouvelle intention est correcte, mais le nom **« Responsable visible sur desktop étroit »** et une recherche de chaîne de media query restent trop liés à l'implémentation. Le contrôle doit être renommé **« Repli du registre avec responsable »** et vérifier deux capacités :

1. le balisage de la carte contient réellement le libellé **« Responsable interne »** et sa valeur ;
2. un mode responsive rend `.registry-mobile-details` visible lorsque l'en-tête du tableau est masqué.

Le contrôle statique peut protéger la présence de ces deux contrats, mais il doit être complété par un test de rendu à une largeur de chaque côté du seuil. La valeur numérique du seuil ne doit pas être codée dans le nom ni dans l'assertion.

### Ordre d'exécution retenu

1. consolider les lots 2, 3 et 4 sur une base unique et vérifiée ;
2. refondre le shell et le balisage de `page.tsx` ;
3. intégrer les paramètres visuels du lot 5 sans bloc de surcharge permanent ;
4. ajouter le catalogue groupé et le menu « Plus » ;
5. vérifier les cinq personas, le clavier et les seuils 1440 / 1024 / 961 / 960 / 700 / 375 px ;
6. seulement ensuite ouvrir le lot 6 sur les encres sémantiques de DESIGN-007.

- **Fichiers concernés :** `app/page.tsx`, `app/globals.css`, `scripts/audit-visual-styles.mjs`, `docs/design/DECISIONS.md`
- **Impacts attendus :** une seule architecture de navigation, aucune perte de destination, indication Démo visible et contrôles moins fragiles.
- **Contrôles attendus :** lint, build, personas, audit visuel, navigation clavier, correspondance menu/titre/droits et vérification responsive réelle.
- **Suite proposée :** préparer un lot de refonte du shell basé sur ces décisions ; ne pas appliquer directement le bloc CSS appendu du lot 5 et ne pas publier avant sa recette.

## DEV-001 — Correspondance actuelle des profils anonymisés

- **Date :** 28 août 2026
- **Auteur :** Dev Lead
- **Statut :** Transmis
- **Périmètre :** Personas de démonstration et écrans associés
- **Contexte :** Le miroir public remplace toute identité nominative par un rôle fictif stable. Cette correspondance inverse permet au designer de relier chaque libellé visible au contrat frontend existant.
- **Décision ou question :** Conserver les identifiants techniques et les capacités existantes ; ne pas créer de rôle ou de permission pendant les lots design.
- **Correspondance :**

  | Libellé visible | `PersonaId` | Espace principal | Composant actuel |
  | --- | --- | --- | --- |
  | Administration Démo | `administration` | Arbitrages et pilotage | `DirectionWorkspace` |
  | Facility Manager Démo | `facility` | Centre de décision | `FacilityManagerWorkspace` |
  | Agent Électricité Démo | `electricite` | Terrain électricité | `AgentWorkspace` |
  | Agent Eau & Incendie Démo | `eau_incendie` | Terrain eau/incendie | `AgentWorkspace` |
  | Agente Rondes & Assistance Démo | `rondes_assistance` | Terrain et administratif | `RoundsAssistanceWorkspace` |

- **Fichiers concernés :** `app/page.tsx`, `app/globals.css`
- **Impacts attendus :** Les maquettes et composants doivent rester compatibles avec les cinq profils.
- **Contrôles attendus :** `pnpm verify:personas`, desktop, tablette, mobile et clavier.
- **Suite proposée :** Lot 1 — consolidation des tokens sémantiques sur `design/lot-1-tokens`.
