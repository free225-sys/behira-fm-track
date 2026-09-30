import assert from 'node:assert/strict';

// Expected values are the workbook examples or independent boundary calculations.
// Only the SQL implementation is exercised, not a second copy of its algorithm.
export async function verifyHealthEngine({db,sql,asRole,test,reject}) {
  await asRole('facility_manager');
  const score=async(code,findings=[],patch={})=>(await sql('select health_private.equipment_score($1,$2::jsonb) v',
    [code,JSON.stringify({admissible:true,criticalDataComplete:true,ruleConflicts:[],completeness:1,findings,...patch})]))[0].v;
  const f=(rule,severity='alert',cause=rule)=>({rule,severity,cause});
  const examples=[
    ['GE-01',[],100],['GE-01',[f('x')],91],['GE-01',[f('x','watch')],97],['GE-01',[f('x','critical')],59],
    ['WILO-01',[],100],['WILO-01',[f('pressure_alert')],88],['WILO-01',[f('gauge_gap')],92],
    ['WILO-01',[f('pump_unavailable')],80],['WILO-01',[f('reset_recurrence','critical')],59],
    ['RIA-01',[],100],['RIA-01',[f('x')],96],['RIA-01',[f('x','critical')],59],
    ['RIA-01',[f('valve_closed','critical')],30],['RIA-01',[f('pressure_critical','critical')],40],
    ['ASC-A1',[],100],['ASC-A1',[f('door_noise'),f('reset_one')],84],['ASC-A1',[f('person_trapped','critical')],30],
    ['ASC-A2',[f('door_noise'),f('reset_one')],84],['ASC-A2',[f('intercom_bell','critical')],59],
    ['IRR-01',[],100],['IRR-01',[f('dry_zone')],92],['IRR-01',[f('leak','critical')],59],
  ];
  for(const [code,findings,expected] of examples) await test(`score workbook: ${code} ${findings.map(f=>f.rule).join('+')||'RAS'} = ${expected}`,async()=>{
    assert.equal((await score(code,findings)).score,expected);
  });
  await test('score: strongest penalty per cause, distinct causes accumulate, floor zero',async()=>{
    assert.equal((await score('GE-01',[f('x','alert','same'),f('y','watch','same')])).score,91);
    assert.equal((await score('ASC-A1',[f('reset_one','alert','reset'),f('reset_two','alert','reset')])).score,85);
    assert.equal((await score('IRR-01',Array.from({length:20},(_,i)=>f('leak','critical',String(i))))).score,0);
  });
  await test('score: missing critical input, inadmissible control and unresolved rule never become zero',async()=>{
    for(const patch of [{criticalDataComplete:false},{admissible:false},{ruleConflicts:['unresolved']},{findings:[f('unknown')]}]) {
      assert.equal((await score('WILO-01',[],patch)).score,null);
    }
    assert.equal((await score('GE-01',[],{completeness:0})).score,75);
    assert.equal((await score('GE-01',[],{completeness:null})).score,null);
    assert.equal((await score('DEMO-GE')).score,null);
    assert.equal((await score('RND-LET')).score,null);
  });
  const base=['GE-01','WILO-01','RIA-01','ASC-A1','ASC-A2','IRR-01'].map(code=>({code,score:100,validity:'valid',criticalDataComplete:true,technicalState:'available',stateConfirmed:true}));
  const building=async(eq=base,s=100,z=100,c=100)=>(await sql('select health_private.building_score($1::jsonb,$2,$3,$4) v',[JSON.stringify(eq),s,z,c]))[0].v;
  await test('building: 70/15/10/5 and integer rounding',async()=>{
    assert.equal((await building()).final,100);
    assert.equal((await building(base,0,100,100)).final,85);
    assert.equal((await building(base,100,0,100)).final,90);
    assert.equal((await building(base,100,100,0)).final,95);
    assert.equal((await building(base.map(e=>({...e,score:69.5})),69.5,69.5,69.5)).final,70);
    assert.equal((await building(base.map(e=>({...e,score:89.5})),89.5,89.5,89.5)).final,90);
  });
  await test('building: cap needs confirmed critical unavailability, never low equipment score or degraded state',async()=>{
    const eq=structuredClone(base);eq[2].technicalState='degraded';eq[2].score=59;
    assert.equal((await building(eq)).state,'normal');
    eq[2].technicalState='unavailable';assert.equal((await building(eq)).final,69);assert.equal((await building(eq)).state,'capped');
    eq[2].stateConfirmed=false;assert.equal((await building(eq)).state,'not_computable');
    const irr=structuredClone(base);irr[5].technicalState='unavailable';assert.equal((await building(irr)).final,100);
    const low=base.map(e=>({...e,score:0}));low[2].technicalState='unavailable';assert.equal((await building(low,0,0,0)).final,0);
  });
  await test('building: critical expiration blocks, zero is an actual score, no missing domain defaults',async()=>{
    const eq=structuredClone(base);eq[0].validity='expired';assert.equal((await building(eq)).state,'not_computable');
    eq[0].validity='valid';eq[0].score=0;assert.equal((await building(eq)).final,86);
    for(const domain of [1,2,3]) {const args=[base,100,100,100];args[domain]=null;assert.equal((await building(...args)).state,'not_computable');}
    assert.equal((await building(base.slice(0,4))).state,'not_computable');
    assert.equal((await building([...base,base[0]])).state,'not_computable');
  });
  await test('building S08: IRR 92 reported as 82 within 72h, then explicit exclusion only',async()=>{
    const eq=structuredClone(base);eq[5]={...eq[5],validity:'expired',score:null,carryForwardAllowed:true,expiredHours:30,lastAdmissibleScore:92};
    assert.equal((await building(eq)).raw,98.74);
    eq[5].expiredHours=72;assert.equal((await building(eq)).final,99);
    eq[5].expiredHours=73;assert.equal((await building(eq)).state,'not_computable');
    eq[5].exclusionAllowed=true;assert.equal((await building(eq)).final,100);
    eq[5].exclusionAllowed=false;eq[5].criticalDataComplete=false;assert.equal((await building(eq)).state,'not_computable');
  });
  const safety=async(value)=>(await sql('select health_private.safety_score($1::jsonb) v',[JSON.stringify(value)]))[0].v;
  await test('safety S09: RIA required; other missing obligations score zero; approved exemption removes weight',async()=>{
    assert.equal(await safety({}),null);assert.equal(Number(await safety({ria:true})),30);
    assert.equal(Number(await safety({ria:false})),0);
    assert.equal(Number(await safety({ria:true,securisys:'exempt',interphones:'exempt',ata:'exempt',technical_rooms:'exempt',critical_overdue:'exempt'})),100);
  });
  const zones=async(value)=>(await sql('select health_private.zones_score($1::jsonb) v',[JSON.stringify(value)]))[0].v;
  await test('zones S10: weighted conformity 97/100 and exact 80% coverage boundary',async()=>{
    const rows=Array.from({length:100},(_,i)=>({id:String(i),weight:1,controlled:true,overdueQualified:i<3}));
    assert.equal(Number(await zones(rows)),97);
    rows.forEach((r,i)=>{r.controlled=i<80;r.overdueQualified=false;});assert.equal(Number(await zones(rows)),100);
    rows[79].controlled=false;assert.equal(await zones(rows),null);
    assert.equal(await zones([...rows,rows[0]]),null);
  });
  const asOf='2026-09-21T12:00:00Z';
  const services=()=>Object.fromEntries(['water','backup_power','lifts'].map(k=>[k,{complete:true,observedAt:asOf,outages:[]}]));
  const continuity=async(value)=>(await sql('select health_private.continuity_score($1::jsonb,$2) v',[JSON.stringify(value),asOf]))[0].v;
  for(const [key,hours,expected] of [['water',6,95],['lifts',24,88],['backup_power',72,65]]) await test(`continuity S11: ${key} ${hours}h = ${expected}`,async()=>{
    const value=services();value[key].outages=[{from:new Date(Date.parse(asOf)-hours*3600000).toISOString(),to:asOf}];assert.equal(Number(await continuity(value)),expected);
  });
  await test('continuity: overlaps count once, open outages end now, approved planned stops excluded',async()=>{
    const value=services();value.water.outages=[{from:'2026-09-21T06:00Z',to:asOf},{from:'2026-09-21T07:00Z',to:null}];
    assert.equal(Number(await continuity(value)),95);
    value.water.outages.forEach(o=>o.plannedApproved=true);assert.equal(Number(await continuity(value)),100);
    value.water.observedAt='2026-09-17T12:00Z';assert.equal(Number(await continuity(value)),100); // 96h minus Sunday = 72h
    value.water.observedAt='2026-09-17T11:59Z';assert.equal(await continuity(value),null);
  });
  await test('health security: immutable rules, private invoker functions, anonymous denial',async()=>{
    await reject(()=>sql("update health_private.rule_versions set code='forged'"),'42501');
    await db.exec('reset role');
    assert.equal((await sql("select count(*)::int n from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='health_private' and p.prosecdef"))[0].n,0);
    await asRole('anon');await reject(()=>score('GE-01'),'42501');
    await asRole('facility_manager');
  });
}
