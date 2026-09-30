import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('../',import.meta.url)),source=root.replaceAll('\\','/');
const fixture=resolve(root,'../../tmp/financial-return-ui'),output=resolve(root,'../../outputs/financial-return-2026-09-18');
await mkdir(fixture,{recursive:true});await mkdir(output,{recursive:true});
await writeFile(resolve(fixture,'index.html'),'<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>');
await writeFile(resolve(fixture,'fixture.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import {ConnectedCostsWorkspace} from '/@fs/${source}/app/components/ConnectedCostsWorkspace.tsx';
import '/@fs/${source}/app/globals.css';
const fm=location.search.includes('fm');window.testState={calls:[],fail:true};
const handle=async input=>{window.testState.calls.push(input);await new Promise(resolve=>setTimeout(resolve,60));if(window.testState.fail){window.testState.fail=false;throw Error('Simulated lost response');}};
const item={id:'CST-TEST-1',anomaly:'ANO-TEST-1',asset:'GE-01',title:'RECETTE — devis à préciser',kind:'Coût',amount:400000,due:'RECETTE locale',state:fm?'Renvoyée à Facility Manager':'À décider',budgetType:'opex',decisionScope:'administration',thresholdAmount:400000,reviewComment:fm?'Détail des pièces manquant':null};
createRoot(document.getElementById('root')).render(<main style={{padding:16}}><p>RECETTE VISUELLE — transport simulé</p><ConnectedCostsWorkspace items={[item]} anomalies={[{reference:item.anomaly,asset:item.asset,title:item.title}]} audience={fm?'facility':'administration'} threshold={400000} persistenceMode="server" busy={false} onSubmit={handle} onReview={handle} onOpenDossier={()=>{}} /></main>);
`);
const server=await createServer({configFile:false,root:fixture,plugins:[react()],resolve:{dedupe:['react','react-dom'],alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4178,strictPort:true,fs:{allow:[root,fixture]}}});
const {chromium}=await import(pathToFileURL(resolve(root,'../../.analysis_runtime/node_modules/playwright/index.mjs')).href);
let browser;
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1280,380]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4178/',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Décider',exact:true}).click();
  await page.getByRole('button',{name:'Renvoyer au FM',exact:true}).click();
  assert.equal(await page.getByRole('button',{name:'Confirmer la décision'}).isDisabled(),true);
  await page.getByLabel('Motif obligatoire').fill('Devis à compléter avec les pièces');
  await page.getByRole('button',{name:'Confirmer la décision'}).click();
  await page.waitForFunction(()=>window.testState.calls.length===1&&!window.testState.fail);
  await page.getByRole('button',{name:'Confirmer la décision'}).click();
  await page.waitForFunction(()=>window.testState.calls.length===2);
  const calls=await page.evaluate(()=>window.testState.calls);assert.equal(calls[0].decision,'returned');assert.deepEqual(calls[1],calls[0]);
  await page.goto('http://127.0.0.1:4178/?fm',{waitUntil:'networkidle'});
  await page.getByRole('button',{name:'Corriger et soumettre à nouveau'}).click();
  assert.match(await page.getByRole('status').innerText(),/CST-TEST-1/);
  await page.getByLabel('Montant estimatif (FCFA)').fill('399999');
  await page.getByLabel('Motif de la décision').fill('RECETTE — devis complété');
  await page.getByRole('button',{name:'Enregistrer la décision'}).click();
  await page.waitForFunction(()=>window.testState.calls.length===1&&!window.testState.fail);
  await page.getByRole('button',{name:'Enregistrer la décision'}).click();
  await page.waitForFunction(()=>window.testState.calls.length===2);
  const submissions=await page.evaluate(()=>window.testState.calls);assert.deepEqual(submissions[1],submissions[0]);assert.equal(submissions[0].replacesCostReference,'CST-TEST-1');assert.equal(submissions[0].amount,399999);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(output,`return-${width}.png`),fullPage:true});await context.close();
 }
 console.log('Financial return UI: required motive, failed-response retries, linked correction, 1280/380 px passed (transport simulated).');
}finally{await browser?.close();await server.close();}
