'use client';

import type { ReactNode } from 'react';
import { Badge, BrandIcon, Button } from './ui';

export type TreatmentBranch = 'interne-sans-cout' | 'interne-avec-cout' | 'prestataire' | 'non-choisie';

const BRANCH_COPY: Record<TreatmentBranch, { label: string; hint: string }> = {
  'interne-sans-cout': { label: 'Interne sans coût', hint: 'Autorisation Facility Manager, hors décision financière.' },
  'interne-avec-cout': { label: 'Interne avec coût', hint: 'Le coût retenu pour l’ordre n’est pas la dernière estimation.' },
  prestataire: { label: 'Intervention prestataire', hint: 'Suivi interne par l’agent. Aucun accès direct prestataire.' },
  'non-choisie': { label: 'Branche non choisie', hint: 'Une approbation financière ne démarre pas l’intervention. Le diagnostic précède le choix de branche.' },
};

export function DossierActionBoard({
  nextAction,
  expectedActor,
  responsible,
  deadline,
  delayed,
  closed,
  primaryLabel,
  onPrimary,
  readOnly,
  busy,
  showMeta = true,
  children,
}: {
  nextAction: string;
  expectedActor: string;
  responsible: string | null;
  deadline: string;
  delayed: boolean;
  closed: boolean;
  primaryLabel: string;
  onPrimary: () => void;
  readOnly: boolean;
  busy: boolean;
  showMeta?: boolean;
  children?: ReactNode;
}) {
  return (
    <article className="panel dossier-action-board">
      <p className="design-kicker">PROCHAINE ACTION</p>
      <h3>{nextAction}</h3>
      {showMeta ? <dl className="dossier-action-meta">
        <div>
          <dt>Acteur attendu</dt>
          <dd>{expectedActor}</dd>
        </div>
        <div>
          <dt>Responsable interne</dt>
          <dd className={!responsible ? 'missing-value' : ''}>{responsible ?? 'Responsable non attribué'}</dd>
        </div>
        <div>
          <dt>Échéance</dt>
          <dd className={delayed && !closed ? 'late-text' : ''}>{deadline}{delayed && !closed ? ' · en retard' : ''}</dd>
        </div>
      </dl> : null}
      <p className="dossier-action-hint">Le responsable interne du dossier n’est pas forcément l’acteur de la prochaine action.</p>
      {children ?? (readOnly
        ? <div className="next-step-read-only" role="note">Consultation uniquement · aucune action métier accordée</div>
        : <Button disabled={busy} onClick={onPrimary}>{busy ? 'Enregistrement…' : primaryLabel}</Button>)}
    </article>
  );
}

export function DossierTreatmentStrip({
  branch,
  workOrder,
  retainedCost,
  decisionAmount,
  company,
  formatMoney,
}: {
  branch: TreatmentBranch;
  workOrder: string | null;
  retainedCost: number | null;
  decisionAmount: number | null;
  company: string | null;
  formatMoney: (value: number) => string;
}) {
  const copy = BRANCH_COPY[branch];
  return (
    <article className="panel dossier-treatment-strip">
      <div className="analytics-card-head">
        <div>
          <span>TRAITEMENT</span>
          <h3>{copy.label}</h3>
        </div>
      </div>
      <p className="dossier-treatment-hint">{copy.hint}</p>
      <dl>
        <div>
          <dt>Ordre de travail</dt>
          <dd className={!workOrder ? 'missing-value' : ''}>{workOrder ?? 'Non raccordé dans le miroir'}</dd>
        </div>
        <div>
          <dt>Coût retenu pour l’ordre</dt>
          <dd className={retainedCost === null ? 'missing-value' : ''}>{retainedCost === null ? 'Non raccordé dans le miroir' : formatMoney(retainedCost)}</dd>
        </div>
        <div>
          <dt>Montant de décision</dt>
          <dd className={decisionAmount === null ? 'missing-value' : ''}>{decisionAmount === null ? 'Non renseigné' : formatMoney(decisionAmount)}</dd>
        </div>
        <div>
          <dt>Entreprise</dt>
          <dd className={!company ? 'missing-value' : ''}>{company ?? 'Aucune · suivi interne'}</dd>
        </div>
      </dl>
    </article>
  );
}

export function DossierProofSnapshot({
  accepted,
  pending,
  countLabel,
  onOpen,
}: {
  accepted: boolean;
  pending: boolean;
  countLabel: string;
  onOpen: () => void;
}) {
  const state = accepted ? 'Acceptée' : pending ? 'À valider' : 'Aucune preuve déposée';
  const tone = accepted ? 'success' : pending ? 'orange' : 'neutral';
  return (
    <article className="panel dossier-proof-snapshot">
      <div className="analytics-card-head">
        <div>
          <span>JUSTIFICATIFS</span>
          <h3>Preuves {countLabel}</h3>
        </div>
        <Badge tone={tone}>{state}</Badge>
      </div>
      <p>{accepted ? 'Dernier justificatif accepté. La clôture peut être motivée par le Facility Manager.' : pending ? 'Justificatif déposé · contrôle Facility Manager attendu.' : 'Déposer et consulter les pièces depuis l’onglet Preuves.'}</p>
      <button type="button" className="text-button" onClick={onOpen}>
        <BrandIcon name="fileCheck" size={16} /> Ouvrir les preuves
      </button>
    </article>
  );
}
