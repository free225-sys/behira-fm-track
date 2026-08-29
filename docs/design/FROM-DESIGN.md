# FROM-DESIGN — passation du design vers le développement

Ce journal utilise le même gabarit que `FROM-DEV.md` et `DECISIONS.md`. Ajouter les nouvelles entrées en tête sans réécrire les entrées historiques.

> **Propriété du fichier.** `FROM-DESIGN.md` est écrit par le design et lu par le développement. Une version reconstruite depuis un résumé de conversation a écrasé ce fichier le 28 août à 22:32 ; le présent fichier rétablit le contenu d'origine et le complète. Les entrées de planification rédigées par le développement ont leur place dans `FROM-DEV.md`, sous sa propre numérotation. La numérotation `DESIGN-00x` ci-dessous fait foi.

## Ouvert

| id | date | sujet | attendu de | bloque |
| --- | --- | --- | --- | --- |
| DESIGN-015 | 2026-08-29 | **GO PUBLICATION** sur `b517167` — socle design clos | — | — |
| DESIGN-014 | 2026-08-29 | Recette de clôture sur `0c0d9f7` : DESIGN-013 clos, trois régressions nouvelles | Dev Lead | publication |
| DESIGN-013 | 2026-08-29 | Recette de `ec3ec06` : contrastes validés, trois débordements à 375 px | Dev Lead | publication |
| DESIGN-012 | 2026-08-29 | Réponse à DEV-002 : badge Démo rétabli, direction artistique corrigée | Dev Lead | — |
| DESIGN-011 | 2026-08-29 | Bandeau resserré — 403 px de chrome ramenés à 273, avis du dev lead demandé | Dev Lead | — |
| DESIGN-010 | 2026-08-29 | Navigation en bandeau haut et première page — écart avec la direction artistique | wilkam | lot 5 |
| DESIGN-009 | 2026-08-29 | Lot 4 — généralisation du socle, et un défaut de mon patch du lot 2 | Dev Lead | lot 5 |
| DESIGN-008 | 2026-08-28 | Lot 3 — durées d'animation, rampe de composition, badge critique en gris | Dev Lead | — |
| DESIGN-007 | 2026-08-28 | Triplets sémantiques : trois rôles sur cinq échouent au contraste 4.5:1 | Dev Lead | lot 3 |
| DESIGN-006 | 2026-08-28 | Lot 2 — le registre au plancher 12 px : mesures et patch | Dev Lead | généralisation |
| DESIGN-005 | 2026-08-28 | Fins de ligne : 31 fichiers apparaissent réécrits en entier à chaque diff | Dev Lead | toute relecture de diff |
| DESIGN-004 | 2026-08-28 | Revue du lot 1B implémenté : neuf tokens font doublon avec ceux conservés | Dev Lead | lot 2 |
| DESIGN-003 | 2026-08-28 | `pnpm dev` échoue sans accès réseau à `fonts.googleapis.com` | Dev Lead | tout audit hors ligne |
| DESIGN-002 | 2026-08-28 | Nomenclature unique des destinations — *arbitrée, voir DEC-002* | Dev Lead | routes |
| DESIGN-001 | 2026-08-28 | Lot 1 — spécification du socle de tokens | Dev Lead | lot 2, écran pilote |

---

## DESIGN-017 — Badges de statut : nouvelle forme à rail latéral

**Date :** 29 août 2026 · **Auteur :** Designer · **Nature :** livraison, appliquée sur `app/globals.css`

Wilkam a demandé de changer l'aspect des badges de statut, partout où ils apparaissent. Les trois exemples cités — « ! Hors délégation », « ◆ À traiter par Facility Manager », « ◆ 2 à traiter » — partageaient la même faiblesse : une pastille entièrement arrondie, une bordure pâle d'un pixel qui ne se voyait pas, et une icône posée dans un disque blanc semi-transparent qui flottait sans rôle.

### Ce qui change

| | Avant | Après |
|---|---|---|
| Forme | pastille `--radius-round` (999 px) | angle vif côté rail, `--radius-sm` sur les trois autres coins |
| Bordure | 1 px pâle sur les quatre côtés | rail de 3 px à gauche, en couleur pleine du rôle ; hairline sur le reste |
| Icône | glyphe dans un disque `rgba(255,255,255,.68)` | glyphe nu, à l'encre du rôle |
| Écart icône/libellé | `gap:5px`, sans effet | `gap:6px`, effectif |

Aucun nouveau jeton. Le rail réutilise `--danger-text`, `--warning-text`, `--info-text`, `--neutral-text`, `--success-text` — la couleur pleine que le libellé porte déjà. Les surfaces et les encres de texte sont inchangées, donc les 84 combinaisons de contraste validées restent valides : rien de ce qui portait du texte n'a bougé.

### Ce qui ne change pas, et pourquoi

`.persona-mode-label` (« DÉMO »), `.data-origin-badge` et `.mockup-label` gardent la forme pastille. Ce n'est pas un oubli : la forme sépare désormais deux familles. Le rail signale **l'état d'un dossier** ; la pastille signale **l'état de l'application**. Le marqueur de démonstration, qui relève de la sécurité d'environnement, gagne à ne ressembler à rien d'autre. Les rails de progression (`.severity-bar-track`, `.manager-health-progress`, `.agent-score-track`) gardent évidemment leur rayon rond.

### Un défaut préexistant corrigé au passage

En mesurant le rendu j'ai trouvé une quatrième occurrence de la famille de collisions de spécificité déjà traitée : **`.manager-health-card > span` capturait le badge et le forçait en `display:block`**. Conséquence : dans la carte « Santé bâtiment », le badge perdait sa mise en page flex et l'écart entre l'icône et le libellé disparaissait — « ◆SURVEILLANCE » se rendait collé. Le défaut existait avant ce lot, la pastille le subissait aussi.

Corrigé selon la méthode que tu as toi-même retenue : les propriétés de mise en page sont répétées sur le sélecteur à deux classes, qui l'emporte sur la règle de conteneur. Le contrôle `Badges immunisés contre les encres de conteneur` de `scripts/audit-visual-styles.mjs` couvrait la couleur, pas la disposition — tu voudras peut-être l'élargir.

### Contrôles passés

- `pnpm lint` : propre. `pnpm build` : complet.
- `node scripts/audit-visual-styles.mjs` : 38/38.
- Quatre profils (Facility Manager, Administration, Agent Électricité, Rondes & Assistance) : 38 badges rendus, aucun en `display:block`, aucun débordement horizontal.
- Quatre largeurs (1440, 1024, 768, 375 px) : `scrollWidth - clientWidth = 0`, aucun libellé tronqué, hauteur minimale de badge stable à 24 px.

---

## DESIGN-016 — Mode sombre : décision de clôture, à ne pas contourner

**Date :** 29 août 2026 · **Auteur :** Designer · **Nature :** consignation d'un arbitrage Wilkam

Wilkam a tranché : **le mode sombre n'est pas introduit**. L'entrée `DEC-006` de `DECISIONS.md` acte la décision.

Contexte pour Codex : l'analyse de la maquette d'origine (V0) a établi que celle-ci était sombre par défaut avec un commutateur `data-theme`, et que la V2 avait perdu cette bascule au portage. La question du rétablissement était ouverte dans la revue de dérive. Elle est close, dans le sens du statu quo.

**Ce que cela interdit, pour toute contribution, designer comme dev :**

- aucune règle `@media (prefers-color-scheme: dark)` ;
- aucun attribut, sélecteur ou script `data-theme` ;
- aucun commutateur de thème dans le bandeau de navigation, dans « Mon espace » ni ailleurs ;
- aucun jeu de tokens sombre déclaré « en prévision » d'un lot futur.

**Ce que cela ne remet pas en cause :** `--on-dark` et `--on-dark-muted` restent en place. Ce ne sont pas les amorces d'un thème : ce sont les encres du texte posé sur les cartes sombres du cockpit, introduites au lot 4 pour corriger un contraste de 2,41:1 sur `.analytics-note`. Elles restent limitées à cet usage.

**Contrôle proposé pour `scripts/audit-visual-styles.mjs`** — la feuille de styles est actuellement à zéro occurrence, vérifié ce jour :

```js
['Aucun mécanisme de thème sombre (DEC-006)', !/prefers-color-scheme|data-theme/.test(css)],
```

Si tu l'ajoutes, il ferme la question par un contrôle automatique plutôt que par la mémoire des intervenants.

---

## DESIGN-015 — GO PUBLICATION · clôture du chantier design

- **Date :** 29 août 2026
- **Auteur :** Designer
- **Statut :** **GO PUBLICATION** sur `b517167`. DESIGN-013 et DESIGN-014 sont clos. Le socle visuel est terminé.
- **Périmètre :** Recette éclair des trois régressions, puis balayage complet de non-régression — 84 combinaisons, 5 profils × 2 à 5 écrans × 6 largeurs.

### Les trois régressions sont corrigées

| | Contrôle | Mesure sur `b517167` |
| --- | --- | --- |
| **R1** | Police Geist | `document.fonts` en statut **`loaded`**, **aucun 404** sur les ressources de police. L'application rend bien en Geist. |
| **R2** | Bandeau Surpresseur | Contenu dans le viewport à **1600, 1440, 1366, 1280, 1240, 1024, 760 et 375 px** — bornes gauche et droite exactes, aucun débordement. |
| **R3** | Badge « Accès admin » | Pastille de **107 px** pour un libellé de 89 px : le libellé tient, plus aucun rognage. |

### Non-régression : 84 combinaisons, aucun écart

| Contrôle | Résultat |
| --- | --- |
| Écarts de contraste (seuils WCAG adaptés à la taille) | **0** |
| Texte sous 12 px | **0** |
| Débordement horizontal | **0** |
| Contenu hors viewport non défilable | **0** |
| `aria-current` | présent sur les 84 |
| Pastille Démo visible | présente sur les 84 |
| Erreurs console | **0** |
| `pnpm lint`, `build`, `verify:personas` (32), `audit:visual` (38) | tous réussis |

Le chantier ouvert par la revue du 28 août est clos. Ce qui était mesuré à l'ouverture — 583 littéraux de couleur, 27 tailles de police dont du 6 px, 15 rayons, 161 puis 302 écarts de contraste, un rail de 244 px imposant un registre en cartes dès 1280 px — n'existe plus.

### Ce qui reste, et qui n'est pas du design

**DEC-005 attend l'arbitrage de wilkam.** Le cockpit place aujourd'hui « Santé & Performance » avant la file de travail, ce qui inverse l'ordre acté en DEC-004. Mesure utile pour trancher — position du premier dossier actionnable :

| Écran | Position | Entièrement visible sans défiler |
| --- | ---: | --- |
| 1440 × 800 | 664 px | **oui** |
| 1366 × 768 | 682 px | non, coupé en bas |
| 1280 × 720 | 644 px | non, coupé en bas |

Sur un portable courant, le Facility Manager voit son premier dossier **partiellement**, et doit défiler pour l'atteindre. C'est le coût réel de l'option B. L'option A le remonterait d'environ 190 px, au-dessus de la ligne de flottaison sur toutes les tailles testées. L'arbitrage reste métier : « quel est l'état du bâtiment ? » contre « quel dossier dois-je traiter maintenant ? ». Cette décision ne bloque pas la publication — elle porte sur un ordre, pas sur un défaut.

**Le lot produit DEC-002** : les destinations Équipements, Coûts, Utilisateurs et droits, Seuils et paramètres n'existent pas encore. Le menu « Plus », les groupes et la nomenclature les attendent. La rubrique historique « Mon espace » reste visible pour le Facility Manager tant que son contenu n'est pas redistribué — à ne pas figer comme définitif.

- **Contrôles effectués :** clone `b517167`, `pnpm install --frozen-lockfile`, exécution locale, recette ciblée R1–R3, balayage de 84 combinaisons en styles calculés, surveillance réseau et console, contrôles projet complets.
- **Suite proposée :** publier `b517167`. Arbitrer DEC-005. Ouvrir le lot produit DEC-002.

---

## DESIGN-014 — Recette de clôture du chantier design

- **Date :** 29 août 2026
- **Auteur :** Designer
- **Statut :** **PUBLICATION BLOQUÉE** — non par les défauts de DESIGN-013, qui sont corrigés et clos, mais par trois régressions introduites par les commits postérieurs à `e096c55`.
- **Périmètre :** La recette demandée visait `e096c55` ; la branche portait entre-temps cinq commits de plus (`be12a5c` → `0c0d9f7` : hébergement, assouplissement de l'en-tête, restructuration du cockpit, filtres de file). La recette a donc été faite sur **`0c0d9f7`**, l'état réel — recetter un commit que quatre autres ont déjà recouvert n'aurait rien validé du tout. **84 combinaisons** : 5 profils × 2 à 5 écrans × 6 largeurs (1440, 1024, 961, 960, 768, 375).

### DESIGN-013 : clos

| Contrôle demandé | Résultat |
| --- | --- |
| Badge « Surveillance », texte et glyphe | **5,84:1** sur son fond ambre, aux quatre combinaisons profil × largeur — seuil 4,5 dépassé |
| Autres variantes de badges | aucune régression d'encre ; l'immunisation `.badge.badge-*` est en place |
| « Mes rondes » à 375 px | **aucun débordement**, bandeau dans le viewport, cinq étapes accessibles par défilement horizontal visible |
| Espace agent à 375 px, formulaire avec libellés longs | **aucun débordement**, champs compressibles |

Sur le fond, la recette de clôture est excellente : **zéro écart de contraste sur les 84 combinaisons** (seuils WCAG adaptés à la taille), zéro texte sous 12 px, `aria-current` partout, pastille Démo visible partout, aucune erreur console applicative.

### Trois régressions nouvelles, toutes datées d'après `e096c55`

**R1 — La police Geist ne charge plus : toute l'application rend en Arial.** La console montre un 404 sur `/fonts/geist-sans/Geist-Variable.woff2` et `document.fonts` donne la face en statut **`error`**. Introduite par les commits d'hébergement (`86b067b` / `be12a5c`, qui modifient `vite.config.ts`) : la police auto-hébergée est désormais attendue sous un chemin `/fonts/…` que le serveur ne fournit pas. C'est la typographie canonique du produit qui disparaît silencieusement — le fallback Arial rend l'écart peu visible, c'est précisément ce qui le rend dangereux. À corriger et à protéger par un contrôle : un 404 sur une ressource de police doit faire échouer la recette.

**R2 — Le bandeau Surpresseur déborde à nouveau, cette fois sur grand écran.** À 1440 px : bandeau de **1 456 px**, page qui défile latéralement de 8 px. `c1312f6` a élargi le retrait de `.content` en le passant en formule fluide (~46 px à 1440), mais la marge négative du bandeau est restée figée à **-54 px**. C'est le miroir exact du défaut mobile corrigé en DEV-005 — même mécanique, autre extrémité. La marge de débord doit être exprimée avec la même formule que le retrait du contenu, pas en valeur absolue ; sinon chaque ajustement de l'un recasse l'autre. Vérifié : aucun débordement de 701 à 1240 px, le défaut n'existe qu'au-dessus.

**R3 — Le badge « ACCÈS ADMIN » est écrasé et son libellé rogné.** Espace Administration, desktop : la pastille mesure **30 px** de large pour un libellé de 86 px ; le texte déborde du badge et se fait couper par l'`overflow:hidden` de `.authority-split` — à l'écran on lit « ACCÈ ». Le badge subit une compression flex sans `flex-shrink:0` ni `min-width`. Capture jointe.

### Deux observations non bloquantes

- **La restructuration du cockpit (`6dcd654`) inverse l'ordre acté.** DEV-003 consignait : contexte, compteurs, file de décisions, flux, analyses. Le nouveau cockpit place une rangée « Santé & Performance » **avant** la file, avec un texte qui assume ce choix. C'est défendable — quatre tuiles compactes de situation avant la file se lisent en deux secondes — mais c'est un renversement de l'ordre consigné en DEC-004. Il faut soit l'acter dans `DECISIONS.md`, soit revenir à l'ordre validé. Ce n'est pas au design de trancher seul ni au dev de le faire silencieusement.
- **Les codes `AQ` / `SLA` / `PV` sont revenus** dans les compteurs, alors que le lot 5 les retirait — le libellé sous le chiffre nomme déjà la mesure. Mineur, à traiter avec le lot DEC-002.

### Verdict

**PUBLICATION BLOQUÉE** sur `0c0d9f7` — par R1, R2, R3, dont aucun n'existait à `e096c55`. **DESIGN-013 est clos.** Si la publication doit partir immédiatement, `e096c55` est publiable tel quel : les cinq commits suivants n'y sont pas indispensables. Sinon : corriger R1–R3 (R2 et R3 font quelques lignes ; R1 est un chemin de ressource), recette éclair sur les trois points, publication.

Le socle design — tokens, échelle, plancher 12 px, contrastes, shell, nomenclature de base — est **terminé et validé**. Ce qui reste relève du produit, pas du socle : les destinations autonomes de DEC-002, et l'arbitrage d'ordre du cockpit ci-dessus.

- **Contrôles effectués :** clone `0c0d9f7`, exécution locale, 84 combinaisons en styles calculés, console réseau surveillée, captures des trois régressions.
- **Suite proposée :** R1–R3, entrée `DECISIONS.md` pour l'ordre du cockpit, publication, ouverture du lot produit DEC-002.

---

## DESIGN-013 — Recette du checkpoint `ec3ec06`

- **Date :** 29 août 2026
- **Auteur :** Designer
- **Statut :** **Socle validé sur le fond. Trois défauts bloquent la publication**, tous de mise en page, aucun de contraste.
- **Périmètre :** Recette indépendante, application clonée depuis GitHub et exécutée localement. 60 combinaisons : 3 profils × 2 à 5 écrans × 6 largeurs (1440, 1024, 961, 960, 768, 375 px). Seuils WCAG appliqués selon la taille du texte — 3:1 au-dessus de 24 px ou 18,66 px en gras, 4,5:1 sinon.

### Ce qui est acquis

| Contrôle | Résultat |
| --- | --- |
| Texte sous 12 px | **0**, sur les 60 combinaisons |
| Écarts de contraste | **0** sur 12 des 14 combinaisons profil × écran |
| `aria-current` | présent sur chaque écran |
| Débordement horizontal desktop | **aucun** de 768 à 1440 px |
| Registre en tableau | tient jusqu'à 961 px, cartes à 960 px, conforme à DEC-004 |
| Nomenclature DEC-002 | en place — Mon espace, À traiter, Mes rondes, Anomalies, Vue d'ensemble |
| Badge Démo | visible en permanence |

Le lot 6 fait ce qu'il annonce. La quasi-totalité des 302 occurrences que je relevais sur `f8d5aa5` a disparu.

### Défaut 1 — le badge « Surveillance » à 1,69:1

Sur « Mes rondes », aux six largeurs et pour les deux profils concernés : le badge `SURVEILLANCE` et son glyphe `◆` s'affichent à **1,69:1** et **1,88:1**. Cause exacte :

```
.surpresseur-health > span { color: rgb(170,192,212); font-size: var(--font-size-label) }
```

Cette règle peint en bleu clair **tout `span` enfant direct**, badge compris. Le badge conserve son fond ambre `#fff1e2` et hérite d'une encre destinée à la carte sombre. `.badge-orange` (0,1,0) perd contre `.surpresseur-health > span` (0,1,1).

**C'est la troisième occurrence du même mécanisme** : une règle de mise en page qui peint par position et attrape un composant. La première grisait le badge critique à 3,07:1 dans les remontées terrain ; la deuxième cassait `.score-freshness` en le passant en rangée flex avec un libellé rendu à 20 px.

Plutôt qu'un troisième `:not(.badge)`, je propose l'immunisation : **porter l'encre des variantes de badge à deux classes** — `.badge.badge-orange`, `.badge.badge-critical`, etc. (0,2,0) — de sorte qu'aucune règle « classe + combinateur d'élément » ne puisse plus les atteindre. Une passe, et le motif ne peut plus se reproduire.

### Défaut 2 — débordement horizontal à 375 px sur « Mes rondes »

`.surpresseur-hero` mesure **391 px dans un écran de 375**, et la page défile latéralement. Cause : le bandeau déborde en pleine largeur avec une marge négative de 24 px alors que `.content` n'a que **16 px** de retrait à cette largeur. 375 + 2 × 8 = 391.

Correctif : sous 700 px, la marge de débord doit suivre le retrait du contenu.

```css
@media (max-width:700px){
  .surpresseur-hero{margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px}
}
```

Affecte les deux profils qui accèdent à cet écran. Les pas 4 et 5 du parcours de ronde sortent par ailleurs jusqu'à 530 px : le sélecteur d'étapes n'a ni repli ni défilement propre à cette largeur.

### Défaut 3 — débordement horizontal à 375 px sur l'espace agent

`.two-fields`, `.field` et un `<select>` mesurent **396 px** dans un écran de 375. Cause : un `<select>` se dimensionne sur son option la plus longue — ici « ANO-0241 · DEMO-SSI · Pression réseau incendie instable » — et rien n'autorise ses conteneurs à se comprimer.

```css
.field,.two-fields>*{min-width:0}
.field select,.field input,.field textarea{max-width:100%;width:100%}
```

Ce défaut concerne tout formulaire alimenté par des libellés métier longs, pas seulement cet écran.

### Réserve de densité, sans gravité

« Vue d'ensemble » passe à **8 troncatures à 768 px** contre 1 à 2 ailleurs, `.dashboard-tab-copy` en tête. Rien n'est illisible ni masqué, mais l'écran est manifestement calibré pour le desktop et se replie mal sur tablette. À traiter au lot suivant, pas avant publication.

### Verdict

Le socle est validé : tokens, échelle typographique, plancher à 12 px, contrastes, coquille de navigation, nomenclature. Les trois défauts ci-dessus sont des régressions de mise en page à 375 px, tous diagnostiqués avec leur cause et leur correctif — moins de dix lignes de CSS au total. **Je recommande de les corriger avant publication**, puis d'ouvrir le lot sur les destinations autonomes de DEC-002.

- **Contrôles effectués :** clone depuis `origin/design/lot-1-tokens` à `ec3ec06`, `pnpm install --frozen-lockfile`, exécution locale, 60 combinaisons mesurées en styles calculés — taille de police, contraste avec seuil adapté, troncature, débordement, `aria-current`.
- **Suite proposée :** correctifs 1 à 3, nouvelle recette rapide sur les seuls écrans concernés, puis publication.

---

## DESIGN-012 — Réponse à DEV-002 : le badge Démo était une erreur de ma part

- **Date :** 29 août 2026
- **Auteur :** Designer
- **Statut :** Corrigé — patch du lot 5 régénéré
- **Périmètre :** `app/globals.css`, `docs/design/BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md`, `docs/design/DECISIONS.md`

### Le refus du masquage de « Mode démonstration » est fondé

J'avais traité cette mention comme du bruit typographique occupant une ligne de trop, et je l'avais renvoyée aux seuls lecteurs d'écran avec un `clip`. C'était une erreur de catégorie : ce n'est pas un titre de zone, c'est **un marqueur d'environnement**, donc une information de sécurité. Un utilisateur qui ne voit pas qu'il est en démonstration peut croire qu'une action a été enregistrée. Le fait qu'elle prenne de la place n'autorise pas à la faire disparaître ; il oblige à la rendre compacte.

Corrigé dans le patch : la mention devient une pastille ambre à côté du profil — fond `#3d2f16`, bordure `#6d5424`, texte `#f2c98d`, **8,36:1**, visible de tous. L'ambre la distingue du bleu de la coquille : c'est un état d'environnement, pas un élément de marque. Le libellé accessible complet et le raccourcissement à « Démo » relèvent du balisage et vous reviennent.

Le chrome passe de 273 à **300 px**, soit 25 px de plus que la version qui masquait la mention. C'est le prix correct d'une information qui doit être vue, et on reste très en dessous des 403 px de départ.

### Vos trois autres décisions

**Refonte propre du shell avant le lot 6** — d'accord, et pour la raison que vous donnez : la réversibilité doit venir de Git, pas d'une seconde architecture laissée active dans la feuille. Le bloc appendu du lot 5 doit être lu comme une **spécification visuelle**, pas comme du code à intégrer. Les valeurs qui comptent y sont : hauteurs de bandes, paliers de compression 1240 et 1100 px, seuil du registre à 960 px, ordre des sections de la première page.

**Menu « Plus » groupé plutôt que réduction du catalogue** — c'est le bon arbitrage, et il lève la tension entre DEC-002 et DEC-004. Deux points de vigilance de mon côté quand vous l'implémenterez : l'état actif doit rester visible sur le déclencheur quand la destination courante est dans le menu, sinon l'utilisateur perd son repère ; et les rubriques du menu doivent porter les mêmes noms que les groupes de DEC-002, faute de quoi on recrée une troisième nomenclature.

**Contrôle renommé « Repli du registre avec responsable »** — d'accord, y compris sur la critique de mon intitulé : « desktop étroit » encode encore une largeur. Vos deux contrats sont plus justes que mon assertion, et l'ajout d'un test de rendu de part et d'autre du seuil est ce qui manquait réellement — un contrôle statique ne peut pas prouver qu'une information est visible.

**Ordre d'exécution** — retenu tel quel. Je ne produis plus de patch tant que les lots 2 à 4 ne sont pas consolidés sur une base unique.

### Direction artistique mise à jour

`BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md`, section « Navigation », contredisait le produit depuis DEC-004. Réécrite, avec une note de révision datée qui renvoie à la décision et rappelle les mesures qui la motivent. Les nouveaux points ajoutés :

- une seule source de destinations pour le bandeau desktop et la barre mobile ;
- libellés seuls sur desktop, icônes réservées à la barre mobile et issues d'une famille tracée ;
- rubrique active signalée par deux canaux au minimum, dont `aria-current` ;
- quatre à six destinations visibles, le reste dans un menu « Plus » groupé, les droits filtrant avant la répartition ;
- contraction par paliers plutôt que débordement, dans l'ordre : nom du site, nom d'utilisateur, mot-symbole ;
- un seul titre visible par écran — la rubrique de menu, le titre de page et le titre de section ne se répètent pas ;
- chrome de tête sous le quart de la hauteur utile ;
- environnement non productif signalé visiblement et en permanence.

`DECISIONS.md` porte désormais **DEC-004**, qui acte le bandeau, nomme la dérogation à la direction artistique et consigne ses conséquences.

- **Fichiers concernés :** `app/globals.css` (patch régénéré, 270 lignes), `BEHIRA_FM_TRACK_DIRECTION_ARTISTIQUE.md`, `DECISIONS.md`
- **Contrôles attendus :** `pnpm lint`, `pnpm build`, `pnpm audit:visual` passent. Aucun texte sous 12 px et aucun débordement à 1440, 1240, 1100, 1024, 960 et 760 px.
- **Suite proposée :** J'attends la consolidation des lots 2 à 4 et la refonte du shell. Le lot 6 — encres sémantiques de DESIGN-007, les 58 écarts restants sur fond teinté — ne s'ouvre qu'après.

---

## DESIGN-011 — Le bandeau resserré, et une question ouverte au dev lead

- **Date :** 29 août 2026
- **Auteur :** Designer
- **Statut :** Livré — **avis du dev lead explicitement demandé, voir la fin de l'entrée**
- **Périmètre :** `app/globals.css`, plus une assertion de `scripts/audit-visual-styles.mjs`

wilkam a retenu la navigation en bandeau haut (DESIGN-010) et demandé que le bandeau lui-même soit retravaillé. Voici ce qui a été corrigé.

### Le vrai défaut : 403 px de chrome, et deux titres qui se répètent

La première version empilait quatre bandes bleues avant le moindre contenu — 403 px sur un écran de 1 000 px, soit 40 % de la hauteur utile. Et deux titres se suivaient à trois lignes d'écart : « Espace Facility Manager » dans la barre de contexte, « Décider, affecter, débloquer » dans le bloc de tête. La duplication de nomenclature relevée en DESIGN-002 devenait visible à l'œil nu, l'un sous l'autre.

| | Avant | Après |
| --- | ---: | ---: |
| Barre de navigation | 58 px | 52 px |
| Bande de contexte | 103 px | 68 px |
| Bloc de tête | 130 px | 56 px |
| Compteurs | 112 px | 94 px |
| **Chrome total** | **403 px** | **273 px** |

Un tiers de la hauteur récupéré, sans rien retirer d'informatif.

### Ce qui a été enlevé, et pourquoi

**Le titre en double.** Le bloc de tête ne garde que sa phrase de contexte et le seuil de délégation. Son titre et sa rubrique répétaient mot pour mot le titre de page et l'entrée de menu active. Trois occurrences du même nom à l'écran, c'était une de trop même avant la refonte.

**« MODE DÉMONSTRATION ».** Le libellé occupait une ligne entière au-dessus du sélecteur de profil, avec le poids typographique d'un titre de zone. C'est une mention d'environnement. Elle reste accessible aux lecteurs d'écran, elle ne prend plus de hauteur.

**Le seuil de délégation** passe d'un encadré de trois lignes à une pastille horizontale : « Délégation active — < 400 000 FCFA — Au-delà : validation de l'Administration ». Même information, un quart de la place.

**Le sélecteur de site** était une carte claire posée sur le bleu, plus lourde visuellement que la navigation elle-même. Il devient un repère séparé par un filet, au même poids que le bloc utilisateur. Un site courant se consulte, il ne se clique pas dix fois par jour.

**Le pavé de score** alignait sa hauteur sur trois compteurs voisins à cause d'une barre de progression de 6 px et de ses marges. Compacté.

### Contrôles

`pnpm lint`, `pnpm build`, `pnpm verify:personas` (32) et `pnpm audit:visual` (13) passent. Mesures sur 10 combinaisons écran × profil à 1440 et 1024 px : aucun texte sous 12 px, aucun débordement horizontal, **aucun écart de contraste dans le bandeau**, une à deux troncatures résiduelles — toujours le titre d'anomalie le plus long. Barre mobile inchangée sous 700 px.

### Un contrôle qui casse à chaque changement de seuil

« Responsable visible sur desktop étroit » a échoué pour la troisième fois. Le contrôle teste la présence d'une chaîne de media query : il casse au lot 2 quand le seuil passe à 1280, au lot 5 quand il redescend à 960. Ce n'est pas le seuil qui est fragile, c'est l'assertion — elle vérifie une implémentation, pas un résultat.

Réécrite pour être indépendante du seuil : elle vérifie qu'**il existe un repli en cartes, à n'importe quelle largeur, et que ce repli porte le responsable**. Elle survivra au prochain arbitrage de densité.

### Ce sur quoi j'aimerais votre avis

Trois points relèvent autant de la tenue du code que du design, et je préfère les poser plutôt que les trancher seul.

**1. Le bandeau est aujourd'hui du CSS de surcharge.** Tout le lot 5 est un bloc appendu en fin de feuille qui neutralise le rail latéral au lieu de le remplacer. C'est ce qui rend la proposition réversible — et c'est aussi une dette immédiate : deux mises en page cohabitent dans le même fichier. Faut-il refondre `.sidebar` et `.app-shell` proprement maintenant, au risque de perdre la réversibilité, ou garder la surcharge jusqu'à validation métier ?

**2. Trois éléments sont masqués en CSS alors qu'ils devraient disparaître du balisage** : le titre et la rubrique du bloc de tête, et le libellé « Mode démonstration ». Masquer du contenu en CSS est un procédé de démonstration, pas une solution. Est-ce que ces suppressions vous paraissent justes, et voulez-vous que je les formule comme une demande de modification de `page.tsx` ?

**3. La tension entre DEC-002 et le bandeau.** La nomenclature validée prévoit jusqu'à neuf destinations groupées pour l'Administration ; un bandeau horizontal n'en porte pas plus de sept ou huit et ne sait pas afficher de groupes. Vous connaissez la structure de `navItems` et `allowedViewsByPersona` mieux que moi : un menu « Plus » en débordement vous paraît-il tenable, ou faut-il réduire le nombre de destinations exposées ?

- **Fichiers concernés :** `app/globals.css`, `scripts/audit-visual-styles.mjs` (une assertion)
- **Suite proposée :** Selon vos réponses, soit une refonte propre du shell, soit le lot 6 sur les encres sémantiques de DESIGN-007, qui referme le socle.

---

## DESIGN-010 — Navigation en bandeau haut, et remise en ordre de la première page

- **Date :** 29 août 2026
- **Auteur :** Designer
- **Statut :** Proposition — **arbitrage de wilkam requis avant implémentation**
- **Périmètre :** `app/globals.css`, desktop uniquement (au-dessus de 700 px)

### Un écart assumé avec la direction artistique

Le document de direction demande explicitement une « barre latérale stable sur desktop ». Cette proposition la remplace par un bandeau horizontal. **C'est un écart au cadrage validé, pas une interprétation.** Il ne doit pas être implémenté sans décision explicite, et il appelle une entrée dans `DECISIONS.md` s'il est retenu.

La référence visuelle fournie par wilkam a servi de source de principes, pas de maquette : bandeau de navigation horizontal, bande de contexte sous le menu, compteurs en tête de page, contenu sur fond clair. Aucun élément graphique n'en est repris.

### L'argument n'est pas esthétique, il est mesuré

Le rail latéral occupe 244 px fixes. Le lot 2 a montré que le registre ne tient pas ses six colonnes en dessous de 1280 px et bascule en cartes — au prix d'une page deux fois plus haute à 1024 px. Le bandeau haut rend ces 244 px à la largeur utile.

| Largeur | Rail latéral (lot 2) | Bandeau haut | Largeur de ligne du registre |
| ---: | --- | --- | --- |
| 1440 | tableau · 0 troncature | tableau · 0 troncature | 1 086 → **1 330 px** |
| 1280 | tableau · 1 troncature | tableau · **0 troncature** | 926 → **1 176 px** |
| 1180 | cartes · 1 687 px de haut | **tableau** · 0 troncature | — → **1 084 px** |
| 1100 | cartes | **tableau** · 1 troncature | — → **1 010 px** |
| 1024 | cartes | **tableau** · 1 troncature | 696 → **940 px** |
| 961 | cartes | **tableau** · 1 troncature | — → **882 px** |

Le seuil de bascule en cartes peut donc redescendre de 1280 à 960 px : un portable de 13 pouces retrouve le tableau dense, la vue en cartes redevient ce qu'elle doit être — la vue tablette et mobile. La réserve de densité conservée après le lot 2 disparaît d'elle-même.

Le rail avait par ailleurs un défaut relevé dès la première revue : à deux entrées, il laissait près de 200 px de vide avant le pied de colonne. Un bandeau horizontal n'a pas ce problème — il se contracte.

### La première page

Après authentification, le Facility Manager arrivait sur un slogan — « Décider, affecter, débloquer » — suivi des compteurs, puis d'un diagramme de flux, et la file de travail se trouvait tout en bas de la page. Le premier écran ne répondait pas à la question qu'on se pose en ouvrant l'outil : qu'est-ce qui m'attend.

L'ordre proposé, obtenu par `order` sur les sections existantes, sans toucher au balisage :

1. **Bandeau de contexte** — date, écran, profil, action principale, seuil de délégation. Prolonge le bleu du menu.
2. **Compteurs** — à qualifier, en retard, preuves à vérifier, score. Dans le bandeau, donc permanents et non plus contenu de page.
3. **La file de décisions** — le travail, avec le premier dossier déjà ouvert et sa prochaine action.
4. Le flux opérationnel.
5. Les scores et tendances.

Trois ajustements accompagnent ce changement. Le slogan passe de 26 px à `--font-size-title` et cède la vedette au contexte. Le seuil de délégation devient une pastille du bandeau plutôt qu'un encadré au milieu du contenu. Et les codes `AQ`, `SLA`, `PV` des compteurs sont masqués : le libellé sous le chiffre nomme déjà la mesure, ces abréviations n'étaient lisibles que par ceux qui les connaissaient déjà.

### Les glyphes Unicode disparaissent

Un bandeau horizontal se lit en texte. `◈ ⌂ ≡ ◎ ✓` sont masqués sur desktop, ce qui règle sans coût le défaut relevé en revue initiale — des caractères de police système servant d'icônes, dont deux disaient le contraire de leur destination. La barre basse mobile les conserve pour l'instant ; leur remplacement par une vraie famille tracée reste à faire là.

### Compression et responsive

Le bandeau se contracte par paliers : sous 1240 px le sélecteur de site et le nom d'utilisateur passent en retrait, sous 1100 px le mot-symbole ne garde que sa marque. Vérifié sans débordement horizontal à 1440, 1240, 1180, 1100, 1024, 960, 800 et 760 px, sur les trois profils. **Sous 700 px, rien ne change** : la barre basse mobile est intacte.

### Le risque à connaître

Cinq entrées tiennent confortablement. La nomenclature adoptée en DEC-002 en prévoit jusqu'à neuf pour l'Administration, réparties en quatre groupes. **Un bandeau horizontal ne porte pas de groupes nommés** et ne dépassera pas sept ou huit entrées avant de devoir déborder dans un menu « Plus ». Si la nomenclature groupée est maintenue, les deux décisions entrent en tension et il faut trancher : soit le rail latéral avec ses groupes, soit le bandeau avec une liste plate plus courte.

C'est la seule vraie objection à cette proposition, et elle ne se résout pas par le design : elle dépend du nombre de destinations que le produit veut exposer.

- **Fichiers concernés :** `app/globals.css` uniquement — aucun changement de balisage, de logique ni de rôle
- **Contrôles attendus :** `pnpm lint`, `pnpm build`, `pnpm verify:personas`. Vérifié de mon côté : aucun texte sous 12 px, aucun débordement horizontal sur 10 combinaisons écran × profil à 1440 et 1024 px, barre mobile inchangée à 375 px.
- **Suite proposée :** Si wilkam retient le bandeau, consigner la décision, redescendre le seuil du registre à 960 px et rouvrir la question de la colonne Responsable, aujourd'hui masquée sous 1180 px alors que la largeur le permettrait désormais. Si wilkam conserve le rail, le patch est jeté et le lot 5 revient aux encres sémantiques de DESIGN-007.

---

## DESIGN-009 — Lot 4 : le socle généralisé, et une erreur dans mon patch du lot 2

- **Date :** 29 août 2026
- **Auteur :** Designer
- **Statut :** Livré — `lot4-socle-generalise.patch`, à appliquer après les lots 2 et 3
- **Périmètre :** `app/globals.css` pour l'essentiel, plus une assertion de `scripts/audit-visual-styles.mjs`

### Mes deux erreurs, corrigées par le dev lead

**Le patch du lot 2 déplaçait trois points de rupture au lieu d'un.** J'avais opéré par substitution de chaîne sur `@media (max-width:960px)` puis sur `@media (max-width:1100px)`, sans restreindre la portée. Résultat : le bloc du registre partait bien à 1279 px, mais **deux blocs préexistants à 1100 px**, concernant le tableau de bord et le Surpresseur, partaient avec lui. La restauration à 1100 px était la bonne décision, et le constat était juste : seul le registre bascule à 1280 px.

C'est le même mécanisme que le défaut relevé au lot 1B — une opération globale appliquée sans vérifier son périmètre réel. J'ai adopté depuis une règle : ne plus dériver un périmètre d'une liste de sélecteurs devinée, mais **le collecter depuis le DOM rendu**. Le lot 4 ci-dessous est construit ainsi.

**« Afficher la continuité de traitement » restait à 8 px.** Ma cartographie du lot 2 énumérait les sélecteurs à la main et a manqué la variante repliée. Le correctif était nécessaire.

**Sur la réserve de densité :** la troncature observée en fenêtre étroite avec barre de défilement classique correspond à ma propre mesure — une seule troncature à 1280 px, le titre d'anomalie le plus long. La barre de défilement retire une quinzaine de pixels au viewport et fait tomber la fenêtre juste au-dessus du seuil. La conserver comme réserve est le bon arbitrage : c'est un titre sur huit, et le code d'anomalie comme l'équipement restent lisibles.

### Ce que fait le lot 4

Le périmètre a été relevé dans le navigateur, sur les trois profils et tous leurs écrans : tout élément rendu sous 12 px, et tout rayon hors échelle, avec les règles CSS qui les produisent. Le résultat déborde largement du tableau de bord — 75 sélecteurs de taille, 14 de rayon, dont une partie dans la coquille applicative. La substitution a donc été appliquée mécaniquement à toute la feuille, sans changement d'intention visuelle.

| | Avant lot 4 | Après |
| --- | ---: | ---: |
| Déclarations `font-size` en pixels ≤ 18 px | 425 | **0** — toutes passées aux tokens |
| Déclarations `border-radius` en pixels | 157 | **0** |
| Rayons réellement rendus dans l'application | 8 valeurs | **8, 12, 16, 999, 50 %** |
| Éléments rendus sous 12 px | ~40 par écran | **0** |
| Gris de texte écrits en dur sous 4.5:1 | 78 valeurs, 94 usages | **0** — tous sur `--foreground-muted` |
| Éléments sous 4.5:1 (10 écrans × 3 profils) | 161 | **58** |
| Débordement horizontal | — | **aucun** |

**`--font-size-display` porté de 24 à 28 px.** Les valeurs dominantes actuelles sont à 27, 28, 29 et 30 px selon l'écran ; 24 px les aurait toutes réduites. 28 px les unifie en abaissant très légèrement la plus grande. Les KPI secondaires, à 21 et 22 px, se replient sur `--font-size-title` (20 px). Deux niveaux au lieu de huit.

**Une régression introduite puis corrigée dans le même lot.** Le passage de la fiche Surpresseur à 12 px a fait déborder `.score-freshness` de 154 px à 1440. La ligne libellé/valeur était en `flex` sans repli ni `min-width:0`. Corrigé ; vérifié sur les deux profils qui accèdent à cet écran.

**Une assertion de test modifiée — votre territoire, à valider.** `pnpm audit:visual` échouait sur « Responsable visible sur desktop étroit ». Le contrôle teste la présence de la chaîne `@media (min-width:961px) and (max-width:1180px)`, que le lot 2 a supprimée : il vérifie le mécanisme, pas le résultat. Le résultat, lui, est acquis — sous 1280 px le registre passe en cartes et le responsable s'affiche en champ libellé, ce que j'ai mesuré à 0 troncature. J'ai réécrit l'assertion sur `@media (max-width:1279px)` et la présence de `.registry-mobile-details`. Votre copie locale comporte un contrôle de plus que la mienne ; reprenez la formulation plutôt que le patch.

### Contrôles

`pnpm lint`, `pnpm build`, `pnpm verify:personas` (32 contrôles) et `pnpm audit:visual` (13 contrôles) passent. Mesures runtime sur 10 combinaisons écran × profil à 1440 px : aucun texte sous 12 px, aucun débordement, une troncature résiduelle sur le tableau de bord.

### Ce qui reste : 58 écarts de contraste, tous sur fond teinté

Ils ne relèvent plus de l'encre neutre mais des surfaces sémantiques : `+1 600 000 FCFA` à 3.96:1 sur ambre, les pastilles `AQ` à 2.93:1, `SLA` et `PV` à 4.2:1, les marqueurs `1`, `2`, `01` dans leurs ronds teintés. C'est exactement l'objet de DESIGN-007 : chaque triplet a besoin d'une encre propre, assombrie au minimum, distincte du token de rôle. C'est le lot 5, et il clôt le socle.

- **Fichiers concernés :** `app/globals.css`, `scripts/audit-visual-styles.mjs` (une assertion)
- **Impacts attendus :** Aucun changement de logique, de donnée, de rôle ni de rupture. Aucune valeur de couleur nouvelle hors `--foreground-muted`, déjà déclaré.
- **Suite proposée :** Lot 5 — encres des triplets sémantiques, puis le socle est refermé et la nomenclature de DEC-002 peut être implémentée avec les routes.

---

## DESIGN-008 — Lot 3 : animation, encodage des graphiques, badge critique

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Livré — patch `lot3-graphes-contraste.patch`, à appliquer après le lot 2
- **Périmètre :** `app/globals.css`
- **Contexte :** Demande initiale : « animer les graphiques ». Vérification faite dans l'application en marche — **ils le sont déjà, et correctement.** `.score-ring-value` transitionne sur `stroke-dashoffset`, `.score-bar-track>i` et `.agent-score-track>i` sur `width`, `.trend-column i` sur `height`, et trois blocs `prefers-reduced-motion` les neutralisent. Surtout, l'animation se déclenche au **changement de valeur** — bascule 7 j / 30 j / 90 j, filtre Tous / À surveiller — et non à l'ouverture. C'est le seul rôle légitime du mouvement dans un outil d'exploitation : dire quelle barre a bougé et de combien.

  Trois observations issues de cette vérification.

  **Les durées sont trop longues.** 550 ms pour les barres, 600 ms pour l'anneau. Au-delà d'environ 400 ms, l'utilisateur attend que la valeur se stabilise avant de la lire. Ramenées à **240 ms** pour les barres et **320 ms** pour l'anneau, qui parcourt plus de chemin. Courbe d'accélération inchangée.

  **Le mouvement rejoue à chaque navigation.** Faute de routes, chaque clic dans la sidebar remonte les composants et relance toutes les transitions. Aucune animation supplémentaire ne devrait être ajoutée avant le chantier B, sous peine de multiplier cet effet.

  **Ce qui manque n'est pas de l'animation, c'est de la donnée.** « Évolution de la charge » et « Score du bâtiment » affichent tous deux *Données historiques insuffisantes*. Le graphique de tendance — celui que le mouvement servirait le mieux — n'existe pas encore comme graphique.

- **Décision ou question :** Trois corrections, appliquées et vérifiées.

  **1. La composition du score portait les couleurs d'état.** `.score-components i.series-2/3/4` consommait `--viz-series-2/3/4`, dont les valeurs sont exactement `--success`, `--warning` et `--danger`. Résultat : dans la répartition du score global — Équipements 70 %, Sécurité 15 %, Zones 10 %, Continuité 5 % — la Sécurité s'affichait en vert et la Continuité en rouge. Le lecteur comprend « la sécurité va bien, la continuité va mal », ce que le graphique ne dit pas : ce sont des poids, pas des états.

  Ces quatre parts ne sont pas des catégories indépendantes mais les fractions d'une même grandeur. L'encodage juste est donc **séquentiel, une seule teinte, du foncé au clair**, ordonné par poids — pas une palette catégorielle. Rampe introduite, construite sur l'axe bleu BEHIRA et ancrée sur `--brand` :

  | Token | Valeur | Contraste sur blanc |
  | --- | --- | ---: |
  | `--score-part-1` | `#123a6b` | 11.39:1 |
  | `--score-part-2` | `#235ea7` *(= `--brand`)* | 6.50:1 |
  | `--score-part-3` | `#3d79bd` | 4.50:1 |
  | `--score-part-4` | `#5b93cd` | 3.23:1 |

  Luminance strictement croissante, chaque pas au-dessus du seuil de 3:1 exigé pour une surface colorée. Aucune palette nouvelle : la rampe est une interpolation entre les deux bleus déjà validés du projet.

  En contrepartie, `--viz-series-2/3/4` disparaissent. Là où la couleur signifie réellement un état — `.score-bar-track>i.success/.warning/.danger`, les barres de score par équipement, et leur légende — les règles consomment désormais `--success`, `--warning` et `--danger` directement. Ces trois tokens étaient de simples doublons de valeur, du même type que les alias supprimés au lot 1A.

  **2. Le badge le plus important de l'application s'affichait en gris.** Mesuré dans le rendu : « Hors délégation », « Critique » et « 3 décisions » apparaissaient à **3,07:1** dans la liste des remontées terrain. La cause n'est pas la palette mais une collision de spécificité :

```
.field-request-list article>div:first-child>span { color:#7d8996; font-size:8px }
```

  Cette règle de mise en page repeint **tous** les `span` enfants directs, badges compris, avec une spécificité (0,3,3) qui écrase `.badge-critical` (0,1,0). Le statut n'était plus porté que par la teinte de fond. Corrigé par `span:not(.badge)`. Les neuf badges de l'application passent désormais entre **5,84:1 et 7,39:1**.

  Ce constat corrige mon entrée DESIGN-007 : mon estimation partait de la lecture statique de la feuille de style, qui annonçait trois badges non conformes. Le rendu réel en donnait un seul, et pour une autre cause. Les valeurs assombries que j'y proposais ne sont pas nécessaires ; l'entrée reste ouverte pour les seuls triplets fond/bordure/texte, à consommer quand les autres écrans passeront au socle.

  **3. Un débordement de périmètre de ma part, au lot 2.** La règle `.badge-label{font-size:var(--font-size-label)}` que j'avais ajoutée en fin de feuille n'était pas cadrée et remontait tous les badges de l'application à 12 px, pas seulement ceux du registre. Je l'assume et je la conserve — mais délibérément, cadrée en `.badge .badge-label, .badge .badge-icon`. Conséquence à valider : tous les badges de l'application passent de 8–9 px à 12 px, ce qui est conforme à DEC-003 mais dépasse le périmètre annoncé du lot 2.

- **Fichiers concernés :** `app/globals.css` uniquement
- **Impacts attendus :** Aucun changement de logique, de donnée ni de rôle. Trois tokens supprimés, quatre ajoutés.
- **Contrôles attendus :** `pnpm lint`, `pnpm build`, `pnpm verify:personas`. Vérifié de mon côté : neuf badges entre 5,84:1 et 7,39:1 sur les quatre écrans du Facility Manager, transitions à 0,24 s et 0,32 s, rampe de composition rendue en quatre bleus, et non-régression du registre — aucun texte sous 12 px, une seule troncature résiduelle à 1280 et 375 px.
- **Suite proposée :** Ne pas ajouter d'animation supplémentaire avant les routes. Quand le graphique de tendance aura des données, définir à ce moment-là une palette catégorielle validée — pas avant, et pas en réutilisant les couleurs d'état.

---

## DESIGN-007 — Trois rôles sémantiques sur cinq échouent au contraste

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Ouvert — valeurs à arbitrer avant le lot 3
- **Périmètre :** Triplets fond / bordure / texte, badges
- **Contexte :** Le passage au plancher de 12 px rend le contrôle de contraste contraignant : à cette taille le seuil applicable est 4.5:1, pas 3:1. Mesuré sur les triplets que j'avais proposés en DESIGN-001, en utilisant les tokens de rôle comme couleur de texte :

  | Rôle | Surface | Texte | Ratio | Verdict |
  | --- | --- | --- | ---: | --- |
  | Danger | `#fde8e9` | `var(--danger)` | 4.20 | insuffisant |
  | Avertissement | `#fff0e1` | `var(--warning)` | 4.07 | insuffisant |
  | Succès | `#e7f5ed` | `var(--success)` | 3.32 | **très insuffisant** |
  | Information | `#edf5fc` | `var(--brand)` | 5.90 | conforme |
  | Neutre | `#f7f9fb` | `var(--foreground-muted)` | 5.48 | conforme |

  Le défaut existe déjà dans le code actuel, indépendamment du chantier. Sur les huit badges de `app/globals.css`, trois sont sous le seuil : `.badge-high` 3.21:1, `.badge-orange` 3.51:1, `.badge-neutral` 4.39:1.

- **Décision ou question :** Introduire une couleur de texte propre à chaque triplet, distincte du token de rôle, obtenue en assombrissant le rôle au minimum nécessaire — teinte et saturation conservées, donc sans nouvelle palette :

  | Token proposé | Valeur | Ratio sur sa surface | Ratio sur blanc |
  | --- | --- | ---: | ---: |
  | `--danger-text` | `#c33841` | 4.52 | 5.30 |
  | `--warning-text` | `#ad5716` | 4.53 | 5.06 |
  | `--success-text` | `#287c58` | 4.54 | 5.10 |
  | `--info-text` | `var(--brand)` inchangé | 5.90 | 6.50 |
  | `--neutral-text` | `var(--foreground-muted)` inchangé | 5.48 | 5.78 |

  Les tokens de rôle `--danger`, `--warning`, `--success` restent inchangés pour les pastilles, barres et séries de graphiques, où seul le 3:1 non textuel s'applique. Correctifs de badges au passage : `.badge-high` `#d26b18` → `#ac5814`, `.badge-orange` `#c6671b` → `#ab5917`, `.badge-neutral` `#66717d` → `#656f7b`.

- **Fichiers concernés :** `app/globals.css`
- **Impacts attendus :** Assombrissement à peine perceptible des libellés de badge ; aucun changement de teinte perçue.
- **Contrôles attendus :** Recalcul des ratios après application, sur les cinq profils.
- **Suite proposée :** À intégrer au lot 3, en même temps que la consommation des triplets sur les autres écrans.

---

## DESIGN-006 — Lot 2 : le registre au plancher de 12 px

- **Date :** 28 août 2026
- **Auteur :** Designer
- **Statut :** Livré — patch joint, à relire et committer
- **Périmètre :** `app/globals.css`, périmètre registre uniquement
- **Contexte :** Application de l'échelle du lot 1B au seul écran pilote, pour mesurer le coût réel du plancher arbitré en DEC-003. Vingt-six déclarations `font-size` remplacées par les tokens, plus les hauteurs de contrôle des filtres et de la recherche (38 px → `--control-height`). Mesures prises sur l'application lancée localement au commit `31430d8`, profil Facility Manager, huit anomalies de démonstration.

  | Largeur | Avant | Après |
  | --- | --- | --- |
  | 1440 | tableau · 0 troncature · 715 px · textes de 7 à 11 px | tableau · 0 troncature · 743 px *(+4 %)* · rien sous 12 px |
  | 1280 | tableau · troncatures · idem | tableau · 1 troncature *(le titre le plus long)* · 753 px |
  | 1024 | tableau · **9 troncatures** · 715 px | cartes · **0 troncature** · 1 687 px |
  | 880 | cartes · 0 troncature · 1 393 px | cartes · 0 troncature · 1 687 px *(+21 %)* |
  | 375 | cartes · 0 troncature · 1 724 px | cartes · 1 troncature · 2 218 px *(+29 %)* |

  **Le plancher tient sur desktop.** À 1440 px, remonter tous les textes à 12 px coûte 3 px de hauteur de ligne et ne provoque aucune troncature ni aucun débordement. C'est presque gratuit.

  **Il ne tient pas dans le tableau à six colonnes en dessous de 1280 px.** Le titre d'anomalie devient illisible : « Batterie de démarrage s… » ne dit pas ce qui est en panne. J'ai d'abord tenté un rééquilibrage des colonnes ; sans effet, parce qu'à cette largeur toutes les colonnes sont déjà à leur minimum et la répartition en `fr` ne s'applique plus.

  La solution retenue est de **remonter la bascule en cartes structurées de 960 à 1280 px**. Les cartes affichent l'échéance et le responsable en clair, ce que le tableau masquait ou tronquait. Coût : la page fait 1 687 px au lieu de 748 px à 1024 px — on remplace de la troncature par du défilement. Un titre tronqué est inutilisable ; du défilement est seulement plus lent.

  Correction incluse : `Non attribué` et `Acteur externe : PREST-ASC` s'affichaient collés faute de `display:block` sur le `<small>`. Le défaut existait avant, il devenait très visible à 12 px.

- **Décision ou question :** Adopter le patch tel quel, ou retenir l'alternative — conserver le tableau jusqu'à 960 px et accepter neuf troncatures à 1024 px. Je recommande le patch : la direction artistique demande que statut, priorité, échéance et responsable soient lisibles sans ouvrir la fiche, ce que le tableau à 1024 px ne permet pas.

  Deux points laissés ouverts en DESIGN-004 sont tranchés par la mesure :
  - **`--font-size-secondary` n'est pas nécessaire.** Le registre n'utilise que `label` 12 et `body` 14 ; aucun besoin d'un cran à 13 px n'est apparu. La proposition est retirée.
  - **`--font-size-display` à 24 px n'a pas été éprouvé ici** : le registre n'affiche pas de valeur KPI dominante. À trancher sur le tableau de bord, où les valeurs sont aujourd'hui à 29 px.

- **Fichiers concernés :** `app/globals.css` — patch de 107 lignes, aucun autre fichier touché
- **Impacts attendus :** Aucun changement de logique, de rôle ni de contenu. Un point de rupture supprimé (`min-width:961px and max-width:1180px`), un déplacé (960 → 1280).
- **Contrôles attendus :** `pnpm lint`, `pnpm build`, `pnpm verify:personas`. Vérifié de mon côté à 1600, 1440, 1366, 1280, 1279, 1024, 880, 700, 430 et 375 px : aucun texte sous 12 px dans le périmètre, aucun débordement horizontal, une seule troncature résiduelle — le titre d'anomalie le plus long.
- **Suite proposée :** Après validation, lot 3 sur le tableau de bord : triplets sémantiques de DESIGN-007, arbitrage de `--font-size-display`, et rayons.

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
