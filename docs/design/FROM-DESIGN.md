# FROM-DESIGN — passation du design vers le développement

Ce journal utilise le même gabarit que `FROM-DEV.md` et `DECISIONS.md`. Ajouter les nouvelles entrées en tête sans réécrire les entrées historiques.

> **Propriété du fichier.** `FROM-DESIGN.md` est écrit par le design et lu par le développement. Une version reconstruite depuis un résumé de conversation a écrasé ce fichier le 28 août à 22:32 ; le présent fichier rétablit le contenu d'origine et le complète. Les entrées de planification rédigées par le développement ont leur place dans `FROM-DEV.md`, sous sa propre numérotation. La numérotation `DESIGN-00x` ci-dessous fait foi.

## Ouvert

| id | date | sujet | attendu de | bloque |
| --- | --- | --- | --- | --- |
| DESIGN-005 | 2026-08-28 | Fins de ligne : 31 fichiers apparaissent réécrits en entier à chaque diff | Dev Lead | toute relecture de diff |
| DESIGN-004 | 2026-08-28 | Revue du lot 1B implémenté : neuf tokens font doublon avec ceux conservés | Dev Lead | lot 2 |
| DESIGN-003 | 2026-08-28 | `pnpm dev` échoue sans accès réseau à `fonts.googleapis.com` | Dev Lead | tout audit hors ligne |
| DESIGN-002 | 2026-08-28 | Nomenclature unique des destinations — *arbitrée, voir DEC-002* | Dev Lead | routes |
| DESIGN-001 | 2026-08-28 | Lot 1 — spécification du socle de tokens | Dev Lead | lot 2, écran pilote |

---

## DESIGN-005 — Les fins de ligne rendent les diffs illisibles

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Ouvert
- **Périmètre :** Configuration du dépôt
- **Contexte :** `git status` sur le dépôt local signale 37 fichiers modifiés et 7 237 insertions pour 7 157 suppressions. Avec `--ignore-all-space`, il n'en reste que **6 fichiers et 183 lignes**. Les 31 autres ne diffèrent que par leurs fins de ligne (CRLF sur Windows contre LF dans l'index). Il n'y a pas de `.gitattributes` dans le dépôt.
- **Décision ou question :** Ajouter un `.gitattributes` avec `* text=auto eol=lf`, puis renormaliser en un commit dédié et isolé (`git add --renormalize .`). Tant que ce n'est pas fait, chaque commit du chantier design apparaîtra comme une réécriture intégrale : la relecture par diff devient impossible, et deux branches qui touchent le même fichier entreront systématiquement en conflit.
- **Fichiers concernés :** `.gitattributes` (à créer), l'ensemble du dépôt pour la renormalisation
- **Impacts attendus :** Aucun effet fonctionnel ni visuel. Rend les revues exploitables.
- **Contrôles attendus :** Après renormalisation, `git status` propre sur un clone frais ; `git diff --stat` d'un lot ne doit mentionner que les fichiers réellement touchés.
- **Suite proposée :** À faire avant de pousser le lot 1, sinon le premier diff poussé sera inexploitable.

---

## DESIGN-004 — Revue du lot 1B implémenté : la duplication a été recréée

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Ouvert — correction demandée avant le lot 2
- **Périmètre :** Bloc `:root` de `app/globals.css`
- **Contexte :** Le lot 1A est correct et complet. Vérifié sur le dépôt local : aucun usage résiduel de `--line`, `--red`, `--green`, `--blue`, `--navy`, `--bg`, `--text`, `--muted` ni `--focus`, et le bloc d'alias a disparu de `:root`. `--orange` est conservé seul, en attente de DEC-001. C'est exactement ce qui était demandé.

  Le lot 1B, en revanche, a déclaré les échelles cibles **à côté** des tokens existants au lieu de les remplacer, ce qui recrée le défaut que le lot 1A venait de supprimer. Neuf des trente tokens ajoutés font doublon avec des tokens déclarés quelques lignes plus haut :

  | Ajouté | Valeur | Doublon de | Valeur |
  | --- | ---: | --- | ---: |
  | `--radius-scale-sm` | 8px | `--radius-sm` | 8px |
  | `--radius-scale-md` | 12px | `--radius-md` | 12px |
  | `--radius-scale-lg` | 16px | `--radius-lg` | 16px |
  | `--control-height-default` | 40px | `--control-height` | 40px |
  | `--spacing-4` | 16px | `--space-4` | 16px |
  | `--elevation-soft` / `--elevation-float` | — | `--shadow-soft` / `--shadow-float` *(supprimés)* | mêmes valeurs |
  | `--font-size-meta` | 12px | `--font-size-label` | 12px |

  `--font-size-meta` et `--font-size-label` méritent une mention à part : deux noms, une seule valeur, un seul rôle. C'est la définition d'un alias, réintroduit dans le lot dont l'objet était d'en supprimer neuf.

  `--spacing-*` pose un problème supplémentaire : Tailwind déclare déjà `--spacing` dans le même document. Deux noms voisins pour deux choses différentes finiront par être confondus.

- **Décision ou question :**

  1. **Un seul nom par rôle.** Conserver les familles déjà en place — `--space-*`, `--radius-*`, `--control-height` — et n'ajouter que ce qui manque : `--space-6` 24px, `--space-7` 32px, `--control-height-sm` 32px, `--control-height-lg` 48px. Supprimer `--spacing-*`, `--radius-scale-*` et `--control-height-default`. Rétablir `--shadow-soft` / `--shadow-float` sous leur nom d'origine, ou renommer partout en `--elevation-*` — mais pas les deux.
  2. **Fusionner `--font-size-meta` dans `--font-size-label`.**
  3. **Échelle typographique.** Celle qui a été écrite — 12 / 14 / 16 / 20 / 24 — est plus régulière que celle que j'avais proposée et je la retiens. Deux ajustements :
     - il manque un cran entre le libellé (12) et le corps (14) pour le texte secondaire courant, aujourd'hui très présent. Ajouter `--font-size-secondary` 13px, ou assumer que le secondaire s'écrit en 12 comme les libellés — à trancher au lot 2 sur pièce.
     - `--font-size-display` à 24px descend sous la taille actuelle des valeurs KPI (29px) et sous celle des titres de section du manager hero (25px). Une valeur dominante qui rapetisse affaiblit la lecture d'un cockpit. Proposer 28px, à vérifier sur le registre et le tableau de bord.
  4. **Interlignes.** `--line-height-tight` / `normal` / `relaxed` sont un bon ajout, absents de ma spécification. À conserver tels quels.

- **Fichiers concernés :** `app/globals.css`
- **Impacts attendus :** Aucun. Ces tokens ne sont pas encore consommés ; la correction est un nettoyage de déclarations.
- **Contrôles attendus :** `pnpm audit:visual` identique avant et après, aucun `var(--spacing-`, `var(--radius-scale-` ni `var(--control-height-default)` dans le fichier.
- **Suite proposée :** Corriger avant de pousser, puis lot 2 sur le registre. Je fournis alors les mesures de contraste des triplets sémantiques et le avant/après aux quatre largeurs.

---

## DESIGN-003 — Le démarrage n'est pas autonome : dépendance réseau à Google Fonts

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Ouvert
- **Périmètre :** `app/layout.tsx`, chaîne de build
- **Contexte :** `pnpm install --frozen-lockfile` puis `pnpm dev` répondent **HTTP 500** sur un réseau où `fonts.googleapis.com` n'est pas autorisé. `next/font/google` récupère Geist à la compilation : `[vinext:google-fonts] Google Fonts returned HTTP 403`. L'application ne boote pas du tout — ce n'est pas une dégradation de police, c'est un échec de rendu.
- **Décision ou question :** Auto-héberger Geist plutôt que le télécharger au build. Le paquet npm `geist` (1.7.2) expose `geist/font/sans` et `geist/font/mono`, compatibles `next/font/local`, et conserve les variables `--font-geist-sans` / `--font-geist-mono` inchangées. Vérifié localement : `pnpm add geist`, substitution des deux imports dans `app/layout.tsx`, démarrage en **HTTP 200**, rendu identique.
- **Fichiers concernés :** `app/layout.tsx`, `package.json`
- **Impacts attendus :** Aucun impact visuel. Supprime une dépendance réseau au build, une requête tierce au runtime, et rend le dépôt exploitable en environnement fermé.
- **Contrôles attendus :** `pnpm build` hors ligne, comparaison de captures avant/après à 1440 px, vérification que `--font-geist-sans` est toujours résolue sur `body`.
- **Suite proposée :** Correctif court, indépendant du lot 1. Le designer a appliqué la substitution en local pour pouvoir mesurer ; elle n'est pas commitée.

---

## DESIGN-002 — Une entrée de navigation, jusqu'à quatre destinations

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Arbitré par wilkam le 28 août 2026 — voir DEC-002. À implémenter avant le chantier des routes.
- **Périmètre :** `navItems`, `pageTitle`, `mobilePageTitle`, en-têtes d'écran
- **Contexte :** Relevé sur les cinq profils du miroir public, à 1440 px. Chaque destination porte trois à quatre appellations, et deux entrées changent d'écran selon le profil.

  | Sidebar | Titre desktop | Titre mobile | Titre de page |
  | --- | --- | --- | --- |
  | Mon espace | Espace *(profil)* | Espace *(profil)* | Bonjour *(profil)* |
  | Tableau de bord | Tableau de bord **ou** Vue consolidée Administration | Pilotage | Situation du bâtiment |
  | Registre | Registre des anomalies | Registre | Registre central |
  | Facility Manager | Espace Facility Manager | Facility Manager | Décider, affecter, débloquer |
  | Rondes | Pilote Surpresseur **ou** Ronde terrain | Pilote Surpresseur **ou** Ronde | Ronde Surpresseur · DEMO-EAU, Ronde technique, **ou** Ronde cleaning & jardinage |

  Deux constats nouveaux par rapport à la revue initiale. « Tableau de bord » ne mène pas au même écran pour l'Administration et pour le Facility Manager, alors que le libellé est identique. « Rondes » mène à trois écrans différents selon l'agent, dont deux titrés « Pilote Surpresseur » — le nom d'un équipement, pas d'une rubrique.

  Les cinq entrées mélangent par ailleurs quatre natures d'objet : une file personnelle, une analyse, une base de données, un rôle métier et une tâche. `allowedViewsByPersona` donne 3 entrées à l'Administration, 5 au Facility Manager, 2 aux agents — le profil le plus habilité a la navigation la plus pauvre, et ses deux destinations réelles (validation métier, utilisateurs et paramètres) sont rendues comme des lignes de contenu.

- **Décision ou question :** Adopter un libellé unique par destination, groupé par nature d'objet. **Proposition validée par wilkam le 28 août 2026** ; les routes doivent en découler :

  | Aujourd'hui | Proposé | Groupe |
  | --- | --- | --- |
  | Mon espace | **À traiter** *(ou* À valider *selon le droit d'arbitrage)* | Mon travail |
  | Rondes | **Mes rondes** | Mon travail |
  | — | **Signaler une anomalie** | Mon travail |
  | Registre | **Anomalies** | Le bâtiment |
  | — | **Équipements** | Le bâtiment |
  | Tableau de bord + Facility Manager | **Vue d'ensemble** et **Coûts** | Pilotage |
  | — | **Utilisateurs et droits**, **Seuils et paramètres** | Administration |

  Le catalogue unique doit servir à la fois la sidebar, le `<h1>`, le `<title>` du document et la future route. Un seul `<h1>` par écran ; la troncature reste visuelle et ne modifie pas le nom accessible.

  Les routes proposées en DEV chantier B (`/facility-manager`, `/espace`) figent la nomenclature actuelle : ne pas les publier avant cet arbitrage.

- **Fichiers concernés :** `app/page.tsx`
- **Impacts attendus :** Sidebar, en-têtes, futures routes, vocabulaire des écrans. Aucun changement de rôle ni de permission.
- **Contrôles attendus :** `pnpm verify:personas`, un seul `<h1>` par écran, cohérence sidebar/titre/route sur les cinq profils.
- **Suite proposée :** Après validation, appliquer la nomenclature avant le chantier des routes, pas après.

---

## DESIGN-001 — Lot 1 : spécification du socle de tokens

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Proposé
- **Périmètre :** `app/globals.css`, futur `app/styles/tokens.css`
- **Contexte :** Mesures sur le commit `73207e7`, application installée et exécutée localement.

  - **583 valeurs hexadécimales distinctes** hors du bloc `:root`, pour 761 occurrences — contre 443 appels `var(--…)`. Le fichier est majoritairement écrit en littéraux.
  - Par famille de teinte : **81 oranges**, 65 verts, 37 rouges, 380 valeurs de la famille bleue et grise.
  - **27 tailles de police** déclarées, de **6 px** à 40 px.
  - **15 rayons** en pixels, de 4 à 18, plus `999px` et `50%`.
  - **12 largeurs de rupture** `@media` (430, 700, 760, 800, 801, 900, 960, 961, 1050, 1100, 1180, 1240) réparties sur 51 blocs, et 21 `!important`.
  - **9 tokens déclarés et jamais consommés :** `--brand-foreground`, `--viz-series-5`, `--viz-series-6`, `--space-1`, `--space-2`, `--space-3`, `--space-6`, `--shadow-soft`, `--shadow-float`.
  - **La couche d'alias « historique » est devenue la couche principale.** Elle est utilisée davantage que les noms canoniques qu'elle devait remplacer :

    | Canonique | Usages | Alias | Usages |
    | --- | ---: | --- | ---: |
    | `--border` | 30 | `--line` | **73** |
    | `--danger` | 4 | `--red` | **17** |
    | `--success` | 5 | `--green` | **16** |
    | `--brand` | 21 | `--blue` | **30** |
    | `--foreground-muted` | 50 | `--muted` | 4 |

    `--warning` n'est appelé **qu'une fois** dans tout le fichier, tandis que 81 oranges distincts sont écrits en dur. Le rôle sémantique existe ; personne ne s'en sert.

  Le constat de la revue initiale doit être corrigé sur un point : les alias ne sont pas des doublons de valeur. Ils sont écrits `--red: var(--danger)`, donc cohérents. Le défaut n'est pas la duplication, c'est que la migration a été faite dans le mauvais sens et n'a jamais été refermée.

- **Décision ou question :** Trois sous-lots, dont les deux premiers sans aucun changement visuel.

  **1A — Refermer la migration des alias.** Remplacer chaque usage d'alias par le nom canonique, puis supprimer le bloc d'alias. Supprimer les 9 tokens jamais consommés, ou les consommer : un token déclaré sans usage est exactement le mécanisme qui a produit le `--font-sans` fantôme de Tailwind. Exception : `--orange`, orphelin, traité en DEC-001.
  *Critère d'acceptation :* aucune valeur calculée modifiée, `pnpm audit:visual` identique avant et après.

  **1B — Déclarer les échelles cibles, sans les consommer.**

  | Rôle | Token | Valeur | Remplace |
  | --- | --- | ---: | --- |
  | Libellé et badge | `--text-label` | 12px | 6, 7, 8, 9, 10, 11, 12 |
  | Texte secondaire | `--text-sm` | 13px | 13, 14 |
  | Corps | `--text-body` | 15px | 15, 16, 17 |
  | Titre de section | `--text-section` | 18px | 18 à 21 |
  | Titre de page | `--text-page` | 22px | 22 à 25 |
  | Valeur KPI | `--text-display` | 28px | 26 à 40 |

  Plancher absolu : **12 px**, arbitré par wilkam (DEC-003). Les tailles 6 à 11 px disparaissent — elles concernent aujourd'hui les libellés de colonne du registre, les sous-titres de la sidebar et les mentions des cartes, c'est-à-dire des informations opérationnelles lues vite, souvent debout.

  `--text-label` et `--text-sm` ne sont séparés que d'un pixel parce qu'ils ne se distinguent pas par la taille mais par le traitement : `--text-label` est réservé aux libellés capitalisés et espacés et aux badges, `--text-sm` au texte courant secondaire. Si le lot 2 montre que la distinction ne tient pas visuellement, on fusionne sur 13 px.

  Rayons, quatre valeurs : `--radius-sm` 8 (contrôles), `--radius-md` 12 (cartes et champs), `--radius-lg` 16 (panneaux), `--radius-round` 999. Les valeurs 4, 5, 6, 7, 9 se replient sur 8 ; 10, 11, 13, 14 sur 12 ; 15, 18 sur 16.

  Hauteurs de contrôle, trois valeurs : `--control-sm` 32, `--control-md` 40, `--control-lg` 48. Les 38 px actuels des filtres et de la recherche passent à 40.

  Espacement : grille de 4 conservée, compléter par `--space-7` 32 et `--space-8` 40, et remplacer les 11, 13, 15, 17, 19, 22, 28, 30, 45 par le multiple de 4 le plus proche.

  Points de rupture : ramener 12 largeurs à quatre paliers nommés — `--bp-sm` 430, `--bp-md` 760, `--bp-lg` 960, `--bp-xl` 1180 — les paires 800/801 et 960/961 étant des gardes de frontière à conserver telles quelles. C'est cette dispersion qui a produit le désalignement du registre corrigé au checkpoint précédent ; sans elle, le défaut reviendra ailleurs.

  *Critère d'acceptation :* les tokens existent, aucune règle ne les consomme encore, rendu strictement inchangé.

  **1C — Couleurs sémantiques par triplet.** Les 583 littéraux sont très majoritairement des triplets fond / bordure / texte réinventés composant par composant. Déclarer un triplet par rôle remplace environ 500 d'entre eux. Valeurs **dérivées des occurrences les plus fréquentes du code existant**, pas inventées :

  | Rôle | Surface | Bordure | Texte |
  | --- | --- | --- | --- |
  | Danger | `#fde8e9` | `#f0c5c7` | `var(--danger)` `#c83f48` |
  | Avertissement | `#fff0e1` | `#f1d5bf` | `var(--warning)` `#b85d17` |
  | Succès | `#e7f5ed` | `#cae7d8` | `var(--success)` `#30956a` |
  | Information | `var(--surface-emphasis)` `#edf5fc` | `#d5dee7` | `var(--brand)` `#235ea7` |
  | Neutre | `var(--surface-muted)` `#f7f9fb` | `var(--border)` | `var(--foreground-muted)` |

  Le contraste de chaque texte sur sa surface doit être vérifié avant adoption ; je fournis les mesures au lot 2.

  *Critère d'acceptation :* aucune migration globale. Les triplets sont déclarés, puis consommés **sur le registre uniquement**.

- **Fichiers concernés :** `app/globals.css`, `app/styles/tokens.css` (à créer), `scripts/audit-visual-styles.mjs` (seuils à mettre à jour)
- **Impacts attendus :** 1A et 1B sans effet visuel. 1C limité à l'écran pilote.
- **Contrôles attendus :** `pnpm lint`, `pnpm build`, `pnpm verify:personas`, `pnpm audit:visual`, captures comparées à 375, 880, 1024 et 1440 px.
- **Suite proposée :** Lot 2 — le registre adopte l'échelle typographique. C'est là que se mesure le coût réel du plancher à 12 px sur une interface conçue dense. Si ce coût est acceptable sur le registre, il l'est partout ; s'il ne l'est pas, l'échelle est révisée avant généralisation, pas après.

---

## DESIGN-000 — Gabarit de remise

- **Date :** AAAA-MM-JJ
- **Auteur :** Designer
- **Statut :** À compléter
- **Périmètre :** Écran, composant ou lot concerné
- **Contexte :** Problème observé et objectif utilisateur.
- **Décision ou question :** Choix proposé, variante retenue ou question à arbitrer.
- **Fichiers concernés :** Chemins relatifs précis.
- **Impacts attendus :** Responsive, accessibilité, cohérence et cas limites.
- **Contrôles attendus :** Captures desktop/mobile, clavier et commandes exécutées.
- **Suite proposée :** Prochain petit lot ou validation demandée.
