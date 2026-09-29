import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from '../tests/browser/node_modules/playwright/index.mjs';

const url = process.env.MIRROR_TEST_URL ?? 'http://localhost:4190';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
await mkdir('outputs/mirror-review', { recursive: true });
try {
  for (const width of [1440, 380]) {
    const context = await browser.newContext({ viewport: { width, height: 950 } });
    const page = await context.newPage();
    const errors = [], remote = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('request', request => { if (/supabase\.(co|com)|chatgpt\.site/.test(request.url())) remote.push(request.url()); });
    async function login(name) {
      await page.goto(url);
      await page.getByRole('button', { name }).click();
      await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
      await page.getByRole('button', { name: 'Rondes', exact: true }).filter({ visible: true }).first().click();
    }
    const choose = async (label, value) => page.getByRole('group', { name: label, exact: true }).getByRole('button', { name: value, exact: true }).click();
    await login(/Agent Électricité ·/);
    await page.getByText('ÉTAPE 1 SUR 4', { exact: true }).waitFor();
    await page.locator('.field').filter({ hasText: 'Heures compteur moteur' }).locator('input').fill('1246');
    await page.getByRole('spinbutton').press('ArrowUp');
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await choose('État thermique du local', 'Normal');
    await choose('Propreté', 'Conforme');
    for (const [label, value] of [['Niveau carburant','72'],['Niveau huile moteur','95'],['Température eau','88'],['Tension batterie','26.2']]) {
      await page.locator('.ge-measure-grid .ge-measure-field').filter({ hasText: label }).locator('input[inputmode="decimal"]').fill(value);
    }
    await choose('Bruit ou vibrations', 'Absents');
    await choose('Fumée', 'Normale');
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByRole('button', { name: 'Essai effectué Le groupe a démarré' }).click();
    await page.locator('.field').filter({ hasText: 'Heure de l’essai' }).locator('input').fill('08:00');
    await choose('Retour en AUTO après l’essai','Oui');
    await page.locator('.field').filter({ hasText: 'Durée réelle de l’essai (min)' }).locator('input').fill('5');
    await choose('Fonctionnement correct pendant l’essai','Oui');
    await choose('Groupe actuellement en AUTO','Oui');
    await choose('ATS actuellement en AUTO','Oui');
    await choose('Alarme du contrôleur MC4','Aucune');
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByText('ÉTAPE 4 SUR 4', { exact: true }).waitFor();
    await choose('État final déclaré','Conforme');
    assert.equal(await page.locator('.ge-confirmation input').isChecked(), false);
    await page.locator('.ge-confirmation input').check();
    assert.equal(await page.locator('.ge-review-list .is-missing').count(), 0, await page.locator('.ge-review-list .is-missing').allTextContents());
    await page.screenshot({ path: `outputs/mirror-review/ge01-recap-${width}.png`, fullPage: true });
    await context.clearCookies();
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await login(/Agent Eau & Incendie ·/);
    await page.locator('.connected-round-progress').waitFor();
    assert.equal(await page.locator('.ge-step-head').count(), 0, 'No GE-01 form for water persona');
    await page.getByRole('button', { name: 'Continuer →', exact: true }).click();
    await page.getByText('Valeur non renseignée', { exact: true }).first().waitFor();
    const pressure = page.locator('.measure-grid input').first();
    await pressure.fill('5');
    assert.equal(await page.locator('.measure-alert').count(), 0);
    await pressure.fill('4.4');
    assert.equal(await page.locator('.measure-alert').count(), 1);
    await page.screenshot({ path: `outputs/mirror-review/wilo-${width}.png`, fullPage: true });
    await page.getByRole('tab', { name: 'RIA-01 · Incendie', exact: true }).click();
    await page.getByRole('group', { name: 'Accès au local dégagé' }).waitFor();
    assert.equal(await page.locator('.choice-button.is-selected').count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(remote, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log(`PASS ${width}px: personas, GE-01 4 étapes, WILO pression, RIA vide, aucun accès distant.`);
    await context.close();
  }
} finally { await browser.close(); }
