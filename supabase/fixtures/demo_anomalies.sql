-- OPTIONAL LOCAL INTEGRATION FIXTURES ONLY.
-- Never apply this file to production. It is intentionally separate from seed.sql.
-- Prerequisite: migrations, V3 reference seed and local Auth profiles are ready.

begin;
set local app.seed_mode = 'on';

create temporary table demo_anomaly_source (
  reference text primary key,
  title text not null,
  description text not null,
  equipment_code text not null,
  category_code text not null,
  priority_code text not null,
  status_code text not null,
  reporter_code text,
  assigned_profile_code text,
  assigned_vendor_code text,
  detected_at timestamptz not null,
  qualification_due_at timestamptz,
  intervention_due_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz
) on commit drop;

insert into demo_anomaly_source values
  ('FIX-ANO-0241', 'Pression réseau incendie instable', 'Variations de pression constatées pendant le test matinal. Le manomètre oscille sans sollicitation du réseau.', 'RIA-01', 'INC', 'CRITICAL', 'A_QUALIFIER', 'SYL-PLB', null, null, now() - interval '2 hours', now() + interval '4 hours', now() + interval '8 hours', null, null),
  ('FIX-ANO-0238', 'Arrêts intermittents au niveau R+7', 'Deux arrêts non programmés signalés au niveau R+7. Redémarrage automatique après environ trente secondes.', 'ASC-A2', 'ASC', 'URGENT', 'INTERVENTION_PRESTATAIRE', 'EVAR-ELEC', null, 'ATA-CI', now() - interval '30 hours', now() - interval '27 hours', now() - interval '6 hours', null, null),
  ('FIX-ANO-0234', 'Fuite légère au collecteur', 'Suintement visible au raccord du collecteur principal. Bac de rétention en place, sans impact sur la distribution.', 'WILO-01', 'EAU', 'PRIORITY', 'EN_COURS', 'SYL-PLB', 'SYL-PLB', null, now() - interval '4 days', now() - interval '3 days', now() - interval '2 days', null, null),
  ('FIX-ANO-0231', 'Batterie de démarrage sous tension nominale', 'La batterie mesurée sous la tension nominale a été remplacée. Le test de démarrage est concluant.', 'GE-01', 'ELEC', 'CRITICAL', 'RESOLU', 'EVAR-ELEC', null, 'DMC', now() - interval '6 days', now() - interval '5 days', now() - interval '3 days', now() - interval '2 days', null),
  ('FIX-ANO-0229', 'Électrovanne zone jardin bloquée', 'Électrovanne nettoyée et remise en service. Cycle d’arrosage contrôlé sur vingt minutes.', 'IRR-01', 'IRR', 'LOW', 'CLOTURE', 'LET-RND', null, 'ALTA-VENTURE', now() - interval '7 days', now() - interval '7 days', now() - interval '6 days', now() - interval '5 days', now() - interval '5 days'),
  ('FIX-ANO-0226', 'Éclairage cabine défaillant', 'Bloc LED remplacé et essai d’éclairage de secours réalisé.', 'ASC-A1', 'ASC', 'PRIORITY', 'CLOTURE', 'EVAR-ELEC', null, 'ATA-CI', now() - interval '8 days', now() - interval '8 days', now() - interval '7 days', now() - interval '6 days', now() - interval '6 days'),
  ('FIX-ANO-0222', 'Porte coupe-feu maintenue ouverte', 'Le ferme-porte ne ramène plus complètement le vantail. Zone balisée pendant la ronde.', 'RND-LET', 'SEC', 'URGENT', 'A_QUALIFIER', 'LET-RND', null, null, now() - interval '3 hours', now() + interval '6 hours', now() + interval '12 hours', null, null),
  ('FIX-ANO-0218', 'Niveau carburant inférieur au seuil', 'Niveau à 28 %, demande de réapprovisionnement transmise au prestataire.', 'GE-01', 'ELEC', 'PRIORITY', 'INTERVENTION_PRESTATAIRE', 'EVAR-ELEC', null, 'DMC', now() - interval '9 days', now() - interval '8 days', now() + interval '8 hours', null, null);

insert into public.anomalies (
  reference, title, description, equipment_id, category_id, priority_id,
  current_status_id, reported_by_profile_id, assigned_profile_id,
  assigned_vendor_id, occurred_at, detected_at, qualification_due_at,
  intervention_due_at, resolved_at, closed_at
)
select
  source.reference, source.title, source.description, equipment.id, category.id,
  priority.id, status.id, reporter.id, assignee.id, vendor.id,
  source.detected_at, source.detected_at, source.qualification_due_at,
  source.intervention_due_at, source.resolved_at, source.closed_at
from demo_anomaly_source source
join public.equipment equipment on equipment.code = source.equipment_code
join public.categories category on category.code = source.category_code
join public.priority_definitions priority on priority.code = source.priority_code
join public.status_definitions status on status.code = source.status_code
left join public.profiles reporter on reporter.employee_code = source.reporter_code
left join public.profiles assignee on assignee.employee_code = source.assigned_profile_code
left join public.vendors vendor on vendor.code = source.assigned_vendor_code
on conflict (reference) do update set
  title = excluded.title,
  description = excluded.description,
  equipment_id = excluded.equipment_id,
  category_id = excluded.category_id,
  priority_id = excluded.priority_id,
  current_status_id = excluded.current_status_id,
  reported_by_profile_id = excluded.reported_by_profile_id,
  assigned_profile_id = excluded.assigned_profile_id,
  assigned_vendor_id = excluded.assigned_vendor_id,
  occurred_at = excluded.occurred_at,
  detected_at = excluded.detected_at,
  qualification_due_at = excluded.qualification_due_at,
  intervention_due_at = excluded.intervention_due_at,
  resolved_at = excluded.resolved_at,
  closed_at = excluded.closed_at;

insert into public.proofs (
  reference, anomaly_id, proof_type, storage_bucket, storage_path, captured_at,
  submitted_by_profile_id, verification_status, verified_by_profile_id,
  verified_at, metadata
)
select
  'FIX-PRV-' || right(anomaly.reference, 4), anomaly.id, 'photo',
  'local-demo-proofs', 'fixtures/' || lower(anomaly.reference) || '.jpg',
  coalesce(anomaly.resolved_at, now()), reporter.id, 'accepted', manager.id,
  coalesce(anomaly.resolved_at, now()),
  jsonb_build_object('fixture', true, 'non_production', true)
from public.anomalies anomaly
join public.profiles manager on manager.employee_code = 'FAU-FM'
left join public.profiles reporter on reporter.id = anomaly.reported_by_profile_id
where anomaly.reference in ('FIX-ANO-0231', 'FIX-ANO-0229', 'FIX-ANO-0226')
on conflict (reference) do update set
  anomaly_id = excluded.anomaly_id,
  captured_at = excluded.captured_at,
  submitted_by_profile_id = excluded.submitted_by_profile_id,
  verification_status = excluded.verification_status,
  verified_by_profile_id = excluded.verified_by_profile_id,
  verified_at = excluded.verified_at,
  metadata = excluded.metadata;

commit;
