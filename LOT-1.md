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
- E et R n’ouvrent pas un menu d’une seule ligne : le même habillage, en lecture seule (« Ronde à effectuer : GE-01 · Électricité » ou « RND-LET · Rondes », aide « Seule ronde de votre périmètre »). À l’accueil, une seule ronde hors planning se lance sans liste d’un élément.

## UX-003 — Historique dans la colonne de droite

- WILO connecté : `WiloRoundInbox` est dans `surpresseur-aside`, après « À surveiller » et le score.
- RIA agent (`columnHistory`) : formulaire à gauche, score puis historique à droite. L’examen d’un rapport reste dans cette carte.
- IRR : formulaire à gauche, carte « IRR-01 · Indisponible », puis historique. La carte du formulaire ne garde pas la hauteur minimale des autres rondes (`min-height: 0`). Pas de fausse file.
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

- UX-004 à UX-018, UX-020 à UX-033 : lots 2 à 5. UX-029 et UX-030 sont rangés au lot 3 ; UX-031 à UX-033 au lot 5. Pas traités dans cette reprise.
- UX-019 : rejeté. DEC-023. Les bandeaux navy d’Accueil et de Dossiers n’ont pas été touchés.
- UX-005 : autorisation notée pour le lot 2 (`source_report_id` seulement). Pas de changement de `data.ts` dans ce lot.
- UX-014 : files FM, lot 4.

## À regarder

- Accueil Eau, bouton « Ronde hors planning », choix IRR-01, page ouverte sur IRR-01.
- Changement WILO → IRR : la saisie IRR est encore là, le sélecteur « Espace de travail » (Recette) n’a pas bougé.
- 1440 : historique WILO, RIA et IRR dans la colonne de droite. 390 : sous le formulaire.
- Le bandeau bleu marine de l’accueil est toujours là.

## Reprise (revue Claude)

- B1. Le sélecteur n’est plus dans un `<label>` (`Field`). Le libellé est un `span`, le bouton a `aria-labelledby`. Choisir une ronde ferme la liste.
- B2. `EauRoundDesk` n’écrit plus une ref pendant le rendu et ne fait plus `setState` dans un effet. Le brouillon de démonstration est créé dans `useState`. La ronde initiale est reprise pendant le rendu.
- M1. IRR en démonstration : `OfflineSyncStatus` avec `enabled={false}` (« Mode démonstration »), badge « Démo », fin de ronde « Simulation de ronde terminée — aucune donnée enregistrée ». La charge utile connectée est la même.
- M2. GE-01 et RND-LET : lecture seule, sans chevron. Même règle à l’accueil s’il n’y a qu’une ronde hors planning.
- M3. Colonne IRR : score « Indisponible », puis historique. La carte ne s’étire plus.
- M4. Liste « Choisir la ronde » : encre `--foreground` ; option en cours, titre, aide et pastille en blanc sur `--teal`. Survol : `--surface-muted`. Le test mesure le contraste (≥ 4,5).
- m1. « Nettoyage et jardinage », plus « Cleaning ».
- m2. « Ronde à effectuer » et « Scénario de démonstration » sont sur la même barre, alignés en haut.
- m3. `verify-connected-water-ui` passe un historique à `LegacyReport` et vérifie sa place à 1440 et à 380.
- Les trois formulaires Eau restent montés. Chacun charge sa liste une fois. `synchronize` n’est pas appelé une seconde fois pour autant.
- Prestataires : le formulaire dit déjà « Les prestataires n’ont pas d’accès direct ». Aucun profil prestataire n’a été ajouté. Pas de changement de libellé dans cette reprise.
- Matrice : les cinq cases conditionnelles de Paramètres sont revues (code + `demo/014` à `018`, `032` à `036`, `050` à `054`). UX-031, UX-032, UX-033. UX-029 et UX-030 passent au lot 3.

### Comment `verify-round-choice-ui.mjs` a été lancé

Depuis `/tmp/behira-fm-track`, avec le Playwright déjà installé dans `tests/browser` et Chrome du bac à sable (pas le module `/.analysis_runtime`, que ce script n’utilise pas) :

```bash
PLAYWRIGHT_MODULE=file:///tmp/behira-fm-track/tests/browser/node_modules/playwright/index.mjs \
CHROME_PATH=/tmp/chrome-root/opt/google/chrome/chrome \
node scripts/verify-round-choice-ui.mjs
```

Sans ces variables, le script prend les mêmes chemins par défaut. L’échec à la ligne 99 venait du `<label>` : après le choix, la liste restait ouverte, le clic suivant la fermait, et l’option n’était plus là. Ce n’était pas un écart de Playwright.

