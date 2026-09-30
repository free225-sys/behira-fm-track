# LOT-1 — Choisir la ronde et ranger l’historique

Branche `grok/audit-ui-2026-09-30`. UX-001, UX-002, UX-003. UX-019 n’est pas traité : rejeté, consigné en DEC-023.

## UX-001 — Le choix de ronde est transmis

- `StartRoundPicker` reçoit les rondes du profil, dans cet ordre : W = WILO-01 · Eau, RIA-01 · Incendie, IRR-01 · Irrigation ; E = GE-01 · Électricité ; R = RND-LET · Rondes. Pas de ronde inventée. Le Facility Manager n’est pas dans ce lot (UX-014).
- L’accueil (`BuildingHealthCockpit`) appelle `onNavigate('report', { round: id })`. L’ancien `onSelect={() => onNavigate('report')}` est retiré.
- `navigate` enregistre `reportChoice`. La page Rondes s’ouvre sur cette ronde (`EauRoundDesk`, `initialRound`).
- Hors planning : le même sélecteur, rien n’est lancé tant qu’une option n’est pas choisie. Si le planning live ne contient que GE-01, la note le dit pour Eau et pour Rondes & Assistance, et propose les formulaires déjà livrés.
- Un seul composant pour l’accueil et la page Rondes. Sur la page, le déclencheur reprend les états du sélecteur « Espace de travail » : focus visible, survol, option sélectionnée, désactivé, erreur si aucune ronde.

## UX-002 — Un seul sélecteur, brouillon et Recette conservés

- L’agent Eau n’a plus les onglets `RiaRoundNavigation` ni ceux de la maquette (`showTabs={false}`). Le sélecteur de la page est le même `StartRoundPicker`, mêmes libellés, même ordre.
- WILO, RIA et IRR restent montés (`hidden`). Changer de ronde ne démonte pas le formulaire, n’appelle pas `deleteDraft`, et ne touche pas `isTest`.
- Connecté : les brouillons restent dans IndexedDB (`round:eau_incendie:IRR-01` et `:recette`, `ria:daily:v1`). Démonstration : la maquette Eau garde son état React ; IRR utilise un brouillon local qui n’envoie rien.
- E et R ont le même sélecteur, à une option (GE-01, RND-LET).

## UX-003 — Historique dans la colonne de droite

- WILO connecté : `WiloRoundInbox` est dans `surpresseur-aside`, après « À surveiller » et le score.
- RIA agent (`columnHistory`) : formulaire à gauche, score puis historique à droite. L’examen d’un rapport reste dans cette carte.
- IRR : formulaire à gauche, historique à droite. Pas de fausse carte.
- Sous 1100 px la grille existante passe à une colonne : formulaire, cartes, historique (`round-history` occupe toute la largeur de l’aside).
- Le Facility Manager garde ses files empilées (lot 4). GE-01 n’a pas reçu l’historique WILO.

## Fichiers

- `app/components/shared/StartRoundPicker.tsx`
- `app/components/shared/index.ts`
- `app/components/BuildingHealthCockpit.tsx`
- `app/components/EauRoundDesk.tsx` (nouveau)
- `app/components/EauRounds.tsx` (`asset`, `showTabs`)
- `app/components/RiaRound.tsx`
- `app/page.tsx`
- `app/globals.css`
- `scripts/verify-round-choice-ui.mjs` (nouveau)
- `package.json` (script `verify:round-choice`)
- `docs/design/DECISIONS.md` (DEC-023)
- `AUDIT_UI_UX.md` (v2)

## Scripts

- Ajout : `node scripts/verify-round-choice-ui.mjs` (ou `pnpm verify:round-choice`). Il choisit IRR-01 depuis l’accueil hors planning, vérifie l’ouverture, le brouillon (`round:eau_incendie:IRR-01:recette`), l’absence de `deleteDraft`, le badge Recette, et la place de l’historique à 1440 et 390.
- Inchangés, relancés verts : `audit-visual-styles`, `verify-personas`, `verify-auth`, `verify-lot0-ui`, `verify-lot1-ui`, `verify-wilo-observations`, `verify-input-rules`, `verify-anti-zombie.ts`, `verify-connected-water-ui`, `verify-irr-ui`.
- `verify-connected-water-ui` continue d’exporter `LegacyReport` : la signature a gagné `history`, le nom de fonction est le même.

## Reportés

- UX-004 à UX-018, UX-020 à UX-030 : lots 2 à 5, inchangés sauf les ajouts visuels UX-025 à UX-030 dans `AUDIT_UI_UX.md`.
- UX-019 : rejeté. DEC-023. Les bandeaux navy d’Accueil et de Dossiers n’ont pas été touchés.
- UX-005 : autorisation notée pour le lot 2 (`source_report_id` seulement). Pas de changement de `data.ts` dans ce lot.
- UX-014 : files FM, lot 4.

## À regarder

- Accueil Eau, bouton « Ronde hors planning », choix IRR-01, page ouverte sur IRR-01.
- Changement WILO → IRR : la saisie IRR est encore là, le sélecteur « Espace de travail » (Recette) n’a pas bougé.
- 1440 : historique WILO, RIA et IRR dans la colonne de droite. 390 : sous le formulaire.
- Le bandeau bleu marine de l’accueil est toujours là.
