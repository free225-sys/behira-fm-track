# DECISIONS — journal partagé et append-only

Ne jamais supprimer ni réécrire une décision actée. Toute évolution doit prendre la forme d'une nouvelle entrée qui complète ou remplace explicitement une décision antérieure.

## DEC-005 — Ordre initial du cockpit Facility Manager

- **Date :** 29 août 2026
- **Auteur :** Dev Lead
- **Statut :** **Proposé — arbitrage de Wilkam requis, non acté**
- **Périmètre :** Première page du cockpit Facility Manager après authentification
- **Contexte :** DEC-004 a acté l’ordre « contexte, compteurs, file de travail, flux, tendances ». La restructuration du cockpit au commit `6dcd654` place désormais « Santé & Performance » avant les compteurs et la file de travail. Ce choix donne immédiatement l’état du bâtiment, du parc technique et de l’équipe, mais il modifie une séquence déjà adoptée et ne peut donc pas devenir canonique par le seul fait du code.
- **Décision ou question :** Wilkam doit choisir entre les deux options suivantes :
  - **Option A — priorité opérationnelle DEC-004 :** contexte → compteurs → file de travail → flux → santé et tendances ;
  - **Option B — vue d’ensemble d’abord :** santé et performance → compteurs → file de travail → flux et tendances.
- **Proposition du Dev Lead :** retenir l’option B si le cockpit doit d’abord répondre à « quel est l’état du bâtiment ? », avec des cartes compactes et actionnables ; retenir l’option A si la priorité absolue reste « quel dossier dois-je traiter maintenant ? ». L’implémentation actuelle de l’option B demeure provisoire jusqu’à l’arbitrage.
- **Fichiers concernés :** `app/page.tsx`, `app/globals.css`
- **Impacts attendus :** Ordre de lecture, hauteur avant la file de travail, perception de la priorité métier. Aucun impact sur les rôles, les droits, les données ou le workflow.
- **Contrôles attendus :** Valider le premier écran à 1440, 1024, 768 et 375 px ; mesurer la position de la première action de file ; conserver un seul titre visible par écran et le plancher typographique de 12 px.
- **Suite proposée :** Après choix de Wilkam, passer le statut de cette entrée à « Adopté » dans une nouvelle décision ou ajouter une entrée qui confirme explicitement le maintien de DEC-004.

## DEC-004 — Navigation en bandeau haut sur desktop

- **Date :** 29 août 2026
- **Auteur :** wilkam
- **Statut :** Adopté
- **Périmètre :** Coquille applicative, desktop au-dessus de 700 px
- **Contexte :** La direction artistique demande une « barre latérale stable sur desktop ». Le rail occupe 244 px fixes, ce qui a contraint le registre à basculer en cartes structurées dès 1280 px au lot 2, au prix d'une page deux fois plus haute à 1024 px. Le rail laissait par ailleurs près de 200 px de vide pour les profils à deux entrées. Mesures comparées sur la largeur de ligne du registre : 696 px avec le rail à 1024 px, 940 px avec le bandeau ; le tableau à six colonnes tient jusqu'à 961 px au lieu de céder à 1280 px.
- **Décision ou question :** La navigation passe en **bandeau horizontal en haut** sur desktop. Cette décision **déroge explicitement** au cadrage de `BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md`, section « Navigation ». La dérogation est assumée et motivée par la densité opérationnelle regagnée, pas par une préférence esthétique. La navigation mobile en barre basse, sous 700 px, reste inchangée.
- **Conséquences actées :**
  - Le seuil de bascule du registre en cartes redescend de 1280 px à 960 px.
  - Les glyphes Unicode `◈ ⌂ ≡ ◎ ✓` disparaissent de la navigation desktop : un bandeau horizontal se lit en texte. Ils subsistent sur la barre mobile, à remplacer par une famille tracée.
  - L'ordre de la première page après authentification devient : contexte, compteurs, file de travail, flux, tendances.
- **Point ouvert :** Tension avec DEC-002. La nomenclature adoptée prévoit jusqu'à neuf destinations groupées pour l'Administration ; un bandeau horizontal ne porte pas de groupes nommés et sature vers sept ou huit entrées. À trancher avant l'implémentation de la nomenclature : menu « Plus » en débordement, ou réduction du nombre de destinations exposées.
- **Fichiers concernés :** `app/globals.css`, et `app/page.tsx` si les suppressions de titres dupliqués sont portées au balisage
- **Impacts attendus :** Aucun changement de logique, de rôle ni de permission. Mise à jour de la section « Navigation » de la direction artistique à prévoir, pour que le document cesse de contredire le produit.
- **Contrôles attendus :** `pnpm lint`, `pnpm build`, `pnpm verify:personas`, `pnpm audit:visual`, plus vérification sans débordement horizontal de 760 à 1600 px et barre mobile intacte sous 700 px.
- **Suite proposée :** Voir DESIGN-010 et DESIGN-011 dans `FROM-DESIGN.md`.

## DEC-003 — Plancher typographique à 12 px

- **Date :** 29 août 2026
- **Auteur :** Wilkam — Design
- **Statut :** Adopté
- **Périmètre :** Ensemble de l'interface, y compris badges et métadonnées
- **Contexte :** L'inventaire révèle encore de nombreuses tailles inférieures à 12 px, au détriment de la lisibilité et de l'accessibilité.
- **Décision ou question :** Aucune taille de texte ne doit rester inférieure à 12 px. Cette règle couvre les badges, légendes, aides, métadonnées et micro-libellés. Le coût en densité se mesure et se corrige sur le registre ; il ne justifie pas une exception ailleurs.
- **Fichiers concernés :** `app/globals.css` et futurs composants partagés
- **Impacts attendus :** Lisibilité accrue ; adaptation spécifique de la densité du registre à mesurer avant généralisation.
- **Contrôles attendus :** Audit automatisé des `font-size`, captures 390/768/1440, absence de troncature et conservation des informations critiques.
- **Suite proposée :** Implémenter dans un lot visuel distinct après les lots 1A/1B ; ne pas le mélanger au nettoyage sans changement visuel.

## DEC-002 — Nomenclature unique des destinations

- **Date :** 28 août 2026
- **Auteur :** Wilkam — Design
- **Statut :** Adopté
- **Périmètre :** Sidebar, titre principal, titre du document et futures routes
- **Contexte :** Une même destination porte actuellement plusieurs appellations et certaines entrées changent de nature selon le profil. Les routes ne doivent pas figer ces noms historiques.
- **Décision ou question :** Le catalogue validé est organisé par nature d'objet :

  | Groupe | Destinations visibles |
  | --- | --- |
  | Mon travail | **À traiter** — ou **À valider** selon le droit d'arbitrage ; **Mes rondes** ; **Signaler une anomalie** |
  | Le bâtiment | **Anomalies** ; **Équipements** |
  | Pilotage | **Vue d'ensemble** ; **Coûts** |
  | Administration | **Utilisateurs et droits** ; **Seuils et paramètres** |

  Un catalogue unique doit alimenter la sidebar, le `<h1>`, le `<title>` et la future route. Les routes découleront de ces libellés après implémentation. `/espace` et `/facility-manager` ne sont pas retenues.
- **Fichiers concernés :** `app/page.tsx` puis futures routes
- **Impacts attendus :** Cohérence du vocabulaire sans changement de rôle ni de permission.
- **Contrôles attendus :** `pnpm verify:personas`, un seul `<h1>` par écran et correspondance sidebar/titre/route sur les cinq profils.
- **Suite proposée :** Appliquer les libellés avant toute publication du chantier B.

## DEC-001 — Source canonique de l'orange BEHIRA à confirmer

- **Date :** 28 août 2026
- **Auteur :** Dev Lead
- **Statut :** Ouvert
- **Périmètre :** Identité visuelle et tokens de marque
- **Contexte :** Le code utilise actuellement `--orange: #ee8b2d`, tandis que l'illustration Open Graph présente visuellement une autre nuance. Aucune source de marque canonique n'est fournie dans ce miroir.
- **Décision ou question :** Ne pas inventer une nouvelle valeur et ne pas confondre accent de marque et état `warning`. Documenter la source retenue avant de modifier les couleurs.
- **Fichiers concernés :** `app/globals.css`, `public/og.png`, `docs/design/DESIGN.md`
- **Impacts attendus :** Accent principal, boutons, badges et visualisations.
- **Contrôles attendus :** Comparaison des usages, contraste WCAG et captures sur fond clair.
- **Suite proposée :** Résoudre avant la migration des couleurs orange écrites en dur.

## DEC-000 — Miroir public strictement démonstratif

- **Date :** 28 août 2026
- **Auteur :** Dev Lead
- **Statut :** Adopté
- **Périmètre :** Publication du code destiné au designer
- **Contexte :** Le dépôt public est reconstruit depuis un checkpoint privé puis anonymisé. Le backend, les migrations, les secrets, les comptes réels et la configuration de publication ne sont pas inclus.
- **Décision ou question :** Le dépôt public sert uniquement au design. Il ne devient pas la source de vérité métier ni la base d'un déploiement.
- **Fichiers concernés :** Ensemble du dépôt public
- **Impacts attendus :** Démonstration locale autonome, historique Git neuf et données exclusivement fictives.
- **Contrôles attendus :** Scan des secrets et identifiants, installation propre, lint, build et contrôles frontend.
- **Suite proposée :** Reporter toute décision métier ou backend dans le dépôt privé piloté par le Dev Lead.
