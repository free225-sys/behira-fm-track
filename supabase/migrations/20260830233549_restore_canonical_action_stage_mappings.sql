-- C8 forward fix: the canonical action/stage compatibility catalogue was
-- previously present only in seed.sql. Remote deployments deliberately omit
-- that development seed, so the workflow guard rejected every canonical
-- action. These 29 mappings are the already validated catalogue; this
-- migration introduces no new action, stage, permission or workflow rule. It
-- also makes the six pre-existing workflow stages available before the seed so
-- a fresh migration chain can create the compatibility rows deterministically.

begin;

create temporary table required_action_stage_mappings (
  action_code text not null,
  stage_code text not null,
  primary key (action_code, stage_code)
) on commit drop;

create temporary table required_workflow_stages (
  code text primary key,
  label text not null,
  sequence_no smallint not null unique
) on commit drop;

insert into required_workflow_stages(code, label, sequence_no) values
  ('CONSTAT', 'Constat', 10),
  ('QUALIFICATION', 'Qualification', 20),
  ('DECISION', 'Décision', 30),
  ('INTERVENTION', 'Intervention', 40),
  ('PREUVE', 'Preuve', 50),
  ('CLOTURE', 'Clôture', 60);

insert into public.workflow_stages(code, label, sequence_no)
select code, label, sequence_no
from required_workflow_stages
on conflict (code) do update
set label = excluded.label,
    sequence_no = excluded.sequence_no;

insert into required_action_stage_mappings(action_code, stage_code) values
  ('QUALIFY_ASSIGN', 'QUALIFICATION'),
  ('PERFORM_DIAGNOSIS', 'QUALIFICATION'),
  ('CHOOSE_TREATMENT_BRANCH', 'QUALIFICATION'),
  ('MONITOR_REASSESS', 'DECISION'),
  ('OBTAIN_QUOTE', 'DECISION'),
  ('SUBMIT_ADMIN_ARBITRATION', 'QUALIFICATION'),
  ('SUBMIT_ADMIN_ARBITRATION', 'DECISION'),
  ('PLAN_INTERVENTION', 'DECISION'),
  ('PLAN_INTERVENTION', 'INTERVENTION'),
  ('EXECUTE_INTERVENTION', 'INTERVENTION'),
  ('FOLLOW_UP_BLOCKER', 'CONSTAT'),
  ('FOLLOW_UP_BLOCKER', 'QUALIFICATION'),
  ('FOLLOW_UP_BLOCKER', 'DECISION'),
  ('FOLLOW_UP_BLOCKER', 'INTERVENTION'),
  ('FOLLOW_UP_BLOCKER', 'PREUVE'),
  ('RECEIVE_INTERVENTION', 'INTERVENTION'),
  ('RECEIVE_INTERVENTION', 'PREUVE'),
  ('LIFT_RESERVATIONS', 'PREUVE'),
  ('SUBMIT_REQUIRED_PROOF', 'INTERVENTION'),
  ('SUBMIT_REQUIRED_PROOF', 'PREUVE'),
  ('VALIDATE_PROOF', 'PREUVE'),
  ('CLOSE_DOSSIER', 'PREUVE'),
  ('REVIEW_REOPENED_DOSSIER', 'QUALIFICATION'),
  ('REVIEW_REOPENED_DOSSIER', 'INTERVENTION'),
  ('OTHER', 'CONSTAT'),
  ('OTHER', 'QUALIFICATION'),
  ('OTHER', 'DECISION'),
  ('OTHER', 'INTERVENTION'),
  ('OTHER', 'PREUVE');

do $$
begin
  if (select count(*) from required_workflow_stages) <> 6 then
    raise exception 'The canonical workflow must contain exactly six stages';
  end if;

  if (select count(*) from required_action_stage_mappings) <> 29 then
    raise exception 'The canonical action/stage catalogue must contain exactly 29 mappings';
  end if;

  if exists (
    select 1
    from required_action_stage_mappings required
    left join public.next_action_codes action_code
      on action_code.code = required.action_code
    left join public.workflow_stages stage
      on stage.code = required.stage_code
    where action_code.id is null or stage.id is null
  ) then
    raise exception 'A canonical action or workflow stage required by C8 is missing';
  end if;
end;
$$;

insert into public.next_action_code_stages(
  action_code_id,
  workflow_stage_id,
  is_default_for_stage
)
select action_code.id, stage.id, false
from required_action_stage_mappings required
join public.next_action_codes action_code
  on action_code.code = required.action_code
join public.workflow_stages stage
  on stage.code = required.stage_code
on conflict (action_code_id, workflow_stage_id) do update
set is_default_for_stage = excluded.is_default_for_stage;

do $$
begin
  if exists (
    select 1
    from required_action_stage_mappings required
    left join public.next_action_codes action_code
      on action_code.code = required.action_code
    left join public.workflow_stages stage
      on stage.code = required.stage_code
    left join public.next_action_code_stages compatibility
      on compatibility.action_code_id = action_code.id
     and compatibility.workflow_stage_id = stage.id
    where compatibility.action_code_id is null
  ) then
    raise exception 'The canonical action/stage compatibility catalogue is incomplete';
  end if;
end;
$$;

commit;
