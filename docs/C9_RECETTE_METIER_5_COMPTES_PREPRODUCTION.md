# C9 — recette métier guidée des cinq comptes de préproduction

## Objectif

Faire valider, avec les cinq utilisateurs internes réels, les accès, les périmètres
et le cycle opérationnel déjà raccordé à `fm_track`, sans mélanger cette recette
avec le site public de validation des maquettes.

Cette recette ne valide que les fonctions réellement persistantes. Les écrans
encore démonstratifs sont signalés explicitement et ne peuvent pas recevoir un
feu vert métier définitif.

## État technique avant la recette humaine

Contrôlé le 31 août 2026 :

- cinq comptes Auth auto-confirmés et cinq profils métier reliés ;
- cinq connexions réelles réussies avec les identifiants temporaires ;
- les cinq profils restent verrouillés par `must_change_password` ;
- tant que le mot de passe n'est pas personnalisé, le rôle métier, les lectures
  RLS et les permissions sensibles restent neutralisés ;
- un compte de test temporaire a validé le changement obligatoire du mot de
  passe, le déverrouillage du profil et la restauration du rôle ;
- ce compte de test et son profil ont été supprimés ;
- état final : 5 utilisateurs Auth, 5 profils reliés, 5 profils verrouillés,
  0 profil déjà personnalisé et 0 fixture C9 résiduelle ;
- les journaux Auth confirment les connexions, la modification du compte de test
  et sa suppression sans erreur sur ce parcours.
- le fournisseur email est actif et l'auto-confirmation publique est désactivée,
  mais la création publique de nouveaux comptes est encore autorisée dans la
  configuration Auth distante. Elle doit être désactivée avant toute publication
  de l'URL de préproduction.

Aucun mot de passe réel n'a été changé par le Dev Lead. Chaque titulaire doit
choisir lui-même son nouveau mot de passe et ne jamais le communiquer.

## Canal d'accès obligatoire

L'URL `https://behira-fm-track-validation.espace-de-tr-9732.chatgpt.site/`
reste le miroir public de validation visuelle : elle n'a aucune variable Supabase
et ne doit pas recevoir les comptes ou données de préproduction.

La recette collective exige une URL de préproduction distincte, raccordée à
`fm_track` avec uniquement les variables publiques du navigateur :

- `NEXT_PUBLIC_USE_SUPABASE=true` ;
- `NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false` ;
- URL HTTPS de `fm_track` ;
- clé publique/publishable de `fm_track` ;
- aucune clé `service_role` dans le navigateur, le dépôt ou un message.

Avant la publication, la configuration Supabase Auth doit aussi refuser les
inscriptions publiques et autoriser uniquement les cinq comptes déjà créés. Le
fait qu'un compte sans profil n'obtienne aucun droit RLS ne remplace pas ce
durcissement : il évite l'accès aux données, mais pas la création inutile de
comptes Auth.

Jusqu'à cette publication distincte, les vérifications techniques peuvent être
rejouées depuis `http://localhost:3000/` sur le poste autorisé, mais cette adresse
n'est pas partageable avec les cinq utilisateurs.

## Périmètre réellement raccordé

| Fonction | État préproduction | Décision de recette |
|---|---|---|
| Connexion et changement obligatoire du mot de passe | Persistant | À faire par chaque titulaire |
| Résolution du profil, rôle et périmètre par RLS | Persistant | À valider pour les cinq comptes |
| Lecture du registre et du référentiel | Persistant | À valider par rôle |
| Ronde et constat terrain | Persistant avec file hors ligne idempotente | À valider avec les trois agents |
| Avancement du cycle du dossier | Persistant | À valider avec Faustin et les agents autorisés |
| Dépôt et contrôle d'une preuve | Persistant, stockage privé | À valider |
| Rapport d'intervention au nom d'un prestataire | Persistant pour Évariste et Sylvain uniquement | À valider |
| Continuité anti-dossier-zombie | Projection canonique persistante | À contrôler sur le dossier pilote |
| Décision financière de l'Administration | Interface encore démonstrative | Hors validation persistante C9 |
| Création/désactivation des utilisateurs | Interface encore démonstrative | Hors validation persistante C9 |
| Paramétrage du seuil de 400 000 FCFA | Affiché mais non raccordé à une source distante canonique | Hors validation persistante C9 |
| Scores bâtiment, équipements et agents | Présentation de maquette, formules non administrables | Hors validation persistante C9 |
| Notifications | Simulation | Hors validation C9 |

## Déroulé de la recette

### Séquence 1 — première connexion individuelle

À faire séparément avec Frédéric, Faustin, Évariste, Sylvain et Laetitia.

1. Le titulaire reçoit uniquement sa propre ligne du classeur protégé.
2. Il se connecte avec son mot de passe temporaire.
3. L'application doit imposer la création immédiate d'un mot de passe personnel.
4. Avant ce changement, aucun écran ou droit métier ne doit être accessible.
5. Le titulaire crée son nouveau mot de passe sans le montrer ni le dicter.
6. Après le changement, l'application ouvre exactement son espace et son périmètre.
7. Le titulaire se déconnecte puis se reconnecte avec son nouveau mot de passe.

Critère d'acceptation : les sept points réussissent pour les cinq personnes. Un
seul échec arrête la recette métier du compte concerné.

### Séquence 2 — constats terrain

Créer trois dossiers pilotes identifiables comme données de recette :

| Titulaire | Périmètre à utiliser | Contrôle attendu |
|---|---|---|
| Évariste | `GE-01` | Réaliser une ronde et transmettre un constat à Faustin |
| Sylvain | `WILO-01` | Réaliser la ronde Surpresseur et transmettre un écart |
| Laetitia | `RND-LET` | Saisir un constat de ronde cleaning/jardinage |

Pour chaque dossier, relever la référence créée, l'heure, l'équipement, la
priorité proposée et le nom de l'auteur. Vérifier qu'un rejeu réseau ne crée pas
de doublon.

### Séquence 3 — traitement par Faustin

Pour chacun des trois dossiers :

1. vérifier que Faustin voit le dossier dans sa file ;
2. ouvrir le dossier et contrôler la synthèse de continuité ;
3. avancer le dossier dans le cycle raccordé ;
4. contrôler l'échéance et la prochaine action provenant des données canoniques ;
5. vérifier que le dossier reste visible jusqu'à son traitement complet ;
6. signaler comme écart toute information affichée comme manquante au lieu de
   la compléter artificiellement pendant la recette.

La qualification nominative, l'arbitrage financier et les notifications ne sont
acceptés que dans la limite des actions réellement persistantes indiquées par
l'interface. Une confirmation visuelle de démonstration ne vaut pas validation.

### Séquence 4 — intervention et preuves

1. Évariste dépose un rapport d'intervention au nom d'un prestataire sur `GE-01`.
2. Sylvain dépose un rapport sur `WILO-01`.
3. Laetitia tente le même dépôt et doit être refusée.
4. Vérifier que les fichiers sont privés et rattachés au bon dossier.
5. Faustin contrôle et valide la preuve ou le rapport attendu.
6. Vérifier que le dépôt accepté apparaît distinctement de la preuve attendue.

### Séquence 5 — verrou critique

1. Créer ou utiliser un dossier pilote critique.
2. Avancer jusqu'à la clôture sans preuve acceptée : la base doit refuser.
3. Déposer une preuve conforme.
4. Faustin accepte la preuve.
5. Reprendre la clôture : elle doit réussir.
6. Vérifier l'historique, l'acteur, la date, l'étape et la dernière activité.

### Séquence 6 — Administration

Frédéric vérifie la lecture globale des dossiers, risques et continuité. Il ne
valide pas encore comme persistants les coûts, les décisions financières, les
scores ou la gestion des utilisateurs : ces blocs restent explicitement hors du
périmètre C9 jusqu'à leur raccordement canonique.

## Feuille de constat

Pour chaque contrôle, enregistrer seulement :

- date et heure ;
- profil ;
- référence du dossier ;
- action réalisée ;
- résultat `OK` ou `ÉCART` ;
- comportement attendu ;
- comportement observé ;
- capture sans mot de passe ni donnée sensible ;
- décision du responsable de recette.

Les nouveaux mots de passe, jetons, clés et fichiers privés ne doivent jamais
figurer dans la feuille de constat.

## Critères de sortie C9

C9 est accepté lorsque :

- les cinq premières connexions et reconnexions sont réussies ;
- chaque compte reçoit exactement son rôle et son périmètre ;
- les trois constats terrain persistent sans doublon ;
- Faustin traite les dossiers raccordés et contrôle les preuves ;
- Évariste et Sylvain peuvent déposer dans leur périmètre, Laetitia ne le peut pas ;
- le verrou critique sans preuve acceptée fonctionne ;
- aucun prestataire ne peut se connecter ;
- les inscriptions publiques Supabase Auth sont désactivées ;
- aucun écran démonstratif n'est présenté comme une fonction persistante validée ;
- les dossiers pilotes sont identifiés pour suppression ou conservation décidée
  à la fin de la séance.

## Arrêts immédiats

Arrêter la recette du profil concerné si :

- son rôle ou son périmètre est incorrect ;
- une donnée d'un autre périmètre est visible ;
- le changement obligatoire du mot de passe peut être contourné ;
- une preuve privée est publiquement accessible ;
- Laetitia ou l'Administration obtient le droit réservé de dépôt de rapport ;
- un prestataire peut se connecter ;
- une action sensible présentée comme enregistrée ne l'est pas réellement.

## Étape suivante après validation

Après C9, le lot suivant raccorde les fonctions encore démonstratives dans cet
ordre : décisions et coûts, administration des utilisateurs, seuil canonique,
puis formules et explications des scores. Les corrections de sécurité retenues
par les Advisors Supabase sont traitées avant le passage en production.
