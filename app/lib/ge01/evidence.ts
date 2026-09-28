export type Ge01EvidencePurpose = 'mc4' | 'engine_counter' | 'defect';
export type Ge01Evidence = { id: string; purpose: Ge01EvidencePurpose; file: File };
export const GE01_EVIDENCE_LIMIT = 10 * 1024 * 1024;
export const GE01_EVIDENCE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const GE01_EVIDENCE_LABELS: Record<Ge01EvidencePurpose, string> = {
  mc4: 'Contrôleur MC4', engine_counter: 'Compteur moteur', defect: 'Défaut ou alarme',
};
export function validateGe01Evidence(items: Ge01Evidence[]) {
  if (items.length > 6) throw new Error('Six photos maximum par rapport.');
  if (new Set(items.map(item => item.id)).size !== items.length) throw new Error('Identifiant de photo dupliqué.');
  for (const item of items) {
    if (!/^[0-9a-f-]{36}$/i.test(item.id) || !Object.hasOwn(GE01_EVIDENCE_LABELS, item.purpose)) throw new Error('Photo non reconnue.');
    if (!GE01_EVIDENCE_TYPES.includes(item.file.type) || item.file.size <= 0 || item.file.size > GE01_EVIDENCE_LIMIT) {
      throw new Error('Photo non acceptée : JPG, PNG ou WebP, de 1 octet à 10 Mo.');
    }
  }
}
export async function ge01EvidenceManifest(items: Ge01Evidence[]) {
  validateGe01Evidence(items);
  return Promise.all(items.map(async item => ({
    id: item.id, purpose: item.purpose, mimeType: item.file.type, size: item.file.size,
    sha256: Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', await item.file.arrayBuffer())))
      .map(byte => byte.toString(16).padStart(2, '0')).join(''),
  })));
}
