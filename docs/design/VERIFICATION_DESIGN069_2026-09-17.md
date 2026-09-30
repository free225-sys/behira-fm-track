# Vérification DESIGN-069 — 17 septembre 2026

## Référence courante

Révision design récupérée depuis `origin/design/lot-1-tokens` : **`015c2531858be84a6bcd37a607bd63b5defd3ecb`**, message `docs(design): DESIGN-069 cohérence documentaire avant intégration Codex`.

Diff vérifié depuis `d36fb98` : uniquement `docs/design/DESIGN.md` et `docs/design/FROM-DESIGN.md` (124 insertions, 16 suppressions). Fusion documentaire sans conflit dans la branche locale d'intégration : **`21ffae8fec49ff89cc6e55d04ac9f9a24c1c4416`**, parents `f3c111d` et `015c253`. Le socle GE-01 et le correctif de navigation Rondes sont conservés. Aucun changement applicatif, de migration ou de configuration à cette étape ; aucune publication distante.

`015c253` remplace désormais `d36fb98` comme référence documentaire design. Les anciennes références restent dans les comptes rendus historiques.

## Règle de lecture appliquée

- `DESIGN.md` fait foi ; articles 12 et 13 prioritaires en cas de conflit avec 1–11.
- Journal `FROM-DESIGN.md` : entrées 062 à 069 en vigueur, la plus récente l'emporte. Les entrées remplacées ne sont pas réactivées.
- Les anciennes formulations du contrat de primitives (« tout le journal », dates natives sans exception) se lisent sous cette priorité : elles ne rétablissent ni les entrées remplacées ni une interdiction du champ d'échéance de qualification expressément admis par l'article 12.
- Poids de domaine 70 / 15 / 10 / 5 décidés ; cela ne valide ni les points obtenus ni les sous-poids et formules d'équipement.
- `RND-LET` reste un périmètre de services, pas un équipement de santé. Source du seuil : `financial_decision_threshold`, 400 000 FCFA, effet civil 30/08/2026, comparateur `>=`.

## Résultat des contrôles du §7

> Ce tableau conserve les constats avant correction. Les écarts applicatifs de scores agents et de navigation ont ensuite été corrigés et testés ; voir [DEV-018](FROM-DEV.md#dev-018--corrections-design-069-et-premier-raccord-santé-serveur) et le [jalon santé serveur](../LIVRAISON1_SANTE_SERVEUR_2026-09-17.md). La réserve documentaire sur l'entrée DEC-017 demeure.

| Contrôle demandé | Résultat | Preuve / réserve |
| --- | --- | --- |
| Présence de `DECISIONS.md` | Présent, contenu incomplet pour ce contrôle | `docs/design/DECISIONS.md` existe. L'entrée DEC-018 cite DEC-017, mais aucune entrée DEC-017 n'est définie dans le fichier livré. |
| Présence de `CONTRAT_PRIMITIVES_CODEX.md` | Présent et lu | `docs/design/CONTRAT_PRIMITIVES_CODEX.md` ; priorité documentaire précisée ci-dessus. |
| Présence de `GE01_RACCORD_LOT1.md` | Présent et lu | `docs/design/GE01_RACCORD_LOT1.md`. Les fonctions backend et le correctif Rondes restent intacts après fusion. |
| Cohérence DEC-017 / article 9 | Compatible sur le principe, référence canonique à compléter et application non conforme | DEC-017 retrouvée dans la passation archivée du 11 septembre ; détails ci-dessous. |
| Présence de `.gitattributes` | Conforme au contrôle demandé | Fichier suivi : `* text=auto eol=lf`. `git check-attr text eol` confirme `text: auto`, `eol: lf` pour `app/page.tsx` et `docs/design/DESIGN.md`. Aucune renormalisation globale nécessaire pour cette vérification de présence. |
| Comportement réel de l'en-tête | Reste visible, mais ne correspond pas à `position: sticky` | Mesuré au défilement à 1440, 768 et 380 px ; tableau ci-dessous. |

## DEC-017 et scores agents

Source retrouvée : `outputs/passation-design/PASSATION_AGENT_DESIGN_BEHIRA_2026-09-11.md`, section « Score agent : DEC-017 du 9 septembre », lignes 205–219 (chemin relatif à l'espace de travail, hors dépôt d'intégration). Cette source est cohérente avec le registre antérieur `outputs/analyse-metier-fm-track-2026-09-10/MATRICE_ECARTS_TRACABLES_2026-09-10.md`, E-035/E-037. Le commit primaire `83a5a858` cité par ce registre n'est pas disponible dans les dépôts locaux examinés ; son texte n'a pas été reconstitué dans `DECISIONS.md`.

La passation précise trois composantes seulement :

1. Rondes quotidiennes réalisées — conformité de contrôle.
2. Anomalies du périmètre résolues dans les délais — hors attente FM, prestataire ou preuve.
3. Zone ou périmètre maintenu — état des équipements et constats de la zone.

Tant que poids, exclusions et gouvernance RH ne sont pas tous validés : **« Score non calculable — données ou règles insuffisantes »**. Aucun chiffre d'exemple, pourcentage, jauge, classement, prime ou sanction.

L'article 9 peut s'appliquer avec cette règle : il fixe le futur emplacement **Pilotage > Équipe** et les informations explicatives ; il n'autorise pas le calcul avant validation de DEC-017. Son vocabulaire « méthode validée » ne suffit pas à lui seul à lever les autres conditions.

Écart observé dans l'application :

- `app/page.tsx`, `agentPerformance` : nombres fixes **88 / 84 / 91**.
- `OperationalAnalytics` affiche ces nombres dans **Pilotage > Santé & scores**, au côté du score bâtiment. Aucun onglet Équipe n'est défini dans `dashboardTabs`.
- La méthode affichée « Délais · réactivité · qualité des preuves » ne reprend pas les trois composantes de la passation ; période et échantillon sont absents.
- Le test navigateur confirme les trois valeurs en démonstration. Le code de ce bloc ne comporte pas de garde `current.live` : l'analyse statique révèle aussi un risque d'exposition des mêmes valeurs en mode connecté. Ce dernier cas n'a pas été testé avec un compte distant pendant cette vérification.
- Aucune carte de score agent n'est affichée sur l'accueil FM contrôlé.

**Écart à corriger avant de présenter ces chiffres comme validés** : retirer les nombres et la méthode non adoptée, afficher l'état non calculable et réserver la future restitution à Pilotage > Équipe. La présente intervention est une vérification documentaire et comportementale ; elle n'a pas modifié ce code ni inventé une décision métier.

## En-tête au défilement

Mesures à `scrollY = 0`, puis `650` sur l'accueil FM :

| Largeur | Navigation calculée | Position avant / après | Barre de titre |
| --- | --- | --- | --- |
| 1440 px | `fixed`, z-index 40 | top 0 / 0 ; hauteur 68 px | `static`, défile hors écran |
| 768 px | `fixed`, z-index 40 | top 0 / 0 ; hauteur 64 px | `static`, défile hors écran |
| 380 px | `fixed`, z-index 15 | bas de fenêtre 900 / 900 ; hauteur 72 px | `static`, défile hors écran |

`overflow-x: clip` est effectif sur `html` et `body`. La navigation reste donc visible, mais son implémentation desktop est **fixed et non sticky**. La règle tardive de `app/globals.css:4375` l'impose ; elle est déjà présente dans le commit design `015c253`. Ce n'est pas un effet de la fusion backend.

La promesse de visibilité pendant le défilement est tenue. La description technique de DESIGN-067 et l'implémentation divergent : il reste à aligner le code sur `sticky` ou à consigner explicitement que le comportement `fixed` existant est retenu. La barre mobile basse n'a pas été modifiée.

## Preuves et limites

- `outputs/verification-design069-2026-09-17/header-measurements.json` : positions et scores observés.
- `header-1440.png`, `header-768.png`, `header-380.png`, `agent-scores.png` dans le même dossier : captures locales.
- `check-header.mjs` : reproduction de la mesure au défilement et de l'accès Pilotage > Santé & scores.
- Diff applicatif nul entre `f3c111d` et la fusion documentaire `21ffae8`. Aucune recompilation nécessaire pour importer ces seuls Markdown.

Ce compte rendu couvre les points du §7 et les références nécessaires à leur interprétation. Il ne constitue pas une certification complète de conformité de toutes les surfaces aux articles 1–13, ni une validation métier des scores.
