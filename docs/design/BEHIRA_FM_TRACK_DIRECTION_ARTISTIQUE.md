# BEHIRA FM Track — Direction artistique et système UX/UI

**Statut :** direction artistique, à lire avec `DESIGN.md` qui porte le recalage fonctionnel du 28 août 2026  
**Objet :** recalibrer la direction visuelle d’un produit déjà engagé, sans casser son identité ni sa logique métier.

## 1. Décision de design

BEHIRA FM Track adopte une direction hybride :

| Source | Rôle dans BEHIRA FM Track |
| --- | --- |
| **Ui / shadcn-inspired** | Architecture des pages, navigation, surfaces, cartes, formulaires, hiérarchie, lisibilité et cohérence des composants |
| **Dub** | Densité analytique, KPI, tableaux, filtres, badges, outils opérationnels compacts et micro-visualisations |
| **Identité BEHIRA existante** | Logo, couleurs de marque, personnalité, vocabulaire, contexte métier et éléments déjà validés |

Références officielles :

- Ui : https://styles.refero.design/style/0fd67ec5-7e9c-4ca9-b368-5d9c7388477a
- Dub : https://styles.refero.design/style/b0d80806-b724-4ed1-a1d1-074edd3c9bc9

Ces références fournissent des principes, pas une maquette à copier.

## 2. Exclusion explicite

Ventriloc ne constitue pas la direction artistique de BEHIRA FM Track. Son utilisation passée était exploratoire. L’agent ne doit pas reprendre ses choix esthétiques comme base du produit ni interpréter d’anciennes mentions comme une validation.

Si un élément déjà réalisé s’en inspire, il doit être évalué selon les critères actuels : utilité métier, cohérence BEHIRA, clarté et compatibilité avec le système Ui/shadcn + Dub.

## 3. Principes directeurs

### 3.1 Sobriété structurelle

- Canvas clair et surfaces calmes.
- Conteneurs définis principalement par des bordures fines et des différences de surface discrètes.
- Ombres rares et très légères.
- Hiérarchie portée par l’espacement, la taille, le poids typographique et le contraste.
- Une action principale identifiable par écran ou zone de travail.

### 3.2 Densité maîtrisée

- Interface compacte pour les utilisateurs réguliers, sans sacrifier la lecture.
- Informations essentielles visibles en premier : priorité, statut, site, équipement, responsable, échéance et SLA.
- Détails secondaires accessibles par expansion, panneau latéral, onglet ou fiche dédiée.
- Tableaux conçus pour agir, pas seulement consulter.

### 3.3 Identité BEHIRA prioritaire

- Réutiliser les couleurs, logos, polices et signes de marque trouvés dans le dépôt ou les documents validés.
- Convertir les couleurs existantes en rôles sémantiques plutôt qu’en usages ponctuels dispersés.
- Si plusieurs versions de l’identité se contredisent, documenter le conflit et demander validation ; ne pas trancher silencieusement.
- Ne pas substituer automatiquement le bleu de Dub ni le rouge de shadcn aux couleurs BEHIRA.

### 3.4 Clarté opérationnelle

- Le statut doit être lisible par le texte, pas seulement par la couleur.
- La priorité et le dépassement SLA doivent être immédiatement distinguables.
- Les actions irréversibles doivent être explicites et confirmées.
- Les écrans doivent rester exploitables dans des situations réelles : beaucoup de lignes, textes longs, images manquantes, connexion lente et données incomplètes.

## 4. Fondations du système

### 4.1 Tokens sémantiques

Avant de choisir des valeurs, auditer les variables existantes. Consolider au minimum les rôles suivants :

```css
--background
--surface
--surface-muted
--surface-emphasis
--foreground
--foreground-muted
--border
--border-strong
--brand
--brand-foreground
--focus-ring
--success
--warning
--danger
--info
```

Prévoir également une échelle cohérente pour les espacements, rayons, hauteurs de contrôle et ombres. Les valeurs doivent prolonger l’identité du projet, pas importer mécaniquement celles de Refero.

### 4.2 Typographie

- Conserver la police validée dans le projet lorsqu’elle existe.
- Utiliser une échelle courte et stable : titre de page, titre de section, corps, libellé compact et métadonnée.
- Réserver les capitales aux micro-libellés réellement utiles.
- Employer des chiffres tabulaires dans les KPI et tableaux si la police le permet.
- Éviter les titres surdimensionnés dans les écrans opérationnels.

### 4.3 Espacement et géométrie

- Adopter une grille régulière, idéalement basée sur des multiples de 4 px.
- Utiliser des cartes plus aérées pour la synthèse et des lignes plus compactes pour les listes métier.
- Limiter le nombre de rayons différents.
- Conserver des zones tactiles confortables sur mobile même lorsque la présentation desktop est dense.

## 5. Composants attendus

### Navigation

> **Révisé le 29 août 2026 par DEC-004.** La version initiale demandait une barre latérale stable sur desktop. Le rail occupait 244 px fixes, ce qui empêchait le registre de tenir ses six colonnes en dessous de 1280 px et laissait près de 200 px de vide pour les profils à deux entrées. La navigation passe en bandeau horizontal ; les mesures qui motivent l'arbitrage sont dans DEC-004.

- **Bandeau horizontal en haut sur desktop, barre basse sur mobile.** Une seule source de destinations alimente les deux : mêmes libellés, mêmes droits, aucun doublon.
- Un bandeau se lit en texte. Sur desktop les libellés suffisent ; réserver les icônes à la barre mobile, où la place manque, et n'y employer qu'une famille tracée cohérente — jamais des caractères de police système.
- Rubrique active évidente sans double bordure ni décoration excessive, et signalée par au moins deux canaux : un repère visuel et `aria-current`. La couleur seule ne suffit pas.
- Quatre à six destinations prioritaires visibles selon le profil et la largeur ; les suivantes dans un menu « Plus » qui affiche les rubriques du catalogue. Le menu n'accorde jamais un accès que la navigation principale refuserait : les droits filtrent avant la répartition.
- Le bandeau se contracte par paliers plutôt que de déborder. Ce qui disparaît en premier est ce qui se consulte le moins : le nom du site, puis le nom de l'utilisateur, puis le mot-symbole.
- En-tête de page réunissant contexte, titre, information secondaire et action principale — **une seule fois**. Un même écran ne porte qu'un titre visible ; la rubrique de menu, le titre de page et le titre de section ne se répètent pas l'un sous l'autre.
- Le chrome de tête reste sous le quart de la hauteur utile. Au-delà, le contenu commence trop bas sur un portable.
- L'environnement non productif est signalé en permanence et visiblement, pas seulement pour les lecteurs d'écran : un badge compact suffit, mais il doit être vu. Une action simulée ne doit jamais pouvoir passer pour une action enregistrée.

### KPI

- Libellé court, valeur dominante, unité claire et contexte temporel.
- Variation accompagnée d’un sens explicite ; ne pas supposer que « + » est toujours positif.
- Une carte ne doit pas mélanger plusieurs décisions.
- Les mini-graphiques sont réservés aux tendances réellement interprétables.

### Tableaux et listes

- En-tête fixe si la longueur le justifie.
- Colonnes alignées selon la nature des données ; valeurs numériques alignées pour comparaison.
- Statut, priorité et SLA visibles sans ouvrir la fiche.
- Filtres fréquents accessibles directement ; filtres avancés dans une zone secondaire.
- Actions de ligne regroupées sans surcharger chaque cellule.
- États vide, chargement, erreur, zéro résultat et pagination prévus.

### Badges et statuts

- Libellé textuel obligatoire.
- Couleurs sémantiques cohérentes sur toute l’application.
- Fonds légèrement teintés et contraste suffisant.
- Pas de couleur de marque utilisée comme substitut universel aux statuts.

### Formulaires

- Libellé toujours visible ; placeholder réservé à l’exemple.
- Aide et erreur placées près du champ concerné.
- Sections courtes et logiques pour les formulaires longs.
- Bouton principal formulé comme une action précise.
- Valeurs obligatoires, formats et unités annoncés avant l’erreur.

### Fiches opérationnelles

- Résumé en tête : statut, priorité, site, équipement, responsable, date et SLA.
- Historique chronologique pour les événements.
- Photos, documents, devis, commentaires et validations organisés en groupes distincts.
- Action suivante évidente selon le statut et les droits de l’utilisateur.

## 6. Application aux écrans métier

### Tableau de bord

- Montrer d’abord les anomalies et décisions : urgences, retards SLA, validations en attente, indisponibilités et coûts inhabituels.
- Limiter le nombre de KPI visibles simultanément.
- Associer chaque bloc analytique à un accès vers la liste filtrée correspondante.

### Demandes et interventions

- Donner la priorité aux vues liste et file de travail.
- Permettre la recherche et le filtrage par site, statut, priorité, catégorie, technicien et période.
- Conserver un parcours clair de la création à la clôture, avec historique et preuves.

### Équipements

- Mettre en avant état, localisation, dernière intervention, prochaine maintenance et historique.
- Prévoir des références longues sans casser la mise en page.

### Devis, approbations et réception

- Distinguer clairement montant, fournisseur, échéance, statut et décideur attendu.
- Montrer l’historique des décisions.
- Séparer approbation, exécution, réception et réserves.

### Rapports

- Graphiques simples, titres conclusifs et unités visibles.
- Légendes proches des données.
- Palette de données limitée et compatible avec l’identité BEHIRA.
- Export fidèle à l’information affichée.

## 7. Responsive et accessibilité

- Tester au minimum les largeurs mobile, tablette et desktop déjà utilisées par le projet.
- Sur mobile, transformer les tableaux complexes en listes structurées ou permettre un défilement contrôlé sans masquer les clés d’identification.
- Conserver un ordre de tabulation logique, des focus visibles et des zones cliquables suffisantes.
- Ne jamais transmettre une information critique uniquement par la couleur ou une icône.
- Vérifier contrastes, zoom, textes longs, contenus français et nombres au format local.

## 8. Ce qu’il faut éviter

- Copie littérale de Ui, Dub ou d’un autre produit.
- Rebranding complet vers une palette monochrome générique.
- Ventriloc comme modèle principal.
- Dégradés décoratifs, glassmorphism et ombres lourdes.
- Multiplication des cartes lorsqu’un tableau ou une liste suffit.
- Dashboards remplis de métriques non actionnables.
- Bordures doubles, trop épaisses ou colorées sans fonction.
- Rayons, espacements et styles de boutons incohérents.
- Suppression de données utiles au seul motif de « simplifier » l’écran.

## 9. Stratégie de migration

1. Audit visuel et fonctionnel de l’existant.
2. Inventaire des composants et tokens.
3. Définition du socle partagé.
4. Refonte d’un écran pilote à forte valeur.
5. Validation métier et visuelle.
6. Migration par familles : navigation, listes, fiches, formulaires, dashboards, rapports.
7. Contrôle responsive, accessibilité et non-régression.

Le premier écran pilote doit être suffisamment représentatif pour tester navigation, KPI, filtres, tableau, badges et actions, sans exiger une refonte simultanée de toute l’application.
