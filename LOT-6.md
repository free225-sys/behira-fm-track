# LOT-6 — Seconde passe

Branche `grok/audit-ui-2026-09-30`. UX-039, UX-040, puis UX-041 à UX-046 trouvés pendant la passe. UX-019 reste hors lot (DEC-023).

La ronde ascenseurs du porteur (`AscRound.tsx`, `ElecRoundDesk.tsx`, `app/lib/asc/report.ts`, `scripts/verify-asc-ui.mjs`) n’est pas dans ce miroir et n’est pas recréée. `RoundStepRail` est le composant partagé. Il porte déjà les classes `surpresseur-progress connected-round-progress`. UX-039 change la coupure des libellés de ce rail : la ronde ascenseurs en hérite, sans autre fichier. L’ordre des étapes et les conditions d’avancement ne changent pas. Aucun planning d’ascenseur n’est ajouté.

## UX-039 — Coupure entre les mots

`.connected-round-progress button b` n’utilise plus `overflow-wrap:anywhere`. La règle est `overflow-wrap:normal`, `word-break:normal`, `hyphens:auto`.

Vu à 390 : GE-01 affiche Contexte, Observations, « Essai & AUTO » (le « & » sépare les deux lignes), Récapitulatif hors champ tant que l’étape n’est pas l’étape active (le rail défile, UX-036). WILO affiche Contexte, Pression, Pompes ; Sécurité et Synthèse défilent. RIA en démonstration affiche Local et Coffret (la saisie connectée à cinq étapes n’est pas montée sans persistance). IRR affiche « Local » puis « technique », pas une coupure au milieu du mot.

## UX-040 — « Aucun import »

`.section-heading.round-heading` passe à la ligne. La pastille reste entière. Vu à 390 et à 834, sous « SAISIE DIRECTE · DÉMONSTRATION ».

## UX-041 — Pastille « Normale »

Sous 700 px, `.anti-zombie-summary-head > .badge` prend la ligne suivante au lieu de la colonne de 34 px. Ouvert dans « Détails de traitement » à 360 : « Normale » est entier.

## UX-042 — Six étapes de la carte

Sous 430 px, `.dossier-steps` passe à la ligne. À 360, Constat, Qualification, Décision, Intervention, Preuve et Clôture restent dans la carte.

## UX-043 — Nom du compte

Sous 700 px le nom du sélecteur de persona passe à la ligne, cible au moins 44 px. Vu : Facility Manager Démo, Administration Démo, Agent Électricité Démo, Agent Eau & Incendie Démo, Agente Rondes & Assistance Démo.

## UX-044 — Pastilles des cartes Rondes

Sous 700 px, `.panel-head` passe à la ligne et la pastille directe n’ellipise plus. À 390, « RONDES » et « 2 dossiers » sont entiers. Les boutons d’en-tête restent affichés (lot 5). La règle globale `.badge .badge-label` (ellipse) n’est pas retirée.

## UX-045 — « Équipements » dans la barre

Sous 700 px le libellé de la barre ne déborde plus sur le voisin. La césure douce n’est injectée que dans `.nav-item-label` (`Équipe\u00AD` + `ments`). À 360 et 390 on lit « Équipe- » puis « ments », dans la case, au-dessus du bord de la barre de 72 px. À 1440 le mot est entier, sans trait. Le libellé des titres et de Plus ne change pas.

## UX-046 — Cycle de la fiche

Sous 600 px le numéro est au-dessus du mot. `overflow-wrap:anywhere` est retiré de `.dossier-workflow > div b`. À 360 et 390 : Constat, Qualification, Décision, Intervention, Preuve, Clôture, chacun entier.

## Passe

Cinq comptes, largeurs 1440, 1024, 834, 390, 360. Pas de débordement horizontal de page. Après défilement jusqu’en bas de la fiche, la dernière ligne est au-dessus de la barre de 72 px. Le format des champs date suit la locale du navigateur : non retenu, comme au §7. Un bandeau fixe photographié au milieu d’une page longue n’est pas un défaut.

| Écran | Compte | Constat |
|---|---|---|
| Arbitrages | A | RAS — bandeau navy conservé (DEC-023), score non calculable, pas de faux score |
| Accueil | F, E, W, R | RAS — score non calculable, texte d’insuffisance, nom du compte entier (UX-043) |
| Accueil R | R | RAS — exemple d’écran, pas une ronde du jour ; « RONDES » et « 2 dossiers » entiers (UX-044) |
| Dossiers, carte | F, A | UX-041 et UX-042 corrigés. Seuil affiché, pas une copie en dur dans le bouton |
| Fiche dossier | F | UX-046 corrigé. Titre ANO-0241. Bas de page dégagé de la barre |
| Rondes GE-01 | E | UX-039. Une seule ronde, libellé au-dessus, sans bord de champ |
| Rondes WILO, RIA, IRR | W | UX-039. RIA démo = Local / Coffret. Sélecteur WILO-01, RIA-01, IRR-01 |
| Rondes RND-LET | R | UX-040. « Aucun import » entier à 390 et 834 |
| File FM | F | RAS — pas de nouveau débordement. Le sélecteur « File à examiner » est celui du lot 4 |
| Équipements, Pilotage | F, A | RAS — pas de débordement de page |
| Paramètres | A | RAS — Accès seulement sur son onglet, Préparer inactif à vide (lot 5) |
| Coûts | A, depuis Règles | RAS à 390 et 1440 — seuil 400 000 FCFA, budget « Données insuffisantes ». Coûts n’est pas dans Plus (`hiddenNavKeys`) |
| Utilisateurs et droits | F, via Plus | RAS à 390 — annuaire de démonstration, pas de compte Auth |
| Cloche | F | RAS — visible, lot 5 |
| Barre du bas | F, A | UX-045. E, W et R n’ont que Accueil et Rondes : RAS |
| Clavier | F | RAS — Tab donne un contour 2 px plein, couleur de l’anneau de focus |

Aucun constat nouveau ne demande une décision du porteur.

## Fichiers

- `app/globals.css`
- `app/page.tsx` (césure douce du seul libellé de barre)
- `scripts/verify-lot6-ui.mjs`
- `package.json` (`verify:lot6`)
- `AUDIT_UI_UX.md` (§8 et bilan)

## Chaînes conservées

`.main-column{padding-bottom:92px}`, `.topbar h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`, `.surpresseur-progress button{flex:0 0 112px}`. Pas de `.icon-button{display:none}` ni de `.panel-head button{display:none}`.
