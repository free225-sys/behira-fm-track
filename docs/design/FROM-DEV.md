# FROM-DEV — passation du développement vers le design

Ce journal utilise le même gabarit que `FROM-DESIGN.md` et `DECISIONS.md`. Ajouter les nouvelles entrées en tête sans réécrire les entrées historiques.

## DEV-004 — Lot 6 : encres sémantiques raccordées et contrôlées sur le rendu réel

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** `app/globals.css`, `scripts/audit-visual-styles.mjs`, `scripts/verify-personas.mjs`

Le lot 6 consomme désormais un triplet **surface / bordure / encre** pour chacun des cinq rôles de DESIGN-007 : danger, avertissement, succès, information et neutre. Les tokens de rôle historiques restent réservés aux éléments non textuels — barres, pastilles et graphiques — tandis que les textes posés sur une surface teintée utilisent une encre dédiée respectant le seuil de 4,5:1 à 12 px.

La mesure dans le navigateur a aussi révélé quatre collisions de spécificité que la lecture statique ne montrait pas : le libellé de contexte Facility Manager reprenait l'encre d'un fond clair sur le bandeau bleu ; une règle de tête Direction repeignait les badges ; les badges de la liste utilisateurs héritaient du carré avatar ; les libellés de fraîcheur du score héritaient de l'encre claire de la carte sombre. Ces collisions sont corrigées sans modifier les données, les rôles ni les actions disponibles.

### Vérifications réalisées

- les cinq triplets atteignent au minimum 4,5:1 sur leur surface canonique ;
- 14 combinaisons persona × rubrique contrôlées dans le navigateur : zéro texte visible sous le seuil après correction ;
- Facility Manager vérifié sur ses cinq rubriques à 375, 768 et largeur desktop ;
- le registre, le shell, la navigation, les personas et les parcours existants restent inchangés ;
- le carrousel interne de progression des rondes conserve son défilement horizontal volontaire sur mobile, sans ajout de contenu ni de logique ;
- aucune modification Supabase, migration, permission, règle métier ou publication.

- **Suite proposée :** faire relire ce checkpoint par le design, puis clôturer le socle visuel. Le lot suivant doit porter sur la nomenclature et les destinations autonomes de DEC-002, pas sur une nouvelle variation de palette.

## DEV-003 — Lots 2 à 5 consolidés : shell refondu et vérifié

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** `app/page.tsx`, `app/globals.css`, `scripts/audit-visual-styles.mjs`

Les lots 2, 3 et 4 ont été intégrés dans trois checkpoints distincts, puis la spécification visuelle du lot 5 a été réimplémentée proprement. Le bloc CSS de surcharge fourni comme maquette n'a pas été ajouté : le rail a réellement quitté le balisage et la feuille ne contient plus de sélecteur `.sidebar`.

### Shell et navigation

- `<aside class="sidebar">` est remplacé par un `<header class="app-navigation">` contenant un vrai `<nav>` ;
- un seul catalogue typé alimente le bandeau desktop et la barre mobile ;
- les glyphes Unicode sont remplacés par une petite famille SVG tracée et réservée au mobile ;
- l'état actif combine libellé renforcé, filet ou fond selon la largeur, et `aria-current="page"` ;
- les groupes du futur menu `Plus` reprennent exactement **Mon travail**, **Le bâtiment**, **Pilotage** et **Administration** ; les droits sont filtrés avant le découpage visible/débordement ;
- le déclencheur `Plus` conserve un état actif lorsque la destination courante appartient au débordement ;
- le site, le nom d'utilisateur et le mot-symbole se contractent aux paliers 1240 et 1100 px ;
- la pastille ambre **Démo** reste visible sur desktop et mobile, avec le libellé complet disponible aux technologies d'assistance.

Le menu `Plus` ne s'affiche pas encore dans les cinq profils actuels, car aucun n'a plus de cinq destinations autorisées. Son contrat est prêt, sans création de page ni de permission. Le catalogue complet de DEC-002 reste un lot produit ultérieur : les écrans **Équipements**, **Coûts**, **Utilisateurs et droits** et **Seuils et paramètres** n'existent pas encore comme destinations autonomes. La rubrique historique **Mon espace** reste donc visible pour Facility Manager tant que son contenu n'est pas redistribué ; aucune publication ne doit figer cette exception.

### Première page Facility Manager

- le titre et la rubrique dupliqués ont été retirés du JSX, pas masqués en CSS ;
- la section conserve uniquement la phrase de contexte et le seuil de délégation ;
- l'ordre du DOM est maintenant : contexte, compteurs, file de décisions, flux, scores et tendances ;
- le chrome supérieur mesure 212 px aux largeurs desktop courantes et 220 px entre 701 et 900 px, soit moins d'un quart d'un viewport de test de 900 px ;
- le seuil et les compteurs restent lisibles à 760 px sans chevauchement.

### Registre et contrôles

- le tableau complet, responsable compris, reste visible à 961 px ;
- le repli en cartes s'active à 960 px et conserve priorité, statut, échéance et responsable ;
- le contrôle statique s'appelle désormais **Repli du registre avec responsable** et ne dépend plus d'une chaîne de media query ;
- trois garde-fous supplémentaires protègent l'absence de rail résiduel, l'état courant accessible et la visibilité du marqueur Démo ;
- un contrôle protège aussi la préparation du menu `Plus` groupé.

### Vérifications réalisées

- `pnpm lint` : réussi ;
- `pnpm build` : réussi ;
- `pnpm verify:personas` : 32/32 ;
- `pnpm audit:visual` : 18/18 ;
- rendu réel dans le navigateur : 1440, 1240, 1100, 1024, 961, 960, 760, 701, 700 et 375 px ;
- aucun débordement horizontal et aucun texte visible inférieur à 12 px ;
- focus clavier visible à 2 px, `aria-current` confirmé et aucune erreur console ;
- aucun changement de rôle, permission, règle métier ou source Supabase ; aucune publication.

- **Suite proposée :** valider ce checkpoint de shell, terminer la nomenclature DEC-002 lorsque les destinations autonomes sont définies, puis seulement ouvrir le lot 6 sur les encres sémantiques de DESIGN-007.

## DEV-002 — Réponse à DESIGN-011 : refonte propre du shell avant le lot 6

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Décision transmise — refonte structurelle retenue
- **Périmètre :** Shell de navigation, sémantique de `page.tsx`, catalogue de destinations et contrôle responsive du registre
- **Contexte :** Wilkam a retenu la navigation en bandeau haut. Le caractère réversible de la surcharge CSS n'est donc plus un bénéfice suffisant pour conserver deux mises en page concurrentes. La réversibilité doit être assurée par Git, pas par une seconde architecture laissée active dans la feuille de styles. Par ailleurs, `lot5-bandeau-haut.patch` cible l'état produit par les lots 3 et 4, qui ne sont pas encore intégrés dans la branche de développement courante : il doit servir de spécification visuelle jusqu'à consolidation de cette base, et non être forcé sur le code actuel.

### 1. Shell : refonte propre maintenant

La surcharge appendue ne doit pas devenir l'implémentation finale. Avant le lot 6, le développement doit remplacer proprement le rail desktop par un bandeau haut et supprimer les règles devenues obsolètes.

- garder une seule définition structurelle de `.app-shell`, de la navigation et de `.main-column` ;
- extraire une navigation partagée alimentée par le même catalogue pour le bandeau desktop et la barre basse mobile ;
- employer un élément sémantique de tête et un vrai `<nav>`, plutôt qu'un `<aside>` transformé visuellement en bandeau ;
- conserver le comportement mobile sous 700 px sans dupliquer les droits ni les libellés ;
- intégrer dans cette refonte les résultats visuels validés du lot 5 : bandeau resserré, contexte avant les compteurs, file de décisions avant l'analyse et registre en tableau jusqu'à 961 px ;
- conserver le commit précédent comme point de retour. Aucun bloc CSS de compatibilité permanent ne sera maintenu après validation de la refonte.

### 2. Contenu masqué : deux suppressions acceptées, « Démo » maintenu visible

Le titre et la rubrique qui répètent le `<h1>` de la page doivent sortir du balisage du bloc `manager-command-hero`, pas seulement recevoir `display:none`. La page conserve un seul `<h1>` visible. Le bloc devient une section de contexte opérationnel, nommée de façon accessible, qui contient la phrase explicative et le seuil de délégation.

En revanche, **« Mode démonstration » ne doit pas devenir uniquement perceptible par un lecteur d'écran**. C'est une information de sécurité et d'environnement utile à tous les utilisateurs : elle évite de confondre une action simulée avec une action enregistrée. La version finale affichera un badge compact **« Démo »** près du profil ou du site, avec le libellé accessible complet **« Environnement de démonstration »**. Le traitement CSS de type `clip` est donc refusé comme solution finale pour cette mention.

Une demande de modification de `page.tsx` est requise pour ces trois éléments ; les masquer par CSS reste acceptable uniquement dans la maquette de comparaison.

### 3. Neuf destinations : catalogue conservé, débordement groupé dans « Plus »

Le catalogue de DEC-002 ne doit pas être réduit pour s'adapter au bandeau. Le code actuel n'expose que cinq destinations et `allowedViewsByPersona` en autorise au maximum cinq par profil ; la tension apparaîtra lors de l'implémentation complète du catalogue Administration.

La solution retenue est :

- quatre à six destinations prioritaires visibles selon le persona et la largeur disponible ;
- un bouton **« Plus »** pour les destinations secondaires ;
- des rubriques visibles dans ce menu : **Mon travail**, **Le bâtiment**, **Pilotage**, **Administration** ;
- filtrage par les droits avant répartition entre navigation principale et menu « Plus » : le menu n'accorde jamais un accès supplémentaire ;
- état actif visible lorsque la destination courante se trouve dans « Plus » ;
- clavier complet : Tab, flèches, Entrée, Échap, retour du focus au déclencheur ;
- un seul catalogue typé portant au minimum l'identifiant, le libellé, le groupe, la priorité d'affichage et les personas autorisés. Ce catalogue alimentera ensuite le menu, le `<h1>`, le `<title>` et les routes prévues par DEC-002.

Le menu « Plus » est donc tenable et préférable à la suppression de destinations métier.

### 4. Contrôle « Responsable visible »

La nouvelle intention est correcte, mais le nom **« Responsable visible sur desktop étroit »** et une recherche de chaîne de media query restent trop liés à l'implémentation. Le contrôle doit être renommé **« Repli du registre avec responsable »** et vérifier deux capacités :

1. le balisage de la carte contient réellement le libellé **« Responsable interne »** et sa valeur ;
2. un mode responsive rend `.registry-mobile-details` visible lorsque l'en-tête du tableau est masqué.

Le contrôle statique peut protéger la présence de ces deux contrats, mais il doit être complété par un test de rendu à une largeur de chaque côté du seuil. La valeur numérique du seuil ne doit pas être codée dans le nom ni dans l'assertion.

### Ordre d'exécution retenu

1. consolider les lots 2, 3 et 4 sur une base unique et vérifiée ;
2. refondre le shell et le balisage de `page.tsx` ;
3. intégrer les paramètres visuels du lot 5 sans bloc de surcharge permanent ;
4. ajouter le catalogue groupé et le menu « Plus » ;
5. vérifier les cinq personas, le clavier et les seuils 1440 / 1024 / 961 / 960 / 700 / 375 px ;
6. seulement ensuite ouvrir le lot 6 sur les encres sémantiques de DESIGN-007.

- **Fichiers concernés :** `app/page.tsx`, `app/globals.css`, `scripts/audit-visual-styles.mjs`, `docs/design/DECISIONS.md`
- **Impacts attendus :** une seule architecture de navigation, aucune perte de destination, indication Démo visible et contrôles moins fragiles.
- **Contrôles attendus :** lint, build, personas, audit visuel, navigation clavier, correspondance menu/titre/droits et vérification responsive réelle.
- **Suite proposée :** préparer un lot de refonte du shell basé sur ces décisions ; ne pas appliquer directement le bloc CSS appendu du lot 5 et ne pas publier avant sa recette.

## DEV-001 — Correspondance actuelle des profils anonymisés

- **Date :** 28 août 2026
- **Auteur :** Dev Lead
- **Statut :** Transmis
- **Périmètre :** Personas de démonstration et écrans associés
- **Contexte :** Le miroir public remplace toute identité nominative par un rôle fictif stable. Cette correspondance inverse permet au designer de relier chaque libellé visible au contrat frontend existant.
- **Décision ou question :** Conserver les identifiants techniques et les capacités existantes ; ne pas créer de rôle ou de permission pendant les lots design.
- **Correspondance :**

  | Libellé visible | `PersonaId` | Espace principal | Composant actuel |
  | --- | --- | --- | --- |
  | Administration Démo | `administration` | Arbitrages et pilotage | `DirectionWorkspace` |
  | Facility Manager Démo | `facility` | Centre de décision | `FacilityManagerWorkspace` |
  | Agent Électricité Démo | `electricite` | Terrain électricité | `AgentWorkspace` |
  | Agent Eau & Incendie Démo | `eau_incendie` | Terrain eau/incendie | `AgentWorkspace` |
  | Agente Rondes & Assistance Démo | `rondes_assistance` | Terrain et administratif | `RoundsAssistanceWorkspace` |

- **Fichiers concernés :** `app/page.tsx`, `app/globals.css`
- **Impacts attendus :** Les maquettes et composants doivent rester compatibles avec les cinq profils.
- **Contrôles attendus :** `pnpm verify:personas`, desktop, tablette, mobile et clavier.
- **Suite proposée :** Lot 1 — consolidation des tokens sémantiques sur `design/lot-1-tokens`.
