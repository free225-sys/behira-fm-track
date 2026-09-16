import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const report = await import(pathToFileURL(path.join(root, 'app/lib/ge01/report.ts')).href)
const review = await import(pathToFileURL(path.join(root, 'app/lib/ge01/review.ts')).href)
const last = await import(pathToFileURL(path.join(root, 'app/lib/ge01/lastContext.ts')).href)
const thresholds = await import(pathToFileURL(path.join(root, 'app/lib/ge01/thresholds.ts')).href)
const ge01Pilot = await readFile(path.join(root, 'app/components/Ge01Pilot.tsx'), 'utf8')
const css = await readFile(path.join(root, 'app/globals.css'), 'utf8')

const {
  createEmptyGe01Draft,
  validateGe01Step,
  validateCompleteGe01Draft,
  buildGe01Checks,
} = report
const {
  buildReviewItems,
  countMeasureStatuses,
  missingReviewCount,
  suggestFinalStatus,
  MEASURE_UNAVAILABLE_REASONS,
} = review
const {
  DEMO_LAST_CONFIRMED,
  EMPTY_LAST_CONTEXT,
  formatYesterdayValue,
  formatMeasureDelta,
  lastStartLabel,
  readLastConfirmedGe01,
  resetLastConfirmedGe01Cache,
  writeLastConfirmedGe01,
} = last
const { evaluateFuel, evaluateOil, evaluateWater, evaluateBattery, statusFromValue } = thresholds

function mockStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null },
    setItem(key, value) { data[key] = String(value) },
  }
}

function completeDraft(overrides = {}) {
  const draft = createEmptyGe01Draft(new Date('2026-09-16T08:30:00'), 'test-ge01')
  return {
    ...draft,
    date: '2026-09-16',
    time: '08:30',
    engineHours: '1250',
    starts24h: '0',
    temperatureLocal: 'Normal',
    cleanliness: 'Conforme',
    fuelLevel: { value: '72', unavailable: false, reason: '' },
    oilLevel: { value: '95', unavailable: false, reason: '' },
    waterTemperature: { value: '88', unavailable: false, reason: '' },
    batteryVoltage: { value: '26.2', unavailable: false, reason: '' },
    abnormalNoise: 'no',
    smoke: 'Aucune',
    startOutcome: 'success',
    testStartTime: '08:40',
    returnAuto: 'yes',
    geAuto: 'yes',
    atsAuto: 'yes',
    alarmMc4: 'Aucune alarme',
    finalStatus: 'Opérationnel',
    confirmed: true,
    step: 3,
    ...overrides,
  }
}

let failed = 0
function check(label, fn) {
  try {
    fn()
    console.log(`✓ ${label}`)
  } catch (error) {
    failed += 1
    console.log(`✗ ${label}`)
    console.error(error.message)
  }
}

check('mesure OK', () => {
  assert.equal(statusFromValue('72', evaluateFuel), 'ok')
  assert.equal(statusFromValue('95', evaluateOil), 'ok')
  assert.equal(statusFromValue('88', evaluateWater), 'ok')
  assert.equal(statusFromValue('26.2', evaluateBattery), 'ok')
  const counts = countMeasureStatuses(completeDraft())
  assert.deepEqual(counts, { ok: 4, alert: 0, critical: 0 })
})

check('mesure alerte', () => {
  assert.equal(statusFromValue('97', evaluateWater), 'alert')
  assert.equal(statusFromValue('24', evaluateBattery), 'alert')
  const draft = completeDraft({
    waterTemperature: { value: '97', unavailable: false, reason: '' },
    batteryVoltage: { value: '24', unavailable: false, reason: '' },
  })
  const counts = countMeasureStatuses(draft)
  assert.equal(counts.alert, 2)
  assert.equal(counts.ok, 2)
  assert.equal(suggestFinalStatus(draft), 'Intervention')
  assert.equal(draft.finalStatus, 'Opérationnel')
})

check('mesure critique', () => {
  assert.equal(statusFromValue('50', evaluateFuel), 'critical')
  assert.equal(statusFromValue('80', evaluateOil), 'critical')
  assert.equal(statusFromValue('101', evaluateWater), 'critical')
  assert.equal(statusFromValue('22', evaluateBattery), 'critical')
  const draft = completeDraft({
    fuelLevel: { value: '50', unavailable: false, reason: '' },
    finalStatus: '',
  })
  assert.equal(countMeasureStatuses(draft).critical, 1)
  assert.equal(suggestFinalStatus(draft), 'Critique')
  assert.equal(draft.finalStatus, '')
})

check('mesure impossible + motif', () => {
  const missingReason = completeDraft({
    fuelLevel: { value: '', unavailable: true, reason: '' },
  })
  const errors = validateGe01Step(missingReason, 1)
  assert.equal(errors.fuelLevelReason, 'Indiquez pourquoi la mesure est impossible.')
  assert.ok(!errors.fuelLevel)
  MEASURE_UNAVAILABLE_REASONS.forEach((reason) => {
    const ok = validateGe01Step(completeDraft({
      fuelLevel: { value: '', unavailable: true, reason },
    }), 1)
    assert.ok(!ok.fuelLevel && !ok.fuelLevelReason, reason)
  })
  const items = buildReviewItems(completeDraft({
    fuelLevel: { value: '', unavailable: true, reason: 'Jauge HS' },
  }), 'Agent')
  const fuel = items.find((item) => item.id === 'fuelLevel')
  assert.equal(fuel.value, 'Impossible · Jauge HS')
  assert.equal(fuel.status, 'na')
})

check('essai échoué : tentatives + symptôme, pas de durée fictive', () => {
  const incomplete = completeDraft({
    startOutcome: 'failed',
    testStartTime: '',
    returnAuto: '',
    startAttempts: '',
    startSymptom: '',
    testDuration: '',
  })
  const errors = validateGe01Step(incomplete, 2)
  assert.ok(errors.startAttempts)
  assert.ok(errors.startSymptom)
  assert.ok(!errors.testDuration)
  assert.ok(!errors.testStartTime)
  const valid = completeDraft({
    startOutcome: 'failed',
    testStartTime: '',
    returnAuto: '',
    startAttempts: '2',
    startSymptom: 'Le démarreur claque sans combustion',
    testDuration: '',
    finalStatus: 'Critique',
  })
  assert.deepEqual(validateGe01Step(valid, 2), {})
  const checks = buildGe01Checks(valid, 'Agent test')
  const duration = checks.find((item) => item.code === 'duree_essai')
  const start = checks.find((item) => item.code === 'demarrage_reussi')
  assert.equal(duration.status, 'not_checked')
  assert.equal(duration.valueNumeric, undefined)
  assert.equal(start.valueBoolean, false)
  assert.equal(start.status, 'alert')
  assert.match(start.notes, /Tentatives : 2/)
  assert.equal(suggestFinalStatus(valid), 'Critique')
})

check('essai impossible : motif, aucune durée ni échec', () => {
  const incomplete = completeDraft({
    startOutcome: 'not_performed',
    testExceptionReason: '',
    testDuration: '',
    startAttempts: '',
  })
  assert.ok(validateGe01Step(incomplete, 2).testExceptionReason)
  const valid = completeDraft({
    startOutcome: 'not_performed',
    testExceptionReason: 'Local fermé, clé indisponible',
    testDuration: '',
    startAttempts: '',
    startSymptom: '',
    finalStatus: 'Intervention',
  })
  assert.deepEqual(Object.fromEntries(Object.entries(validateGe01Step(valid, 2)).filter(([key]) => key.startsWith('test') || key.startsWith('start'))), {})
  const checks = buildGe01Checks(valid, 'Agent test')
  const duration = checks.find((item) => item.code === 'duree_essai')
  const start = checks.find((item) => item.code === 'demarrage_reussi')
  assert.equal(duration.status, 'not_checked')
  assert.equal(start.status, 'not_checked')
  assert.equal(start.valueBoolean, undefined)
  assert.match(start.notes, /prévu mais non réalisé/)
})

check('AUTO sur Non : suggestion urgence, pas de présélection', () => {
  const draft = completeDraft({ geAuto: 'no', finalStatus: '' })
  assert.equal(suggestFinalStatus(draft), 'Critique')
  assert.equal(draft.finalStatus, '')
  assert.match(ge01Pilot, /value === 'no' && warning/)
  assert.match(ge01Pilot, /ge-auto-warning/)
  const items = buildReviewItems(draft, 'Agent')
  assert.equal(items.find((item) => item.id === 'geAuto').status, 'critical')
  assert.equal(items.find((item) => item.id === 'finalStatus').value, 'Manquant')
})

check('transmission incomplète : erreurs inline, Transmettre non désactivé', () => {
  const empty = createEmptyGe01Draft(new Date('2026-09-16T08:30:00'), 'empty')
  empty.date = ''
  empty.time = ''
  const errors = validateCompleteGe01Draft(empty)
  assert.ok(errors.finalStatus)
  assert.ok(errors.confirmed)
  assert.ok(errors.fuelLevel)
  assert.ok(errors.startOutcome)
  const items = buildReviewItems(empty, 'Agent')
  const missing = missingReviewCount(items)
  assert.ok(missing >= 10)
  assert.equal(items.filter((item) => item.status === 'missing').length, missing)
  assert.match(ge01Pilot, /Transmettre à Facility Manager/)
  assert.match(ge01Pilot, /disabled=\{submitting\}/)
  assert.doesNotMatch(ge01Pilot, /disabled=\{submitting \|\|/)
  assert.doesNotMatch(ge01Pilot, /disabled=\{missing/)
  assert.match(ge01Pilot, /erreur/)
})

check('hors ligne : dernier relevé et Hier disponibles sans réseau', () => {
  resetLastConfirmedGe01Cache()
  const storage = mockStorage()
  const cached = readLastConfirmedGe01(storage)
  assert.equal(cached.fuelLevel, DEMO_LAST_CONFIRMED.fuelLevel)
  assert.equal(formatYesterdayValue(cached.fuelLevel, '%'), 'Hier : 72 %')
  assert.equal(formatYesterdayValue(cached.batteryVoltage, 'V'), 'Hier : 26,2 V')
  assert.equal(lastStartLabel(cached.lastStartOutcome), 'Effectué')
  resetLastConfirmedGe01Cache()
  writeLastConfirmedGe01(EMPTY_LAST_CONTEXT, storage)
  resetLastConfirmedGe01Cache()
  const empty = readLastConfirmedGe01(storage)
  assert.equal(formatYesterdayValue(empty.fuelLevel, '%'), 'Hier : —')
  assert.equal(lastStartLabel(empty.lastStartOutcome), '—')
  assert.equal(formatMeasureDelta(70, 72, '%'), '-2 % vs hier')
})

check('mobile : grille 1 colonne sous 640 px', () => {
  assert.match(css, /@media \(max-width:640px\)/)
  assert.match(css, /\.ge-measure-grid/)
  assert.match(css, /\.ge-choice-grid\.four/)
  assert.match(css, /\.ge-review-list>li/)
  assert.match(ge01Pilot, /ge-field-grid/)
  assert.match(ge01Pilot, /columns=\{4\}/)
})

check('suggestion photo si bruit présent ou fumée noire/blanche', () => {
  assert.match(ge01Pilot, /abnormalNoise === 'yes' \|\| draft\.smoke === 'Noire' \|\| draft\.smoke === 'Blanche'/)
  assert.match(ge01Pilot, /Photo recommandée/)
})

check('aucune réponse présélectionnée', () => {
  const empty = createEmptyGe01Draft(new Date('2026-09-16T08:30:00'), 'id')
  assert.equal(empty.temperatureLocal, '')
  assert.equal(empty.cleanliness, '')
  assert.equal(empty.abnormalNoise, '')
  assert.equal(empty.smoke, '')
  assert.equal(empty.startOutcome, '')
  assert.equal(empty.geAuto, '')
  assert.equal(empty.atsAuto, '')
  assert.equal(empty.alarmMc4, '')
  assert.equal(empty.finalStatus, '')
  assert.equal(empty.confirmed, false)
  assert.equal(suggestFinalStatus(empty), '')
})

check('essai effectué : heure + retour AUTO, pas de durée obligatoire', () => {
  const missing = completeDraft({ testStartTime: '', returnAuto: '', testDuration: '' })
  const errors = validateGe01Step(missing, 2)
  assert.ok(errors.testStartTime)
  assert.ok(errors.returnAuto)
  assert.ok(!errors.testDuration)
  const valid = completeDraft({ testDuration: '' })
  assert.ok(!validateGe01Step(valid, 2).testDuration)
})

if (failed) {
  console.error(`${failed} contrôle(s) GE-01 étapes 2–4 en échec`)
  process.exit(1)
}
console.log('13 contrôles GE-01 étapes 2–4 réussis.')
