# BEHIRA FM Track — Critères de validation UI

Cette checklist doit être complétée pour chaque lot d’interface.

## 1. Respect de la direction

- [ ] La structure suit les principes Ui/shadcn : surfaces sobres, hiérarchie claire, composants cohérents.
- [ ] La densité analytique suit les principes Dub : KPI, filtres, tableaux et micro-visualisations compacts et lisibles.
- [ ] L’identité BEHIRA existante est conservée.
- [ ] Aucun élément n’utilise Ventriloc comme référence principale.
- [ ] Aucun produit de référence n’est copié littéralement.

## 2. Cohérence du système

- [ ] Les couleurs passent par des tokens sémantiques existants ou documentés.
- [ ] Les espacements, rayons, bordures, ombres et tailles de contrôle sont cohérents.
- [ ] Les composants partagés sont réutilisés ; aucune variante isolée n’a été créée sans justification.
- [ ] Les icônes appartiennent à la même famille visuelle.
- [ ] L’action principale est identifiable.

## 3. Qualité métier

- [ ] Priorité, statut, site, équipement, responsable, échéance et SLA sont visibles là où ils sont nécessaires.
- [ ] Les statuts sont exprimés par un libellé en plus de la couleur.
- [ ] Les filtres correspondent aux besoins réels de l’écran.
- [ ] Les tableaux permettent de comparer et d’agir rapidement.
- [ ] La prochaine action attendue est compréhensible selon le rôle et le statut.
- [ ] Les termes employés correspondent au vocabulaire BEHIRA validé.

## 4. États et cas limites

- [ ] Chargement.
- [ ] Erreur.
- [ ] Liste vide.
- [ ] Aucun résultat après filtrage.
- [ ] Données incomplètes.
- [ ] Texte long.
- [ ] Grand volume de lignes.
- [ ] Action interdite ou permission insuffisante.
- [ ] Succès et retour utilisateur après action.

## 5. Responsive

- [ ] Desktop vérifié.
- [ ] Tablette vérifiée.
- [ ] Mobile vérifié.
- [ ] Aucun contenu critique n’est masqué ou tronqué.
- [ ] Les tableaux ont un comportement mobile intentionnel.
- [ ] Les zones tactiles restent utilisables.

## 6. Accessibilité

- [ ] Contraste suffisant pour texte, icônes, badges et contrôles.
- [ ] Focus clavier visible.
- [ ] Ordre de tabulation logique.
- [ ] Libellés explicites pour les champs et boutons.
- [ ] Aucune information critique transmise uniquement par couleur.
- [ ] Les modales, menus et panneaux sont utilisables au clavier.

## 7. Non-régression

- [ ] La logique métier n’a pas été modifiée par accident.
- [ ] Les rôles et permissions sont inchangés sauf demande explicite.
- [ ] Les routes, API et formats de données sont compatibles.
- [ ] Les tests existants passent.
- [ ] Aucun avertissement ou erreur de console nouveau n’a été introduit.
- [ ] Les changements et décisions sont documentés.

## Compte rendu attendu

Pour chaque lot, l’agent doit fournir :

1. écrans et composants modifiés ;
2. décisions de design prises ;
3. éléments BEHIRA conservés ;
4. captures desktop et mobile ;
5. contrôles effectués ;
6. limites ou questions encore ouvertes.
