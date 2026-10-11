import { z } from "zod";
import { askAI } from "./client";

export const AnswerSchema = z.object({
  answer: z.string(),
  citations: z.array(z.string()),
});

export type PatientAnswer = z.infer<typeof AnswerSchema>;

export async function patientAnswer(
  question: string,
  record: string,
  fallback: PatientAnswer,
) {
  return askAI(
    [
      "Responde sólo con datos explícitos del expediente.",
      "Incluye citas breves que identifiquen la sección o fecha de origen.",
      `Expediente: ${record}`,
      `Pregunta: ${question}`,
    ].join("\n"),
    AnswerSchema,
    fallback,
  );
}
