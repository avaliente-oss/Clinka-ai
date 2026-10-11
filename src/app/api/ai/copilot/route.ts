import { z } from "zod";
import { patientAnswer } from "@/lib/ai/copilot";
import { db } from "@/lib/db";
import { dateMx, money } from "@/lib/utils";

const RequestSchema = z.object({
  patientId: z.string().min(1),
  question: z.string().min(1).max(2_000),
});

export async function POST(request: Request) {
  const { patientId, question } = RequestSchema.parse(await request.json());
  const patient = await db.patient.findUniqueOrThrow({
    where: { id: patientId },
    include: {
      notes: { orderBy: { date: "desc" }, take: 8 },
      treatments: { include: { items: true } },
      payments: { orderBy: { date: "desc" } },
      odontogram: true,
    },
  });
  const latestNote = patient.notes[0];
  const record = {
    patient: {
      name: patient.firstName + " " + patient.lastName,
      allergies: patient.allergies,
      conditions: patient.conditions,
    },
    notes: patient.notes,
    odontogram: patient.odontogram,
    treatments: patient.treatments,
    payments: patient.payments,
  };

  let fallback = {
    answer:
      "No encontré información suficiente en el expediente para responder con certeza.",
    citations: ["Expediente del paciente"],
  };

  if (latestNote) {
    fallback = {
      answer:
        "La evaluación más reciente registra “" +
        latestNote.assessment +
        "”. El plan indicado fue: " +
        latestNote.plan,
      citations: ["Nota clínica del " + dateMx(latestNote.date)],
    };
  } else if (patient.treatments[0]) {
    fallback = {
      answer:
        "El expediente contiene el plan “" +
        patient.treatments[0].title +
        "” por " +
        money(patient.treatments[0].total) +
        ".",
      citations: ["Plan de tratamiento"],
    };
  }

  const answer = await patientAnswer(
    question,
    JSON.stringify(record),
    fallback,
  );
  return Response.json(answer);
}
