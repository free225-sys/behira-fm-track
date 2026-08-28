# BEHIRA FM Track — Procès-verbal de clôture design

Date : 28 août 2026

Périmètre : interface web responsive et maquettes interactives

Statut proposé : **prêt pour validation métier**

## 1. Résultat livré

L'interface forme désormais un ensemble cohérent, exploitable et professionnel. La direction artistique BEHIRA est appliquée de manière uniforme aux cockpits Administration et Facility Manager, au registre, au dossier central, aux espaces agents, à la ronde Surpresseur et à la double mission de Agente Rondes & Assistance.

Le design différencie clairement :

- l'état actuel d'un dossier et une valeur seulement proposée ;
- le responsable interne et l'acteur externe concerné ;
- la preuve attendue, la preuve déposée et sa validation ;
- les données disponibles et celles qui ne sont pas encore raccordées ;
- les décisions de Facility Manager et celles qui exigent l'Administration.

## 2. Continuité de traitement

La synthèse partagée affiche dans un même composant :

1. prochaine action ;
2. responsable interne ;
3. SLA ou échéance ;
4. acteur bloquant ;
5. étape actuelle ;
6. motif du blocage ou du retard ;
7. preuve attendue ;
8. dernière activité.

Elle est intégrée dans le cockpit Facility Manager, dans le registre et dans le dossier central. Sur mobile, aucun des huit champs n'est supprimé.

## 3. Décisions de design

- surfaces sobres et densité analytique compacte ;
- composants partagés plutôt que variantes isolées ;
- pas de double bordure ou de halo persistant au clic ;
- focus réservé à la navigation clavier ;
- état toujours accompagné d'un libellé ;
- valeurs absentes affichées comme telles ;
- visualisations fondées uniquement sur les données disponibles ;
- titres courts sur tablette et mobile pour éviter les troncatures ;
- navigation mobile fixe avec réserve d'espace pour les actions.

## 4. Validation technique et visuelle

| Contrôle | Résultat |
|---|---:|
| Lint | Réussi |
| Build de production | Réussi |
| AntiZombieSummary | 11/11 |
| Personas / responsive | 31/31 |
| Authentification | 20/20 |
| Bordures et focus | 9/9 |
| Console navigateur | 0 erreur |
| Desktop 1440 px | Conforme |
| Tablette 768 px | Conforme |
| Mobile 390 px | Conforme |
| Navigation clavier | Conforme |

## 5. Ce qui n'est pas déclaré terminé

La clôture porte sur le **design**, pas sur l'intégration fonctionnelle complète. Restent à réaliser dans les lots suivants :

- le modèle canonique de prochaine action, blocage, preuve attendue et historique ;
- les migrations et politiques RLS validées séparément ;
- le raccordement des files encore sans source métier ;
- le calcul serveur et l'historisation des scores ;
- la persistance complète des décisions et validations ;
- la recette métier avec des dossiers réels.

## 6. Règle de changement après clôture

Toute nouvelle demande graphique sera traitée comme une amélioration ciblée. Une refonte globale ne sera rouverte que si l'Administration valide explicitement un changement de besoin majeur.

## 7. Prochain lot recommandé

**Raccordement fonctionnel du modèle anti-dossier-zombie**, en petits lots :

1. sources canoniques et historisation ;
2. prochaine action et responsable ;
3. blocages ;
4. exigences de preuve ;
5. dernière activité ;
6. branchement du composant partagé ;
7. recette et non-régression.

Aucune publication n'est incluse dans cette clôture. La version locale doit d'abord être validée par le porteur de projet.
