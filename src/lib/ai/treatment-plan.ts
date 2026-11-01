import { z } from "zod";
import { askAI } from "./client";

export const PlanSchema = z.object({
  title: z.string(),
  diagnosis: z.string(),
  notes: z.string(),
  procedures: z.array(
    z.object({
      name: z.string(),
      tooth: z.string().optional(),
      surfaces: z.array(z.enum(["O", "M", "D", "V", "L", "P", "LP"])).default([]),
      price: z.number().nonnegative(),
      quantity: z.number().int().positive(),
      discount: z.number().nonnegative().default(0),
    }),
  ),
  total: z.number(),
});

export type AIPlan = z.infer<typeof PlanSchema>;

export async function proposePlan(context: string) {
  const fallback: AIPlan = {
    title: "Control y rehabilitación dental",
    diagnosis: "Hallazgos compatibles con necesidad de control preventivo y restaurador.",
    notes: "Propuesta clínica sujeta a confirmación profesional.",
    procedures: [
      { name: "Consulta de valoración", price: 650, quantity: 1, surfaces: [], discount: 0 },
      { name: "Limpieza dental", price: 850, quantity: 1, surfaces: [], discount: 0 },
      { name: "Resina", tooth: "36", surfaces: ["O", "M"], price: 1_200, quantity: 1, discount: 0 },
    ],
    total: 2_700,
  };

  return askAI(
    `Propón un tratamiento clínico con diagnóstico, notas y prestaciones planificadas usando el tarifario. No inventes procedimientos fuera del contexto. Contexto: ${context}`,
    PlanSchema,
    fallback,
  );
}
