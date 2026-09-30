# Alignement des primitives UI — 908c24b

Date : 11 septembre 2026.

Source : `free225-sys/behira-fm-track`, branche `design/lot-1-tokens`, commit exact `908c24b687eb7a6726b60c3d2e52747a992b845e`.

Cible examinée : fichiers présents dans le répertoire de travail de `feat/ge01-pilot` (`work/behira-fm-track-ge01`). Les modifications locales ne sont pas présentées comme un commit publié.

## Lecture documentaire

Lecture du `CONTRAT_PRIMITIVES_CODEX.md` au commit demandé, puis du journal `FROM-DESIGN.md` jusqu'à DESIGN-052. Comparaison du journal avec `8c5512a` : seul DESIGN-052 est ajouté ; les entrées précédemment lues et appliquées sont inchangées. DESIGN-052 consigne le portage de la V2 locale. DESIGN-051 reste la référence pour les mentions italiques.

## Table fichier → résultat

Comparaison binaire des blobs Git de la source avec les fichiers locaux complets, sans normalisation ni exclusion. Les dix fichiers sont identiques, y compris les fins de ligne. Aucun fichier supplémentaire dans le répertoire UI cible.

| Fichier | Résultat par rapport à 908c24b | Patch appliqué |
| --- | --- | --- |
| `app/components/ui/badge.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/button.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/card.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/date-input.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/field.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/icon-button.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/icon.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/index.ts` | Déjà conforme — identique | Aucun |
| `app/components/ui/select.tsx` | Déjà conforme — identique | Aucun |
| `app/components/ui/time-input.tsx` | Déjà conforme — identique | Aucun |

## Vérifications exécutées

- `node scripts/verify-design-contract.mjs` : réussite sur 43 fichiers applicatifs.
- Aucun `<select>` hors `app/components/ui/select.tsx`.
- Aucun champ natif `date`, `time` ou `datetime-local` visible dans le JSX contrôlé. Les champs natifs de transport de formulaire sont confinés aux primitives avec l'attribut booléen `hidden` ; ils ne constituent pas une interface système visible.
- Aucun `clip-path` dans les règles `.badge`, aucun `backdrop-filter` déclaré.
- `node scripts/audit-visual-styles.mjs` : 93 contrôles réussis, dont Accueil sans titre jumeau, mentions DESIGN-051 et primitives partagées.

Cette vérification est statique ; aucune nouvelle recette visuelle ni compilation n'a été relancée, puisqu'aucun fichier applicatif n'a changé. Les recettes V2 existantes ne sont pas présentées comme de nouveaux tests.

## Périmètre de cette intervention

Aucun patch applicatif. Seul ce compte rendu est ajouté. Le lot TimeInput, Accueil, Lucide et DESIGN-051 n'ont pas été reconstruits. Aucun changement de RPC, RLS, callbacks, seuil de 400 000 FCFA ou de fichiers Ge01. Aucune copie privée vers le miroir, aucun push, merge, publication ou chantier C10-C.
