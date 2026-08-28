# BEHIRA FM Track — État du chantier UI au checkpoint

Date : 28 août 2026  
État : codage en pause après finalisation de la modification atomique en cours

## Fichiers modifiés depuis le dernier checkpoint

- `app/page.tsx` : ajout des composants de visualisation et raccordement aux écrans Direction et Faustin.
- `app/globals.css` : tokens de séries et styles responsive des visualisations.
- `docs/design/DESIGN.md` : nouvelle source de vérité fonctionnelle UI.
- `docs/design/BEHIRA_FM_TRACK_AUDIT_UI_2026-08-28.md` : audit recalibré et matrice de conformité.
- `docs/design/BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md` : lien vers la nouvelle source de vérité.
- `docs/design/BEHIRA_FM_TRACK_PLAN_IMPLEMENTATION_UI_RECALE.md` : ordre de réalisation corrigé.
- `AGENTS.md` : ordre de lecture des documents UI mis à jour.

## Composants créés ou adaptés

- `ScoreRing` : représentation accessible du score bâtiment.
- `OperationalAnalytics` : score bâtiment, causes, état historique insuffisant, comparaison des équipements et scores agents déjà présents.
- `Dashboard` : insertion du bloc analytique Direction.
- `Manager` : insertion du même bloc dans le cockpit Faustin et réception de la liste des équipements.

## Écrans concernés

- Tableau de bord Direction.
- Centre de décision de Faustin.

Aucun autre écran n’a été refondu dans cette modification atomique.

## Règles métier touchées

Aucune. Les changements ajoutent uniquement de la présentation et des filtres locaux. Aucun statut, rôle, permission, seuil, validation, preuve, responsabilité, workflow, mutation Supabase ou comportement hors ligne n’a changé.

## Terminé

- Composants compilables et accessibles.
- Score ring courant et facteurs issus des données de maquette existantes.
- Comparaison des scores équipements.
- Présentation des scores agents déjà présents avec avertissement de non-sanction.
- Sélecteur 7/30/90 jours avec état honnête « données historiques insuffisantes ».
- Responsive codé et réduction de mouvement prévue.
- Audit, DESIGN et plan recalibrés.

## Partiel

- Data visualization globale : le catalogue complet reste à réaliser.
- Pilote Faustin : files complémentaires, pipeline et anti-zombie partagé absents.
- Cockpit Administration : pipeline, heatmap et arbitrages enrichis absents.
- Scores : période, échantillon, méthode, variation et fraîcheur non alimentés.

## Absent ou non commencé

- `AntiZombieSummary` partagé.
- Dossier central desktop en trois zones.
- Pipeline métier graphique.
- Répartition par gravité.
- Ouvertures / clôtures réelles.
- Heatmap des 76 zones.
- Plages attendues Wilo.
- Séparation Terrain / Administratif de Laetitia.

## Publication

Le code du checkpoint n’est pas publié. La version actuellement en ligne reste la version UI-0/UI-1 précédemment validée. Toute reprise attend une validation explicite.

## Tests exécutés

- lint : réussi ;
- compilation de production : réussie ;
- 28 contrôles personas : réussis ;
- 20 contrôles d’authentification : réussis ;
- préparation Supabase : réussie ;
- 9 contrôles statiques de bordures et focus : réussis.
