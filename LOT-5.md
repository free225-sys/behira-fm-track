# LOT-5 — Responsive, chrome fixe, paramètres

Branche `grok/audit-ui-2026-09-30`. UX-016, UX-017, UX-020, UX-023, UX-025, UX-031, UX-032, UX-033, UX-034, puis UX-036, UX-037, UX-038.

UX-019 reste hors lot (DEC-023). Les bandeaux navy d’Accueil et de Dossiers ne sont pas touchés.

La ronde ascenseurs du porteur n’est pas dans ce miroir et n’est pas recréée. Ce lot modifie des composants qu’elle utilise déjà :

- `RoundStepRail` : le rail défile jusqu’à l’étape active quand elle sort de l’écran (UX-036). L’ordre des étapes et les conditions d’avancement ne changent pas.
- `StartRoundPicker` : la ronde unique (GE-01, RND-LET) a le libellé au-dessus de la valeur, sans bord de champ (UX-034). `legend` et `RoundChoiceId` du lot 4 sont inchangés.
- La pastille « Démo » (`RoundModeBadge`) n’est pas réécrite. Seule la règle `.round-pilot-header > .badge` change (UX-037) : plus de `flex-basis:100%` sous 640 px.

## UX-016 — Plus de hero navy de ronde

Aucun JSX n’utilise `.surpresseur-hero`. Le dégradé `#0f2a47 → #174b76` est retiré. La dernière déclaration reste `background:transparent`, et `margin:0 0 14px` reste, pour le contrôle visuel.

## UX-017 et UX-036 — Rail atteignable

La cible du rail est à 44 px. Les libellés longs continuent de passer à la ligne (`.connected-round-progress`). La chaîne `.surpresseur-progress button{flex:0 0 112px}` reste : le contrôle visuel la lit. Sous 390 px, `RoundStepRail` fait défiler le rail jusqu’à l’étape active, sans masquer les autres libellés.

## UX-020 — Cloche et boutons de panneau

Sous 700 px, `.icon-button{display:none}` et `.panel-head button{display:none}` sont retirés. La cloche et les actions d’en-tête restent visibles, en 44 px. Les notifications ne sont pas déplacées.

## UX-023 — Titre et cartes de contrôle

`.topbar h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}` reste pour le grand écran. À partir de 834 px, le titre passe à la ligne. Sous 430 px, `.control-choice-grid` est une colonne (`minmax(0, 1fr)`). Les puces DEC-020 restent à 44 px.

## UX-025 — Réserve sous le contenu

La barre mobile n’est pas modifiée (72 px). `.main-column{padding-bottom:92px}` reste. `.content` réserve en plus `72px + env(safe-area-inset-bottom)`, après la règle qui ne laissait que 45 px. Le bandeau d’accueil n’est pas recouvert : seule la réserve du bas change.

## UX-031 — « Lecture seule » ne contredit plus les notifications

La pastille reste sur Règles, Zones et Journal. Elle n’est plus affichée sur Accès ni sur Notifications, où les interrupteurs s’enregistrent sur l’appareil. Aucun e-mail n’est envoyé.

## UX-032 — L’onglet occupe la page

`AccessWorkspace` n’est plus un frère de `ParametersWorkspace`. En démonstration Administration, les profils sont passés à l’onglet Accès. Les autres onglets ne montrent plus le bloc comptes.

## UX-033 — « Préparer » inactif tant que la demande est vide

« Préparer la création » suit `validateAccessCreate` (nom ≥ 3, e-mail, justification ≥ 20). « Préparer la désactivation » et « Envoyer la proposition » suivent `validateAccessAction` (profil et justification ≥ 20). Aucun compte n’est créé.

## UX-034 — Sélecteur à une ronde

Le libellé (`Ronde à effectuer`, ou `File à examiner` côté FM) est au-dessus. La valeur n’a pas de bord de saisie et n’ouvre pas une liste d’une seule option.

## UX-037 — Pastille « Démo » à la taille du texte

Sous 640 px elle ne prend plus toute la ligne.

## UX-038 — Titre de la carte quand la preuve est acceptée

`nextActionFor` : en validation, une preuve acceptée (`proof` et pas `proofPending`) donne « Clôturer le dossier ». ANO-0231 est ce cas. Une preuve encore en attente reste « Contrôler la preuve ». Le libellé serveur `GE01_REVIEW_PROOF` n’est pas changé. Le test de fiche passe le titre en propriété : il ne dépend pas de cette fonction.

## Fichiers

- `app/globals.css`
- `app/page.tsx`
- `app/components/ParametersWorkspace.tsx`
- `app/components/AccessWorkspace.tsx`
- `app/components/shared/RoundStepRail.tsx`
- `app/components/shared/StartRoundPicker.tsx`
- `scripts/verify-lot5-ui.mjs`
- `package.json` (`verify:lot5`)

## Scripts

`node scripts/verify-lot5-ui.mjs` contrôle les chaînes ci-dessus. `audit-visual-styles` n’est pas modifié : les chaînes qu’il exige (réserve 92 px, titre tronqué au-dessus de 834, rail `flex:0 0 112px`, hero transparent) sont conservées. Les contrôles de lot sont relancés sur ce commit.
