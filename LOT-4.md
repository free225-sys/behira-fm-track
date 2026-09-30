# LOT-4 — Files, accueil terrain, destinations

Branche `grok/audit-ui-2026-09-30`. UX-013, UX-014, UX-015, UX-021, UX-022, UX-024, UX-026.

La ronde ascenseurs du porteur (`AscRound.tsx`, `ElecRoundDesk.tsx`, `app/lib/asc/report.ts`, `scripts/verify-asc-ui.mjs`) n’est pas dans ce miroir et n’est pas recréée. Aucun planning d’ascenseur n’est inventé sur l’accueil Électricité : `ROUND_CHOICES.electricite` reste GE-01 seul. ASC-A1 et ASC-A2 restent le périmètre déjà écrit de l’agent, pas une nouvelle ronde.

## UX-013 et UX-026 — L’accueil R n’invente plus une ronde

`RoundsAssistanceWorkspace` ne dit plus « Zones du jour » ni « Ronde du 16 septembre », et n’affiche plus « 4 / 6 contrôlées ». La liste est un exemple d’écran, en lignes non cliquables. La phrase dit qu’aucun planning de zones n’est raccordé. Le bouton ouvre la saisie RND-LET.

## UX-014 — Une file FM à la fois, cinq historiques

Le Facility Manager choisit avec le même `StartRoundPicker` que l’agent (`legend="File à examiner"`, le défaut reste « Ronde à effectuer »). Une seule file est montée : GE-01, WILO-01, RIA-01, IRR-01, ASC. Les circuits ne sont pas fusionnés : GE reste `Ge01ReportInbox`, RIA reste `RiaRoundSpace`, WILO, IRR et ASC restent `WiloRoundInbox`.

`WiloRoundInbox` accepte `equipment="ASC"` et appelle `get_asc_rounds`. Ce miroir n’a pas la fonction dans `database.types.ts` (rien n’est ajouté dans `supabase/`). L’appel est donc typé comme `get_wilo_rounds` pour que `tsc` passe ici ; la chaîne envoyée reste `get_asc_rounds`. La lecture et le retour passent toujours par `examine_wilo_report`, comme IRR. Si la base du porteur a déjà ce cas et le type, garder sa version du composant et reporter seulement le sélecteur de `page.tsx` (`FacilityRoundQueues`, `FM_REVIEW_QUEUES`).

Composants que la ronde ascenseurs utilise déjà et que ce lot touche : `WiloRoundInbox`, `StartRoundPicker` (propriété optionnelle `legend`, et `'ASC'` dans `RoundChoiceId`). `RoundStepRail` n’est pas modifié.

## UX-015 — Plus de « Sain » dans le secours

DEMO-ESP et DEMO-RND portent `Disponible`, le libellé déjà affiché pour un équipement disponible. Pas de nouveau calcul de score. Surveillance, Intervention et Critique du même secours ne sont pas renommés ici.

## UX-021 — « Ouvrir les coûts » ouvre les coûts

`navigate('costs')` n’est plus réécrit vers Dossiers. L’écran `CostsWorkspace` déjà écrit s’affiche, avec le seuil reçu. Le bouton des paramètres dit « Ouvrir les coûts ». `navigate('registry')` ouvre toujours Dossiers, onglet Tous. Coûts et Registre restent hors de la barre.

## UX-022 — Les boutons de décision démo n’ont plus l’air actifs

« Demander un complément », « Refuser » et « Valider » / « Soumettre à l’Administration » sont désactivés, avec « Décision non disponible dans cet écran ». Ils ne font plus `setDecisionDone`. Pas de second circuit : le connecté reste `ConnectedCostsWorkspace` sur la fiche. La qualification démo (« Qualifier et affecter ») n’est pas ce bloc.

## UX-024 — Le seuil n’est pas recopié

`DossierQueueRow` n’a plus `threshold = 400000`. L’écran Dossiers affiche `decisionThreshold`, déjà passé par la page.

## Fichiers

- `app/page.tsx`
- `app/components/WiloRoundInbox.tsx`
- `app/components/shared/StartRoundPicker.tsx`
- `app/components/DossiersWorkspace.tsx`
- `app/components/ParametersWorkspace.tsx`
- `app/globals.css` (lignes d’exemple, plus des boutons)
- `scripts/verify-lot4-ui.mjs`
- `package.json` (`verify:lot4`)

## Scripts

`node scripts/verify-lot4-ui.mjs` contrôle les chaînes ci-dessus. Les contrôles de lot (tsc, audit visuel, personas, auth, lot 0, lot 1, WILO, input-rules, anti-zombie, eau connectée, IRR, choix de ronde, fiche dossier) sont relancés sur ce commit.
