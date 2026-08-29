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

## Système de design — obligatoire pour tout agent

Le spécimen vivant **`/design-system`** (`app/design-system/page.tsx`) et les tokens `:root` de `app/globals.css` lient tout chantier UI. Les primitives sont dans `app/components/ui` (`Button`, `IconButton`, `Badge`, `Field`, `Card`).

Avant d’écrire ou de modifier une surface :

1. Lire `docs/design/DESIGN.md` §11 (tokens) et `docs/design/DECISIONS.md` (DEC-003, DEC-006, DEC-013).
2. Consulter le spécimen `/design-system` — hors navigation produit.
3. Réutiliser un token ou une primitive existante. **Ne pas inventer de teinte, de rayon ou de composant parallèle.**
4. Consigner toute exception dans `docs/design/FROM-DESIGN.md` (journal append-only).

### Tokens de marque (DEC-013)

| Token | Valeur | Usage |
| --- | --- | --- |
| `--brand` | `#235ea7` | Action principale |
| `--brand-strong` / `--chrome` | `#0d2340` | Bandeau, titres forts |
| `--mark` | `#20b2aa` | Glyphe B uniquement |
| `--teal` | `#0e6a66` | Accent courant |
| `--accent` | alias `--teal` | Idem |
| `--orange` | alias `--teal` | Compatibilité — ne plus l’étendre |
| Triplets `warning` / `danger` | inchangés | États métier, **pas** la marque |

Pas de thème sombre (DEC-006). Plancher typographique 12 px (DEC-003). Contraste ≥ 4,5:1 à 12 px.

### Contrats visuels en vigueur

- Une seule bande navy : le chrome de navigation.
- Badges : capsule + sceau circulaire (`Badge` dans `app/components/ui/badge.tsx`).
- Compteurs de file : onglet actif = carte interne + monogramme inversé, sans rail.
- Santé & performance : Accueil Facility Manager, pas À traiter.
- Flux opérationnel : pleine largeur, hors colonne de décision.
- Contrôles : `pnpm audit:visual` et `pnpm verify:personas` doivent rester verts.

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
