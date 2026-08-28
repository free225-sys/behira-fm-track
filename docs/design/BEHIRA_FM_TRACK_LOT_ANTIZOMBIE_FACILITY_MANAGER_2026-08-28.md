# BEHIRA FM Track — Lot `AntiZombieSummary` Facility Manager

Date : 28 août 2026  
Statut : terminé localement, codage remis en pause  
Publication : aucune  
Base de données : aucune migration, aucune règle métier et aucune permission modifiées

## 1. Périmètre réalisé

Un composant partagé et réutilisable `AntiZombieSummary` a été créé puis intégré une seule fois dans le cockpit Facility Manager de Facility Manager. L’ancien bandeau incomplet à quatre champs a été remplacé dans ce seul écran.

Le registre et le dossier central n’intègrent pas ce composant. Aucun comportement de décision, seuil, SLA, permission ou verrou de preuve n’a été modifié.

## 2. Fichiers modifiés ou ajoutés

- `app/components/AntiZombieSummary.tsx` : rendu accessible des huit informations.
- `app/components/anti-zombie-contract.ts` : contrat, normalisation et valeurs de repli.
- `app/page.tsx` : adaptateur des données Facility Manager et intégration unique.
- `app/globals.css` : styles BEHIRA, desktop, mobile et focus clavier.
- `scripts/verify-anti-zombie.ts` : tests ciblés du contrat et du périmètre.
- `scripts/verify-personas.mjs` : contrôle historique réaligné sur le nouveau composant.
- `package.json` : commande `verify:anti-zombie`.
- `outputs/design/anti-zombie-facility-desktop.png` : capture desktop locale.
- `outputs/design/anti-zombie-facility-mobile.png` : capture mobile locale.

## 3. Contrat de données

Le composant reçoit un objet `AntiZombieSummaryData`. Il n’évalue aucun seuil, ne calcule aucun retard et n’accorde aucune action. L’adaptateur Facility Manager lui transmet les faits déjà disponibles ; le normaliseur applique seulement les libellés de repli requis.

```ts
type AntiZombieSummaryData = {
  status?: string | null;
  responsible?: string | null;
  nextAction?: string | null;
  deadline?: string | null;
  slaLabel?: string | null;
  isDelayed?: boolean;
  isBlocked?: boolean;
  blockingActor?: string | null;
  blockingOrDelayReason?: string | null;
  expectedProof?: string | null;
  lastHistoryActivity?: {
    label: string;
    occurredAt: string;
    actor?: string | null;
  } | null;
};
```

## 4. Correspondance des huit champs

| Champ visible | Source réelle actuelle | Traitement appliqué |
|---|---|---|
| Statut | `Anomaly.status` | Affichage direct du statut existant. |
| Responsable | `Anomaly.owner` | `Non affectée` devient une absence et affiche « Responsable non attribué ». |
| Prochaine action | File Facility Manager active `tab` et libellés déjà présents dans l’ancien bandeau | `proof` affiche « Obtenir la preuve » ; les autres files conservent « Confirmer le diagnostic ». Aucun nouveau moteur de workflow. |
| SLA / Échéance | `Anomaly.due` et signal existant `Anomaly.delayed` | L’échéance est affichée telle quelle ; « En retard » est ajouté seulement si le booléen existant le signale et si le dossier n’est pas clôturé. |
| Acteur bloquant | Aucune donnée structurée dans `Anomaly` | Aucun blocage n’est inféré : « Aucun blocage déclaré ». Le contrat est prêt à recevoir un acteur réel. |
| Motif du blocage ou du retard | Aucune donnée structurée dans `Anomaly` | Un retard sans motif affiche « Motif non renseigné » ; sans retard ni blocage, le composant le dit explicitement. |
| Preuve attendue | Définition existante du dossier WILO | DEMO-EAU conserve « Photo du manomètre et rapport d’intervention ». Les autres équipements affichent « Preuve attendue non définie » au lieu d’une valeur inventée. |
| Dernière activité | Aucun historique rattaché au type `Anomaly` actuel | « Historique indisponible ». La date de constat et la date actuelle ne sont jamais utilisées comme faux historique. |

## 5. Données manquantes constatées

- indicateur métier structuré `isBlocked` dans les données de dossier utilisées par le frontend ;
- acteur bloquant ;
- motif du blocage ou du retard ;
- matrice de preuve attendue pour les équipements autres que DEMO-EAU ;
- liste d’historique réelle permettant d’identifier la dernière activité.

Ces absences sont visibles dans l’interface. Aucune valeur de démonstration n’a été ajoutée pour les masquer.

## 6. Présentation et accessibilité

- Les huit champs sont visibles dans une seule synthèse, sans modale, survol ou tooltip.
- L’ordre visuel commence par : prochaine action, responsable, échéance, acteur bloquant.
- Desktop : grille compacte de deux rangées de quatre informations.
- Mobile : pile intégrale dans le même ordre ; aucun champ n’est supprimé.
- Tous les contenus essentiels utilisent une taille d’au moins 12 px.
- La synthèse est une région nommée, atteignable au clavier, avec un focus visible de 2 px.
- L’état est toujours écrit en toutes lettres : `ACTIF`, `EN RETARD` ou `BLOQUÉ`.
- Palette : bleu nuit BEHIRA, accent orange, fond clair, bordure neutre unique et ombre minimale.

## 7. Captures

- Desktop : `outputs/design/anti-zombie-facility-desktop.png`
- Mobile : `outputs/design/anti-zombie-facility-mobile.png`

## 8. Résultats des tests

| Contrôle | Résultat |
|---|---|
| Dossier actif complet | Réussi |
| Dossier en retard | Réussi |
| Dossier bloqué complet | Réussi |
| Dossier bloqué sans acteur | Réussi, alerte de complétude attendue |
| Dossier bloqué sans motif | Réussi, alerte de complétude attendue |
| Dossier sans responsable | Réussi |
| Dossier sans échéance | Réussi |
| Dossier sans historique | Réussi |
| Intégration unique dans Facility Manager | Réussi |
| Absence dans Agent Électricité / autres personas | Réussi dans le navigateur et par contrôle statique |
| Desktop 1440 px | Réussi |
| Mobile 390 px | Réussi, aucun débordement horizontal |
| Navigation clavier | Réussi, région nommée et focus bleu 2 px |
| Console navigateur | 0 erreur |
| Lint | Réussi |
| Build de production | Réussi |
| 28 contrôles personas | Réussis |
| 20 contrôles Auth | Réussis |
| 9 contrôles bordures / focus | Réussis |
| Préparation Supabase | Réussie, aucune modification distante |
| Lot 0 | Intact : 26 tables, 12 migrations, 5 suites SQL |

## 9. Limites connues

- Le cockpit ne peut pas afficher de blocage réel ni de dernière activité réelle tant que ces données ne sont pas exposées dans la source actuelle du dossier.
- Les preuves attendues ne sont explicitement définies que pour DEMO-EAU dans l’interface existante.
- La synthèse reste informative : elle ne crée pas d’action, ne persiste pas de décision et ne change aucun droit.
- La version publiée reste inchangée conformément au GO conditionnel.

## 10. Proposition du lot suivant

Proposer un lot séparé « Données réelles AntiZombie — Facility Manager » pour alimenter l’adaptateur depuis l’historique, les blocages et la matrice de preuves déjà présents ou à confirmer dans le modèle existant. Ce lot devra d’abord cartographier les sources sans migration, puis demander une validation explicite avant toute évolution du schéma ou toute intégration dans le registre et le dossier central.

Le codage est remis en pause dans l’attente d’une nouvelle validation.
