import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('..', import.meta.url);
const read = (name) => readFileSync(new URL(name, root), 'utf8');
const page = read('app/page.tsx');
const css = read('app/globals.css');
const parameters = read('app/components/ParametersWorkspace.tsx');
const access = read('app/components/AccessWorkspace.tsx');
const picker = read('app/components/shared/StartRoundPicker.tsx');
const rail = read('app/components/shared/RoundStepRail.tsx');

assert.equal(css.includes('background:linear-gradient(122deg,#0f2a47,#174b76)'), false);
assert.equal(css.includes('.icon-button{display:none}'), false);
assert.equal(css.includes('.panel-head button{display:none}'), false);
assert.equal(css.includes('.main-column{padding-bottom:92px}'), true);
assert.equal(css.includes('.content{padding-bottom:calc(72px + env(safe-area-inset-bottom))}'), true);
assert.equal(css.includes('.topbar h1{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'), true);
assert.equal(css.includes('.topbar h1{white-space:normal;overflow:visible;text-overflow:clip}'), true);
assert.equal(css.includes('.surpresseur-progress button{flex:0 0 112px}'), true);
assert.equal(css.includes('.surpresseur-progress button{min-height:44px}'), true);
assert.equal(css.includes('.control-choice-grid{grid-template-columns:minmax(0,1fr)}'), true);
assert.match(css, /\.round-pilot-header > \.mockup-label\{\s*flex:0 0 auto;\s*width:max-content;/);
assert.doesNotMatch(css, /\.round-pilot-header > \.mockup-label\{\s*flex-basis:100%/);
assert.equal(css.includes('.start-round-picker.is-readonly .start-round-switch{width:auto'), true);
assert.match(parameters, /tab !== 'acces' && tab !== 'notifications'/);
assert.match(parameters, /LECTURE SEULE/);
assert.doesNotMatch(page, /view === 'settings' && <>/);
assert.match(page, /users=\{personaId === 'administration' && session\.mode === 'demo'/);
assert.match(access, /disabled=\{!prepareReady\}/);
assert.match(access, /validateAccessCreate\(\{ name, email, reason \}\)/);
assert.doesNotMatch(picker, /is-readonly field is-select/);
assert.match(picker, /className="start-round-legend"/);
assert.match(rail, /nav\.scrollTo\(\{ left: Math\.max\(0, left\) \}\)/);
assert.match(page, /anomaly\.proof && !anomaly\.proofPending \? 'Clôturer le dossier' : 'Contrôler la preuve'/);

console.log('verify-lot5-ui: ok');
