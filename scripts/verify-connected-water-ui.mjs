import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=resolve(root,'node_modules/.cache/connected-water-ui');await mkdir(dir,{recursive:true});
const source=root.replaceAll('\\','/');
await writeFile(resolve(dir,'index.html'),'<html><meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>');
await writeFile(resolve(dir,'fixture.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import {LegacyReport} from '/@fs/${source}/app/page.tsx';
import {RiaForm} from '/@fs/${source}/app/components/RiaRound.tsx';
import {RoundPilotHeader} from '/@fs/${source}/app/components/shared/RoundPilotHeader.tsx';
import '/@fs/${source}/app/globals.css';
const wilo=location.search.includes('wilo');window.saved=null;window.calls=0;
const s={online:false,running:false,counts:{pending:0,syncing:0,synced:0,failed:0,conflict:0,actionable:0},latestRoundReceipt:null,latestIssue:null,deleteDraft:async()=>{},loadDraft:async()=>wilo?null:({value:{id:'local-test',performedAt:'2026-09-28T14:20:00.000Z',answers:{},reasons:{},photos:[],summary:'',queued:false}}),saveDraft:async(key,value)=>{window.saved=value},enqueueRound:async()=>{window.calls++},retryFailed:async()=>0,synchronize:async()=>null};
createRoot(document.getElementById('root')).render(<main style={{maxWidth:1180,padding:16,margin:'auto'}}><RoundPilotHeader title="RIA-01 · Réseau incendie" subtitle="Cinq étapes · contrôle quotidien" badge={<span className="mockup-label">Saisie terrain</span>}/><>{wilo?<LegacyReport persona={{id:"eau_incendie",name:"Agent de test",role:"Eau et incendie"}} persistenceEnabled={true} offlineSync={s} onNavigate={()=>{}} flash={()=>{}}/>:<RiaForm offlineSync={s}/>}</></main>);
`);
const server=await createServer({configFile:false,define:{"process.env":{}},root:dir,plugins:[{name:'test-only-export',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/app/page.tsx'))return code.replace('function LegacyReport(', 'export function LegacyReport(');}},react()],resolve:{dedupe:['react','react-dom'],alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4187,strictPort:true,fs:{allow:[root,dir]}}});
const {chromium}=await import(pathToFileURL(resolve(root,'tests/browser/node_modules/playwright/index.mjs')).href);
let browser;
try{
 await server.listen();if(process.argv.includes('--serve')){console.log('Recette locale : http://127.0.0.1:4187 (RIA), /?wilo (WILO). Transport simule, aucun acces distant.');await new Promise(()=>{});}browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1440,380]){
 const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Europe/Paris'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4187');await page.locator('input[type=date]').waitFor();
 assert.equal(await page.locator('input[type=time]').inputValue(),'14:20');
 assert.equal(await page.locator('select').first().inputValue(),'');
 const rail=page.locator('.connected-round-progress button');assert.equal(await rail.nth(1).isDisabled(),true);
 await page.locator('input[type=time]').fill('10:35');
 await page.waitForFunction(()=>window.saved?.performedAt==='2026-09-28T10:35:00.000Z');
 for(const el of await page.locator('.ge-datetime-row input,.ge-datetime-row button').all()){
 const r=await el.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width,JSON.stringify({width,r}));
 }
 await page.getByRole('button',{name:'Maintenant',exact:true}).click();
 assert.ok(Math.abs(Date.now()-Date.parse(await page.evaluate(()=>window.saved.performedAt)))<5000);
 await page.getByRole('button',{name:'Suivant',exact:true}).click();
 await page.getByRole('button',{name:'Suivant',exact:true}).click();
 assert.equal(await page.getByText('Valeur non renseignée',{exact:true}).count(),2);
 await page.locator('input[inputmode=decimal]').first().fill('5');
 assert.equal(await page.getByText('Valeur non renseignée',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Précédent',exact:true}).click();assert.equal(await rail.nth(2).isEnabled(),true);assert.equal(await rail.nth(3).isDisabled(),true);
 await rail.nth(2).click();await page.getByRole('button',{name:'Suivant',exact:true}).click();await page.getByRole('button',{name:'Suivant',exact:true}).click();
 assert.equal(await page.getByRole('checkbox').isChecked(),false);assert.equal(await page.getByRole('button',{name:'Transmettre le rapport RIA'}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.calls),0);assert.deepEqual(errors,[]);
 await page.goto('http://127.0.0.1:4187/?wilo');await page.locator('input[type=date]').waitFor();
 const wrail=page.locator('.connected-round-progress button');assert.equal(await wrail.nth(1).isDisabled(),true);
 for(const el of await page.locator('.ge-datetime-row input,.ge-datetime-row button').all()){const r=await el.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width);}
 await page.getByRole('button',{name:'Continuer'}).click();
 assert.equal(await page.getByText('Valeur non renseignée',{exact:true}).count(),2);
 assert.equal(await page.locator('.measure-alert').count(),0);
 await page.locator('.measure-grid input').first().fill('2.8');assert.equal(await page.locator('.measure-alert').count(),1);
 await page.locator('.measure-grid input').first().fill('');assert.equal(await page.locator('.measure-alert').count(),0);
 await page.getByRole('button',{name:'Continuer'}).click();assert.equal(await page.locator('.check-grid .unreviewed').count(),4);
 await page.getByRole('button',{name:'Continuer'}).click();await page.getByRole('button',{name:'Continuer'}).click();
 assert.equal(await page.getByRole('checkbox').isChecked(),false);assert.equal(await page.locator('.proposed-finding').count(),0);
 assert.equal(await page.evaluate(()=>window.calls),0);assert.deepEqual(errors,[]);
 await page.close();console.log('Connected WILO/RIA: date Abidjan, empty values, navigation, confirmation and layout OK at '+width+'px');
 }
}finally{await browser?.close();await server.close();}
