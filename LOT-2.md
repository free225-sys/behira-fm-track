# LOT-2 — Fiche dossier lisible

Branche `grok/audit-ui-2026-09-30`. UX-004, UX-005, UX-006, UX-011. UX-034 et UX-035 sont consignés dans `AUDIT_UI_UX.md` (lots 5 et 3). Ils ne sont pas corrigés ici.

## UX-004 — Le bouton grisé dit pourquoi, et qui agit

- `permitted` n’a pas changé. Le bouton « Confirmer le diagnostic » (et les autres commandes du même panneau) n’est rendu que si l’étape est permise.
- S’il manque le commentaire, le bouton reste désactivé. Au-dessus : « Le commentaire est obligatoire. Acteur attendu : … ». L’acteur est celui du résumé déjà normalisé.
- Affectation : s’il existe des agents habilités et qu’aucun n’est choisi, la même ligne le dit. S’il n’y en a aucun, la phrase déjà là (« Aucun agent actif… ») reste la seule, pour ne pas doubler le statut.
- Traitement : « Choisissez la décision financière approuvée. » seulement s’il existe un coût approuvé non choisi. « Choisissez l’entreprise. » seulement s’il existe des entreprises et qu’aucune n’est choisie. « Aucun coût approuvé… » et « Aucune entreprise éligible… » ne sont pas doublés.
- Si l’utilisateur n’est pas l’acteur, la phrase reste visible : « Cette étape attend le diagnostic de l’agent affecté » ou « le Facility Manager », suivie de « Acteur attendu : … ». Pas de bouton à la place.

## UX-005 — La mesure d’origine, si le rapport est déjà chargé

- Seul changement de requête : `source_report_id` ajouté au `select` existant de `anomalies` dans `app/lib/supabase/data.ts`. Lecture seule. Aucun autre appel, aucun autre filtre.
- Les checks viennent de `checksByReportId`, déjà rempli par la requête `report_checks` des rapports chargés. Ils sont recopiés sur le dossier (`originChecks`), avec la référence du rapport si elle est dans ce même chargement.
- La fiche affiche, en lecture seule, chaque check qui a une valeur numérique : libellé, valeur, unité, état (Conforme, Alerte, Critique, Non applicable, Non vérifié). Un texte ou un booléen n’est pas converti en nombre. La description enregistrée n’est pas modifiée.
- Sans `sourceReportId` : « Mesure d’origine non reliée à cette fiche ». Identifiant présent mais rapport absent du chargement : « Rapport d’origine relié ; ses mesures ne sont pas disponibles sur cette fiche. » Rapport chargé sans mesure chiffrée : la référence, puis « Le rapport relié ne contient pas de mesure chiffrée. » Pas de navigation nouvelle vers la ronde.

## UX-006 — Une seule phrase d’attente

- Le bouton garde « Enregistrement… », `aria-busy`, et le double envoi déjà bloqué par `busy`.
- À côté, une seule phrase, `role="status"` : « Enregistrement en cours. Restez sur cette page. » Elle est écrite une fois dans `SavingStatus`.
- Même phrase sur l’affectation et le diagnostic, la clôture, la réception, la réouverture, la revue de preuve, les coûts (soumission et arbitrage), la revue RIA et la revue GE-01. Pas de pourcentage.

## UX-011 — Une seule action principale

- La carte devient un rappel seulement si son geste est le même que celui du haut : réception, réouverture, traitement connecté, ou « Valider l’étape ».
- Elle garde son bouton quand il mène ailleurs : « Ouvrir les preuves » si une preuve attend, « Examiner la décision financière » si le montant dépasse le seuil.
- Le rappel dit où agir : « À faire avec « Valider l’étape », en haut de la fiche. », « À faire dans le panneau de réception ci-dessous. », « À faire dans le panneau de réouverture. », « À faire dans le bloc Continuité de traitement. »
- En consultation, le kicker est « PROCHAINE ÉTAPE », avec la note « Consultation uniquement ». Pas de bouton.
- Qui peut lancer l’action n’a pas changé : `permitted`, `isManager`, `isAgent`, `readOnly`.

## Fichiers

- `app/components/Ge01WorkflowPanel.tsx`
- `app/components/DossierContinuity.tsx` (`SavingStatus`, `DossierOverviewAction`)
- `app/components/DossierOriginMeasures.tsx`
- `app/components/ReopenDossierPanel.tsx`
- `app/components/InterventionReceptionPanel.tsx`
- `app/components/ConnectedCostsWorkspace.tsx`
- `app/components/Ge01ReviewPanel.tsx`
- `app/components/RiaRound.tsx` (bouton de revue seulement ; le libellé de brouillon « Enregistrement… » n’est pas cette attente)
- `app/page.tsx`
- `app/lib/supabase/data.ts` (colonne `source_report_id` et lecture des checks déjà chargés)
- `app/globals.css`
- `scripts/verify-dossier-fiche-ui.mjs`
- `package.json` (`verify:dossier-fiche`)
- `AUDIT_UI_UX.md` (UX-034, UX-035)

## Scripts

- `node scripts/verify-dossier-fiche-ui.mjs` rend le diagnostic sans commentaire, l’agent qui n’est pas l’acteur, les deux motifs de traitement, la preuve en attente (bouton conservé), le cas « Valider » seul (rappel sans bouton), la consultation, et les trois phrases de mesure.
- Inchangés à la première livraison, et non rejoués pour cette reprise hors `verify-dossier-fiche-ui` et `tsc` : `audit-visual-styles`, `verify-personas`, `verify-auth`, `verify-lot0-ui`, `verify-lot1-ui`, `verify-wilo-observations`, `verify-input-rules`, `verify-anti-zombie.ts`, `verify-connected-water-ui`, `verify-irr-ui`, `verify-round-choice-ui`.

## Reportés

- UX-007 à UX-010, UX-012 à UX-018, UX-020 à UX-033 : lots 3 à 5.
- UX-034 : lot 5. Libellé au-dessus, valeur lecture seule sans aspect de champ.
- UX-035 : lot 3. Un seul rail d’étapes.
- UX-019 : toujours hors lot (DEC-023).

## À regarder

- ANO-0231 en démonstration, preuve déjà acceptée, sans décision au-dessus du seuil : le rappel dit d’utiliser « Valider l’étape » en haut. Ce n’est pas un second bouton.
- Même fiche si la preuve est en attente : la carte garde « Ouvrir les preuves ».
- Diagnostic connecté, commentaire vide : « Confirmer le diagnostic » est grisé, la ligne dit pourquoi et nomme l’acteur attendu.
- Autoriser le traitement, coût approuvé non choisi : le bouton est grisé et la ligne le dit.

## Reprise

Revue Claude du commit `ad0a54d`. M1, M2, m1, m2, m3. Pas de changement de `permitted`, ni de requête autre que la colonne déjà ajoutée.
