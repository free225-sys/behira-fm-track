// Lot 1 — choix de ronde depuis l’accueil hors planning, ouverture sur IRR-01,
// brouillon conservé au changement de ronde, mode Recette inchangé, historique à droite dès 1100 px.
// Même banc que scripts/verify-irr-ui.mjs.
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createServer } from 'vite';
import react from '@vitejs/plugin-react';

const root = fileURLToPath(new URL('../', import.meta.url));
const page = await readFile(new URL('../app/page.tsx', import.meta.url), 'utf8');
const cockpit = await readFile(new URL('../app/components/BuildingHealthCockpit.tsx', import.meta.url), 'utf8');
assert.match(page, /initialRound=\{reportChoice\}/, 'la page Rondes reçoit la ronde choisie');
assert.match(cockpit, /onChoose=\{\(id\) => onNavigate\('report', \{ round: id \}\)\}/, 'le choix de l’accueil est transmis');
assert.doesNotMatch(cockpit, /onSelect=\{\(\) => onNavigate\('report'\)\}/, 'l’ancien branchement qui jetait la ronde a disparu');
assert.match(page, /columnHistory/, 'RIA agent range l’historique en colonne');
assert.match(page, /history=\{history\}/, 'WILO reçoit l’historique dans la colonne de droite');
assert.match(page, /ROUND_CHOICES\.electricite/, 'GE-01 utilise le même sélecteur');
assert.match(page, /ROUND_CHOICES\.rondes_assistance/, 'RND-LET utilise le même sélecteur');
assert.doesNotMatch(page, /Field label="Ronde à effectuer"/, 'le sélecteur n’est pas enfermé dans un label');

const dir = resolve(root, '../../tmp/round-choice-ui');
await mkdir(dir, { recursive: true });
const source = root.replaceAll('\\', '/');
await writeFile(resolve(dir, 'index.html'), `<html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>`);
await writeFile(resolve(dir, 'fixture.tsx'), `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BuildingHealthCockpit } from '/@fs/${source}/app/components/BuildingHealthCockpit.tsx';
import { EauRoundDesk } from '/@fs/${source}/app/components/EauRoundDesk.tsx';
import { demoHomeSnapshot, sessionForAudience } from '/@fs/${source}/app/lib/ui-contract/fixtures.ts';
import '/@fs/${source}/app/globals.css';

const counts = { pending:0, syncing:0, synced:0, failed:0, conflict:0, actionable:0 };
window.saved = {};
window.deleted = [];
const sync = {
  online: false, running: false, counts, latestRoundReceipt: null, latestIssue: null, lastRun: null, ge01Drafts: [], ge01Pending: 0,
  saveDraft: async (key, value) => { window.saved[key] = value; },
  loadDraft: async (key) => window.saved[key] ? { value: window.saved[key] } : undefined,
  deleteDraft: async (key) => { window.deleted.push(key); },
  enqueueRound: async () => { throw new Error('pas d’envoi dans ce contrôle'); },
  enqueueProof: async () => { throw new Error('pas d’envoi'); },
  retryFailed: async () => 0,
  synchronize: async () => null,
};
const session = sessionForAudience('eau_incendie', 'Sylvain');

function Harness() {
  const [view, setView] = useState('home');
  const [round, setRound] = useState(null);
  const [recipe] = useState(true);
  if (view === 'home') {
    return <BuildingHealthCockpit snapshot={demoHomeSnapshot(session)} session={session} rounds={[]} onNavigate={(next, options) => {
      if (next === 'report') { setRound(options && options.round ? options.round : null); setView('report'); }
    }} />;
  }
  return <EauRoundDesk initialRound={round} isTest={recipe} persistenceEnabled offlineSync={sync} flash={() => {}}
    renderDemo={() => null}
    renderWilo={() => <p>Formulaire WILO-01</p>}
    renderRia={() => <p>Formulaire RIA-01</p>}
    renderHistory={(id) => <p>Historique {id}</p>} />;
}
createRoot(document.getElementById('root')).render(<main><Harness /></main>);
`);

const server = await createServer({
  configFile: false,
  define: { 'process.env': {} },
  root: dir,
  plugins: [react()],
  resolve: { dedupe: ['react', 'react-dom'], alias: { react: resolve(root, 'node_modules/react'), 'react-dom': resolve(root, 'node_modules/react-dom') } },
  server: { host: '127.0.0.1', port: 4191, strictPort: true, fs: { allow: [root, dir] } },
});
const playwright = process.env.PLAYWRIGHT_MODULE ?? pathToFileURL(resolve(root, 'tests/browser/node_modules/playwright/index.mjs')).href;
const { chromium } = await import(playwright);
const chrome = process.env.CHROME_PATH ?? '/tmp/chrome-root/opt/google/chrome/chrome';
let browser;
try {
  await server.listen();
  browser = await chromium.launch({ executablePath: chrome, headless: true });
  for (const width of [1440, 390]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:4191');
    await page.getByRole('button', { name: 'Ronde hors planning' }).click();
    await page.getByRole('option', { name: /IRR-01/ }).click();
    await page.getByRole('heading', { name: /IRR-01 · Ronde irrigation/ }).waitFor();
    await page.getByText('RECETTE — DONNÉES FICTIVES').waitFor();
    await page.getByRole('button', { name: 'Continuer →' }).click();
    await page.locator('.irr-field').filter({ hasText: 'Coffret irrigation' }).getByRole('button', { name: 'Sec', exact: true }).click();
    await page.waitForFunction(() => Object.keys(window.saved).includes('round:eau_incendie:IRR-01:recette'));
    await page.getByRole('button', { name: 'Ronde à effectuer' }).click();
    const contrast = await page.evaluate(() => {
      const option = document.querySelector('.start-round-item.is-selected');
      const title = option?.querySelector('b');
      const hint = option?.querySelector('small');
      const pill = option?.querySelector('.start-round-pill');
      const parse = (value) => {
        const match = value?.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
        if (!match) return null;
        return { rgb: [Number(match[1]), Number(match[2]), Number(match[3])], alpha: match[4] == null ? 1 : Number(match[4]) };
      };
      const lum = (rgb) => {
        const channel = (value) => { const s = value / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
        const [r, g, b] = rgb.map(channel);
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      const ratio = (foreground, background) => {
        if (!foreground || !background) return 0;
        const hi = Math.max(lum(foreground), lum(background));
        const lo = Math.min(lum(foreground), lum(background));
        return (hi + 0.05) / (lo + 0.05);
      };
      const optionBg = parse(option ? getComputedStyle(option).backgroundColor : '');
      const against = (node) => {
        if (!node || !optionBg) return 0;
        const fg = parse(getComputedStyle(node).color);
        const own = parse(getComputedStyle(node).backgroundColor);
        const bg = own && own.alpha > 0.2 ? own.rgb : optionBg.rgb;
        return ratio(fg?.rgb ?? null, bg);
      };
      const idle = document.querySelector('.start-round-item:not(.is-selected) b');
      return { title: against(title), hint: against(hint), pill: against(pill), idle: idle ? getComputedStyle(idle).color : '' };
    });
    assert.ok(contrast.title >= 4.5, `contraste du titre choisi ${contrast.title}`);
    assert.ok(contrast.hint >= 4.5, `contraste de l’aide choisie ${contrast.hint}`);
    assert.ok(contrast.pill >= 4.5, `contraste de la pastille ${contrast.pill}`);
    assert.equal(contrast.idle, 'rgb(23, 33, 51)', 'les autres titres restent en encre foncée');
    await page.getByRole('option', { name: /WILO-01/ }).click();
    await page.getByText('Formulaire WILO-01').waitFor();
    assert.equal(await page.getByRole('button', { name: 'Ronde à effectuer' }).getAttribute('aria-expanded'), 'false', 'la liste se ferme après le choix');
    assert.equal(await page.getByText('RECETTE — DONNÉES FICTIVES').count(), 1, 'le mode Recette reste monté avec le brouillon IRR');
    await page.getByRole('button', { name: 'Ronde à effectuer' }).click();
    await page.getByRole('option', { name: /IRR-01/ }).click();
    const sec = page.locator('.irr-field').filter({ hasText: 'Coffret irrigation' }).getByRole('button', { name: 'Sec', exact: true });
    assert.equal(await sec.getAttribute('aria-pressed'), 'true', 'la réponse IRR est toujours là');
    assert.deepEqual(await page.evaluate(() => window.deleted), [], 'changer de ronde n’efface pas le brouillon');
    const place = await page.evaluate(() => {
      const form = document.querySelector('.round-column')?.getBoundingClientRect();
      const history = document.querySelector('.round-history')?.getBoundingClientRect();
      return { form, history, width: innerWidth };
    });
    assert.ok(place.form && place.history, 'formulaire et historique sont dans la page');
    if (width >= 1100) assert.ok(place.history.x > place.form.x, 'historique dans la colonne de droite');
    else assert.ok(place.history.y >= place.form.y + place.form.height - 2, 'sous 1100 px : formulaire, puis historique');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true, 'pas de débordement horizontal');
    assert.deepEqual(errors, []);
    console.log(`Choix IRR-01 hors planning, brouillon et recette conservés, historique OK à ${width}px`);
    await page.close();
  }
} finally {
  await browser?.close();
  await server.close();
}
