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
const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceRoleKey = environment.SUPABASE_LOCAL_SERVICE_ROLE_KEY;
const password = "Behira-Demo-2026!";

if (!url || !publishableKey || !serviceRoleKey || !/^(https?:\/\/)(localhost|127\.0\.0\.1)(:|\/)/.test(url)) {
  throw new Error("The isolated local Supabase environment is unavailable or not local.");
}

const clientFor = () => createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const service = createClient(url, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const fm = clientFor();
const administration = clientFor();
const agent = clientFor();
const createdCostIds = [];

async function signIn(client, email) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

try {
  await Promise.all([
    signIn(fm, "facility.manager@demo.behira.invalid"),
    signIn(administration, "direction@demo.behira.invalid"),
    signIn(agent, "electricite@demo.behira.invalid"),
  ]);

  const { data: anomaly, error: anomalyError } = await fm
    .from("anomalies")
    .select("reference")
    .is("closed_at", null)
    .limit(1)
    .single();
  if (anomalyError || !anomaly) throw anomalyError ?? new Error("No open local dossier is visible to Facility Manager.");

  const belowKey = crypto.randomUUID();
  const { data: below, error: belowError } = await fm.rpc("submit_anomaly_cost_decision", {
    p_anomaly_reference: anomaly.reference,
    p_amount: 250000,
    p_budget_type: "opex",
    p_description: "C10 API local · décision sous délégation",
    p_idempotency_key: belowKey,
  });
  if (belowError || below?.decision_scope !== "facility_manager" || below?.approval_status !== "approved") {
    throw belowError ?? new Error("The sub-threshold Data API decision is incorrect.");
  }
  createdCostIds.push(below.cost_id);

  const { data: replay, error: replayError } = await fm.rpc("submit_anomaly_cost_decision", {
    p_anomaly_reference: anomaly.reference,
    p_amount: 250000,
    p_budget_type: "opex",
    p_description: "C10 API local · décision sous délégation",
    p_idempotency_key: belowKey,
  });
  if (replayError || replay?.cost_id !== below.cost_id || replay?.replayed !== true) {
    throw replayError ?? new Error("The submission replay is not idempotent through the Data API.");
  }

  const atThresholdKey = crypto.randomUUID();
  const { data: atThreshold, error: atThresholdError } = await fm.rpc("submit_anomaly_cost_decision", {
    p_anomaly_reference: anomaly.reference,
    p_amount: 400000,
    p_budget_type: "capex",
    p_description: "C10 API local · arbitrage Administration",
    p_idempotency_key: atThresholdKey,
  });
  if (atThresholdError || atThreshold?.decision_scope !== "administration" || atThreshold?.approval_status !== "pending") {
    throw atThresholdError ?? new Error("The at-threshold Data API decision is incorrect.");
  }
  createdCostIds.push(atThreshold.cost_id);

  const { error: forbiddenError } = await agent.rpc("submit_anomaly_cost_decision", {
    p_anomaly_reference: anomaly.reference,
    p_amount: 100000,
    p_budget_type: "opex",
    p_description: "C10 API local · tentative agent",
    p_idempotency_key: crypto.randomUUID(),
  });
  if (!forbiddenError) throw new Error("A field agent unexpectedly submitted a financial decision.");

  const reviewKey = crypto.randomUUID();
  const { data: reviewed, error: reviewError } = await administration.rpc("review_anomaly_cost_decision", {
    p_cost_reference: atThreshold.cost_reference,
    p_decision: "approved",
    p_comment: "C10 API local · continuité de service validée",
    p_idempotency_key: reviewKey,
  });
  if (reviewError || reviewed?.approval_status !== "approved") {
    throw reviewError ?? new Error("The Administration review failed through the Data API.");
  }

  const [{ data: costs, error: costsError }, { data: parameter, error: parameterError }, { data: history, error: historyError }] = await Promise.all([
    fm.from("costs").select("id, approval_status, decision_scope, threshold_amount_snapshot").in("id", createdCostIds),
    fm.from("business_parameters").select("numeric_value, unit").eq("code", "financial_decision_threshold").is("effective_to", null).single(),
    fm.from("anomaly_history").select("event_type, source_record_id").in("source_record_id", createdCostIds),
  ]);
  if (costsError || parameterError || historyError) throw costsError ?? parameterError ?? historyError;
  if (costs?.length !== 2 || Number(parameter?.numeric_value) !== 400000 || parameter?.unit !== "FCFA") {
    throw new Error("The canonical cost or threshold projection is incomplete through RLS.");
  }
  if ((history ?? []).filter((item) => ["cost_submitted", "cost_approved"].includes(item.event_type)).length !== 4) {
    throw new Error("The cost decision history is incomplete through RLS.");
  }

  console.log("✓ Facility Manager decision below 400000 FCFA is approved and replay-safe");
  console.log("✓ Decision at 400000 FCFA is routed to Administration and reviewed with a motive");
  console.log("✓ Field agent submission is rejected by role checks");
  console.log("✓ Canonical threshold, RLS-visible costs and four history events are available through the Data API");
  console.log("C10 local Data API verification passed.");
} finally {
  if (createdCostIds.length) {
    await service.from("anomaly_history").delete().in("source_record_id", createdCostIds);
    await service.from("costs").delete().in("id", createdCostIds);
  }
  await Promise.all([fm.auth.signOut(), administration.auth.signOut(), agent.auth.signOut()]);
}
