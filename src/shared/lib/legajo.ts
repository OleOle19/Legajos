import type { LegajoSummary } from "@/shared/types/legajo";

const CONTRACT_PREFIXES: Record<string, string> = {
  "DL 276": "DL276",
  "DL 728 - Serenos": "DL728S",
  "DL 728 - Obreros": "DL728O",
  CAS: "CAS",
  "CAS - Confianza": "CASC",
  "CAS - Necesidad": "CASN"
};

export interface BirthdayReminder {
  id: number;
  name: string;
  age: number;
  daysUntil: number;
  nextBirthday: string;
  nextAge: number;
}

export function buildNextLegajoNumber(
  rows: Array<Pick<LegajoSummary, "numero_legajo" | "regimen_laboral">>,
  contractType: string
) {
  const prefix = contractPrefix(contractType);
  const contractRows = rows.filter((row) => normalizeContractType(row.regimen_laboral) === normalizeContractType(contractType));
  const maxSequence = contractRows.reduce((max, row) => Math.max(max, parseLegajoSequence(row.numero_legajo) ?? 0), 0);
  return `${prefix}-${String(maxSequence + 1).padStart(4, "0")}`;
}

export function contractPrefix(contractType: string) {
  return CONTRACT_PREFIXES[normalizeContractType(contractType)] ?? (normalizeText(contractType).toUpperCase() || "LEG");
}

export function normalizeContractType(value: string) {
  const text = normalizeText(value);
  const normalized = text.replace(/\s+/g, " ");
  switch (normalizeText(normalized)) {
    case "dl 276":
    case "276":
      return "DL 276";
    case "dl 728 serenos":
    case "728 serenos":
    case "serenos":
      return "DL 728 - Serenos";
    case "dl 728 obreros":
    case "728 obreros":
    case "obreros":
      return "DL 728 - Obreros";
    case "cas":
      return "CAS";
    case "cas confianza":
    case "dl cas confianza":
    case "confianza":
      return "CAS - Confianza";
    case "cas necesidad":
    case "dl cas necesidad":
    case "necesidad":
      return "CAS - Necesidad";
    default:
      return normalized;
  }
}

export function calculateAge(dateValue: string, referenceDate = new Date()) {
  const birthDate = parseDate(dateValue);
  if (!birthDate) return null;

  let age = referenceDate.getFullYear() - birthDate.getFullYear();
  const birthdayThisYear = new Date(referenceDate.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (referenceDate < birthdayThisYear) age -= 1;
  return age;
}

export function formatDateLabel(dateValue: string, options: Intl.DateTimeFormatOptions = {}) {
  const parsed = parseDate(dateValue);
  if (!parsed) return dateValue;
  return parsed.toLocaleDateString("es-PE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    ...options
  });
}

export function formatDateShortLabel(dateValue: string) {
  const parsed = parseDate(dateValue);
  if (!parsed) return dateValue;
  return parsed.toLocaleDateString("es-PE", { day: "2-digit", month: "short" });
}

export function getBirthdayReminders(rows: LegajoSummary[], daysAhead = 7, referenceDate = new Date()) {
  const referenceDay = startOfDay(referenceDate);
  return rows
    .map((row) => {
      const birthDate = parseDate(row.fecha_nacimiento);
      if (!birthDate) return null;

      const nextBirthday = getNextBirthday(birthDate, referenceDay);
      const daysUntil = Math.round((nextBirthday.getTime() - referenceDay.getTime()) / DAY_MS);
      if (daysUntil < 0 || daysUntil > daysAhead) return null;

      const age = calculateAge(row.fecha_nacimiento, referenceDate);
      if (age === null) return null;

      return {
        id: row.id,
        name: row.apellidos_nombres,
        age,
        daysUntil,
        nextBirthday: formatDateKey(nextBirthday),
        nextAge: age + 1
      } satisfies BirthdayReminder;
    })
    .filter((item): item is BirthdayReminder => Boolean(item))
    .sort((left, right) => left.daysUntil - right.daysUntil || left.name.localeCompare(right.name, "es", { sensitivity: "base" }));
}

function getNextBirthday(birthDate: Date, referenceDay: Date) {
  const candidate = new Date(referenceDay.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (candidate < referenceDay) {
    candidate.setFullYear(candidate.getFullYear() + 1);
  }
  return candidate;
}

function parseLegajoSequence(value: string) {
  const matches = value.match(/\d+/g);
  if (!matches || !matches.length) return null;
  return Number.parseInt(matches[matches.length - 1], 10);
}

function parseDate(value: string) {
  if (!value) return null;

  if (value.length === 10 && value.charAt(4) === "-" && value.charAt(7) === "-") {
    const year = Number.parseInt(value.slice(0, 4), 10);
    const month = Number.parseInt(value.slice(5, 7), 10);
    const day = Number.parseInt(value.slice(8, 10), 10);
    const parsedLocal = new Date(year, month - 1, day);
    if (!Number.isNaN(parsedLocal.valueOf())) return parsedLocal;
  }

  const parts = value.split("-").map((part) => Number.parseInt(part, 10));
  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [year, month, day] = parts;
    const parsedLocal = new Date(year, month - 1, day);
    if (!Number.isNaN(parsedLocal.valueOf())) return parsedLocal;
  }

  if (value.length === 10 && value.charAt(2) === "/" && value.charAt(5) === "/") {
    const day = Number.parseInt(value.slice(0, 2), 10);
    const month = Number.parseInt(value.slice(3, 5), 10);
    const year = Number.parseInt(value.slice(6, 10), 10);
    const parsedLocal = new Date(year, month - 1, day);
    if (!Number.isNaN(parsedLocal.valueOf())) return parsedLocal;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed;
}

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function formatDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

const DAY_MS = 24 * 60 * 60 * 1000;
