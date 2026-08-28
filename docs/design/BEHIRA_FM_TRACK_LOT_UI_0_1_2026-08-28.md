# BEHIRA FM Track — Lot UI-0 / UI-1

Date : 28 août 2026  
Écran pilote : Centre de décision de Facility Manager — Facility Manager

## 1. Périmètre réalisé

- Consolidation d’un socle de tokens sémantiques : couleurs, surfaces, bordures, espacements, rayons, contrôles, focus et ombres.
- Refonte visuelle ciblée du Centre de décision de Facility Manager uniquement.
- Conservation stricte des données, rôles, permissions, branches de traitement, seuil de délégation et actions existantes.
- Ajout de libellés d’accessibilité sur les files, les choix de traitement, les priorités et les retours d’état.

## 2. Décisions de design

- Structure sobre inspirée des principes Ui/shadcn : surfaces blanches, bordures fines, formulaires stables et action principale explicite.
- Densité inspirée des principes Dub : KPI compacts, file de travail directement comparable et dossier décisionnel visible en parallèle.
- Suppression du dégradé du bandeau Facility Manager au profit d’une surface claire et calme.
- Aucun effet de verre, aucune ombre lourde et aucune double bordure colorée.
- État actif transmis par une combinaison de fond, libellé et attribut accessible ; la couleur n’est jamais le seul signal.
- Le contrôle anti-dossier-zombie expose quatre informations : responsable, prochaine action, SLA/échéance et preuve.
- Les actions sont réorganisées pour distinguer clairement le brouillon de la décision finale.

## 3. Éléments BEHIRA conservés

- Palette institutionnelle bleu marine / bleu BEHIRA, enrichie de tons fonctionnels sobres.
- Vocabulaire métier : qualification, retard, preuve, délégation, Administration, décision motivée.
- Seuil de délégation de Facility Manager à 400 000 FCFA.
- Branches de traitement interne sans coût, interne avec coût et intervention externe.
- Score de traitement et indicateurs de suivi de Facility Manager.

## 4. Captures de validation

Les captures seront produites depuis la version publiée, après autorisation de publication sur l’accès actuel du site :

- `outputs/design/ui-1-facility-desktop.png`
- `outputs/design/ui-1-facility-mobile.png`

## 5. Contrôles effectués

- Lint et compilation de production réussis.
- 28 contrôles des personas et parcours métier réussis.
- 20 contrôles d’authentification réussis.
- Vérification de préparation Supabase réussie ; aucun schéma ni droit modifié.
- 9 contrôles statiques de bordures et de focus réussis.
- Breakpoints explicitement couverts à 1180, 900, 700 et 430 px.
- Libellés, rôles d’onglets, états pressés et retours de statut ajoutés sans changement fonctionnel.

## 6. Limites et prochaine validation

- Ce lot ne généralise pas encore le nouveau langage visuel aux autres personas.
- La validation visuelle finale desktop/mobile et le contrôle de console doivent être réalisés sur la version publiée.
- L’accès actuel du site est public ; une autorisation explicite est donc requise avant le déploiement de ce lot.
- Après validation par le commanditaire, la prochaine vague pourra traiter les écrans Direction, Agents, rondes et dossier complet en réutilisant les mêmes tokens.

## 7. Checklist du lot

- [x] Identité BEHIRA conservée.
- [x] Principes Ui/shadcn et densité Dub appliqués sans copie littérale.
- [x] Tokens sémantiques consolidés.
- [x] Espacements, rayons, bordures et tailles de contrôle harmonisés sur le pilote.
- [x] Informations métier critiques visibles et libellées.
- [x] Action principale identifiable.
- [x] Liste vide et succès conservés.
- [x] Responsive prévu sans masquage d’information critique.
- [x] Focus clavier unique et libellés accessibles.
- [x] Rôles, permissions, routes, données et logique métier inchangés.
- [x] Tests existants réussis.
- [ ] Captures et vérification visuelle finale sur la version publiée.
