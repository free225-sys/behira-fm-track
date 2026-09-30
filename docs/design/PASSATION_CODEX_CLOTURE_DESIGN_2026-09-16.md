# Passation Codex — clôture design UI

- **Date :** 16 septembre 2026
- **Auteur :** Design (Grok / Wilkam)
- **Statut :** Chantier design clos après passe corrective. Raccord données / formules / périmètres : Codex.
- **Contrat :** pas de modification de `app/lib/supabase/data.ts`. Pas de scores, paliers ou pondérations inventés côté UI.

## 1. Navigation par rôle (section 3)

Matrice `allowedViewsByPersona` inchangée (audit). Affichage :

| Rôle | Accueil | Dossiers | Rondes | Équipements | Pilotage | Paramètres | Plus |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Facility Manager | oui | oui (À traiter, aucun filtre par défaut) | oui | oui | oui | non | Utilisateurs (proposition) |
| Administration | Arbitrages | oui, entrée réelle | non | oui | oui | oui | — |
| Agent Électricité | oui | non | oui | non | non | non | non |
| Agent Eau et incendie | oui | non | oui | non | non | non | non |
| Agente Rondes | oui | non | oui | non | non | non | non |

### Redirections

| Entrée | Destination réelle |
| --- | --- |
| Registre | Dossiers, onglet Tous (retirée du menu) |
| À traiter / Dossiers | Dossiers, onglet À traiter |
| Coûts | Dossiers, onglet Tous (retirée du menu) |
| Utilisateurs et droits (Administration) | Paramètres (seuils + utilisateurs) |
| Seuils et paramètres | Paramètres |
| Utilisateurs et droits (Facility Manager) | Utilisateurs et droits (proposition seulement) |

Les clés `registry`, `costs`, `access`, `settings` restent dans le catalogue (audit). Les espaces Coûts et Registre ne sont plus des pages autonomes.

## 2. Composants et données attendues

| Composant | Donnée Codex attendue | Aujourd’hui |
| --- | --- | --- |
| `BuildingHealthCockpit` | `BuildingHealthSnapshot` (`behira.lot0.v1`) | fixtures `demoHomeSnapshot` + sélecteur de scénario |
| `HealthScoreBlock` / `ScoreScale` | `score.final` entier, `raw`, `state`, `cause` | fixtures normal / capped / not_computable |
| `KpiStrip` | à risque, dispo, couverture, décisions, critiques, réserves | réserves : `insufficient` |
| `EquipmentTable` | parc groupé par famille, statut métier, `controlValidity`, score | fixtures, RIA-01 non tranché sur le parc live |
| `StartRoundPicker` | rondes du jour du périmètre, échéances, manquée hier | `demoRoundsFor` |
| Dossiers (liste + détail) | files, montants, responsable, jalons | anomalies démo + `Escalation.amount` + notifications Hygiène |
| Accueil Administration | file d’arbitrages, montants, motif, preuves, historique | `seedEscalations` + preuves du dossier lié |
| Paramètres | seuil, SLA, seuils techniques, formule | seul le seuil 400 000 FCFA est confirmé |
| GE-01 | mesures, preuves, file d’envoi | déjà raccordé au pilote |

## 3. Champs encore sur fixtures, par écran

### Accueil Agent
- Compteur d’actions (ACT-081, ACT-079, ACT-076)
- Rondes du jour et « manquée hier »
- Scores GE-01 / ASC-A1 / ASC-A2 (périmètre session, pas le parc entier)
- Historique des 5 derniers rapports (`demoReportTracking`)
- « Tout est synchronisé » : état démo, pas un vrai sync

### Accueil FM
- Score bâtiment et cause du plafond (RIA-01) via scénario démo
- 6 KPI : totaux fixtures ; **Réserves ouvertes** non raccordé
- Décisions à prendre : premières lignes de Dossiers > À traiter, bouton selon l’étape
- **Où se perdent les points** : Données insuffisantes (pas de 70/15/10/5, pas de courbe 30 jours)
- Tableau équipements : scores et statuts fixtures
- Rondes du jour : `demoRoundsFor`
- Hygiène et paysage : `fieldRequests` locaux, un bouton Qualifier
- Réponse Administration : première escalation décidée

### Dossiers
- Liste, priorités, échéances, responsables : anomalies démo + notifications Hygiène/paysage (origine, Hors score)
- Qualifier Notification / Ticket / Urgence : état d’interface, non persisté
- Échéance : champ `datetime-local` natif
- Coût estimé : vide, contrôle en direct du seuil 400 000 FCFA
- Branches A/B/C : après diagnostic confirmé seulement
- Détails de traitement : repliés, champs vides masqués
- Historique en bas du panneau
- Montant / seuil : `DECISION_THRESHOLD_FCFA` = 400 000
- 7 files : Réceptions, Réserves, Dossiers rouverts = 0, source non raccordée (conservées en source, masquées)

### Accueil Administration
- 4 arbitrages + 1 historique (`seedEscalations`)
- 5,25 M = somme des montants documentés
- Mini-santé 69 si scénario Plafonné, sinon non calculable
- Preuves : statut Joint / Attendu / Non concluant depuis le dossier lié, sinon « Données insuffisantes »
- Historique : décision et motif, sinon « Données insuffisantes »
- Points de contrôle (clôture sensible, accès FM, retards, règles) : libellés d’interface

### Pilotage
- Onglets sans 01–04
- Performance : Données insuffisantes (plus de 89 % ni 24 clôturés)
- Coûts du tableau : montants d’arbitrages seulement

### Paramètres
- Une règle : seuil 400 000 FCFA
- SLA, seuils techniques, méthode de score : une phrase « non raccordé »
- Utilisateurs (Administration) : simulation locale, pas d’Auth réelle

### Rondes / GE-01
- Pilote réel pour GE-01 (mesures, photos, file d’envoi)
- Autres équipements : parcours démo

## 4. Routes supprimées comme pages autonomes

| Ancienne destination | Comportement |
| --- | --- |
| Registre | redirige vers Dossiers / Tous ; plus dans le menu |
| Coûts | redirige vers Dossiers / Tous ; plus dans le menu |
| Utilisateurs (Administration) | redirige vers Paramètres |
| À traiter | est l’onglet Dossiers / À traiter |

Pas de nouvelle URL. Navigation interne par `view`.

## 5. Commandes de test et résultats

Exécutées le 16 septembre 2026 après la passe corrective.

| Contrôle | Résultat |
| --- | --- |
| lot 0 UI (contrat d’affichage) | 87 / 87 |
| lot 1 UI (composants partagés) | 28 / 28 |
| audit visuel (bordure / focus / destinations) | 103 / 103 |
| personas | 38 / 38 |
| GE-01 contexte | 9 / 9 (inchangé) |
| GE-01 seuils numériques | 24 / 24 + garde-fous (inchangé) |
| GE-01 étapes 2–4 | 13 / 13 (inchangé) |
| AntiZombieSummary | 11 / 11 (inchangé) |

Aucune modification de `data.ts`. `DEMO-*` restent en source ; l’affichage passe par `displayAssetCode` / `displayAssetText`.

## 6. Écarts validés (ne plus ouvrir)

- Deux barres de chrome (navigation + titre de page) plutôt qu’un header unique 64 px, sauf Dossiers où le topbar est masqué pour ne garder que le bandeau navy
- Sélecteur de scénario de démonstration, masqué hors démo
- Badge de validité du contrôle, visuellement secondaire, distinct du statut métier
- Police Geist (pas de Barlow / Public Sans — DESIGN-003)
- « Données insuffisantes » à la place des poids 70/15/10/5, de la courbe 30 jours, des réserves et des 89 % / 24 clôturés
- Motif Administration obligatoire pour Refuser et Renvoyer, saisi dans le panneau (plus de fenêtre de confirmation)

## 7. Points ouverts pour Codex

| Point | Attendu |
| --- | --- |
| RIA-01 | Trancher indisponible vs dégradé sur le parc live ; aujourd’hui non tranché, score `null` |
| **Échéance RIA-01** | **10:30 sur l’accueil FM (bandeau « Qualifier avant », fixture `decisionDeadline`) et 12:00 dans Dossiers (ANO-0241.due). Ne pas trancher côté UI. Harmoniser depuis la source métier.** |
| Heures limites | Échéances de ronde et « Qualifier avant HH:MM » depuis la source métier, plus les fixtures |
| Pondérations | Poids de domaine pour « Où se perdent les points » ; UI prête à afficher, n’invente rien |
| IRR-01 | Code canonique d’affichage déjà mappé depuis `DEMO-ESP` ; fiche et statut métier à raccorder |
| Codes des notifications | Préfixe NOT- vs ANO- selon qualification Notification / Ticket / Urgence |
| Réserves | Compteur « Réserves ouvertes » et file Réserves |
| Courbe 30 jours | Instantanés de score final + brut ; placeholder « après 7 jours d’instantanés » déjà rédigé |
| Journal d’arbitrage | Historique persisté (auteur, heure, motif) à la place de la simulation locale |

## 8. Garde-fous UI à ne pas casser

- Pas de « 92 % », « Plafonné par », mélange Sain/Surveillance avec un statut métier
- Palier uniquement sur `score.final` entier
- `ControlValidityBadge` séparé du statut métier
- CTA cockpit FM = « Ouvrir Dossiers »
- 7 files et branches A/B/C restent dans le source (audit) ; visuellement : pastilles, A/B/C seulement après diagnostic
- Seuil unique `400_000` dans `page.tsx`
- GE-01 : draft, sync, hors-ligne, pas de régression
