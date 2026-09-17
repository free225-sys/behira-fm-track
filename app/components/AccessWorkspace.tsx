'use client';

import { FormEvent, useState } from 'react';

import { displayAssetCode, displayAssetText } from '../lib/ui-contract/display.ts';
import { Badge, BrandIcon, Button, Card, Field, Select } from './ui';
import { hasFieldErrors, validateAccessAction, validateAccessCreate, type FieldErrors } from '../lib/client-validation';

export type AccessWorkspaceUser = {
  id:string;
  name:string;
  initials:string;
  role:string;
  scope:string;
};

type AdminAction = 'create' | 'disable';

type FmAccessRequest = {
  id:string;
  profile:string;
  proposedRole:string;
  proposedScope:string;
  justification:string;
};

const DEMO_FM_REQUESTS: FmAccessRequest[] = [
  {
    id: 'ACC-014',
    profile: 'Agent Eau & Incendie Démo',
    proposedRole: 'Agent terrain',
    proposedScope: 'WILO-01 · RIA-01',
    justification: 'Étendre le périmètre incendie pendant l’absence de l’intérimaire, sans changer le rôle.',
  },
];

export function AccessWorkspace({ users, audience, embedded = false }: {
  users:AccessWorkspaceUser[];
  audience:'administration' | 'facility';
  embedded?: boolean;
}) {
  const [adminAction, setAdminAction] = useState<AdminAction>('create');
  const [selectedUserId, setSelectedUserId] = useState(users.find((user) => user.id !== 'administration')?.id ?? users[0]?.id ?? '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Agent terrain');
  const [scope, setScope] = useState('Périmètre à confirmer');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'name'|'email'|'reason'|'selectedUserId'>>({});
  const [pendingRequests, setPendingRequests] = useState<FmAccessRequest[]>(DEMO_FM_REQUESTS);
  const [requestMotives, setRequestMotives] = useState<Record<string, string>>({});
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});
  const uniqueRoles = new Set(users.map((user) => user.role)).size;
  const selectedUser = users.find((user) => user.id === selectedUserId);

  const decideRequest = (request: FmAccessRequest, decision: 'approve' | 'refuse') => {
    const motive = (requestMotives[request.id] ?? '').trim();
    if (motive.length < 12) {
      setRequestErrors((current) => ({ ...current, [request.id]: 'Indiquez un motif d’au moins 12 caractères.' }));
      return;
    }
    setPendingRequests((items) => items.filter((item) => item.id !== request.id));
    setRequestErrors((current) => ({ ...current, [request.id]: '' }));
    setConfirmation(decision === 'approve'
      ? `${request.profile} : proposition approuvée. Aucun compte réel n’a été créé.`
      : `${request.profile} : proposition refusée. Aucun compte réel n’a été créé.`);
  };

  const submit = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const next = audience === 'administration' && adminAction === 'create'
      ? validateAccessCreate({ name, email, reason })
      : validateAccessAction({ selectedUserId, reason });
    setFieldErrors(next);
    if (hasFieldErrors(next)) return;
    if (audience === 'facility') {
      setConfirmation(`Proposition préparée pour ${selectedUser?.name ?? 'le profil sélectionné'}. Elle attend la validation de l’Administration.`);
      setReason('');
      return;
    }
    if (adminAction === 'create') {
      setConfirmation(`Création de ${name.trim()} préparée. Aucun compte réel n’a été créé.`);
      setName(''); setEmail(''); setReason('');
      return;
    }
    setConfirmation(`Désactivation de ${selectedUser?.name ?? 'ce profil'} préparée. Aucun accès réel n’a été modifié.`);
    setReason('');
  };

  return <section className={`access-workspace${embedded ? ' is-embedded' : ''}`} aria-labelledby="access-workspace-title">
    <header className="access-workspace-hero">
      <div>
        <p className="design-kicker">ADMINISTRATION</p>
        <h2 id="access-workspace-title" className="visually-hidden">Utilisateurs et droits</h2>
        <p>{audience === 'administration' ? 'Préparez la création ou la désactivation d’un accès. L’exécution réelle restera un traitement serveur sécurisé.' : 'Consultez les profils métier et proposez un rôle ou un périmètre. Seule l’Administration peut appliquer la modification.'}</p>
      </div>
      <Badge tone={audience === 'administration' ? 'blue' : 'neutral'}>{audience === 'administration' ? 'GESTION ADMINISTRATION' : 'PROPOSITION UNIQUEMENT'}</Badge>
    </header>
    {audience === 'administration' ? <section className="access-pending-list" aria-labelledby="access-pending-title">
      <div className="access-section-head"><div><p className="design-kicker">VALIDATION</p><h3 id="access-pending-title">Demandes du FM en attente</h3><p>Profil, rôle et périmètre proposés, justification. Approuver ou refuser avec un motif. Aucun compte réel n’a été créé.</p></div><span className="panel-count">{pendingRequests.length}</span></div>
      {pendingRequests.length === 0
        ? <p className="access-pending-empty">Aucune demande en attente.</p>
        : pendingRequests.map((request) => (
          <article key={request.id} className="access-pending-card">
            <div className="access-pending-copy">
              <b>{request.profile}</b>
              <dl>
                <div><dt>Rôle proposé</dt><dd>{request.proposedRole}</dd></div>
                <div><dt>Périmètre proposé</dt><dd>{request.proposedScope}</dd></div>
                <div><dt>Justification</dt><dd>{request.justification}</dd></div>
              </dl>
            </div>
            <Field label="Motif" size="long" error={requestErrors[request.id]}>
              <textarea
                value={requestMotives[request.id] ?? ''}
                maxLength={1000}
                aria-invalid={Boolean(requestErrors[request.id])}
                onChange={(event) => {
                  const value = event.target.value;
                  setRequestMotives((current) => ({ ...current, [request.id]: value }));
                  setRequestErrors((current) => ({ ...current, [request.id]: '' }));
                }}
                placeholder="Obligatoire pour approuver ou refuser"
              />
            </Field>
            <div className="access-pending-actions">
              <Button type="button" onClick={() => decideRequest(request, 'approve')}>Approuver</Button>
              <Button type="button" variant="secondary" onClick={() => decideRequest(request, 'refuse')}>Refuser</Button>
            </div>
          </article>
        ))}
    </section> : null}

    <section className="access-summary" aria-label="Synthèse des accès de démonstration">
      <Card className="access-summary-card"><span>PROFILS DE DÉMONSTRATION</span><strong>{users.length}</strong><small>Aucun compte Auth géré ici</small></Card>
      <Card className="access-summary-card"><span>RÔLES REPRÉSENTÉS</span><strong>{uniqueRoles}</strong><small>Selon la configuration visible</small></Card>
      <Card className="access-summary-card"><span>CRÉER · DÉSACTIVER</span><strong>Administration</strong><small>Exécution serveur requise</small></Card>
      <Card className="access-summary-card"><span>PROPOSER UN ACCÈS</span><strong>Facility Manager</strong><small>Validation Administration obligatoire</small></Card>
    </section>

    <div className="access-layout">
      <Card as="section" className="access-directory">
        <div className="access-section-head"><div><p className="design-kicker">ANNUAIRE MÉTIER</p><h3>Profils visibles dans la démonstration</h3><p>Ces profils décrivent l’interface ; ils ne prouvent pas l’existence d’un compte Auth.</p></div><span className="panel-count">{users.length} profils</span></div>
        <div className="access-user-list">
          {users.map((user) => <article key={user.id} className={selectedUserId === user.id ? 'active' : ''}>
            <button type="button" onClick={() => setSelectedUserId(user.id)} aria-pressed={selectedUserId === user.id}>
              <span className="access-avatar">{user.initials}</span>
              <span className="access-user-copy"><b>{user.name}</b><small>{user.role}</small><em>{displayAssetText(user.scope)}</em></span>
              <Badge tone="neutral">PROFIL DÉMO</Badge>
            </button>
          </article>)}
        </div>
      </Card>

      <Card as="section" className="access-action-panel">
        {audience === 'administration' ? <div className="access-action-tabs" role="tablist" aria-label="Actions de gestion des accès"><button type="button" role="tab" aria-selected={adminAction === 'create'} className={adminAction === 'create' ? 'active' : ''} onClick={() => {setAdminAction('create');setConfirmation('');setFieldErrors({})}}>Préparer un compte</button><button type="button" role="tab" aria-selected={adminAction === 'disable'} className={adminAction === 'disable' ? 'active' : ''} onClick={() => {setAdminAction('disable');setConfirmation('');setFieldErrors({})}}>Préparer une désactivation</button></div> : null}

        <form className="access-form" onSubmit={submit} noValidate>
          <div className="access-form-heading"><p className="design-kicker">{audience === 'administration' ? adminAction === 'create' ? 'CRÉATION' : 'DÉSACTIVATION' : 'PROPOSITION FACILITY MANAGER'}</p><h3>{audience === 'administration' ? adminAction === 'create' ? 'Préparer un nouvel accès' : 'Préparer une désactivation' : 'Proposer un rôle ou un périmètre'}</h3><p>Aucune action de ce formulaire ne modifie Supabase Auth, les RLS ou les utilisateurs réels.</p></div>

          {audience === 'administration' && adminAction === 'create' ? <>
            <Field label="Nom complet" size="standard" error={fieldErrors.name}><input value={name} aria-invalid={Boolean(fieldErrors.name)} onChange={(event) => {setName(event.target.value);setFieldErrors((current) => ({ ...current, name: undefined }))}} placeholder="Prénom et nom" /></Field>
            <Field label="Email professionnel" size="standard" error={fieldErrors.email}><input type="email" value={email} aria-invalid={Boolean(fieldErrors.email)} onChange={(event) => {setEmail(event.target.value);setFieldErrors((current) => ({ ...current, email: undefined }))}} placeholder="nom@entreprise.com" /></Field>
          </> : <Field label="Profil concerné" size="select" error={fieldErrors.selectedUserId}><Select value={selectedUserId} onChange={(event) => {setSelectedUserId(event.target.value);setFieldErrors((current) => ({ ...current, selectedUserId: undefined }))}}>{users.filter((user) => user.id !== 'administration').map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select></Field>}

          {(audience === 'facility' || adminAction === 'create') && <div className="access-form-grid">
            <Field label={audience === 'facility' ? 'Rôle proposé' : 'Rôle'} size="select"><Select value={role} onChange={(event) => setRole(event.target.value)}><option>Agent terrain</option><option>Facility Manager</option><option>Agente & assistante</option>{audience === 'administration' && <option>Administration</option>}</Select></Field>
            <Field label={audience === 'facility' ? 'Périmètre proposé' : 'Périmètre'} size="select"><Select value={scope} onChange={(event) => setScope(event.target.value)}><option>Périmètre à confirmer</option><option value="DEMO-GE · DEMO-ASC-1 · DEMO-ASC-2">{displayAssetText('DEMO-GE · DEMO-ASC-1 · DEMO-ASC-2')}</option><option value="DEMO-GE">{displayAssetCode('DEMO-GE')}</option><option value="DEMO-EAU · DEMO-SSI · DEMO-ESP">{displayAssetText('DEMO-EAU · DEMO-SSI · DEMO-ESP')}</option><option value="DEMO-RND">{displayAssetCode('DEMO-RND')}</option><option>Tous périmètres</option></Select></Field>
          </div>}

          <Field label="Justification" size="long" error={fieldErrors.reason}><textarea value={reason} maxLength={1000} aria-invalid={Boolean(fieldErrors.reason)} onChange={(event) => {setReason(event.target.value);setFieldErrors((current) => ({ ...current, reason: undefined }))}} placeholder={audience === 'facility' ? 'Expliquez le besoin métier et le périmètre demandé.' : adminAction === 'create' ? 'Expliquez pourquoi cet accès doit être créé.' : 'Expliquez pourquoi cet accès doit être désactivé.'} /></Field>

          <div className="access-security-note" role="note"><BrandIcon name="lock" size={18} /><p><b>Exécution sécurisée hors du navigateur</b></p></div>
          {confirmation && <div className="access-confirmation" role="status"><span aria-hidden="true">✓</span>{confirmation}</div>}
          <Button type="submit">{audience === 'facility' ? 'Envoyer la proposition' : adminAction === 'create' ? 'Préparer la création' : 'Préparer la désactivation'}</Button>
          <small className="access-simulation-note">Simulation locale · aucun compte, rôle ou périmètre réel n’est modifié.</small>
        </form>
      </Card>
    </div>
  </section>;
}
