import { z } from "zod";
import { proposePlan } from "@/lib/ai/treatment-plan";
import { db } from "@/lib/db";
import { activeWhere } from "@/lib/soft-delete";

const RequestSchema = z.object({
  patientId: z.string().min(1),
  context: z.string().max(10_000),
});

export async function POST(request: Request) {
  const { patientId, context } = RequestSchema.parse(await request.json());
  const [patient, prices] = await Promise.all([
    db.patient.findFirstOrThrow({
      where: activeWhere({ id: patientId }),
      include: {
        odontogram: true,
        notes: { where: activeWhere(), orderBy: { date: "desc" }, take: 5 },
      },
    }),
    db.priceItem.findMany({ orderBy: { name: "asc" } }),
  ]);
  const clinicalContext = {
    instruction: context,
    allergies: patient.allergies,
    conditions: patient.conditions,
    odontogram: patient.odontogram,
    recentNotes: patient.notes,
    prices: prices.map((price) => ({
      service: price.name,
      price: price.price.toFixed(2),
    })),
  };

  return Response.json(await proposePlan(JSON.stringify(clinicalContext)));
}
