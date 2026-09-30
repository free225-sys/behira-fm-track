import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const environment = Object.fromEntries(
  readFileSync(new URL("../.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line && !line.startsWith("#"))
    .map((line) => {
      const separator = line.indexOf("=");
      return [line.slice(0, separator), line.slice(separator + 1)];
    }),
);

const url = environment.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = environment.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (environment.NEXT_PUBLIC_USE_SUPABASE !== "true" || !url || !publishableKey) {
  throw new Error("La connexion frontend à fm_track n’est pas configurée.");
}
if (!url.startsWith("https://") || !url.endsWith(".supabase.co")) {
  throw new Error("Ce contrôle doit cibler le projet Supabase distant en HTTPS.");
}

const health = await fetch(`${url}/auth/v1/health`, {
  headers: { apikey: publishableKey },
});
if (!health.ok) {
  throw new Error(`Supabase Auth indisponible (${health.status}).`);
}

const client = createClient(url, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const { data, error } = await client.from("equipment").select("id").limit(1);
if (!error || (data?.length ?? 0) > 0) {
  throw new Error("Le rôle anonyme ne doit pas pouvoir lire le référentiel métier.");
}

console.log("✓ fm_track joignable via HTTPS avec la clé publique.");
console.log("✓ Supabase Auth répond et les données métier restent interdites au rôle anonyme.");
