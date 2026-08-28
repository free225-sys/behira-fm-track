# Directive design obligatoire — BEHIRA FM Track

## Nature de ce dépôt

Ce dépôt est un miroir public anonymisé, destiné uniquement aux travaux UI/UX. Il ne contient pas le backend Supabase, les migrations, les comptes réels ni la configuration de publication. Ne jamais y ajouter de secret, de donnée réelle ou de mécanisme de déploiement. Le Dev Lead conserve la source de vérité métier dans le dépôt privé.

Toute passation utilise `docs/design/FROM-DEV.md`, `docs/design/FROM-DESIGN.md` et le journal append-only `docs/design/DECISIONS.md`.

Avant toute intervention sur l’interface, lire intégralement :

- `docs/design/DESIGN.md`
- `docs/design/BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md`
- `docs/design/BEHIRA_FM_TRACK_CRITERES_VALIDATION_UI.md`
- `docs/design/BEHIRA_FM_TRACK_PLAN_IMPLEMENTATION_UI_RECALE.md`

Ces documents constituent la source de vérité UX/UI du projet.

## Direction retenue

- Utiliser **Ui / shadcn-inspired** pour la structure générale, les surfaces, la navigation, les cartes, les formulaires, la lisibilité et la hiérarchie.
- Utiliser **Dub** pour la densité des dashboards, les KPI, tableaux, filtres, badges et micro-visualisations.
- Préserver l’identité visuelle BEHIRA déjà présente dans le dépôt et les documents validés.
- Adapter les principes au Facility Management et aux flux métier de BEHIRA ; ne jamais copier littéralement un produit de référence.
- **Ne pas utiliser Ventriloc comme direction artistique principale.** Cette référence était uniquement exploratoire.

## Garde-fous

- Ne pas modifier la logique métier, les rôles, les permissions, les statuts, les routes, les données ou les API dans un chantier exclusivement visuel sans nécessité démontrée et validation explicite.
- Ne pas remplacer arbitrairement le logo, les couleurs, la typographie ou le vocabulaire BEHIRA.
- Ne pas inventer une nouvelle palette si des variables, composants ou documents de marque existent déjà.
- Ne pas dupliquer les composants : prolonger le design system et les primitives déjà présents.
- Ne pas ajouter de dégradés décoratifs, glassmorphism, ombres lourdes ou effets génériques « IA ».
- Ne pas exécuter une refonte globale en une seule passe. Auditer, proposer un plan par lots, puis implémenter progressivement.
- Préserver le responsive, l’accessibilité, les états de chargement, d’erreur, de vide, de succès et de permission.

## Processus obligatoire

1. Inspecter la stack, l’arborescence, les routes, les composants partagés, les tokens et les documents existants.
2. Dresser l’inventaire des écrans et repérer les incohérences visuelles sans encore modifier le code.
3. Identifier les éléments BEHIRA à conserver et les décisions encore inconnues.
4. Proposer un plan de migration par lots avec fichiers touchés, risques et critères d’acceptation.
5. Mettre en place ou consolider les tokens sémantiques avant de refaire les écrans.
6. Commencer par un écran pilote représentatif, puis faire valider avant généralisation.
7. Vérifier chaque lot sur desktop et mobile, sans régression fonctionnelle.
8. Mettre à jour la documentation et consigner les décisions prises.

## Définition de « terminé »

Un lot UI n’est terminé que si :

- il respecte les deux documents design ;
- il conserve l’identité BEHIRA ;
- il fonctionne aux largeurs desktop et mobile définies par le projet ;
- la navigation clavier, les libellés, le contraste et les états de focus restent utilisables ;
- les tests et contrôles existants passent ;
- aucune logique métier non demandée n’a été altérée ;
- la checklist de validation a été complétée.
