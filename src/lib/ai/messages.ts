import { z } from "zod";
import { askAI } from "./client";

export const MessageSchema = z.object({ message: z.string() });

export async function generateMessage(name: string, type: string) {
  return askAI(
    `Redacta un mensaje breve de WhatsApp tipo ${type} para ${name}.`,
    MessageSchema,
    {
      message:
        `Hola ${name} 👋 Te escribimos de Clínica Horizonte para ` +
        "recordarte tu próxima cita. ¿Nos confirmas tu asistencia? " +
        "Estamos para cuidarte.",
    },
  );
}
