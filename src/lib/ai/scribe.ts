import { z } from "zod";
import { askAI } from "./client";

export const SoapSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  diagnoses: z.array(
    z.object({
      code: z.string(),
      label: z.string(),
    }),
  ),
});

export type Soap = z.infer<typeof SoapSchema>;

export async function clinicalScribe(text: string) {
  const fallback: Soap = {
    subjective: text || "Paciente acude a consulta de seguimiento.",
    objective: "Exploración clínica realizada. Sin datos de alarma.",
    assessment: "Hallazgos compatibles con evolución estable.",
    plan: "Continuar manejo, reforzar indicaciones y control en 7 días.",
    diagnoses: [{ code: "Z09", label: "Examen de seguimiento" }],
  };

  return askAI(
    `Convierte esta consulta en SOAP y sugiere diagnósticos CIE-10: ${text}`,
    SoapSchema,
    fallback,
  );
}
