import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const mod = await import(pathToFileURL(path.join(root, 'app/lib/ge01/lastContext.ts')).href)
const {
  DEMO_LAST_CONFIRMED,
  EMPTY_LAST_CONTEXT,
  ENGINE_HOURS_UNUSUAL_DELTA,
  deltaNoteForDraft,
  displayOrDash,
  evaluateEngineHoursDelta,
  formatEngineHours,
  formatShortDate,
  formatYesterdayValue,
  lastStartLabel,
  readLastConfirmedGe01,
  resetLastConfirmedGe01Cache,
  writeLastConfirmedGe01,
} = mod

function mockStorage(initial = {}) {
  const data = { ...initial }
  return {
    getItem(key) { return Object.prototype.hasOwnProperty.call(data, key) ? data[key] : null },
    setItem(key, value) { data[key] = String(value) },
    snapshot() { return { ...data } },
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

check('sans relevé précédent', () => {
  const result = evaluateEngineHoursDelta(1250, null)
  assert.equal(result.kind, '')
  assert.equal(result.message, 'Aucun relevé précédent.')
  assert.equal(displayOrDash(null), '—')
  assert.equal(displayOrDash(EMPTY_LAST_CONTEXT.location), '—')
})

check('valeur inférieure', () => {
  const result = evaluateEngineHoursDelta(1200, 1245)
  assert.equal(result.kind, 'below')
  assert.equal(result.delta, -45)
  assert.equal(result.message, 'Inférieur au dernier relevé (-45 h). Vérifiez la saisie.')
  assert.equal(deltaNoteForDraft(result), result.message)
})

check('écart > 48 h', () => {
  assert.equal(ENGINE_HOURS_UNUSUAL_DELTA, 48)
  const result = evaluateEngineHoursDelta(1300, 1245)
  assert.equal(result.kind, 'unusual')
  assert.equal(result.delta, 55)
  assert.match(result.message, /écart inhabituel/)
  assert.equal(deltaNoteForDraft(result), result.message)
})

check('écart 0 à 48 h', () => {
  const result = evaluateEngineHoursDelta(1260, 1245)
  assert.equal(result.kind, 'ok')
  assert.equal(result.message, '+15 h depuis le dernier relevé')
  assert.equal(deltaNoteForDraft(result), '')
})

check('champ vide avec relevé précédent', () => {
  const result = evaluateEngineHoursDelta(null, 1245)
  assert.equal(result.kind, '')
  assert.equal(result.message, 'Dernier relevé : 1 245 h')
  assert.equal(formatEngineHours(1245), '1 245 h')
  assert.equal(formatShortDate('2026-09-15'), '15/09')
})

check('cache démo hors ligne', () => {
  resetLastConfirmedGe01Cache()
  const storage = mockStorage()
  const read = readLastConfirmedGe01(storage)
  assert.equal(read.engineHours, DEMO_LAST_CONFIRMED.engineHours)
  assert.equal(read.location, 'Local TGBT')
  assert.ok(storage.getItem('behira:ge01:last-confirmed'))
})

check('cache vide explicite', () => {
  resetLastConfirmedGe01Cache()
  const storage = mockStorage()
  writeLastConfirmedGe01(EMPTY_LAST_CONTEXT, storage)
  resetLastConfirmedGe01Cache()
  const read = readLastConfirmedGe01(storage)
  assert.equal(read.engineHours, null)
  assert.equal(displayOrDash(read.building), '—')
})

check('seuil non bloquant tracé seulement en alerte', () => {
  assert.equal(deltaNoteForDraft(evaluateEngineHoursDelta(1245, 1245)), '')
  assert.ok(deltaNoteForDraft(evaluateEngineHoursDelta(1100, 1245)))
})

check('valeurs d’hier pour les mesures', () => {
  assert.equal(formatYesterdayValue(72, '%'), 'Hier : 72 %')
  assert.equal(formatYesterdayValue(26.2, 'V'), 'Hier : 26,2 V')
  assert.equal(formatYesterdayValue(null, '%'), 'Hier : —')
  assert.equal(lastStartLabel('failed'), 'Échoué')
  assert.equal(lastStartLabel(null), '—')
})

if (failed) {
  console.error(`${failed} contrôle(s) Contexte GE-01 en échec`)
  process.exit(1)
}
console.log('9 contrôles Contexte GE-01 réussis.')
