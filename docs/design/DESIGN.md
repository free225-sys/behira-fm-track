# BEHIRA FM Track — DESIGN

Statut : source de vérité UX/UI recalibrée  
Date : 28 août 2026

Ce document complète la direction artistique existante et prévaut pour l’ordre des prochains lots. Il ne modifie aucune règle métier.

## 1. Principes non négociables

- Préserver l’identité BEHIRA, le vocabulaire validé, les rôles et les responsabilités.
- Utiliser une structure sobre de type Ui/shadcn et une densité analytique inspirée de Dub, sans copie littérale.
- Ne pas ajouter de dégradé décoratif, glassmorphism, ombre lourde ou double bordure colorée.
- Conserver les workflows, seuils, validations, preuves, droits, mode hors ligne et restrictions existants.
- Présenter les données absentes comme « données insuffisantes » ; ne jamais fabriquer un historique pour remplir un graphique.
- Les scores agents sont une aide au pilotage et ne produisent jamais de sanction automatique.

## 2. Synthèse anti-dossier-zombie

Un composant partagé `AntiZombieSummary` devra présenter ensemble, pour tout dossier actif :

1. statut ;
2. responsable ;
3. prochaine action ;
4. échéance et situation SLA ;
5. acteur bloquant ;
6. motif du retard ou du blocage ;
7. preuve attendue et son état ;
8. dernière activité ou accès à l’historique.

### Comportement

- Un champ absent est explicitement marqué « À définir » ou « Non renseigné ».
- Une échéance dépassée affiche le retard en texte, pas uniquement en couleur.
- Le composant ne calcule ni ne change le workflow ; il résume des données existantes.
- La version compacte sert la file Facility Manager et le registre ; la version détaillée sert le dossier central.
- L’action associée doit mener vers la prochaine opération autorisée pour le rôle courant.

## 3. Catalogue des visualisations

| Visualisation | Question métier | Données nécessaires | Période | Filtres / interaction | État vide | Action métier |
| --- | --- | --- | --- | --- | --- | --- |
| Score ring bâtiment | Quel est l’état global et pourquoi ? | Score, variation, date de calcul, pondérations, causes, plafonds critiques | Actuel + comparaison | Ouvrir le détail des causes | Fraîcheur inconnue ou calcul indisponible | Ouvrir les équipements qui dégradent le score |
| Score ring équipement | Quel équipement exige une action ? | Score, état textuel, variation, fraîcheur, anomalies, maintenance, facteurs | Actuel, 7/30/90 j | Équipement, famille, criticité | Score non calculable | Ouvrir le dossier ou la ronde associée |
| Tendance santé | La santé progresse-t-elle ? | Instantanés datés du score | 7, 30 et 90 j | Période, équipement ou bâtiment | « Données historiques insuffisantes » | Examiner les causes de baisse |
| Pipeline dossiers | Où les dossiers s’accumulent-ils ? | Nombre de dossiers par étape et ancienneté | Actuel + période | Priorité, équipement, responsable | Pipeline vide | Ouvrir la file de l’étape bloquée |
| Répartition par gravité | Quelle est l’exposition au risque ? | Priorité des dossiers actifs | Actuel, 7/30/90 j | Zone, équipement, responsable | Aucun dossier actif | Ouvrir les critiques et hautes priorités |
| Ouvertures / clôtures | La charge se résorbe-t-elle ? | Dates d’ouverture et de clôture | 7, 30 et 90 j | Équipement, zone, responsable | Historique insuffisant | Ouvrir les dossiers non résorbés |
| Retards | Où les SLA sont-ils dépassés ? | Échéance, SLA, statut, responsable, motif | Actuel + tendance | Priorité, étape, responsable | Aucun retard | Relancer ou arbitrer |
| Coûts | Quels engagements nécessitent une décision ? | Estimé, devis, engagé, payé, seuil, décision | Mois, trimestre | Statut financier, équipement, prestataire référencé | Montants insuffisants | Ouvrir l’arbitrage ou la pièce financière |
| Heatmap 24 zones | Où les anomalies se répètent-elles ? | Zone, volume, gravité, récurrence, période | 30 et 90 j | Niveau, famille, gravité | Données de zone insuffisantes | Ouvrir la liste filtrée de la zone |
| Sparkline | Une petite tendance aide-t-elle la lecture du KPI ? | Série temporelle fiable et comparable | Selon KPI | Aucun ou période unique | Ne pas afficher la sparkline | Ouvrir le graphique détaillé |
| Plage Surpresseur | La mesure est-elle dans la plage attendue ? | Valeur, unité, seuil bas/haut, plage attendue, date | Dernière mesure + historique | Type de mesure | Seuil non configuré | Créer un constat ou poursuivre la ronde |
| Score agent | Le traitement nécessite-t-il un accompagnement ? | Période, échantillon, méthode, délais, preuves, variation, facteurs | 30/90 j | Agent, périmètre, type de dossier | Échantillon insuffisant | Ouvrir l’explication, jamais sanctionner automatiquement |

### Règles communes aux graphiques

- Chaque KPI présente, lorsque les données existent : valeur, contexte, variation, tendance, comparaison, explication et action possible.
- Une couleur est toujours accompagnée d’un libellé ou d’une valeur.
- Les transitions se produisent uniquement lors d’un changement de filtre ou de période ; aucune animation en boucle.
- `prefers-reduced-motion` désactive les transitions.
- Les actions et informations essentielles restent disponibles sans survol.

## 4. Écran pilote Facility Manager

Le cockpit Facility Manager doit contenir :

- les files À qualifier, En retard, Sans responsable, Preuves à vérifier, Réceptions, Réserves et Dossiers rouverts ;
- une file dense avec priorité, statut, équipement, zone, responsable, SLA et preuve ;
- le pipeline Constat → Qualification → Décision → Intervention → Preuve → Clôture ;
- la répartition par gravité ;
- le délai moyen de traitement ;
- la tendance des ouvertures et clôtures ;
- la synthèse anti-dossier-zombie sur les dossiers prioritaires ;
- une action principale correspondant au rôle et à l’étape du dossier.

## 5. Dossier central

### Desktop

- Gauche : identité, gravité, équipement, zone, origine et responsable.
- Centre : timeline, étape actuelle, diagnostic, intervention et preuves.
- Droite : prochaine action, responsable, échéance, acteur bloquant, motif, preuve attendue, coût/décision et CTA principal.

### Mobile

Ordre prioritaire : identité et risque → prochaine action → échéance et blocage → étape actuelle → diagnostic/intervention → preuves → coûts et historique. Aucune information métier ne disparaît.

## 6. Cockpit Administration

L’écran doit réunir santé bâtiment enrichie, risques critiques, coûts à valider, retards, seuil de délégation, évolution de la santé, pipeline, coûts à arbitrer, comparaison des scores, zones récurrentes et tableau « Arbitrages à décider ».

Le rôle affiché est « Administration ». Administration Démo est un utilisateur représentant ce rôle, pas le nom du rôle lui-même.

## 7. Surpresseur

- Conserver mobile-first, cinq étapes, alertes, seuils et mode hors ligne.
- Afficher chaque mesure sur une plage attendue avec valeur, unité, seuil bas/haut et état textuel.
- Le score Surpresseur affiche score, état textuel, variation, fraîcheur, facteurs positifs et facteurs négatifs.
- Si un seuil ou un historique manque, afficher l’absence au lieu de l’inventer.

## 8. Agente Rondes & Assistance

Séparer visuellement deux fonctions par onglets ou segmented control :

- Terrain : rondes, constats, zones et brouillons hors ligne ;
- Administratif : devis, paiements, autorisations et arbitrages.

Agente Rondes & Assistance reste agente et assistante de direction. Agent Électricité et Agent Eau & Incendie réalisent la majorité des rondes techniques.

## 9. Scores de performance

Tout score agent doit afficher :

- période observée ;
- taille de l’échantillon ;
- méthode ou pondération ;
- variation ;
- facteurs positifs et négatifs ;
- date de mise à jour ;
- lien vers le détail explicatif.

Un échantillon insuffisant rend le score non interprétable. Le système ne doit jamais transformer automatiquement un score en sanction, restriction de droits ou décision RH.

## 10. Critères de validation

- Desktop, tablette et mobile sans perte d’information critique.
- Focus clavier visible et ordre de tabulation logique.
- États vide, erreur, chargement, données insuffisantes, succès et permission traités.
- Aucun changement implicite de rôle, permission, workflow, seuil, preuve ou responsabilité.
- Tests existants réussis avant chaque publication.
- Chaque lot documente précisément ce qui est complet, partiel ou absent.

## 11. Système de tokens (DEC-010)

Source unique : `:root` dans `app/globals.css`. Spécimen vivant : `/design-system` (hors navigation produit).

| Couche | Tokens | Règle |
| --- | --- | --- |
| Surfaces | `--background` `--surface` `--surface-muted` `--surface-emphasis` | Canvas clair, cartes par bordure |
| Encres | `--foreground` `--foreground-muted` `--brand-foreground` | Texte ≥ 12 px à 4,5:1 |
| Marque | `--brand` `--brand-strong` `--mark` `--teal` `--accent` | DEC-013 : `--mark #20b2aa` (glyphe B) ≠ `--teal #0e6a66` (accent). `--accent` alias de `--teal`. `--orange` alias de compatibilité vers `--teal`. Le triplet `warning` reste distinct. |
| Chrome | `--chrome` `--on-chrome*` `--chrome-accent` `--chrome-rule` | Seule bande navy |
| Triplets | `--{role}-surface/border/text` | Encre dédiée, rôle pour barres |
| Score | `--score-part-1…4` | Rampe séquentielle, pas d’état |
| Type | `--font-size-label…display` | Plancher 12 px |
| Mouvement | `--motion-fast/bar/ring` | Uniquement au changement de valeur |
| Empilement | `--z-sticky` … `--z-modal` | Pas de z-index magique |

Ne pas déclarer de thème sombre. Ne pas migrer les hex métier restants sans lot dédié par surface.

