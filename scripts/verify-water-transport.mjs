import assert from 'node:assert/strict';
import {createServer} from 'vite';
import {fileURLToPath} from 'node:url';
const server=await createServer({configFile:false,logLevel:'silent',server:{middlewareMode:true}});
try {
const {submitQueuedFieldRound}=await server.ssrLoadModule(fileURLToPath(new URL('../app/lib/supabase/mutations.ts',import.meta.url)));
for(const isTest of [false,true]){
 const calls=[],uploaded=new Map();
 const client={rpc:async(name,args)=>{calls.push([name,args]);return {data:name==='confirm_ria_round'?'2026-09-28T12:00:00Z':{report_id:'fictitious-report',report_reference:'LOCAL',is_test:isTest},error:null};},storage:{from:(bucket)=>{assert.equal(bucket,'health-proofs');return {download:async(path)=>uploaded.has(path)?{data:uploaded.get(path),error:null}:{data:null,error:{message:'Missing'}},upload:async(path,file,opts)=>{assert.equal(opts.upsert,false);uploaded.set(path,file);return {error:null};}};}}};
 const payload={isTest,testAttested:isTest,equipmentCode:'RIA-01',reportType:'technical_round',performedAt:'2026-09-28T10:00:00Z',summary:'Fictitious transport test',checks:[{code:'pressure_p1',label:'P1',status:'not_checked',notes:'Unreadable'}],riaEvidence:[{id:crypto.randomUUID(),purpose:'defect',file:new File(['test-bytes'],'test.png',{type:'image/png'})}]};
 for(let attempt=0;attempt<2;attempt++)await submitQueuedFieldRound(client,'local-id',payload);
 const submits=calls.filter(([name])=>name==='submit_ria_round_offline');assert.equal(submits.length,2);
 for(const [,args] of submits){assert.equal(args.p_is_test,isTest);assert.equal(args.p_test_attested,isTest);assert.equal(args.p_id,'local-id');assert.equal(args.p_checks[0].status,'not_checked');assert.equal('value_numeric' in args.p_checks[0],false);}
 assert.equal(uploaded.size,1);assert.equal(calls.filter(([name])=>name==='confirm_ria_round').length,2);
 calls.length=0;
 await submitQueuedFieldRound(client,'wilo-key',{...payload,equipmentCode:'WILO-01',reportType:'wilo_round',riaEvidence:undefined});
 assert.equal(calls[0][0],'submit_field_round_offline');assert.equal(calls[0][1].p_equipment_code,'WILO-01');assert.equal(calls[0][1].p_is_test===true,isTest);
 console.log('PASS water transport '+(isTest?'Recette':'Exploitation')+': marker, explicit attestation, absent measure, evidence retry, receipt');
}

} finally {await server.close();}
