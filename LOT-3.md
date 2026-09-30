# LOT-3 — La saisie dit la même chose que l’envoi

Branche `grok/audit-ui-2026-09-30`. UX-007, UX-008, UX-009, UX-010, UX-012, UX-018, UX-027, UX-028, UX-029, UX-030, UX-035.

La reprise du lot 2 est le commit précédent (`98cc13e`). Ce lot ne la modifie pas.

Les codes envoyés ne changent pas (`yes`, `no`, `unknown`, énumérations). `lib/ria/report.ts` et `lib/irr/report.ts` ne sont pas touchés. DEC-020 reste les trois boutons des contrôles de base WILO. DEC-022 n’est pas modifié. Les clés de brouillon non plus. Les rondes de l’électricien ne changent que par le rail d’étapes (UX-035).

## UX-007 — Une pastille

`RoundModeBadge` : « Démo » (neutre) si rien n’est enregistré, « Saisie réelle » (bleu) si la persistance est active, « Saisie recette » (orange) en recette. Casse de phrase, taille du corps, tons de badge déjà là. Pas de couleur nouvelle.

Elle remplace les pastilles en capitales de WILO, RIA, IRR, de la maquette Eau et de RND-LET. La pastille GE-01 « DÉMO SANS SAUVEGARDE » n’est pas modifiée. Le badge orange « RECETTE — DONNÉES FICTIVES » en tête d’IRR est retiré : la pastille orange suffit. La case d’attestation reste.

## UX-008 et UX-027 — La maquette Eau suit le connecté

`EauRounds` n’enregistre toujours rien.

- Pression : plage 4,5–5,5 bar, critique sous 4 ou au-dessus de 6, même fonction `wiloPressureState`. Le second affichage de plage est retiré (la plage est sous le champ).
- Niveau : 0 à 100 %.
- Type de ronde : aucun choix présélectionné.
- Contrôles : Conforme / Anomalie / Non vérifié, avec motif si non vérifié. Plus de bascule.
- Score : carte compacte « Indisponible », sans État, Variation ni Fraîcheur.
- Cadence RIA de la maquette : « à confirmer », comme le connecté.
- « Valider la maquette » est désactivé tant que les mesures, les six contrôles, la confirmation et, s’il y a un écart, le motif de photo manquent. La maquette incendie attend au moins la confirmation.

## UX-009 — Réarmement seulement si la réponse est oui

Le titre « Réarmement provisoire » n’apparaît que si `REARMEMENT` vaut `yes`, avec la phrase déjà écrite. Sinon : « Aucun réarmement déclaré », ou la surveillance déduite des réponses déjà saisies (pompe P1 non disponible, pression hors plage). Aucun événement n’est créé. La maquette, qui ne pose pas la question, dit « Aucun réarmement déclaré ».

## UX-010 — Le même geste « je ne peux pas vérifier »

RIA et IRR reprennent `ObservationChoices` de `WiloSupplement` : pas de présélection, lien hors des options (« Je ne peux pas vérifier » / « Je peux finalement vérifier »), motif, et pour une mesure « Mesure impossible à relever ». Les contrôles de base WILO restent DEC-020.

## UX-012 et UX-018 — WILO

« Terminer la ronde » est désactivé dans les mêmes cas que le `return` déjà écrit (incomplet, confirmation, recette non attestée, motif de photo, ronde pas prête). Le texte d’incomplet reste visible. La condition d’envoi n’est pas assouplie.

Les refus de WILO et de la saisie rapide ne passent plus seulement par le flash. Le même texte est dans la carte, `role="alert"`.

## UX-028 — Saisie rapide

« Transmettre à Facility Manager » est désactivé tant que le motif de photo est vide. La phrase déjà prévue est visible (`role="status"`). La charge utile ne change pas.

## UX-029 — Le succès ne couvre plus le bouton

`.prototype-success` est dans le flux, sous le formulaire. Le texte ne change pas.

## UX-030 — La bulle de saisie

`#input-guard-message` reste `role="status"`. Elle s’ancre au-dessus du champ qui a refusé le caractère, au lieu du bas de l’écran. `input-rules` n’est pas modifié.

## UX-035 — Un rail

`RoundStepRail` sert à GE-01, WILO, RIA, IRR et à la maquette. Même classe `.surpresseur-progress.connected-round-progress`. L’ordre des étapes et la limite de retour (étape courante, ou plus loin si l’écran le permettait déjà) ne changent pas.

## Scripts ajustés

- `scripts/verify-personas.mjs` : le score de la maquette n’exige plus Variation / Fraîcheur. Il exige la plage 4,5 à 5,5 et « Indisponible ». La phrase de consultation est lue dans `DossierContinuity`.
- `scripts/audit-visual-styles.mjs` : l’étape future désactivée est vérifiée sur `RoundStepRail`. La phrase « Consultation uniquement… » est vérifiée dans `DossierContinuity` (elle a quitté `page.tsx` à la reprise du lot 2).
- `scripts/verify-round-choice-ui.mjs` : la pastille visible en recette est « Saisie recette », une seule fois. La clé de brouillon `:recette` ne change pas.
- `scripts/verify-irr-ui.mjs` : le geste « Je ne peux pas vérifier » remplace le bouton « Non vérifié ». La charge utile `unknown` est inchangée.
- `scripts/verify-connected-water-ui.mjs` : « Terminer la ronde » en recette est désactivé tant que l’attestation manque, comme RIA. Le script accepte `PLAYWRIGHT_MODULE` et `CHROME_PATH`, comme la recette IRR.

## Fichiers

- `app/components/shared/RoundModeBadge.tsx`
- `app/components/shared/RoundStepRail.tsx`
- `app/components/shared/index.ts`
- `app/components/ui/badge.tsx` (classe optionnelle, aucun ton nouveau)
- `app/components/EauRounds.tsx`
- `app/components/RiaRound.tsx`
- `app/components/IrrRound.tsx`
- `app/components/WiloSupplement.tsx` (`ObservationChoices` exporté, le rendu WILO est le même)
- `app/components/Ge01Pilot.tsx` (rail seulement)
- `app/components/InputGuard.tsx`
- `app/page.tsx`
- `app/globals.css`
- scripts cités
