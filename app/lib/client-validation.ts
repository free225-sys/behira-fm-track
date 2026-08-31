export type FieldErrors<K extends string> = Partial<Record<K, string>>;

export const VENDOR_REPORT_MAX_FILE = 10 * 1024 * 1024;
const VENDOR_REPORT_MIME = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
const VENDOR_REPORT_EXT = /\.(pdf|jpe?g|png|webp)$/i;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type VendorReportField = 'anomalyReference' | 'vendorCode' | 'reportDate' | 'summary' | 'reserveNotes' | 'cost' | 'file';

export function hasFieldErrors(errors: object) {
  return Object.values(errors).some(Boolean);
}

export function isEmail(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function passwordRules(password: string, minLength: number) {
  return {
    length: password.length >= minLength,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    symbol: /[^A-Za-z0-9]/.test(password),
  };
}

export function validateLogin(input: { email: string; password: string }): FieldErrors<'email' | 'password'> {
  const errors: FieldErrors<'email' | 'password'> = {};
  if (!input.email.trim()) errors.email = 'Saisissez votre email professionnel.';
  else if (!isEmail(input.email)) errors.email = 'Adresse email invalide.';
  if (!input.password) errors.password = 'Saisissez votre mot de passe.';
  return errors;
}

export function validateEmailOnly(email: string): FieldErrors<'email'> {
  if (!email.trim()) return { email: 'Saisissez votre email professionnel.' };
  if (!isEmail(email)) return { email: 'Adresse email invalide.' };
  return {};
}

export function validateInvite(input: { password: string; confirm: string; accepted: boolean }): FieldErrors<'password' | 'confirm' | 'accepted'> {
  const errors: FieldErrors<'password' | 'confirm' | 'accepted'> = {};
  const rules = passwordRules(input.password, 12);
  if (!input.password) errors.password = 'Créez un mot de passe.';
  else if (!Object.values(rules).every(Boolean)) errors.password = 'Le mot de passe doit respecter toutes les règles.';
  if (!input.confirm) errors.confirm = 'Confirmez le mot de passe.';
  else if (input.confirm !== input.password) errors.confirm = 'La confirmation ne correspond pas.';
  if (!input.accepted) errors.accepted = 'Acceptez l’activation simulée pour continuer.';
  return errors;
}

export function validatePasswordChange(input: { current: string; next: string; confirm: string }): FieldErrors<'current' | 'next' | 'confirm'> {
  const errors: FieldErrors<'current' | 'next' | 'confirm'> = {};
  const rules = passwordRules(input.next, 16);
  if (!input.current) errors.current = 'Saisissez le mot de passe temporaire reçu.';
  if (!input.next) errors.next = 'Saisissez le nouveau mot de passe.';
  else if (!Object.values(rules).every(Boolean)) errors.next = 'Le nouveau mot de passe doit respecter toutes les règles.';
  else if (input.next === input.current) errors.next = 'Le nouveau mot de passe doit être différent du temporaire.';
  if (!input.confirm) errors.confirm = 'Confirmez le nouveau mot de passe.';
  else if (input.confirm !== input.next) errors.confirm = 'La confirmation ne correspond pas.';
  return errors;
}

export function validateAccessCreate(input: { name: string; email: string; reason: string }): FieldErrors<'name' | 'email' | 'reason'> {
  const errors: FieldErrors<'name' | 'email' | 'reason'> = {};
  if (!input.name.trim()) errors.name = 'Indiquez le nom complet.';
  else if (input.name.trim().length < 3) errors.name = 'Le nom doit contenir au moins 3 caractères.';
  if (!input.email.trim()) errors.email = 'Indiquez l’email professionnel.';
  else if (!isEmail(input.email)) errors.email = 'Adresse email invalide.';
  if (!input.reason.trim()) errors.reason = 'Justifiez cette création.';
  else if (input.reason.trim().length < 20) errors.reason = 'La justification doit contenir au moins 20 caractères.';
  return errors;
}

export function validateAccessAction(input: { selectedUserId: string; reason: string }): FieldErrors<'selectedUserId' | 'reason'> {
  const errors: FieldErrors<'selectedUserId' | 'reason'> = {};
  if (!input.selectedUserId) errors.selectedUserId = 'Choisissez le profil concerné.';
  if (!input.reason.trim()) errors.reason = 'Justifiez cette demande.';
  else if (input.reason.trim().length < 20) errors.reason = 'La justification doit contenir au moins 20 caractères.';
  return errors;
}

export function validateZoneName(name: string): FieldErrors<'name'> {
  if (!name.trim()) return { name: 'Indiquez le nom de la zone.' };
  if (name.trim().length < 3) return { name: 'Le nom doit contenir au moins 3 caractères.' };
  return {};
}

export function validateVendorReportFields(input: {
  anomalyIds: string[];
  vendorCodes: string[];
  anomalyReference: string;
  vendorCode: string;
  reportDate: string;
  summary: string;
  reserveNotes: string;
  cost: string;
  file: File | null;
}): FieldErrors<VendorReportField> {
  const errors: FieldErrors<VendorReportField> = {};
  if (!input.anomalyIds.length) errors.anomalyReference = 'Aucune anomalie ouverte dans votre périmètre.';
  else if (!input.anomalyReference || !input.anomalyIds.includes(input.anomalyReference)) errors.anomalyReference = 'Choisissez une anomalie du périmètre.';
  if (!input.vendorCodes.length) errors.vendorCode = 'Aucun prestataire référencé.';
  else if (!input.vendorCode || !input.vendorCodes.includes(input.vendorCode)) errors.vendorCode = 'Choisissez l’entreprise concernée.';
  if (!input.reportDate) errors.reportDate = 'Indiquez la date du rapport.';
  else {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(input.reportDate);
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const oldest = new Date();
    oldest.setFullYear(oldest.getFullYear() - 2);
    if (!date || Number.isNaN(date.getTime())) errors.reportDate = 'Date invalide.';
    else if (date > today) errors.reportDate = 'La date ne peut pas être dans le futur.';
    else if (date < oldest) errors.reportDate = 'La date ne peut pas dépasser deux ans.';
  }
  const summary = input.summary.trim();
  if (!summary) errors.summary = 'Décrivez l’intervention réalisée.';
  else if (summary.length < 20) errors.summary = 'Le résumé doit contenir au moins 20 caractères.';
  else if (summary.length > 2000) errors.summary = 'Le résumé dépasse 2 000 caractères.';
  if (input.reserveNotes.trim().length > 500) errors.reserveNotes = 'Les réserves dépassent 500 caractères.';
  if (input.cost.trim()) {
    if (!/^\d+$/.test(input.cost.trim())) errors.cost = 'Le coût doit être un nombre entier positif.';
    else if (Number(input.cost) > 1_000_000_000) errors.cost = 'Montant trop élevé pour ce dépôt.';
  }
  if (!input.file) errors.file = 'Joignez le rapport, le PV ou une photo.';
  else {
    const typed = Boolean(input.file.type) && VENDOR_REPORT_MIME.has(input.file.type);
    if (!typed && !VENDOR_REPORT_EXT.test(input.file.name)) errors.file = 'Format accepté : PDF, JPG, PNG ou WebP.';
    else if (input.file.size === 0) errors.file = 'Le fichier est vide.';
    else if (input.file.size > VENDOR_REPORT_MAX_FILE) errors.file = 'Le fichier dépasse 10 Mo.';
  }
  return errors;
}
