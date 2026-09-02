# C11-Cœur — orchestration locale des scores équipement

Date : 3 septembre 2026
État : implémenté et vérifié localement — non raccordé à Supabase, non publié

## Finalité du lot

Ce lot permet d’avancer sans attendre les dernières données techniques WILO-01.
Il ne définit aucune formule métier interne et ne calcule aucun score réel. Il
fournit un orchestrateur déterministe qui accepte uniquement des composantes déjà
normalisées et confirmées par leurs futurs adaptateurs métier.

Les cinq poids existants restent inchangés : disponibilité 30 %, anomalies 25 %,
maintenance préventive 20 %, mesures dans les seuils 15 %, fiabilité/récidives
10 %.

## Garde-fous implémentés

- date d’évaluation explicitement fournie ; aucune utilisation de l’horloge courante ;
- source absente ou provisoire exclue du calcul canonique ;
- source confirmée sans référence vérifiable exclue du calcul canonique ;
- brouillon interne exclu même s’il est marqué confirmé par erreur ;
- donnée périmée exclue de la couverture, sans être assimilée à une panne ;
- couverture pondérée minimale locale de 80 % ;
- absence d’une donnée critique bloquant toujours le calcul ;
- poids manquant jamais redistribué sur les composantes restantes ;
- résultat partiel identifiable et non publiable ;
- politique provisoire locale incapable de produire un résultat publiable ;
- bornes locales testées : rouge 0–69, orange 70–89, vert 90–100.

La hiérarchie de provenance préparée est : procès-verbal de mise en service,
documentation constructeur, rapport signé du mainteneur, observation terrain
datée, puis brouillon interne. Une source interne provisoire ne devient pas
canonique par sa seule présence.

## État particulier de WILO-01

L’adaptateur pilote retourne obligatoirement :

> Score non calculable — données insuffisantes

Il expose les données manquantes sans créer de valeur : consigne de pression
confirmée sur le contrôleur, seuils approuvés, règles internes des composantes,
criticité confirmée, observations de disponibilité, maintenance préventive et
règle canonique de récidive.

La valeur `5,0 bar` trouvée dans les anciens rapports n’est pas utilisée : elle
provient d’un formulaire prérempli et n’est pas une consigne de mise en service
confirmée.

## Frontières du lot

- aucun raccordement à l’interface ou aux données réelles ;
- aucune migration nouvelle ou modification d’une migration existante ;
- aucune formule WILO, score bâtiment ou score agent ;
- aucune écriture, activation ou publication en préproduction ;
- aucune modification des rôles, RLS, statuts, seuil financier C10 ou droits.

Le prochain raccordement autorisé, après validation des données terrain, consiste
à créer les adaptateurs de composantes WILO-01 puis à comparer leur sortie avec la
porte de préparation Supabase déjà présente. Toute activation distante restera
soumise à un dry-run et à une autorisation séparée.
