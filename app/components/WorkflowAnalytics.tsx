export type WorkflowAnalyticsItem = {
  id:string;
  priority:'Critique'|'Haute'|'Moyenne'|'Faible';
  status:'À qualifier'|'Affectée'|'En intervention'|'En validation'|'Clôturée';
  location:string;
  owner:string;
  delayed:boolean;
  proof:boolean;
  proofPending?:boolean;
};

const stages = [
  { label:'Constat', statuses:[] as WorkflowAnalyticsItem['status'][] },
  { label:'Qualification', statuses:['À qualifier'] as WorkflowAnalyticsItem['status'][] },
  { label:'Décision', statuses:['Affectée'] as WorkflowAnalyticsItem['status'][] },
  { label:'Intervention', statuses:['En intervention'] as WorkflowAnalyticsItem['status'][] },
  { label:'Preuve', statuses:['En validation'] as WorkflowAnalyticsItem['status'][] },
  { label:'Clôture', statuses:['Clôturée'] as WorkflowAnalyticsItem['status'][] },
];

export function WorkflowAnalytics({ items, variant = 'manager', onOpenRegistry }: { items:WorkflowAnalyticsItem[]; variant?:'manager'|'administration'; onOpenRegistry?:()=>void }) {
  const active = items.filter((item) => item.status !== 'Clôturée');
  const severity = [
    { label:'Critique', count:active.filter((item) => item.priority === 'Critique').length, className:'danger' },
    { label:'Haute', count:active.filter((item) => item.priority === 'Haute').length, className:'warning' },
    { label:'Moyenne', count:active.filter((item) => item.priority === 'Moyenne').length, className:'info' },
    { label:'Faible', count:active.filter((item) => item.priority === 'Faible').length, className:'neutral' },
  ];
  const severityMax = Math.max(1, ...severity.map((item) => item.count));
  const unassigned = active.filter((item) => item.owner === 'Non affectée').length;
  const proofsToReview = active.filter((item) => item.proofPending || (item.status === 'En validation' && item.proof)).length;
  const late = active.filter((item) => item.delayed).length;
  const locationCounts = active.reduce<Record<string,number>>((accumulator, item) => {
    accumulator[item.location] = (accumulator[item.location] ?? 0) + 1;
    return accumulator;
  }, {});
  const recurrentZones = Object.entries(locationCounts).filter(([, count]) => count > 1).sort((a,b) => b[1] - a[1]).slice(0,3);

  return <section className={`workflow-analytics workflow-${variant}`} aria-labelledby={`workflow-title-${variant}`}>
    <div className="workflow-analytics-heading">
      <div><p className="design-kicker">FLUX OPÉRATIONNEL</p><h3 id={`workflow-title-${variant}`}>{variant === 'administration' ? 'Exposition et progression des dossiers' : 'Où le traitement doit avancer'}</h3><p>Lecture calculée uniquement à partir des dossiers actuellement visibles.</p></div>
      <span className="mockup-label">Données courantes</span>
    </div>
    <div className="workflow-analytics-grid">
      <article className="panel workflow-pipeline-card">
        <div className="analytics-card-head"><div><span>PIPELINE</span><h4>Cycle Constat → Clôture</h4></div><strong>{active.length}<small> actifs</small></strong></div>
        <div className="workflow-pipeline" aria-label="Répartition des dossiers par étape">
          {stages.map((stage,index) => {
            const count = stage.statuses.length ? items.filter((item) => stage.statuses.includes(item.status)).length : 0;
            return <div key={stage.label} className={count ? 'has-items' : ''}><span>{index+1}</span><b>{count}</b><small>{stage.label}</small></div>;
          })}
        </div>
        <p className="analytics-note">Le nombre de constats en brouillon n’est pas disponible ; aucun volume n’est inventé.</p>
      </article>

      <article className="panel severity-card">
        <div className="analytics-card-head"><div><span>GRAVITÉ</span><h4>Exposition des dossiers actifs</h4></div><strong>{active.length}</strong></div>
        <div className="severity-bars" aria-label="Répartition des dossiers actifs par gravité">
          {severity.map((item) => (
            <div className={`severity-bar-row severity-${item.className}`} key={item.label}>
              <span><i aria-hidden="true" />{item.label}</span>
              <div className="severity-bar-track" role="progressbar" aria-label={`${item.label} : ${item.count} dossier${item.count > 1 ? 's' : ''}`} aria-valuemin={0} aria-valuemax={severityMax} aria-valuenow={item.count}>
                <i style={{ width:`${(item.count / severityMax) * 100}%` }} />
              </div>
              <b>{item.count}</b>
            </div>
          ))}
        </div>
        {onOpenRegistry && <button className="text-action" type="button" onClick={onOpenRegistry}>Examiner dans le registre →</button>}
      </article>

      <article className="panel continuity-metrics-card">
        <div className="analytics-card-head"><div><span>CONTINUITÉ</span><h4>Signaux à traiter</h4></div></div>
        <div className="continuity-metrics"><span><b>{late}</b>En retard</span><span><b>{unassigned}</b>Sans responsable</span><span><b>{proofsToReview}</b>Preuves à vérifier</span><span className="unavailable"><b>—</b>Délai moyen non calculable</span></div>
      </article>

      <article className="panel history-health-card">
        <div className="analytics-card-head"><div><span>{variant === 'administration' ? 'ZONES & RÉCURRENCE' : 'OUVERTURES / CLÔTURES'}</span><h4>{variant === 'administration' ? 'Concentration des anomalies' : 'Évolution de la charge'}</h4></div></div>
        {variant === 'administration' && recurrentZones.length ? <div className="recurrent-zone-list">{recurrentZones.map(([zone,count]) => <span key={zone}><b>{count}</b><span>{zone}</span></span>)}</div> : <div className="compact-insufficient-state"><span>⌁</span><div><b>Données historiques insuffisantes</b><p>{variant === 'administration' ? 'Aucune zone récurrente n’est confirmée dans les dossiers visibles.' : 'Les dates d’ouverture et de clôture ne permettent pas encore une tendance fiable.'}</p></div></div>}
      </article>
    </div>
  </section>;
}
