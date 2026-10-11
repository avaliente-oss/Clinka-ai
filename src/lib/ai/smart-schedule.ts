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
  return askAI(
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
  );
}
