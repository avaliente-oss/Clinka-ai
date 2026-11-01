"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";
import { parseDateOnly } from "./utils";

const proceduresSchema = z.array(
  z.object({
    name: z.string().min(1),
    tooth: z.string().optional(),
    surface: z.string().optional(),
    quantity: z.coerce.number().int().positive(),
    price: z.coerce.number().nonnegative(),
    priceItemId: z.string().optional(),
  }),
);

function required(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  if (!value) {
    throw new Error(`El campo ${name} es obligatorio.`);
  }
  return value;
}

export async function createAppointment(form: FormData) {
  const clinic = await db.clinic.findFirstOrThrow();
  await db.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: required(form, "patientId"),
      professionalId: required(form, "professionalId"),
      start: new Date(required(form, "start")),
      duration: Number(form.get("duration") || 30),
      reason: required(form, "reason"),
      status: "AGENDADA",
    },
  });
  revalidatePath("/agenda");
}

export async function updateAppointmentStatus(form: FormData) {
  await db.appointment.update({
    where: { id: required(form, "id") },
    data: { status: required(form, "status") },
  });
  revalidatePath("/agenda");
}

export async function editAppointment(form: FormData) {
  await db.appointment.update({
    where: { id: required(form, "id") },
    data: {
      start: new Date(required(form, "start")),
      reason: required(form, "reason"),
      duration: Number(form.get("duration") || 30),
      professionalId: required(form, "professionalId"),
    },
  });
  revalidatePath("/agenda");
}

export async function createPatient(form: FormData) {
  const clinic = await db.clinic.findFirstOrThrow();
  const patient = await db.patient.create({
    data: {
      clinicId: clinic.id,
      firstName: required(form, "firstName"),
      lastName: required(form, "lastName"),
      phone: required(form, "phone"),
      email: String(form.get("email") || "").trim() || null,
      birthDate: parseDateOnly(required(form, "birthDate")),
      gender: required(form, "gender"),
      type: required(form, "type"),
      allergies: String(form.get("allergies") || "").trim() || null,
      conditions: String(form.get("conditions") || "").trim() || null,
    },
  });
  redirect(`/pacientes/${patient.id}`);
}

export async function createPayment(form: FormData) {
  const clinic = await db.clinic.findFirstOrThrow();
  const patientId = required(form, "patientId");
  const treatmentId = String(form.get("treatmentId") || "").trim() || null;
  if (treatmentId) {
    await db.treatment.findFirstOrThrow({ where: { id: treatmentId, patientId } });
  }
  await db.payment.create({
    data: {
      clinicId: clinic.id,
      patientId,
      treatmentId,
      amount: Number(required(form, "amount")),
      method: required(form, "method"),
      reference: String(form.get("reference") || "").trim() || null,
    },
  });
  revalidatePath("/caja");
}

export async function saveSoap(form: FormData) {
  const professional = await db.professional.findFirstOrThrow();
  const patientId = required(form, "patientId");
  await db.clinicalNote.create({
    data: {
      patientId,
      professionalId: professional.id,
      subjective: required(form, "subjective"),
      objective: required(form, "objective"),
      assessment: required(form, "assessment"),
      plan: required(form, "plan"),
      diagnoses: String(form.get("diagnoses") || "").trim() || null,
      aiGenerated: form.get("aiGenerated") === "true",
    },
  });
  revalidatePath(`/pacientes/${patientId}`);
}

export async function saveFinding(form: FormData) {
  const patientId = required(form, "patientId");
  const tooth = Number(required(form, "tooth"));
  const surface = required(form, "surface");
  const condition = required(form, "condition");

  if (condition === "SANO") {
    await db.odontogramFinding.deleteMany({
      where: { patientId, tooth, surface },
    });
  } else {
    await db.odontogramFinding.upsert({
      where: {
        patientId_tooth_surface: { patientId, tooth, surface },
      },
      create: {
        patientId,
        tooth,
        surface,
        condition,
        notes: String(form.get("notes") || "").trim() || null,
      },
      update: {
        condition,
        notes: String(form.get("notes") || "").trim() || null,
      },
    });
  }
  revalidatePath(`/pacientes/${patientId}`);
}

export async function addPatientFile(form: FormData) {
  const patientId = required(form, "patientId");
  await db.patientFile.create({
    data: {
      patientId,
      name: required(form, "name"),
      kind: required(form, "kind"),
      size: required(form, "size"),
    },
  });
  revalidatePath(`/pacientes/${patientId}`);
}

function parseProcedures(form: FormData, field = "procedures") {
  return proceduresSchema.parse(
    JSON.parse(String(form.get(field) || "[]")) as unknown,
  );
}

export async function createTreatment(form: FormData) {
  const clinic = await db.clinic.findFirstOrThrow();
  const procedures = parseProcedures(form);
  const patientId = required(form, "patientId");
  await db.treatment.create({
    data: {
      clinicId: clinic.id,
      patientId,
      title: required(form, "title"),
      diagnosis: String(form.get("diagnosis") || "").trim() || null,
      responsibleProfessionalId: required(form, "professionalId"),
      status: String(form.get("status") || "PLANIFICADO"),
      startDate: parseDateOnly(required(form, "startDate")),
      endDate: String(form.get("endDate") || "").trim()
        ? parseDateOnly(String(form.get("endDate")))
        : null,
      notes: String(form.get("notes") || "").trim() || null,
      procedures: {
        create: procedures.map((procedure) => ({
          ...procedure,
          tooth: procedure.tooth || null,
          surface: procedure.surface || null,
          priceItemId: procedure.priceItemId || null,
        })),
      },
    },
  });
  revalidatePath("/tratamientos");
  revalidatePath(`/pacientes/${patientId}`);
}

export async function updateTreatmentStatus(form: FormData) {
  const status = required(form, "status");
  const treatment = await db.treatment.update({
    where: { id: required(form, "id") },
    data: {
      status,
      endDate: status === "TERMINADO" ? new Date() : null,
    },
  });
  revalidatePath("/tratamientos");
  revalidatePath(`/pacientes/${treatment.patientId}`);
}

export async function registerEvolution(form: FormData) {
  const treatmentId = required(form, "treatmentId");
  const evolutionDateInput = required(form, "date");
  const evolutionDate = parseDateOnly(evolutionDateInput);
  const cumulativeProgress = z.coerce.number().int().min(0).max(100).parse(
    form.get("cumulativeProgress"),
  );
  const completedIds = form.getAll("completedProcedureIds").map(String);
  const newProcedures = parseProcedures(form, "newProcedures");

  const treatment = await db.treatment.findUniqueOrThrow({
    where: { id: treatmentId },
    include: { evolutions: { orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 1 } },
  });
  const previousProgress = treatment.evolutions[0]?.cumulativeProgress ?? 0;
  const previousDate = treatment.evolutions[0]?.date;
  const previousDateInput = previousDate?.toISOString().slice(0, 10);
  if (previousDateInput && evolutionDateInput < previousDateInput) {
    throw new Error("La fecha no puede ser anterior a la evolución más reciente.");
  }
  if (cumulativeProgress < previousProgress) {
    throw new Error(`El avance no puede ser menor al ${previousProgress}% previo.`);
  }

  await db.$transaction(async (tx) => {
    if (completedIds.length) {
      const validCount = await tx.procedure.count({
        where: { id: { in: completedIds }, treatmentId, status: "PLANIFICADA" },
      });
      if (validCount !== completedIds.length) {
        throw new Error("Una prestación seleccionada ya no está pendiente.");
      }
    }
    const evolution = await tx.evolution.create({
      data: {
        treatmentId,
        date: evolutionDate,
        professionalId: required(form, "professionalId"),
        appointmentId: String(form.get("appointmentId") || "").trim() || null,
        cumulativeProgress,
        clinicalNotes: required(form, "clinicalNotes"),
        nextSteps: String(form.get("nextSteps") || "").trim() || null,
      },
    });
    if (completedIds.length) {
      await tx.procedure.updateMany({
        where: { id: { in: completedIds }, treatmentId },
        data: { status: "REALIZADA", evolutionId: evolution.id },
      });
    }
    if (newProcedures.length) {
      await tx.procedure.createMany({
        data: newProcedures.map((procedure) => ({
          treatmentId,
          evolutionId: evolution.id,
          status: "REALIZADA",
          name: procedure.name,
          tooth: procedure.tooth || null,
          surface: procedure.surface || null,
          price: procedure.price,
          quantity: procedure.quantity,
          priceItemId: procedure.priceItemId || null,
        })),
      });
    }
    await tx.treatment.update({
      where: { id: treatmentId },
      data: {
        status: cumulativeProgress === 100 ? "TERMINADO" : "EN_CURSO",
        endDate: cumulativeProgress === 100 ? new Date() : null,
      },
    });
  });
  revalidatePath("/tratamientos");
  revalidatePath(`/pacientes/${treatment.patientId}`);
}
