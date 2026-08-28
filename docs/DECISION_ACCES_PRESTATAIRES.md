# Décision métier — accès prestataires

Décision appliquée le 26 août 2026 : les prestataires n’ont aucun compte et
aucun accès direct à BEHIRA FM / GB TRACK. Les entreprises restent dans le
référentiel `vendors` pour l’affectation des ordres de travail, des
interventions, des coûts et des rapports.

## Dépôt interne d’un rapport d’entreprise

Un dépôt au nom d’une entreprise exige simultanément :

1. un profil interne actif avec le rôle `field_agent` ;
2. une attribution active `upload_vendor_intervention_report` dans
   `profile_permissions` ;
3. une anomalie située dans le périmètre équipement/zone de l’agent ;
4. un fichier privé dont le chemin commence par l’utilisateur Auth puis l’UUID
   de l’anomalie ;
5. une validation de Faustin avant transformation en preuve acceptée.

La matrice nominative validée attribue la permission à :

- Évariste DJE, pour GE-01 uniquement ;
- Sylvain DOUANE, pour WILO-01, RIA-01 et IRR-01 uniquement.

Laetitia ATTOH, Frédéric AMANY et Faustin SIAPO n’ont pas cette permission.
Faustin reste le seul validateur des rapports déposés.

## Utilisateurs en attente de décision

- Kimberley BAKARE / frontdesk : non créée et non invitée. Son rôle, son
  périmètre et le libellé historique « contact prestataire » restent à clarifier.
- Lecture seule : aucun profil ou compte précréé ; le rôle générique
  `read_only` reste disponible pour un futur utilisateur nommé.
- Agents autorisés au dépôt : Évariste et Sylvain uniquement, avec contrôle du
  périmètre équipement/zone par RLS et Storage.
