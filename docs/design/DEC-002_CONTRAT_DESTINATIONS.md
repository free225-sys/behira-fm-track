# BEHIRA FM Track — Contrat produit des destinations DEC-002

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Proposition documentaire — aucune destination ni permission ajoutée
- **Références :** DEC-002, DEC-008, DEV-003 et DEV-009

## 1. Objet du lot

Ce document ferme la première étape du lot produit DEC-002 : nommer les destinations, identifier leur contenu réel et séparer ce qui existe de ce qui reste à valider. Il ne modifie ni `View`, ni `navItems`, ni `allowedViewsByPersona`, ni une route, une donnée, un handler ou une API.

DEC-008 complète DEC-002 : la navigation principale reste **Accueil · À traiter · Rondes · Registre · Pilotage**. Les actions **Signaler une anomalie** et **Nouvelle ronde** restent contextuelles. Les futures destinations autonomes sont filtrées par les droits avant d'être placées dans le menu **Plus**, sous les groupes de DEC-002.

## 2. Catalogue principal déjà implémenté

| Destination canonique | Identifiant actuel | Groupe | Contenu actuel | Personas qui la voient aujourd'hui |
| --- | --- | --- | --- | --- |
| Accueil | `workspace` | Mon travail | Priorités et informations du rôle courant | Administration, Facility Manager, trois profils terrain |
| À traiter | `manager` | Mon travail | Files et décision opérationnelle Facility Manager | Facility Manager |
| Rondes | `report` | Mon travail | Rondes et saisie terrain | Facility Manager, trois profils terrain |
| Registre | `registry` | Le bâtiment | Liste et recherche des dossiers | Administration, Facility Manager |
| Pilotage | `dashboard` | Pilotage | Vue d'ensemble, actions, santé et parc technique | Administration, Facility Manager |

Cette matrice décrit strictement `allowedViewsByPersona`. Elle n'est pas une proposition d'extension des droits.

## 3. Destinations autonomes attendues

| Destination | Groupe DEC-002 | Source d'interface réutilisable | Source de données constatée dans le miroir | État produit | Accès à valider avant codage |
| --- | --- | --- | --- | --- | --- |
| Équipements | Le bâtiment | Onglet **Parc technique**, `OperationalAnalytics`, cartes de santé sur Accueil | `EquipmentItem[]` chargé dans `equipmentItems`, avec repli de démonstration | Partiel : liste, libellé, score et état existent ; recherche, fiche, historique et maintenance n'existent pas comme destination | Conserver Administration + Facility Manager uniquement, ou ajouter aux agents une lecture limitée à leur périmètre |
| Coûts | Pilotage | Bloc Coûts de Pilotage, arbitrages Administration, pièce et coût de rapport d'intervention | `Escalation.amount` et `VendorReportInput.costAmount` ; plusieurs totaux restent des valeurs de maquette | Partiel : décisions et quelques montants existent ; aucune source canonique ne justifie encore budget engagé, payé ou tendance | Définir la lecture Facility Manager et réserver ou non l'arbitrage global à l'Administration |
| Utilisateurs et droits | Administration | Aperçu **Utilisateurs & accès** et dialogue de maquette Administration | `personas` et `allowedViewsByPersona` sont une configuration frontend, pas une source métier administrable | Absent pour le réel : aucun compte ne doit être créé depuis le miroir public | Confirmer Administration seule pour créer/désactiver ; confirmer si Facility Manager peut seulement proposer un accès |
| Seuils et paramètres | Administration | Carte de seuil et paramètres visibles dans l'Accueil Administration | Le seuil de 400 000 FCFA est un état local et apparaît aussi en dur dans plusieurs vues | Absent comme paramètre canonique et historisé | Confirmer Administration seule et confirmer 400 000 FCFA comme valeur métier de référence avant raccordement privé |

## 4. Contrat de contenu minimal

### Équipements

- code et libellé ;
- état textuel accompagné du badge sémantique ;
- score de santé, fraîcheur et facteurs explicatifs lorsque ces données existent ;
- localisation, dernière intervention et prochaine maintenance lorsque les sources canoniques sont disponibles ;
- recherche et filtres par état, famille, criticité et périmètre ;
- état explicite **Données insuffisantes** pour l'historique ou la maintenance absente ;
- CTA vers le dossier ou la ronde associée, uniquement si le rôle courant possède déjà ce droit.

### Coûts

- montant estimé, devis, engagé et payé distingués ;
- devise, date, dossier, équipement et entreprise référencée ;
- seuil applicable et décideur attendu ;
- décision, justification et historique ;
- état **Montants insuffisants** lorsque les données ne permettent pas un total ou une tendance ;
- aucune agrégation calculée à partir des valeurs statiques de démonstration.

### Utilisateurs et droits

- identité professionnelle, rôle, périmètre, état du compte et date de dernière modification ;
- distinction entre proposer, valider, créer, désactiver et modifier le périmètre ;
- journal de l'auteur, de la date et de la justification ;
- aucune clé d'administration ou logique de création réelle dans le navigateur ;
- implémentation réelle uniquement dans le dépôt privé, via un traitement serveur et les contrôles d'accès canoniques.

### Seuils et paramètres

- nom, valeur, unité, portée et date d'effet ;
- auteur, justification, ancienne valeur et nouvelle valeur ;
- impossibilité de modifier silencieusement une règle ;
- affichage en lecture seule dans le miroir tant qu'aucun modèle canonique n'est validé ;
- aucune valeur dupliquée entre la configuration et les écrans consommateurs.

## 5. Nomenclature et routes futures

Les libellés visibles sont figés par DEC-008 et ce contrat. Après validation du lot, les chemins candidats pourront être :

- `/equipements` ;
- `/couts` ;
- `/utilisateurs-et-droits` ;
- `/seuils-et-parametres`.

Ces chemins ne sont pas implémentés dans ce lot. `/espace` et `/facility-manager` restent exclus. Une future route, le `<h1>`, le `<title>` et l'entrée du catalogue devront être alimentés par une seule définition typée.

## 6. Stratégie sans sources concurrentes

1. extraire chaque vue à partir du composant et de la donnée déjà affichés ;
2. ne laisser dans Pilotage qu'une synthèse et un accès vers la destination autonome ;
3. ne pas recopier les montants, scores, seuils ou droits dans un second tableau frontend ;
4. afficher un état insuffisant tant que la source canonique privée n'existe pas ;
5. filtrer les destinations avec la matrice d'accès existante avant de répartir navigation visible et menu Plus ;
6. ne modifier `allowedViewsByPersona` qu'après validation explicite de la matrice ci-dessous.

## 7. Arbitrages demandés avant P2

1. **Équipements :** les agents terrain doivent-ils voir une destination autonome limitée à leurs équipements, ou conserver uniquement leurs cartes d'Accueil et de Rondes ?
2. **Coûts :** Facility Manager voit-il tous les coûts opérationnels, tandis que l'Administration conserve seule les arbitrages globaux ?
3. **Utilisateurs et droits :** confirme-t-on que l'Administration crée et désactive, tandis que Facility Manager peut seulement proposer un rôle ou un périmètre ?
4. **Seuil :** confirme-t-on 400 000 FCFA comme seuil métier canonique, et non comme simple valeur de démonstration ?
5. **Navigation :** confirme-t-on que les quatre nouvelles destinations apparaissent dans **Plus**, sans remplacer les cinq destinations principales de DEC-008 ?
6. **Routes :** valide-t-on les quatre chemins proposés avant toute modification du routeur ?

## 8. Ordre d'implémentation après validation

1. Équipements en lecture, avec les accès validés et sans nouvelle donnée ;
2. Coûts en lecture, en masquant toute agrégation non justifiée ;
3. Utilisateurs et droits sous forme de contrat frontend de démonstration, puis raccordement serveur uniquement dans le dépôt privé ;
4. Seuils et paramètres en lecture, puis raccordement canonique et historisé dans le dépôt privé ;
5. recette du menu Plus, du clavier, du responsive et des cinq personas ;
6. seulement ensuite, redistribution des synthèses actuellement imbriquées dans Accueil et Pilotage.

