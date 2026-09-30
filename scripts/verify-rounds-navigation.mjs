import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(root, '../../outputs/correctif-rondes-2026-09-17');
const { chromium } = await import(pathToFileURL(resolve(root, '../../.analysis_runtime/node_modules/playwright/index.mjs')).href);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const results = [];
try {
  for (const personaId of ['electricite', 'facility']) {
    for (const width of [1280, 380]) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      await context.addInitScript(personaId => localStorage.setItem('behira_demo_session_v1', JSON.stringify({ personaId, mode: 'demo', remember: true, issuedAt: new Date().toISOString() })), personaId);
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.goto(process.env.BEHIRA_PREVIEW_URL ?? 'http://127.0.0.1:4185/', { waitUntil: 'networkidle' });
      const nav = page.getByRole('navigation', { name: 'Navigation principale' });
      await nav.getByRole('button', { name: 'Rondes', exact: true }).click();
      try {
        if (personaId === 'electricite') {
          const hours = page.getByLabel('Heures compteur moteur');
          await hours.waitFor({ timeout: 5000 });
          await hours.fill('123.5');
          assert.equal(await hours.inputValue(), '123.5');
          assert.equal(await page.getByRole('button', { name: 'Continuer', exact: true }).isEnabled(), true);
          assert.equal(await page.getByText('Simulation locale sans sauvegarde', { exact: true }).isVisible(), true);
        } else {
          await page.getByRole('heading', { name: 'Rapports serveur indisponibles', exact: true }).waitFor({ timeout: 5000 });
          assert.equal(await page.getByLabel('Heures compteur moteur').count(), 0);
        }
        assert.deepEqual(errors, []);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2), false);
        await page.screenshot({ path: resolve(output, `RONDES_${personaId}_${width}.png`), fullPage: true });
        await nav.getByRole('button', { name: 'Accueil', exact: true }).click();
        await nav.getByRole('button', { name: 'Rondes', exact: true }).click();
        await (personaId === 'electricite' ? page.getByLabel('Heures compteur moteur') : page.getByRole('heading', { name: 'Rapports serveur indisponibles', exact: true })).waitFor();
        results.push({ personaId, width, passed: true });
      } catch (error) {
        await page.screenshot({ path: resolve(output, `FAIL_${personaId}_${width}.png`), fullPage: true });
        throw error;
      } finally { await context.close(); }
    }
  }
} finally {
  await browser.close();
  await writeFile(resolve(output, 'results.json'), JSON.stringify(results, null, 2));
}
console.log('Rounds navigation passed: actual home → rounds → home → rounds, agent form and FM reception, desktop and mobile. Demo mode performs no server write.');
