import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const files = {
  banner: 'app/components/shared/HomeHeroBanner.tsx',
  scale: 'app/components/shared/ScoreScale.tsx',
  score: 'app/components/shared/HealthScoreBlock.tsx',
  kpi: 'app/components/shared/KpiStrip.tsx',
  table: 'app/components/shared/EquipmentTable.tsx',
  segmented: 'app/components/shared/SegmentedControl.tsx',
  picker: 'app/components/shared/StartRoundPicker.tsx',
  tracking: 'app/components/shared/ReportTrackingLine.tsx',
  split: 'app/components/shared/ListDetailSplit.tsx',
  badges: 'app/components/shared/StatusBadge.tsx',
  scenario: 'app/components/shared/DemoScenarioSelect.tsx',
  stepper: 'app/components/shared/CountStepper.tsx',
  header: 'app/components/shared/RoundPilotHeader.tsx',
}
const sources = Object.fromEntries(await Promise.all(Object.entries(files).map(async ([key, rel]) => [key, await readFile(path.join(root, rel), 'utf8')])))
const cockpit = await readFile(path.join(root, 'app/components/BuildingHealthCockpit.tsx'), 'utf8')
const ge01 = await readFile(path.join(root, 'app/components/Ge01Pilot.tsx'), 'utf8')
const equipment = await readFile(path.join(root, 'app/components/EquipmentWorkspace.tsx'), 'utf8')
const page = await readFile(path.join(root, 'app/page.tsx'), 'utf8')
const css = await readFile(path.join(root, 'app/globals.css'), 'utf8')
const display = await import(pathToFileURL(path.join(root, 'app/lib/ui-contract/display.ts')).href)
const fixtures = await import(pathToFileURL(path.join(root, 'app/lib/ui-contract/fixtures.ts')).href)

const cases = []
const check = (label, ok, detail = '') => {
  cases.push({ label, ok, detail })
  console.log(`${ok ? '✓' : '✗'} ${label}${detail ? ` — ${detail}` : ''}`)
}

check('bandeau d’accueil chrome', sources.banner.includes('home-hero-banner') && css.includes('.home-hero-banner{'))
check('échelle extraite', sources.scale.includes('Point = score final') && cockpit.includes('<ScoreScale'))
check('bloc santé 3 états', sources.score.includes("score.state === 'not_computable'") && sources.score.includes("state === 'capped'") && sources.score.includes('variant'))
check('KPI cliquables', sources.kpi.includes('is-action') && cockpit.includes('<KpiStrip'))
check('badges métier / palier sans Sain', sources.badges.includes('MetierStatusBadge') && sources.badges.includes('palierRangeLabel') && !sources.badges.includes('Sain') && !sources.badges.includes('Surveillance'))
check('Statut inconnu + contrôle à part', sources.badges.includes('Statut inconnu') && sources.badges.includes('ControlValidityBadge'))
check('tableau groupé par famille', sources.table.includes('familyLabel') && equipment.includes('EquipmentTable') && equipment.includes('À risque'))
check('contrôle segmenté réutilisé par GE-01', sources.segmented.includes('ge-choice-grid') && ge01.includes('SegmentedControl') && !ge01.includes('function SegmentedChoice'))
check('sélecteur de ronde : Échap et hors planning', sources.picker.includes("event.key === 'Escape'") && sources.picker.includes('Ronde hors planning') && sources.picker.includes('mousedown'))
check('suivi de rapport Envoyée → Qualifiée', display.reportStageLabel('sent') === 'Envoyée' && display.reportStageLabel('read') === 'Lue par le FM' && display.reportStageLabel('qualified') === 'Qualifiée' && sources.tracking.includes('is-unread'))
check('liste + détail 2 col / 640 px', sources.split.includes('list-detail-split') && css.includes('@media (max-width:640px)'))
check('retards en casse normale', !page.includes("'EN RETARD'") && page.includes('En retard'))
check('pas de numérotation 01–05 hors séquence', !page.includes('direction-number'))
check('GE-01 date native conservée', ge01.includes('type="date"') && ge01.includes('type="time"'))
check('GE-01 Transmettre seulement pendant l’envoi', ge01.includes('disabled={submitting}') && !/Transmettre[^]*disabled=\{[^}]*!/.test(ge01))
check('fixtures rondes démo', fixtures.demoTodaysRounds.length >= 4 && fixtures.demoRoundsFor(fixtures.sessionForAudience('electricite', 'AE')).every((item) => ['GE-01', 'ASC-A1', 'ASC-A2'].includes(item.equipmentCode)))
check('palierRangeLabel sans mot métier', display.palierRangeLabel('critical') === '0–69' && display.palierRangeLabel('watch') === '70–89' && display.palierRangeLabel('ok') === '90–100')
check('cockpit utilise le bandeau partagé', cockpit.includes('<HomeHeroBanner') && cockpit.includes('Ma journée'))
check('un bouton principal segmenté ≥ 40 px', css.includes('.segmented-control button{min-height:40px}') && css.includes('.start-round-item{'))
check('CTA cockpit FM = Ouvrir Dossiers', cockpit.includes("label: 'Ouvrir Dossiers'") && !cockpit.includes('Ouvrir À traiter'))
check('accueil agent sans grande carte vide', cockpit.includes('health-agent-score-line') && cockpit.includes('agent-equip-shortlist') && !cockpit.includes('health-equip-board'))
check('historique compact Voir', sources.tracking.includes('Voir') && sources.tracking.includes('report-tracking-when'))
check('sélecteur de ronde dans le bandeau agent', cockpit.includes('<StartRoundPicker') && cockpit.includes('Bonjour'))
check('tableau équipements accueil FM', cockpit.includes('<EquipmentTable') && cockpit.includes('Parc technique'))
check('score dans le bandeau hors agent', sources.banner.includes('home-hero-score') && cockpit.includes('score={!agent'))
check('CTA unique : pas de bas de page ni Nouvelle ronde', !page.includes('workspace-next') && !page.includes('＋ Nouvelle ronde') && !page.includes('showRoundCta'))
check('sélecteur scénario compact', sources.scenario.includes('demo-scenario-line') && cockpit.includes('session.demo') && cockpit.includes('DemoScenarioSelect') && css.includes('.demo-scenario-line{') && !css.includes('border:1px dashed var(--border);\n  border-radius:var(--radius-md);\n  background:var(--surface-muted);'))
check('tuile Statut inconnu', equipment.includes('STATUT INCONNU') && equipment.includes('counts.unknown'))
check('GE-01 emplacement unique', ge01.includes("EQUIPMENT_META['GE-01']") && fixtures.EQUIPMENT_META['GE-01'].zone === 'RDC · Local groupe' && !ge01.includes('Local TGBT'))
check('ronde sans équipement = Rondes de services · zones', display.roundSubjectLabel({ equipmentCode: null }) === 'Rondes de services · zones' && display.roundSubjectLabel({ equipmentCode: 'GE-01' }) === 'GE-01')
check('Pilotage Performance reprend le tableau parc', page.includes('<EquipmentTable equipment={parkEquipment}') && !page.includes('Sain ≥ 90'))
check('onglets Dossiers en pastilles', page.includes('workspace-tabs parameters-tabs agent-action-tabs') && css.includes('.dossiers-hero .workspace-tabs.dossiers-tabs button.active'))
check('rayon secondaire unique md', css.includes('.manager-pilot .secondary-button,\n.dossiers-workspace .secondary-button{\n  border-radius:var(--radius-md)'))
check('compteur entier compact partagé', sources.stepper.includes('role="group"') && sources.stepper.includes('ArrowUp') && ge01.includes('<CountStepper') && ge01.includes('Nombre de démarrages') && ge01.includes('Hors essai de ce jour') && css.includes('width:146px;height:44px') && !ge01.includes('function CountStepper'))
check('en-tête ronde deux niveaux partagé', sources.header.includes('round-pilot-header') && ge01.includes('<RoundPilotHeader') && ge01.includes('GE-01 · Ronde quotidienne du groupe électrogène') && !ge01.includes('PILOTE TERRAIN') && page.includes('<RoundPilotHeader') && page.includes('Ronde quotidienne du surpresseur') && css.includes('margin:var(--space-6) 0 22px') && css.includes('@media (max-width:640px){\n  .round-pilot-header{'))

const failed = cases.filter((item) => !item.ok)
if (failed.length) {
  process.exitCode = 1
  throw new Error(`${failed.length} contrôle(s) lot 1 en échec`)
}
console.log(`\n${cases.length} contrôles lot 1 réussis.`)
