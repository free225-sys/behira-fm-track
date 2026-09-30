import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { runnerImport } from 'vite';

const root = fileURLToPath(new URL('..', import.meta.url));
const load = async (file) => (await runnerImport(`${root}/${file}`, { root, configFile:false, logLevel:'silent' })).module;
const [{ loadOperationalSnapshot }, { WorkflowAnalytics }, { BuildingHealthCockpit }] = await Promise.all([
  load('app/lib/supabase/data.ts'), load('app/components/WorkflowAnalytics.tsx'), load('app/components/BuildingHealthCockpit.tsx'),
]);
const priorities = ['CRITICAL', 'URGENT', 'PRIORITY', 'NORMAL', 'LOW', 'NORMAL', 'NORMAL'];

// Query-shaped fixtures exercise the real snapshot adapter without a network client.
function fixtureClient(isTest, managerVisible) {
  const tables = {
    priority_definitions: ['CRITICAL', 'URGENT', 'PRIORITY', 'NORMAL', 'LOW'].map(code => ({ id:code, code })),
    equipment: [{ id:'equipment-test', code:'GE-01', name:'Équipement fictif', lifecycle_scope:'mvp' }],
    profiles: [{ id:'agent-test', display_name:'Agent de test' }],
    status_definitions: [{ id:'open', code:'A_QUALIFIER', is_closed:false }, { id:'closed', code:'CLOTURE', is_closed:true }],
    anomalies: priorities.map((code,index) => ({
      id:`test-${index}`, reference:`TEST-${index}`, title:'Donnée fictive locale', description:'Test sans réseau',
      equipment_id:'equipment-test', priority_id:code, current_status_id:index === 6 ? 'closed' : 'open',
      assigned_profile_id:'agent-test', is_test:isTest, version_no:1,
    })),
    anti_zombie_summary_v: priorities.map((_,index) => ({
      anomaly_id:`test-${index}`, is_closed:index === 6, stage_label:'Qualification', status_label:'À qualifier',
      responsible_name:'Agent de test', responsible_missing:false, next_action_missing:false,
      next_action_code:'CHOOSE_TREATMENT_BRANCH', next_action_label:'Choisir la branche de traitement',
      next_action_assigned_profile_id:'fm-test', next_action_assigned_profile_name:managerVisible ? 'FM de test' : null,
    })),
  };
  return {
    rpc: async name => ({ data:name === 'current_profile_id' ? 'agent-test' : name === 'is_recette_enabled', error:null }),
    from: table => {
      let rows = tables[table] ?? [];
      const query = {
        select() { return query; }, order() { return query; }, limit() { return query; },
        eq(column,value) { rows = rows.filter(row => row[column] === value); return query; },
        in(column,values) { rows = rows.filter(row => values.includes(row[column])); return query; },
        is() { return query; }, not() { return query; },
        then(resolve,reject) { return Promise.resolve({ data:rows, count:rows.length, error:null }).then(resolve,reject); },
      };
      return query;
    },
  };
}

for (const isTest of [false,true]) {
  for (const managerVisible of [false,true]) {
    const snapshot = await loadOperationalSnapshot(fixtureClient(isTest,managerVisible),isTest);
    assert.deepEqual(snapshot.anomalies.map(row => row.priority), ['Critique','Haute','Moyenne','Normale','Faible','Normale','Normale']);
    const normal = snapshot.anomalies[3];
    assert.equal(normal.antiZombieSummary.nextActionAssignee, managerVisible ? 'FM de test' : 'Facility Manager');
    assert.equal(normal.antiZombieSummary.responsible,'Agent de test');
    assert.equal(snapshot.anomalies[6].antiZombieSummary.nextActionAssignee,null);
    const workflow = renderToStaticMarkup(React.createElement(WorkflowAnalytics,{ items:snapshot.anomalies }));
    assert.match(workflow,/aria-label="Normale : 2 dossiers"/);
    assert.match(workflow,/aria-label="Moyenne : 1 dossier"/);
    const health = renderToStaticMarkup(React.createElement(BuildingHealthCockpit,{
      audience:'facility', anomalies:snapshot.anomalies, equipment:[], onNavigate:() => {},
    }));
    assert.match(health,/aria-label="Critique 1, Haute 1, Moyenne 1, Normale 2, Faible 1"/);
  }
}
const page = await readFile(`${root}/app/page.tsx`,'utf8');
assert.match(page,/Normale:'N'/,'La file doit identifier la priorité Normale.');
assert.equal((page.match(/<option>Normale<\/option>/g) ?? []).length,2,'Registre et déclaration doivent proposer Normale.');
console.log('Priorités : cinq niveaux distincts, deux agrégats sans dossiers clôturés, filtre et déclaration ; acteur FM masqué/visible, exploitation et recette. Aucun accès réseau.');
