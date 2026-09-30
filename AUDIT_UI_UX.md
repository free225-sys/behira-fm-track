# AUDIT UI/UX — BEHIRA FM Track

Phase A, version 2 (30/09/2026). L’inventaire et les constats UX-001 à UX-024 sont inchangés dans leur fond. Cette version ajoute la matrice de couverture (§6) et la passe visuelle de l’atlas (§7, à partir de UX-025). Le lot 1 est livré à part dans `LOT-1.md`.

- Référence code : commit `478c846` (zip, arbre identique à `c8821ad`). Branche de travail `grok/audit-ui-2026-09-30`.
- Atlas : `atlas-captures-jpg.zip`, 150 JPEG de démonstration (1440, 834, 390) + 8 JPEG connectés WILO/IRR. `INDEX.md` décrit chaque fichier. Le dossier `preproduction/` du zip est vide (compte réel, non versionné) ; les trois vues y sont décrites. La coupe jointe hors dépôt confirme la plage 3,0–4,5 bar de la maquette (UX-008).
- Les captures pleine page collent parfois le chrome `position:fixed` (barre du bas, toast, bulle de saisie) au milieu du défilement. Un bandeau navy « au milieu » d’une longue page n’est pas retenu comme défaut s’il s’agit de la barre fixe. Les constats UX-025 et suivants ne gardent que ce que le code confirme.
- Hors périmètre : `supabase/`, rôles, permissions, statuts, calculs, formats, brouillons, synchronisation, mode Recette. DEC-020 et DEC-022 restent en place. UX-019 est rejeté (DEC-023).

Profils : Administration, Facility Manager, Agent Électricité, Agent Eau & Incendie, Agente Rondes & Assistance.

## 1. Inventaire

Légende d’accès : A Administration, F Facility Manager, E Électricité, W Eau & Incendie, R Rondes & Assistance. Largeurs cibles de la mission : 1440, 1024, 834, 390, 360. « Code » = structure lue, capture absente.

| Écran | Accès | Fichier principal | États dans le code | Largeurs |
|---|---|---|---|---|
| Connexion, comptes de démo | tous | `app/page.tsx` (porte) | démo, Supabase, erreur, chargement | Code |
| Mot de passe temporaire | session connectée | `app/page.tsx` | règles, erreur, envoi | Code |
| Accueil — santé du bâtiment | tous ; A le nomme Arbitrages | `app/components/BuildingHealthCockpit.tsx`, `app/page.tsx` `LiveHealthCockpit` | démo, live, score non calculable, planning | Code |
| Sélecteur « Démarrer une ronde » | E, W, R (pas A ; F n’est pas agent) | `app/components/shared/StartRoundPicker.tsx` | tout fait, une ronde due, plusieurs, hors planning | Code |
| Dossiers — file | F, A | `app/components/DossiersWorkspace.tsx`, espaces dans `app/page.tsx` | vide, filtres, démo | Code |
| Fiche dossier | F, A, et un agent si un dossier de son périmètre s’ouvre | `app/page.tsx` `Detail`, `app/components/Ge01WorkflowPanel.tsx` | qualifier, affecter, diagnostic, preuve, réception, réouverture, clôture, lecture seule | Code |
| Rondes GE-01 agent | E | `app/components/Ge01Pilot.tsx` | démo, live, recette, brouillon | Code |
| Rondes WILO connecté | W si persistance | `app/page.tsx` `LegacyReport`, `app/components/WiloSupplement.tsx` | vide, alerte, critique, brouillon, transmis | Code |
| Rondes WILO / RIA maquette | W en démo (`!persistenceEnabled`) | `app/components/EauRounds.tsx` | brouillon local, pas d’IRR | Code |
| Rondes RIA-01 connecté | W, et F en revue | `app/components/RiaRound.tsx` | non connecté, saisie, historique, revue FM | Code |
| Rondes IRR-01 | W connecté ; F en liste | `app/components/IrrRound.tsx`, `app/components/WiloRoundInbox.tsx` | non connecté, saisie, historique | Code |
| Saisie rapide RND-LET | R (et repli hors surpresseur) | `app/page.tsx` branche `!surpresseurAccess` | démo, live | Code |
| Accueil Rondes — zones du jour | R | `app/page.tsx` `RoundsAssistanceWorkspace` | liste figée | Code |
| File FM des rondes | F | `app/page.tsx` `Report`, `Ge01Pilot` inbox, `WiloRoundInbox` | GE, RIA, WILO, IRR empilés | Code |
| Équipements | F, A | `app/components/EquipmentWorkspace.tsx` | démo, live, vide | Code |
| Pilotage | F, A | `app/page.tsx` `Dashboard`, `OperationalAnalytics` | santé, équipe | Code |
| Coûts | F, A (hors barre principale) | `app/components/CostsWorkspace.tsx`, `ConnectedCostsWorkspace.tsx` | démo, live, arbitrage | Code |
| Utilisateurs et droits | F, A | `app/components/AccessWorkspace.tsx` | miroir neutralisé | Code |
| Seuils et paramètres | A | `app/components/ParametersWorkspace.tsx` | historique non raccordé | Code |
| Registre | F, A (clé masquée de la barre) | vues `registry` dans `app/page.tsx` | recherche | Code |
| Notifications | session ouverte | `app/components/NotificationCenter.tsx` | vide, erreur | Code |
| Spécimen | hors produit | `app/design-system/page.tsx` | — | Code |

Navigation réelle (`app/page.tsx`) : E, W et R n’ont que Accueil et Rondes. F a Accueil, Dossiers, Rondes, Équipements, Pilotage, plus Coûts, Utilisateurs, Registre. A a Arbitrages, Dossiers, Équipements, Pilotage, Paramètres, plus Coûts, Utilisateurs, Registre. A n’a pas Rondes.

## 2. Constats

### UX-001 — Le choix de ronde n’est pas transmis

- Écrans : Accueil, Rondes. Profils : E, W, R. Largeurs : toutes. Catégorie : sélecteur. Gravité : bloquant.
- Constat : `StartRoundPicker` sait quelle ronde est cliquée, mais les deux branchements jettent l’argument. `BuildingHealthCockpit.tsx` ligne 275 : `onSelect={() => onNavigate('report')}` et le même appel pour `onOffPlan`. `TodayRoundsPanel` (`page.tsx` vers 1855–1865) type `onStart?: () => void` ; ce second picker n’est de toute façon pas monté (`withPicker` jamais vrai).
- Quand tout est fait, le bouton devient « Ronde hors planning » et appelle `onOffPlan()` sans choix (`StartRoundPicker.tsx` 76–79 et 133–138). Le sous-texte promet « Choisir un équipement ou une zone ». Aucun choix n’existe.
- La page Rondes s’ouvre toujours sur le défaut du profil : E → GE-01 ; W démo → onglet WILO de la maquette ; W connecté → onglet `existing` donc WILO ; R → saisie RND-LET (`page.tsx` `Report`, vers 2910–2916).
- En live, le bandeau ne reçoit que `ge01Operations.rounds` (`page.tsx` `LiveHealthCockpit`, vers 778). Le lecteur n’accepte que `equipmentCode === 'GE-01'` (`app/lib/ge01/operations.ts` 33). La note sous le cockpit dit « Seule la ronde quotidienne GE-01 est planifiée ici » pour toute session live, y compris Eau et Rondes. S’il n’y a qu’une ronde GE due, le bouton affiche « Démarrer la ronde GE-01 » puis ouvre WILO ou RND-LET.
- Correction : garder l’identifiant de ronde dans l’état de navigation et ouvrir l’onglet déjà existant (WILO-01, RIA-01, IRR-01, GE-01, ou la zone RND-LET). Hors planning : afficher ce même sélecteur, options = rondes du profil, rien de présélectionné qui enverrait sur le mauvais équipement. Ne pas afficher « GE-01 » comme action principale d’un profil qui n’ouvre pas GE. Ne pas élargir le contrat serveur des rondes : si le planning live ne contient que GE-01, le bouton hors planning doit le dire et proposer les formulaires déjà livrés, pas inventer un planning.
- Fichiers : `app/components/shared/StartRoundPicker.tsx`, `app/components/BuildingHealthCockpit.tsx`, `app/page.tsx`, éventuellement `app/components/RiaRound.tsx` (onglet initial).
- Régression : ne pas changer l’envoi, les brouillons, ni le filtre de périmètre démo (`demoRoundsFor`).

### UX-002 — Trois sélecteurs de ronde, aucun état partagé

- Écrans : Rondes. Profils : W, F, E, R. Largeurs : toutes, surtout 390 où les onglets passent à la ligne. Catégorie : sélecteur. Gravité : majeur.
- Constat : le sélecteur d’accueil et celui de la page ne sont pas le même composant. `RiaRoundNavigation` (`RiaRound.tsx` 137–140) est un état local, défaut `'existing'`, sans propriété d’onglet initial.
- W connecté : onglets WILO-01 · Eau, RIA-01 · Incendie, IRR-01 · Irrigation. F : onglet GE-01 · Électricité + RIA-01 seulement ; les files WILO et IRR sont deux cartes au-dessus, pas des onglets (`page.tsx` vers 2911). E : pas d’onglet. R : pas d’onglet. W démo : autre barre, `EauRounds.tsx` 135–137, WILO et RIA seulement, codes démo.
- Changer d’onglet démonte l’autre formulaire (un seul enfant rendu). Les brouillons connectés sont dans le stockage local, mais rien ne le dit. La maquette, elle, garde l’état dans le parent.
- Correction : un seul contrôle, mêmes libellés et même ordre que les rondes réellement disponibles du profil. Valeur initiale = ronde choisie à l’accueil, sinon la première ronde du profil sans prétendre qu’un autre équipement a été choisi. Changement d’onglet : conserver le brouillon déjà écrit, ne pas effacer l’autre saisie. Pas de nouvelle règle d’enregistrement.
- Fichiers : `StartRoundPicker.tsx`, `RiaRound.tsx`, `EauRounds.tsx`, `page.tsx`.

### UX-003 — L’historique de ronde n’occupe pas la colonne libre

- Écrans : Rondes WILO, RIA, IRR connectés. Profils : W (saisie), F (listes). Largeurs : 1440 et 1024 ; sous 1100 px la grille passe à une colonne (`globals.css` vers 370). Catégorie : mise en page. Gravité : majeur.
- Constat : WILO connecté, `surpresseur-layout` = formulaire + aside (« À surveiller », score Indisponible) (`page.tsx` 3328–3345). `WiloRoundInbox` « Historique WILO-01 » est le frère suivant, pleine largeur sous les deux colonnes (`page.tsx` 2916, `WiloRoundInbox.tsx` 36). L’aside ne contient que deux cartes : le vide signalé est réel.
- RIA : le score compact est à l’intérieur de la carte formulaire (`RiaRound.tsx` 96). L’historique est une carte suivante (lignes 35–38), pas une colonne.
- IRR : formulaire seul, historique frère en dessous (`page.tsx` 2915). Pas d’aside.
- GE agent : aside « Contrôle quotidien » / « Après l’envoi », historique ailleurs (onglet d’accueil), pas sous le formulaire. Ne pas y coller l’historique WILO.
- Correction : pour WILO, RIA et IRR, même grille. Colonne principale = formulaire. Colonne droite = cartes de contexte déjà prévues, puis l’historique. Sous 1100 px : formulaire, puis cartes, puis historique, dans cet ordre. Le FM qui n’a pas de formulaire (files d’examen) garde des listes ; ne pas les enfoncer dans une fausse aside.
- Fichiers : `page.tsx`, `RiaRound.tsx`, `IrrRound.tsx`, `WiloRoundInbox.tsx`, `globals.css` (grille existante, pas une nouvelle).
- Régression : ne pas déplacer les données, seulement le rangement. L’examen FM (lu, retour, dossier) reste dans la carte d’historique.

### UX-004 — « Confirmer le diagnostic » grisé sans raison collée au bouton

- Écran : fiche dossier. Profil : F, parfois l’agent affecté. Largeurs : toutes. Catégorie : bouton. Gravité : majeur.
- Constat : le libellé n’existe que si le statut est « À qualifier » et l’action `PERFORM_DIAGNOSIS` (`Ge01WorkflowPanel.tsx` 37–40). Le bouton est désactivé tant que le commentaire est vide (ligne 99), sans texte « Le commentaire est obligatoire ». `aria-busy` absent.
- Si l’étape n’est pas permise, une phrase existe (ligne 66) : « Cette étape attend le diagnostic de l’agent affecté » ou « le Facility Manager ». Elle n’est pas à côté d’un bouton visible, puisque le bouton n’est rendu que si `permitted`.
- La colonne droite de la vue d’ensemble a une autre action principale (`page.tsx` vers 2831) qui parle du responsable interne, pas de l’acteur du diagnostic. Deux blocs « que faire maintenant » se superposent avec `DossierActionBoard`.
- Correction d’affichage : si le commentaire manque, le bouton reste désactivé et une ligne le dit. Si l’utilisateur n’est pas l’acteur, la phrase de la ligne 66 reste visible au-dessus, avec l’acteur attendu déjà fourni par le résumé. Ne pas changer `permitted`.
- Fichiers : `Ge01WorkflowPanel.tsx`, `page.tsx` (éviter deux actions principales contradictoires), `DossierContinuity.tsx` seulement si le libellé d’attente y est plus clair sans changer le contrat.

### UX-005 — Le constat d’origine n’affiche pas la mesure déclenchante

- Écran : fiche dossier, vue d’ensemble. Profil : F en premier. Largeurs : toutes. Catégorie : formulaire / UX. Gravité : majeur.
- Constat : la carte ne rend que `anomaly.description` et la date (`page.tsx` 2827). Le type `Anomaly` n’a pas de mesure. Les nombres des jeux démo sont dans la phrase, pas dans un champ. Un dossier issu d’une ronde peut avoir une pression dans les checks du rapport (`valueNumeric`) sans que la fiche la montre.
- Correction : si un rapport déjà chargé dans le client porte `anomalyReference` vers ce dossier, afficher en lecture seule les checks numériques utiles (pression, niveau), libellé + valeur + unité. S’il n’y en a pas, une ligne « Mesure d’origine non reliée à cette fiche » et le lien vers le rapport s’il existe. Ne pas déduire un nombre du texte. Ne pas ajouter d’appel serveur.
- Fichiers : `page.tsx`, lecture des rapports déjà tenus par l’écran (`reports`, inboxes). Pas `data.ts` si le tableau de checks est déjà côté client.
- Régression : ne pas modifier la description enregistrée.

### UX-006 — L’attente d’enregistrement ne dit pas ce qui se passe

- Écrans : fiche (affectation, diagnostic, clôture), coûts, réception, réouverture, revue RIA. Profils : F, A, agents. Largeurs : toutes. Catégorie : bouton. Gravité : majeur sur l’affectation, mineur ailleurs.
- Constat : le bouton passe à « Enregistrement… » (`Ge01WorkflowPanel.tsx` 98, et les mêmes libellés dans `ReopenDossierPanel.tsx`, `InterventionReceptionPanel.tsx`, `ConnectedCostsWorkspace.tsx`, `page.tsx`). Pas de statut persistant à côté, pas d’`aria-busy` sur le bouton de workflow. Une affectation lente ressemble à un blocage.
- Correction : garder le même envoi. Ajouter `aria-busy`, désactiver le double envoi (déjà le cas via `busy`), et une ligne `role="status"` : « Enregistrement en cours. Restez sur cette page. » Ne pas inventer de pourcentage.
- Fichiers : ceux cités. Un seul texte, pas dix variantes.

### UX-007 — Les pastilles de saisie ne se lisent pas comme un état

- Écrans : formulaires de ronde. Profils : E, W, R. Largeurs : toutes, pire en 390 à cause du suivi de lettres. Catégorie : design system. Gravité : mineur.
- Constat : WILO connecté, étape : « SAISIE RÉELLE », « SAISIE RECETTE » ou « DÉMO INTERACTIVE » (`page.tsx` 3330). Classe `.mockup-label` (`globals.css` vers 366) : 12 px, graisse 700, suivi 0,08 em, `#52687c` sur `#eef3f7`. Le contraste dépasse 4,5:1, mais les capitales serrées sur le plancher typographique se lisent mal. Le même écran dit aussi « Saisie terrain » ou « Maquette » dans l’en-tête (3319).
- Ailleurs le vocabulaire diverge : saisie rapide « SAISIE RÉELLE » ou « DÉMO » sans variante Recette (3302) ; RIA toujours « Saisie terrain » (`RiaRound.tsx` 33) ; IRR ajoute un badge Recette ; GE utilise « DÉMO SANS SAUVEGARDE » / « RECETTE — DONNÉES FICTIVES ».
- Correction : une seule pastille, texte en casse de phrase, taille corps, ton de badge existant (neutre démo, bleu réel, orange recette). Même règle `persistenceEnabled` / `isTest`. Ne pas créer de couleur.

### UX-008 — La maquette Eau n’enseigne pas les règles déjà codées

- Écran : Rondes W en démonstration. Profil : W. Largeurs : toutes. Catégorie : formulaire. Gravité : majeur.
- Constat : `DesignEauReport` monte `EauRounds` tant que la persistance est coupée (`page.tsx` 2914). Cette maquette contredit le formulaire connecté du même zip :
  - pression affichée 3,0–4,5 bar et alerte seulement sous 3 (`EauRounds.tsx` 120, 185–192), alors que le connecté est 4,5–5,5, critique sous 4 ou au-dessus de 6 (`page.tsx` 3188–3191) ;
  - « Type de ronde » en liste avec `defaultValue="Quotidienne"` (ligne 177), donc présélectionné ;
  - contrôles en bascule, pas les trois choix DEC-020 ;
  - score avec État / Variation / Fraîcheur (ligne 240), retirés du connecté ;
  - phrase RIA « lundi à samedi · échéance 23:59 » et « pression de référence retenue : 5 bar » comme des décisions (ligne 251), alors que le connecté dit « à confirmer » (`RiaRound.tsx` 33) ;
  - pas d’IRR ; double affichage saisie + plage séparée.
- Correction : aligner l’affichage de la maquette sur le formulaire connecté déjà livré (plage, absence de présélection, panneau de score compact, cadence provisoire, trois choix DEC-020). Ne pas brancher la maquette sur l’enregistrement. Mettre à jour le script de contrôle qui viserait encore 3–4,5 sur cet écran, dans le même lot, et le dire.
- Fichiers : `EauRounds.tsx`, `scripts/verify-lot1-ui.mjs` ou `verify-connected-water-ui.mjs` selon ce qu’ils assertent.

### UX-009 — « Réarmement provisoire » s’affiche sans réarmement

- Écran : WILO connecté, colonne droite. Profil : W. Largeurs : 1440 (colonne visible), 390 (carte sous le formulaire). Catégorie : UX. Gravité : majeur.
- Constat : si la persistance est active, l’aside dit toujours « Réarmement provisoire » et « Un réarmement ne suffit pas… » (`page.tsx` 3343), que `REARMEMENT` vaille `yes` ou non. En démo connectée-non, le texte parle d’une pompe P1 indisponible fixe.
- Correction : n’afficher ce titre que si la réponse réarmement est `yes`. Sinon, une carte neutre « Aucun réarmement déclaré » ou la surveillance réellement déduite des réponses déjà saisies. Ne pas créer d’événement.

### UX-010 — « Non vérifié » n’a pas le même geste partout

- Écrans : contrôles WILO, observations WILO, RIA, IRR. Profil : W. Largeurs : toutes ; sous 760 px les puces IRR/WILO passent à deux par ligne. Catégorie : formulaire. Gravité : majeur.
- Constat : DEC-020, à conserver, met Conforme / Anomalie / Non vérifié en trois boutons (`page.tsx` 3199–3216), avec l’invite « À contrôler pendant la ronde ». Les observations WILO sortent « Non vérifié » des options (lien « Je ne peux pas vérifier ») et disent « À renseigner pendant la ronde ». IRR remet « Non vérifié » dans la rangée (`IrrRound.tsx` 33) et ne colore pas selon la gravité. RIA met `unknown` dans la même rangée que Oui / Non, sous le libellé « Non vérifié », sans ton de gravité (`RiaRound.tsx` 79), et la mesure passe par une case « Non relevé » au lieu de « Mesure impossible à relever ».
- Cible : DEC-020 inchangé sur les cartes de contrôle de base. Observations RIA et IRR alignées sur `WiloSupplement` : pas de présélection, lien hors options, motif, retour, mesure avec « Mesure impossible à relever ». Les codes envoyés (`yes`, `no`, `unknown`, textes d’énumération) ne changent pas.
- Fichiers : `RiaRound.tsx`, `IrrRound.tsx`, `globals.css` seulement pour réutiliser `.choice-chip`. Pas `lib/ria/report.ts` ni `lib/irr/report.ts`.

### UX-011 — Deux actions « maintenant » sur la fiche

- Écran : fiche dossier. Profils : F, A, agent. Largeurs : 1440 (trois colonnes), 390 (empilement). Catégorie : UX. Gravité : mineur.
- Constat : `Ge01WorkflowPanel` ouvre déjà un bloc « Prochaine action ». La vue d’ensemble ajoute `next-step-card` « Action principale » (`page.tsx` 2831) avec un autre libellé et un autre bouton. On ne sait pas lequel compte.
- Correction : une seule action principale visible sans changer qui a le droit de la lancer. L’autre bloc devient un rappel, pas un second bouton.
- Fichiers : `page.tsx`.

### UX-012 — « Terminer la ronde » a l’air disponible alors que l’envoi est refusé

- Écran : synthèse WILO connecté. Profil : W. Largeurs : toutes. Catégorie : bouton. Gravité : mineur.
- Constat : le bouton n’est désactivé que par le brouillon, l’envoi ou l’état transmis (`page.tsx` 3339). L’absence de confirmation ou le contrôle incomplet ne se voient qu’au clic, via un flash (3229–3231). RIA, au contraire, désactive « Transmettre » tant que la case n’est pas cochée (`RiaRound.tsx` 93).
- Correction : désactiver le bouton WILO dans les mêmes cas que le `return` déjà écrit, et laisser le texte d’incomplet visible. Ne pas assouplir la condition d’envoi.

### UX-013 — L’accueil Rondes & Assistance est une liste figée

- Écran : Accueil R. Profil : R. Largeurs : toutes. Catégorie : UX. Gravité : majeur.
- Constat : zones, statuts et date `2026-09-16` sont écrits en dur (`page.tsx` `RoundsAssistanceWorkspace`, vers 2376). Les lignes sont des boutons qui ne mènent nulle part. La vraie saisie est le formulaire RND-LET de la page Rondes, sans lien depuis une zone.
- Correction : tant que ces zones ne sont pas une source réelle, ne pas les présenter comme la ronde du jour. Lien clair vers la saisie RND-LET, ou liste explicitement « exemple d’écran », sans date inventée qui vieillit. Ne pas fabriquer un planning.

### UX-014 — La file FM empile quatre historiques avant le travail

- Écran : Rondes F. Profil : F. Largeurs : 1440 (page très longue), 390 (pire). Catégorie : navigation. Gravité : mineur.
- Constat : deux `WiloRoundInbox` (WILO puis IRR) puis les onglets GE/RIA (`page.tsx` 2911). Pas le sélecteur du §3.2. L’ordre ne dit pas par où commencer.
- Correction : le même sélecteur que l’agent, options = files réellement livrées (GE-01, WILO-01, RIA-01, IRR-01), une file visible à la fois. Pas de fusion des circuits d’examen.

### UX-015 — Le secours équipement réintroduit « Sain »

- Écran : tout écran qui retombe sur `fallbackEquipment`. Profils : tous en démo locale après déconnexion (`page.tsx` 333–339 et 1607). Largeurs : toutes. Catégorie : design system. Gravité : mineur.
- Constat : DEMO-ESP et DEMO-RND portent `state:'Sain'`. Le vocabulaire validé ne présente pas « Sain » comme un statut produit.
- Correction : réutiliser le libellé métier déjà affiché ailleurs pour un équipement disponible, sans nouveau calcul de score.
- Fichier : `page.tsx`.

### UX-016 — Le hero navy de ronde est encore dans la feuille de style

- Écrans : rondes si la classe est encore posée. Largeurs : toutes. Catégorie : design system. Gravité : mineur.
- Constat : `.surpresseur-hero` est un dégradé navy pleine largeur (`globals.css` vers 368), en plus du chrome de navigation. Les en-têtes actuels passent par `RoundPilotHeader` (fond clair). La classe morte peut revenir au premier collage.
- Correction : ne plus servir ce bandeau. Si plus aucun JSX ne l’utilise, retirer les règles au lot d’harmonisation, après avoir vérifié qu’aucun écran ne les référence. Une seule bande navy : la navigation.

### UX-017 — Les étapes de ronde restent étroites au doigt

- Écrans : rails WILO, RIA, IRR, GE. Profils : E, W. Largeurs : 390 et 360. Catégorie : responsive. Gravité : mineur.
- Constat : sous 760 px, `.surpresseur-progress button` est fixé vers 112 px, et 98 px sous 430 px (`globals.css` 371–373). Le libellé est en 12 px. Le défilement horizontal existe, mais la cible et le texte long (« Pressions et pressostats ») sont comprimés. Les onglets d’équipement n’ont pas de `min-height: 44px` garanti.
- Correction : cible 44 px, libellé qui passe à la ligne (déjà prévu pour `.connected-round-progress`), pas de nouvelle barre.

### UX-018 — Message d’erreur d’envoi en flash, facile à manquer

- Écrans : envoi WILO et saisie rapide. Profils : W, R, E. Largeurs : toutes. Catégorie : formulaire. Gravité : mineur.
- Constat : plusieurs refus passent par `flash(...)` (photo, confirmation, stockage) sans bloc `role="alert"` dans le formulaire. RIA, lui, a un `role="alert"` dans la carte.
- Correction : même motif d’alerte que RIA, dans la carte, en plus ou à la place du flash. Texte inchangé.

### UX-019 — Deuxième bande navy sous la navigation — rejeté (DEC-023)

- Écrans : Accueil, Dossiers. Profils : tous ceux qui voient ces pages. Largeurs : toutes. Catégorie : design system. Gravité : clos.
- Constat (inchangé) : `HomeHeroBanner` avec `bleed` et `.dossiers-hero.is-bleed` reprennent `background: var(--chrome)` sous la navigation. Captures : `demo/001_administration_desktop_accueil.jpg`, `demo/055_facility-manager_desktop_accueil.jpg`, `demo/004_administration_desktop_dossiers.jpg`.
- Décision du porteur : on garde ces bandeaux. DEC-023 précise DEC-009 : la barre de navigation reste la seule bande de navigation ; le bandeau d’en-tête bleu marine est admis sur Accueil et Dossiers ; les autres écrans restent sur fond clair. Aucun correctif.

### UX-020 — La cloche et des boutons de panneau disparaissent sous 700 px

- Écrans : tous, barre du haut et en-têtes de panneaux. Profils : tous. Largeurs : 390 et 360 (le seuil est 700 px, donc aussi une partie de la tablette étroite). Catégorie : responsive. Gravité : majeur.
- Constat : dans `@media (max-width:700px)`, `globals.css` ligne 171 contient `.icon-button{display:none}` et `.panel-head button{display:none}`. La cloche est un `IconButton` (`NotificationCenter.tsx`). Les actions d’en-tête de panneau ne s’affichent plus. Aucune règle plus basse ne les rétablit.
- Correction : ne pas masquer un contrôle qui est la seule entrée d’une fonction. Le passer en 44 px et le garder visible, ou le déplacer dans le menu Plus avec le même libellé. Ne pas supprimer les notifications.
- Fichiers : `globals.css`, `NotificationCenter.tsx` si le déplacement est nécessaire.

### UX-021 — « Coûts » et « Registre » ouvrent Dossiers

- Écrans : Paramètres (« ouvrir les coûts »), liens vers `costs` ou `registry`. Profils : A, F. Largeurs : toutes. Catégorie : navigation. Gravité : majeur.
- Constat : `hiddenNavKeys` retire Registre et Coûts de la barre (`page.tsx` 303). `navigate` réécrit ces deux vues vers Dossiers, onglet Tous (`page.tsx` 1060–1062). Le bouton des paramètres appelle pourtant `navigate('costs')` (1768). L’écran `CostsWorkspace` (1765) n’est pas atteint par ce chemin.
- Correction d’affichage et de navigation : soit le libellé dit « Voir les dossiers », soit le bouton ouvre vraiment l’écran Coûts déjà écrit. Ne pas laisser un libellé qui ment. Pas de nouveau calcul financier.
- Fichiers : `page.tsx`, `ParametersWorkspace.tsx`.

### UX-022 — Boutons de décision qui ne font rien

- Écran : fiche, zone de décision financière de démonstration. Profils : F, A. Largeurs : toutes. Catégorie : bouton. Gravité : majeur.
- Constat : « Demander un complément » et « Refuser » n’ont ni `onClick` ni `disabled` (`page.tsx` 2718). « Valider » ne fait que `setDecisionDone(true)` en local. On croit qu’une décision part.
- Correction : tant que l’action n’est pas raccordée, bouton désactivé et une ligne « Décision non disponible dans cet écran ». Ne pas simuler un enregistrement. Si le circuit connecté existe déjà ailleurs (`ConnectedCostsWorkspace`), renvoyer vers lui plutôt que dupliquer un bouton mort.
- Fichiers : `page.tsx`.

### UX-023 — Titre de page coupé, et cartes de contrôle trop larges

- Écrans : bandeau (tous profils) ; contrôles WILO DEC-020. Largeurs : 834 pour le titre ; 360 et 390 pour les cartes. Catégorie : responsive. Gravité : mineur.
- Constat : `.topbar h1` est en `nowrap` + ellipsis à toute largeur ; le retour à la ligne n’est que sous 430 px. À 834 le titre peut être tronqué. `.control-choice` part de `minmax(260px, 1fr)` (`globals.css` vers 5465) : sur 360 px moins les marges, la grille dépasse.
- Correction : titre sur deux lignes dès que la largeur ne tient pas ; cartes de contrôle en une colonne sous 430 px, boutons toujours à 44 px. DEC-020 inchangé.

### UX-024 — Seuil financier écrit en dur dans l’écran Dossiers

- Écran : Dossiers. Profils : F, A. Largeurs : toutes. Catégorie : UX. Gravité : mineur.
- Constat : `DossiersWorkspace.tsx` porte `threshold = 400000` en valeur par défaut, alors que l’écran reçoit déjà le seuil du paramètre (`page.tsx` vers 1742). Une valeur de seuil ne doit pas être recopiée dans un composant.
- Correction : utiliser uniquement la propriété reçue. Pas d’autre montant.

## 3. Incohérences transverses

| Sujet | Versions en présence | Cible unique |
|---|---|---|
| Choisir la ronde | Picker d’accueil, onglets `RiaRoundNavigation`, onglets `EauRounds`, aucun pour E et R | `StartRoundPicker` étendu au hors planning, et les onglets de page pilotés par le même identifiant |
| Plage de pression WILO | Connecté 4,5–5,5 ; maquette 3,0–4,5 | Affichage 4,5–5,5 partout, critique sous 4 ou au-dessus de 6, comme le connecté |
| Score indisponible | Compact « code · Indisponible » + phrase ; maquette avec État / Variation / Fraîcheur | Carte compacte du connecté |
| Non vérifié | Trois boutons DEC-020 ; lien WILO ; puce IRR ; puce RIA | DEC-020 conservé. Observations : lien + motif, comme `WiloSupplement` |
| Gravité des choix | Puces WILO colorées après coup ; RIA et IRR neutres | Couleur seulement après le choix, sur le modèle WILO, sans colorer DEC-020 autrement que Conforme / Anomalie déjà posés |
| Historique de ronde | Sous la grille WILO ; sous la carte RIA ; sous IRR ; files FM au-dessus des onglets | Colonne droite si une grille existe ; une file à la fois côté FM |
| Pastille d’état de saisie | Six libellés | Une pastille, trois tons de badge existants |
| Action de fiche | Bloc workflow + carte « Action principale » | Une action principale |
| Attente | « Enregistrement… » seul dans le bouton | Bouton + ligne de statut |
| Bande navy | Chrome + héros Accueil et Dossiers en `--chrome` | DEC-023 : barre = seule bande de navigation ; bandeau d’en-tête navy admis sur Accueil et Dossiers uniquement |
| Destination Coûts / Registre | Libellé d’écran, réécriture vers Dossiers | Libellé = écran réellement ouvert |

## 4. Lots

Chaque lot met à jour le script de contrôle s’il casse, et le dit dans `LOT-N.md`. Contrôles à garder verts : `audit-visual-styles`, `verify-personas`, `verify-auth`, `verify-lot0-ui`, `verify-lot1-ui`, `verify-wilo-observations`, `verify-input-rules`, `verify-anti-zombie.ts`, `verify-connected-water-ui`, `verify-irr-ui`.

### Lot 1 — Choisir la ronde et ranger l’historique

UX-001, UX-002, UX-003. Couvre les §3.1, §3.2 et §3.3.

Acceptation : hors planning ouvre un choix dont les options sont les rondes du profil ; la page s’ouvre sur ce choix ; WILO, RIA et IRR partagent ce comportement ; l’historique WILO est dans la colonne droite sur 1440 et sous les cartes sur 390 ; un brouillon déjà saisi survit au changement d’onglet ; aucun code de réponse ni appel serveur nouveau.

### Lot 2 — Fiche dossier lisible

UX-004, UX-005, UX-006, UX-011.

Acceptation : un bouton grisé dit pourquoi et qui agit ; la fiche montre la mesure si elle est déjà dans un rapport chargé, sinon le manque est écrit ; l’attente d’affectation a un statut ; une seule action principale.

### Lot 3 — Formulaires de ronde alignés

UX-007, UX-008, UX-009, UX-010, UX-012, UX-018, UX-027, UX-028, UX-029, UX-030.

Acceptation : la maquette Eau ne contredit plus le connecté, et « Valider la maquette » n’a pas l’air disponible si la saisie est incomplète ; le réarmement ne s’invente pas ; RIA et IRR suivent le geste WILO pour « non vérifié » sans toucher DEC-020 ni DEC-022 ; « Terminer » et « Transmettre » (WILO et RND-LET) reflètent la condition d’envoi déjà codée ; pastilles harmonisées ; le toast de succès et la bulle de saisie ne recouvrent pas le bouton d’envoi.

### Lot 4 — Files, accueil terrain, destinations

UX-013, UX-014, UX-015, UX-021, UX-022, UX-024, UX-026.

Acceptation : l’accueil R ne présente plus une ronde du 16 septembre comme réelle, et le compteur de zones ne contredit pas les pastilles ; le FM voit une file à la fois ; « Sain » ne réapparaît pas dans le secours démo ; un bouton « Coûts » ouvre les coûts ou change de libellé ; aucun bouton de décision n’a l’air actif s’il n’enregistre rien ; le seuil affiché est celui reçu, pas un 400 000 recopié.

### Lot 5 — Responsive, chrome fixe, toasts

UX-016, UX-017, UX-020, UX-023, UX-025, UX-031, UX-032, UX-033, puis contrôle 1440 / 1024 / 834 / 390 / 360 des écrans touchés par les lots 1 à 4.

UX-019 n’est plus dans ce lot (DEC-023).

Acceptation : la cloche et les actions de panneau restent atteignables à 390 et 360 ; le contenu mobile n’est pas masqué par la barre du bas ; cibles 44 px ; pas de débordement horizontal de page sur les formulaires WILO, RIA, IRR, GE ; le titre de page n’est pas coupé à 834. Les bandeaux navy d’Accueil et de Dossiers restent. Paramètres : la pastille « Lecture seule » ne contredit plus les interrupteurs, l’onglet ne laisse plus le bloc Accès dessous, et « Préparer » n’a pas l’air prêt à vide.

### Lot 6 — Seconde passe

Réinspection de l’inventaire. Écarts nouveaux seulement. Pas de chantier cosmétique hors constat.

## 5. Questions

1. Atlas : reçu. La passe visuelle est au §7. Les trois JPEG de préproduction ne sont pas dans le zip ; la description d’INDEX suffit pour UX-001 à UX-003, déjà au lot 1.
2. UX-005 : tranché. Pas de nouvel appel. Une colonne `source_report_id` pourra être ajoutée à la requête existante des dossiers dans `app/lib/supabase/data.ts` au lot 2, rien d’autre. Sans rapport relié : la ligne « Mesure d'origine non reliée à cette fiche ».

## 6. Matrice de couverture

Axes du §4 de la mission. Chaque case est un `UX-xxx` ou « RAS » suivi de ce qui a été vérifié (code du zip et, quand l’atlas a une capture, le fichier cité). Aucune case vide. Les largeurs 1024 et 360 ne sont pas dans l’atlas (1440, 834, 390) : le responsive à ces deux largeurs est lu dans les media queries, pas sur une capture.

| Écran | Mise en page | Formulaires | Boutons | Sélecteurs | Navigation | Responsive | Design system | UX | Accessibilité | États |
|---|---|---|---|---|---|---|---|---|---|---|
| Connexion | RAS — carte centrée, pas de second chrome (`demo/001` est déjà connecté ; porte lue dans `app/page.tsx` auth) | RAS — e-mail, mot de passe, libellés visibles | RAS — entrer, afficher/masquer, comptes démo | RAS — pas de liste déroulante sur la porte | RAS — pas de barre produit avant session | RAS — `verify-auth` 390/768/1440, champs en 100 % sous 700 px | RAS — primitives `Field`/`Button`, pas de panneau navy (contrôle visuel) | RAS — comptes fictifs et mot de passe commun affichés | RAS — bouton afficher a un nom, focus clavier unique (`verify-auth`) | RAS — erreur, chargement et succès ont un texte (`verify-auth`) |
| Mot de passe temporaire | RAS — même carte que la porte | RAS — règles écrites à côté des champs | RAS — envoi désactivé tant que les règles échouent | RAS — aucun | RAS — retour à la connexion | RAS — même empilement que la porte | RAS — mêmes champs que la connexion | RAS — on comprend qu’il faut changer le mot de passe avant d’entrer | RAS — erreurs reliées aux champs | RAS — erreur de robustesse et verrouillage première connexion |
| Accueil — santé | UX-019 clos — bandeau navy conservé (DEC-023), `demo/001`, `demo/055` | RAS — pas de formulaire hors recherche équipements FM | UX-001 — le CTA de ronde ignorait le choix | UX-001 — sélecteur d’accueil | RAS — Accueil actif dans la barre | UX-025 — barre du bas sur le contenu mobile (`demo/037`, `demo/083`) | UX-019 clos ; pastilles de palier cohérentes | RAS — l’action du jour est dans le bandeau (`demo/118`) | RAS — anneau de score a un `aria-label` | RAS — score non calculable a une phrase, pas un faux chiffre |
| Sélecteur « Démarrer une ronde » | RAS — panneau sous le bouton, largeur bornée | RAS — ce n’est pas un formulaire | UX-001 — hors planning n’ouvrait aucun choix | UX-001, UX-002 | RAS — mène à Rondes | RAS — panneau recalé sous 700 px | RAS — focus, survol, désactivé et erreur alignés sur « Espace de travail » (lot 1) | UX-001 | RAS — `aria-expanded`, options, Échap | RAS — rondes faites désactivées, liste vide = alerte |
| Arbitrages (accueil Administration) | UX-019 clos — `demo/003_administration_desktop_arbitrages.jpg` | RAS — pas de saisie sur cet accueil | RAS — « Ouvrir Pilotage » est le lien principal | RAS — aucun sélecteur de ronde (profil A) | RAS — le libellé de barre est Arbitrages, pas Rondes | UX-025 — `demo/037`, `demo/039` | UX-019 clos | RAS — le nombre d’arbitrages est dans le bonjour | RAS — liens de cartes sont des boutons nommés | RAS — file vide a une phrase, pas une carte fantôme |
| Dossiers — file | RAS — liste + filtres, `demo/004`, `demo/057` | RAS — recherche et filtres ont un libellé | RAS — une ligne ouvre la fiche | RAS — onglets À traiter / Tous / Clôturés | RAS — Dossiers actif | UX-020, UX-023 — titre et actions sous 700 px | UX-019 clos sur le héros, `demo/004` | RAS — le premier dossier est l’action | RAS — onglets en `tablist` (pastilles) | RAS — file filtrée vide a un texte ; clôturés vides lisibles (`demo/006`) |
| Fiche — vue d’ensemble | UX-011 — deux actions principales, `demo/007`, `demo/060` | UX-004, UX-005 — diagnostic et mesure d’origine | UX-004, UX-006 | RAS — pas de sélecteur de ronde | RAS — retour vers la file | UX-023 — trois colonnes puis pile | RAS — badges de statut existants | UX-011 | RAS — bouton occupé sans `aria-busy` (UX-006) | RAS — lecture seule Administration sans bouton d’écriture |
| Fiche — Coûts & décision | RAS — onglet dans la même fiche, grille lue dans `page.tsx` | UX-022 — commentaire de décision | UX-022 — Demander un complément / Refuser sans action | RAS — branche de décision en trois boutons | RAS — onglet interne, pas une route | RAS — pile sous 700 px | RAS — mêmes cartes que le reste de la fiche | UX-022 | RAS — boutons sans nom trompeur une fois désactivés (lot 4) | RAS — démo locale distincte du circuit connecté |
| Fiche — Preuves | RAS — matrice de preuves dans l’onglet | RAS — dépôt avec motif si pas de fichier | RAS — déposer / consulter selon le droit | RAS — aucun | RAS — onglet Preuves | RAS — exigence en pile sur 390 (`demo/043`) | RAS — même `Card` | RAS — « preuve attendue » n’est pas généralisée (contrôle anti-zombie) | RAS — le bouton consulter a le nom du fichier | RAS — absente, déposée, en file, erreur de chargement |
| Fiche — Historique | RAS — liste verticale, pas d’événements inventés | RAS — pas de saisie | RAS — pas d’action sur une ligne | RAS — aucun | RAS — onglet Historique | RAS — lignes qui passent à la ligne | RAS — même grille d’historique | RAS — un dossier sans historique le dit | RAS — dates en texte, pas seulement une couleur | RAS — vide explicite |
| Réception | RAS — panneau dans la fiche, pas une page | RAS — champs du panneau `InterventionReceptionPanel` | UX-006 — « Enregistrement… » seul | RAS — choix déjà posés, pas un nouveau sélecteur | RAS — reste sur la fiche | RAS — boutons en pile sous 700 px | RAS — `Button` primaire / secondaire | RAS — on voit ce qu’on réceptionne | UX-006 — pas de `role="status"` | RAS — occupé, erreur, succès |
| Réouverture | RAS — `ReopenDossierPanel` sous la fiche close | RAS — motif obligatoire | UX-006 | RAS — aucun | RAS — reste sur la fiche | RAS — même pile | RAS — bouton dangereux distinct | RAS — réouvrir n’est pas l’action par défaut | UX-006 | RAS — droit réservé FM/A connectés, sinon panneau absent |
| Rapport prestataire | RAS — panneau sous la ronde des agents habilités | RAS — fichier, motif, libellés | RAS — déposer désactivé sans droit (`page.tsx`) | RAS — choix du constat déjà listé | RAS — pas une destination de barre | RAS — formulaire en une colonne sous 700 px | RAS — mêmes champs que le dépôt de preuve | RAS — le refus de droit est une phrase, pas un bouton mort silencieux | RAS — input fichier a un libellé | RAS — non habilité, envoi, erreur |
| Rondes GE-01 agent | RAS — formulaire + aside contexte, `demo/098` | RAS — date, mesures, DEC-020, brouillon | RAS — Continuer / Terminer reflètent l’étape | RAS — une seule ronde (GE-01), même composant que l’accueil (lot 1) | RAS — Rondes actif | UX-017 — fil d’étapes étroit (`demo/112`) | UX-007 — pastille « DÉMO SANS SAUVEGARDE » | RAS — l’étape courante est marquée | RAS — progression `aria-current` | RAS — brouillon, recette, transmis |
| WILO connecté | UX-003 — historique sous la grille, colonne droite vide (`connecte/wilo-1440.jpg`, INDEX préproduction 01) | UX-007, UX-009, UX-010, UX-012 | UX-012 ; UX-029 — toast sur le bouton | UX-001, UX-002 | RAS — retour Accueil | UX-003 sous 1100 px ; UX-017 | UX-007 | UX-009 | UX-018 — erreurs en flash | RAS — brouillon, file, transmis |
| WILO / RIA maquette | UX-008 — maquette différente du connecté (`demo/119`, `demo/125`) | UX-008 — plage 3,0–4,5, bascules | UX-027 — Valider actif à vide (`demo/123`) | UX-002 — second jeu d’onglets | RAS — même page Rondes | UX-017 — « Cinq étapes » et trois puces visibles (`demo/135`) | UX-008 — score avec État / Variation | UX-008 | RAS — onglets `tablist` quand ils sont là | RAS — brouillon local, succès simulé |
| RIA-01 connecté | UX-003 — historique sous la carte, pas en colonne | UX-010 — Non vérifié dans la rangée | RAS — Transmettre désactivé sans confirmation | UX-002 — onglet local | RAS — même page | UX-017 | UX-007 — toujours « Saisie terrain » | RAS — cadence marquée « à confirmer » | RAS — erreur `role="alert"` dans la carte | RAS — non connecté, chargement, vide, transmis |
| IRR-01 | UX-003 — pas de colonne (`connecte/irr-1440.jpg`) | UX-010 | RAS — Terminer suit les manques | UX-002 | RAS — même page | UX-017 ; UX-030 — bulle sur les boutons | UX-007 — badge Recette à part | RAS — étapes nommées | UX-030 — la bulle n’est pas un `role="alert"` dans la carte | RAS — chargement du brouillon, non connecté |
| Saisie rapide RND-LET | RAS — formulaire + aside « Après l’envoi » (`demo/144`) | UX-028 — motif photo vide | UX-028 — Transmettre a l’air prêt | RAS — sélecteur de ronde à une option (lot 1) | RAS — Rondes | RAS — une colonne sous 1100 px | UX-007 — pastille DÉMO / SAISIE RÉELLE | RAS — le circuit après envoi est dans l’aside | UX-018 — refus en flash | RAS — simulation ou file |
| Accueil R — zones du jour | UX-013 — liste figée (`demo/142`) | RAS — pas de saisie sur les lignes | UX-013 — lignes boutons sans destination | RAS — pas le sélecteur de ronde | UX-013 — ne mène pas à RND-LET | RAS — pile en 390 (`demo/148`) | RAS — badges de statut habituels | UX-026 — « 4 / 6 » contredit les pastilles | RAS — le compteur n’est pas le nom accessible des lignes | RAS — la liste n’a pas d’état vide (elle est en dur) |
| File FM des rondes | UX-014 — quatre historiques empilés (`demo/061`, `demo/062`) | RAS — l’examen est dans la carte, pas un second formulaire | RAS — lire / retourner sont dans la carte d’historique | UX-014 — pas le sélecteur du §3.2 | RAS — onglets GE / RIA seulement | UX-014 — page très longue en 390 (`demo/089`) | RAS — mêmes cartes d’inbox | UX-014 | RAS — boutons d’examen nommés | RAS — liste vide « aucun rapport » |
| Équipements | RAS — tuiles et filtres, `demo/008`, `demo/063` | RAS — recherche et filtre ont un libellé | RAS — une tuile ouvre le détail | RAS — filtre de risque, pas un sélecteur de ronde | RAS — Équipements ou Plus selon le profil | RAS — 2 colonnes puis 1 (`demo/044`, `demo/091`) | UX-015 — repli « Sain » hors de cet écran, vocabulaire de tuile correct ici | RAS — le parc et le compteur d’inconnu sont visibles | RAS — filtre associé à son libellé | RAS — démo, live et liste vide |
| Pilotage — santé | RAS — analytique + liste d’attention, `demo/009`, `demo/064` | RAS — pas de saisie | RAS — « Ouvrir Équipements » | RAS — onglets Santé / Coûts / Équipe | RAS — Pilotage actif | RAS — une colonne en 390 (`demo/045`) | RAS — pas de légende « Sain » | RAS — on voit quoi surveiller | RAS — onglets nommés | RAS — score non calculable sans chiffre inventé |
| Pilotage — équipe | RAS — liste, `demo/011`, `demo/066` | RAS — pas de formulaire | RAS — pas d’action morte | RAS — onglet Équipe | RAS — même page | RAS — `demo/047`, `demo/094` | RAS — mêmes onglets que Paramètres | RAS — l’onglet dit qui est dans l’équipe | RAS — noms en texte | RAS — liste démo affichée, pas un spinner infini |
| Coûts — démo | RAS — l’onglet Pilotage montre la maquette, `demo/010`, `demo/065` | RAS — filtres libellés | UX-006 si envoi | RAS — filtres de coûts | UX-021 — la destination Coûts de Paramètres n’ouvre pas cet écran | RAS — `demo/046`, `demo/093` | RAS — primitives coûts | RAS — pas de budget inventé (contrôle visuel) | RAS — montant en texte, pas seulement une couleur | RAS — démo distincte du connecté |
| Coûts — connecté | RAS — `ConnectedCostsWorkspace`, pas de capture atlas | RAS — formulaire de saisie et de revue | UX-006 | RAS — décision approuver / renvoyer / refuser | UX-021 | RAS — une colonne sous 700 px (CSS) | RAS — mêmes boutons | RAS — le seuil affiché vient du paramètre | UX-006 | RAS — chargement, erreur, enregistré |
| Utilisateurs et droits | RAS — miroir, `demo/068`, `demo/096` | RAS — préparation de compte renvoie aux Paramètres | RAS — actions neutralisées dans le miroir | RAS — pas de sélecteur de rôle libre | RAS — entrée Plus | RAS — `demo/082`, `demo/096` | RAS — primitives d’accès | RAS — le miroir dit que l’administration réelle est ailleurs | RAS — tableau lisible sans info seulement en couleur | RAS — miroir vide ou liste démo, pas une erreur muette |
| Paramètres | RAS — onglets, `demo/012`, `demo/030` | RAS — le seuil financier n’est pas un champ éditable | RAS — pas de bouton Enregistrer mort sur le seuil | RAS — onglets de familles | RAS — réservé à Administration | RAS — `demo/048` | RAS — mêmes onglets que Pilotage | RAS — une famille absente est écrite | RAS — onglets accessibles | RAS — historique non raccordé est dit |
| Paramètres — Règles | RAS — texte long, `demo/013` | RAS — lecture, pas une grille de champs | RAS — pas d’action d’enregistrement | RAS — onglet Règles | RAS — reste dans Paramètres | RAS — `demo/031`, `demo/049` | RAS — corps 12 px minimum | RAS — on sait que ce n’est pas éditable ici | RAS — titres de sections | RAS — pas d’état d’erreur (lecture) |
| Paramètres — Notifications | UX-032 — le bloc Accès reste affiché sous l’onglet, `demo/014`, `demo/032`, `demo/050` | RAS — chaque règle a un libellé, un déclencheur et un public | UX-031 — pastille « LECTURE SEULE » alors que les interrupteurs s’enregistrent sur l’appareil | RAS — interrupteur `role="switch"` et case « E-mail (simulé) » | RAS — onglet Notifications | UX-025 — la dernière règle passe sous la barre, `demo/050` | RAS — interrupteurs `notif-switch` | RAS — la phrase dit que l’e-mail n’est pas envoyé | RAS — interrupteur nommé, case dans un libellé | RAS — règle active, coupée, e-mail grisé si la règle est coupée |
| Paramètres — Zones | UX-032 — `demo/015`, `demo/033`, `demo/051` | RAS — pas de formulaire : la phrase remplace la liste | RAS — pas de bouton créer | RAS — pas de sélecteur de zone | RAS — onglet Zones | RAS — la phrase tient en 390, `demo/051` ; le reste de page suit UX-025 | RAS — carte et titre habituels | RAS — « Le plan de zones n’est pas raccordé. Aucune liste canonique n’est exposée » | RAS — titre « Référentiel de zones » | RAS — l’absence de liste est écrite |
| Paramètres — Journal d’audit | UX-032 — `demo/016`, `demo/034`, `demo/052` | RAS — pas de saisie | RAS — pas de bouton d’export | RAS — pas de filtre | RAS — onglet Journal d’audit | RAS — pas de tableau, donc pas de colonnes qui débordent, `demo/052` | RAS — carte habituelle | RAS — « Historique persistant indisponible » | RAS — le titre et la phrase portent l’information, il n’y a pas d’en-têtes manquants | RAS — l’absence est écrite, pas une table vide |
| Paramètres — Préparer un compte | UX-032 — ce n’est pas un onglet Paramètres : bouton du bloc Accès, visible aussi quand l’onglet est Journal, `demo/017`, `demo/053` | RAS — nom, e-mail, rôle, périmètre, justification, via `Field` | UX-033 — « Préparer la création » a l’air prêt à vide | RAS — rôle et périmètre sont le `Select` existant | RAS — action dans Accès, pas une destination de la barre | RAS — pile en 390, champs en pleine largeur, `demo/053` | RAS — `Field` et `Select` | RAS — « Simulation locale · aucun compte réel n’est modifié » | RAS — chaque champ a son libellé ; l’erreur après envoi a `role="alert"` | RAS — confirmation si la demande est complète, erreurs si le motif est trop court |
| Paramètres — Préparer une désactivation | UX-032 — même bloc Accès, `demo/018`, `demo/054` | RAS — profil concerné et justification | UX-033 — « Préparer la désactivation » a l’air prêt sans motif | RAS — le profil est le `Select` existant | RAS — même bloc Accès | RAS — pile en 390, `demo/054` | RAS — bouton primaire : dans le miroir rien n’est désactivé, le texte le dit | RAS — « les comptes et les droits ne sont pas encore modifiés » | RAS — justification libellée | RAS — motif trop court refusé, puis phrase de confirmation |
| Registre | RAS — grille partagée, pas dans la barre (clé masquée) | RAS — recherche | RAS — une ligne ouvre le dossier | RAS — recherche, pas un filtre fantôme | UX-021 — `navigate('registry')` réécrit vers Dossiers | RAS — repli avec responsable (contrôle visuel) | RAS — même grille que le contrôle « grille du registre » | RAS — on cherche un dossier, on ne croit pas ouvrir un autre produit | RAS — champ de recherche libellé | RAS — aucun résultat a un texte |
| Notifications (cloche) | RAS — panneau ancré à la cloche | RAS — pas de saisie | UX-020 — la cloche est un `IconButton` masqué sous 700 px | RAS — aucun | UX-020 — seule entrée des notifications | UX-020 | RAS — même panneau | RAS — vide explicite dans `NotificationCenter` | UX-020 — plus de bouton, plus de nom accessible | RAS — vide, erreur, liste |
| Spécimen `/design-system` | RAS — page hors produit, lue dans `app/design-system/page.tsx` | RAS — les champs du spécimen sont des exemples | RAS — les variantes primaire, secondaire, discret sont côte à côte | RAS — le `Select` Behira y est montré | RAS — pas dans la barre produit (contrôle visuel) | RAS — pas une capture d’atlas ; la page suit `.content` | RAS — c’est la référence, pas une variante | RAS — légendes à côté des exemples | RAS — spécimen non exposé comme tâche | RAS — pas d’état métier |
| Menu Plus | RAS — panneau, `demo/067` | RAS — pas un formulaire | RAS — chaque entrée est un bouton | RAS — aucun | RAS — Plus regroupe Coûts, Utilisateurs, Registre | UX-025 — `demo/095` coupe l’entrée sous la barre | RAS — mêmes libellés que les écrans | RAS — on voit où mène chaque ligne | RAS — menu bouton avec nom | RAS — fermé par défaut |

## 7. Passe visuelle — constats à partir de UX-025

Les UX-001 à UX-024 restent valables. Les captures qui les montrent sont citées dans la matrice. Ici, seulement ce que l’atlas ajoute.

### UX-025 — Le bas de page mobile passe sous la barre de navigation

- Écrans : tous, en dessous de 700 px. Profils : tous. Largeurs : 390 et 360. Catégorie : responsive. Gravité : majeur.
- Constat : sous 700 px la navigation est fixe en bas, haute de 72 px (`globals.css` vers la media query 700 px). `.content` ne réserve que 45 px en bas. Les dernières lignes et les boutons sont recouverts. Captures : `demo/083_facility-manager_mobile_accueil.jpg` (le bouton « Soumettre à l’Administration » est coupé), `demo/040_administration_mobile_dossiers.jpg`, `demo/095_facility-manager_mobile_plus.jpg`.
- Correction : réserver au moins la hauteur de la barre (72 px + safe area) sous le contenu. Ne pas changer la barre elle-même. Même lot que UX-020.
- Fichiers : `app/globals.css`.
- Régression : ne pas recouvrir le bandeau d’accueil.

### UX-026 — Le compteur de zones contredit les pastilles

- Écran : Accueil Rondes & Assistance. Profil : R. Largeurs : 1440, 834, 390. Catégorie : UX. Gravité : majeur.
- Constat : `demo/142_agente-rondes-assistance_desktop_accueil.jpg` affiche « 4 / 6 contrôlées » alors que deux zones seulement sont « Terminé » (Atrium « À vérifier », Jardinières « En cours », Terrasse et Parking « À faire »). Le compteur est en dur, comme la liste (UX-013). Même décalage sur `demo/145` et `demo/148`.
- Correction : avec UX-013. Tant que la liste n’est pas une source réelle, ne pas afficher un compteur qui ne compte pas les pastilles.
- Fichiers : `app/page.tsx` (`RoundsAssistanceWorkspace`).

### UX-027 — « Valider la maquette » est actif sur une synthèse vide

- Écran : maquette WILO, étape synthèse. Profil : W en démonstration. Largeurs : toutes. Catégorie : bouton. Gravité : majeur.
- Constat : `demo/123_agent-eau-incendie_desktop_rondes-wilo-01-eau-etape-5.jpg`. Les étapes 1 à 4 sont marquées faites, la synthèse dit « — bar », « — % », « 0/6 » et « Contrôle incomplet », la case de confirmation est vide, et « Valider la maquette » reste cliquable (`EauRounds.tsx`, le bouton d’envoi n’a pas de `disabled`).
- Correction : avec UX-008. Désactiver ce bouton dans les mêmes cas que le connecté refuse l’envoi. Ne pas enregistrer.
- Fichiers : `app/components/EauRounds.tsx`.

### UX-028 — « Transmettre » a l’air prêt sans le motif de photo

- Écran : saisie rapide RND-LET. Profil : R. Largeurs : toutes. Catégorie : bouton. Gravité : mineur.
- Constat : `demo/144_agente-rondes-assistance_desktop_rondes.jpg`. Le champ « Photo non jointe — motif obligatoire » est vide et « Transmettre à Facility Manager » n’est pas désactivé pour ça (`page.tsx`, `disabled` ne regarde que le brouillon, l’envoi et l’état transmis). La validation native bloque peut-être le submit, mais le bouton a l’air disponible. Même motif que UX-012 sur un autre formulaire.
- Correction : désactiver le bouton quand le motif obligatoire est vide, avec la phrase déjà prévue. Ne pas changer la charge utile.
- Fichiers : `app/page.tsx`.

### UX-029 — Le toast de succès recouvre le bouton de la ronde

- Écran : WILO connecté après envoi. Profil : W. Largeurs : 1440 et 380. Catégorie : mise en page. Gravité : mineur.
- Constat : `connecte/wilo-1440.jpg`. `.prototype-success` est fixe en bas à droite et passe sur le bouton (il reste « Ronde trans »). Le bandeau dit pourtant 72 % et « 6 conformes sur 6 ».
- Correction : le toast ne doit pas couvrir l’action principale. Le décaler au-dessus de la barre mobile et de la rangée d’actions, ou le mettre dans le flux sous le formulaire. Texte inchangé.
- Fichiers : `app/globals.css` (`.prototype-success`).

### UX-030 — La bulle de saisie recouvre les boutons d’IRR

- Écran : IRR-01, synthèse. Profil : W. Largeurs : 1440 et 380. Catégorie : formulaire. Gravité : mineur.
- Constat : `connecte/irr-1440.jpg` et `connecte/irr-380.jpg`. `#input-guard-message` est fixe, centré, à 96 px du bas (`globals.css`). Sur l’étape synthèse elle se pose sur « ← Précédent » et « Terminer la ronde ». En 380 px le fil ne montre que trois puces alors que la page est à l’étape 4 (déjà UX-017 : il faut faire défiler).
- Correction : ancrer le message au champ, ou le réserver au-dessus des actions, avec `role="status"`. Ne pas changer `input-rules`.
- Fichiers : `app/components/InputGuard.tsx`, `app/globals.css`.

### UX-031 — « Lecture seule » alors que les notifications se règlent

- Écran : Paramètres, onglet Notifications. Profil : Administration, démonstration. Largeurs : 1440, 834, 390. Catégorie : UX. Gravité : majeur.
- Constat : `demo/014`, `demo/032`, `demo/050`. L’en-tête affiche « LECTURE SEULE » dès que l’onglet n’est pas Accès (`ParametersWorkspace.tsx`), mais `ErrorNotificationRules` est monté avec `canEdit`. Les interrupteurs et « E-mail (simulé) » s’enregistrent sur l’appareil.
- Correction : retirer la pastille sur cet onglet, ou vraiment verrouiller les interrupteurs. Ne pas envoyer d’e-mail.
- Fichiers : `app/components/ParametersWorkspace.tsx`, `app/components/NotificationCenter.tsx`.

### UX-032 — L’onglet Paramètres ne remplace pas la page

- Écran : Paramètres Administration, démonstration. Largeurs : 1440, 834, 390. Catégorie : mise en page. Gravité : majeur.
- Constat : `page.tsx` rend `AccessWorkspace` sous `ParametersWorkspace` pour l’Administration en démonstration. Zones, Journal et Notifications ne montrent qu’une carte, puis tout le bloc comptes. `demo/015`, `demo/016`, `demo/017`, `demo/018`, `demo/052`, `demo/053`. « Préparer un compte » et « Préparer une désactivation » ne sont pas des onglets : ce sont les deux boutons de ce bloc, déjà visibles quand l’onglet affiché est Journal.
- Correction : le contenu de l’onglet occupe la page. Le bloc Accès reste sur l’onglet Accès.
- Fichiers : `app/page.tsx`.

### UX-033 — « Préparer » a l’air prêt alors que le motif est vide

- Écran : bloc Accès, création et désactivation. Profil : Administration. Largeurs : toutes. Catégorie : bouton. Gravité : mineur.
- Constat : `demo/017`, `demo/018`, `demo/053`, `demo/054`. « Préparer la création » et « Préparer la désactivation » sont actifs sans nom ni justification. Le refus n’arrive qu’après le clic (`validateAccessCreate` / `validateAccessAction`). Même idée que UX-027. La mention « Simulation locale » est juste : aucun compte n’est créé.
- Correction : désactiver le bouton tant que les champs exigés sont vides, ou le dire avant le clic. Ne pas créer de compte.
- Fichiers : `app/components/AccessWorkspace.tsx`.

### Ce qui a été regardé et ne devient pas un constat

- `connecte/wilo-pressure-1440.jpg` montre 2,8 bar hors plage 4,5–5,5 et un second relevé au format du navigateur (mm/dd/yyyy). La plage est celle du connecté (UX-008 à l’envers : ici c’est le bon formulaire). Le format de l’input date suit la locale du poste de capture, pas un libellé en dur. Non retenu.
- `demo/103_agent-electricite_desktop_rondes-unique-etape-6.jpg` : « 09/30/2026 » et « 12:23 PM » sont le même input natif. Non retenu.
- Bandeau navy « au milieu » de `demo/018` : artefact de capture pleine page sur un en-tête fixe. Non retenu.
- Double libellé « Arbitrages » sur `demo/001` et `demo/003` : le bandeau est celui que DEC-023 conserve. Non retenu comme défaut à corriger.

