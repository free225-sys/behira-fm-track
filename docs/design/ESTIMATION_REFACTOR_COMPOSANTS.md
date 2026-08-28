# Estimation minimale du refactor des composants

Statut : estimation documentaire uniquement — aucune extraction réalisée dans ce lot.

## État observé

Le frontend concentre encore l'essentiel de l'interface dans `app/page.tsx` (environ 1 535 lignes) et `app/globals.css` (environ 669 lignes). L'inventaire statique relève 119 éléments `button`, 65 usages de surfaces `panel`, 38 groupes `field`, 4 dialogues et aucun tableau HTML natif. Ces nombres mesurent des usages, pas autant de composants distincts à créer.

## Extraction minimale proposée

| Famille | Primitives proposées | Estimation | Ordre | Risque principal |
| --- | --- | ---: | ---: | --- |
| Button | `Button`, `IconButton` et variantes sémantiques | 2 composants, 5 à 7 variantes | 2 | Casser les handlers, états disabled ou focus |
| Card | `Card`, `CardHeader`, `CardBody` | 3 primitives | 3 | Uniformiser excessivement les cartes métier |
| Field | `Field`, `FieldMessage`, contrôles partagés | 2 à 3 primitives | 4 | Perdre labels, aides, erreurs ou unités |
| Dialog | `Dialog` accessible et confirmation légère | 1 primitive, 2 usages pilotes | 5 | Gestion du focus, Échap et clic extérieur |
| Table/List | `DataList` responsive avant une éventuelle `DataTable` | 1 primitive pilote | 6 | Masquer des informations critiques sur mobile |
| Tokens | couleurs, espaces, rayons, ombres et hauteurs | 1 couche CSS | 1 | Modifier trop de surfaces en une fois |

Estimation globale : 9 à 11 primitives partagées, extraites en six petits lots. La première livraison doit rester limitée aux tokens et à un seul écran pilote.

## Lots recommandés

1. Inventorier et nommer les tokens existants sans changement visuel volontaire.
2. Extraire `Button` et `IconButton`, puis vérifier tous les états clavier.
3. Extraire les primitives de carte sur le cockpit Facility Manager uniquement.
4. Extraire les champs sur un formulaire pilote, avec erreurs et unités.
5. Remplacer un dialogue de confirmation et tester la restitution du focus.
6. Créer une liste responsive pour un seul registre, avant toute généralisation.

## Tests exigés à chaque lot

- comparaison visuelle desktop, tablette et mobile ;
- navigation clavier et focus visible ;
- états vide, erreur, chargement, succès et permission ;
- `pnpm lint`, `pnpm build`, `pnpm verify:personas`, `pnpm verify:auth` et contrôles ciblés ;
- aucune modification des rôles, statuts, seuils, handlers ou contrats de données.
