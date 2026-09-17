import type { FieldCheckInput, FieldRoundPayload } from "../offline/types";

export const GE01_EQUIPMENT_CODE = "GE-01";
export const GE01_REPORT_TYPE = "technical_round" as const;

export const GE01_FIELD_DEFINITIONS = [
  { code: "date", label: "Date du contrôle", step: 0 },
  { code: "heure", label: "Heure du contrôle", step: 0 },
  { code: "intervenant", label: "Technicien / intervenant", step: 0 },
  { code: "heures_moteur", label: "Heures compteur moteur", step: 0, unit: "h" },
  { code: "demarrages_24h", label: "Démarrages dernières 24 h", step: 0 },
  { code: "duree_essai", label: "Durée réelle de l’essai", step: 2, unit: "min" },
  { code: "demarrage_reussi", label: "Démarrage réussi", step: 2 },
  { code: "fonctionnement_correct", label: "Fonctionnement correct", step: 2 },
  { code: "retour_auto", label: "Retour en mode AUTO après essai", step: 2 },
  { code: "temperature_local", label: "État thermique du local", step: 1 },
  { code: "proprete_local", label: "Propreté et absence d’eau", step: 1 },
  { code: "niveau_carburant", label: "Niveau carburant", step: 1, unit: "%" },
  { code: "niveau_huile", label: "Niveau huile moteur", step: 1, unit: "%" },
  { code: "temperature_eau", label: "Température eau", step: 1, unit: "°C" },
  { code: "tension_batterie", label: "Tension batterie", step: 1, unit: "V" },
  { code: "bruit_vibration", label: "Bruit ou vibrations anormales", step: 1 },
  { code: "fumee", label: "Couleur de fumée", step: 1 },
  { code: "mode_ge", label: "Groupe actuellement en AUTO", step: 2 },
  { code: "ats_auto", label: "ATS actuellement en AUTO", step: 2 },
  { code: "alarme_mc4", label: "Alarme contrôleur MC4", step: 2 },
  { code: "maintenance_dmc", label: "Entretien mensuel DMC réalisé", step: 2 },
  { code: "statut_global", label: "État final déclaré par l’agent", step: 3 },
] as const;

export type Ge01FieldCode = (typeof GE01_FIELD_DEFINITIONS)[number]["code"];
export type Ge01BooleanObservation = "" | "yes" | "no" | "not_observed";
export type Ge01StartOutcome = "" | "success" | "failed" | "not_performed";
export type Ge01Measure = { value: string; unavailable: boolean; reason: string };

export type Ge01Draft = {
  submissionId: string;
  date: string;
  time: string;
  engineHours: string;
  starts24h: string;
  engineHoursDeltaKind: '' | 'ok' | 'below' | 'unusual';
  engineHoursDeltaNote: string;
  testDuration: string;
  testStartTime: string;
  startAttempts: string;
  startSymptom: string;
  startOutcome: Ge01StartOutcome;
  testExceptionReason: string;
  functioningCorrect: Ge01BooleanObservation;
  returnAuto: Ge01BooleanObservation;
  temperatureLocal: "" | "Normal" | "Chaud" | "Très chaud" | "Non observé";
  cleanliness: "" | "Conforme" | "Écart constaté" | "Non observé";
  fuelLevel: Ge01Measure;
  oilLevel: Ge01Measure;
  waterTemperature: Ge01Measure;
  batteryVoltage: Ge01Measure;
  abnormalNoise: "" | "yes" | "no" | "not_observed";
  smoke: "" | "Aucune" | "Blanche" | "Bleue" | "Noire" | "Non observée";
  geAuto: Ge01BooleanObservation;
  atsAuto: Ge01BooleanObservation;
  alarmMc4: "" | "Aucune alarme" | "Alarme affichée" | "Non observée";
  alarmDetails: string;
  finalStatus: "" | "Opérationnel" | "Surveillance" | "Intervention" | "Critique";
  comment: string;
  photos: string[];
  confirmed: boolean;
  step: number;
};

export function ge01NowStamp(now = new Date()) {
  return localDateParts(now);
}

function localDateParts(now: Date) {
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Abidjan',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return { date: `${pick('year')}-${pick('month')}-${pick('day')}`, time: `${pick('hour')}:${pick('minute')}` };
}

export function createEmptyGe01Draft(now = new Date(), submissionId = "") : Ge01Draft {
  const { date, time } = localDateParts(now);
  const emptyMeasure = (): Ge01Measure => ({ value: "", unavailable: false, reason: "" });
  return {
    submissionId,
    date,
    time,
    engineHours: "",
    starts24h: "",
    engineHoursDeltaKind: "",
    engineHoursDeltaNote: "",
    testDuration: "",
    testStartTime: "",
    startAttempts: "",
    startSymptom: "",
    startOutcome: "",
    testExceptionReason: "",
    functioningCorrect: "",
    returnAuto: "",
    temperatureLocal: "",
    cleanliness: "",
    fuelLevel: emptyMeasure(),
    oilLevel: emptyMeasure(),
    waterTemperature: emptyMeasure(),
    batteryVoltage: emptyMeasure(),
    abnormalNoise: "",
    smoke: "",
    geAuto: "",
    atsAuto: "",
    alarmMc4: "",
    alarmDetails: "",
    finalStatus: "",
    comment: "",
    photos: [],
    confirmed: false,
    step: 0,
  };
}

function finiteNumber(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

function validateMeasure(
  errors: Record<string, string>,
  key: string,
  measure: Ge01Measure,
  options: { min?: number; max?: number } = {},
) {
  if (measure.unavailable) {
    if (!measure.reason.trim()) errors[`${key}Reason`] = "Indiquez pourquoi la mesure est impossible.";
    return;
  }
  const value = finiteNumber(measure.value);
  if (value === null) {
    errors[key] = "Saisissez une valeur ou indiquez que la mesure est impossible.";
    return;
  }
  if (options.min !== undefined && value < options.min) errors[key] = `La valeur doit être supérieure ou égale à ${options.min}.`;
  if (options.max !== undefined && value > options.max) errors[key] = `La valeur doit être inférieure ou égale à ${options.max}.`;
}

export function validateGe01Step(draft: Ge01Draft, step: number) {
  const errors: Record<string, string> = {};
  if (step === 0) {
    if (!draft.date) errors.date = "La date du contrôle est requise.";
    if (!draft.time) errors.time = "L’heure du contrôle est requise.";
    const engineHours = finiteNumber(draft.engineHours);
    if (engineHours === null || engineHours < 0) errors.engineHours = "Saisissez un compteur moteur positif ou nul.";
    const starts = finiteNumber(draft.starts24h);
    if (starts === null || starts < 0 || !Number.isInteger(starts)) errors.starts24h = "Saisissez un nombre entier positif ou nul.";
  }
  if (step === 1) {
    if (!draft.temperatureLocal) errors.temperatureLocal = "Sélectionnez l’état observé.";
    if (!draft.cleanliness) errors.cleanliness = "Sélectionnez l’état observé.";
    validateMeasure(errors, "fuelLevel", draft.fuelLevel, { min: 0, max: 100 });
    validateMeasure(errors, "oilLevel", draft.oilLevel, { min: 0, max: 100 });
    validateMeasure(errors, "waterTemperature", draft.waterTemperature);
    validateMeasure(errors, "batteryVoltage", draft.batteryVoltage, { min: 0 });
    if (!draft.abnormalNoise) errors.abnormalNoise = "Indiquez ce qui a été observé.";
    if (!draft.smoke) errors.smoke = "Sélectionnez la fumée observée.";
  }
  if (step === 2) {
    if (!draft.startOutcome) errors.startOutcome = "Indiquez si l’essai a été réalisé, a échoué ou était impossible.";
    if (draft.startOutcome === "success") {
      if (!draft.testStartTime) errors.testStartTime = "Indiquez l’heure de l’essai.";
      if (!draft.returnAuto) errors.returnAuto = "Indiquez si le retour AUTO a pu être contrôlé.";
    }
    if (draft.startOutcome === "failed") {
      const attempts = finiteNumber(draft.startAttempts);
      if (attempts === null || attempts < 1 || !Number.isInteger(attempts)) errors.startAttempts = "Indiquez le nombre de tentatives, au moins 1.";
      if (!draft.startSymptom.trim()) errors.startSymptom = "Décrivez le symptôme constaté.";
    }
    if (draft.startOutcome === "not_performed" && !draft.testExceptionReason.trim()) {
      errors.testExceptionReason = "Décrivez pourquoi l’essai prévu n’a pas pu être réalisé.";
    }
    if (!draft.geAuto) errors.geAuto = "Contrôlez séparément le mode actuel du groupe.";
    if (!draft.atsAuto) errors.atsAuto = "Contrôlez séparément le mode actuel de l’ATS.";
    if (!draft.alarmMc4) errors.alarmMc4 = "Indiquez l’état du contrôleur MC4.";
    if (draft.alarmMc4 === "Alarme affichée" && !draft.alarmDetails.trim()) errors.alarmDetails = "Recopiez le code ou le texte affiché par le contrôleur.";
  }
  if (step === 3) {
    if (!draft.finalStatus) errors.finalStatus = "Choisissez l’état final que vous déclarez.";
    if (!draft.confirmed) errors.confirmed = "Confirmez l’exactitude des informations avant la transmission.";
  }
  return errors;
}

export function validateCompleteGe01Draft(draft: Ge01Draft) {
  return [0, 1, 2, 3].reduce<Record<string, string>>(
    (all, step) => ({ ...all, ...validateGe01Step(draft, step) }),
    {},
  );
}

function textCheck(code: Ge01FieldCode, value: string, status: FieldCheckInput["status"] = "ok", notes?: string): FieldCheckInput {
  const field = GE01_FIELD_DEFINITIONS.find((item) => item.code === code);
  if (!field) throw new Error(`Champ GE-01 inconnu : ${code}`);
  return { code, label: field.label, status, ...(value ? { valueText: value } : {}), ...(notes ? { notes } : {}) };
}

function numericCheck(code: Ge01FieldCode, value: string, unit: string, status: FieldCheckInput["status"] = "ok", notes?: string): FieldCheckInput {
  const field = GE01_FIELD_DEFINITIONS.find((item) => item.code === code);
  const parsed = finiteNumber(value);
  if (!field || parsed === null) throw new Error(`Valeur numérique GE-01 invalide : ${code}`);
  return { code, label: field.label, status, valueNumeric: parsed, unit, ...(notes ? { notes } : {}) };
}

function measureCheck(code: Ge01FieldCode, measure: Ge01Measure, unit: string): FieldCheckInput {
  if (measure.unavailable) return textCheck(code, "", "not_checked", measure.reason.trim());
  return numericCheck(code, measure.value, unit);
}

function booleanObservationCheck(code: Ge01FieldCode, value: Ge01BooleanObservation): FieldCheckInput {
  if (value === "not_observed" || !value) return textCheck(code, "", "not_checked", "Non observé pendant ce contrôle.");
  return {
    ...textCheck(code, "", value === "yes" ? "ok" : "alert"),
    valueBoolean: value === "yes",
  };
}

function testChecks(draft: Ge01Draft): FieldCheckInput[] {
  if (draft.startOutcome === "not_performed") {
    const notes = `Essai quotidien prévu mais non réalisé : ${draft.testExceptionReason.trim()}`;
    return [
      textCheck("duree_essai", "", "not_checked", notes),
      textCheck("demarrage_reussi", "", "not_checked", notes),
      textCheck("fonctionnement_correct", "", "not_checked", notes),
      textCheck("retour_auto", "", "not_checked", notes),
    ];
  }

  const duration = finiteNumber(draft.testDuration);
  const durationCheck = duration === null
    ? textCheck("duree_essai", "", "not_checked", "Durée non mesurée ; aucune valeur zéro n’a été substituée.")
    : numericCheck("duree_essai", draft.testDuration, "min");
  const startCheck = {
    ...textCheck("demarrage_reussi", "", draft.startOutcome === "success" ? "ok" : "alert"),
    valueBoolean: draft.startOutcome === "success",
    ...(draft.startOutcome === "failed" && (draft.startAttempts || draft.startSymptom)
      ? { notes: `Tentatives : ${draft.startAttempts || "—"}. Symptôme : ${draft.startSymptom.trim() || "—"}.` }
      : {}),
    ...(draft.startOutcome === "success" && draft.testStartTime ? { notes: `Heure de l’essai : ${draft.testStartTime}.` } : {}),
  } satisfies FieldCheckInput;
  return [
    durationCheck,
    startCheck,
    booleanObservationCheck("fonctionnement_correct", draft.functioningCorrect),
    booleanObservationCheck("retour_auto", draft.returnAuto),
  ];
}

function observationTextCheck(code: Ge01FieldCode, value: string, isAlert: boolean, unavailableLabel: string): FieldCheckInput {
  if (value === unavailableLabel) return textCheck(code, "", "not_checked", value);
  return textCheck(code, value, isAlert ? "alert" : "ok");
}

export function buildGe01Checks(draft: Ge01Draft, intervenant: string): FieldCheckInput[] {
  const performedAt = new Date(`${draft.date}T${draft.time}:00`);
  if (Number.isNaN(performedAt.getTime())) throw new Error("Date ou heure du contrôle invalide.");
  const checks: FieldCheckInput[] = [
    textCheck("date", draft.date),
    textCheck("heure", draft.time),
    textCheck("intervenant", intervenant),
    numericCheck("heures_moteur", draft.engineHours, "h", "ok", draft.engineHoursDeltaNote || undefined),
    numericCheck("demarrages_24h", draft.starts24h, "démarrage(s)"),
    ...testChecks(draft),
    observationTextCheck("temperature_local", draft.temperatureLocal, draft.temperatureLocal === "Chaud" || draft.temperatureLocal === "Très chaud", "Non observé"),
    observationTextCheck("proprete_local", draft.cleanliness, draft.cleanliness === "Écart constaté", "Non observé"),
    measureCheck("niveau_carburant", draft.fuelLevel, "%"),
    measureCheck("niveau_huile", draft.oilLevel, "%"),
    measureCheck("temperature_eau", draft.waterTemperature, "°C"),
    measureCheck("tension_batterie", draft.batteryVoltage, "V"),
    draft.abnormalNoise === "not_observed"
      ? textCheck("bruit_vibration", "", "not_checked", "Non observé pendant ce contrôle.")
      : {
        ...textCheck("bruit_vibration", "", draft.abnormalNoise === "yes" ? "alert" : "ok"),
        valueBoolean: draft.abnormalNoise === "yes",
      },
    observationTextCheck("fumee", draft.smoke, draft.smoke !== "Aucune" && draft.smoke !== "Non observée", "Non observée"),
    booleanObservationCheck("mode_ge", draft.geAuto),
    booleanObservationCheck("ats_auto", draft.atsAuto),
    draft.alarmMc4 === "Non observée"
      ? textCheck("alarme_mc4", "", "not_checked", "Contrôleur non observé pendant ce contrôle.")
      : textCheck("alarme_mc4", draft.alarmMc4 === "Alarme affichée" ? draft.alarmDetails.trim() : "Aucune alarme", draft.alarmMc4 === "Alarme affichée" ? "alert" : "ok", draft.alarmMc4 === "Alarme affichée" ? "Alarme déclarée par l’agent ; criticité à qualifier par Facility Manager." : undefined),
    textCheck("maintenance_dmc", "", "not_applicable", "Contrôle quotidien : l’entretien mensuel DMC n’est pas demandé."),
    textCheck("statut_global", draft.finalStatus, "not_checked", "Déclaration finale de l’agent — non validée par Facility Manager."),
  ];

  const ordered = new Map(checks.map((check) => [check.code, check]));
  return GE01_FIELD_DEFINITIONS.map((field) => {
    const check = ordered.get(field.code);
    if (!check) throw new Error(`Réponse GE-01 manquante : ${field.code}`);
    return check;
  });
}

export function buildGe01Payload(draft: Ge01Draft, intervenant: string): FieldRoundPayload {
  const errors = validateCompleteGe01Draft(draft);
  if (Object.keys(errors).length) throw new Error("Le rapport GE-01 contient encore des informations à compléter.");
  const performedAt = new Date(`${draft.date}T${draft.time}:00`);
  return {
    equipmentCode: GE01_EQUIPMENT_CODE,
    reportType: GE01_REPORT_TYPE,
    performedAt: performedAt.toISOString(),
    summary: draft.comment.trim() || "Contrôle quotidien GE-01 saisi dans FM Track.",
    checks: buildGe01Checks(draft, intervenant),
  };
}

export function restoreGe01Draft(
  stored: Ge01Draft | undefined,
  now = new Date(),
  createId: () => string = () => crypto.randomUUID(),
) {
  if (!stored) return createEmptyGe01Draft(now, createId());
  return {
    ...createEmptyGe01Draft(now),
    ...stored,
    photos: stored.photos ?? [],
    submissionId: stored.submissionId || createId(),
  } satisfies Ge01Draft;
}

export async function queueGe01Draft(
  draft: Ge01Draft,
  agentName: string,
  draftId: string,
  queue: {
    enqueueRound: (payload: FieldRoundPayload, clientMutationId: string) => Promise<unknown>;
    deleteDraft: (draftId: string) => Promise<unknown>;
  },
) {
  const payload = buildGe01Payload(draft, agentName);
  await queue.enqueueRound(payload, draft.submissionId);
  await queue.deleteDraft(draftId);
  return payload;
}

export function formatGe01CheckValue(check: FieldCheckInput) {
  if (check.valueBoolean !== undefined) return check.valueBoolean ? "Oui" : "Non";
  if (check.valueNumeric !== undefined) return `${check.valueNumeric.toLocaleString("fr-FR")}${check.unit ? ` ${check.unit}` : ""}`;
  if (check.valueText) return check.valueText;
  if (check.status === "not_applicable") return "Non applicable";
  if (check.status === "not_checked") return check.notes || "Non observé";
  return "Non renseigné";
}
