# Raccord lot 1 — UI dossier GE-01 (11 septembre 2026)

Source lue : dump `BEHIRA_GE01_CODE_DESIGN_2026-09-11` (feat/ge01-pilot working tree, base `04119e5`).  
Miroir : `design/lot-1-tokens`. **Aucun merge main. Aucune copie de supabase / offline / .env.**

## Ce que le dump a déjà (à ne pas reconstruire)

- `Ge01WorkflowPanel` : commandes assign / diagnose / branch / start / finish / close, confirmations, idempotency `requestId`.
- `nextActionAssignee` dans `anti-zombie.ts` (repli « Facility Manager » si nom masqué par RLS).
- Preuves : liste, Consulter, Refuser avec motif, Accepter, dépôt corrigé.
- Traitement : OT + coût + entreprise dans le panneau.
- Trois parcours clôturés (ANO-2026-000007/8/9) — ne pas les rouvrir.

## Écart UI à corriger **sans changer les callbacks**

| Surface Codex | Problème recette | Patch UI |
| --- | --- | --- |
| `AntiZombieSummary` | `nextActionAssignee` est une *meta* sous « Prochaine action » ; « Responsable » unique | Champ **Acteur attendu** (`nextActionAssignee`) **distinct** de **Responsable interne**. Contrat miroir : `expectedActor` = alias de `nextActionAssignee`. |
| `Ge01WorkflowPanel` l.43–47 | « À faire par : » en paragraphe ; bouton preuves trop discret | Reprendre le gabarit `DossierActionBoard` : prochaine action, acteur attendu, responsable, échéance, CTA 44 px « Ouvrir les preuves ». |
| `Ge01WorkflowPanel` l.49 | `vendorWork ? prestataire : interne **avec coût**` | Si `treatment.branch === 'internal_without_cost'` → « Intervention interne **sans** coût ». Ne pas afficher un coût inexistant. |
| Onglet Preuves l.220 | « ＋ Ajouter » | « Déposer un justificatif » / « Déposer la preuve corrigée » si une preuve est `rejected`. Compteur = `proofs.length` (2 si refus + correction). |
| Consultation | Trouvée seulement en recette guidée | Bouton **Consulter** à côté de chaque preuve, min-height 44 px. |

## Interdit

Reconstruire Accueil, Lucide, dépôt prestataire, scores, seuils, RPC, RLS.  
Inventer un OT / CST / PRV.  
Présenter « Demander un complément » comme déjà raccordé.

## Fichiers miroir (présentation + fixtures)

- `app/components/DossierContinuity.tsx`
- `app/components/anti-zombie-contract.ts` — `nextActionAssignee` / `nextActionDetail`
- `app/page.tsx` — ANO-0231 : 2 preuves (refusée + acceptée) + traitement prestataire **fictif**
- `docs/design/FROM-DESIGN.md` DESIGN-048 / DESIGN-049

## Vérif côté Codex après raccord

1. Dossier En validation, preuve à contrôler : **À faire par Facility Manager**, responsable interne = Agent Électricité.
2. Preuves 2 : REFUSÉE (motif visible) + ACCEPTÉE ou À VALIDER ; Consulter et Déposer corrigée visibles sans scroll perdu à 390 px.
3. Branche interne sans coût n’affiche pas « avec coût ».
4. Callbacks `onSubmit` / `onVerify` / `consultProof` inchangés.
5. `pnpm verify:anti-zombie` et parcours GE-01 non ré-ouverts.
