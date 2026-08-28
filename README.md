# BEHIRA FM Track — miroir public design

Miroir public **anonymisé** destiné à la revue et aux contributions UI/UX. Il contient le frontend et sa documentation design, sans base Supabase, migration, donnée réelle, secret ni configuration de déploiement. La démonstration fonctionne localement avec des données fictives.

Source de référence privée : checkpoint `72acc55f56a35d6c33cf615d692d5eec6f861008`. Le miroir possède volontairement un historique Git neuf.

## Prérequis et lancement

- Node.js `>= 22.13.0` — testé avec `24.16.0`
- pnpm `11.19.0`

```bash
pnpm install --frozen-lockfile
pnpm dev
```

Ouvrir ensuite `http://localhost:3000`. Aucun fichier `.env` ni accès réseau Supabase n'est requis. Les identifiants de démonstration sont affichés dans l'écran de connexion ; aucun mot de passe n'est documenté ici.

## Profils fictifs disponibles

- Administration Démo
- Facility Manager Démo
- Agent Électricité Démo
- Agent Eau & Incendie Démo
- Agente Rondes & Assistance Démo

## Contrôles

```bash
pnpm lint
pnpm build
pnpm verify:auth
pnpm verify:personas
pnpm verify:anti-zombie
pnpm audit:visual
```

## Documentation design

- Direction générale : [`docs/design/DESIGN.md`](docs/design/DESIGN.md)
- Direction artistique : [`docs/design/BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md`](docs/design/BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md)
- Critères de validation : [`docs/design/BEHIRA_FM_TRACK_CRITERES_VALIDATION_UI.md`](docs/design/BEHIRA_FM_TRACK_CRITERES_VALIDATION_UI.md)
- Plan UI : [`docs/design/BEHIRA_FM_TRACK_PLAN_IMPLEMENTATION_UI_RECALE.md`](docs/design/BEHIRA_FM_TRACK_PLAN_IMPLEMENTATION_UI_RECALE.md)
- Estimation du refactor : [`docs/design/ESTIMATION_REFACTOR_COMPOSANTS.md`](docs/design/ESTIMATION_REFACTOR_COMPOSANTS.md)
- Passation développeur → design : [`docs/design/FROM-DEV.md`](docs/design/FROM-DEV.md)
- Retours design → développeur : [`docs/design/FROM-DESIGN.md`](docs/design/FROM-DESIGN.md)
- Décisions partagées : [`docs/design/DECISIONS.md`](docs/design/DECISIONS.md)

La branche de travail design est `design/lot-1-tokens`. Les contributions du designer sont remises sous forme de patch ou de pull request ; aucun accès en écriture au dépôt n'est requis.
