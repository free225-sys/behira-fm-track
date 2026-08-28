begin;

-- New hosted projects can grant function execution directly to API roles.
-- Start from a deny-by-default posture, then expose only the helpers and RPCs
-- required by authenticated application users.
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;

revoke execute on all functions in schema public from public, anon, authenticated;

grant execute on function public.next_business_reference(text) to authenticated, service_role;
grant execute on function public.current_profile_id() to authenticated, service_role;
grant execute on function public.has_role(text) to authenticated, service_role;
grant execute on function public.has_any_role(text[]) to authenticated, service_role;
grant execute on function public.resolve_sla_deadlines(uuid, uuid, uuid, timestamptz) to authenticated, service_role;
grant execute on function public.has_accepted_proof(uuid) to authenticated, service_role;
grant execute on function public.current_vendor_id() to authenticated, service_role;
grant execute on function public.can_access_zone(uuid) to authenticated, service_role;
grant execute on function public.can_access_equipment(uuid) to authenticated, service_role;
grant execute on function public.can_access_anomaly(uuid) to authenticated, service_role;
grant execute on function public.can_access_report(uuid) to authenticated, service_role;
grant execute on function public.mark_notification_read(uuid) to authenticated, service_role;
grant execute on function public.validate_anomaly_risk(uuid, text, text) to authenticated, service_role;
grant execute on function public.proof_object_anomaly_id(text) to authenticated, service_role;
grant execute on function public.resolve_anomaly_id(text) to authenticated, service_role;
grant execute on function public.create_field_anomaly(text, text, text, text) to authenticated, service_role;
grant execute on function public.advance_anomaly_workflow(text, text, text) to authenticated, service_role;
grant execute on function public.register_anomaly_proof(text, text, text, bigint, text) to authenticated, service_role;
grant execute on function public.verify_latest_anomaly_proof(text, text, text) to authenticated, service_role;

drop policy if exists reference_counters_no_client_access on public.reference_counters;
create policy reference_counters_no_client_access
on public.reference_counters
for select
to authenticated
using (false);

commit;
