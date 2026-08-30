# C8 — recette canonique et préparation du dry-run préproduction

> **Clôture du 31 août 2026.** Les autorisations de dry-run puis d’application
> ont été reçues. Les huit migrations prévues et la migration compensatoire
> `20260830233549_restore_canonical_action_stage_mappings.sql` sont appliquées
> sur `fm_track`. Les sections d’état initial ci-dessous restent la trace du plan
> contrôlé qui a précédé l’application.

## Décision de lot

C8 qualifie le socle C1 à C7 avant toute écriture distante. Il ajoute une recette
transactionnelle et un mode opératoire vérifiable. Il ne crée ni migration, ni
règle métier, ni donnée persistante, ni changement d’interface.

La recette `013_anti_zombie_c8_end_to_end.sql` construit un dossier critique
représentatif, le fait traverser le cycle métier, contrôle la projection canonique
et les périmètres RLS, puis annule intégralement la transaction. Le contrôle local
post-exécution doit rester à zéro anomalie, zéro rapport et zéro utilisateur C8.

## Couverture de la recette locale

| Contrat | Preuve C8 |
|---|---|
| C1 — référence et historique | Références serveur, création et événements métier reliés au dossier |
| C2 — échéance canonique | Échéance Qualification réellement dépassée, puis échéance Intervention issue du changement d’étape |
| C3 — prochaine action | `QUALIFY_ASSIGN` → `PERFORM_DIAGNOSIS` → `CHOOSE_TREATMENT_BRANCH`, version et rejeu idempotent |
| C4 — blocage et retard | Blocage externe, justification du retard, proposition puis confirmation de résolution ; le blocage prime dans la synthèse |
| C5 — preuve attendue | Règle critique appliquée, renforcement photo par Faustin, dépôt distinct, rattachement et satisfaction |
| C6 — projection | Les huit informations proviennent d’une seule ligne de `anti_zombie_summary_v` |
| C7 — raccordement | L’adaptateur et le résolveur partagés sont rejoués par `verify:anti-zombie` |
| RLS | Administration et agent responsable autorisés ; agent hors périmètre et première connexion verrouillée refusés |
| Cycle | Qualification, intervention, attente de preuve, verrou critique et clôture finale |
| Nettoyage | `ROLLBACK` obligatoire ; aucune fixture C8 conservée |

Commande de qualification locale complète :

```powershell
pnpm test:c8:local
```

Cette commande reconstruit la base locale, rejoue les treize suites pgTAP,
réinstalle uniquement les comptes Auth locaux, vérifie le contrat C7, le cycle
avec Storage privé et les périmètres des comptes internes.

## État distant observé en lecture seule

Instantané contrôlé le 31 août 2026 avec la connexion Supabase déjà autorisée :

- projet : `fm_track` ;
- région : `eu-west-1` ;
- état : actif et sain ;
- migrations distantes enregistrées : 12 ;
- dernière migration distante : `require_first_password_change` ;
- aucune migration et aucune donnée n’ont été écrites pendant C8.

Le dépôt local contient 20 migrations. Les huit migrations suivantes sont donc
à présenter dans le dry-run, dans cet ordre exact :

1. `20260829234552_offline_field_sync_idempotency.sql` ;
2. `20260830040839_anti_zombie_c1_references_history_guardrails.sql` ;
3. `20260830121913_confirm_qualification_action_sequence.sql` ;
4. `20260830123210_anti_zombie_c2_canonical_deadlines.sql` ;
5. `20260830195601_anti_zombie_c3_canonical_actions.sql` ;
6. `20260830202034_anti_zombie_c4_blocks_delays.sql` ;
7. `20260830204742_anti_zombie_c5_proof_requirements.sql` ;
8. `20260830212342_anti_zombie_c6_canonical_projection.sql`.

Cet inventaire est un constat de lecture, pas une autorisation d’application.

## Porte d’entrée du futur dry-run

Le dry-run doit être lancé depuis le workflow manuel
`.github/workflows/supabase-preproduction.yml`, dans l’environnement protégé
`preproduction`, avec `apply_migrations = false`. Les secrets restent dans
l’environnement GitHub ; ils ne sont ni copiés dans le dépôt, ni affichés dans
un message, ni passés au frontend.

Ordre obligatoire :

1. figer le SHA candidat et vérifier un arbre Git propre ;
2. exécuter `pnpm test:c8:local`, le lint, le build et le préflight ;
3. vérifier que le projet ciblé est exactement `fm_track`, en `eu-west-1` ;
4. lier temporairement le job avec l’identifiant stocké dans les secrets ;
5. exécuter `supabase migration list --linked` ;
6. exécuter `supabase db push --linked --dry-run --skip-vault` ;
7. comparer la sortie à la liste ordonnée des huit migrations ci-dessus ;
8. archiver la sortie expurgée du dry-run avec le SHA candidat ;
9. arrêter le workflow sans application.

Commandes interdites dans ce lot :

- `supabase db push` sans `--dry-run` ;
- `supabase db reset --linked` ;
- `supabase migration repair` ;
- `--include-seed` ou import de fixtures ;
- toute clé `service_role` dans le navigateur ou le dépôt ;
- toute application via un poste dont l’identité du projet n’est pas prouvée.

## Critères d’arrêt

Le dry-run est refusé si un seul de ces cas apparaît :

- projet, organisation ou région différents de la cible validée ;
- migration distante inconnue ou migration locale déjà marquée différemment ;
- ordre différent des huit fichiers attendus ;
- opération destructive non prévue, objet hors schémas attendus ou modification Auth non documentée ;
- fixture, seed ou donnée nominative dans le plan ;
- échec d’un test local, du lint de base, du contrôle RLS ou du verrou critique ;
- secret, mot de passe ou jeton visible dans la sortie ;
- absence de sauvegarde/restauration validée avant l’application future.

## Retour arrière envisagé

C8 ne nécessite aucun retour arrière : le test local se termine par `ROLLBACK` et
le dry-run n’écrit rien. Lors du futur lot d’application, les migrations restent
progressives. En cas d’écart avant application, on arrête sans modifier la base.
Après application, toute correction devra être une nouvelle migration compensatoire
versionnée et testée ; aucune réécriture d’une migration déjà appliquée ni remise à
zéro de la préproduction partagée n’est autorisée.

## Validation et clôture exécutées

Les validations séparées du dry-run et de l’application ont été reçues. Après
alignement contrôlé de l’historique distant, les huit migrations C1 à C6 ont été
appliquées sans seed, rôle ni secret. La recette distante a alors détecté que les
29 correspondances entre codes de prochaine action et étapes du workflow étaient
restées uniquement dans `seed.sql`.

Le correctif est une migration progressive et idempotente : il reprend exactement
les six étapes et les 29 correspondances déjà validées, sans créer de statut, droit,
seuil ou règle métier. Le contrôle `test:migration-data:local` reconstruit désormais
la base sans seed, vérifie ces références, puis restaure automatiquement la base
locale avec le seed contrôlé.

Résultat final sur `fm_track` :

- 21 migrations locales et distantes alignées ;
- 6/6 étapes et 29/29 correspondances, aucune manquante ou inattendue ;
- recette C8 distante réussie dans une transaction terminée par `ROLLBACK` ;
- 46/46 tables publiques sous RLS et vue canonique en `security_invoker` ;
- zéro anomalie, action, blocage, retard, échéance, exigence de preuve, preuve,
  intervention, rapport ou utilisateur C8 résiduel.

Deux sauvegardes logiques protégées existent avant application initiale et avant
la migration compensatoire. La restauration de la première a été validée dans une
base PostgreSQL jetable. Aucun secret n’a été écrit dans le dépôt ou les rapports.
