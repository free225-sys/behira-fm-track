import {createServer} from 'vite';
import react from '@vitejs/plugin-react';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=process.cwd(),dir=resolve(root,'.ria-preview'),src=root.replaceAll('\\','/');
await mkdir(dir,{recursive:true});
await writeFile(resolve(dir,'index.html'),'<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Recette RIA locale</title><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>');
await writeFile(resolve(dir,'fixture.tsx'),`
import React from 'react';import {createRoot} from 'react-dom/client';
import {RiaForm,RiaRoundNavigation} from '/@fs/${src}/app/components/RiaRound.tsx';
import {emptyRiaDraft,RIA_FIELDS} from '/@fs/${src}/app/lib/ria/report.ts';
import * as store from '/@fs/${src}/app/lib/offline/store.ts';
import '/@fs/${src}/app/globals.css';
const owner='local-ria-photo-policy-20260925';const api={online:false,running:false,counts:{pending:0,syncing:0,synced:0,failed:0,conflict:0,actionable:0},latestIssue:null,latestRoundReceipt:null,
loadDraft:key=>store.loadDraft(owner,key),saveDraft:(key,value)=>store.saveDraft(owner,key,value),deleteDraft:key=>store.deleteDraft(owner,key),retryFailed:async()=>0,synchronize:async()=>null,
enqueueRound:async(payload,id)=>{const now=new Date().toISOString();await store.putQueueItem({id,ownerUserId:owner,kind:'field-round',payload,status:'pending',attempts:0,createdAt:now,updatedAt:now});return id;}};
if(location.search==='?filled'&&!await store.loadDraft(owner,'ria:daily:v1')){const d=emptyRiaDraft();for(const [key,,type] of RIA_FIELDS)d.answers[key]=type==='bool'?(['gmp_fault','gmp_stop','isg_fault'].includes(key)?'no':'yes'):type==='number'?'5':type.split('|')[0];await store.saveDraft(owner,'ria:daily:v1',d);}
createRoot(document.getElementById('root')).render(<main style={{maxWidth:1180,margin:'auto',padding:16}}><p>RECETTE LOCALE · AUCUNE ÉCRITURE DISTANTE</p><RiaRoundNavigation existingLabel="WILO-01 · Eau" ria={<RiaForm offlineSync={api}/>}><p>Parcours WILO conservé.</p></RiaRoundNavigation></main>);
`);
const server=await createServer({configFile:false,root:dir,define:{'process.env':'{}'},plugins:[react()],resolve:{dedupe:['react','react-dom'],alias:{react:resolve(root,'node_modules/react'),'react-dom':resolve(root,'node_modules/react-dom')}},server:{host:'127.0.0.1',port:4187,strictPort:true,fs:{allow:[root,dir]}}});
await server.listen();console.log('http://127.0.0.1:4187/?filled');await new Promise(()=>{});
