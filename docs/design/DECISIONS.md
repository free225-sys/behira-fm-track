# DECISIONS — journal partagé et append-only

Ce journal utilise le même gabarit que `FROM-DEV.md` et `FROM-DESIGN.md`. Ne pas supprimer ni réécrire une décision : ajouter une nouvelle entrée qui la complète ou la remplace explicitement.

## DEC-001 — Source canonique de l'orange BEHIRA à confirmer

- **Date :** 28 août 2026
- **Auteur :** Dev Lead
- **Statut :** Ouvert
- **Périmètre :** Identité visuelle et tokens de marque
- **Contexte :** Le code utilise actuellement `--orange: #ee8b2d`, tandis que l'illustration Open Graph présente visuellement une autre nuance. Aucune source de marque canonique n'est fournie dans ce miroir.
- **Décision ou question :** Ne pas inventer une nouvelle valeur. Le designer doit documenter la source retenue et obtenir validation avant de modifier le token.
- **Fichiers concernés :** `app/globals.css`, `public/og.png`, `docs/design/DESIGN.md`
- **Impacts attendus :** Accent principal, boutons, badges, graphiques et états de focus éventuels.
- **Contrôles attendus :** Comparaison des usages, contraste WCAG et captures sur fond clair.
- **Suite proposée :** Résoudre pendant le lot de tokens, avant toute migration globale des écrans.

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
