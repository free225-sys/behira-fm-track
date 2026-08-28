# Authentification frontend et mode démonstration

Le frontend sait désormais utiliser Supabase Auth lorsque
`NEXT_PUBLIC_USE_SUPABASE=true`. Le projet local cible `fm_track`, tandis que
les personas fictifs restent disponibles dans un mode démonstration clairement
séparé et sans écriture distante.

## Parcours disponibles

- Connexion avec comptes fictifs en domaine réservé `.invalid`.
- Mot de passe oublié avec confirmation d’envoi simulée.
- Première connexion à partir d’une invitation fictive et contrôle de robustesse.
- Conservation de session dans `localStorage` lorsque « Se souvenir de moi » est coché, sinon dans `sessionStorage`.
- Déconnexion et remise à zéro complète de la démonstration.
- Redirection et visibilité frontend selon le persona sélectionné.
- Connexion Supabase par email/mot de passe pour les cinq comptes internes confirmés.
- Première connexion réelle limitée à l’écran de changement obligatoire du mot
  de passe, sans accès aux vues métier avant confirmation par la base.
- Résolution de l’espace depuis le profil et les rôles protégés par RLS, jamais
  depuis les métadonnées modifiables de l’utilisateur.

Le sélecteur de persona est volontairement conservé pour les présentations
client. Il est identifié par le libellé « Mode démonstration » et ne constitue
pas un mécanisme d’authentification. En production,
`NEXT_PUBLIC_ALLOW_DEMO_FALLBACK=false` le désactive.

## Comptes fictifs

Tous utilisent le mot de passe `Behira-Demo-2026!` :

- `direction@demo.behira.invalid` — Frédéric / Direction.
- `facility.manager@demo.behira.invalid` — Faustin / Facility Manager.
- `electricite@demo.behira.invalid` — Évariste / Agent électricité.
- `eau.incendie@demo.behira.invalid` — Sylvain / Agent eau-incendie.
- `rondes@demo.behira.invalid` — Laetitia / Rondes et constats.

Ces adresses sont volontairement non distribuables et ne correspondent à aucune personne réelle.

Les prestataires n’ont aucun compte, aucune connexion et aucun persona. Les
entreprises restent visibles comme références métier. Le script Auth local ne
crée que les cinq comptes internes confirmés. Aucun profil ou compte Lecture
seule n’est précréé ; seul le rôle générique `read_only` reste dans le modèle.

## Sécurité réelle

Supabase Auth porte l’identité et les politiques Row Level Security garantissent
les autorisations métier. La clé publique peut être utilisée dans le navigateur ;
aucune clé secrète ou `service_role` n’est référencée par le frontend. Le
frontend adapte l’interface au rôle résolu, mais la base reste l’autorité pour
toute lecture ou écriture.

Le champ `must_change_password` neutralise `current_profile_id()` et donc tous
les rôles, périmètres et permissions métier. Après `auth.updateUser`, le trigger
sur `auth.users.encrypted_password` enregistre `password_changed_at` et retire le
verrou. L’interface vérifie ensuite cet état serveur avant d’ouvrir l’espace du rôle.

Le droit `upload_vendor_intervention_report` est une autorisation nominative
distincte du rôle Agent terrain. La matrice validée l’attribue à Évariste pour
GE-01 et à Sylvain pour WILO-01, RIA-01 et IRR-01. Laetitia, Frédéric et
Faustin ne la reçoivent pas. Faustin doit contrôler chaque dépôt avant qu’il
devienne une preuve acceptée.
