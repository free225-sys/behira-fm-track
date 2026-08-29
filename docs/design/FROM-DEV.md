# FROM-DEV — passation du développement vers le design

Ce journal utilise le même gabarit que `FROM-DESIGN.md` et `DECISIONS.md`. Ajouter les nouvelles entrées en tête sans réécrire les entrées historiques.

## DEV-009 — Reprise Dev Lead après le checkpoint design `0580270`

- **Date :** 30 août 2026
- **Auteur :** Dev Lead
- **Statut :** Checkpoint design reçu et vérifié localement — roadmap produit reprise
- **Périmètre :** commits `85413e6` et `0580270`, contrat design vivant, recette du miroir et séquencement produit

Le Dev Lead prend acte des deux commits livrés par le design. Les arbitrages **DEC-011**, **DEC-012** et **DEC-013** sont considérés comme clos conformément à la validation de Wilkam. En particulier, aucune nouvelle surface ne doit redéfinir la marque : `--mark #20b2aa` reste réservé au glyphe B, `--teal #0e6a66` porte l'accent courant, `--accent` reste son alias et le triplet `warning` conserve son rôle métier distinct.

Le spécimen `/design-system`, `:root` et les primitives `Button`, `IconButton`, `Badge`, `Field` et `Card` constituent désormais le contrat obligatoire avant toute évolution d'interface. Les entrées DESIGN-030 à DESIGN-032 sont présentes dans la table de suivi de `FROM-DESIGN.md`, mais leurs corps détaillés ne figurent pas dans le journal ; cette lacune documentaire ne rouvre pas les décisions, dont la portée est confirmée par les commits, `DESIGN.md` et `DECISIONS.md`.

### Recette du checkpoint

- `pnpm audit:visual` : réussi, 62 contrôles après ajout du garde-fou sur les libellés de files ;
- `pnpm verify:personas` : réussi, 32 contrôles ;
- `pnpm lint` et `pnpm build` : réussis ;
- `/` et `/design-system` : HTTP 200 ;
- Geist Sans et Mono : HTTP 200, signature WOFF2 valide ;
- contrôle rendu Facility Manager à 390, 768 et 1024 px : sept files visibles, trois compteurs prioritaires visibles, `aria-current` présent et aucun débordement horizontal.

La recette de rendu a détecté une seule exception au contrat DEC-003 : les sept libellés `<small>` des files héritaient de la taille relative du navigateur et rendaient à 9,6 px. Le correctif ne crée aucun style : il applique `var(--font-size-label)` à ces libellés et ajoute un contrôle statique dédié. Aucun rôle, droit, statut, route, jeu de données, handler ou API n'est modifié.

Le checkpoint design est donc **clos dans le miroir local**. Aucune publication ni configuration de déploiement n'est ajoutée dans ce lot. La branche distante reste au checkpoint reçu tant qu'un envoi explicite de ce nouveau commit n'est pas demandé.

### Roadmap produit et technique reprise après DEV-008

| Lot atomique | Objectif | Périmètre autorisé dans le miroir | Condition de sortie |
| --- | --- | --- | --- |
| **P1 — Contrat DEC-002** | Fermer la nomenclature et la matrice des destinations | Documenter la correspondance entre les cinq destinations existantes et les quatre destinations autonomes attendues : Équipements, Coûts, Utilisateurs et droits, Seuils et paramètres. Aucun écran ni accès nouveau dans ce sous-lot. | Noms, source de données, rôle lecteur, rôle acteur, CTA et état vide validés explicitement. |
| **P2 — Équipements** | Extraire une destination autonome à partir du parc déjà visible | Réutiliser les données et composants existants, sans créer de donnée ni modifier `allowedViewsByPersona`. L'activation dans la navigation attend la validation de la matrice P1. | Liste, recherche, santé explicable, état insuffisant, responsive et accès validés. |
| **P3 — Coûts** | Rassembler les montants et arbitrages existants | Vue de lecture et de décision fondée uniquement sur les montants déjà présents ; aucune tendance, facture ou paiement inventé. | Estimé, engagé, seuil, décision et pièces reliés au dossier avec état insuffisant. |
| **P4 — Utilisateurs et droits** | Séparer l'administration fonctionnelle de la démonstration | Dans le miroir : spécification et état de démonstration uniquement. La création réelle d'un compte reste un traitement serveur du dépôt privé, jamais une clé d'administration dans le navigateur. | Matrice des rôles validée, création/désactivation/rattachement de périmètre spécifiés et audités. |
| **P5 — Seuils et paramètres** | Rendre les paramètres métier lisibles et historisables | Présentation des seuils existants sans modification de règle dans le miroir. Toute édition réelle exige modèle canonique, historique et RLS dans le dépôt privé. | Valeur, unité, portée, auteur, justification et historique définis. |
| **P6 — Dossier central** | Réutiliser la synthèse anti-dossier-zombie au niveau détaillé | Recomposition de la fiche avec les composants existants après raccordement canonique des huit champs dans le dépôt privé. | Aucune double source, CTA conforme au rôle, mobile sans perte d'information. |
| **P7 — Terrain et résilience** | Consolider rondes, Surpresseur et double mission Rondes & Assistance | Rondes puis actions/preuves terrain ; synchronisation, idempotence, conflits et reprise après erreur spécifiés avant activation hors ligne. | Scénarios en ligne/hors ligne, preuves, erreurs et reprise testés. |
| **P8 — Recette de livraison** | Préparer la validation métier et la production | Recette par persona, sécurité/RLS dans le dépôt privé, accessibilité, performance, sauvegarde et plan de retour arrière. | GO métier Administration + Facility Manager, puis publication contrôlée hors du miroir public. |

Le lot **P1 — Contrat DEC-002** est livré dans `docs/design/DEC-002_CONTRAT_DESTINATIONS.md`. Il inventorie les cinq destinations existantes, les quatre destinations attendues, leurs sources réelles et leurs lacunes, puis soumet six arbitrages avant codage. L'ajout effectif de destinations ou leur attribution à des personas attend une validation explicite, car il modifierait la navigation visible et potentiellement la matrice d'accès.

## DEV-008 — Arbitrage DEC-007 : cockpit Facility Manager opérationnel d'abord

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté — recette finale et publication en cours
- **Périmètre :** ordre de lecture du cockpit Facility Manager

Wilkam a validé l'option A de DEC-005. DEC-007 consigne l'arbitrage sans réécrire l'historique. Le cockpit présente maintenant un contexte opérationnel compact avec le seuil de délégation, puis les compteurs, la file et son dossier actif, le flux opérationnel, et enfin la synthèse Santé & Performance.

La synthèse de santé reste complète, mais ne masque plus la première action sur les écrans portables courants. Son texte est mis à jour pour ne plus affirmer qu'elle précède les files. Un contrôle automatique protège désormais l'ordre canonique.

- **Suite proposée :** recette responsive finale, publication sur l'URL de validation existante, puis ouverture du lot produit DEC-002.

## DEV-007 — Réponse à DESIGN-015 à DESIGN-017 : recette close et badges sécurisés

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — prêt à figer après arbitrage DEC-005
- **Périmètre :** clôture de recette, badges de statut, décision mono-thème et garde-fous automatiques

Le **GO PUBLICATION** de DESIGN-015 est pris en compte : Geist est chargée, les correctifs Surpresseur et Administration sont maintenus, et la vérification ciblée en 1440 × 900 puis 375 × 812 ne révèle aucun débordement, aucune troncature de badge ni texte sous 12 px.

La forme à rail latéral de DESIGN-017 est conservée. Les variantes de badge portent maintenant leur disposition `inline-flex` et leur rail de 3 px avec une spécificité suffisante pour ne plus être écrasées par une règle de conteneur. Les pastilles d’environnement et de provenance restent volontairement distinctes.

Deux contrôles complètent la recette :

- les badges de statut doivent conserver la disposition partagée et le rail latéral ;
- DEC-006 interdit tout mécanisme `prefers-color-scheme` ou `data-theme` dans la feuille de styles, commentaires exclus.

### Contrôles réalisés

- rendu desktop et mobile : zéro débordement horizontal, badges lisibles et non tronqués ;
- police Geist chargée, `aria-current` présent, aucun texte visible sous 12 px ;
- `pnpm lint`, `pnpm build`, `pnpm audit:visual`, `pnpm verify:personas` : réussis ;
- aucune modification de donnée, de rôle, de permission ou de règle métier ;
- aucune publication effectuée dans ce lot.

- **Suite proposée :** arbitrer DEC-005, figer le checkpoint de design, publier la validation, puis ouvrir le lot produit DEC-002.

## DEV-006 — Réponse à DESIGN-014 : régressions de clôture corrigées

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — publication toujours en attente de la recette éclair Design
- **Périmètre :** Polices auto-hébergées, bandeau Surpresseur grand écran, badge Administration et arbitrage d’ordre du cockpit

Les trois régressions bloquantes de DESIGN-014 sont corrigées sans changement de donnée, de rôle ou de règle métier :

- **R1 — Geist :** les variantes Sans et Mono sont maintenant servies depuis `public/fonts/` aux deux URL attendues par le paquet `geist`. Un contrôle réseau dédié échoue sur tout statut autre que HTTP 200, vérifie la signature WOFF2 et refuse un type de contenu inattendu. Les deux ressources sont également présentes dans le build de déploiement.
- **R2 — Surpresseur :** au palier grand écran, la marge négative et le padding horizontal du bandeau reprennent exactement `clamp(32px,3.2vw,60px)`, la même formule que `.content`. Le contrat est protégé par l’audit statique.
- **R3 — Administration :** le badge `ACCÈS ADMIN` porte désormais `flex:0 0 auto` et `min-width:max-content`, ce qui interdit sa compression dans `.authority-split`.

L’ordre du cockpit n’est pas déclaré acté. **DEC-005** expose les options « priorité opérationnelle DEC-004 » et « vue d’ensemble d’abord », avec un statut explicitement proposé et un arbitrage demandé à Wilkam.

### Contrôles réalisés

- polices Sans et Mono : HTTP 200, signature WOFF2 valide ;
- `pnpm lint`, `pnpm build`, `pnpm audit:visual` : réussis ;
- build de déploiement : les deux fichiers Geist sont présents sous `dist/client/fonts/` ;
- aucun fichier Supabase, secret, rôle ou permission modifié ;
- aucune publication effectuée.

- **Suite proposée :** recette éclair Design sur R1 à R3, arbitrage Wilkam sur DEC-005, puis publication du checkpoint accepté.

## DEV-005 — Correctifs de recette mobile du checkpoint `ec3ec06`

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** Implémenté et vérifié localement — non publié
- **Périmètre :** `app/globals.css`, `scripts/audit-visual-styles.mjs`

Les trois défauts bloquant la publication signalés dans DESIGN-013 sont corrigés sans modification de l'interface métier :

- toutes les variantes de badge portent désormais leur encre avec le sélecteur à deux classes `.badge.badge-*`, ce qui les protège des règles de couleur liées à la position dans un conteneur ;
- le bandeau de la ronde Surpresseur reprend exactement le retrait mobile de 16 px et ne dépasse plus le viewport à 375 px ;
- le sélecteur des cinq étapes reste borné à la largeur disponible et propose un défilement horizontal visible et tactile ;
- les champs de formulaire et leurs conteneurs peuvent se comprimer malgré une option métier longue, sans élargir la page.

Les nouveaux contrôles statiques protègent ces quatre contrats. La recette de rendu cible « Mes rondes » et l'espace agent à 375 px, ainsi que la couleur calculée du badge « Surveillance ».

- **Suite proposée :** recette rapide du design sur les écrans concernés, puis publication du checkpoint accepté et ouverture du lot DEC-002 sur les destinations autonomes.

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
