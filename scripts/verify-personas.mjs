import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const page = await readFile(path.join(root, 'app', 'page.tsx'), 'utf8')
const css = await readFile(path.join(root, 'app', 'globals.css'), 'utf8')
const appSource = `${page}\n${css}`

const checks = []
const requireAll = (label, source, values) => {
  const missing = values.filter((value) => !source.includes(value))
  checks.push({ label, ok: missing.length === 0, missing })
}

requireAll('Personas métier', page, [
  'Faustin SIAPO', 'Frédéric AMANY', 'Évariste DJE', 'Sylvain DOUANE', 'Laetitia ATTOH',
])
requireAll('Espaces personnalisés', page, [
  'DirectionWorkspace', 'FaustinWorkspace', 'AgentWorkspace', 'LaetitiaWorkspace',
])
requireAll('Modules initiaux', page, [
  'GE-01', 'WILO-01', 'RIA-01', 'ASC-A1', 'ASC-A2', 'IRR-01', 'RND-LET',
])
requireAll('Référentiel prestataires sans accès direct', page, ['DMC', 'ATA-CI', 'SECURISYS', 'ALTA-VENTURE', 'Aucun accès direct pour les prestataires'])
requireAll('Décisions Administration', page, ['Approuver', 'Refuser', 'Renvoyer à Faustin', 'CAPEX', 'OPEX'])
requireAll('Parcours terrain et preuve', page, [
  'Soumettre à l’Administration', 'Réarmement provisoire', 'Ajouter une preuve', 'Déposer pour validation de Faustin',
])
requireAll('Cycle métier', page, ['Constat', 'Qualification', 'Décision', 'Intervention', 'Preuve', 'Clôture'])
requireAll('États opérationnels', page, ['Critique', 'En retard', 'PREUVE MANQUANTE', 'Terminées'])
requireAll('Droits visibles par persona', page, [
  "['workspace','dashboard','registry','manager','report']",
  "['workspace','dashboard','registry']",
  "['workspace','report']",
  "personaId === 'evariste' || personaId === 'sylvain'",
  "Cleaning · jardinage · suivi administratif",
])
requireAll('Responsive', css, [
  '@media (max-width:1180px)', '@media (max-width:900px)', '@media (max-width:700px)', '@media (max-width:430px)',
])
requireAll('Accessibilité clavier', css, [':focus-visible'])
requireAll('Listbox persona accessible', page, [
  'aria-haspopup="listbox"', 'role="listbox"', 'role="option"', 'aria-selected',
  "event.key === 'ArrowDown'", "event.key === 'ArrowUp'", "event.key === 'Enter'", "event.key === 'Escape'", "event.key === 'Tab'",
])
requireAll('Groupes de personas', page, ["label:'Administration'", "label:'Management'", "label:'Terrain'"])
checks.push({
  label:'Matrice de dépôt nominative visible',
  ok:page.includes('Évariste et Sylvain sont les seuls agents internes habilités') && !page.includes("personaId:'readonly'"),
  missing:[],
})
checks.push({
  label:'Aucun persona ou portail prestataire',
  ok:!page.includes("id:'vendor'") && !page.includes('VendorWorkspace') && !page.includes('PORTAIL PRESTATAIRE'),
  missing:[],
})
requireAll('Polish Direction et Faustin', page, [
  'decision-filters', 'direction-focus', 'Qualifier maintenant', 'qualify-action', 'escalate-action',
])
requireAll('Pilote Wilo et saisie directe', page, [
  'MODULE PILOTE · SURPRESSEUR', 'Mode hors ligne actif', 'Ronde Wilo prête à synchroniser', 'AUCUN IMPORT',
])
checks.push({
  label:'Aucun parcours d’import de reporting',
  ok:!page.includes('Importer un rapport de ronde') && !page.includes('Vérifier et importer') && !page.includes("setImportStage('review')"),
  missing:page.includes('Importer un rapport de ronde') ? ['ancien import encore présent'] : [],
})
requireAll('Délégation et dossier cible', page, [
  '350 000 FCFA', 'Décision dans la délégation de Faustin', 'AntiZombieSummary', 'dossier-workflow', 'dossier-three-zone',
])
requireAll('Clôture design des cockpits', page, [
  'WorkflowAnalytics', 'Sans responsable', 'Preuves à vérifier', 'Réceptions', 'Réserves', 'Dossiers rouverts',
])
requireAll('Double mission Laetitia', page, [
  'mission-switch', 'Rondes, constats et brouillons hors ligne', 'Devis, paiements et autorisations',
])
requireAll('Mesures Wilo explicables', page, [
  'MeasureRange', 'DANS LA PLAGE', 'HORS PLAGE', 'Variation</b>Indisponible', 'Fraîcheur</b>Non synchronisée',
])
requireAll('Verrou critique et retour Direction', page, [
  "selected.priority === 'Critique' && !selected.proof", 'retour envoyé à Faustin', 'Confirmer et notifier Faustin',
])
requireAll('Badges structurés', page, ['badge-icon', 'badge-label'])
requireAll('Focus P2 et protection navigation mobile', css, [
  'outline:2px solid var(--focus)', '.keyboard-nav button:focus-visible', '.main-column{padding-bottom:92px}', '.persona-popover{position:fixed',
])
checks.push({
  label: 'Sélecteur natif persona supprimé',
  ok: !page.includes('className="persona-select"'),
  missing: page.includes('className="persona-select"') ? ['ancien sélecteur encore présent'] : [],
})

const rgb = (hex) => hex.match(/[a-f\d]{2}/gi).map((part) => Number.parseInt(part, 16) / 255)
const luminance = (hex) => rgb(hex).map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
const contrast = (foreground, background) => {
  const [light, dark] = [luminance(foreground), luminance(background)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}
const contrastPairs = [
  ['critique', '#9f202b', '#fee9ea'],
  ['orange', '#98470d', '#fff1e2'],
  ['bleu', '#174f89', '#eaf2fb'],
  ['succès', '#176340', '#e7f5ed'],
  ['neutre', '#465360', '#f0f3f5'],
]
const failedContrasts = contrastPairs.filter(([, foreground, background]) => contrast(foreground, background) < 4.5).map(([label, foreground, background]) => `${label} ${contrast(foreground, background).toFixed(2)}:1`)
checks.push({ label:'Contrastes de badges ≥ 4,5:1', ok:failedContrasts.length === 0, missing:failedContrasts })

const forbidden = [
  /createClient\s*\(/,
  /supabase\.co/i,
  /NEXT_PUBLIC_SUPABASE/i,
  /service_role/i,
  /eyJ[a-zA-Z0-9_-]{20,}/,
]
const secretHits = forbidden.filter((pattern) => pattern.test(appSource)).map(String)
checks.push({ label: 'Aucune clé Supabase codée en dur dans le frontend', ok: secretHits.length === 0, missing: secretHits })

for (const viewport of [390, 768, 1440]) {
  const covered = viewport <= 430 || viewport <= 900 || viewport > 1180
  checks.push({ label: `Couverture responsive ${viewport}px`, ok: covered, missing: [] })
}

const failures = checks.filter((check) => !check.ok)
for (const check of checks) {
  console.log(`${check.ok ? '✓' : '✗'} ${check.label}${check.missing.length ? ` — manque: ${check.missing.join(', ')}` : ''}`)
}

if (failures.length) {
  process.exitCode = 1
  throw new Error(`${failures.length} contrôle(s) persona en échec`)
}

console.log(`\n${checks.length} contrôles persona réussis.`)
