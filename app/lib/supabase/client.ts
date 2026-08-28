import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "./database.types";
import { requireSupabasePublicConfig } from "./config";

let browserClient: SupabaseClient<Database> | undefined;
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

export function getBrowserSupabaseClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("Le client Supabase navigateur ne peut être créé que côté client.");
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

  return browserClient;
}
