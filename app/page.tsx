'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';

import { AntiZombieSummary } from './components/AntiZombieSummary';
import type { AntiZombieSummaryData } from './components/anti-zombie-contract';
import { WorkflowAnalytics } from './components/WorkflowAnalytics';
import { getAuthenticatedProfileGate, resolveAuthenticatedPersona } from './lib/supabase/auth';
import { getBrowserSupabaseClient, setSupabaseRememberPreference } from './lib/supabase/client';
import { getSupabaseIntegrationState, isSupabaseIntegrationEnabled } from './lib/supabase/config';
import { loadOperationalSnapshot, type OperationalVendor } from './lib/supabase/data';
import { advanceAnomalyWorkflow, uploadAnomalyProof, uploadVendorInterventionReport, verifyLatestAnomalyProof } from './lib/supabase/mutations';

type View = 'workspace' | 'dashboard' | 'registry' | 'manager' | 'report' | 'detail';
type Priority = 'Critique' | 'Haute' | 'Moyenne' | 'Faible';
type Status = 'À qualifier' | 'Affectée' | 'En intervention' | 'En validation' | 'Clôturée';
type ManagerQueue = 'qualify'|'late'|'unassigned'|'proof'|'reception'|'reservations'|'reopened';
type PersonaId = 'facility' | 'administration' | 'electricite' | 'eau_incendie' | 'rondes_assistance';
type DecisionState = 'À décider' | 'Approuvée' | 'Refusée' | 'Renvoyée à Facility Manager';
type AuthScreen = 'login' | 'forgot' | 'invite';

type DemoAccount = {
  personaId: PersonaId;
  email: string;
  password: string;
  destination: string;
};

type DemoSession = {
  personaId: PersonaId;
  remember: boolean;
  issuedAt: string;
  mode: 'demo' | 'supabase';
  userId?: string;
  email?: string;
};

type PasswordChangeRequirement = {
  userId: string;
  email: string;
  displayName: string;
};

type Persona = {
  id: PersonaId;
  name: string;
  shortName: string;
  initials: string;
  role: string;
  scope: string;
};

type Escalation = {
  id: string;
  anomaly: string;
  asset: string;
  title: string;
  kind: 'Risque' | 'Coût' | 'Arbitrage' | 'Clôture sensible';
  amount?: number;
  due: string;
  risk: string;
  recommendation: string;
  state: DecisionState;
  motive?: string;
};

type FieldRequest = {
  id: string;
  from: string;
  subject: string;
  note: string;
  status: 'À traiter par Facility Manager' | 'Complément transmis' | 'Transmise à Direction';
};

type Anomaly = {
  id: string;
  asset: string;
  title: string;
  location: string;
  priority: Priority;
  status: Status;
  reported: string;
  due: string;
  owner: string;
  delayed: boolean;
  proof: boolean;
  proofPending?: boolean;
  description: string;
};

type VendorReportInput = {
  anomalyReference:string;
  vendorCode:string;
  file:File;
  reportType:'intervention_report'|'pv'|'quote'|'photo_bundle';
  reportDate:string;
  summary:string;
  reserveNotes?:string;
  costAmount?:number;
};

type EquipmentItem = {
  code:string;
  label:string;
  health:number;
  state:string;
};

const seedAnomalies: Anomaly[] = [
  { id:'ANO-0241', asset:'DEMO-SSI', title:'Pression réseau incendie instable', location:'Sous-sol · Local incendie', priority:'Critique', status:'À qualifier', reported:'24 août · 07:36', due:'Aujourd’hui · 12:00', owner:'Non affectée', delayed:false, proof:false, description:'Variations de pression constatées pendant le test matinal. Le manomètre oscille entre 5,8 et 7,2 bars sans sollicitation du réseau.' },
  { id:'ANO-0238', asset:'DEMO-ASC-2', title:'Arrêts intermittents au niveau R+7', location:'Tour A · Ascenseur 2', priority:'Haute', status:'Affectée', reported:'23 août · 08:15', due:'23 août · 18:00', owner:'PREST-ASC', delayed:true, proof:false, description:'Deux arrêts non programmés signalés au niveau R+7. Redémarrage automatique après environ trente secondes.' },
  { id:'ANO-0234', asset:'DEMO-EAU', title:'Fuite légère au collecteur', location:'Sous-sol · Local surpresseur', priority:'Moyenne', status:'En intervention', reported:'21 août · 16:42', due:'22 août · 15:00', owner:'PREST-EAU', delayed:true, proof:false, description:'Suintement visible au raccord du collecteur principal. Bac de rétention en place, sans impact sur la distribution.' },
  { id:'ANO-0231', asset:'DEMO-GE', title:'Batterie de démarrage sous tension nominale', location:'RDC · Local groupe', priority:'Critique', status:'En validation', reported:'20 août · 11:20', due:'21 août · 10:00', owner:'PREST-GE', delayed:true, proof:true, description:'La batterie mesurée à 11,6 V a été remplacée. Le test de démarrage est concluant, preuve en attente de validation FM.' },
  { id:'ANO-0229', asset:'DEMO-ESP', title:'Électrovanne zone jardin bloquée', location:'Extérieur · Jardin nord', priority:'Faible', status:'Clôturée', reported:'19 août · 09:05', due:'20 août · 17:00', owner:'PREST-ESP', delayed:false, proof:true, description:'Électrovanne nettoyée et remise en service. Cycle d’arrosage contrôlé sur vingt minutes.' },
  { id:'ANO-0226', asset:'DEMO-ASC-1', title:'Éclairage cabine défaillant', location:'Tour A · Ascenseur 1', priority:'Moyenne', status:'Clôturée', reported:'18 août · 14:30', due:'19 août · 12:00', owner:'PREST-ASC', delayed:false, proof:true, description:'Bloc LED remplacé et essai d’éclairage de secours réalisé.' },
  { id:'ANO-0222', asset:'DEMO-RND', title:'Porte coupe-feu maintenue ouverte', location:'R+4 · Circulation Est', priority:'Haute', status:'À qualifier', reported:'24 août · 06:58', due:'Aujourd’hui · 14:00', owner:'Non affectée', delayed:false, proof:false, description:'Le ferme-porte ne ramène plus complètement le vantail. Zone balisée pendant la ronde.' },
  { id:'ANO-0218', asset:'DEMO-GE', title:'Niveau carburant inférieur au seuil', location:'RDC · Local groupe', priority:'Moyenne', status:'Affectée', reported:'17 août · 10:10', due:'Aujourd’hui · 17:00', owner:'PREST-GE', delayed:false, proof:false, description:'Niveau à 28 %, demande de réapprovisionnement transmise au prestataire.' },
];

const personas: Persona[] = [
  { id:'facility', name:'Facility Manager Démo', shortName:'Facility Manager', initials:'FM', role:'Facility Manager', scope:'Pilotage opérationnel et qualification' },
  { id:'administration', name:'Administration Démo', shortName:'Administration', initials:'AD', role:'Administration · Super utilisateur métier', scope:'Arbitrages, risques et engagements' },
  { id:'electricite', name:'Agent Électricité Démo', shortName:'Agent Électricité', initials:'AE', role:'Agent électricité', scope:'DEMO-GE · toutes zones autorisées' },
  { id:'eau_incendie', name:'Agent Eau & Incendie Démo', shortName:'Agent Eau & Incendie', initials:'AI', role:'Agent eau / incendie', scope:'DEMO-EAU · DEMO-SSI · DEMO-ESP' },
  { id:'rondes_assistance', name:'Agente Rondes & Assistance Démo', shortName:'Agente Rondes & Assistance', initials:'RA', role:'Agente & assistante de direction', scope:'Cleaning · jardinage · suivi administratif' },
];

// The persona switcher and browser storage below are limited to explicit demo mode.
// When enabled, Supabase Auth resolves the persona from the RLS-protected business profile.
const DEMO_PASSWORD = 'Behira-Design-Demo-2026!';
const SESSION_KEY = 'behira_demo_session_v1';
const demoAccounts: DemoAccount[] = [
  { personaId:'administration', email:'direction@demo.behira.invalid', password:DEMO_PASSWORD, destination:'Espace Direction' },
  { personaId:'facility', email:'facility.manager@demo.behira.invalid', password:DEMO_PASSWORD, destination:'Facility Manager' },
  { personaId:'electricite', email:'electricite@demo.behira.invalid', password:DEMO_PASSWORD, destination:'Espace Agent Électricité' },
  { personaId:'eau_incendie', email:'eau.incendie@demo.behira.invalid', password:DEMO_PASSWORD, destination:'Espace Agent Eau & Incendie' },
  { personaId:'rondes_assistance', email:'rondes@demo.behira.invalid', password:DEMO_PASSWORD, destination:'Espace Agente Rondes & Assistance' },
];

const allowedViewsByPersona: Record<PersonaId, View[]> = {
  facility:['workspace','dashboard','registry','manager','report'],
  administration:['workspace','dashboard','registry'],
  electricite:['workspace','report'],
  eau_incendie:['workspace','report'],
  rondes_assistance:['workspace','report'],
};

const landingViewByPersona: Record<PersonaId, View> = {
  facility:'manager',
  administration:'workspace',
  electricite:'workspace',
  eau_incendie:'workspace',
  rondes_assistance:'workspace',
};

const seedEscalations: Escalation[] = [
  { id:'DEC-018', anomaly:'ANO-0241', asset:'DEMO-SSI', title:'Valider le maintien en service sous surveillance', kind:'Risque', due:'Aujourd’hui · 10:30', risk:'Sécurité incendie · impact critique', recommendation:'Maintenir sous surveillance 24 h avec contrôle PREST-SSI.', state:'À décider' },
  { id:'DEC-017', anomaly:'ANO-0231', asset:'DEMO-GE', title:'Remplacement préventif du banc batteries', kind:'Coût', amount:2400000, due:'Aujourd’hui · 15:00', risk:'Continuité électrique · CAPEX', recommendation:'Remplacer maintenant plutôt que multiplier les maintenances curatives.', state:'À décider' },
  { id:'DEC-016', anomaly:'ANO-0238', asset:'DEMO-ASC-2', title:'Arbitrer intervention interne ou PREST-ASC', kind:'Arbitrage', amount:950000, due:'En retard · 23 août', risk:'Perte de redondance ascenseurs', recommendation:'Confier le diagnostic à PREST-ASC et conserver Agent Électricité en appui.', state:'À décider' },
  { id:'DEC-015', anomaly:'ANO-0234', asset:'DEMO-EAU', title:'Validation finale de clôture après récidive', kind:'Clôture sensible', amount:1900000, due:'Aujourd’hui · 17:00', risk:'Deux réarmements provisoires · OPEX élevé', recommendation:'Refuser la clôture tant que la cause racine et le PV ne sont pas fournis.', state:'À décider' },
  { id:'DEC-014', anomaly:'ANO-0226', asset:'DEMO-ASC-1', title:'Clôture finale après risque usager', kind:'Clôture sensible', due:'Décidée le 22 août', risk:'Preuves PREST-ASC conformes', recommendation:'Clôturer avec suivi de récurrence à 30 jours.', state:'Approuvée', motive:'Preuves complètes et essai de sécurité concluant.' },
];

type NavigationGroup = 'Mon travail' | 'Le bâtiment' | 'Pilotage' | 'Administration';
type NavigationItem = { key:Exclude<View,'detail'>; label:string; group:NavigationGroup };

/* Une seule source alimente le bandeau desktop et la barre mobile. Les groupes
   reprennent mot pour mot DEC-002 afin que le futur menu de débordement ne crée
   pas une nomenclature parallèle. */
const navItems: NavigationItem[] = [
  { key:'workspace', label:'Mon espace', group:'Mon travail' },
  { key:'manager', label:'À traiter', group:'Mon travail' },
  { key:'report', label:'Mes rondes', group:'Mon travail' },
  { key:'registry', label:'Anomalies', group:'Le bâtiment' },
  { key:'dashboard', label:'Vue d’ensemble', group:'Pilotage' },
];
const navigationGroups: NavigationGroup[] = ['Mon travail','Le bâtiment','Pilotage','Administration'];

function NavigationIcon({ view }: { view:NavigationItem['key'] }) {
  const common = { fill:'none', stroke:'currentColor', strokeWidth:1.8, strokeLinecap:'round' as const, strokeLinejoin:'round' as const };
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    {view === 'workspace' && <><path {...common} d="M4 5.5h16v13H4z"/><path {...common} d="M8 9h8M8 13h5"/></>}
    {view === 'dashboard' && <><path {...common} d="M4 13h6v7H4zM14 4h6v16h-6zM4 4h6v5H4z"/></>}
    {view === 'registry' && <><path {...common} d="M8 6h12M8 12h12M8 18h12"/><path {...common} d="M4 6h.01M4 12h.01M4 18h.01"/></>}
    {view === 'manager' && <><circle {...common} cx="12" cy="12" r="8"/><path {...common} d="M12 8v4l3 2"/></>}
    {view === 'report' && <><path {...common} d="M7 4h10v16H7zM9.5 4V2.8h5V4"/><path {...common} d="m9.5 12 1.7 1.7 3.6-4"/></>}
  </svg>;
}

const fallbackEquipment: EquipmentItem[] = [
  { code:'DEMO-GE', label:'Groupe électrogène', health:86, state:'Surveillance' },
  { code:'DEMO-EAU', label:'Surpresseur', health:78, state:'Intervention' },
  { code:'DEMO-SSI', label:'Pompe incendie', health:61, state:'Critique' },
  { code:'DEMO-ASC-1/2', label:'Ascenseurs', health:84, state:'Surveillance' },
  { code:'DEMO-ESP', label:'Irrigation', health:98, state:'Sain' },
  { code:'DEMO-RND', label:'Rondes & constats', health:93, state:'Sain' },
];

function Badge({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  const icons: Record<string,string> = { critical:'!', high:'!', orange:'◆', medium:'•', low:'•', success:'✓', blue:'↗', purple:'⌁', neutral:'○' };
  return <span className={`badge badge-${tone}`}><span className="badge-icon" aria-hidden="true">{icons[tone] ?? '•'}</span><span className="badge-label">{children}</span></span>;
}

const personaGroups: { label:string; ids:PersonaId[] }[] = [
  { label:'Administration', ids:['administration'] },
  { label:'Management', ids:['facility'] },
  { label:'Terrain', ids:['electricite','eau_incendie','rondes_assistance'] },
];

const fallbackVendors: OperationalVendor[] = [
  { code:'PREST-GE', label:'PREST-GE' },
  { code:'PREST-ASC', label:'PREST-ASC' },
  { code:'PREST-SSI', label:'PREST-SSI' },
  { code:'PREST-ESP', label:'PREST-ESP' },
];

function PersonaSwitcher({ value, onChange }: { value:PersonaId; onChange:(id:PersonaId)=>void }) {
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(0, personas.findIndex((item) => item.id === value));
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement|null>>([]);
  const selected = personas[selectedIndex];

  const focusOption = (index:number) => {
    const next = (index + personas.length) % personas.length;
    setActiveIndex(next);
    window.requestAnimationFrame(() => optionRefs.current[next]?.focus());
  };
  const show = (index = selectedIndex) => {
    setOpen(true);
    focusOption(index);
  };
  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const choose = (id:PersonaId) => {
    onChange(id);
    close();
  };

  useEffect(() => {
    if (!open) return;
    const handlePointer = (event:PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close(false);
    };
    document.addEventListener('pointerdown', handlePointer);
    return () => document.removeEventListener('pointerdown', handlePointer);
  }, [open]);

  const onTriggerKeyDown = (event:React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      show(event.key === 'ArrowDown' ? selectedIndex : selectedIndex - 1);
    }
  };
  const onListKeyDown = (event:React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOption(activeIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Home') {
      event.preventDefault(); focusOption(0);
    } else if (event.key === 'End') {
      event.preventDefault(); focusOption(personas.length - 1);
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault(); choose(personas[activeIndex].id);
    } else if (event.key === 'Escape') {
      event.preventDefault(); close();
    } else if (event.key === 'Tab') {
      setOpen(false);
    }
  };

  return <div className={`persona-switcher ${open ? 'is-open' : ''}`} ref={rootRef}>
    <span className="persona-mode-label"><span aria-hidden="true">DÉMO</span><span className="visually-hidden">Mode démonstration</span></span>
    <button ref={triggerRef} type="button" className="persona-trigger" aria-haspopup="listbox" aria-expanded={open} aria-controls="persona-listbox" onKeyDown={onTriggerKeyDown} onClick={() => open ? close(false) : show()}>
      <span className="persona-trigger-avatar">{selected.initials}</span>
      <span className="persona-trigger-copy"><b>{selected.name}</b><small>{selected.role}</small></span>
      <span className="persona-chevron" aria-hidden="true">⌄</span>
    </button>
    {open && <>
      <button type="button" className="persona-scrim" aria-label="Fermer le sélecteur de persona" onClick={() => close()} />
      <div className="persona-popover" role="listbox" id="persona-listbox" aria-label="Choisir un persona de démonstration" aria-activedescendant={`persona-option-${personas[activeIndex].id}`} onKeyDown={onListKeyDown}>
        <div className="persona-sheet-head"><div><b>Changer d’espace</b><small>Simulation locale, sans authentification</small></div><button type="button" onClick={() => close()} aria-label="Fermer">×</button></div>
        {personaGroups.map((group) => <div className="persona-group" role="group" aria-labelledby={`persona-group-${group.label}`} key={group.label}>
          <p id={`persona-group-${group.label}`}>{group.label}</p>
          {group.ids.map((id) => {
            const item = personas.find((persona) => persona.id === id)!;
            const index = personas.findIndex((persona) => persona.id === id);
            return <button ref={(node) => { optionRefs.current[index] = node; }} type="button" role="option" tabIndex={-1} id={`persona-option-${id}`} aria-selected={value === id} className={`persona-option ${activeIndex === index ? 'is-active' : ''}`} key={id} onMouseEnter={() => setActiveIndex(index)} onClick={() => choose(id)}>
              <span className="persona-option-avatar">{item.initials}</span>
              <span className="persona-option-copy"><b>{item.name}</b><small>{item.role}</small></span>
              <span className="persona-option-check" aria-hidden="true">{value === id ? '✓' : ''}</span>
            </button>;
          })}
        </div>)}
      </div>
    </>}
  </div>;
}

function priorityTone(priority: Priority) {
  return priority === 'Critique' ? 'critical' : priority === 'Haute' ? 'high' : priority === 'Moyenne' ? 'medium' : 'low';
}

function statusTone(status: Status) {
  return status === 'Clôturée' ? 'success' : status === 'En intervention' ? 'blue' : status === 'En validation' ? 'purple' : status === 'Affectée' ? 'orange' : 'neutral';
}

function expectedProofFor(anomaly:Anomaly) {
  return anomaly.asset === 'DEMO-EAU' ? 'Photo du manomètre et rapport d’intervention' : null;
}

function canonicalResponsible(anomaly:Anomaly) {
  if (anomaly.owner === 'Non affectée') return null;
  return personas.some((persona) => persona.name === anomaly.owner) ? anomaly.owner : null;
}

function externalActorConcerned(anomaly:Anomaly) {
  return anomaly.owner !== 'Non affectée' && !canonicalResponsible(anomaly) ? anomaly.owner : null;
}

function nextActionFor(anomaly:Anomaly) {
  if (anomaly.status === 'Clôturée') return 'Aucune action — dossier clôturé';
  if (anomaly.status === 'À qualifier' && !canonicalResponsible(anomaly)) return 'Qualifier et affecter';
  if (anomaly.status === 'À qualifier' || anomaly.status === 'Affectée') return 'Réaliser et confirmer le diagnostic';
  if (anomaly.status === 'En intervention') return anomaly.proof ? 'Contrôler la réception' : 'Réaliser l’intervention et déposer la preuve';
  if (anomaly.status === 'En validation') return anomaly.proofPending || anomaly.proof ? 'Contrôler la preuve' : 'Déposer les preuves attendues';
  return 'Prochaine action non renseignée';
}

function adaptDossierToAntiZombieSummary(anomaly:Anomaly):AntiZombieSummaryData {
  return {
    dossierState:anomaly.status === 'Clôturée' ? 'Clôturé' : 'Ouvert',
    status:anomaly.status,
    responsible:canonicalResponsible(anomaly),
    nextAction:nextActionFor(anomaly),
    deadline:anomaly.due,
    slaLabel:anomaly.delayed && anomaly.status !== 'Clôturée' ? 'En retard' : 'Dans le délai',
    isDelayed:anomaly.delayed && anomaly.status !== 'Clôturée',
    isBlocked:false,
    blockingActor:null,
    blockingOrDelayReason:null,
    expectedProof:expectedProofFor(anomaly),
    expectedProofState:anomaly.proof ? 'Preuve déposée et acceptée' : anomaly.proofPending ? 'Preuve déposée · validation Facility Manager attendue' : 'Aucune preuve déposée',
    lastHistoryActivity:null,
  };
}

function AuthExperience({ onAuthenticate, onDemoAuthenticate, onForgot, onReset, supabaseMode, allowDemoFallback, environmentLabel }: {
  onAuthenticate:(personaId:PersonaId, remember:boolean, email:string, password:string)=>Promise<void>;
  onDemoAuthenticate:(personaId:PersonaId, remember:boolean)=>Promise<void>;
  onForgot:(email:string)=>Promise<void>;
  onReset:()=>void;
  supabaseMode:boolean;
  allowDemoFallback:boolean;
  environmentLabel:string;
}) {
  const [screen, setScreen] = useState<AuthScreen>('login');
  const [email, setEmail] = useState(demoAccounts[1].email);
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [status, setStatus] = useState<'idle'|'loading'|'error'|'success'>('idle');
  const [message, setMessage] = useState('');
  const [forgotSent, setForgotSent] = useState(false);
  const [invitePassword, setInvitePassword] = useState('');
  const [inviteConfirm, setInviteConfirm] = useState('');
  const [inviteAccepted, setInviteAccepted] = useState(false);

  const switchScreen = (next:AuthScreen) => {
    setScreen(next); setStatus('idle'); setMessage(''); setForgotSent(false);
  };
  const chooseAccount = (account:DemoAccount) => {
    setEmail(account.email); setPassword(account.password); setStatus('idle'); setMessage('');
  };
  const openDemoAccount = async (account:DemoAccount) => {
    setStatus('loading'); setMessage(`Ouverture de ${account.destination} en mode démonstration…`);
    try {
      await onDemoAuthenticate(account.personaId, true);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'La démonstration ne peut pas être ouverte.');
    }
  };
  const resetInterface = () => {
    onReset(); setScreen('login'); setEmail(demoAccounts[1].email); setPassword(DEMO_PASSWORD); setRemember(true);
    setInvitePassword(''); setInviteConfirm(''); setInviteAccepted(false); setForgotSent(false);
    setStatus('success'); setMessage('Démonstration réinitialisée. Vous pouvez repartir avec un compte fictif.');
  };
  const submitLogin = async (event:FormEvent) => {
    event.preventDefault();
    const account = demoAccounts.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setStatus('error'); setMessage('Saisissez une adresse email valide.'); return; }
    if (!password) { setStatus('error'); setMessage('Saisissez votre mot de passe.'); return; }
    if (!supabaseMode && (!account || password !== account.password)) { setStatus('error'); setMessage('Identifiants non reconnus. Utilisez un compte fictif affiché à droite.'); return; }
    setStatus('loading'); setMessage(supabaseMode ? `Vérification par ${environmentLabel}…` : 'Vérification locale du compte…');
    try {
      await onAuthenticate(account?.personaId ?? 'facility', remember, email.trim(), password);
      setStatus('success');
      setMessage(supabaseMode ? `Session ${environmentLabel} ouverte. Chargement de votre espace autorisé.` : `Connexion simulée réussie. Ouverture de ${account?.destination}.`);
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Connexion locale impossible.');
    }
  };
  const submitForgot = async (event:FormEvent) => {
    event.preventDefault();
    if (!email.trim() || !/^\S+@\S+\.\S+$/.test(email)) { setStatus('error'); setMessage('Saisissez une adresse email valide.'); return; }
    setStatus('loading'); setMessage(supabaseMode ? 'Préparation sécurisée de la réinitialisation…' : 'Préparation de l’envoi simulé…');
    try {
      await onForgot(email.trim());
      setForgotSent(true); setStatus('success');
      setMessage(supabaseMode ? 'Si un compte actif correspond à cette adresse, les instructions de réinitialisation seront envoyées.' : 'Instructions simulées envoyées. Aucun email réel n’a été transmis.');
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'Demande impossible.');
    }
  };
  const passwordRules = {
    length: invitePassword.length >= 12,
    upper: /[A-Z]/.test(invitePassword),
    lower: /[a-z]/.test(invitePassword),
    number: /\d/.test(invitePassword),
    symbol: /[^A-Za-z0-9]/.test(invitePassword),
  };
  const inviteValid = Object.values(passwordRules).every(Boolean) && invitePassword === inviteConfirm && inviteAccepted;
  const submitInvite = (event:FormEvent) => {
    event.preventDefault();
    if (!inviteValid) { setStatus('error'); setMessage('Respectez toutes les règles, confirmez le mot de passe et acceptez les conditions de démonstration.'); return; }
    setStatus('loading'); setMessage('Activation locale de l’invitation…');
    window.setTimeout(() => {
      setStatus('success'); setMessage('Compte invité activé. Ouverture de l’espace Rondes & constats.');
      window.setTimeout(() => onAuthenticate('rondes_assistance', true), 550);
    }, 550);
  };

  return <main className="auth-shell">
    <section className="auth-brand-panel" aria-label="Présentation BEHIRA">
      <div className="auth-brand"><span className="brand-mark">B</span><span>BEHIRA<small>FM / GB TRACK</small></span></div>
      <div className="auth-brand-copy"><span className="auth-kicker">PILOTAGE TECHNIQUE & MAINTENANCE</span><h1>Une vision claire du bâtiment, jusqu’à la preuve.</h1><p>Centralisez les constats, priorisez les risques et suivez chaque intervention jusqu’à sa clôture.</p></div>
      <div className="auth-cycle"><span>Constat</span><i>→</i><span>Qualification</span><i>→</i><span>Décision</span><i>→</i><span>Intervention</span><i>→</i><span>Preuve</span><i>→</i><span>Clôture</span></div>
      <small className="auth-local-note">{supabaseMode ? `${environmentLabel} prêt · mode démonstration conservé` : 'Prototype local · authentification et données simulées'}</small>
    </section>

    <section className="auth-main">
      <div className="auth-mobile-brand"><span className="brand-mark">B</span><span>BEHIRA<small>FM / GB TRACK</small></span></div>
      <div className="auth-card">
        {screen === 'login' && <>
          <div className="auth-heading"><span className="auth-mode-chip">{supabaseMode ? environmentLabel.toUpperCase() : 'DÉMONSTRATION LOCALE'}</span><h2>Bienvenue</h2><p>Connectez-vous à votre espace BEHIRA.</p></div>
          <form className="auth-form" onSubmit={submitLogin} noValidate>
            <label className="auth-field">Email professionnel<input type="email" autoComplete="username" value={email} onChange={(event) => {setEmail(event.target.value);setStatus('idle')}} aria-invalid={status === 'error'} aria-describedby="auth-message" placeholder="nom@organisation.com" /></label>
            <label className="auth-field">Mot de passe<span className="password-control"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => {setPassword(event.target.value);setStatus('idle')}} aria-invalid={status === 'error'} aria-describedby="auth-message" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? 'Masquer' : 'Afficher'}</button></span></label>
            <div className="auth-form-options"><label className="check-control"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Se souvenir de moi</span></label><button type="button" className="auth-link" onClick={() => switchScreen('forgot')}>Mot de passe oublié ?</button></div>
            {message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : status === 'success' ? '✓' : '•'}</span>{message}</div>}
            <button className="primary-button auth-submit" type="submit" disabled={status === 'loading' || status === 'success'}>{status === 'loading' ? 'Connexion…' : status === 'success' ? 'Connecté ✓' : 'Se connecter'}</button>
          </form>
          {!supabaseMode && <button type="button" className="invite-link" onClick={() => switchScreen('invite')}>Première connexion ? Activer une invitation</button>}
        </>}

        {screen === 'forgot' && <>
          <button type="button" className="auth-back" onClick={() => switchScreen('login')}>← Retour à la connexion</button>
          <div className="auth-heading"><span className="auth-mode-chip">ASSISTANCE</span><h2>Mot de passe oublié</h2><p>{supabaseMode ? 'Recevez un lien sécurisé de réinitialisation si votre compte est actif.' : 'Recevez les instructions de réinitialisation — envoi simulé uniquement.'}</p></div>
          {!forgotSent ? <form className="auth-form" onSubmit={submitForgot} noValidate><label className="auth-field">Email professionnel<input type="email" value={email} onChange={(event) => {setEmail(event.target.value);setStatus('idle')}} aria-invalid={status === 'error'} aria-describedby="auth-message" /></label>{message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : '•'}</span>{message}</div>}<button className="primary-button auth-submit" disabled={status === 'loading'}>{status === 'loading' ? 'Envoi…' : 'Envoyer les instructions'}</button></form> : <div className="auth-confirmation" role="status"><span>✓</span><h3>Demande prise en compte</h3><p>{message}</p><small>Adresse indiquée : {email}</small><button className="primary-button" onClick={() => switchScreen('login')}>Retour à la connexion</button></div>}
        </>}

        {screen === 'invite' && <>
          <button type="button" className="auth-back" onClick={() => switchScreen('login')}>← Retour à la connexion</button>
          <div className="auth-heading"><span className="auth-mode-chip">INVITATION DE DÉMONSTRATION</span><h2>Activez votre compte</h2><p>Compte invité : <b>Agente Rondes & Assistance Démo</b><br />Rôle : Rondes & constats · périmètre DEMO-RND</p></div>
          <form className="auth-form" onSubmit={submitInvite} noValidate>
            <label className="auth-field">Créer un mot de passe<input type="password" autoComplete="new-password" value={invitePassword} onChange={(event) => {setInvitePassword(event.target.value);setStatus('idle')}} aria-describedby="password-rules auth-message" /></label>
            <label className="auth-field">Confirmer le mot de passe<input type="password" autoComplete="new-password" value={inviteConfirm} onChange={(event) => {setInviteConfirm(event.target.value);setStatus('idle')}} aria-invalid={Boolean(inviteConfirm && inviteConfirm !== invitePassword)} /></label>
            <ul className="password-rules" id="password-rules" aria-label="Règles de robustesse"><li className={passwordRules.length ? 'valid' : ''}>12 caractères minimum</li><li className={passwordRules.upper && passwordRules.lower ? 'valid' : ''}>Majuscule et minuscule</li><li className={passwordRules.number ? 'valid' : ''}>Au moins un chiffre</li><li className={passwordRules.symbol ? 'valid' : ''}>Au moins un symbole</li><li className={invitePassword && invitePassword === inviteConfirm ? 'valid' : ''}>Confirmation identique</li></ul>
            <label className="check-control invite-accept"><input type="checkbox" checked={inviteAccepted} onChange={(event) => setInviteAccepted(event.target.checked)} /><span>J’accepte l’activation simulée de ce compte fictif.</span></label>
            {message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : status === 'success' ? '✓' : '•'}</span>{message}</div>}
            <button className="primary-button auth-submit" disabled={status === 'loading' || status === 'success'}>{status === 'loading' ? 'Activation…' : status === 'success' ? 'Compte activé ✓' : 'Activer et accéder à mon espace'}</button>
          </form>
        </>}
      </div>

      <aside className="demo-accounts" aria-label="Comptes de démonstration">
        <div><span>{supabaseMode ? 'MODE DÉMONSTRATION DE SECOURS' : 'COMPTES DE DÉMONSTRATION'}</span><p>Profils fictifs en <code>.invalid</code> · {supabaseMode ? 'séparés de Supabase Auth et sans écriture distante' : 'session simulée'}.</p></div>
        {!supabaseMode && <p className="demo-password"><span>Mot de passe</span><b>{DEMO_PASSWORD}</b></p>}
        {(!supabaseMode || allowDemoFallback) && <div className="demo-account-grid">{demoAccounts.map((account) => {const person = personas.find((item) => item.id === account.personaId)!; return <button type="button" key={account.email} onClick={() => {if (supabaseMode) void openDemoAccount(account); else {chooseAccount(account);switchScreen('login')}}}><span>{person.initials}</span><div><b>{person.name}</b><small>{account.email}</small><em>{account.destination}</em></div><i>{supabaseMode ? 'Ouvrir la démo' : 'Utiliser'}</i></button>})}</div>}
        <div className="demo-reset"><p><b>{supabaseMode ? environmentLabel : 'Session locale uniquement'}</b><br />{supabaseMode ? 'Une connexion réelle impose le rôle du profil métier protégé par RLS. Le mode démo reste local.' : 'La sécurité réelle sera assurée par Supabase Auth et les politiques RLS.'}</p><button type="button" onClick={resetInterface}>Réinitialiser la démonstration</button></div>
      </aside>
    </section>
  </main>;
}

function RequiredPasswordChange({ requirement, onComplete, onSignOut }: {
  requirement:PasswordChangeRequirement;
  onComplete:(currentPassword:string, newPassword:string)=>Promise<void>;
  onSignOut:()=>Promise<void>;
}) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [status, setStatus] = useState<'idle'|'loading'|'error'>('idle');
  const [message, setMessage] = useState('');
  const rules = {
    length:newPassword.length >= 16,
    upper:/[A-Z]/.test(newPassword),
    lower:/[a-z]/.test(newPassword),
    number:/\d/.test(newPassword),
    symbol:/[^A-Za-z0-9]/.test(newPassword),
    different:Boolean(currentPassword) && newPassword !== currentPassword,
    match:Boolean(newPassword) && newPassword === confirmation,
  };
  const valid = Object.values(rules).every(Boolean);
  const submit = async (event:FormEvent) => {
    event.preventDefault();
    if (!currentPassword) { setStatus('error'); setMessage('Saisissez le mot de passe temporaire reçu.'); return; }
    if (!valid) { setStatus('error'); setMessage('Le nouveau mot de passe doit respecter toutes les règles affichées.'); return; }
    setStatus('loading'); setMessage('Mise à jour sécurisée du mot de passe…');
    try {
      await onComplete(currentPassword, newPassword);
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'Le mot de passe n’a pas pu être modifié.');
    }
  };

  return <main className="auth-shell">
    <section className="auth-brand-panel" aria-label="Présentation BEHIRA">
      <div className="auth-brand"><span className="brand-mark">B</span><span>BEHIRA<small>FM / GB TRACK</small></span></div>
      <div className="auth-brand-copy"><span className="auth-kicker">PREMIÈRE CONNEXION</span><h1>Protégez votre accès avant de continuer.</h1><p>Votre espace métier restera verrouillé jusqu’au remplacement du mot de passe temporaire.</p></div>
      <div className="auth-cycle"><span>Connexion</span><i>→</i><span>Nouveau mot de passe</span><i>→</i><span>Accès métier</span></div>
      <small className="auth-local-note">Contrôle assuré par Supabase Auth et les politiques RLS</small>
    </section>
    <section className="auth-main auth-main-single">
      <div className="auth-mobile-brand"><span className="brand-mark">B</span><span>BEHIRA<small>FM / GB TRACK</small></span></div>
      <div className="auth-card">
        <div className="auth-heading"><span className="auth-mode-chip">CHANGEMENT OBLIGATOIRE</span><h2>Créez votre mot de passe</h2><p>Compte : <b>{requirement.displayName}</b><br />{requirement.email}</p></div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <label className="auth-field">Mot de passe temporaire<input type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => {setCurrentPassword(event.target.value);setStatus('idle')}} aria-describedby="required-password-message" /></label>
          <label className="auth-field">Nouveau mot de passe<input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => {setNewPassword(event.target.value);setStatus('idle')}} aria-describedby="required-password-rules required-password-message" /></label>
          <label className="auth-field">Confirmer le nouveau mot de passe<input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => {setConfirmation(event.target.value);setStatus('idle')}} aria-invalid={Boolean(confirmation && confirmation !== newPassword)} /></label>
          <label className="check-control"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /><span>Afficher les mots de passe pendant la saisie</span></label>
          <ul className="password-rules" id="required-password-rules" aria-label="Règles de robustesse">
            <li className={rules.length ? 'valid' : ''}>16 caractères minimum</li><li className={rules.upper && rules.lower ? 'valid' : ''}>Majuscule et minuscule</li><li className={rules.number ? 'valid' : ''}>Au moins un chiffre</li><li className={rules.symbol ? 'valid' : ''}>Au moins un symbole</li><li className={rules.different ? 'valid' : ''}>Différent du temporaire</li><li className={rules.match ? 'valid' : ''}>Confirmation identique</li>
          </ul>
          {message && <div id="required-password-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : '•'}</span>{message}</div>}
          <button className="primary-button auth-submit" type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Sécurisation…' : 'Changer le mot de passe et continuer'}</button>
          <button className="auth-back required-password-signout" type="button" onClick={() => void onSignOut()}>Se déconnecter et revenir à l’accueil</button>
        </form>
      </div>
    </section>
  </main>;
}

export default function Home() {
  const supabaseIntegration = getSupabaseIntegrationState();
  const [session, setSession] = useState<DemoSession|null>(null);
  const [passwordChangeRequirement, setPasswordChangeRequirement] = useState<PasswordChangeRequirement|null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signOutConfirm, setSignOutConfirm] = useState(false);
  const signOutCancelRef = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<View>('workspace');
  const [previousView, setPreviousView] = useState<View>('registry');
  const [personaId, setPersonaId] = useState<PersonaId>('facility');
  const [anomalies, setAnomalies] = useState(seedAnomalies);
  const [equipmentItems, setEquipmentItems] = useState(fallbackEquipment);
  const [vendorReferences, setVendorReferences] = useState(fallbackVendors);
  const [canUploadVendorReport, setCanUploadVendorReport] = useState(false);
  const [dataState, setDataState] = useState<'demo'|'loading'|'live'|'fallback'>('demo');
  const [referenceCounts, setReferenceCounts] = useState({ anomalies:seedAnomalies.length, equipment:fallbackEquipment.length, zones:0, profiles:0 });
  const [escalations, setEscalations] = useState(seedEscalations);
  const [fieldRequests, setFieldRequests] = useState<FieldRequest[]>([
    { id:'REQ-031', from:'Agente Rondes & Assistance Démo', subject:'Infiltration légère · Atrium restaurant', note:'Photo ajoutée, origine à qualifier après la pluie.', status:'À traiter par Facility Manager' },
    { id:'REQ-030', from:'Agent Eau & Incendie Démo', subject:'DEMO-EAU · deuxième réarmement en 7 jours', note:'Service rétabli provisoirement, diagnostic demandé.', status:'À traiter par Facility Manager' },
  ]);
  const [selectedId, setSelectedId] = useState('ANO-0241');
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('Toutes');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [managerTab, setManagerTab] = useState<ManagerQueue>('qualify');
  const [toast, setToast] = useState('');
  const [mutationBusy, setMutationBusy] = useState(false);
  const [moreNavOpen, setMoreNavOpen] = useState(false);
  const moreNavRef = useRef<HTMLDivElement>(null);
  const moreNavTriggerRef = useRef<HTMLButtonElement>(null);
  const moreNavItemRefs = useRef<Array<HTMLButtonElement|null>>([]);

  useEffect(() => {
    const root = document.documentElement;
    const handleKeyboard = (event:KeyboardEvent) => {
      if (['Tab','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End'].includes(event.key)) root.classList.add('keyboard-nav');
    };
    const handlePointer = () => root.classList.remove('keyboard-nav');
    document.addEventListener('keydown', handleKeyboard);
    document.addEventListener('pointerdown', handlePointer);
    return () => {
      document.removeEventListener('keydown', handleKeyboard);
      document.removeEventListener('pointerdown', handlePointer);
      root.classList.remove('keyboard-nav');
    };
  }, []);

  useEffect(() => {
    if (session?.mode !== 'supabase') return;

    let cancelled = false;
    loadOperationalSnapshot(getBrowserSupabaseClient())
      .then((snapshot) => {
        if (cancelled) return;
        if (snapshot.anomalies.length) setAnomalies(snapshot.anomalies as Anomaly[]);
        if (snapshot.equipment.length) setEquipmentItems(snapshot.equipment);
        if (snapshot.vendors.length) setVendorReferences(snapshot.vendors);
        setCanUploadVendorReport(snapshot.canUploadVendorReport);
        setReferenceCounts(snapshot.counts);
        setDataState(snapshot.anomalies.length ? 'live' : 'fallback');
      })
      .catch(() => {
        if (!cancelled) { setDataState('fallback'); setCanUploadVendorReport(false); }
      });

    return () => { cancelled = true; };
  }, [session?.mode, session?.userId]);

  useEffect(() => {
    if (!signOutConfirm) return;
    const handleKey = (event:KeyboardEvent) => { if (event.key === 'Escape') setSignOutConfirm(false); };
    document.addEventListener('keydown', handleKey);
    window.requestAnimationFrame(() => signOutCancelRef.current?.focus());
    return () => document.removeEventListener('keydown', handleKey);
  }, [signOutConfirm]);

  useEffect(() => {
    if (!moreNavOpen) return;
    const closeOnPointer = (event:PointerEvent) => {
      if (!moreNavRef.current?.contains(event.target as Node)) setMoreNavOpen(false);
    };
    const closeOnEscape = (event:KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMoreNavOpen(false);
        window.requestAnimationFrame(() => moreNavTriggerRef.current?.focus());
      }
    };
    document.addEventListener('pointerdown', closeOnPointer);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOnPointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [moreNavOpen]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        if (isSupabaseIntegrationEnabled) {
          const client = getBrowserSupabaseClient();
          const { data, error } = await client.auth.getSession();
          if (error) throw error;
          if (data.session?.user) {
            const gate = await getAuthenticatedProfileGate(client);
            if (gate.mustChangePassword) {
              if (!cancelled) {
                setSession(null);
                setPasswordChangeRequirement({
                  userId:data.session.user.id,
                  email:data.session.user.email ?? '',
                  displayName:gate.displayName,
                });
              }
              return;
            }
            const resolvedPersona = await resolveAuthenticatedPersona(client, data.session.user.id) as PersonaId;
            if (!cancelled) {
              setDataState('loading');
              setSession({
                personaId: resolvedPersona,
                remember: true,
                issuedAt: data.session.user.last_sign_in_at ?? new Date().toISOString(),
                mode: 'supabase',
                userId: data.session.user.id,
                email: data.session.user.email,
              });
              setPersonaId(resolvedPersona);
              setView(landingViewByPersona[resolvedPersona]);
            }
          }
          if (data.session?.user) return;
          if (!supabaseIntegration.demoFallback) return;
        }

        const stored = window.localStorage.getItem(SESSION_KEY) ?? window.sessionStorage.getItem(SESSION_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as DemoSession;
          if (demoAccounts.some((account) => account.personaId === parsed.personaId)) {
            const restored = { ...parsed, mode:'demo' as const };
            setSession(restored); setPersonaId(restored.personaId); setView(landingViewByPersona[restored.personaId]);
          }
        }
      } catch {
        window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
      } finally {
        if (!cancelled) setAuthReady(true);
      }
    }, 0);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [supabaseIntegration.demoFallback]);

  const persona = personas.find((item) => item.id === personaId) ?? personas[0];
  const effectiveCanUploadVendorReport = session?.mode === 'demo'
    ? personaId === 'electricite' || personaId === 'eau_incendie'
    : canUploadVendorReport;
  const selected = anomalies.find((a) => a.id === selectedId) ?? anomalies[0];
  const filtered = useMemo(() => anomalies.filter((a) => {
    const haystack = `${a.id} ${a.asset} ${a.title} ${a.location}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (priorityFilter === 'Toutes' || a.priority === priorityFilter) && (statusFilter === 'Tous' || a.status === statusFilter);
  }), [anomalies, query, priorityFilter, statusFilter]);

  const navigate = (next: View) => {
    if (next !== 'detail' && !allowedViewsByPersona[personaId].includes(next)) {
      setToast('Accès masqué pour ce rôle de démonstration.');
      window.setTimeout(() => setToast(''), 3200);
      return;
    }
    setMoreNavOpen(false);
    setView(next);
    setToast('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const openDetail = (id: string, from: View = view) => {
    if (!anomalies.some((item) => item.id === id)) {
      setToast(`${id} provient d’une remontée terrain sans fiche anomalie liée.`);
      window.setTimeout(() => setToast(''), 3200);
      return;
    }
    setSelectedId(id); setPreviousView(from); navigate('detail');
  };
  const flash = (message: string) => { setToast(message); window.setTimeout(() => setToast(''), 3200); };
  const syncOperationalData = async () => {
    const snapshot = await loadOperationalSnapshot(getBrowserSupabaseClient());
    setAnomalies(snapshot.anomalies as Anomaly[]);
    setEquipmentItems(snapshot.equipment);
    setVendorReferences(snapshot.vendors);
    setCanUploadVendorReport(snapshot.canUploadVendorReport);
    setReferenceCounts(snapshot.counts);
    setDataState('live');
  };
  const mutationError = (error:unknown) => error instanceof Error ? error.message : 'Une erreur locale est survenue.';
  const persistWorkflowStatus = async (status:Status) => {
    if (status === selected.status) return;
    if (status === 'Clôturée' && selected.priority === 'Critique' && !selected.proof) {
      flash('Clôture impossible : une preuve acceptée est obligatoire pour une anomalie critique.');
      return;
    }
    if (session?.mode !== 'supabase' || dataState !== 'live') {
      setAnomalies((items) => items.map((a) => a.id === selected.id ? { ...a, status } : a));
      flash(`Statut mis à jour : ${status} — simulation de repli.`);
      return;
    }
    setMutationBusy(true);
    try {
      await advanceAnomalyWorkflow(getBrowserSupabaseClient(), selected.id, status);
      await syncOperationalData();
      flash(`Étape enregistrée dans Supabase : ${status}.`);
    } catch (error) {
      flash(`Action non enregistrée : ${mutationError(error)}`);
    } finally {
      setMutationBusy(false);
    }
  };
  const persistProof = async (file:File) => {
    if (session?.mode !== 'supabase' || dataState !== 'live') {
      setAnomalies((items) => items.map((a) => a.id === selected.id ? { ...a, proof:true } : a));
      flash('Preuve ajoutée — simulation de repli.');
      return;
    }
    setMutationBusy(true);
    try {
      const result = await uploadAnomalyProof(getBrowserSupabaseClient(), selected.id, file);
      await syncOperationalData();
      flash(result.verification_status === 'accepted' ? 'Preuve déposée et acceptée dans Supabase.' : 'Preuve déposée ; validation de Facility Manager requise.');
    } catch (error) {
      flash(`Preuve non enregistrée : ${mutationError(error)}`);
    } finally {
      setMutationBusy(false);
    }
  };
  const verifyProof = async () => {
    setMutationBusy(true);
    try {
      await verifyLatestAnomalyProof(getBrowserSupabaseClient(), selected.id, 'accepted');
      await syncOperationalData();
      flash('Preuve validée par le Facility Manager.');
    } catch (error) {
      flash(`Validation non enregistrée : ${mutationError(error)}`);
    } finally {
      setMutationBusy(false);
    }
  };
  const persistVendorReport = async (input:{ anomalyReference:string; vendorCode:string; file:File; reportType:'intervention_report'|'pv'|'quote'|'photo_bundle'; reportDate:string; summary:string; reserveNotes?:string; costAmount?:number }) => {
    if (session?.mode === 'demo') {
      if (!effectiveCanUploadVendorReport) throw new Error('Ce droit nominatif n’est pas attribué à ce profil.');
      flash(`Rapport simulé au nom de ${input.vendorCode} ; validation de Facility Manager requise.`);
      return;
    }
    if (session?.mode !== 'supabase' || dataState !== 'live' || !canUploadVendorReport) {
      throw new Error('Ce droit nominatif n’est pas attribué à ce profil.');
    }
    setMutationBusy(true);
    try {
      const result = await uploadVendorInterventionReport(getBrowserSupabaseClient(), input);
      flash(`${String(result.reference)} déposé au nom de ${input.vendorCode} ; validation de Facility Manager requise.`);
    } catch (error) {
      flash(`Rapport prestataire non enregistré : ${mutationError(error)}`);
      throw error;
    } finally {
      setMutationBusy(false);
    }
  };
  const changePersona = (next: PersonaId) => {
    if (session?.mode === 'supabase') {
      flash('Le rôle est imposé par Supabase Auth et les politiques RLS.');
      return;
    }
    setPersonaId(next);
    const nextView = landingViewByPersona[next];
    setPreviousView(nextView);
    setView(nextView);
    if (session) {
      const updated = { ...session, personaId:next };
      setSession(updated);
      const storage = updated.remember ? window.localStorage : window.sessionStorage;
      storage.setItem(SESSION_KEY, JSON.stringify(updated));
    }
    setToast(`Mode démonstration : espace ${personas.find((item) => item.id === next)?.shortName}.`);
    window.setTimeout(() => setToast(''), 2600);
  };
  const authenticate = async (next:PersonaId, remember:boolean, email:string, password:string) => {
    if (isSupabaseIntegrationEnabled) {
      const client = getBrowserSupabaseClient();
      setDataState('loading');
      setSupabaseRememberPreference(remember);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error('Identifiants Supabase non reconnus.');

      try {
        const gate = await getAuthenticatedProfileGate(client);
        if (gate.mustChangePassword) {
          setSession(null);
          setPasswordChangeRequirement({
            userId:data.user.id,
            email:data.user.email ?? email,
            displayName:gate.displayName,
          });
          return;
        }
        const resolvedPersona = await resolveAuthenticatedPersona(client, data.user.id) as PersonaId;
        const nextSession:DemoSession = {
          personaId:resolvedPersona,
          remember:true,
          issuedAt:data.user.last_sign_in_at ?? new Date().toISOString(),
          mode:'supabase',
          userId:data.user.id,
          email:data.user.email,
        };
        setSession(nextSession); setPersonaId(resolvedPersona); setView(landingViewByPersona[resolvedPersona]); setPreviousView(landingViewByPersona[resolvedPersona]);
        return;
      } catch (profileError) {
        await client.auth.signOut();
        throw profileError;
      }
    }

    const nextSession:DemoSession = { personaId:next, remember, issuedAt:new Date().toISOString(), mode:'demo' };
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession); setPersonaId(next); setView(landingViewByPersona[next]); setPreviousView(landingViewByPersona[next]);
  };
  const authenticateDemo = async (next:PersonaId, remember:boolean) => {
    const nextSession:DemoSession = { personaId:next, remember, issuedAt:new Date().toISOString(), mode:'demo' };
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(nextSession));
    setDataState('demo'); setCanUploadVendorReport(false); setSession(nextSession); setPersonaId(next); setView(landingViewByPersona[next]); setPreviousView(landingViewByPersona[next]);
  };
  const requestPasswordReset = async (email:string) => {
    if (!isSupabaseIntegrationEnabled) return;
    const client = getBrowserSupabaseClient();
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo:window.location.origin });
    if (error) throw new Error('Impossible de lancer la réinitialisation du mot de passe.');
  };
  const completeRequiredPasswordChange = async (currentPassword:string, newPassword:string) => {
    if (!passwordChangeRequirement) throw new Error('La session de première connexion a expiré.');
    const client = getBrowserSupabaseClient();
    const { data, error } = await client.auth.updateUser({ password:newPassword, currentPassword });
    if (error || !data.user) throw new Error('Le mot de passe temporaire est incorrect ou la mise à jour a été refusée.');
    const gate = await getAuthenticatedProfileGate(client);
    if (gate.mustChangePassword) throw new Error('Le changement n’a pas été confirmé par le contrôle de sécurité.');
    const resolvedPersona = await resolveAuthenticatedPersona(client, data.user.id) as PersonaId;
    const nextSession:DemoSession = {
      personaId:resolvedPersona,
      remember:true,
      issuedAt:new Date().toISOString(),
      mode:'supabase',
      userId:data.user.id,
      email:data.user.email,
    };
    setPasswordChangeRequirement(null);
    setSession(nextSession); setPersonaId(resolvedPersona); setView(landingViewByPersona[resolvedPersona]); setPreviousView(landingViewByPersona[resolvedPersona]); setDataState('loading');
  };
  const signOutLockedSession = async () => {
    await getBrowserSupabaseClient().auth.signOut();
    setPasswordChangeRequirement(null);
    setSession(null);
  };
  const signOut = async () => {
    if (session?.mode === 'supabase') {
      const { error } = await getBrowserSupabaseClient().auth.signOut();
      if (error) { flash('Déconnexion Supabase impossible. Réessayez.'); return; }
    }
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    setSignOutConfirm(false); setSession(null); setPasswordChangeRequirement(null); setPersonaId('facility'); setView('workspace'); setToast(''); setDataState('demo'); setCanUploadVendorReport(false);
  };
  const resetDemo = () => {
    if (isSupabaseIntegrationEnabled) void getBrowserSupabaseClient().auth.signOut();
    window.localStorage.removeItem('behira_supabase_remember');
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    setSession(null); setPasswordChangeRequirement(null); setPersonaId('facility'); setView('workspace'); setPreviousView('registry'); setAnomalies(seedAnomalies); setEquipmentItems(fallbackEquipment); setVendorReferences(fallbackVendors); setCanUploadVendorReport(false); setDataState('demo'); setReferenceCounts({ anomalies:seedAnomalies.length, equipment:fallbackEquipment.length, zones:0, profiles:0 }); setEscalations(seedEscalations);
    setFieldRequests([
      { id:'REQ-031', from:'Agente Rondes & Assistance Démo', subject:'Infiltration légère · Atrium restaurant', note:'Photo ajoutée, origine à qualifier après la pluie.', status:'À traiter par Facility Manager' },
      { id:'REQ-030', from:'Agent Eau & Incendie Démo', subject:'DEMO-EAU · deuxième réarmement en 7 jours', note:'Service rétabli provisoirement, diagnostic demandé.', status:'À traiter par Facility Manager' },
    ]);
    setQuery(''); setPriorityFilter('Toutes'); setStatusFilter('Tous'); setToast('');
  };
  const submitFieldRequest = (request: Omit<FieldRequest, 'id' | 'status'>) => {
    const id = `REQ-${String(32 + fieldRequests.length).padStart(3, '0')}`;
    setFieldRequests((items) => [{ ...request, id, status:'À traiter par Facility Manager' }, ...items]);
    flash(`${id} transmise à Facility Manager — simulation locale.`);
  };
  const decideEscalation = (id:string, state:DecisionState, motive:string) => {
    setEscalations((items) => items.map((item) => item.id === id ? { ...item, state, motive } : item));
    flash(`${id} · décision ${state.toLowerCase()} et retour envoyé à Facility Manager.`);
  };
  const escalateToDirection = (request:FieldRequest) => {
    const id = `DEC-${String(19 + escalations.length).padStart(3, '0')}`;
    setEscalations((items) => [{ id, anomaly:request.id, asset:'DEMO-RND', title:request.subject, kind:'Risque', due:'Aujourd’hui · 16:00', risk:'Décision hors délégation Facility Manager', recommendation:'Arbitrage Direction demandé par Facility Manager.', state:'À décider' }, ...items]);
    setFieldRequests((items) => items.map((item) => item.id === request.id ? { ...item, status:'Transmise à Direction' } : item));
    flash(`${id} transmise à l’Administration pour arbitrage.`);
  };

  const visibleNav = navItems.filter((item) => allowedViewsByPersona[personaId].includes(item.key));
  const navigationLabel = (item:NavigationItem) => item.key === 'workspace' && personaId === 'administration' ? 'À valider' : item.key === 'workspace' && !['facility','administration'].includes(personaId) ? 'À traiter' : item.label;
  const primaryNav = visibleNav.slice(0,6);
  const overflowNav = visibleNav.slice(6);
  const activeNavKey = view === 'detail' ? previousView : view;
  const overflowIsActive = overflowNav.some((item) => item.key === activeNavKey);
  const isNavigationActive = (key:NavigationItem['key']) => key === activeNavKey;
  const focusOverflowItem = (index:number) => {
    const items = moreNavItemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item));
    if (!items.length) return;
    items[(index + items.length) % items.length]?.focus();
  };
  const onMoreNavKeyDown = (event:React.KeyboardEvent<HTMLDivElement>) => {
    const items = moreNavItemRefs.current.filter((item): item is HTMLButtonElement => Boolean(item));
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement);
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      focusOverflowItem(currentIndex + (event.key === 'ArrowDown' ? 1 : -1));
    } else if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      focusOverflowItem(event.key === 'Home' ? 0 : items.length - 1);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setMoreNavOpen(false);
      window.requestAnimationFrame(() => moreNavTriggerRef.current?.focus());
    }
  };
  const pageTitle = view === 'workspace' ? `Espace ${persona.shortName}` : view === 'dashboard' ? (personaId === 'administration' ? 'Vue consolidée Administration' : 'Tableau de bord') : view === 'registry' ? 'Registre des anomalies' : view === 'manager' ? 'Espace Facility Manager' : view === 'report' ? (personaId === 'eau_incendie' || personaId === 'facility' ? 'Pilote Surpresseur' : 'Ronde terrain') : selected.id;
  const mobilePageTitle = view === 'workspace' ? `Espace ${persona.shortName}` : view === 'dashboard' ? 'Pilotage' : view === 'registry' ? 'Registre' : view === 'manager' ? 'Facility Manager' : view === 'report' ? (personaId === 'eau_incendie' || personaId === 'facility' ? 'Pilote Surpresseur' : 'Ronde') : selected.id;

  if (!authReady) return <main className="auth-loading" aria-label="Chargement de la session"><span className="brand-mark">B</span><p>Préparation de votre espace…</p></main>;
  if (passwordChangeRequirement) return <RequiredPasswordChange requirement={passwordChangeRequirement} onComplete={completeRequiredPasswordChange} onSignOut={signOutLockedSession} />;
  if (!session) return <AuthExperience onAuthenticate={authenticate} onDemoAuthenticate={authenticateDemo} onForgot={requestPasswordReset} onReset={resetDemo} supabaseMode={isSupabaseIntegrationEnabled} allowDemoFallback={supabaseIntegration.demoFallback} environmentLabel={supabaseIntegration.environmentLabel} />;

  return (
    <div className="app-shell">
      <header className="app-navigation">
        <button className="brand" onClick={() => navigate('dashboard')}><span className="brand-mark">B</span><span className="brand-wordmark">BEHIRA<small>FM / GB TRACK</small></span></button>
        <nav className="primary-navigation" aria-label="Navigation principale">
          {primaryNav.map((item) => {
            const active = isNavigationActive(item.key);
            return <button key={item.key} type="button" className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.key)}><NavigationIcon view={item.key}/><span className="nav-item-label">{navigationLabel(item)}</span></button>;
          })}
          {overflowNav.length > 0 && <div className="nav-overflow" ref={moreNavRef}>
            <button ref={moreNavTriggerRef} type="button" className={`nav-item nav-more-trigger ${overflowIsActive ? 'active' : ''}`} aria-haspopup="menu" aria-expanded={moreNavOpen} aria-controls="navigation-more-menu" onKeyDown={(event) => {if (event.key === 'ArrowDown') {event.preventDefault();setMoreNavOpen(true);window.requestAnimationFrame(() => focusOverflowItem(0))}}} onClick={() => setMoreNavOpen((open) => !open)}><span className="nav-more-icon" aria-hidden="true">•••</span><span className="nav-item-label">Plus</span></button>
            {moreNavOpen && <div className="nav-more-menu" id="navigation-more-menu" role="menu" aria-label="Autres destinations" onKeyDown={onMoreNavKeyDown}>
              {navigationGroups.map((group) => {
                const groupItems = overflowNav.filter((item) => item.group === group);
                if (!groupItems.length) return null;
                return <section className="nav-more-group" key={group} aria-label={group}><p>{group}</p>{groupItems.map((item) => {
                  const active = isNavigationActive(item.key);
                  const overflowIndex = overflowNav.findIndex((candidate) => candidate.key === item.key);
                  return <button ref={(node) => {moreNavItemRefs.current[overflowIndex] = node}} type="button" role="menuitem" key={item.key} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.key)}><NavigationIcon view={item.key}/><span>{navigationLabel(item)}</span></button>;
                })}</section>;
              })}
            </div>}
          </div>}
        </nav>
        <div className="scope-box"><span>●</span><div><b>Site Démo Atlas</b><small>{session.mode === 'supabase' ? dataState === 'live' ? `${referenceCounts.anomalies} anomalies · ${referenceCounts.equipment} équipements · ${referenceCounts.zones} zones` : dataState === 'loading' ? `Synchronisation ${supabaseIntegration.environmentLabel}…` : 'Repli sur les données de démonstration' : 'Site principal · démonstration'}</small></div></div>
        <div className="app-navigation-user"><span className="avatar">{persona.initials}</span><div><b>{persona.name}</b><small>{persona.role}</small></div><button className="logout-button" onClick={() => setSignOutConfirm(true)} aria-label="Se déconnecter">↪</button></div>
      </header>

      <main className="main-column">
        <header className="topbar">
          <div><p className="eyebrow">LUNDI 24 AOÛT · 09:42</p><h1><span className="desktop-title">{pageTitle}</span><span className="mobile-title">{mobilePageTitle}</span></h1></div>
          <div className="top-actions">{session.mode === 'demo' ? <PersonaSwitcher value={personaId} onChange={changePersona} /> : <div className={`authenticated-persona data-${dataState}`} title={`${session.email} · ${dataState === 'live' ? `données ${supabaseIntegration.environmentLabel}` : 'données de repli'}`}><span>{persona.initials}</span><p><b>{persona.name}</b><small>{dataState === 'live' ? `${supabaseIntegration.environmentLabel} · ${referenceCounts.anomalies} anomalies visibles` : dataState === 'loading' ? `Connexion à ${supabaseIntegration.environmentLabel}…` : `Mode de repli · ${persona.role}`}</small></p></div>}<button className="icon-button" aria-label="Notifications">●<span className="notification-dot" /></button><button className="auth-signout-top" onClick={() => setSignOutConfirm(true)} aria-label="Se déconnecter">↪</button>{personaId !== 'administration' && <button className="primary-button top-create" onClick={() => navigate('report')}>＋ Nouvelle ronde</button>}</div>
        </header>

        <div className="content">
          {view === 'workspace' && <PersonaWorkspace persona={persona} anomalies={anomalies} equipment={equipmentItems} vendors={vendorReferences} canUploadVendorReport={effectiveCanUploadVendorReport} vendorReportBusy={mutationBusy} onVendorReport={persistVendorReport} escalations={escalations} fieldRequests={fieldRequests} onEscalationDecision={decideEscalation} onEscalateToDirection={escalateToDirection} onFieldRequest={submitFieldRequest} onOpen={(id) => openDetail(id, 'workspace')} onNavigate={navigate} flash={flash} />}
          {view === 'dashboard' && <Dashboard anomalies={anomalies} equipment={equipmentItems} audience={personaId === 'administration' ? 'administration' : 'facility'} onOpen={openDetail} onNavigate={navigate} />}
          {view === 'registry' && <Registry anomalies={filtered} query={query} setQuery={setQuery} priority={priorityFilter} setPriority={setPriorityFilter} status={statusFilter} setStatus={setStatusFilter} onOpen={(id) => openDetail(id, 'registry')} />}
          {view === 'manager' && <Manager anomalies={anomalies} equipment={equipmentItems} tab={managerTab} setTab={setManagerTab} onOpen={(id) => openDetail(id, 'manager')} />}
          {view === 'report' && <Report persona={persona} onNavigate={navigate} />}
          {view === 'detail' && <Detail key={`${selected.id}-${selected.status}-${selected.proof}-${selected.proofPending}`} anomaly={selected} readOnly={personaId === 'administration'} canVerify={personaId === 'facility' && session.mode === 'supabase'} busy={mutationBusy} onBack={() => navigate(previousView)} onStatus={(status) => void persistWorkflowStatus(status)} onProof={(file) => void persistProof(file)} onVerify={() => void verifyProof()} />}
        </div>
      </main>
      {toast && <div className={`toast ${/impossible|non enregistrée/i.test(toast) ? 'toast-error' : ''}`} role="status"><span>{/impossible|non enregistrée/i.test(toast) ? '!' : '✓'}</span>{toast}</div>}
      {signOutConfirm && <div className="signout-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) setSignOutConfirm(false)}}><section className="signout-dialog" role="dialog" aria-modal="true" aria-labelledby="signout-title"><span className="signout-icon">↪</span><h2 id="signout-title">Se déconnecter ?</h2><p>{session.mode === 'supabase' ? `La session ${supabaseIntegration.environmentLabel} sera fermée. Les données métier de démonstration resteront disponibles.` : 'La session simulée sera supprimée de cet appareil. Les données de démonstration resteront disponibles.'}</p><div><button ref={signOutCancelRef} className="secondary-button" onClick={() => setSignOutConfirm(false)}>Annuler</button><button className="primary-button" onClick={() => void signOut()}>Se déconnecter</button></div><button className="reset-session-link" onClick={resetDemo}>Déconnecter et réinitialiser toute la démo</button></section></div>}
    </div>
  );
}

function PersonaWorkspace({ persona, anomalies, equipment, vendors, canUploadVendorReport, vendorReportBusy, onVendorReport, escalations, fieldRequests, onEscalationDecision, onEscalateToDirection, onFieldRequest, onOpen, onNavigate, flash }: {
  persona:Persona;
  anomalies:Anomaly[];
  equipment:EquipmentItem[];
  vendors:OperationalVendor[];
  canUploadVendorReport:boolean;
  vendorReportBusy:boolean;
  onVendorReport:(input:{ anomalyReference:string; vendorCode:string; file:File; reportType:'intervention_report'|'pv'|'quote'|'photo_bundle'; reportDate:string; summary:string; reserveNotes?:string; costAmount?:number })=>Promise<void>;
  escalations:Escalation[];
  fieldRequests:FieldRequest[];
  onEscalationDecision:(id:string, state:DecisionState, motive:string)=>void;
  onEscalateToDirection:(request:FieldRequest)=>void;
  onFieldRequest:(request:Omit<FieldRequest,'id'|'status'>)=>void;
  onOpen:(id:string)=>void;
  onNavigate:(view:View)=>void;
  flash:(message:string)=>void;
}) {
  if (persona.id === 'administration') return <DirectionWorkspace anomalies={anomalies} equipment={equipment} escalations={escalations} onDecision={onEscalationDecision} onOpen={onOpen} onNavigate={onNavigate} />;
  if (persona.id === 'facility') return <FacilityManagerWorkspace escalations={escalations} fieldRequests={fieldRequests} onEscalate={onEscalateToDirection} onOpen={onOpen} onNavigate={onNavigate} />;
  if (persona.id === 'electricite' || persona.id === 'eau_incendie') return <AgentWorkspace key={persona.id} persona={persona} anomalies={anomalies} vendors={vendors} canUploadVendorReport={canUploadVendorReport} vendorReportBusy={vendorReportBusy} onVendorReport={onVendorReport} onFieldRequest={onFieldRequest} flash={flash} />;
  if (persona.id === 'rondes_assistance') return <RoundsAssistanceWorkspace fieldRequests={fieldRequests} onFieldRequest={onFieldRequest} flash={flash} />;
  return null;
}

function WorkspaceIntro({ kicker, title, description, badge }: { kicker:string; title:string; description:string; badge:string }) {
  return <section className="workspace-intro"><div><p className="direction-kicker">{kicker}</p><h2>{title}</h2><p>{description}</p></div><span className="workspace-mode"><i /> {badge}</span></section>;
}

function AnswerStrip({ todo, risk, due, proof }: { todo:string; risk:string; due:string; proof:string }) {
  return <section className="answer-strip" aria-label="Résumé opérationnel"><div><span>À FAIRE</span><b>{todo}</b></div><div className="risk"><span>RISQUE</span><b>{risk}</b></div><div><span>ÉCHÉANCE</span><b>{due}</b></div><div className="proof"><span>PREUVE MANQUANTE</span><b>{proof}</b></div></section>;
}

function formatMoney(value:number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
}

function DirectionWorkspace({ anomalies, equipment, escalations, onDecision, onOpen, onNavigate }: { anomalies:Anomaly[]; equipment:EquipmentItem[]; escalations:Escalation[]; onDecision:(id:string,state:DecisionState,motive:string)=>void; onOpen:(id:string)=>void; onNavigate:(view:View)=>void }) {
  const [threshold, setThreshold] = useState(400000);
  const [tab, setTab] = useState<'pending'|'history'>('pending');
  const [filter, setFilter] = useState<'Tous'|Escalation['kind']>('Tous');
  const [selectedCaseId, setSelectedCaseId] = useState('DEC-018');
  const [draft, setDraft] = useState<{id:string; state:DecisionState}|null>(null);
  const [motive, setMotive] = useState('');
  const [adminPanel, setAdminPanel] = useState<'agent'|'zones'|null>(null);
  const [adminConfirmation, setAdminConfirmation] = useState('');
  const [newAgent, setNewAgent] = useState({name:'', email:'', role:'Agent terrain', scope:'DEMO-EAU'});
  const [newZone, setNewZone] = useState('');
  const stateItems = tab === 'pending' ? escalations.filter((item) => item.state === 'À décider') : escalations.filter((item) => item.state !== 'À décider');
  const activeItems = filter === 'Tous' ? stateItems : stateItems.filter((item) => item.kind === filter);
  const focusItem = activeItems.find((item) => item.id === selectedCaseId) ?? activeItems[0];
  const selected = draft ? escalations.find((item) => item.id === draft.id) : null;
  const filters: Array<'Tous'|Escalation['kind']> = ['Tous','Risque','Coût','Arbitrage','Clôture sensible'];
  const confirm = () => {
    if (!draft || !motive.trim()) return;
    onDecision(draft.id, draft.state, motive.trim());
    setDraft(null);
    setMotive('');
  };
  return <>
    <WorkspaceIntro kicker="ADMINISTRATION · SUPER UTILISATEUR MÉTIER" title="Bonjour Administration" description="Décidez ce qui dépasse la délégation opérationnelle de Facility Manager." badge="Validation métier active" />
    <div className="authority-split" role="note"><div><span>✓</span><p><b>Validation métier Administration</b><small>Risques, coûts à partir de 400 000 FCFA et contrôle des clôtures sensibles</small></p></div><div className="technical-admin"><span>⌘</span><p><b>Utilisateurs et paramètres</b><small>Comptes, droits sensibles, zones et seuil financier configurables</small></p><Badge tone="blue">ACCÈS ADMIN</Badge></div></div>
    <AnswerStrip todo={`${escalations.filter((item) => item.state === 'À décider').length} arbitrages`} risk="2 dossiers critiques" due="1 décision avant 10:30" proof="1 clôture sensible" />
    <section className="direction-summary-grid"><article className="panel executive-metric"><span>RISQUES CRITIQUES</span><strong>2</strong><small>DEMO-SSI et continuité DEMO-GE</small></article><article className="panel executive-metric"><span>COÛTS À VALIDER</span><strong>6,7 M</strong><small>FCFA · 2 engagements</small></article><article className="panel executive-metric"><span>SANTÉ BÂTIMENT</span><strong className="healthy">82/100</strong><small>Équipements 70% · sécurité 15%</small></article><article className="panel threshold-card"><label>Seuil d’approbation Administration<input aria-label="Seuil d’approbation Administration" type="number" step="50000" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} /></label><small>Les engagements ≥ {formatMoney(threshold)} sont remontés automatiquement.</small></article></section>
    <section className="decision-workbench">
      <article className="panel direction-inbox">
        <div className="workspace-tabs"><button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>À décider <span>{escalations.filter((item) => item.state === 'À décider').length}</span></button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Historique <span>{escalations.filter((item) => item.state !== 'À décider').length}</span></button></div>
        <div className="decision-filters" aria-label="Filtrer par type d’arbitrage">{filters.map((item) => <button key={item} className={filter === item ? 'active' : ''} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item}</button>)}</div>
        <div className="direction-case-list">{activeItems.length === 0 ? <div className="empty-state compact"><span>✓</span><h3>Aucun dossier</h3><p>Changez de filtre ou consultez l’autre onglet.</p></div> : activeItems.map((item) => <button type="button" key={item.id} className={`direction-case-card ${focusItem?.id === item.id ? 'active' : ''}`} aria-pressed={focusItem?.id === item.id} onClick={() => setSelectedCaseId(item.id)}><span className={`decision-kind-mark kind-${item.kind.toLowerCase().replaceAll(' ','-')}`}>{item.kind === 'Risque' ? '!' : item.kind === 'Coût' ? '₣' : item.kind === 'Clôture sensible' ? '✓' : '↔'}</span><span className="decision-card-copy"><span><b>{item.asset}</b> · {item.id}</span><strong>{item.title}</strong><small>{item.due}</small></span><Badge tone={item.state === 'Approuvée' ? 'success' : item.state === 'Refusée' ? 'critical' : item.state === 'Renvoyée à Facility Manager' ? 'orange' : 'neutral'}>{item.state}</Badge></button>)}</div>
      </article>
      <aside className="panel direction-focus" aria-live="polite">{focusItem ? <>
        <div className="direction-focus-head"><div><Badge tone={focusItem.kind === 'Risque' ? 'critical' : focusItem.kind === 'Coût' || focusItem.kind === 'Clôture sensible' ? 'orange' : 'blue'}>{focusItem.kind}</Badge><span>{focusItem.id} · {focusItem.anomaly}</span></div><Badge tone={focusItem.state === 'Approuvée' ? 'success' : focusItem.state === 'Refusée' ? 'critical' : focusItem.state === 'Renvoyée à Facility Manager' ? 'orange' : 'neutral'}>{focusItem.state}</Badge></div>
        <h3>{focusItem.asset} · {focusItem.title}</h3>
        <div className="case-facts"><span><b>Risque</b>{focusItem.risk}</span><span><b>Échéance</b>{focusItem.due}</span>{focusItem.amount && <span><b>Engagement</b>{formatMoney(focusItem.amount)} {focusItem.amount >= threshold && <em>AU-DESSUS DU SEUIL</em>}</span>}</div>
        <div className="recommendation"><span>RECOMMANDATION</span><p>{focusItem.recommendation}</p></div>
        {focusItem.motive && <p className="decision-motive"><b>Motif :</b> {focusItem.motive}</p>}
        {focusItem.state === 'À décider' && <div className="case-actions">{focusItem.anomaly.startsWith('ANO-') && <button className="secondary-button" onClick={() => onOpen(focusItem.anomaly)}>Voir l’anomalie</button>}<button className="reject-action" onClick={() => {setDraft({id:focusItem.id,state:'Refusée'});setMotive('')}}>Refuser</button><button className="return-action" onClick={() => {setDraft({id:focusItem.id,state:'Renvoyée à Facility Manager'});setMotive('')}}>Renvoyer à Facility Manager</button><button className="primary-button" onClick={() => {setDraft({id:focusItem.id,state:'Approuvée'});setMotive('')}}>Approuver</button></div>}
        <div className="direction-detail-kpis"><span><b>92%</b> disponibilité</span><span><b>3,2 j</b> délai moyen</span><span><b>8,45 M</b> engagés</span></div>
      </> : <div className="empty-state compact"><span>⌁</span><h3>Sélectionnez un dossier</h3><p>Le détail de l’arbitrage apparaîtra ici.</p></div>}</aside>
    </section>
    <section className="admin-preview-grid">
      <article className="panel admin-users-preview"><div className="panel-head"><div><p className="design-kicker">UTILISATEURS & ACCÈS</p><h3>5 comptes internes actifs</h3><p>Facility Manager peut proposer ; l’Administration valide les droits sensibles.</p></div><button className="primary-button" onClick={() => {setAdminPanel('agent');setAdminConfirmation('')}}>＋ Créer un agent</button></div>{adminConfirmation && <div className="admin-inline-confirmation" role="status"><span>✓</span>{adminConfirmation}</div>}<div className="admin-user-list">{[['FS','Facility Manager Démo','Facility Manager','Tous périmètres'],['ED','Agent Électricité Démo','Agent électricité','DEMO-GE'],['SD','Agent Eau & Incendie Démo','Agent eau / incendie','DEMO-EAU · DEMO-SSI · DEMO-ESP'],['LA','Agente Rondes & Assistance Démo','Agente & assistante','DEMO-RND']].map((user) => <button key={user[1]} onClick={() => {setNewAgent({name:user[1],email:'',role:user[2],scope:user[3]});setAdminPanel('agent');setAdminConfirmation('')}}><span>{user[0]}</span><p><b>{user[1]}</b><small>{user[2]} · {user[3]}</small></p><Badge tone="success">ACTIF</Badge><em>Gérer →</em></button>)}</div></article>
      <aside className="admin-parameters"><article className="panel"><p className="design-kicker">RÉFÉRENTIEL</p><div className="parameter-value"><strong>76</strong><span>zones actives</span></div><p>Ajouter, modifier ou désactiver une zone sans intervention technique.</p><button className="secondary-button" onClick={() => {setAdminPanel('zones');setAdminConfirmation('')}}>Gérer les zones</button></article><article className="panel"><p className="design-kicker">SCORES AGENTS</p><div className="agent-score-mini"><span><b>Agent Électricité</b>88</span><span><b>Agent Eau & Incendie</b>84</span><span><b>Agente Rondes & Assistance</b>91</span></div><small>Visibles par tous les agents · détail explicatif disponible</small></article></aside>
    </section>
    <WorkflowAnalytics items={anomalies.map((item) => ({ ...item, owner:canonicalResponsible(item) ?? 'Non affectée' }))} variant="administration" onOpenRegistry={() => onNavigate('registry')} />
    <OperationalAnalytics equipment={equipment} variant="direction" />
    {draft && selected && <div className="demo-modal-backdrop" role="presentation"><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="decision-dialog-title"><button className="modal-close" aria-label="Fermer" onClick={() => setDraft(null)}>×</button><Badge tone={draft.state === 'Approuvée' ? 'success' : draft.state === 'Refusée' ? 'critical' : 'orange'}>{draft.state}</Badge><h3 id="decision-dialog-title">{selected.id} · Confirmer la décision</h3><p>{selected.asset} · {selected.title}</p><label className="field">Motif obligatoire<textarea autoFocus value={motive} onChange={(e) => setMotive(e.target.value)} placeholder="Expliquez la décision et les conditions éventuelles…" /></label><div className="modal-actions"><button className="secondary-button" onClick={() => setDraft(null)}>Annuler</button><button className="primary-button" disabled={!motive.trim()} onClick={confirm}>Confirmer et notifier Facility Manager</button></div><small>Simulation locale · aucune donnée n’est persistée.</small></section></div>}
    {adminPanel && <div className="demo-modal-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) setAdminPanel(null)}}><section className="demo-modal admin-dialog" role="dialog" aria-modal="true" aria-labelledby="admin-dialog-title"><button className="modal-close" aria-label="Fermer" onClick={() => setAdminPanel(null)}>×</button><Badge tone="blue">ADMINISTRATION</Badge>{adminPanel === 'agent' ? <form onSubmit={(event) => {event.preventDefault();setAdminPanel(null);setAdminConfirmation(`${newAgent.name || 'Le nouvel agent'} est prêt à être créé après validation finale.`)}}><h3 id="admin-dialog-title">{newAgent.name ? 'Gérer un agent' : 'Créer un nouvel agent'}</h3><p>Définissez l’identité, le rôle et le périmètre avant activation.</p><div className="admin-form-grid"><label className="field">Nom complet<input autoFocus required value={newAgent.name} onChange={(e) => setNewAgent({...newAgent,name:e.target.value})} placeholder="Prénom et nom" /></label><label className="field">Email professionnel<input required type="email" value={newAgent.email} onChange={(e) => setNewAgent({...newAgent,email:e.target.value})} placeholder="nom@entreprise.com" /></label><label className="field">Rôle<select value={newAgent.role} onChange={(e) => setNewAgent({...newAgent,role:e.target.value})}><option>Agent terrain</option><option>Facility Manager</option><option>Agente & assistante</option><option>Administration</option></select></label><label className="field">Périmètre<select value={newAgent.scope} onChange={(e) => setNewAgent({...newAgent,scope:e.target.value})}><option>DEMO-EAU</option><option>DEMO-GE</option><option>DEMO-SSI · DEMO-ESP</option><option>DEMO-RND</option><option>Tous périmètres</option></select></label></div><div className="admin-rights-note"><span>⌘</span><p><b>Droits sensibles contrôlés</b><small>Le dépôt de rapports prestataires et les validations restent attribués séparément.</small></p></div><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAdminPanel(null)}>Annuler</button><button type="submit" className="primary-button">Préparer le compte</button></div><small>Maquette interactive · aucun compte Auth n’est créé.</small></form> : <form onSubmit={(event) => {event.preventDefault();setAdminPanel(null);setAdminConfirmation(`La zone « ${newZone} » est prête à être ajoutée après validation.`);setNewZone('')}}><h3 id="admin-dialog-title">Gérer les zones</h3><p>Le référentiel contient 24 zones actives. Toute modification reste traçable.</p><div className="zone-preview-list"><span><b>Sous-sol</b>12 zones</span><span><b>Rez-de-chaussée</b>18 zones</span><span><b>Étages R+1 à R+4</b>38 zones</span><span><b>Extérieurs</b>8 zones</span></div><label className="field">Nouvelle zone<input autoFocus required value={newZone} onChange={(e) => setNewZone(e.target.value)} placeholder="Ex. Local technique R+3" /></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={() => setAdminPanel(null)}>Annuler</button><button type="submit" className="primary-button">Préparer l’ajout</button></div><small>Maquette interactive · aucun référentiel n’est modifié.</small></form>}</section></div>}
  </>;
}

function FacilityManagerWorkspace({ escalations, fieldRequests, onEscalate, onOpen, onNavigate }: { escalations:Escalation[]; fieldRequests:FieldRequest[]; onEscalate:(request:FieldRequest)=>void; onOpen:(id:string)=>void; onNavigate:(view:View)=>void }) {
  const responses = escalations.filter((item) => item.state !== 'À décider');
  return <>
    <WorkspaceIntro kicker="FACILITY MANAGER" title="Bonjour Facility Manager" description="Qualifiez, affectez, relancez et préparez les arbitrages Direction." badge="Pilotage opérationnel" />
    <AnswerStrip todo="2 qualifications" risk="DEMO-SSI critique" due="DEMO-ASC-2 en retard" proof="2 dossiers" />
    <section className="facility-personal-grid"><article className="panel"><div className="panel-head"><div><h3>Remontées terrain</h3><p>Demandes reçues des agents et de Agente Rondes & Assistance</p></div><Badge tone="orange">{fieldRequests.filter((item) => item.status === 'À traiter par Facility Manager').length} à traiter</Badge></div><div className="field-request-list">{fieldRequests.map((request) => {
      const exceedsDelegation = /deuxième|critique|coût|sécurité/i.test(`${request.subject} ${request.note}`);
      return <article key={request.id}><div><Badge tone={request.status === 'Transmise à Direction' ? 'blue' : 'orange'}>{request.status}</Badge><span>{request.id} · {request.from}</span>{exceedsDelegation && request.status === 'À traiter par Facility Manager' && <Badge tone="critical">Hors délégation</Badge>}</div><h4>{request.subject}</h4><p>{request.note}</p>{request.status === 'À traiter par Facility Manager' ? <div><button className="primary-button qualify-action" onClick={() => onNavigate('manager')}>Qualifier maintenant</button><button className={`escalate-action ${exceedsDelegation ? 'is-recommended' : ''}`} onClick={() => onEscalate(request)}>Soumettre à l’Administration</button></div> : <small>En attente de décision de l’Administration.</small>}</article>;
    })}</div></article><article className="panel"><div className="panel-head"><div><h3>Retours de l’Administration</h3><p>Décisions métier reçues après arbitrage</p></div><Badge tone="success">{responses.length} réponse{responses.length > 1 ? 's' : ''}</Badge></div><div className="direction-return-list">{responses.length ? responses.map((item) => <button key={item.id} onClick={() => item.anomaly.startsWith('ANO-') && onOpen(item.anomaly)}><span className={`return-mark ${item.state === 'Approuvée' ? 'ok' : item.state === 'Refusée' ? 'no' : 'back'}`}>{item.state === 'Approuvée' ? '✓' : item.state === 'Refusée' ? '×' : '↩'}</span><div><b>{item.id} · {item.asset}</b><p>{item.state} — {item.motive}</p></div></button>) : <div className="empty-state compact"><span>⌁</span><h3>Aucun retour reçu</h3><p>Les décisions de l’Administration apparaîtront ici.</p></div>}</div></article></section>
    <button className="workspace-next" onClick={() => onNavigate('manager')}>Ouvrir le poste de pilotage complet <span>→</span></button>
  </>;
}

type AgentTask = { id:string; asset:string; title:string; due:string; risk:string; status:'À faire'|'En cours'|'Terminé'|'Rétabli provisoirement'; proof:boolean; delayed?:boolean; escalated?:boolean; detail:string };

const agentTaskSets: Record<'electricite'|'eau_incendie', AgentTask[]> = {
  electricite:[
    { id:'ACT-081', asset:'DEMO-GE', title:'Ronde démarrage et mode AUTO', due:'Aujourd’hui · 10:00', risk:'Continuité électrique', status:'À faire', proof:false, detail:'Relever tension batterie, niveau carburant et confirmer le mode AUTO.' },
    { id:'ACT-079', asset:'DEMO-ASC-2', title:'Relever le code après arrêt R+7', due:'En retard · 23 août', risk:'Perte de redondance', status:'En cours', proof:false, delayed:true, detail:'Photographier le code défaut et confirmer le fonctionnement de l’interphone.' },
    { id:'ACT-076', asset:'DEMO-ASC-1', title:'Essai éclairage de secours', due:'Terminé · 08:15', risk:'Aucun après essai', status:'Terminé', proof:true, detail:'Essai concluant, photo et valeur de tension jointes.' },
  ],
  eau_incendie:[
    { id:'ACT-088', asset:'DEMO-SSI', title:'Contrôler pression et coffret GMP', due:'Aujourd’hui · 10:30', risk:'Sécurité incendie critique', status:'À faire', proof:false, detail:'Relever pression, position des vannes et état ON/OFF du coffret.' },
    { id:'ACT-084', asset:'DEMO-EAU', title:'Diagnostiquer défaut pompe P1', due:'Aujourd’hui · 12:00', risk:'Perte de redondance P1/P2', status:'En cours', proof:false, detail:'Deuxième défaut en sept jours. Le réarmement ne vaut pas clôture.' },
    { id:'ACT-080', asset:'DEMO-EAU', title:'Contrôle fuite collecteur', due:'Terminé · 08:05', risk:'Fuite contenue', status:'Terminé', proof:true, detail:'Suintement contenu et photo transmise à Facility Manager.' },
  ],
};

function AgentWorkspace({ persona, anomalies, vendors, canUploadVendorReport, vendorReportBusy, onVendorReport, onFieldRequest, flash }: { persona:Persona; anomalies:Anomaly[]; vendors:OperationalVendor[]; canUploadVendorReport:boolean; vendorReportBusy:boolean; onVendorReport:(input:VendorReportInput)=>Promise<void>; onFieldRequest:(request:Omit<FieldRequest,'id'|'status'>)=>void; flash:(message:string)=>void }) {
  const agentKey = persona.id as 'electricite'|'eau_incendie';
  const [tasks, setTasks] = useState(agentTaskSets[agentKey]);
  const [tab, setTab] = useState<'active'|'done'>('active');
  const [action, setAction] = useState<{type:'measure'|'proof'|'escalate'|'reset'; id:string}|null>(null);
  const [note, setNote] = useState('');
  const visible = tasks.filter((task) => tab === 'done' ? task.status === 'Terminé' : task.status !== 'Terminé');
  const activeTask = action ? tasks.find((task) => task.id === action.id) : null;
  const completeAction = () => {
    if (!action || !activeTask || !note.trim()) return;
    if (action.type === 'proof') setTasks((items) => items.map((task) => task.id === action.id ? { ...task, proof:true } : task));
    if (action.type === 'measure') setTasks((items) => items.map((task) => task.id === action.id ? { ...task, status:'En cours' } : task));
    if (action.type === 'reset') setTasks((items) => items.map((task) => task.id === action.id ? { ...task, status:'Rétabli provisoirement', proof:false } : task));
    if (action.type === 'escalate') {
      setTasks((items) => items.map((task) => task.id === action.id ? { ...task, escalated:true } : task));
      onFieldRequest({ from:persona.name, subject:`${activeTask.asset} · ${activeTask.title}`, note:note.trim() });
    } else flash(`${activeTask.id} · action enregistrée en simulation.`);
    setAction(null); setNote('');
  };
  return <>
    <WorkspaceIntro kicker={persona.role.toUpperCase()} title={`Bonjour ${persona.shortName}`} description={`Votre périmètre aujourd’hui : ${persona.scope}.`} badge="Vue terrain limitée" />
    <AnswerStrip todo={`${tasks.filter((task) => !['Terminé'].includes(task.status)).length} actions`} risk={agentKey === 'eau_incendie' ? 'DEMO-SSI critique' : 'DEMO-ASC-2 en retard'} due={agentKey === 'eau_incendie' ? 'Contrôle avant 10:30' : 'Ronde GE avant 10:00'} proof={`${tasks.filter((task) => task.status !== 'Terminé' && !task.proof).length} requises`} />
    <section className="agent-equipment-grid">{(agentKey === 'electricite' ? [{code:'DEMO-GE',label:'Mode AUTO',value:'À confirmer',tone:'orange'},{code:'DEMO-ASC-1',label:'Disponibilité',value:'Opérationnel',tone:'success'},{code:'DEMO-ASC-2',label:'Disponibilité',value:'Dégradée',tone:'critical'}] : [{code:'DEMO-EAU',label:'Redondance P1/P2',value:'P1 en défaut',tone:'orange'},{code:'DEMO-SSI',label:'Pression réseau',value:'Instable',tone:'critical'},{code:'DEMO-EAU',label:'Fuite active',value:'Non',tone:'success'}]).map((item,index) => <article className="panel equipment-glance" key={`${item.code}-${index}`}><span>{item.code}</span><b>{item.value}</b><Badge tone={item.tone}>{item.label}</Badge></article>)}</section>
    {agentKey === 'eau_incendie' && <section className="provisional-rule"><span>↻</span><div><b>Réarmement = rétablissement provisoire</b><p>L’anomalie reste ouverte jusqu’au diagnostic, à l’intervention corrective et à la preuve validée par Facility Manager.</p></div></section>}
    <section className="panel task-board"><div className="workspace-tabs"><button className={tab === 'active' ? 'active' : ''} onClick={() => setTab('active')}>Mes actions <span>{tasks.filter((task) => task.status !== 'Terminé').length}</span></button><button className={tab === 'done' ? 'active' : ''} onClick={() => setTab('done')}>Terminées <span>{tasks.filter((task) => task.status === 'Terminé').length}</span></button></div><div className="agent-task-list">{visible.length === 0 ? <div className="empty-state compact"><span>✓</span><h3>Tout est terminé</h3><p>Aucune action dans cette file.</p></div> : visible.map((task) => <article key={task.id} className={task.delayed ? 'late' : ''}><div className="task-status"><Badge tone={task.delayed ? 'critical' : task.status === 'Terminé' ? 'success' : task.status === 'Rétabli provisoirement' ? 'orange' : 'blue'}>{task.delayed ? 'EN RETARD' : task.status}</Badge><span>{task.id}</span></div><div className="task-copy"><span className="asset-square">{task.asset.slice(0,2)}</span><div><h3>{task.asset} · {task.title}</h3><p>{task.detail}</p><div><span><b>Risque</b>{task.risk}</span><span><b>Échéance</b>{task.due}</span><span><b>Preuve</b>{task.proof ? 'Jointe' : 'Manquante'}</span></div></div></div>{tab === 'active' && <div className="task-actions"><button onClick={() => {setAction({type:'measure',id:task.id});setNote('')}}>Saisie rapide</button>{agentKey === 'eau_incendie' && task.asset === 'DEMO-EAU' && <button className="reset-action" onClick={() => {setAction({type:'reset',id:task.id});setNote('')}}>↻ Réarmement provisoire</button>}<button onClick={() => {setAction({type:'proof',id:task.id});setNote('')}}>＋ Ajouter preuve</button><button onClick={() => {setAction({type:'escalate',id:task.id});setNote('')}}>{task.escalated ? '✓ Escalade envoyée' : '↑ Escalader à Facility Manager'}</button></div>}</article>)}</div></section>
    <InternalVendorReportPanel anomalies={anomalies.filter((item) => (agentKey === 'electricite' ? ['DEMO-GE'] : ['DEMO-EAU','DEMO-SSI','DEMO-ESP']).includes(item.asset) && item.status !== 'Clôturée')} vendors={vendors} canUpload={canUploadVendorReport} busy={vendorReportBusy} onSubmit={onVendorReport} />
    {action && activeTask && <div className="demo-modal-backdrop"><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="agent-action-title"><button className="modal-close" aria-label="Fermer" onClick={() => setAction(null)}>×</button><Badge tone={action.type === 'escalate' ? 'orange' : action.type === 'reset' ? 'critical' : 'blue'}>{action.type === 'measure' ? 'SAISIE RAPIDE' : action.type === 'proof' ? 'PREUVE' : action.type === 'reset' ? 'RÉARMEMENT PROVISOIRE' : 'ESCALADE FAUSTIN'}</Badge><h3 id="agent-action-title">{activeTask.asset} · {activeTask.title}</h3><p>{action.type === 'reset' ? 'Le service sera indiqué comme rétabli provisoirement. Le dossier restera ouvert.' : action.type === 'proof' ? 'Décrivez la photo ou le document ajouté au dossier.' : action.type === 'escalate' ? 'Expliquez le risque ou le blocage qui nécessite Facility Manager.' : 'Saisissez les mesures et observations relevées.'}</p><label className="field">{action.type === 'proof' ? 'Description de la preuve' : 'Observation obligatoire'}<textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={action.type === 'measure' ? 'Ex. batterie 25,8 V · mode AUTO confirmé…' : 'Ajoutez un commentaire précis…'} /></label>{action.type === 'proof' && <div className="simulated-file"><span>▧</span><div><b>photo_terrain_demo.jpg</b><small>Fichier simulé · 1,4 Mo</small></div></div>}<div className="modal-actions"><button className="secondary-button" onClick={() => setAction(null)}>Annuler</button><button className="primary-button" disabled={!note.trim()} onClick={completeAction}>Enregistrer et transmettre</button></div></section></div>}
  </>;
}

function InternalVendorReportPanel({ anomalies, vendors, canUpload, busy, onSubmit }: { anomalies:Anomaly[]; vendors:OperationalVendor[]; canUpload:boolean; busy:boolean; onSubmit:(input:VendorReportInput)=>Promise<void> }) {
  const [anomalyReference, setAnomalyReference] = useState(anomalies[0]?.id ?? '');
  const [vendorCode, setVendorCode] = useState(vendors[0]?.code ?? '');
  const [reportType, setReportType] = useState<VendorReportInput['reportType']>('intervention_report');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0,10));
  const [summary, setSummary] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [cost, setCost] = useState('');
  const [file, setFile] = useState<File|null>(null);
  const [localBusy, setLocalBusy] = useState(false);

  const submit = async (event:FormEvent) => {
    event.preventDefault();
    if (!canUpload || !file || !anomalyReference || !vendorCode || !summary.trim()) return;
    setLocalBusy(true);
    try {
      await onSubmit({ anomalyReference, vendorCode, file, reportType, reportDate, summary, reserveNotes, costAmount:cost ? Number(cost) : undefined });
      setSummary(''); setReserveNotes(''); setCost(''); setFile(null);
    } finally {
      setLocalBusy(false);
    }
  };

  return <section className={`panel internal-vendor-report ${canUpload ? 'is-authorized' : ''}`}>
    <div className="panel-head"><div><h3>Rapport d’intervention d’une entreprise</h3><p>Dépôt interne au nom d’un prestataire référencé</p></div><Badge tone={canUpload ? 'success' : 'neutral'}>{canUpload ? 'Droit nominatif actif' : 'Droit non attribué'}</Badge></div>
    <div className="internal-access-rule"><span>⌁</span><div><b>Aucun accès direct pour les prestataires</b><p>Un agent interne autorisé rattache le rapport, le fichier et les métadonnées au dossier. Facility Manager contrôle ensuite la preuve.</p></div></div>
    {!canUpload ? <div className="permission-empty"><p>Ce profil ne dispose pas du droit nominatif de dépôt. Agent Électricité et Agent Eau & Incendie sont les seuls agents internes habilités.</p><button className="secondary-button" type="button" disabled>Déposer un rapport prestataire</button></div> :
    <form className="internal-vendor-form" onSubmit={submit}>
      <div className="two-fields"><label className="field">Anomalie<select required value={anomalyReference} onChange={(event) => setAnomalyReference(event.target.value)}>{anomalies.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.asset} · {item.title}</option>)}</select></label><label className="field">Entreprise concernée<select required value={vendorCode} onChange={(event) => setVendorCode(event.target.value)}>{vendors.map((vendor) => <option key={vendor.code} value={vendor.code}>{vendor.code} · {vendor.label}</option>)}</select></label></div>
      <div className="two-fields"><label className="field">Nature du document<select value={reportType} onChange={(event) => setReportType(event.target.value as VendorReportInput['reportType'])}><option value="intervention_report">Rapport d’intervention</option><option value="pv">Procès-verbal</option><option value="quote">Devis</option><option value="photo_bundle">Dossier photos</option></select></label><label className="field">Date du rapport<input type="date" max={new Date().toISOString().slice(0,10)} required value={reportDate} onChange={(event) => setReportDate(event.target.value)} /></label></div>
      <label className="field">Résumé de l’intervention<textarea required value={summary} onChange={(event) => setSummary(event.target.value)} placeholder="Diagnostic, action réalisée, essais et résultat…" /></label>
      <div className="two-fields"><label className="field">Réserves éventuelles<input value={reserveNotes} onChange={(event) => setReserveNotes(event.target.value)} placeholder="Aucune ou détail à lever" /></label><label className="field">Coût indiqué (FCFA)<input type="number" min="0" value={cost} onChange={(event) => setCost(event.target.value)} placeholder="0" /></label></div>
      <label className="field report-file">Rapport, PV ou photo<input type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" onChange={(event) => setFile(event.target.files?.[0] ?? null)} /><small>{file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} Ko` : 'PDF, JPG, PNG ou WebP · 10 Mo maximum'}</small></label>
      <button className="primary-button" disabled={busy || localBusy || !file || !anomalyReference || !vendorCode || !summary.trim()}>{busy || localBusy ? 'Dépôt en cours…' : 'Déposer pour validation de Facility Manager'}</button>
    </form>}
  </section>;
}

function RoundsAssistanceWorkspace({ fieldRequests, onFieldRequest, flash }: { fieldRequests:FieldRequest[]; onFieldRequest:(request:Omit<FieldRequest,'id'|'status'>)=>void; flash:(message:string)=>void }) {
  const [missionTab, setMissionTab] = useState<'terrain'|'administration'>('terrain');
  const [zone, setZone] = useState('Atrium restaurant');
  const [category, setCategory] = useState('Plantes / irrigation');
  const [title, setTitle] = useState('');
  const [photo, setPhoto] = useState(false);
  const [submitted, setSubmitted] = useState<{zone:string;category:string;title:string;status:string}[]>([
    { zone:'R+4 · Circulation Est', category:'Sécurité / accès', title:'Porte coupe-feu maintenue ouverte', status:'À qualifier' },
    { zone:'Atrium restaurant', category:'Infiltration', title:'Trace humide après pluie', status:'Complément demandé' },
  ]);
  const [complementDone, setComplementDone] = useState(false);
  const submit = (event:FormEvent) => {
    event.preventDefault();
    if (!title.trim()) return;
    setSubmitted((items) => [{zone,category,title:title.trim(),status:'À qualifier'}, ...items]);
    onFieldRequest({ from:'Agente Rondes & Assistance Démo', subject:`${category} · ${zone}`, note:`${title.trim()}${photo ? ' · photo de zone jointe' : ' · photo à compléter'}` });
    setTitle(''); setPhoto(false);
  };
  return <>
    <WorkspaceIntro kicker="AGENTE & ASSISTANTE DE DIRECTION" title="Bonjour Agente Rondes & Assistance" description="Séparez clairement vos rondes terrain et votre suivi administratif." badge="Double mission" />
    <AnswerStrip todo="6 zones à parcourir" risk="1 infiltration à vérifier" due="2 devis à relancer" proof="1 autorisation attendue" />
    <div className="mission-switch" role="tablist" aria-label="Fonction de Agente Rondes & Assistance"><button type="button" role="tab" aria-selected={missionTab === 'terrain'} className={missionTab === 'terrain' ? 'active' : ''} onClick={() => setMissionTab('terrain')}><span>✓</span><b>Terrain</b><small>Rondes, constats et brouillons hors ligne</small></button><button type="button" role="tab" aria-selected={missionTab === 'administration'} className={missionTab === 'administration' ? 'active' : ''} onClick={() => setMissionTab('administration')}><span>▧</span><b>Administratif</b><small>Devis, paiements et autorisations</small></button></div>
    {missionTab === 'terrain' && <><section className="rondes_assistance-grid"><article className="panel zone-rounds"><div className="panel-head"><div><h3>Zones du jour</h3><p>Ronde DEMO-RND · 24 août</p></div><Badge tone="blue">4 / 6 contrôlées</Badge></div>{['Hall & accueil|Terminé','Atrium restaurant|À vérifier','Jardinières RDC|En cours','Sanitaires R+2|Terminé','Terrasse R+4|À faire','Parking sous-sol|À faire'].map((item) => {const [label,status] = item.split('|'); return <button key={label}><span className={status === 'Terminé' ? 'done' : status === 'En cours' ? 'current' : ''}>{status === 'Terminé' ? '✓' : '○'}</span><div><b>{label}</b><small>Propreté · plantes · fuite · dégradation</small></div><Badge tone={status === 'Terminé' ? 'success' : status === 'À vérifier' ? 'critical' : status === 'En cours' ? 'blue' : 'neutral'}>{status}</Badge></button>})}</article><form className="panel quick-finding" onSubmit={submit}><div className="panel-head"><div><h3>Créer un constat</h3><p>Envoi direct à Facility Manager pour qualification</p></div><Badge tone="orange">RAPIDE</Badge></div><label className="field">Zone<select value={zone} onChange={(e) => setZone(e.target.value)}><option>Atrium restaurant</option><option>Jardinières RDC</option><option>Terrasse R+4</option><option>Parking sous-sol</option></select></label><label className="field">Catégorie<select value={category} onChange={(e) => setCategory(e.target.value)}><option>Plantes / irrigation</option><option>Propreté</option><option>Infiltration</option><option>Dégradation</option><option>Éclairage</option></select></label><label className="field">Constat<input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. Terre sèche dans la jardinière nord" /></label><button type="button" className={`photo-toggle ${photo ? 'active' : ''}`} onClick={() => setPhoto((value) => !value)}><span>{photo ? '✓' : '＋'}</span><div><b>{photo ? 'Photo de zone ajoutée' : 'Ajouter une photo'}</b><small>Simulation locale · JPG</small></div></button><button className="primary-button" type="submit">Créer et transmettre à Facility Manager</button></form></section><section className="panel signal-tracker"><div className="panel-head"><div><h3>Mes signalements</h3><p>Statuts visibles sans accès aux décisions techniques</p></div><Badge>{submitted.length} dossiers</Badge></div><div className="signal-list">{submitted.map((item,index) => <article key={`${item.title}-${index}`}><div><b>{item.title}</b><p>{item.zone} · {item.category}</p></div><Badge tone={item.status === 'Complément demandé' && !complementDone ? 'orange' : item.status === 'À qualifier' ? 'blue' : 'success'}>{item.status === 'Complément demandé' && complementDone ? 'Complément transmis' : item.status}</Badge>{item.status === 'Complément demandé' && !complementDone && <button onClick={() => {setComplementDone(true);flash('Complément photo transmis à Facility Manager — simulation locale.')}}>Ajouter la photo demandée</button>}</article>)}</div><div className="field-feed-note">{fieldRequests.filter((request) => request.from === 'Agente Rondes & Assistance Démo').length} remontée(s) visible(s) dans la file de Facility Manager.</div></section></>}
    {missionTab === 'administration' && <><section className="mission-permission-note"><span>i</span><div><b>Fonction administrative, sans décision technique</b><p>Agente Rondes & Assistance prépare et suit les pièces. Facility Manager et l’Administration conservent leurs validations respectives.</p></div></section><section className="rondes_assistance-admin-grid"><article className="panel"><div className="panel-head"><div><p className="design-kicker">SUIVI ADMINISTRATIF</p><h3>Devis et autorisations</h3></div><Badge tone="orange">3 À SUIVRE</Badge></div>{[['DEV-031','PREST-EAU','280 000 FCFA','Validation Facility Manager'],['DEV-029','PREST-ASC','950 000 FCFA','Arbitrage Administration'],['DEV-026','PREST-ESP','190 000 FCFA','Bon à payer']].map((item) => <button className="admin-follow-row" key={item[0]}><span>{item[0]}</span><p><b>{item[1]}</b><small>{item[2]} · {item[3]}</small></p><em>Voir →</em></button>)}</article><article className="panel"><div className="panel-head"><div><p className="design-kicker">COÛTS & PAIEMENTS</p><h3>Échéances de la semaine</h3></div></div><div className="payment-summary"><strong>2,12 M</strong><span>FCFA à contrôler</span></div><div className="payment-lines"><span><i className="done" /> 3 pièces complètes</span><span><i /> 1 autorisation attendue</span><span><i className="late" /> 1 paiement en retard</span></div><button className="secondary-button">Ouvrir le suivi financier</button></article></section></>}
  </>;
}

const agentPerformance = [
  { name:'Agent Électricité', score:88 },
  { name:'Agent Eau & Incendie', score:84 },
  { name:'Agente Rondes & Assistance', score:91 },
];

function ScoreRing({ value }: { value:number }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - value / 100);
  return <div className="building-score-ring" aria-label={`Score de santé du bâtiment ${value} sur 100`}>
    <svg viewBox="0 0 128 128" role="img" aria-labelledby="building-score-title building-score-desc">
      <title id="building-score-title">Score de santé du bâtiment</title>
      <desc id="building-score-desc">Le score actuel est de {value} sur 100.</desc>
      <circle className="score-ring-track" cx="64" cy="64" r={radius} />
      <circle className="score-ring-value" cx="64" cy="64" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
    </svg>
    <div><strong>{value}</strong><span>/100</span><small>État global</small></div>
  </div>;
}

function OperationalAnalytics({ equipment, variant = 'direction' }: { equipment:EquipmentItem[]; variant?:'direction'|'manager' }) {
  const [period, setPeriod] = useState<'7j'|'30j'|'90j'>('30j');
  const [equipmentFilter, setEquipmentFilter] = useState<'all'|'watch'>('all');
  const visibleEquipment = (equipmentFilter === 'watch' ? equipment.filter((item) => item.health < 90) : equipment).slice(0,6);
  const periodLabel = period === '7j' ? '7 jours' : period === '30j' ? '30 jours' : '90 jours';
  return <section className={`operational-analytics analytics-${variant}`} aria-labelledby={`${variant}-analytics-title`}>
    <div className="analytics-heading">
      <div><p className="design-kicker">SCORES & TENDANCES</p><h3 id={`${variant}-analytics-title`}>Santé et performance</h3><p>Lecture dynamique des équipements et du traitement des anomalies.</p></div>
      <Badge tone="blue">DONNÉES DE DÉMONSTRATION</Badge>
    </div>
    <div className="analytics-grid">
      <article className="panel analytics-card building-health-card">
        <div className="analytics-card-head"><div><span>SANTÉ BÂTIMENT</span><h4>Score global actuel</h4></div><Badge tone="neutral">FRAÎCHEUR À CONFIRMER</Badge></div>
        <div className="building-health-content">
          <ScoreRing value={82} />
          <div className="score-components" aria-label="Composition du score bâtiment">
            <span><i className="series-1" /><b>70%</b> Équipements</span>
            <span><i className="series-2" /><b>15%</b> Sécurité</span>
            <span><i className="series-3" /><b>10%</b> Zones</span>
            <span><i className="series-4" /><b>5%</b> Continuité</span>
          </div>
        </div>
        <div className="score-causes"><span><b>Facteur négatif</b> DEMO-SSI à 61/100</span><span><b>Facteur positif</b> DEMO-ESP à 98/100</span></div>
        <p className="analytics-note">Le score est plafonné si un équipement vital devient indisponible. La variation sera affichée après constitution de l’historique.</p>
      </article>

      <article className="panel analytics-card trend-card">
        <div className="analytics-card-head"><div><span>ÉVOLUTION</span><h4>Score du bâtiment</h4></div><div className="chart-switch" aria-label="Période du graphique">{(['7j','30j','90j'] as const).map((item) => <button type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item === '7j' ? '7 jours' : item === '30j' ? '30 jours' : '90 jours'}</button>)}</div></div>
        <div className="insufficient-chart" role="status" aria-live="polite"><span>⌁</span><div><b>Données historiques insuffisantes</b><p>Aucune tendance fiable ne peut encore être calculée sur {periodLabel}.</p></div></div>
        <p className="analytics-note">Action requise : enregistrer un instantané quotidien du score avant d’afficher une variation ou une tendance.</p>
      </article>

      <article className="panel analytics-card equipment-chart-card">
        <div className="analytics-card-head"><div><span>PARC TECHNIQUE</span><h4>Scores par équipement</h4></div><div className="chart-switch" aria-label="Filtre des équipements"><button type="button" aria-pressed={equipmentFilter === 'all'} onClick={() => setEquipmentFilter('all')}>Tous</button><button type="button" aria-pressed={equipmentFilter === 'watch'} onClick={() => setEquipmentFilter('watch')}>À surveiller</button></div></div>
        <div className="horizontal-score-chart" aria-live="polite">{visibleEquipment.map((item) => <div className="score-bar-row" key={item.code}><span><b>{item.code}</b><small>{item.label}</small></span><div className="score-bar-track" role="progressbar" aria-label={`${item.label}, ${item.health} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.health}><i className={item.health < 70 ? 'danger' : item.health < 90 ? 'warning' : 'success'} style={{width:`${item.health}%`}} /></div><strong>{item.health}</strong></div>)}</div>
        <div className="chart-legend"><span><i className="success" /> Sain ≥ 90</span><span><i className="warning" /> Surveillance 70–89</span><span><i className="danger" /> Critique &lt; 70</span></div>
      </article>

      <article className="panel analytics-card agent-chart-card">
        <div className="analytics-card-head"><div><span>ÉQUIPE TERRAIN</span><h4>Performance des agents</h4></div><Badge tone="neutral">MÉTHODE À VALIDER</Badge></div>
        <div className="agent-score-chart" aria-label="Scores globaux de démonstration des agents">{agentPerformance.map((agent) => <div className="agent-score-row" key={agent.name}><span><b>{agent.name}</b><small>Score global</small></span><div className="agent-score-track" role="progressbar" aria-label={`${agent.name}, score global de démonstration, ${agent.score} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={agent.score}><i style={{width:`${agent.score}%`}} /></div><strong>{agent.score}</strong></div>)}</div>
        <div className="agent-score-method"><span><b>Période observée</b>Non disponible</span><span><b>Échantillon</b>Non raccordé</span><span><b>Méthode proposée</b>Délais · réactivité · qualité des preuves</span><span><b>Variation / fraîcheur</b>Indisponibles</span></div>
        <p className="analytics-note">Valeurs de démonstration uniquement. Le détail explicatif devra présenter facteurs positifs et négatifs avant validation ; aucune sanction automatique n’est autorisée.</p>
      </article>
    </div>
  </section>;
}

function ManagerHealthOverview({ anomalies, equipment }: { anomalies:Anomaly[]; equipment:EquipmentItem[] }) {
  const criticalCount = anomalies.filter((item) => item.priority === 'Critique' && item.status !== 'Clôturée').length;
  const watchedEquipment = equipment.filter((item) => item.health < 90).length;
  const averageEquipmentHealth = equipment.length ? Math.round(equipment.reduce((total,item) => total + item.health,0) / equipment.length) : 0;
  const averageAgentScore = Math.round(agentPerformance.reduce((total,item) => total + item.score,0) / agentPerformance.length);

  return <section className="manager-health-overview" aria-labelledby="manager-health-title">
    <header className="manager-health-heading">
      <div><p className="design-kicker">SANTÉ &amp; PERFORMANCE</p><h2 id="manager-health-title">Vue d’ensemble du bâtiment</h2><p>Les indicateurs globaux précèdent les files opérationnelles afin de situer immédiatement le niveau de risque.</p></div>
      <div className="delegation-chip" aria-label="Délégation financière active"><span>DÉLÉGATION ACTIVE</span><b>&lt; 400 000 FCFA</b><small>Au-delà : validation de l’Administration</small></div>
    </header>
    <div className="manager-health-kpis">
      <article className="panel manager-health-card manager-building-score">
        <div><span>SANTÉ BÂTIMENT</span><h3>Score global</h3><Badge tone="orange">SURVEILLANCE</Badge></div>
        <ScoreRing value={82} />
      </article>
      <article className="panel manager-health-card manager-critical-health">
        <div className="manager-health-card-head"><span>ALERTES CRITIQUES</span><Badge tone="critical">ACTION REQUISE</Badge></div>
        <strong>{criticalCount}</strong><p>dossier{criticalCount > 1 ? 's' : ''} critique{criticalCount > 1 ? 's' : ''} actif{criticalCount > 1 ? 's' : ''}</p>
        <div className="manager-health-progress danger" role="progressbar" aria-label={`${criticalCount} alertes critiques actives`} aria-valuemin={0} aria-valuemax={Math.max(anomalies.length,1)} aria-valuenow={criticalCount}><i style={{width:`${Math.min(100,(criticalCount / Math.max(anomalies.length,1)) * 100)}%`}} /></div>
      </article>
      <article className="panel manager-health-card">
        <div className="manager-health-card-head"><span>PARC TECHNIQUE</span><Badge tone={watchedEquipment ? 'orange' : 'success'}>{watchedEquipment ? 'À SURVEILLER' : 'OPÉRATIONNEL'}</Badge></div>
        <strong>{averageEquipmentHealth}<small>/100</small></strong><p>{equipment.length} modules suivis · {watchedEquipment} sous surveillance</p>
        <div className="manager-health-progress" role="progressbar" aria-label={`Santé moyenne du parc technique ${averageEquipmentHealth} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={averageEquipmentHealth}><i style={{width:`${averageEquipmentHealth}%`}} /></div>
      </article>
      <article className="panel manager-health-card">
        <div className="manager-health-card-head"><span>ÉQUIPE TERRAIN</span><Badge tone="blue">3 AGENTS</Badge></div>
        <strong>{averageAgentScore}<small>/100</small></strong><p>Score moyen de démonstration · méthode à valider</p>
        <div className="manager-health-progress" role="progressbar" aria-label={`Score moyen de démonstration des agents ${averageAgentScore} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={averageAgentScore}><i style={{width:`${averageAgentScore}%`}} /></div>
      </article>
    </div>
  </section>;
}

function Dashboard({ anomalies, equipment, audience = 'facility', onOpen, onNavigate, readOnly = false }: { anomalies: Anomaly[]; equipment:EquipmentItem[]; audience?:'administration'|'facility'; onOpen:(id:string, from?:View)=>void; onNavigate:(view:View)=>void; readOnly?:boolean }) {
  const [dashboardTab, setDashboardTab] = useState<'overview'|'actions'|'health'|'equipment'>('overview');
  const urgent = anomalies.filter((a) => a.priority === 'Critique' || a.priority === 'Haute').filter((a) => a.status !== 'Clôturée').slice(0,3);
  const lateCount = anomalies.filter((a) => a.delayed && a.status !== 'Clôturée').length;
  const openCount = anomalies.filter((a) => a.status !== 'Clôturée').length;
  const dashboardTabs = [
    { id:'overview' as const, icon:'01', label:'Vue d’ensemble', detail:'5 angles du jour', count:'Synthèse' },
    { id:'actions' as const, icon:'02', label:'Actions & risques', detail:`${openCount} ouverts · ${lateCount} retards`, count:'À traiter' },
    { id:'health' as const, icon:'03', label:'Santé & scores', detail:'Bâtiment · équipements · agents', count:'82/100' },
    { id:'equipment' as const, icon:'04', label:'Parc technique', detail:`${equipment.length} modules suivis`, count:'Équipements' },
  ];
  return <>
    <section className="hero-row dashboard-hero"><div><p className="direction-kicker">{readOnly ? 'CONSULTATION AUTORISÉE' : audience === 'administration' ? 'PILOTAGE ADMINISTRATION' : 'PILOTAGE FACILITY MANAGER'}</p><h2>Situation du bâtiment</h2><p>{readOnly ? 'Indicateurs et registre accessibles sans action de modification.' : audience === 'administration' ? 'Synthèse décisionnelle, risques, coûts et performance.' : 'Priorités opérationnelles, santé du parc et actions attendues.'}</p></div><span className="health-pill"><i /> Disponibilité technique 92%</span></section>
    <nav className="dashboard-section-tabs" role="tablist" aria-label="Sections du tableau de bord">{dashboardTabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={dashboardTab === item.id} aria-controls={`dashboard-panel-${item.id}`} id={`dashboard-tab-${item.id}`} className={dashboardTab === item.id ? 'active' : ''} onClick={() => setDashboardTab(item.id)}><span className="dashboard-tab-index">{item.icon}</span><span className="dashboard-tab-copy"><b>{item.label}</b><small>{item.detail}</small></span><em>{item.count}</em></button>)}</nav>
    {(dashboardTab === 'overview' || dashboardTab === 'actions') && <section id={`dashboard-panel-${dashboardTab}`} role="tabpanel" aria-labelledby={`dashboard-tab-${dashboardTab}`} className={`direction-grid dashboard-tab-panel ${dashboardTab === 'actions' ? 'actions-view' : ''}`} aria-label="Tableau de bord en cinq angles de décision">
      <article className="panel direction-block todo-block">
        <div className="direction-head"><span className="direction-number">01</span><div><h3>À faire aujourd’hui</h3><p>Actions qui débloquent le workflow</p></div><Badge tone="orange">{openCount} ouvertes</Badge></div>
        <div className="todo-summary"><strong>5</strong><span>actions prioritaires<br />avant 17:00</span></div>
        <div className="compact-actions">{urgent.slice(0,2).map((a) => <button key={a.id} onClick={() => onOpen(a.id,'dashboard')}><span className={`risk-dot ${a.priority === 'Critique' ? 'critical' : ''}`} /><div><b>{a.asset} · {a.title}</b><small>{a.status} · échéance {a.due}</small></div><span>›</span></button>)}</div>
        <button className="text-action" onClick={() => onNavigate(readOnly ? 'registry' : 'manager')}>{readOnly ? 'Consulter le registre →' : 'Ouvrir la file de Facility Manager →'}</button>
      </article>

      <article className="panel direction-block risks-block">
        <div className="direction-head"><span className="direction-number">02</span><div><h3>Risques</h3><p>Sécurité et continuité</p></div></div>
        <div className="risk-metrics"><button onClick={() => onOpen('ANO-0241','dashboard')}><strong>2</strong><span>critiques</span></button><button onClick={() => onNavigate(readOnly ? 'registry' : 'manager')}><strong>{lateCount}</strong><span>en retard</span></button></div>
        <div className="risk-focus"><span>!</span><div><b>DEMO-SSI sous surveillance</b><small>Pression incendie instable</small></div></div>
        <button className="text-action" onClick={() => onNavigate('registry')}>Voir la cartographie des risques →</button>
      </article>

      {dashboardTab === 'overview' && <article className="panel direction-block costs-block">
        <div className="direction-head"><span className="direction-number">03</span><div><h3>Coûts</h3><p>Projection maintenance · août</p></div></div>
        <div className="cost-main"><span>Budget engagé</span><strong>6 200 000 <small>FCFA</small></strong></div>
        <div className="cost-progress"><i /></div>
        <div className="cost-details"><div><span>Estimé fin de mois</span><b>7 800 000 FCFA</b></div><div className="cost-gap"><span>Écart projeté</span><b>+1 600 000 FCFA</b></div></div>
        <small className="cost-note">77% du plafond mensuel de 11 M FCFA engagé</small>
      </article>}

      {dashboardTab === 'overview' && <article className="panel direction-block performance-block">
        <div className="direction-head"><span className="direction-number">04</span><div><h3>Performance</h3><p>Qualité de service</p></div></div>
        <div className="performance-score"><strong>89%</strong><span>interventions dans les délais</span></div>
        <div className="performance-bar"><i /></div>
        <div className="performance-facts"><span><b>24</b> clôturées ce mois</span><span><b>92%</b> disponibilité technique</span></div>
      </article>}

      <article className="panel direction-block decisions-block">
        <div className="direction-head"><span className="direction-number">05</span><div><h3>Décisions recommandées</h3><p>Arbitrages proposés selon le niveau de risque</p></div><Badge tone="critical">3 décisions</Badge></div>
        <div className="decision-list">
          <button onClick={() => onOpen('ANO-0241','dashboard')}><span className="decision-priority critical">1</span><div><b>Qualifier DEMO-SSI en priorité critique</b><small>Sécurité incendie · décision requise avant 10:30</small></div><span>{readOnly ? 'Consulter →' : 'Décider →'}</span></button>
          <button onClick={() => onOpen('ANO-0238','dashboard')}><span className="decision-priority warning">2</span><div><b>Relancer le prestataire DEMO-ASC-2</b><small>Intervention en retard · impact usagers</small></div><span>{readOnly ? 'Consulter →' : 'Relancer →'}</span></button>
          <button onClick={() => onOpen('ANO-0231','dashboard')}><span className="decision-priority blue">3</span><div><b>Valider la preuve DEMO-GE</b><small>Test de démarrage concluant · clôture possible</small></div><span>{readOnly ? 'Consulter →' : 'Valider →'}</span></button>
        </div>
      </article>
    </section>}
    {dashboardTab === 'health' && <section id="dashboard-panel-health" role="tabpanel" aria-labelledby="dashboard-tab-health" className="dashboard-tab-panel"><OperationalAnalytics equipment={equipment} /></section>}
    {dashboardTab === 'equipment' && <section id="dashboard-panel-equipment" role="tabpanel" aria-labelledby="dashboard-tab-equipment" className="dashboard-tab-panel"><section className="panel equipment-panel dashboard-equipment-panel"><div className="panel-head"><div><p className="design-kicker">PARC TECHNIQUE</p><h3>État des équipements suivis</h3><p>Lecture comparative des indices de santé et des états opérationnels.</p></div><Badge tone="success">{equipment.length} modules suivis</Badge></div><div className="equipment-grid">{equipment.map((item) => <div className="equipment-card" key={item.code}><div className="equipment-top"><span className="equipment-icon">{item.code.slice(0,2)}</span><Badge tone={item.health < 70 ? 'critical' : item.health < 90 ? 'orange' : 'success'}>{item.state}</Badge></div><strong>{item.code}</strong><p>{item.label}</p><div className="health-line"><i style={{width:`${item.health}%`}} className={item.health < 70 ? 'bad' : item.health < 90 ? 'watch' : ''} /></div><small>Indice {item.health}/100</small></div>)}</div></section></section>}
  </>;
}

function Registry({ anomalies, query, setQuery, priority, setPriority, status, setStatus, onOpen }: { anomalies:Anomaly[]; query:string; setQuery:(v:string)=>void; priority:string; setPriority:(v:string)=>void; status:string; setStatus:(v:string)=>void; onOpen:(id:string)=>void }) {
  const [expandedId, setExpandedId] = useState<string|null>(null);
  return <>
    <section className="section-heading"><div><h2>Registre central</h2><p>{anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} correspondant à vos critères</p></div><button className="secondary-button">⇩ Exporter</button></section>
    <section className="filter-bar"><label className="search-box"><span>⌕</span><input aria-label="Rechercher dans le registre" placeholder="Rechercher par équipement, anomalie…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label>Priorité<select value={priority} onChange={(e) => setPriority(e.target.value)}><option>Toutes</option><option>Critique</option><option>Haute</option><option>Moyenne</option><option>Faible</option></select></label><label>Statut<select value={status} onChange={(e) => setStatus(e.target.value)}><option>Tous</option><option>À qualifier</option><option>Affectée</option><option>En intervention</option><option>En validation</option><option>Clôturée</option></select></label>{(query || priority !== 'Toutes' || status !== 'Tous') && <button className="clear-button" onClick={() => {setQuery('');setPriority('Toutes');setStatus('Tous')}}>Effacer</button>}</section>
    <section className="registry-card"><div className="registry-head"><span>Anomalie</span><span>Priorité</span><span>Étape</span><span>Échéance</span><span>Responsable</span><span /></div>{anomalies.length === 0 ? <div className="empty-state"><span>⌕</span><h3>Aucun résultat</h3><p>Essayez d’élargir vos critères de recherche.</p></div> : anomalies.map((a) => <article className={`registry-entry ${expandedId === a.id ? 'is-expanded' : ''}`} key={a.id}><button className="registry-row" onClick={() => onOpen(a.id)}><div className="registry-title"><span className={`asset-square ${priorityTone(a.priority)}`}>{a.asset.split('-')[0].slice(0,2)}</span><div><b>{a.title}</b><small>{a.id} · <span className="equipment-reference">{a.asset}</span> · {a.location}</small></div></div><div><Badge tone={priorityTone(a.priority)}>{a.priority}</Badge></div><div><Badge tone={statusTone(a.status)}>{a.status}</Badge></div><div className={a.delayed && a.status !== 'Clôturée' ? 'late-text' : ''}>{a.delayed && a.status !== 'Clôturée' && <b>EN RETARD</b>}<span>{a.due}</span></div><div className="owner-cell"><span className="mini-avatar">{canonicalResponsible(a) ? canonicalResponsible(a)!.split(' ').map((w) => w[0]).join('').slice(0,2) : '—'}</span><span>{canonicalResponsible(a) ?? 'Non attribué'}{externalActorConcerned(a) && <small>Acteur externe : {externalActorConcerned(a)}</small>}</span></div><div className="registry-mobile-meta"><Badge tone={priorityTone(a.priority)}>{a.priority}</Badge><Badge tone={statusTone(a.status)}>{a.status}</Badge>{a.delayed && a.status !== 'Clôturée' && <Badge tone="critical">EN RETARD</Badge>}</div><div className="registry-mobile-details"><span><b>Échéance</b>{a.due}</span><span><b>Responsable interne</b>{canonicalResponsible(a) ?? 'Non attribué'}{externalActorConcerned(a) && <small>Acteur externe : {externalActorConcerned(a)}</small>}</span></div><span className="row-arrow">›</span></button><button type="button" className="registry-summary-toggle" aria-expanded={expandedId === a.id} onClick={() => setExpandedId((current) => current === a.id ? null : a.id)}>{expandedId === a.id ? 'Masquer la continuité de traitement' : 'Afficher la continuité de traitement'} <span>{expandedId === a.id ? '−' : '+'}</span></button>{expandedId === a.id && <AntiZombieSummary data={adaptDossierToAntiZombieSummary(a)} variant="compact" />}</article>)}</section>
  </>;
}

function Manager({ anomalies, equipment, tab, setTab, onOpen }: { anomalies:Anomaly[]; equipment:EquipmentItem[]; tab:ManagerQueue; setTab:(v:ManagerQueue)=>void; onOpen:(id:string)=>void }) {
  const groups:Record<ManagerQueue,Anomaly[]> = {
    qualify:anomalies.filter((a) => a.status === 'À qualifier'),
    late:anomalies.filter((a) => a.delayed && a.status !== 'Clôturée'),
    unassigned:anomalies.filter((a) => !canonicalResponsible(a) && a.status !== 'Clôturée'),
    proof:anomalies.filter((a) => a.proofPending),
    reception:[],
    reservations:[],
    reopened:[],
  };
  const queueMeta:Record<ManagerQueue,{label:string;short:string}> = {
    qualify:{label:'À qualifier',short:'AQ'},
    late:{label:'En retard',short:'SLA'},
    unassigned:{label:'Sans responsable',short:'SR'},
    proof:{label:'Preuves à vérifier',short:'PV'},
    reception:{label:'Réceptions',short:'RC'},
    reservations:{label:'Réserves',short:'RS'},
    reopened:{label:'Dossiers rouverts',short:'RO'},
  };
  const active = groups[tab];
  const [selectedId, setSelectedId] = useState('ANO-0241');
  const [branch, setBranch] = useState<'internal'|'cost'|'external'>('cost');
  const [amount, setAmount] = useState('280000');
  const [decisionDone, setDecisionDone] = useState(false);
  const focus = active.find((item) => item.id === selectedId) ?? active[0] ?? anomalies[0];
  const amountValue = Number(amount || 0);
  const overThreshold = amountValue >= 400000;
  const branchLocked = focus.status === 'À qualifier' && !canonicalResponsible(focus);
  const priorityCode:Record<Priority,string> = { Critique:'C', Haute:'H', Moyenne:'M', Faible:'F' };

  return <div className="manager-pilot">
    <ManagerHealthOverview anomalies={anomalies} equipment={equipment} />

    <section className="manager-kpis manager-kpis-target" aria-label="Indicateurs opérationnels">
      <button type="button" aria-pressed={tab === 'qualify'} className={tab === 'qualify' ? 'active' : ''} onClick={() => {setTab('qualify');setDecisionDone(false)}}>
        <span className="kpi-icon amber">AQ</span><div><strong>{groups.qualify.length}</strong><small>À qualifier</small></div>
      </button>
      <button type="button" aria-pressed={tab === 'late'} className={tab === 'late' ? 'active' : ''} onClick={() => {setTab('late');setDecisionDone(false)}}>
        <span className="kpi-icon red">SLA</span><div><strong>{groups.late.length}</strong><small>En retard</small></div>
      </button>
      <button type="button" aria-pressed={tab === 'proof'} className={tab === 'proof' ? 'active' : ''} onClick={() => {setTab('proof');setDecisionDone(false)}}>
        <span className="kpi-icon blue">PV</span><div><strong>{groups.proof.length}</strong><small>Preuves à vérifier</small></div>
      </button>
      <div className="completion" aria-label="Score de traitement 86 sur 100">
        <div><span>Score traitement</span><b>86/100</b></div>
        <div className="completion-bar" aria-hidden="true"><i style={{width:'86%'}} /></div>
        <small>Délais 88 · réactivité 91 · preuves 79</small>
      </div>
    </section>

    <section className="fm-decision-layout">
      <article className="panel fm-inbox">
        <div className="queue-tabs" role="tablist" aria-label="Files de travail">
          {(Object.keys(queueMeta) as ManagerQueue[]).map((key) => <button type="button" role="tab" key={key} aria-selected={tab === key} className={tab === key ? 'active' : ''} onClick={() => setTab(key)}>{queueMeta[key].label} <span>{groups[key].length}</span></button>)}
        </div>
        <div className="fm-inbox-list">
          {active.length ? active.map((item) => <button type="button" key={item.id} aria-pressed={focus.id === item.id} className={focus.id === item.id ? 'active' : ''} onClick={() => {setSelectedId(item.id);setDecisionDone(false)}}>
            <span className={`queue-mark ${priorityTone(item.priority)}`} aria-label={`Priorité ${item.priority}`}>{priorityCode[item.priority]}</span>
            <div><span>{item.asset} · {item.id}</span><b>{item.title}</b><small>{canonicalResponsible(item) ?? 'Responsable non attribué'} · échéance {item.due}</small>{externalActorConcerned(item) && <small>Acteur externe concerné : {externalActorConcerned(item)}</small>}</div>
            <Badge tone={priorityTone(item.priority)}>{item.priority}</Badge>
          </button>) : <div className="empty-state compact"><span>{['reception','reservations','reopened'].includes(tab) ? '⌁' : '✓'}</span><h3>{['reception','reservations','reopened'].includes(tab) ? 'Donnée non raccordée' : 'File à jour'}</h3><p>{['reception','reservations','reopened'].includes(tab) ? 'La source métier canonique de cette file doit encore être raccordée.' : 'Aucune action dans cette catégorie.'}</p></div>}
        </div>
      </article>

      <div className="fm-right-column">
      <article className="panel fm-decision-card">
        <div className="fm-decision-head">
          <div><div><Badge tone={priorityTone(focus.priority)}>{focus.priority}</Badge><span>{focus.id} · {focus.asset}</span></div><h3>{focus.title}</h3><p>{focus.location}</p></div>
          <button type="button" className="secondary-button" onClick={() => onOpen(focus.id)}>Voir le dossier complet</button>
        </div>

        <AntiZombieSummary data={adaptDossierToAntiZombieSummary(focus)} variant="standard" />

        <div className="fm-section-title"><div><span>1</span><p><b>{branchLocked ? 'Préparer la qualification et l’affectation' : 'Choisir la branche de traitement'}</b><small>{branchLocked ? 'Le diagnostic agent doit être enregistré avant le choix de la branche.' : 'Une décision explicite oriente le reste du dossier.'}</small></p></div></div>
        <div className={`branch-selector ${branchLocked ? 'is-locked' : ''}`} aria-label="Branche de traitement" aria-disabled={branchLocked}>
          <button type="button" disabled={branchLocked} aria-pressed={branch === 'internal'} className={branch === 'internal' ? 'active' : ''} onClick={() => {setBranch('internal');setAmount('0')}}><span>A</span><b>Interne sans coût</b><small>Action dans le périmètre agent</small></button>
          <button type="button" disabled={branchLocked} aria-pressed={branch === 'cost'} className={branch === 'cost' ? 'active' : ''} onClick={() => setBranch('cost')}><span>B</span><b>Interne avec coût</b><small>Achat ou petite prestation</small></button>
          <button type="button" disabled={branchLocked} aria-pressed={branch === 'external'} className={branch === 'external' ? 'active' : ''} onClick={() => setBranch('external')}><span>C</span><b>Intervention externe</b><small>Devis et entreprise référencée</small></button>
        </div>
        {branchLocked && <div className="branch-lock-note" role="note"><span>⌁</span><div><b>Choix de branche indisponible à cette étape</b><small>Action actuelle : qualifier, affecter, puis attendre le diagnostic confirmé.</small></div></div>}

        <div className="fm-decision-fields">
          <label className="field proposed-field">Nouveau responsable proposé<small>Valeur actuelle : {canonicalResponsible(focus) ?? 'Responsable non attribué'}</small>{externalActorConcerned(focus) && <small>Acteur externe concerné : {externalActorConcerned(focus)}</small>}<select key={`owner-${focus.id}`} defaultValue={focus.asset === 'DEMO-EAU' || focus.asset === 'DEMO-SSI' ? 'Agent Eau & Incendie Démo' : 'Agent Électricité Démo'}><option>Agent Eau & Incendie Démo</option><option>Agent Électricité Démo</option><option>Agente Rondes & Assistance Démo</option></select></label>
          <label className="field proposed-field">Nouvelle échéance proposée<small>Valeur actuelle : {focus.due}</small><input key={`due-${focus.id}`} type="datetime-local" defaultValue="2026-08-28T12:00" /></label>
          <label className="field proposed-field">Coût estimé proposé (FCFA)<small>Non enregistré</small><input type="number" min="0" step="10000" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={branchLocked || branch === 'internal'} /></label>
        </div>

        <div className={`authority-result ${branchLocked ? 'pending' : overThreshold ? 'escalate' : 'delegated'}`} role="status">
          <span>{branchLocked ? '⌁' : overThreshold ? '↑' : '✓'}</span><div><b>{branchLocked ? 'Qualification requise avant arbitrage financier' : overThreshold ? 'Validation de l’Administration requise' : 'Décision dans la délégation de Facility Manager'}</b><small>{branchLocked ? 'Le seuil de 400 000 FCFA sera appliqué après le diagnostic et le choix de la branche.' : overThreshold ? `${formatMoney(amountValue)} dépasse ou atteint le seuil de 400 000 FCFA.` : `${formatMoney(amountValue)} reste sous le seuil validé.`}</small></div>
        </div>
        <label className="field">{branchLocked ? 'Note de qualification' : 'Décision motivée'}<textarea defaultValue={branchLocked ? 'Affectation proposée pour réaliser et confirmer le diagnostic terrain.' : overThreshold ? 'Intervention à soumettre avec devis et justification de continuité de service.' : 'Intervention autorisée pour rétablir le fonctionnement et éviter une récidive.'} /></label>
        <div className="fm-decision-actions"><small>Proposition de maquette · la synthèse conserve les valeurs actuelles tant qu’aucune transaction n’est confirmée</small><button type="button" className="secondary-button" onClick={() => setDecisionDone(false)}>Conserver en brouillon</button><button type="button" className="primary-button" onClick={() => setDecisionDone(true)}>{branchLocked ? 'Préparer l’affectation' : overThreshold ? 'Soumettre à l’Administration' : 'Préparer la décision'}</button></div>
        {decisionDone && <div className="inline-success" role="status"><span>✓</span><p><b>Proposition préparée</b><small>Elle reste distincte de l’état actuel du dossier jusqu’à son enregistrement côté serveur.</small></p></div>}
      </article>
      <WorkflowAnalytics items={anomalies.map((item) => ({ ...item, owner:canonicalResponsible(item) ?? 'Non affectée' }))} variant="manager" />
      </div>
    </section>
  </div>;
}

function Detail({ anomaly, onBack, onStatus, onProof, onVerify, readOnly = false, canVerify = false, busy = false }: { anomaly:Anomaly; onBack:()=>void; onStatus:(s:Status)=>void; onProof:(file:File)=>void; onVerify:()=>void; readOnly?:boolean; canVerify?:boolean; busy?:boolean }) {
  const nextStep:Partial<Record<Status,Status>> = { 'À qualifier':'Affectée', 'Affectée':'En intervention', 'En intervention':'En validation', 'En validation':'Clôturée' };
  const nextStatusOption = nextStep[anomaly.status];
  const [nextStatus, setNextStatus] = useState<Status>(nextStatusOption ?? anomaly.status);
  const [section, setSection] = useState<'overview'|'finance'|'evidence'|'history'>('overview');
  const proofInput = useRef<HTMLInputElement>(null);
  const chooseProof = () => proofInput.current?.click();
  const workflow = ['Constat','Qualification','Décision','Intervention','Preuve','Clôture'];
  const statusStep:Record<Status,number> = { 'À qualifier':1, 'Affectée':2, 'En intervention':3, 'En validation':4, 'Clôturée':5 };
  const currentStep = statusStep[anomaly.status];
  const estimatedCost = anomaly.asset === 'DEMO-EAU' ? 280000 : anomaly.asset === 'DEMO-GE' ? 2400000 : anomaly.asset === 'DEMO-ASC-2' ? 950000 : 0;
  const overThreshold = estimatedCost >= 400000;
  return <>
    <input ref={proofInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) onProof(file); event.currentTarget.value = ''; }} />
    <button className="back-button dossier-back" onClick={onBack}>← Retour à la file</button>
    <section className="dossier-hero"><div><div className="detail-labels"><Badge tone={priorityTone(anomaly.priority)}>{anomaly.priority}</Badge>{anomaly.delayed && anomaly.status !== 'Clôturée' && <Badge tone="critical">EN RETARD</Badge>}{readOnly && <Badge tone="neutral">CONSULTATION</Badge>}<span>{anomaly.id}</span></div><h2>{anomaly.title}</h2><p>{anomaly.asset} · {anomaly.location}</p></div>{!readOnly && nextStatusOption && <div className="detail-actions"><select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as Status)} aria-label="Étape suivante"><option value={nextStatusOption}>{nextStatusOption}</option></select><button className="primary-button" disabled={busy} onClick={() => onStatus(nextStatus)}>{busy ? 'Enregistrement…' : 'Valider l’étape'}</button></div>}</section>
    <section className="dossier-workflow" aria-label="Cycle du dossier">{workflow.map((item,index) => <div key={item} className={index < currentStep ? 'done' : index === currentStep ? 'current' : ''}><span>{index < currentStep ? '✓' : index+1}</span><b>{item}</b></div>)}</section>
    {anomaly.priority === 'Critique' && !anomaly.proof && <section className="critical-banner dossier-critical"><span>!</span><div><b>Clôture verrouillée jusqu’à l’acceptation de la preuve</b><p>{anomaly.proofPending ? 'Une preuve a été déposée et attend le contrôle de Facility Manager.' : 'La matrice des preuves exige une pièce conforme avant clôture.'}</p></div>{!readOnly && !anomaly.proofPending && <button disabled={busy} onClick={chooseProof}>＋ Ajouter une preuve</button>}</section>}
    <nav className="dossier-tabs" aria-label="Sections du dossier"><button className={section === 'overview' ? 'active' : ''} onClick={() => setSection('overview')}>Vue d’ensemble</button><button className={section === 'finance' ? 'active' : ''} onClick={() => setSection('finance')}>Coûts & décision</button><button className={section === 'evidence' ? 'active' : ''} onClick={() => setSection('evidence')}>Preuves <span>{anomaly.proof ? '1' : '0'}</span></button><button className={section === 'history' ? 'active' : ''} onClick={() => setSection('history')}>Historique</button></nav>

    {section === 'overview' && <section className="dossier-three-zone">
      <aside className="dossier-identity-column">
        <article className="panel dossier-identity-card"><p className="design-kicker">IDENTITÉ & RISQUE</p><div className="identity-priority"><Badge tone={priorityTone(anomaly.priority)}>{anomaly.priority}</Badge><Badge tone={statusTone(anomaly.status)}>{anomaly.status}</Badge></div><dl><div><dt>Équipement</dt><dd>{anomaly.asset}</dd></div><div><dt>Zone</dt><dd>{anomaly.location}</dd></div><div><dt>Origine</dt><dd>{anomaly.asset === 'DEMO-EAU' ? 'Ronde Surpresseur quotidienne' : 'Constat terrain'}</dd></div><div><dt>Responsable interne actuel</dt><dd className={!canonicalResponsible(anomaly) ? 'missing-value' : ''}>{canonicalResponsible(anomaly) ?? 'Responsable non attribué'}</dd></div>{externalActorConcerned(anomaly) && <div><dt>Acteur externe concerné</dt><dd>{externalActorConcerned(anomaly)}</dd></div>}<div><dt>Constaté le</dt><dd>{anomaly.reported}</dd></div></dl></article>
        <article className="panel dossier-source-card"><span>R</span><div><b>Saisie directe</b><small>Source traçable · aucun import de reporting</small></div></article>
      </aside>
      <div className="dossier-activity-column">
        <article className="panel dossier-description"><div className="panel-head"><div><p className="design-kicker">CONSTAT D’ORIGINE</p><h3>Situation observée</h3></div><span>{anomaly.reported}</span></div><p>{anomaly.description}</p></article>
        <article className="panel dossier-diagnostic-card"><div className="panel-head"><div><p className="design-kicker">DIAGNOSTIC & INTERVENTION</p><h3>Progression métier</h3></div><Badge tone={statusTone(anomaly.status)}>{workflow[currentStep]}</Badge></div><div className="diagnostic-state"><span>⌁</span><div><b>{anomaly.status === 'À qualifier' || anomaly.status === 'Affectée' ? 'Diagnostic technique attendu' : 'Diagnostic enregistré dans le cycle'}</b><p>{anomaly.status === 'À qualifier' || anomaly.status === 'Affectée' ? 'Aucun diagnostic canonique n’est disponible dans la projection actuelle.' : 'Consultez l’historique pour les détails attribués et horodatés.'}</p></div></div><div className="compact-workflow">{workflow.map((item,index) => <span key={item} className={index < currentStep ? 'done' : index === currentStep ? 'current' : ''}><i>{index < currentStep ? '✓' : index+1}</i>{item}</span>)}</div></article>
      </div>
      <aside className="dossier-decision-column">
        <AntiZombieSummary data={adaptDossierToAntiZombieSummary(anomaly)} variant="detailed" />
        <article className="panel next-step-card"><p className="design-kicker">ACTION PRINCIPALE</p><h3>{nextActionFor(anomaly)}</h3><p>{!canonicalResponsible(anomaly) ? 'Facility Manager doit d’abord attribuer un responsable interne autorisé.' : `Responsable interne actuel : ${canonicalResponsible(anomaly)}.`}</p>{externalActorConcerned(anomaly) && <small>Acteur externe concerné : {externalActorConcerned(anomaly)}</small>}<button className="primary-button">{anomaly.status === 'À qualifier' ? 'Ouvrir la qualification' : anomaly.status === 'Clôturée' ? 'Consulter la clôture' : 'Poursuivre le traitement'}</button></article>
        <article className="panel recurrence-card"><div><span>↻</span><p><b>Récurrence à confirmer</b><small>Historique insuffisant</small></p></div><p>Aucune récurrence n’est affirmée sans événements métier datés.</p></article>
      </aside>
    </section>}

    {section === 'finance' && <section className="dossier-two-columns"><article className="panel finance-decision-card"><div className="panel-head"><div><p className="design-kicker">BRANCHE DE TRAITEMENT</p><h3>{estimatedCost ? 'Intervention avec coût' : 'Intervention interne sans coût'}</h3></div><Badge tone={overThreshold ? 'orange' : 'success'}>{overThreshold ? 'ADMINISTRATION' : 'DÉLÉGATION FM'}</Badge></div><div className="finance-amount"><span>Coût estimé</span><strong>{formatMoney(estimatedCost)}</strong><small>Seuil d’approbation : 400 000 FCFA</small></div><div className={`authority-result ${overThreshold ? 'escalate' : 'delegated'}`}><span>{overThreshold ? '↑' : '✓'}</span><div><b>{overThreshold ? 'Arbitrage de l’Administration' : 'Facility Manager peut décider'}</b><small>{overThreshold ? 'Le montant dépasse la délégation validée.' : 'Le montant reste sous le seuil validé.'}</small></div></div><div className="decision-audit"><span><b>Décision</b>{overThreshold ? 'À soumettre' : 'Autorisée dans la délégation'}</span><span><b>Motif</b>Continuité de service et prévention de récidive</span><span><b>Urgence</b>Non déclarée</span></div></article><aside className="panel quote-card"><p className="design-kicker">PIÈCES FINANCIÈRES</p><h3>Devis et engagement</h3><div className="quote-file"><span>▧</span><p><b>{estimatedCost ? 'DEVIS-INTERVENTION.pdf' : 'Aucun devis requis'}</b><small>{estimatedCost ? 'Reçu · à contrôler' : 'Branche interne sans coût'}</small></p></div><button className="secondary-button">Ajouter une pièce</button></aside></section>}

    {section === 'evidence' && <section className="dossier-two-columns"><article className="panel evidence-panel"><div className="panel-head"><div><h3>Preuves du dossier</h3><p>Pièces adaptées au type d’intervention</p></div>{!readOnly && !anomaly.proofPending && <button disabled={busy} onClick={chooseProof}>＋ Ajouter</button>}</div>{anomaly.proof ? <div className="evidence-file"><span>▧</span><div><b>Preuve d’intervention acceptée</b><small>Fichier privé · contrôle Facility Manager terminé</small></div><Badge tone="success">ACCEPTÉE</Badge></div> : anomaly.proofPending ? <div className="evidence-file"><span>▧</span><div><b>Preuve reçue</b><small>Contrôle Facility Manager requis</small></div><Badge tone="orange">À VALIDER</Badge>{canVerify && <button className="primary-button" disabled={busy} onClick={onVerify}>Valider</button>}</div> : <div className="proof-requirement"><span>⌁</span><div><b>{anomaly.asset === 'DEMO-EAU' ? 'Photo du manomètre et rapport d’intervention' : 'Preuve définie selon le type de dossier'}</b><p>La clôture reste impossible tant que la pièce obligatoire n’est pas acceptée.</p></div>{!readOnly && <button className="primary-button" onClick={chooseProof}>Déposer</button>}</div>}</article><aside className="panel proof-matrix-card"><p className="design-kicker">MATRICE APPLIQUÉE</p><h3>{anomaly.asset}</h3><ul><li><span>✓</span>Photo après intervention</li><li><span>{anomaly.asset === 'DEMO-EAU' ? '✓' : '○'}</span>Valeur de contrôle finale</li><li><span>○</span>Rapport ou PV signé</li></ul></aside></section>}

    {section === 'history' && <section className="panel dossier-history"><div className="panel-head"><div><h3>Historique complet</h3><p>Chaque action, auteur et date restent traçables</p></div><Badge>6 ÉTAPES</Badge></div><div className="history-grid">{workflow.map((item,index) => <article key={item} className={index < currentStep ? 'done' : index === currentStep ? 'current' : ''}><span>{index < currentStep ? '✓' : index+1}</span><div><b>{item}</b><small>{index === 0 ? anomaly.reported : index < currentStep ? 'Étape validée et historisée' : index === currentStep ? 'Étape actuelle du dossier' : 'En attente'}</small></div><em>{index < currentStep ? 'TERMINÉ' : index === currentStep ? 'EN COURS' : 'À VENIR'}</em></article>)}</div></section>}
  </>;
}

function MeasureRange({ label, value, min, max, unit }: { label:string; value:number; min:number; max:number; unit:string }) {
  const valid = Number.isFinite(value);
  const inRange = valid && value >= min && value <= max;
  const position = valid ? Math.max(0,Math.min(100,((value - min) / Math.max(.01,max - min)) * 100)) : 0;
  return <article className={`measure-range ${!valid ? 'unknown' : inRange ? 'in-range' : 'out-range'}`}>
    <div><span>{label}</span><b>{valid ? `${value.toLocaleString('fr-FR')} ${unit}` : 'Valeur non renseignée'}</b><em>{valid ? inRange ? 'DANS LA PLAGE' : 'HORS PLAGE' : 'À COMPLÉTER'}</em></div>
    <div className="measure-range-track" aria-label={`${label} : ${valid ? value : 'valeur absente'} ${unit}, plage attendue ${min} à ${max} ${unit}`}><i style={{'--measure-position':`${position}%`} as React.CSSProperties} /></div>
    <small><span>Minimum {min} {unit}</span><span>Maximum {max} {unit}</span></small>
  </article>;
}

function Report({ persona, onNavigate }: { persona:Persona; onNavigate:(v:View)=>void }) {
  const surpresseurAccess = persona.id === 'eau_incendie' || persona.id === 'facility';
  const [step, setStep] = useState(0);
  const [online, setOnline] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pressure, setPressure] = useState('2.8');
  const [tankLevel, setTankLevel] = useState('72');
  const [observation, setObservation] = useState('Vibration légère sur la pompe P1 au démarrage.');
  const [checks, setChecks] = useState<Record<string,boolean>>({ auto:true, p1:false, p2:true, leak:true, valves:true, alarm:true });
  const setCheck = (key:string) => setChecks((items) => ({ ...items, [key]:!items[key] }));

  if (!surpresseurAccess) {
    const isRoundsAssistance = persona.id === 'rondes_assistance';
    return <>
      <section className="section-heading round-heading"><div><p className="design-kicker">SAISIE DIRECTE · MAQUETTE CIBLE</p><h2>{isRoundsAssistance ? 'Ronde cleaning & jardinage' : 'Ronde technique'}</h2><p>Un constat terrain est enregistré dans l’application puis transmis à Facility Manager pour qualification.</p></div><Badge tone="blue">AUCUN IMPORT</Badge></section>
      <section className="quick-round-layout">
        <form className="panel quick-round-card" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
          <div className="round-card-head"><span className="round-icon">{isRoundsAssistance ? 'R' : 'GE'}</span><div><b>{isRoundsAssistance ? 'DEMO-RND' : 'DEMO-GE'}</b><small>{isRoundsAssistance ? 'Périmètre cleaning et jardinage' : 'Périmètre électrique autorisé'}</small></div><span className="mockup-label">MAQUETTE</span></div>
          <div className="two-fields"><label className="field">Zone<select defaultValue={isRoundsAssistance ? 'Jardin nord' : 'Local groupe électrogène'}><option>{isRoundsAssistance ? 'Jardin nord' : 'Local groupe électrogène'}</option><option>{isRoundsAssistance ? 'Atrium restaurant' : 'Local TGBT'}</option></select></label><label className="field">Type de contrôle<select><option>{isRoundsAssistance ? 'Propreté & état' : 'Ronde préventive'}</option><option>{isRoundsAssistance ? 'Jardinage' : 'Constat incident'}</option></select></label></div>
          <label className="field">Constat<textarea defaultValue={isRoundsAssistance ? 'Présence d’eau stagnante près de l’accès jardin nord.' : 'Mode AUTO confirmé. Tension batterie à contrôler au prochain démarrage.'} /></label>
          <div className="evidence-drop"><span>＋</span><div><b>Ajouter une photo</b><small>La pièce reste attachée au constat, jamais importée comme reporting.</small></div></div>
          <div className="round-submit"><p><span className="status-dot local" /> Brouillon conservé sur cet appareil</p><button className="primary-button" type="submit">Transmettre à Facility Manager</button></div>
        </form>
        <aside className="panel direct-flow-card"><p className="design-kicker">APRÈS L’ENVOI</p><h3>Un circuit court et lisible</h3>{['Constat enregistré','Qualification par Facility Manager','Affectation et échéance','Traitement avec preuve'].map((item,index) => <div key={item}><span>{index+1}</span><p><b>{item}</b><small>{index === 0 ? 'Vous gardez une trace immédiate' : 'Le dossier avance dans le même outil'}</small></p></div>)}</aside>
      </section>
      {submitted && <div className="prototype-success" role="status"><span>✓</span><div><b>Constat prêt à être transmis</b><small>Interaction de maquette : aucune donnée n’a été écrite en préproduction.</small></div><button onClick={() => onNavigate('workspace')}>Retour à mon espace</button></div>}
    </>;
  }

  const steps = ['Contexte','Pression','Pompes','Sécurité','Synthèse'];
  const pressureValue = Number(pressure.replace(',','.'));
  const hasPressureAlert = Number.isFinite(pressureValue) && pressureValue < 3;
  const completedChecks = Object.values(checks).filter(Boolean).length;

  return <>
    <section className="surpresseur-hero">
      <div className="surpresseur-identity"><span className="surpresseur-monogram">WI</span><div><p className="design-kicker">MODULE PILOTE · SURPRESSEUR</p><h2>Ronde Surpresseur · DEMO-EAU</h2><p>Sous-sol · Local surpresseur · Fréquence quotidienne</p></div></div>
      <div className="surpresseur-health"><span>Score santé</span><strong>78<small>/100</small></strong><Badge tone="orange">SURVEILLANCE</Badge></div>
    </section>

    <section className={`sync-banner ${online ? 'is-online' : ''}`} role="status">
      <span className={`status-dot ${online ? 'online' : 'local'}`} />
      <div><b>{online ? 'Connexion retrouvée' : 'Mode hors ligne actif'}</b><small>{online ? 'Le brouillon local est prêt à être synchronisé.' : 'La ronde reste disponible. Vos réponses sont conservées sur cet appareil.'}</small></div>
      <button onClick={() => setOnline((value) => !value)}>{online ? 'Repasser hors ligne' : 'Simuler le retour réseau'}</button>
    </section>

    <section className="surpresseur-progress" aria-label="Progression de la ronde">
      {steps.map((item,index) => <button key={item} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? '✓' : index+1}</span><b>{item}</b></button>)}
    </section>

    <section className="surpresseur-layout">
      <article className="panel surpresseur-form-card">
        <div className="surpresseur-section-head"><div><span>ÉTAPE {step+1} SUR 5</span><h3>{steps[step]}</h3></div><span className="mockup-label">MAQUETTE INTERACTIVE</span></div>

        {step === 0 && <div className="surpresseur-fields"><div className="context-grid"><div><span>Agent</span><b>{persona.name}</b><small>{persona.role}</small></div><div><span>Début</span><b>09:42</b><small>27 août 2026</small></div><div><span>Dernière ronde</span><b>Hier · 08:11</b><small>1 anomalie ouverte</small></div></div><label className="field">Type de ronde<select defaultValue="Quotidienne"><option>Quotidienne</option><option>Après intervention</option><option>Contrôle exceptionnel</option></select></label><div className="surpresseur-callout"><span>i</span><p><b>Point d’attention transmis</b><small>Vérifier la récidive du défaut pompe P1 et la pression de refoulement.</small></p></div></div>}

        {step === 1 && <div className="surpresseur-fields"><div className="measure-grid"><label><span>Pression réseau</span><div><input value={pressure} inputMode="decimal" onChange={(event) => setPressure(event.target.value)} /><b>bar</b></div><small>Plage attendue : 3,0 à 4,5 bar</small></label><label><span>Niveau bâche</span><div><input value={tankLevel} inputMode="numeric" onChange={(event) => setTankLevel(event.target.value)} /><b>%</b></div><small>Plage de contrôle : 40 à 100 %</small></label></div><div className="measure-range-grid"><MeasureRange label="Pression réseau" value={pressureValue} min={3} max={4.5} unit="bar" /><MeasureRange label="Niveau de bâche" value={Number(tankLevel)} min={40} max={100} unit="%" /></div>{hasPressureAlert && <div className="measure-alert"><span>!</span><div><b>Écart détecté automatiquement</b><small>La pression saisie est inférieure au seuil. Un constat sera proposé à Facility Manager.</small></div></div>}<label className="field">Stabilité du manomètre<select><option>Stable</option><option>Oscillation légère</option><option>Oscillation importante</option></select></label></div>}

        {step === 2 && <div className="surpresseur-fields"><div className="check-grid">{[['auto','Mode automatique actif','Commande générale'],['p1','Pompe P1 disponible','Pompe prioritaire'],['p2','Pompe P2 disponible','Pompe de secours'],['leak','Absence de fuite active','Collecteur et raccords']].map(([key,title,detail]) => <button type="button" key={key} className={checks[key] ? 'checked' : 'unchecked'} onClick={() => setCheck(key)}><span>{checks[key] ? '✓' : '!'}</span><p><b>{title}</b><small>{detail}</small></p><em>{checks[key] ? 'Conforme' : 'À signaler'}</em></button>)}</div></div>}

        {step === 3 && <div className="surpresseur-fields"><div className="check-grid compact">{[['valves','Vannes en position normale','Aspiration et refoulement'],['alarm','Aucune alarme active','Coffret et supervision']].map(([key,title,detail]) => <button type="button" key={key} className={checks[key] ? 'checked' : 'unchecked'} onClick={() => setCheck(key)}><span>{checks[key] ? '✓' : '!'}</span><p><b>{title}</b><small>{detail}</small></p><em>{checks[key] ? 'Conforme' : 'À signaler'}</em></button>)}</div><label className="field">Observation terrain<textarea value={observation} onChange={(event) => setObservation(event.target.value)} /></label><div className="evidence-drop"><span>＋</span><div><b>Photo du manomètre ou du coffret</b><small>JPEG, PNG ou WebP · compression prévue avant synchronisation</small></div><button type="button">Choisir</button></div></div>}

        {step === 4 && <div className="surpresseur-fields"><div className="round-summary"><div><span>MESURES</span><b className={hasPressureAlert ? 'warning' : ''}>{pressure} bar</b><small>Pression réseau</small></div><div><span>NIVEAU</span><b>{tankLevel} %</b><small>Bâche de stockage</small></div><div><span>CONTRÔLES</span><b>{completedChecks}/6</b><small>Points conformes</small></div></div><div className="proposed-finding"><span>!</span><div><p>CONSTAT PROPOSÉ</p><h4>Pression Surpresseur sous le seuil attendu</h4><small>Priorité proposée : Haute · Transmission à la file de qualification de Facility Manager.</small></div><Badge tone="orange">À QUALIFIER</Badge></div><label className="confirmation-line"><input type="checkbox" defaultChecked /><span>Je confirme que les valeurs correspondent à la ronde réalisée sur DEMO-EAU.</span></label></div>}

        <div className="surpresseur-actions"><button className="secondary-button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0,value-1))}>← Précédent</button><p><span className="status-dot local" /> Brouillon enregistré localement</p>{step < 4 ? <button className="primary-button" onClick={() => setStep((value) => Math.min(4,value+1))}>Continuer →</button> : <button className="primary-button" onClick={() => setSubmitted(true)}>Terminer la ronde</button>}</div>
      </article>

      <aside className="surpresseur-aside">
        <article className="panel next-action-card"><p className="design-kicker">À SURVEILLER</p><span className="next-action-icon">!</span><h3>Pompe P1 indisponible</h3><p>Deuxième défaut en sept jours. Le réarmement provisoire ne permet pas la clôture.</p><div><span>Responsable pressenti</span><b>Agent Eau & Incendie Démo</b></div></article>
        <article className="panel score-explain-card"><div><span>SCORE WILO</span><b>78/100</b></div><div className="score-freshness"><span><b>État</b>Surveillance</span><span><b>Variation</b>Indisponible</span><span><b>Fraîcheur</b>Non synchronisée</span></div><ul><li><i className="down" /> Pression sous le seuil <b>-8</b></li><li><i className="down" /> Défaut P1 récurrent <b>-10</b></li><li><i className="up" /> Maintenance à jour <b>+6</b></li></ul><p className="analytics-note">Score de maquette : la date de calcul et l’historique réel ne sont pas encore disponibles.</p><button type="button">Voir le détail du calcul</button></article>
      </aside>
    </section>

    {submitted && <div className="prototype-success" role="status"><span>✓</span><div><b>Ronde Surpresseur prête à synchroniser</b><small>Maquette validable : aucune donnée n’a été écrite dans Supabase.</small></div><button onClick={() => setSubmitted(false)}>Continuer la revue</button></div>}
  </>;
}
