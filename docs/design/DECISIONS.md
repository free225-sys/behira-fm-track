# DECISIONS — journal partagé et append-only

Ne jamais supprimer ni réécrire une décision actée. Toute évolution doit prendre la forme d'une nouvelle entrée qui complète ou remplace explicitement une décision antérieure.

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
