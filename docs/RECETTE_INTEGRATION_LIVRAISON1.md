# Recette visuelle livraison 1

Source privée : b705e572418433bae00955eab19c32afdd08f11a, incluant 3c5e15d et a17f95c. Copie issue du miroir public a17f95c, sans historique privé, comptes, rapports réels, migrations ou secrets. Les noms de personnes dans les composants sont remplacés par leurs rôles. Les imports clients connectés sont présents, sans configuration réelle.

## Cinq profils
Node >=22.13 ; pnpm install --frozen-lockfile puis pnpm dev. Sans configuration Supabase, sélectionner les cinq profils de démonstration. Recette à 1440 et 380 px.

## Formulaires connectés WILO/RIA
Installer les outils de test : npm install --prefix tests/browser --ignore-scripts (Playwright 1.62.1). Chrome doit être installé.

La navigation Eau en démonstration reste EauRounds. Pour tester les vrais composants RiaForm et LegacyReport WILO : pnpm preview:water:ui, puis http://127.0.0.1:4187 (RIA) ou http://127.0.0.1:4187/?wilo (WILO). Le banc injecte des données fictives et un transport simulé, sans accès distant. Aucun test de persistance serveur n’est revendiqué ; ce banc est exclu du build applicatif.

Tests : pnpm audit:visual ; pnpm verify:personas ; pnpm verify:lot0 ; pnpm verify:lot1 ; pnpm verify:water:ui. Le dernier teste WILO/RIA à 1440 et 380 px. Compléter par la recette visuelle des cinq profils.

Aucun déploiement. Candidat de préproduction : b705e57 dans integration/livraison1-design077, sous réserve des écarts de recette. Le hash public diffère car il exclut l’historique privé.
