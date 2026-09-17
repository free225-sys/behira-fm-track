'use client';

import { useState } from 'react';

import { Badge, BrandIcon, Button, Card } from './ui';
import { ErrorNotificationRules } from './NotificationCenter';
import { AccessWorkspace, type AccessWorkspaceUser } from './AccessWorkspace';

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

type SettingsTab = 'acces' | 'regles' | 'notifications' | 'zones' | 'journal';

function formatMoney(value:number) {
  return new Intl.NumberFormat('fr-FR').format(value);
}

export function ParametersWorkspace({ parameter, onOpenCosts, users }: {
  parameter:ParameterWorkspaceData;
  onOpenCosts:()=>void;
  users?: AccessWorkspaceUser[];
}) {
  const [tab, setTab] = useState<SettingsTab>('acces');
  const tabs: Array<{ id: SettingsTab; label: string }> = [
    { id: 'acces', label: 'Accès' },
    { id: 'regles', label: 'Règles' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'zones', label: 'Zones' },
    { id: 'journal', label: 'Journal d’audit' },
  ];
  return <section className="parameters-workspace" aria-labelledby="parameters-workspace-title">
    <header className="parameters-workspace-hero">
      <div>
        <p className="design-kicker">ADMINISTRATION</p>
        <h2 id="parameters-workspace-title" className="visually-hidden">Paramètres</h2>
        <p className="visually-hidden">Seuils et paramètres</p>
        <p>Consultez les règles actuellement justifiables. Une valeur sans source, historique ou autorité explicite n’est jamais présentée comme un paramètre actif.</p>
      </div>
      <Badge tone="neutral">LECTURE SEULE</Badge>
    </header>

    <div className="parameters-tabs workspace-tabs" role="tablist" aria-label="Sections des paramètres">
      {tabs.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'active' : ''} onClick={() => setTab(item.id)}>{item.label}</button>
      ))}
    </div>

    {tab === 'acces' && (users
      ? <AccessWorkspace users={users} audience="administration" embedded />
      : <p className="parameter-rule-sentence">Les profils et périmètres se consultent dans Accès. Aucun compte, rôle ou périmètre réel n’est modifié ici.</p>)}

    {tab === 'regles' && <>
      <section className="parameters-summary" aria-label="Synthèse des paramètres disponibles">
        <Card className="parameters-summary-card"><span>PARAMÈTRE CONFIRMÉ</span><strong>1</strong><small>Seuil de décision financière</small></Card>
        <Card className="parameters-summary-card"><span>MODIFIABLE ICI</span><strong>0</strong><small>Aucune édition silencieuse</small></Card>
        <Card className="parameters-summary-card"><span>FAMILLES À RACCORDER</span><strong>{unavailableFamilies.length}</strong><small>SLA, technique et scores</small></Card>
        <Card className="parameters-summary-card is-insufficient"><span>HISTORIQUE PERSISTANT</span><strong>Indisponible</strong><small>Ancienne valeur et auteur non raccordés</small></Card>
      </section>

      <Card as="section" className="parameter-detail-card">
        <div className="parameter-detail-head">
          <div><p className="design-kicker">RÈGLE FINANCIÈRE</p><h3>{parameter.label}</h3></div>
          <Badge tone="orange">CONFIRMÉ · À RACCORDER</Badge>
        </div>
        <p className="parameter-rule-sentence">En dessous de {formatMoney(parameter.value)} {parameter.unit}, la décision reste dans la délégation du Facility Manager. À partir de cette valeur, l’arbitrage revient à l’Administration. Date d’effet {parameter.effectiveDate}, autorité {parameter.authority}. Délais SLA par priorité, seuils techniques des équipements et méthodes de calcul des scores ne sont pas encore raccordés.</p>
        <div className="parameter-impact-grid visually-hidden">
          <span><b>Coûts</b>Classement des dossiers au-dessus du seuil</span>
          <span><b>À traiter</b>Choix de la branche de décision</span>
        </div>
        <Button variant="secondary" onClick={onOpenCosts}>Examiner les dossiers concernés</Button>
        <details className="parameter-tech-details">
          <summary>Détails techniques</summary>
          <dl className="parameter-facts">
            <div><dt>Code fonctionnel</dt><dd>{parameter.code}</dd></div>
            <div><dt>Portée</dt><dd>{parameter.scope}</dd></div>
            <div><dt>Date d’effet</dt><dd>{parameter.effectiveDate}</dd></div>
            <div><dt>Autorité métier</dt><dd>{parameter.authority}</dd></div>
            <div><dt>Justification</dt><dd>Délégation des décisions financières opérationnelles</dd></div>
            <div><dt>Source actuelle</dt><dd>Référence produit frontend validée</dd></div>
          </dl>
        </details>
        <div className="parameter-history-missing" role="note">
          <BrandIcon name="info" size={18} />
          <div><b>Historique persistant indisponible</b><p>L’ancienne valeur, l’auteur technique du changement, l’horodatage détaillé et le motif enregistré ne sont pas raccordés. Toute future modification devra conserver ces éléments avant de devenir active.</p></div>
        </div>
      </Card>
    </>}

    {tab === 'notifications' && <Card as="section" className="parameter-detail-card"><ErrorNotificationRules canEdit /></Card>}

    {tab === 'zones' && <Card as="section" className="parameter-gaps">
      <div className="parameter-gaps-head"><div><p className="design-kicker">ZONES</p><h3>Référentiel de zones</h3></div></div>
      <p className="parameter-rule-sentence">Le plan de zones n’est pas raccordé. Aucune liste canonique n’est exposée tant que la source métier n’est pas historisée.</p>
    </Card>}

    {tab === 'journal' && <Card as="section" className="parameter-governance">
      <p className="design-kicker">JOURNAL D’AUDIT</p>
      <h3>Historique des changements</h3>
      <p className="parameter-rule-sentence">Historique persistant indisponible. L’ancienne valeur, l’auteur, la date et le motif devront être conservés côté serveur avant tout affichage.</p>
    </Card>}
  </section>;
}
