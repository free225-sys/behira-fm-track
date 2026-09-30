# FROM-DEV — passation du développement vers le design

Ce journal utilise le même gabarit que `FROM-DESIGN.md` et `DECISIONS.md`. Ajouter les nouvelles entrées en tête sans réécrire les entrées historiques.

## DEV-031 — Réceptions et reprise motivée

- **Décision utilisateur :** chantier lancé le 25/09/2026 après proposition du cycle réception FM, clôture ou retour motivé à l’agent.
- **Interface :** file Réceptions alimentée par l’action canonique RECEIVE_INTERVENTION attribuée au FM. Dossier : compte rendu réel, accès aux preuves, choix accepter/clôturer ou renvoyer, commentaire et confirmation explicite. Composants et tokens existants, aucun CSS ajouté.
- **Serveur :** décision atomique, version optimiste, idempotence, audit et réception rattachée à l’intervention. FM seul ; Administration et agents consultent selon leurs périmètres. RLS et séparation recette/exploitation. Ancienne voie de clôture bloquée sans réception du dernier travail.
- **Retour :** même ordre de travail et autorisation financière, nouvelle exécution, ancienne intervention conservée, motif visible pour l’agent. Échéance conservée. Une ancienne preuve acceptée ne couvre pas la reprise.
- **Périmètre :** GE-01 arrive en réception après validation de son justificatif ; les autres équipements après fin d’intervention, avec maintien des exigences de preuve pour la clôture. Réserves formelles et validation terrain distinctes, pas de réserve créée par un simple retour.
- **Contrôles :** PostgreSQL isolé en modes réel/recette, rôles, concurrence, rejouage, retour/reprise/clôture, GE et WILO ; navigateur à 1280/380 px ; test GE-01 actualisé pour photo uniquement en cas d’anomalie ; TypeScript, compilation et contrôles design.
- **Déploiement :** migration additive intervention_reception ; aucun dossier réel accepté, renvoyé ou clôturé par la migration. Garder les reçus et l’audit en cas de retour arrière ; un retour au frontend précédent exige aussi une migration corrective de workflow, car sa clôture directe ne satisfait pas le nouveau verrou.

## DEV-030 — Photos uniquement en cas d’anomalie

- **Décision utilisateur :** 25/09/2026, photos non exigées pour une ronde normale ; photo du constat ou motif d’impossibilité pour une anomalie. Preuves de réparation/clôture inchangées.
- **Interface :** GE/RIA masquent le dépôt sans anomalie (les pièces déjà jointes restent accessibles). Motif conservé dans le brouillon et dans PHOTO_EXCEPTION. WILO et signalements conservent le dépôt depuis le dossier après synchronisation et demandent le motif de non-disponibilité au stade de la ronde.
- **Serveur :** suppression des photos systématiques MC4/compteur et coffrets/manomètres ; les écarts numériques et observations déterminent le besoin de preuve. Motif provenant du rapport, jamais un texte ajouté librement au payload de revue. FM, valeurs critiques et complétude toujours requis.
- **Historique :** aucun fichier, rapport, examen ou dossier supprimé. Les contrôles existants sont évalués avec la nouvelle règle d’admissibilité ; aucune revue automatique. Les observations anciennes restent soumises à leur validité.
- **Migration :** round_photos_on_anomaly ; vues invoker et RLS conservées, pas de nouvelle permission publique. Retour arrière par migration corrective et version Sites 26, sans effacement des preuves.

## DEV-029 — Raccordement du contrôle quotidien RIA-01

- **Date :** 22 septembre 2026.
- **Livré :** onglet RIA pour Eau/incendie et FM ; 29 observations, photos privées, brouillon et file hors ligne, réception confirmée, lecture FM, retour motivé et admission du contrôle dans les sources santé.
- **Règles :** calcul serveur depuis les observations ; inconnu/incomplet conservé sans score ; référence 5 bar signalée en attente SECURISYS. Aucun réglage ni essai spécialisé autorisé par ce formulaire.
- **Préservé :** parcours GE-01/WILO, périmètres et RLS, primitives et CSS. Pas de validation FM ni de données terrain simulées sur la base distante.
- **Tests :** 261 scénarios PostgreSQL métier/isolation, 184 recette, TypeScript, 17 contrôles préflight. Tests locaux PGlite ; essai terrain avec transfert réel de photos à effectuer après publication.
- **Limites :** planification consolidée de toutes les rondes à l'accueil non incluse. Mode manuel justifié nécessite clarification technique avant score. La reprise de confirmation utilise l'identifiant de mutation serveur et un reçu persistant.
- **Retour arrière :** republier la version Sites 25 ; conserver les tables additives et les rapports RIA éventuels. Ne pas supprimer les observations. La migration modifie aussi le contrôle d'admissibilité RIA (moyenne P1/P2) ; une réversion SQL éventuelle nécessite une migration explicite après analyse.

## DEV-028 — Accès aux rapports depuis les rondes FM

- **Date :** 22 septembre 2026.
- **Constat terrain :** le menu Rondes affiche bien REP-2026-000010 et ses 22 réponses. La ligne GE-01 des rondes du jour à l'accueil était du texte sans action ; dans la file, cliquer sur un rapport déjà sélectionné ne ramenait pas son détail à l'écran.
- **Correction :** accès explicite aux rapports GE-01 depuis la ligne de l'accueil connecté FM ; sélection dans la file suivie d'un focus et défilement vers le titre du détail, y compris lors d'un second clic sur le même rapport. Centrage du titre pour éviter le chrome fixe.
- **Préservé :** lecture sans validation automatique, API/RLS, données terrain, preuves, brouillons, CSS et primitives existantes. Aucun examen FM enregistré pendant la vérification.
- **Vérification :** contrôle navigateur local de la sélection/focus et du débordement mobile ; TypeScript, préflight et build. Le rapport réel est consultable dans l'onglet de recette ; son incomplétude est distincte de ce problème de navigation.

## DEV-027 — Sources santé et points par domaine

- **Date :** 21 septembre 2026.
- **Livré :** raccord serveur des contrôles revus WILO/RIA/ASC/IRR, Sécurité, Zones et Continuité ; preuves privées, revues FM immuables et audit ; reprise IRR bornée ; points par domaine affichés dans les blocs existants.
- **Préservé :** contrat lot 0, poids approuvés, plafond, contrôles GE-01 et sa file hors ligne ; CSS, navigation et primitives sans modification.
- **Limites :** données réelles insuffisantes ; formulaires guidés de revue des nouvelles sources encore à réaliser. Aucun exemple transformé en donnée terrain ; cas ambigus laissés bloquants. Recette terrain avec les agents toujours à effectuer.
- **Détail et validation :** [RACCORDEMENT_SANTE_2026-09-21.md](../RACCORDEMENT_SANTE_2026-09-21.md).

## DEV-026 — Moteur santé : règles chiffrées et raccord GE-01

- **Date :** 21 septembre 2026.
- **Référence :** décisions retenues S01–S13 du classeur REF-20260901, 17/09/2026. Version source et date d'installation conservées séparément.
- **Livré :** évaluateurs SQL des six équipements et des trois autres domaines, agrégation/arrondi/plafond, pondérations et criticité renseignées, diagnostic des contrôles réels ; calcul GE-01 depuis les réponses et preuves figées par la revue FM.
- **Limites :** autres fournisseurs de contrôles et domaines non raccordés, score bâtiment encore non calculable ; cas ambigus isolés et non arbitrés. Aucune valeur d'exemple injectée dans les données réelles.
- **Design :** libellés des diagnostics côté interface ; CSS, primitives et synchronisation conservés.
- **Détail et retour arrière :** [MOTEUR_SCORE_2026-09-21.md](../MOTEUR_SCORE_2026-09-21.md).

## DEV-025 — Vérification Sylvain et séparation des alertes WILO

- **Date :** 21 septembre 2026
- **Observation :** profil Eau/incendie limité à WILO-01, RIA-01 et IRR-01 ; dossiers clôturés, preuve acceptée et historique canonique consultables. La page WILO présentait encore une récidive fictive de panne P1 en session réelle, et la synthèse sans contrôles indiquait aucun écart.
- **Correction :** contexte et conseil WILO génériques en mode connecté, scénario P1 conservé uniquement en démo ; synthèse incomplète explicite ; mesures vides refusées avant mise en file au lieu de leur conversion implicite en zéro.
- **Validation :** TypeScript, 17 suites du candidat GE-01 et build réussis. Aucune modification CSS, migration, RLS, seuil technique ou format de synchronisation. Aucun envoi terrain réalisé à distance.
- **Limites :** WILO reste le formulaire historique hors planning ; les rondes planifiées RIA/IRR et leur recette relèvent de la livraison suivante. Recontrôle navigateur du correctif après publication.
- **Retour arrière :** version Sites 21, sans restauration de base.

## DEV-024 — Recette connectée Administration/FM : données réelles et file FM

- **Date :** 21 septembre 2026
- **Statut :** correctif testé, préparé pour publication sur la préproduction existante.
- **Observations :** sélecteur Démo visible en session réelle, points de contrôle Administration fictifs, texte de déconnexion inadapté ; confusion du responsable technique et de l’acteur de la prochaine action dans la file FM.
- **Correction :** sélecteur réservé à la démo, compteurs serveur ou absences explicites, déconnexion sans remise à zéro Démo, file FM alignée sur la projection canonique. CSS et primitives conservés.
- **Validation :** TypeScript, 17 suites de préflight, build et 9 tests API locaux. Aucune migration ni modification des RLS.
- **Limites :** quatre anciennes qualifications C9 sans acteur restent à régulariser ; parcours des trois agents et test terrain à réaliser.
- **Détail :** [RECETTE_NAVIGATEUR_PREPRODUCTION_2026-09-21.md](../RECETTE_NAVIGATEUR_PREPRODUCTION_2026-09-21.md).

## DEV-023 — Recette connectée locale après DESIGN-077

- **Date :** 21 septembre 2026
- **Statut :** Docker rétabli, migration d'affectation appliquée après sauvegarde ; préproduction inchangée.
- **Contrôles :** 29 scénarios Auth/PostgREST/Storage réels réussis ; aucun avertissement ou erreur des advisors de sécurité locaux.
- **Périmètre :** affectation par périmètre, rondes et preuves privées, renvoi et correction d'arbitrage. Aucune modification UI.
- **Détails et limites :** [RECETTE_CONNECTEE_DESIGN077_2026-09-21.md](../RECETTE_CONNECTEE_DESIGN077_2026-09-21.md). Parcours navigateur connecté et test terrain encore à réaliser avant ouverture du pilote.

## DEV-022 — Raccord DESIGN-077 et socle backend

- **Date :** 21 septembre 2026
- **Statut :** Conflits résolus, candidat compilé et testé localement ; préproduction non redéployée.
- **Références :** base design `818019e741b4effd067822dd9295268b4f21bff8`, backend `e6015fefaae7ea3102510842ba0ad00ba0fa6347`.
- **Préservé :** design final, en-tête et compteur GE-01, formulaire prestataire, trois onglets Pilotage ; santé/paramètre serveur, brouillons et photos hors ligne, reçus, arbitrages et journal métier.
- **Contrôles :** 15 suites de préflight, 316 scénarios PostgreSQL isolés, navigateur sur trois largeurs, TypeScript et build.
- **Détails et limites :** [INTEGRATION_DESIGN077_2026-09-21.md](../INTEGRATION_DESIGN077_2026-09-21.md).

## DEV-021 — Affectation GE-01 par périmètre et reprise après coupure

- **Date :** 21 septembre 2026
- **Statut :** Implémenté et testé en base isolée ; application à Supabase local bloquée par le démarrage de Docker.
- **Livré :** sélection serveur des agents actifs habilités ; suppression du code agent imposé ; affectation rejouable sans doublon ; séquence de diagnostic et audit conservés.
- **Design :** formulaire existant et primitives conservés, aucun changement CSS ; état explicite sans agent habilité.
- **Contrôles, limites et mise en service :** [LIVRAISON1_AFFECTATION_DIAGNOSTIC_2026-09-21.md](../LIVRAISON1_AFFECTATION_DIAGNOSTIC_2026-09-21.md).

## DEV-020 — Arbitrage renvoyé et correction liée

- **Date :** 18 septembre 2026
- **Statut :** Raccord serveur local vérifié, non publié
- **Livré :** renvoi Administration motivé et audité ; dossier repris par le FM ; nouvelle estimation liée et immuable ; compteurs par audience ; confirmation après réponse serveur et reprise idempotente.
- **Design :** boutons et primitives conservés, aucun changement CSS. La correction s’effectue dans le formulaire financier existant.
- **Contrôles et déploiement :** [LIVRAISON1_ARBITRAGES_RENVOI_2026-09-18.md](../LIVRAISON1_ARBITRAGES_RENVOI_2026-09-18.md).

## DEV-019 — GE-01 quotidien, photos privées et suivi réel

- **Date :** 18 septembre 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté, migré et vérifié localement ; non déployé à distance
- **Référence :** DESIGN-069 / `015c253`, décisions retenues du classeur REF-20260901 du 17/09/2026.
- **Livré :** calendrier GE-01 lundi–samedi 23:59 Africa/Abidjan, suppléance FM motivée, vrais fichiers en brouillon/file, réception complète et reprise idempotente, pièces privées consultables par le FM, lecture et examen distincts, validité de 24 heures hors dimanche. Aucun changement de CSS ou de primitives de Grok.
- **Contrôles :** 266 scénarios PostgreSQL isolés, 11 scénarios Auth/PostgREST/Storage locaux réels, navigateur/IndexedDB, 15 contrôles du candidat, TypeScript et build. Aucun score bâtiment fabriqué.
- **Détails, limites et retour arrière :** [LIVRAISON1_GE01_PLANNING_PREUVES_2026-09-18.md](../LIVRAISON1_GE01_PLANNING_PREUVES_2026-09-18.md). Ne pas restaurer un ancien moteur de synchronisation tant que de nouvelles photos restent en file.
- **Suite :** compléter les autres postes du pilote et effectuer la recette physique GE-01 avec un agent avant ouverture.

## DEV-018 — Corrections DESIGN-069 et premier raccord santé serveur

- **Date :** 17 septembre 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement ; non déployé à distance
- **Référence :** design `015c253`, socle GE-01 et correctif Rondes conservés.
- **Corrections :** scores agents fictifs supprimés, restitution non calculable dans Pilotage > Équipe ; navigation desktop/tablette sticky ; poids 70/15/10/5 explicitement décidés ; synchronisation GE-01 alimentée uniquement par son état réel.
- **Raccord :** vue d'équipements et RPC `get_building_health_snapshot`, contrat `behira.lot0.v1` complet lu en mode connecté, périmètres et RLS, seuil historisé, compteurs par audience. La démo conserve ses fixtures.
- **Validation et limites :** voir [LIVRAISON1_SANTE_SERVEUR_2026-09-17.md](../LIVRAISON1_SANTE_SERVEUR_2026-09-17.md). DEC-017 demeure absent comme entrée primaire du journal livré ; aucune décision RH n'est reconstituée ou validée.

## DEV-017 — Référence DESIGN-069 et vérification du §7

- **Date :** 17 septembre 2026
- **Auteur :** Dev Lead
- **Statut :** Vérification terminée ; écarts documentés, non corrigés dans ce passage documentaire
- **Référence :** `015c2531858be84a6bcd37a607bd63b5defd3ecb`, intégrée sans conflit par `21ffae8` dans la copie locale de livraison 1. Remplace `d36fb98` comme référence design courante.
- **Résultat :** les trois fichiers demandés et `.gitattributes` sont présents. DEC-017 manque comme entrée du journal livré, mais ses règles sont retrouvées dans la passation du 11 septembre. Pilotage affiche encore des scores agents fictifs 88/84/91 dans Santé & scores, hors emplacement Équipe. La navigation reste visible au défilement mais utilise `fixed`, pas `sticky`.
- **Règle appliquée :** `DESIGN.md` fait foi (12/13 prioritaires), journal limité aux entrées 062–069 en vigueur. Les poids 70/15/10/5 sont décidés ; les points par domaine restent à fournir.
- **Détail et preuves :** [VERIFICATION_DESIGN069_2026-09-17.md](VERIFICATION_DESIGN069_2026-09-17.md). Aucun changement de code, de RPC, de droits ou de file d'envoi ; correctif Rondes conservé.

## DEV-016 — P8 : fermeture visuelle du miroir public

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié — publié sur la branche design
- **Périmètre :** correctifs de rendu uniquement ; aucun backend, secret, schéma, droit ou mécanisme de déploiement ajouté au miroir

La recette finale a confirmé deux écarts visuels ciblés. La carte **Score WILO** héritait de la disposition flex de son en-tête et comprimait État, Variation et Fraîcheur ; ces informations sont maintenant présentées sur trois lignes stables. Sur mobile, les actions principales, le sélecteur de persona et la commande de déconnexion respectent désormais un plancher tactile de 44 px.

Deux garde-fous complètent l'audit visuel et protègent ces corrections. Le miroir conserve le design DEC-013, les cinq personas anonymisés, le plancher typographique de 12 px et l'absence de connexion Supabase réelle.

- **Contrôles réalisés :** audit visuel 83/83, personas 38/38, résilience 11/11, lint et build.
- **Suite proposée :** conserver cette branche comme miroir public de référence ; poursuivre les raccordements privés uniquement dans le dépôt non public.

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


## DEV-032 — Indications de longueur minimale — 28/09/2026

Demande utilisateur : annoncer la longueur minimale dans le champ vide. Placeholders ajoutés aux conclusions de réception, retours, réouvertures, réexamens (10), motifs d’arbitrage et d’accès (12), justifications d’accès et résumés prestataire (20), nom complet (3), nouveaux mots de passe et confirmations (12 ou 16 suivant le parcours). Un rappel permanent accompagne réception/réouverture. Aucun seuil, rôle ou comportement de validation modifié ; aucun CSS ajouté. Le contrôle DEC-007 reconnaît désormais les paramètres optionnels du composant Manager, sans relâcher le contrôle d’absence de santé dans la file.


## DEV-033 — Intégration design a17f95c — 28/09/2026

Source vérifiée : a17f95c5bb9086c23b7efd511806bb9042620d1b, branche publique design/lot-1-tokens. Base commune 818019e : DESIGN-062 à 077 déjà dans l’ascendance, sans rejeu ni remplacement des évolutions métier.

- DESIGN-078 : EauRounds.tsx repris exactement de la source, utilisé exclusivement dans la démonstration Eau & Incendie, avec Agent Eau & Incendie Démo. Mesures initiales vides, score indisponible, aucune écriture. Le composant livré ne possède aucun raccord de persistance : les formulaires connectés WILO/RIA restent conservés, ils ne sont pas remplacés par une simulation. Leur transposition visuelle complète reste distincte de cette importation de maquette.
- 3c2a40c et a17f95c : CSS source intégré (menu hors overflow de la carte et date/heure/Maintenant sous 640 px), applicable aux classes partagées.
- Conflit app/page.tsx : conservation des mutations, auth, réceptions, champs d’aide et file hors ligne ; raccord du composant livré seulement en démonstration.
- Conflit verify-personas : contrôle des mesures déplacé vers EauRounds comme dans le design ; autres contrôles d’intégration conservés.
- data.ts, app/lib, supabase et les composants métier GE-01/shared non modifiés par ce lot. Aucun compte ou nom réel ajouté. Aucun push vers le miroir public.
- Commandes pnpm exécutées avec pnpm_config_verify_deps_before_run=false pour éviter une réinstallation automatique étrangère à ce lot : audit:visual 120, verify:personas 38, verify:lot0 89, verify:lot1 36, tous verts.


## DEV-WILO-20260928 — Collecte connectée, cohérence et arbitrages de pression

Demande utilisateur : résoudre les écarts de l'audit Eau & Incendie à partir des ressources du projet. Ce lot dépasse l'affichage, conformément à cette demande. EauRounds reste la démonstration ; aucun remplacement du flux connecté. Aucun déploiement.

- LegacyReport/WILO conserve ses cinq étapes, RoundPilotHeader, date Abidjan, file d'envoi et identifiant de reprise. Type de ronde et stabilité du manomètre sont désormais persistés. Ajout des lectures et contrôles manquants (manomètre, charges/états P1/P2, alternance/secours, niveau visuel de bâche, manque d'eau, fuite détaillée, bruit, ballon, coffret, local, réarmement et suivi conditionnel).
- Données initiales vides ; motifs explicites de non-relevé ; aucun pourcentage déduit d'une catégorie ; zéro réellement mesuré conservé. Pas de score ni de statut opérationnel client. Contradictions P1/P2, fuite et alarme détectées avant l'envoi.
- Synthèse et anomalie proposée utilisent les mêmes constats, y compris une anomalie de bâche seule. Une confirmation restaurée n'est pas reconduite et une modification impose de reconfirmer.
- Arbitrages utilisateur : 4,5/5,5 normales ; contrôle de pression critique à dix minutes. Second relevé et date conservés, contrôle serveur dans une migration versionnée. Historique inchangé.
- Message Recette corrigé pour le périmètre de l'agent. Cela ne prétend pas ouvrir le circuit Recette WILO/RIA ; les protections serveur restent actives.
- Contrôles : audit:visual 120 ; personas 38 ; lot0 89 ; lot1 36 ; verify:wilo 34 cas ; TypeScript et lint ciblé réussis ; navigateur réel, composants connectés avec transport simulé, 1440/380 px ; 295 scénarios PostgreSQL réussis, dont soumission WILO, périmètre, champs enregistrés, idempotence et décisions de pression. Base PostgreSQL isolée (PGlite), aucune écriture distante ; cela ne constitue pas une recette sur le service Supabase déployé.

Reste à livrer distinctement : revue FM WILO complète et classification serveur de tous les nouveaux constats ; extension Recette WILO/RIA sur toute la chaîne ; formulaire IRR technique/visuel. Une collecte complète ne signifie pas que chaque règle de score ou chaque circuit soit déjà raccordé. Les motifs de non-relevé préservent la collecte sans rendre le contrôle artificiellement admissible.

## DEV-WATER-RECETTE-20260928 — Rondes Eau & Incendie en Recette

Autorisation utilisateur : « on lance alors », après présentation du raccordement Recette. Base : a5d05ead27260504eb75e439695b92c96d945cb4 (DESIGN-080/081 conservés).

- WILO/RIA accessibles à l'agent Eau & Incendie dans l'espace Recette. EauRounds demeure la démonstration ; formulaires connectés, réponses et contrôles métier conservés.
- Brouillons Recette séparés des clés historiques d'Exploitation ; accusés filtrés par espace ; attestation fictive explicite, décochée à chaque nouvelle ronde. La file utilise toujours l'espace du payload et non celui de l'écran au moment d'une reprise.
- Migration additive water_rounds_recette : extension GE/WILO/RIA strictement typée, configuration Recette inchangée, attestation et périmètres serveur conservés. RIA : RPC avec deux paramètres optionnels, réception des preuves, historique, lecture/retour/revue FM dans l'espace demandé. Les anciens appels RIA à cinq paramètres restent valables en Exploitation.
- WILO : historique agent/FM, lecture et demande motivée de nouveau contrôle, journal d'audit, lien vers le dossier pour qualification. Cette lecture ne prétend pas valider un score WILO ; la revue santé complète WILO demeure un chantier distinct.
- Aucune donnée fictive promue en Exploitation ; aucune donnée réelle, aucun compte ou secret ajouté. Aucun changement aux valeurs d'énumération ni aux règles de score/pression. Aucune publication ni écriture distante.
- Validation : 310 scénarios PostgreSQL réel/isolation, 243 en mode Recette, 34 WILO, 27 hors ligne ; contrôles visuels 120, personas 38, lot0 89, lot1 36 ; navigateur 1440/380 avec attestation et clés de brouillon ; transport simulé de preuves avec reprise, en réel et Recette ; TypeScript.
- Limite : PostgreSQL isolé PGlite et transport navigateur simulé, pas une recette du service distant. Supabase advisors --local tenté : connexion refusée à 127.0.0.1:54322, service local absent. Vérification sur environnement Supabase à réaliser avant ouverture aux agents.

Déploiement non effectué. Procédure : sauvegarde DB/Storage et identification de la version frontend en service ; appliquer la migration avant le frontend ; vérifier les périmètres et le parcours agent/FM en Recette ; ouvrir ensuite aux agents. Retour arrière : restaurer l'ancien frontend ; conserver la migration additive et les rapports/audits déjà enregistrés. Ne pas rétrograder ou supprimer la classification des données fictives. En incident d'isolation, désactiver Recette selon la procédure d'exploitation avant toute autre action.
