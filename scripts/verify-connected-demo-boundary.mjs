import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runnerImport } from 'vite';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
// Import through a single module graph so provider and consumers share context.
const { module: components } = await runnerImport(`${root}/app/components/shared/DemoScenarioSelect.tsx`, { root, configFile: false, logLevel: 'silent' });
const { DemoScenarioProvider, DemoScenarioSelect } = components;
for (const enabled of [false, true]) {
  const html = renderToStaticMarkup(React.createElement(DemoScenarioProvider, { enabled }, React.createElement(DemoScenarioSelect)));
  assert.equal(html.includes('Scénario de démonstration'), enabled);
  assert.equal(html.includes('<select'), enabled);
}
const { module: equipment } = await runnerImport(`${root}/app/components/EquipmentWorkspace.tsx`, { root, configFile: false, logLevel: 'silent' });
const live = renderToStaticMarkup(React.createElement(equipment.EquipmentWorkspace, { equipment: [], demo: false }));
assert.ok(live.includes('Données du serveur'));
assert.ok(live.includes('Périmètre autorisé'));
assert.ok(!live.includes('Démo') && !live.includes('Six références du site'));
const demo = renderToStaticMarkup(React.createElement(equipment.EquipmentWorkspace, { equipment: [], demo: true }));
assert.ok(demo.includes('Démo'));
console.log('Connected/demo rendering boundary passed; no browser session or remote data changed.');
