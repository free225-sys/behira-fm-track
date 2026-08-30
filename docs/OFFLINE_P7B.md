# P7B — persistance terrain hors ligne

## Objectif

Permettre aux agents internes authentifiés de poursuivre une ronde sans réseau,
de conserver leur brouillon sur l’appareil et de transmettre ensuite la ronde ou
une preuve sans création en double. Ce lot ne change ni les rôles, ni les
statuts, ni le verrou critique, ni le seuil de décision de 350 000 FCFA.

## Périmètre livré

- rondes techniques `GE-01` ;
- rondes cleaning et jardinage `RND-LET` ;
- ronde pilote `WILO-01` ;
- preuve privée rattachée à une anomalie Supabase déjà canonique ;
- reprise automatique au retour du réseau ;
- reprise d’une synchronisation interrompue ;
- état visible : en attente, en cours, synchronisé, en échec ou en conflit.

Les actions de traitement affichées dans l’espace Agent ne sont pas placées dans
la file P7B : les identifiants `ACT-*` de la maquette ne sont pas reliés de façon
canonique à une anomalie Supabase. Les synchroniser maintenant inventerait une
relation métier et risquerait d’appliquer une action au mauvais dossier.

## Modèle local

La base IndexedDB `behira-field-offline-v1` contient deux magasins :

| Magasin | Clé | Contenu |
|---|---|---|
| `drafts` | `user_id:round_id` | Brouillon courant d’une ronde |
| `sync-queue` | UUID de mutation | Commande immuable, état, tentatives, erreur et résultat serveur |

Chaque élément appartient à l’utilisateur Supabase connecté. Le moteur vérifie
également que l’utilisateur Auth courant correspond au propriétaire de la file
avant tout envoi. Les éléments synchronisés restent 24 heures pour explicabilité,
puis sont nettoyés automatiquement.

Les données locales ne sont pas chiffrées par l’application. Le poste ou la
tablette doit donc être protégé par le chiffrement et le verrouillage du système.
Une politique de terminal géré reste nécessaire avant généralisation.

## Idempotence Supabase

La migration `20260829234552_offline_field_sync_idempotency.sql` ajoute :

- `client_mutation_id` et `client_payload_hash` sur `reports` et `proofs` ;
- une unicité partielle par acteur et mutation ;
- `submit_field_round_offline`, exécutée sous les RLS de l’appelant ;
- `register_anomaly_proof_offline`, durcie pour contrôler le rôle, le périmètre,
  le propriétaire Storage, le chemin, le MIME et la taille.

Une nouvelle tentative avec le même identifiant et le même contenu renvoie le
résultat d’origine avec `replayed: true`. Le même identifiant avec un autre
contenu produit un conflit ; aucune valeur n’est écrasée.

La preuve utilise un chemin Storage déterministe :

```text
<anomaly_uuid>/<client_mutation_uuid>-<nom-nettoyé>
```

Une réponse réseau perdue après l’upload ne provoque donc pas un second fichier.

## Reprise et erreurs

- cinq tentatives automatiques maximum ;
- délai progressif de 2 secondes à 5 minutes ;
- un état `syncing` interrompu depuis plus d’une minute repasse en attente ;
- les erreurs réseau sont différées ;
- les refus métier ou RLS passent en échec visible ;
- les réutilisations incompatibles d’un identifiant passent en conflit, sans
  correction automatique.

Un conflit nécessite pour ce lot une analyse support. La suppression ou la
duplication automatique d’une commande conflictuelle est volontairement exclue.

## Sécurité

- aucune clé serveur dans le navigateur ;
- aucune exécution accordée à `anon` ;
- contrôle du rôle et du périmètre de l’équipement ;
- preuve uniquement sur un objet privé appartenant à l’utilisateur Auth ;
- fermeture critique toujours soumise à une preuve acceptée ;
- arbitrages financiers, validation des preuves et clôture restent en ligne.

## Recette

La suite `006_offline_sync.sql` couvre :

1. première ronde et création atomique du rapport, des contrôles et du constat ;
2. répétition idempotente ;
3. conflit de contenu ;
4. refus hors périmètre ;
5. preuve privée et répétition idempotente ;
6. refus Lecture seule.

Le contrôle frontend `scripts/verify-offline-sync.mjs` vérifie les 17 garde-fous
structurels. La base locale a été reconstruite depuis zéro et les six suites
pgTAP passent, y compris `006_offline_sync.sql`. Le lint du schéma `public`, les
cinq comptes Auth locaux, leurs périmètres RLS, le workflow persistant et le
verrou critique avec preuve privée sont également validés. L'application sur la
préproduction reste soumise à une autorisation explicite distincte.

## Retour arrière prévu

Avant activation en production, le retour arrière consiste à :

1. désactiver l’usage des deux nouvelles RPC dans le frontend ;
2. conserver les colonnes idempotentes, sans impact sur les anciens appels ;
3. révoquer les droits d’exécution des deux RPC si nécessaire ;
4. ne supprimer colonnes et index qu’après vérification qu’aucune file terrain
   n’est encore en attente.

Supprimer immédiatement les colonnes casserait la reprise des appareils encore
hors ligne ; cette opération n’est donc jamais automatique.
