import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { requireSupabasePublicConfig } from "./config";

let browserClient: SupabaseClient<Database> | undefined;
let recetteClient: SupabaseClient<Database> | undefined;
const rememberPreferenceKey = "behira_supabase_remember";

export function setSupabaseRememberPreference(remember: boolean) {
  window.localStorage.setItem(rememberPreferenceKey, remember ? "true" : "false");
}

function createSessionStorageAdapter() {
  return {
    getItem(key: string) {
      return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
    },
    setItem(key: string, value: string) {
      const remember = window.localStorage.getItem(rememberPreferenceKey) !== "false";
      const target = remember ? window.localStorage : window.sessionStorage;
      const alternate = remember ? window.sessionStorage : window.localStorage;
      alternate.removeItem(key);
      target.setItem(key, value);
    },
    removeItem(key: string) {
      window.localStorage.removeItem(key);
      window.sessionStorage.removeItem(key);
    },
  };
}

export function getBrowserSupabaseClient(isTest = false): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("Le client distant ne peut être créé que côté navigateur.");
  }

  if (!browserClient) {
    const { url, publishableKey } = requireSupabasePublicConfig();
    browserClient = createClient<Database>(url, publishableKey, {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        persistSession: true,
        storage: createSessionStorageAdapter(),
      },
    });
  }

  if (!isTest) return browserClient;
  if (!recetteClient) {
    const { url, publishableKey } = requireSupabasePublicConfig();
    const sessionClient = browserClient;
    const scoped = createClient<Database>(url, publishableKey, {
      global: { headers: { "x-behira-data-mode": "recette" } },
      // Reuse the existing session and its refresh lifecycle; no second login/store.
      accessToken: async () => (await sessionClient.auth.getSession()).data.session?.access_token ?? null,
    });
    recetteClient = new Proxy(scoped, {
      get(target, property, receiver) {
        if (property === "auth") return sessionClient.auth;
        const value = Reflect.get(target, property, receiver);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  return recetteClient;
}
