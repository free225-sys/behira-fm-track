'use client';

import { Badge, Button, Card } from './ui';
import { ErrorNotificationRules } from './NotificationCenter';

export type ParameterWorkspaceData = {
  code:'financial_decision_threshold';
  label:string;
  value:number;
  unit:'FCFA';
  scope:string;
  effectiveDate:string;
  authority:string;
};

const unavailableFamilies = [
  { label:'Délais SLA par priorité', state:'Source non chargée', detail:'Les échéances existent dans les dossiers, mais la règle complète et son historique ne sont pas disponibles ici.' },
  { label:'Seuils techniques des équipements', state:'Raccordement requis', detail:'Des repères existent dans certaines rondes ; aucune liste canonique complète n’est exposée dans le miroir.' },
  { label:'Méthodes de calcul des scores', state:'Méthode à valider', detail:'Les scores de démonstration restent séparés des paramètres métier tant que leur formule n’est pas approuvée et historisée.' },
];

function formatMoney(value:number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function ParametersWorkspace({ parameter, onOpenCosts }: {
  parameter:ParameterWorkspaceData;
  onOpenCosts:()=>void;
}) {
  return <section className="parameters-workspace" aria-labelledby="parameters-workspace-title">
    <header className="parameters-workspace-hero">
      <div>
        <p className="design-kicker">ADMINISTRATION</p>
        <h2 id="parameters-workspace-title" className="visually-hidden">Seuils et paramètres</h2>
        <p>Consultez les règles actuellement justifiables. Une valeur sans source, historique ou autorité explicite n’est jamais présentée comme un paramètre actif.</p>
      </div>
      <Badge tone="neutral">LECTURE SEULE</Badge>
    </header>

    <section className="parameters-summary" aria-label="Synthèse des paramètres disponibles">
      <Card className="parameters-summary-card"><span>PARAMÈTRE CONFIRMÉ</span><strong>1</strong><small>Seuil de décision financière</small></Card>
      <Card className="parameters-summary-card"><span>MODIFIABLE ICI</span><strong>0</strong><small>Aucune édition silencieuse</small></Card>
      <Card className="parameters-summary-card"><span>FAMILLES À RACCORDER</span><strong>{unavailableFamilies.length}</strong><small>SLA, technique et scores</small></Card>
      <Card className="parameters-summary-card is-insufficient"><span>HISTORIQUE PERSISTANT</span><strong>Indisponible</strong><small>Ancienne valeur et auteur non raccordés</small></Card>
    </section>

    <div className="parameters-layout">
      <div className="parameters-stack">
      <Card as="section" className="parameter-detail-card">
        <div className="parameter-detail-head">
          <div><p className="design-kicker">RÈGLE FINANCIÈRE</p><h3>{parameter.label}</h3><p>Valeur métier confirmée pour répartir la décision entre Facility Manager et Administration.</p></div>
          <Badge tone="orange">CONFIRMÉ · À RACCORDER</Badge>
        </div>

        <div className="parameter-value-panel">
          <span>VALEUR DE RÉFÉRENCE</span>
          <strong>{formatMoney(parameter.value)} <small>{parameter.unit}</small></strong>
          <p>En dessous : délégation Facility Manager. À partir de cette valeur : arbitrage Administration.</p>
        </div>

        <dl className="parameter-facts">
          <div><dt>Code fonctionnel</dt><dd>{parameter.code}</dd></div>
          <div><dt>Portée</dt><dd>{parameter.scope}</dd></div>
          <div><dt>Date d’effet</dt><dd>{parameter.effectiveDate}</dd></div>
          <div><dt>Autorité métier</dt><dd>{parameter.authority}</dd></div>
          <div><dt>Justification</dt><dd>Délégation des décisions financières opérationnelles</dd></div>
          <div><dt>Source actuelle</dt><dd>Référence produit frontend validée</dd></div>
        </dl>

        <section className="parameter-impact" aria-labelledby="parameter-impact-title">
          <div><p className="design-kicker">CONSOMMATEURS</p><h4 id="parameter-impact-title">Où cette valeur est appliquée</h4></div>
          <div className="parameter-impact-grid">
            <span><b>Coûts</b>Classement des dossiers au-dessus du seuil</span>
            <span><b>À traiter</b>Choix de la branche de décision</span>
            <span><b>Dossier central</b>Autorité attendue sur le montant</span>
            <span><b>Accueil Administration</b>Arbitrages financiers à décider</span>
          </div>
          <Button variant="secondary" onClick={onOpenCosts}>Examiner les dossiers concernés</Button>
        </section>

        <div className="parameter-history-missing" role="note">
          <span aria-hidden="true">⌁</span>
          <div><b>Historique persistant indisponible</b><p>L’ancienne valeur, l’auteur technique du changement, l’horodatage détaillé et le motif enregistré ne sont pas raccordés. Toute future modification devra conserver ces éléments avant de devenir active.</p></div>
        </div>
      </Card>

      <Card as="section" className="parameter-detail-card">
        <ErrorNotificationRules canEdit />
      </Card>
      </div>

      <aside className="parameters-aside">
        <Card as="section" className="parameter-governance">
          <p className="design-kicker">GARDE-FOU</p>
          <h3>Pourquoi l’édition est bloquée</h3>
          <ol>
            <li><span>1</span><p><b>Une seule source</b><small>La valeur ne doit pas diverger entre les écrans.</small></p></li>
            <li><span>2</span><p><b>Historique obligatoire</b><small>Ancienne et nouvelle valeur, auteur, date et justification.</small></p></li>
            <li><span>3</span><p><b>Application contrôlée</b><small>La règle réelle sera modifiée uniquement côté serveur sécurisé.</small></p></li>
          </ol>
        </Card>

        <Card as="section" className="parameter-gaps">
          <div className="parameter-gaps-head"><div><p className="design-kicker">DONNÉES À COMPLÉTER</p><h3>Familles non activées</h3></div><span className="panel-count">{unavailableFamilies.length}</span></div>
          <div className="parameter-gap-list">
            {unavailableFamilies.map((family) => <article key={family.label}><div><b>{family.label}</b><Badge tone="neutral">{family.state}</Badge></div><p>{family.detail}</p></article>)}
          </div>
        </Card>
      </aside>
    </div>
  </section>;
}
