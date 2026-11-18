"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  AppointmentStatus,
  BlockRecurrence,
  DentalSurface,
  Gender,
  OdontogramCondition,
  PatientType,
  PaymentMethod,
  ProcedureStatus,
  ReminderStatus,
  TreatmentStatus,
} from "@prisma/client";
import { getSessionUserId } from "./audit";
import { db } from "./db";
import { decimal } from "./money";
import { expandScheduleBlocks, findConflictingBlock } from "./schedule";
import { activeWhere } from "./soft-delete";
import { localDateTimeValue, parseDateOnly } from "./utils";
import { demoViews, type DemoView } from "./demo-view";

const moneyString = z.string().regex(/^\d+(?:\.\d{1,2})?$/);
const moneyInput = moneyString.transform(decimal);

const proceduresSchema = z.array(
  z.object({
    name: z.string().min(1),
    tooth: z.string().optional(),
    surfaces: z.array(z.nativeEnum(DentalSurface)).default([]),
    quantity: z.coerce.number().int().positive(),
    price: moneyInput,
    discount: moneyString.default("0").transform(decimal),
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

export async function setDemoView(view: DemoView) {
  if (!demoViews.includes(view)) throw new Error("Vista de demostración no válida.");
  (await cookies()).set("clinika_view", view, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
}

export type AgendaFormValues = Partial<Record<
  | "id"
  | "patientId"
  | "professionalId"
  | "start"
  | "end"
  | "duration"
  | "reason"
  | "recurrence"
  | "recurrenceUntil",
  string
>>;

export type AffectedAppointment = {
  id: string;
  patient: string;
  professional: string;
  start: string;
  href: string;
};

export type AgendaActionState = {
  error?: string;
  success?: string;
  submissionId?: string;
  values?: AgendaFormValues;
  affectedAppointments?: AffectedAppointment[];
};

function actionError(error: unknown) {
  return error instanceof Error ? error.message : "No fue posible guardar los cambios.";
}

function submittedValues(form: FormData, fields: Array<keyof AgendaFormValues>) {
  return Object.fromEntries(fields.map((field) => [field, String(form.get(field) ?? "")])) as AgendaFormValues;
}

function rejectedState(error: unknown, values: AgendaFormValues): AgendaActionState {
  return { error: actionError(error), values, submissionId: crypto.randomUUID() };
}

function appointmentRange(form: FormData) {
  const start = new Date(required(form, "start"));
  const duration = z.coerce.number().int().positive().max(480).parse(form.get("duration") || 30);
  if (Number.isNaN(start.getTime())) throw new Error("La fecha y hora de la cita no es válida.");
  return { start, duration, end: new Date(start.getTime() + duration * 60_000) };
}

async function assertAppointmentIsAvailable({
  clinicId,
  professionalId,
  start,
  end,
}: {
  clinicId: string;
  professionalId: string;
  start: Date;
  end: Date;
}) {
  const conflict = await findConflictingBlock({ clinicId, professionalId, start, end });
  if (conflict) {
    throw new Error(`El horario se traslapa con el bloqueo “${conflict.reason}”. Elige otro horario.`);
  }
}

export async function createAppointment(form: FormData) {
  const clinic = await db.clinic.findFirstOrThrow();
  const professionalId = required(form, "professionalId");
  const { start, duration, end } = appointmentRange(form);
  await assertAppointmentIsAvailable({ clinicId: clinic.id, professionalId, start, end });
  await db.appointment.create({
    data: {
      clinicId: clinic.id,
      patientId: required(form, "patientId"),
      professionalId,
      start,
      duration,
      reason: required(form, "reason"),
      status: AppointmentStatus.AGENDADA,
    },
  });
  revalidatePath("/agenda");
}

export async function createAppointmentState(
  _state: AgendaActionState,
  form: FormData,
): Promise<AgendaActionState> {
  const values = submittedValues(form, ["patientId", "professionalId", "start", "duration", "reason"]);
  try {
    await createAppointment(form);
    return { success: "Cita creada." };
  } catch (error) {
    return rejectedState(error, values);
  }
}

export async function updateAppointmentStatus(form: FormData) {
  await db.appointment.update({
    where: { id: required(form, "id") },
    data: { status: z.nativeEnum(AppointmentStatus).parse(required(form, "status")) },
  });
  revalidatePath("/agenda");
}

export async function markReminderSent(reminderId: string) {
  await db.$transaction(async (tx) => {
    const reminder = await tx.reminder.findUniqueOrThrow({ where: { id: reminderId } });
    await tx.reminder.update({ where: { id: reminder.id }, data: { status: ReminderStatus.ENVIADO } });
    if (reminder.appointmentId) {
      await tx.appointment.updateMany({
        where: { id: reminder.appointmentId, status: AppointmentStatus.AGENDADA },
        data: { status: AppointmentStatus.RECORDATORIO_ENVIADO },
      });
    }
  });
  revalidatePath("/agenda");
  revalidatePath("/recordatorios");
}

export async function editAppointment(form: FormData) {
  const appointment = await db.appointment.findUniqueOrThrow({ where: { id: required(form, "id") } });
  const professionalId = required(form, "professionalId");
  const { start, duration, end } = appointmentRange(form);
  await assertAppointmentIsAvailable({ clinicId: appointment.clinicId, professionalId, start, end });
  await db.appointment.update({
    where: { id: appointment.id },
    data: {
      start,
      reason: required(form, "reason"),
      duration,
      professionalId,
    },
  });
  revalidatePath("/agenda");
}

export async function editAppointmentState(
  _state: AgendaActionState,
  form: FormData,
): Promise<AgendaActionState> {
  const values = submittedValues(form, ["id", "professionalId", "start", "duration", "reason"]);
  try {
    await editAppointment(form);
    return { success: "Cita actualizada." };
  } catch (error) {
    return rejectedState(error, values);
  }
}

export async function createScheduleBlockState(
  _state: AgendaActionState,
  form: FormData,
): Promise<AgendaActionState> {
  const values = submittedValues(form, [
    "professionalId",
    "reason",
    "start",
    "end",
    "recurrence",
    "recurrenceUntil",
  ]);
  try {
    const userId = await getSessionUserId();
    const clinic = await db.clinic.findFirstOrThrow();
    const start = new Date(required(form, "start"));
    const end = new Date(required(form, "end"));
    const recurrence = z.nativeEnum(BlockRecurrence).parse(required(form, "recurrence"));
    const untilInput = String(form.get("recurrenceUntil") || "").trim();
    const recurrenceUntil = untilInput ? new Date(`${untilInput}T23:59:59.999`) : null;
    const professionalId = String(form.get("professionalId") || "").trim() || null;

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new Error("Las fechas del bloqueo no son válidas.");
    }
    if (end <= start) throw new Error("El fin del bloqueo debe ser posterior al inicio.");
    if (recurrenceUntil && (Number.isNaN(recurrenceUntil.getTime()) || recurrenceUntil < start)) {
      throw new Error("La fecha “hasta” debe ser igual o posterior al inicio.");
    }
    if (professionalId) {
      await db.professional.findFirstOrThrow({ where: { id: professionalId, clinicId: clinic.id } });
    }

    const block = await db.scheduleBlock.create({
      data: {
        clinicId: clinic.id,
        professionalId,
        reason: required(form, "reason"),
        start,
        end,
        recurrence,
        recurrenceUntil: recurrence === BlockRecurrence.NONE ? null : recurrenceUntil,
        createdById: userId,
        updatedById: userId,
      },
    });
    const duration = end.getTime() - start.getTime();
    const appointmentSearchEnd = recurrence === BlockRecurrence.NONE
      ? end
      : recurrenceUntil
        ? new Date(recurrenceUntil.getTime() + duration)
        : undefined;
    const appointments = await db.appointment.findMany({
      where: {
        clinicId: clinic.id,
        professionalId: professionalId ?? undefined,
        status: { not: AppointmentStatus.CANCELADA },
        start: {
          gte: new Date(Math.max(start.getTime() - 24 * 60 * 60_000, Date.now())),
          lt: appointmentSearchEnd,
        },
      },
      include: { patient: true, professional: true },
      orderBy: { start: "asc" },
    });
    const affectedAppointments = appointments
      .filter((appointment) => {
        const appointmentEnd = new Date(appointment.start.getTime() + appointment.duration * 60_000);
        return expandScheduleBlocks([block], appointment.start, appointmentEnd).length > 0;
      })
      .map((appointment) => ({
        id: appointment.id,
        patient: `${appointment.patient.firstName} ${appointment.patient.lastName}`,
        professional: appointment.professional.name,
        start: appointment.start.toISOString(),
        href: `/agenda?view=day&date=${localDateTimeValue(appointment.start).slice(0, 10)}#cita-${appointment.id}`,
      }));
    revalidatePath("/agenda");
    return {
      success: "Horario bloqueado.",
      affectedAppointments,
      submissionId: crypto.randomUUID(),
    };
  } catch (error) {
    return rejectedState(error, values);
  }
}

export async function deleteScheduleBlock(form: FormData) {
  await db.scheduleBlock.delete({ where: { id: required(form, "id") } });
  revalidatePath("/agenda");
}

export async function deleteScheduleBlockGroup(form: FormData) {
  const ids = form.getAll("ids").map(String).filter(Boolean);
  if (!ids.length) throw new Error("No se encontraron horarios fijos para eliminar.");
  await db.scheduleBlock.deleteMany({ where: { id: { in: ids } } });
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
      gender: z.nativeEnum(Gender).parse(required(form, "gender")),
      type: z.nativeEnum(PatientType).parse(required(form, "type")),
      allergies: String(form.get("allergies") || "").trim() || null,
      conditions: String(form.get("conditions") || "").trim() || null,
    },
  });
  redirect(`/pacientes/${patient.id}`);
}

export async function createPayment(form: FormData) {
  const userId = await getSessionUserId();
  const clinic = await db.clinic.findFirstOrThrow();
  const patientId = required(form, "patientId");
  const treatmentId = String(form.get("treatmentId") || "").trim() || null;
  if (treatmentId) {
    await db.treatment.findFirstOrThrow({ where: activeWhere({ id: treatmentId, patientId }) });
  }
  await db.payment.create({
    data: {
      clinicId: clinic.id,
      patientId,
      treatmentId,
      amount: moneyInput.parse(required(form, "amount")),
      method: z.nativeEnum(PaymentMethod).parse(required(form, "method")),
      reference: String(form.get("reference") || "").trim() || null,
      createdById: userId,
      updatedById: userId,
    },
  });
  revalidatePath("/caja");
}

export async function saveSoap(form: FormData) {
  const userId = await getSessionUserId();
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
      createdById: userId,
      updatedById: userId,
    },
  });
  revalidatePath(`/pacientes/${patientId}`);
}

export async function saveFinding(form: FormData) {
  const userId = await getSessionUserId();
  const patientId = required(form, "patientId");
  const tooth = Number(required(form, "tooth"));
  const surface = z.nativeEnum(DentalSurface).parse(required(form, "surface"));
  const conditionInput = required(form, "condition");

  if (conditionInput === "SANO") {
    await db.odontogramFinding.deleteMany({
      where: { patientId, tooth, surface },
    });
  } else {
    const condition = z.nativeEnum(OdontogramCondition).parse(conditionInput);
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
        createdById: userId,
        updatedById: userId,
      },
      update: {
        condition,
        notes: String(form.get("notes") || "").trim() || null,
        updatedById: userId,
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
  const userId = await getSessionUserId();
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
      status: z.nativeEnum(TreatmentStatus).parse(String(form.get("status") || "PLANIFICADO")),
      startDate: parseDateOnly(required(form, "startDate")),
      endDate: String(form.get("endDate") || "").trim()
        ? parseDateOnly(String(form.get("endDate")))
        : null,
      notes: String(form.get("notes") || "").trim() || null,
      createdById: userId,
      updatedById: userId,
      procedures: {
        create: procedures.map((procedure) => ({
          ...procedure,
          tooth: procedure.tooth || null,
          priceItemId: procedure.priceItemId || null,
          createdById: userId,
          updatedById: userId,
        })),
      },
    },
  });
  revalidatePath("/tratamientos");
  revalidatePath(`/pacientes/${patientId}`);
}

export async function updateTreatmentStatus(form: FormData) {
  const userId = await getSessionUserId();
  const status = z.nativeEnum(TreatmentStatus).parse(required(form, "status"));
  const treatment = await db.treatment.update({
    where: { id: required(form, "id") },
    data: {
      status,
      endDate: status === TreatmentStatus.TERMINADO ? new Date() : null,
      updatedById: userId,
    },
  });
  revalidatePath("/tratamientos");
  revalidatePath(`/pacientes/${treatment.patientId}`);
}

export async function deleteTreatment(form: FormData) {
  const userId = await getSessionUserId();
  const treatment = await db.treatment.findFirstOrThrow({
    where: activeWhere({ id: required(form, "id") }),
    include: {
      _count: {
        select: {
          evolutions: { where: activeWhere() },
          procedures: { where: { status: ProcedureStatus.REALIZADA } },
          payments: true,
        },
      },
    },
  });

  // Clinical history and money must stay traceable: only plans without activity can be removed.
  const { evolutions, procedures, payments } = treatment._count;
  if (evolutions || procedures || payments) {
    throw new Error(
      "No se puede eliminar un tratamiento con evoluciones, prestaciones realizadas o pagos. Márcalo como suspendido.",
    );
  }

  await db.treatment.update({
    where: { id: treatment.id },
    data: { deletedAt: new Date(), updatedById: userId },
  });
  revalidatePath("/tratamientos");
  revalidatePath(`/pacientes/${treatment.patientId}`);
}

export async function registerEvolution(form: FormData) {
  const userId = await getSessionUserId();
  const treatmentId = required(form, "treatmentId");
  const evolutionDateInput = required(form, "date");
  const evolutionDate = parseDateOnly(evolutionDateInput);
  const cumulativeProgress = z.coerce.number().int().min(0).max(100).parse(
    form.get("cumulativeProgress"),
  );
  const completedIds = form.getAll("completedProcedureIds").map(String);
  const newProcedures = parseProcedures(form, "newProcedures");
  const professionalId = required(form, "professionalId");

  const treatment = await db.treatment.findFirstOrThrow({
    where: activeWhere({ id: treatmentId }),
    include: { evolutions: { where: activeWhere(), orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 1 } },
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
        where: { id: { in: completedIds }, treatmentId, status: ProcedureStatus.PLANIFICADA },
      });
      if (validCount !== completedIds.length) {
        throw new Error("Una prestación seleccionada ya no está pendiente.");
      }
    }
    const evolution = await tx.evolution.create({
      data: {
        treatmentId,
        date: evolutionDate,
        professionalId,
        appointmentId: String(form.get("appointmentId") || "").trim() || null,
        cumulativeProgress,
        clinicalNotes: required(form, "clinicalNotes"),
        nextSteps: String(form.get("nextSteps") || "").trim() || null,
        createdById: userId,
        updatedById: userId,
      },
    });
    if (completedIds.length) {
      await tx.procedure.updateMany({
        where: { id: { in: completedIds }, treatmentId },
        data: {
          status: ProcedureStatus.REALIZADA,
          evolutionId: evolution.id,
          performedAt: evolutionDate,
          performedById: professionalId,
          updatedById: userId,
        },
      });
    }
    if (newProcedures.length) {
      await tx.procedure.createMany({
        data: newProcedures.map((procedure) => ({
          treatmentId,
          evolutionId: evolution.id,
          status: ProcedureStatus.REALIZADA,
          name: procedure.name,
          tooth: procedure.tooth || null,
          surfaces: procedure.surfaces,
          price: procedure.price,
          quantity: procedure.quantity,
          discount: procedure.discount,
          priceItemId: procedure.priceItemId || null,
          performedAt: evolutionDate,
          performedById: professionalId,
          createdById: userId,
          updatedById: userId,
        })),
      });
    }
    await tx.treatment.update({
      where: { id: treatmentId },
      data: {
        status: cumulativeProgress === 100 ? TreatmentStatus.TERMINADO : TreatmentStatus.EN_CURSO,
        endDate: cumulativeProgress === 100 ? new Date() : null,
        updatedById: userId,
      },
    });
  });
  revalidatePath("/tratamientos");
  revalidatePath(`/pacientes/${treatment.patientId}`);
}
