import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { createServer } from "vite";
import react from "@vitejs/plugin-react";

// Test-only entry point. No route or fixture is included in the application build.
const root = fileURLToPath(new URL("../", import.meta.url));
const fixtureDir = resolve(root, "../../tmp/ge01-ui-validation");
const output = resolve(root, "../../outputs/preparation-presentation-2026-09-16/candidate/browser");
const runtime = resolve(root, "../../.analysis_runtime/node_modules/playwright/index.mjs");
const { chromium } = await import(pathToFileURL(runtime).href);
await mkdir(fixtureDir, { recursive: true }); await mkdir(output, { recursive: true });
const source = root.replaceAll("\\", "/");
await writeFile(resolve(fixtureDir,"index.html"), `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette GE-01 locale</title><style>@font-face{font-family:GeistTest;src:url('/@fs/${source}/node_modules/geist/dist/fonts/geist-sans/Geist-Variable.woff2') format('woff2');font-weight:100 900}body{--font-geist-sans:GeistTest}</style><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>`);
await writeFile(resolve(fixtureDir,"fixture.tsx"), `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {Ge01ReportInbox,Ge01AgentForm} from '/@fs/${source}/app/components/Ge01Pilot.tsx';
import {InterventionReceptionPanel} from '/@fs/${source}/app/components/InterventionReceptionPanel.tsx';
import {createEmptyGe01Draft,buildGe01Checks} from '/@fs/${source}/app/lib/ge01/report.ts';
import * as store from '/@fs/${source}/app/lib/offline/store.ts';
import '/@fs/${source}/app/globals.css';
const owner='test-local-agent';const id='ge01:daily:v1';
const draft={...createEmptyGe01Draft(new Date(),crypto.randomUUID()),engineHours:'120',starts24h:'0',testDuration:'12',startOutcome:'success',functioningCorrect:'yes',returnAuto:'yes',temperatureLocal:'Normal',cleanliness:'Conforme',fuelLevel:{value:'70',unavailable:false,reason:''},oilLevel:{value:'95',unavailable:false,reason:''},waterTemperature:{value:'82',unavailable:false,reason:''},batteryVoltage:{value:'26',unavailable:false,reason:''},abnormalNoise:'no',smoke:'Aucune',geAuto:'yes',atsAuto:'yes',alarmMc4:'Aucune alarme',finalStatus:'Opérationnel',confirmed:true,step:0};
const mode=new URLSearchParams(location.search).get('case')||'normal';
let checks=buildGe01Checks(draft,'Agent de test');
if(mode==='issue')checks=checks.map(c=>c.code==='ats_auto'?{...c,status:'alert',valueBoolean:false}:c);
if(mode==='unknown')checks=checks.map(c=>c.code==='duree_essai'?{code:c.code,label:c.label,status:'not_checked',notes:'Essai impossible'}:c);
const report={id:'test-report',reference:'TEST-GE-01',reportType:'technical_round',reportStatus:'submitted',equipmentCode:'GE-01',equipmentLabel:'Groupe électrogène ELCOS',reportedBy:'Agent de test',performedAt:new Date().toISOString(),submittedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),analysis:'Données de test locales',checks,review:mode==='unavailable'?undefined:null};
window.testState={calls:0,input:null,opened:null,reads:0,assignment:null};
const planning={timezone:'Africa/Abidjan',policyVersion:'REF-20260901-v1',assignment:null,eligibleAgents:[{id:'test-local-agent',name:'Agent de test'}],rounds:[{roundId:'test-round',equipmentCode:'GE-01',zoneId:null,agentId:null,agentName:null,scheduledDate:'2026-09-17',deadline:'2026-09-17T23:59:00Z',deadlineStatus:'scheduled',state:'due',doneAt:null,result:null,missedYesterday:false}],reports:[]};
if(mode==='evidence')report.ge01Status={reportId:report.id,readAt:null,confirmedAt:new Date().toISOString(),validUntil:'2026-09-18T08:00:00Z',blockers:['fm_review_pending'],evidence:[{id:'proof-mc4',purpose:'mc4',storagePath:'test/mc4',receivedAt:new Date().toISOString()}]};
const onReview=async(report,input)=>{window.testState.calls++;window.testState.input=input;await new Promise(r=>setTimeout(r,350));if(mode==='error')throw new Error('Échec de transmission de test');return {decision:input.decision,comment:input.comment,reviewedAt:new Date().toISOString(),reviewedBy:'Faustin — test local',checkCodes:input.decision==='anomaly'?input.checkCodes:[],anomalyId:input.decision==='anomaly'?'test-anomaly':null,anomalyReference:input.decision==='anomaly'?'TEST-ANO-01':null}};
const queueApi={online:false,running:false,counts:{pending:0,syncing:0,synced:0,failed:0,conflict:0,actionable:0},latestRoundReceipt:null,latestIssue:null,
ge01Pending:(await store.listQueueItems(owner)).filter(item=>item.status!=='synced').map(item=>({id:item.id,isTest:false,date:item.payload.performedAt.slice(0,10),sentAt:item.createdAt})),
loadDraft:(key)=>store.loadDraft(owner,key),saveDraft:(key,value)=>store.saveDraft(owner,key,value),deleteDraft:(key)=>store.deleteDraft(owner,key),retryFailed:async()=>0,synchronize:async()=>null,
enqueueRound:async(payload,mutationId)=>{const now=new Date().toISOString();await store.putQueueItem({id:mutationId,ownerUserId:owner,kind:'field-round',payload,status:'pending',attempts:0,createdAt:now,updatedAt:now});window.testState.calls++;return mutationId}};
window.testStore={get:()=>store.loadDraft(owner,id),other:()=>store.loadDraft('other-agent',id),queue:()=>store.listQueueItems(owner)};
if(mode==='agent'&&!await store.loadDraft(owner,id))await store.saveDraft(owner,id,draft);
createRoot(document.getElementById('root')).render(<main style={{maxWidth:1180,margin:'auto',padding:16}}><div style={{border:'2px solid var(--warning-border)',padding:12,marginBottom:16}}>RECETTE LOCALE — DONNÉES DE TEST — AUCUNE ÉCRITURE EN PRÉPRODUCTION</div>{mode==='reception'?<InterventionReceptionPanel summary="Contrôle final effectué, résultat transmis." proofRequired={true} proofAccepted={true} busy={false} onOpenProofs={()=>{}} onSubmit={async(decision,comment,key)=>{window.testState.calls++;window.testState.input={decision,comment,key};return false;}}/>:mode==='agent'?<Ge01AgentForm agentName="Agent de test" persistenceEnabled={true} offlineSync={queueApi} flash={()=>{}}/>:<Ge01ReportInbox reports={mode==='empty'?[]:[report]} connected={mode!=='demo'} planning={mode==='evidence'?planning:undefined} onAssign={async input=>{window.testState.assignment=input;}} onRead={mode==='evidence'?async()=>{window.testState.reads++;}:undefined} onLoadProof={async()=>new Blob([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII='),c=>c.charCodeAt(0))],{type:'image/png'})} onReview={onReview} onOpenAnomaly={reference=>window.testState.opened=reference}/>}</main>);
`);
const server=await createServer({configFile:false,root:fixtureDir,plugins:[react()],resolve:{dedupe:['react','react-dom'],alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4177,strictPort:true,fs:{allow:[root,fixtureDir]}}});
let browser;
try {
  await server.listen();
  if (process.argv.includes('--serve')) {
    console.log('Recette manuelle locale — transport simulé : http://127.0.0.1:4177/?case=normal');
    console.log('Autres scénarios : ?case=issue (anomalie), ?case=agent (saisie hors connexion).');
    await new Promise(() => {});
  }
  browser=await chromium.launch({channel:'chrome',headless:true});
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  const page=await context.newPage();
  const errors=[]; page.on('pageerror',e=>errors.push(e.message));
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  const open=async(mode)=>{await page.goto('http://127.0.0.1:4177/?case='+mode);await page.getByText('RECETTE LOCALE — DONNÉES DE TEST — AUCUNE ÉCRITURE EN PRÉPRODUCTION').waitFor();};
  const submit=async()=>{await page.getByLabel('J’ai examiné les réponses et je confirme cette décision.').check();await page.getByRole('button',{name:'Enregistrer l’examen',exact:true}).click();};
  await open('reception');
  assert.equal(await page.getByRole('button',{name:'Accepter et clôturer',exact:true}).isDisabled(),true);
  await page.getByRole('combobox',{name:'Décision de réception',exact:true}).click();
  await page.getByRole('option',{name:'Renvoyer à l’agent pour reprise',exact:true}).click();
  await page.getByLabel('Motif du retour et corrections attendues',{exact:true}).fill('Reprendre le contrôle final et joindre le résultat.');
  assert.equal(await page.getByRole('button',{name:'Renvoyer pour reprise',exact:true}).isDisabled(),true);
  await page.getByLabel('Je confirme le retour de cette intervention à l’agent.').check();
  await page.getByRole('button',{name:'Renvoyer pour reprise',exact:true}).click();
  const firstReceipt=await page.evaluate(()=>window.testState.input);
  assert.equal(firstReceipt.decision,'returned');
  await page.getByRole('button',{name:'Renvoyer pour reprise',exact:true}).click();
  assert.equal((await page.evaluate(()=>window.testState.input)).key,firstReceipt.key,'Uncertain retry retains idempotency key');
  for(const width of [1280,380]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Reception fits '+width);
    await page.screenshot({path:resolve(output,`RECEPTION_${width}.png`),fullPage:true});
  }
  await open('normal');
  assert.equal(await page.locator('.ge-report-checks>div').count(),22);
  await page.getByLabel('Confirmer la conformité',{exact:true}).check();
  await page.getByLabel('Motif de l’examen',{exact:true}).fill('Contrôles examinés, aucun écart constaté.');
  await page.keyboard.press('Tab');await page.keyboard.press('Space');
  assert.equal(await page.getByLabel('J’ai examiné les réponses et je confirme cette décision.').isChecked(),true);
  await page.keyboard.press('Tab');await page.keyboard.press('Enter');
  await page.getByRole('heading',{name:'Rapport examiné — conforme'}).waitFor();
  assert.equal(await page.evaluate(()=>window.testState.calls),1);
  await page.screenshot({path:resolve(output,'GE01_P2_CONFORME_DESKTOP.png'),fullPage:true});
  await open('issue');
  assert.equal(await page.getByLabel('Confirmer la conformité',{exact:true}).isDisabled(),true);
  await page.getByLabel('Qualifier un écart et ouvrir une anomalie',{exact:true}).check();
  await page.getByLabel('Titre de l’anomalie',{exact:true}).fill('ATS hors AUTO');
  await page.getByRole('combobox',{name:'Priorité confirmée',exact:true}).click();
  await page.getByRole('option',{name:'Haute',exact:true}).click();
  await page.getByRole('checkbox',{name:'ATS actuellement en AUTO',exact:true}).check();
  await page.getByLabel('Écart constaté et motif de la décision',{exact:true}).fill('ATS déclaré hors AUTO, examen technique nécessaire.');
  await page.getByLabel('J’ai examiné les réponses et je confirme cette décision.').check();
  for(const width of [1280,768,380]){
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow at '+width);
    await page.screenshot({path:resolve(output,'GE01_P2_EXAMEN_'+width+'.png'),fullPage:true});
    if(width===1280)await page.getByRole('form',{name:'Examiner le rapport'}).screenshot({path:resolve(output,'GE01_P2_DECISION_FAUSTIN.png')});
  }
  await page.getByRole('button',{name:'Enregistrer et ouvrir l’anomalie',exact:true}).click();
  await page.getByRole('heading',{name:'Rapport examiné — anomalie ouverte'}).waitFor();
  assert.deepEqual(await page.evaluate(()=>window.testState.input.checkCodes),['ats_auto']);
  await page.getByRole('button',{name:'Ouvrir le dossier pour poursuivre son traitement'}).click();
  assert.equal(await page.evaluate(()=>window.testState.opened),'TEST-ANO-01');
  await open('unknown');assert.equal(await page.getByLabel('Confirmer la conformité',{exact:true}).isDisabled(),true);
  await open('unavailable');await page.getByRole('heading',{name:'Examen indisponible dans cet environnement'}).waitFor();
  await open('demo');assert.equal(await page.getByRole('form',{name:'Examiner le rapport'}).count(),0);
  await open('empty');await page.getByRole('heading',{name:'Aucun rapport GE-01 transmis'}).waitFor();
  await open('error');await page.getByLabel('Confirmer la conformité',{exact:true}).check();await page.getByLabel('Motif de l’examen',{exact:true}).fill('Motif conservé après erreur');await submit();
  await page.getByRole('alert').filter({hasText:'Échec de transmission de test'}).waitFor();
  assert.equal(await page.getByLabel('Motif de l’examen',{exact:true}).inputValue(),'Motif conservé après erreur');
  assert.equal(await page.getByRole('heading',{name:'Rapport examiné — conforme'}).count(),0);
  await open('evidence');
  assert.equal(await page.evaluate(()=>window.testState.reads),0,'Opening a list does not attest FM read');
  await page.getByRole('button',{name:'Voir : Contrôleur MC4',exact:true}).click();
  await page.getByAltText('Photo du contrôle GE-01').waitFor();
  await page.getByRole('button',{name:'Fermer la photo',exact:true}).click();
  await page.getByRole('button',{name:'J’ai lu ce rapport',exact:true}).click();
  assert.equal(await page.evaluate(()=>window.testState.reads),1);
  await page.getByRole('combobox',{name:'Responsable ou suppléant pour aujourd’hui',exact:true}).click();
  await page.getByRole('option',{name:'Agent de test',exact:true}).click();
  await page.getByLabel('Motif de la désignation',{exact:true}).fill('Titulaire absent : suppléance');
  await page.getByRole('button',{name:'Enregistrer la désignation',exact:true}).click();
  assert.equal((await page.evaluate(()=>window.testState.assignment)).agentId,'test-local-agent');
  for(const width of [1280,380]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Evidence review fits '+width);
    await page.screenshot({path:resolve(output,`GE01_PREUVES_FM_${width}.png`),fullPage:true});
  }
  await open('agent'); await page.getByText('BROUILLON SAUVEGARDÉ',{exact:true}).waitFor();await page.getByLabel('Heures compteur moteur').fill('123.5');
  // Poll the resolved IndexedDB value, not the truthy Promise returned by an async predicate.
  await page.evaluate(async()=>{const deadline=Date.now()+5000;while((await window.testStore.get())?.value.engineHours!=='123.5'){if(Date.now()>deadline)throw new Error('Draft was not saved');await new Promise(resolve=>setTimeout(resolve,50));}});
  await page.reload();
  await page.getByLabel('Heures compteur moteur').waitFor();
  await page.waitForFunction(()=>document.querySelector('input[inputmode="decimal"]')?.value==='123.5',undefined,{timeout:5000});
  assert.equal(await page.evaluate(async()=>await window.testStore.other()),undefined);
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'Continuer',exact:true}).click();
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF9sAAAAASUVORK5CYII=','base64');
  assert.equal(await page.locator('input[type=file]').count(),0,'Normal round has no photo input');
  await page.getByRole('button',{name:'Anomalie à signaler',exact:true}).click();
  await page.getByLabel('Défaut ou alarme',{exact:true}).setInputFiles({name:'defaut.png',mimeType:'image/png',buffer:png});
  await page.evaluate(async()=>{const deadline=Date.now()+5000;while((await window.testStore.get())?.value.evidence?.length!==1){if(Date.now()>deadline)throw new Error('Evidence draft not saved');await new Promise(r=>setTimeout(r,50));}});
  await page.reload();
  await page.getByText('defaut.png',{exact:false}).waitFor();
  assert.equal(await page.evaluate(async()=>{const draft=await window.testStore.get();return draft.value.evidence.every(e=>e.file instanceof File && e.file.size>0)}),true);
  for(const width of [1280,380]) {
    await page.setViewportSize({width,height:900});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'Evidence picker fits '+width);
    await page.screenshot({path:resolve(output,`GE01_PHOTOS_${width}.png`),fullPage:true});
  }
  await page.getByLabel('Je confirme que ces informations correspondent au contrôle réellement effectué.').check();
  await page.getByRole('button',{name:'Transmettre à Facility Manager',exact:true}).click();
  await page.getByRole('heading',{name:'Rapport enregistré sur cet appareil'}).waitFor();
  const queue=await page.evaluate(async()=>await window.testStore.queue());assert.equal(queue.length,1);assert.equal(queue[0].payload.checks.length,22);
  assert.equal(queue[0].payload.checks.find(c=>c.code==='heures_moteur').valueNumeric,123.5);
  assert.equal(await page.evaluate(async()=>{const [item]=await window.testStore.queue();return item.payload.evidence.length===1 && item.payload.evidence.every(e=>e.file instanceof File && e.file.size>0)}),true);
  assert.equal(await page.evaluate(async()=>await window.testStore.get()),undefined);
  await page.reload();
  await page.getByRole('heading',{name:'Ronde GE-01 déjà enregistrée sur cet appareil',exact:true}).waitFor();
  assert.equal(await page.getByRole('button',{name:'Transmettre à Facility Manager',exact:true}).count(),0,'Queued daily round cannot be submitted twice after reopening');
  assert.deepEqual(errors,[]);
  console.log('GE-01 browser: review/conformity/anomaly/error/roles display; desktop, tablet, mobile; real IndexedDB draft restore, owner isolation and 22-answer offline queue passed. Review transport is a test double.');
} finally {if(browser)await browser.close();await server.close();}
