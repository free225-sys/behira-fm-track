import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const display = await import(pathToFileURL(path.join(root, 'app/lib/ui-contract/display.ts')).href)
const fixtures = await import(pathToFileURL(path.join(root, 'app/lib/ui-contract/fixtures.ts')).href)
const typesSource = await readFile(path.join(root, 'app/lib/ui-contract/building-health.ts'), 'utf8')
const displaySource = await readFile(path.join(root, 'app/lib/ui-contract/display.ts'), 'utf8')
const fixturesSource = await readFile(path.join(root, 'app/lib/ui-contract/fixtures.ts'), 'utf8')
const cockpit = await readFile(path.join(root, 'app/components/BuildingHealthCockpit.tsx'), 'utf8')
const equipmentWorkspace = await readFile(path.join(root, 'app/components/EquipmentWorkspace.tsx'), 'utf8')
const equipmentTable = await readFile(path.join(root, 'app/components/shared/EquipmentTable.tsx'), 'utf8')
const scoreBlock = await readFile(path.join(root, 'app/components/shared/HealthScoreBlock.tsx'), 'utf8')
const badges = await readFile(path.join(root, 'app/components/shared/StatusBadge.tsx'), 'utf8')
const page = await readFile(path.join(root, 'app/page.tsx'), 'utf8')
const dataTs = await readFile(path.join(root, 'app/lib/supabase/data.ts'), 'utf8')

const {
  palierFromScore,
  displayRawScore,
  thresholdPosition,
  scoreFigure,
  atRiskVentilation,
  atRiskHiddenCaption,
  pendingDecisionsLabel,
  primaryReasonOf,
  shouldOfferControlPlanning,
  formatMoney,
  formatDayTime,
  statusLabel,
  displayAssetCode,
} = display

const cases = []
const check = (label, ok, detail = '') => {
  cases.push({ label, ok, detail })
  if (!ok) console.error(`✗ ${label}${detail ? ` — ${detail}` : ''}`)
  else console.log(`✓ ${label}`)
}

check('palier 69 → critical (entier serveur)', palierFromScore(69) === 'critical')
check('palier 70 → watch', palierFromScore(70) === 'watch')
check('palier 89 → watch', palierFromScore(89) === 'watch')
check('palier 90 → ok', palierFromScore(90) === 'ok')
check('palierFromScore n’arrondit plus', palierFromScore(69.9) === 'critical' && palierFromScore(89.5) === 'watch')
check('displayRawScore 69.49 → 69', displayRawScore(69.49) === 69)
check('displayRawScore 69.5 → 70', displayRawScore(69.5) === 70)
check('displayRawScore 89.49 → 89', displayRawScore(89.49) === 89)
check('displayRawScore 89.5 → 90', displayRawScore(89.5) === 90)
check('seuil 399999 < 400000 → below (FM)', thresholdPosition(399999, 400000) === 'below')
check('seuil 400000 ≥ 400000 → at_or_above (Administration)', thresholdPosition(400000, 400000) === 'at_or_above')
check('formatMoney 400000 = « 400 000 FCFA »', formatMoney(400000) === '400 000 FCFA')
check('formatDayTime instant → le JJ/MM à HH:MM', formatDayTime('2026-09-15T07:30:00Z') === 'le 15/09 à 07:30')
check('formatDayTime date seule → null (pas d’heure inventée)', formatDayTime('2026-09-15') === null)

const rounded = fixtures.fixtureRoundedCases
check('cas Codex 69,49 → final 69 critical', rounded.raw6949.score.final === 69 && palierFromScore(rounded.raw6949.score.final) === 'critical')
check('cas Codex 69,50 → final 70 watch', rounded.raw6950.score.final === 70 && palierFromScore(rounded.raw6950.score.final) === 'watch')
check('cas Codex 89,49 → final 89 watch', rounded.raw8949.score.final === 89 && palierFromScore(rounded.raw8949.score.final) === 'watch')
check('cas Codex 89,50 → final 90 ok', rounded.raw8950.score.final === 90 && palierFromScore(rounded.raw8950.score.final) === 'ok')
check('cas Codex plafonné 82,40 → 69 critical', rounded.capped8240.score.state === 'capped' && rounded.capped8240.score.final === 69 && palierFromScore(69) === 'critical')
check('cas Codex plafonné 61,50 → 62 critical', rounded.capped6150.score.final === 62 && palierFromScore(62) === 'critical')

check('score normal : final = raw, figure affichée', fixtures.fixtureScoreNormal.score.state === 'normal'
  && fixtures.fixtureScoreNormal.score.final === fixtures.fixtureScoreNormal.score.raw
  && scoreFigure(fixtures.fixtureScoreNormal.score) === 82)

check('score plafonné : final 69, raw 82, cap 69', fixtures.fixtureScoreCapped.score.state === 'capped'
  && fixtures.fixtureScoreCapped.score.final === 69
  && fixtures.fixtureScoreCapped.score.raw === 82
  && fixtures.fixtureScoreCapped.score.cap === 69)

check('score brut 61 plafonné → final 61', fixtures.fixtureScoreCappedRaw61.score.state === 'capped'
  && fixtures.fixtureScoreCappedRaw61.score.final === 61
  && fixtures.fixtureScoreCappedRaw61.score.raw === 61)

check('score not_computable : aucun chiffre', fixtures.fixtureScoreNotComputable.score.state === 'not_computable'
  && fixtures.fixtureScoreNotComputable.score.final === null
  && fixtures.fixtureScoreNotComputable.score.raw === null
  && scoreFigure(fixtures.fixtureScoreNotComputable.score) === null)

check('formule en attente : pas de CTA contrôles', shouldOfferControlPlanning(fixtures.fixtureFormulaMissingControlsPresent.score) === false)
check('contrôles manquants : CTA contrôles', shouldOfferControlPlanning(fixtures.fixtureMissingControls.score) === true)

check('displayBreakdown dual-risk → 1 : 1 dégradé', atRiskVentilation(fixtures.fixtureDualRiskReasons.atRisk) === '1 : 1 dégradé')
check('displayBreakdown renseigné → phrase exclusive', atRiskVentilation(fixtures.fixtureScoreCapped.atRisk) === '3 : 1 indisponible, 1 dégradé, 1 contrôle')
check('quatre zéros → aucun équipement à risque', atRiskVentilation(fixtures.fixtureAtRiskZero.atRisk) === 'Aucun équipement à risque')
check('other > 0 seulement si renseigné', atRiskVentilation(fixtures.fixtureAtRiskOther.atRisk) === '2 : 2 autres')
check('displayBreakdown toujours présent si ok', typesSource.includes('displayBreakdown: { unavailable: number; degraded: number; control: number; other: number }') && !typesSource.includes('displayBreakdown: { unavailable: number; degraded: number; control: number; other: number } | null'))

check('primaryReason obligatoire sur items ok', fixtures.fixtureScoreNormal.atRisk.items.every((item) => item.primaryReason && item.reasons.includes(item.primaryReason)))
check('ordre primaryReason unavailable > degraded', primaryReasonOf(['degraded', 'unavailable']) === 'unavailable')
check('dégradé + contrôle périmé reste dégradé', fixtures.fixtureDegradedAndExpired.equipment[0].operationalStatus === 'degraded'
  && fixtures.fixtureDegradedAndExpired.equipment[0].controlValidity === 'expired'
  && fixtures.fixtureDegradedAndExpired.atRisk.items[0].primaryReason === 'degraded')

check('RIA-01 dégradé (fixture isolée)', fixtures.fixtureRiaDegraded.equipment[0].code === 'RIA-01'
  && fixtures.fixtureRiaDegraded.equipment[0].operationalStatus === 'degraded')
check('RIA-01 indisponible (fixture isolée)', fixtures.fixtureRiaUnavailable.equipment.some((item) => item.code === 'RIA-01' && item.operationalStatus === 'unavailable'))
const livePark = fixtures.demoHomeSnapshot(fixtures.sessionForAudience('facility', 'Facility Manager Démo'))
const liveRia = livePark.equipment.find((item) => item.code === 'RIA-01')
check('parc live : RIA-01 non tranché', liveRia?.operationalStatus == null)
check('parc live : RIA-01 score null → —', liveRia?.score == null)

const elec = fixtures.demoHomeSnapshot(fixtures.sessionForAudience('electricite', 'Agent Électricité Démo'))
const elecNormal = fixtures.demoHomeSnapshot(fixtures.sessionForAudience('electricite', 'Agent Électricité Démo'), 'normal')
const rounds = fixtures.demoHomeSnapshot(fixtures.sessionForAudience('rondes_assistance', 'Agente Rondes & Assistance Démo'))
check('périmètre électricité : GE + ASC', elec.equipment.map((item) => item.code).sort().join(',') === 'ASC-A1,ASC-A2,GE-01')
check('rondes : aucun équipement technique imposé', rounds.equipment.length === 0)
check('agent : compteurs not_authorized', elec.pendingDecisions === null && elec.counterUnavailableReasons.pendingDecisions === 'not_authorized')
check('agent : total et ventilation du site', elecNormal.atRisk.status === 'ok' && elecNormal.atRisk.total === 3 && elecNormal.atRisk.displayBreakdown.degraded === 3)
check('agent : items filtrés au périmètre', elecNormal.atRisk.status === 'ok' && elecNormal.atRisk.items.every((item) => ['GE-01', 'ASC-A1', 'ASC-A2'].includes(item.code)))
check('agent : hiddenItemCount WILO hors périmètre', elecNormal.atRisk.status === 'ok' && elecNormal.atRisk.hiddenItemCount === 1 && atRiskHiddenCaption(1) === 'dont 1 hors de votre périmètre')

check('libellé FM = Dossiers à traiter', pendingDecisionsLabel('facility') === 'Dossiers à traiter')
check('libellé Administration = Arbitrages en attente', pendingDecisionsLabel('administration') === 'Arbitrages en attente')
check('tuile pending masquée si not_authorized', cockpit.includes("hidden: reasons.pendingDecisions === 'not_authorized'"))
check('pendingDecisions facility fixture', fixtures.fixturePendingFacility.pendingDecisions === 4)
check('pendingDecisions admin fixture', fixtures.fixturePendingAdmin.pendingDecisions === 4)

check('couverture exacte 80 %', fixtures.fixtureCoverageExact80.coverage.status === 'ok' && fixtures.fixtureCoverageExact80.coverage.percent === 80)
check('plusieurs causes de plafond', fixtures.fixtureMultipleCapCauses.score.state === 'capped' && fixtures.fixtureMultipleCapCauses.score.causeCount === 2)
check('indisponible + contrôle périmé', fixtures.fixtureUnavailableAndExpired.equipment[0].operationalStatus === 'unavailable'
  && fixtures.fixtureUnavailableAndExpired.equipment[0].controlValidity === 'expired')
check('ronde faite aujourd’hui et manquée hier', fixtures.fixtureRoundDoneMissedYesterday.equipment[0].todaysRound.state === 'done'
  && fixtures.fixtureRoundDoneMissedYesterday.equipment[0].todaysRound.missedYesterday === true)
check('échéance inconnue', fixtures.fixtureUnknownDeadline.equipment[0].todaysRound.deadlineStatus === 'not_configured')

const fourStatuses = ['available', 'degraded', 'unavailable', 'control_due']
check('quatre libellés métier', fourStatuses.every((status) => ['Disponible', 'Dégradé', 'Indisponible', 'Contrôle à renouveler'].includes(statusLabel(status))))
check('équipements : badge métier avant score', equipmentTable.includes('operationalStatus') && equipmentTable.includes('item.score') && equipmentWorkspace.includes('Contrôle à renouveler'))
check('tableau équipements groupé', equipmentTable.includes('familyLabel') && equipmentWorkspace.includes('EquipmentTable'))
check('Statut inconnu affiché', badges.includes('Statut inconnu') && equipmentWorkspace.includes('STATUT INCONNU') && fixtures.fixtureStatusUnknown.equipment[0].operationalStatus == null && fixtures.fixtureStatusUnknown.equipment[0].score == null)
check('controlValidity séparé du statut', badges.includes('ControlValidityBadge') && equipmentTable.includes('ControlValidityBadge') && cockpit.includes('ControlValidityBadge'))

check('types v1 : schemaVersion behira.lot0.v1', typesSource.includes("schemaVersion: 'behira.lot0.v1'"))
check('score state unavailable retiré', !typesSource.includes("state: 'unavailable'") && typesSource.includes("state: 'not_computable'"))
check('pas de coverageLabel / actionLabel sur les types', !typesSource.includes('coverageLabel') && !typesSource.includes('actionLabel'))
check('v2 types seulement', typesSource.includes('BuildingHealthV2Extensions') && !cockpit.includes('domainPoints') && !page.includes('arbitrationQueue'))
check('EquipmentCard : champs Codex', ['criticality', 'lastControlAt', 'scoreWeight', 'technicalState', 'isFunctional', 'controlValidity', 'todaysRound'].every((field) => typesSource.includes(field)))

const banned = ['92%', 'Parc à surveiller', 'Plafonné par', 'Santé moyenne', 'Périmètre fourni par la session', 'Fixtures de démonstration uniquement', 'Scan du parc']
const uiSurface = `${cockpit}\n${fixturesSource}\n${displaySource}\n${page}\n${equipmentWorkspace}`
for (const token of banned) {
  check(`jamais « ${token} »`, !uiSurface.includes(token))
}
check('cockpit ne mélange pas Sain/Surveillance comme statut', !cockpit.includes("'Sain'") && !cockpit.includes("'Surveillance'") && !cockpit.includes('statusWord'))
check('Accueil démo = not_computable', page.includes('demoHomeSnapshot') && fixtures.demoHomeSnapshot(fixtures.sessionForAudience('facility', 'FM')).score.state === 'not_computable')
check('seuil unique 400_000 dans page.tsx', (page.match(/400_000/g) ?? []).length === 1)
check('data.ts non modifié par ce lot (pas de contrat UI)', !dataTs.includes('behira.lot0.v1') && !dataTs.includes('BuildingHealthSnapshot'))
check('CTA Planifier seulement via helper', scoreBlock.includes('shouldOfferControlPlanning') && !fixturesSource.includes('actionLabel'))
check('final affiché tel quel, sans Math.round UI', !displaySource.includes('Math.round') && displaySource.includes('displayRawScore') && displaySource.includes('Math.floor') && !displaySource.includes('export function displayScore') && scoreBlock.includes('score.final'))
check('mapping DEMO-GE → GE-01', displayAssetCode('DEMO-GE') === 'GE-01')
check('mapping DEMO-EAU → WILO-01', displayAssetCode('DEMO-EAU') === 'WILO-01')
check('mapping DEMO-SSI → RIA-01', displayAssetCode('DEMO-SSI') === 'RIA-01')
check('mapping DEMO-ASC-1/2 avant DEMO-ASC-1', display.displayAssetText('DEMO-ASC-1/2 et DEMO-ASC-1') === 'ASC-A1 · ASC-A2 et ASC-A1')
check('mapping DEMO-ESP / DEMO-RND', displayAssetCode('DEMO-ESP') === 'IRR-01' && displayAssetCode('DEMO-RND') === 'RND-LET')
check('initiales AE sans accent', display.asciiInitials('Agent Électricité Démo') === 'AE')
check('CTA cockpit FM = Ouvrir Dossiers', cockpit.includes("label: 'Ouvrir Dossiers'") && !cockpit.includes('Ouvrir À traiter'))
check('CTA bas de page retiré', !page.includes('workspace-next') && !page.includes('＋ Nouvelle ronde'))
check('sélecteur scénario démo', cockpit.includes('DemoScenarioSelect') && page.includes('DemoScenarioProvider') && fixturesSource.includes('DemoScoreScenario'))
check('scénario normal = fixture existante', fixtures.demoHomeSnapshot(fixtures.sessionForAudience('facility', 'FM'), 'normal').score.state === 'normal')
check('scénario plafonné = fixture existante', fixtures.demoHomeSnapshot(fixtures.sessionForAudience('facility', 'FM'), 'capped').score.state === 'capped' && fixtures.demoHomeSnapshot(fixtures.sessionForAudience('facility', 'FM'), 'capped').score.final === 69)
check('scénario démo respecte le périmètre agent', fixtures.demoHomeSnapshot(fixtures.sessionForAudience('electricite', 'AE'), 'normal').equipment.map((item) => item.code).sort().join(',') === 'ASC-A1,ASC-A2,GE-01')

const failed = cases.filter((item) => !item.ok)
if (failed.length) {
  process.exitCode = 1
  throw new Error(`${failed.length} contrôle(s) lot 0 en échec`)
}
console.log(`\n${cases.length} contrôles lot 0 réussis.`)
