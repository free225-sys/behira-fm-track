import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, Json } from "./database.types";
import type { AnomalyProofPayload, FieldRoundPayload } from "../offline/types";
import type { OperationalReport } from "./data";
import { decodeGe01Review, ge01ChecksSnapshot, validateGe01Review, type Ge01ReviewInput } from "../ge01/review";
import { ge01EvidenceManifest } from '../ge01/evidence';

export async function reviewGe01Report(client: SupabaseClient<Database>, report: OperationalReport, input: Ge01ReviewInput) {
  const issue = validateGe01Review(report, input);
  if (issue) throw new Error(issue);
  if (!report.updatedAt || report.review === undefined) throw new Error("L’examen n’est pas disponible dans cet environnement.");
  const { data, error } = await client.rpc("review_ge01_report", {
    p_report_id: report.id, p_decision: input.decision, p_comment: input.comment.trim(),
    p_expected_updated_at: report.updatedAt, p_expected_checks: ge01ChecksSnapshot(report.checks),
    p_check_codes: input.decision === "anomaly" ? input.checkCodes : [],
    p_priority_code: input.decision === "anomaly" ? input.priorityCode : undefined,
    p_anomaly_title: input.decision === "anomaly" ? input.anomalyTitle?.trim() : undefined,
  });
  if (error) {
    if (error.code === "40001" || error.code === "23505") throw new Error("Le rapport a changé ou a déjà été examiné. Actualisez la file avant de poursuivre.");
    if (error.code === "42501") throw new Error("Votre session ne permet pas d’examiner ce rapport.");
    if (error.code === "23514") throw new Error(error.message);
    throw new Error("Décision non confirmée par le serveur. Actualisez la file avant de réessayer.");
  }
  return decodeGe01Review(data);
}

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
  const args = {
    ...(payload.isTest ? { p_is_test: true, p_test_attested: payload.testAttested === true } : {}),
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
  };
  if (payload.equipmentCode === 'RIA-01' && payload.riaEvidence !== undefined) {
    const { riaManifest } = await import('../ria/report');
    const manifest = await riaManifest(payload.riaEvidence);
    const result = await client.rpc('submit_ria_round_offline', {p_id:clientMutationId,p_performed_at:payload.performedAt,p_summary:payload.summary,p_checks:args.p_checks,p_manifest:manifest,p_is_test:payload.isTest===true,p_test_attested:payload.testAttested===true});
    if(result.error) throw result.error;
    const receipt=asRpcResult(result.data);
    if(typeof receipt.report_id!=='string') throw new Error('Identifiant du rapport RIA manquant.');
    const bucket=client.storage.from('health-proofs');
    for(let i=0;i<manifest.length;i++) {
      const m=manifest[i],path=`${receipt.report_id}/${m.id}-${m.sha256}`;
      const previous=await bucket.download(path);
      if(previous.error) {
        const sent=await bucket.upload(path,payload.riaEvidence[i].file,{upsert:false,contentType:m.mimeType});
        if(sent.error){const retry=await bucket.download(path);if(retry.error)throw sent.error;await assertEvidenceHash(retry.data,m.sha256);}
      } else await assertEvidenceHash(previous.data,m.sha256);
    }
    const confirmed=await client.rpc('confirm_ria_round',{p_report_id:receipt.report_id});
    if(confirmed.error)throw confirmed.error;
    return receipt;
  }
  if (payload.equipmentCode === 'GE-01' && payload.reportType === 'technical_round' && payload.evidence !== undefined) {
    const manifest = await ge01EvidenceManifest(payload.evidence);
    const { data, error } = await client.rpc('submit_ge01_round_offline', {
      p_client_mutation_id: clientMutationId, p_performed_at: payload.performedAt, p_summary: payload.summary,
      p_checks: args.p_checks, p_manifest: manifest,
      p_sent_at: payload.sentAt ?? payload.performedAt,
      p_is_test: payload.isTest === true, p_test_attested: payload.testAttested === true,
    });
    if (error) throw error;
    const receipt = asRpcResult(data);
    if (typeof receipt.report_id !== 'string') throw new Error('Identifiant du rapport serveur manquant.');
    for (let index = 0; index < manifest.length; index++) {
      const proof = manifest[index];
      const path = `${receipt.report_id}/${proof.id}-${proof.sha256}`;
      const bucket = client.storage.from('round-proofs');
      // A retry after a lost response must verify bytes, not assume an existing name is the same proof.
      const existing = await bucket.download(path);
      if (existing.error) {
        const uploaded = await bucket.upload(path, payload.evidence[index].file, { upsert: false, contentType: proof.mimeType });
        if (uploaded.error) {
          const retry = await bucket.download(path);
          if (retry.error) throw uploaded.error;
          await assertEvidenceHash(retry.data, proof.sha256);
        }
      } else await assertEvidenceHash(existing.data, proof.sha256);
      const registration = await client.rpc('register_ge01_evidence', { p_report_id: receipt.report_id, p_id: proof.id });
      if (registration.error) throw registration.error;
    }
    return receipt;
  }
  const { data, error } = await client.rpc("submit_field_round_offline", args);
  if (error) throw error;
  return asRpcResult(data);
}

async function assertEvidenceHash(blob: Blob, expected: string) {
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await blob.arrayBuffer())))
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== expected) throw new Error('La photo déjà reçue ne correspond pas au fichier local. Envoi conservé pour vérification.');
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
    replacesCostReference?: string;
    amount: number;
    budgetType: "opex" | "capex";
    description: string;
    idempotencyKey: string;
  },
) {
  const { data, error } = await client.rpc("submit_anomaly_cost_decision", {
    p_anomaly_reference: input.anomalyReference,
    ...(input.replacesCostReference ? {p_replaces_cost_reference: input.replacesCostReference} : {}),
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
    decision: "approved" | "rejected" | "returned";
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
