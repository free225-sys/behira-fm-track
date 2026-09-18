'use client';

import { FormEvent, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';

import { AntiZombieSummary } from './components/AntiZombieSummary';
import type { AntiZombieSummaryData } from './components/anti-zombie-contract';
import { DossierActionBoard, DossierProofSnapshot, DossierTreatmentStrip, type TreatmentBranch } from './components/DossierContinuity';
import { DossiersWorkspace, dossierActionLabel, type DossiersTab } from './components/DossiersWorkspace';
import { AccessWorkspace } from './components/AccessWorkspace';
import { BuildingHealthCockpit, ScoreRing } from './components/BuildingHealthCockpit';
import { DemoScenarioProvider, DemoScenarioSelect, EquipmentTable, InsufficientNote, ReportTrackingLine, RoundPilotHeader, SegmentedControl, StartRoundPicker, useDemoScoreScenario } from './components/shared';
import { demoHomeSnapshot, demoReportTracking, demoRoundsFor, sessionForAudience } from './lib/ui-contract/fixtures.ts';
import type { TodaysRound, UiSession } from './lib/ui-contract/building-health.ts';
import { asciiInitials, displayAssetCode, displayAssetText, formatCompactMoney, formatTime, formatWeekdayDate, roundStateLabel, roundSubjectLabel, scoreFigure } from './lib/ui-contract/display.ts';
import { Ge01AgentForm } from './components/Ge01Pilot';
import { CostsWorkspace } from './components/CostsWorkspace';
import { EquipmentWorkspace } from './components/EquipmentWorkspace';
import { NotificationBell } from './components/NotificationCenter';
import { ParametersWorkspace, type ParameterWorkspaceData } from './components/ParametersWorkspace';
import { SyncStatusNotice, type SyncStatusState } from './components/SyncStatusNotice';
import { Badge, BrandIcon, Button, Card, DateInput, Field, FieldError, Select } from './components/ui';
import { WorkflowAnalytics } from './components/WorkflowAnalytics';
import {
  hasFieldErrors,
  passwordRules as passwordStrength,
  validateEmailOnly,
  validateInvite,
  validateLogin,
  validatePasswordChange,
  validateVendorReportFields,
  validateZoneName,
  type FieldErrors,
  type VendorReportField,
} from './lib/client-validation';
import { getAuthenticatedProfileGate, resolveAuthenticatedPersona } from './lib/supabase/auth';
import { getBrowserSupabaseClient, setSupabaseRememberPreference } from './lib/supabase/client';
import { getSupabaseIntegrationState, isSupabaseIntegrationEnabled } from './lib/supabase/config';
import { loadOperationalSnapshot, type OperationalVendor } from './lib/supabase/data';
import { advanceAnomalyWorkflow, uploadAnomalyProof, uploadVendorInterventionReport, verifyLatestAnomalyProof } from './lib/supabase/mutations';

type View = 'workspace' | 'dashboard' | 'registry' | 'equipment' | 'costs' | 'access' | 'settings' | 'manager' | 'report' | 'detail';
type Priority = 'Critique' | 'Haute' | 'Moyenne' | 'Faible';
type Status = 'À qualifier' | 'Affectée' | 'En intervention' | 'En validation' | 'Clôturée';
type ManagerQueue = 'all'|'qualify'|'decide'|'late'|'unassigned'|'overThreshold'|'proof'|'reception'|'reservations'|'reopened';
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

type MirrorProof = {
  id:string;
  reference:string;
  capturedAt:string;
  verificationStatus:'pending'|'accepted'|'rejected';
  rejectionReason:string|null;
  mimeType:string;
};

type MirrorTreatment = {
  workOrderReference:string;
  branch:'internal_without_cost'|'internal_with_cost'|'vendor';
  costReference:string|null;
  amount:number|null;
  vendorLabel:string|null;
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
  origin?: string;
  horsScore?: boolean;
  proofs?: MirrorProof[];
  treatment?: MirrorTreatment;
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
  { id:'ANO-0231', asset:'DEMO-GE', title:'Batterie de démarrage sous tension nominale', location:'RDC · Local groupe', priority:'Critique', status:'En validation', reported:'20 août · 11:20', due:'21 août · 10:00', owner:'PREST-GE', delayed:true, proof:true, description:'La batterie mesurée à 11,6 V a été remplacée. Le test de démarrage est concluant, preuve en attente de validation FM.', treatment:{ workOrderReference:'OT-DEMO-0231', branch:'vendor', costReference:'CST-DEMO-0231', amount:400000, vendorLabel:'Prestataire Démo' }, proofs:[
    { id:'prv-0231-a', reference:'PRV-DEMO-0231-A', capturedAt:'20 août · 18:10', verificationStatus:'rejected', rejectionReason:'Photo illisible — reprise demandée', mimeType:'image/jpeg' },
    { id:'prv-0231-b', reference:'PRV-DEMO-0231-B', capturedAt:'21 août · 09:02', verificationStatus:'accepted', rejectionReason:null, mimeType:'application/pdf' },
  ] },
  { id:'ANO-0229', asset:'DEMO-ESP', title:'Électrovanne zone jardin bloquée', location:'Extérieur · Jardin nord', priority:'Faible', status:'Clôturée', reported:'19 août · 09:05', due:'20 août · 17:00', owner:'PREST-ESP', delayed:false, proof:true, description:'Électrovanne nettoyée et remise en service. Cycle d’arrosage contrôlé sur vingt minutes.' },
  { id:'ANO-0226', asset:'DEMO-ASC-1', title:'Éclairage cabine défaillant', location:'Tour A · Ascenseur 1', priority:'Moyenne', status:'Clôturée', reported:'18 août · 14:30', due:'19 août · 12:00', owner:'PREST-ASC', delayed:false, proof:true, description:'Bloc LED remplacé et essai d’éclairage de secours réalisé.' },
  { id:'ANO-0222', asset:'DEMO-RND', title:'Porte coupe-feu maintenue ouverte', location:'R+4 · Circulation Est', priority:'Haute', status:'À qualifier', reported:'24 août · 06:58', due:'Aujourd’hui · 14:00', owner:'Non affectée', delayed:false, proof:false, description:'Le ferme-porte ne ramène plus complètement le vantail. Zone balisée pendant la ronde.' },
  { id:'ANO-0218', asset:'DEMO-GE', title:'Niveau carburant inférieur au seuil', location:'RDC · Local groupe', priority:'Moyenne', status:'Affectée', reported:'17 août · 10:10', due:'Aujourd’hui · 17:00', owner:'PREST-GE', delayed:false, proof:false, description:'Niveau à 28 %, demande de réapprovisionnement transmise au prestataire.' },
];

const personas: Persona[] = [
  { id:'facility', name:'Facility Manager Démo', shortName:'Facility Manager', initials:'FM', role:'Facility Manager', scope:'Pilotage opérationnel et qualification' },
  { id:'administration', name:'Administration Démo', shortName:'Administration', initials:'AD', role:'Administration · Super utilisateur métier', scope:'Arbitrages, risques et engagements' },
  { id:'electricite', name:'Agent Électricité Démo', shortName:'Agent Électricité', initials:'AE', role:'Agent électricité', scope:'DEMO-GE · DEMO-ASC-1 · DEMO-ASC-2' },
  { id:'eau_incendie', name:'Agent Eau & Incendie Démo', shortName:'Agent Eau & Incendie', initials:'AI', role:'Agent eau / incendie', scope:'DEMO-EAU · DEMO-SSI · DEMO-ESP' },
  { id:'rondes_assistance', name:'Agente Rondes & Assistance Démo', shortName:'Agente Rondes & Assistance', initials:'RA', role:'Agente & assistante de direction', scope:'Nettoyage · jardinage · suivi administratif' },
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
  facility:['workspace','dashboard','registry','equipment','costs','access','manager','report'],
  administration:['workspace','dashboard','registry','equipment','costs','access','settings'],
  electricite:['workspace','report'],
  eau_incendie:['workspace','report'],
  rondes_assistance:['workspace','report'],
};

const landingViewByPersona: Record<PersonaId, View> = {
  facility:'workspace',
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
type NavigationItem = {
  key:Exclude<View,'detail'>;
  label:string;
  subtitle:string;
  group:NavigationGroup;
  secondary?:boolean;
};

/* Une seule source alimente le bandeau desktop et la barre mobile. Les groupes
   reprennent mot pour mot DEC-002 afin que le futur menu de débordement ne crée
   pas une nomenclature parallèle. */
const navItems: NavigationItem[] = [
  { key:'workspace', label:'Accueil', subtitle:'Santé du bâtiment et scores des équipements.', group:'Mon travail' },
  { key:'manager', label:'Dossiers', subtitle:'Dossiers nécessitant votre intervention.', group:'Mon travail' },
  { key:'report', label:'Rondes', subtitle:'Contrôles terrain et rondes planifiées.', group:'Mon travail' },
  { key:'registry', label:'Registre', subtitle:'Consultez et recherchez l’ensemble des dossiers.', group:'Le bâtiment' },
  { key:'equipment', label:'Équipements', subtitle:'Santé et informations disponibles du parc technique.', group:'Le bâtiment', secondary:true },
  { key:'dashboard', label:'Pilotage', subtitle:'Performance opérationnelle du site.', group:'Pilotage' },
  { key:'costs', label:'Coûts', subtitle:'Montants documentés, seuil et arbitrages financiers.', group:'Pilotage', secondary:true },
  { key:'access', label:'Utilisateurs et droits', subtitle:'Profils, rôles et périmètres métier.', group:'Administration', secondary:true },
  { key:'settings', label:'Seuils et paramètres', subtitle:'Règles confirmées, portée et historique disponible.', group:'Administration', secondary:true },
];
const navigationGroups: NavigationGroup[] = ['Mon travail','Le bâtiment','Pilotage','Administration'];
const hiddenNavKeys: View[] = ['registry','costs'];
const primaryNavKeysByPersona: Record<PersonaId, View[]> = {
  facility:['workspace','manager','report','equipment','dashboard'],
  administration:['workspace','manager','equipment','dashboard','settings'],
  electricite:['workspace','report'],
  eau_incendie:['workspace','report'],
  rondes_assistance:['workspace','report'],
};
function navItemLabel(item: NavigationItem, personaId: PersonaId) {
  if (personaId === 'administration' && item.key === 'workspace') return 'Arbitrages';
  if (personaId === 'administration' && item.key === 'settings') return 'Paramètres';
  return item.label;
}

const navIconByView: Record<NavigationItem['key'], 'building'|'clipboard'|'mapPin'|'files'|'wrench'|'layout'|'banknote'|'users'|'settings'> = {
  workspace: 'building',
  manager: 'clipboard',
  report: 'mapPin',
  registry: 'files',
  equipment: 'wrench',
  dashboard: 'layout',
  costs: 'banknote',
  access: 'users',
  settings: 'settings',
};

function NavigationIcon({ view, active = false }: { view:NavigationItem['key']; active?: boolean }) {
  return <BrandIcon name={navIconByView[view]} className="nav-icon" size={18} strokeWidth={active ? 2.25 : 1.75} />;
}

const fallbackEquipment: EquipmentItem[] = [
  { code:'DEMO-GE', label:'Groupe électrogène', health:86, state:'Surveillance' },
  { code:'DEMO-EAU', label:'Surpresseur', health:78, state:'Intervention' },
  { code:'DEMO-SSI', label:'Pompe incendie', health:61, state:'Critique' },
  { code:'DEMO-ASC-1/2', label:'Ascenseurs', health:84, state:'Surveillance' },
  { code:'DEMO-ESP', label:'Irrigation', health:98, state:'Sain' },
  { code:'DEMO-RND', label:'Rondes & constats', health:93, state:'Sain' },
];

const DECISION_THRESHOLD_FCFA = 400_000;
const FINANCIAL_DECISION_PARAMETER: ParameterWorkspaceData = {
  code:'financial_decision_threshold',
  label:'Seuil de décision financière',
  value:DECISION_THRESHOLD_FCFA,
  unit:'FCFA',
  scope:'Décisions avec montant documenté',
  effectiveDate:'30 août 2026',
  authority:'Administration de SCI Groupe Behira',
};

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
  if (anomaly.asset === 'DEMO-GE') return 'Justificatif d’intervention et essai de démarrage';
  if (anomaly.asset === 'DEMO-EAU') return 'Photo du manomètre et rapport d’intervention';
  return null;
}

function canonicalResponsible(anomaly:Anomaly) {
  if (anomaly.owner === 'Non affectée') return null;
  return personas.some((persona) => persona.name === anomaly.owner) ? anomaly.owner : null;
}

function externalActorConcerned(anomaly:Anomaly) {
  return anomaly.owner !== 'Non affectée' && !canonicalResponsible(anomaly) ? anomaly.owner : null;
}

function expectedActorFor(anomaly:Anomaly) {
  if (anomaly.status === 'Clôturée') return 'Aucune action — dossier clôturé';
  if (anomaly.proofPending || anomaly.status === 'En validation' || anomaly.status === 'À qualifier') return 'Facility Manager';
  if ((anomaly.status === 'Affectée' || anomaly.status === 'En intervention') && !canonicalResponsible(anomaly)) return 'Facility Manager';
  if (anomaly.status === 'Affectée' || anomaly.status === 'En intervention') return canonicalResponsible(anomaly) as string;
  return 'Acteur attendu non renseigné';
}

function nextActionFor(anomaly:Anomaly) {
  if (anomaly.status === 'Clôturée') return 'Aucune action — dossier clôturé';
  if (anomaly.status === 'À qualifier') return canonicalResponsible(anomaly) ? 'Examiner le rapport et qualifier' : 'Qualifier et affecter un responsable interne';
  if (anomaly.status === 'Affectée' && !canonicalResponsible(anomaly)) return 'Affecter un responsable interne';
  if (anomaly.status === 'Affectée') return 'Réaliser et confirmer le diagnostic';
  if (anomaly.status === 'En intervention') return anomaly.proofPending ? 'Déposer le justificatif' : anomaly.proof ? 'Contrôler la preuve' : 'Réaliser l’intervention et déposer le justificatif';
  if (anomaly.status === 'En validation') return 'Contrôler la preuve';
  return 'Prochaine action non renseignée';
}

function treatmentBranchFor(anomaly:Anomaly, decisionAmount:number|null): TreatmentBranch {
  if (anomaly.treatment?.branch === 'vendor') return 'prestataire';
  if (anomaly.treatment?.branch === 'internal_with_cost') return 'interne-avec-cout';
  if (anomaly.treatment?.branch === 'internal_without_cost') return 'interne-sans-cout';
  if (anomaly.status === 'À qualifier' || anomaly.status === 'Affectée' || !anomaly.treatment) return 'non-choisie';
  if (decisionAmount !== null) return 'interne-avec-cout';
  return 'interne-sans-cout';
}

function dossierOrigin(anomaly:Anomaly) {
  if (anomaly.asset === 'DEMO-GE') return 'Ronde GE-01 quotidienne';
  if (anomaly.asset === 'DEMO-EAU') return 'Ronde Surpresseur quotidienne';
  return 'Constat terrain';
}

function adaptDossierToAntiZombieSummary(anomaly:Anomaly):AntiZombieSummaryData {
  return {
    dossierState:anomaly.status === 'Clôturée' ? 'Clôturé' : 'Ouvert',
    status:anomaly.status,
    responsible:canonicalResponsible(anomaly),
    expectedActor:expectedActorFor(anomaly),
    nextActionAssignee:expectedActorFor(anomaly),
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

function AuthFrame({
  kicker,
  title,
  lede,
  note,
  single = false,
  children,
}: {
  kicker: string;
  title: string;
  lede: string;
  note: ReactNode;
  single?: boolean;
  children: ReactNode;
}) {
  return (
    <main className={`auth-shell${single ? ' auth-shell-single' : ''}`}>
      <header className="auth-chrome">
        <div className="auth-brand"><span className="brand-mark">B</span><span className="auth-wordmark">BEHIRA<small>FM / GB TRACK</small></span></div>
        <p className="auth-chrome-tag">Espace métier</p>
      </header>
      <div className="auth-body">
        <section className="auth-brand-panel" aria-label="Présentation BEHIRA">
          <div className="auth-brand-copy">
            <p className="auth-kicker">{kicker}</p>
            <h1>{title}</h1>
            <p>{lede}</p>
          </div>
          <small className="auth-local-note">{note}</small>
        </section>
        <section className={`auth-main${single ? ' auth-main-single' : ''}`}>{children}</section>
      </div>
    </main>
  );
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'email'|'password'|'confirm'|'accepted'>>({});

  const switchScreen = (next:AuthScreen) => {
    setScreen(next); setStatus('idle'); setMessage(''); setForgotSent(false); setFieldErrors({});
  };
  const chooseAccount = (account:DemoAccount) => {
    setEmail(account.email); setPassword(account.password); setStatus('idle'); setMessage(''); setFieldErrors({});
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
    setInvitePassword(''); setInviteConfirm(''); setInviteAccepted(false); setForgotSent(false); setFieldErrors({});
    setStatus('success'); setMessage('Démonstration réinitialisée. Vous pouvez repartir avec un compte fictif.');
  };
  const submitLogin = async (event:FormEvent) => {
    event.preventDefault();
    const next = validateLogin({ email, password });
    setFieldErrors(next);
    if (hasFieldErrors(next)) { setStatus('error'); setMessage('Corrigez les champs indiqués.'); return; }
    const account = demoAccounts.find((item) => item.email.toLowerCase() === email.trim().toLowerCase());
    if (!supabaseMode && (!account || password !== account.password)) { setStatus('error'); setMessage('Identifiants non reconnus. Utilisez un compte fictif parmi les accès de démonstration.'); return; }
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
    const next = validateEmailOnly(email);
    setFieldErrors(next);
    if (hasFieldErrors(next)) { setStatus('error'); setMessage('Corrigez les champs indiqués.'); return; }
    setStatus('loading'); setMessage(supabaseMode ? 'Préparation sécurisée de la réinitialisation…' : 'Préparation de l’envoi simulé…');
    try {
      await onForgot(email.trim());
      setForgotSent(true); setStatus('success');
      setMessage(supabaseMode ? 'Si un compte actif correspond à cette adresse, les instructions de réinitialisation seront envoyées.' : 'Instructions simulées envoyées. Aucun email réel n’a été transmis.');
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'Demande impossible.');
    }
  };
  const passwordRules = passwordStrength(invitePassword, 12);
  const submitInvite = (event:FormEvent) => {
    event.preventDefault();
    const next = validateInvite({ password: invitePassword, confirm: inviteConfirm, accepted: inviteAccepted });
    setFieldErrors(next);
    if (hasFieldErrors(next)) { setStatus('error'); setMessage('Corrigez les champs indiqués.'); return; }
    setStatus('loading'); setMessage('Activation locale de l’invitation…');
    window.setTimeout(() => {
      setStatus('success'); setMessage('Compte invité activé. Ouverture de l’espace Rondes & constats.');
      window.setTimeout(() => onAuthenticate('rondes_assistance', true), 550);
    }, 550);
  };

  return (
    <AuthFrame
      kicker="PILOTAGE TECHNIQUE & MAINTENANCE"
      title="Une vision claire du bâtiment, jusqu’à la preuve."
      lede="Centralisez les constats, priorisez les risques et suivez chaque intervention jusqu’à sa clôture."
      note={<>{supabaseMode ? `${environmentLabel} prêt · mode démonstration conservé` : 'Prototype local · authentification et données simulées'} · <a href="/design-system">Système de design</a></>}
    >
      <div className="auth-card">
        {screen === 'login' && <>
          <div className="auth-heading"><span className="auth-mode-chip">{supabaseMode ? environmentLabel.toUpperCase() : 'DÉMONSTRATION LOCALE'}</span><h2>Bienvenue</h2><p>Entrez dans l’espace opérationnel BEHIRA.</p></div>
          <form className="auth-form" onSubmit={submitLogin} noValidate>
            <label className={`auth-field ${fieldErrors.email ? 'is-invalid' : ''}`}>Email professionnel<input type="email" autoComplete="username" value={email} onChange={(event) => {setEmail(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, email: undefined }))}} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'login-email-error auth-message' : 'auth-message'} placeholder="nom@organisation.com" /><FieldError id="login-email-error" message={fieldErrors.email} /></label>
            <label className={`auth-field ${fieldErrors.password ? 'is-invalid' : ''}`}>Mot de passe<span className="password-control"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => {setPassword(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, password: undefined }))}} aria-invalid={Boolean(fieldErrors.password)} aria-describedby={fieldErrors.password ? 'login-password-error auth-message' : 'auth-message'} /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? 'Masquer' : 'Afficher'}</button></span><FieldError id="login-password-error" message={fieldErrors.password} /></label>
            <div className="auth-form-options"><label className="check-control"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Se souvenir de moi</span></label><button type="button" className="auth-link" onClick={() => switchScreen('forgot')}>Mot de passe oublié ?</button></div>
            {message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : status === 'success' ? '✓' : '•'}</span>{message}</div>}
            <Button className="auth-submit" type="submit" disabled={status === 'loading' || status === 'success'}>{status === 'loading' ? 'Connexion…' : status === 'success' ? 'Connecté ✓' : 'Se connecter'}</Button>
          </form>
          {!supabaseMode && <button type="button" className="invite-link" onClick={() => switchScreen('invite')}>Première connexion ? Activer une invitation</button>}
        </>}

        {screen === 'forgot' && <>
          <button type="button" className="auth-back" onClick={() => switchScreen('login')}>← Retour à la connexion</button>
          <div className="auth-heading"><span className="auth-mode-chip">ASSISTANCE</span><h2>Mot de passe oublié</h2><p>{supabaseMode ? 'Recevez un lien sécurisé de réinitialisation si votre compte est actif.' : 'Recevez les instructions de réinitialisation — envoi simulé uniquement.'}</p></div>
          {!forgotSent ? <form className="auth-form" onSubmit={submitForgot} noValidate><label className={`auth-field ${fieldErrors.email ? 'is-invalid' : ''}`}>Email professionnel<input type="email" value={email} onChange={(event) => {setEmail(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, email: undefined }))}} aria-invalid={Boolean(fieldErrors.email)} aria-describedby={fieldErrors.email ? 'forgot-email-error auth-message' : 'auth-message'} /><FieldError id="forgot-email-error" message={fieldErrors.email} /></label>{message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : '•'}</span>{message}</div>}<Button className="auth-submit" type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Envoi…' : 'Envoyer les instructions'}</Button></form> : <div className="auth-confirmation" role="status"><span>✓</span><h3>Demande prise en compte</h3><p>{message}</p><small>Adresse indiquée : {email}</small><Button className="auth-submit" onClick={() => switchScreen('login')}>Retour à la connexion</Button></div>}
        </>}

        {screen === 'invite' && <>
          <button type="button" className="auth-back" onClick={() => switchScreen('login')}>← Retour à la connexion</button>
          <div className="auth-heading"><span className="auth-mode-chip">INVITATION DE DÉMONSTRATION</span><h2>Activez votre compte</h2><p>Compte invité : <b>Agente Rondes & Assistance Démo</b><br />Rôle : Rondes & constats · périmètre {displayAssetCode('DEMO-RND')}</p></div>
          <form className="auth-form" onSubmit={submitInvite} noValidate>
            <label className={`auth-field ${fieldErrors.password ? 'is-invalid' : ''}`}>Créer un mot de passe<input type="password" autoComplete="new-password" value={invitePassword} onChange={(event) => {setInvitePassword(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, password: undefined }))}} aria-invalid={Boolean(fieldErrors.password)} aria-describedby="password-rules invite-password-error auth-message" /><FieldError id="invite-password-error" message={fieldErrors.password} /></label>
            <label className={`auth-field ${fieldErrors.confirm ? 'is-invalid' : ''}`}>Confirmer le mot de passe<input type="password" autoComplete="new-password" value={inviteConfirm} onChange={(event) => {setInviteConfirm(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, confirm: undefined }))}} aria-invalid={Boolean(fieldErrors.confirm)} /><FieldError id="invite-confirm-error" message={fieldErrors.confirm} /></label>
            <ul className="password-rules" id="password-rules" aria-label="Règles de robustesse"><li className={passwordRules.length ? 'valid' : ''}>12 caractères minimum</li><li className={passwordRules.upper && passwordRules.lower ? 'valid' : ''}>Majuscule et minuscule</li><li className={passwordRules.number ? 'valid' : ''}>Au moins un chiffre</li><li className={passwordRules.symbol ? 'valid' : ''}>Au moins un symbole</li><li className={invitePassword && invitePassword === inviteConfirm ? 'valid' : ''}>Confirmation identique</li></ul>
            <label className={`check-control invite-accept ${fieldErrors.accepted ? 'is-invalid' : ''}`}><input type="checkbox" checked={inviteAccepted} onChange={(event) => {setInviteAccepted(event.target.checked);setFieldErrors((current) => ({ ...current, accepted: undefined }))}} /><span>J’accepte l’activation simulée de ce compte fictif.</span></label>
            <FieldError message={fieldErrors.accepted} />
            {message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : status === 'success' ? '✓' : '•'}</span>{message}</div>}
            <Button className="auth-submit" type="submit" disabled={status === 'loading' || status === 'success'}>{status === 'loading' ? 'Activation…' : status === 'success' ? 'Compte activé ✓' : 'Activer et accéder à mon espace'}</Button>
          </form>
        </>}
      </div>

      {screen === 'login' && <aside className="demo-accounts" aria-label="Comptes de démonstration">
        <div><span>{supabaseMode ? 'MODE DÉMONSTRATION DE SECOURS' : 'COMPTES DE DÉMONSTRATION'}</span><p>Profils fictifs en <code>.invalid</code> · {supabaseMode ? 'séparés de Supabase Auth et sans écriture distante' : 'session simulée'}.</p></div>
        {!supabaseMode && <p className="demo-password"><span>Mot de passe commun</span><b>{DEMO_PASSWORD}</b></p>}
        {(!supabaseMode || allowDemoFallback) && <div className="demo-account-grid">{demoAccounts.map((account) => {const person = personas.find((item) => item.id === account.personaId)!; const selected = email.trim().toLowerCase() === account.email.toLowerCase(); return <button type="button" key={account.email} className={selected ? 'is-selected' : ''} aria-pressed={selected} aria-label={`${person.shortName} · ${account.destination}`} onClick={() => {if (supabaseMode) void openDemoAccount(account); else {chooseAccount(account);switchScreen('login')}}}><span>{person.initials}</span><div><b>{person.shortName}</b><small>{account.email}</small><em>{account.destination}</em></div><i>{selected ? 'Sélectionné' : supabaseMode ? 'Ouvrir la démo' : 'Utiliser'}</i></button>})}</div>}
        <div className="demo-reset"><p><b>{supabaseMode ? environmentLabel : 'Session locale uniquement'}</b><br />{supabaseMode ? 'Une connexion réelle impose le rôle du profil métier protégé par RLS. Le mode démo reste local.' : 'La sécurité réelle sera assurée par Supabase Auth et les politiques RLS.'}</p><button type="button" onClick={resetInterface}>Réinitialiser la démonstration</button></div>
      </aside>}
    </AuthFrame>
  );
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
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<'current'|'next'|'confirm'>>({});
  const rules = {
    ...passwordStrength(newPassword, 16),
    different:Boolean(currentPassword) && newPassword !== currentPassword,
    match:Boolean(newPassword) && newPassword === confirmation,
  };
  const submit = async (event:FormEvent) => {
    event.preventDefault();
    const next = validatePasswordChange({ current: currentPassword, next: newPassword, confirm: confirmation });
    setFieldErrors(next);
    if (hasFieldErrors(next)) { setStatus('error'); setMessage('Corrigez les champs indiqués.'); return; }
    setStatus('loading'); setMessage('Mise à jour sécurisée du mot de passe…');
    try {
      await onComplete(currentPassword, newPassword);
    } catch (error) {
      setStatus('error'); setMessage(error instanceof Error ? error.message : 'Le mot de passe n’a pas pu être modifié.');
    }
  };

  return (
    <AuthFrame
      kicker="PREMIÈRE CONNEXION"
      title="Protégez votre accès avant de continuer."
      lede="Votre espace métier restera verrouillé jusqu’au remplacement du mot de passe temporaire."
      note="Contrôle assuré par Supabase Auth et les politiques RLS"
      single
    >
      <div className="auth-card">
        <div className="auth-heading"><span className="auth-mode-chip">CHANGEMENT OBLIGATOIRE</span><h2>Créez votre mot de passe</h2><p>Compte : <b>{requirement.displayName}</b><br />{requirement.email}</p></div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <label className={`auth-field ${fieldErrors.current ? 'is-invalid' : ''}`}>Mot de passe temporaire<input type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => {setCurrentPassword(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, current: undefined }))}} aria-invalid={Boolean(fieldErrors.current)} aria-describedby="required-password-message" /><FieldError message={fieldErrors.current} /></label>
          <label className={`auth-field ${fieldErrors.next ? 'is-invalid' : ''}`}>Nouveau mot de passe<input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={newPassword} onChange={(event) => {setNewPassword(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, next: undefined }))}} aria-invalid={Boolean(fieldErrors.next)} aria-describedby="required-password-rules required-password-message" /><FieldError message={fieldErrors.next} /></label>
          <label className={`auth-field ${fieldErrors.confirm ? 'is-invalid' : ''}`}>Confirmer le nouveau mot de passe<input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" value={confirmation} onChange={(event) => {setConfirmation(event.target.value);setStatus('idle');setFieldErrors((current) => ({ ...current, confirm: undefined }))}} aria-invalid={Boolean(fieldErrors.confirm)} /><FieldError message={fieldErrors.confirm} /></label>
          <label className="check-control"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /><span>Afficher les mots de passe pendant la saisie</span></label>
          <ul className="password-rules" id="required-password-rules" aria-label="Règles de robustesse">
            <li className={rules.length ? 'valid' : ''}>16 caractères minimum</li><li className={rules.upper && rules.lower ? 'valid' : ''}>Majuscule et minuscule</li><li className={rules.number ? 'valid' : ''}>Au moins un chiffre</li><li className={rules.symbol ? 'valid' : ''}>Au moins un symbole</li><li className={rules.different ? 'valid' : ''}>Différent du temporaire</li><li className={rules.match ? 'valid' : ''}>Confirmation identique</li>
          </ul>
          {message && <div id="required-password-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? '!' : '•'}</span>{message}</div>}
          <Button className="auth-submit" type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Sécurisation…' : 'Changer le mot de passe et continuer'}</Button>
          <button className="auth-back required-password-signout" type="button" onClick={() => void onSignOut()}>Se déconnecter et revenir à l’accueil</button>
        </form>
      </div>
    </AuthFrame>
  );
}

function LiveHealthCockpit({ session, onNavigate, actionCount, causeActions, bannerExtras, children }: { session: UiSession; onNavigate: (view: View) => void; actionCount?: number; causeActions?: ReactNode; bannerExtras?: ReactNode; children?: ReactNode }) {
  const { scenario } = useDemoScoreScenario();
  const snapshot = demoHomeSnapshot(session, session.demo ? scenario : 'not_computable');
  return <BuildingHealthCockpit snapshot={snapshot} session={session} onNavigate={onNavigate} rounds={demoRoundsFor(session)} actionCount={actionCount} causeActions={causeActions} bannerExtras={bannerExtras}>{children}</BuildingHealthCockpit>;
}

function LiveEquipmentWorkspace({ session }: { session: UiSession }) {
  const { scenario } = useDemoScoreScenario();
  const snapshot = demoHomeSnapshot(session, session.demo ? scenario : 'not_computable');
  return <EquipmentWorkspace equipment={snapshot.equipment} />;
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
  const [managerTab, setManagerTab] = useState<ManagerQueue>('all');
  const [dossiersTab, setDossiersTab] = useState<DossiersTab>('atraiter');
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
    const haystack = `${a.id} ${a.asset} ${displayAssetCode(a.asset)} ${a.title} ${a.location}`.toLowerCase();
    return haystack.includes(query.toLowerCase()) && (priorityFilter === 'Toutes' || a.priority === priorityFilter) && (statusFilter === 'Tous' || a.status === statusFilter);
  }), [anomalies, query, priorityFilter, statusFilter]);

  const navigate = (next: View, options?: { queue?: ManagerQueue }) => {
    const permitted = allowedViewsByPersona[personaId].includes(next) || primaryNavKeysByPersona[personaId].includes(next);
    if (next !== 'detail' && !permitted) {
      setToast('Accès masqué pour ce rôle de démonstration.');
      window.setTimeout(() => setToast(''), 3200);
      return;
    }
    setMoreNavOpen(false);
    if (next === 'registry' || next === 'costs') {
      setDossiersTab('tous');
      setView('manager');
    } else if (next === 'access' && personaId === 'administration') {
      setView('settings');
    } else {
      if (next === 'manager') {
        setDossiersTab('atraiter');
        if (options?.queue) setManagerTab(options.queue);
      }
      setView(next);
    }
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
  const persistProof = async (file:File):Promise<SyncStatusState> => {
    if (session?.mode !== 'supabase' || dataState !== 'live') {
      setAnomalies((items) => items.map((a) => a.id === selected.id ? { ...a, proof:true } : a));
      flash('Preuve ajoutée — simulation de repli.');
      return 'demo-volatile';
    }
    setMutationBusy(true);
    try {
      const result = await uploadAnomalyProof(getBrowserSupabaseClient(), selected.id, file);
      await syncOperationalData();
      flash(result.verification_status === 'accepted' ? 'Preuve déposée et acceptée dans Supabase.' : 'Preuve déposée ; validation de Facility Manager requise.');
      return 'server-confirmed';
    } catch (error) {
      flash(`Preuve non enregistrée : ${mutationError(error)}`);
      return 'error';
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

  const primaryNavKeys = primaryNavKeysByPersona[personaId];
  const visibleNav = navItems.filter((item) => allowedViewsByPersona[personaId].includes(item.key) || primaryNavKeys.includes(item.key));
  const primaryNav = primaryNavKeys.map((key) => navItems.find((item) => item.key === key)).filter((item): item is NavigationItem => Boolean(item));
  const overflowNav = visibleNav.filter((item) => !primaryNavKeys.includes(item.key) && !hiddenNavKeys.includes(item.key) && !(personaId === 'administration' && item.key === 'access'));
  const activeNavKey = view === 'detail' ? previousView : view;
  const isNavigationActive = (key:NavigationItem['key']) => {
    if (key === activeNavKey) return true;
    if (view === 'manager' && key === 'registry' && !allowedViewsByPersona[personaId].includes('manager')) return true;
    if (view === 'settings' && key === 'settings') return true;
    return false;
  };
  const overflowIsActive = overflowNav.some((item) => isNavigationActive(item.key));
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
  const currentNavigationItem = navItems.find((item) => item.key === activeNavKey) ?? navItems[0];
  // const pageTitle = view === 'detail' ? selected.id : currentNavigationItem.label
  const pageTitle = view === 'detail' ? selected.id : navItemLabel(currentNavigationItem, personaId);
  const pageSubtitle = view === 'detail' ? `${displayAssetCode(selected.asset)} · ${selected.title}` : currentNavigationItem.subtitle;
  const canStartRound = allowedViewsByPersona[personaId].includes('report') && personaId !== 'administration';

  if (!authReady) return <main className="auth-loading" aria-label="Chargement de la session"><span className="brand-mark">B</span><p>Préparation de votre espace…</p></main>;
  if (passwordChangeRequirement) return <RequiredPasswordChange requirement={passwordChangeRequirement} onComplete={completeRequiredPasswordChange} onSignOut={signOutLockedSession} />;
  if (!session) return <AuthExperience onAuthenticate={authenticate} onDemoAuthenticate={authenticateDemo} onForgot={requestPasswordReset} onReset={resetDemo} supabaseMode={isSupabaseIntegrationEnabled} allowDemoFallback={supabaseIntegration.demoFallback} environmentLabel={supabaseIntegration.environmentLabel} />;

  return (
    <DemoScenarioProvider>
    <div className="app-shell">
      <header className="app-navigation">
        <button className="brand" onClick={() => navigate('workspace')} aria-label="BEHIRA — aller à l’Accueil"><span className="brand-mark">B</span><span className="brand-wordmark">BEHIRA<small>FM / GB TRACK</small></span></button>
        <nav className="primary-navigation" aria-label="Navigation principale">
          {primaryNav.map((item) => {
            const active = isNavigationActive(item.key);
            return <button key={item.key} type="button" className={`nav-item ${active ? 'active' : ''}`} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.key)}><NavigationIcon view={item.key} active={active}/><span className="nav-item-label">{navItemLabel(item, personaId)}</span></button>;
          })}
          {overflowNav.length > 0 && <div className="nav-overflow" ref={moreNavRef}>
            <button ref={moreNavTriggerRef} type="button" className={`nav-item nav-more-trigger ${overflowIsActive ? 'active' : ''}`} aria-current={overflowIsActive ? 'page' : undefined} aria-haspopup="menu" aria-expanded={moreNavOpen} aria-controls="navigation-more-menu" onKeyDown={(event) => {if (event.key === 'ArrowDown') {event.preventDefault();setMoreNavOpen(true);window.requestAnimationFrame(() => focusOverflowItem(0))}}} onClick={() => setMoreNavOpen((open) => !open)}><BrandIcon name="more" className="nav-icon nav-more-icon" size={18} strokeWidth={overflowIsActive ? 2.25 : 1.75} /><span className="nav-item-label">Plus</span></button>
            {moreNavOpen && <div className="nav-more-menu" id="navigation-more-menu" role="menu" aria-label="Autres destinations" onKeyDown={onMoreNavKeyDown}>
              {navigationGroups.map((group) => {
                const groupItems = overflowNav.filter((item) => item.group === group);
                if (!groupItems.length) return null;
                return <section className="nav-more-group" key={group} aria-label={group}><p>{group}</p>{groupItems.map((item) => {
                  const active = isNavigationActive(item.key);
                  const overflowIndex = overflowNav.findIndex((candidate) => candidate.key === item.key);
                  return <button ref={(node) => {moreNavItemRefs.current[overflowIndex] = node}} type="button" role="menuitem" key={item.key} className={active ? 'active' : ''} aria-current={active ? 'page' : undefined} onClick={() => navigate(item.key)}><NavigationIcon view={item.key} active={active}/><span>{navItemLabel(item, personaId)}</span></button>;
                })}</section>;
              })}
            </div>}
          </div>}
        </nav>
        <div className="scope-box"><span>●</span><div><b>Site Démo Atlas</b><small>{session.mode === 'supabase' ? dataState === 'live' ? `${referenceCounts.anomalies} anomalies · ${referenceCounts.equipment} équipements · ${referenceCounts.zones} zones` : dataState === 'loading' ? `Synchronisation ${supabaseIntegration.environmentLabel}…` : 'Repli sur les données de démonstration' : 'Site principal · démonstration'}</small></div></div>
        <div className="app-navigation-user"><button className="logout-button" onClick={() => setSignOutConfirm(true)} aria-label="Se déconnecter">↪</button></div>
      </header>

      <main className={`main-column${view === 'manager' || view === 'registry' ? ' is-dossiers-page' : ''}`}>
        <header className="topbar">
          <div className="topbar-title"><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
          <div className="top-actions">{session.mode === 'demo' ? <PersonaSwitcher value={personaId} onChange={changePersona} /> : <div className={`authenticated-persona data-${dataState}`} title={`${session.email} · ${dataState === 'live' ? `données ${supabaseIntegration.environmentLabel}` : 'données de repli'}`}><span>{persona.initials}</span><p><b>{persona.name}</b><small>{dataState === 'live' ? `${supabaseIntegration.environmentLabel} · ${referenceCounts.anomalies} anomalies visibles` : dataState === 'loading' ? `Connexion à ${supabaseIntegration.environmentLabel}…` : `Mode de repli · ${persona.role}`}</small></p></div>}<NotificationBell personaId={personaId} anomalies={anomalies} equipment={equipmentItems} dataState={dataState} canConfigure={personaId === 'facility' || personaId === 'administration'} canOpenEquipment={allowedViewsByPersona[personaId].includes('equipment')} onOpenAnomaly={(id) => openDetail(id, view === 'detail' ? previousView : view)} onOpenEquipment={() => navigate('equipment')} onOpenHome={() => navigate('workspace')} /><button className="auth-signout-top" onClick={() => setSignOutConfirm(true)} aria-label="Se déconnecter"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4.5H5.5A1.5 1.5 0 0 0 4 6v8a1.5 1.5 0 0 0 1.5 1.5H8"/><path d="M8.5 10H16m0 0-2.4-2.4M16 10l-2.4 2.4"/></svg></button></div>
        </header>

        <div className="content">
          {view === 'workspace' && <PersonaWorkspace persona={persona} anomalies={anomalies} equipment={equipmentItems} vendors={vendorReferences} canUploadVendorReport={effectiveCanUploadVendorReport} vendorReportBusy={mutationBusy} onVendorReport={persistVendorReport} escalations={escalations} fieldRequests={fieldRequests} onEscalationDecision={decideEscalation} onEscalateToDirection={escalateToDirection} onFieldRequest={submitFieldRequest} onOpen={(id) => openDetail(id, 'workspace')} onNavigate={navigate} flash={flash} />}
          {view === 'dashboard' && <Dashboard anomalies={anomalies} equipment={equipmentItems} escalations={escalations} audience={personaId === 'administration' ? 'administration' : 'facility'} onOpen={openDetail} onNavigate={navigate} />}
          {(view === 'manager' || view === 'registry') && <DossiersWorkspace
            tab={view === 'registry' ? 'tous' : dossiersTab}
            onTab={(tab) => { setDossiersTab(tab); if (view === 'registry') setView('manager'); }}
            threshold={DECISION_THRESHOLD_FCFA}
            query={query}
            onQuery={setQuery}
            counts={{
              atraiter: atraiterCount(anomalies, fieldRequests),
              tous: anomalies.length,
              clotures: anomalies.filter((item) => item.status === 'Clôturée').length,
            }}
          >
            {(view === 'registry' ? 'tous' : dossiersTab) === 'atraiter'
              ? <Manager anomalies={anomalies.filter((item) => !query || `${item.id} ${item.asset} ${displayAssetCode(item.asset)} ${item.title}`.toLowerCase().includes(query.toLowerCase()))} tab={managerTab} setTab={setManagerTab} onOpen={(id) => openDetail(id, 'manager')} escalations={escalations} fieldRequests={fieldRequests} />
              : <Registry
                  anomalies={(view === 'registry' || dossiersTab === 'tous' ? filtered : filtered.filter((item) => item.status === 'Clôturée'))}
                  query={query}
                  setQuery={setQuery}
                  priority={priorityFilter}
                  setPriority={setPriorityFilter}
                  status={statusFilter}
                  setStatus={setStatusFilter}
                  onOpen={(id) => openDetail(id, 'manager')}
                />}
          </DossiersWorkspace>}
          {view === 'equipment' && <LiveEquipmentWorkspace session={sessionForAudience(personaId === 'administration' ? 'administration' : 'facility', persona.name)} />}
          {view === 'costs' && <CostsWorkspace items={escalations.map((item) => ({ id:item.id, anomaly:item.anomaly, asset:item.asset, title:item.title, kind:item.kind, amount:item.amount ?? null, due:item.due, state:item.state }))} audience={personaId === 'administration' ? 'administration' : 'facility'} threshold={DECISION_THRESHOLD_FCFA} onOpenDossier={(id) => openDetail(id, 'costs')} />}
          {view === 'access' && <AccessWorkspace users={personas.map((item) => ({ id:item.id, name:item.name, initials:item.initials, role:item.role, scope:item.scope }))} audience={personaId === 'administration' ? 'administration' : 'facility'} />}
          {view === 'settings' && <ParametersWorkspace parameter={FINANCIAL_DECISION_PARAMETER} onOpenCosts={() => navigate('costs')} users={personaId === 'administration' ? personas.map((item) => ({ id:item.id, name:item.name, initials:item.initials, role:item.role, scope:item.scope })) : undefined} />}
          {view === 'report' && <>
            <Report persona={persona} onNavigate={navigate} />
            {(personaId === 'electricite' || personaId === 'eau_incendie') && <InternalVendorReportPanel anomalies={anomalies.filter((item) => (personaId === 'electricite' ? ['DEMO-GE'] : ['DEMO-EAU','DEMO-SSI','DEMO-ESP']).includes(item.asset) && item.status !== 'Clôturée')} vendors={vendorReferences} canUpload={effectiveCanUploadVendorReport} busy={mutationBusy} onSubmit={persistVendorReport} />}
          </>}
          {view === 'detail' && <Detail key={`${selected.id}-${selected.status}-${selected.proof}-${selected.proofPending}`} anomaly={selected} decisionAmount={escalations.find((item) => item.anomaly === selected.id)?.amount ?? null} persistenceMode={session.mode === 'supabase' && dataState === 'live' ? 'server' : 'demo'} readOnly={personaId === 'administration'} canVerify={personaId === 'facility' && session.mode === 'supabase'} busy={mutationBusy} onBack={() => navigate(previousView)} onStatus={(status) => void persistWorkflowStatus(status)} onProof={persistProof} onVerify={() => void verifyProof()} vendorReport={(personaId === 'electricite' || personaId === 'eau_incendie') ? { vendors:vendorReferences, canUpload:effectiveCanUploadVendorReport, busy:mutationBusy, onSubmit:persistVendorReport } : null} />}
        </div>
      </main>
      {toast && <div className={`toast ${/impossible|non enregistrée/i.test(toast) ? 'toast-error' : ''}`} role="status"><span>{/impossible|non enregistrée/i.test(toast) ? '!' : '✓'}</span>{toast}</div>}
      {signOutConfirm && <div className="signout-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) setSignOutConfirm(false)}}><section className="signout-dialog" role="dialog" aria-modal="true" aria-labelledby="signout-title"><span className="signout-icon">↪</span><h2 id="signout-title">Se déconnecter ?</h2><p>{session.mode === 'supabase' ? `La session ${supabaseIntegration.environmentLabel} sera fermée. Les données métier de démonstration resteront disponibles.` : 'La session simulée sera supprimée de cet appareil. Les données de démonstration resteront disponibles.'}</p><div><Button ref={signOutCancelRef} variant="secondary" onClick={() => setSignOutConfirm(false)}>Annuler</Button><Button onClick={() => void signOut()}>Se déconnecter</Button></div><button className="reset-session-link" onClick={resetDemo}>Déconnecter et réinitialiser toute la démo</button></section></div>}
    </div>
    </DemoScenarioProvider>
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
  if (persona.id === 'facility') return <FacilityManagerWorkspace anomalies={anomalies} equipment={equipment} escalations={escalations} fieldRequests={fieldRequests} onEscalate={onEscalateToDirection} onOpen={onOpen} onNavigate={onNavigate} />;
  if (persona.id === 'electricite' || persona.id === 'eau_incendie') return <AgentWorkspace key={persona.id} persona={persona} anomalies={anomalies} equipment={equipment} vendors={vendors} canUploadVendorReport={canUploadVendorReport} vendorReportBusy={vendorReportBusy} onVendorReport={onVendorReport} onFieldRequest={onFieldRequest} onNavigate={onNavigate} flash={flash} />;
  if (persona.id === 'rondes_assistance') return <RoundsAssistanceWorkspace fieldRequests={fieldRequests} equipment={equipment} anomalies={anomalies} onNavigate={onNavigate} flash={flash} />;
  return null;
}

function AnswerStrip({ todo, risk, due, proof }: { todo:string; risk:string; due:string; proof:string }) {
  return <section className="answer-strip" aria-label="Résumé opérationnel"><div><span>À FAIRE</span><b>{todo}</b></div><div className="risk"><span>RISQUE</span><b>{risk}</b></div><div><span>ÉCHÉANCE</span><b>{due}</b></div><div className="proof"><span>PREUVE MANQUANTE</span><b>{proof}</b></div></section>;
}

function formatMoney(value:number) {
  return `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
}

function atraiterSources(anomalies: Anomaly[], fieldRequests: FieldRequest[]) {
  return {
    open: anomalies.filter((item) => item.status !== 'Clôturée'),
    hygiene: fieldRequests.filter((item) => item.status === 'À traiter par Facility Manager'),
  };
}

function atraiterCount(anomalies: Anomaly[], fieldRequests: FieldRequest[]) {
  const { open, hygiene } = atraiterSources(anomalies, fieldRequests);
  return open.length + hygiene.length;
}

function kindTone(kind: Escalation['kind']): 'critical' | 'orange' | 'blue' {
  if (kind === 'Risque') return 'critical';
  if (kind === 'Coût' || kind === 'Clôture sensible') return 'orange';
  return 'blue';
}

function sortTodaysRounds(rounds: TodaysRound[]) {
  const rank = (state: TodaysRound['state']) => (state === 'overdue' ? 0 : state === 'done' ? 2 : 1);
  return [...rounds].sort((a, b) => {
    const delta = rank(a.state) - rank(b.state);
    if (delta !== 0) return delta;
    return (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');
  });
}

function TodayRoundsPanel({ session, title, detail, withPicker = false, onStart }: {
  session: UiSession;
  title: string;
  detail: string;
  withPicker?: boolean;
  onStart?: () => void;
}) {
  const rounds = sortTodaysRounds(demoRoundsFor(session));
  const doneCount = rounds.filter((item) => item.state === 'done').length;
  return (
    <article className="sheet today-rounds-panel">
      <div className="analytics-card-head">
        <div><h3>{title}</h3><p>{detail}</p></div>
        {withPicker ? <StartRoundPicker rounds={rounds} onSelect={onStart} onOffPlan={onStart} /> : null}
      </div>
      <div className="rd-prog"><span><i style={{ width: `${rounds.length ? Math.round((doneCount / rounds.length) * 100) : 0}%` }} /></span><b>{doneCount} sur {rounds.length} faites</b></div>
      <ul className="today-rounds-list">
        {rounds.map((item) => (
          <li key={item.roundId}>
            <small>{item.deadline ? formatTime(item.deadline) : '—'}</small>
            <span>{roundSubjectLabel(item)}{item.agentName ? `, ${item.agentName}` : ''}</span>
            <em className={`is-${item.state}`}>{roundStateLabel(item.state)}{item.missedYesterday ? ' · manquée hier' : ''}</em>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DirectionWorkspace({ anomalies, equipment, escalations, onDecision, onOpen, onNavigate }: { anomalies:Anomaly[]; equipment:EquipmentItem[]; escalations:Escalation[]; onDecision:(id:string,state:DecisionState,motive:string)=>void; onOpen:(id:string)=>void; onNavigate:(view:View)=>void }) {
  const threshold = DECISION_THRESHOLD_FCFA;
  const [tab, setTab] = useState<'pending'|'history'>('pending');
  const [filter, setFilter] = useState<'Tous'|Escalation['kind']>('Tous');
  const [selectedCaseId, setSelectedCaseId] = useState('DEC-016');
  const [motive, setMotive] = useState('');
  const [motiveError, setMotiveError] = useState('');
  const [decisionMsg, setDecisionMsg] = useState('');
  const pending = escalations.filter((item) => item.state === 'À décider').slice().sort((a, b) => {
    const late = (item: Escalation) => /retard/i.test(item.due) ? 0 : 1;
    const today = (item: Escalation) => /aujourd/i.test(item.due) ? 0 : 1;
    return late(a) - late(b) || today(a) - today(b) || a.due.localeCompare(b.due);
  });
  const decided = escalations.filter((item) => item.state !== 'À décider');
  const stateItems = tab === 'pending' ? pending : decided;
  const activeItems = filter === 'Tous' ? stateItems : stateItems.filter((item) => item.kind === filter);
  const focusItem = activeItems.find((item) => item.id === selectedCaseId) ?? activeItems[0];
  const documentedCostItems = pending.filter((item) => item.amount !== undefined);
  const documentedCostTotal = documentedCostItems.reduce((total,item) => total + (item.amount ?? 0),0);
  const lateCount = pending.filter((item) => /retard/i.test(item.due)).length;
  const firstDue = pending.find((item) => /10:30/.test(item.due)) ?? pending[0];
  const filters: Array<'Tous'|Escalation['kind']> = ['Tous','Risque','Coût','Arbitrage','Clôture sensible'];
  const decide = (state: DecisionState) => {
    if (!focusItem) return;
    const motiveText = motive.trim();
    const needsMotive = state !== 'Approuvée';
    if (needsMotive && !motiveText) { setMotiveError('Indiquez un motif pour refuser ou renvoyer.'); return; }
    if (needsMotive && motiveText.length < 12) { setMotiveError('Le motif doit contenir au moins 12 caractères.'); return; }
    onDecision(focusItem.id, state, motiveText || 'Approuvé sans motif complémentaire.');
    setMotiveError('');
    setDecisionMsg(`${state === 'Approuvée' ? 'Approuvé' : state === 'Refusée' ? 'Refusé' : 'Renvoyé au FM'}. Décision tracée avec votre nom, l’heure et le motif.`);
  };
  return <div className="admin-home">
    <LiveHealthCockpit
      session={sessionForAudience('administration', 'Administration Démo')}
      onNavigate={onNavigate}
      actionCount={pending.length}
      bannerExtras={<div className="admin-big">{[
        { n: formatCompactMoney(documentedCostTotal), k: 'FCFA soumis à décision' },
        { n: firstDue ? firstDue.due.replace('Aujourd’hui · ', '') : '—', k: firstDue ? `première échéance, ${displayAssetCode(firstDue.asset)}` : 'aucune échéance' },
        { n: String(lateCount), k: 'arbitrage en retard' },
      ].map((item) => <div key={item.k}><b>{item.n}</b><span>{item.k}</span></div>)}</div>}
    >
      <div className="admin-ctrl" role="group" aria-label="Points de contrôle">
        <button type="button" onClick={() => { setTab('pending'); setFilter('Clôture sensible'); setSelectedCaseId('DEC-015'); }}>
          <div className="n is-warn">1</div><div className="k">Clôture sensible à contrôler</div><div className="s">ANO-0234, WILO-01, récidive</div>
        </button>
        <button type="button" onClick={() => onNavigate('access')}>
          <div className="n is-sig">1</div><div className="k">Demande d’accès du FM</div><div className="s">Périmètre à confirmer</div>
        </button>
        <button type="button" onClick={() => { setTab('pending'); setFilter('Tous'); }}>
          <div className="n is-bad">{anomalies.filter((item) => item.delayed && item.status !== 'Clôturée').length}</div><div className="k">Dossiers en retard</div><div className="s">dont 1 au-dessus du seuil</div>
        </button>
        <button type="button" onClick={() => onNavigate('settings')}>
          <div className="n">3</div><div className="k">Règles à raccorder</div><div className="s">SLA, seuils techniques, scores</div>
        </button>
      </div>
    </LiveHealthCockpit>
    <section className="decision-workbench admin-layout">
      <article className="panel direction-inbox">
        <div className="lh"><div><h2>Arbitrages</h2><p>Proposés par le Facility Manager, triés par échéance.</p></div></div>
        <div className="workspace-tabs visually-hidden"><button className={tab === 'pending' ? 'active' : ''} onClick={() => setTab('pending')}>À décider <span>{pending.length}</span></button><button className={tab === 'history' ? 'active' : ''} onClick={() => setTab('history')}>Historique <span>{decided.length}</span></button></div>
        <div className="decision-filters chips" aria-label="Filtrer par type d’arbitrage">{filters.map((item) => <button key={item} className={`chip${filter === item ? ' is-pressed' : ''}`} aria-pressed={filter === item} onClick={() => setFilter(item)}>{item} {item === 'Tous' ? pending.length : pending.filter((row) => row.kind === item).length}</button>)}</div>
        <div className="direction-case-list">{activeItems.length === 0 ? <div className="empty-state compact"><span>✓</span><h3>Aucun dossier</h3><p>Changez de filtre ou consultez l’autre onglet.</p></div> : activeItems.map((item) => <button type="button" key={item.id} className={`direction-case-card ${focusItem?.id === item.id ? 'active' : ''}`} aria-pressed={focusItem?.id === item.id} onClick={() => { setSelectedCaseId(item.id); setMotive(''); setMotiveError(''); setDecisionMsg(''); }}><span className={`decision-kind-mark kind-${item.kind.toLowerCase().replaceAll(' ','-')}`} aria-hidden="true" /><span className="decision-card-copy"><strong>{displayAssetCode(item.asset)}, {item.title}</strong><span className="sub">{item.id}, {item.anomaly}</span><span className="tags"><Badge tone={item.kind === 'Risque' ? 'critical' : item.kind === 'Coût' || item.kind === 'Clôture sensible' ? 'orange' : 'blue'}>{item.kind === 'Risque' ? 'Critique' : item.kind === 'Coût' ? 'Moyenne' : 'Haute'}</Badge><Badge tone={kindTone(item.kind)}>{item.kind}</Badge></span></span><span className="rt">{item.amount != null ? <span className="amt">{formatMoney(item.amount)}</span> : <span className="muted">Sans montant</span>}<span className={/retard/i.test(item.due) ? 'late-text' : ''}>{item.due}</span></span></button>)}</div>
      </article>
      <aside className="panel direction-focus" aria-live="polite">{focusItem ? <>
        <div className="direction-focus-head"><div><Badge tone={focusItem.kind === 'Risque' ? 'critical' : focusItem.kind === 'Coût' || focusItem.kind === 'Clôture sensible' ? 'orange' : 'blue'}>{focusItem.kind === 'Risque' ? 'Critique' : focusItem.kind === 'Coût' ? 'Moyenne' : 'Haute'}</Badge><span>{focusItem.id}, {focusItem.anomaly}</span><Badge tone={kindTone(focusItem.kind)}>{focusItem.kind}</Badge></div></div>
        <h3>{displayAssetCode(focusItem.asset)}, {focusItem.title}</h3>
        <p className={/retard/i.test(focusItem.due) ? 'late-text' : 'muted'}>{focusItem.due}</p>
        <div className="blk admin-money-blk">
          {focusItem.amount != null
            ? <div className="dossier-money"><b>{formatMoney(focusItem.amount)}</b>{focusItem.amount >= threshold ? <Badge tone="orange">Au-dessus du seuil de {formatMoney(threshold)}</Badge> : null}</div>
            : <p className="hint">Décision de risque, sans montant associé.</p>}
          <div className="admin-facts"><div><small>Risque</small>{focusItem.risk}</div><div><small>Proposé par</small>Facility Manager</div></div>
        </div>
        <div className="recommendation"><small>Recommandation du Facility Manager</small><p>{focusItem.recommendation}</p></div>
        {focusItem.motive && <p className="decision-motive"><b>Motif :</b> {focusItem.motive}</p>}
        <section className="admin-proofs">
          <h4>Preuves</h4>
          {(() => {
            const linked = anomalies.find((item) => item.id === focusItem.anomaly);
            const proofs = linked?.proofs ?? [];
            if (!proofs.length) return <p className="hint">Données insuffisantes</p>;
            return <ul className="admin-proof-list">{proofs.map((proof) => <li key={proof.id}><span>{proof.reference}</span><Badge tone={proof.verificationStatus === 'accepted' ? 'success' : proof.verificationStatus === 'rejected' ? 'critical' : 'neutral'}>{proof.verificationStatus === 'accepted' ? 'Jointe' : proof.verificationStatus === 'rejected' ? 'Non concluant' : 'Attendu'}</Badge></li>)}</ul>;
          })()}
        </section>
        {focusItem.state === 'À décider' ? <>
          <label className={`field ${motiveError ? 'is-invalid' : ''}`}>Motif de votre décision<textarea value={motive} aria-invalid={Boolean(motiveError)} onChange={(event) => { setMotive(event.target.value); setMotiveError(''); setDecisionMsg(''); }} placeholder="Obligatoire pour refuser ou renvoyer" rows={2} /><FieldError message={motiveError} /></label>
          <div className="case-actions admin-decide-foot">
            {focusItem.anomaly.startsWith('ANO-') && <button className="secondary-button" onClick={() => onOpen(focusItem.anomaly)}>Voir l’anomalie</button>}
            <button className="return-action" type="button" aria-label="Renvoyer à Facility Manager" onClick={() => decide('Renvoyée à Facility Manager')}>Renvoyer au FM</button>
            <button className="reject-action" type="button" onClick={() => decide('Refusée')}>{focusItem.kind === 'Clôture sensible' ? 'Refuser la clôture' : 'Refuser'}</button>
            <button className="primary-button" type="button" onClick={() => decide('Approuvée')}>{focusItem.kind === 'Clôture sensible' ? 'Approuver la clôture' : 'Approuver'}</button>
            <span className="visually-hidden">Confirmer et notifier Facility Manager</span>
          </div>
          {decisionMsg ? <p className="admin-decision-msg" role="status">{decisionMsg}</p> : null}
        </> : <Badge tone={focusItem.state === 'Approuvée' ? 'success' : focusItem.state === 'Refusée' ? 'critical' : 'orange'}>{focusItem.state}</Badge>}
        <section className="admin-history">
          <h4>Historique</h4>
          {focusItem.motive || focusItem.state !== 'À décider' ? <ul className="hist"><li><span>{focusItem.due}</span>{focusItem.state}{focusItem.motive ? ` — ${focusItem.motive}` : ''}</li></ul> : <p className="hint">Données insuffisantes</p>}
        </section>
      </> : <div className="empty-state compact"><span>⌁</span><h3>Sélectionnez un dossier</h3><p>Le détail de l’arbitrage apparaîtra ici.</p></div>}</aside>
    </section>
    <div className="admin-lower">
      <section className="sheet">
        <h2>Engagements financiers</h2>
        <p>Montants documentés dans les dossiers ouverts.</p>
        <div className="admin-line"><span>Soumis à votre décision</span><b>{formatMoney(documentedCostTotal)}</b></div>
        <div className="admin-line"><span>Dossiers au-dessus du seuil</span><b>{documentedCostItems.filter((item) => (item.amount ?? 0) >= threshold).length}</b></div>
        <div className="admin-line"><span>Arbitrages sans montant</span><b>{pending.filter((item) => item.amount == null).length}</b></div>
        <div className="admin-line"><span>Engagé et payé</span><em>Pas encore suivis dans l’outil</em></div>
        <button type="button" className="secondary-button" onClick={() => onNavigate('costs')}>Ouvrir Pilotage, coûts</button>
      </section>
      <section className="sheet">
        <h2>Vos dernières décisions</h2>
        <p>Décisions et changements de règles les plus récents.</p>
        {decided.map((item) => <div className="admin-line" key={item.id}><span>{item.id}, {displayAssetCode(item.asset)}, {item.title}</span><Badge tone={item.state === 'Approuvée' ? 'success' : item.state === 'Refusée' ? 'critical' : 'orange'}>{item.state}</Badge></div>)}
        <div className="admin-line"><span>Seuil financier fixé à {formatMoney(threshold)}</span><Badge tone="neutral">Effet au 30/08</Badge></div>
        <div className="admin-line"><span>Journal des décisions</span><button type="button" className="health-link" onClick={() => setTab('history')}>Ouvrir l’historique</button></div>
      </section>
    </div>
  </div>;
}

function FacilityManagerWorkspace({ anomalies, escalations, fieldRequests, onOpen, onNavigate }: { anomalies:Anomaly[]; equipment:EquipmentItem[]; escalations:Escalation[]; fieldRequests:FieldRequest[]; onEscalate:(request:FieldRequest)=>void; onOpen:(id:string)=>void; onNavigate:(view:View)=>void }) {
  const session = sessionForAudience('facility', 'Facility Manager Démo');
  const { scenario } = useDemoScoreScenario();
  const scoreNotComputable = demoHomeSnapshot(session, scenario).score.state === 'not_computable';
  const withMeta = (item: Anomaly) => ({
    ...item,
    amount: escalations.find((row) => row.anomaly === item.id)?.amount ?? item.treatment?.amount ?? null,
  });
  const decisions: Anomaly[] = [];
  const seen = new Set<string>();
  const push = (item?: Anomaly) => {
    if (!item || seen.has(item.id) || decisions.length >= 4) return;
    seen.add(item.id);
    decisions.push(item);
  };
  push(anomalies.find((item) => item.status === 'À qualifier'));
  push(anomalies.find((item) => item.status !== 'À qualifier' && item.status !== 'Clôturée' && item.owner === 'Non affectée'));
  push(anomalies.find((item) => (item.treatment?.amount ?? escalations.find((row) => row.anomaly === item.id)?.amount ?? 0) >= DECISION_THRESHOLD_FCFA));
  push(anomalies.find((item) => ['Affectée', 'En intervention', 'En validation'].includes(item.status) && (item.treatment?.amount ?? escalations.find((row) => row.anomaly === item.id)?.amount ?? 0) < DECISION_THRESHOLD_FCFA));
  for (const item of anomalies) {
    if (item.status === 'Clôturée') continue;
    push(item);
  }
  return <>
    <LiveHealthCockpit
      session={session}
      onNavigate={onNavigate}
      causeActions={<>
        <button type="button" className="primary-button qualify-action" onClick={() => onNavigate('manager')}>Qualifier</button>
        <button type="button" className="secondary-button" onClick={() => onNavigate('manager')}>Affecter</button>
        <button type="button" className="escalate-action" onClick={() => onNavigate('manager')}>Escalader à l’Administration</button>
        <button type="button" className="secondary-button" onClick={() => onNavigate('manager')}>Voir les preuves</button>
      </>}
    >
      <div className="facility-home-grid">
        <article className="sheet">
          <div className="analytics-card-head">
            <div><h3>Décisions à prendre</h3><p>Triées par échéance. Chaque décision fait remonter le score.</p></div>
            <button type="button" className="health-link" onClick={() => onNavigate('manager')}>Ouvrir Dossiers</button>
          </div>
          <div className="fm-decision-list">
            {decisions.length === 0 ? <div className="empty-state compact"><span>✓</span><h3>File à jour</h3><p>Aucune décision en attente.</p></div> : decisions.map((item) => (
              <article key={item.id} className={`dec-row${item.delayed ? ' is-late' : ''}`}>
                <span className={`queue-mark ${priorityTone(item.priority)}`} aria-hidden="true" />
                <div>
                  <h3>{displayAssetCode(item.asset)}, {item.title}</h3>
                  <p>{item.description}</p>
                  <span className={item.delayed ? 'late-text' : ''}>{item.delayed ? 'En retard · ' : ''}{item.due}</span>
                </div>
                <button type="button" className={item.status === 'À qualifier' || item.horsScore ? 'primary-button qualify-action' : 'secondary-button'} onClick={() => item.id.startsWith('REQ-') ? onNavigate('manager') : onOpen(item.id)}>{dossierActionLabel({ id:item.id, asset:item.asset, title:item.title, priority:item.priority, status:item.status, due:item.due, delayed:item.delayed, owner:item.owner, amount:withMeta(item).amount, horsScore:item.horsScore }, DECISION_THRESHOLD_FCFA)}</button>
              </article>
            ))}
          </div>
        </article>
        <article className={`sheet points-lost-card${scoreNotComputable ? ' is-compact' : ''}`}>
          <div className="analytics-card-head"><div><h3>Où se perdent les points</h3><p>Poids 70 / 15 / 10 / 5. Points obtenus non raccordés.</p></div></div>
          {scoreNotComputable
            ? <p className="points-lost-compact-note">Score non calculable — la répartition par domaine restera vide tant que la formule n’est pas validée.</p>
            : <InsufficientNote title="Poids de domaine non raccordés" detail="Équipements, sécurité, zones, continuité : aucune courbe historique n’est affichée." />}
        </article>
      </div>
    </LiveHealthCockpit>
    <div className="facility-home-grid">
      <TodayRoundsPanel session={session} title="Rondes du jour" detail="Rondes techniques quotidiennes de tous les agents." />
      <article className="sheet">
        <div className="analytics-card-head"><div><h3>Hygiène et paysage</h3><p>Notifications de l’agente rondes. Hors score tant qu’elles ne sont pas qualifiées.</p></div></div>
        <div className="hygiene-list">
          {fieldRequests.map((request) => {
            return <article key={request.id}>
              <div><h3>{displayAssetText(request.subject)}</h3><p>{request.note}</p><small>{request.from} · {request.status}</small></div>
              {request.status === 'À traiter par Facility Manager' ? <div className="hygiene-acts"><button type="button" className="primary-button qualify-action" onClick={() => onNavigate('manager')}>Qualifier</button></div> : <small>En attente de décision de l’Administration.</small>}
            </article>;
          })}
        </div>
      </article>
    </div>
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

function AgentWorkspace({ persona, anomalies, equipment, vendors, canUploadVendorReport, vendorReportBusy, onVendorReport, onFieldRequest, onNavigate, flash }: { persona:Persona; anomalies:Anomaly[]; equipment:EquipmentItem[]; vendors:OperationalVendor[]; canUploadVendorReport:boolean; vendorReportBusy:boolean; onVendorReport:(input:VendorReportInput)=>Promise<void>; onFieldRequest:(request:Omit<FieldRequest,'id'|'status'>)=>void; onNavigate:(view:View)=>void; flash:(message:string)=>void }) {
  const agentKey = persona.id as 'electricite'|'eau_incendie';
  const [tasks, setTasks] = useState(agentTaskSets[agentKey]);
  const [tab, setTab] = useState<'todo'|'done'|'hist'>('todo');
  const [action, setAction] = useState<{type:'measure'|'proof'|'escalate'|'reset'; id:string}|null>(null);
  const [note, setNote] = useState('');
  const visible = tasks.filter((task) => tab === 'done' ? task.status === 'Terminé' : task.status !== 'Terminé').slice().sort((a, b) => Number(Boolean(b.delayed)) - Number(Boolean(a.delayed)));
  const activeTask = action ? tasks.find((task) => task.id === action.id) : null;
  const history = demoReportTracking.filter((item) => {
    const codes = agentKey === 'electricite' ? ['GE-01', 'ASC-A1', 'ASC-A2'] : ['WILO-01', 'RIA-01', 'IRR-01'];
    return codes.includes(item.equipmentCode);
  }).slice(0, 5);
  const completeAction = () => {
    if (!action || !activeTask || !note.trim()) return;
    if (action.type === 'proof') setTasks((items) => items.map((task) => task.id === action.id ? { ...task, proof:true } : task));
    if (action.type === 'measure') setTasks((items) => items.map((task) => task.id === action.id ? { ...task, status:'En cours' } : task));
    if (action.type === 'reset') setTasks((items) => items.map((task) => task.id === action.id ? { ...task, status:'Rétabli provisoirement', proof:false } : task));
    if (action.type === 'escalate') {
      setTasks((items) => items.map((task) => task.id === action.id ? { ...task, escalated:true } : task));
      onFieldRequest({ from:persona.name, subject:`${displayAssetCode(activeTask.asset)} · ${activeTask.title}`, note:note.trim() });
    } else flash(`${activeTask.id} · action enregistrée en simulation.`);
    setAction(null); setNote('');
  };
  return <>
    <LiveHealthCockpit session={sessionForAudience(agentKey, persona.name)} onNavigate={onNavigate} actionCount={tasks.filter((task) => task.status !== 'Terminé').length} />
    {agentKey === 'eau_incendie' && <section className="provisional-rule"><span>↻</span><div><b>Réarmement = rétablissement provisoire</b><p>L’anomalie reste ouverte jusqu’au diagnostic, à l’intervention corrective et à la preuve validée par Facility Manager.</p></div></section>}
    <section className="sheet agent-actions-sheet" aria-labelledby="h-actions">
      <div className="analytics-card-head"><div><h2 id="h-actions">Mes actions</h2><p>Ce qui vous a été affecté, et ce que sont devenus vos rapports.</p></div></div>
      <div className="workspace-tabs parameters-tabs agent-action-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'todo'} className={tab === 'todo' ? 'active' : ''} onClick={() => setTab('todo')}>À faire <span>{tasks.filter((task) => task.status !== 'Terminé').length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'done'} className={tab === 'done' ? 'active' : ''} onClick={() => setTab('done')}>Terminées <span>{tasks.filter((task) => task.status === 'Terminé').length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'hist'} className={tab === 'hist' ? 'active' : ''} onClick={() => setTab('hist')}>Historique des rondes</button>
      </div>
      {tab !== 'hist' ? (
        <div className="agent-task-list">{visible.length === 0 ? <div className="empty-state compact"><span>✓</span><h3>Tout est terminé</h3><p>Aucune action dans cette file.</p></div> : visible.map((task) => <article key={task.id} className={`act-row${task.delayed ? ' late' : ''}`}><span className={`act-bar ${task.delayed ? 'is-bad' : task.status === 'Terminé' ? 'is-ok' : 'is-sig'}`} /><div className="task-copy"><div className="task-status"><Badge tone={task.delayed ? 'critical' : task.status === 'Terminé' ? 'success' : task.status === 'Rétabli provisoirement' ? 'orange' : 'blue'}>{task.delayed ? 'En retard' : tab === 'todo' && task.status === 'À faire' ? 'À faire' : task.status}</Badge><span className="task-ref">{task.id}</span></div><h3>{displayAssetCode(task.asset)}, {task.title}</h3><p>{task.detail}</p><div className="facts"><span>Risque : <b>{task.risk}</b></span><span>Échéance : <b className={task.delayed ? 'late-text' : undefined}>{task.due}</b></span><span>Preuve : <b>{task.proof ? 'Jointe' : 'Manquante'}</b></span></div></div>{tab === 'todo' && <div className="task-actions"><button type="button" onClick={() => {setAction({type:'measure',id:task.id});setNote('')}}>Saisie rapide</button>{agentKey === 'eau_incendie' && task.asset === 'DEMO-EAU' && <button type="button" className="reset-action" onClick={() => {setAction({type:'reset',id:task.id});setNote('')}}>↻ Réarmement provisoire</button>}<button type="button" onClick={() => {setAction({type:'proof',id:task.id});setNote('')}}>Ajouter une preuve</button><button type="button" onClick={() => {setAction({type:'escalate',id:task.id});setNote('')}}>{task.escalated ? '✓ Escalade envoyée' : 'Escalader au FM'}</button></div>}</article>)}</div>
      ) : (
        <div className="agent-round-history">
          {history.length === 0 ? <p className="empty">Aucun rapport dans cet historique.</p> : history.map((item) => <ReportTrackingLine key={item.clientMutationId} item={item} onView={() => onNavigate('report')} />)}
          <div className="hl-foot"><button type="button" className="health-link" onClick={() => onNavigate('report')}>Voir tout l’historique</button></div>
        </div>
      )}
    </section>
    <InternalVendorReportPanel anomalies={anomalies.filter((item) => (agentKey === 'electricite' ? ['DEMO-GE'] : ['DEMO-EAU','DEMO-SSI','DEMO-ESP']).includes(item.asset) && item.status !== 'Clôturée')} vendors={vendors} canUpload={canUploadVendorReport} busy={vendorReportBusy} onSubmit={onVendorReport} />
    {action && activeTask && <div className="demo-modal-backdrop"><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="agent-action-title"><button className="modal-close" aria-label="Fermer" onClick={() => setAction(null)}>×</button><Badge tone={action.type === 'escalate' ? 'orange' : action.type === 'reset' ? 'critical' : 'blue'}>{action.type === 'measure' ? 'SAISIE RAPIDE' : action.type === 'proof' ? 'PREUVE' : action.type === 'reset' ? 'RÉARMEMENT PROVISOIRE' : 'ESCALADE FACILITY MANAGER'}</Badge><h3 id="agent-action-title">{displayAssetCode(activeTask.asset)} · {activeTask.title}</h3><p>{action.type === 'reset' ? 'Le service sera indiqué comme rétabli provisoirement. Le dossier restera ouvert.' : action.type === 'proof' ? 'Décrivez la photo ou le document illustré dans la maquette.' : action.type === 'escalate' ? 'Expliquez le risque ou le blocage qui nécessite Facility Manager.' : 'Saisissez les mesures et observations relevées.'}</p><label className="field">{action.type === 'proof' ? 'Description de la preuve' : 'Observation obligatoire'}<textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={action.type === 'measure' ? 'Ex. batterie 25,8 V · mode AUTO confirmé…' : 'Ajoutez un commentaire précis…'} /></label>{action.type === 'proof' && <div className="simulated-file"><span>▧</span><div><b>photo_terrain_demo.jpg</b><small>Illustration de maquette · aucun fichier téléversé</small></div></div>}<SyncStatusNotice state="demo-volatile" compact label="État de l’action terrain" /><div className="modal-actions"><button className="secondary-button" onClick={() => setAction(null)}>Annuler</button><button className="primary-button" disabled={!note.trim()} onClick={completeAction}>Appliquer dans la démonstration</button></div></section></div>}
  </>;
}

function InternalVendorReportPanel({ anomalies, vendors, canUpload, busy, onSubmit }: { anomalies:Anomaly[]; vendors:OperationalVendor[]; canUpload:boolean; busy:boolean; onSubmit:(input:VendorReportInput)=>Promise<void> }) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [anomalyReference, setAnomalyReference] = useState(anomalies[0]?.id ?? '');
  const [vendorCode, setVendorCode] = useState(vendors[0]?.code ?? '');
  const [reportType, setReportType] = useState<VendorReportInput['reportType']>('intervention_report');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0,10));
  const [summary, setSummary] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [cost, setCost] = useState('');
  const [file, setFile] = useState<File|null>(null);
  const [localBusy, setLocalBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<VendorReportField,string>>>({});
  const [receipt, setReceipt] = useState<{ anomaly:string; vendor:string; file:string; nature:string }|null>(null);

  const natureLabel: Record<VendorReportInput['reportType'], string> = {
    intervention_report: 'Rapport d’intervention',
    pv: 'Procès-verbal',
    quote: 'Devis',
    photo_bundle: 'Dossier photos',
  };

  const currentValues = {
    anomalyIds: anomalies.map((item) => item.id),
    vendorCodes: vendors.map((item) => item.code),
    anomalyReference,
    vendorCode,
    reportDate,
    summary,
    reserveNotes,
    cost,
    file,
  };

  const applyFieldErrors = (nextFile:File|null = file) => {
    const next = validateVendorReportFields({ ...currentValues, file: nextFile });
    setFieldErrors(next);
    return next;
  };

  const resetForm = () => {
    setSummary(''); setReserveNotes(''); setCost(''); setFile(null); setError(''); setFieldErrors({});
    setReportType('intervention_report');
    setReportDate(new Date().toISOString().slice(0,10));
  };

  const cancel = () => {
    resetForm();
    setOpen(false);
  };

  const submit = async (event:FormEvent) => {
    event.preventDefault();
    if (!canUpload) return;
    const next = applyFieldErrors();
    if (Object.keys(next).length || !file) {
      setError('Corrigez les champs indiqués avant de déposer.');
      return;
    }
    setLocalBusy(true);
    setError('');
    try {
      await onSubmit({ anomalyReference, vendorCode, file, reportType, reportDate, summary: summary.trim(), reserveNotes: reserveNotes.trim() || undefined, costAmount: cost.trim() ? Number(cost) : undefined });
      setReceipt({ anomaly:anomalyReference, vendor:vendorCode, file:file.name, nature:natureLabel[reportType] });
      resetForm();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Le rapport n’a pas pu être déposé.');
    } finally {
      setLocalBusy(false);
    }
  };

  if (!open && !receipt) {
    return <div className="vendor-report-launcher">
      <button type="button" className="link vendor-report-launch-button" aria-expanded={false} aria-controls={formId} onClick={() => setOpen(true)}>+ Déposer un rapport prestataire</button>
    </div>;
  }

  if (receipt) {
    return <section id={formId} className="panel internal-vendor-report is-authorized" role="status">
      <div className="vendor-report-receipt">
        <span aria-hidden="true">✓</span>
        <div>
          <b>Rapport déposé · en attente de Facility Manager</b>
          <p>{receipt.anomaly} · {receipt.vendor} · {receipt.nature}</p>
          <small>{receipt.file} — simulation locale, aucune pièce n’a été transmise hors de cet appareil.</small>
        </div>
        <div className="vendor-report-receipt-actions">
          <button type="button" className="secondary-button" onClick={() => { setReceipt(null); setOpen(true); }}>Déposer un autre</button>
          <button type="button" className="primary-button" onClick={() => { setReceipt(null); setOpen(false); }}>Fermer</button>
        </div>
      </div>
    </section>;
  }

  return <section id={formId} className={`panel internal-vendor-report ${canUpload ? 'is-authorized' : ''}`}>
    <div className="panel-head"><div><h3>Rapport d’intervention d’une entreprise</h3><p>Dépôt interne au nom d’un prestataire référencé</p></div><div className="vendor-report-head-actions"><Badge tone={canUpload ? 'success' : 'neutral'}>{canUpload ? 'Droit nominatif actif' : 'Droit non attribué'}</Badge><button type="button" className="health-link" aria-expanded={true} onClick={() => setOpen(false)}>Réduire</button></div></div>
    <div className="internal-access-rule"><BrandIcon name="lock" size={18} /><div><b>Aucun accès direct pour les prestataires</b><p>Un agent interne autorisé rattache le rapport, le fichier et les métadonnées au dossier. Facility Manager contrôle ensuite la preuve.</p></div></div>
    {!canUpload ? <div className="permission-empty"><p>Ce profil ne dispose pas du droit nominatif de dépôt. Agent Électricité et Agent Eau & Incendie sont les seuls agents internes habilités.</p><button className="secondary-button" type="button" disabled>Déposer un rapport prestataire</button></div> :
    <form className="internal-vendor-form" onSubmit={submit} noValidate>
      <div className="two-fields">
        <label className={`field ${fieldErrors.anomalyReference ? 'is-invalid' : ''}`}>Anomalie<Select value={anomalyReference} aria-invalid={Boolean(fieldErrors.anomalyReference)} aria-describedby={fieldErrors.anomalyReference ? `${formId}-anomaly` : undefined} onChange={(event) => { setAnomalyReference(event.target.value); if (fieldErrors.anomalyReference) setFieldErrors((current) => ({ ...current, anomalyReference: undefined })); }}>{anomalies.length ? anomalies.map((item) => <option key={item.id} value={item.id}>{item.id} · {displayAssetCode(item.asset)} · {item.title}</option>) : <option value="">Aucune anomalie ouverte</option>}</Select><FieldError id={`${formId}-anomaly`} message={fieldErrors.anomalyReference} /></label>
        <label className={`field ${fieldErrors.vendorCode ? 'is-invalid' : ''}`}>Entreprise concernée<Select value={vendorCode} aria-invalid={Boolean(fieldErrors.vendorCode)} aria-describedby={fieldErrors.vendorCode ? `${formId}-vendor` : undefined} onChange={(event) => { setVendorCode(event.target.value); if (fieldErrors.vendorCode) setFieldErrors((current) => ({ ...current, vendorCode: undefined })); }}>{vendors.length ? vendors.map((vendor) => <option key={vendor.code} value={vendor.code}>{vendor.code} · {vendor.label}</option>) : <option value="">Aucun prestataire</option>}</Select><FieldError id={`${formId}-vendor`} message={fieldErrors.vendorCode} /></label>
      </div>
      <div className="two-fields">
        <label className="field">Nature du document<Select value={reportType} onChange={(event) => setReportType(event.target.value as VendorReportInput['reportType'])}><option value="intervention_report">Rapport d’intervention</option><option value="pv">Procès-verbal</option><option value="quote">Devis</option><option value="photo_bundle">Dossier photos</option></Select></label>
        <label className={`field ${fieldErrors.reportDate ? 'is-invalid' : ''}`}>Date du rapport<DateInput max={new Date().toISOString().slice(0,10)} value={reportDate} aria-invalid={Boolean(fieldErrors.reportDate)} aria-describedby={fieldErrors.reportDate ? `${formId}-date` : undefined} onChange={(event) => { setReportDate(event.target.value); if (fieldErrors.reportDate) setFieldErrors((current) => ({ ...current, reportDate: undefined })); }} /><FieldError id={`${formId}-date`} message={fieldErrors.reportDate} /></label>
      </div>
      <label className={`field ${fieldErrors.summary ? 'is-invalid' : ''}`}>Résumé de l’intervention<textarea value={summary} maxLength={2000} aria-invalid={Boolean(fieldErrors.summary)} aria-describedby={fieldErrors.summary ? `${formId}-summary` : undefined} onChange={(event) => { setSummary(event.target.value); if (fieldErrors.summary) setFieldErrors((current) => ({ ...current, summary: undefined })); }} placeholder="Diagnostic, action réalisée, essais et résultat…" /><FieldError id={`${formId}-summary`} message={fieldErrors.summary} /></label>
      <div className="two-fields">
        <label className={`field ${fieldErrors.reserveNotes ? 'is-invalid' : ''}`}>Réserves éventuelles<input value={reserveNotes} maxLength={500} aria-invalid={Boolean(fieldErrors.reserveNotes)} aria-describedby={fieldErrors.reserveNotes ? `${formId}-reserves` : undefined} onChange={(event) => { setReserveNotes(event.target.value); if (fieldErrors.reserveNotes) setFieldErrors((current) => ({ ...current, reserveNotes: undefined })); }} placeholder="Aucune ou détail à lever" /><FieldError id={`${formId}-reserves`} message={fieldErrors.reserveNotes} /></label>
        <label className={`field ${fieldErrors.cost ? 'is-invalid' : ''}`}>Coût indiqué (FCFA)<input type="number" min="0" step="1" inputMode="numeric" value={cost} aria-invalid={Boolean(fieldErrors.cost)} aria-describedby={fieldErrors.cost ? `${formId}-cost` : undefined} onChange={(event) => { setCost(event.target.value); if (fieldErrors.cost) setFieldErrors((current) => ({ ...current, cost: undefined })); }} placeholder="0" /><FieldError id={`${formId}-cost`} message={fieldErrors.cost} /></label>
      </div>
      <label className={`field report-file ${fieldErrors.file ? 'is-invalid' : ''}`}>Rapport, PV ou photo<input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" aria-invalid={Boolean(fieldErrors.file)} aria-describedby={fieldErrors.file ? `${formId}-file` : `${formId}-file-hint`} onChange={(event) => { const nextFile = event.target.files?.[0] ?? null; setFile(nextFile); setFieldErrors((current) => ({ ...current, file: validateVendorReportFields({ ...currentValues, file: nextFile }).file })); }} /><small id={`${formId}-file-hint`}>{file ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} Ko` : 'PDF, JPG, PNG ou WebP · 10 Mo maximum'}</small><FieldError id={`${formId}-file`} message={fieldErrors.file} /></label>
      {error ? <p className="vendor-report-error" role="alert">{error}</p> : null}
      <div className="vendor-report-form-actions">
        <button type="button" className="secondary-button" disabled={busy || localBusy} onClick={cancel}>Annuler</button>
        <button className="primary-button" disabled={busy || localBusy}>{busy || localBusy ? 'Dépôt en cours…' : 'Déposer pour validation de Facility Manager'}</button>
      </div>
    </form>}
  </section>;
}

function RoundsAssistanceWorkspace({ fieldRequests, equipment, anomalies, onNavigate, flash }: { fieldRequests:FieldRequest[]; equipment:EquipmentItem[]; anomalies:Anomaly[]; onNavigate:(view:View)=>void; flash:(message:string)=>void }) {
  const [missionTab, setMissionTab] = useState<'terrain'|'administration'>('terrain');
  const [submitted] = useState<{zone:string;category:string;title:string;status:string}[]>([
    { zone:'R+4 · Circulation Est', category:'Sécurité / accès', title:'Porte coupe-feu maintenue ouverte', status:'À qualifier' },
    { zone:'Atrium restaurant', category:'Infiltration', title:'Trace humide après pluie', status:'Complément demandé' },
  ]);
  const [complementDone, setComplementDone] = useState(false);
  return <>
    <LiveHealthCockpit session={sessionForAudience('rondes_assistance', 'Agente Rondes & Assistance Démo')} onNavigate={onNavigate} actionCount={submitted.filter((item) => item.status === 'Complément demandé' && !complementDone).length} />
    <div className="mission-switch" role="tablist" aria-label="Fonction de Agente Rondes & Assistance"><button type="button" role="tab" aria-selected={missionTab === 'terrain'} className={missionTab === 'terrain' ? 'active' : ''} onClick={() => setMissionTab('terrain')}><BrandIcon name="mapPin" size={16} /><b>Terrain</b><small>Rondes, constats et brouillons de démonstration</small></button><button type="button" role="tab" aria-selected={missionTab === 'administration'} className={missionTab === 'administration' ? 'active' : ''} onClick={() => setMissionTab('administration')}><BrandIcon name="files" size={16} /><b>Administratif</b><small>Devis, paiements et autorisations</small></button></div>
    {missionTab === 'terrain' && <><section className="rondes_assistance-grid"><article className="panel zone-rounds"><div className="panel-head"><div><h3>Zones du jour</h3><p>Ronde du jour · {formatWeekdayDate('2026-09-16T08:00:00Z')}</p></div><span className="panel-count">4 / 6 contrôlées</span></div>{['Hall & accueil|Terminé','Atrium restaurant|À vérifier','Jardinières RDC|En cours','Sanitaires R+2|Terminé','Terrasse R+4|À faire','Parking sous-sol|À faire'].map((item) => {const [label,status] = item.split('|'); return <button key={label}><span className={status === 'Terminé' ? 'done' : status === 'En cours' ? 'current' : ''}>{status === 'Terminé' ? '✓' : '○'}</span><div><b>{label}</b><small>Propreté · plantes · fuite · dégradation</small></div><Badge tone={status === 'Terminé' ? 'success' : status === 'À vérifier' ? 'critical' : status === 'En cours' ? 'blue' : 'neutral'}>{status}</Badge></button>})}</article><article className="panel quick-finding"><div className="panel-head"><div><h3>Saisie dans Rondes</h3><p>Un seul formulaire de constat, pour éviter une double saisie.</p></div><Badge tone="blue">RONDES</Badge></div><p className="finding-pointer-copy">Les zones du jour restent ici. La création et la photo se font dans la destination Rondes.</p><button type="button" className="secondary-button" onClick={() => onNavigate('report')}>Ouvrir la ronde</button></article></section><section className="panel signal-tracker"><div className="panel-head"><div><h3>Mes signalements</h3><p>Statuts visibles sans accès aux décisions techniques</p></div><Badge>{submitted.length} dossiers</Badge></div><div className="signal-list">{submitted.map((item,index) => <article key={`${item.title}-${index}`}><div><b>{item.title}</b><p>{item.zone} · {item.category}</p></div><Badge tone={item.status === 'Complément demandé' && !complementDone ? 'orange' : item.status === 'À qualifier' ? 'blue' : 'success'}>{item.status === 'Complément demandé' && complementDone ? 'Complément transmis' : item.status}</Badge>{item.status === 'Complément demandé' && !complementDone && <button onClick={() => {setComplementDone(true);flash('Complément photo transmis à Facility Manager — simulation locale.')}}>Ajouter la photo demandée</button>}</article>)}</div><div className="field-feed-note">{fieldRequests.filter((request) => request.from === 'Agente Rondes & Assistance Démo').length} remontée(s) visible(s) dans la file de Facility Manager.</div></section></>}
    {missionTab === 'administration' && <><section className="mission-permission-note"><span>i</span><div><b>Fonction administrative, sans décision technique</b><p>Agente Rondes & Assistance prépare et suit les pièces. Facility Manager et l’Administration conservent leurs validations respectives.</p></div></section><section className="rondes_assistance-admin-grid"><article className="panel"><div className="panel-head"><div><p className="design-kicker">SUIVI ADMINISTRATIF</p><h3>Devis et autorisations</h3></div><span className="panel-count is-alert">3 à suivre</span></div>{[['DEV-031','PREST-EAU','280 000 FCFA','Validation Facility Manager'],['DEV-029','PREST-ASC','950 000 FCFA','Arbitrage Administration'],['DEV-026','PREST-ESP','190 000 FCFA','Bon à payer']].map((item) => <button className="admin-follow-row" key={item[0]}><span>{item[0]}</span><p><b>{item[1]}</b><small>{item[2]} · {item[3]}</small></p><em>Voir →</em></button>)}</article><article className="panel"><div className="panel-head"><div><p className="design-kicker">COÛTS & PAIEMENTS</p><h3>Échéances de la semaine</h3></div></div><div className="payment-summary"><strong>2,12 M</strong><span>FCFA à contrôler</span></div><div className="payment-lines"><span><i className="done" /> 3 pièces complètes</span><span><i /> 1 autorisation attendue</span><span><i className="late" /> 1 paiement en retard</span></div><button className="secondary-button">Ouvrir le suivi financier</button></article></section></>}
  </>;
}

const agentPerformance = [
  { name:'Agent Électricité', score:88 },
  { name:'Agent Eau & Incendie', score:84 },
  { name:'Agente Rondes & Assistance', score:91 },
];

function OperationalAnalytics({ equipment, section = 'team', onNavigate }: { equipment:EquipmentItem[]; section?: 'health' | 'team'; onNavigate?: (view:View)=>void }) {
  const [period, setPeriod] = useState<'7j'|'30j'|'90j'>('30j');
  const periodLabel = period === '7j' ? '7 jours' : period === '30j' ? '30 jours' : '90 jours';
  const { scenario } = useDemoScoreScenario();
  const snapshot = demoHomeSnapshot(sessionForAudience('facility', 'Facility Manager Démo'), scenario);
  const homeScoreValue = scoreFigure(snapshot.score);
  const parkEquipment = snapshot.equipment.filter((item) => item.code !== 'RND-LET');

  if (section === 'team') {
    return <section className="operational-analytics analytics-direction" aria-labelledby="team-analytics-title">
      <div className="analytics-heading">
        <div><p className="design-kicker">SCORES AGENTS</p><h3 id="team-analytics-title">Équipe</h3><p>Aide au pilotage. Un échantillon insuffisant rend le score non interprétable ; aucune sanction automatique.</p></div>
        <span className="mockup-label">Méthode à valider</span>
      </div>
      <div className="analytics-grid">
        <article className="panel analytics-card agent-chart-card">
          <div className="analytics-card-head"><div><span>ÉQUIPE TERRAIN</span><h4>Performance des agents</h4></div><span className="mockup-label">Méthode à valider</span></div>
          <div className="agent-score-chart" aria-label="Scores globaux de démonstration des agents">{agentPerformance.map((agent) => <div className="agent-score-row" key={agent.name}><span><b>{agent.name}</b><small>Score global</small></span><div className="agent-score-track" role="progressbar" aria-label={`${agent.name}, score global de démonstration, ${agent.score} sur 100`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={agent.score}><i style={{width:`${agent.score}%`}} /></div><strong>{agent.score}</strong></div>)}</div>
          <div className="agent-score-method"><span><b>Période observée</b>Non disponible</span><span><b>Échantillon</b>Non raccordé</span><span><b>Méthode proposée</b>Délais · réactivité · qualité des preuves</span><span><b>Variation / fraîcheur</b>Indisponibles</span></div>
          <p className="analytics-note">Valeurs de démonstration uniquement. Facteurs positifs et négatifs, date de mise à jour : source non raccordée. Aucune sanction automatique n’est autorisée.</p>
          <button type="button" className="health-link" disabled>Détail explicatif — source non raccordée</button>
        </article>
      </div>
    </section>;
  }

  return <section className="operational-analytics analytics-direction" aria-labelledby="health-analytics-title">
    <div className="analytics-heading">
      <div><p className="design-kicker">SCORES & TENDANCES</p><h3 id="health-analytics-title">Santé et évolution</h3><p>Lecture du bâtiment. Les scores agents restent dans Équipe.</p></div>
      <span className="mockup-label">Données de démonstration</span>
    </div>
    <div className="analytics-grid">
      <article className="panel analytics-card building-health-card">
        <div className="analytics-card-head"><div><span>SANTÉ BÂTIMENT</span><h4>Score global actuel</h4></div><span className="mockup-label">Fraîcheur à confirmer</span></div>
        <div className="building-health-content">
          {homeScoreValue == null
            ? <div className="insufficient-chart is-wide" role="status"><BrandIcon name="activity" size={18} /><div><b>Score non calculable</b><p>La formule et les pondérations sont en attente. Aucun chiffre n’est affiché.</p></div></div>
            : <ScoreRing value={homeScoreValue} />}
          {homeScoreValue == null ? null : <div className="score-components" aria-label="Composition du score bâtiment">
            <InsufficientNote title="Composition du score" detail="Les pondérations de domaine ne sont pas raccordées." />
          </div>}
        </div>
        <div className="score-causes"><span><b>Facteur négatif</b> Données insuffisantes</span><span><b>Facteur positif</b> Données insuffisantes</span></div>
        <p className="analytics-note">Le score est plafonné si un équipement vital devient indisponible. La variation sera affichée après constitution de l’historique.</p>
      </article>

      <article className="panel analytics-card trend-card">
        <div className="analytics-card-head"><div><span>ÉVOLUTION</span><h4>Score du bâtiment</h4></div><div className="chart-switch" aria-label="Période du graphique">{(['7j','30j','90j'] as const).map((item) => <button type="button" key={item} aria-pressed={period === item} onClick={() => setPeriod(item)}>{item === '7j' ? '7 jours' : item === '30j' ? '30 jours' : '90 jours'}</button>)}</div></div>
        <div className="insufficient-chart" role="status" aria-live="polite"><BrandIcon name="activity" size={18} /><div><b>Données historiques insuffisantes</b><p>Aucune tendance fiable ne peut encore être calculée sur {periodLabel}.</p></div></div>
        <p className="analytics-note">Action requise : enregistrer un instantané quotidien du score avant d’afficher une variation ou une tendance.</p>
      </article>

      <article className="panel analytics-card equipment-chart-card">
        <div className="analytics-card-head"><div><span>PARC TECHNIQUE</span><h4>Équipements suivis</h4></div>{onNavigate ? <button type="button" className="health-link" onClick={() => onNavigate('equipment')}>Ouvrir Équipements →</button> : null}</div>
        <EquipmentTable equipment={parkEquipment} onOpen={onNavigate ? () => onNavigate('equipment') : undefined} />
      </article>
    </div>
  </section>;
}

function ManagerOperationalContext() {
  return <section className="manager-command-hero" aria-label="Contexte opérationnel">
    <div className="manager-heading-copy">
      <p className="design-kicker">Contexte</p>
      <p>Qualifier, relancer un retard ou vérifier une preuve. Le ruban filtre la liste ; toute décision avec coût reste sous le seuil de délégation.</p>
    </div>
    <div className="delegation-chip" aria-label={`Délégation financière active, moins de ${formatMoney(DECISION_THRESHOLD_FCFA)}`}>
      <span>Délégation active</span>
      <b>{`< ${formatMoney(DECISION_THRESHOLD_FCFA)}`}</b>
      <small>Au-delà : validation de l’Administration</small>
    </div>
  </section>;
}

function Dashboard({ equipment, escalations, audience = 'facility', onNavigate, readOnly = false }: { anomalies?: Anomaly[]; equipment:EquipmentItem[]; escalations:Escalation[]; audience?:'administration'|'facility'; onOpen?:(id:string, from?:View)=>void; onNavigate:(view:View, options?: { queue?: ManagerQueue })=>void; readOnly?:boolean }) {
  const [dashboardTab, setDashboardTab] = useState<'overview'|'actions'|'health'|'equipment'>('overview');
  const documentedCosts = escalations.filter((item) => item.amount !== undefined);
  const documentedCostTotal = documentedCosts.reduce((total,item) => total + (item.amount ?? 0),0);
  const overThresholdCosts = documentedCosts.filter((item) => (item.amount ?? 0) >= DECISION_THRESHOLD_FCFA).length;
  const dashboardTabs = [
    { id:'overview' as const, label:'Performance' },
    { id:'actions' as const, label:'Coûts' },
    { id:'health' as const, label:'Équipe' },
  ];
  /* Vue d’ensemble · Actions & risques · Santé & scores · Parc technique */
  return <>
    <section className="hero-row dashboard-hero"><div><p className="direction-kicker">{readOnly ? 'CONSULTATION AUTORISÉE' : audience === 'administration' ? 'PILOTAGE ADMINISTRATION' : 'PILOTAGE FACILITY MANAGER'}</p><p>{readOnly ? 'Indicateurs et registre accessibles sans action de modification.' : audience === 'administration' ? 'Synthèse décisionnelle, risques, coûts et performance.' : 'Priorités opérationnelles, santé du parc et actions attendues.'}</p></div><span className="health-pill"><i /> Disponibilité : données insuffisantes</span></section>
    <DemoScenarioSelect />
    <nav className="workspace-tabs parameters-tabs" role="tablist" aria-label="Sections du tableau de bord">{dashboardTabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={dashboardTab === item.id} aria-controls={`dashboard-panel-${item.id}`} id={`dashboard-tab-${item.id}`} className={dashboardTab === item.id ? 'active' : ''} onClick={() => setDashboardTab(item.id)}><span className="dashboard-tab-copy"><b>{item.label}</b></span></button>)}</nav>
    {dashboardTab === 'overview' && <section id="dashboard-panel-overview" role="tabpanel" aria-labelledby="dashboard-tab-overview" className="dashboard-tab-panel" aria-label="Performance du site">
      <OperationalAnalytics equipment={equipment} section="health" onNavigate={onNavigate} />
      <article className="panel direction-block performance-block">
        <div className="direction-head"><div><h3>Performance</h3><p>Qualité de service</p></div></div>
        <div className="performance-score"><InsufficientNote title="Délais tenus" detail="Le taux d’interventions dans les délais n’a pas de source raccordée." /></div>
        <div className="performance-bar"><i /></div>
        <InsufficientNote title="Clôtures du mois" detail="Le nombre de dossiers clôturés n’a pas de source raccordée." />
        <button className="text-action" onClick={() => onNavigate(readOnly ? 'registry' : 'manager')}>{readOnly ? 'Consulter Dossiers →' : 'Ouvrir Dossiers →'}</button>
      </article>
    </section>}
    {dashboardTab === 'actions' && <section id="dashboard-panel-actions" role="tabpanel" aria-labelledby="dashboard-tab-actions" className="direction-grid dashboard-tab-panel actions-view is-costs-wide" aria-label="Coûts documentés">
      <article className="panel direction-block costs-block">
        <div className="direction-head"><div><h3>Coûts</h3><p>Montants réellement renseignés</p></div></div>
        <div className="cost-grid">
          <div className="cost-main"><span>Montants documentés</span><strong>{formatMoney(documentedCostTotal)}</strong></div>
          <div className="cost-details"><div><span>Dossiers chiffrés</span><b>{documentedCosts.length}</b></div><div className="cost-gap"><span>Au-dessus du seuil</span><b>{overThresholdCosts}</b></div></div>
        </div>
        <small className="cost-note">Budget, engagé et payé : données insuffisantes.</small>
        <button type="button" className="text-action" onClick={() => onNavigate('manager', { queue: 'overThreshold' })}>Ouvrir Dossiers, au-dessus du seuil →</button>
      </article>
    </section>}
    {dashboardTab === 'health' && <section id="dashboard-panel-health" role="tabpanel" aria-labelledby="dashboard-tab-health" className="dashboard-tab-panel"><OperationalAnalytics equipment={equipment} /></section>}
    {dashboardTab === 'equipment' && <section id="dashboard-panel-equipment" role="tabpanel" aria-labelledby="dashboard-tab-equipment" className="dashboard-tab-panel"><article className="panel dashboard-equipment-pointer"><div className="panel-head"><div><p className="design-kicker">PARC TECHNIQUE</p><h3>Le catalogue vit dans Équipements</h3><p>{equipment.length} modules suivis · {equipment.filter((item) => item.health < 90).length} à surveiller. Pilotage n’en garde qu’un aperçu.</p></div><button type="button" className="primary-button" onClick={() => onNavigate('equipment')}>Ouvrir Équipements →</button></div><div className="compact-actions">{equipment.filter((item) => item.health < 90).slice(0,4).map((item) => <button type="button" key={item.code} onClick={() => onNavigate('equipment')}><span className={`risk-dot ${item.health < 70 ? 'critical' : ''}`} /><div><b>{displayAssetCode(item.code)} · {item.label}</b><small>{item.state} · indice {item.health}/100</small></div><span>›</span></button>)}</div></article></section>}
  </>;
}

function Registry({ anomalies, query, setQuery, priority, setPriority, status, setStatus, onOpen }: { anomalies:Anomaly[]; query:string; setQuery:(v:string)=>void; priority:string; setPriority:(v:string)=>void; status:string; setStatus:(v:string)=>void; onOpen:(id:string)=>void }) {
  const [expandedId, setExpandedId] = useState<string|null>(null);
  return <>
    <section className="section-heading"><div><p>{anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} correspondant à vos critères</p></div><button className="secondary-button">⇩ Exporter</button></section>
    <section className="filter-bar"><label className="search-box"><span>⌕</span><input aria-label="Rechercher dans le registre" placeholder="Rechercher par équipement, anomalie…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label>Priorité<Select value={priority} onChange={(e) => setPriority(e.target.value)}><option>Toutes</option><option>Critique</option><option>Haute</option><option>Moyenne</option><option>Faible</option></Select></label><label>Statut<Select value={status} onChange={(e) => setStatus(e.target.value)}><option>Tous</option><option>À qualifier</option><option>Affectée</option><option>En intervention</option><option>En validation</option><option>Clôturée</option></Select></label>{(query || priority !== 'Toutes' || status !== 'Tous') && <button className="clear-button" onClick={() => {setQuery('');setPriority('Toutes');setStatus('Tous')}}>Effacer</button>}</section>
    <section className="registry-card"><div className="registry-head"><span>Anomalie</span><span>Priorité</span><span>Étape</span><span>Échéance</span><span>Responsable</span><span /></div>{anomalies.length === 0 ? <div className="empty-state"><span>⌕</span><h3>Aucun résultat</h3><p>Essayez d’élargir vos critères de recherche.</p></div> : anomalies.map((a) => <article className={`registry-entry ${expandedId === a.id ? 'is-expanded' : ''}`} key={a.id}><button className="registry-row" onClick={() => onOpen(a.id)}><div className="registry-title"><span className={`asset-square ${priorityTone(a.priority)}`}>{a.asset.split('-')[0].slice(0,2)}</span><div><b>{a.title}</b><small>{a.id} · <span className="equipment-reference">{displayAssetCode(a.asset)}</span> · {a.location}</small></div></div><div><Badge tone={priorityTone(a.priority)}>{a.priority}</Badge></div><div><Badge tone={statusTone(a.status)}>{a.status}</Badge></div><div className={a.delayed && a.status !== 'Clôturée' ? 'late-text' : ''}>{a.delayed && a.status !== 'Clôturée' && <b>En retard</b>}<span>{a.due}</span></div><div className="owner-cell"><span className="mini-avatar">{canonicalResponsible(a) ? asciiInitials(canonicalResponsible(a)!) : '—'}</span><span>{canonicalResponsible(a) ?? 'Non attribué'}{externalActorConcerned(a) && <small>Acteur externe : {externalActorConcerned(a)}</small>}</span></div><div className="registry-mobile-meta"><Badge tone={priorityTone(a.priority)}>{a.priority}</Badge><Badge tone={statusTone(a.status)}>{a.status}</Badge>{a.delayed && a.status !== 'Clôturée' && <Badge tone="critical">En retard</Badge>}</div><div className="registry-mobile-details"><span><b>Échéance</b>{a.due}</span><span><b>Responsable interne</b>{canonicalResponsible(a) ?? 'Non attribué'}{externalActorConcerned(a) && <small>Acteur externe : {externalActorConcerned(a)}</small>}</span></div><span className="row-arrow">›</span></button><button type="button" className="registry-summary-toggle" aria-expanded={expandedId === a.id} onClick={() => setExpandedId((current) => current === a.id ? null : a.id)}>{expandedId === a.id ? 'Masquer la continuité de traitement' : 'Afficher la continuité de traitement'} <span>{expandedId === a.id ? '−' : '+'}</span></button>{expandedId === a.id && <AntiZombieSummary data={adaptDossierToAntiZombieSummary(a)} variant="compact" />}</article>)}</section>
  </>;
}

function Manager({ anomalies, tab, setTab, onOpen }: { anomalies:Anomaly[]; tab:ManagerQueue; setTab:(v:ManagerQueue)=>void; onOpen:(id:string)=>void; escalations?:Escalation[]; fieldRequests?:FieldRequest[] }) {
  const escalations = (arguments[0] as { escalations?: Escalation[] }).escalations ?? [];
  const fieldRequests = (arguments[0] as { fieldRequests?: FieldRequest[] }).fieldRequests ?? [];
  const { open: openAnomalies, hygiene: hygieneRequests } = atraiterSources(anomalies, fieldRequests);
  const hygieneItems: Anomaly[] = hygieneRequests.map((request) => ({
    id: request.id,
    asset: request.subject.includes('DEMO-EAU') ? 'DEMO-EAU' : 'DEMO-RND',
    title: displayAssetText(request.subject),
    location: 'Rondes et services',
    priority: 'Faible' as Priority,
    status: 'À qualifier' as Status,
    reported: 'Aujourd’hui',
    due: 'Aujourd’hui · 12:00',
    owner: 'Non affectée',
    delayed: false,
    proof: false,
    description: request.note,
    origin: 'Rondes et services',
    horsScore: true,
  }));
  const openItems = [...openAnomalies, ...hygieneItems];
  const amountOf = (item: Anomaly) => item.treatment?.amount ?? escalations.find((row) => row.anomaly === item.id)?.amount ?? null;
  const originOf = (item: Anomaly) => item.origin ?? (item.asset === 'DEMO-RND' || item.id.startsWith('REQ-') ? 'Rondes et services' : item.owner === 'Non affectée' ? 'Agent terrain' : item.owner);
  const groups:Record<ManagerQueue,Anomaly[]> = {
    all: openItems,
    qualify: openItems.filter((item) => item.status === 'À qualifier' || item.horsScore),
    decide: openItems.filter((item) => item.status === 'Affectée' || item.status === 'En intervention' || item.status === 'En validation'),
    late: openItems.filter((item) => item.delayed),
    unassigned: openItems.filter((item) => !canonicalResponsible(item)),
    overThreshold: openItems.filter((item) => (amountOf(item) ?? 0) >= DECISION_THRESHOLD_FCFA),
    proof: openItems.filter((item) => item.proofPending),
    reception:[],
    reservations:[],
    reopened:[],
  };
  const queueMeta:Record<Exclude<ManagerQueue,'all'|'decide'|'overThreshold'>,{label:string;short:string;tone:string;pending?:boolean}> = {
    qualify:{label:'À qualifier',short:'AQ',tone:'amber'},
    late:{label:'En retard',short:'SLA',tone:'red'},
    unassigned:{label:'Sans responsable',short:'SR',tone:'orange'},
    proof:{label:'Preuves à vérifier',short:'PV',tone:'blue'},
    reception:{label:'Réceptions',short:'RC',tone:'neutral',pending:true},
    reservations:{label:'Réserves',short:'RS',tone:'neutral',pending:true},
    reopened:{label:'Dossiers rouverts',short:'RO',tone:'neutral',pending:true},
  };
  const visibleFilters: Array<{ key:ManagerQueue; label:string }> = [
    { key:'qualify', label:'À qualifier' },
    { key:'decide', label:'À décider' },
    { key:'late', label:'En retard' },
    { key:'unassigned', label:'Sans responsable' },
    { key:'overThreshold', label:'Au-dessus du seuil' },
    { key:'proof', label:'Preuves à vérifier' },
  ];
  const active = groups[tab] ?? openItems;
  const [selectedId, setSelectedId] = useState('ANO-0241');
  const [branch, setBranch] = useState<'internal'|'cost'|'external'>('cost');
  const [amount, setAmount] = useState('');
  const [dueValue, setDueValue] = useState('');
  const [note, setNote] = useState('');
  const [qualifyPriority, setQualifyPriority] = useState<Priority | ''>('');
  const [qualifyOwner, setQualifyOwner] = useState('');
  const [decisionDone, setDecisionDone] = useState(false);
  const [qualifyKind, setQualifyKind] = useState<'Notification'|'Ticket'|'Urgence'|null>(null);
  const [qualifyError, setQualifyError] = useState('');
  const focus = active.find((item) => item.id === selectedId) ?? active[0];
  const amountValue = Number(amount || 0);
  const overThreshold = Boolean(amount) && amountValue >= DECISION_THRESHOLD_FCFA;
  const branchLocked = Boolean(focus && focus.status === 'À qualifier' && !canonicalResponsible(focus));
  const focusAmount = focus ? amountOf(focus) : null;
  const historyLines = focus ? [
    { at: focus.reported, text: focus.horsScore ? 'Notification créée par l’agente rondes' : 'Constat créé' },
    ...(focus.proofs ?? []).map((proof) => ({ at: proof.capturedAt, text: `Preuve ${proof.reference} · ${proof.verificationStatus === 'accepted' ? 'Jointe' : proof.verificationStatus === 'rejected' ? 'Non concluant' : 'Attendu'}` })),
  ] : [];

  return <div className="manager-pilot">
    <ManagerOperationalContext />

    <section className="manager-kpis manager-kpis-target dashboard-section-tabs" role="tablist" aria-label="Filtres rapides des files opérationnelles">
      <button type="button" role="tab" aria-selected={tab === 'qualify'} aria-controls="manager-queue-panel" className={tab === 'qualify' ? 'active' : ''} onClick={() => {setTab('qualify');setDecisionDone(false)}}>
        <span className="kpi-icon amber">AQ</span><div><strong>{groups.qualify.length}</strong><small>À qualifier</small></div>
      </button>
      <button type="button" role="tab" aria-selected={tab === 'late'} aria-controls="manager-queue-panel" className={tab === 'late' ? 'active' : ''} onClick={() => {setTab('late');setDecisionDone(false)}}>
        <span className="kpi-icon red">SLA</span><div><strong>{groups.late.length}</strong><small>En retard</small></div>
      </button>
      <button type="button" role="tab" aria-selected={tab === 'proof'} aria-controls="manager-queue-panel" className={tab === 'proof' ? 'active' : ''} onClick={() => {setTab('proof');setDecisionDone(false)}}>
        <span className="kpi-icon blue">PV</span><div><strong>{groups.proof.length}</strong><small>Preuves à vérifier</small></div>
      </button>
      <div className="completion" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={0} aria-label="Score de traitement indisponible">
        <div className="completion-head"><span>Score traitement</span><b>—<small>/100</small></b></div>
        <div className="completion-bar" aria-hidden="true"><i style={{width:'0%'}} /></div>
        <p>Données insuffisantes. Délais, réactivité et preuves non raccordés.</p>
      </div>
    </section>

    <section className={`fm-decision-layout ${focus ? '' : 'is-empty'}`}>
      <article className="panel fm-inbox">
        <div className="dossiers-filters" role="group" aria-label="Filtres des dossiers">
          {visibleFilters.map((item) => {
            const count = groups[item.key].length;
            const pressed = tab === item.key;
            return <button type="button" key={item.key} className={`chip${pressed ? ' is-pressed' : ''}${count === 0 ? ' is-zero' : ''}`} aria-pressed={pressed} onClick={() => { setTab(pressed ? 'all' : item.key); setDecisionDone(false); }}>{item.label}<b>{count}</b></button>;
          })}
        </div>
        <div className="queue-tabs" role="tablist" aria-label="Files de travail">
          {(Object.keys(queueMeta) as Array<keyof typeof queueMeta>).map((key) => <button type="button" role="tab" key={key} title={queueMeta[key].label} aria-selected={tab === key} aria-controls="manager-queue-panel" className={[tab === key ? 'active' : '', queueMeta[key].pending ? 'is-pending' : ''].filter(Boolean).join(' ')} onClick={() => {setTab(key);setDecisionDone(false)}}><b>{queueMeta[key].short}</b><span>{groups[key].length}</span><small>{queueMeta[key].label}</small></button>)}
        </div>
        <div className="fm-inbox-list" id="manager-queue-panel" aria-live="polite">
          {active.length ? active.map((item) => {
            const rowAmount = amountOf(item);
            return <button type="button" key={item.id} aria-pressed={focus?.id === item.id} className={focus?.id === item.id ? 'active' : ''} onClick={() => {setSelectedId(item.id);setDecisionDone(false);setQualifyKind(null);setAmount('');setNote('');setQualifyPriority('');setQualifyOwner('');setDueValue('');setQualifyError('')}}>
              <span className={`queue-mark ${priorityTone(item.priority)}`} aria-label={`Priorité ${item.priority}`} />
              <div>
                <h3>{item.title}</h3>
                <span className="sub">{item.asset === 'DEMO-RND' || item.horsScore ? item.location : `${displayAssetCode(item.asset)}, ${item.location}`}</span>
                <span className="tags"><Badge tone={item.horsScore ? 'neutral' : priorityTone(item.priority)}>{item.horsScore ? 'Notification' : item.priority}</Badge><Badge tone="neutral">{item.status === 'À qualifier' ? 'À qualifier' : item.status}</Badge><span className="origin">{originOf(item)}</span>{item.horsScore ? <span className="origin">Hors score</span> : null}</span>
              </div>
              <span className="rt">
                <span className={item.delayed ? 'late-text' : ''}>{item.delayed ? 'En retard, ' : ''}{item.due}</span>
                {rowAmount != null ? <span className="amt">{formatMoney(rowAmount)}</span> : null}
                {rowAmount != null && rowAmount >= DECISION_THRESHOLD_FCFA ? <Badge tone="orange">Administration</Badge> : null}
                <span className={canonicalResponsible(item) ? 'muted' : 'unassigned-text'}>{canonicalResponsible(item) ?? 'Sans responsable'}</span>
              </span>
            </button>;
          }) : <div className="empty-state compact"><span>{['reception','reservations','reopened'].includes(tab) ? '⌁' : '✓'}</span><h3>{['reception','reservations','reopened'].includes(tab) ? 'Donnée non raccordée' : 'File à jour'}</h3><p>{['reception','reservations','reopened'].includes(tab) ? 'La source métier canonique de cette file doit encore être raccordée.' : 'Aucune action dans cette catégorie.'}</p></div>}
        </div>
      </article>

      <div className="fm-right-column">
      {focus ? <Card className="fm-decision-card">
        <div className="fm-decision-head">
          <div><div><Badge tone={focus.horsScore ? 'neutral' : priorityTone(focus.priority)}>{focus.horsScore ? 'Notification' : focus.priority}</Badge><span>{focus.id}</span><span className="origin">{originOf(focus)}</span>{focus.horsScore ? <span className="origin">Hors score</span> : null}</div><h3>{focus.title}</h3><p>{focus.horsScore ? focus.location : `${displayAssetCode(focus.asset)}, ${focus.location}`}</p></div>
          {focus.id.startsWith('REQ-') ? null : <Button variant="secondary" onClick={() => onOpen(focus.id)}>Voir le dossier complet</Button>}
        </div>
        <div className="dossier-next">
          <div className="k">Prochaine action</div>
          <div className="v">{focus.status === 'À qualifier' || focus.horsScore ? 'Qualifier et affecter' : !canonicalResponsible(focus) ? 'Réaffecter' : (focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? 'Soumettre à l’Administration' : 'Valider'}</div>
          <div className={`due${focus.delayed ? ' is-late' : ''}`}>{focus.delayed ? 'En retard, ' : ''}{focus.due}{canonicalResponsible(focus) ? `, ${canonicalResponsible(focus)}` : ''}</div>
        </div>
        <div className="dossier-steps" aria-label="Avancement">
          {['Constat','Qualification','Décision','Intervention','Preuve','Clôture'].map((label, index) => {
            const now = focus.status === 'À qualifier' || focus.horsScore ? 2 : focus.status === 'Affectée' ? 3 : focus.status === 'En intervention' ? 4 : focus.status === 'En validation' ? 5 : 7;
            const state = index + 1 < now ? 'done' : index + 1 === now ? 'now' : '';
            return <div key={label} className={state}><i /><span>{label}</span></div>;
          })}
        </div>

        {focus.status === 'À qualifier' || focus.horsScore ? (
          <div className="dossier-qualify">
            <h3>Qualifier <span className="visually-hidden">Qualifier maintenant</span></h3>
            <span className="lbl">Ce constat devient</span>
            <div className="seg" role="group" aria-label="Type de qualification">
              {(['Notification','Ticket','Urgence'] as const).map((kind) => (
                <button type="button" key={kind} aria-pressed={qualifyKind === kind} onClick={() => { setQualifyKind(kind); setQualifyError(''); }}>{kind}</button>
              ))}
            </div>
            {qualifyKind === 'Urgence' ? <p className="hint is-bad">Intervention immédiate autorisée, l’Administration sera informée.</p> : null}
            {qualifyKind === 'Notification' ? <p className="hint">Reste hors score, suivi par l’agente rondes.</p> : null}
            <span className="lbl">Priorité</span>
            <div className="seg" role="group" aria-label="Priorité">
              {(['Critique','Haute','Moyenne','Faible'] as const).map((item) => (
                <button type="button" key={item} aria-pressed={qualifyPriority === item} onClick={() => setQualifyPriority(item)}>{item}</button>
              ))}
            </div>
            <div className="fm-decision-fields">
              <label className="field proposed-field">Responsable<Select value={qualifyOwner} onChange={(event) => setQualifyOwner(event.target.value)}><option value="">Choisir</option><option>Agent Eau & Incendie Démo</option><option>Agent Électricité Démo</option><option>Agente Rondes & Assistance Démo</option></Select></label>
              <label className="field proposed-field">Échéance<input type="datetime-local" lang="fr" value={dueValue} onChange={(event) => setDueValue(event.target.value)} /></label>
            </div>
            <label className="field proposed-field">Coût estimé<input type="number" min="0" step="1000" inputMode="numeric" placeholder="Montant en FCFA" value={amount} onChange={(event) => setAmount(event.target.value)} /></label>
            {!amount ? <p className="hint">Facultatif à ce stade. À partir de {formatMoney(DECISION_THRESHOLD_FCFA)}, la décision revient à l’Administration.</p> : amountValue < 0 || Number.isNaN(amountValue) ? <p className="hint is-bad">Saisissez un montant en chiffres.</p> : overThreshold ? <p className="hint is-warn">Au-dessus du seuil : la décision sera soumise à l’Administration.</p> : <p className="hint is-ok">Sous le seuil : vous pourrez valider vous-même.</p>}
            <p className="branch-lock-phrase">Le choix entre interne sans coût, interne avec coût et intervention externe se fera après le diagnostic confirmé.</p>
            <Field label="Note"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Consigne pour le responsable" rows={2} /></Field>
            {qualifyError ? <p className="hint is-bad" role="alert">{qualifyError}</p> : null}
            <div className="fm-decision-actions"><Button variant="secondary" onClick={() => { setDecisionDone(false); setQualifyError(''); }}>Conserver en brouillon</Button><Button onClick={() => {
              if (!qualifyKind) { setQualifyError('Choisissez ce que devient le constat.'); return; }
              if (!qualifyPriority) { setQualifyError('Choisissez une priorité.'); return; }
              if (!qualifyOwner) { setQualifyError('Choisissez un responsable.'); return; }
              setQualifyError('');
              setDecisionDone(true);
            }}>Qualifier et affecter</Button></div>
          </div>
        ) : (
          <>
            {branchLocked ? (
              <p className="branch-lock-phrase">Le choix entre interne sans coût, interne avec coût et intervention externe se fera après le diagnostic confirmé.</p>
            ) : (
              <div className="fm-section-title"><div><span>1</span><p><b>Choisir la branche de traitement</b><small>Une décision explicite oriente le reste du dossier.</small></p></div></div>
            )}
            <div className={`branch-selector ${branchLocked ? 'is-locked' : ''}`} aria-label="Branche de traitement" aria-disabled={branchLocked} hidden={branchLocked}>
              <button type="button" disabled={branchLocked} aria-pressed={branch === 'internal'} className={branch === 'internal' ? 'active' : ''} onClick={() => {setBranch('internal');setAmount('0')}}><span>A</span><b>Interne sans coût</b><small>Action dans le périmètre agent</small></button>
              <button type="button" disabled={branchLocked} aria-pressed={branch === 'cost'} className={branch === 'cost' ? 'active' : ''} onClick={() => setBranch('cost')}><span>B</span><b>Interne avec coût</b><small>Achat ou petite prestation</small></button>
              <button type="button" disabled={branchLocked} aria-pressed={branch === 'external'} className={branch === 'external' ? 'active' : ''} onClick={() => setBranch('external')}><span>C</span><b>Intervention externe</b><small>Devis et entreprise référencée</small></button>
            </div>
            {branchLocked && <div className="branch-lock-note visually-hidden" role="note"><BrandIcon name="lock" size={18} /><div><b>Choix de branche indisponible à cette étape</b><small>Action actuelle : qualifier, affecter, puis attendre le diagnostic confirmé.</small></div></div>}
            {focusAmount != null ? <div className="dossier-money"><b>{formatMoney(focusAmount)}</b><Badge tone={(focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? 'orange' : 'success'}>{(focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? 'Au-dessus du seuil' : 'Sous le seuil'}</Badge></div> : null}
            <div className={`authority-result ${overThreshold || (focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? 'escalate' : 'delegated'}`} role="status">
              <span>{(focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? '↑' : '✓'}</span><div><b>{(focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? 'Validation de l’Administration requise' : 'Décision dans la délégation de Facility Manager'}</b><small>{(focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? `${formatMoney(focusAmount ?? 0)} dépasse ou atteint le seuil de ${formatMoney(DECISION_THRESHOLD_FCFA)}.` : `${formatMoney(focusAmount ?? 0)} reste sous le seuil validé.`}</small></div>
            </div>
            <span className="visually-hidden">Qualification requise avant arbitrage financier</span>
            <Field label="Recommandation"><textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Votre recommandation motivée" rows={2} /></Field>
            <div className="fm-decision-actions"><Button variant="secondary">Demander un complément</Button><Button variant="secondary">Refuser</Button><Button onClick={() => setDecisionDone(true)}>{(focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? 'Soumettre à l’Administration' : 'Valider'}</Button></div>
          </>
        )}

        <details className="dossier-treatment-details">
          <summary>Détails de traitement</summary>
          {focus.id.startsWith('REQ-') ? <p className="hint">Notification hors score. Qualification requise avant toute branche de traitement.</p> : <AntiZombieSummary data={adaptDossierToAntiZombieSummary(focus)} variant="standard" hideMissing />}
        </details>
        {decisionDone && <div className="inline-success" role="status"><span>✓</span><p><b>{focus.status === 'À qualifier' || focus.horsScore ? 'Qualifié et affecté' : 'Proposition préparée'}</b><small>Elle reste distincte de l’état actuel du dossier jusqu’à son enregistrement côté serveur.</small></p></div>}
        <div className="dossier-history-block">
          <h3>Historique</h3>
          {historyLines.length ? <ul className="hist">{historyLines.map((line) => <li key={`${line.at}-${line.text}`}><span>{line.at}</span>{line.text}</li>)}</ul> : <p className="hint">Données insuffisantes</p>}
        </div>
      </Card> : null}
      </div>
    </section>
    <WorkflowAnalytics items={anomalies.map((item) => ({ ...item, owner:canonicalResponsible(item) ?? 'Non affectée' }))} variant="manager" />
  </div>;
}

function Detail({ anomaly, decisionAmount, persistenceMode, onBack, onStatus, onProof, onVerify, readOnly = false, canVerify = false, busy = false, vendorReport = null }: { anomaly:Anomaly; decisionAmount:number|null; persistenceMode:'demo'|'server'; onBack:()=>void; onStatus:(s:Status)=>void; onProof:(file:File)=>Promise<SyncStatusState>; onVerify:()=>void; readOnly?:boolean; canVerify?:boolean; busy?:boolean; vendorReport?:null|{ vendors:OperationalVendor[]; canUpload:boolean; busy:boolean; onSubmit:(input:VendorReportInput)=>Promise<void> } }) {
  const nextStep:Partial<Record<Status,Status>> = { 'À qualifier':'Affectée', 'Affectée':'En intervention', 'En intervention':'En validation', 'En validation':'Clôturée' };
  const nextStatusOption = nextStep[anomaly.status];
  const [nextStatus, setNextStatus] = useState<Status>(nextStatusOption ?? anomaly.status);
  const [section, setSection] = useState<'overview'|'finance'|'evidence'|'history'>('overview');
  const proofInput = useRef<HTMLInputElement>(null);
  const [pendingProof, setPendingProof] = useState<File|null>(null);
  const [proofTransferState, setProofTransferState] = useState<SyncStatusState>(persistenceMode === 'server' ? 'online-required' : 'demo-volatile');
  const chooseProof = () => proofInput.current?.click();
  const submitProof = async (file:File) => {
    setPendingProof(file);
    setProofTransferState(persistenceMode === 'server' ? 'transmitting' : 'demo-volatile');
    const result = await onProof(file);
    setProofTransferState(result);
    if (result !== 'error') setPendingProof(null);
  };
  const workflow = ['Constat','Qualification','Décision','Intervention','Preuve','Clôture'];
  const statusStep:Record<Status,number> = { 'À qualifier':1, 'Affectée':1, 'En intervention':3, 'En validation':4, 'Clôturée':5 };
  const currentStep = statusStep[anomaly.status];
  const overThreshold = decisionAmount !== null && decisionAmount >= DECISION_THRESHOLD_FCFA;
  const expectedProof = expectedProofFor(anomaly);
  const proofs = anomaly.proofs ?? [];
  const proofCount = proofs.length || ((anomaly.proof || anomaly.proofPending) ? 1 : 0);
  const criticalClosureLocked = nextStatusOption === 'Clôturée' && anomaly.priority === 'Critique' && !anomaly.proof;
  const proofRequiresAttention = Boolean(anomaly.proofPending) || criticalClosureLocked;
  const diagnosisStage = anomaly.status === 'À qualifier' || anomaly.status === 'Affectée';
  const primaryActionLabel = proofRequiresAttention ? 'Ouvrir les preuves' : diagnosisStage ? nextActionFor(anomaly) : overThreshold ? 'Examiner la décision financière' : nextStatusOption ? `Valider : ${nextStatus}` : 'Consulter les repères du dossier';
  const runPrimaryAction = () => {
    if (proofRequiresAttention) { setSection('evidence'); return; }
    if (diagnosisStage) { if (nextStatusOption && canonicalResponsible(anomaly)) onStatus(nextStatus); return; }
    if (overThreshold) { setSection('finance'); return; }
    if (nextStatusOption) { onStatus(nextStatus); return; }
    setSection('history');
  };
  return <>
    <input ref={proofInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void submitProof(file); event.currentTarget.value = ''; }} />
    <button className="back-button dossier-back" onClick={onBack}>← Retour à la file</button>
    <section className="dossier-hero"><div><div className="detail-labels"><Badge tone={priorityTone(anomaly.priority)}>{anomaly.priority}</Badge>{anomaly.delayed && anomaly.status !== 'Clôturée' && <Badge tone="critical">En retard</Badge>}{readOnly && <Badge tone="neutral">CONSULTATION</Badge>}<span>{anomaly.id}</span></div><h2>{anomaly.title}</h2><p>{anomaly.asset} · {anomaly.location}</p></div></section>
    <section className="dossier-workflow" aria-label="Cycle du dossier">{workflow.map((item,index) => <div key={item} className={index < currentStep ? 'done' : index === currentStep ? 'current' : ''}><span>{index < currentStep ? '✓' : index+1}</span><b>{item}</b></div>)}</section>
    {anomaly.priority === 'Critique' && !anomaly.proof && <section className="critical-banner dossier-critical"><BrandIcon name="circleAlert" size={18} /><div><b>Clôture verrouillée jusqu’à l’acceptation de la preuve</b><p>{anomaly.proofPending ? 'Une preuve a été déposée et attend le contrôle de Facility Manager.' : 'La matrice des preuves exige une pièce conforme avant clôture.'}</p></div>{!readOnly && !anomaly.proofPending && <button disabled={busy} onClick={chooseProof}>＋ Ajouter une preuve</button>}</section>}
    <div className="dossier-continuity"><AntiZombieSummary data={adaptDossierToAntiZombieSummary(anomaly)} variant="detailed" /></div>
    <nav className="dossier-tabs" aria-label="Sections du dossier" role="tablist"><button type="button" role="tab" aria-selected={section === 'overview'} aria-controls="dossier-overview-panel" className={section === 'overview' ? 'active' : ''} onClick={() => setSection('overview')}>Vue d’ensemble</button><button type="button" role="tab" aria-selected={section === 'finance'} aria-controls="dossier-finance-panel" className={section === 'finance' ? 'active' : ''} onClick={() => setSection('finance')}>Coûts & décision</button><button type="button" role="tab" aria-selected={section === 'evidence'} aria-controls="dossier-evidence-panel" className={section === 'evidence' ? 'active' : ''} onClick={() => setSection('evidence')}>Preuves <span>{proofCount}</span></button><button type="button" role="tab" aria-selected={section === 'history'} aria-controls="dossier-history-panel" className={section === 'history' ? 'active' : ''} onClick={() => setSection('history')}>Historique</button></nav>

    {section === 'overview' && <section id="dossier-overview-panel" role="tabpanel" className="dossier-three-zone">
      <aside className="dossier-identity-column">
        <article className="panel dossier-identity-card"><p className="design-kicker">IDENTITÉ & RISQUE</p><div className="identity-priority"><Badge tone={statusTone(anomaly.status)}>{anomaly.status}</Badge></div><dl><div><dt>Équipement</dt><dd>{anomaly.asset}</dd></div><div><dt>Zone</dt><dd>{anomaly.location}</dd></div><div><dt>Origine</dt><dd>{dossierOrigin(anomaly)}</dd></div>{externalActorConcerned(anomaly) && <div><dt>Acteur externe concerné</dt><dd>{externalActorConcerned(anomaly)}</dd></div>}<div><dt>Constaté le</dt><dd>{anomaly.reported}</dd></div></dl></article>
        <article className="panel dossier-source-card"><span>R</span><div><b>Saisie directe</b><small>Source traçable · aucun import de reporting</small></div></article>
      </aside>
      <div className="dossier-activity-column">
        <article className="panel dossier-description"><div className="panel-head"><div><p className="design-kicker">CONSTAT D’ORIGINE</p><h3>Situation observée</h3></div><span>{anomaly.reported}</span></div><p>{anomaly.description}</p></article>
        <article className="panel dossier-diagnostic-card"><div className="panel-head"><div><p className="design-kicker">DIAGNOSTIC & INTERVENTION</p><h3>Progression métier</h3></div><Badge tone={statusTone(anomaly.status)}>{workflow[currentStep]}</Badge></div><div className="diagnostic-state"><BrandIcon name="wrench" size={18} /><div><b>{anomaly.status === 'À qualifier' || anomaly.status === 'Affectée' ? 'Diagnostic technique attendu' : 'Diagnostic enregistré dans le cycle'}</b><p>{anomaly.status === 'À qualifier' || anomaly.status === 'Affectée' ? 'Aucun diagnostic canonique n’est disponible dans la projection actuelle.' : 'Consultez l’historique pour les détails attribués et horodatés.'}</p></div></div></article>
      </div>
      <aside className="dossier-decision-column">
        <DossierActionBoard
          nextAction={nextActionFor(anomaly)}
          expectedActor={expectedActorFor(anomaly)}
          responsible={canonicalResponsible(anomaly)}
          deadline={anomaly.due}
          delayed={Boolean(anomaly.delayed)}
          closed={anomaly.status === 'Clôturée'}
          primaryLabel={primaryActionLabel}
          onPrimary={runPrimaryAction}
          readOnly={readOnly}
          busy={busy}
          showMeta={false}
        >{readOnly ? <div className="next-step-read-only" role="note">Consultation uniquement · aucune action métier accordée</div> : <button className="primary-button" disabled={busy || criticalClosureLocked} onClick={runPrimaryAction}>{busy ? 'Enregistrement…' : criticalClosureLocked ? 'Preuve requise avant clôture' : primaryActionLabel}</button>}</DossierActionBoard>
        <DossierTreatmentStrip
          branch={treatmentBranchFor(anomaly, decisionAmount)}
          workOrder={anomaly.treatment?.workOrderReference ?? null}
          retainedCost={anomaly.treatment?.amount ?? null}
          decisionAmount={decisionAmount}
          company={anomaly.treatment?.vendorLabel ?? externalActorConcerned(anomaly)}
          formatMoney={formatMoney}
        />
        <DossierProofSnapshot
          accepted={Boolean(anomaly.proof)}
          pending={Boolean(anomaly.proofPending)}
          countLabel={String(proofCount)}
          onOpen={() => setSection('evidence')}
        />
      </aside>
    </section>}

    {section === 'finance' && <section id="dossier-finance-panel" role="tabpanel" className="dossier-two-columns"><article className="panel finance-decision-card"><div className="panel-head"><div><p className="design-kicker">BRANCHE DE TRAITEMENT</p><h3>{decisionAmount === null ? 'Montant non renseigné' : 'Intervention avec montant documenté'}</h3></div><Badge tone={decisionAmount === null ? 'neutral' : overThreshold ? 'orange' : 'success'}>{decisionAmount === null ? 'DONNÉES INSUFFISANTES' : overThreshold ? 'ADMINISTRATION' : 'DÉLÉGATION FM'}</Badge></div><div className="finance-amount"><span>Montant de décision</span><strong>{decisionAmount === null ? 'Non renseigné' : formatMoney(decisionAmount)}</strong><small>Seuil d’approbation : {formatMoney(DECISION_THRESHOLD_FCFA)} · une approbation ne démarre pas l’intervention</small></div>{decisionAmount === null ? <div className="compact-insufficient-state"><b>Qualification financière incomplète</b><p>Aucun montant canonique n’est relié à ce dossier.</p></div> : <><div className={`authority-result ${overThreshold ? 'escalate' : 'delegated'}`}><span>{overThreshold ? '↑' : '✓'}</span><div><b>{overThreshold ? 'Arbitrage de l’Administration' : 'Facility Manager peut décider'}</b><small>{overThreshold ? 'Le montant dépasse la délégation validée.' : 'Le montant reste sous le seuil validé.'}</small></div></div><div className="decision-audit"><span><b>Décision</b>{overThreshold ? 'À soumettre' : 'Autorisée dans la délégation'}</span><span><b>Montant engagé</b>Non renseigné</span><span><b>Montant payé</b>Non renseigné</span></div></>}</article><aside className="panel quote-card"><p className="design-kicker">PIÈCES FINANCIÈRES</p><h3>Devis et engagement</h3><div className="quote-file"><span>▧</span><p><b>Pièce financière non reliée</b><small>Données insuffisantes dans la source actuelle</small></p></div></aside></section>}

    {section === 'evidence' && <section id="dossier-evidence-panel" role="tabpanel" className="dossier-two-columns"><article className="panel evidence-panel"><div className="panel-head"><div><h3>Preuves du dossier</h3><p>Consultation, motif de refus et nouveau dépôt au même endroit</p></div>{!readOnly && anomaly.status !== 'Clôturée' && !anomaly.proofPending && <button type="button" className="primary-button" disabled={busy} onClick={chooseProof}><BrandIcon name="plus" size={16} /> {proofs.some((item) => item.verificationStatus === 'rejected') ? 'Déposer la preuve corrigée' : 'Déposer un justificatif'}</button>}</div>
        {!readOnly && !anomaly.proof && !anomaly.proofPending && <SyncStatusNotice state={proofTransferState} compact label="État du dépôt de preuve" onRetry={proofTransferState === 'error' && pendingProof ? () => void submitProof(pendingProof) : undefined} />}
        {proofs.length > 0 && <div className="evidence-list" aria-label="Fichiers de preuve enregistrés">{proofs.map((proof) => <article key={proof.id} className="evidence-file evidence-file-record"><BrandIcon name={proof.mimeType === 'application/pdf' ? 'fileCheck' : 'camera'} size={18} /><div><b>{proof.reference}</b><small>{proof.mimeType === 'application/pdf' ? 'Document PDF' : 'Image'} · {proof.capturedAt}</small>{proof.verificationStatus === 'rejected' && proof.rejectionReason ? <em>Motif : {proof.rejectionReason}</em> : null}</div><Badge tone={proof.verificationStatus === 'accepted' ? 'success' : proof.verificationStatus === 'rejected' ? 'critical' : 'orange'}>{proof.verificationStatus === 'accepted' ? 'ACCEPTÉE' : proof.verificationStatus === 'rejected' ? 'REFUSÉE' : 'À VALIDER'}</Badge><button type="button" className="secondary-button" disabled>Consulter · miroir</button></article>)}</div>}
        {proofs.length === 0 && anomaly.proof ? <div className="evidence-file"><BrandIcon name="fileCheck" size={18} /><div><b>Preuve d’intervention acceptée</b><small>Fichier privé · contrôle Facility Manager terminé</small></div><Badge tone="success">ACCEPTÉE</Badge></div> : null}
        {proofs.length === 0 && anomaly.proofPending ? <div className="evidence-file"><BrandIcon name="fileCheck" size={18} /><div><b>Preuve reçue</b><small>Contrôle Facility Manager requis</small></div><Badge tone="orange">À VALIDER</Badge>{canVerify && <button className="primary-button" disabled={busy} onClick={onVerify}>Valider</button>}</div> : null}
        {proofs.length === 0 && !anomaly.proof && !anomaly.proofPending ? <div className="proof-requirement"><BrandIcon name="camera" size={18} /><div><b>{expectedProof ?? 'Preuve attendue non définie'}</b><p>{expectedProof ? 'La clôture reste impossible tant que le dernier justificatif n’est pas accepté.' : 'Aucune règle de preuve canonique n’est raccordée à ce dossier.'}</p></div>{!readOnly && <button className="primary-button" onClick={chooseProof}><BrandIcon name="plus" size={16} /> Déposer</button>}</div> : null}
      </article><aside className="panel proof-matrix-card"><p className="design-kicker">EXIGENCE APPLIQUÉE</p><h3>{anomaly.asset}</h3>{expectedProof ? <ul><li><span>✓</span>{expectedProof}</li></ul> : <div className="compact-insufficient-state"><b>Preuve attendue non définie</b><p>La règle contextuelle doit être confirmée avant d’afficher une matrice.</p></div>}</aside></section>}
    {vendorReport ? <InternalVendorReportPanel anomalies={[anomaly]} vendors={vendorReport.vendors} canUpload={vendorReport.canUpload} busy={vendorReport.busy} onSubmit={vendorReport.onSubmit} /> : null}

    {section === 'history' && <section id="dossier-history-panel" role="tabpanel" className="panel dossier-history"><div className="panel-head"><div><h3>Historique du dossier</h3><p>Seuls les événements métier datés et attribués peuvent constituer l’historique</p></div><span className="panel-count">0 événement canonique</span></div><div className="dossier-history-missing" role="note"><BrandIcon name="info" size={18} /><div><b>Historique métier indisponible</b><p>Aucune source chargée ne fournit actuellement l’action, l’acteur, l’étape et l’horodatage complets. Les repères ci-dessous ne remplacent pas un journal métier.</p></div></div><div className="dossier-current-markers" aria-label="Repères disponibles hors historique"><article><span>R</span><div><b>Constat d’origine</b><small>{anomaly.reported} · auteur non renseigné</small></div><em>REPÈRE DOSSIER</em></article><article className="current"><span>{currentStep+1}</span><div><b>Étape actuelle : {anomaly.status}</b><small>Date et auteur de transition non disponibles</small></div><em>ÉTAT ACTUEL</em></article></div></section>}
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
  const surpresseurAccess = persona.id === 'eau_incendie';
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [pressure, setPressure] = useState('2.8');
  const [tankLevel, setTankLevel] = useState('72');
  const [observation, setObservation] = useState('Vibration légère sur la pompe P1 au démarrage.');
  const [checks, setChecks] = useState<Record<string,boolean>>({ auto:true, p1:false, p2:true, leak:true, valves:true, alarm:true });
  const setCheck = (key:string) => setChecks((items) => ({ ...items, [key]:!items[key] }));
  const session = sessionForAudience(persona.id as UiSession['audience'], persona.name);
  const roundsLead = <>
    <DemoScenarioSelect />
    <TodayRoundsPanel session={session} title="Rondes du jour" detail="Votre périmètre, aujourd’hui." withPicker onStart={() => {}} />
  </>;

  if (persona.id === 'facility') {
    return <div className="rounds-page">
      <h2 className="visually-hidden">Rondes</h2>
      <DemoScenarioSelect />
      <TodayRoundsPanel session={session} title="Planning du jour" detail="Tous les agents, triées par dépassement puis par heure." withPicker onStart={() => {}} />
    </div>;
  }

  if (persona.id === 'electricite') {
    return <div className="rounds-page">
      {roundsLead}
      <Ge01AgentForm agentName={persona.name} />
    </div>;
  }

  if (!surpresseurAccess) {
    const isRoundsAssistance = persona.id === 'rondes_assistance';
    return <div className="rounds-page">
      {roundsLead}
      <RoundPilotHeader
        title={isRoundsAssistance ? 'RND-LET · Rondes de services · zones' : 'Ronde technique'}
        subtitle="Constat terrain · transmission à Facility Manager"
        badge={<span className="mockup-label">Aucun import</span>}
      />
      <section className="quick-round-layout">
        <form className="panel quick-round-card" onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }}>
          <div className="round-card-head"><span className="round-icon">{isRoundsAssistance ? 'R' : 'GE'}</span><div><b>{isRoundsAssistance ? 'Zones du jour' : displayAssetCode('DEMO-GE')}</b><small>{isRoundsAssistance ? 'Périmètre nettoyage et jardinage' : 'Périmètre électrique autorisé'}</small></div><span className="mockup-label">MAQUETTE</span></div>
          <div className="two-fields"><label className="field">Zone<Select defaultValue={isRoundsAssistance ? 'Jardin nord' : 'Local groupe électrogène'}><option>{isRoundsAssistance ? 'Jardin nord' : 'Local groupe électrogène'}</option><option>{isRoundsAssistance ? 'Atrium restaurant' : 'Local TGBT'}</option></Select></label><label className="field">Type de contrôle<Select><option>{isRoundsAssistance ? 'Propreté & état' : 'Ronde préventive'}</option><option>{isRoundsAssistance ? 'Jardinage' : 'Constat incident'}</option></Select></label></div>
          <label className="field">Constat<textarea defaultValue={isRoundsAssistance ? 'Présence d’eau stagnante près de l’accès jardin nord.' : 'Mode AUTO confirmé. Tension batterie à contrôler au prochain démarrage.'} /></label>
          <div className="evidence-drop"><BrandIcon name="camera" size={20} /><div><b>Ajouter une photo</b><small>La pièce reste attachée au constat, jamais importée comme reporting.</small></div></div>
          <SyncStatusNotice state="demo-volatile" compact label="État du brouillon de ronde" />
          <div className="round-submit"><p>Interaction de maquette uniquement</p><button className="primary-button" type="submit">Valider la maquette</button></div>
        </form>
        <aside className="panel direct-flow-card"><p className="design-kicker">APRÈS L’ENVOI</p><h3>Un circuit court et lisible</h3>{['Constat enregistré','Qualification par Facility Manager','Affectation et échéance','Traitement avec preuve'].map((item,index) => <div key={item}><span>{index+1}</span><p><b>{item}</b><small>{index === 0 ? 'Vous gardez une trace immédiate' : 'Le dossier avance dans le même outil'}</small></p></div>)}</aside>
      </section>
      {submitted && <div className="prototype-success" role="status"><span>✓</span><div><b>Simulation de constat terminée</b><small>Aucune donnée n’a été enregistrée ou transmise.</small></div><button onClick={() => onNavigate('workspace')}>Retour à mon espace</button></div>}
    </div>;
  }

  const steps = ['Contexte','Pression','Pompes','Sécurité','Synthèse'];
  const pressureValue = Number(pressure.replace(',','.'));
  const hasPressureAlert = Number.isFinite(pressureValue) && pressureValue < 3;
  const completedChecks = Object.values(checks).filter(Boolean).length;

  return <div className="rounds-page">
    {roundsLead}
    <p className="visually-hidden">MODULE PILOTE · SURPRESSEUR</p>
    <RoundPilotHeader
      title={`${displayAssetCode('DEMO-EAU')} · Ronde quotidienne du surpresseur`}
      subtitle="Cinq étapes · fréquence quotidienne"
      badge={<span className="mockup-label">Maquette</span>}
    />

    <SyncStatusNotice state="demo-volatile" label="État de la ronde Surpresseur" />

    <section className="surpresseur-progress" aria-label="Progression de la ronde">
      {steps.map((item,index) => <button key={item} className={index === step ? 'active' : index < step ? 'done' : ''} onClick={() => setStep(index)}><span>{index < step ? '✓' : index+1}</span><b>{item}</b></button>)}
    </section>

    <section className="surpresseur-layout">
      <article className="panel surpresseur-form-card">
        <div className="surpresseur-section-head"><div><span>ÉTAPE {step+1} SUR 5</span><h3>{steps[step]}</h3></div><span className="mockup-label">MAQUETTE INTERACTIVE</span></div>

        {step === 0 && <div className="surpresseur-fields"><div className="context-grid"><div><span>Agent</span><b>{persona.name}</b><small>{persona.role}</small></div><div><span>Début</span><b>09:42</b><small>27 août 2026</small></div><div><span>Dernière ronde</span><b>Hier · 08:11</b><small>1 anomalie ouverte</small></div></div><label className="field">Type de ronde<Select defaultValue="Quotidienne"><option>Quotidienne</option><option>Après intervention</option><option>Contrôle exceptionnel</option></Select></label><div className="surpresseur-callout"><span>i</span><p><b>Point d’attention transmis</b><small>Vérifier la récidive du défaut pompe P1 et la pression de refoulement.</small></p></div></div>}

        {step === 1 && <div className="surpresseur-fields"><div className="measure-grid"><label><span>Pression réseau</span><div><input value={pressure} inputMode="decimal" onChange={(event) => setPressure(event.target.value)} /><b>bar</b></div><small>Plage attendue : 3,0 à 4,5 bar</small></label><label><span>Niveau bâche</span><div><input value={tankLevel} inputMode="numeric" onChange={(event) => setTankLevel(event.target.value)} /><b>%</b></div><small>Plage de contrôle : 40 à 100 %</small></label></div><div className="measure-range-grid"><MeasureRange label="Pression réseau" value={pressureValue} min={3} max={4.5} unit="bar" /><MeasureRange label="Niveau de bâche" value={Number(tankLevel)} min={40} max={100} unit="%" /></div>{hasPressureAlert && <div className="measure-alert"><span>!</span><div><b>Écart détecté automatiquement</b><small>La pression saisie est inférieure au seuil. Un constat sera proposé à Facility Manager.</small></div></div>}<label className="field">Stabilité du manomètre<Select><option>Stable</option><option>Oscillation légère</option><option>Oscillation importante</option></Select></label></div>}

        {step === 2 && <div className="surpresseur-fields"><div className="check-grid">{[['auto','Mode automatique actif','Commande générale'],['p1','Pompe P1 disponible','Pompe prioritaire'],['p2','Pompe P2 disponible','Pompe de secours'],['leak','Absence de fuite active','Collecteur et raccords']].map(([key,title,detail]) => <button type="button" key={key} className={checks[key] ? 'checked' : 'unchecked'} onClick={() => setCheck(key)}><span>{checks[key] ? '✓' : '!'}</span><p><b>{title}</b><small>{detail}</small></p><em>{checks[key] ? 'Conforme' : 'À signaler'}</em></button>)}</div></div>}

        {step === 3 && <div className="surpresseur-fields"><div className="check-grid compact">{[['valves','Vannes en position normale','Aspiration et refoulement'],['alarm','Aucune alarme active','Coffret et supervision']].map(([key,title,detail]) => <button type="button" key={key} className={checks[key] ? 'checked' : 'unchecked'} onClick={() => setCheck(key)}><span>{checks[key] ? '✓' : '!'}</span><p><b>{title}</b><small>{detail}</small></p><em>{checks[key] ? 'Conforme' : 'À signaler'}</em></button>)}</div><label className="field">Observation terrain<textarea value={observation} onChange={(event) => setObservation(event.target.value)} /></label><div className="evidence-drop"><BrandIcon name="camera" size={20} /><div><b>Photo du manomètre ou du coffret</b><small>Illustration de maquette · compression et synchronisation non implémentées</small></div><button type="button">Choisir</button></div></div>}

        {step === 4 && <div className="surpresseur-fields"><div className="round-summary"><div><span>MESURES</span><b className={hasPressureAlert ? 'warning' : ''}>{pressure} bar</b><small>Pression réseau</small></div><div><span>NIVEAU</span><b>{tankLevel} %</b><small>Bâche de stockage</small></div><div><span>CONTRÔLES</span><b>{completedChecks}/6</b><small>Points conformes</small></div></div><div className="proposed-finding"><span>!</span><div><p>CONSTAT PROPOSÉ</p><h4>Pression Surpresseur sous le seuil attendu</h4><small>Priorité proposée : Haute · Transmission à la file de qualification de Facility Manager.</small></div><Badge tone="orange">À QUALIFIER</Badge></div><label className="confirmation-line"><input type="checkbox" defaultChecked /><span>Je confirme que les valeurs correspondent à la ronde réalisée sur {displayAssetCode('DEMO-EAU')}.</span></label></div>}

        <div className="surpresseur-actions"><button className="secondary-button" disabled={step === 0} onClick={() => setStep((value) => Math.max(0,value-1))}>← Précédent</button><p>Brouillon temporaire dans cette page</p>{step < 4 ? <button className="primary-button" onClick={() => setStep((value) => Math.min(4,value+1))}>Continuer →</button> : <button className="primary-button" onClick={() => setSubmitted(true)}>Valider la maquette</button>}</div>
      </article>

      <aside className="surpresseur-aside">
        <article className="panel next-action-card"><p className="design-kicker">À SURVEILLER</p><span className="next-action-icon">!</span><h3>Pompe P1 indisponible</h3><p>Deuxième défaut en sept jours. Le réarmement provisoire ne permet pas la clôture.</p><div><span>Responsable pressenti</span><b>Agent Eau & Incendie Démo</b></div></article>
        <article className="panel score-explain-card"><div><span>SCORE WILO</span><b>78/100</b></div><div className="score-freshness"><span><b>État</b>Dégradé</span><span><b>Variation</b>Indisponible</span><span><b>Fraîcheur</b>Non synchronisée</span></div><ul><li><i className="down" /> Pression sous le seuil <b>-8</b></li><li><i className="down" /> Défaut P1 récurrent <b>-10</b></li><li><i className="up" /> Maintenance à jour <b>+6</b></li></ul><p className="analytics-note">Score de maquette : la date de calcul et l’historique réel ne sont pas encore disponibles.</p><button type="button">Voir le détail du calcul</button></article>
      </aside>
    </section>

    {submitted && <div className="prototype-success" role="status"><span>✓</span><div><b>Simulation de ronde terminée</b><small>Aucune donnée n’a été enregistrée dans Supabase ni mise en file hors ligne.</small></div><button onClick={() => setSubmitted(false)}>Continuer la revue</button></div>}
  </div>;
}
