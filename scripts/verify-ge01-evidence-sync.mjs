import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runnerImport } from 'vite';
const {module:{submitQueuedFieldRound}}=await runnerImport(fileURLToPath(new URL('../app/lib/supabase/mutations.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
const {module:{ge01EvidenceManifest}}=await runnerImport(fileURLToPath(new URL('../app/lib/ge01/evidence.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
const proofs=['mc4','engine_counter'].map(purpose=>({id:crypto.randomUUID(),purpose,file:new File([purpose],purpose+'.jpg',{type:'image/jpeg'})}));
const payload={equipmentCode:'GE-01',reportType:'technical_round',performedAt:'2026-09-17T08:00:00Z',sentAt:'2026-09-17T08:05:00Z',summary:'Test',checks:[],evidence:proofs};
const files=new Map();const registered=new Set();let uploads=0;let lostResponse=true;let submission;let legacy=0;
const reportId=crypto.randomUUID();
const client={
 rpc:async(name,args)=>{
  if(name==='submit_ge01_round_offline') { if(submission) assert.deepEqual(args,submission); submission=args; return {data:{report_id:reportId,report_reference:'TEST-GE'},error:null}; }
  if(name==='register_ge01_evidence') { registered.add(args.p_id); if(lostResponse){lostResponse=false;throw new Error('Failed to fetch: response lost');} return {data:{id:args.p_id},error:null}; }
  if(name==='submit_field_round_offline'){legacy++;return {data:{report_id:reportId,report_reference:'LEGACY'},error:null};}
  throw new Error(name);
 },
 storage:{from:bucket=>{assert.equal(bucket,'round-proofs');return {
  download:async path=>files.has(path)?{data:files.get(path),error:null}:{data:null,error:{message:'Not found'}},
  upload:async(path,file,options)=>{assert.equal(options.upsert,false);uploads++;assert.equal(files.has(path),false);files.set(path,file);return {data:{path},error:null};},
 };}},
};
const id=crypto.randomUUID();
await assert.rejects(()=>submitQueuedFieldRound(client,id,payload),/response lost/);
assert.equal(uploads,1);assert.equal(registered.size,1);
assert.equal((await submitQueuedFieldRound(client,id,payload)).report_reference,'TEST-GE');
assert.equal(uploads,2);assert.equal(registered.size,2);
await submitQueuedFieldRound(client,id,payload);
assert.equal(uploads,2);
const [manifest]=await ge01EvidenceManifest(proofs);
files.set(`${reportId}/${manifest.id}-${manifest.sha256}`,new Blob(['altered']));
await assert.rejects(()=>submitQueuedFieldRound(client,id,payload),/ne correspond pas/);
const {evidence,...old}=payload;await submitQueuedFieldRound(client,crypto.randomUUID(),old);assert.equal(legacy,1);
await assert.rejects(()=>ge01EvidenceManifest([{...proofs[0],file:new File(['x'],'x.svg',{type:'image/svg+xml'})}]),/non acceptée/);
assert.equal(payload.evidence[0].file.name,'mc4.jpg');
console.log('GE evidence transport: lost response, byte-verified retry, no duplicate upload, tampering rejected, old queue compatibility, file validation passed (transport double).');
