import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';

const root = fileURLToPath(new URL('../', import.meta.url));
const read = file => readFileSync(path.join(root, file), 'utf8');
function files(dir) {
  return readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(entry => {
    const file = `${dir}/${entry.name}`;
    return entry.isDirectory() ? files(file) : [file];
  });
}
const appFiles = files('app').filter(file => /\.(tsx?|css)$/.test(file));
for (const file of appFiles) {
  const source = read(file);
  if (file.endsWith('.tsx')) {
    const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const visit = node => {
      if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(tree) === 'input') {
        const attrs = node.attributes.properties;
        const type = attrs.find(attr => attr.name?.getText(tree) === 'type')?.initializer;
        if (type && ts.isStringLiteral(type) && ['date', 'time', 'datetime-local'].includes(type.text)) {
          assert.ok(file.startsWith('app/components/ui/'), `${file}: contrôle date/heure partagé obligatoire`);
          assert.ok(attrs.some(attr => attr.name?.getText(tree) === 'hidden' && !attr.initializer), `${file}: calendrier/horloge natif visible interdit`);
        }
      }
      ts.forEachChild(node, visit);
    };
    visit(tree);
  }
  if (file !== 'app/components/ui/select.tsx') assert.doesNotMatch(source, /<select\b/, `${file}: Select partagé obligatoire`);
  assert.doesNotMatch(source, /backdrop-filter\s*:/, `${file}: flou interdit`);
  if (file.endsWith('.css')) {
    for (const rule of source.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (/\.badge\b/.test(rule[1])) assert.doesNotMatch(rule[2], /clip-path\s*:/, `${file}: mention sans découpe`);
    }
  }
}
const css = read('app/globals.css');
const page = read('app/page.tsx');
const cockpit = read('app/components/BuildingHealthCockpit.tsx');
const workflow = read('app/components/Ge01WorkflowPanel.tsx');
const select = read('app/components/ui/select.tsx');
assert.ok(/\.badge[^{}]*\{[^}]*font-style:\s*italic/s.test(css), 'Mention italique DESIGN-051');
assert.match(read('app/components/ui/icon.tsx'), /from ['"]lucide-react['"]/);
assert.equal((page.match(/<BuildingHealthCockpit\b/g) ?? []).length, 1, 'Accueil commun sans reconstruction par profil');
for (const role of ['facility', 'administration', 'electricite', 'eau_incendie', 'rondes_assistance']) assert.ok(page.includes(`${role}:'workspace'`));
assert.match(cockpit, /buildingScore = null/);
assert.doesNotMatch(cockpit, /averageEquipment|buildingScore\s*=\s*\d|availability\s*=\s*\d/);
assert.match(select, /createPortal/);
assert.match(select, /name=\{name\} value=\{value\} disabled=\{disabled\} required=\{required\}/);
assert.match(select, /'ArrowDown','ArrowUp','Home','End'/);
assert.match(page, /proofs\.length/);
assert.match(page, /Déposer la preuve corrigée/);
assert.match(workflow, /interne sans coût/);
assert.match(workflow, /Ouvrir les preuves/);
console.log(`Contrat DESIGN-040/041/046/048/049/051 et Lucide vérifié sur ${appFiles.length} fichiers applicatifs.`);
