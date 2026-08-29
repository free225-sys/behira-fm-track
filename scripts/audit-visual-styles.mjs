import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const css = await readFile(path.join(root, 'app', 'globals.css'), 'utf8')
const page = await readFile(path.join(root, 'app', 'page.tsx'), 'utf8')

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
]

for (const [label, ok] of checks) console.log(`${ok ? '✓' : '✗'} ${label}`)
const failures = checks.filter(([, ok]) => !ok)
if (failures.length) {
  process.exitCode = 1
  throw new Error(`${failures.length} contrôle(s) visuel(s) en échec`)
}
console.log(`\n${checks.length} contrôles statiques de bordure/focus réussis.`)
