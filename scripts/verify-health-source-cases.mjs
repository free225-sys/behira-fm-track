import assert from 'node:assert/strict';
import {runnerImport} from 'vite';
import {fileURLToPath} from 'node:url';

export async function verifyHealthSources({db,sql,asRole,identities,test,reject,recipeRun,payload,snapshot,decide}) {
  // Whole-site samples are synthetic, transactionally rolled back, local only.
  // The existing recipe environment deliberately remains restricted to GE-01.
  if(recipeRun) return;
  const {module:{readHealthSnapshot}}=await runnerImport(fileURLToPath(new URL('../app/lib/ui-contract/read-health-snapshot.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
  await db.exec('reset role; begin');
  const originalReject=reject;
  reject=async(op,code)=>{await db.exec('savepoint expected_error');try{await originalReject(op,code);}finally{await db.exec('rollback to expected_error; release expected_error');}};
  const read=async()=>readHealthSnapshot((await sql('select public.get_building_health_snapshot() v'))[0].v,'production');
  const now=new Date(Date.now()-2000).toISOString();
  const source=async(code,fields={},performed=now,type='technical_round',zone=null)=>{
    await db.exec('reset role');
    const r=(await sql(`insert into public.reports(equipment_id,zone_id,report_type,performed_at,submitted_at,report_status,reported_by_profile_id)
      values((select id from public.equipment where code=$1),$2,$3,$4,$4,'submitted',$5) returning id,updated_at`,[code,zone,type,performed,identities.field_agent.profileId]))[0];
    for(const [key,v] of Object.entries(fields)) await sql(`insert into public.report_checks(report_id,check_code,label,check_status,value_numeric,value_boolean,value_text,unit)
      values($1,$2,$2,'ok',$3,$4,$5,$6)`,[r.id,key,typeof v==='number'?v:null,typeof v==='boolean'?v:null,typeof v==='string'?v:null,
        key.startsWith('pressure')?'bar':key==='tank'?'%':key==='resets'?'count':null]);
    r.updated_at=(await sql('select updated_at from public.reports where id=$1',[r.id]))[0].updated_at;
    await asRole('facility_manager');return r;
  };
  const proof=async(r,mime='image/jpeg')=>{
    const id=crypto.randomUUID(),path=`${r.id}/${id}`;
    await sql("insert into storage.objects(bucket_id,name,owner_id,metadata) values('health-proofs',$1,$2,$3::jsonb)",[path,identities.facility_manager.userId,JSON.stringify({mimetype:mime,size:16})]);
    await sql('select public.register_health_proof($1,$2,$3)',[id,r.id,path]);return id;
  };
  const review=async(r,kind,subject,data,proofs=[],id=crypto.randomUUID(),reason='Revue explicite des preuves de test')=>{
    await sql('select public.review_health_source($1,$2,$3,$4,$5,$6::jsonb,$7::uuid[],$8)',[id,kind,subject,r.id,r.updated_at,JSON.stringify(data),proofs,reason]);return id;
  };
  const assessment=(fields,patch={})=>({complete:true,technicalState:'available',fieldMap:Object.fromEntries(Object.keys(fields).map(k=>[k,k])),findings:[],...patch});
  const data={
    'WILO-01':{p1:true,p2:true,pressure:5,tank:70,leak:false,reset:false},
    'RIA-01':{gmp_power:true,gmp_auto:true,isg_on:true,isg_auto:true,pressure_p1:5,pressure_p2:5,jockey:true,ria1:true,ria2:true,valves_open:true,leak:false},
    'ASC-A1':{in_service:true,person_trapped:false,doors_ok:true,intercom:true,bell:true,resets:0,error_code:''},
    'ASC-A2':{in_service:true,person_trapped:false,doors_ok:true,intercom:true,bell:true,resets:0,error_code:''},
    'IRR-01':{cabinet_dry:true,rainbird_auto:true,pump:true,pressure:2,leak:false,...Object.fromEntries(Array.from({length:5},(_,i)=>[[`zone${i+1}_moisture`,true],[`zone${i+1}_drippers`,true]]).flat())},
  };
  const sources={},proofs={},reviews={};
  try {
    await test('WILO connected payload: scoped write, persisted fields, replay, no invented measurement',async()=>{
      await db.exec('savepoint wilo_payload');
      const {module:w}=await runnerImport(fileURLToPath(new URL('../app/lib/wilo/report.ts',import.meta.url)),{configFile:false,logLevel:'silent'});
      const a=Object.fromEntries(w.activeWiloFields({REARMEMENT:'no'}).map(([k,,t])=>[k,t==='bool'?'no':t==='bar'?'5':t==='%'?'0':t.split('|')[0]]));
      const c=w.buildWiloChecks('5','',{auto:true,p1:true,p2:true,leak:true,valves:true,alarm:true},a,{NIVEAU_BACHE:'Pas de jauge graduée'},'',now);
      const raw=c.map(x=>({code:x.code,label:x.label,status:x.status,unit:x.unit,notes:x.notes,value_numeric:x.valueNumeric,value_text:x.valueText,value_boolean:x.valueBoolean}));
      const id=crypto.randomUUID();
      const send=()=>sql("select public.submit_field_round_offline($1,'WILO-01','wilo_round',$2,'Contrôle local fictif',$3::jsonb) r",[id,now,JSON.stringify(raw)]);
      await asRole('field_agent');await reject(send,'42501');
      await db.exec('reset role');await sql("update public.user_roles set equipment_id=(select id from public.equipment where code='WILO-01') where profile_id=$1",[identities.field_agent.profileId]);
      await asRole('field_agent');const result=(await send())[0].r;assert.ok(result.report_id);assert.equal((await send())[0].r.report_id,result.report_id);
      const rows=await sql('select check_code,value_numeric,value_text,value_boolean,check_status from public.report_checks where report_id=$1',[result.report_id]);
      assert.equal(rows.length,c.length);assert.equal(rows.find(x=>x.check_code==='TYPE_RONDE').value_text,'Quotidienne');assert.equal(rows.find(x=>x.check_code==='REARMEMENT').value_boolean,false);assert.equal(rows.find(x=>x.check_code==='NIVEAU_BACHE').value_numeric,null);assert.equal(rows.find(x=>x.check_code==='NIVEAU_BACHE').check_status,'not_checked');
      await db.exec('rollback to wilo_payload;release wilo_payload');await asRole('facility_manager');
    });
    for(const [code,fields] of Object.entries(data)) await test(`sources: ${code} real report -> FM review -> equipment score`,async()=>{
      const r=await source(code,fields,now,code==='WILO-01'?'wilo_round':'technical_round');sources[code]=r;
      const names=code==='WILO-01'?['cabinet','gauge']:code==='RIA-01'?['gmp','isg','gauges','room']:[];
      const map={};for(const purpose of names)map[purpose]=await proof(r);
      proofs[code]=Object.values(map);
      const body=assessment(fields,{proofMap:map});reviews[code]=body;
      await review(r,'equipment',code,body,proofs[code]);
      assert.equal((await read()).equipment.find(e=>e.code===code).score,100);
    });
    await test('sources: replay preserves review and audit; changed retry rejected',async()=>{
      const rows=await sql("select id,reviewed_at from public.health_source_reviews where report_id=$1 and kind='equipment'",[sources['WILO-01'].id]);
      const r=sources['WILO-01'],id=rows[0].id;
      await review(r,'equipment','WILO-01',reviews['WILO-01'],proofs['WILO-01'],id);
      assert.equal(new Date((await sql('select reviewed_at from public.health_source_reviews where id=$1',[id]))[0].reviewed_at).toISOString(),new Date(rows[0].reviewed_at).toISOString());
      assert.equal((await sql("select count(*)::int n from public.audit_events where table_name='health_source_reviews' and record_id=$1",[id]))[0].n,1);
      await reject(()=>review(r,'equipment','WILO-01',{...reviews['WILO-01'],score:100},proofs['WILO-01'],id),'23505');
    });
    for(const role of ['field_agent','direction','read_only','anon']) await test(`sources: ${role} cannot approve health evidence`,async()=>{
      await asRole(role);await reject(()=>review(sources['WILO-01'],'equipment','WILO-01',reviews['WILO-01'],proofs['WILO-01']),'42501');
    });
    await asRole('facility_manager');
    await test('sources: reviewed rows cannot be overwritten or removed',async()=>{
      await reject(()=>sql("update public.health_source_reviews set payload='{}'"),'42501');
      await reject(()=>sql('delete from public.health_source_reviews'),'42501');
    });
    await test('sources: field agent cannot read WILO reviews or health files outside assigned equipment',async()=>{
      // Reports belong to that agent, but health review data follows equipment scope.
      await asRole('field_agent');assert.equal((await sql("select * from public.health_source_reviews where subject='WILO-01'")).length,0);
      assert.equal((await sql("select * from storage.objects where bucket_id='health-proofs' and name like $1",[`${sources['WILO-01'].id}/%`])).length,0);
      const s=await read();assert.deepEqual(s.equipment.map(e=>e.code),['GE-01']);
      await asRole('facility_manager');
    });
    await test('sources: missing critical field, impossible measurement and duplicate proofs rejected; normal control needs no photo',async()=>{
      const r=await source('WILO-01',{...data['WILO-01'],tank:101});
      await reject(()=>review(r,'equipment','WILO-01',reviews['WILO-01'],[]),'23514');
      const missing=await source('WILO-01',{p1:true});
      await reject(()=>review(missing,'equipment','WILO-01',reviews['WILO-01'],[]),'23514');
      const good=await source('WILO-01',data['WILO-01']);const p=await proof(good);
      await review(good,'equipment','WILO-01',assessment(data['WILO-01']),[]);
      await reject(()=>review(good,'equipment','WILO-01',assessment(data['WILO-01']),[p,p]),'23514');
    });
    await test('sources: stale report and unsupported WILO pressure boundaries rejected',async()=>{
      await reject(()=>review({...sources['RIA-01'],updated_at:'2000-01-01'},'equipment','RIA-01',reviews['RIA-01'],proofs['RIA-01']),'40001');
      const r=await source('WILO-01',{...data['WILO-01'],pressure:4.5});
      await reject(()=>review(r,'equipment','WILO-01',assessment(data['WILO-01']),[]),'23514');
    });
    for(const pressure of [4.5,5.5]) await test(`WILO 28/09: inclusive normal boundary ${pressure}`,async()=>{
      const fields={...data['WILO-01'],pressure,WILO_RULE_VERSION:'wilo.20260928.v1'};
      const r=await source('WILO-01',fields);await review(r,'equipment','WILO-01',assessment(fields));
    });
    for(const [minutes,second,expected] of [[9,3.8,'23514'],[10,3.8,'unavailable'],[11,3.8,'unavailable'],[10,6.2,'unavailable'],[10,5,'degraded']]) await test(`WILO 28/09: second=${second}, spacing=${minutes} minutes`,async()=>{
      const first=new Date(Date.now()-1200000).toISOString();
      const fields={...data['WILO-01'],pressure:3.8,WILO_RULE_VERSION:'wilo.20260928.v1',PRESSION_CONFIRMATION:second,PRESSION_CONFIRMATION_AT:new Date(Date.parse(first)+minutes*60000).toISOString(),PHOTO_EXCEPTION:'Photo impossible durant le contrôle local'};
      const r=await source('WILO-01',fields,first,'wilo_round');
      await db.exec('reset role');await sql("update public.report_checks set unit='bar' where report_id=$1 and check_code='PRESSION_CONFIRMATION'",[r.id]);
      r.updated_at=(await sql('select updated_at from public.reports where id=$1',[r.id]))[0].updated_at;await asRole('facility_manager');
      const body=assessment(fields,{technicalState:expected==='23514'?'unavailable':expected,findings:[{checkCode:'pressure',rule:'pressure_critical',cause:'pressure',severity:'critical'}]});
      if(expected==='23514')await reject(()=>review(r,'equipment','WILO-01',body),'23514');else await review(r,'equipment','WILO-01',body);
    });
    await test('sources: available cannot contradict raw low pressure or closed RIA valve',async()=>{
      const r=await source('WILO-01',{...data['WILO-01'],pressure:2.8});
      await reject(()=>review(r,'equipment','WILO-01',assessment(data['WILO-01']),[]),'23514');
      const ria=await source('RIA-01',{...data['RIA-01'],valves_open:false});
      await reject(()=>review(ria,'equipment','RIA-01',assessment(data['RIA-01']),[]),'23514');
    });
    await test('sources: missing or wrong-report storage object cannot be approved',async()=>{
      await reject(()=>sql('select public.register_health_proof($1,$2,$3)',[crypto.randomUUID(),sources['RIA-01'].id,`${sources['RIA-01'].id}/missing`]),'23514');
      await reject(()=>sql('select public.register_health_proof($1,$2,$3)',[crypto.randomUUID(),sources['RIA-01'].id,`${sources['WILO-01'].id}/wrong`]),'23514');
    });
    // Move failed-review fixtures out of the latest-control position by submitting
    // newer, completely reviewed sources. No historical row is silently repaired.
    for(const code of ['WILO-01','RIA-01']) {
      const r=await source(code,data[code],new Date(Date.now()-500).toISOString());sources[code]=r;
      const map={};for(const purpose of code==='WILO-01'?['cabinet','gauge']:['gmp','isg','gauges','room'])map[purpose]=await proof(r);
      proofs[code]=Object.values(map);reviews[code]=assessment(data[code],{proofMap:map});
      await review(r,'equipment',code,reviews[code],proofs[code]);
    }
    const ge=await source('GE-01',{},now,'field_observation');
    await test('sources: continuity comes from complete dated source histories',async()=>{
      for(const [service,code] of [['water','WILO-01'],['backup_power','GE-01'],['lifts','ASC-A1']]) {
        const r=code==='GE-01'?ge:sources[code],p=await proof(r,'application/pdf');
        await review(r,'continuity',service,{complete:true,windowStart:new Date(Date.now()-31*86400000).toISOString(),outages:[]},[p]);
      }
      const d=(await sql('select health_private.domain_sources($1::jsonb,statement_timestamp()) v',[JSON.stringify((await read()).equipment)]))[0].v;
      assert.equal(d.continuity,100);
    });
    await test('sources: absence of service history never implies no outage',async()=>{
      await db.exec('savepoint change_source');
      await sql('update public.reports set analysis=$1 where id=$2',['Source corrected',ge.id]);
      const d=(await sql('select health_private.domain_sources($1::jsonb,statement_timestamp()) v',[JSON.stringify((await read()).equipment)]))[0].v;
      assert.equal(d.continuity,null);await db.exec('rollback to change_source');
    });
    await test('sources: retrospective planned exemption and incomplete thirty-day history rejected',async()=>{
      const r=await source('WILO-01',{},now,'field_observation'),p=await proof(r);
      await reject(()=>review(r,'continuity','water',{complete:true,windowStart:now,outages:[]},[p]),'23514');
      await reject(()=>review(r,'continuity','water',{complete:true,windowStart:new Date(Date.now()-31*86400000).toISOString(),outages:[{from:now,to:now,plannedApproved:true}]},[p]),'23514');
      await reject(()=>review(r,'continuity_plan','water',{from:now,to:new Date(Date.now()+3600000).toISOString()},[p]),'23514');
      await review(r,'continuity_plan','water',{from:new Date(Date.now()+3600000).toISOString(),to:new Date(Date.now()+7200000).toISOString()},[p]);
    });
    await test('sources: Safety reads reviewed obligations and actual RIA/lift controls',async()=>{
      for(const key of ['securisys','ata','technical_rooms','critical_overdue']) {
        const r=key==='securisys'?sources['RIA-01']:key==='ata'?sources['ASC-A1']:ge;
        const p=await proof(r,'application/pdf');
        await review(r,'safety',key,{state:'conform',validUntil:new Date(Date.now()+86400000).toISOString()},[p]);
      }
      const d=(await sql('select health_private.domain_sources($1::jsonb,statement_timestamp()) v',[JSON.stringify((await read()).equipment)]))[0].v;
      assert.equal(d.safety,100);
    });
    await test('sources: Zones uses actual seven-day passages and the active weighted catalogue',async()=>{
      await db.exec('reset role');const zones=await sql("select id from public.zones where is_active and code not like 'DEMO-%'");
      for(const z of zones)await source(null,{},now,'cleaning_gardening_round',z.id);
      const d=(await sql('select health_private.domain_sources($1::jsonb,statement_timestamp()) v',[JSON.stringify((await read()).equipment)]))[0].v;
      assert.equal(d.zones,100);assert.equal(d.zoneCoverage.controlled,zones.length);
    });
    await test('sources: six received and reviewed controls plus domain evidence yield integer building score 100',async()=>{
      await asRole('field_agent');
      const sentAt=new Date((await sql("select transaction_timestamp()-interval '1 millisecond' t"))[0].t).toISOString();
      const manifest=['mc4','engine_counter'].map((purpose,i)=>({id:crypto.randomUUID(),purpose,mimeType:'image/jpeg',size:3,sha256:String(i+1).repeat(64)}));
      const checks=payload.checks.map(c=>({code:c.code,label:c.label,status:c.status,value_numeric:c.valueNumeric,value_text:c.valueText,value_boolean:c.valueBoolean,unit:c.unit,notes:c.notes}));
      const geRound=(await sql('select public.submit_ge01_round_offline($1,$2,$3,$4::jsonb,$5::jsonb,$6,false,false) r',
        [crypto.randomUUID(),sentAt,payload.summary,JSON.stringify(checks),JSON.stringify(manifest),sentAt]))[0].r;
      for(const m of manifest) {
        await sql("insert into storage.objects(bucket_id,name,owner_id,metadata) values('round-proofs',$1,$2,$3::jsonb)",
          [`${geRound.report_id}/${m.id}-${m.sha256}`,identities.field_agent.userId,JSON.stringify({size:m.size,mimetype:m.mimeType})]);
        await sql('select public.register_ge01_evidence($1,$2)',[geRound.report_id,m.id]);
      }
      await asRole('facility_manager');await decide(geRound.report_id,await snapshot(geRound.report_id));
      const health=await read();assert.equal(health.score.final,100);assert.equal(health.score.state,'normal');
      assert.equal(health.coverage.currentCount,6);assert.deepEqual(health.domainPoints.data.map(d=>d.obtained),[70,15,10,5]);
    });
    await test('sources: confirmed closed RIA valve caps actual building snapshot at 69',async()=>{
      await db.exec('savepoint unavailable_ria');
      const fields={...data['RIA-01'],valves_open:false};
      const r=await source('RIA-01',fields,new Date(Date.now()-10).toISOString());
      const map={};for(const purpose of ['gmp','isg','gauges','room'])map[purpose]=await proof(r);
      await review(r,'equipment','RIA-01',assessment(fields,{technicalState:'unavailable',proofMap:map,
        findings:[{cause:'valve',rule:'valve_closed',severity:'critical',checkCode:'valves_open'}]}),Object.values(map));
      const health=await read();assert.equal(health.score.final,69);assert.equal(health.score.state,'capped');
      assert.equal(health.score.causes[0].equipmentCode,'RIA-01');assert.equal(health.equipment.find(e=>e.code==='RIA-01').score,30);
      await db.exec('rollback to unavailable_ria');
    });
    await test('sources: Sunday is excluded from IRR carry window, exact 72h retained',async()=>{
      for(const [to,expected] of [['2026-09-21T12:00Z',72],['2026-09-21T13:00Z',73]]) {
        assert.equal(Number((await sql('select health_private.hours_excluding_sunday($1,$2) v',['2026-09-17T12:00Z',to]))[0].v),expected);
      }
    });
    await test('sources: deleted evidence invalidates latest review without falling back to older evidence',async()=>{
      await db.exec('savepoint proof_loss; reset role');
      await sql("delete from storage.objects where bucket_id='health-proofs' and name=(select storage_path from public.proofs where id=$1)",[proofs['RIA-01'][0]]);
      await asRole('facility_manager');assert.equal((await read()).equipment.find(e=>e.code==='RIA-01').score,null);
      await db.exec('rollback to proof_loss');
    });
    await test('sources: production assessments invisible to recipe requests',async()=>{
      await sql("select set_config('request.headers',$1,true)",[JSON.stringify({'x-behira-data-mode':'recette'})]);
      assert.equal((await sql('select * from public.health_source_reviews')).length,0);
      await sql("select set_config('request.headers','{}',true)");
    });
  } finally {await db.exec('rollback; reset role');}
}
