'use client';

import { FormEvent, useState } from 'react';

import { Badge, Button, Card, Field, Select } from './ui';

export type AccessWorkspaceUser = {
  id:string;
  name:string;
  initials:string;
  role:string;
  scope:string;
};

type AdminAction = 'create' | 'disable';

export function AccessWorkspace({ users, audience }: {
  users:AccessWorkspaceUser[];
  audience:'administration' | 'facility';
}) {
  const [adminAction, setAdminAction] = useState<AdminAction>('create');
  const [selectedUserId, setSelectedUserId] = useState(users.find((user) => user.id !== 'administration')?.id ?? users[0]?.id ?? '');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Agent terrain');
  const [scope, setScope] = useState('Périmètre à confirmer');
  const [reason, setReason] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const uniqueRoles = new Set(users.map((user) => user.role)).size;
  const selectedUser = users.find((user) => user.id === selectedUserId);

  const submit = (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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

  return <section className="access-workspace" aria-labelledby="access-workspace-title">
    <header className="access-workspace-hero">
      <div>
        <p className="design-kicker">ADMINISTRATION</p>
        <h2 id="access-workspace-title" className="visually-hidden">Utilisateurs et droits</h2>
        <p>{audience === 'administration' ? 'Préparez la création ou la désactivation d’un accès. L’exécution réelle restera un traitement serveur sécurisé.' : 'Consultez les profils métier et proposez un rôle ou un périmètre. Seule l’Administration peut appliquer la modification.'}</p>
      </div>
      <Badge tone={audience === 'administration' ? 'blue' : 'neutral'}>{audience === 'administration' ? 'GESTION ADMINISTRATION' : 'PROPOSITION UNIQUEMENT'}</Badge>
    </header>

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
              <span className="access-user-copy"><b>{user.name}</b><small>{user.role}</small><em>{user.scope}</em></span>
              <Badge tone="neutral">PROFIL DÉMO</Badge>
            </button>
          </article>)}
        </div>
      </Card>

      <Card as="section" className="access-action-panel">
        {audience === 'administration' ? <div className="access-action-tabs" role="tablist" aria-label="Actions de gestion des accès"><button type="button" role="tab" aria-selected={adminAction === 'create'} className={adminAction === 'create' ? 'active' : ''} onClick={() => {setAdminAction('create');setConfirmation('')}}>Préparer un compte</button><button type="button" role="tab" aria-selected={adminAction === 'disable'} className={adminAction === 'disable' ? 'active' : ''} onClick={() => {setAdminAction('disable');setConfirmation('')}}>Préparer une désactivation</button></div> : null}

        <form className="access-form" onSubmit={submit}>
          <div className="access-form-heading"><p className="design-kicker">{audience === 'administration' ? adminAction === 'create' ? 'CRÉATION' : 'DÉSACTIVATION' : 'PROPOSITION FACILITY MANAGER'}</p><h3>{audience === 'administration' ? adminAction === 'create' ? 'Préparer un nouvel accès' : 'Préparer une désactivation' : 'Proposer un rôle ou un périmètre'}</h3><p>Aucune action de ce formulaire ne modifie Supabase Auth, les RLS ou les utilisateurs réels.</p></div>

          {audience === 'administration' && adminAction === 'create' ? <>
            <Field label="Nom complet"><input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Prénom et nom" /></Field>
            <Field label="Email professionnel"><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="nom@entreprise.com" /></Field>
          </> : <Field label="Profil concerné"><Select required value={selectedUserId} onChange={(event) => setSelectedUserId(event.target.value)}>{users.filter((user) => user.id !== 'administration').map((user) => <option key={user.id} value={user.id}>{user.name}</option>)}</Select></Field>}

          {(audience === 'facility' || adminAction === 'create') && <div className="access-form-grid">
            <Field label={audience === 'facility' ? 'Rôle proposé' : 'Rôle'}><Select value={role} onChange={(event) => setRole(event.target.value)}><option>Agent terrain</option><option>Facility Manager</option><option>Agente & assistante</option>{audience === 'administration' && <option>Administration</option>}</Select></Field>
            <Field label={audience === 'facility' ? 'Périmètre proposé' : 'Périmètre'}><Select value={scope} onChange={(event) => setScope(event.target.value)}><option>Périmètre à confirmer</option><option>DEMO-GE</option><option>DEMO-EAU · DEMO-SSI · DEMO-ESP</option><option>DEMO-RND</option><option>Tous périmètres</option></Select></Field>
          </div>}

          <Field label="Justification"><textarea required value={reason} onChange={(event) => setReason(event.target.value)} placeholder={audience === 'facility' ? 'Expliquez le besoin métier et le périmètre demandé.' : adminAction === 'create' ? 'Expliquez pourquoi cet accès doit être créé.' : 'Expliquez pourquoi cet accès doit être désactivé.'} /></Field>

          <div className="access-security-note" role="note"><span aria-hidden="true">⌘</span><p><b>Exécution sécurisée hors du navigateur</b><small>La cible réelle devra contrôler l’auteur, le rôle, le périmètre et la justification côté serveur, puis historiser le résultat.</small></p></div>
          {confirmation && <div className="access-confirmation" role="status"><span aria-hidden="true">✓</span>{confirmation}</div>}
          <Button type="submit">{audience === 'facility' ? 'Envoyer la proposition' : adminAction === 'create' ? 'Préparer la création' : 'Préparer la désactivation'}</Button>
          <small className="access-simulation-note">Simulation locale · aucun compte, rôle ou périmètre réel n’est modifié.</small>
        </form>
      </Card>
    </div>
  </section>;
}
