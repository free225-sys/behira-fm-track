'use client';

import { useRef, useState } from 'react';
import { Button, Field, Select, Card } from './ui';
import { DossierActionBoard } from './DossierContinuity';
import { normalizeAntiZombieSummary } from './anti-zombie-contract';
import type { OperationalAnomaly } from '../lib/supabase/data';

export type Ge01WorkflowCommand = 'assign' | 'diagnose' | 'branch' | 'start' | 'finish' | 'close';
export type Ge01TreatmentSelection = { branch: 'internal_without_cost' | 'internal_with_cost' | 'vendor'; costReference: string; vendorCode: string };
export type Ge01WorkflowHandler = (command: Ge01WorkflowCommand, comment: string, requestId: string, treatment?: Ge01TreatmentSelection, employeeCode?: string) => Promise<boolean>;

export function Ge01WorkflowPanel({ anomaly, isManager, isAgent, onSubmit, onRefresh, onOpenProofs, onOpenCosts, busy }: {
  anomaly: Pick<OperationalAnomaly, 'status' | 'proof' | 'workflow' | 'antiZombieSummary' | 'financialOptions' | 'eligibleVendors' | 'treatment' | 'eligibleDiagnosisAssignees'>;
  isManager: boolean; isAgent: boolean; onSubmit: Ge01WorkflowHandler; onRefresh: () => void; busy: boolean;
  onOpenProofs: () => void;
  onOpenCosts: () => void;
}) {
  const [comment, setComment] = useState('');
  const [confirming, setConfirming] = useState(false);
  const requestId = useRef<string | null>(null);
  const submitting = useRef(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const selectedAgent = anomaly.eligibleDiagnosisAssignees?.find(a => a.employeeCode === employeeCode);
  const [treatment, setTreatment] = useState<Ge01TreatmentSelection>({ branch: anomaly.financialOptions?.length ? 'internal_with_cost' : 'internal_without_cost', costReference: '', vendorCode: '' });
  const money = (amount: number) => `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
  const selectedCost = anomaly.financialOptions?.find(c => c.reference === treatment.costReference);
  const selectedVendor = anomaly.eligibleVendors?.find(v => v.code === treatment.vendorCode);
  const branchReady = treatment.branch === 'internal_without_cost' ? !anomaly.financialOptions?.length : selectedCost?.status === 'approved' && (treatment.branch !== 'vendor' || Boolean(selectedVendor));
  const changeTreatment = (patch: Partial<Ge01TreatmentSelection>) => { setTreatment(t => ({ ...t, ...patch })); setConfirming(false); requestId.current = null; };
  const vendorWork = anomaly.treatment?.branch === 'vendor';
  const treatmentLabel = anomaly.treatment?.branch === 'internal_without_cost' ? 'Intervention interne sans coût' : vendorWork ? 'Intervention prestataire' : 'Intervention interne avec coût';
  const summary = normalizeAntiZombieSummary(anomaly.antiZombieSummary ?? {});
  const action = anomaly.workflow?.actionCode;
  const receptionAction = action === 'RECEIVE_INTERVENTION';
  const proofAction = ['GE01_SUBMIT_PROOF','GE01_REPLACE_PROOF','GE01_REVIEW_PROOF'].includes(action ?? '');
  const command: Ge01WorkflowCommand | null = anomaly.status === 'À qualifier'
    ? action === 'QUALIFY_ASSIGN' ? 'assign' : action === 'PERFORM_DIAGNOSIS' ? 'diagnose' : action === 'CHOOSE_TREATMENT_BRANCH' ? 'branch' : null
    : anomaly.status === 'Affectée' ? 'start' : anomaly.status === 'En intervention' ? 'finish' : anomaly.status === 'En validation' && !proofAction && !receptionAction ? 'close' : null;
  const labels = { assign: 'Affecter le diagnostic', diagnose: 'Confirmer le diagnostic', branch: 'Autoriser le traitement choisi', start: vendorWork ? 'Confirmer le début de l’intervention prestataire' : 'Démarrer l’intervention', finish: vendorWork ? 'Consigner le résultat de l’intervention prestataire' : 'Transmettre le compte rendu', close: 'Clôturer le dossier' };
  const permitted = command && (['assign', 'branch', 'close'].includes(command) ? isManager : (isAgent && anomaly.workflow?.assignedToCurrentUser) || isManager);
  const proofLocked = command === 'close' && !anomaly.proof;
  const submit = async () => {
    if (submitting.current || busy || (command === 'assign' && !selectedAgent)) return;
    submitting.current = true;
    requestId.current ??= crypto.randomUUID();
    try {
    if (command && (command !== 'branch' || branchReady) && await onSubmit(command, comment.trim(), requestId.current, command === 'branch' ? treatment : undefined, command === 'assign' ? employeeCode : undefined)) {
      setComment(''); setConfirming(false); requestId.current = null;
    }
    } finally { submitting.current = false; }
  };
  return <Card as="section" className="ge01-workflow-panel" aria-label="Traitement GE-01">
    <DossierActionBoard nextAction={proofAction || receptionAction ? summary.nextAction : command ? labels[command] : anomaly.status === 'Clôturée' ? 'Dossier clôturé' : 'Action à actualiser'} expectedActor={summary.expectedActor} responsible={anomaly.antiZombieSummary?.responsible ?? null} deadline={summary.deadlineOrSla} delayed={summary.isDelayed} closed={anomaly.status === 'Clôturée'} primaryLabel="Ouvrir les preuves" onPrimary={onOpenProofs} readOnly={!permitted && !proofAction} busy={busy}>
    <div className="ge01-workflow-refresh"><Button variant="secondary" disabled={busy} onClick={onRefresh}>Actualiser le dossier</Button></div>
    {receptionAction && <p>La réception de cette intervention attend le Facility Manager.</p>}
    {proofAction && <>

      <p>{anomaly.antiZombieSummary?.nextActionDetail}</p>
      <Button className="ge01-open-proofs" disabled={busy} onClick={onOpenProofs}>Ouvrir les preuves</Button>
    </>}
    {command === 'assign' && <p>Le responsable choisi réalisera le diagnostic. Le dossier reste en qualification jusqu’au choix du traitement par le Facility Manager.</p>}
    {anomaly.treatment && <div className="ge01-treatment-summary"><p><strong>{treatmentLabel} autorisée</strong> · {anomaly.treatment.workOrderReference}</p>{anomaly.treatment.branch !== 'internal_without_cost' && <p>{anomaly.treatment.costReference} · {money(anomaly.treatment.amount)}{anomaly.treatment.vendorLabel ? ` · ${anomaly.treatment.vendorLabel}` : ''}</p>}<p>{anomaly.treatment.comment}</p>{vendorWork && <p>Agent Électricité reste responsable du suivi interne. Il consigne le début, le résultat et le justificatif à contrôler par Facility Manager.</p>}</div>}
    {command === 'branch' && <p>Facility Manager choisit le traitement après le diagnostic. Une intervention avec coût nécessite une décision financière approuvée de ce dossier.</p>}
    {proofLocked && <p role="status">{isManager ? 'Consultez et acceptez la preuve dans l’onglet Preuves avant de clôturer.' : 'Déposez le justificatif dans l’onglet Preuves. Facility Manager pourra ensuite le vérifier et clôturer le dossier.'}</p>}
    {command && !permitted && <p>Cette étape attend {command === 'diagnose' ? 'le diagnostic de l’agent affecté' : 'le Facility Manager'}.</p>}
    {permitted && !proofLocked && <>
      {command === 'assign' && <Field label="Responsable du diagnostic">
        <Select value={employeeCode} disabled={busy || confirming} onChange={e => { setEmployeeCode(e.target.value); requestId.current = null; }}>
          <option value="">Sélectionner un agent habilité</option>
          {(anomaly.eligibleDiagnosisAssignees ?? []).map(agent => <option key={agent.employeeCode} value={agent.employeeCode}>{agent.label}</option>)}
        </Select>
        {!anomaly.eligibleDiagnosisAssignees?.length && <p role="status">Aucun agent actif habilité à cet équipement. Faites vérifier les comptes et les périmètres, puis actualisez le dossier.</p>}
      </Field>}
      {command === 'branch' && <div className="ge01-treatment-fields">
        <Field label="Traitement à autoriser"><Select value={treatment.branch} disabled={busy || confirming} onChange={e => changeTreatment({ branch: e.target.value as Ge01TreatmentSelection['branch'] })}>
          <option value="internal_without_cost" disabled={Boolean(anomaly.financialOptions?.length)}>Interne sans achat ni prestation</option>
          <option value="internal_with_cost">Interne avec coût approuvé</option>
          <option value="vendor">Intervention d’un prestataire</option>
        </Select></Field>
        {treatment.branch !== 'internal_without_cost' && <>
          <Field label="Décision financière à utiliser"><Select value={treatment.costReference} disabled={busy || confirming} onChange={e => changeTreatment({ costReference: e.target.value })}>
            <option value="">Sélectionner un coût approuvé</option>
            {(anomaly.financialOptions ?? []).map(c => <option key={c.reference} value={c.reference} disabled={c.status !== 'approved'}>{c.reference} · {money(c.amount)} · {c.status === 'approved' ? 'Approuvé' : c.status === 'rejected' ? 'Refusé' : 'En attente'}</option>)}
          </Select></Field>
          {!anomaly.financialOptions?.some(c => c.status === 'approved') && <p role="status">Aucun coût approuvé disponible. Enregistrez le coût et faites-le arbitrer dans l’espace Coûts.</p>}
          <Button variant="secondary" disabled={busy || confirming} onClick={onOpenCosts}>Consulter les coûts</Button>
        </>}
        {treatment.branch === 'vendor' && <Field label="Entreprise référencée pour GE-01"><Select value={treatment.vendorCode} disabled={busy || confirming} onChange={e => changeTreatment({ vendorCode: e.target.value })}>
          <option value="">Sélectionner l’entreprise</option>
          {(anomaly.eligibleVendors ?? []).map(v => <option key={v.code} value={v.code}>{v.label}</option>)}
        </Select></Field>}
        {treatment.branch === 'vendor' && !anomaly.eligibleVendors?.length && <p role="status">Aucune entreprise éligible n’est référencée pour GE-01.</p>}
      </div>}
      <Field label={command === 'diagnose' ? 'Diagnostic et constat terrain' : command === 'finish' ? 'Intervention réalisée et résultat' : 'Commentaire de décision'}>
        <textarea required value={comment} disabled={busy || confirming} onChange={(event) => { setComment(event.target.value); requestId.current = null; }} />
      </Field>
      {confirming ? <div><p>Confirmer l’enregistrement : {labels[command!]}. Le commentaire sera conservé dans le dossier.</p>{command === 'assign' && <p>Responsable : {selectedAgent?.label}</p>}{command === 'branch' && <p>{treatment.branch === 'internal_without_cost' ? 'Intervention interne sans coût' : `${treatment.branch === 'vendor' ? 'Prestataire' : 'Interne avec coût'} · ${selectedCost?.reference} · ${money(selectedCost?.amount ?? 0)}${selectedVendor && treatment.branch === 'vendor' ? ` · ${selectedVendor.label}` : ''}`}</p>}<Button variant="secondary" disabled={busy} onClick={() => { setConfirming(false); requestId.current = null; }}>Modifier le choix ou le commentaire</Button><Button disabled={busy || (command === 'assign' && !selectedAgent) || (command === 'branch' && !branchReady)} onClick={() => void submit()}>{busy ? 'Enregistrement…' : 'Confirmer l’enregistrement'}</Button></div>
        : <Button disabled={busy || !comment.trim() || (command === 'assign' && !selectedAgent) || (command === 'branch' && !branchReady)} onClick={() => setConfirming(true)}>{labels[command!]}</Button>}
    </>}
    </DossierActionBoard>
  </Card>;
}
