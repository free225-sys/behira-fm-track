import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const css = read('app/globals.css');
const page = read('app/page.tsx');

assert.equal(
  css.includes('.connected-round-progress button b{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:normal;word-break:normal;hyphens:auto}'),
  true,
);
assert.equal(css.includes('.connected-round-progress button b{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere}'), false);
assert.equal(css.includes('.section-heading.round-heading{flex-wrap:wrap;align-items:flex-start;gap:8px 12px}'), true);
assert.equal(css.includes('.section-heading.round-heading>.badge .badge-label{overflow:visible;text-overflow:unset;white-space:nowrap;max-width:none}'), true);
assert.equal(css.includes('.anti-zombie-summary-head>.badge,'), true);
assert.equal(css.includes('.anti-zombie-summary-head>.badge .badge-label{overflow:visible;text-overflow:unset;white-space:nowrap;max-width:none}'), true);
assert.equal(css.includes('.dossier-steps{flex-wrap:wrap;margin-inline:16px}'), true);
assert.equal(css.includes('.persona-trigger-copy b{white-space:normal;overflow:visible;text-overflow:unset}'), true);
assert.equal(css.includes('.panel-head>.badge{flex:0 0 auto;max-width:100%}'), true);
assert.equal(css.includes('.panel-head>.badge .badge-label{overflow:visible;text-overflow:unset;white-space:nowrap;max-width:none}'), true);
assert.equal(css.includes('hyphens:manual'), true);
assert.equal(page.includes("replace('Équipements', 'Équipe\\u00ADments')"), true);
assert.equal(
  css.includes('.dossier-workflow>div b{overflow:visible;text-overflow:clip;white-space:normal;overflow-wrap:normal;word-break:normal;hyphens:auto}'),
  true,
);
assert.equal(css.includes('.main-column{padding-bottom:92px}'), true);
assert.equal(css.includes('.topbar h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'), true);
assert.equal(css.includes('.surpresseur-progress button{flex:0 0 112px}'), true);
assert.equal(css.includes('.icon-button{display:none}'), false);
assert.equal(css.includes('.panel-head button{display:none}'), false);

console.log('verify-lot6-ui: ok');
