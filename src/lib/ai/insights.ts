import { z } from "zod";
import { askAI } from "./client";

export const InsightsSchema = z.object({
  summary: z.string(),
  recommendations: z.array(z.string()),
});

export async function businessInsights(context: string) {
  return askAI(
    `Resume la operación semanal y recomienda tres acciones: ${context}`,
    InsightsSchema,
    {
      summary:
        "La agenda mantiene buen ritmo, con oportunidad de recuperar citas sin confirmar y saldos pendientes.",
      recommendations: [
        "Confirmar citas de riesgo alto con 24 h de anticipación.",
        "Abrir dos espacios de valoración el jueves.",
        "Dar seguimiento amable a saldos mayores a $1,000.",
      ],
    },
  );
}
