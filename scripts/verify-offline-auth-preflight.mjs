import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';

Object.defineProperty(globalThis,'navigator',{value:{onLine:true},configurable:true});
const {module:{runOfflineSync}} = await runnerImport(fileURLToPath(new URL('../app/lib/offline/sync.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
const client = getUser => ({auth:{getUser}});
for (const error of [new TypeError('Failed to fetch'),{message:'Service unavailable',status:503}]) {
  const result = await runOfflineSync(client(async()=>({data:{user:null},error})),'owner');
  assert.equal(result.deferred,1); assert.equal(result.synced,0); assert.equal(result.failed,0);
}
const thrown = await runOfflineSync(client(async()=>{throw new TypeError('Network request failed');}),'owner');
assert.equal(thrown.deferred,1);
await assert.rejects(()=>runOfflineSync(client(async()=>({data:{user:{id:'other'}},error:null})),'owner'),/session active/);
await assert.rejects(()=>runOfflineSync(client(async()=>({data:{user:null},error:{status:401,message:'Invalid JWT'}})),'owner'),/session active/);
console.log('Offline Auth preflight: returned network error, service 503, thrown fetch error, wrong owner and invalid session verified; no queue access before verified identity.');
