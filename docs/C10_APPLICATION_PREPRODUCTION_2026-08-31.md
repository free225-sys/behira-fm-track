# C10 — application de la migration en préproduction

## Autorisation et cible

- autorisation explicite : `GO application C10` ;
- projet : `fm_track` (`polmebcfablztzojgwoo`) ;
- région : Europe Ouest, Irlande ;
- migration : `20260831143754_c10_financial_decisions.sql` ;
- SHA-256 contrôlé : `90E2DBEB5F2685961F0F7EA6D1069C459F9FF0943CEB3C16D5BA9BDDCE453E67` ;
- commande : `supabase db push --linked --skip-vault --yes` ;
- seeds : aucun ;
- rôles : aucun ;
- coffre de secrets : exclu.

## Résultat de l'application

La migration unique `20260831143754` a été appliquée et enregistrée dans
`supabase_migrations.schema_migrations`. Une nouvelle simulation après
l'application retourne `upToDate: true`, sans migration, seed ou rôle restant.

## Vérifications distantes en lecture seule

- table `business_parameters` présente ;
- une seule valeur active pour `financial_decision_threshold` ;
- seuil canonique : **400 000 FCFA** ;
- RLS active sur `business_parameters` et `costs` ;
- trois événements C10 présents ;
- aucun coût C10 créé pendant l'application ;
- cinq comptes Auth conservés ;
- `anon` ne peut ni lire le paramètre ni exécuter les RPC C10 ;
- `authenticated` peut lire le paramètre sous RLS et appeler les deux RPC métier ;
- la fonction de déclencheur `prepare_cost_decision` reste non exécutable par
  `authenticated`.

## Advisors Supabase

Les advisors ne remontent aucune erreur et aucun avertissement associé aux
objets C10.

Les avertissements hérités restent inchangés :

- 30 fonctions `SECURITY DEFINER` métier exposées aux utilisateurs authentifiés ;
- protection contre les mots de passe compromis non activée ;
- 16 groupes de politiques RLS permissives multiples à optimiser.

Ces éléments sont antérieurs à C10 et ne sont pas modifiés dans ce lot. Ils
doivent être traités dans un chantier de durcissement distinct, sans bloquer la
présente migration additive.

## Porte suivante

Le backend C10 est prêt en préproduction. L'interface C10 n'est pas encore
publiée. Sa publication nécessite une autorisation distincte, suivie d'une
recette humaine avec Facility Manager et Administration sur un dossier sous le
seuil puis un dossier au seuil exact.
