// DEC-000: real backend cannot be enabled by environment or runtime injection.
export type SupabasePublicConfig = { url: string; publishableKey: string };
export const isSupabaseIntegrationEnabled = false;
export const isSupabaseDemoFallbackEnabled = true;
export function getSupabaseEnvironmentLabel() { return 'Démonstration locale'; }
export function getSupabaseIntegrationState() { return { enabled:false, configured:false, demoFallback:true, environmentLabel:getSupabaseEnvironmentLabel() } as const; }
export function requireSupabasePublicConfig(): SupabasePublicConfig { throw new Error('DEC-000 : aucun accès distant depuis le miroir public.'); }
