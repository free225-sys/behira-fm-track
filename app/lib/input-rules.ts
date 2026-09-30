// Règles de saisie communes (décision du porteur de projet, 30/09/2026) :
// - mesures : chiffres et un seul séparateur décimal ; entiers : chiffres seulement ;
// - textes : lettres (accents compris), chiffres, espaces et ponctuation usuelle ;
//   émojis, symboles décoratifs, caractères invisibles ou de contrôle refusés ;
// - motifs et observations : pas de texte vide, fait d'espaces ou trop court.
// La même liste de caractères est appliquée côté serveur par public.is_clean_text().

/** Ponctuation et signes techniques autorisés en plus des lettres, chiffres et espaces. */
export const ALLOWED_PUNCTUATION = `.,;:!?'’‘"“”«»()[]-–—/\\%°+=@&#_*€$<>≤≥±×·…`;

const escaped = ALLOWED_PUNCTUATION.replace(/[\\\]\-\[^]/g, (c) => `\\${c}`);
// \p{L} lettres, \p{M} accents combinés, \p{Nd} chiffres ; espaces usuels dont insécables français.
const ALLOWED_CHAR = new RegExp(`[\\p{L}\\p{M}\\p{Nd} \\t\\n\\r\\u00A0\\u202F${escaped}]`, 'u');
const FORBIDDEN_CHAR = new RegExp(`[^\\p{L}\\p{M}\\p{Nd} \\t\\n\\r\\u00A0\\u202F${escaped}]`, 'u');
const FORBIDDEN_CHARS = new RegExp(FORBIDDEN_CHAR.source, 'gu');

export const TEXT_REJECTED_MESSAGE = 'Caractère non autorisé : les émojis et les symboles décoratifs ne sont pas acceptés.';
export const NUMBER_REJECTED_MESSAGE = 'Saisissez uniquement des chiffres (et une virgule pour les décimales).';
export const INTEGER_REJECTED_MESSAGE = 'Saisissez uniquement des chiffres.';

/** Un sélecteur de variation d'émoji (U+FE0E/FE0F) est une « marque » Unicode : on le refuse aussi. */
const VARIATION_SELECTOR = /[\uFE00-\uFE0F]/u;
const VARIATION_SELECTORS = /[\uFE00-\uFE0F]/gu;

export function isAllowedChar(char: string): boolean {
  return ALLOWED_CHAR.test(char) && !VARIATION_SELECTOR.test(char);
}

/** Vrai si le texte ne contient que des caractères autorisés (texte vide accepté). */
export function isCleanText(text: string | null | undefined): boolean {
  if (!text) return true;
  return !FORBIDDEN_CHAR.test(text) && !VARIATION_SELECTOR.test(text);
}

/** Retire les caractères interdits (utilisé pour un collage mixte : le texte utile est conservé). */
export function cleanText(text: string): string {
  return text.replace(FORBIDDEN_CHARS, '').replace(VARIATION_SELECTORS, '');
}

/** Mesure décimale : chiffres, une seule virgule ou un seul point. `null` si la saisie doit être refusée. */
export function sanitizeDecimal(next: string): string | null {
  return /^\d*(?:[.,]\d*)?$/.test(next) ? next : null;
}

/** Nombre entier : chiffres seulement. */
export function sanitizeInteger(next: string): string | null {
  return /^\d*$/.test(next) ? next : null;
}

/** Longueur utile : lettres et chiffres seulement (les espaces et la ponctuation ne comptent pas). */
export function usefulLength(text: string | null | undefined): number {
  return (text ?? '').replace(/[^\p{L}\p{Nd}]/gu, '').length;
}

export const MIN_REASON_LENGTH = 5;

/** Problème d'un motif ou d'une observation obligatoire, ou `null` s'il est recevable. */
export function reasonProblem(text: string | null | undefined, label = 'Motif', min = MIN_REASON_LENGTH): string | null {
  const value = (text ?? '').trim();
  if (!value) return `${label} : à renseigner.`;
  if (!isCleanText(value)) return `${label} : ${TEXT_REJECTED_MESSAGE.charAt(0).toLowerCase()}${TEXT_REJECTED_MESSAGE.slice(1)}`;
  if (usefulLength(value) < min) return `${label} : ${min} lettres ou chiffres minimum.`;
  return null;
}

/** Motif obligatoire d'un contrôle « non vérifié » : message d'erreur, ou `null` s'il est recevable. */
export function reasonError(text: string | null | undefined, label: string, emptyMessage = `${label} : renseignez le contrôle ou le motif de non-vérification.`): string | null {
  if (!(text ?? '').trim()) return emptyMessage;
  return reasonProblem(text, `${label} — motif`);
}
