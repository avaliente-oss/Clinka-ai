import { z } from "zod";
import { askAI } from "./client";

export const PlanSchema = z.object({
  summary: z.string(),
  phases: z.array(
    z.object({
      name: z.string(),
      items: z.array(
        z.object({
          description: z.string(),
          price: z.number(),
        }),
      ),
    }),
  ),
  total: z.number(),
});

export type AIPlan = z.infer<typeof PlanSchema>;

export async function proposePlan(context: string) {
  const fallback: AIPlan = {
    summary: "Plan escalonado priorizando control de enfermedad y rehabilitación.",
    phases: [
      {
        name: "Fase 1 · Control",
        items: [
          { description: "Consulta y diagnóstico", price: 650 },
          { description: "Limpieza dental", price: 850 },
        ],
      },
      {
        name: "Fase 2 · Restauración",
        items: [{ description: "Resina dental", price: 1_200 }],
      },
    ],
    total: 2_700,
  };

  return askAI(
    `Crea un plan dental por fases usando el tarifario. Contexto: ${context}`,
    PlanSchema,
    fallback,
  );
}
