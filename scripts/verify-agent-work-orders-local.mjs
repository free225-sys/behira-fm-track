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

const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const reference = `OT-C9-${crypto.randomUUID()}`;
let workOrderId;

try {
  const [{ data: sylvain, error: sylvainError }, { data: faustin, error: faustinError }] = await Promise.all([
    service.from("profiles").select("id").eq("employee_code", "SYL-PLB").single(),
    service.from("profiles").select("id").eq("employee_code", "FAU-FM").single(),
  ]);
  if (sylvainError || faustinError) throw sylvainError ?? faustinError;

  const { data: anomaly, error: anomalyError } = await service
    .from("anomalies")
    .select("id")
    .eq("assigned_profile_id", sylvain.id)
    .limit(1)
    .single();
  if (anomalyError) throw anomalyError;

  const { data: workOrder, error: insertError } = await service
    .from("work_orders")
    .insert({
      reference,
      anomaly_id: anomaly.id,
      work_order_type: "internal",
      assigned_profile_id: sylvain.id,
      status: "in_progress",
      instructions: "Fixture C9-FIX-02 supprimée après vérification.",
      due_at: new Date(Date.now() + 3_600_000).toISOString(),
      created_by_profile_id: faustin.id,
    })
    .select("id")
    .single();
  if (insertError) throw insertError;
  workOrderId = workOrder.id;

  const sylvainClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: sylvainLoginError } = await sylvainClient.auth.signInWithPassword({ email: "eau.incendie@demo.behira.invalid", password });
  if (sylvainLoginError) throw sylvainLoginError;
  const { data: sylvainProfileId, error: sylvainProfileError } = await sylvainClient.rpc("current_profile_id");
  if (sylvainProfileError || sylvainProfileId !== sylvain.id) throw sylvainProfileError ?? new Error("Sylvain profile resolution failed.");
  const { data: ownOrders, error: ownOrdersError } = await sylvainClient
    .from("work_orders")
    .select("reference, assigned_profile_id")
    .eq("assigned_profile_id", sylvainProfileId)
    .eq("reference", reference);
  if (ownOrdersError || ownOrders?.length !== 1) throw ownOrdersError ?? new Error("Sylvain cannot read his assigned work order.");

  const evaristeClient = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: evaristeLoginError } = await evaristeClient.auth.signInWithPassword({ email: "electricite@demo.behira.invalid", password });
  if (evaristeLoginError) throw evaristeLoginError;
  const { data: foreignOrders, error: foreignOrdersError } = await evaristeClient
    .from("work_orders")
    .select("reference")
    .eq("reference", reference);
  if (foreignOrdersError || foreignOrders?.length !== 0) throw foreignOrdersError ?? new Error("Another field agent can read Sylvain's work order.");

  console.log("✓ Sylvain reads the work order assigned to his canonical profile");
  console.log("✓ Another field agent cannot read Sylvain's work order through RLS");
} finally {
  if (workOrderId) {
    const { error } = await service.from("work_orders").delete().eq("id", workOrderId);
    if (error) throw error;
  }
}

console.log("C9-FIX-02 local RLS verification passed and its fixture was removed.");
