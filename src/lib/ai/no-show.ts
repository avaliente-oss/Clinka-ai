import { z } from "zod";
import { askAI } from "./client";

export const RiskSchema = z.object({
  explanation: z.string(),
  actions: z.array(z.string()),
});

export async function explainRisk(score: number) {
  return askAI(
    `Explica un riesgo de inasistencia de ${score}/100.`,
    RiskSchema,
    {
      explanation:
        score >= 65
          ? "El historial y la falta de confirmación elevan el riesgo."
          : "La confirmación y el horario reducen el riesgo estimado.",
      actions: [
        "Enviar WhatsApp 24 h antes.",
        "Solicitar confirmación explícita.",
      ],
    },
  );
}
