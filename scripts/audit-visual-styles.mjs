import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = await readFile(path.join(root, 'app', 'globals.css'), 'utf8')
const page = await readFile(path.join(root, 'app', 'page.tsx'), 'utf8')
const workflow = await readFile(path.join(root, 'app', 'components', 'WorkflowAnalytics.tsx'), 'utf8')

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
  ['Titres mobiles compacts présents', page.includes('mobilePageTitle') && css.includes('.mobile-title{display:inline}')],
  ['Réserve navigation mobile présente', css.includes('.main-column{padding-bottom:92px}')],
  ['Grille du registre partagée', css.includes('.registry-head,.registry-row{grid-template-columns:var(--registry-columns)}')],
  ['Repli du registre avec responsable', css.includes('.registry-head{display:none}') && css.includes('.registry-row>.owner-cell{display:none}') && css.includes('.registry-mobile-details{grid-column:1;grid-row:3;display:grid') && page.includes('<b>Responsable interne</b>')],
  ['Continuité du traitement au plancher 12 px', finalDeclaration('.registry-entry:not(.is-expanded) .registry-summary-toggle', 'font-size') === 'var(--font-size-label)'],
  ['Titres tronqués proprement', css.includes('.topbar h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}')],
  ['Références équipement insécables', page.includes('className="equipment-reference"') && css.includes('.equipment-reference{white-space:nowrap;word-break:keep-all;overflow-wrap:normal}')],
  ['Shell sans rail latéral résiduel', page.includes('className="app-navigation"') && !page.includes('className="sidebar"') && !css.includes('.sidebar')],
  ['Navigation unique et état courant accessible', page.includes('const navItems: NavigationItem[]') && page.includes('className="primary-navigation"') && page.includes("aria-current={active ? 'page' : undefined}")],
  ['Menu Plus prêt pour le catalogue groupé', page.includes("const navigationGroups: NavigationGroup[] = ['Mon travail','Le bâtiment','Pilotage','Administration']") && page.includes('overflowIsActive ? \'active\'') && page.includes('groupItems = overflowNav.filter') && page.includes("event.key === 'ArrowDown' || event.key === 'ArrowUp'") && page.includes('moreNavTriggerRef.current?.focus()')],
  ['Environnement de démonstration visible', page.includes('className="persona-mode-label"') && page.includes('Mode démonstration') && !css.includes('.persona-mode-label{display:none}')],
  ['Triplets sémantiques déclarés', ['success','warning','danger','info','neutral'].every((role) => css.includes(`--${role}-surface:`) && css.includes(`--${role}-border:`) && css.includes(`--${role}-text:`))],
  ['Encres sémantiques consommées', css.includes('background:var(--danger-surface)') && css.includes('color:var(--danger-text)') && css.includes('background:var(--warning-surface)') && css.includes('color:var(--warning-text)') && css.includes('background:var(--success-surface)') && css.includes('color:var(--success-text)')],
  ['Badges immunisés contre les encres de conteneur', ['critical','high','orange','medium','blue','low','neutral','success','purple'].every((variant) => css.includes(`.badge.badge-${variant}`))],
  ['Bandeau des rondes borné au retrait mobile', css.includes('@media (max-width:700px){.surpresseur-hero{margin-left:-16px;margin-right:-16px;padding-left:16px;padding-right:16px}')],
  ['Étapes de ronde défilables sur mobile', css.includes('.surpresseur-progress{max-width:100%;overscroll-behavior-inline:contain;scrollbar-width:thin}') && css.includes('.surpresseur-progress button{flex:0 0 112px}')],
  ['Champs métier longs compressibles', css.includes('.field,.two-fields>*{min-width:0}') && css.includes('.field select,.field input,.field textarea{width:100%;max-width:100%}')],
  ['DEC-003 maintenue à 12 px', css.includes('--font-size-label:12px') && css.includes('.manager-pilot{display:grid;gap:var(--space-4);color:var(--foreground);font-variant-numeric:tabular-nums}')],
  ['Vue bâtiment avant les files', page.indexOf('<ManagerHealthOverview anomalies={anomalies} equipment={equipment} />') < page.indexOf('className="manager-kpis manager-kpis-target"')],
  ['File Facility Manager élargie', css.includes('grid-template-columns:minmax(400px,.88fr) minmax(0,1.12fr)')],
  ['Ticket actif identifié par deux canaux', css.includes('.fm-inbox-list>button.active{border-left-color:var(--brand);background:var(--surface-emphasis)')],
  ['Pipeline renforcé et connecté', css.includes('.workflow-pipeline b{display:block;color:var(--foreground);font-size:28px') && css.includes('.workflow-pipeline>div:not(:last-child)::after')],
  ['Gravité représentée par des barres accessibles', workflow.includes('className="severity-bars"') && workflow.includes('role="progressbar"') && css.includes('.severity-bar-track')],
  ['Cartes Facility Manager sans ombre lourde', css.includes('.manager-pilot .panel{box-shadow:none}') && css.includes('.anti-zombie-summary{margin:16px 20px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--surface);box-shadow:none')],
]

for (const [label, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`)
const failures = checks.filter(([, ok]) => !ok)
if (failures.length) {
  process.exitCode = 1
  throw new Error(`${failures.length} contrôle(s) visuel(s) en échec`)
}
console.log(`\n${checks.length} contrôles statiques de bordure/focus réussis.`)
