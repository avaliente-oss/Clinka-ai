import { z } from "zod";
import { patientAnswer } from "@/lib/ai/copilot";
import { db } from "@/lib/db";
import { addMoney, proceduresTotal, subtractMoney, sumMoney, type MoneyValue } from "@/lib/money";
import { activeWhere } from "@/lib/soft-delete";
import { dateMx, enumLabel, money, statusLabel } from "@/lib/utils";
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
      treatments: {
        where: activeWhere(),
        include: {
          procedures: true,
          payments: true,
          evolutions: { where: activeWhere(), orderBy: { date: "asc" }, include: { professional: true } },
        },
      },
      payments: { orderBy: { date: "desc" } },
      odontogram: true,
    },
  });
  const latestNote = patient.notes[0];

  // Balance: amounts are computed here with the same helpers as the UI; the model must never do math.
  const balanceText = (value: MoneyValue) => {
    const amount = subtractMoney(value, 0);
    return amount.isNegative() ? `${money(amount.abs())} a favor del paciente` : money(amount);
  };
  const realizedAll = patient.treatments.reduce(
    (sum, treatment) =>
      sum.plus(proceduresTotal(treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA))),
    addMoney(),
  );
  const paidAll = sumMoney(patient.payments, (payment) => payment.amount);

  const lines = [
    `Paciente: ${patient.firstName} ${patient.lastName}`,
    `Datos del paciente · Alergias: ${patient.allergies || "sin registro"}`,
    `Datos del paciente · Antecedentes: ${patient.conditions || "sin registro"}`,
    `Saldo total del paciente (prestaciones realizadas ${money(realizedAll)} − pagos ${money(paidAll)}): ${balanceText(subtractMoney(realizedAll, paidAll))}`,
    "",
    "Notas clínicas:",
    ...(patient.notes.length
      ? patient.notes.map((note) =>
          `- Nota clínica del ${dateMx(note.date)}: S: ${note.subjective} | O: ${note.objective} | A: ${note.assessment} | P: ${note.plan}${note.diagnoses ? ` | Diagnósticos: ${note.diagnoses}` : ""}`)
      : ["- Sin notas clínicas."]),
    "",
    "Tratamientos:",
    ...(patient.treatments.length
      ? patient.treatments.flatMap((treatment) => {
          const realized = proceduresTotal(treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA));
          const planned = proceduresTotal(treatment.procedures);
          const paid = sumMoney(treatment.payments, (payment) => payment.amount);
          const progress = treatment.evolutions.at(-1)?.cumulativeProgress ?? 0;
          return [
            `- Tratamiento ${treatment.title} (${statusLabel[treatment.status]}, avance ${progress}%, inicio ${dateMx(treatment.startDate)})${treatment.diagnosis ? `. Diagnóstico: ${treatment.diagnosis}` : ""}. Total planificado ${money(planned)}, realizado ${money(realized)}, pagado ${money(paid)}, saldo ${balanceText(subtractMoney(realized, paid))}.`,
            ...treatment.evolutions.map((evolution, index) =>
              `  - Evolución del ${dateMx(evolution.date)} · ${treatment.title} (sesión ${index + 1}, avance ${evolution.cumulativeProgress}%, ${evolution.professional.name}): ${evolution.clinicalNotes}`),
            ...treatment.procedures.map((procedure) =>
              `  - Prestación ${procedure.name}${procedure.tooth ? ` pieza ${procedure.tooth}` : ""}: ${statusLabel[procedure.status]}`),
          ];
        })
      : ["- Sin tratamientos."]),
    "",
    "Pagos:",
    ...(patient.payments.length
      ? patient.payments.map((payment) => `- Pago del ${dateMx(payment.date)}: ${money(payment.amount)} (${enumLabel[payment.method] ?? payment.method})`)
      : ["- Sin pagos."]),
    "",
    "Odontograma:",
    ...(patient.odontogram.length
      ? patient.odontogram.map((finding) => `- Pieza ${finding.tooth} ${enumLabel[finding.surface] ?? finding.surface}: ${enumLabel[finding.condition] ?? finding.condition}`)
      : ["- Sin hallazgos."]),
  ];
  const record = lines.join("\n");

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
        "”, con " + (treatment.evolutions.at(-1)?.cumulativeProgress ?? 0) +
        "% de avance y " + money(realized) + " en prestaciones realizadas.",
      citations: ["Tratamiento clínico"],
    };
  }

  const answer = await patientAnswer(
    question,
    record,
    fallback,
  );
  return Response.json(answer);
}
