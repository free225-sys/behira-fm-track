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
const password = "Behira-Demo-2026!";

if (!url || !publishableKey || environment.NEXT_PUBLIC_USE_SUPABASE !== "true") {
  throw new Error("The local Supabase frontend environment is not enabled.");
}

const accounts = [
  ["direction@demo.behira.invalid", "DIR-FRED", 5, 8],
  ["facility.manager@demo.behira.invalid", "FAU-FM", 5, 8],
  ["electricite@demo.behira.invalid", "EVAR-ELEC", 1, 2],
  ["eau.incendie@demo.behira.invalid", "SYL-PLB", 1, 3],
  ["rondes@demo.behira.invalid", "LET-RND", 1, 1],
];

for (const [email, employeeCode, expectedVisibleProfiles, expectedVisibleAnomalies] of accounts) {
  const client = createClient(url, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: signIn, error: signInError } = await client.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError || !signIn.user) throw signInError ?? new Error(`No user for ${email}`);

  const { data: ownProfile, error: ownProfileError } = await client
    .from("profiles")
    .select("employee_code")
    .eq("auth_user_id", signIn.user.id)
    .single();
  if (ownProfileError || ownProfile?.employee_code !== employeeCode) {
    throw ownProfileError ?? new Error(`Unexpected profile for ${email}`);
  }

  const { count, error: countError } = await client
    .from("profiles")
    .select("id", { count: "exact", head: true });
  if (countError || count !== expectedVisibleProfiles) {
    throw countError ?? new Error(`Unexpected RLS profile count for ${email}: ${count}`);
  }

  const { count: anomalyCount, error: anomalyCountError } = await client
    .from("anomalies")
    .select("id", { count: "exact", head: true });
  if (anomalyCountError || anomalyCount !== expectedVisibleAnomalies) {
    throw anomalyCountError ?? new Error(`Unexpected RLS anomaly count for ${email}: ${anomalyCount}`);
  }

  const { count: equipmentCount, error: equipmentCountError } = await client
    .from("equipment")
    .select("id", { count: "exact", head: true })
    .eq("lifecycle_scope", "mvp");
  if (equipmentCountError || equipmentCount !== 7) {
    throw equipmentCountError ?? new Error(`Unexpected MVP equipment count for ${email}: ${equipmentCount}`);
  }

  const { error: signOutError } = await client.auth.signOut();
  if (signOutError) throw signOutError;
  console.log(`✓ ${employeeCode}: login, profile mapping and RLS data perimeter`);
}

const rejectionClient = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { error: rejectionError } = await rejectionClient.auth.signInWithPassword({
  email: accounts[0][0],
  password: "incorrect-password",
});
if (!rejectionError) throw new Error("Invalid credentials were unexpectedly accepted.");
console.log("✓ Invalid credentials rejected");

console.log("Local Auth verification passed for the five confirmed internal users.");
