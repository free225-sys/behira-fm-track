# Revue visuelle corrective — BEHIRA FM / GB TRACK

Date : 28 août 2026  
Périmètre : frontend local uniquement  
Publication : non effectuée

## Irrégularités constatées

1. Le tableau de bord affichait simultanément les cinq blocs de pilotage, tous les scores détaillés et une seconde vue du parc technique. La page dépassait 1 900 px de hauteur à 1440 px et répétait plusieurs informations.
2. Les niveaux de lecture étaient trop proches : beaucoup de cartes blanches de même poids visuel rendaient la priorité difficile à percevoir.
3. Les contrôles `Tous / À surveiller` et `7 / 30 / 90 jours` ressemblaient à de petits boutons secondaires et ne structuraient pas clairement le tableau de bord.
4. Dans le registre, le lien de continuité occupait une bande complète sous chaque anomalie, ce qui doublait visuellement les lignes.
5. Le cockpit Facility Manager portait un libellé « Pilotage Administration », incohérent avec le rôle connecté.
6. Les valeurs `92 %` et `82/100` pouvaient sembler contradictoires, faute de qualification explicite de la disponibilité et du score de santé.
7. Sur mobile, le titre « Tableau de bord » était tronqué et les onglets occupaient trop de hauteur.

## Corrections réalisées

- Création de quatre vues de dashboard : **Vue d’ensemble**, **Actions & risques**, **Santé & scores** et **Parc technique**.
- Conservation des cinq angles de décision dans la vue d’ensemble, sans afficher simultanément les analyses détaillées.
- Navigation d’onglets avec état actif textuel, repère numéroté et résumé métier ; défilement horizontal avec aperçu de l’onglet suivant sur mobile.
- Séparation claire des contenus : actions, santé et équipements ne se répètent plus sur la même page.
- Libellé Facility Manager corrigé en « Pilotage Facility Manager ».
- Indicateur `92 %` renommé « Disponibilité technique 92 % » ; le score bâtiment reste `82/100` dans sa vue dédiée.
- Titre mobile raccourci en « Pilotage ».
- Lien de continuité du registre compacté sur ordinateur et conservé en pleine largeur sur mobile.
- Contrôles de période et de filtre renforcés avec un état actif bleu nuit lisible.

## Vérifications réalisées

- Relecture de la vidéo fournie sur l’ensemble du parcours visible.
- Contrôle interactif à 1440 × 1000, 768 × 900 et 390 × 844.
- Aucun débordement horizontal global aux trois largeurs.
- Focus clavier visible à 2 px.
- Console navigateur sans erreur.
- Lint et compilation de production réussis.
- Vérifications personas, authentification, AntiZombieSummary et audit des bordures réussies.

## Captures

- `outputs/design/BEHIRA_revue_corrective_dashboard_overview_desktop.png`
- `outputs/design/BEHIRA_revue_corrective_dashboard_health_desktop.png`
- `outputs/design/BEHIRA_revue_corrective_dashboard_equipment_desktop.png`
- `outputs/design/BEHIRA_revue_corrective_dashboard_overview_mobile.png`
- `outputs/design/BEHIRA_revue_corrective_dashboard_health_mobile.png`
- `outputs/design/BEHIRA_revue_corrective_dashboard_tablet.png`
- `outputs/design/BEHIRA_revue_corrective_registry_desktop.png`
- `outputs/design/BEHIRA_revue_corrective_registry_mobile.png`

## Limites du lot

- Aucun calcul métier, droit, règle RLS, migration Supabase ou donnée n’a été modifié.
- Aucun nouvel indicateur n’a été inventé.
- La version publique n’a pas été mise à jour ; la correction reste locale jusqu’à validation.
