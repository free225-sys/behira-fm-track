# Source de vérité UI — application intégrale obligatoire

Date : 11 septembre 2026  
Branche source : `design/lot-1-tokens`  
Cible : `feat/ge01-pilot`  
Interdit : `main`, publication, C10-C, reconstruction d’Accueil / scores

## Règle

**Les fichiers `docs/design/` font foi. Tu n’en extraits pas un sous-ensemble.**

Si un écran, un contrôle ou un token est décrit dans ce corpus, tu l’appliques **partout** où l’équivalent existe dans le code que tu touches — GE-01, rondes, coûts, registres, login, file FM, preuves.  
« On fera le Select plus tard » / « le badge natif suffit » / « le `<select>` OS est acceptable en formulaire GE-01 » = **refus de la passation**.

Tu ne réinterprètes pas la DA. Tu ne remplaces pas une primitive par un contrôle système. Tu ne recrées pas un style local qui contredit le journal.

## Ordre de lecture (obligatoire, dans cet ordre)

1. `docs/design/DESIGN.md` — principes non négociables  
2. `docs/design/DECISIONS.md` — DEC-000 → DEC-018 (append-only ; ne pas réécrire)  
3. `docs/design/FROM-DESIGN.md` — **tout** le journal DESIGN-001 → DESIGN-051  
4. `docs/design/BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md`  
5. `docs/design/GE01_RACCORD_LOT1.md` — raccord dossier / preuves  
6. Code de référence du miroir : `app/components/ui/*`, `app/globals.css` (tokens + primitives)

En cas de conflit visuel entre deux DESIGN-xxx : **l’entrée la plus récente l’emporte**.  
Exemple badges : DESIGN-051 (mention italique + lavis) **annule** 050 / 025 / 024 pour la forme.  
Les DEC-xxx métier (seuil 400 000 FCFA, Accueil santé, pas de score inventé) **ne sont jamais annulées** par un DESIGN.

## Ce que « appliquer le fichier design » veut dire

Pour **chaque** entrée FROM-DESIGN encore pertinente (la plus récente sur un sujet) :

- soit le code de `feat/ge01-pilot` est déjà conforme,
- soit tu le modifies pour qu’il le soit,
- tu documentes l’écart restant s’il est **métier** (pas UI) et hors chantier.

Tu parcours **toutes** les surfaces, pas seulement le ticket du jour :

Login · Accueil · À traiter · Rondes · Registre · dossier · Preuves · Coûts · Équipements · Droits · Paramètres · Plus · Pilotage · GE-01 (formulaire, revue, workflow).

## Primitives — zéro exception

Fichiers à **copier / importer**, pas à réécrire :

| Import | Fichier | Interdit en parallèle |
| --- | --- | --- |
| `Select` | `app/components/ui/select.tsx` | `<select>` hors ce fichier (bleu OS) — DESIGN-040 |
| `DateInput` `DateTimeInput` `TimeInput` | `date-input.tsx`, `time-input.tsx` | `type="date"` / `time` / `datetime-local` visibles — DESIGN-052 |
| `Badge` | `app/components/ui/badge.tsx` | sticker, ruban, sceau, `backdrop-filter` — DESIGN-051 |
| `BrandIcon` | `app/components/ui/icon.tsx` | emoji / PNG / autre set — commit `fd2b1dc` |
| `Button` `Field` `Card` `IconButton` | `app/components/ui/` | styles bouton/champ hors tokens |

```ts
import { Badge, Button, Card, Field, Select, BrandIcon } from './ui';
```

Grep de recette, **échec = non livrable** :

- `<select` hors `select.tsx`
- `backdrop-filter`
- `clip-path` sur `.badge`
- redéfinition locale de `.badge` ou `select` dans un CSS GE-01
- titre jumeau Accueil (DESIGN-046)
- rail gauche de nav (DESIGN-034)
- score numérique inventé

## Métier que tu ne touches pas

RPC, RLS, callbacks, confirmations, idempotency, seuil 400 000 FCFA, calcul WILO, poids agent.  
Tu changes l’enveloppe visuelle, pas les règles.

## Sortie attendue

Liste **entrée DESIGN-xxx → fichier(s) modifié(s) ou « déjà conforme »**.  
Aucune entrée récente (040, 048–051, Lucide, Accueil) ne peut manquer à l’appel.
