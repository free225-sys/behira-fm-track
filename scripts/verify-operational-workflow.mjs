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

const facilityManager = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
let anomalyId;
let reportId;
let proofPath;

try {
  const { error: loginError } = await facilityManager.auth.signInWithPassword({
    email: "facility.manager@demo.behira.invalid",
    password,
  });
  if (loginError) throw loginError;

  const { data: created, error: createError } = await facilityManager.rpc("create_field_anomaly", {
    p_equipment_code: "RIA-01",
    p_title: "TEST LOT 3 — cycle persistant",
    p_description: "Fixture transactionnelle supprimée après le contrôle automatisé.",
    p_priority_label: "Critique",
  });
  if (createError) throw createError;
  const reference = created.reference;

  const { data: anomaly, error: anomalyError } = await facilityManager
    .from("anomalies")
    .select("id, source_report_id")
    .eq("reference", reference)
    .single();
  if (anomalyError) throw anomalyError;
  anomalyId = anomaly.id;
  reportId = anomaly.source_report_id;

  for (const target of ["Affectée", "En intervention", "En validation"]) {
    const { error } = await facilityManager.rpc("advance_anomaly_workflow", {
      p_reference: reference,
      p_target: target,
      p_comment: `Contrôle automatisé : ${target}`,
    });
    if (error) throw error;
  }

  const { error: prematureClosureError } = await facilityManager.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "Clôturée",
    p_comment: "Cette clôture doit être bloquée.",
  });
  if (!prematureClosureError) throw new Error("Critical closure without accepted proof was not blocked.");

  proofPath = `${anomalyId}/${crypto.randomUUID()}-preuve-test.png`;
  const tinyPng = Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0,73,69,78,68,174,66,96,130]);
  const { error: uploadError } = await facilityManager.storage
    .from("anomaly-proofs")
    .upload(proofPath, tinyPng, { contentType: "image/png", upsert: false });
  if (uploadError) throw uploadError;

  const { data: proof, error: proofError } = await facilityManager.rpc("register_anomaly_proof", {
    p_reference: reference,
    p_storage_path: proofPath,
    p_mime_type: "image/png",
    p_size_bytes: tinyPng.byteLength,
    p_proof_type: "photo",
  });
  if (proofError) throw proofError;
  if (proof.verification_status !== "accepted") throw new Error("Facility Manager proof was not accepted.");

  const { error: closureError } = await facilityManager.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: "Clôturée",
    p_comment: "Preuve contrôlée, clôture autorisée.",
  });
  if (closureError) throw closureError;

  const [{ data: closed }, { count: historyCount }, { count: qualificationCount }, { count: workOrderCount }, { count: interventionCount }, { count: proofCount }] = await Promise.all([
    facilityManager.from("anomalies").select("current_status_id, closed_at").eq("id", anomalyId).single(),
    facilityManager.from("anomaly_history").select("id", { count: "exact", head: true }).eq("anomaly_id", anomalyId),
    facilityManager.from("qualifications").select("id", { count: "exact", head: true }).eq("anomaly_id", anomalyId),
    facilityManager.from("work_orders").select("id", { count: "exact", head: true }).eq("anomaly_id", anomalyId),
    facilityManager.from("interventions").select("id", { count: "exact", head: true }).eq("anomaly_id", anomalyId),
    facilityManager.from("proofs").select("id", { count: "exact", head: true }).eq("anomaly_id", anomalyId),
  ]);
  const { data: closedStatus } = await facilityManager.from("status_definitions").select("code").eq("id", closed.current_status_id).single();
  if (closedStatus?.code !== "CLOTURE" || !closed.closed_at) throw new Error("The anomaly did not reach closure.");
  if ((historyCount ?? 0) < 5 || qualificationCount !== 1 || workOrderCount !== 1 || interventionCount !== 1 || proofCount !== 1) {
    throw new Error("Workflow records or history are incomplete.");
  }

  const direction = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: directionLoginError } = await direction.auth.signInWithPassword({
    email: "direction@demo.behira.invalid",
    password,
  });
  if (directionLoginError) throw directionLoginError;
  const { error: forbiddenCreateError } = await direction.rpc("create_field_anomaly", {
    p_equipment_code: "RIA-01",
    p_title: "Création interdite",
    p_description: "Cette écriture ne doit pas exister.",
    p_priority_label: "Critique",
  });
  if (!forbiddenCreateError) throw new Error("Direction unexpectedly used the field-only anomaly creation RPC.");

  console.log("✓ Persistent workflow: report, anomaly, qualification, work order, intervention, proof and closure");
  console.log("✓ Critical proof lock and private Storage upload");
  console.log("✓ Role-specific write rejection and audit history");
} finally {
  const cleanupFailures = [];
  if (anomalyId) {
    const { data: cleanupPriority, error: priorityError } = await service
      .from("priority_definitions")
      .select("id")
      .eq("code", "LOW")
      .single();
    if (priorityError) cleanupFailures.push(`priority: ${priorityError.message}`);
    else {
      const { error } = await service.from("anomalies").update({ priority_id: cleanupPriority.id }).eq("id", anomalyId);
      if (error) cleanupFailures.push(`anomaly demotion: ${error.message}`);
    }
  }
  if (proofPath) {
    const { error } = await service.storage.from("anomaly-proofs").remove([proofPath]);
    if (error) cleanupFailures.push(`storage: ${error.message}`);
  }
  if (anomalyId) {
    const childTables = ["proofs", "costs", "interventions", "work_orders", "qualifications"];
    for (const table of childTables) {
      const { error } = await service.from(table).delete().eq("anomaly_id", anomalyId);
      if (error) cleanupFailures.push(`${table}: ${error.message}`);
    }
    const { error } = await service.from("anomalies").delete().eq("id", anomalyId);
    if (error) cleanupFailures.push(`anomalies: ${error.message}`);
  }
  if (reportId) {
    const { error } = await service.from("reports").delete().eq("id", reportId);
    if (error) cleanupFailures.push(`reports: ${error.message}`);
  }
  await facilityManager.auth.signOut();
  if (cleanupFailures.length) throw new Error(`Workflow fixture cleanup failed: ${cleanupFailures.join("; ")}`);
}

console.log("Lot 3 local workflow verification passed.");
