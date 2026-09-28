# Revue Grok — WILO/RIA connectés

Source du formulaire WILO : commit privé a3bd818f2ec5ebe79841613861f67339dbd04cc1. Cette branche publique en reprend uniquement les changements frontend et les tests UI, sur le miroir anonymisé aef6305. Aucun historique privé, migration, compte réel ou secret importé. Aucun déploiement.

## Lancer le parcours à examiner

```bash
pnpm install --frozen-lockfile
pnpm preview:water:ui
```

- http://127.0.0.1:4187/?wilo : WILO, formulaire vide.
- http://127.0.0.1:4187/?wilo&restored : WILO, brouillon fictif complet avec anomalie de bâche. Le navigateur conserve ce brouillon de test dans localStorage ; supprimer la clé `wilo-test-draft` pour le réinitialiser.
- http://127.0.0.1:4187/ : RIA, formulaire connecté avec transport simulé.

Le lancement habituel `pnpm dev` présente la démonstration générale. Pour cette revue, utiliser les liens ci-dessus : ils montent LegacyReport/WILO et RiaForm, pas EauRounds. Le banc isole les formulaires du chrome de navigation global et simule la file d’envoi. « Saisie réelle » est un libellé du composant ; aucune écriture réelle n’est effectuée. La validation serveur et la synchronisation distante ne peuvent pas être recensées comme testées ici.

## Mission

Revue design avant modification. Références : DESIGN.md articles 12/13, CONTRAT_PRIMITIVES_CODEX.md, FROM-DESIGN.md entrées en vigueur 062–078 (la plus récente prévaut). Examiner toutes les étapes WILO et RIA à 1440 et 380 px, clavier et focus. GE-01 reste la référence visuelle.

Priorités : densité des champs ajoutés ; libellés pression coffret/manomètre ; saisie du second relevé ; niveau mesuré versus observé ; états non renseignés ; lisibilité de Coffret ; rail et visibilité de l’étape active ; synthèse et compteur 6/6 qui ne couvre que les contrôles de base ; carte Constat proposé sur mobile ; message Réarmement provisoire qui ne doit pas suggérer un événement non déclaré ; confirmation après modification ; distinction brouillon/mise en file/synchronisation ; messages flottants masquant des actions.

Préserver : 4,5–5,5 bar inclus normaux ; pression critique <4 ou >6 bar ; second relevé réel au moins dix minutes après le premier ; date Abidjan ; aucun zéro ou Non implicite ; aucun score inventé ; WILO/RIA restent Indisponible côté score. Une catégorie de bâche ne devient pas un pourcentage.

Ne pas changer les règles métier, les mutations, auth, permissions, data.ts ou le flux d’enregistrement. Ne pas remplacer ces formulaires par EauRounds. Les circuits Recette WILO/RIA, revue FM WILO complète et IRR ne sont pas livrés par cette branche.

## Livrable

Tableau : identifiant, gravité, étape, largeur, constat avec capture, correction visuelle proposée, fichier, critère de recette. Séparer les défauts observés des hypothèses. Donner un avis pour cette version : acceptable / acceptable avec réserves / corrections nécessaires. Remettre d’abord la revue, sans modifications.

## Tests

```bash
pnpm audit:visual
pnpm verify:personas
pnpm verify:lot0
pnpm verify:lot1
pnpm verify:wilo
npm install --prefix tests/browser --ignore-scripts
pnpm verify:water:ui
```

Le test navigateur utilise Chrome installé sur le poste. Le serveur de revue seul ne nécessite pas Playwright. Référence attendue : 120 visuels, 38 personas, 89 lot0, 36 lot1, 34 cas WILO, navigateur 1440/380. Ces contrôles ne remplacent pas la revue ergonomique.
