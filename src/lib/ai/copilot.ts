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
      "Eres el copiloto clínico de un consultorio en México. Responde en español, en 1 a 3 oraciones claras.",
      "Responde sólo con datos explícitos del expediente; si el dato no está, dilo.",
      "Cada cita debe ser una referencia corta y legible para un doctor, con tipo de registro, fecha en formato '1 nov 2026' y tratamiento si aplica.",
      "Ejemplos de citas: 'Evolución del 18 oct 2026 · Ortodoncia', 'Nota clínica del 1 nov 2026', 'Datos del paciente · Alergias'.",
      "Nunca hagas cálculos de dinero: usa exactamente los montos y saldos que ya vienen en el expediente.",
      "Si la respuesta es negativa (por ejemplo, sin alergias), dilo directamente: 'No, no tiene alergias registradas'.",
      `Expediente: ${record}`,
      `Pregunta: ${question}`,
    ].join("\n"),
    AnswerSchema,
    fallback,
  );
}
