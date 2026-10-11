"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "./db";

const treatmentItemsSchema = z.array(
  z.object({
    description: z.string().min(1),
    tooth: z.string().optional(),
    phase: z.coerce.number().int().positive(),
    quantity: z.coerce.number().int().positive(),
    unitPrice: z.coerce.number().nonnegative(),
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
      birthDate: new Date(required(form, "birthDate")),
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
  await db.payment.create({
    data: {
      clinicId: clinic.id,
      patientId: required(form, "patientId"),
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

function parseTreatmentItems(form: FormData) {
  return treatmentItemsSchema.parse(
    JSON.parse(required(form, "items")) as unknown,
  );
}

export async function createTreatmentPlan(form: FormData) {
  const clinic = await db.clinic.findFirstOrThrow();
  const items = parseTreatmentItems(form);
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  await db.treatmentPlan.create({
    data: {
      clinicId: clinic.id,
      patientId: required(form, "patientId"),
      title: required(form, "title"),
      status: String(form.get("status") || "PROPUESTO"),
      total,
      items: { create: items },
    },
  });
  revalidatePath("/presupuestos");
}

export async function updateTreatmentPlan(form: FormData) {
  const id = required(form, "id");
  const items = parseTreatmentItems(form);
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  await db.$transaction([
    db.treatmentItem.deleteMany({ where: { planId: id } }),
    db.treatmentPlan.update({
      where: { id },
      data: {
        patientId: required(form, "patientId"),
        title: required(form, "title"),
        status: required(form, "status"),
        total,
        items: { create: items },
      },
    }),
  ]);
  revalidatePath("/presupuestos");
}

export async function updatePlanStatus(form: FormData) {
  await db.treatmentPlan.update({
    where: { id: required(form, "id") },
    data: { status: required(form, "status") },
  });
  revalidatePath("/presupuestos");
}

export async function deleteTreatmentPlan(form: FormData) {
  await db.treatmentPlan.delete({
    where: { id: required(form, "id") },
  });
  revalidatePath("/presupuestos");
}
