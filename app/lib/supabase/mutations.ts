import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "./database.types";
import type { AnomalyProofPayload, FieldRoundPayload } from "../offline/types";

const PROOF_BUCKET = "anomaly-proofs";
const VENDOR_REPORT_BUCKET = "vendor-intervention-reports";
const MAX_PROOF_BYTES = 10 * 1024 * 1024;
const ALLOWED_PROOF_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

type RpcResult = Record<string, Json | undefined>;

function asRpcResult(value: Json): RpcResult {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Réponse du service métier invalide.");
  }
  return value;
}

function cleanFileName(name: string) {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90) || "preuve";
}

export async function createFieldAnomaly(
  client: SupabaseClient<Database>,
  input: { asset: string; title: string; description: string; priority: string },
) {
  const { data, error } = await client.rpc("create_field_anomaly", {
    p_equipment_code: input.asset,
    p_title: input.title,
    p_description: input.description,
    p_priority_label: input.priority,
  });
  if (error) throw error;
  const result = asRpcResult(data);
  if (typeof result.reference !== "string") throw new Error("Référence d’anomalie manquante.");
  return result.reference;
}

export async function advanceAnomalyWorkflow(
  client: SupabaseClient<Database>,
  reference: string,
  target: string,
  comment?: string,
) {
  const { data, error } = await client.rpc("advance_anomaly_workflow", {
    p_reference: reference,
    p_target: target,
    p_comment: comment?.trim() || undefined,
  });
  if (error) throw error;
  return asRpcResult(data);
}

export async function uploadAnomalyProof(
  client: SupabaseClient<Database>,
  reference: string,
  file: File,
) {
  if (!ALLOWED_PROOF_TYPES.has(file.type)) {
    throw new Error("Format non accepté : utilisez JPG, PNG, WebP ou PDF.");
  }
  if (file.size <= 0 || file.size > MAX_PROOF_BYTES) {
    throw new Error("La preuve doit peser moins de 10 Mo.");
  }

  const { data: anomalyId, error: resolveError } = await client.rpc("resolve_anomaly_id", {
    p_reference: reference,
  });
  if (resolveError || !anomalyId) throw resolveError ?? new Error("Anomalie introuvable.");

  const path = `${anomalyId}/${crypto.randomUUID()}-${cleanFileName(file.name)}`;
  const { error: uploadError } = await client.storage.from(PROOF_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const proofType = file.type === "application/pdf" ? "pv" : "photo";
  const { data, error } = await client.rpc("register_anomaly_proof", {
    p_reference: reference,
    p_storage_path: path,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_proof_type: proofType,
  });
  if (error) {
    await client.storage.from(PROOF_BUCKET).remove([path]);
    throw error;
  }
  return asRpcResult(data);
}

export async function submitQueuedFieldRound(
  client: SupabaseClient<Database>,
  clientMutationId: string,
  payload: FieldRoundPayload,
) {
  const { data, error } = await client.rpc("submit_field_round_offline", {
    p_client_mutation_id: clientMutationId,
    p_equipment_code: payload.equipmentCode,
    p_report_type: payload.reportType,
    p_performed_at: payload.performedAt,
    p_summary: payload.summary,
    p_checks: payload.checks.map((check) => ({
      code: check.code,
      label: check.label,
      status: check.status,
      ...(check.valueNumeric === undefined ? {} : { value_numeric: check.valueNumeric }),
      ...(check.valueText === undefined ? {} : { value_text: check.valueText }),
      ...(check.valueBoolean === undefined ? {} : { value_boolean: check.valueBoolean }),
      ...(check.unit ? { unit: check.unit } : {}),
      ...(check.notes ? { notes: check.notes } : {}),
    })),
    p_anomaly_title: payload.anomaly?.title,
    p_anomaly_description: payload.anomaly?.description,
    p_priority_label: payload.anomaly?.priority,
  });
  if (error) throw error;
  return asRpcResult(data);
}

export async function uploadQueuedAnomalyProof(
  client: SupabaseClient<Database>,
  clientMutationId: string,
  payload: AnomalyProofPayload,
) {
  const { file } = payload;
  if (!ALLOWED_PROOF_TYPES.has(file.type)) {
    throw new Error("Format non accepté : utilisez JPG, PNG, WebP ou PDF.");
  }
  if (file.size <= 0 || file.size > MAX_PROOF_BYTES) {
    throw new Error("La preuve doit peser moins de 10 Mo.");
  }

  const objectName = `${clientMutationId}-${cleanFileName(file.name)}`;
  const path = `${payload.anomalyId}/${objectName}`;
  const { error: uploadError } = await client.storage.from(PROOF_BUCKET).upload(path, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    const { data: existing, error: listError } = await client.storage
      .from(PROOF_BUCKET)
      .list(payload.anomalyId, { limit: 10, search: objectName });
    if (listError || !existing?.some((object) => object.name === objectName)) throw uploadError;
  }

  const { data, error } = await client.rpc("register_anomaly_proof_offline", {
    p_client_mutation_id: clientMutationId,
    p_reference: payload.anomalyReference,
    p_storage_path: path,
    p_mime_type: file.type,
    p_size_bytes: file.size,
    p_proof_type: payload.proofType,
    p_captured_at: payload.capturedAt,
  });
  if (error) throw error;
  return asRpcResult(data);
}

export async function verifyLatestAnomalyProof(
  client: SupabaseClient<Database>,
  reference: string,
  decision: "accepted" | "rejected",
  comment?: string,
) {
  const { data, error } = await client.rpc("verify_latest_anomaly_proof", {
    p_reference: reference,
    p_decision: decision,
    p_comment: comment?.trim() || undefined,
  });
  if (error) throw error;
  return asRpcResult(data);
}

export async function submitAnomalyCostDecision(
  client: SupabaseClient<Database>,
  input: {
    anomalyReference: string;
    amount: number;
    budgetType: "opex" | "capex";
    description: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await client.rpc("submit_anomaly_cost_decision", {
    p_anomaly_reference: input.anomalyReference,
    p_amount: input.amount,
    p_budget_type: input.budgetType,
    p_description: input.description.trim(),
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return asRpcResult(data);
}

export async function reviewAnomalyCostDecision(
  client: SupabaseClient<Database>,
  input: {
    costReference: string;
    decision: "approved" | "rejected";
    comment: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await client.rpc("review_anomaly_cost_decision", {
    p_cost_reference: input.costReference,
    p_decision: input.decision,
    p_comment: input.comment.trim(),
    p_idempotency_key: input.idempotencyKey,
  });
  if (error) throw error;
  return asRpcResult(data);
}

export async function createAnomalyProofConsultationUrl(
  client: SupabaseClient<Database>,
  storagePath: string,
) {
  if (!storagePath.trim()) throw new Error("Le fichier de preuve n’est pas relié au dossier.");
  const { data, error } = await client.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(storagePath, 5 * 60);
  if (error) throw error;
  if (!data.signedUrl) throw new Error("Le lien temporaire de consultation n’a pas été généré.");
  return data.signedUrl;
}

export async function uploadVendorInterventionReport(
  client: SupabaseClient<Database>,
  input: {
    anomalyReference: string;
    vendorCode: string;
    file: File;
    reportType: "intervention_report" | "pv" | "quote" | "photo_bundle";
    reportDate: string;
    summary: string;
    reserveNotes?: string;
    costAmount?: number;
  },
) {
  if (!ALLOWED_PROOF_TYPES.has(input.file.type)) {
    throw new Error("Format non accepté : utilisez JPG, PNG, WebP ou PDF.");
  }
  if (input.file.size <= 0 || input.file.size > MAX_PROOF_BYTES) {
    throw new Error("Le rapport doit peser moins de 10 Mo.");
  }

  const { data: userData, error: userError } = await client.auth.getUser();
  if (userError || !userData.user) throw userError ?? new Error("Session utilisateur introuvable.");

  const { data: anomalyId, error: resolveError } = await client.rpc("resolve_anomaly_id", {
    p_reference: input.anomalyReference,
  });
  if (resolveError || !anomalyId) throw resolveError ?? new Error("Anomalie introuvable.");

  const path = `${userData.user.id}/${anomalyId}/${crypto.randomUUID()}-${cleanFileName(input.file.name)}`;
  const { error: uploadError } = await client.storage.from(VENDOR_REPORT_BUCKET).upload(path, input.file, {
    cacheControl: "3600",
    contentType: input.file.type,
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { data, error } = await client.rpc("register_vendor_intervention_report", {
    p_anomaly_reference: input.anomalyReference,
    p_vendor_code: input.vendorCode,
    p_storage_path: path,
    p_mime_type: input.file.type,
    p_size_bytes: input.file.size,
    p_report_type: input.reportType,
    p_report_date: input.reportDate,
    p_summary: input.summary.trim(),
    p_reserve_notes: input.reserveNotes?.trim() || undefined,
    p_cost_amount: input.costAmount,
  });
  if (error) {
    await client.storage.from(VENDOR_REPORT_BUCKET).remove([path]);
    throw error;
  }
  return asRpcResult(data);
}
