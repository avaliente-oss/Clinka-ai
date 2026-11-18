import { z } from "zod";
import { askAI } from "./client";

export const SlotsSchema = z.object({
  slots: z.array(
    z.object({
      datetime: z.string(),
      reason: z.string(),
    }),
  ),
});

export async function suggestSlots(context: string) {
  const result = await askAI(
    `Sugiere tres horarios sin inventar disponibilidad fuera del contexto: ${context}`,
    SlotsSchema,
    {
      slots: [
        {
          datetime: "Mañana, 10:30",
          reason: "Menor saturación y preferencia matutina.",
        },
        {
          datetime: "Miércoles, 12:00",
          reason: "Bloque continuo disponible.",
        },
        {
          datetime: "Viernes, 09:00",
          reason: "Primera cita del día.",
        },
      ],
    },
    { cacheSeconds: 60 * 30 }, // Caché de 30 minutos: la agenda cambia el contexto.
  );
  try {
    const parsed = JSON.parse(context) as {
      blockedRanges?: Array<{ start: string; end: string }>;
    };
    const blocked = parsed.blockedRanges ?? [];
    return {
      slots: result.slots.filter((slot) => {
        const start = new Date(slot.datetime);
        if (Number.isNaN(start.getTime())) return true;
        const end = new Date(start.getTime() + 30 * 60_000);
        return !blocked.some((range) => {
          const blockedStart = new Date(range.start);
          const blockedEnd = new Date(range.end);
          return start < blockedEnd && end > blockedStart;
        });
      }),
    };
  } catch {
    return result;
  }
}
