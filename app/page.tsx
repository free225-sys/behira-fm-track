'use client';
import type { Ge01AssignmentHandler } from './components/Ge01Planning';
import type { Ge01Operations } from './lib/ge01/operations';
import { ConnectedCostsWorkspace } from './components/ConnectedCostsWorkspace';
const DECISION_THRESHOLD_FCFA = DEMO_THRESHOLD.value;
import { requiresFmDecision, pendingFmDossierIds, managerActionQueueIds } from './lib/connected-presentation';
import type { HealthPresentation } from './lib/ui-contract/presentation';
import type { OperationalSnapshot } from './lib/supabase/data';
import type { EquipmentCode } from './lib/ui-contract/building-health';
const ConnectedPresentation = createContext<{ live: boolean; session: UiSession | null; health: HealthPresentation | null; source: OperationalSnapshot | null; threshold: number; sync?: ReactNode; costs?: ReactNode; pendingRounds?: {id:string;sentAt:string}[] }>({ live:false, session:null, health:null, source:null, threshold:DECISION_THRESHOLD_FCFA });
function useUiSession(audience: UiSession['audience'], name: string) {
  const current = useContext(ConnectedPresentation);
  return current.live && current.session ? current.session : sessionForAudience(audience, name);
}

import { createContext, useContext, FormEvent, useEffect, useId, useMemo, useRef, useState, type ReactNode, useCallback } from 'react';
import { AntiZombieSummary } from './components/AntiZombieSummary';
import { type AntiZombieSummaryData } from './components/anti-zombie-contract';
import { DossierActionBoard, DossierProofSnapshot, DossierTreatmentStrip, type TreatmentBranch } from './components/DossierContinuity';
import { DossiersWorkspace, dossierActionLabel, type DossiersTab } from './components/DossiersWorkspace';
import { AccessWorkspace } from './components/AccessWorkspace';
import { BuildingHealthCockpit, ScoreRing } from './components/BuildingHealthCockpit';
import { DomainPointsSummary } from './components/DomainPointsSummary';
import { RoundDateTimeFields } from './components/shared/RoundDateTimeFields';
import { DemoScenarioProvider, DemoScenarioSelect, EquipmentTable, InsufficientNote, ReportTrackingLine, RoundPilotHeader, SegmentedControl, StartRoundPicker, useDemoScoreScenario } from './components/shared';
import { DEMO_THRESHOLD, demoHomeSnapshot, demoReportTracking, demoRoundsFor, sessionForAudience } from './lib/ui-contract/fixtures.ts';
import type { TodaysRound, UiSession } from './lib/ui-contract/building-health.ts';
import { asciiInitials, displayAssetCode, displayAssetText, formatCompactMoney, formatTime, formatWeekdayDate, palierFromScore, roundStateLabel, roundSubjectLabel, scoreFigure, statusBadgeTone, statusLabel, thresholdPosition } from './lib/ui-contract/display.ts';
import { EauRounds } from './components/EauRounds';
import { Ge01AgentForm, Ge01ReportInbox } from './components/Ge01Pilot';
import { RiaRoundNavigation, RiaRoundSpace } from './components/RiaRound';
import { CostsWorkspace, type CostReviewInput, type CostSubmissionInput } from './components/CostsWorkspace';
import { EquipmentWorkspace } from './components/EquipmentWorkspace';
import { NotificationBell } from './components/NotificationCenter';
import { ParametersWorkspace, type ParameterWorkspaceData } from './components/ParametersWorkspace';
import { SyncStatusNotice, type SyncStatusState } from './components/SyncStatusNotice';
import { Badge, BrandIcon, Button, Card, DateInput, Field, FieldError, Select, DateTimeInput } from './components/ui';
import { WorkflowAnalytics } from './components/WorkflowAnalytics';
import { hasFieldErrors, passwordRules as passwordStrength, validateEmailOnly, validateInvite, validateLogin, validatePasswordChange, validateVendorReportFields, validateZoneName, type FieldErrors, type VendorReportField } from './lib/client-validation';
import { getAuthenticatedProfileGate, resolveAuthenticatedPersona, AuthSessionChangedError, SESSION_CHANGED_MESSAGE, assertAuthenticatedUser, isAuthSessionChangedError } from './lib/supabase/auth';
import { getBrowserSupabaseClient, setSupabaseRememberPreference } from './lib/supabase/client';
import { getSupabaseIntegrationState, isSupabaseIntegrationEnabled } from './lib/supabase/config';
import { loadOperationalSnapshot, type OperationalVendor, type OperationalAnomaly, type OperationalCostDecision, type OperationalHistoryEvent, type OperationalProof, type OperationalReport, type OperationalWorkOrder } from './lib/supabase/data';
import { advanceAnomalyWorkflow, uploadAnomalyProof, uploadVendorInterventionReport, verifyLatestAnomalyProof, createAnomalyProofConsultationUrl, reviewAnomalyCostDecision, reviewGe01Report, submitAnomalyCostDecision } from './lib/supabase/mutations';
import Image from 'next/image';
import { type Ge01ReviewHandler } from './components/Ge01ReviewPanel';
import { Ge01WorkflowPanel, type Ge01WorkflowHandler } from './components/Ge01WorkflowPanel';
import { InterventionReceptionPanel, type ReceptionHandler } from './components/InterventionReceptionPanel';
import { ReopenDossierPanel } from './components/ReopenDossierPanel';
import { OfflineSyncStatus } from './components/OfflineSyncStatus';
import { acceptConnectedSnapshot, rejectConnectedSnapshot, type OperationalDataState } from './lib/connected-data-policy';
import { useOfflineSync } from './lib/offline/useOfflineSync';


























type View = 'workspace' | 'dashboard' | 'registry' | 'equipment' | 'costs' | 'access' | 'settings' | 'manager' | 'report' | 'detail';
type Priority = OperationalAnomaly['priority'];
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
  displayName?: string;
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
  costReference?:string;
  replacesCostReference?:string|null;
  replacedByCostReference?:string|null;
  decisionScope?:'facility_manager'|'administration';
  thresholdAmount?:number;
  budgetType?:'opex'|'capex';
  submittedBy?:string|null;
  reviewedBy?:string|null;
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
  eligibleDiagnosisAssignees?: OperationalAnomaly['eligibleDiagnosisAssignees'];
  origin?: string;
  horsScore?: boolean;
  isTest?: boolean;
  financialOptions?: OperationalAnomaly['financialOptions'];
  eligibleVendors?: OperationalAnomaly['eligibleVendors'];
  treatment?: OperationalAnomaly['treatment'];
  diagnosis?: string | null;
  interventionResult?: OperationalAnomaly['interventionResult'];
  workflow?: OperationalAnomaly['workflow'];
  id: string;
  databaseId?: string;
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
  proofQueued?: boolean;
  proofs?: OperationalProof[];
  history?: OperationalHistoryEvent[];
  description: string;
  antiZombieSummary?: AntiZombieSummaryData;
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
  health:number|null;
  state:string;
};

const seedAnomalies: Anomaly[] = [
  { id:'ANO-0241', asset:'DEMO-SSI', title:'Pression réseau incendie instable', location:'Sous-sol · Local incendie', priority:'Critique', status:'À qualifier', reported:'24 août · 07:36', due:'Aujourd’hui · 12:00', owner:'Non affectée', delayed:false, proof:false, description:'Variations de pression constatées pendant le test matinal. Le manomètre oscille entre 5,8 et 7,2 bars sans sollicitation du réseau.' },
  { id:'ANO-0238', asset:'DEMO-ASC-2', title:'Arrêts intermittents au niveau R+7', location:'Tour A · Ascenseur 2', priority:'Haute', status:'Affectée', reported:'23 août · 08:15', due:'23 août · 18:00', owner:'PREST-ASC', delayed:true, proof:false, description:'Deux arrêts non programmés signalés au niveau R+7. Redémarrage automatique après environ trente secondes.' },
  { id:'ANO-0234', asset:'DEMO-EAU', title:'Fuite légère au collecteur', location:'Sous-sol · Local surpresseur', priority:'Moyenne', status:'En intervention', reported:'21 août · 16:42', due:'22 août · 15:00', owner:'PREST-EAU', delayed:true, proof:false, description:'Suintement visible au raccord du collecteur principal. Bac de rétention en place, sans impact sur la distribution.' },
  { id:'ANO-0231', asset:'DEMO-GE', title:'Batterie de démarrage sous tension nominale', location:'RDC · Local groupe', priority:'Critique', status:'En validation', reported:'20 août · 11:20', due:'21 août · 10:00', owner:'PREST-GE', delayed:true, proof:true, description:'La batterie mesurée à 11,6 V a été remplacée. Le test de démarrage est concluant, preuve en attente de validation FM.', treatment:{ workOrderReference:'OT-DEMO-0231', branch:'vendor', costReference:'CST-DEMO-0231', amount:400000, vendorLabel:'Prestataire Démo', comment:'' }, proofs:[
    { id:'prv-0231-a', reference:'PRV-DEMO-0231-A', capturedAt:'20 août · 18:10', verificationStatus:'rejected', rejectionReason:'Photo illisible — reprise demandée', mimeType:'image/jpeg', proofType:'photo', storagePath:null, reviewComment:null },
    { id:'prv-0231-b', reference:'PRV-DEMO-0231-B', capturedAt:'21 août · 09:02', verificationStatus:'accepted', rejectionReason:null, mimeType:'application/pdf', proofType:'report', storagePath:null, reviewComment:null },
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
// When enabled, the authenticated session resolves the persona from the protected business profile.
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
  const owner = anomaly.owner?.trim();
  return !owner || ['Non affectée', 'Non attribué', 'À définir'].includes(owner) ? null : owner;
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
  if (anomaly.workflow?.actionCode === 'RECEIVE_INTERVENTION') return 'Réceptionner l’intervention';
  if (anomaly.workflow?.actionCode === 'REVIEW_REOPENED_DOSSIER') return 'Réexaminer le dossier rouvert';
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

function AuthExperience({ onAuthenticate, onDemoAuthenticate, onForgot, onReset, supabaseMode, allowDemoFallback, environmentLabel, sessionNotice }: {
  onAuthenticate:(personaId:PersonaId, remember:boolean, email:string, password:string)=>Promise<void>;
  onDemoAuthenticate:(personaId:PersonaId, remember:boolean)=>Promise<void>;
  onForgot:(email:string)=>Promise<void>;
  onReset:()=>void;
  supabaseMode:boolean;
  allowDemoFallback:boolean;
  environmentLabel:string;
  sessionNotice:string;
}) {
  const [screen, setScreen] = useState<AuthScreen>('login');
  const demoFallbackVisible = !supabaseMode || allowDemoFallback;
  const [email, setEmail] = useState(demoFallbackVisible ? demoAccounts[1].email : '');
  const [password, setPassword] = useState(demoFallbackVisible ? DEMO_PASSWORD : '');
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
      window.setTimeout(() => onDemoAuthenticate('rondes_assistance', true), 550);
    }, 550);
  };

  return (
    <AuthFrame
      kicker="PILOTAGE TECHNIQUE & MAINTENANCE"
      title="Une vision claire du bâtiment, jusqu’à la preuve."
      lede="Centralisez les constats, priorisez les risques et suivez chaque intervention jusqu’à sa clôture."
      note={<>{supabaseMode ? `${environmentLabel} · ${allowDemoFallback ? 'mode démonstration conservé' : 'authentification réelle uniquement'}` : 'Prototype local · authentification et données simulées'} · <a href="/design-system">Système de design</a></>}
    >
      <div className="auth-card">
        {screen === 'login' && <>
          <div className="auth-heading"><span className="auth-mode-chip">{supabaseMode ? environmentLabel.toUpperCase() : 'DÉMONSTRATION LOCALE'}</span><h2>Bienvenue</h2><p>Entrez dans l’espace opérationnel BEHIRA.</p></div>
          <form className="auth-form" onSubmit={submitLogin} noValidate>
            {sessionNotice && <div id="auth-session-notice" className="auth-message error" role="alert"><span><BrandIcon name="circleAlert" /></span>{sessionNotice}</div>}
            <label className="auth-field">Email professionnel<input type="email" autoComplete="username" value={email} onChange={(event) => {setEmail(event.target.value);setStatus('idle')}} aria-invalid={status === 'error'} aria-describedby="auth-message" placeholder="nom@organisation.com" /></label>
            <label className="auth-field">Mot de passe<span className="password-control"><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(event) => {setPassword(event.target.value);setStatus('idle')}} aria-invalid={status === 'error'} aria-describedby="auth-message" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? 'Masquer' : 'Afficher'}</button></span></label>
            <div className="auth-form-options"><label className="check-control"><input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} /><span>Se souvenir de moi</span></label><button type="button" className="auth-link" onClick={() => switchScreen('forgot')}>Mot de passe oublié ?</button></div>
            {message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? <BrandIcon name="circleAlert" /> : status === 'success' ? <BrandIcon name="check" /> : '•'}</span>{message}</div>}
            <Button className="auth-submit" type="submit" disabled={status === 'loading' || status === 'success'}>{status === 'loading' ? 'Connexion…' : status === 'success' ? 'Connecté ✓' : 'Se connecter'}</Button>
          </form>
          {!supabaseMode && <button type="button" className="invite-link" onClick={() => switchScreen('invite')}>Première connexion ? Activer une invitation</button>}
        </>}

        {screen === 'forgot' && <>
          <button type="button" className="auth-back" onClick={() => switchScreen('login')}>← Retour à la connexion</button>
          <div className="auth-heading"><span className="auth-mode-chip">ASSISTANCE</span><h2>Mot de passe oublié</h2><p>{supabaseMode ? 'Recevez un lien sécurisé de réinitialisation si votre compte est actif.' : 'Recevez les instructions de réinitialisation — envoi simulé uniquement.'}</p></div>
          {!forgotSent ? <form className="auth-form" onSubmit={submitForgot} noValidate><label className="auth-field">Email professionnel<input type="email" value={email} onChange={(event) => {setEmail(event.target.value);setStatus('idle')}} aria-invalid={status === 'error'} aria-describedby="auth-message" /></label>{message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? <BrandIcon name="circleAlert" /> : '•'}</span>{message}</div>}<Button className="auth-submit" type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Envoi…' : 'Envoyer les instructions'}</Button></form> : <div className="auth-confirmation" role="status"><span><BrandIcon name="check" /></span><h3>Demande prise en compte</h3><p>{message}</p><small>Adresse indiquée : {email}</small><Button className="auth-submit" onClick={() => switchScreen('login')}>Retour à la connexion</Button></div>}
        </>}

        {screen === 'invite' && <>
          <button type="button" className="auth-back" onClick={() => switchScreen('login')}>← Retour à la connexion</button>
          <div className="auth-heading"><span className="auth-mode-chip">INVITATION DE DÉMONSTRATION</span><h2>Activez votre compte</h2><p>Compte invité : <b>Agente Rondes & Assistance Démo</b><br />Rôle : Rondes & constats · périmètre DEMO-RND</p></div>
          <form className="auth-form" onSubmit={submitInvite} noValidate>
            <label className="auth-field">Créer un mot de passe<input type="password" autoComplete="new-password" placeholder="12 caractères minimum" value={invitePassword} onChange={(event) => {setInvitePassword(event.target.value);setStatus('idle')}} aria-describedby="password-rules auth-message" /></label>
            <label className="auth-field">Confirmer le mot de passe<input type="password" autoComplete="new-password" placeholder="12 caractères minimum" value={inviteConfirm} onChange={(event) => {setInviteConfirm(event.target.value);setStatus('idle')}} aria-invalid={Boolean(inviteConfirm && inviteConfirm !== invitePassword)} /></label>
            <ul className="password-rules" id="password-rules" aria-label="Règles de robustesse"><li className={passwordRules.length ? 'valid' : ''}>12 caractères minimum</li><li className={passwordRules.upper && passwordRules.lower ? 'valid' : ''}>Majuscule et minuscule</li><li className={passwordRules.number ? 'valid' : ''}>Au moins un chiffre</li><li className={passwordRules.symbol ? 'valid' : ''}>Au moins un symbole</li><li className={invitePassword && invitePassword === inviteConfirm ? 'valid' : ''}>Confirmation identique</li></ul>
            <label className="check-control invite-accept"><input type="checkbox" checked={inviteAccepted} onChange={(event) => setInviteAccepted(event.target.checked)} /><span>J’accepte l’activation simulée de ce compte fictif.</span></label>
            {message && <div id="auth-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? <BrandIcon name="circleAlert" /> : status === 'success' ? <BrandIcon name="check" /> : '•'}</span>{message}</div>}
            <Button className="auth-submit" type="submit" disabled={status === 'loading' || status === 'success'}>{status === 'loading' ? 'Activation…' : status === 'success' ? 'Compte activé ✓' : 'Activer et accéder à mon espace'}</Button>
          </form>
        </>}
      </div>

      {screen === 'login' && demoFallbackVisible && <aside className="demo-accounts" aria-label="Comptes de démonstration">
        <div><span>{supabaseMode ? 'MODE DÉMONSTRATION DE SECOURS' : 'COMPTES DE DÉMONSTRATION'}</span><p>Profils fictifs en <code>.invalid</code> · {supabaseMode ? 'séparés de l’authentification réelle et sans écriture distante' : 'session simulée'}.</p></div>
        {!supabaseMode && <p className="demo-password"><span>Mot de passe commun</span><b>{DEMO_PASSWORD}</b></p>}
        {(!supabaseMode || allowDemoFallback) && <div className="demo-account-grid">{demoAccounts.map((account) => {const person = personas.find((item) => item.id === account.personaId)!; const selected = email.trim().toLowerCase() === account.email.toLowerCase(); return <button type="button" key={account.email} className={selected ? 'is-selected' : ''} aria-pressed={selected} aria-label={`${person.shortName} · ${account.destination}`} onClick={() => {if (supabaseMode) void openDemoAccount(account); else {chooseAccount(account);switchScreen('login')}}}><span>{person.initials}</span><div><b>{person.shortName}</b><small>{account.email}</small><em>{account.destination}</em></div><i>{selected ? 'Sélectionné' : supabaseMode ? 'Ouvrir la démo' : 'Utiliser'}</i></button>})}</div>}
        <div className="demo-reset"><p><b>{supabaseMode ? environmentLabel : 'Session locale uniquement'}</b><br />{supabaseMode ? 'Une connexion réelle impose le rôle du profil métier protégé par les règles d’accès. Le mode démo reste local.' : 'La sécurité réelle sera assurée par l’authentification et les règles d’accès.'}</p><button type="button" onClick={resetInterface}>Réinitialiser la démonstration</button></div>
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

  return (
    <AuthFrame
      kicker="PREMIÈRE CONNEXION"
      title="Protégez votre accès avant de continuer."
      lede="Votre espace métier restera verrouillé jusqu’au remplacement du mot de passe temporaire."
      note="Contrôle assuré par l’authentification et les règles d’accès"
      single
    >
      <div className="auth-card">
        <div className="auth-heading"><span className="auth-mode-chip">CHANGEMENT OBLIGATOIRE</span><h2>Créez votre mot de passe</h2><p>Compte : <b>{requirement.displayName}</b><br />{requirement.email}</p></div>
        <form className="auth-form" onSubmit={submit} noValidate>
          <label className="auth-field">Mot de passe temporaire<input type={showPasswords ? 'text' : 'password'} autoComplete="current-password" value={currentPassword} onChange={(event) => {setCurrentPassword(event.target.value);setStatus('idle')}} aria-describedby="required-password-message" /></label>
          <label className="auth-field">Nouveau mot de passe<input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" placeholder="16 caractères minimum" value={newPassword} onChange={(event) => {setNewPassword(event.target.value);setStatus('idle')}} aria-describedby="required-password-rules required-password-message" /></label>
          <label className="auth-field">Confirmer le nouveau mot de passe<input type={showPasswords ? 'text' : 'password'} autoComplete="new-password" placeholder="16 caractères minimum" value={confirmation} onChange={(event) => {setConfirmation(event.target.value);setStatus('idle')}} aria-invalid={Boolean(confirmation && confirmation !== newPassword)} /></label>
          <label className="check-control"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} /><span>Afficher les mots de passe pendant la saisie</span></label>
          <ul className="password-rules" id="required-password-rules" aria-label="Règles de robustesse">
            <li className={rules.length ? 'valid' : ''}>16 caractères minimum</li><li className={rules.upper && rules.lower ? 'valid' : ''}>Majuscule et minuscule</li><li className={rules.number ? 'valid' : ''}>Au moins un chiffre</li><li className={rules.symbol ? 'valid' : ''}>Au moins un symbole</li><li className={rules.different ? 'valid' : ''}>Différent du temporaire</li><li className={rules.match ? 'valid' : ''}>Confirmation identique</li>
          </ul>
          {message && <div id="required-password-message" className={`auth-message ${status}`} role={status === 'error' ? 'alert' : 'status'}><span>{status === 'error' ? <BrandIcon name="circleAlert" /> : '•'}</span>{message}</div>}
          <Button className="auth-submit" type="submit" disabled={status === 'loading'}>{status === 'loading' ? 'Sécurisation…' : 'Changer le mot de passe et continuer'}</Button>
          <button className="auth-back required-password-signout" type="button" onClick={() => void onSignOut()}>Se déconnecter et revenir à l’accueil</button>
        </form>
      </div>
    </AuthFrame>
  );
}

function LiveHealthCockpit({ session, onNavigate, actionCount, causeActions, bannerExtras, children }: { session: UiSession; onNavigate: (view: View) => void; actionCount?: number; causeActions?: ReactNode; bannerExtras?: ReactNode; children?: ReactNode }) {
  const { scenario } = useDemoScoreScenario();
  const current = useContext(ConnectedPresentation);
  const snapshot = current.live ? current.health : demoHomeSnapshot(session, scenario);
  if (!snapshot) return <InsufficientNote title="Santé non calculable" detail="Le paramètre financier ou le périmètre serveur n’est pas encore disponible." />;
  return <BuildingHealthCockpit snapshot={snapshot} session={session} onNavigate={onNavigate} rounds={current.live ? current.source?.ge01Operations.rounds ?? [] : demoRoundsFor(session)} roundsConfigured={!current.live || Boolean(current.source?.ge01Operations.policyVersion)} syncContent={current.sync} actionCount={current.live ? snapshot.pendingDecisions ?? current.source?.workOrders.filter(w=>w.status!=='Terminé').length ?? 0 : actionCount} causeActions={causeActions} bannerExtras={bannerExtras}>{children}{current.live && <InsufficientNote title="Planning GE-01" detail="Du lundi au samedi, avant 23:59 (heure d’Abidjan). Seule la ronde quotidienne GE-01 est planifiée ici." />}</BuildingHealthCockpit>;
}

function LiveEquipmentWorkspace({ session }: { session: UiSession }) {
  const { scenario } = useDemoScoreScenario();
  const current = useContext(ConnectedPresentation);
  return <EquipmentWorkspace demo={!current.live} equipment={current.live ? current.health?.equipment ?? [] : demoHomeSnapshot(session, scenario).equipment} />;
}

export default function Home() {
  const supabaseIntegration = getSupabaseIntegrationState();
  const [session, setSession] = useState<DemoSession|null>(null);
  const [sessionNotice, setSessionNotice] = useState('');
  const [presentationSource, setPresentationSource] = useState<OperationalSnapshot|null>(null);
  const [recipeMode, setRecipeMode] = useState(false);
  const [recipeAvailable, setRecipeAvailable] = useState(false);
  const spaceGeneration = useRef(0);
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
  const [workOrders, setWorkOrders] = useState<OperationalWorkOrder[]>([]);
  const [reports, setReports] = useState<OperationalReport[]>([]);
  const [canUploadVendorReport, setCanUploadVendorReport] = useState(false);
  const [dataState, setDataState] = useState<OperationalDataState>('demo');
  const [referenceCounts, setReferenceCounts] = useState({ anomalies:seedAnomalies.length, equipment:fallbackEquipment.length, zones:0, profiles:0 });
  const [escalations, setEscalations] = useState(seedEscalations);
  const [decisionThreshold, setDecisionThreshold] = useState(DECISION_THRESHOLD_FCFA);
  const [financialDecisionParameter, setFinancialDecisionParameter] = useState<ParameterWorkspaceData>(FINANCIAL_DECISION_PARAMETER);
  const [fieldRequests, setFieldRequests] = useState<FieldRequest[]>([
    { id:'REQ-031', from:'Agente Rondes & Assistance Démo', subject:'Infiltration légère · Atrium restaurant', note:'Photo ajoutée, origine à qualifier après la pluie.', status:'À traiter par Facility Manager' },
    { id:'REQ-030', from:'Agent Eau & Incendie Démo', subject:'DEMO-EAU · deuxième réarmement en 7 jours', note:'Service rétabli provisoirement, diagnostic demandé.', status:'À traiter par Facility Manager' },
  ]);
  const [selectedId, setSelectedId] = useState('ANO-0241');
  const [query, setQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('Toutes');
  const [statusFilter, setStatusFilter] = useState('Tous');
  const [dossiersTab, setDossiersTab] = useState<DossiersTab>('atraiter');
  const [managerTab, setManagerTab] = useState<ManagerQueue>('all');
  const [toast, setToast] = useState('');
  const [mutationBusy, setMutationBusy] = useState(false);
  const [moreNavOpen, setMoreNavOpen] = useState(false);
  const moreNavRef = useRef<HTMLDivElement>(null);
  const moreNavTriggerRef = useRef<HTMLButtonElement>(null);
  const moreNavItemRefs = useRef<Array<HTMLButtonElement|null>>([]);
  const sessionUserIdRef = useRef<string|null>(null);

  const resetSensitiveWorkspace = useCallback(() => {
    spaceGeneration.current++;
    setPresentationSource(null);
    setRecipeMode(false);
    setRecipeAvailable(false);
    setAnomalies(seedAnomalies);
    setEquipmentItems(fallbackEquipment);
    setVendorReferences(fallbackVendors);
    setWorkOrders([]);
    setReports([]);
    setCanUploadVendorReport(false);
    setReferenceCounts({ anomalies:seedAnomalies.length, equipment:fallbackEquipment.length, zones:0, profiles:0 });
    setEscalations(seedEscalations);
    setDecisionThreshold(DECISION_THRESHOLD_FCFA);
    setFinancialDecisionParameter(FINANCIAL_DECISION_PARAMETER);
  }, []);

  const invalidateChangedSession = useCallback(() => {
    sessionUserIdRef.current = null;
    setSession(null);
    setPasswordChangeRequirement(null);
    setMutationBusy(false);
    setSignOutConfirm(false);
    setMoreNavOpen(false);
    setDataState('loading');
    setToast('');
    setSessionNotice(SESSION_CHANGED_MESSAGE);
    resetSensitiveWorkspace();
  }, [resetSensitiveWorkspace]);

  useEffect(() => {
    sessionUserIdRef.current = session?.mode === 'supabase' ? session.userId ?? null : null;
  }, [session?.mode, session?.userId]);

  useEffect(() => {
    if (!isSupabaseIntegrationEnabled) return;

    const client = getBrowserSupabaseClient();
    const { data: { subscription } } = client.auth.onAuthStateChange((event, nextSession) => {
      const expectedUserId = sessionUserIdRef.current;
      const nextUserId = nextSession?.user.id ?? null;

      if (event === 'SIGNED_OUT') {
        if (expectedUserId) invalidateChangedSession();
        return;
      }
      if (!expectedUserId || !nextUserId || expectedUserId === nextUserId) return;

      invalidateChangedSession();
    });

    return () => subscription.unsubscribe();
  }, [invalidateChangedSession]);

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
    getBrowserSupabaseClient(recipeMode).rpc('is_recette_enabled').then(({ data, error }) => {
      if (!cancelled) setRecipeAvailable(!error && data === true);
    });
    loadOperationalSnapshot(getBrowserSupabaseClient(recipeMode), recipeMode)
      .then((snapshot) => {
        if (cancelled) return;
        const connected = acceptConnectedSnapshot(snapshot);
        setPresentationSource(snapshot);
        setFieldRequests([]);
        setAnomalies(connected.anomalies as Anomaly[]);
        setEquipmentItems(connected.equipment);
        setVendorReferences(connected.vendors);
        setWorkOrders(connected.workOrders);
        setReports(connected.reports as OperationalReport[]);
        setEscalations(connected.costs.map(mapOperationalCostDecision));
        if (snapshot.financialDecisionParameter) {
          setDecisionThreshold(snapshot.financialDecisionParameter.value);
          setFinancialDecisionParameter({
            code:'financial_decision_threshold',
            label:snapshot.financialDecisionParameter.label,
            value:snapshot.financialDecisionParameter.value,
            unit:snapshot.financialDecisionParameter.unit,
            scope:'Décisions avec montant documenté',
            effectiveDate:snapshot.financialDecisionParameter.effectiveDate?.split('-').reverse().join('/') ?? 'Date métier non confirmée',
            authority:'Administration de SCI Groupe Behira',
          });
        }
        setCanUploadVendorReport(snapshot.canUploadVendorReport);
        setReferenceCounts(snapshot.counts);
        setDataState(connected.dataState);
      })
      .catch(() => {
        if (cancelled) return;
        const failed = rejectConnectedSnapshot();
        setPresentationSource(null);
        setAnomalies(failed.anomalies);
        setEquipmentItems(failed.equipment);
        setVendorReferences(failed.vendors);
        setWorkOrders(failed.workOrders);
        setReports(failed.reports);
        setEscalations(failed.costs);
        setReferenceCounts({ anomalies:0, equipment:0, zones:0, profiles:0 });
        setDataState(failed.dataState);
        setCanUploadVendorReport(false);
      });

    return () => { cancelled = true; };
  }, [session?.mode, session?.userId, recipeMode]);

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
                sessionUserIdRef.current = data.session.user.id;
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
              sessionUserIdRef.current = data.session.user.id;
              setDataState('loading');
              setSession({
                personaId: resolvedPersona,
                remember: true,
                issuedAt: data.session.user.last_sign_in_at ?? new Date().toISOString(),
                mode: 'supabase',
                userId: data.session.user.id,
                email: data.session.user.email,
                displayName: gate.displayName,
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

  const demoPersona = personas.find((item) => item.id === personaId) ?? personas[0];
  const persona = session?.mode === 'supabase' ? { ...demoPersona, name: session.displayName ?? session.email ?? 'Compte connecté' } : demoPersona;
  const effectiveCanUploadVendorReport = session?.mode === 'demo'
    ? personaId === 'electricite' || personaId === 'eau_incendie'
    : canUploadVendorReport;
  const selected = anomalies.find((a) => a.id === selectedId) ?? anomalies[0];
  const filtered = useMemo(() => anomalies.filter((a) => {
    const haystack = `${a.id} ${a.asset} ${a.title} ${a.location}`.toLowerCase();
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
  const syncOperationalData = useCallback(async () => {
    const requestingUserId = sessionUserIdRef.current;
    const generation = spaceGeneration.current;
    const snapshot = await loadOperationalSnapshot(getBrowserSupabaseClient(recipeMode), recipeMode);
    if (spaceGeneration.current !== generation) return;
    if (!requestingUserId || sessionUserIdRef.current !== requestingUserId) throw new Error(SESSION_CHANGED_MESSAGE);
    const connected = acceptConnectedSnapshot(snapshot);
        setPresentationSource(snapshot);
        setFieldRequests([]);
    setAnomalies(connected.anomalies as Anomaly[]);
    setEquipmentItems(connected.equipment);
    setVendorReferences(connected.vendors);
    setWorkOrders(connected.workOrders);
    setReports(connected.reports as OperationalReport[]);
    setEscalations(connected.costs.map(mapOperationalCostDecision));
    if (snapshot.financialDecisionParameter) {
      setDecisionThreshold(snapshot.financialDecisionParameter.value);
      setFinancialDecisionParameter({
        code:'financial_decision_threshold',
        label:snapshot.financialDecisionParameter.label,
        value:snapshot.financialDecisionParameter.value,
        unit:snapshot.financialDecisionParameter.unit,
        scope:'Décisions avec montant documenté',
        effectiveDate:snapshot.financialDecisionParameter.effectiveDate?.split('-').reverse().join('/') ?? 'Date métier non confirmée',
        authority:'Administration de SCI Groupe Behira',
      });
    }
    setCanUploadVendorReport(snapshot.canUploadVendorReport);
    setReferenceCounts(snapshot.counts);
    setDataState(connected.dataState);
  }, [recipeMode]);
  const retryOperationalData = () => {
    const generation = spaceGeneration.current;
    setDataState('loading');
    void syncOperationalData().catch(() => {
      if (generation !== spaceGeneration.current) return;
      const failed = rejectConnectedSnapshot();
        setPresentationSource(null);
      setAnomalies(failed.anomalies);
      setEquipmentItems(failed.equipment);
      setVendorReferences(failed.vendors);
      setWorkOrders(failed.workOrders);
      setReports(failed.reports);
      setEscalations(failed.costs);
      setReferenceCounts({ anomalies:0, equipment:0, zones:0, profiles:0 });
      setCanUploadVendorReport(false);
      setDataState(failed.dataState);
    });
  };
  const handleGe01Assignment: Ge01AssignmentHandler = async input => {
    const ownerId = sessionUserIdRef.current;
    const generation = spaceGeneration.current;
    if (session?.mode !== 'supabase' || !ownerId || personaId !== 'facility' || dataState !== 'live') throw new Error('Session FM connectée requise.');
    const client = getBrowserSupabaseClient(recipeMode);
    await assertAuthenticatedUser(client, ownerId);
    const { error } = await client.rpc('assign_ge01_round', {p_id:input.id,p_date:input.date,p_agent_id:input.agentId,p_reason:input.reason.trim()});
    if (error) throw error;
    if (sessionUserIdRef.current !== ownerId || generation !== spaceGeneration.current) throw new Error(SESSION_CHANGED_MESSAGE);
    await syncOperationalData();
  };
  const handleGe01Read = async (report: OperationalReport) => {
    const ownerId = sessionUserIdRef.current;
    const generation = spaceGeneration.current;
    if (session?.mode !== 'supabase' || !ownerId || personaId !== 'facility' || dataState !== 'live') throw new Error('Session FM connectée requise.');
    const client = getBrowserSupabaseClient(recipeMode);
    await assertAuthenticatedUser(client, ownerId);
    const { error } = await client.rpc('mark_ge01_report_read', { p_report_id: report.id });
    if (error) throw error;
    if (sessionUserIdRef.current !== ownerId || generation !== spaceGeneration.current) throw new Error(SESSION_CHANGED_MESSAGE);
    await syncOperationalData();
  };
  const handleGe01Proof = async (path: string) => {
    const ownerId = sessionUserIdRef.current;
    const generation = spaceGeneration.current;
    if (session?.mode !== 'supabase' || !ownerId || personaId !== 'facility') throw new Error('Session FM connectée requise.');
    const client = getBrowserSupabaseClient(recipeMode);
    await assertAuthenticatedUser(client, ownerId);
    const { data, error } = await client.storage.from('round-proofs').download(path);
    if (error) throw error;
    if (sessionUserIdRef.current !== ownerId || generation !== spaceGeneration.current) throw new Error(SESSION_CHANGED_MESSAGE);
    return data;
  };
  const handleGe01Review: Ge01ReviewHandler = async (report, input) => {
    const ownerId = sessionUserIdRef.current;
    const generation = spaceGeneration.current;
    if (session?.mode !== 'supabase' || !ownerId || personaId !== 'facility' || dataState !== 'live') {
      throw new Error('Une session Facility Manager connectée est nécessaire.');
    }
    const client = getBrowserSupabaseClient(recipeMode);
    await assertAuthenticatedUser(client, ownerId);
    const result = await reviewGe01Report(client, report, input);
    if (sessionUserIdRef.current !== ownerId || generation !== spaceGeneration.current) throw new Error(SESSION_CHANGED_MESSAGE);
    const receipt = { ...result, reviewedBy:session.displayName ?? 'Facility Manager' };
    setReports((current) => current.map((item) => item.id === report.id ? { ...item, review:receipt } : item));
    // Keep the confirmed decision even if the subsequent global refresh fails.
    try { await syncOperationalData(); }
    catch { flash('Décision enregistrée. Actualisez la file pour recharger les dossiers.'); }
    if (sessionUserIdRef.current !== ownerId || generation !== spaceGeneration.current) throw new Error(SESSION_CHANGED_MESSAGE);
    return receipt;
  };
  const offlineSync = useOfflineSync({
    enabled:session?.mode === 'supabase' && Boolean(session.userId),
    userId:session?.mode === 'supabase' ? session.userId : undefined,
  });
  const handledSyncRun = useRef<typeof offlineSync.lastRun>(null);
  useEffect(() => {
    if (!offlineSync.lastRun?.synced || handledSyncRun.current === offlineSync.lastRun) return;
    handledSyncRun.current = offlineSync.lastRun;
    const roundReceipt = offlineSync.lastRun.syncedItems
      .filter((entry) => entry.kind === 'field-round')
      .map((entry) => readRoundReferences(entry.serverResult))
      .find((receipt) => Boolean(receipt));
    const confirmation = roundReceipt
      ? `${roundReceipt.isTest ? 'RECETTE — DONNÉES FICTIVES · ' : ''}Ronde ${roundReceipt.reportReference} synchronisée${roundReceipt.anomalyReference ? ` · constat ${roundReceipt.anomalyReference} créé` : ''}.`
      : `${offlineSync.lastRun.synced} saisie${offlineSync.lastRun.synced === 1 ? '' : 's'} terrain synchronisée${offlineSync.lastRun.synced === 1 ? '' : 's'}.`;
    const generation = spaceGeneration.current;
    const timer = window.setTimeout(() => {
      if (generation !== spaceGeneration.current) return;
      void syncOperationalData()
        .then(() => { if (generation === spaceGeneration.current) flash(confirmation); })
        .catch(() => { if (generation === spaceGeneration.current) flash('Synchronisation terminée ; actualisation du registre à reprendre.'); });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [offlineSync.lastRun, syncOperationalData]);
  const mutationError = (error:unknown) => error instanceof Error ? error.message : 'Une erreur locale est survenue.';
  const requireCurrentSupabaseUser = async (options: { allowOffline?: boolean } = {}) => {
    const expectedUserId = session?.mode === 'supabase' ? session.userId : undefined;
    if (!expectedUserId) {
      invalidateChangedSession();
      throw new AuthSessionChangedError();
    }

    try {
      return await assertAuthenticatedUser(getBrowserSupabaseClient(recipeMode), expectedUserId, options);
    } catch (error) {
      if (isAuthSessionChangedError(error)) invalidateChangedSession();
      throw error;
    }
  };
  const persistGe01Workflow:Ge01WorkflowHandler = async (command, comment, requestId, treatment, employeeCode) => {
    if (session?.mode !== 'supabase' || dataState !== 'live' || !selected.workflow || mutationBusy) return false;
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      const client = getBrowserSupabaseClient(recipeMode);
      if (command === 'assign') {
        if (!employeeCode) throw new Error('Sélectionnez un agent habilité pour le diagnostic.');
        const { error } = await client.rpc('assign_ge01_diagnosis', { p_reference:selected.id, p_employee_code:employeeCode, p_comment:comment, p_base_version_no:selected.workflow.version, p_idempotency_key:requestId });
        if (error) throw error;
      } else if (command === 'diagnose') {
        if (!selected.workflow.actionId) throw new Error('Actualisez le dossier avant de confirmer le diagnostic.');
        const { error } = await client.rpc('complete_qualification_action', { p_reference:selected.id, p_action_id:selected.workflow.actionId, p_comment:comment, p_base_version_no:selected.workflow.version, p_idempotency_key:requestId });
        if (error) throw error;
      } else if (command === 'branch' && treatment && treatment.branch !== 'internal_without_cost') {
        const { error } = await client.rpc('authorize_ge01_cost_intervention', { p_reference:selected.id, p_branch:treatment.branch, p_cost_reference:treatment.costReference, p_vendor_code:treatment.branch === 'vendor' ? treatment.vendorCode : null, p_comment:comment, p_base_version_no:selected.workflow.version, p_idempotency_key:requestId });
        if (error) throw error;
      } else {
        const targets = { branch:'Affectée', start:'En intervention', finish:'En validation', close:'Clôturée' };
        await advanceAnomalyWorkflow(client, selected.id, targets[command], command === 'branch' ? `Branche A — interne sans coût. ${comment}` : comment);
      }
      await syncOperationalData();
      flash('Étape GE-01 enregistrée dans le dossier.');
      return true;
    } catch (error) {
      flash(`Étape non confirmée : ${mutationError(error)}. Actualisez le dossier avant de réessayer.`);
      return false;
    } finally { setMutationBusy(false); }
  };
  const persistReception:ReceptionHandler = async (decision,comment,requestId) => {
    if (session?.mode !== 'supabase' || dataState !== 'live' || !selected.workflow || mutationBusy) return false;
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      const { error } = await getBrowserSupabaseClient(recipeMode).rpc('receive_intervention', {
        p_reference:selected.id,p_decision:decision,p_comment:comment,p_base_version_no:selected.workflow.version,p_idempotency_key:requestId,
      });
      if(error)throw error;
      await syncOperationalData();
      flash(decision==='accepted'?'Intervention réceptionnée et dossier clôturé.':'Intervention renvoyée à l’agent avec votre motif.');
      return true;
    } catch(error) { flash(`Réception non confirmée : ${mutationError(error)}`);return false; }
    finally {setMutationBusy(false);}
  };
  const persistReopenDossier = async (reason:string, requestId:string):Promise<boolean> => {
    if (session?.mode !== 'supabase' || dataState !== 'live' || !selected.workflow || mutationBusy) return false;
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      const { error } = await getBrowserSupabaseClient(recipeMode).rpc('reopen_closed_dossier', {
        p_reference:selected.id, p_reason:reason, p_base_version_no:selected.workflow.version, p_idempotency_key:requestId,
      });
      if (error) throw error;
      await syncOperationalData();
      flash('Dossier rouvert. Une nouvelle échéance et un réexamen FM ont été créés.');
      return true;
    } catch (error) {
      flash(`Réouverture non confirmée : ${mutationError(error)}`);
      return false;
    } finally { setMutationBusy(false); }
  };
  const persistReviewReopenedDossier = async (comment:string, requestId:string):Promise<boolean> => {
    if (session?.mode !== 'supabase' || dataState !== 'live' || !selected.workflow || mutationBusy) return false;
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      const { error } = await getBrowserSupabaseClient(recipeMode).rpc('review_reopened_dossier', {
        p_reference:selected.id, p_comment:comment, p_base_version_no:selected.workflow.version, p_idempotency_key:requestId,
      });
      if (error) throw error;
      await syncOperationalData();
      flash('Réexamen enregistré. Le dossier attend sa nouvelle qualification.');
      return true;
    } catch (error) {
      flash(`Réexamen non confirmé : ${mutationError(error)}`);
      return false;
    } finally { setMutationBusy(false); }
  };
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
      await requireCurrentSupabaseUser();
      await advanceAnomalyWorkflow(getBrowserSupabaseClient(recipeMode), selected.id, status);
      await syncOperationalData();
      flash(`Étape enregistrée sur le serveur métier : ${status}.`);
    } catch (error) {
      flash(`Action non enregistrée : ${mutationError(error)}`);
    } finally {
      setMutationBusy(false);
    }
  };
  const persistProof = async (file:File):Promise<SyncStatusState> => {
    if (session?.mode !== 'supabase') {
      setAnomalies((items) => items.map((a) => a.id === selected.id ? { ...a, proof:true } : a));
      flash('Preuve ajoutée — simulation de repli.');
      return 'demo-volatile';
    }
    if (dataState !== 'live' || !selected.databaseId) {
      flash('Preuve non enregistrée : ce dossier de repli n’a pas d’identifiant serveur canonique.');
      return 'error';
    }
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser({ allowOffline:true });
      await offlineSync.enqueueProof({
        isTest:recipeMode,
        anomalyReference:selected.id,
        anomalyId:selected.databaseId,
        file,
        capturedAt:new Date().toISOString(),
        proofType:file.type === 'application/pdf' ? 'pv' : 'photo',
      });
      setAnomalies((items) => items.map((a) => a.id === selected.id ? { ...a, proofQueued:true } : a));
      flash(offlineSync.online ? 'Preuve mise en file ; synchronisation lancée.' : 'Preuve protégée sur cet appareil ; envoi automatique au retour du réseau.');
      return 'queued-local';
    } catch (error) {
      flash(`Preuve non mise en file : ${mutationError(error)}`);
      return 'error';
    } finally {
      setMutationBusy(false);
    }
  };
  const persistAssignedIntervention = async (order:OperationalWorkOrder, target:'En intervention'|'En validation', comment:string) => {
    if (session?.mode !== 'supabase' || dataState !== 'live') {
      flash('Action réelle indisponible hors de la session métier connectée.');
      return false;
    }
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      await advanceAnomalyWorkflow(getBrowserSupabaseClient(recipeMode), order.anomalyReference, target, comment);
      await syncOperationalData();
      flash(target === 'En intervention'
        ? `${order.id} · intervention démarrée et historisée.`
        : `${order.id} · intervention terminée et transmise à Facility Manager.`);
      return true;
    } catch (error) {
      flash(`Intervention non enregistrée : ${mutationError(error)}`);
      return false;
    } finally {
      setMutationBusy(false);
    }
  };
  const persistAssignedProof = async (order:OperationalWorkOrder, file:File) => {
    if (session?.mode !== 'supabase' || dataState !== 'live') {
      flash('Dépôt réel indisponible hors de la session métier connectée.');
      return false;
    }
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser({ allowOffline:true });
      await offlineSync.enqueueProof({
        isTest:order.isTest,
        anomalyReference:order.anomalyReference,
        anomalyId:order.anomalyDatabaseId,
        file,
        capturedAt:new Date().toISOString(),
        proofType:file.type === 'application/pdf' ? 'pv' : 'photo',
      });
      flash(offlineSync.online
        ? `${order.id} · preuve mise en file sécurisée ; transmission lancée.`
        : `${order.id} · preuve protégée sur cet appareil jusqu’au retour du réseau.`);
      return true;
    } catch (error) {
      flash(`Preuve non mise en file : ${mutationError(error)}`);
      return false;
    } finally {
      setMutationBusy(false);
    }
  };
  const consultProof = async (proof:OperationalProof) => {
    if (session?.mode !== 'supabase' || dataState !== 'live') {
      throw new Error('Consultation réelle indisponible hors de la session métier connectée.');
    }
    if (!proof.storagePath) throw new Error('Le fichier de preuve n’est pas relié au dossier.');
    await requireCurrentSupabaseUser();
    return createAnomalyProofConsultationUrl(getBrowserSupabaseClient(recipeMode), proof.storagePath);
  };
  const verifyProof = async (decision:'accepted'|'rejected', comment:string) => {
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      await verifyLatestAnomalyProof(getBrowserSupabaseClient(recipeMode), selected.id, decision, comment);
      await syncOperationalData();
      flash(decision === 'accepted' ? 'Preuve acceptée par Facility Manager.' : 'Preuve refusée ; le motif est conservé dans le dossier.');
      return true;
    } catch (error) {
      flash(`Décision sur la preuve non enregistrée : ${mutationError(error)}`);
      return false;
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
      await requireCurrentSupabaseUser();
      const result = await uploadVendorInterventionReport(getBrowserSupabaseClient(recipeMode), input);
      flash(`${String(result.reference)} déposé au nom de ${input.vendorCode} ; validation de Facility Manager requise.`);
    } catch (error) {
      flash(`Rapport prestataire non enregistré : ${mutationError(error)}`);
      throw error;
    } finally {
      setMutationBusy(false);
    }
  };
  const persistCostDecision = async (input:CostSubmissionInput) => {
    if (session?.mode !== 'supabase') {
      const id = `DEC-${String(19 + escalations.length).padStart(3, '0')}`;
      setEscalations((items) => [{ id, anomaly:input.anomalyReference, asset:anomalies.find((item) => item.id === input.anomalyReference)?.asset ?? 'Équipement', title:input.description, kind:'Coût', amount:input.amount, due:'À l’instant · simulation', risk:`${input.budgetType.toUpperCase()} · simulation`, recommendation:input.description, state:input.amount >= decisionThreshold ? 'À décider' : 'Approuvée', decisionScope:input.amount >= decisionThreshold ? 'administration' : 'facility_manager', thresholdAmount:decisionThreshold }, ...items]);
      flash(input.amount >= decisionThreshold ? 'Décision simulée transmise à l’Administration.' : 'Décision simulée dans la délégation de Facility Manager.');
      return;
    }
    if (dataState !== 'live') throw new Error('Actualisez les données avant cette décision.');
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      const result = await submitAnomalyCostDecision(getBrowserSupabaseClient(recipeMode), input);
      await syncOperationalData();
      flash(String(result.decision_scope) === 'administration'
        ? `${String(result.cost_reference)} soumise à l’Administration.`
        : `${String(result.cost_reference)} décidée dans la délégation de Facility Manager.`);
    } catch (error) {
      flash(`Décision financière non enregistrée : ${mutationError(error)}`);
      throw error;
    } finally {
      setMutationBusy(false);
    }
  };
  const persistCostReview = async (input:CostReviewInput) => {
    if (session?.mode !== 'supabase') {
      setEscalations((items) => items.map((item) => item.id === input.costReference ? { ...item, state:input.decision === 'approved' ? 'Approuvée' : input.decision === 'returned' ? 'Renvoyée à Facility Manager' : 'Refusée', motive:input.comment, reviewedBy:'Administration Démo' } : item));
      flash(`Décision ${input.decision === 'approved' ? 'approuvée' : input.decision === 'returned' ? 'renvoyée au FM' : 'refusée'} — simulation locale.`);
      return;
    }
    if (dataState !== 'live') throw new Error('Actualisez les données avant cette décision.');
    setMutationBusy(true);
    try {
      await requireCurrentSupabaseUser();
      await reviewAnomalyCostDecision(getBrowserSupabaseClient(recipeMode), input);
      await syncOperationalData();
      flash(`${input.costReference} · décision ${input.decision === 'approved' ? 'approuvée' : input.decision === 'returned' ? 'renvoyée au FM' : 'refusée'} et historisée.`);
    } catch (error) {
      flash(`Arbitrage non enregistré : ${mutationError(error)}`);
      throw error;
    } finally {
      setMutationBusy(false);
    }
  };
  const changePersona = (next: PersonaId) => {
    if (session?.mode === 'supabase') {
      flash('Le rôle est imposé par l’authentification et les règles d’accès.');
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
      const client = getBrowserSupabaseClient(recipeMode);
      setDataState('loading');
      setSupabaseRememberPreference(remember);
      const { data, error } = await client.auth.signInWithPassword({ email, password });
      if (error || !data.user) throw new Error('Identifiants non reconnus.');

      try {
        sessionUserIdRef.current = data.user.id;
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
          displayName:gate.displayName,
        };
        setSessionNotice(''); setSession(nextSession); setPersonaId(resolvedPersona); setView(landingViewByPersona[resolvedPersona]); setPreviousView(landingViewByPersona[resolvedPersona]);
        return;
      } catch (profileError) {
        sessionUserIdRef.current = null;
        await client.auth.signOut();
        throw profileError;
      }
    }

    const nextSession:DemoSession = { personaId:next, remember, issuedAt:new Date().toISOString(), mode:'demo' };
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(nextSession));
    sessionUserIdRef.current = null; setSessionNotice(''); setSession(nextSession); setPersonaId(next); setView(landingViewByPersona[next]); setPreviousView(landingViewByPersona[next]);
  };
  const authenticateDemo = async (next:PersonaId, remember:boolean) => {
    const nextSession:DemoSession = { personaId:next, remember, issuedAt:new Date().toISOString(), mode:'demo' };
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    (remember ? window.localStorage : window.sessionStorage).setItem(SESSION_KEY, JSON.stringify(nextSession));
    sessionUserIdRef.current = null; setSessionNotice(''); setDataState('demo'); setCanUploadVendorReport(false); setSession(nextSession); setPersonaId(next); setView(landingViewByPersona[next]); setPreviousView(landingViewByPersona[next]);
  };
  const requestPasswordReset = async (email:string) => {
    if (!isSupabaseIntegrationEnabled) return;
    const client = getBrowserSupabaseClient(recipeMode);
    const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo:window.location.origin });
    if (error) throw new Error('Impossible de lancer la réinitialisation du mot de passe.');
  };
  const completeRequiredPasswordChange = async (currentPassword:string, newPassword:string) => {
    if (!passwordChangeRequirement) throw new Error('La session de première connexion a expiré.');
    const client = getBrowserSupabaseClient(recipeMode);
    await assertAuthenticatedUser(client, passwordChangeRequirement.userId);
    const { data, error } = await client.auth.updateUser({ password:newPassword, current_password:currentPassword });
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
      displayName:gate.displayName,
    };
    sessionUserIdRef.current = data.user.id;
    setPasswordChangeRequirement(null);
    setSessionNotice(''); setSession(nextSession); setPersonaId(resolvedPersona); setView(landingViewByPersona[resolvedPersona]); setPreviousView(landingViewByPersona[resolvedPersona]); setDataState('loading');
  };
  const signOutLockedSession = async () => {
    sessionUserIdRef.current = null;
    await getBrowserSupabaseClient(recipeMode).auth.signOut();
    setPasswordChangeRequirement(null);
    setSessionNotice('');
    setSession(null);
  };
  const signOut = async () => {
    if (session?.mode === 'supabase') {
      sessionUserIdRef.current = null;
      const { error } = await getBrowserSupabaseClient(recipeMode).auth.signOut();
      if (error) { sessionUserIdRef.current = session.userId ?? null; flash('Déconnexion impossible. Réessayez.'); return; }
    }
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    setSignOutConfirm(false); setSessionNotice(''); setSession(null); setPasswordChangeRequirement(null); setPersonaId('facility'); setView('workspace'); setToast(''); setDataState('demo'); setCanUploadVendorReport(false); setWorkOrders([]); setReports([]);
  };
  const resetDemo = () => {
    sessionUserIdRef.current = null;
    if (isSupabaseIntegrationEnabled) void getBrowserSupabaseClient(recipeMode).auth.signOut();
    window.localStorage.removeItem('behira_supabase_remember');
    window.localStorage.removeItem(SESSION_KEY); window.sessionStorage.removeItem(SESSION_KEY);
    setSessionNotice(''); setSession(null); setPasswordChangeRequirement(null); setPersonaId('facility'); setView('workspace'); setPreviousView('registry'); setAnomalies(seedAnomalies); setEquipmentItems(fallbackEquipment); setVendorReferences(fallbackVendors); setWorkOrders([]); setReports([]); setCanUploadVendorReport(false); setDataState('demo'); setReferenceCounts({ anomalies:seedAnomalies.length, equipment:fallbackEquipment.length, zones:0, profiles:0 }); setEscalations(seedEscalations); setDecisionThreshold(DECISION_THRESHOLD_FCFA); setFinancialDecisionParameter(FINANCIAL_DECISION_PARAMETER);
    setFieldRequests([
      { id:'REQ-031', from:'Agente Rondes & Assistance Démo', subject:'Infiltration légère · Atrium restaurant', note:'Photo ajoutée, origine à qualifier après la pluie.', status:'À traiter par Facility Manager' },
      { id:'REQ-030', from:'Agent Eau & Incendie Démo', subject:'DEMO-EAU · deuxième réarmement en 7 jours', note:'Service rétabli provisoirement, diagnostic demandé.', status:'À traiter par Facility Manager' },
    ]);
    setQuery(''); setPriorityFilter('Toutes'); setStatusFilter('Tous'); setToast('');
  };
  const submitFieldRequest = (request: Omit<FieldRequest, 'id' | 'status'>) => {
    if (session?.mode === 'supabase') { flash('Le signalement hors ronde sera raccordé dans la suite de la livraison 1.'); return; }
    const id = `REQ-${String(32 + fieldRequests.length).padStart(3, '0')}`;
    setFieldRequests((items) => [{ ...request, id, status:'À traiter par Facility Manager' }, ...items]);
    flash(`${id} transmise à Facility Manager — simulation locale.`);
  };
  const decideEscalation = async (id:string, state:DecisionState, motive:string, idempotencyKey:string) => {
    const item = escalations.find((candidate) => candidate.id === id);
    if (item?.costReference) {
      await persistCostReview({ costReference:item.costReference, decision:state === 'Approuvée' ? 'approved' : state === 'Renvoyée à Facility Manager' ? 'returned' : 'rejected', comment:motive, idempotencyKey });
      return;
    }
    if (session?.mode === 'supabase') throw new Error('Cette décision n’est pas reliée à un arbitrage financier. Aucun changement enregistré.');
    setEscalations((items) => items.map((item) => item.id === id ? { ...item, state, motive } : item));
    flash(`${id} · décision ${state.toLowerCase()} et retour envoyé à Facility Manager.`);
  };
  const escalateToDirection = (request:FieldRequest) => {
    const id = `DEC-${String(19 + escalations.length).padStart(3, '0')}`;
    setEscalations((items) => [{ id, anomaly:request.id, asset:'DEMO-RND', title:request.subject, kind:'Risque', due:'Aujourd’hui · 16:00', risk:'Décision hors délégation Facility Manager', recommendation:'Arbitrage Direction demandé par Facility Manager.', state:'À décider' }, ...items]);
    setFieldRequests((items) => items.map((item) => item.id === request.id ? { ...item, status:'Transmise à Direction' } : item));
    flash(`${id} transmise à l’Administration pour arbitrage.`);
  };

  const uiSession: UiSession | null = session?.mode === 'supabase' && presentationSource?.profileId ? {
    profileId: presentationSource.profileId, audience: personaId, displayName: session.displayName ?? persona.name,
    perimeter: presentationSource.perimeter?.all ? { kind:'all' } : { kind:'codes',
      equipmentCodes: presentationSource.equipment.filter(e=>e.id && presentationSource.perimeter?.equipmentIds.includes(e.id)).map(e=>e.code as EquipmentCode),
      zoneIds:presentationSource.perimeter?.zoneIds ?? [], roundModuleCodes:[] },
    scopeVersion:presentationSource.healthSnapshot.scopeVersion, demo:false,
  } : null;
  const healthPresentation = uiSession && presentationSource ? presentationSource.healthSnapshot : null;
  const localPresentationSource = presentationSource ? { ...presentationSource, ge01Operations: {
    ...presentationSource.ge01Operations,
    rounds: presentationSource.ge01Operations.rounds.map(round => round.state !== 'done'
      && offlineSync.ge01Drafts.some(draft => draft.isTest === recipeMode && draft.date === round.scheduledDate)
      ? { ...round, state: 'draft' as const } : round),
  } } : null;
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
  if (!session) return <AuthExperience onAuthenticate={authenticate} onDemoAuthenticate={authenticateDemo} onForgot={requestPasswordReset} onReset={resetDemo} supabaseMode={isSupabaseIntegrationEnabled} allowDemoFallback={supabaseIntegration.demoFallback} environmentLabel={supabaseIntegration.environmentLabel} sessionNotice={sessionNotice} />;

  return (
    <ConnectedPresentation.Provider value={{live:session.mode === 'supabase', session:uiSession, health:healthPresentation, source:localPresentationSource, pendingRounds:offlineSync.ge01Pending.filter(item => item.isTest === recipeMode), threshold:decisionThreshold, costs:<ConnectedCostsWorkspace items={escalations.filter(e=>e.anomaly === selected?.id).map(item=>({...item, amount:item.amount ?? null, reviewComment:item.motive}))} anomalies={selected ? [{reference:selected.id, asset:selected.asset, title:selected.title}] : []} audience={personaId === 'administration' ? 'administration' : 'facility'} threshold={decisionThreshold} persistenceMode={session.mode === 'supabase' ? 'server' : 'demo'} busy={mutationBusy} onSubmit={persistCostDecision} onReview={persistCostReview} onOpenDossier={openDetail} />, sync:<span className="home-hero-sync">{offlineSync.running ? "Envoi en cours" : offlineSync.counts.actionable ? `${offlineSync.counts.actionable} envoi(s) en attente` : "Aucun envoi local en attente"}</span>}}>
    <DemoScenarioProvider enabled={session.mode === 'demo'}>
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
        <div className="scope-box"><span>●</span><div><b>{session.mode === 'supabase' ? 'BEHIRA' : 'Site Démo Atlas'}</b><small>{session.mode === 'supabase' ? dataState === 'live' ? `${referenceCounts.anomalies} anomalies · ${referenceCounts.equipment} équipements · ${referenceCounts.zones} zones` : dataState === 'loading' ? `Synchronisation ${supabaseIntegration.environmentLabel}…` : 'Données métier indisponibles' : 'Site principal · démonstration'}</small></div></div>
        <div className="app-navigation-user"><button className="logout-button" onClick={() => setSignOutConfirm(true)} aria-label="Se déconnecter">↪</button></div>
      </header>

      <main className={`main-column${view === 'manager' || view === 'registry' ? ' is-dossiers-page' : ''}`}>
        <header className="topbar">
          <div className="topbar-title"><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>
          <div className="top-actions">{session.mode === 'demo' ? <PersonaSwitcher value={personaId} onChange={changePersona} /> : <div className={`authenticated-persona data-${dataState}`} title={`${session.email} · ${dataState === 'live' ? `données ${supabaseIntegration.environmentLabel}` : 'données métier indisponibles'}`}><span>{persona.initials}</span><p><b>{persona.name}</b><small>{dataState === 'live' ? `${supabaseIntegration.environmentLabel} · ${referenceCounts.anomalies} anomalies visibles` : dataState === 'loading' ? `Connexion à ${supabaseIntegration.environmentLabel}…` : `Erreur de chargement · ${persona.role}`}</small></p></div>}<NotificationBell personaId={personaId} anomalies={anomalies} equipment={equipmentItems} dataState={dataState} canConfigure={personaId === 'facility' || personaId === 'administration'} canOpenEquipment={allowedViewsByPersona[personaId].includes('equipment')} onOpenAnomaly={(id) => openDetail(id, view === 'detail' ? previousView : view)} onOpenEquipment={() => navigate('equipment')} onOpenHome={() => navigate('workspace')} /><button className="auth-signout-top" onClick={() => setSignOutConfirm(true)} aria-label="Se déconnecter"><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M8 4.5H5.5A1.5 1.5 0 0 0 4 6v8a1.5 1.5 0 0 0 1.5 1.5H8"/><path d="M8.5 10H16m0 0-2.4-2.4M16 10l-2.4 2.4"/></svg></button></div>
        </header>

        <div className="content">
          {session.mode === 'supabase' && (recipeAvailable || recipeMode) && <section className="recette-space" aria-label="Espace de travail">
            <Field label="Espace de travail"><Select aria-label="Espace de travail" value={recipeMode ? 'recette' : 'real'} disabled={mutationBusy || dataState === 'loading' || view === 'report'} onChange={(event) => { spaceGeneration.current++; setDataState('loading'); setAnomalies([]); setEquipmentItems([]); setWorkOrders([]); setReports([]); setEscalations([]); setReferenceCounts({anomalies:0,equipment:0,zones:0,profiles:0}); setToast(''); setSelectedId(''); setView('workspace'); setRecipeMode(event.target.value === 'recette'); }}><option value="real">Exploitation — données réelles</option><option value="recette">Recette — données fictives</option></Select></Field>
            {recipeMode && <p role="status"><Badge tone="orange">RECETTE — DONNÉES FICTIVES</Badge> Rapports, dossiers, preuves et montants de test. Aucun engagement réel ; exclus des indicateurs d’exploitation.</p>}
            {view === 'report' && <small>Revenez à l’Accueil pour changer d’espace après sauvegarde du brouillon.</small>}
          </section>}
          {session.mode === 'supabase' && dataState !== 'live' ? <ConnectedDataStatus state={dataState} environmentLabel={supabaseIntegration.environmentLabel} onRetry={retryOperationalData} /> : <>

          {view === 'workspace' && <PersonaWorkspace persona={persona} anomalies={anomalies} equipment={equipmentItems} vendors={vendorReferences} canUploadVendorReport={effectiveCanUploadVendorReport} vendorReportBusy={mutationBusy} onVendorReport={persistVendorReport} escalations={escalations} fieldRequests={fieldRequests} onEscalationDecision={decideEscalation} onEscalateToDirection={escalateToDirection} onFieldRequest={submitFieldRequest} onOpen={(id) => openDetail(id, 'workspace')} onNavigate={navigate} flash={flash} />}
          {view === 'dashboard' && <Dashboard anomalies={anomalies} equipment={equipmentItems} escalations={escalations} audience={personaId === 'administration' ? 'administration' : 'facility'} onOpen={openDetail} onNavigate={navigate} />}
          {(view === 'manager' || view === 'registry') && <DossiersWorkspace
            tab={view === 'registry' ? 'tous' : dossiersTab}
            onTab={(tab) => { setDossiersTab(tab); if (view === 'registry') setView('manager'); }}
            threshold={decisionThreshold}
            query={query}
            onQuery={setQuery}
            counts={{
              atraiter: presentationSource ? pendingFmDossierIds(presentationSource).size : atraiterCount(anomalies, fieldRequests),
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
          {view === 'equipment' && <LiveEquipmentWorkspace session={uiSession ?? sessionForAudience(personaId === 'administration' ? 'administration' : 'facility', persona.name)} />}
          {view === 'costs' && <CostsWorkspace items={escalations.map((item) => ({ id:item.id, anomaly:item.anomaly, asset:item.asset, title:item.title, kind:item.kind, amount:item.amount ?? null, due:item.due, state:item.state }))} audience={personaId === 'administration' ? 'administration' : 'facility'} threshold={decisionThreshold} onOpenDossier={(id) => openDetail(id, 'costs')} />}
          {view === 'access' && (session.mode === 'supabase' ? <InsufficientNote title="Gestion des comptes" detail="La gestion des accès depuis cet écran reste à raccorder." /> : <AccessWorkspace users={personas.map((item) => ({ id:item.id, name:item.name, initials:item.initials, role:item.role, scope:item.scope }))} audience={personaId === 'administration' ? 'administration' : 'facility'} />)}
          {view === 'settings' && <>
            <ParametersWorkspace parameter={financialDecisionParameter} onOpenCosts={() => navigate('costs')} />
            {personaId === 'administration' && session.mode === 'demo' ? <AccessWorkspace users={personas.map((item) => ({ id:item.id, name:item.name, initials:item.initials, role:item.role, scope:item.scope }))} audience="administration" /> : null}
          </>}
          {view === 'report' && <><Report key={`${session.userId ?? 'demo'}:${personaId}:${recipeMode}`} isTest={recipeMode} persona={persona} agentName={session.displayName ?? persona.name} reports={reports} connected={session.mode === 'supabase' && dataState === 'live'} onNavigate={navigate} persistenceEnabled={session.mode === 'supabase'} offlineSync={offlineSync} flash={flash} onReview={handleGe01Review} onRead={handleGe01Read} onLoadProof={handleGe01Proof} planning={presentationSource?.ge01Operations} onAssign={handleGe01Assignment} onOpenAnomaly={(reference) => openDetail(reference, 'report')} onRefresh={retryOperationalData} />{(personaId === 'electricite' || personaId === 'eau_incendie') && <InternalVendorReportPanel anomalies={anomalies.filter(item => (personaId === 'electricite' ? ['GE-01'] : ['WILO-01','RIA-01','IRR-01']).includes(displayAssetCode(item.asset)) && item.status !== 'Clôturée')} vendors={vendorReferences} canUpload={effectiveCanUploadVendorReport} busy={mutationBusy} onSubmit={persistVendorReport} />}</>}
          {view === 'detail' && <Detail key={`${selected.id}-${selected.status}-${selected.workflow?.version}-${selected.proof}-${selected.proofPending}-${selected.proofQueued}`} anomaly={selected} decision={escalations.find((item) => item.anomaly === selected.id && (!selected.treatment || item.costReference === selected.treatment.costReference)) ?? null} decisionThreshold={decisionThreshold} persistenceMode={session.mode === 'supabase' && dataState === 'live' ? 'server' : 'demo'} persistenceEnabled={session.mode === 'supabase'} offlineSync={offlineSync} readOnly={personaId === 'administration'} canReopen={session.mode === 'supabase' && dataState === 'live' && (personaId === 'facility' || personaId === 'administration')} canVerify={personaId === 'facility' && session.mode === 'supabase'} busy={mutationBusy} onBack={() => navigate(previousView)} onStatus={(status) => void persistWorkflowStatus(status)} onProof={persistProof} onConsultProof={consultProof} onVerify={verifyProof} onReception={persistReception} onReopen={persistReopenDossier} onReviewReopened={persistReviewReopenedDossier} onOpenCosts={() => navigate('costs')} onGe01Workflow={persistGe01Workflow} onRefresh={() => { void syncOperationalData().catch((error) => flash(mutationError(error))); }} isManager={personaId === 'facility'} isAgent={personaId === 'electricite'} />}
          </>}
        </div>
      </main>
      {toast && <div className={`toast ${/impossible|non enregistrée/i.test(toast) ? 'toast-error' : ''}`} role="status"><span>{/impossible|non enregistrée/i.test(toast) ? '!' : '✓'}</span>{toast}</div>}
      {signOutConfirm && <div className="signout-backdrop" role="presentation" onMouseDown={(event) => {if (event.target === event.currentTarget) setSignOutConfirm(false)}}><section className="signout-dialog" role="dialog" aria-modal="true" aria-labelledby="signout-title"><span className="signout-icon">↪</span><h2 id="signout-title">Se déconnecter ?</h2><p>{session.mode === 'supabase' ? `La session ${supabaseIntegration.environmentLabel} sera fermée. Les brouillons et les envois en attente seront conservés sur cet appareil.` : 'La session simulée sera supprimée de cet appareil. Les données de démonstration resteront disponibles.'}</p><div><Button ref={signOutCancelRef} variant="secondary" onClick={() => setSignOutConfirm(false)}>Annuler</Button><Button onClick={() => void signOut()}>Se déconnecter</Button></div>{session.mode === 'demo' && <button className="reset-session-link" onClick={resetDemo}>Déconnecter et réinitialiser toute la démo</button>}</section></div>}
    </div>
    </DemoScenarioProvider>
    </ConnectedPresentation.Provider>
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
  onEscalationDecision:(id:string, state:DecisionState, motive:string, idempotencyKey:string)=>Promise<void>;
  onEscalateToDirection:(request:FieldRequest)=>void;
  onFieldRequest:(request:Omit<FieldRequest,'id'|'status'>)=>void;
  onOpen:(id:string)=>void;
  onNavigate:(view:View)=>void;
  flash:(message:string)=>void;
}) {
  if (persona.id === 'administration') return <DirectionWorkspace anomalies={anomalies} equipment={equipment} escalations={escalations} onDecision={onEscalationDecision} onOpen={onOpen} onNavigate={onNavigate} />;
  if (persona.id === 'facility') return <FacilityManagerWorkspace anomalies={anomalies} equipment={equipment} escalations={escalations} fieldRequests={fieldRequests} onEscalate={onEscalateToDirection} onOpen={onOpen} onNavigate={onNavigate} />;
  if (persona.id === 'electricite' || persona.id === 'eau_incendie') return <AgentWorkspace key={persona.id} persona={persona} anomalies={anomalies} equipment={equipment} vendors={vendors} canUploadVendorReport={canUploadVendorReport} vendorReportBusy={vendorReportBusy} onVendorReport={onVendorReport} onFieldRequest={onFieldRequest} onOpen={onOpen} onNavigate={onNavigate} flash={flash} />;
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
    open: anomalies.filter(requiresFmDecision),
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

function TodayRoundsPanel({ session, title, detail, withPicker = false, onStart, onOpenReports }: {
  session: UiSession;
  title: string;
  detail: string;
  withPicker?: boolean;
  onStart?: () => void;
  onOpenReports?: () => void;
}) {
  const current = useContext(ConnectedPresentation);
  const rounds = sortTodaysRounds(current.live ? current.source?.ge01Operations.rounds ?? [] : demoRoundsFor(session));
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
            <span>{current.live && item.equipmentCode === 'GE-01' && onOpenReports
              ? <Button variant="ghost" onClick={onOpenReports} aria-label="Consulter les rapports GE-01">{roundSubjectLabel(item)}{item.agentName ? `, ${item.agentName}` : ''} →</Button>
              : <>{roundSubjectLabel(item)}{item.agentName ? `, ${item.agentName}` : ''}</>}</span>
            <em className={`is-${item.state}`}>{roundStateLabel(item.state)}{item.missedYesterday ? ' · manquée hier' : ''}</em>
          </li>
        ))}
      </ul>
    </article>
  );
}

function DirectionWorkspace({ anomalies, equipment, escalations, onDecision, onOpen, onNavigate }: { anomalies:Anomaly[]; equipment:EquipmentItem[]; escalations:Escalation[]; onDecision:(id:string,state:DecisionState,motive:string,idempotencyKey:string)=>Promise<void>; onOpen:(id:string)=>void; onNavigate:(view:View)=>void }) {
  const current = useContext(ConnectedPresentation);
  const threshold = current.threshold;
  const [tab, setTab] = useState<'pending'|'history'>('pending');
  const [filter, setFilter] = useState<'Tous'|Escalation['kind']>('Tous');
  const [selectedCaseId, setSelectedCaseId] = useState('DEC-016');
  const [motive, setMotive] = useState('');
  const [motiveError, setMotiveError] = useState('');
  const [decisionMsg, setDecisionMsg] = useState('');
  const [decisionBusy,setDecisionBusy] = useState(false);
  const decisionLock=useRef(false);
  const decisionRetry=useRef<{payload:string;key:string}|null>(null);
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
  const decide = async (state: DecisionState) => {
    if (!focusItem || decisionLock.current) return;
    const motiveText = motive.trim();
    const needsMotive = state !== 'Approuvée';
    if (needsMotive && !motiveText) { setMotiveError('Indiquez un motif pour refuser ou renvoyer.'); return; }
    if (needsMotive && motiveText.length < 12) { setMotiveError('Le motif doit contenir au moins 12 caractères.'); return; }
    const payload=JSON.stringify([focusItem.id,state,motiveText]);
    if (decisionRetry.current?.payload !== payload) decisionRetry.current={payload,key:crypto.randomUUID()};
    decisionLock.current=true;setDecisionBusy(true);setMotiveError('');setDecisionMsg('');
    try {
      await onDecision(focusItem.id,state,motiveText || 'Approuvé sans motif complémentaire.',decisionRetry.current.key);
      decisionRetry.current=null;
      setDecisionMsg(`${state === 'Approuvée' ? 'Approuvé' : state === 'Refusée' ? 'Refusé' : 'Renvoyé au FM'}. Décision confirmée et historisée.`);
    } catch(error) { setMotiveError(error instanceof Error ? error.message : 'Décision non confirmée. Réessayez ou actualisez.'); }
    finally { decisionLock.current=false;setDecisionBusy(false); }
  };
  return <div className="admin-home">
    <LiveHealthCockpit
      session={useUiSession('administration', 'Administration Démo')}
      onNavigate={onNavigate}
      actionCount={pending.length}
      bannerExtras={<div className="admin-big">{[
        { n: formatCompactMoney(documentedCostTotal), k: 'soumis à décision' },
        { n: firstDue ? firstDue.due.replace('Aujourd’hui · ', '') : '—', k: firstDue ? `première échéance, ${displayAssetCode(firstDue.asset)}` : 'aucune échéance' },
        { n: String(lateCount), k: 'arbitrage en retard' },
      ].map((item) => <div key={item.k}><b>{item.n}</b><span>{item.k}</span></div>)}</div>}
    >
      {current.live ? <div className="admin-ctrl" role="group" aria-label="Points de contrôle">
        <button type="button" onClick={() => { setTab('pending'); setFilter('Clôture sensible'); }}>
          <div className="n">{pending.filter(item => item.kind === 'Clôture sensible').length}</div><div className="k">Clôtures sensibles à contrôler</div><div className="s">Arbitrages en attente</div>
        </button>
        <button type="button" onClick={() => onNavigate('access')}>
          <div className="n">—</div><div className="k">Demandes d’accès</div><div className="s">Suivi non raccordé</div>
        </button>
        <button type="button" onClick={() => { setTab('pending'); setFilter('Tous'); }}>
          <div className="n">{lateCount}</div><div className="k">Arbitrages en retard</div><div className="s">{pending.filter(item => /retard/i.test(item.due) && item.amount != null && item.amount >= threshold).length} au seuil ou au-dessus</div>
        </button>
        <button type="button" onClick={() => onNavigate('settings')}>
          <div className="n">—</div><div className="k">Règles à compléter</div><div className="s">Décompte non établi</div>
        </button>
      </div> : <div className="admin-ctrl" role="group" aria-label="Points de contrôle">
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
      </div>}
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
          <label className={`field ${motiveError ? 'is-invalid' : ''}`}>Motif de votre décision<textarea value={motive} aria-invalid={Boolean(motiveError)} onChange={(event) => { setMotive(event.target.value); setMotiveError(''); setDecisionMsg(''); }} placeholder="Motif obligatoire pour refuser ou renvoyer — 12 caractères minimum." rows={2} /><FieldError message={motiveError} /></label>
          <div className="case-actions admin-decide-foot">
            {focusItem.anomaly.startsWith('ANO-') && <button className="secondary-button" onClick={() => onOpen(focusItem.anomaly)}>Voir l’anomalie</button>}
            <button className="return-action" type="button" aria-label="Renvoyer à Facility Manager" disabled={decisionBusy} onClick={() => void decide('Renvoyée à Facility Manager')}>Renvoyer au FM</button>
            <button className="reject-action" type="button" disabled={decisionBusy} onClick={() => void decide('Refusée')}>{focusItem.kind === 'Clôture sensible' ? 'Refuser la clôture' : 'Refuser'}</button>
            <button className="primary-button" type="button" disabled={decisionBusy} onClick={() => void decide('Approuvée')}>{focusItem.kind === 'Clôture sensible' ? 'Approuver la clôture' : 'Approuver'}</button>
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
  const DECISION_THRESHOLD_FCFA = useContext(ConnectedPresentation).threshold;
  const session = useUiSession('facility', 'Facility Manager Démo');
  const current = useContext(ConnectedPresentation);
  const rounds = current.live ? current.source?.ge01Operations.rounds ?? [] : demoRoundsFor(session);
  const doneCount = rounds.filter((item) => item.state === 'done').length;
  const { scenario } = useDemoScoreScenario();
  const scoreNotComputable = (current.live ? current.health : demoHomeSnapshot(session, scenario))?.score.state === 'not_computable';
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
  if (current.live) { decisions.length = 0; seen.clear(); }
  for (const item of anomalies) {
    if (current.live && (!current.source || !pendingFmDossierIds(current.source).has(item.id))) continue;
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
            <div><h3>Décisions à prendre</h3><p>Actions attendues du Facility Manager.</p></div>
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
          <div className="analytics-card-head"><div><h3>Où se perdent les points</h3><p>Équipements 70 % · Sécurité 15 % · Zones 10 % · Continuité 5 %</p></div></div>
          <DomainPointsSummary section={current.live ? current.health?.domainPoints : undefined} />
        </article>
      </div>
    </LiveHealthCockpit>
    <div className="facility-home-grid">
      <TodayRoundsPanel session={session} title="Rondes du jour" detail="Rondes techniques quotidiennes de tous les agents." onOpenReports={() => onNavigate('report')} />
      <article className="sheet">
        <div className="analytics-card-head"><div><h3>Hygiène et paysage</h3><p>Notifications de l’agente rondes. Hors score tant qu’elles ne sont pas qualifiées.</p></div></div>
        <div className="hygiene-list">
          {fieldRequests.filter(request=>request.from.includes('Rondes')).map((request) => {
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

type AgentTask = { id:string; asset:string; title:string; due:string; risk:string; status:'À faire'|'En cours'|'Terminé'|'Rétabli provisoirement'; proof:boolean; proofPending?:boolean; delayed?:boolean; escalated?:boolean; detail:string };

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

function AgentWorkspace({ onOpen, persona, anomalies, equipment, vendors, canUploadVendorReport, vendorReportBusy, onVendorReport, onFieldRequest, onNavigate, flash }: { onOpen:(id:string)=>void; persona:Persona; anomalies:Anomaly[]; equipment:EquipmentItem[]; vendors:OperationalVendor[]; canUploadVendorReport:boolean; vendorReportBusy:boolean; onVendorReport:(input:VendorReportInput)=>Promise<void>; onFieldRequest:(request:Omit<FieldRequest,'id'|'status'>)=>void; onNavigate:(view:View)=>void; flash:(message:string)=>void }) {
  const agentKey = persona.id as 'electricite'|'eau_incendie';
  const current = useContext(ConnectedPresentation);
  const [demoTasks, setTasks] = useState(agentTaskSets[agentKey]);
  const assigned = anomalies.filter(a=>a.workflow?.assignedToCurrentUser && a.status !== 'Clôturée');
  const tasks: AgentTask[] = current.live ? [...new Map<string, AgentTask>([
    ...(current.source?.workOrders ?? []).map(w=>[w.anomalyReference, {...w, id:w.anomalyReference}] as const),
    ...assigned.map(a=>[a.id, {id:a.id,asset:a.asset,title:a.title,due:a.due,risk:a.priority,status:'À faire' as const,proof:a.proof,proofPending:a.proofPending,delayed:a.delayed,detail:a.antiZombieSummary?.nextAction ?? a.description}] as const),
  ]).values()] : demoTasks;
  const [tab, setTab] = useState<'todo'|'done'|'hist'>('todo');
  const [action, setAction] = useState<{type:'measure'|'proof'|'escalate'|'reset'; id:string}|null>(null);
  const [note, setNote] = useState('');
  const visible = tasks.filter((task) => tab === 'done' ? task.status === 'Terminé' : task.status !== 'Terminé').slice().sort((a, b) => Number(Boolean(b.delayed)) - Number(Boolean(a.delayed)));
  const activeTask = action ? tasks.find((task) => task.id === action.id) : null;
  const history = (current.live ? [] : demoReportTracking).filter((item) => {
    const codes = agentKey === 'electricite' ? ['GE-01', 'ASC-A1', 'ASC-A2'] : ['WILO-01', 'RIA-01', 'IRR-01'];
    return item.equipmentCode != null && codes.includes(item.equipmentCode);
  }).slice(0, 5);
  const completeAction = () => {
    if (current.live) { flash('Ouvrez le dossier pour enregistrer cette action dans le parcours pilote.'); return; }
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
    <LiveHealthCockpit session={useUiSession(agentKey, persona.name)} onNavigate={onNavigate} actionCount={tasks.filter((task) => task.status !== 'Terminé').length} />
    {agentKey === 'eau_incendie' && <section className="provisional-rule"><span>↻</span><div><b>Réarmement = rétablissement provisoire</b><p>L’anomalie reste ouverte jusqu’au diagnostic, à l’intervention corrective et à la preuve validée par Facility Manager.</p></div></section>}
    <section className="sheet agent-actions-sheet" aria-labelledby="h-actions">
      <div className="analytics-card-head"><div><h2 id="h-actions">Mes actions</h2><p>Ce qui vous a été affecté, et ce que sont devenus vos rapports.</p></div></div>
      <div className="workspace-tabs parameters-tabs agent-action-tabs" role="tablist">
        <button type="button" role="tab" aria-selected={tab === 'todo'} className={tab === 'todo' ? 'active' : ''} onClick={() => setTab('todo')}>À faire <span>{tasks.filter((task) => task.status !== 'Terminé').length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'done'} className={tab === 'done' ? 'active' : ''} onClick={() => setTab('done')}>Terminées <span>{tasks.filter((task) => task.status === 'Terminé').length}</span></button>
        <button type="button" role="tab" aria-selected={tab === 'hist'} className={tab === 'hist' ? 'active' : ''} onClick={() => setTab('hist')}>Historique des rondes</button>
      </div>
      {tab !== 'hist' ? (
        <div className="agent-task-list">{visible.length === 0 ? <div className="empty-state compact"><span>✓</span><h3>Tout est terminé</h3><p>Aucune action dans cette file.</p></div> : visible.map((task) => <article key={task.id} className={`act-row${task.delayed ? ' late' : ''}`}><span className={`act-bar ${task.delayed ? 'is-bad' : task.status === 'Terminé' ? 'is-ok' : 'is-sig'}`} /><div className="task-copy"><div className="task-status"><Badge tone={task.delayed ? 'critical' : task.status === 'Terminé' ? 'success' : task.status === 'Rétabli provisoirement' ? 'orange' : 'blue'}>{task.delayed ? 'En retard' : tab === 'todo' && task.status === 'À faire' ? 'À faire' : task.status}</Badge><span className="task-ref">{task.id}</span></div><h3>{displayAssetCode(task.asset)}, {task.title}</h3><p>{task.detail}</p><div className="facts"><span>Risque : <b>{task.risk}</b></span><span>Échéance : <b className={task.delayed ? 'late-text' : undefined}>{task.due}</b></span><span>Preuve : <b>{task.proofPending ? 'À valider' : task.proof ? 'Jointe' : 'Manquante'}</b></span></div></div>{current.live ? <div className="task-actions"><Button onClick={()=>onOpen(task.id)}>Ouvrir le dossier</Button></div> : tab === 'todo' && <div className="task-actions"><button type="button" onClick={() => {setAction({type:'measure',id:task.id});setNote('')}}>Saisie rapide</button>{agentKey === 'eau_incendie' && task.asset === 'DEMO-EAU' && <button type="button" className="reset-action" onClick={() => {setAction({type:'reset',id:task.id});setNote('')}}>↻ Réarmement provisoire</button>}<button type="button" onClick={() => {setAction({type:'proof',id:task.id});setNote('')}}>Ajouter une preuve</button><button type="button" onClick={() => {setAction({type:'escalate',id:task.id});setNote('')}}>{task.escalated ? '✓ Escalade envoyée' : 'Escalader au FM'}</button></div>}</article>)}</div>
      ) : (
        <div className="agent-round-history">
          {current.live && current.pendingRounds?.map(item => <p className="report-tracking-line" key={item.id}><span>{formatHistoryMoment(item.sentAt)}</span><span>GE-01 · conservé sur cet appareil, envoi en attente de confirmation.</span></p>)}
          {current.live ? (current.source?.reports.length ? current.source.reports.slice(0,5).map(report=><p className="report-tracking-line" key={report.id}><span className="report-tracking-when">{formatHistoryMoment(report.submittedAt ?? report.performedAt)}</span><span className="report-tracking-ref">{report.equipmentCode} · {report.reference}</span><span className="report-tracking-stage">{report.review ? report.review.decision === 'conform' ? 'Examiné — conforme' : 'Qualifié — anomalie ouverte' : report.ge01Status?.readAt ? 'Lu par le FM — examen attendu' : report.ge01Status?.confirmedAt ? 'Confirmé par le serveur — lecture non attestée' : 'Reçu — réception des preuves à confirmer'}</span></p>) : <p className="empty">Aucun rapport confirmé par le serveur.</p>) : history.length === 0 ? <p className="empty">Aucun rapport dans cet historique.</p> : history.map((item) => <ReportTrackingLine key={item.clientMutationId} item={item} onView={() => onNavigate('report')} />)}
          <div className="hl-foot"><button type="button" className="health-link" onClick={() => onNavigate('report')}>Voir tout l’historique</button></div>
        </div>
      )}
    </section>
    <InternalVendorReportPanel anomalies={anomalies.filter((item) => (agentKey === 'electricite' ? ['GE-01','DEMO-GE'] : ['WILO-01','RIA-01','IRR-01','DEMO-EAU','DEMO-SSI','DEMO-ESP']).includes(item.asset) && item.status !== 'Clôturée')} vendors={vendors} canUpload={canUploadVendorReport} busy={vendorReportBusy} onSubmit={onVendorReport} />
    {action && activeTask && <div className="demo-modal-backdrop"><section className="demo-modal" role="dialog" aria-modal="true" aria-labelledby="agent-action-title"><button className="modal-close" aria-label="Fermer" onClick={() => setAction(null)}>×</button><Badge tone={action.type === 'escalate' ? 'orange' : action.type === 'reset' ? 'critical' : 'blue'}>{action.type === 'measure' ? 'SAISIE RAPIDE' : action.type === 'proof' ? 'PREUVE' : action.type === 'reset' ? 'RÉARMEMENT PROVISOIRE' : 'ESCALADE FACILITY MANAGER'}</Badge><h3 id="agent-action-title">{displayAssetCode(activeTask.asset)} · {activeTask.title}</h3><p>{action.type === 'reset' ? 'Le service sera indiqué comme rétabli provisoirement. Le dossier restera ouvert.' : action.type === 'proof' ? 'Décrivez la photo ou le document illustré dans la maquette.' : action.type === 'escalate' ? 'Expliquez le risque ou le blocage qui nécessite Facility Manager.' : 'Saisissez les mesures et observations relevées.'}</p><label className="field">{action.type === 'proof' ? 'Description de la preuve' : 'Observation obligatoire'}<textarea autoFocus value={note} onChange={(e) => setNote(e.target.value)} placeholder={action.type === 'measure' ? 'Ex. batterie 25,8 V · mode AUTO confirmé…' : 'Ajoutez un commentaire précis…'} /></label>{action.type === 'proof' && <div className="simulated-file"><span>▧</span><div><b>photo_terrain_demo.jpg</b><small>Illustration de maquette · aucun fichier téléversé</small></div></div>}<SyncStatusNotice state="demo-volatile" compact label="État de l’action terrain" /><div className="modal-actions"><button className="secondary-button" onClick={() => setAction(null)}>Annuler</button><button className="primary-button" disabled={!note.trim()} onClick={completeAction}>Appliquer dans la démonstration</button></div></section></div>}
  </>;
}

function InternalVendorReportPanel({ anomalies, vendors, canUpload, busy, onSubmit }: { anomalies:Anomaly[]; vendors:OperationalVendor[]; canUpload:boolean; busy:boolean; onSubmit:(input:VendorReportInput)=>Promise<void> }) {
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement|null>(null);
  const [open, setOpen] = useState(false);
  const [anomalyReference, setAnomalyReference] = useState(anomalies[0]?.id ?? '');
  const [vendorCode, setVendorCode] = useState(vendors[0]?.code ?? '');
  const [reportType, setReportType] = useState<VendorReportInput['reportType']>('intervention_report');
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0,10));
  const [summary, setSummary] = useState('');
  const [reserveNotes, setReserveNotes] = useState('');
  const [hasReserves, setHasReserves] = useState(false);
  const [dragging, setDragging] = useState(false);
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

  const threshold = useContext(ConnectedPresentation).threshold;
  const thresholdLabel = formatMoney(threshold);
  const costPosition = thresholdPosition(cost.trim() ? Number(cost) : null, threshold);
  const acceptFile = (nextFile:File|null) => {
    if (!nextFile && fileInputRef.current) fileInputRef.current.value = "";
    setFile(nextFile);
    setFieldErrors((current) => ({ ...current, file: validateVendorReportFields({ ...currentValues, file: nextFile }).file }));
  };

  const applyFieldErrors = (nextFile:File|null = file) => {
    const next = validateVendorReportFields({ ...currentValues, file: nextFile });
    setFieldErrors(next);
    return next;
  };

  const resetForm = () => {
    setSummary(''); setReserveNotes(''); setHasReserves(false); setDragging(false); setCost(''); setFile(null); setError(''); setFieldErrors({});
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
    <div className="panel-head"><div><h3>Rapport d’intervention d’une entreprise</h3><p>Dépôt interne au nom d’un prestataire référencé</p><p className="vendor-access-note">Les prestataires n’ont pas d’accès direct : un agent autorisé dépose le rapport, Facility Manager contrôle la preuve.</p></div><div className="vendor-report-head-actions">{canUpload ? null : <Badge tone="neutral">Droit non attribué</Badge>}<button type="button" className="health-link" aria-expanded={true} onClick={() => setOpen(false)}>Réduire</button></div></div>
    {!canUpload ? <div className="permission-empty"><p>Ce profil ne dispose pas du droit nominatif de dépôt. Agent Électricité et Agent Eau & Incendie sont les seuls agents internes habilités.</p><button className="secondary-button" type="button" disabled>Déposer un rapport prestataire</button></div> :
    <form className="internal-vendor-form" onSubmit={submit} noValidate>
      <div className="two-fields">
        <label className={`field ${fieldErrors.anomalyReference ? 'is-invalid' : ''}`}>Anomalie<Select value={anomalyReference} aria-invalid={Boolean(fieldErrors.anomalyReference)} aria-describedby={fieldErrors.anomalyReference ? `${formId}-anomaly` : undefined} onChange={(event) => { setAnomalyReference(event.target.value); if (fieldErrors.anomalyReference) setFieldErrors((current) => ({ ...current, anomalyReference: undefined })); }}>{anomalies.length ? anomalies.map((item) => <option key={item.id} value={item.id}>{item.id} · {displayAssetCode(item.asset)} · {item.title}</option>) : <option value="">Aucune anomalie ouverte</option>}</Select><FieldError id={`${formId}-anomaly`} message={fieldErrors.anomalyReference} /></label>
        <label className={`field ${fieldErrors.vendorCode ? 'is-invalid' : ''}`}>Entreprise concernée<Select value={vendorCode} aria-invalid={Boolean(fieldErrors.vendorCode)} aria-describedby={fieldErrors.vendorCode ? `${formId}-vendor` : undefined} onChange={(event) => { setVendorCode(event.target.value); if (fieldErrors.vendorCode) setFieldErrors((current) => ({ ...current, vendorCode: undefined })); }}>{vendors.length ? vendors.map((vendor) => <option key={vendor.code} value={vendor.code}>{vendor.label && vendor.label !== vendor.code ? `${vendor.label} · ${vendor.code}` : vendor.code}</option>) : <option value="">Aucun prestataire</option>}</Select><FieldError id={`${formId}-vendor`} message={fieldErrors.vendorCode} /></label>
      </div>
      <div className="two-fields">
        <label className="field">Nature du document<Select value={reportType} onChange={(event) => setReportType(event.target.value as VendorReportInput['reportType'])}><option value="intervention_report">Rapport d’intervention</option><option value="pv">Procès-verbal</option><option value="quote">Devis</option><option value="photo_bundle">Dossier photos</option></Select></label>
        <label className={`field ${fieldErrors.reportDate ? 'is-invalid' : ''}`}>Date du rapport<input type="date" className="native-date-input" max={new Date().toISOString().slice(0,10)} value={reportDate} aria-invalid={Boolean(fieldErrors.reportDate)} aria-describedby={fieldErrors.reportDate ? `${formId}-date` : undefined} onChange={(event) => { setReportDate(event.target.value); if (fieldErrors.reportDate) setFieldErrors((current) => ({ ...current, reportDate: undefined })); }} /><FieldError id={`${formId}-date`} message={fieldErrors.reportDate} /></label>
      </div>
      <label className={`field ${fieldErrors.summary ? 'is-invalid' : ''}`}>Résumé de l’intervention<textarea value={summary} maxLength={2000} aria-invalid={Boolean(fieldErrors.summary)} aria-describedby={fieldErrors.summary ? `${formId}-summary` : undefined} onChange={(event) => { setSummary(event.target.value); if (fieldErrors.summary) setFieldErrors((current) => ({ ...current, summary: undefined })); }} placeholder="Diagnostic, action réalisée, essais et résultat — 20 caractères minimum." /><FieldError id={`${formId}-summary`} message={fieldErrors.summary} /></label>
      <div className="two-fields">
        <div className={`field ${fieldErrors.reserveNotes ? 'is-invalid' : ''}`}>
          <span className="field-label" id={`${formId}-reserves-label`}>Réserves éventuelles</span>
          <div className="choice-row" role="group" aria-labelledby={`${formId}-reserves-label`}>
            <button type="button" className={`choice-button ${hasReserves ? '' : 'is-selected'}`} aria-pressed={!hasReserves} onClick={() => { setHasReserves(false); setReserveNotes(''); setFieldErrors((current) => ({ ...current, reserveNotes: undefined })); }}>Aucune réserve</button>
            <button type="button" className={`choice-button ${hasReserves ? 'is-selected' : ''}`} aria-pressed={hasReserves} onClick={() => setHasReserves(true)}>Réserves à lever</button>
          </div>
          {hasReserves ? <><input aria-labelledby={`${formId}-reserves-label`} value={reserveNotes} maxLength={500} aria-invalid={Boolean(fieldErrors.reserveNotes)} aria-describedby={fieldErrors.reserveNotes ? `${formId}-reserves` : undefined} onChange={(event) => { setReserveNotes(event.target.value); if (fieldErrors.reserveNotes) setFieldErrors((current) => ({ ...current, reserveNotes: undefined })); }} placeholder="Détail de la réserve à lever" /><FieldError id={`${formId}-reserves`} message={fieldErrors.reserveNotes} /></> : <small className="field-hint">Aucune réserve ne sera enregistrée pour ce rapport.</small>}
        </div>
        <label className={`field ${fieldErrors.cost ? 'is-invalid' : ''}`}>Coût indiqué<input type="number" min="0" step="1" inputMode="numeric" value={cost} aria-invalid={Boolean(fieldErrors.cost)} aria-describedby={fieldErrors.cost ? `${formId}-cost` : `${formId}-cost-hint`} onChange={(event) => { setCost(event.target.value); if (fieldErrors.cost) setFieldErrors((current) => ({ ...current, cost: undefined })); }} /><small id={`${formId}-cost-hint`} className={`field-hint ${costPosition === 'at_or_above' ? 'is-warning' : costPosition === 'below' ? 'is-ok' : ''}`}>{costPosition === 'at_or_above' ? `Montant supérieur ou égal au seuil de ${thresholdLabel} : la décision revient à l’Administration.` : costPosition === 'below' ? `Sous le seuil de ${thresholdLabel} : la décision reste au Facility Manager.` : `Montant en FCFA, si le rapport en mentionne un. Seuil : ${thresholdLabel}.`}</small><FieldError id={`${formId}-cost`} message={fieldErrors.cost} /></label>
      </div>
      <div className={`field vendor-dropzone-field ${fieldErrors.file ? 'is-invalid' : ''}`}>
        <span className="field-label" id={`${formId}-file-label`}>Rapport, PV ou photo</span>
        <div className={`vendor-dropzone ${dragging ? 'is-dragging' : ''} ${file ? 'has-file' : ''}`} onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)} onDrop={(event) => { event.preventDefault(); setDragging(false); const dropped = event.dataTransfer.files?.[0] ?? null; if (dropped) acceptFile(dropped); }}>
          {file ? <div className="vendor-dropzone-file"><BrandIcon name="files" size={18} /><div><b>{file.name}</b><small>{Math.max(1, Math.round(file.size / 1024))} Ko</small></div><button type="button" className="health-link" onClick={() => acceptFile(null)}>Retirer</button></div>
            : <div className="vendor-dropzone-empty"><b>Déposer le rapport, le PV ou la photo</b><small id={`${formId}-file-hint`}>PDF, JPG, PNG ou WebP · 10 Mo maximum</small><button type="button" className="secondary-button" onClick={() => fileInputRef.current?.click()}>Choisir un fichier</button></div>}
          <input ref={fileInputRef} className="visually-hidden-input" type="file" aria-labelledby={`${formId}-file-label`} accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp" aria-invalid={Boolean(fieldErrors.file)} aria-describedby={fieldErrors.file ? `${formId}-file` : `${formId}-file-hint`} onChange={(event) => acceptFile(event.target.files?.[0] ?? null)} />
        </div>
        <FieldError id={`${formId}-file`} message={fieldErrors.file} />
      </div>
      {error ? <p className="vendor-report-error" role="alert">{error}</p> : null}
      <div className="vendor-report-form-actions">
        <small className="vendor-report-action-note">Facility Manager validera la preuve après dépôt.</small>
        <button type="button" className="secondary-button" disabled={busy || localBusy} onClick={cancel}>Annuler</button>
        <button className="primary-button" disabled={busy || localBusy}>{busy || localBusy ? 'Dépôt en cours…' : 'Déposer le rapport'}</button>
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
    <LiveHealthCockpit session={useUiSession('rondes_assistance', 'Agente Rondes & Assistance Démo')} onNavigate={onNavigate} />
    <div className="mission-switch" role="tablist" aria-label="Fonction de Agente Rondes & Assistance"><button type="button" role="tab" aria-selected={missionTab === 'terrain'} className={missionTab === 'terrain' ? 'active' : ''} onClick={() => setMissionTab('terrain')}><BrandIcon name="mapPin" size={16} /><b>Terrain</b><small>Rondes, constats et brouillons de démonstration</small></button><button type="button" role="tab" aria-selected={missionTab === 'administration'} className={missionTab === 'administration' ? 'active' : ''} onClick={() => setMissionTab('administration')}><BrandIcon name="files" size={16} /><b>Administratif</b><small>Devis, paiements et autorisations</small></button></div>
    {missionTab === 'terrain' && <><section className="rondes_assistance-grid"><article className="panel zone-rounds"><div className="panel-head"><div><h3>Zones du jour</h3><p>Ronde du jour · {formatWeekdayDate('2026-09-16T08:00:00Z')}</p></div><span className="panel-count">4 / 6 contrôlées</span></div>{['Hall & accueil|Terminé','Atrium restaurant|À vérifier','Jardinières RDC|En cours','Sanitaires R+2|Terminé','Terrasse R+4|À faire','Parking sous-sol|À faire'].map((item) => {const [label,status] = item.split('|'); return <button key={label}><span className={status === 'Terminé' ? 'done' : status === 'En cours' ? 'current' : ''}>{status === 'Terminé' ? '✓' : '○'}</span><div><b>{label}</b><small>Propreté · plantes · fuite · dégradation</small></div><Badge tone={status === 'Terminé' ? 'success' : status === 'À vérifier' ? 'critical' : status === 'En cours' ? 'blue' : 'neutral'}>{status}</Badge></button>})}</article><article className="panel quick-finding"><div className="panel-head"><div><h3>Saisie dans Rondes</h3><p>Un seul formulaire de constat, pour éviter une double saisie.</p></div><Badge tone="blue">RONDES</Badge></div><p className="finding-pointer-copy">Les zones du jour restent ici. La création et la photo se font dans la destination Rondes.</p><button type="button" className="secondary-button" onClick={() => onNavigate('report')}>Ouvrir la ronde</button></article></section><section className="panel signal-tracker"><div className="panel-head"><div><h3>Mes signalements</h3><p>Statuts visibles sans accès aux décisions techniques</p></div><Badge>{submitted.length} dossiers</Badge></div><div className="signal-list">{submitted.map((item,index) => <article key={`${item.title}-${index}`}><div><b>{item.title}</b><p>{item.zone} · {item.category}</p></div><Badge tone={item.status === 'Complément demandé' && !complementDone ? 'orange' : item.status === 'À qualifier' ? 'blue' : 'success'}>{item.status === 'Complément demandé' && complementDone ? 'Complément transmis' : item.status}</Badge>{item.status === 'Complément demandé' && !complementDone && <button onClick={() => {setComplementDone(true);flash('Complément photo transmis à Facility Manager — simulation locale.')}}>Ajouter la photo demandée</button>}</article>)}</div><div className="field-feed-note">{fieldRequests.filter((request) => request.from === 'Agente Rondes & Assistance Démo').length} remontée(s) visible(s) dans la file de Facility Manager.</div></section></>}
    {missionTab === 'administration' && <><section className="mission-permission-note"><span>i</span><div><b>Fonction administrative, sans décision technique</b><p>Agente Rondes & Assistance prépare et suit les pièces. Facility Manager et l’Administration conservent leurs validations respectives.</p></div></section><section className="rondes_assistance-admin-grid"><article className="panel"><div className="panel-head"><div><p className="design-kicker">SUIVI ADMINISTRATIF</p><h3>Devis et autorisations</h3></div><span className="panel-count is-alert">3 à suivre</span></div>{[['DEV-031','PREST-EAU','280 000 FCFA','Validation Facility Manager'],['DEV-029','PREST-ASC','950 000 FCFA','Arbitrage Administration'],['DEV-026','PREST-ESP','190 000 FCFA','Bon à payer']].map((item) => <button className="admin-follow-row" key={item[0]}><span>{item[0]}</span><p><b>{item[1]}</b><small>{item[2]} · {item[3]}</small></p><em>Voir →</em></button>)}</article><article className="panel"><div className="panel-head"><div><p className="design-kicker">COÛTS & PAIEMENTS</p><h3>Échéances de la semaine</h3></div></div><div className="payment-summary"><strong>2,12 M</strong><span>FCFA à contrôler</span></div><div className="payment-lines"><span><i className="done" /> 3 pièces complètes</span><span><i /> 1 autorisation attendue</span><span><i className="late" /> 1 paiement en retard</span></div><button className="secondary-button">Ouvrir le suivi financier</button></article></section></>}
  </>;
}

function OperationalAnalytics({ equipment, section = 'team', onNavigate }: { equipment:EquipmentItem[]; section?: 'health' | 'team'; onNavigate?: (view:View)=>void }) {
  const [period, setPeriod] = useState<'7j'|'30j'|'90j'>('30j');
  const periodLabel = period === '7j' ? '7 jours' : period === '30j' ? '30 jours' : '90 jours';
  const { scenario } = useDemoScoreScenario();
  const current = useContext(ConnectedPresentation);
  const analyticsSession = useUiSession('facility', 'Facility Manager Démo');
  const snapshot = current.live ? current.health : demoHomeSnapshot(analyticsSession, scenario);
  const homeScoreValue = snapshot ? scoreFigure(snapshot.score) : null;
  const parkEquipment = (snapshot?.equipment ?? []).filter((item) => String(item.code) !== 'RND-LET');
  const riskCodes = new Set(snapshot?.atRisk.status === 'ok' ? snapshot.atRisk.items.map(item => item.code) : []);
  const attentionEquipment = parkEquipment.filter((item) => item.operationalStatus !== 'available' || item.controlValidity !== 'valid' || riskCodes.has(item.code));
  const watchlist = attentionEquipment.slice(0, 5);

  if (section === 'team') {
    return <section className="operational-analytics analytics-direction" aria-labelledby="team-analytics-title">
      <div className="analytics-heading">
        <div><p className="design-kicker">SCORES AGENTS</p><h3 id="team-analytics-title">Équipe</h3><p>Aide au pilotage. Un échantillon insuffisant rend le score non interprétable ; aucune sanction automatique.</p></div>
        <span className="mockup-label">Méthode à valider</span>
      </div>
      <div className="analytics-grid">
        <article className="panel analytics-card agent-chart-card">
          <div className="analytics-card-head"><div><span>ÉQUIPE TERRAIN</span><h4>Performance des agents</h4></div><span className="mockup-label">Méthode à valider</span></div>
          <InsufficientNote title="Score agent non calculable" detail="Méthode, période et échantillon admissible non disponibles. Aucun score ni sanction automatique." />
          <div className="agent-score-method"><span><b>Période observée</b>Non disponible</span><span><b>Échantillon</b>Non raccordé</span><span><b>Méthode proposée</b>Délais · réactivité · qualité des preuves</span><span><b>Variation / fraîcheur</b>Indisponibles</span></div>
          <p className="analytics-note">Facteurs positifs et négatifs, date de mise à jour : source non raccordée. Aucune sanction automatique n’est autorisée.</p>
          <button type="button" className="health-link" disabled>Détail explicatif — source non raccordée</button>
        </article>
      </div>
    </section>;
  }

  return <section className="operational-analytics analytics-direction" aria-labelledby="health-analytics-title">
    <div className="analytics-heading">
      <div><p className="design-kicker">SCORES & TENDANCES</p><h3 id="health-analytics-title">Santé et évolution</h3><p>Lecture du bâtiment. Les scores agents restent dans Équipe.</p></div>
      <span className="mockup-label">{current.live ? "Données du serveur" : "Données de démonstration"}</span>
    </div>
    <div className="analytics-grid">
      <article className="panel analytics-card building-health-card">
        <div className="analytics-card-head"><div><span>SANTÉ BÂTIMENT</span><h4>Score global actuel</h4></div><span className="mockup-label">Fraîcheur à confirmer</span></div>
        <div className="building-health-content">
          {homeScoreValue == null
            ? <div className="insufficient-chart is-wide" role="status"><BrandIcon name="activity" size={18} /><div><b>Score non calculable</b><p>Les contrôles admissibles et les preuves des domaines doivent être complets et à jour.</p></div></div>
            : <ScoreRing value={homeScoreValue} />}
          <div className="score-components" aria-label="Composition du score bâtiment">
            <p>Équipements 70 % · Sécurité 15 % · Zones 10 % · Continuité 5 %</p>
            <DomainPointsSummary section={snapshot?.domainPoints} />
          </div>
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
        <div className="analytics-card-head"><div><span>PARC TECHNIQUE</span><h4>Équipements à surveiller</h4></div>{onNavigate ? <button type="button" className="health-link" onClick={() => onNavigate('equipment')}>Ouvrir Équipements →</button> : null}</div>
        {!snapshot || snapshot.atRisk.status !== 'ok' || parkEquipment.length === 0
          ? <InsufficientNote title="Données de risque insuffisantes" detail="Consultez Équipements pour vérifier les informations disponibles." />
          : watchlist.length === 0
          ? <div className="insufficient-chart is-wide" role="status"><BrandIcon name="activity" size={18} /><div><b>Aucun équipement à surveiller</b><p>Aucune indisponibilité ou dégradation renseignée dans cette liste. Consultez les validités des contrôles dans Équipements.</p></div></div>
          : <ul className="watchlist">{watchlist.map((item) => <li key={item.code}><span className="watchlist-identity"><b>{item.code}</b><small>{item.name}</small></span>{item.operationalStatus == null ? <Badge tone="neutral">Statut inconnu</Badge> : <Badge tone={statusBadgeTone(item.operationalStatus)}>{statusLabel(item.operationalStatus)}</Badge>}<span className="watchlist-score">{item.score == null ? <em>—</em> : <><b className={`palier-${palierFromScore(item.score)}`}>{item.score}</b><small>provisoire</small></>}</span></li>)}</ul>}
        <p className="analytics-note">{snapshot?.atRisk.status === 'ok' && watchlist.length ? `${watchlist.length} affiché(s) sur ${attentionEquipment.length} équipement(s) à examiner. Le parc complet et ses colonnes détaillées restent dans Équipements.` : 'Le parc complet et ses colonnes détaillées restent dans Équipements.'}</p>
      </article>
    </div>
  </section>;
}

function ManagerOperationalContext() {
  const DECISION_THRESHOLD_FCFA = useContext(ConnectedPresentation).threshold;
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
  const [dashboardTab, setDashboardTab] = useState<'overview'|'actions'|'health'>('overview');
  const DECISION_THRESHOLD_FCFA = useContext(ConnectedPresentation).threshold;
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
  </>;
}

function Registry({ anomalies, query, setQuery, priority, setPriority, status, setStatus, onOpen }: { anomalies:Anomaly[]; query:string; setQuery:(v:string)=>void; priority:string; setPriority:(v:string)=>void; status:string; setStatus:(v:string)=>void; onOpen:(id:string)=>void }) {
  const [expandedId, setExpandedId] = useState<string|null>(null);
  return <>
    <section className="section-heading"><div><p>{anomalies.length} anomalie{anomalies.length > 1 ? 's' : ''} correspondant à vos critères</p></div><button className="secondary-button">⇩ Exporter</button></section>
    <section className="filter-bar"><label className="search-box"><span>⌕</span><input aria-label="Rechercher dans le registre" placeholder="Rechercher par équipement, anomalie…" value={query} onChange={(e) => setQuery(e.target.value)} /></label><label>Priorité<Select value={priority} onChange={(e) => setPriority(e.target.value)}><option>Toutes</option><option>Critique</option><option>Haute</option><option>Moyenne</option><option>Faible</option></Select></label><label>Statut<Select value={status} onChange={(e) => setStatus(e.target.value)}><option>Tous</option><option>À qualifier</option><option>Affectée</option><option>En intervention</option><option>En validation</option><option>Clôturée</option></Select></label>{(query || priority !== 'Toutes' || status !== 'Tous') && <button className="clear-button" onClick={() => {setQuery('');setPriority('Toutes');setStatus('Tous')}}>Effacer</button>}</section>
    <section className="registry-card"><div className="registry-head"><span>Anomalie</span><span>Priorité</span><span>Étape</span><span>Échéance</span><span>Responsable</span><span /></div>{anomalies.length === 0 ? <div className="empty-state"><span>⌕</span><h3>Aucun résultat</h3><p>Essayez d’élargir vos critères de recherche.</p></div> : anomalies.map((a) => <article className={`registry-entry ${expandedId === a.id ? 'is-expanded' : ''}`} key={a.id}><button className="registry-row" onClick={() => onOpen(a.id)}><div className="registry-title"><span className={`asset-square ${priorityTone(a.priority)}`}>{a.asset.split('-')[0].slice(0,2)}</span><div><b>{a.title}</b><small>{a.id} · <span className="equipment-reference">{displayAssetCode(a.asset)}</span> · {a.location}</small></div></div><div><Badge tone={priorityTone(a.priority)}>{a.priority}</Badge></div><div><Badge tone={statusTone(a.status)}>{a.status}</Badge></div><div className={a.delayed && a.status !== 'Clôturée' ? 'late-text' : ''}>{a.delayed && a.status !== 'Clôturée' && <b>En retard</b>}<span>{a.due}</span></div><div className="owner-cell"><span className="mini-avatar">{canonicalResponsible(a) ? asciiInitials(canonicalResponsible(a)!) : '—'}</span><span>{canonicalResponsible(a) ?? 'Non attribué'}{externalActorConcerned(a) && <small>Acteur externe : {externalActorConcerned(a)}</small>}</span></div><div className="registry-mobile-meta"><Badge tone={priorityTone(a.priority)}>{a.priority}</Badge><Badge tone={statusTone(a.status)}>{a.status}</Badge>{a.delayed && a.status !== 'Clôturée' && <Badge tone="critical">En retard</Badge>}</div><div className="registry-mobile-details"><span><b>Échéance</b>{a.due}</span><span><b>Responsable interne</b>{canonicalResponsible(a) ?? 'Non attribué'}{externalActorConcerned(a) && <small>Acteur externe : {externalActorConcerned(a)}</small>}</span></div><span className="row-arrow">›</span></button><button type="button" className="registry-summary-toggle" aria-expanded={expandedId === a.id} onClick={() => setExpandedId((current) => current === a.id ? null : a.id)}>{expandedId === a.id ? 'Masquer la continuité de traitement' : 'Afficher la continuité de traitement'} <span>{expandedId === a.id ? '−' : '+'}</span></button>{expandedId === a.id && <AntiZombieSummary data={resolveAntiZombieSummary(a)} variant="compact" />}</article>)}</section>
  </>;
}

function Manager({ anomalies, tab, setTab, onOpen, escalations = [], fieldRequests = [] }: { anomalies:Anomaly[]; tab:ManagerQueue; setTab:(v:ManagerQueue)=>void; onOpen:(id:string)=>void; escalations?:Escalation[]; fieldRequests?:FieldRequest[] }) {
  const DECISION_THRESHOLD_FCFA = useContext(ConnectedPresentation).threshold;
  const { hygiene: hygieneRequests } = atraiterSources(anomalies, fieldRequests);
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
    origin: request.from.includes('Rondes') ? 'Rondes et services' : 'Eau et incendie',
    horsScore: request.from.includes('Rondes'),
  }));
  const current = useContext(ConnectedPresentation);
  const pendingIds = current.source ? pendingFmDossierIds(current.source) : new Set<string>();
  const receptionIds = current.source ? managerActionQueueIds(current.source.anomalies, 'RECEIVE_INTERVENTION') : new Set<string>();
  const reopenedIds = current.source ? managerActionQueueIds(current.source.anomalies, 'REVIEW_REOPENED_DOSSIER') : new Set<string>();
  const openItems = [...anomalies.filter((item) => item.status !== 'Clôturée' && (current.live ? pendingIds.has(item.id) : requiresFmDecision(item))), ...hygieneItems];
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
    reception:anomalies.filter((item) => receptionIds.has(item.id)),
    reservations:[],
    reopened:anomalies.filter((item) => reopenedIds.has(item.id)),
  };
  const queueMeta:Record<Exclude<ManagerQueue,'all'|'decide'|'overThreshold'>,{label:string;short:string;tone:string;pending?:boolean}> = {
    qualify:{label:'À qualifier',short:'AQ',tone:'amber'},
    late:{label:'En retard',short:'SLA',tone:'red'},
    unassigned:{label:'Sans responsable',short:'SR',tone:'orange'},
    proof:{label:'Preuves à vérifier',short:'PV',tone:'blue'},
    reception:{label:'Réceptions',short:'RC',tone:'neutral',pending:!current.source?.managerQueueAvailability.reception},
    reservations:{label:'Réserves',short:'RS',tone:'neutral',pending:true},
    reopened:{label:'Dossiers rouverts',short:'RO',tone:'neutral',pending:!current.source?.managerQueueAvailability.reopened},
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
          }) : <div className="empty-state compact"><span>{queueMeta[tab as keyof typeof queueMeta]?.pending ? '⌁' : '✓'}</span><h3>{queueMeta[tab as keyof typeof queueMeta]?.pending ? current.live ? 'Circuit métier à activer' : 'Donnée non raccordée' : 'File à jour'}</h3><p>{tab === 'reservations' || !current.live ? 'La source métier canonique de cette file doit encore être raccordée.' : tab === 'reception' ? current.source?.managerQueueAvailability.reception ? 'Aucune réception d’intervention en attente.' : 'La réception des interventions n’est pas encore activée sur le serveur.' : tab === 'reopened' ? current.source?.managerQueueAvailability.reopened ? 'Aucun dossier rouvert à réexaminer.' : 'La réouverture des dossiers n’est pas encore activée sur le serveur.' : 'Aucune action dans cette catégorie.'}</p></div>}
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
          <div className="v">{current.live ? focus.antiZombieSummary?.nextAction ?? 'Action à définir' : focus.status === 'À qualifier' || focus.horsScore ? 'Qualifier et affecter' : !canonicalResponsible(focus) ? 'Réaffecter' : (focusAmount ?? 0) >= DECISION_THRESHOLD_FCFA ? 'Soumettre à l’Administration' : 'Valider'}</div>
          <div className={`due${focus.delayed ? ' is-late' : ''}`}>{focus.delayed ? 'En retard, ' : ''}{focus.due}{canonicalResponsible(focus) ? `, ${canonicalResponsible(focus)}` : ''}</div>
        </div>
        <div className="dossier-steps" aria-label="Avancement">
          {['Constat','Qualification','Décision','Intervention','Preuve','Clôture'].map((label, index) => {
            const now = focus.status === 'À qualifier' || focus.horsScore ? 2 : focus.status === 'Affectée' ? 3 : focus.status === 'En intervention' ? 4 : focus.status === 'En validation' ? 5 : 7;
            const state = index + 1 < now ? 'done' : index + 1 === now ? 'now' : '';
            return <div key={label} className={state}><i /><span>{label}</span></div>;
          })}
        </div>

        {current.live ? <div className="dossier-qualify"><p>Le dossier contient les actions autorisées, les preuves et le journal serveur.</p><Button onClick={()=>onOpen(focus.id)}>Traiter le dossier</Button></div> : focus.status === 'À qualifier' || focus.horsScore ? (
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
          {focus.id.startsWith('REQ-') ? <p className="hint">Notification hors score. Qualification requise avant toute branche de traitement.</p> : <AntiZombieSummary data={resolveAntiZombieSummary(focus)} variant="standard" hideMissing />}
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

function Detail({ anomaly, decision, decisionThreshold, persistenceMode, persistenceEnabled, offlineSync, onBack, onStatus, onProof, onConsultProof, onVerify, onReception, onReopen, onReviewReopened, onGe01Workflow, onOpenCosts, onRefresh, isManager, isAgent, readOnly = false, canReopen = false, canVerify = false, busy = false }: { anomaly:Anomaly; decision:Escalation|null; decisionThreshold:number; persistenceMode:'demo'|'server'; persistenceEnabled:boolean; offlineSync:ReturnType<typeof useOfflineSync>; onBack:()=>void; onStatus:(s:Status)=>void; onProof:(file:File)=>Promise<SyncStatusState>; onConsultProof:(proof:OperationalProof)=>Promise<string>; onVerify:(decision:'accepted'|'rejected',comment:string)=>Promise<boolean>; onReception:ReceptionHandler; onReopen:(reason:string,requestId:string)=>Promise<boolean>; onReviewReopened:(comment:string,requestId:string)=>Promise<boolean>; onGe01Workflow:Ge01WorkflowHandler; onOpenCosts:()=>void; onRefresh:()=>void; isManager:boolean; isAgent:boolean; readOnly?:boolean; canReopen?:boolean; canVerify?:boolean; busy?:boolean }) {
  const connectedPresentation = useContext(ConnectedPresentation);
  const nextStep:Partial<Record<Status,Status>> = { 'À qualifier':'Affectée', 'Affectée':'En intervention', 'En intervention':'En validation', 'En validation':'Clôturée' };
  const ge01Connected = anomaly.asset === 'GE-01' && persistenceMode === 'server';
  const reviewingReopened = persistenceMode === 'server' && isManager && anomaly.workflow?.actionCode === 'REVIEW_REOPENED_DOSSIER' && anomaly.workflow.actionAssignedToCurrentUser;
  const receiving = persistenceMode === 'server' && isManager && anomaly.workflow?.actionCode === 'RECEIVE_INTERVENTION' && anomaly.workflow.actionAssignedToCurrentUser;
  const reopenAvailable = canReopen && anomaly.status === 'Clôturée';
  const nextStatusOption = ge01Connected || reviewingReopened || receiving ? undefined : nextStep[anomaly.status];
  const [nextStatus, setNextStatus] = useState<Status>(nextStatusOption ?? anomaly.status);
  const [section, setSection] = useState<'overview'|'finance'|'evidence'|'history'>('overview');
  useEffect(() => {
    if (section === 'evidence') document.getElementById('dossier-evidence-panel')?.focus();
  }, [section]);
  const proofInput = useRef<HTMLInputElement>(null);
  const [pendingProof, setPendingProof] = useState<File|null>(null);
  const [proofTransferState, setProofTransferState] = useState<SyncStatusState>(persistenceMode === 'server' ? 'online-required' : 'demo-volatile');
  const [proofReviewDecision, setProofReviewDecision] = useState<'accepted'|'rejected'|null>(null);
  const [proofReviewComment, setProofReviewComment] = useState('');
  const [proofPreview, setProofPreview] = useState<{ proof:OperationalProof; url:string }|null>(null);
  const [proofPreviewLoading, setProofPreviewLoading] = useState<string|null>(null);
  const [proofPreviewError, setProofPreviewError] = useState('');
  const chooseProof = () => proofInput.current?.click();
  const submitProof = async (file:File) => {
    setPendingProof(file);
    setProofTransferState(persistenceMode === 'server' ? 'transmitting' : 'demo-volatile');
    const result = await onProof(file);
    setProofTransferState(result);
    if (result !== 'error') setPendingProof(null);
  };
  const submitProofReview = async () => {
    if (!proofReviewDecision || (proofReviewDecision === 'rejected' && !proofReviewComment.trim())) return;
    if (await onVerify(proofReviewDecision, proofReviewComment.trim())) {
      setProofReviewDecision(null);
      setProofReviewComment('');
    }
  };
  const consultProof = async (proof:OperationalProof) => {
    setProofPreviewLoading(proof.id);
    setProofPreviewError('');
    try {
      const url = await onConsultProof(proof);
      setProofPreview({ proof, url });
    } catch (error) {
      setProofPreview(null);
      setProofPreviewError(error instanceof Error ? error.message : 'Consultation de la preuve impossible.');
    } finally {
      setProofPreviewLoading(null);
    }
  };
  const workflow = ['Constat','Qualification','Décision','Intervention','Preuve','Clôture'];
  const statusStep:Record<Status,number> = { 'À qualifier':1, 'Affectée':2, 'En intervention':3, 'En validation':4, 'Clôturée':5 };
  const currentStep = ge01Connected && anomaly.status === 'Affectée' ? 3 : statusStep[anomaly.status];
  const decisionAmount = decision?.amount ?? null;
  const overThreshold = decisionAmount !== null && decisionAmount >= (decision?.thresholdAmount ?? decisionThreshold);
  const expectedProof = expectedProofFor(anomaly);
  const proofs = anomaly.proofs ?? [];
  const historyEvents = anomaly.history ?? [];
  const criticalClosureLocked = nextStatusOption === 'Clôturée' && anomaly.priority === 'Critique' && !anomaly.proof;
  const proofRequiresAttention = anomaly.proofPending || criticalClosureLocked;
  const primaryActionLabel = receiving ? 'Réceptionner l’intervention' : reviewingReopened ? 'Réexaminer le dossier' : reopenAvailable ? 'Rouvrir le dossier' : proofRequiresAttention ? 'Ouvrir les preuves' : overThreshold ? 'Examiner la décision financière' : nextStatusOption ? `Valider : ${nextStatus}` : 'Consulter les repères du dossier';
  const runPrimaryAction = () => {
    if(receiving){document.getElementById('dossier-reception-panel')?.scrollIntoView({behavior:'smooth',block:'center'});return;}
    if (reviewingReopened || reopenAvailable) { document.getElementById('dossier-reopen-panel')?.scrollIntoView({ behavior:'smooth', block:'center' }); return; }
    if (proofRequiresAttention) { setSection('evidence'); return; }
    if (overThreshold) { setSection('finance'); return; }
    if (nextStatusOption) { onStatus(nextStatus); return; }
    setSection('history');
  };
  return <>
    <input ref={proofInput} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" onChange={(event) => { const file = event.target.files?.[0]; if (file) void submitProof(file); event.currentTarget.value = ''; }} />
    <button className="back-button dossier-back" onClick={onBack}>← Retour à la file</button>
    <section className="dossier-hero"><div><div className="detail-labels"><Badge tone={priorityTone(anomaly.priority)}>{anomaly.priority}</Badge>{anomaly.delayed && anomaly.status !== 'Clôturée' && <Badge tone="critical">En retard</Badge>}{readOnly && !reopenAvailable && <Badge tone="neutral">CONSULTATION</Badge>}<span>{anomaly.id}</span></div><h2>{anomaly.title}</h2><p>{anomaly.asset} · {anomaly.location}</p></div>{!readOnly && nextStatusOption && <div className="detail-actions"><Select value={nextStatus} onChange={(event) => setNextStatus(event.target.value as Status)} aria-label="Étape suivante"><option value={nextStatusOption}>{nextStatusOption}</option></Select><Button type="submit" className="" disabled={busy || criticalClosureLocked} onClick={() => onStatus(nextStatus)}>{busy ? 'Enregistrement…' : criticalClosureLocked ? 'Preuve requise avant clôture' : 'Valider l’étape'}</Button></div>}</section>
    <section className="dossier-workflow" aria-label="Cycle du dossier">{workflow.map((item,index) => <div key={item} className={index < currentStep ? 'done' : index === currentStep ? 'current' : ''}><span>{index < currentStep ? <BrandIcon name="check" /> : index+1}</span><b>{item}</b></div>)}</section>
    <OfflineSyncStatus enabled={persistenceEnabled} online={offlineSync.online} running={offlineSync.running} counts={offlineSync.counts} latestIssue={offlineSync.latestIssue} latestRoundReceipt={offlineSync.latestRoundReceipt} onRetry={() => void offlineSync.retryFailed().then(() => offlineSync.synchronize())} />
    {anomaly.priority === 'Critique' && !anomaly.proof && <section className="critical-banner dossier-critical"><span><BrandIcon name="circleAlert" /></span><div><b>Clôture verrouillée jusqu’à l’acceptation de la preuve</b><p>{anomaly.proofPending ? 'Une preuve a été déposée et attend le contrôle de Facility Manager.' : anomaly.proofQueued ? 'Une preuve est protégée sur cet appareil et attend sa synchronisation.' : 'La matrice des preuves exige une pièce conforme avant clôture.'}</p></div>{!readOnly && !anomaly.proofPending && !anomaly.proofQueued && <button disabled={busy} onClick={chooseProof}><BrandIcon name="plus" /> Ajouter une preuve</button>}</section>}
    {receiving && <div id="dossier-reception-panel"><InterventionReceptionPanel summary={anomaly.interventionResult?.summary ?? ''} proofRequired={anomaly.asset==='GE-01'||anomaly.priority==='Critique'} proofAccepted={anomaly.proof} busy={busy} onSubmit={onReception} onOpenProofs={()=>setSection('evidence')} /></div>}
    {reopenAvailable && <div id="dossier-reopen-panel"><ReopenDossierPanel mode="reopen" busy={busy} onSubmit={onReopen} /></div>}
    {reviewingReopened && <div id="dossier-reopen-panel"><ReopenDossierPanel mode="review" busy={busy} onSubmit={onReviewReopened} /></div>}
    {ge01Connected && !reviewingReopened && !receiving && <Ge01WorkflowPanel key={`${anomaly.id}-${anomaly.workflow?.version}`} anomaly={anomaly} isManager={isManager} isAgent={isAgent} onSubmit={onGe01Workflow} onRefresh={onRefresh} onOpenProofs={() => setSection('evidence')} onOpenCosts={() => setSection('finance')} busy={busy} />}
    <div className="dossier-continuity"><AntiZombieSummary data={resolveAntiZombieSummary(anomaly)} variant="detailed" /></div>
    <nav className="dossier-tabs" aria-label="Sections du dossier" role="tablist"><button type="button" role="tab" aria-selected={section === 'overview'} aria-controls="dossier-overview-panel" className={section === 'overview' ? 'active' : ''} onClick={() => setSection('overview')}>Vue d’ensemble</button><button type="button" role="tab" aria-selected={section === 'finance'} aria-controls="dossier-finance-panel" className={section === 'finance' ? 'active' : ''} onClick={() => setSection('finance')}>Coûts & décision</button><button type="button" role="tab" aria-selected={section === 'evidence'} aria-controls="dossier-evidence-panel" className={section === 'evidence' ? 'active' : ''} onClick={() => setSection('evidence')}>Preuves <span>{proofs.length}</span></button><button type="button" role="tab" aria-selected={section === 'history'} aria-controls="dossier-history-panel" className={section === 'history' ? 'active' : ''} onClick={() => setSection('history')}>Historique</button></nav>

    {section === 'overview' && <section id="dossier-overview-panel" role="tabpanel" className="dossier-three-zone">
      <aside className="dossier-identity-column">
        <Card as="article" className="dossier-identity-card"><p className="design-kicker">IDENTITÉ & RISQUE</p><div className="identity-priority"><Badge tone={statusTone(anomaly.status)}>{anomaly.status}</Badge></div><dl><div><dt>Équipement</dt><dd>{anomaly.asset}</dd></div><div><dt>Zone</dt><dd>{anomaly.location}</dd></div><div><dt>Origine</dt><dd>{anomaly.asset === 'DEMO-EAU' ? 'Ronde Surpresseur quotidienne' : 'Constat terrain'}</dd></div><div><dt>Responsable interne actuel</dt><dd className={!canonicalResponsible(anomaly) ? 'missing-value' : ''}>{canonicalResponsible(anomaly) ?? 'Responsable non attribué'}</dd></div>{externalActorConcerned(anomaly) && <div><dt>Acteur externe concerné</dt><dd>{externalActorConcerned(anomaly)}</dd></div>}<div><dt>Constaté le</dt><dd>{anomaly.reported}</dd></div></dl></Card>
        <Card as="article" className="dossier-source-card"><span>R</span><div><b>Saisie directe</b><small>Source traçable · aucun import de reporting</small></div></Card>
      </aside>
      <div className="dossier-activity-column">
        <Card as="article" className="dossier-description"><div  className="panel-head"><div><p className="design-kicker">CONSTAT D’ORIGINE</p><h3>Situation observée</h3></div><span>{anomaly.reported}</span></div><p>{anomaly.description}</p></Card>
        <Card as="article" className="dossier-diagnostic-card"><div  className="panel-head"><div><p className="design-kicker">DIAGNOSTIC & INTERVENTION</p><h3>Progression métier</h3></div><Badge tone={statusTone(anomaly.status)}>{workflow[currentStep]}</Badge></div><div className="diagnostic-state"><span><BrandIcon name="activity" /></span><div><b>{anomaly.diagnosis ? 'Diagnostic enregistré' : 'Diagnostic technique attendu'}</b><p>{anomaly.diagnosis ?? 'Aucun diagnostic confirmé n’est disponible. Consultez l’historique pour les événements du dossier.'}</p></div></div></Card>
      </div>
      <aside className="dossier-decision-column">
        <Card as="article" className="next-step-card"><p className="design-kicker">ACTION PRINCIPALE</p><h3>{reopenAvailable ? 'Réouverture possible' : nextActionFor(anomaly)}</h3><p>{!canonicalResponsible(anomaly) ? 'Facility Manager doit d’abord attribuer un responsable interne autorisé.' : `Responsable interne actuel : ${canonicalResponsible(anomaly)}.`}</p>{externalActorConcerned(anomaly) && <small>Acteur externe concerné : {externalActorConcerned(anomaly)}</small>}{readOnly && !reopenAvailable ? <div className="next-step-read-only" role="note">Consultation uniquement · aucune action métier accordée</div> : <Button type="button" className="" disabled={busy} onClick={runPrimaryAction}>{busy ? 'Enregistrement…' : primaryActionLabel}</Button>}</Card>
        <Card as="article" className="recurrence-card"><div><span><BrandIcon name="refresh" /></span><p><b>Récurrence à confirmer</b><small>Historique insuffisant</small></p></div><p>Aucune récurrence n’est affirmée sans événements métier datés.</p></Card>
      </aside>
    </section>}

    {section === 'finance' && connectedPresentation.live && (isManager || readOnly) ? connectedPresentation.costs : null}
    {section === 'finance' && <section id="dossier-finance-panel" role="tabpanel" className="dossier-two-columns"><Card as="article" className="finance-decision-card"><div  className="panel-head"><div><p className="design-kicker">BRANCHE DE TRAITEMENT</p><h3>{decisionAmount === null ? 'Montant non renseigné' : anomaly.treatment ? 'Décision liée à l’intervention' : 'Décision financière enregistrée'}</h3></div><Badge tone={decisionAmount === null ? 'neutral' : decision?.state === 'Refusée' ? 'critical' : decision?.state === 'Approuvée' ? 'success' : 'orange'}>{decisionAmount === null ? 'DONNÉES INSUFFISANTES' : decision?.state === 'Approuvée' ? 'APPROUVÉE' : decision?.state === 'Refusée' ? 'REFUSÉE' : 'EN ATTENTE'}</Badge></div><div className="finance-amount"><span>{decision?.costReference ? `${decision.costReference} · Montant de décision` : 'Montant de décision'}</span><strong>{decisionAmount === null ? 'Non renseigné' : formatMoney(decisionAmount)}</strong><small>Seuil photographié : {formatMoney(decision?.thresholdAmount ?? decisionThreshold)}</small></div>{decisionAmount === null ? <div className="compact-insufficient-state"><b>Qualification financière incomplète</b><p>Aucun montant canonique n’est relié à ce dossier.</p></div> : <><div className={`authority-result ${decision?.state === 'Refusée' ? 'escalate' : overThreshold ? 'escalate' : 'delegated'}`}><span>{decision?.state === 'Refusée' ? <BrandIcon name="circleAlert" /> : overThreshold ? <BrandIcon name="chevronRight" /> : <BrandIcon name="check" />}</span><div><b>{decision?.state === 'Refusée' ? 'Décision refusée par l’Administration' : overThreshold ? 'Arbitrage de l’Administration' : 'Décision dans la délégation de Facility Manager'}</b><small>{decision?.state === 'À décider' ? 'Une décision motivée est encore attendue.' : decision?.motive ?? 'La décision et son seuil sont conservés dans l’historique du dossier.'}</small></div></div><div className="decision-audit"><span><b>Décision</b>{decision?.state ?? 'Non renseignée'}</span><span><b>Soumis par</b>{decision?.submittedBy ?? 'Non renseigné'}</span><span><b>Décidé par</b>{decision?.reviewedBy ?? (decision?.state === 'À décider' ? 'Administration attendue' : 'Non renseigné')}</span><span><b>Montant engagé</b>Non renseigné</span><span><b>Montant payé</b>Non renseigné</span></div></>}</Card><Card as="aside" className="quote-card"><p className="design-kicker">PIÈCES FINANCIÈRES</p><h3>Devis et engagement</h3>{(isManager || readOnly) && <Button variant="secondary" type="submit" className="" onClick={onOpenCosts}>Consulter toutes les décisions</Button>}<div className="quote-file"><span><BrandIcon name="files" /></span><p><b>Pièce financière non reliée</b><small>Données insuffisantes dans la source actuelle</small></p></div></Card></section>}

    {section === 'evidence' && <section id="dossier-evidence-panel" role="tabpanel" tabIndex={-1} className="dossier-two-columns">
      <Card as="article" className="evidence-panel">
        <div  className="panel-head"><div><h3>Preuves du dossier</h3><p>Fichiers privés consultables uniquement par les profils autorisés</p></div>{!readOnly && anomaly.status !== 'Clôturée' && !anomaly.proofPending && !anomaly.proofQueued && <Button type="submit" className="evidence-deposit-button" disabled={busy} onClick={chooseProof}>{proofs.some(proof => proof.verificationStatus === 'rejected') ? 'Déposer la preuve corrigée' : 'Déposer un justificatif'}</Button>}</div>
        {!readOnly && !anomaly.proof && !anomaly.proofPending && <SyncStatusNotice state={anomaly.proofQueued ? 'queued-local' : proofTransferState} compact label="État du dépôt de preuve" onRetry={proofTransferState === 'error' && pendingProof ? () => void submitProof(pendingProof) : undefined} />}
        {proofs.length > 0 && <div className="evidence-list" aria-label="Fichiers de preuve enregistrés">
          {proofs.map((proof) => <article key={proof.id} className="evidence-file evidence-file-record">
            <span aria-hidden="true">{proof.mimeType === 'application/pdf' ? 'PDF' : <BrandIcon name="files" />}</span>
            <div><b>{proof.reference || 'Preuve enregistrée'}</b><small>{proof.mimeType === 'application/pdf' ? 'Document PDF' : 'Image'} · {new Date(proof.capturedAt).toLocaleString('fr-FR')}</small>{proof.verificationStatus === 'rejected' && proof.rejectionReason && <em>Motif : {proof.rejectionReason}</em>}</div>
            <Badge tone={proof.verificationStatus === 'accepted' ? 'success' : proof.verificationStatus === 'rejected' ? 'critical' : 'orange'}>{proof.verificationStatus === 'accepted' ? 'ACCEPTÉE' : proof.verificationStatus === 'rejected' ? 'REFUSÉE' : 'À VALIDER'}</Badge>
            <Button variant="secondary" type="submit" className="evidence-consult-button" disabled={!proof.storagePath || proofPreviewLoading === proof.id} onClick={() => void consultProof(proof)}>{proofPreviewLoading === proof.id ? 'Ouverture…' : 'Consulter'}</Button>
          </article>)}
        </div>}
        {proofs.length === 0 && (anomaly.proof || anomaly.proofPending) && <div className="evidence-file"><span><BrandIcon name="files" /></span><div><b>{anomaly.proof ? 'Preuve acceptée' : 'Preuve reçue'}</b><small>Métadonnées de consultation indisponibles dans cette source</small></div><Badge tone={anomaly.proof ? 'success' : 'orange'}>{anomaly.proof ? 'ACCEPTÉE' : 'À VALIDER'}</Badge></div>}
        {anomaly.proofQueued && <div className="evidence-file"><span><BrandIcon name="cloudOff" /></span><div><b>Preuve protégée localement</b><small>En attente de synchronisation vers le stockage privé sécurisé</small></div><Badge tone="blue">EN FILE</Badge></div>}
        {proofs.length === 0 && !anomaly.proof && !anomaly.proofPending && !anomaly.proofQueued && <div className="proof-requirement"><span><BrandIcon name="activity" /></span><div><b>{expectedProof ?? 'Preuve attendue non définie'}</b><p>{expectedProof ? 'La clôture reste impossible tant que la pièce obligatoire n’est pas acceptée.' : 'Aucune règle de preuve canonique n’est raccordée à ce dossier.'}</p></div>{!readOnly && <Button type="submit" className="" onClick={chooseProof}>Déposer</Button>}</div>}
        {proofPreviewError && <div className="proof-preview-error" role="alert"><b>Consultation impossible</b><span>{proofPreviewError}</span></div>}
        {proofPreview && <section className="proof-preview" aria-label={`Aperçu de ${proofPreview.proof.reference}`}>
          <div className="proof-preview-head"><div><b>{proofPreview.proof.reference}</b><small>Lien privé temporaire · validité 5 minutes</small></div><Button variant="secondary" type="submit" className="" onClick={() => setProofPreview(null)}>Fermer l’aperçu</Button></div>
          {proofPreview.proof.mimeType?.startsWith('image/') ? <Image src={proofPreview.url} alt={`Preuve ${proofPreview.proof.reference}`} width={1200} height={800} unoptimized /> : <div className="proof-document-preview"><span>PDF</span><div><b>Document prêt à consulter</b><p>Le PDF s’ouvre dans un onglet sécurisé distinct.</p></div></div>}
          <a className="primary-button proof-open-link" href={proofPreview.url} target="_blank" rel="noreferrer">Ouvrir dans un nouvel onglet</a>
        </section>}
        {anomaly.proofPending && canVerify && !proofReviewDecision && <div className="proof-review-actions" aria-label="Décision sur la preuve"><button className="reject-action" disabled={busy} onClick={() => {setProofReviewDecision('rejected');setProofReviewComment('')}}>Refuser avec motif</button><Button type="submit" className="" disabled={busy} onClick={() => {setProofReviewDecision('accepted');setProofReviewComment('')}}>Accepter la preuve</Button></div>}
        {anomaly.proofPending && canVerify && proofReviewDecision && <div className={`proof-review-form is-${proofReviewDecision}`}><div><Badge tone={proofReviewDecision === 'accepted' ? 'success' : 'critical'}>{proofReviewDecision === 'accepted' ? 'ACCEPTATION' : 'REFUS'}</Badge><b>{proofReviewDecision === 'accepted' ? 'Confirmer la conformité de la preuve' : 'Motiver le refus de la preuve'}</b></div><Field label={null}>{proofReviewDecision === 'rejected' ? 'Motif obligatoire' : 'Commentaire facultatif'}<textarea autoFocus value={proofReviewComment} onChange={(event) => setProofReviewComment(event.target.value)} placeholder={proofReviewDecision === 'rejected' ? 'Indiquez ce qui manque ou ce qui doit être repris…' : 'Précision de contrôle éventuelle…'} /></Field><div className="modal-actions"><Button variant="secondary" type="submit" className="" disabled={busy} onClick={() => {setProofReviewDecision(null);setProofReviewComment('')}}>Annuler</Button><Button type="submit" className="" disabled={busy || (proofReviewDecision === 'rejected' && !proofReviewComment.trim())} onClick={() => void submitProofReview()}>{busy ? 'Enregistrement…' : proofReviewDecision === 'accepted' ? 'Confirmer l’acceptation' : 'Confirmer le refus'}</Button></div></div>}
      </Card>
      <Card as="aside" className="proof-matrix-card"><p className="design-kicker">EXIGENCE APPLIQUÉE</p><h3>{anomaly.asset}</h3>{expectedProof ? <ul><li><span><BrandIcon name="check" /></span>{expectedProof}</li></ul> : <div className="compact-insufficient-state"><b>Preuve attendue non définie</b><p>La règle contextuelle doit être confirmée avant d’afficher une matrice.</p></div>}</Card>
    </section>}

    {section === 'history' && <Card id="dossier-history-panel" role="tabpanel" as="section" className="dossier-history"><div  className="panel-head"><div><h3>Historique du dossier</h3><p>Événements métier canoniques, datés et attribués</p></div><span className="panel-count">{historyEvents.length} événement{historyEvents.length > 1 ? 's' : ''} canonique{historyEvents.length > 1 ? 's' : ''}</span></div>{historyEvents.length > 0 ? <div className="history-grid dossier-history-grid" aria-label="Événements métier du dossier">{historyEvents.map((event,index) => <article key={event.id} className={index === 0 ? 'current' : 'done'}><span aria-hidden="true">{index === 0 ? '•' : <BrandIcon name="check" />}</span><div className="history-event-copy"><b>{event.label}</b><small>{formatHistoryMoment(event.occurredAt)} · {event.actor ?? 'Auteur non renseigné'} · {event.stage ?? 'Étape non renseignée'}</small>{event.comment && <p>{event.comment}</p>}</div><em>{event.code}</em></article>)}</div> : <><div className="dossier-history-missing" role="note"><span><BrandIcon name="activity" /></span><div><b>Historique métier indisponible</b><p>Aucune source chargée ne fournit actuellement l’action, l’acteur, l’étape et l’horodatage complets. Les repères ci-dessous ne remplacent pas un journal métier.</p></div></div><div className="dossier-current-markers" aria-label="Repères disponibles hors historique"><article><span>R</span><div><b>Constat d’origine</b><small>{anomaly.reported} · auteur non renseigné</small></div><em>REPÈRE DOSSIER</em></article><article className="current"><span>{currentStep+1}</span><div><b>Étape actuelle : {anomaly.status}</b><small>Date et auteur de transition non disponibles</small></div><em>ÉTAT ACTUEL</em></article></div></>}</Card>}
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

function DesignEauReport() {
  const [submitted,setSubmitted] = useState(false);
  return <div className="rounds-page">
    <DemoScenarioSelect />
    <p className="visually-hidden">MODULE PILOTE · SURPRESSEUR</p>
    <EauRounds agentName="Agent Eau & Incendie Démo" draftNote="Brouillon temporaire dans cette page" onSubmit={() => setSubmitted(true)} />
    {submitted && <div className="prototype-success" role="status"><span>✓</span><div><b>Simulation de ronde terminée</b><small>Aucune donnée n’a été enregistrée dans Supabase ni mise en file hors ligne.</small></div><button onClick={() => setSubmitted(false)}>Continuer la revue</button></div>}
  </div>;
}

function Report({ isTest = false, persona, agentName, reports, connected, onNavigate, persistenceEnabled, offlineSync, flash, onReview, onRead, onLoadProof, planning, onAssign, onOpenAnomaly, onRefresh }: {
  isTest?:boolean;
  persona:Persona;
  agentName:string;
  reports:OperationalReport[];
  connected:boolean;
  onNavigate:(v:View)=>void;
  persistenceEnabled:boolean;
  offlineSync:ReturnType<typeof useOfflineSync>;
  flash:(message:string)=>void;
  onReview:Ge01ReviewHandler;
  planning?:Ge01Operations;
  onAssign:Ge01AssignmentHandler;
  onRead:(report:OperationalReport)=>Promise<void>;
  onLoadProof:(path:string)=>Promise<Blob>;
  onOpenAnomaly:(reference:string)=>void;
  onRefresh:()=>void;
}) {
  const current = useContext(ConnectedPresentation);
  const ria = <RiaRoundSpace manager={persona.id==='facility'} enabled={connected&&!isTest} offlineSync={offlineSync} onRefresh={onRefresh} onOpenAnomaly={onOpenAnomaly}/>;
  if (persona.id === 'facility') return <RiaRoundNavigation ria={ria}><Ge01ReportInbox reports={reports.filter(r=>r.equipmentCode==='GE-01')} connected={connected} onReview={onReview} onRead={onRead} onLoadProof={onLoadProof} planning={planning} onAssign={onAssign} onOpenAnomaly={onOpenAnomaly} onRefresh={onRefresh} /></RiaRoundNavigation>;
  if (persona.id === 'electricite') return <Ge01AgentForm equipment={current.health?.equipment.find(item => item.code === 'GE-01')} isTest={isTest} agentName={agentName} persistenceEnabled={persistenceEnabled} offlineSync={offlineSync} flash={flash} />;
  if (isTest) return <Card role="status">La saisie de recette est réservée au pilote GE-01.</Card>;
  if (persona.id === 'eau_incendie' && !connected) return <DesignEauReport />;
  if (persona.id === 'eau_incendie') return <RiaRoundNavigation existingLabel="WILO-01 · Eau" ria={ria}><LegacyReport persona={persona} onNavigate={onNavigate} persistenceEnabled={persistenceEnabled} offlineSync={offlineSync} flash={flash}/></RiaRoundNavigation>;
  return <LegacyReport persona={persona} onNavigate={onNavigate} persistenceEnabled={persistenceEnabled} offlineSync={offlineSync} flash={flash} />;
}


function readRoundReferences(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const result = value as Record<string, unknown>;
  const reportReference = typeof result.report_reference === 'string' ? result.report_reference : '';
  if (!reportReference) return null;
  return {
    isTest: result.is_test === true,
    reportReference,
    anomalyReference: typeof result.anomaly_reference === 'string' ? result.anomaly_reference : undefined,
  };
}

function mapOperationalCostDecision(item:OperationalCostDecision):Escalation {
  const state:DecisionState = item.approvalStatus === 'approved'
    ? 'Approuvée'
    : item.approvalStatus === 'rejected'
      ? 'Refusée'
      : item.approvalStatus === 'returned' ? 'Renvoyée à Facility Manager' : 'À décider';
  const due = item.reviewedAt
    ? `Décidée le ${new Date(item.reviewedAt).toLocaleString('fr-FR')}`
    : `Soumise le ${new Date(item.createdAt).toLocaleString('fr-FR')}`;
  return {
    id:item.id,
    costReference:item.id,
    replacesCostReference:item.replacesCostReference,
    replacedByCostReference:item.replacedByCostReference,
    anomaly:item.anomalyReference,
    asset:item.asset,
    title:item.title,
    kind:'Coût',
    amount:item.amount,
    due,
    risk:`${item.budgetType.toUpperCase()} · ${item.decisionScope === 'administration' ? 'Arbitrage Administration' : 'Délégation Facility Manager'}`,
    recommendation:item.title,
    state,
    motive:item.reviewComment ?? undefined,
    decisionScope:item.decisionScope,
    thresholdAmount:item.thresholdAmount,
    budgetType:item.budgetType,
    submittedBy:item.submittedBy,
    reviewedBy:item.reviewedBy,
  };
}

function ConnectedDataStatus({ state, environmentLabel, onRetry }: { state:OperationalDataState; environmentLabel:string; onRetry:()=>void }) {
  const loading = state === 'loading';
  return <section className="empty-state" role={loading ? 'status' : 'alert'} aria-live="polite">
    <span aria-hidden="true">{loading ? <BrandIcon name="refresh" /> : <BrandIcon name="circleAlert" />}</span>
    <h2>{loading ? 'Chargement des données métier' : 'Données métier indisponibles'}</h2>
    <p>{loading ? `La réponse de ${environmentLabel} est en cours de vérification.` : `La connexion à ${environmentLabel} a échoué. Aucune donnée de démonstration n’est affichée à sa place.`}</p>
    {!loading && <Button variant="secondary" onClick={onRetry}>Réessayer</Button>}
  </section>;
}

function adaptDemoDossierToAntiZombieSummary(anomaly:Anomaly):AntiZombieSummaryData {
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

function resolveAntiZombieSummary(anomaly:Anomaly):AntiZombieSummaryData {
  return anomaly.antiZombieSummary ?? adaptDemoDossierToAntiZombieSummary(anomaly);
}

function formatHistoryMoment(value:string) {
  return new Intl.DateTimeFormat('fr-FR', {
    day:'2-digit',
    month:'short',
    year:'numeric',
    hour:'2-digit',
    minute:'2-digit',
  }).format(new Date(value)).replace(',', ' ·');
}

type RoundDraft = {
  submissionId?:string;
  performedAt?:string;
  startedAfterReceiptId?:string;
  step:number;
  pressure:string;
  tankLevel:string;
  observation:string;
  checks:Record<string,boolean|null>;
  quickTitle:string;
  quickPriority:Priority;
  quickZone:string;
  quickControlType:string;
  confirmed:boolean;
  photoExceptionReason?:string;
};

function LegacyReport({ persona, onNavigate, persistenceEnabled, offlineSync, flash }: {
  persona:Persona;
  onNavigate:(v:View)=>void;
  persistenceEnabled:boolean;
  offlineSync:ReturnType<typeof useOfflineSync>;
  flash:(message:string)=>void;
}) {
  const { deleteDraft, enqueueRound, loadDraft, saveDraft } = offlineSync;
  const surpresseurAccess = persona.id === 'eau_incendie' || persona.id === 'facility';
  const isRoundsAssistance = persona.id === 'rondes_assistance';
  const draftId = `round:${persona.id}:${surpresseurAccess ? 'WILO-01' : isRoundsAssistance ? 'RND-LET' : 'GE-01'}`;
  const [photoExceptionReason,setPhotoExceptionReason]=useState('');
  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  useEffect(() => setFurthestStep(value => Math.max(value, step)), [step]);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submissionLockRef = useRef(false);
  const [submissionId, setSubmissionId] = useState('');
  const [performedAt, setPerformedAt] = useState('');
  const [startedAfterReceiptId, setStartedAfterReceiptId] = useState<string>();
  const [draftReady, setDraftReady] = useState(!persistenceEnabled);
  const [pressure, setPressure] = useState(persistenceEnabled ? '' : '2.8');
  const [tankLevel, setTankLevel] = useState(persistenceEnabled ? '' : '72');
  const [observation, setObservation] = useState(persistenceEnabled ? '' : surpresseurAccess ? 'Vibration légère sur la pompe P1 au démarrage.' : isRoundsAssistance ? 'Présence d’eau stagnante près de l’accès jardin nord.' : 'Mode AUTO confirmé. Tension batterie à contrôler au prochain démarrage.');
  const [quickTitle, setQuickTitle] = useState(persistenceEnabled ? '' : isRoundsAssistance ? 'Eau stagnante près de l’accès' : 'Tension batterie à contrôler');
  const [quickPriority, setQuickPriority] = useState<Priority>('Moyenne');
  const [quickZone, setQuickZone] = useState(isRoundsAssistance ? 'Jardin nord' : 'Local groupe électrogène');
  const [quickControlType, setQuickControlType] = useState(isRoundsAssistance ? 'Propreté & état' : 'Ronde préventive');
  const [confirmed, setConfirmed] = useState(!persistenceEnabled);
  const [checks, setChecks] = useState<Record<string,boolean|null>>(persistenceEnabled
    ? { auto:null, p1:null, p2:null, leak:null, valves:null, alarm:null }
    : { auto:true, p1:false, p2:true, leak:true, valves:true, alarm:true });
  const currentEquipmentCode = surpresseurAccess ? 'WILO-01' : isRoundsAssistance ? 'RND-LET' : 'GE-01';
  const latestReceiptMatchesEquipment = offlineSync.latestRoundReceipt?.equipmentCode === currentEquipmentCode;
  const explicitNewRoundAfterLatestReceipt = Boolean(
    offlineSync.latestRoundReceipt
      && startedAfterReceiptId === offlineSync.latestRoundReceipt.queueId
      && submissionId !== offlineSync.latestRoundReceipt.queueId,
  );
  const restoredRoundReceipt = latestReceiptMatchesEquipment && !explicitNewRoundAfterLatestReceipt ? offlineSync.latestRoundReceipt : null;
  const roundSubmitted = submitted || Boolean(restoredRoundReceipt);
  const setCheck = (key:string) => setChecks((items) => ({ ...items, [key]:items[key] === null ? true : !items[key] }));

  useEffect(() => {
    let cancelled = false;
    if (!persistenceEnabled) return;
    loadDraft<RoundDraft>(draftId).then((draft) => {
      if (cancelled) return;
      const value = draft?.value;
      setSubmissionId(value?.submissionId || crypto.randomUUID());
      setPerformedAt(value?.performedAt || new Date().toISOString());
      setStartedAfterReceiptId(value?.startedAfterReceiptId);
      if (!value) return;
      setPhotoExceptionReason(value.photoExceptionReason??''); setStep(value.step); setPressure(value.pressure); setTankLevel(value.tankLevel); setObservation(value.observation);
      setChecks(value.checks); setQuickTitle(value.quickTitle); setQuickPriority(value.quickPriority); setQuickZone(value.quickZone);
      setQuickControlType(value.quickControlType); setConfirmed(value.confirmed);
    }).catch(() => {
      if (cancelled) return;
      setSubmissionId(crypto.randomUUID());
      setPerformedAt(new Date().toISOString());
    }).finally(() => { if (!cancelled) setDraftReady(true); });
    return () => { cancelled = true; };
  }, [draftId, loadDraft, persistenceEnabled]);

  useEffect(() => {
    if (!persistenceEnabled || !draftReady || roundSubmitted || !submissionId || !performedAt) return;
    const timer = window.setTimeout(() => {
      if (submissionLockRef.current) return;
      void saveDraft<RoundDraft>(draftId, { submissionId, performedAt, startedAfterReceiptId, step, pressure, tankLevel, observation, checks, quickTitle, quickPriority, quickZone, quickControlType, confirmed, photoExceptionReason });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [photoExceptionReason, checks, confirmed, draftId, draftReady, observation, performedAt, persistenceEnabled, pressure, quickControlType, quickPriority, quickTitle, quickZone, roundSubmitted, saveDraft, startedAfterReceiptId, step, submissionId, tankLevel]);

  const syncedReferences = useMemo(() => {
    if (!submissionId || !offlineSync.lastRun) return null;
    const item = offlineSync.lastRun.syncedItems.find((entry) => entry.queueId === submissionId && entry.kind === 'field-round');
    if (!item || !item.serverResult || typeof item.serverResult !== 'object' || Array.isArray(item.serverResult)) return null;
    return readRoundReferences(item.serverResult);
  }, [offlineSync.lastRun, submissionId]);
  const displayedReferences = syncedReferences ?? (restoredRoundReceipt ? {
    reportReference:restoredRoundReceipt.reportReference,
    anomalyReference:restoredRoundReceipt.anomalyReference,
  } : null);

  useEffect(() => {
    if (!persistenceEnabled || !restoredRoundReceipt) return;
    void deleteDraft(draftId);
  }, [deleteDraft, draftId, persistenceEnabled, restoredRoundReceipt]);

  const finalizeQueuedRound = async () => {
    await deleteDraft(draftId);
    setSubmitted(true);
    setSubmitting(false);
    flash(offlineSync.online ? 'Ronde mise en file ; synchronisation lancée.' : 'Ronde protégée sur cet appareil ; synchronisation automatique au retour du réseau.');
  };

  const submitQuickRound = async (event:FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submissionLockRef.current || roundSubmitted) return;
    if(!photoExceptionReason.trim()){flash('Indiquez le motif d’absence de photo à ce stade du signalement.');return;}
    submissionLockRef.current = true;
    setSubmitting(true);
    if (!persistenceEnabled) { setSubmitted(true); setSubmitting(false); return; }
    if (!submissionId || !performedAt) {
      submissionLockRef.current = false;
      setSubmitting(false);
      flash('La ronde n’est pas encore prête. Patientez un instant puis réessayez.');
      return;
    }
    try {
      await enqueueRound({
        equipmentCode:isRoundsAssistance ? 'RND-LET' : 'GE-01',
        reportType:isRoundsAssistance ? 'cleaning_gardening_round' : 'technical_round',
        performedAt,
        summary:observation.trim(),
        checks:[
          { code:'TYPE_CONTROLE', label:'Type de contrôle', status:'ok', valueText:quickControlType, notes:`Zone déclarée : ${quickZone}` },
          {code:'PHOTO_EXCEPTION',label:'Motif d’impossibilité de photo',status:'ok',valueText:photoExceptionReason.trim()},
          { code:'CONSTAT_TERRAIN', label:'Constat terrain', status:'alert', valueText:observation.trim() },
        ],
        anomaly:{ title:quickTitle.trim(), description:observation.trim(), priority:quickPriority },
      }, submissionId);
      await finalizeQueuedRound();
    } catch (error) {
      submissionLockRef.current = false;
      setSubmitting(false);
      flash(`Ronde non mise en file : ${error instanceof Error ? error.message : 'stockage local indisponible'}.`);
    }
  };

  const steps = ['Contexte','Pression','Pompes','Sécurité','Synthèse'];
  const pressureValue = Number(pressure.replace(',','.'));
  const tankValue = Number(tankLevel.replace(',','.'));
  const hasPressureAlert = pressure.trim() !== '' && Number.isFinite(pressureValue) && pressureValue < 3;
  const completedChecks = Object.values(checks).filter((value) => value === true).length;
  const reviewedChecks = Object.values(checks).filter((value) => value !== null).length;
  const hasTankAlert=tankLevel.trim()!==''&&Number.isFinite(tankValue)&&(tankValue<40||tankValue>100);
  const hasCheckAlert = Object.values(checks).some((value) => value === false);
  const incompleteRound = pressure.trim() === '' || tankLevel.trim() === '' || !Number.isFinite(pressureValue) || !Number.isFinite(tankValue) || reviewedChecks < 6;

  const submitSurpresseurRound = async () => {
    if (submissionLockRef.current || roundSubmitted) return;
    if((hasPressureAlert||hasCheckAlert||hasTankAlert)&&!photoExceptionReason.trim()){flash('Indiquez le motif d’absence de photo ; vous pourrez joindre une preuve au dossier après synchronisation.');return;}
    if (incompleteRound || !confirmed) {
      flash('Complétez les deux mesures, les six contrôles et la confirmation avant l’envoi.');
      return;
    }
    submissionLockRef.current = true;
    setSubmitting(true);
    if (!persistenceEnabled) { setSubmitted(true); setSubmitting(false); return; }
    if (!submissionId || !performedAt) {
      submissionLockRef.current = false;
      setSubmitting(false);
      flash('La ronde n’est pas encore prête. Patientez un instant puis réessayez.');
      return;
    }
    const anomalyTitle = hasPressureAlert ? 'Pression Wilo sous le seuil attendu' : hasCheckAlert||hasTankAlert ? 'Écart constaté pendant la ronde WILO-01' : undefined;
    try {
      await enqueueRound({
        equipmentCode:'WILO-01',
        reportType:'wilo_round',
        performedAt,
        summary:observation.trim(),
        checks:[
          ...(photoExceptionReason.trim()?[{code:'PHOTO_EXCEPTION',label:'Motif d’impossibilité de photo',status:'ok' as const,valueText:photoExceptionReason.trim()}]:[]),
          { code:'PRESSION_RESEAU', label:'Pression réseau', status:hasPressureAlert ? 'alert' : 'ok', valueNumeric:pressureValue, unit:'bar' },
          { code:'NIVEAU_BACHE', label:'Niveau de bâche', status:tankValue >= 40 && tankValue <= 100 ? 'ok' : 'alert', valueNumeric:tankValue, unit:'%' },
          ...[['auto','Mode automatique actif'],['p1','Pompe P1 disponible'],['p2','Pompe P2 disponible'],['leak','Absence de fuite active'],['valves','Vannes en position normale'],['alarm','Aucune alarme active']].map(([code,label]) => ({ code:code.toUpperCase(), label, status:checks[code] ? 'ok' as const : 'alert' as const, valueBoolean:Boolean(checks[code]) })),
        ],
        ...(anomalyTitle ? { anomaly:{ title:anomalyTitle, description:observation.trim() || 'Écart relevé pendant la ronde WILO-01.', priority:hasPressureAlert || checks.p1 === false ? 'Haute' as const : 'Moyenne' as const } } : {}),
      }, submissionId);
      await finalizeQueuedRound();
    } catch (error) {
      submissionLockRef.current = false;
      setSubmitting(false);
      flash(`Ronde non mise en file : ${error instanceof Error ? error.message : 'stockage local indisponible'}.`);
    }
  };

  const startNextRound = () => {
    submissionLockRef.current = false;
    setSubmitting(false);
    setSubmitted(false);
    if (!persistenceEnabled) return;
    const nextSubmissionId = crypto.randomUUID();
    const nextPerformedAt = new Date().toISOString();
    const nextStartedAfterReceiptId = offlineSync.latestRoundReceipt?.queueId;
    setSubmissionId(nextSubmissionId);
    setPerformedAt(nextPerformedAt);
    setStartedAfterReceiptId(nextStartedAfterReceiptId);
    setStep(0); setFurthestStep(0);
    setPressure('');
    setTankLevel('');
    setObservation(''); setPhotoExceptionReason('');
    setChecks({ auto:null, p1:null, p2:null, leak:null, valves:null, alarm:null });
    setConfirmed(false);
    void saveDraft<RoundDraft>(draftId, {
      submissionId:nextSubmissionId,
      performedAt:nextPerformedAt,
      startedAfterReceiptId:nextStartedAfterReceiptId,
      step:0,
      pressure:'',
      tankLevel:'',
      observation:'',
      checks:{ auto:null, p1:null, p2:null, leak:null, valves:null, alarm:null },
      quickTitle:'',
      quickPriority,
      quickZone,
      quickControlType,
      confirmed:false,
    });
  };

  if (!surpresseurAccess) return <>
    <section className="section-heading round-heading"><div><p className="design-kicker">SAISIE DIRECTE · {persistenceEnabled ? 'EN LIGNE' : 'DÉMONSTRATION'}</p><h2 className="visually-hidden">Rondes</h2><p>{isRoundsAssistance ? 'Ronde cleaning & jardinage' : 'Ronde technique'} : un constat terrain est enregistré dans l’application puis transmis à Facility Manager pour qualification.</p></div><Badge tone="blue">Aucun import</Badge></section>
    <OfflineSyncStatus enabled={persistenceEnabled} online={offlineSync.online} running={offlineSync.running} counts={offlineSync.counts} latestIssue={offlineSync.latestIssue} latestRoundReceipt={offlineSync.latestRoundReceipt} onRetry={() => void offlineSync.retryFailed().then(() => offlineSync.synchronize())} />
    <section className="quick-round-layout">
      <form className="panel quick-round-card" onSubmit={(event) => void submitQuickRound(event)}>
        <div className="round-card-head"><span className="round-icon">{isRoundsAssistance ? 'R' : 'GE'}</span><div><b>{isRoundsAssistance ? 'RND-LET' : 'GE-01'}</b><small>{isRoundsAssistance ? 'Périmètre cleaning et jardinage' : 'Périmètre électrique autorisé'}</small></div><span className="mockup-label">{persistenceEnabled ? 'SAISIE RÉELLE' : 'DÉMO'}</span></div>
        <div className="two-fields"><Field label={null}>Zone<Select value={quickZone} onChange={(event) => setQuickZone(event.target.value)}><option>{isRoundsAssistance ? 'Jardin nord' : 'Local groupe électrogène'}</option><option>{isRoundsAssistance ? 'Atrium restaurant' : 'Local TGBT'}</option></Select></Field><Field label={null}>Type de contrôle<Select value={quickControlType} onChange={(event) => setQuickControlType(event.target.value)}><option>{isRoundsAssistance ? 'Propreté & état' : 'Ronde préventive'}</option><option>{isRoundsAssistance ? 'Jardinage' : 'Constat incident'}</option></Select></Field></div>
        <div className="two-fields"><Field label={null}>Intitulé court<input required value={quickTitle} onChange={(event) => setQuickTitle(event.target.value)} placeholder="Décrivez le problème en quelques mots" /></Field><Field label={null}>Priorité proposée<Select value={quickPriority} onChange={(event) => setQuickPriority(event.target.value as Priority)}><option>Critique</option><option>Haute</option><option>Moyenne</option><option>Normale</option><option>Faible</option></Select></Field></div>
        <Field label={null}>Constat<textarea required value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Décrivez uniquement ce qui a été observé sur le terrain." /></Field>
        <p>La photo du constat peut être jointe au dossier après synchronisation.</p><Field label="Photo non jointe — motif obligatoire"><textarea required maxLength={2000} value={photoExceptionReason} onChange={e=>setPhotoExceptionReason(e.target.value)}/></Field>
        <div className="round-submit"><p><span className={`status-dot ${persistenceEnabled && offlineSync.online ? 'online' : 'local'}`} /> {persistenceEnabled ? draftReady ? 'Brouillon enregistré automatiquement sur cet appareil' : 'Chargement du brouillon local…' : 'Simulation sans écriture serveur'}</p><Button className="" type="submit" disabled={!draftReady || submitting || roundSubmitted} aria-busy={submitting}>{submitting ? 'Transmission…' : roundSubmitted ? 'Déjà transmis' : 'Transmettre à Facility Manager'}</Button></div>
      </form>
      <Card as="aside" className="direct-flow-card"><p className="design-kicker">APRÈS L’ENVOI</p><h3>Un circuit court et lisible</h3>{['Constat enregistré','Qualification par Facility Manager','Affectation et échéance','Traitement avec preuve'].map((item,index) => <div key={item}><span>{index+1}</span><p><b>{item}</b><small>{index === 0 ? 'Vous gardez une trace immédiate' : 'Le dossier avance dans le même outil'}</small></p></div>)}</Card>
    </section>
    {roundSubmitted && <div className="prototype-success" role="status"><span><BrandIcon name="check" /></span><div><b>{persistenceEnabled ? displayedReferences?.anomalyReference ? `Constat ${displayedReferences.anomalyReference} transmis` : 'Constat placé dans la file de synchronisation' : 'Simulation de constat terminée'}</b><small>{persistenceEnabled ? displayedReferences?.reportReference ? `Ronde ${displayedReferences.reportReference} enregistrée · un nouvel envoi réutilise le même identifiant.` : 'Un seul envoi est autorisé ; la référence apparaîtra après synchronisation.' : 'Aucune donnée n’a été enregistrée ou transmise.'}</small></div><button onClick={() => onNavigate('workspace')}>Retour à mon espace</button></div>}
  </>;

  return <>
    <p className="visually-hidden">MODULE PILOTE · SURPRESSEUR</p>
    <RoundPilotHeader
      title={`${displayAssetCode('DEMO-EAU')} · Ronde quotidienne du surpresseur`}
      subtitle="Cinq étapes · fréquence quotidienne"
      badge={<span className="mockup-label">{persistenceEnabled ? "Saisie terrain" : "Maquette"}</span>}
    />

    <OfflineSyncStatus enabled={persistenceEnabled} online={offlineSync.online} running={offlineSync.running} counts={offlineSync.counts} latestIssue={offlineSync.latestIssue} latestRoundReceipt={offlineSync.latestRoundReceipt} onRetry={() => void offlineSync.retryFailed().then(() => offlineSync.synchronize())} />

    <section className="surpresseur-progress connected-round-progress" aria-label="Progression de la ronde">
      {steps.map((item,index) => <button key={item} className={index === step ? 'active' : index < step ? 'done' : ''} disabled={index > Math.max(step, furthestStep)} aria-current={index === step ? 'step' : undefined} onClick={() => setStep(index)}><span>{index < step ? '✓' : index+1}</span><b>{item}</b></button>)}
    </section>

    <section className="surpresseur-layout">
      <Card as="article" className="surpresseur-form-card">
        <div className="surpresseur-section-head"><div><span>ÉTAPE {step+1} SUR 5</span><h3>{steps[step]}</h3></div><span className="mockup-label">{persistenceEnabled ? 'SAISIE RÉELLE' : 'DÉMO INTERACTIVE'}</span></div>
        {step === 0 && <div className="surpresseur-fields"><div className="context-grid"><div><span>Agent</span><b>{persona.name}</b><small>{persona.role}</small></div><div><span>Horodatage</span><b>Heure d’Abidjan</b><small>Date et heure conservées</small></div><div><span>Synchronisation</span><b>{offlineSync.online ? 'Réseau disponible' : 'Hors ligne'}</b><small>{persistenceEnabled ? 'File idempotente active' : 'Démonstration'}</small></div></div><RoundDateTimeFields value={performedAt} onChange={setPerformedAt}/><Field label={null}>Type de ronde<Select defaultValue=""><option value="">À renseigner</option><option>Quotidienne</option><option>Après intervention</option><option>Contrôle exceptionnel</option></Select></Field><div className="surpresseur-callout"><span><BrandIcon name="info" /></span><p><b>{persistenceEnabled ? 'Contrôle terrain' : 'Point d’attention transmis'}</b><small>{persistenceEnabled ? 'Vérifiez les pompes et relevez la pression observée. Ne déclarez que les écarts constatés.' : 'Vérifier la récidive du défaut pompe P1 et la pression de refoulement.'}</small></p></div></div>}
        {step === 1 && <div className="surpresseur-fields"><div className="measure-grid"><label><span>Pression réseau</span><div><input required value={pressure} inputMode="decimal" onChange={(event) => setPressure(event.target.value)} /><b>bar</b></div><small>Plage attendue : 3,0 à 4,5 bar</small></label><label><span>Niveau bâche</span><div><input required value={tankLevel} inputMode="numeric" onChange={(event) => setTankLevel(event.target.value)} /><b>%</b></div><small>Plage de contrôle : 40 à 100 %</small></label></div><div className="measure-range-grid"><MeasureRange label="Pression réseau" value={pressure.trim() === '' ? Number.NaN : pressureValue} min={3} max={4.5} unit="bar" /><MeasureRange label="Niveau de bâche" value={tankLevel.trim() === '' ? Number.NaN : tankValue} min={40} max={100} unit="%" /></div>{hasPressureAlert && <div className="measure-alert"><span><BrandIcon name="circleAlert" /></span><div><b>Écart détecté automatiquement</b><small>La pression saisie est inférieure au seuil. Un constat sera proposé à Facility Manager.</small></div></div>}<Field label={null}>Stabilité du manomètre<Select defaultValue=""><option value="">À contrôler</option><option>Stable</option><option>Oscillation légère</option><option>Oscillation importante</option></Select></Field></div>}
        {step === 2 && <div className="surpresseur-fields"><div className="check-grid">{[['auto','Mode automatique actif','Commande générale'],['p1','Pompe P1 disponible','Pompe prioritaire'],['p2','Pompe P2 disponible','Pompe de secours'],['leak','Absence de fuite active','Collecteur et raccords']].map(([key,title,detail]) => <button type="button" key={key} className={checks[key] === null ? 'unreviewed' : checks[key] ? 'checked' : 'unchecked'} onClick={() => setCheck(key)}><span>{checks[key] === null ? <BrandIcon name="circleAlert" /> : checks[key] ? <BrandIcon name="check" /> : <BrandIcon name="circleAlert" />}</span><p><b>{title}</b><small>{detail}</small></p><em>{checks[key] === null ? 'À contrôler' : checks[key] ? 'Conforme' : 'À signaler'}</em></button>)}</div></div>}
        {step === 3 && <div className="surpresseur-fields"><div className="check-grid compact">{[['valves','Vannes en position normale','Aspiration et refoulement'],['alarm','Aucune alarme active','Coffret et supervision']].map(([key,title,detail]) => <button type="button" key={key} className={checks[key] === null ? 'unreviewed' : checks[key] ? 'checked' : 'unchecked'} onClick={() => setCheck(key)}><span>{checks[key] === null ? <BrandIcon name="circleAlert" /> : checks[key] ? <BrandIcon name="check" /> : <BrandIcon name="circleAlert" />}</span><p><b>{title}</b><small>{detail}</small></p><em>{checks[key] === null ? 'À contrôler' : checks[key] ? 'Conforme' : 'À signaler'}</em></button>)}</div><Field label={null}>Observation terrain<textarea value={observation} onChange={(event) => setObservation(event.target.value)} placeholder="Observation factuelle ou précision sur un écart." /></Field>{(hasPressureAlert||hasCheckAlert||hasTankAlert)?<><p>La photo du constat peut être jointe au dossier après synchronisation.</p><Field label="Photo non jointe — motif obligatoire"><textarea maxLength={2000} value={photoExceptionReason} onChange={e=>setPhotoExceptionReason(e.target.value)}/></Field></>:<p>Aucune photo requise sans anomalie.</p>}</div>}
        {step === 4 && <div className="surpresseur-fields"><div className="round-summary"><div><span>MESURES</span><b className={hasPressureAlert ? 'warning' : ''}>{pressure.trim() ? `${pressure} bar` : 'Valeur non renseignée'}</b><small>{pressure.trim() ? 'Pression réseau' : 'À COMPLÉTER'}</small></div><div><span>NIVEAU</span><b>{tankLevel.trim() ? `${tankLevel} %` : 'Valeur non renseignée'}</b><small>{tankLevel.trim() ? 'Bâche de stockage' : 'À COMPLÉTER'}</small></div><div><span>CONTRÔLES</span><b>{completedChecks}/6</b><small>{reviewedChecks}/6 vérifiés</small></div></div>{incompleteRound ? <div className="surpresseur-callout"><span><BrandIcon name="info" /></span><p><b>Contrôle incomplet</b><small>Renseignez les deux mesures et les six contrôles avant de conclure.</small></p></div> : (hasPressureAlert || hasCheckAlert) ? <div className="proposed-finding"><span><BrandIcon name="circleAlert" /></span><div><p>CONSTAT PROPOSÉ</p><h4>{hasPressureAlert ? 'Pression Wilo sous le seuil attendu' : 'Écart constaté pendant la ronde'}</h4><small>Priorité proposée : {hasPressureAlert || checks.p1 === false ? 'Haute' : 'Moyenne'} · Transmission à Facility Manager.</small></div><Badge tone="orange">À QUALIFIER</Badge></div> : <div className="surpresseur-callout"><span><BrandIcon name="check" /></span><p><b>Aucun écart déclaré</b><small>La ronde sera conservée sans créer d’anomalie.</small></p></div>}<label className="confirmation-line"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} /><span>Je confirme que les valeurs correspondent à la ronde réalisée sur WILO-01.</span></label></div>}
        <div className="surpresseur-actions"><Button variant="secondary" type="submit" className="" disabled={step === 0 || submitting || roundSubmitted} onClick={() => setStep((value) => Math.max(0,value-1))}>← Précédent</Button><p><span className={`status-dot ${persistenceEnabled && offlineSync.online ? 'online' : 'local'}`} /> {persistenceEnabled ? draftReady ? 'Brouillon local automatique' : 'Chargement du brouillon…' : 'Simulation locale'}</p>{step < 4 ? <Button type="submit" className="" disabled={submitting || roundSubmitted} onClick={() => setStep((value) => Math.min(4,value+1))}>Continuer →</Button> : <Button type="submit" className="" disabled={!draftReady || submitting || roundSubmitted} aria-busy={submitting} onClick={() => void submitSurpresseurRound()}>{submitting ? 'Transmission…' : roundSubmitted ? 'Ronde transmise' : 'Terminer la ronde'}</Button>}</div>
      </Card>
      <aside className="surpresseur-aside">
        <Card as="article" className="next-action-card"><p className="design-kicker">À SURVEILLER</p><span className="next-action-icon"><BrandIcon name="circleAlert" /></span><h3>{persistenceEnabled ? 'Réarmement provisoire' : 'Pompe P1 indisponible'}</h3><p>{persistenceEnabled ? 'Un réarmement ne suffit pas à clôturer une anomalie. Le diagnostic et la preuve restent nécessaires.' : 'Deuxième défaut en sept jours. Le réarmement provisoire ne permet pas la clôture.'}</p>{!persistenceEnabled && <div><span>Responsable pressenti</span><b>Agent Eau & Incendie</b></div>}</Card>
        <Card as="article" className="score-explain-card"><div><span>SCORE WILO</span><b>Indisponible</b></div><div className="score-freshness"><span><b>État</b>À confirmer</span><span><b>Variation</b>Indisponible</span><span><b>Fraîcheur</b>Indisponible</span></div><ul><li><i /> Méthode de calcul <b>À valider</b></li><li><i /> Période observée <b>Non définie</b></li><li><i /> Données sources <b>Insuffisantes</b></li></ul><p className="analytics-note">Aucune valeur de score n’est affichée avant validation de la méthode et de ses données sources.</p></Card>
      </aside>
    </section>
    {roundSubmitted && <div className="prototype-success" role="status"><span><BrandIcon name="check" /></span><div><b>{persistenceEnabled ? displayedReferences?.reportReference ? `Ronde ${displayedReferences.reportReference} synchronisée` : 'Ronde placée dans la file de synchronisation' : 'Simulation de ronde terminée'}</b><small>{persistenceEnabled ? displayedReferences?.anomalyReference ? `Constat ${displayedReferences.anomalyReference} transmis à Facility Manager.` : displayedReferences?.reportReference ? 'Ronde enregistrée sans constat séparé.' : 'Un seul envoi est autorisé ; la référence apparaîtra après synchronisation.' : 'Aucune donnée n’a été enregistrée sur le serveur.'}</small></div><button onClick={startNextRound}>Nouvelle ronde</button></div>}
  </>;
}
