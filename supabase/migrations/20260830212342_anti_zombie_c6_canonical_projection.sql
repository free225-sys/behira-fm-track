begin;

create or replace view public.anti_zombie_summary_v
with (security_invoker = true)
as
select
  a.id as anomaly_id,
  a.reference,
  a.version_no,
  case when status.is_closed then 'closed' else 'open' end as dossier_state,
  status.is_closed,
  status.code as status_code,
  status.label as status_label,
  stage.code as stage_code,
  stage.label as stage_label,
  a.assigned_profile_id as responsible_profile_id,
  case
    when responsible.account_status = 'active'
      and not responsible.must_change_password
    then responsible.display_name
    else null
  end as responsible_name,
  action.id as next_action_id,
  action.code as next_action_code,
  action.label as next_action_label,
  action.comment as next_action_comment,
  action.assigned_profile_id as next_action_assigned_profile_id,
  action.assigned_profile_name as next_action_assigned_profile_name,
  deadline.id as deadline_id,
  deadline.due_at,
  deadline.origin as deadline_origin,
  deadline.source_kind as deadline_source_kind,
  deadline.sla_code,
  deadline.workflow_stage_code as deadline_stage_code,
  deadline.workflow_stage_label as deadline_stage_label,
  coalesce(not status.is_closed and deadline.due_at < statement_timestamp(), false) as is_delayed,
  block.id as active_block_id,
  block.id is not null as is_blocked,
  block.blocking_actor_type,
  block.blocking_actor_label,
  block.reason_code as block_reason_code,
  block.reason_label as block_reason_label,
  block.reason_detail as block_reason_detail,
  delay.reason_code as delay_reason_code,
  delay.reason_label as delay_reason_label,
  delay.reason_detail as delay_reason_detail,
  case
    when block.id is not null then nullif(
      concat_ws(' — ', nullif(btrim(block.reason_label), ''), nullif(btrim(block.reason_detail), '')),
      ''
    )
    when not status.is_closed and deadline.due_at < statement_timestamp() then nullif(
      concat_ws(' — ', nullif(btrim(delay.reason_label), ''), nullif(btrim(delay.reason_detail), '')),
      ''
    )
    else null
  end as blocking_or_delay_reason,
  coalesce(proof_requirement.pending_count, 0)::integer as pending_proof_requirement_count,
  proof_requirement.expected_proof_label,
  proof_requirement.requirements as pending_proof_requirements,
  history.id as last_activity_id,
  history.event_code as last_activity_code,
  history.event_label as last_activity_label,
  history.occurred_at as last_activity_occurred_at,
  history.actor_profile_id as last_activity_actor_profile_id,
  history.actor_label as last_activity_actor_label,
  history.workflow_stage_code as last_activity_stage_code,
  history.workflow_stage_label as last_activity_stage_label,
  history.comment as last_activity_comment,
  (
    block.id is not null
    and (
      nullif(btrim(block.blocking_actor_label), '') is null
      or nullif(btrim(block.reason_detail), '') is null
    )
  ) as blocking_information_incomplete,
  (a.assigned_profile_id is null or responsible.id is null
    or responsible.account_status <> 'active' or responsible.must_change_password) as responsible_missing,
  action.id is null as next_action_missing,
  deadline.id is null as deadline_missing,
  proof_requirement.pending_count is null as expected_proof_missing,
  history.id is null as history_missing
from public.anomalies a
join public.status_definitions status on status.id = a.current_status_id
join public.workflow_stages stage on stage.id = status.stage_id
left join public.profiles responsible on responsible.id = a.assigned_profile_id
left join lateral (
  select
    aa.id,
    code.code,
    code.label,
    aa.comment,
    aa.assigned_profile_id,
    assigned.display_name as assigned_profile_name
  from public.anomaly_actions aa
  join public.next_action_codes code on code.id = aa.action_code_id
  left join public.profiles assigned on assigned.id = aa.assigned_profile_id
  where aa.anomaly_id = a.id
    and aa.state = 'pending'
  order by aa.created_at desc, aa.id desc
  limit 1
) action on true
left join lateral (
  select
    d.id,
    d.due_at,
    d.origin,
    d.source_kind,
    sla.code as sla_code,
    deadline_stage.code as workflow_stage_code,
    deadline_stage.label as workflow_stage_label
  from public.anomaly_deadlines d
  join public.workflow_stages deadline_stage on deadline_stage.id = d.workflow_stage_id
  left join public.sla_rules sla on sla.id = d.sla_rule_id
  where d.anomaly_id = a.id
    and d.superseded_at is null
  order by d.created_at desc, d.id desc
  limit 1
) deadline on true
left join lateral (
  select
    b.id,
    b.blocking_actor_type,
    b.blocking_actor_label_snapshot as blocking_actor_label,
    reason.code as reason_code,
    reason.label as reason_label,
    b.reason_detail
  from public.anomaly_blocks b
  join public.block_reason_codes reason on reason.id = b.block_reason_code_id
  where b.anomaly_id = a.id
    and b.state in ('active', 'resolution_proposed')
  order by b.declared_at desc, b.id desc
  limit 1
) block on true
left join lateral (
  select
    reason.code as reason_code,
    reason.label as reason_label,
    justification.reason_detail
  from public.anomaly_delay_justifications justification
  join public.delay_reason_codes reason on reason.id = justification.delay_reason_code_id
  where justification.anomaly_id = a.id
    and justification.deadline_id = deadline.id
    and justification.state = 'active'
  order by justification.declared_at desc, justification.id desc
  limit 1
) delay on true
left join lateral (
  select
    count(*)::integer as pending_count,
    string_agg(
      case
        when requirement.minimum_count > 1
        then requirement.label_snapshot || ' ×' || requirement.minimum_count::text
        else requirement.label_snapshot
      end,
      ' · ' order by requirement.created_at, requirement.id
    ) as expected_proof_label,
    jsonb_agg(
      jsonb_build_object(
        'id', requirement.id,
        'label', requirement.label_snapshot,
        'proof_type_code', proof_type.code,
        'proof_type_label', proof_type.label,
        'minimum_count', requirement.minimum_count,
        'is_mandatory', requirement.is_mandatory,
        'origin', requirement.origin,
        'acceptance_criteria', requirement.acceptance_criteria_snapshot
      ) order by requirement.created_at, requirement.id
    ) as requirements
  from public.anomaly_proof_requirements requirement
  left join public.proof_type_definitions proof_type on proof_type.id = requirement.proof_type_id
  where requirement.anomaly_id = a.id
    and requirement.state = 'pending'
) proof_requirement on proof_requirement.pending_count > 0
left join lateral (
  select
    h.id,
    event.code as event_code,
    event.label as event_label,
    h.occurred_at,
    h.actor_profile_id,
    coalesce(h.actor_label_snapshot, actor.display_name) as actor_label,
    activity_stage.code as workflow_stage_code,
    activity_stage.label as workflow_stage_label,
    h.comment
  from public.anomaly_history h
  join public.business_event_definitions event on event.id = h.event_definition_id
  left join public.profiles actor on actor.id = h.actor_profile_id
  left join public.workflow_stages activity_stage on activity_stage.id = h.workflow_stage_id
  where h.anomaly_id = a.id
    and event.is_activity
  order by h.occurred_at desc, h.server_received_at desc, h.id desc
  limit 1
) history on true;

revoke all on table public.anti_zombie_summary_v from public, anon, authenticated;
grant select on table public.anti_zombie_summary_v to authenticated;
grant select on table public.anti_zombie_summary_v to service_role;

comment on view public.anti_zombie_summary_v is
  'Projection canonique en lecture seule des huit informations de continuité de traitement ; security_invoker conserve la RLS des sources.';
comment on column public.anti_zombie_summary_v.blocking_or_delay_reason is
  'Motif du blocage principal actif ; à défaut, justification active de l’échéance dépassée.';
comment on column public.anti_zombie_summary_v.pending_proof_requirements is
  'Instantanés des exigences encore attendues ; ne contient jamais les preuves déjà déposées.';
comment on column public.anti_zombie_summary_v.last_activity_occurred_at is
  'Heure métier du dernier événement is_activity, jamais anomalies.updated_at.';

commit;
