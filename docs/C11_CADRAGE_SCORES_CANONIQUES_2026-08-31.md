# C11 — cadrage des scores canoniques

Date : 31 août 2026  
État : audit de préparation terminé — aucune migration, formule ou écriture distante

## Objectif

C11 doit remplacer les valeurs de présentation par des scores reproductibles,
explicables, datés et historisés. Un score incomplet ne doit jamais être présenté
comme un bon score. La valeur, sa période, sa fraîcheur, sa complétude, la version
de formule et les facteurs de variation doivent rester consultables ensemble.

## État réellement observé

- sept équipements MVP possèdent un `health_score`, mais ces valeurs viennent du
  référentiel Excel initial et ne sont pas recalculées par les rondes ;
- le score bâtiment `82/100` est encore une valeur d’interface ;
- les trois scores agents sont des valeurs de démonstration ;
- la préproduction contient six rondes soumises et trente-quatre contrôles ;
- seuls deux équipements sur sept sont couverts par une ronde : WILO-01 (cinq)
  et GE-01 (une) ;
- le corpus opérationnel comprend quatre anomalies ouvertes, deux clôturées,
  deux ordres de travail terminés, deux interventions terminées, deux preuves
  acceptées et une preuve refusée.

Ces volumes permettent de tester un moteur, mais pas encore de publier un score
fiable sur l’ensemble du bâtiment ni de comparer équitablement les agents.

## Formules déjà validées

### Équipement

| Composante | Poids | Disponibilité actuelle |
|---|---:|---|
| Disponibilité et continuité | 30 % | Partielle : incidents et rétablissements existent, mais aucun temps de disponibilité canonique |
| Anomalies ouvertes pondérées | 25 % | Exploitable : priorité, statut, équipement et échéances existent |
| Maintenance préventive dans les délais | 20 % | Absente : aucun plan et aucune occurrence préventive canonique |
| Mesures et contrôles dans les seuils | 15 % | Partielle : `report_checks` et seuils existent, mais seulement deux équipements sont couverts |
| Fiabilité et récidives | 10 % | Partielle : anomalies et historique existent, mais la récidive doit être définie sans rapprochement arbitraire |

### Bâtiment

- santé technique des équipements : 70 % ;
- sécurité et conformité : 15 % ;
- état général des zones : 10 % ;
- continuité des services : 5 % ;
- coefficients équipements : vital 5, important 3, confort 1 ;
- plafond à 50/100 si un équipement vital de sécurité est indisponible.

La composante technique ne peut pas encore être calculée honnêtement : la classe
vital/important/confort n’est pas enregistrée. Les trois autres composantes ne
possèdent pas encore de sources canoniques complètes.

### Agent

Les quatre critères confirmés sont le respect des délais, la rapidité de prise
en charge, la qualité des preuves et les dossiers rouverts. La difficulté et le
contexte doivent expliquer et corriger les écarts de comparaison.

Le calcul reste suspendu : pondérations non calibrées, réouverture non définie
de façon canonique, échantillon trop faible et gouvernance RH/juridique non
confirmée. Aucun score agent ne doit entraîner une sanction automatique.

## Règle de complétude proposée

Chaque composante reçoit séparément un état : `calculable`, `partielle` ou
`absente`. Un poids manquant n’est jamais redistribué sur les autres composantes.
Tant que la couverture minimale validée n’est pas atteinte, l’interface affiche
« Score non calculable — données insuffisantes » avec le détail des données
manquantes. Cette règle évite qu’un équipement sans maintenance préventive
enregistrée obtienne artificiellement un bon score.

## Modèle cible minimal à valider avant migration

1. versionner les formules, pondérations, seuils de couleur et dates d’effet ;
2. enregistrer la criticité `vital`, `important` ou `confort` de chaque équipement ;
3. enregistrer les instantanés de score et leurs composantes, avec période,
   fraîcheur, complétude, causes positives/négatives et version de formule ;
4. créer les sources absentes : plans/occurrences de maintenance préventive,
   événements de disponibilité, contrôles conformité, évaluations de zones et
   continuité des services ;
5. dériver les tableaux de bord exclusivement des instantanés publiés ;
6. conserver les valeurs du référentiel initial comme référence historique,
   jamais comme résultat du moteur.

Toute future table exposée devra activer RLS. Les agents liront uniquement les
scores équipements de leur périmètre ; Facility Manager et Administration
liront les scores techniques globaux. Les scores agents resteront hors lot tant
que leur gouvernance n’est pas validée.

## Découpage de livraison

### C11-A — transparence et dictionnaire

- signaler explicitement les valeurs initiales ou de démonstration ;
- figer les définitions, seuils, fraîcheur et règle de complétude ;
- classifier les sept équipements MVP avec Administration et Facility Manager.

### C11-B — pilote équipement WILO-01

- versionner la formule ;
- raccorder anomalies et contrôles de ronde ;
- ajouter les sources de disponibilité et de maintenance préventive ;
- produire un instantané explicable ou un état « non calculable » ;
- tester historique, RLS, idempotence et retour arrière.

État technique au 31 août 2026 : la fondation locale est créée. La formule v1
et ses cinq poids sont versionnés en `draft`, WILO-01 est enregistré comme
pilote sans criticité inventée, les sources de disponibilité et de maintenance
préventive sont structurées, et les instantanés futurs sont immuables. Le garde
de préparation renvoie actuellement « Score non calculable — données
insuffisantes » avec les décisions et données absentes. Aucune formule n’est
active et aucune migration C11 n’est appliquée à la préproduction.

### C11-C — extension équipements et score bâtiment

- étendre après couverture suffisante des sept équipements ;
- raccorder sécurité, zones et continuité ;
- appliquer les coefficients et le plafond vital ;
- publier le score bâtiment avec facteurs et fraîcheur.

### C11-D — score agent, lot conditionnel

- ouvrir uniquement après validation métier, RH et juridique ;
- calibrer les pondérations sur un échantillon pilote suffisant ;
- tester biais, comparabilité, confidentialité et absence de décision automatique.

## Décisions requises avant activation du pilote C11-B

1. classification des sept équipements en vital, important ou confort ;
2. seuils vert/orange/rouge ;
3. durée maximale sans contrôle avant qu’une donnée devienne périmée ;
4. couverture minimale autorisant l’affichage d’un score ;
5. définition métier d’une indisponibilité et d’une récidive ;
6. responsables des contrôles sécurité, zones et continuité ;
7. confirmation que le score agent reste suspendu jusqu’à la gouvernance dédiée.
8. règle exacte de calcul de chaque composante : pénalités par priorité,
   notation des contrôles, traitement d’une absence de plan préventif et
   normalisation des récidives. Les poids seuls ne suffisent pas à produire un
   résultat reproductible.

## Prochaine porte

Faire valider ces huit décisions par l’Administration de SCI Groupe Behira et
Facility Manager. Ensuite seulement, compléter puis activer le pilote C11-B en
local, avec tests pgTAP/RLS, dry-run et autorisations distantes séparées.
