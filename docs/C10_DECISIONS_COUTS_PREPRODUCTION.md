# C10 — décisions et coûts en préproduction

## Objet

C10 commence après la validation complète du parcours critique C9. Le lot relie
les décisions financières aux dossiers réels avant toute recette élargie. Il ne
crée aucune étape de workflow et ne modifie ni les rôles, ni les périmètres des
cinq comptes, ni le verrou critique des preuves.

## État constaté au lancement

- cinq profils Auth actifs et correctement rattachés ;
- deux permissions nominatives de dépôt de rapport, pour Évariste et Sylvain ;
- quatre dossiers ouverts après la recette C9 ;
- aucune ligne dans `public.costs` ;
- aucun paramètre financier canonique côté base ;
- écrans Coûts et arbitrage encore alimentés par des données de maquette ;
- seuil de 400 000 FCFA confirmé par DEC-014 mais encore codé côté interface.

Une recette humaine des coûts serait donc trompeuse avant raccordement.

## Découpage

### C10-A — socle financier canonique

- historiser le seuil confirmé dans `business_parameters` ;
- photographier le seuil utilisé sur chaque décision ;
- enregistrer un coût estimatif sur un dossier ouvert ;
- décider automatiquement dans la délégation du Facility Manager sous le seuil ;
- soumettre à l’Administration tout montant supérieur ou égal au seuil ;
- rendre la décision finale immuable et motivée ;
- empêcher les doubles soumissions et doubles arbitrages ;
- conserver soumission et décision dans `anomaly_history` ;
- protéger le paramètre et les décisions par RLS.

### C10-B — raccordement frontend

- charger le seuil et les coûts depuis Supabase ;
- remplacer les données de maquette dans Coûts et dans le dossier central ;
- permettre à Faustin de soumettre une décision financière ;
- permettre à l’Administration d’approuver ou refuser avec un motif ;
- afficher clairement les états absent, en attente, approuvé et refusé ;
- conserver le mode démonstration séparé du mode préproduction.

### C10-C — recette humaine

- dossier sous le seuil : décision Facility Manager sans escalade ;
- dossier exactement au seuil : arbitrage Administration obligatoire ;
- approbation motivée ;
- refus motivé ;
- replay sans doublon ;
- refus d’un agent terrain ;
- refus d’un nouveau coût sur dossier clôturé ;
- lecture limitée aux profils autorisés ;
- historique complet dans le dossier.

## Garde-fous

- 400 000 FCFA est le seuil canonique confirmé ;
- le seuil est photographié sur chaque coût afin qu’une évolution future ne
  transforme pas rétroactivement les décisions antérieures ;
- un coût soumis ne peut pas être modifié silencieusement ; une correction crée
  un nouvel enregistrement ;
- l’Administration ne peut pas être remplacée par un prestataire ;
- aucune migration distante n’est appliquée sans autorisation explicite après
  reset local, tests pgTAP, lint base et contrôles applicatifs.

## État du chantier

C10-A et C10-B sont terminés et validés localement.

- le seuil canonique, les décisions, les snapshots et l’historique passent par
  la base ;
- l’interface réelle charge ces sources et ne réutilise plus les arbitrages de
  démonstration ;
- Faustin peut soumettre un montant sur un dossier ouvert ;
- l’Administration peut approuver ou refuser avec un motif ;
- le dossier central affiche l’état financier réel ;
- les appels ambigus sont rejouables sans doublon grâce aux clés
  d’idempotence.

### Résultats techniques locaux

- reconstruction depuis zéro : réussie, **22 migrations** ;
- tests SQL : **14 fichiers, 40 tests**, tous réussis ;
- lint base `public` et `private` : aucune erreur ;
- test API local sous Auth/RLS : seuil inférieur, seuil exact, arbitrage,
  replay, refus agent et historique réussis ;
- contrôles Lot 0, Auth, personas, styles, anti-dossier-zombie, hors-ligne,
  résilience, lint et build : réussis ;
- responsive contrôlé à 1009 px et 375 px, sans débordement et avec actions
  tactiles de 44 px.

### Retour arrière envisagé

Avant toute donnée réelle, le retour arrière consiste à retirer les nouvelles
RPC et leurs droits, les déclencheurs C10, les trois définitions d’événement,
les colonnes C10 de `costs`, puis `business_parameters`. Après le début de la
recette métier, aucun effacement destructif n’est autorisé : une migration
compensatoire désactive les RPC, restaure les anciennes politiques et conserve
les décisions et l’historique en lecture pour audit.

### Prochaine porte de validation

La migration distante, la publication et C10-C restent suspendues. L’ordre
recommandé est : dry-run distant, revue du diff, autorisation explicite
d’application, publication de l’interface, puis recette humaine avec Faustin et
l’Administration.
