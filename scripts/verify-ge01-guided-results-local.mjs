import assert from 'node:assert/strict';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { runnerImport } from 'vite';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Read-only acceptance readback. No workflow RPC, fixture insertion or profile bypass.
const root = new URL('../', import.meta.url);
const output = new URL('../../outputs/cadrage-pilote-ge-01/recette-connectee/', root);
const env = Object.fromEntries((await readFile(new URL('.env.supabase.local', root), 'utf8')).split(/\r?\n/).filter(l => l && !l.startsWith('#')).map(l => { const i=l.indexOf('='); return [l.slice(0,i),l.slice(i+1)]; }));
assert.ok(['localhost','127.0.0.1','[::1]'].includes(new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname));
assert.ok(process.env.BEHIRA_LOCAL_AUTH_PASSWORD);
const make = () => createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {auth:{persistSession:false,autoRefreshToken:false}});
const fm=make(), agent=make();
const unwrap=({data,error})=>{if(error)throw error;return data;};
const load=async p=>(await runnerImport(fileURLToPath(new URL(p,root)),{configFile:false,logLevel:'silent'})).module;
const result={environment:'local',readOnly:true,checkedAt:new Date().toISOString(),cases:[],checks:[]};
try {
  for(const [c,email] of [[fm,'facility.manager@demo.behira.invalid'],[agent,'electricite@demo.behira.invalid']]) unwrap(await c.auth.signInWithPassword({email,password:process.env.BEHIRA_LOCAL_AUTH_PASSWORD}));
  const {loadOperationalSnapshot}=await load('app/lib/supabase/data.ts');
  const {adaptCanonicalAntiZombieSummary}=await load('app/lib/supabase/anti-zombie.ts');
  const {Ge01WorkflowPanel}=await load('app/components/Ge01WorkflowPanel.tsx');
  const {AntiZombieSummary}=await load('app/components/AntiZombieSummary.tsx');
  const [manager,field]=await Promise.all([loadOperationalSnapshot(fm),loadOperationalSnapshot(agent)]);
  for(const reference of ['ANO-2026-000007','ANO-2026-000008','ANO-2026-000009']) {
    const a=manager.anomalies.find(a=>a.id===reference), b=field.anomalies.find(a=>a.id===reference);
    assert.ok(a && b); assert.equal(a.status,'Clôturée'); assert.equal(b.status,'Clôturée');
    assert.equal(a.proof,true); assert.equal(a.workflow.actionId,null); assert.equal(a.antiZombieSummary.slaLabel,'Échéance terminée');
    const row=unwrap(await fm.from('anti_zombie_summary_v').select('*').eq('reference',reference).single());
    assert.equal(row.is_closed,true); assert.equal(row.pending_proof_requirement_count,0);
    const orders=unwrap(await fm.from('work_orders').select('reference,authorized_cost_id,assigned_vendor_id').eq('anomaly_id',a.databaseId));
    assert.equal(orders.length,1);
    if(reference.endsWith('000007')) {assert.equal(orders[0].authorized_cost_id,null); assert.equal(a.financialOptions.length,0);}
    else {
      const expected=reference.endsWith('000008')?399999:400000;
      const cost=manager.costs.find(c=>c.id===a.treatment.costReference);
      assert.ok(cost);assert.equal(cost.amount,expected);assert.equal(cost.approvalStatus,'approved');
      assert.equal(cost.reviewedBy,expected===400000?'Frédéric AMANY':'Faustin SIAPO');
      assert.equal(a.treatment.amount,expected);assert.equal(b.treatment.costReference,a.treatment.costReference);
    }
    if(reference.endsWith('000009')) {
      assert.equal(a.treatment.costReference,'CST-2026-000009');assert.equal(a.treatment.vendorLabel,'DM COMPANY');
      assert.equal(a.proofs.length,2);
      assert.equal(a.proofs.find(p=>p.reference==='PRV-2026-000010').verificationStatus,'rejected');
      assert.equal(a.proofs.find(p=>p.reference==='PRV-2026-000011').verificationStatus,'accepted');
      assert.match(a.proofs.find(p=>p.reference==='PRV-2026-000010').rejectionReason,/DM COMPANY/);
    }
    result.cases.push({reference,status:a.status,orders,owner:a.owner,treatment:a.treatment??null,proofs:a.proofs.map(p=>({reference:p.reference,verificationStatus:p.verificationStatus,rejectionReason:p.rejectionReason,reviewComment:p.reviewComment,capturedAt:p.capturedAt})),history:a.history});
  }
  const fmProfile=unwrap(await fm.from('profiles').select('id,display_name').eq('auth_user_id',(await fm.auth.getUser()).data.user.id).single());
  assert.equal(unwrap(await agent.from('profiles').select('id').eq('id',fmProfile.id)).length,0);
  result.checks.push('Agent cannot read FM profile; existing access controls preserved.');
  const closedRow=unwrap(await agent.from('anti_zombie_summary_v').select('*').eq('reference','ANO-2026-000009').single());
  // Reconstruct the previously observed pending display in memory only; all three real dossiers stay closed.
  const pending={...closedRow,is_closed:false,next_action_missing:false,next_action_code:'GE01_REVIEW_PROOF',next_action_label:'Contrôler la preuve',next_action_assigned_profile_id:fmProfile.id,next_action_assigned_profile_name:null,next_action_comment:'Consulter la preuve PRV-2026-000011, puis l’accepter ou motiver son refus.',stage_label:'Preuve',status_label:'En attente preuve'};
  const summary=adaptCanonicalAntiZombieSummary(pending);
  assert.equal(summary.nextActionAssignee,'Facility Manager');
  const anomaly={...field.anomalies.find(a=>a.id==='ANO-2026-000009'),status:'En validation',proof:false,antiZombieSummary:summary,workflow:{actionCode:'GE01_REVIEW_PROOF'}};
  const html=renderToStaticMarkup(React.createElement(React.Fragment,null,
    React.createElement(Ge01WorkflowPanel,{anomaly,isAgent:true,isManager:false,busy:true,onSubmit:async()=>false,onRefresh:()=>{},onOpenProofs:()=>{},onOpenCosts:()=>{}}),
    React.createElement(AntiZombieSummary,{data:summary,variant:'detailed'})));
  assert.equal((html.match(/<dt>Acteur attendu<\/dt><dd>Facility Manager<\/dd>/g)||[]).length,2);
  assert.ok(!html.includes('acteur à actualiser'));
  result.checks.push('Pending proof display reconstructed in memory: both real components show Facility Manager, no profile name guessed.');
  const fixture=new URL('../../tmp/ge01-actor-label-qa/',root);await mkdir(fixture,{recursive:true});
  await writeFile(new URL('index.html',fixture),`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Vérification locale du libellé GE-01</title><link rel="stylesheet" href="/style.css"><main style="max-width:1100px;margin:auto;padding:16px"><p>VÉRIFICATION LOCALE - ÉTAT RECONSTITUÉ, AUCUNE ÉCRITURE</p><h1>Contrôle du justificatif GE-01</h1>${html}</main></html>`);
  await writeFile(new URL('style.css',fixture),await readFile(new URL('app/globals.css',root)));
  await mkdir(output,{recursive:true});await writeFile(new URL('BILAN_RECETTE_GUIDEE_VERIFICATION.json',output),JSON.stringify(result,null,2)+'\n');
  console.log(JSON.stringify({cases:result.cases.map(c=>({reference:c.reference,status:c.status,proofs:c.proofs.map(p=>[p.reference,p.verificationStatus])})),checks:result.checks}));
} finally {await Promise.all([fm.auth.signOut({scope:'local'}),agent.auth.signOut({scope:'local'})]);}
