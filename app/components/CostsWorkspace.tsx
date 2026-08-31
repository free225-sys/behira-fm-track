'use client';

import { FormEvent, useMemo, useRef, useState } from 'react';

import { Badge, Button, Card, Field } from './ui';

export type CostsWorkspaceItem = {
  id:string;
  anomaly:string;
  asset:string;
  title:string;
  kind:string;
  amount:number | null;
  due:string;
  state:string;
  budgetType?:'opex' | 'capex';
  decisionScope?:'facility_manager' | 'administration';
  thresholdAmount?:number;
  submittedBy?:string | null;
  reviewedBy?:string | null;
  reviewComment?:string | null;
};

export type CostSubmissionInput = {
  anomalyReference:string;
  amount:number;
  budgetType:'opex' | 'capex';
  description:string;
  idempotencyKey:string;
};

export type CostReviewInput = {
  costReference:string;
  decision:'approved' | 'rejected';
  comment:string;
  idempotencyKey:string;
};

type CostFilter = 'all' | 'documented' | 'above-threshold' | 'missing';

function formatMoney(value:number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
}

function stateTone(state:string) {
  if (state === 'Approuvée') return 'success';
  if (state === 'Refusée') return 'critical';
  if (state === 'Renvoyée à Facility Manager') return 'orange';
  return 'neutral';
}

export function CostsWorkspace({ items, anomalies, audience, threshold, persistenceMode, busy, onSubmit, onReview, onOpenDossier }: {
  items:CostsWorkspaceItem[];
  anomalies:Array<{reference:string; asset:string; title:string}>;
  audience:'administration' | 'facility';
  threshold:number;
  persistenceMode:'server' | 'demo';
  busy:boolean;
  onSubmit:(input:CostSubmissionInput)=>Promise<void>;
  onReview:(input:CostReviewInput)=>Promise<void>;
  onOpenDossier:(id:string)=>void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<CostFilter>('all');
  const [showSubmission, setShowSubmission] = useState(false);
  const [anomalyReference, setAnomalyReference] = useState(anomalies[0]?.reference ?? '');
  const [amount, setAmount] = useState('');
  const [budgetType, setBudgetType] = useState<'opex'|'capex'>('opex');
  const [description, setDescription] = useState('');
  const [reviewingId, setReviewingId] = useState<string|null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved'|'rejected'>('approved');
  const [reviewComment, setReviewComment] = useState('');
  const submissionKeyRef = useRef<string|null>(null);
  const reviewKeyRef = useRef<string|null>(null);
  const documentedItems = useMemo(() => items.filter((item) => item.amount !== null), [items]);
  const documentedTotal = documentedItems.reduce((total,item) => total + (item.amount ?? 0),0);
  const overThresholdCount = documentedItems.filter((item) => (item.amount ?? 0) >= threshold).length;
  const missingCount = items.length - documentedItems.length;
  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('fr');
    return items.filter((item) => {
      const matchesQuery = !normalizedQuery || `${item.id} ${item.anomaly} ${item.asset} ${item.title} ${item.kind} ${item.state}`.toLocaleLowerCase('fr').includes(normalizedQuery);
      const matchesFilter = filter === 'all'
        || (filter === 'documented' && item.amount !== null)
        || (filter === 'above-threshold' && item.amount !== null && item.amount >= threshold)
        || (filter === 'missing' && item.amount === null);
      return matchesQuery && matchesFilter;
    });
  }, [filter, items, query, threshold]);
  const resetSubmissionKey = () => { submissionKeyRef.current = null; };
  const submitCost = async (event:FormEvent) => {
    event.preventDefault();
    const parsedAmount = Number(amount);
    if (!anomalyReference || !Number.isFinite(parsedAmount) || parsedAmount <= 0 || !description.trim()) return;
    submissionKeyRef.current ??= crypto.randomUUID();
    try {
      await onSubmit({ anomalyReference, amount:parsedAmount, budgetType, description:description.trim(), idempotencyKey:submissionKeyRef.current });
      submissionKeyRef.current = null;
      setAmount('');
      setDescription('');
      setShowSubmission(false);
    } catch {
      // The parent reports the server error; retaining the key makes a retry idempotent.
    }
  };
  const submitReview = async (event:FormEvent) => {
    event.preventDefault();
    if (!reviewingId || !reviewComment.trim()) return;
    reviewKeyRef.current ??= crypto.randomUUID();
    try {
      await onReview({ costReference:reviewingId, decision:reviewDecision, comment:reviewComment.trim(), idempotencyKey:reviewKeyRef.current });
      reviewKeyRef.current = null;
      setReviewingId(null);
      setReviewComment('');
    } catch {
      // The parent reports the server error; retaining the key makes a retry idempotent.
    }
  };

  return <section className="costs-workspace" aria-labelledby="costs-workspace-title">
    <header className="costs-workspace-hero">
      <div>
        <p className="design-kicker">PILOTAGE</p>
        <h2 id="costs-workspace-title" className="visually-hidden">Coûts documentés</h2>
        <p>{audience === 'administration' ? 'Vue globale des montants soumis à arbitrage. Les décisions restent dans l’espace Administration.' : 'Lecture opérationnelle des montants liés aux dossiers. Les arbitrages au-delà du seuil restent réservés à l’Administration.'}</p>
      </div>
      <div className="costs-hero-actions"><Badge tone={audience === 'administration' ? 'blue' : 'neutral'}>{audience === 'administration' ? 'VUE GLOBALE' : 'DÉCISION FM'}</Badge>{audience === 'facility' && <Button onClick={() => setShowSubmission((value) => !value)}>{showSubmission ? 'Fermer' : '＋ Soumettre un coût'}</Button>}</div>
    </header>

    {audience === 'facility' && showSubmission && <Card as="section" className="cost-submission-card">
      <div className="panel-head"><div><p className="design-kicker">DÉCISION FINANCIÈRE</p><h3>Rattacher un coût estimatif à un dossier</h3><p>Le serveur applique le seuil canonique et conserve la décision dans l’historique.</p></div><Badge tone={persistenceMode === 'server' ? 'success' : 'neutral'}>{persistenceMode === 'server' ? 'ENREGISTREMENT RÉEL' : 'SIMULATION'}</Badge></div>
      <form className="cost-submission-form" onSubmit={(event) => void submitCost(event)}>
        <Field label="Dossier concerné"><select required value={anomalyReference} onChange={(event) => {setAnomalyReference(event.target.value);resetSubmissionKey()}}><option value="">Choisir un dossier</option>{anomalies.map((item) => <option key={item.reference} value={item.reference}>{item.reference} · {item.asset} · {item.title}</option>)}</select></Field>
        <Field label="Montant estimatif (FCFA)"><input required type="number" min="1" step="1" value={amount} onChange={(event) => {setAmount(event.target.value);resetSubmissionKey()}} /></Field>
        <Field label="Nature budgétaire"><select value={budgetType} onChange={(event) => {setBudgetType(event.target.value as 'opex'|'capex');resetSubmissionKey()}}><option value="opex">OPEX · fonctionnement</option><option value="capex">CAPEX · investissement</option></select></Field>
        <Field label="Motif de la décision"><textarea required value={description} onChange={(event) => {setDescription(event.target.value);resetSubmissionKey()}} placeholder="Expliquez le besoin, le risque et l’action proposée." /></Field>
        <div className="cost-decision-preview" role="note"><span aria-hidden="true">{Number(amount) >= threshold ? '↑' : '✓'}</span><p><b>{Number(amount) >= threshold ? 'Arbitrage de l’Administration requis' : 'Dans la délégation de Facility Manager'}</b><small>Seuil canonique : {formatMoney(threshold)}. Le montant soumis restera immuable.</small></p></div>
        <div className="cost-form-actions"><Button type="button" variant="secondary" onClick={() => setShowSubmission(false)}>Annuler</Button><Button type="submit" disabled={busy || !anomalyReference || Number(amount) <= 0 || !description.trim()}>{busy ? 'Enregistrement…' : 'Enregistrer la décision'}</Button></div>
      </form>
    </Card>}

    <section className="costs-summary" aria-label="Synthèse des coûts disponibles">
      <Card className="costs-summary-card">
        <span>MONTANTS RENSEIGNÉS</span><strong>{formatMoney(documentedTotal)}</strong><small>Somme des arbitrages visibles</small>
      </Card>
      <Card className="costs-summary-card">
        <span>DOSSIERS CHIFFRÉS</span><strong>{documentedItems.length}</strong><small>sur {items.length} arbitrages visibles</small>
      </Card>
      <Card className="costs-summary-card">
        <span>AU-DESSUS DU SEUIL</span><strong>{overThresholdCount}</strong><small>Seuil confirmé : {formatMoney(threshold)}</small>
      </Card>
      <Card className="costs-summary-card is-insufficient">
        <span>BUDGET · ENGAGÉ · PAYÉ</span><strong>Données insuffisantes</strong><small>Aucune source canonique disponible</small>
      </Card>
    </section>

    <Card as="section" className="costs-catalogue">
      <div className="costs-catalogue-head">
        <div><p className="design-kicker">DOSSIERS FINANCIERS</p><h3>Montants et arbitrages</h3><p>Un montant soumis à décision n’est pas considéré comme engagé ou payé.</p></div>
        <span className="panel-count">{filteredItems.length} résultat{filteredItems.length > 1 ? 's' : ''}</span>
      </div>
      <div className="costs-filters">
        <Field label="Rechercher un dossier">
          <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Décision, anomalie, équipement…" />
        </Field>
        <Field label="Disponibilité du montant">
          <select value={filter} onChange={(event) => setFilter(event.target.value as CostFilter)}>
            <option value="all">Tous les arbitrages</option>
            <option value="documented">Montant renseigné</option>
            <option value="above-threshold">Au-dessus du seuil</option>
            <option value="missing">Montant non renseigné</option>
          </select>
        </Field>
      </div>

      {missingCount > 0 && <div className="costs-data-notice" role="note"><span aria-hidden="true">i</span><p><b>{missingCount} arbitrage{missingCount > 1 ? 's' : ''} sans montant</b><small>Ces dossiers restent visibles mais ne sont pas inclus dans le total documenté.</small></p></div>}

      {filteredItems.length === 0 ? <div className="costs-empty" role="status"><span aria-hidden="true">⌕</span><div><h3>Aucun dossier trouvé</h3><p>Élargissez la recherche ou choisissez un autre filtre.</p></div></div> : <div className="costs-list">
        {filteredItems.map((item) => {
          const overThreshold = item.amount !== null && item.amount >= threshold;
          return <Card key={item.id} className="costs-case-card">
            <div className="costs-case-heading">
              <span className="costs-case-mark" aria-hidden="true">₣</span>
              <div><small>{item.asset} · {item.id} · {item.anomaly}</small><h3>{item.title}</h3></div>
              <div className="costs-case-badges"><Badge tone={item.kind === 'Risque' ? 'critical' : 'orange'}>{item.kind}</Badge><Badge tone={stateTone(item.state)}>{item.state}</Badge></div>
            </div>
            <div className="costs-case-body">
              <div className="costs-amount">
                <span>MONTANT DE DÉCISION</span>
                <strong>{item.amount === null ? 'Non renseigné' : formatMoney(item.amount)}</strong>
                <small>{item.amount === null ? 'Aucun montant enregistré pour cet arbitrage' : overThreshold ? 'Validation de l’Administration requise' : 'Dans la délégation du Facility Manager'}</small>
              </div>
              <dl className="costs-case-facts">
                <div><dt>Échéance</dt><dd>{item.due || 'Non renseignée'}</dd></div>
                <div><dt>Seuil appliqué</dt><dd>{formatMoney(item.thresholdAmount ?? threshold)}</dd></div>
                <div><dt>Décideur attendu</dt><dd>{item.decisionScope === 'administration' ? 'Administration' : item.decisionScope === 'facility_manager' ? 'Facility Manager' : 'Non renseigné'}</dd></div>
                <div><dt>Soumis par</dt><dd>{item.submittedBy ?? 'Non renseigné'}</dd></div>
                <div><dt>Décidé par</dt><dd>{item.reviewedBy ?? 'Décision en attente'}</dd></div>
                <div><dt>Montant engagé</dt><dd>Non renseigné</dd></div>
                <div><dt>Montant payé</dt><dd>Non renseigné</dd></div>
              </dl>
              {item.reviewComment && <div className="cost-review-comment"><b>Motif de la décision</b><p>{item.reviewComment}</p></div>}
              <div className="costs-case-action"><p>{audience === 'administration' && item.state === 'À décider' ? 'Une décision motivée de l’Administration est requise.' : item.state === 'À décider' ? 'En attente de l’Administration.' : 'Décision enregistrée et historisée.'}</p><div>{item.anomaly.startsWith('ANO-') && <Button variant="secondary" onClick={() => onOpenDossier(item.anomaly)}>Ouvrir le dossier</Button>}{audience === 'administration' && item.state === 'À décider' && <Button onClick={() => {setReviewingId(item.id);setReviewDecision('approved');setReviewComment('');reviewKeyRef.current=null}}>Décider</Button>}</div></div>
              {audience === 'administration' && reviewingId === item.id && <form className="cost-review-form" onSubmit={(event) => void submitReview(event)}><div className="cost-review-choice" aria-label="Décision"><button type="button" className={reviewDecision === 'approved' ? 'active' : ''} aria-pressed={reviewDecision === 'approved'} onClick={() => {setReviewDecision('approved');reviewKeyRef.current=null}}>✓ Approuver</button><button type="button" className={reviewDecision === 'rejected' ? 'active danger' : 'danger'} aria-pressed={reviewDecision === 'rejected'} onClick={() => {setReviewDecision('rejected');reviewKeyRef.current=null}}>! Refuser</button></div><Field label="Motif obligatoire"><textarea autoFocus required value={reviewComment} onChange={(event) => {setReviewComment(event.target.value);reviewKeyRef.current=null}} placeholder="Justifiez l’arbitrage et ses conditions." /></Field><div className="cost-form-actions"><Button type="button" variant="secondary" onClick={() => setReviewingId(null)}>Annuler</Button><Button type="submit" disabled={busy || !reviewComment.trim()}>{busy ? 'Enregistrement…' : 'Confirmer la décision'}</Button></div></form>}
            </div>
          </Card>;
        })}
      </div>}
    </Card>
  </section>;
}
