export const money = (value: { toString(): string } | string | number) =>
  new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value.toString()));

export const dateMx = (
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "medium" },
) => new Intl.DateTimeFormat("es-MX", options).format(new Date(date));

export function parseDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error("La fecha debe tener el formato AAAA-MM-DD.");
  }
  const date = new Date(`${value}T12:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error("La fecha no es válida.");
  }
  return date;
}

export const enumLabel = {
  AGENDADA: "Agendada",
  CONFIRMADA: "Confirmada",
  RECORDATORIO_ENVIADO: "Recordatorio enviado",
  REPROGRAMADA: "Cambio de fecha",
  ATENDIDA: "Atendida",
  NO_ASISTIO: "No asistió",
  CANCELADA: "Cancelada",
  PLANIFICADO: "Planificado",
  EN_CURSO: "En curso",
  TERMINADO: "Terminado",
  SUSPENDIDO: "Suspendido",
  PLANIFICADA: "Planificada",
  REALIZADA: "Realizada",
  PENDIENTE: "Pendiente",
  ENVIADO: "Enviado",
  CANCELADO: "Cancelado",
  CONFIRMACION: "Confirmación",
  RECORDATORIO: "Recordatorio",
  EFECTIVO: "Efectivo",
  TARJETA: "Tarjeta",
  TRANSFERENCIA: "Transferencia",
  DENTAL: "Dental",
  MEDICO: "Médico",
  FEMENINO: "Femenino",
  MASCULINO: "Masculino",
  NO_ESPECIFICADO: "No especificado",
  O: "O",
  M: "M",
  D: "D",
  V: "V",
  L: "L",
  P: "P",
  LP: "L/P",
  CARIES: "Caries",
  RESTAURACION: "Restauración",
  EXTRACCION: "Indicación de extracción",
  ENDODONCIA: "Endodoncia",
  CORONA: "Corona",
} as const;

export const statusLabel: Record<string, string> = enumLabel;

export function labelsFor<T extends keyof typeof enumLabel>(value: T) {
  return enumLabel[value];
}

export function noShowRisk(input: {
  noShows: number;
  daysAhead: number;
  hour: number;
  confirmed: boolean;
  reminderSent?: boolean;
}) {
  let score =
    10 +
    input.noShows * 22 +
    (input.daysAhead > 10 ? 12 : 0) +
    (input.hour < 9 || input.hour > 17 ? 8 : 0) -
    (input.confirmed ? 25 : input.reminderSent ? 12 : 0);

  score = Math.max(3, Math.min(96, score));

  return {
    score,
    level: score >= 65 ? "Alto" : score >= 35 ? "Medio" : "Bajo",
    explanation: input.confirmed
      ? "La confirmación reduce el riesgo; considera un recordatorio el mismo día."
      : input.reminderSent
        ? "Ya se envió un recordatorio; falta la confirmación del paciente."
        : "Sin confirmación todavía. Conviene enviar un recordatorio personalizado.",
  };
}

export function localDateTimeValue(date: Date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
