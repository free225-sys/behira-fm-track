export type SupabasePublicConfig = {
  url: string;
  publishableKey: string;
};

type SupabaseRuntimePublicConfig = SupabasePublicConfig & {
  useSupabase: boolean;
  allowDemoFallback: boolean;
};

declare global {
  interface Window {
    __BEHIRA_PUBLIC_CONFIG__?: SupabaseRuntimePublicConfig;
  }
}

function readRuntimePublicConfig(): SupabaseRuntimePublicConfig {
  if (typeof window !== "undefined" && window.__BEHIRA_PUBLIC_CONFIG__) {
    return window.__BEHIRA_PUBLIC_CONFIG__;
  }

  return {
    useSupabase: process.env.NEXT_PUBLIC_USE_SUPABASE === "true",
    allowDemoFallback:
      process.env.NEXT_PUBLIC_ALLOW_DEMO_FALLBACK !== "false",
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "",
    publishableKey:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "",
  };
}

const runtimePublicConfig = readRuntimePublicConfig();

export const isSupabaseIntegrationEnabled =
  runtimePublicConfig.useSupabase;

export const isSupabaseDemoFallbackEnabled =
  runtimePublicConfig.allowDemoFallback;

function readPublicConfig() {
  return {
    url: runtimePublicConfig.url,
    publishableKey: runtimePublicConfig.publishableKey,
  };
}

export function getSupabaseEnvironmentLabel() {
  const { url } = readPublicConfig();
  if (!url) return "Service métier non configuré";

  try {
    const hostname = new URL(url).hostname;
    return hostname === "127.0.0.1" || hostname === "localhost"
      ? "Environnement local"
      : "Préproduction sécurisée";
  } catch {
    return "Service métier non configuré";
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
      "Le service métier est désactivé. Le prototype utilise encore ses données de démonstration.",
    );
  }

  if (!url || !publishableKey) {
    throw new Error(
      "Configuration du service métier incomplète : URL et clé publique attendues.",
    );
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    throw new Error("Configuration du service métier invalide : URL incorrecte.");
  }

  const isLocal = ["127.0.0.1", "localhost"].includes(parsedUrl.hostname);
  if (!isLocal && parsedUrl.protocol !== "https:") {
    throw new Error("La connexion distante doit utiliser HTTPS.");
  }

  return { url, publishableKey };
}
