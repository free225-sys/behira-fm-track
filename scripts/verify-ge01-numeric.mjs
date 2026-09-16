import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const mod = await import(pathToFileURL(path.join(root, 'app/lib/ge01/thresholds.ts')).href)
const {
  sanitizeNumeric,
  parseMeasure,
  evaluateFuel,
  evaluateOil,
  evaluateWater,
  evaluateBattery,
  evaluateDuration,
  statusFromValue,
} = mod

const cases = [
  ['carburant 64', evaluateFuel(64), 'ok'],
  ['carburant 63.9', evaluateFuel(63.9), 'critical'],
  ['huile 90', evaluateOil(90), 'ok'],
  ['huile 89.9', evaluateOil(89.9), 'critical'],
  ['eau 94.9', evaluateWater(94.9), 'ok'],
  ['eau 95', evaluateWater(95), 'alert'],
  ['eau 100', evaluateWater(100), 'alert'],
  ['eau 100.1', evaluateWater(100.1), 'critical'],
  ['batterie 25.1', evaluateBattery(25.1), 'ok'],
  ['batterie 25', evaluateBattery(25), 'alert'],
  ['batterie 23', evaluateBattery(23), 'alert'],
  ['batterie 22.9', evaluateBattery(22.9), 'critical'],
  ['essai 10-20 / 6', evaluateDuration(6, 'run'), 'critical'],
  ['essai 10-20 / 8', evaluateDuration(8, 'run'), 'alert'],
  ['essai 10-20 / 10', evaluateDuration(10, 'run'), 'ok'],
  ['essai 10-20 / 20', evaluateDuration(20, 'run'), 'ok'],
  ['essai 10-20 / 23', evaluateDuration(23, 'run'), 'alert'],
  ['essai 10-20 / 26', evaluateDuration(26, 'run'), 'critical'],
  ['essai ~5 / 2', evaluateDuration(2, 'start'), 'critical'],
  ['essai ~5 / 3.5', evaluateDuration(3.5, 'start'), 'alert'],
  ['essai ~5 / 4', evaluateDuration(4, 'start'), 'ok'],
  ['essai ~5 / 7', evaluateDuration(7, 'start'), 'ok'],
  ['essai ~5 / 8', evaluateDuration(8, 'start'), 'alert'],
  ['essai ~5 / 11', evaluateDuration(11, 'start'), 'critical'],
]

let failed = 0
for (const [label, actual, expected] of cases) {
  try {
    assert.equal(actual, expected, label)
    console.log(`✓ ${label}`)
  } catch (error) {
    failed += 1
    console.log(`✗ ${label} → ${actual}`)
    console.error(error.message)
  }
}

assert.equal(sanitizeNumeric('abc'), '')
assert.equal(sanitizeNumeric('12abc'), '12')
assert.equal(sanitizeNumeric('24,6 V'), '24.6')
assert.equal(sanitizeNumeric('12.3.4'), '12.34')
assert.equal(mod.sanitizeInteger('12abc'), '12')
assert.equal(mod.sanitizeInteger('3.5'), '3')
assert.equal(parseMeasure(''), null)
assert.equal(statusFromValue('', evaluateFuel), null)
assert.equal(evaluateDuration(12, ''), null)
console.log('✓ saisie non numérique rejetée')
console.log('✓ champ vide resté neutre')
console.log('✓ durée sans type d’essai restée neutre')

if (failed) {
  console.error(`${failed} contrôle(s) de seuils en échec`)
  process.exit(1)
}
console.log('24 contrôles de seuils + 3 garde-fous réussis.')
