export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

export const isSupabaseIntegrationEnabled =
  process.env.NEXT_PUBLIC_USE_SUPABASE === "true";

export const isSupabaseDemoFallbackEnabled =
  process.env.NEXT_PUBLIC_ALLOW_DEMO_FALLBACK !== "false";

function readPublicConfig() {
  return {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  };
}

export function getSupabaseEnvironmentLabel() {
  const { url } = readPublicConfig();
  if (!url) return "Supabase non configuré";

  try {
    const hostname = new URL(url).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost"
      ? "Supabase local"
      : "Instance distante";
  } catch {
    return "Supabase non configuré";
  }
}

export function getSupabaseIntegrationState() {
  const { url, publishableKey } = readPublicConfig();
  return {
    enabled: isSupabaseIntegrationEnabled,
    configured: Boolean(url && publishableKey),
    demoFallback: isSupabaseDemoFallbackEnabled,
    environmentLabel: getSupabaseEnvironmentLabel(),
  } as const;
}

export function requireSupabasePublicConfig(): SupabasePublicConfig {
  const { url, publishableKey } = readPublicConfig();

  if (!isSupabaseIntegrationEnabled) {
    throw new Error(
      "Supabase est désactivé. Le prototype utilise encore ses données de démonstration.",
    );
  }

  if (!url || !publishableKey) {
    throw new Error(
      "Configuration Supabase incomplète : URL et clé publique attendues.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Configuration Supabase invalide : URL incorrecte.");
  }

  const isLocal = ["127.0.0.1", "localhost"].includes(parsedUrl.hostname);
  if (!isLocal && parsedUrl.protocol !== "https:") {
    throw new Error("La connexion Supabase distante doit utiliser HTTPS.");
  }

  return { url, publishableKey };
}
