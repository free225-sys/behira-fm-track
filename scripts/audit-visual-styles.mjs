import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = await readFile(path.join(root, 'app', 'globals.css'), 'utf8')
const page = await readFile(path.join(root, 'app', 'page.tsx'), 'utf8')
const workflow = await readFile(path.join(root, 'app', 'components', 'WorkflowAnalytics.tsx'), 'utf8')
const specimen = await readFile(path.join(root, 'app', 'design-system', 'page.tsx'), 'utf8')
const badge = await readFile(path.join(root, 'app', 'components', 'ui', 'badge.tsx'), 'utf8')
const equipmentWorkspace = await readFile(path.join(root, 'app', 'components', 'EquipmentWorkspace.tsx'), 'utf8')
const costsWorkspace = await readFile(path.join(root, 'app', 'components', 'CostsWorkspace.tsx'), 'utf8')
const accessWorkspace = await readFile(path.join(root, 'app', 'components', 'AccessWorkspace.tsx'), 'utf8')
const parametersWorkspace = await readFile(path.join(root, 'app', 'components', 'ParametersWorkspace.tsx'), 'utf8')

const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, '')
const rules = [...cssWithoutComments.matchAll(/([^{}]+)\{([^{}]+)\}/g)].map((match, order) => ({
  selectors: match[1].split(',').map((selector) => selector.trim()),
  declarations: match[2],
  order,
}))

const finalDeclaration = (selector, property) => {
  const candidates = rules.filter((rule) => rule.selectors.includes(selector) && new RegExp(`${property}\\s*:`).test(rule.declarations))
  const last = candidates.at(-1)
  return last?.declarations.match(new RegExp(`${property}\\s*:\\s*([^;}]+)`))?.[1]?.trim() ?? ''
}

const checks = [
  ['Focus unique 2 px', css.includes('outline:2px solid var(--focus-ring)') && !css.includes('outline:3px solid #f3a33d')],
  ['Focus limité à la navigation clavier', css.includes('.keyboard-nav button:focus-visible') && page.includes("root.classList.add('keyboard-nav')") && page.includes("root.classList.remove('keyboard-nav')")],
  ['Déclencheur persona sans anneau interne', !/\.persona-trigger:hover[^{}]*\{[^{}]*box-shadow/.test(css)],
  ['Carte Direction sans double signal', finalDeclaration('.direction-case-card.active', 'box-shadow') !== 'inset 3px 0 0 var(--brand)'],
  ['Escalade Facility Manager sans double signal', !css.includes('box-shadow:inset 3px 0 0 var(--orange)')],
  ['Champ focalisé sans anneau CSS interne', finalDeclaration('.field input:focus', 'box-shadow') === 'none' && finalDeclaration('.field textarea:focus', 'box-shadow') === 'none'],
  ['Timeline active sans halo additionnel', finalDeclaration('.detail-timeline .current>span', 'box-shadow') === 'none'],
  ['Titre global alimenté par le catalogue canonique', page.includes("const pageTitle = view === 'detail' ? selected.id : currentNavigationItem.label") && page.includes('<div className="topbar-title"><h1>{pageTitle}</h1><p>{pageSubtitle}</p></div>') && !page.includes('mobilePageTitle')],
  ['Réserve navigation mobile présente', css.includes('.main-column{padding-bottom:92px}')],
  ['Grille du registre partagée', css.includes('.registry-head,.registry-row{grid-template-columns:var(--registry-columns)}')],
  ['Repli du registre avec responsable', css.includes('.registry-head{display:none}') && css.includes('.registry-row>.owner-cell{display:none}') && css.includes('.registry-mobile-details{grid-column:1;grid-row:3;display:grid') && page.includes('<b>Responsable interne</b>')],
  ['Continuité du traitement au plancher 12 px', finalDeclaration('.registry-entry:not(.is-expanded) .registry-summary-toggle', 'font-size') === 'var(--font-size-label)'],
  ['Titres tronqués proprement', css.includes('.topbar h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}')],
  ['Références équipement insécables', page.includes('className="equipment-reference"') && css.includes('.equipment-reference{white-space:nowrap;word-break:keep-all;overflow-wrap:normal}')],
  ['Shell sans rail latéral résiduel', page.includes('className="app-navigation"') && !page.includes('className="sidebar"') && !css.includes('.sidebar')],
  ['Navigation unique et état courant accessible', page.includes('const navItems: NavigationItem[]') && page.includes('className="primary-navigation"') && page.includes("aria-current={active ? 'page' : undefined}")],
  ['Nomenclature principale DEC-008 stable', ['Accueil','À traiter','Rondes','Registre','Pilotage'].every((label) => page.includes(`label:'${label}'`)) && !page.includes('navigationLabel =')],
  ['Logo renvoyant vers Accueil', page.includes("className=\"brand\" onClick={() => navigate('workspace')}")],
  ['CTA de ronde limité à l’Accueil autorisé', page.includes("const showRoundCta = view === 'workspace' && canStartRound") && !page.includes("personaId !== 'administration' && <button className=\"primary-button top-create\"")],
  ['En-tête de page sur surface claire', css.includes('.topbar { min-height:56px; padding:10px clamp(24px,4vw,54px); background:var(--surface);') && !css.includes('background:#16345a')],
  ['Accueil sans titre jumeau', page.includes('function WorkspaceIntro({ kicker, description, badge }') && !page.includes('<h2>{title}</h2>') && !page.includes('Bonjour Facility Manager')],
  ['Hero À traiter sans second titre', page.includes('aria-label="Contexte opérationnel"') && !page.includes('id="manager-operational-title"') && !page.includes('Dossiers à traiter')],
  ['Landing Facility Manager sur À traiter', page.includes("facility:'manager'")],
  ['Hero Facility Manager sans bande navy collée', !css.includes('border-top:1px solid #21456f;border-radius:0;background:#16345a;color:white')],
  ['Menu Plus prêt pour le catalogue groupé', page.includes("const navigationGroups: NavigationGroup[] = ['Mon travail','Le bâtiment','Pilotage','Administration']") && page.includes('overflowIsActive ? \'active\'') && page.includes("aria-current={overflowIsActive ? 'page' : undefined}") && page.includes('groupItems = overflowNav.filter') && page.includes("event.key === 'ArrowDown' || event.key === 'ArrowUp'") && page.includes('moreNavTriggerRef.current?.focus()')],
  ['Environnement de démonstration visible', page.includes('className="persona-mode-label"') && page.includes('Mode démonstration') && !css.includes('.persona-mode-label{display:none}')],
  ['Triplets sémantiques déclarés', ['success','warning','danger','info','neutral'].every((role) => css.includes(`--${role}-surface:`) && css.includes(`--${role}-border:`) && css.includes(`--${role}-text:`))],
  ['Encres sémantiques consommées', css.includes('background:var(--danger-surface)') && css.includes('color:var(--danger-text)') && css.includes('background:var(--warning-surface)') && css.includes('color:var(--warning-text)') && css.includes('background:var(--success-surface)') && css.includes('color:var(--success-text)')],
  ['Badges immunisés contre les encres de conteneur', ['critical','high','orange','medium','blue','low','neutral','success','purple'].every((variant) => css.includes(`.badge.badge-${variant}`))],
  ['Badges immunisés contre les dispositions de conteneur', finalDeclaration('.badge.badge-critical', 'display') === 'inline-flex' && finalDeclaration('.badge.badge-critical', 'border-radius') === 'var(--radius-round)' && finalDeclaration('.badge .badge-icon', 'display') === 'grid'],
  ['Badges capsule à sceau', finalDeclaration('.badge.badge-critical', 'background') === 'var(--danger-text)' && finalDeclaration('.badge .badge-icon', 'border-radius') === '50%' && finalDeclaration('.badge .badge-icon', 'background') === 'var(--surface)'],
  ['Flux opérationnel hors colonne décision', /<\/section>\s*<WorkflowAnalytics[\s\S]*?variant="manager"/.test(page)],
  ['Aucun mécanisme de thème sombre (DEC-006)', !/prefers-color-scheme|data-theme/.test(cssWithoutComments)],
  ['Bandeau des rondes borné au retrait mobile', css.includes('@media (max-width:700px){.surpresseur-hero{margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px}')],
  ['Étapes de ronde défilables sur mobile', css.includes('.surpresseur-progress{max-width:100%;overscroll-behavior-inline:contain;scrollbar-width:thin}') && css.includes('.surpresseur-progress button{flex:0 0 112px}')],
  ['Champs métier longs compressibles', css.includes('.field,.two-fields>*{min-width:0}') && css.includes('.field select,.field input,.field textarea{width:100%;max-width:100%}')],
  ['DEC-003 maintenue à 12 px', css.includes('--font-size-label:12px') && css.includes('.manager-pilot{display:grid;gap:var(--space-4);color:var(--foreground);font-variant-numeric:tabular-nums}')],
  ['Libellés des sept files au plancher 12 px', finalDeclaration('.manager-pilot .queue-tabs button small', 'font-size') === 'var(--font-size-label)'],
  ['DEC-007 À traiter sans bloc santé', page.includes('fm-decision-layout') && page.includes('function Manager({ anomalies, tab, setTab, onOpen }') && !/function Manager\([\s\S]*?<ManagerHealthOverview/.test(page)],
  ['Santé & performance sur Accueil FM', page.includes('<ManagerHealthOverview anomalies={anomalies} equipment={equipment} onNavigate={onNavigate} />') && page.indexOf('function FacilityManagerWorkspace') < page.indexOf('<ManagerHealthOverview anomalies={anomalies} equipment={equipment} onNavigate={onNavigate} />')],
  ['File Facility Manager élargie', css.includes('grid-template-columns:minmax(400px,.88fr) minmax(0,1.12fr)')],
  ['Ticket actif identifié par deux canaux', css.includes('.fm-inbox-list>button.active{border-left-color:var(--brand);background:var(--surface-emphasis)')],
  ['Pipeline renforcé et connecté', css.includes('.workflow-pipeline b{display:block;color:var(--foreground);font-size:28px') && css.includes('.workflow-pipeline>div:not(:last-child)::after')],
  ['Gravité représentée par des barres accessibles', workflow.includes('className="severity-bars"') && workflow.includes('role="progressbar"') && css.includes('.severity-bar-track')],
  ['Cartes Facility Manager sans ombre lourde', css.includes('.manager-pilot .panel{box-shadow:none}') && css.includes('.anti-zombie-summary{margin:16px 20px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface);box-shadow:none')],
  ['Ruban de compteurs relié à la file', page.includes('manager-kpis manager-kpis-target dashboard-section-tabs') && page.includes('aria-controls="manager-queue-panel"') && page.includes('id="manager-queue-panel"')],
  ['Compteur actif surface et encre de marque', css.includes('.manager-kpis-target.dashboard-section-tabs>button.active{border-color:transparent;background:var(--surface);color:var(--brand-strong)') && css.includes('button.active .kpi-icon.amber') && !css.includes('box-shadow:inset 3px 0 0 var(--brand)')],
  ['Monogrammes de file au triplet', css.includes('.dashboard-section-tabs .kpi-icon.amber{\n  background:var(--warning-surface);\n  color:var(--warning-text);\n}') && css.includes('.dashboard-section-tabs .kpi-icon.red{\n  background:var(--danger-surface);\n  color:var(--danger-text);\n}')],
  ['Glyphes de badge distincts', badge.includes("critical: '!'") && badge.includes("high: '▲'") && badge.includes("success: '✓'")],
  ['Focus du ruban non clippé', css.includes('overflow:visible') && css.includes('.manager-kpis.manager-kpis-target.dashboard-section-tabs')],
  ['Sept files visibles dans la liste', ['À qualifier','En retard','Sans responsable','Preuves à vérifier','Réceptions','Réserves','Dossiers rouverts'].every((label) => page.includes(`label:'${label}'`)) && page.includes('className="queue-tabs"')],
  ['Branches de décision interactives', page.includes('className={`branch-selector ${branchLocked ? \'is-locked\' : \'\'}`}') && css.includes('.manager-pilot .branch-selector button.active{border-color:var(--brand);background:var(--surface-emphasis)')],
  ['Zébrure anti-dossier-zombie maintenue', css.includes('.anti-zombie-fields>div:nth-child(n+5){border-top:1px solid var(--border);background:var(--surface-muted)')],
  ['Historique insuffisant explicitement encadré', workflow.includes('className="compact-insufficient-state"') && css.includes('.compact-insufficient-state{min-height:116px;display:flex;align-items:center;gap:11px;padding:14px;border:1px dashed var(--border-strong)')],
  ['Bandeau Surpresseur aligné sur le retrait grand écran', css.includes('.surpresseur-hero{margin-inline:calc(clamp(32px,3.2vw,60px)*-1);padding-inline:clamp(32px,3.2vw,60px)}')],
  ['Badge Administration non compressible', css.includes('.authority-split .badge{flex:0 0 auto;min-width:max-content}')],
  ['Tokens chrome et marque-foreground déclarés', ['--brand-foreground:', '--chrome:', '--on-chrome:', '--mark:', '--motion-bar:', '--z-sticky:'].every((token) => css.includes(token))],
  ['Bandeau consomme le chrome tokenisé', css.includes('background:var(--chrome)') && css.includes('color:var(--on-chrome-idle)') && css.includes('border-bottom-color:var(--chrome-accent)')],
  ['Glyphe B distinct du teal courant (DEC-013)', css.includes('--mark:#20b2aa') && css.includes('--teal:#0e6a66') && css.includes('background:var(--mark)') && css.includes('--accent:var(--teal)')],
  ['Durées d’animation tokenisées', css.includes('transition:width var(--motion-bar) var(--ease-standard)') && css.includes('transition:stroke-dashoffset var(--motion-ring) var(--ease-standard)')],
  ['Spécimen hors navigation produit', specimen.includes('Système de design · hors navigation produit') && page.includes('href="/design-system"') && !page.includes("label:'Système de design'")],
  ['Primitives UI partagées', page.includes("from './components/ui'") && specimen.includes("from '../components/ui'") && page.includes('<IconButton') && page.includes('<Card className="fm-decision-card">')],
  ['Destination Équipements sur primitives et tokens', equipmentWorkspace.includes("from './ui'") && equipmentWorkspace.includes('<Card') && css.includes('.equipment-workspace-hero') && css.includes('background:var(--surface-muted)') && css.includes('.equipment-destination-card{min-width:0;padding:var(--space-4);box-shadow:none}')],
  ['Équipements dans Plus sans étendre les profils terrain', page.includes("key:'equipment'") && page.includes('secondary:true') && page.includes("facility:['workspace','dashboard','registry','equipment','costs','access','manager','report']") && page.includes("administration:['workspace','dashboard','registry','equipment','costs','access','settings']") && !page.includes("electricite:['workspace','report','equipment']")],
  ['Destination Coûts sur primitives et tokens', costsWorkspace.includes("from './ui'") && costsWorkspace.includes('<Card') && costsWorkspace.includes('<Field') && costsWorkspace.includes('<Button') && css.includes('.costs-workspace-hero') && css.includes('.costs-case-card{min-width:0;padding:var(--space-4);box-shadow:none}')],
  ['Coûts dans Plus sans étendre les profils terrain', page.includes("key:'costs'") && page.includes("label:'Coûts'") && page.includes("facility:['workspace','dashboard','registry','equipment','costs','access','manager','report']") && page.includes("administration:['workspace','dashboard','registry','equipment','costs','access','settings']") && !page.includes("electricite:['workspace','report','costs']")],
  ['Coûts sans budget ou paiement inventé', costsWorkspace.includes('BUDGET · ENGAGÉ · PAYÉ') && costsWorkspace.includes('Aucune source canonique disponible') && costsWorkspace.includes('Un montant soumis à décision n’est pas considéré comme engagé ou payé') && !page.includes('Budget engagé</span><strong>6 200 000')],
  ['Montant du dossier raccordé à l’arbitrage existant', page.includes('decisionAmount={escalations.find') && !page.includes("const estimatedCost = anomaly.asset") && page.includes('Pièce financière non reliée') && !page.includes('DEVIS-INTERVENTION.pdf')],
  ['Seuil financier unique et non modifiable silencieusement', page.includes('const DECISION_THRESHOLD_FCFA = 400_000') && page.includes('const threshold = DECISION_THRESHOLD_FCFA') && !page.includes('setThreshold(Number')],
  ['Destination Utilisateurs et droits sur primitives et tokens', accessWorkspace.includes("from './ui'") && accessWorkspace.includes('<Card') && accessWorkspace.includes('<Field') && accessWorkspace.includes('<Button') && css.includes('.access-workspace-hero') && css.includes('.access-action-panel{') && css.includes('box-shadow:none')],
  ['Accès utilisateur dans Plus sans profils terrain', page.includes("key:'access'") && page.includes("label:'Utilisateurs et droits'") && page.includes("group:'Administration'") && !page.includes("electricite:['workspace','report','access']") && !page.includes("eau_incendie:['workspace','report','access']")],
  ['Administration cliente neutralisée dans le miroir', accessWorkspace.includes('ne modifie Supabase Auth, les RLS ou les utilisateurs réels') && accessWorkspace.includes('Simulation locale') && accessWorkspace.includes("users.filter((user) => user.id !== 'administration')") && accessWorkspace.includes("audience === 'administration' && <option>Administration</option>") && !accessWorkspace.includes('service_role') && !accessWorkspace.includes('createUser(') && !accessWorkspace.includes('deleteUser(')],
  ['Destination Seuils et paramètres sur primitives et tokens', parametersWorkspace.includes("from './ui'") && parametersWorkspace.includes('<Card') && parametersWorkspace.includes('<Badge') && parametersWorkspace.includes('<Button') && css.includes('.parameters-workspace-hero') && css.includes('.parameter-detail-card,.parameter-governance,.parameter-gaps{') && css.includes('box-shadow:none')],
  ['Seuils et paramètres réservés à Administration', page.includes("key:'settings'") && page.includes("label:'Seuils et paramètres'") && page.includes("group:'Administration'") && page.includes("administration:['workspace','dashboard','registry','equipment','costs','access','settings']") && !page.includes("facility:['workspace','dashboard','registry','equipment','costs','access','settings'") && !page.includes("electricite:['workspace','report','settings']")],
  ['Paramètre financier unique et non éditable dans le miroir', (page.match(/400_000/g) ?? []).length === 1 && page.includes('value:DECISION_THRESHOLD_FCFA') && parametersWorkspace.includes('LECTURE SEULE') && parametersWorkspace.includes('Historique persistant indisponible') && !parametersWorkspace.includes('<form') && !parametersWorkspace.includes('<input') && !parametersWorkspace.includes('onChange')],
  ['Familles de paramètres absentes explicitement signalées', ['Délais SLA par priorité','Seuils techniques des équipements','Méthodes de calcul des scores'].every((label) => parametersWorkspace.includes(label)) && parametersWorkspace.includes('aucune liste canonique complète') && parametersWorkspace.includes('Méthode à valider')],
]

for (const [label, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`)
const failures = checks.filter(([, ok]) => !ok)
if (failures.length) {
  process.exitCode = 1
  throw new Error(`${failures.length} contrôle(s) visuel(s) en échec`)
}
console.log(`\n${checks.length} contrôles statiques de bordure/focus réussis.`)
