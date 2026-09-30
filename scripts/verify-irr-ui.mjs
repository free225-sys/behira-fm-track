// Recette navigateur de la ronde IRR-01 (30/09/2026) : trois choix, motif, seuils, synthèse et charge utile.
// Même banc que verify-connected-water-ui.mjs. PLAYWRIGHT_MODULE / CHROME_PATH permettent un autre poste.
import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=resolve(root,'../../tmp/irr-ui');await mkdir(dir,{recursive:true});
const source=root.replaceAll('\\','/');
await writeFile(resolve(dir,'index.html'),`<html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>`);
await writeFile(resolve(dir,'fixture.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import {IrrForm} from '/@fs/${source}/app/components/IrrRound.tsx';
import {InputGuard} from '/@fs/${source}/app/components/InputGuard.tsx';
import '/@fs/${source}/app/globals.css';
window.calls=0;
const s={online:false,running:false,counts:{pending:0,syncing:0,synced:0,failed:0,conflict:0,actionable:0},latestRoundReceipt:null,latestIssue:null,
 deleteDraft:async()=>{window.deleted=true},loadDraft:async()=>null,saveDraft:async(k,v)=>{window.saved=v},enqueueRound:async(p)=>{window.calls++;window.payload=p},retryFailed:async()=>0,synchronize:async()=>null};
createRoot(document.getElementById('root')).render(<main style={{maxWidth:1180,padding:16,margin:'auto'}}><InputGuard/><IrrForm offlineSync={s} flash={()=>{}}/></main>);
`);
const server=await createServer({configFile:false,define:{"process.env":{}},root:dir,plugins:[react()],resolve:{dedupe:['react','react-dom'],alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4188,strictPort:true,fs:{allow:[root,dir]}}});
const playwright=process.env.PLAYWRIGHT_MODULE ?? pathToFileURL(resolve(root,'../../.analysis_runtime/node_modules/playwright/index.mjs')).href;
const {chromium}=await import(playwright);
let browser;
try{
 await server.listen();
 browser=await chromium.launch(process.env.CHROME_PATH?{executablePath:process.env.CHROME_PATH,headless:true}:{channel:'chrome',headless:true});
 for(const width of [1440,380]){
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4188');await page.getByText('ÉTAPE 1 SUR 4').waitFor();
  assert.equal(await page.locator('.connected-round-progress button').nth(1).isDisabled(),true);
  assert.equal(await page.locator('.sync-banner').count(),1,'état de synchronisation visible dans l’onglet IRR-01');
  await page.getByRole('button',{name:'Continuer →'}).click();
  assert.equal(await page.locator('.choice-chip.is-selected').count(),0,'aucune réponse présélectionnée');
  const q=(label)=>page.locator('.irr-field').filter({hasText:label});
  await q('Coffret irrigation').getByRole('button',{name:'Sec',exact:true}).click();
  await q('Programmateur Rain Bird').getByRole('button',{name:'Oui',exact:true}).click();
  await q('Pompe d’irrigation').getByRole('button',{name:'Non vérifié',exact:true}).click();
  // Garde-fou de saisie (30/09) : émoji tapé et symbole collé retirés, message affiché, texte utile conservé.
  const motif=page.getByLabel('Motif — Pompe d’irrigation disponible');
  await motif.pressSequentially('Local 😀 fermé');
  assert.equal(await motif.inputValue(),'Local  fermé','émoji tapé refusé');
  await page.locator('#input-guard-message[data-visible="true"]').waitFor();
  assert.match(await page.locator('#input-guard-message').innerText(),/émojis et les symboles décoratifs/);
  await motif.fill('Local ★ fermé ✓');assert.equal(await motif.inputValue(),'Local  fermé ','symboles collés retirés');
  await motif.fill('ok');
  await q('Pression irrigation').locator('input[inputmode=decimal]').pressSequentially('a2,5,3');
  assert.equal(await q('Pression irrigation').locator('input[inputmode=decimal]').inputValue(),'2,53','lettre et seconde virgule refusées');
  await motif.fill('Local fermé à clé');
  await q('Pression irrigation').locator('input[inputmode=decimal]').fill('1,2');
  assert.equal(await page.locator('.measure-alert').count(),1,'pression hors plage signalée');
  await q('Fuite visible').getByRole('button',{name:'Aucune',exact:true}).click();
  await page.getByRole('button',{name:'Continuer →'}).click();
  // Saisie rapide : tous les « Oui » cliqués sans attendre de rendu entre deux clics — aucune réponse ne doit se perdre.
  await page.evaluate(()=>document.querySelectorAll('.irr-field').forEach(f=>[...f.querySelectorAll('button')].find(b=>b.innerText.trim()==='Oui')?.click()));
  assert.equal(await page.locator('.irr-field .choice-chip.is-selected').count(),10,'10 réponses de jardinières conservées');
  await page.getByRole('button',{name:'Continuer →'}).click();
  await page.locator('.proposed-finding').waitFor();
  await page.getByLabel('Photo non jointe — motif obligatoire').fill('Téléphone sans appareil photo');
  await page.getByRole('checkbox',{name:/observations correspondent/}).check();
  await page.screenshot({path:resolve(dir,'irr-'+width+'.png'),fullPage:true});
  await page.getByRole('button',{name:'Terminer la ronde'}).click();
  await page.waitForFunction(()=>window.calls===1);
  assert.equal(await page.locator('.sync-banner').count(),1,'état de synchronisation visible après envoi');
  const p=await page.evaluate(()=>window.payload);
  assert.equal(p.equipmentCode,'IRR-01');assert.equal(p.reportType,'technical_round');assert.ok(p.anomaly);
  const c=(code)=>p.checks.find(x=>x.code===code);
  assert.equal(c('pressure').status,'alert');assert.equal(c('pump').status,'not_checked');assert.equal(c('pump').notes,'Local fermé à clé');
  assert.equal(c('cabinet_dry').valueBoolean,true);assert.equal(c('leak').valueBoolean,false);assert.equal(c('IRR_RULE_VERSION').valueText,'irr.20260930.v1');
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'pas de débordement horizontal');
  assert.deepEqual(errors,[]);
  console.log(`Ronde IRR-01 : trois choix, motif, seuil de pression, synthèse et charge utile OK à ${width}px`);
  await page.close();
 }
}finally{await browser?.close();await server.close();}
