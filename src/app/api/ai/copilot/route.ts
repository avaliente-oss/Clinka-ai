import { z } from "zod";
import { patientAnswer } from "@/lib/ai/copilot";
import { db } from "@/lib/db";
import { proceduresTotal } from "@/lib/money";
import { activeWhere } from "@/lib/soft-delete";
import { dateMx, money } from "@/lib/utils";
import { ProcedureStatus } from "@prisma/client";

const RequestSchema = z.object({
  patientId: z.string().min(1),
  question: z.string().min(1).max(2_000),
});

export async function POST(request: Request) {
  const { patientId, question } = RequestSchema.parse(await request.json());
  const patient = await db.patient.findFirstOrThrow({
    where: activeWhere({ id: patientId }),
    include: {
      notes: { where: activeWhere(), orderBy: { date: "desc" }, take: 8 },
      treatments: { where: activeWhere(), include: { procedures: true, evolutions: { where: activeWhere(), orderBy: { date: "desc" }, take: 1 } } },
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
    const treatment = patient.treatments[0];
    const realized = proceduresTotal(
      treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA),
    );
    fallback = {
      answer:
        "El expediente contiene el tratamiento “" + treatment.title +
        "”, con " + (treatment.evolutions[0]?.cumulativeProgress ?? 0) +
        "% de avance y " + money(realized) + " en prestaciones realizadas.",
      citations: ["Tratamiento clínico"],
    };
  }

  const answer = await patientAnswer(
    question,
    JSON.stringify(record),
    fallback,
  );
  return Response.json(answer);
}
