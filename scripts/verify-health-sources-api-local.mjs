import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createClient} from '@supabase/supabase-js';
import {runnerImport} from 'vite';
const root=fileURLToPath(new URL('../',import.meta.url));
const cli=root+'node_modules/.pnpm/@supabase+cli-windows-x64@2.115.0/node_modules/@supabase/cli-windows-x64/bin/supabase.exe';
const config=JSON.parse(execFileSync(cli,['status','-o','json'],{cwd:root,encoding:'utf8',windowsHide:true,stdio:['ignore','pipe','pipe']}));
assert.equal(new URL(config.API_URL).origin,'http://127.0.0.1:54321','Local stack only');
const options={auth:{persistSession:false,autoRefreshToken:false}};
const admin=createClient(config.API_URL,config.SERVICE_ROLE_KEY,options);
const unwrap=({data,error})=>{if(error)throw Error(`${error.code}: ${error.message}`);return data;};
const users=[],clients=[];let passed=0;
const {module:{readHealthSnapshot}}=await runnerImport(root+'app/lib/ui-contract/read-health-snapshot.ts',{configFile:false,logLevel:'silent'});
const test=async(name,fn)=>{await fn();passed++;console.log('PASS '+name);};
try {
  const roles=unwrap(await admin.from('roles').select('id,code'));
  const ge=unwrap(await admin.from('equipment').select('id').eq('code','GE-01').single());
  for(const role of ['facility_manager','direction','field_agent']) {
    const suffix=crypto.randomUUID().slice(0,8),password=crypto.randomUUID()+'aA!9',email=`health-${suffix}@test.invalid`;
    const user=unwrap(await admin.auth.admin.createUser({email,password,email_confirm:true})).user;
    const profile=crypto.randomUUID();users.push({id:user.id,profile});
    unwrap(await admin.from('profiles').insert({id:profile,auth_user_id:user.id,employee_code:'LOCAL-HEALTH-'+suffix,display_name:'LOCAL health '+role,account_status:'active',must_change_password:false}));
    unwrap(await admin.from('user_roles').insert({profile_id:profile,role_id:roles.find(r=>r.code===role).id,...(role==='field_agent'?{equipment_id:ge.id}:{})}));
    const client=createClient(config.API_URL,config.ANON_KEY,options);clients.push(client);
    unwrap(await client.auth.signInWithPassword({email,password}));
    await test(`${role}: actual Auth/PostgREST snapshot and domain scope`,async()=>{
      const snapshot=readHealthSnapshot(unwrap(await client.rpc('get_building_health_snapshot')),'production');
      assert.equal(snapshot.domainPoints.status,role==='field_agent'?'not_authorized':'ready');
      assert.equal(snapshot.equipment.length,role==='field_agent'?1:6);
    });
    await test(`${role}: source review permissions and invalid source refusal`,async()=>{
      const response=await client.rpc('review_health_source',{p_id:crypto.randomUUID(),p_kind:'equipment',p_subject:'WILO-01',p_report_id:crypto.randomUUID(),p_source_updated_at:new Date().toISOString(),p_payload:{},p_evidence_ids:[],p_reason:'Local API refusal test'});
      assert.equal(response.error?.code,role==='facility_manager'?'23514':'42501');
    });
  }
  const anon=createClient(config.API_URL,config.ANON_KEY,options);
  await test('anonymous cannot read health or write reviews',async()=>{
    assert.ok((await anon.rpc('get_building_health_snapshot')).error);
    assert.ok((await anon.from('health_source_reviews').select('id')).error);
  });
} finally {
  for(const client of clients)await client.auth.signOut();
  for(const u of users) {
    unwrap(await admin.from('user_roles').delete().eq('profile_id',u.profile));
    unwrap(await admin.auth.admin.updateUserById(u.id,{ban_duration:'876000h'}));
  }
}
console.log(`${passed} local API checks passed; temporary identities disabled; no report or remote writes.`);
