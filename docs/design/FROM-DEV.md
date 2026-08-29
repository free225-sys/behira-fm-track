# FROM-DEV — passation du développement vers le design

Ce journal utilise le même gabarit que `FROM-DESIGN.md` et `DECISIONS.md`. Ajouter les nouvelles entrées en tête sans réécrire les entrées historiques.

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
