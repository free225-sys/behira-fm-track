import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
const root=fileURLToPath(new URL('../',import.meta.url));
const dir=resolve(root,'../../tmp/connected-water-ui');await mkdir(dir,{recursive:true});
const source=root.replaceAll('\\','/');
await writeFile(resolve(dir,'index.html'),`<html lang="fr"><meta name="viewport" content="width=device-width,initial-scale=1"><style>@font-face{font-family:Geist;src:url('/@fs/${source}/node_modules/geist/dist/fonts/geist-sans/Geist-Regular.woff2')}@font-face{font-family:Geist;font-weight:700;src:url('/@fs/${source}/node_modules/geist/dist/fonts/geist-sans/Geist-Bold.woff2')}:root{--font-geist-sans:Geist}</style><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>`);
await writeFile(resolve(dir,'fixture.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import {LegacyReport} from '/@fs/${source}/app/page.tsx';
import {RiaForm} from '/@fs/${source}/app/components/RiaRound.tsx';
import {RIA_FIELDS} from '/@fs/${source}/app/lib/ria/report.ts';
import {RoundPilotHeader} from '/@fs/${source}/app/components/shared/RoundPilotHeader.tsx';
import '/@fs/${source}/app/globals.css';
const restored={submissionId:'local-wilo-test',performedAt:new Date(Date.now()-1200000).toISOString(),step:0,pressure:'5',tankLevel:'72',observation:'Contrôle local fictif',checks:{auto:true,p1:true,p2:true,leak:true,valves:true,alarm:true},quickTitle:'',quickPriority:'Moyenne',quickZone:'',quickControlType:'',confirmed:true,photoExceptionReason:'Appareil photo indisponible pendant le test',wiloReasons:{},wiloAnswers:{TYPE_RONDE:'Quotidienne',MANO_LISIBLE:'Oui',PRESSION_MANOMETRE:'5',STABILITE_MANOMETRE:'Stable',ETAT_BACHE:'Bas',ETAT_P1:'Marche',ETAT_P2:'Arrêt disponible',CHARGE_P1:'60',CHARGE_P2:'0',ALTERNANCE:'Oui',SECOURS_DISPONIBLE:'Oui',MANQUE_EAU:'Aucune',FUITE_DETAIL:'Aucune',BRUIT:'Normal',BALLON:'Normal',COFFRET:'Normal',LOCAL:'Propre et sec',REARMEMENT:'no'}};
const wilo=location.search.includes('wilo'),isTest=location.search.includes('recette');window.saved=null;window.calls=0;window.draftKeys=[];const riaAnswers=Object.fromEntries(RIA_FIELDS.map(([code,,type])=>[code,type==='bool'?(['gmp_fault','gmp_stop','isg_fault'].includes(code)?'no':'yes'):type==='number'?'5':type.split('|')[0]]));
const s={online:false,running:false,counts:{pending:0,syncing:0,synced:0,failed:0,conflict:0,actionable:0},latestRoundReceipt:null,latestIssue:null,deleteDraft:async()=>{},loadDraft:async(key)=>{window.draftKeys.push(key);return wilo?(location.search.includes('restored')?{value:JSON.parse(localStorage.getItem('wilo-test-draft')||'null')??restored}:null):({value:{id:'local-test',performedAt:'2026-09-28T14:20:00.000Z',answers:location.search.includes('restored')?riaAnswers:{},reasons:{},photos:[],summary:'',queued:false}});},saveDraft:async(key,value)=>{window.saved=value;if(location.search.includes('restored'))localStorage.setItem('wilo-test-draft',JSON.stringify(value))},enqueueRound:async(payload)=>{window.calls++;window.payload=payload},retryFailed:async()=>0,synchronize:async()=>null};
createRoot(document.getElementById('root')).render(<main style={{maxWidth:1180,padding:16,margin:'auto'}}><>{!wilo&&<RoundPilotHeader title="RIA-01 · Réseau incendie" subtitle="Cinq étapes · contrôle quotidien" badge={<span className="mockup-label">Saisie terrain</span>}/>}</><>{wilo?<LegacyReport isTest={isTest} persona={{id:"eau_incendie",name:"Agent de test",role:"Eau et incendie"}} persistenceEnabled={true} offlineSync={s} onNavigate={()=>{}} flash={()=>{}} history={<div className="round-history">Historique WILO-01</div>}/>:<RiaForm isTest={isTest} offlineSync={s}/>}</></main>);
`);
const server=await createServer({configFile:false,define:{"process.env":{}},root:dir,plugins:[{name:'test-only-export',enforce:'pre',transform(code,id){if(id.replaceAll('\\','/').endsWith('/app/page.tsx'))return code.replace('function LegacyReport(', 'export function LegacyReport(');}},react()],resolve:{dedupe:['react','react-dom'],alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4187,strictPort:true,fs:{allow:[root,dir]}}});
const {chromium}=await import(pathToFileURL(resolve(root,'../../.analysis_runtime/node_modules/playwright/index.mjs')).href);
let browser;
try{
 await server.listen();browser=await chromium.launch({channel:'chrome',headless:true});
 for(const width of [1440,380]){
 const page=await browser.newPage({viewport:{width,height:900},timezoneId:'Europe/Paris'});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:4187');await page.locator('input[type=date]').waitFor();
 assert.equal(await page.locator('input[type=time]').inputValue(),'14:20');
 assert.equal(await page.locator('.choice-button[aria-pressed="true"]').count(),0);
 const rail=page.locator('.connected-round-progress button');assert.equal(await rail.nth(1).isDisabled(),true);
 await page.locator('input[type=time]').fill('10:35');
 await page.waitForFunction(()=>window.saved?.performedAt==='2026-09-28T10:35:00.000Z');
 for(const el of await page.locator('.ge-datetime-row input,.ge-datetime-row button').all()){
 const r=await el.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width,JSON.stringify({width,r}));
 }
 await page.getByRole('button',{name:'Maintenant',exact:true}).click();
 assert.ok(Math.abs(Date.now()-Date.parse(await page.evaluate(()=>window.saved.performedAt)))<5000);
 await page.getByRole('button',{name:'Continuer',exact:true}).click();
 await page.getByRole('button',{name:'Continuer',exact:true}).click();
 assert.equal(await page.getByText('Valeur non renseignée',{exact:true}).count(),2);
 await page.locator('input[inputmode=decimal]').first().fill('5');
 assert.equal(await page.getByText('Valeur non renseignée',{exact:true}).count(),1);
 await page.getByRole('button',{name:'Précédent',exact:true}).click();assert.equal(await rail.nth(2).isEnabled(),true);assert.equal(await rail.nth(3).isDisabled(),true);
 await rail.nth(2).click();await page.getByRole('button',{name:'Continuer',exact:true}).click();await page.getByRole('button',{name:'Continuer',exact:true}).click();
 assert.equal(await page.getByRole('checkbox').isChecked(),false);assert.equal(await page.getByRole('button',{name:'Transmettre le rapport RIA'}).isDisabled(),true);
 assert.equal(await page.evaluate(()=>window.calls),0);assert.deepEqual(errors,[]);
 await page.goto('http://127.0.0.1:4187/?wilo');await page.locator('input[type=date]').waitFor();
 const historyPlace=await page.evaluate(()=>{const form=document.querySelector('.surpresseur-form-card')?.getBoundingClientRect();const history=document.querySelector('.round-history')?.getBoundingClientRect();return {form,history,width:innerWidth};});
 assert.ok(historyPlace.form&&historyPlace.history,'historique WILO rendu sur le vrai formulaire');
 if(width>=1100)assert.ok(historyPlace.history.x>historyPlace.form.x,'historique WILO dans la colonne de droite');
 else assert.ok(historyPlace.history.y>=historyPlace.form.y+historyPlace.form.height-2,'historique WILO sous le formulaire');
 const wrail=page.locator('.connected-round-progress button');assert.equal(await wrail.nth(1).isDisabled(),true);
 for(const el of await page.locator('.ge-datetime-row input,.ge-datetime-row button').all()){const r=await el.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width);}
 await page.getByRole('button',{name:'Continuer'}).click();
 assert.equal(await page.getByText('Valeur non renseignée',{exact:true}).count(),2);
 assert.equal(await page.locator('.measure-alert').count(),0);
 await page.locator('.measure-grid input').first().fill('2.8');assert.equal(await page.locator('.measure-alert').count(),1);
 for(const el of await page.locator('.ge-datetime-row input,.ge-datetime-row button').all()){const r=await el.boundingBox();assert.ok(r.x>=0&&r.x+r.width<=width,'second reading stays inside viewport');}
 // Second relevé impossible : sa date n'est plus demandée (le motif vaut pour les deux).
 {const conf=page.locator('.wilo-field').filter({hasText:'Second relevé de pression coffret'});await conf.getByLabel('Mesure impossible à relever').check();
  assert.equal(await page.locator('.wilo-field').filter({hasText:'Date et heure du second relevé'}).count(),0);
  await conf.getByLabel('Mesure impossible à relever').uncheck();assert.equal(await page.locator('.wilo-field').filter({hasText:'Date et heure du second relevé'}).count(),1);}
 assert.match(await page.locator('.measure-alert').innerText(),/Pression critique/);
 await page.screenshot({path:resolve(dir,'wilo-pressure-'+width+'.png'),fullPage:true});
 await page.locator('.measure-grid input').first().fill('');assert.equal(await page.locator('.measure-alert').count(),0);
 await page.getByRole('button',{name:'Continuer'}).click();assert.equal(await page.locator('.control-choice').count(),1);assert.equal(await page.locator('.control-choice .choice-chip.is-selected').count(),0);
 // DEC-019 : la disponibilité de la pompe de secours n'est plus demandée (déduite de l'état P2).
 assert.equal(await page.locator('.wilo-field').filter({hasText:'Pompe de secours disponible'}).count(),0);
 // DEC-020 : « Non vérifié » demande un motif ; « Anomalie » est un choix explicite.
 await page.locator('.control-choice').filter({hasText:'Mode automatique actif'}).getByRole('button',{name:'Non vérifié',exact:true}).click();
 assert.equal(await page.getByLabel('Motif — Mode automatique actif').count(),1);
 await page.screenshot({path:resolve(dir,'wilo-controls-'+width+'.png'),fullPage:true});
 await page.getByRole('button',{name:'Continuer'}).click();await page.getByRole('button',{name:'Continuer'}).click();
 assert.equal(await page.getByRole('checkbox').isChecked(),false);assert.equal(await page.locator('.proposed-finding').count(),0);
 assert.equal(await page.evaluate(()=>window.calls),0);assert.deepEqual(errors,[]);
 await page.goto('http://127.0.0.1:4187/?wilo&restored');await page.locator('input[type=date]').first().waitFor();
 await page.locator('.wilo-field').filter({hasText:'Type de ronde'}).getByRole('button',{name:'Après intervention',exact:true}).click();
 await page.waitForFunction(()=>window.saved?.wiloAnswers?.TYPE_RONDE==='Après intervention');
 await page.reload();await page.locator('.choice-chip.is-selected').filter({hasText:'Après intervention'}).waitFor();
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'Continuer'}).click();
 // DEC-022 : la valeur déduite de l'état P2 doit rester une réponse valide ('Oui'/'Non') à l'envoi.
 const p2=page.locator('.wilo-field').filter({hasText:'État observé P2'});
 await p2.getByRole('button',{name:'Défaut',exact:true}).click();await p2.getByRole('button',{name:'Arrêt disponible',exact:true}).click();
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'Continuer'}).click();
 assert.equal(await page.getByRole('checkbox').isChecked(),false,'restoring a draft must not restore confirmation');
 assert.equal(await page.locator('.proposed-finding').count(),1,'tank-only finding must be included in summary');
 assert.equal(await page.getByText('Aucun écart déclaré',{exact:true}).count(),0);
 await page.getByRole('checkbox').check();await page.getByRole('button',{name:'Terminer la ronde'}).click();
 await page.waitForFunction(()=>window.calls===1);const sent=await page.evaluate(()=>window.payload);
 assert.equal(sent.equipmentCode,'WILO-01');assert.ok(sent.anomaly);assert.equal(sent.checks.find(x=>x.code==='ETAT_BACHE').valueText,'Bas');
 assert.equal(sent.checks.find(x=>x.code==='TYPE_RONDE').valueText,'Après intervention');assert.equal(sent.checks.find(x=>x.code==='SECOURS_DISPONIBLE').valueText,'Oui');assert.equal(sent.checks.find(x=>x.code==='REARMEMENT').valueBoolean,false);
 assert.equal(sent.checks.find(x=>x.code==='CHARGE_P2').valueNumeric,0);assert.equal(sent.checks.find(x=>x.code==='WILO_RULE_VERSION').valueText,'wilo.20260928.v1');
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no horizontal page overflow');
 await page.screenshot({path:resolve(dir,'wilo-'+width+'.png'),fullPage:true});
 assert.deepEqual(errors,[]);

 for(const equipment of ['wilo','ria']){
  await page.goto('http://127.0.0.1:4187/?'+equipment+'&restored&recette');await page.locator('input[type=date]').first().waitFor();
  const keys=await page.evaluate(()=>window.draftKeys);assert.ok(keys.every(k=>k.endsWith(':recette')),'recipe draft key isolation');
  for(let i=0;i<4;i++)await page.getByRole('button',{name:'Continuer'}).click();
  const attestation=page.getByRole('checkbox',{name:/fictives/});assert.equal(await attestation.isChecked(),false);
  const confirm=page.getByRole('checkbox',{name:/observations correspondent|valeurs correspondent/});await confirm.check();
  const send=page.getByRole('button',{name:equipment==='wilo'?'Terminer la ronde':'Transmettre le rapport RIA'});
  if(equipment==='wilo')await send.click();else assert.equal(await send.isDisabled(),true);
  assert.equal(await page.evaluate(()=>window.calls),0,'no un-attested enqueue');
  await attestation.check();await send.click();await page.waitForFunction(()=>window.calls===1);
  const data=await page.evaluate(()=>window.payload);assert.equal(data.isTest,true);assert.equal(data.testAttested,true);
  assert.equal(data.equipmentCode,equipment==='wilo'?'WILO-01':'RIA-01');
  await page.goto('http://127.0.0.1:4187/?'+equipment);await page.locator('input[type=date]').first().waitFor();
  assert.ok((await page.evaluate(()=>window.draftKeys)).every(k=>!k.endsWith(':recette')),'production draft key unchanged');
 }
 assert.deepEqual(errors,[]);
 await page.close();console.log('Connected WILO/RIA: date Abidjan, empty values, navigation, confirmation and layout OK at '+width+'px');
 }
}finally{await browser?.close();await server.close();}
