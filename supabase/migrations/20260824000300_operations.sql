begin;

create table if not exists public.report_imports (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  source_filename text,
  source_format text not null check (source_format in ('json', 'xlsx', 'csv', 'manual')),
  content_sha256 text check (content_sha256 is null or content_sha256 ~ '^[a-f0-9]{64}$'),
  import_status text not null default 'received' check (import_status in ('received', 'validated', 'imported', 'rejected', 'partially_imported')),
  imported_by_profile_id uuid references public.profiles(id),
  received_at timestamptz not null default now(),
  completed_at timestamptz,
  validation_summary jsonb not null default '{}'::jsonb,
  error_details jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists report_imports_content_sha256_idx
  on public.report_imports(content_sha256) where content_sha256 is not null;

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  schema_version text not null default 'BEHIRA-FM-1.0',
  report_type text not null,
  equipment_id uuid references public.equipment(id),
  zone_id uuid references public.zones(id),
  reported_by_profile_id uuid references public.profiles(id),
  report_import_id uuid references public.report_imports(id),
  performed_at timestamptz not null,
  submitted_at timestamptz,
  report_status text not null default 'draft' check (report_status in ('draft', 'submitted', 'validated', 'rejected', 'imported')),
  score numeric(5,2) check (score is null or score between 0 and 100),
  health_level text,
  analysis text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (equipment_id is not null or zone_id is not null),
  check (submitted_at is null or submitted_at >= performed_at)
);

create table if not exists public.report_checks (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.reports(id) on delete cascade,
  check_code text not null,
  label text not null,
  value_numeric numeric,
  value_text text,
  value_boolean boolean,
  unit text,
  check_status text not null check (check_status in ('ok', 'alert', 'critical', 'not_applicable', 'not_checked')),
  threshold_rule_id uuid references public.threshold_rules(id),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (report_id, check_code),
  check (num_nonnulls(value_numeric, value_text, value_boolean) <= 1)
);

create table if not exists public.anomalies (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  title text not null,
  description text not null,
  equipment_id uuid references public.equipment(id),
  zone_id uuid references public.zones(id),
  category_id uuid not null references public.categories(id),
  priority_id uuid not null references public.priority_definitions(id),
  current_status_id uuid not null references public.status_definitions(id),
  source_report_id uuid references public.reports(id),
  reported_by_profile_id uuid references public.profiles(id),
  assigned_profile_id uuid references public.profiles(id),
  assigned_vendor_id uuid references public.vendors(id),
  occurred_at timestamptz not null default now(),
  detected_at timestamptz not null default now(),
  qualification_due_at timestamptz,
  intervention_due_at timestamptz,
  resolved_at timestamptz,
  closed_at timestamptz,
  recovery_state text not null default 'none' check (recovery_state in ('none', 'temporary_reset', 'restored', 'permanent_repair')),
  temporary_restored_at timestamptz,
  root_cause text,
  risk_validation_status text not null default 'pending' check (risk_validation_status in ('pending', 'not_required', 'approved', 'rejected')),
  risk_validation_comment text,
  risk_validated_by_profile_id uuid references public.profiles(id),
  risk_validated_at timestamptz,
  closure_comment text,
  version_no integer not null default 1 check (version_no > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (equipment_id is not null or zone_id is not null),
  check (closed_at is null or resolved_at is not null),
  check ((risk_validation_status in ('approved', 'rejected')) = (risk_validated_at is not null)),
  check ((recovery_state = 'temporary_reset') = (temporary_restored_at is not null))
);

create table if not exists public.qualifications (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  qualified_by_profile_id uuid not null references public.profiles(id),
  qualified_at timestamptz not null default now(),
  confirmed_priority_id uuid not null references public.priority_definitions(id),
  confirmed_category_id uuid not null references public.categories(id),
  decision_code text not null check (decision_code in ('false_alarm', 'monitor', 'internal_fix', 'internal_work_order', 'vendor_work_order', 'immediate_emergency')),
  decision_reason text not null,
  risk_assessment text,
  created_at timestamptz not null default now()
);

create table if not exists public.work_orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  anomaly_id uuid not null references public.anomalies(id),
  work_order_type text not null check (work_order_type in ('internal', 'vendor', 'emergency', 'inspection')),
  assigned_profile_id uuid references public.profiles(id),
  assigned_vendor_id uuid references public.vendors(id),
  status text not null default 'planned' check (status in ('planned', 'accepted', 'in_progress', 'completed', 'cancelled')),
  instructions text not null,
  scheduled_start_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  created_by_profile_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(assigned_profile_id, assigned_vendor_id) = 1),
  check (due_at is null or scheduled_start_at is null or due_at >= scheduled_start_at),
  check ((status = 'completed') = (completed_at is not null))
);

create table if not exists public.interventions (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  anomaly_id uuid not null references public.anomalies(id),
  work_order_id uuid references public.work_orders(id),
  performed_by_profile_id uuid references public.profiles(id),
  performed_by_vendor_id uuid references public.vendors(id),
  started_at timestamptz not null,
  ended_at timestamptz,
  outcome text not null check (outcome in ('resolved', 'partially_resolved', 'not_resolved', 'diagnosis_only')),
  recovery_type text not null default 'none' check (recovery_type in ('none', 'temporary_reset', 'restored', 'permanent_repair')),
  summary text not null,
  technical_details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(performed_by_profile_id, performed_by_vendor_id) = 1),
  check (ended_at is null or ended_at >= started_at),
  check (recovery_type <> 'temporary_reset' or outcome <> 'resolved')
);

create table if not exists public.proofs (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  anomaly_id uuid references public.anomalies(id),
  report_id uuid references public.reports(id),
  work_order_id uuid references public.work_orders(id),
  intervention_id uuid references public.interventions(id),
  proof_type text not null check (proof_type in ('photo', 'report', 'pv', 'invoice', 'quote', 'comment', 'other')),
  storage_bucket text,
  storage_path text,
  external_url text,
  sha256 text check (sha256 is null or sha256 ~ '^[a-f0-9]{64}$'),
  mime_type text,
  captured_at timestamptz,
  submitted_by_profile_id uuid references public.profiles(id),
  submitted_by_vendor_id uuid references public.vendors(id),
  verification_status text not null default 'pending' check (verification_status in ('pending', 'accepted', 'rejected')),
  verified_by_profile_id uuid references public.profiles(id),
  verified_at timestamptz,
  rejection_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(anomaly_id, report_id, work_order_id, intervention_id) >= 1),
  check (num_nonnulls(submitted_by_profile_id, submitted_by_vendor_id) <= 1),
  check ((verification_status = 'accepted') = (verified_at is not null)),
  check (verification_status <> 'rejected' or rejection_reason is not null),
  check (storage_path is not null or external_url is not null or proof_type = 'comment')
);

create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  anomaly_id uuid references public.anomalies(id),
  work_order_id uuid references public.work_orders(id),
  intervention_id uuid references public.interventions(id),
  vendor_id uuid references public.vendors(id),
  cost_type text not null check (cost_type in ('estimate', 'committed', 'invoiced', 'paid')),
  budget_type text not null default 'opex' check (budget_type in ('opex', 'capex')),
  amount numeric(14,2) not null check (amount >= 0),
  currency char(3) not null default 'XOF' check (currency ~ '^[A-Z]{3}$'),
  approval_status text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected', 'not_required')),
  submitted_by_profile_id uuid references public.profiles(id),
  approved_by_profile_id uuid references public.profiles(id),
  approved_at timestamptz,
  description text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(anomaly_id, work_order_id, intervention_id) >= 1),
  check ((approval_status = 'approved') = (approved_at is not null))
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  notification_rule_id uuid references public.notification_rules(id),
  anomaly_id uuid references public.anomalies(id) on delete cascade,
  recipient_profile_id uuid references public.profiles(id),
  recipient_vendor_id uuid references public.vendors(id),
  recipient_role_id uuid references public.roles(id),
  severity text not null,
  channel text not null default 'in_app',
  subject text not null,
  body text not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed', 'read', 'dismissed')),
  scheduled_at timestamptz not null default now(),
  sent_at timestamptz,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (num_nonnulls(recipient_profile_id, recipient_vendor_id, recipient_role_id) = 1)
);

create table if not exists public.anomaly_history (
  id uuid primary key default gen_random_uuid(),
  anomaly_id uuid not null references public.anomalies(id) on delete cascade,
  event_type text not null,
  from_status_id uuid references public.status_definitions(id),
  to_status_id uuid references public.status_definitions(id),
  actor_profile_id uuid references public.profiles(id),
  comment text,
  change_set jsonb not null default '{}'::jsonb,
  occurred_at timestamptz not null default now(),
  transaction_id bigint not null default txid_current()
);

create table if not exists public.audit_events (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  event_type text not null check (event_type in ('INSERT', 'UPDATE', 'DELETE')),
  actor_auth_user_id uuid,
  actor_profile_id uuid references public.profiles(id),
  old_data jsonb,
  new_data jsonb,
  changed_fields text[] not null default '{}'::text[],
  occurred_at timestamptz not null default clock_timestamp(),
  transaction_id bigint not null default txid_current(),
  request_id text
);

create index if not exists reports_equipment_time_idx on public.reports(equipment_id, performed_at desc);
create index if not exists reports_zone_time_idx on public.reports(zone_id, performed_at desc);
create index if not exists reports_reporter_idx on public.reports(reported_by_profile_id, created_at desc);
create index if not exists anomalies_status_priority_idx on public.anomalies(current_status_id, priority_id, intervention_due_at);
create index if not exists anomalies_equipment_open_idx on public.anomalies(equipment_id, created_at desc) where closed_at is null;
create index if not exists anomalies_zone_open_idx on public.anomalies(zone_id, created_at desc) where closed_at is null;
create index if not exists anomalies_assigned_profile_idx on public.anomalies(assigned_profile_id, intervention_due_at) where closed_at is null;
create index if not exists anomalies_assigned_vendor_idx on public.anomalies(assigned_vendor_id, intervention_due_at) where closed_at is null;
create index if not exists qualifications_anomaly_time_idx on public.qualifications(anomaly_id, qualified_at desc);
create index if not exists work_orders_anomaly_idx on public.work_orders(anomaly_id, due_at);
create index if not exists work_orders_vendor_idx on public.work_orders(assigned_vendor_id, status, due_at) where assigned_vendor_id is not null;
create index if not exists work_orders_profile_idx on public.work_orders(assigned_profile_id, status, due_at) where assigned_profile_id is not null;
create index if not exists interventions_anomaly_idx on public.interventions(anomaly_id, started_at desc);
create index if not exists proofs_anomaly_status_idx on public.proofs(anomaly_id, verification_status) where anomaly_id is not null;
create index if not exists costs_anomaly_idx on public.costs(anomaly_id, cost_type, approval_status);
create index if not exists notifications_recipient_profile_idx on public.notifications(recipient_profile_id, status, scheduled_at desc);
create index if not exists notifications_recipient_vendor_idx on public.notifications(recipient_vendor_id, status, scheduled_at desc);
create index if not exists anomaly_history_timeline_idx on public.anomaly_history(anomaly_id, occurred_at, id);
create index if not exists audit_events_record_idx on public.audit_events(table_name, record_id, occurred_at desc);

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'report_imports', 'reports', 'report_checks', 'anomalies', 'work_orders',
    'interventions', 'proofs', 'costs', 'notifications'
  ] loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', v_table, v_table);
    execute format(
      'create trigger set_%I_updated_at before update on public.%I for each row execute function public.set_updated_at()',
      v_table,
      v_table
    );
  end loop;
end;
$$;

commit;
