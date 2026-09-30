# GE-01 — conformité intégrale du corpus UI

Source : `design/lot-1-tokens`, commit `8c5512a`. Cible : `feat/ge01-pilot`, travail local du 11 septembre 2026. Aucun merge, push, déploiement ou C10-C.

Le contrat des primitives, DESIGN.md, DECISIONS.md, l’intégralité de FROM-DESIGN.md, GE01_RACCORD_LOT1.md, les primitives et les tokens ont été parcourus dans l’ordre demandé. Les documents complémentaires de direction artistique, critères, audit, recalage, lot anti-zombie et clôture ont également été consultés. Une décision visuelle plus récente prime sur la précédente. Les autorisations historiques de publication ne constituent pas une autorisation actuelle.

## Table de passation

Les chemins ci-dessous sont relatifs au dépôt. « Déjà conforme » désigne le comportement conservé après contrôle ; les autres lignes indiquent les fichiers raccordés ou corrigés. Une décision remplacée est explicitement identifiée, jamais appliquée en parallèle de sa remplaçante.

| Entrée | État et application | Fichiers concernés |
| --- | --- | --- |
| DESIGN-001 | Déjà conforme pour le socle ; les nouveaux contrôles consomment les tokens canoniques. Noms et valeurs finaux de DESIGN-020 conservés. | `app/globals.css`, `app/components/ui/*` |
| DESIGN-002 | Déjà conforme : catalogue des destinations et droits préservés ; arrivée commune sur Accueil selon DESIGN-041. | `app/page.tsx` |
| DESIGN-003 | Déjà conforme : Geist est servi localement, sans chargement Google Fonts au démarrage. | `app/layout.tsx`, `public/fonts/`, `scripts/verify-font-assets.mjs` |
| DESIGN-004 | Déjà conforme : une échelle canonique, sans nouvelle famille de tokens concurrente. | `app/globals.css` |
| DESIGN-005 | Déjà conforme : normalisation LF conservée. | `.gitattributes` |
| DESIGN-006 | Registre conforme ; corrigé également le texte d’aide GE-01 qui passait sous le plancher de 12 px. | `app/globals.css`, `app/page.tsx`, `app/components/Ge01Pilot.tsx` |
| DESIGN-007 | Déjà conforme : triplets et encres sémantiques conservés, consommés par les mentions et contrôles. | `app/globals.css`, `app/components/ui/badge.tsx` |
| DESIGN-008 | Durées et graphiques conservés ; anciennes formes de badge remplacées par DESIGN-051. | `app/globals.css`, `app/components/BuildingHealthCockpit.tsx` |
| DESIGN-009 | Socle généralisé : boutons, cartes, champs et icônes partagés dans les surfaces existantes. | `app/page.tsx`, `app/components/*Workspace.tsx`, `Ge01Pilot.tsx`, `Ge01ReviewPanel.tsx`, `Ge01WorkflowPanel.tsx`, `WorkflowAnalytics.tsx`, `SyncStatusNotice.tsx` |
| DESIGN-010 | Navigation haute déjà conforme ; aucun rail latéral réintroduit. | `app/page.tsx`, `app/globals.css` |
| DESIGN-011 | Chrome compact conservé ; suppression des anciens blocs d’introduction FM/Administration doublonnant l’Accueil. | `app/page.tsx`, `app/globals.css` |
| DESIGN-012 | Déjà conforme : environnement explicite et démonstration distincte du mode connecté. | `app/page.tsx`, `app/components/BuildingHealthCockpit.tsx` |
| DESIGN-013 | Débordements historiques déjà corrigés ; filtres, navigation et panneaux contrôlés en mobile. Listes de dates bornées à la largeur disponible. | `app/globals.css`, `app/components/ui/select.tsx` |
| DESIGN-014 | Régressions historiques closes ; police locale, badge Administration et focus conservés. | `app/layout.tsx`, `app/globals.css`, `scripts/audit-visual-styles.mjs` |
| DESIGN-015 | Clôture historique consignée, aucune publication effectuée. Conformité du socle contrôlée à nouveau. | `docs/design/FROM-DESIGN.md`, `scripts/audit-visual-styles.mjs` |
| DESIGN-016 | Déjà conforme : aucun thème sombre ni mécanisme de bascule ajouté. | `app/globals.css`, `app/page.tsx` |
| DESIGN-017 | Forme à rail remplacée par DESIGN-051 ; aucune seconde forme locale. | `app/globals.css`, `app/components/ui/badge.tsx` |
| DESIGN-018 | Titres uniques conservés ; synthèse anti-zombie éclaircie pour garder le navy dans le chrome principal. | `app/page.tsx`, `app/globals.css` |
| DESIGN-019 | Login et en-tête clairs conservés ; icônes partagées. | `app/page.tsx`, `app/globals.css` |
| DESIGN-020 | Tokens et spécimen conservés ; spécimen raccordé à BrandIcon. | `app/globals.css`, `app/design-system/page.tsx` |
| DESIGN-021 | Primitives du miroir reprises. Les six fichiers Badge, Button, Card, Field, IconButton, BrandIcon sont identiques à la source. Généralisation des imports. | `app/components/ui/*`, `app/page.tsx`, `app/components/*.tsx` |
| DESIGN-022 | Santé regroupée sur Accueil ; comptages distincts des mentions de statut. | `app/components/BuildingHealthCockpit.tsx`, `app/page.tsx` |
| DESIGN-023 | Flux pleine largeur conservé. Forme « pastille » remplacée par DESIGN-051. | `app/globals.css`, `app/components/ui/badge.tsx` |
| DESIGN-024 | Consolidation commune conservée, ancienne forme remplacée ; aucun CSS de badge local GE-01. | `app/globals.css`, `app/components/AntiZombieSummary.tsx` |
| DESIGN-025 | Capsule et sceau remplacés par les mentions DESIGN-051. | `app/globals.css`, `app/components/ui/badge.tsx` |
| DESIGN-026 | Ruban des files conservé ; traitement de l’actif selon DESIGN-027/031/034, sans rajouter le rail historique. | `app/page.tsx`, `app/globals.css` |
| DESIGN-027 | Déjà conforme : carte active et monogrammes, avec accent pétrole ultérieur. | `app/globals.css` |
| DESIGN-028 | Focus clavier et contrastes conservés ; BrandIcon, listes au clavier, focus sur les preuves et cibles de 44 px vérifiés. | `app/components/ui/select.tsx`, `app/page.tsx`, `app/components/ui/icon.tsx`, `app/globals.css` |
| DESIGN-029 | Déjà conforme : sept files accessibles, pas de masquage des destinations. | `app/page.tsx`, `app/globals.css` |
| DESIGN-030 | Composition compacte conservée avec arbitrages ultérieurs ; santé retirée d’À traiter conformément à DESIGN-022/035/041. | `app/page.tsx`, `app/globals.css` |
| DESIGN-031 | Déjà conforme : libellés du ruban lisibles et accent teal. | `app/globals.css` |
| DESIGN-032 | Déjà conforme : contexte lisible, accent sémantique teal ; représentation du score actualisée par DESIGN-044. | `app/globals.css`, `app/components/BuildingHealthCockpit.tsx` |
| DESIGN-033 | Déjà conforme : porte de connexion sur chrome unique, briefing et nommage conservés. | `app/page.tsx`, `app/globals.css` |
| DESIGN-034 | Déjà conforme : menu compact, actif pétrole, absence de double bordure et de rail de navigation gauche. | `app/page.tsx`, `app/globals.css` |
| DESIGN-035 | Destinations conservées ; ancien accueil santé remplacé par le composant commun existant du miroir. Aucune reconstruction des parcours. | `app/page.tsx`, `app/components/BuildingHealthCockpit.tsx` |
| DESIGN-036 | Dossier sur surfaces claires, cycle unique, onglets pétrole et CTA principal ; synthèse anti-zombie sans bande navy additionnelle. | `app/page.tsx`, `app/components/DossierContinuity.tsx`, `app/globals.css` |
| DESIGN-037 | Destinations Plus déjà sans titre jumeau ; cartes, champs et listes raccordés aux primitives. | `AccessWorkspace.tsx`, `CostsWorkspace.tsx`, `EquipmentWorkspace.tsx`, `ParametersWorkspace.tsx`, `app/globals.css` |
| DESIGN-038 | Déjà conforme : Rondes/Surpresseur sur le même chrome, étape active pétrole. | `app/page.tsx`, `app/globals.css` |
| DESIGN-039 | Déjà conforme : un rail de ronde, un seul score WILO, sans doublon de bandeau. | `app/page.tsx`, `app/globals.css` |
| DESIGN-040 | Appliqué partout : aucune liste système visible. Portail teal, clavier, focus, choix désactivés, valeurs et validation du formulaire conservés. Dates composées à partir de Select. | `app/components/ui/select.tsx`, `date-input.tsx`, `index.ts`, `app/page.tsx`, `AccessWorkspace.tsx`, `CostsWorkspace.tsx`, `EquipmentWorkspace.tsx`, `Ge01Pilot.tsx`, `Ge01ReviewPanel.tsx`, `Ge01WorkflowPanel.tsx`, `app/globals.css` |
| DESIGN-041 | Tous les profils arrivent sur Accueil. Composant santé du miroir raccordé aux données existantes ; aucun score global fabriqué. | `app/page.tsx`, `app/components/BuildingHealthCockpit.tsx`, `scripts/verify-auth.mjs`, `scripts/audit-visual-styles.mjs` |
| DESIGN-042 | Scan du parc représenté par l’échelle DESIGN-044 ; anciennes tuiles doublonnées retirées. | `app/page.tsx`, `app/components/BuildingHealthCockpit.tsx` |
| DESIGN-043 | Jauge/courbe remplacées par DESIGN-044. KPI compacts conservés, sans moyenne ni disponibilité inventées. | `app/components/BuildingHealthCockpit.tsx`, `app/globals.css` |
| DESIGN-044 | Échelle commune 0–100 et lollipops du miroir ; marqueur seulement quand une valeur existe. Valeurs manquantes explicitement indisponibles. | `app/components/BuildingHealthCockpit.tsx`, `app/globals.css` |
| DESIGN-045 | Cloche, file et règles du miroir raccordées. FM/Administration modifient les règles locales ; agents en lecture seule. Cloche également visible en mobile. E-mail simulé uniquement. | `app/components/NotificationCenter.tsx`, `ParametersWorkspace.tsx`, `app/page.tsx`, `app/globals.css` |
| DESIGN-046 | Aucun kicker ou titre Accueil jumeau ; un H1 du catalogue. | `app/page.tsx`, `app/components/BuildingHealthCockpit.tsx`, `scripts/audit-visual-styles.mjs` |
| DESIGN-047 | **Entrée absente de FROM-DESIGN.md au commit 8c5512a**, aussi bien du tableau que du corps du journal. Aucune exigence inventée pour combler ce numéro. | `docs/design/FROM-DESIGN.md` |
| DESIGN-048 | Prochaine action distincte du responsable interne ; acteur lu dans nextActionAssignee. Raccord existant conservé et enveloppe partagée complétée. | `app/components/AntiZombieSummary.tsx`, `anti-zombie-contract.ts` (déjà conforme), `DossierContinuity.tsx`, `Ge01WorkflowPanel.tsx` |
| DESIGN-049 | Un accès principal aux preuves dans le panneau workflow ; libellé « interne sans coût » ; liste proofs[], compteur réel, refus avec motif, dépôt corrigé et consultation 44 px. | `app/components/Ge01WorkflowPanel.tsx`, `app/page.tsx`, `app/globals.css` |
| DESIGN-050 | **Remplacé par DESIGN-051 pour la forme** : ruban, pointe et œillet retirés. | `app/globals.css`, `app/components/ui/badge.tsx` |
| DESIGN-051 | Mention italique, lavis et encre sémantique communs ; aucune découpe, flou ou badge local. Contrat des primitives appliqué dans toutes les surfaces. | `app/globals.css`, `app/components/ui/*`, `app/components/AntiZombieSummary.tsx`, `scripts/verify-design-contract.mjs` |
| Lucide — fd2b1dc | BrandIcon du miroir utilisé pour la navigation, notifications, états vides, rondes et GE-01 ; dépendance et verrou pnpm présents. Les monogrammes métier et graphiques restent des données, pas une seconde bibliothèque d’icônes. | `app/components/ui/icon.tsx`, `app/components/SyncStatusNotice.tsx`, `app/page.tsx`, `app/components/*.tsx`, `app/design-system/page.tsx`, `package.json`, `pnpm-lock.yaml` |

## Recette des surfaces

Login, Accueil, À traiter, Rondes, Registre, dossier, Preuves, Coûts, Équipements, Droits, Paramètres, Plus, Pilotage et GE-01 ont été parcourus. La recette isolée réutilise les composants applicatifs, sans accès au serveur. Les cinq profils ont été visités ; les principales destinations et formulaires ont été contrôlés à 390, 768 et 1440 px. Les captures et les 44 relevés chronologiques sont joints dans `recette-design-051/`. Les relevés initiaux GE-01 conservent la détection du texte d’aide trop petit ; le relevé après correction confirme son retour au plancher de 12 px. Ils constituent une trace avant/après, pas uniquement les résultats finaux.

- Accueil : une seule destination et un seul titre, données manquantes explicites, aucune nouvelle règle de calcul de santé.
- Notifications : cloche visible sur mobile, règles éditables pour FM/Administration et désactivées pour les agents.
- GE-01 : navigation du formulaire, conservation de `123,5`, trois champs AUTO distincts et récapitulatif sans validation automatique des champs manquants.
- Dossier « En validation » reconstitué en mémoire : acteur attendu **Facility Manager**, responsable interne **Agent Électricité**, **Preuves 2**.
- Preuves : motif refusé visible, actions réservées au FM, confirmation du refus désactivée sans motif, dépôt corrigé et consultation à **44 px**, focus transmis au panneau des preuves.
- Dossier clôturé reconstitué en mémoire : aucune action ni acteur attendu ; aucun dossier réel rouvert.
- Formulaires : choix obligatoire bloquant, option désactivée, libellé composé conservé ; dates contrôlées et non contrôlées ainsi qu’échéance date/heure transmises au format ISO par FormData.

## Intégrité et contrôles

Les 14 fichiers de `app/lib/` présents dans le relevé avant intervention sont identiques octet par octet. Les sept callbacks de revue/workflow/preuves et les six gardes du workflow comparés au relevé initial sont inchangés. Aucune migration, RPC, RLS ou règle de seuil n’a été modifiée par cette intégration UI. Les changements métier déjà présents sur la branche avant cette intervention sont conservés.

Résultats finaux détaillés : `recette-design-051/DESIGN051_TESTS.json`. Contrôles du contrat UI, styles (93), profils (38), ordres de travail/preuves (28), GE-01 (22 champs), anti-zombie, authentification, hors ligne, résilience et ressources de police. Compilation de production et vérifications TypeScript/ESLint effectuées. Le build signale un paquet client supérieur à 500 Ko ; ce n’est pas un échec de compilation.

## Limites métier conservées

Le score global, la disponibilité, l’agrégation par domaine et la tendance 30 jours n’ont pas de données/règles validées permettant de les renseigner ici. Les emplacements sont livrés avec leur état d’indisponibilité, sans chiffre de démonstration substitué en mode connecté. Les notifications e-mail restent simulées comme dans la spécification.

Les dossiers ANO-2026-000007/8/9 n’ont fait l’objet d’aucune écriture. Leur clôture relève du bilan de recette existant. La session de l’application locale a expiré pendant la vérification finale : les contrôles des rôles et états présentés dans cette remise sont ceux de la recette isolée, pas une nouvelle validation serveur de ces trois dossiers.

## Retour de validation utilisateur — correction de la date proposée

L’utilisateur confirme avoir terminé la validation et signale uniquement un chevauchement entre la date proposée et le coût estimé. Le contrôle de date utilisait trois colonnes avec des largeurs minimales supérieures à la place disponible.

Correction dans `app/globals.css` : les sélecteurs partagés jour/mois/année reviennent à la ligne selon la largeur réelle du champ. La colonne date/heure reste bornée à son parent. Aucun changement du composant, des valeurs ou des règles métier.

Recette complémentaire : largeurs 390, 768, 920, 1024 et 1440 px, ainsi qu’une colonne de 188 px ; aucun contrôle ne dépasse son champ. Valeur soumise conservée : `2026-09-28T12:00`. Les 93 contrôles de style et le contrat des primitives passent. Relevés et capture : `recette-design-051/DATE_LAYOUT_CORRECTION.json` et `DATE_LAYOUT_CORRECTION.png`.
## Retour Groc — contrôle d’heure partagé

Groc a confirmé les lots existants et identifié le contrôle horaire natif comme écart restant du paquet. Il est remplacé par `TimeInput`, construit avec deux `Select` partagés (00–23 heures, 00–59 minutes), dans `Ge01Pilot.tsx` et `DateTimeInput`. L’export commun et les styles adaptatifs sont ajoutés. Aucun changement des callbacks de mise à jour ni des données métier.

Le seul `<input type="time">` restant est un proxy de formulaire explicitement masqué dans `ui/time-input.tsx` : il conserve `HH:mm`, FormData, required, min/max et disabled. Il n’affiche aucune horloge système et n’est pas accessible au tabulateur. Le contrôle du contrat vérifie désormais par analyse du JSX que toute entrée date/heure native appartient aux primitives et porte `hidden`.

Recette : 00:00 et 23:59, minute manquante bloquante puis complétée à 00:05, rechargement contrôlé du brouillon à 06:07, borne minimale, champ désactivé exclu de FormData, navigation clavier et échéance conservée à 2026-09-11T00:00. Aucun débordement ni contrôle horaire OS visible à 390/768/1440 px, y compris une colonne de 188 px. Voir `recette-design-051/TIME_INPUT_CORRECTION.json` et `.png`.

Le miroir GitHub n’a pas été modifié. Les alignements proposés par Groc concernent une reprise UI séparée ; aucune copie des adaptateurs privés, publication ou réouverture de dossier n’a eu lieu.