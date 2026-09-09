# C11 — cadrage du score agent

## Objet du lot

C11 cadre la définition métier du score agent sans ouvrir son calcul, son
affichage chiffré ni son utilisation dans une décision individuelle.

Le score agent repose sur trois composantes uniquement :

1. **Rondes quotidiennes réalisées** — conformité de contrôle.
2. **Anomalies de son périmètre résolues dans les délais** — hors attente
   Facility Manager, prestataire ou preuve.
3. **Zone ou périmètre maintenu** — état des équipements et constats de sa zone.

## État obligatoire

Tant que les poids, les règles d’exclusion et la gouvernance RH ne sont pas
validés, le produit doit conserver exactement l’état suivant :

> Score non calculable — données ou règles insuffisantes

Cet état est qualitatif. Il ne doit être remplacé, accompagné ou illustré par
aucun chiffre, pourcentage, jauge, rang ou tendance numérique.

## Interdictions

- Ne pas inventer ni déduire de poids entre les trois composantes.
- Ne pas afficher de score d’exemple, notamment `88`, ni de valeur fictive.
- Ne pas produire de classement entre agents.
- Ne pas relier le score à une prime, une sanction ou une décision RH.
- Ne pas ajouter une quatrième composante, directement ou par indicateur
  composite.

## Conditions préalables à tout calcul

Le calcul et l’affichage chiffré restent bloqués jusqu’à validation explicite
des trois éléments suivants :

- poids attribué à chacune des trois composantes ;
- règles d’exclusion applicables, notamment aux attentes Facility Manager,
  prestataire ou preuve ;
- gouvernance RH encadrant l’interprétation et l’usage du score.

La validation partielle d’un ou deux éléments ne suffit pas à rendre le score
calculable.

## Hors périmètre et non-régression C10

C11 ne modifie aucun objet livré par C10 : seuil financier, coûts, décisions
financières, rôles, permissions, RLS, événements d’audit ou interface associée.
Aucune migration, donnée, formule applicative ou publication du Site n’est
autorisée par ce cadrage.

## Critères d’acceptation du cadrage

- Les trois composantes ci-dessus sont les seules composantes consignées.
- L’exclusion des attentes Facility Manager, prestataire ou preuve est
  explicite pour la composante relative aux délais.
- L’état obligatoire est reproduit mot pour mot.
- Aucun poids, score chiffré, classement ou mécanisme de prime n’est introduit.
- `DEC-015` reste inchangée.
- Aucun fichier ni comportement C10 n’est modifié.
- Aucun déploiement ou publication n’est réalisé.

## Décision associée

Voir `docs/design/DECISIONS.md`, entrée `DEC-017`.
