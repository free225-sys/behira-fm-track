import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('../',import.meta.url)),source=root.replaceAll('\\','/');
const fixture=resolve(root,'../../tmp/diagnosis-ui'),output=resolve(root,'../../outputs/diagnosis-assignment-2026-09-21');
await mkdir(fixture,{recursive:true});await mkdir(output,{recursive:true});
await writeFile(resolve(fixture,'index.html'),'<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>');
await writeFile(resolve(fixture,'fixture.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import {Ge01WorkflowPanel} from '/@fs/${source}/app/components/Ge01WorkflowPanel.tsx';
import '/@fs/${source}/app/globals.css';
window.testState={calls:[],fail:true};
const handle=async(...args)=>{window.testState.calls.push(args);await new Promise(resolve=>setTimeout(resolve,100));if(window.testState.fail){window.testState.fail=false;return false;}return true;};
const anomaly={status:'À qualifier',proof:false,workflow:{actionCode:'QUALIFY_ASSIGN'},eligibleDiagnosisAssignees:location.search.includes('empty')?[]:[{employeeCode:'REAL-SCOPED-AGENT',label:'Agent habilité de recette'}]};
createRoot(document.getElementById('root')).render(<main style={{padding:16}}><p>RECETTE VISUELLE — transport simulé</p><Ge01WorkflowPanel anomaly={anomaly} isManager={true} isAgent={false} onSubmit={handle} onRefresh={()=>{}} onOpenCosts={()=>{}} onOpenProofs={()=>{}} busy={false}/></main>);
`);
const server=await createServer({configFile:false,root:fixture,plugins:[react()],resolve:{dedupe:['react','react-dom'],alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4179,strictPort:true,fs:{allow:[root,fixture]}}});
const {chromium}=await import(pathToFileURL(resolve(root,'../../.analysis_runtime/node_modules/playwright/index.mjs')).href);
let browser;
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1280,380]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:4179/',{waitUntil:'networkidle'});
  await page.getByLabel('Commentaire de décision').fill('Diagnostic de recette demandé');
  assert.equal(await page.getByRole('button',{name:'Affecter le diagnostic',exact:true}).isDisabled(),true);
  await page.getByLabel('Responsable du diagnostic').click();
  await page.getByRole('option',{name:'Agent habilité de recette',exact:true}).click();
  await page.getByRole('button',{name:'Affecter le diagnostic',exact:true}).click();
  assert.equal(await page.getByLabel('Responsable du diagnostic').isDisabled(),true);
  await page.getByRole('button',{name:'Confirmer l’enregistrement',exact:true}).dblclick();
  await page.waitForFunction(()=>window.testState.calls.length===1&&!window.testState.fail);
  await page.getByRole('button',{name:'Confirmer l’enregistrement',exact:true}).click();
  await page.waitForFunction(()=>window.testState.calls.length===2);
  const calls=await page.evaluate(()=>window.testState.calls);assert.deepEqual(calls[1],calls[0]);assert.equal(calls[0][4],'REAL-SCOPED-AGENT');
  await page.goto('http://127.0.0.1:4179/?empty',{waitUntil:'networkidle'});
  await page.getByLabel('Commentaire de décision').fill('Aucun agent');
  assert.equal(await page.getByRole('button',{name:'Affecter le diagnostic',exact:true}).isDisabled(),true);
  assert.match(await page.getByRole('status').innerText(),/Aucun agent actif/);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false);assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(output,`assignment-empty-${width}.png`),fullPage:true});await context.close();
 }
 console.log('Diagnosis UI: scoped selection, required owner, double click, stable retry, empty state and 1280/380 px passed (transport simulated).');
}finally{await browser?.close();await server.close();}
