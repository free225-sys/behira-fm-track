# BEHIRA FM Track — Audit UI et plan de migration

**Date :** 28 août 2026  
**Branche et référence auditées :** `master` — `e74d832`  
**Périmètre :** frontend existant, sans modification de la logique métier  
**Direction cible :** identité BEHIRA + structure Ui/shadcn-inspired + densité analytique Dub

## 1. Verdict exécutif

Le prototype contient déjà les parcours et le vocabulaire métier structurants : espaces par rôle, centre de décision de Facility Manager, dossier complet, registre, rondes, scores, gestion des utilisateurs et authentification. Il ne faut pas les reconstruire.

Le principal écart est systémique : l’interface a été enrichie par couches successives dans un composant et une feuille de styles devenus très volumineux. Les écrans sont globalement cohérents, mais les couleurs, rayons, ombres, dimensions, variantes de cartes et motifs d’interaction restent trop dispersés pour permettre une évolution sûre.

La bonne stratégie n’est donc pas une refonte globale. Il faut d’abord consolider les tokens et les primitives partagées, puis recalibrer un seul écran pilote : le **Centre de décision Facility Manager**. Après validation, les autres familles d’écrans pourront migrer progressivement.

## 2. Stack et structure du frontend

### Stack constatée

- Next.js 16, React 19 et TypeScript.
- Vinext/Vite pour la construction et l’hébergement Sites.
- Tailwind importé, mais l’essentiel de l’interface repose sur une grande feuille CSS personnalisée.
- Supabase côté client pour Auth, lecture métier, mutations et stockage des preuves.
- Geist et Geist Mono comme polices du projet.

Sources :

- `package.json`
- `app/layout.tsx:1`
- `app/page.tsx:1`
- `app/globals.css:1`

### Organisation constatée

- Une seule route applicative : `/`.
- Les écrans sont pilotés par l’état client `View`, sans routes séparées : `app/page.tsx:11` et `app/page.tsx:491`.
- Les composants d’interface, les données de démonstration et une grande partie des interactions sont regroupés dans `app/page.tsx`.
- Les fonctions Supabase sont déjà séparées dans `app/lib/supabase/`.
- La feuille `app/globals.css` contient le design historique, les ajouts successifs, l’authentification, les personas, les maquettes Surpresseur, Facility Manager, dossier et Administration.

### Conséquence

Le socle technique peut être conservé, mais la couche présentation doit être progressivement découpée en primitives, composants métier et écrans. Cette extraction doit rester purement structurelle pendant le chantier UI : aucun changement de routes, rôles, données, API ou politiques Supabase.

## 3. Inventaire des écrans et parcours

| Écran ou état | Utilisateurs concernés | État actuel | Référence principale |
| --- | --- | --- | --- |
| Connexion | Tous | Complet, avec démo et Supabase | `app/page.tsx:290` |
| Première connexion / changement obligatoire | Comptes réels | Complet | `app/page.tsx:430` |
| Shell, navigation et sélecteur de persona | Tous / démo | Complet | `app/page.tsx:869` |
| Espace Administration | Administration | Maquette interactive riche | `app/page.tsx:936` |
| Centre de décision Facility Manager | Facility Manager | Maquette interactive riche | `app/page.tsx:1167` |
| Espace agent technique | Agent Électricité / Agent Eau & Incendie | Présent | `app/page.tsx:1016` |
| Espace Agente Rondes & Assistance | Agente Rondes & Assistance | Présent, double mission visible | `app/page.tsx:1084` |
| Tableau de bord consolidé | Administration / Facility Manager | Présent en cinq blocs | `app/page.tsx:1110` |
| Registre des anomalies | Administration / Facility Manager | Présent, filtres et mobile | `app/page.tsx:1159` |
| Dossier complet | Selon le rôle | Présent, quatre sections | `app/page.tsx:1197` |
| Ronde Surpresseur | Agent Eau & Incendie / Facility Manager | Maquette interactive hors ligne | `app/page.tsx:1230` |
| Ronde rapide terrain | Agent Électricité / Agente Rondes & Assistance | Présente | `app/page.tsx:1241` |
| Rapport prestataire déposé en interne | Agent Électricité / Agent Eau & Incendie | Présent et protégé par permission | `app/page.tsx:1046` |
| Déconnexion / confirmation | Tous | Présent | `app/page.tsx:896` |

## 4. Éléments BEHIRA à conserver absolument

### Identité

- Le bleu marine BEHIRA, le bleu d’action, l’orange d’accent et les états rouge/vert.
- Le monogramme `B`, la marque `BEHIRA FM / GB TRACK` et l’ambiance technique sobre.
- Geist comme typographie principale.
- Le vocabulaire français et le format monétaire FCFA.

### Architecture produit

- La navigation par rôle et le mode démonstration explicitement séparé de l’authentification réelle.
- La distinction entre Administration, Facility Manager, agents techniques et Agente Rondes & Assistance.
- Le sélecteur de persona accessible en mode démonstration.
- La règle anti-dossier-zombie : responsable, prochaine action, échéance et preuve.
- Le cycle `Constat → Qualification → Décision → Intervention → Preuve → Clôture`.
- Les statuts affichés par un libellé en plus de la couleur.
- Le seuil d’approbation de 400 000 FCFA et son explication.
- Le verrou de clôture critique sans preuve acceptée.
- La saisie directe des rondes, sans import de reporting.
- Le fonctionnement hors ligne présenté dans le module Surpresseur.
- L’absence totale d’accès prestataire et le dépôt interne de leurs rapports.
- Le score équipement, le score bâtiment et le score de traitement des agents avec explication.

### Fondations techniques

- Auth Supabase et changement obligatoire du mot de passe.
- RLS et résolution du rôle côté base.
- Mutations transactionnelles existantes.
- Stockage privé des preuves.
- Tests et scripts de contrôle déjà présents.

## 5. Écarts avec la nouvelle direction artistique

### 5.1 Tokens sémantiques insuffisants — priorité haute

La feuille définit d’abord neuf variables de marque, puis quatre variables complémentaires plus loin : `app/globals.css:3` et `app/globals.css:105`. Elle ne possède pas encore le jeu sémantique validé (`background`, `surface`, `foreground`, `border-strong`, `brand`, `focus-ring`, `success`, `warning`, `danger`, `info`).

Le contrôle statique relève environ 762 occurrences de couleurs hexadécimales et 590 valeurs distinctes. Même si plusieurs valeurs sont proches, elles restent des décisions locales et rendent les ajustements globaux coûteux.

**Décision proposée :** conserver les couleurs BEHIRA, les traduire en tokens sémantiques et interdire progressivement les nouvelles couleurs directes hors couche de tokens.

### 5.2 Géométrie et profondeur trop dispersées — priorité haute

La feuille utilise plus de vingt formes de rayon et de nombreuses ombres différentes. Les cartes sont globalement sobres, mais leur géométrie varie selon leur date d’ajout. Plusieurs héros utilisent encore un dégradé sombre, notamment le centre Facility Manager et Surpresseur : `app/globals.css:192` et `app/globals.css:185`.

**Décision proposée :** limiter les rayons à trois niveaux, les ombres à deux niveaux et remplacer les dégradés décoratifs par des surfaces BEHIRA unies ou faiblement contrastées.

### 5.3 Trop de familles de cartes et KPI — priorité haute

Les mêmes besoins sont servis par plusieurs motifs : `stat-card`, `executive-metric`, `manager-kpis`, `direction-block`, `answer-strip`, `equipment-card`, `authority-result`. Cette diversité complexifie la comparaison entre écrans.

**Décision proposée :** créer une primitive de carte, une carte KPI et une ligne de statut communes, avec variantes sémantiques documentées.

### 5.4 Typographie parfois trop petite — priorité haute

De nombreux libellés et métadonnées sont définis entre 7 et 9 px, particulièrement dans les KPI, tableaux, dossiers et listes. La densité est pertinente, mais certaines informations deviennent difficiles à lire sur écran courant ou avec zoom.

**Décision proposée :** établir une échelle courte avec un plancher lisible pour les métadonnées métier et vérifier le zoom à 200 %.

### 5.5 Icônes non homogènes — priorité moyenne

La navigation et les actions utilisent des caractères Unicode (`◈`, `⌂`, `≡`, `◎`, `⌁`, etc.) définis directement dans `app/page.tsx:160` et dans plusieurs composants. Leur style et leur rendu varient selon le système.

**Décision proposée :** choisir une famille d’icônes unique ou un petit jeu d’icônes déjà validé, sans redessiner le logo.

### 5.6 Densité et hiérarchie variables — priorité moyenne

Le registre et le centre Facility Manager approchent déjà la densité Dub attendue. Le tableau de bord Administration reste davantage composé de grandes cartes, tandis que les écrans agents utilisent encore plusieurs blocs de synthèse. Les informations prioritaires ne sont pas toujours placées au même endroit.

**Décision proposée :** normaliser l’en-tête d’écran, la barre de filtres, la file de travail et le panneau de détail.

### 5.7 États incomplets — priorité moyenne

Des états existent pour le chargement Auth, l’erreur de connexion, les listes vides, les succès et certaines permissions. En revanche, tous les écrans ne disposent pas encore d’un traitement explicite pour : chargement métier, erreur de lecture, données incomplètes, texte long, grand volume, pagination et synchronisation partielle.

**Décision proposée :** intégrer ces états à chaque lot, sans inventer de nouvelle logique serveur dans le chantier visuel.

### 5.8 Vocabulaire Administration / Direction / Administration — priorité moyenne

Le code distingue correctement le rôle et son titulaire, mais l’interface alterne encore entre « Direction », « Administration » et « Administration » : `app/page.tsx:118`, `app/page.tsx:858`, `app/page.tsx:959`.

**Décision proposée :** utiliser « Administration » pour la capacité métier, et réserver « Administration Démo » à l’identité de l’utilisateur connecté.

### 5.9 Feuille de styles difficile à maintenir — priorité haute

`app/globals.css` dépasse 114 000 caractères et regroupe de nombreuses règles compactées sur une même ligne. Les points de rupture sont répétés et répartis entre plusieurs générations de composants.

**Décision proposée :** ne pas réécrire tout le CSS. Introduire d’abord un socle de tokens, puis extraire les styles au rythme des lots migrés.

### 5.10 Restes historiques à ne pas réactiver — priorité basse

Des styles d’import subsistent dans la feuille, alors que le parcours cible exclut l’import de reporting. Ils ne doivent pas être considérés comme un besoin métier.

**Décision proposée :** supprimer ces styles uniquement lors d’un lot de nettoyage vérifié, sans toucher au schéma ou aux données dans le chantier UI.

## 6. Cohérence et accessibilité déjà acquises

- Les badges portent un texte et une icône en plus de la couleur : `app/page.tsx:177`.
- Le registre conserve priorité, statut, retard, échéance et responsable sur mobile : `app/page.tsx:1163`.
- Le sélecteur de persona possède les rôles ARIA et la navigation clavier : `app/page.tsx:195`.
- Le focus clavier est centralisé et les doubles bordures sont explicitement contrôlées : `app/globals.css:107-109`.
- Les modales principales utilisent `role="dialog"`, `aria-modal` et un titre associé.
- Les contrôles actuels passent : lint, build, 28 contrôles personas, 20 contrôles Auth et 9 contrôles statiques de bordure/focus.

Ces acquis doivent être protégés par chaque lot.

## 7. Décisions encore nécessaires avant généralisation

1. Confirmer le libellé global à afficher : « Administration » dans les capacités, avec le nom de la personne uniquement dans le profil connecté.
2. Confirmer si les héros sombres BEHIRA doivent rester des surfaces unies ou disparaître au profit d’en-têtes clairs.
3. Valider le plancher typographique proposé pour les métadonnées.
4. Choisir la famille d’icônes commune, sans remplacer le monogramme BEHIRA.
5. Valider si le centre Facility Manager devient bien l’écran pilote avant migration des autres écrans.

## 8. Plan de migration par lots

### Lot UI-0 — Socle sémantique

**Objectif :** consolider les tokens sans modifier le rendu métier.

**Fichiers concernés :**

- `app/globals.css`
- futur `app/components/ui/` pour les primitives légères
- `docs/design/BEHIRA_FM_TRACK_CRITERES_VALIDATION_UI.md`

**Travaux :**

- mapper les couleurs existantes vers les tokens sémantiques ;
- définir l’échelle typographique, les espacements, les rayons, les hauteurs et les ombres ;
- normaliser Button, Badge, Card, Field, EmptyState et StatusRow ;
- conserver toutes les classes attendues par les tests pendant la transition.

**Risques :** régression visuelle transversale et sélecteurs historiques trop spécifiques.

**Critères d’acceptation :** aucun changement fonctionnel, aucun double contour, focus visible, contrastes conformes, lint/build/tests existants réussis.

### Lot UI-1 — Écran pilote : Centre de décision Facility Manager

**Objectif :** tester le nouveau système sur l’écran le plus représentatif.

**Fichiers concernés :**

- `app/page.tsx` pour extraction sans modification métier ;
- futur `app/components/screens/facility-manager-screen.tsx` ;
- primitives créées au Lot UI-0 ;
- styles associés.

**Travaux :**

- en-tête compact et surface BEHIRA sobre ;
- KPI d’action normalisés ;
- file de travail dense ;
- filtres/tabs cohérents ;
- panneau de décision avec statut, priorité, SLA, responsable et action principale ;
- états vide, chargement, erreur, permission et succès ;
- mobile avec cartes structurées et actions accessibles.

**Risques :** masquer une donnée anti-dossier-zombie ou modifier involontairement les états interactifs.

**Critères d’acceptation :** responsable, prochaine action, échéance, preuve, montant, seuil et décision restent visibles ; branches A/B/C inchangées ; desktop/tablette/mobile validés ; clavier et contraste vérifiés.

### Lot UI-2 — Registre et dossier complet

**Objectif :** harmoniser la liste principale et la fiche opérationnelle.

**Fichiers concernés :** composants `Registry` et `Detail` actuellement dans `app/page.tsx`, styles associés.

**Travaux :** table/liste dense, barre de filtres partagée, résumé du dossier, onglets, chronologie, finance et preuves.

**Risques :** perte de visibilité mobile ou confusion entre statut, priorité et SLA.

**Critères d’acceptation :** données critiques visibles sans ouvrir la fiche ; état zéro résultat ; textes longs ; grand volume et pagination préparés ; verrou critique intact.

### Lot UI-3 — Administration, dashboard et scores

**Objectif :** normaliser le pilotage, les arbitrages, les utilisateurs et les scores.

**Fichiers concernés :** `DirectionWorkspace`, `Dashboard`, composants de gestion des agents et zones.

**Travaux :** densité Dub, moins de cartes, décisions directement actionnables, explication des scores, gestion des utilisateurs clairement séparée des arbitrages.

**Risques :** mélanger rôle métier et personne, ou présenter un score sans explication.

**Critères d’acceptation :** coûts, risques, blocages, santé et actions reliés aux listes filtrées ; rôle Administration explicite ; aucune action Auth réellement ajoutée dans ce lot UI.

### Lot UI-4 — Rondes Surpresseur, agents et Agente Rondes & Assistance

**Objectif :** harmoniser les formulaires terrain et les états hors ligne.

**Fichiers concernés :** `Report`, `AgentWorkspace`, `RoundsAssistanceWorkspace`, styles Surpresseur et formulaires.

**Travaux :** formulaires compacts, libellés persistants, unités claires, erreur près du champ, progression, brouillon local, synchronisation et pièces jointes.

**Risques :** affaiblir l’usage mobile ou réintroduire l’idée d’import.

**Critères d’acceptation :** aucune importation, saisie directe explicite, actions tactiles, états hors ligne visibles, double mission Agente Rondes & Assistance préservée.

### Lot UI-5 — Authentification et shell

**Objectif :** aligner l’entrée dans l’application et la navigation sur le système consolidé.

**Fichiers concernés :** `AuthExperience`, `RequiredPasswordChange`, shell, navigation, topbar et sélecteur de persona.

**Risques :** confusion entre démo et Auth réelle, ou régression clavier.

**Critères d’acceptation :** mode démo distinct, première connexion verrouillée, focus visible, navigation mobile stable, aucune modification des règles Auth.

### Lot UI-6 — Nettoyage, états globaux et documentation

**Objectif :** retirer les styles morts, unifier les derniers états et documenter le système final.

**Travaux :** supprimer uniquement les sélecteurs confirmés inutilisés, compléter les états limites, mettre à jour la checklist et le registre des décisions.

**Critères d’acceptation :** aucun style d’import actif, aucun composant dupliqué sans justification, tests et captures finales desktop/mobile.

## 9. Écran pilote recommandé

### Centre de décision Facility Manager

Cet écran est le meilleur pilote car il réunit dans un même parcours :

- navigation et en-tête ;
- KPI opérationnels ;
- filtres et tabs ;
- file de dossiers dense ;
- priorité, statut, responsable, échéance, preuve et SLA ;
- panneau de détail ;
- sélection des branches A/B/C ;
- champs de décision ;
- seuil financier ;
- action principale et retour de succès ;
- contraintes desktop et mobile.

Il permet donc de valider presque tout le design system sans devoir refaire simultanément l’application.

## 10. Gate avant implémentation

Conformément à la passation design, aucune refonte visuelle n’est engagée avant validation des éléments suivants :

- plan de migration par lots ;
- Centre de décision Facility Manager comme écran pilote ;
- conservation de l’identité BEHIRA ;
- usage de « Administration » pour le rôle et de « Administration Démo » pour l’utilisateur connecté ;
- migration progressive sans modification métier.

## 11. Recalage du 28 août 2026 — état contrôlé

Le chantier a été mis en pause après finalisation technique de la modification atomique en cours. Aucun nouveau lot d’écran n’a été lancé.

### 11.1 État du code au checkpoint

| Élément | État | Observation |
| --- | --- | --- |
| Tokens sémantiques UI-0 | Déjà conforme | Couleurs, surfaces, bordures, espacements, rayons, focus et séries de visualisation consolidés. |
| Pilote Facility Manager UI-1 | Partiellement conforme | File et décision lisibles ; la synthèse actuelle ne contient pas encore les huit champs anti-zombie et n’est pas partagée. |
| Score ring bâtiment | Partiellement conforme | Score courant de maquette, composition et causes visibles ; fraîcheur et variation réelles absentes. |
| Tendances 7/30/90 jours | Partiellement conforme | Sélecteur présent ; état « données historiques insuffisantes » affiché sans fabriquer de courbe. |
| Scores équipements | Partiellement conforme | Comparaison visuelle des valeurs déjà présentes dans le référentiel de démonstration ; variation et fraîcheur absentes. |
| Scores agents | Partiellement conforme | Valeurs déjà présentes représentées ; période, échantillon, méthode, variation et facteurs restent à valider. La non-sanction automatique est explicitée. |
| Responsive des visualisations | Déjà conforme au niveau statique | Breakpoints 1180, 700 et 430 px prévus ; validation visuelle finale suspendue avec le chantier. |

### 11.2 Matrice des nouvelles exigences

| Exigence | État | Écart principal |
| --- | --- | --- |
| A. Anti-dossier-zombie partagé | Partiellement conforme | Facility Manager affiche responsable, prochaine action, échéance et preuve. Manquent statut, acteur bloquant, motif et dernière activité ; aucun composant partagé. |
| B. Data visualization | Partiellement conforme | Score ring, comparaisons équipements/agents et état historique insuffisant présents. Pipeline, gravité, ouvertures/clôtures, retards/coûts, heatmap, sparklines justifiées et plages Surpresseur absents. |
| C. Pilote Facility Manager complet | Partiellement conforme | À qualifier, retards et preuves présents. Sans responsable, réceptions, réserves, rouverts, pipeline, gravité, délai moyen et tendances réelles manquent. |
| D. Dossier central en trois zones | À adapter | Le dossier est structuré par onglets et deux colonnes ; la troisième zone décisionnelle permanente reste à créer. |
| E. Cockpit Administration | Partiellement conforme | Santé, risques, coûts, seuil et arbitrages existent. Pipeline, coûts à arbitrer enrichis, comparaison explicable et zones récurrentes manquent. |
| F. Surpresseur enrichi | Partiellement conforme | Cinq étapes, alertes et hors ligne existent. Plages attendues, variation et fraîcheur du score manquent. |
| G. Agente Rondes & Assistance Terrain / Administratif | À adapter | Les deux fonctions existent dans le produit, mais ne sont pas encore séparées par onglets ou contrôle segmenté. |
| H. Scores de performance explicables | Partiellement conforme | Mention de non-sanction ajoutée ; période, échantillon, méthode, variation et facteurs doivent être alimentés et validés. |

### 11.3 Vérification des règles métier

Les changements du checkpoint ne modifient pas :

- les rôles et permissions ;
- le cycle Constat → Qualification → Décision → Intervention → Preuve → Clôture ;
- le seuil de délégation de 400 000 FCFA ;
- les validations de l’Administration ou de Facility Manager ;
- le verrou critique et la gestion des preuves ;
- le fonctionnement hors ligne des rondes ;
- les responsabilités de Administration, Facility Manager, Agent Électricité, Agent Eau & Incendie ou Agente Rondes & Assistance.

Les nouveaux états React concernent uniquement des filtres de présentation. Aucun appel API, schéma Supabase, mutation ou droit n’a été ajouté.

### 11.4 Tests du checkpoint

- lint : réussi ;
- compilation de production : réussie ;
- 28 contrôles personas : réussis ;
- 20 contrôles d’authentification : réussis ;
- préparation Supabase : réussie, sans secret exposé ni schéma modifié ;
- 9 contrôles statiques de bordures et focus : réussis ;
- validation visuelle publiée : non exécutée, conformément à la pause demandée.

### 11.5 Décision de reprise

Le plan précédent est remplacé par `BEHIRA_FM_TRACK_PLAN_IMPLEMENTATION_UI_RECALE.md`. La prochaine proposition est un lot atomique consacré au composant partagé anti-dossier-zombie et à sa première intégration dans Facility Manager. Aucun codage supplémentaire ne doit démarrer sans validation explicite.
