# BEHIRA FM Track — Plan d’implémentation UI recalibré

Date : 28 août 2026  
Principe : un seul lot atomique à la fois, puis validation avant le suivant.

## 0. Checkpoint du code actuel — terminé

- Fondation visuelle UI-0 et pilote Facility Manager UI-1 enregistrés.
- Modification atomique UI-2 arrêtée après compilation : score ring, barres équipements, scores agents existants et état « données historiques insuffisantes ».
- Aucun déploiement de ce checkpoint tant que le recalage global n’est pas validé.
- Aucun changement de rôle, permission, workflow, seuil, validation, preuve, mode hors ligne ou responsabilité.

## 1. Fondations et tokens sémantiques — partiellement conforme

Déjà présent : couleurs sémantiques, surfaces, bordures, espacements, rayons, focus, états fonctionnels et séries de visualisation.

À adapter : extraction progressive des valeurs historiques encore dispersées et inventaire des composants partagés.

Critère de sortie : nouveaux composants construits uniquement avec les tokens documentés, sans double bordure ni effet décoratif lourd.

## 2. Composant anti-dossier-zombie partagé — non commencé

Créer `AntiZombieSummary` avec les huit champs définis dans `DESIGN.md`, variantes compacte et détaillée, état des données manquantes et action autorisée.

Première intégration : Facility Manager. Intégrations suivantes : registre puis dossier central.

Critère de sortie : le composant n’effectue aucun changement de workflow et présente toutes les informations sans dépendre uniquement de la couleur.

## 3. Pilote Facility Manager complet — partiellement conforme

À conserver : À qualifier, En retard, Preuves manquantes, file dense, branches de traitement, seuil de délégation et décision motivée.

À ajouter : Sans responsable, Preuves à vérifier, Réceptions, Réserves, Dossiers rouverts, pipeline, gravité, délai moyen, ouvertures/clôtures et synthèse anti-zombie partagée.

Critère de sortie : chaque dossier prioritaire expose son blocage et sa prochaine action ; les graphiques possèdent un état « données insuffisantes ».

## 4. Dossier central — à adapter

Recomposer le desktop en trois zones et le mobile en séquence priorisée. Réutiliser `AntiZombieSummary`. Préserver le verrou critique sans preuve, la timeline, les décisions financières et les contrôles de rôle.

Critère de sortie : aucune information critique perdue sur mobile ; CTA principal explicite selon le statut et le rôle.

## 5. Cockpit Administration — partiellement conforme

À conserver : risques, coûts, santé bâtiment, seuil, arbitrages, utilisateurs et paramètres.

À ajouter ou restructurer : évolution santé, pipeline, coûts à arbitrer, comparaison explicable des scores, zones récurrentes et tableau « Arbitrages à décider ».

Critère de sortie : chaque KPI relie valeur, contexte, explication et action ; aucune tendance artificielle.

## 6. Surpresseur — partiellement conforme

À conserver : mobile-first, cinq étapes, alertes, contrôles et simulation hors ligne.

À ajouter : position des mesures dans la plage attendue, variation, fraîcheur et facteurs du score.

Critère de sortie : toute mesure indique clairement dans/hors plage ; absence de seuil explicitée.

## 7. Agente Rondes & Assistance — à adapter

Séparer Terrain et Administratif par contrôle segmenté. Préserver rondes, constats, zones, brouillons hors ligne, devis, paiements, autorisations et arbitrages selon les droits existants.

Critère de sortie : les deux fonctions sont explicites et aucune permission n’est créée par l’interface.

## 8. Autres écrans — non commencé dans le recalage

Appliquer les composants validés aux agents, au registre, aux rondes hors Surpresseur, à l’authentification et aux états secondaires.

## 9. Nettoyage CSS et documentation finale — non commencé

- Retirer uniquement les styles confirmés inutilisés.
- Consolider les composants dupliqués.
- Compléter les états vide, erreur, chargement, données insuffisantes et permission.
- Vérifier desktop, tablette, mobile, clavier, contraste et réduction de mouvement.
- Mettre à jour l’audit et la checklist finale.

## Prochain lot atomique proposé

### UI-2A — `AntiZombieSummary` partagé + intégration Facility Manager

Périmètre strict :

1. créer le composant partagé avec ses huit champs ;
2. alimenter uniquement avec les données déjà disponibles ;
3. afficher « À définir » pour les champs absents ;
4. remplacer la synthèse locale du dossier prioritaire dans Facility Manager ;
5. conserver tous les boutons, seuils et handlers existants ;
6. tester desktop/mobile, clavier et non-régression.

Hors périmètre : registre, dossier central, nouvelles migrations, nouveaux statuts, données historiques et publication d’un autre écran.

Ce lot ne démarre qu’après validation explicite.
