begin;

create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z][a-z0-9_]{2,39}$'),
  label text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  legal_name text not null,
  vendor_type text not null default 'supplier',
  family text,
  operational_alias text,
  status text not null default 'active' check (status in ('active', 'inactive', 'historical', 'to_integrate')),
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.zones (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  level_label text,
  macro_zone text,
  label text not null,
  zone_type text,
  criticality text check (criticality is null or criticality in ('critical', 'priority', 'normal', 'low')),
  alias text,
  is_active boolean not null default true,
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.priority_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[A-Z][A-Z0-9_]{2,31}$'),
  label text not null unique,
  rank smallint not null unique check (rank between 1 and 100),
  color_token text,
  requires_direction_alert boolean not null default false,
  is_critical boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  family text not null,
  label text not null,
  default_priority_id uuid references public.priority_definitions(id),
  proof_policy text not null default 'critical_only' check (proof_policy in ('never', 'optional', 'always', 'critical_only', 'conditional')),
  is_active boolean not null default true,
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  family text not null,
  name text not null,
  location_label text,
  primary_zone_id uuid references public.zones(id),
  default_priority_id uuid references public.priority_definitions(id),
  control_frequency text,
  health_status text,
  health_score numeric(5,2) check (health_score is null or health_score between 0 and 100),
  lifecycle_scope text not null default 'mvp' check (lifecycle_scope in ('mvp', 'post_mvp', 'phase_2')),
  is_active boolean not null default true,
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.equipment_zones (
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  zone_id uuid not null references public.zones(id) on delete cascade,
  relation_type text not null default 'serves' check (relation_type in ('located_in', 'serves', 'monitors')),
  created_at timestamptz not null default now(),
  primary key (equipment_id, zone_id, relation_type)
);

create table if not exists public.equipment_vendors (
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  vendor_id uuid not null references public.vendors(id) on delete cascade,
  relation_type text not null default 'maintainer' check (relation_type in ('maintainer', 'supplier', 'historical', 'on_demand')),
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (equipment_id, vendor_id, relation_type)
);

create table if not exists public.workflow_stages (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null unique,
  sequence_no smallint not null unique check (sequence_no between 1 and 100),
  created_at timestamptz not null default now()
);

create table if not exists public.status_definitions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  label text not null unique,
  stage_id uuid not null references public.workflow_stages(id),
  description text,
  is_initial boolean not null default false,
  is_closed boolean not null default false,
  requires_proof boolean not null default false,
  is_active boolean not null default true,
  sort_order smallint not null default 100,
  source_system text not null default 'manual',
  source_row text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists status_definitions_single_initial_idx
  on public.status_definitions (is_initial) where is_initial;

create table if not exists public.status_transitions (
  id uuid primary key default gen_random_uuid(),
  from_status_id uuid not null references public.status_definitions(id) on delete cascade,
  to_status_id uuid not null references public.status_definitions(id) on delete cascade,
  allowed_role_id uuid references public.roles(id) on delete cascade,
  requires_comment boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create unique index if not exists status_transitions_unique_scope_idx
  on public.status_transitions (
    from_status_id,
    to_status_id,
    coalesce(allowed_role_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create table if not exists public.sla_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  priority_id uuid not null references public.priority_definitions(id),
  category_id uuid references public.categories(id),
  equipment_id uuid references public.equipment(id),
  qualification_minutes integer not null check (qualification_minutes >= 0),
  internal_intervention_minutes integer not null check (internal_intervention_minutes >= 0),
  vendor_intervention_minutes integer not null check (vendor_intervention_minutes >= 0),
  calendar_mode text not null default 'elapsed' check (calendar_mode in ('elapsed', 'business_hours')),
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (effective_to is null or effective_to >= effective_from)
);

create unique index if not exists sla_rules_active_scope_idx
  on public.sla_rules (
    priority_id,
    coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(equipment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    effective_from
  );

create table if not exists public.threshold_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  equipment_id uuid not null references public.equipment(id) on delete cascade,
  parameter_name text not null,
  unit text,
  ok_expression text,
  alert_expression text,
  critical_expression text,
  structured_rule jsonb not null default '{}'::jsonb,
  automatic_action text,
  is_active boolean not null default true,
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (equipment_id, parameter_name)
);

create table if not exists public.notification_rules (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  trigger_event text not null,
  severity text not null,
  primary_role_code text,
  copy_role_code text,
  channels text[] not null default array['in_app']::text[],
  delay_minutes integer check (delay_minutes is null or delay_minutes >= 0),
  schedule_expression text,
  message_template text not null,
  expected_action text,
  is_active boolean not null default true,
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  auth_user_id uuid unique references auth.users(id) on delete set null,
  employee_code text not null unique,
  display_name text not null,
  job_title text,
  domain_summary text,
  vendor_id uuid references public.vendors(id),
  account_status text not null default 'pending_invitation' check (account_status in ('pending_invitation', 'active', 'suspended', 'service_profile')),
  data_status text not null default 'confirmed' check (data_status in ('confirmed', 'to_confirm', 'to_fill')),
  source_system text not null default 'manual',
  source_row text,
  source_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role_id uuid not null references public.roles(id) on delete cascade,
  zone_id uuid references public.zones(id) on delete cascade,
  equipment_id uuid references public.equipment(id) on delete cascade,
  vendor_id uuid references public.vendors(id) on delete cascade,
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  created_at timestamptz not null default now(),
  check (valid_until is null or valid_until > valid_from)
);

create unique index if not exists user_roles_unique_scope_idx
  on public.user_roles (
    profile_id,
    role_id,
    coalesce(zone_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(equipment_id, '00000000-0000-0000-0000-000000000000'::uuid),
    coalesce(vendor_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );

create index if not exists equipment_primary_zone_idx on public.equipment(primary_zone_id);
create index if not exists sla_rules_resolution_idx on public.sla_rules(priority_id, category_id, equipment_id) where is_active;
create index if not exists threshold_rules_equipment_idx on public.threshold_rules(equipment_id) where is_active;
create index if not exists profiles_auth_user_idx on public.profiles(auth_user_id) where auth_user_id is not null;
create index if not exists user_roles_profile_idx on public.user_roles(profile_id, valid_until);
create index if not exists user_roles_zone_idx on public.user_roles(zone_id) where zone_id is not null;
create index if not exists user_roles_equipment_idx on public.user_roles(equipment_id) where equipment_id is not null;
create index if not exists user_roles_vendor_idx on public.user_roles(vendor_id) where vendor_id is not null;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'roles', 'vendors', 'zones', 'priority_definitions', 'categories', 'equipment',
    'status_definitions', 'sla_rules', 'threshold_rules', 'notification_rules', 'profiles'
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
