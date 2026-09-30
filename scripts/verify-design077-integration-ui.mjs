import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const output=resolve(root,'../../outputs/integration-design077-2026-09-21');
await mkdir(output,{recursive:true});
const {chromium}=await import(pathToFileURL(resolve(root,'../../.analysis_runtime/node_modules/playwright/index.mjs')).href);
const browser=await chromium.launch({channel:'chrome',headless:true});
const results=[];
try {
 for(const width of [1440,768,380]) for(const personaId of ['facility','electricite']) {
  const context=await browser.newContext({viewport:{width,height:960}});
  await context.addInitScript(personaId=>localStorage.setItem('behira_demo_session_v1',JSON.stringify({personaId,mode:'demo',remember:true,issuedAt:new Date().toISOString()})),personaId);
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(process.env.BEHIRA_PREVIEW_URL??'http://127.0.0.1:4186/',{waitUntil:'networkidle'});
  const nav=page.getByRole('navigation',{name:'Navigation principale'});
  if(personaId==='facility') {
   await nav.getByRole('button',{name:'Pilotage',exact:true}).click();
   assert.deepEqual(await page.getByRole('tab').allTextContents(),['Performance','Coûts','Équipe']);
   await page.getByRole('heading',{name:'Équipements à surveiller',exact:true}).waitFor();
   assert.equal(await page.getByText('Sain ≥ 90',{exact:true}).count(),0);
   assert.ok(await page.locator('.watchlist li').count()<=5);
   await page.screenshot({path:resolve(output,`pilotage-${width}.png`),fullPage:true});
   await page.getByRole('tab',{name:'Équipe',exact:true}).click();
   await page.getByText(/^Score agent non calculable\./).waitFor();
   assert.equal(await page.locator('.agent-score-chart').count(),0);
   await nav.getByRole('button',{name:'Dossiers',exact:true}).click();
   await page.screenshot({path:resolve(output,`dossiers-${width}.png`),fullPage:true});
  } else {
   await nav.getByRole('button',{name:'Rondes',exact:true}).click();
   await page.getByRole('heading',{name:'GE-01 · Ronde quotidienne du groupe électrogène',exact:true}).waitFor();
   assert.equal(await page.getByText('Toutes les saisies sont synchronisées',{exact:true}).count(),0);
   await page.screenshot({path:resolve(output,`ge01-${width}.png`),fullPage:true});
   await page.getByRole('button',{name:'+ Déposer un rapport prestataire',exact:true}).click();
   await page.getByLabel('Coût indiqué').fill('400000');
   await page.getByText(/Montant supérieur ou égal au seuil.*Administration/).waitFor();
   await page.getByLabel('Coût indiqué').fill('399999');
   await page.getByText(/Sous le seuil.*Facility Manager/).waitFor();
   await page.getByRole('button',{name:'Réserves à lever',exact:true}).click();
   await page.getByRole('textbox',{name:'Réserves éventuelles',exact:true}).fill('Réserve de démonstration');
   await page.getByRole('button',{name:'Aucune réserve',exact:true}).click();
   assert.equal(await page.getByRole('textbox',{name:'Réserves éventuelles',exact:true}).count(),0);
   const file={name:'recette.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.4\n%TEST ONLY\n')};
   await page.locator('.vendor-dropzone input[type=file]').setInputFiles(file);
   await page.getByRole('button',{name:'Retirer',exact:true}).click();
   await page.locator('.vendor-dropzone input[type=file]').setInputFiles(file);
   await page.locator('.vendor-dropzone-file').getByText('recette.pdf',{exact:true}).waitFor();
   await page.screenshot({path:resolve(output,`prestataire-${width}.png`),fullPage:true});
  }
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,`${personaId}/${width}: overflow`);
  assert.deepEqual(errors,[]);results.push({width,personaId,errors,success:true});await context.close();
 }
 console.log('DESIGN-077 integration: Pilotage, Dossiers, GE-01, vendor file/reserves/threshold, 1440/768/380 px passed. Explicit demo; no server writes.');
} finally {await browser.close();await writeFile(resolve(output,'results.json'),JSON.stringify(results,null,2));}
