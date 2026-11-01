import { z } from "zod";
import { askAI } from "./client";

export const MessageSchema = z.object({ message: z.string() });

export async function generateMessage(name: string, type: string, details?: string) {
  return askAI(
    [
      `Redacta un mensaje breve de WhatsApp (máx. 3 oraciones) de Clínica Horizonte, tipo ${type}, para ${name}.`,
      details ? `Datos de la cita: ${details}. Menciona fecha, hora y profesional tal cual vienen.` : "No hay cita ligada; no inventes fechas ni horas.",
      "Tono cálido y profesional en español de México; termina pidiendo confirmación cuando aplique.",
    ].join(" "),
    MessageSchema,
    {
      message:
        `Hola ${name} 👋 Te escribimos de Clínica Horizonte para ` +
        "recordarte tu próxima cita. ¿Nos confirmas tu asistencia? " +
        "Estamos para cuidarte.",
    },
    { cacheSeconds: 60 * 60 * 24 }, // Caché de un día por paciente y tipo.
  );
}
