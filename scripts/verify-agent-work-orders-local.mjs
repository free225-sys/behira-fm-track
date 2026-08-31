import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const environment = Object.fromEntries(
  readFileSync(new URL("../.env.supabase.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const key = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey = environment.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
const password = "Behira-Demo-2026!";
if (!url || !key || !serviceKey) throw new Error("Local Supabase credentials are unavailable.");

const config = readFileSync(new URL("../supabase/config.toml", import.meta.url), "utf8");
const projectId = config.match(/^project_id\s*=\s*"([^"]+)"/m)?.[1];
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
if (!projectId) throw new Error("Local Supabase project id is unavailable.");

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const facility = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const sylvain = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const evariste = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

let anomalyId;
let reportId;
const proofPaths = [];

function cleanupFixture(targetAnomalyId, targetReportId) {
  if (targetAnomalyId && !uuidPattern.test(targetAnomalyId)) throw new Error("Invalid local anomaly fixture id.");
  if (targetReportId && !uuidPattern.test(targetReportId)) throw new Error("Invalid local report fixture id.");
  const anomalyFilter = targetAnomalyId ? `'${targetAnomalyId}'::uuid` : "null::uuid";
  const reportFilter = targetReportId ? `'${targetReportId}'::uuid` : "null::uuid";
  const sql = `
begin;
alter table public.proof_requirement_evidence disable trigger validate_proof_requirement_evidence_row;
alter table public.anomaly_proof_requirements disable trigger validate_proof_requirement_row;
delete from public.proof_requirement_evidence where requirement_id in (
  select id from public.anomaly_proof_requirements where anomaly_id = ${anomalyFilter}
);
delete from public.anomaly_proof_requirements where anomaly_id = ${anomalyFilter};
alter table public.anomaly_proof_requirements enable trigger validate_proof_requirement_row;
alter table public.proof_requirement_evidence enable trigger validate_proof_requirement_evidence_row;
delete from public.proofs where anomaly_id = ${anomalyFilter};
delete from public.costs where anomaly_id = ${anomalyFilter};
delete from public.interventions where anomaly_id = ${anomalyFilter};
delete from public.work_orders where anomaly_id = ${anomalyFilter};
delete from public.qualifications where anomaly_id = ${anomalyFilter};
delete from public.anomaly_history where anomaly_id = ${anomalyFilter};
delete from public.anomalies where id = ${anomalyFilter};
delete from public.reports where id = ${reportFilter};
commit;
`;
  execFileSync(
    "docker",
    ["exec", "-i", `supabase_db_${projectId}`, "psql", "-v", "ON_ERROR_STOP=1", "-U", "postgres", "-d", "postgres"],
    { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] },
  );
}

async function login(client, email) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function addAgentProof(reference, path) {
  const tinyPng = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0,73,69,78,68,174,66,96,130]);
  const { error: uploadError } = await sylvain.storage
    .from("anomaly-proofs")
    .upload(path, tinyPng, { contentType: "image/png", upsert: false });
  if (uploadError) throw uploadError;
  proofPaths.push(path);
  const { data, error } = await sylvain.rpc("register_anomaly_proof", {
    p_reference: reference,
    p_storage_path: path,
    p_mime_type: "image/png",
    p_size_bytes: tinyPng.byteLength,
    p_proof_type: "photo",
  });
  if (error) throw error;
  if (data.verification_status !== "pending") throw new Error("Agent proof did not remain pending for Facility Manager review.");
  return data;
}

try {
  await Promise.all([
    login(facility, "facility.manager@demo.behira.invalid"),
    login(sylvain, "eau.incendie@demo.behira.invalid"),
    login(evariste, "electricite@demo.behira.invalid"),
  ]);

  const { data: created, error: createError } = await facility.rpc("create_field_anomaly", {
    p_equipment_code: "WILO-01",
    p_title: "TEST C9-FIX-03 — intervention et preuve agent",
    p_description: "Fixture locale supprimée après le contrôle transactionnel.",
    p_priority_label: "Critique",
  });
  if (createError) throw createError;
  const reference = created.reference;

  const { data: anomaly, error: anomalyError } = await facility
    .from("anomalies")
    .select("id, source_report_id")
    .eq("reference", reference)
    .single();
  if (anomalyError) throw anomalyError;
  anomalyId = anomaly.id;
  reportId = anomaly.source_report_id;

  const { error: assignError } = await facility.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "Affectée",
    p_comment: "Affectation locale C9-FIX-03 au périmètre WILO-01.",
  });
  if (assignError) throw assignError;

  const { data: assignedOrder, error: orderError } = await sylvain
    .from("work_orders")
    .select("id, reference, status, assigned_profile_id")
    .eq("anomaly_id", anomalyId)
    .single();
  if (orderError) throw orderError;
  if (assignedOrder.status !== "planned") throw new Error("The assigned order did not start as planned.");

  const { error: foreignStartError } = await evariste.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "En intervention",
    p_comment: "Cette tentative hors périmètre doit être refusée.",
  });
  if (!foreignStartError) throw new Error("Another field agent started Sylvain's assigned intervention.");

  const { error: startError } = await sylvain.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "En intervention",
    p_comment: "Diagnostic agent : pression vérifiée, pompe contrôlée.",
  });
  if (startError) throw startError;

  const { data: startedOrder, error: startedOrderError } = await sylvain
    .from("work_orders")
    .select("status")
    .eq("id", assignedOrder.id)
    .single();
  if (startedOrderError || startedOrder.status !== "in_progress") throw startedOrderError ?? new Error("The work order did not enter in_progress.");

  const { error: finishError } = await sylvain.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "En validation",
    p_comment: "Intervention terminée : réglage effectué, essai concluant.",
  });
  if (finishError) throw finishError;

  const [{ data: completedOrder, error: completedOrderError }, { data: intervention, error: interventionError }] = await Promise.all([
    sylvain.from("work_orders").select("status, completed_at").eq("id", assignedOrder.id).single(),
    sylvain.from("interventions").select("ended_at, outcome, summary").eq("work_order_id", assignedOrder.id).single(),
  ]);
  if (completedOrderError || completedOrder.status !== "completed" || !completedOrder.completed_at) throw completedOrderError ?? new Error("The work order did not complete.");
  if (interventionError || !intervention.ended_at || intervention.outcome !== "resolved" || !intervention.summary.includes("essai concluant")) throw interventionError ?? new Error("The intervention result was not preserved.");

  await addAgentProof(reference, `${anomalyId}/${crypto.randomUUID()}-preuve-refusee.png`);

  const { error: emptyRejectionError } = await facility.rpc("verify_latest_anomaly_proof", {
    p_reference: reference,
    p_decision: "rejected",
    p_comment: "",
  });
  if (!emptyRejectionError) throw new Error("A proof rejection without reason was accepted.");

  const rejectionReason = "Photo illisible : reprendre le cadrage du manomètre.";
  const { error: rejectionError } = await facility.rpc("verify_latest_anomaly_proof", {
    p_reference: reference,
    p_decision: "rejected",
    p_comment: rejectionReason,
  });
  if (rejectionError) throw rejectionError;

  const { data: rejectedProof, error: rejectedProofError } = await facility
    .from("proofs")
    .select("verification_status, rejection_reason")
    .eq("anomaly_id", anomalyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (rejectedProofError || rejectedProof.verification_status !== "rejected" || rejectedProof.rejection_reason !== rejectionReason) throw rejectedProofError ?? new Error("Proof rejection was not preserved.");

  const { error: prematureClosureError } = await facility.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "Clôturée",
    p_comment: "Cette clôture doit rester bloquée.",
  });
  if (!prematureClosureError) throw new Error("Critical closure succeeded while the mandatory proof requirement remained pending.");

  const acceptedProofPath = `${anomalyId}/${crypto.randomUUID()}-preuve-acceptee.png`;
  await addAgentProof(reference, acceptedProofPath);
  const { error: acceptanceError } = await facility.rpc("verify_latest_anomaly_proof", {
    p_reference: reference,
    p_decision: "accepted",
    p_comment: "Preuve lisible et conforme à l’intervention déclarée.",
  });
  if (acceptanceError) throw acceptanceError;

  const { data: projectedProof, error: projectedProofError } = await facility
    .from("proofs")
    .select("id, reference, storage_bucket, storage_path, mime_type, verification_status, captured_at")
    .eq("anomaly_id", anomalyId)
    .eq("storage_path", acceptedProofPath)
    .single();
  if (projectedProofError || projectedProof.storage_bucket !== "anomaly-proofs" || projectedProof.verification_status !== "accepted") {
    throw projectedProofError ?? new Error("Accepted proof metadata cannot be projected for consultation.");
  }

  const [{ data: facilitySigned, error: facilitySignedError }, { data: agentSigned, error: agentSignedError }] = await Promise.all([
    facility.storage.from("anomaly-proofs").createSignedUrl(projectedProof.storage_path, 300),
    sylvain.storage.from("anomaly-proofs").createSignedUrl(projectedProof.storage_path, 300),
  ]);
  if (facilitySignedError || !facilitySigned.signedUrl) throw facilitySignedError ?? new Error("Facility Manager could not consult the private proof.");
  if (agentSignedError || !agentSigned.signedUrl) throw agentSignedError ?? new Error("Assigned agent could not consult the private proof.");
  const proofResponse = await fetch(facilitySigned.signedUrl);
  if (!proofResponse.ok || proofResponse.headers.get("content-type") !== "image/png") {
    throw new Error("The signed private proof URL did not return the expected image.");
  }
  const { data: foreignSigned, error: foreignSignedError } = await evariste.storage
    .from("anomaly-proofs")
    .createSignedUrl(projectedProof.storage_path, 300);
  if (!foreignSignedError || foreignSigned?.signedUrl) throw new Error("An out-of-scope agent consulted Sylvain's private proof.");

  const { data: proofRequirement, error: requirementError } = await facility
    .from("anomaly_proof_requirements")
    .select("state")
    .eq("anomaly_id", anomalyId)
    .eq("is_mandatory", true)
    .single();
  if (requirementError || proofRequirement.state !== "satisfied") throw requirementError ?? new Error("Accepted proof did not satisfy the critical proof requirement.");

  const { error: closureError } = await facility.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "Clôturée",
    p_comment: "Intervention et preuve contrôlées ; clôture autorisée.",
  });
  if (closureError) throw closureError;

  const { data: historyRows, error: historyError } = await facility
    .from("anomaly_history")
    .select("id, event_type, event_definition_id, workflow_stage_id, actor_profile_id, actor_label_snapshot, occurred_at, comment")
    .eq("anomaly_id", anomalyId)
    .order("occurred_at", { ascending: false });
  if (historyError || (historyRows?.length ?? 0) < 8) throw historyError ?? new Error("The audit history is incomplete.");
  const latestHistory = historyRows?.[0];
  if (!latestHistory?.event_definition_id || !latestHistory.workflow_stage_id || !latestHistory.actor_profile_id || !latestHistory.actor_label_snapshot || !latestHistory.occurred_at) {
    throw new Error("The latest canonical history event is missing its action, actor, stage or timestamp provenance.");
  }

  console.log("✓ Assigned agent alone starts and finishes the intervention");
  console.log("✓ Work order and intervention preserve their canonical states and summary");
  console.log("✓ Agent proof remains pending; Facility Manager rejection requires a reason");
  console.log("✓ A replacement proof can be accepted and satisfies the critical requirement");
  console.log("✓ Facility Manager and assigned agent consult a signed private proof; out-of-scope agent is refused");
  console.log("✓ Critical closure stays locked before acceptance and succeeds afterwards");
  console.log("✓ Canonical history exposes action, actor, stage and timestamp after closure");
} finally {
  const failures = [];
  for (const path of proofPaths) {
    const { error } = await service.storage.from("anomaly-proofs").remove([path]);
    if (error) failures.push(`storage ${path}: ${error.message}`);
  }
  if (anomalyId) {
    const { data: lowPriority, error: lowPriorityError } = await service.from("priority_definitions").select("id").eq("code", "LOW").single();
    if (lowPriorityError) failures.push(`priority: ${lowPriorityError.message}`);
    else {
      const { error } = await service.from("anomalies").update({ priority_id: lowPriority.id }).eq("id", anomalyId);
      if (error) failures.push(`demotion: ${error.message}`);
    }
  }
  if (anomalyId || reportId) {
    try { cleanupFixture(anomalyId, reportId); }
    catch (error) { failures.push(`database: ${error instanceof Error ? error.message : String(error)}`); }
  }
  await Promise.all([facility.auth.signOut(), sylvain.auth.signOut(), evariste.auth.signOut()]);
  if (failures.length) throw new Error(`C9-FIX-05 cleanup failed: ${failures.join("; ")}`);
}

console.log("C9-FIX-05 local transaction, private proof consultation, canonical history and RLS verification passed; fixture removed.");
