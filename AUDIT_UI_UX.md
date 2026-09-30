# AUDIT UI/UX — BEHIRA FM Track

Phase A uniquement. Aucun correctif de code dans ce document.

- Référence : `behira-ui-source.zip`, `VERSION.txt` — branche porteur `integration/livraison1-design077`, commit `c8821ad` (arbre `dbc87bd473f6cfa3921272a739682784e92aae40`).
- En cas d’écart avec GitHub (`main` du 29/08, `mirror/checkpoint-a2373c2`), le zip fait foi.
- `atlas-captures.zip` n’était pas dans la livraison. Les constats viennent du code du zip, pas d’une reprise visuelle aux trois largeurs. Les largeurs citées sont celles où la structure ou le CSS produit le défaut. Une passe capture reste nécessaire avant de clore un lot.
- Hors périmètre : `supabase/`, rôles, permissions, statuts, calculs, formats, brouillons, synchronisation, mode Recette. DEC-020 (trois choix sur les cartes de contrôle) et DEC-022 (questions WILO déduites) restent en place.

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

## 4. Lots

Chaque lot met à jour le script de contrôle s’il casse, et le dit dans `LOT-N.md`. Contrôles à garder verts : `audit-visual-styles`, `verify-personas`, `verify-auth`, `verify-lot0-ui`, `verify-lot1-ui`, `verify-wilo-observations`, `verify-input-rules`, `verify-anti-zombie.ts`, `verify-connected-water-ui`, `verify-irr-ui`.

### Lot 1 — Choisir la ronde et ranger l’historique

UX-001, UX-002, UX-003. Couvre les §3.1, §3.2 et §3.3.

Acceptation : hors planning ouvre un choix dont les options sont les rondes du profil ; la page s’ouvre sur ce choix ; WILO, RIA et IRR partagent ce comportement ; l’historique WILO est dans la colonne droite sur 1440 et sous les cartes sur 390 ; un brouillon déjà saisi survit au changement d’onglet ; aucun code de réponse ni appel serveur nouveau.

### Lot 2 — Fiche dossier lisible

UX-004, UX-005, UX-006, UX-011.

Acceptation : un bouton grisé dit pourquoi et qui agit ; la fiche montre la mesure si elle est déjà dans un rapport chargé, sinon le manque est écrit ; l’attente d’affectation a un statut ; une seule action principale.

### Lot 3 — Formulaires de ronde alignés

UX-007, UX-008, UX-009, UX-010, UX-012, UX-018.

Acceptation : la maquette Eau ne contredit plus le connecté ; le réarmement ne s’invente pas ; RIA et IRR suivent le geste WILO pour « non vérifié » sans toucher DEC-020 ni DEC-022 ; « Terminer » reflète la condition d’envoi déjà codée ; pastilles harmonisées.

### Lot 4 — Files et accueil terrain

UX-013, UX-014, UX-015.

Acceptation : l’accueil R ne présente plus une ronde du 16 septembre comme réelle ; le FM voit une file à la fois ; « Sain » ne réapparaît pas dans le secours démo.

### Lot 5 — Responsive des rondes

UX-016, UX-017, puis contrôle 1440 / 1024 / 834 / 390 / 360 des écrans touchés par les lots 1 à 4.

Acceptation : pas de second bandeau navy ; cibles 44 px ; pas de débordement horizontal de page sur les formulaires WILO, RIA, IRR, GE.

### Lot 6 — Seconde passe

Réinspection de l’inventaire. Écarts nouveaux seulement. Pas de chantier cosmétique hors constat.

## 5. Questions

1. L’atlas (1440, 834, 390, plus les trois vues préproduction) n’était pas joint. Les lots pourront être revus au code et aux contrôles, pas à ces images, tant qu’il n’est pas là. Faut-il l’attendre avant le lot 1, ou avancer et comparer quand il arrive ?
2. Pour UX-005 : confirmer que l’on n’ajoute pas d’appel serveur. L’affichage se limite aux checks déjà présents en mémoire (rapport lié par `anomalyReference`). Si aucun rapport n’est chargé sur la fiche, la ligne « non reliée » suffit-elle ?
