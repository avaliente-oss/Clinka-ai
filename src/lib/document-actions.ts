"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DocumentType, Prisma, ProcedureStatus } from "@prisma/client";
import { z } from "zod";
import { getSessionUserId } from "./audit";
import { db } from "./db";
import { BLANK_FIELD, displayBalance, patientAge, type DocumentKind, type DocumentSnapshot } from "./documents";
import { addMoney, procedureNet, proceduresTotal, subtractMoney, sumMoney } from "./money";
import { activeWhere } from "./soft-delete";
import { dateMx, enumLabel, money } from "./utils";

export type DocumentActionState = { error?: string; success?: string; submissionId?: string; values?: Record<string, string> };

const fields = (form: FormData, names: string[]) => Object.fromEntries(names.map((name) => [name, String(form.get(name) ?? "")])) as Record<string, string>;
const message = (error: unknown) => error instanceof z.ZodError ? error.issues[0]?.message ?? "Revisa los datos." : error instanceof Error ? error.message : "No fue posible guardar.";
const fail = (error: unknown, values: Record<string, string>): DocumentActionState => ({ error: message(error), values, submissionId: crypto.randomUUID() });
const text = (form: FormData, name: string) => String(form.get(name) ?? "").trim();
function required(form: FormData, name: string) { const value = text(form, name); if (!value) throw new Error(`El campo ${name} es obligatorio.`); return value; }
function nullable(form: FormData, name: string) { return text(form, name) || null; }

export async function updateClinicDocumentState(_state: DocumentActionState, form: FormData): Promise<DocumentActionState> {
  const values = fields(form, ["name", "legalName", "rfc", "address", "phone", "email", "logoUrl", "documentFooter"]);
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    await db.clinic.update({ where: { id: clinic.id }, data: { name: required(form, "name"), legalName: nullable(form, "legalName"), rfc: nullable(form, "rfc"), address: nullable(form, "address"), phone: nullable(form, "phone"), email: nullable(form, "email"), logoUrl: nullable(form, "logoUrl"), documentFooter: nullable(form, "documentFooter") } });
    revalidatePath("/configuracion");
    return { success: "Datos de la clínica actualizados.", submissionId: crypto.randomUUID() };
  } catch (error) { return fail(error, values); }
}

export async function updateProfessionalDocumentState(_state: DocumentActionState, form: FormData): Promise<DocumentActionState> {
  const values = fields(form, ["id", "licenseNumber", "specialtyLicense", "university"]);
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    const id = required(form, "id");
    await db.professional.findFirstOrThrow({ where: { id, clinicId: clinic.id } });
    await db.professional.update({ where: { id }, data: { licenseNumber: nullable(form, "licenseNumber"), specialtyLicense: nullable(form, "specialtyLicense"), university: nullable(form, "university") } });
    revalidatePath("/configuracion");
    return { success: "Datos profesionales actualizados.", submissionId: crypto.randomUUID() };
  } catch (error) { return fail(error, values); }
}

const templateFields = ["id", "type", "name", "title", "body", "isDefault"];
export async function saveTemplateState(_state: DocumentActionState, form: FormData): Promise<DocumentActionState> {
  const values = fields(form, templateFields);
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    const id = text(form, "id");
    const type = z.nativeEnum(DocumentType).parse(required(form, "type"));
    const data = { type, name: required(form, "name"), title: required(form, "title"), body: required(form, "body"), isDefault: form.get("isDefault") === "on" };
    await db.$transaction(async (tx) => {
      if (data.isDefault) await tx.documentTemplate.updateMany({ where: activeWhere({ clinicId: clinic.id, type }), data: { isDefault: false } });
      if (id) {
        await tx.documentTemplate.findFirstOrThrow({ where: activeWhere({ id, clinicId: clinic.id }) });
        await tx.documentTemplate.update({ where: { id }, data });
      } else await tx.documentTemplate.create({ data: { clinicId: clinic.id, ...data } });
    });
    revalidatePath("/configuracion");
    return { success: id ? "Plantilla actualizada." : "Plantilla creada.", submissionId: crypto.randomUUID() };
  } catch (error) { return fail(error, values); }
}

export async function duplicateTemplateState(_state: DocumentActionState, form: FormData): Promise<DocumentActionState> {
  const id = text(form, "id");
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    const source = await db.documentTemplate.findFirstOrThrow({ where: activeWhere({ id, clinicId: clinic.id }) });
    await db.documentTemplate.create({ data: { clinicId: clinic.id, type: source.type, name: `${source.name} (copia)`, title: source.title, body: source.body, isDefault: false } });
    revalidatePath("/configuracion");
    return { success: "Plantilla duplicada." };
  } catch (error) { return fail(error, { id }); }
}

export async function deleteTemplateState(_state: DocumentActionState, form: FormData): Promise<DocumentActionState> {
  const id = text(form, "id");
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    await db.$transaction(async (tx) => {
      const current = await tx.documentTemplate.findFirstOrThrow({ where: activeWhere({ id, clinicId: clinic.id }) });
      await tx.documentTemplate.update({ where: { id }, data: { deletedAt: new Date(), isDefault: false } });
      if (current.isDefault) {
        const replacement = await tx.documentTemplate.findFirst({ where: activeWhere({ clinicId: clinic.id, type: current.type, id: { not: id } }), orderBy: { createdAt: "asc" } });
        if (replacement) await tx.documentTemplate.update({ where: { id: replacement.id }, data: { isDefault: true } });
      }
    });
    revalidatePath("/configuracion");
    return { success: "Plantilla eliminada." };
  } catch (error) { return fail(error, { id }); }
}

export async function setDefaultTemplateState(_state: DocumentActionState, form: FormData): Promise<DocumentActionState> {
  const id = text(form, "id");
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    const current = await db.documentTemplate.findFirstOrThrow({ where: activeWhere({ id, clinicId: clinic.id }) });
    await db.$transaction([db.documentTemplate.updateMany({ where: activeWhere({ clinicId: clinic.id, type: current.type }), data: { isDefault: false } }), db.documentTemplate.update({ where: { id }, data: { isDefault: true } })]);
    revalidatePath("/configuracion");
    return { success: "Plantilla predeterminada actualizada." };
  } catch (error) { return fail(error, { id }); }
}

const prescriptionItems = z.array(z.object({ medication: z.string().trim().min(1, "Captura el medicamento."), dose: z.string().trim().min(1, "Captura la dosis."), frequency: z.string().trim().min(1, "Captura la frecuencia."), duration: z.string().trim().min(1, "Captura la duración."), instructions: z.string().trim().optional().default("") })).min(1, "Agrega al menos un medicamento.");

export async function issueDocumentState(_state: DocumentActionState, form: FormData): Promise<DocumentActionState> {
  const values = fields(form, ["patientId", "type", "templateId", "treatmentId", "professionalId", "diagnosis", "notes", "items", "prescriptionId"]);
  let issuedId: string;
  try {
    const userId = await getSessionUserId();
    const patientId = required(form, "patientId");
    const type = z.nativeEnum(DocumentType).parse(required(form, "type"));
    const [clinic, patient] = await Promise.all([
      db.clinic.findFirstOrThrow(),
      db.patient.findFirstOrThrow({ where: activeWhere({ id: patientId }), include: { treatments: { where: activeWhere(), include: { procedures: true, payments: true } }, payments: true } }),
    ]);
    if (patient.clinicId !== clinic.id) throw new Error("El paciente no pertenece a la clínica.");
    const templateId = text(form, "templateId");
    const template = templateId
      ? await db.documentTemplate.findFirstOrThrow({ where: activeWhere({ id: templateId, clinicId: clinic.id, type }) })
      : await db.documentTemplate.findFirstOrThrow({ where: activeWhere({ clinicId: clinic.id, type, isDefault: true }) });
    const treatmentId = text(form, "treatmentId");
    const treatment = treatmentId ? patient.treatments.find((item) => item.id === treatmentId) : undefined;
    if (treatmentId && !treatment) throw new Error("El tratamiento seleccionado no está disponible.");
    let professionalId = text(form, "professionalId") || treatment?.responsibleProfessionalId || "";
    const existingPrescription = text(form, "prescriptionId") ? await db.prescription.findFirst({ where: activeWhere({ id: text(form, "prescriptionId"), patientId }), include: { items: { orderBy: { order: "asc" } }, professional: true } }) : null;
    if (existingPrescription) professionalId = existingPrescription.professionalId;
    const professional = professionalId ? await db.professional.findFirstOrThrow({ where: { id: professionalId, clinicId: clinic.id } }) : null;
    const now = new Date();
    const patientName = `${patient.firstName} ${patient.lastName}`;
    const valuesMap: Record<string, string> = { "clinica.nombre": clinic.name, "clinica.direccion": clinic.address ?? "", "clinica.telefono": clinic.phone ?? "", "paciente.nombre": patientName, "paciente.edad": patientAge(patient.birthDate, now), "paciente.fechaNacimiento": dateMx(patient.birthDate), "profesional.nombre": professional?.name ?? "", "profesional.cedula": professional?.licenseNumber ?? "", fecha: dateMx(now), "tratamiento.nombre": treatment?.title ?? "", "tratamiento.diagnostico": treatment?.diagnosis ?? "", "tratamiento.piezas": [...new Set((treatment?.procedures ?? []).map((procedure) => procedure.tooth).filter((tooth): tooth is string => Boolean(tooth)))].join(", ") || BLANK_FIELD };
    const blocks: DocumentSnapshot["blocks"] = { signatures: { patient: patientName, professional: professional?.name ?? "Profesional" } };
    if (type === DocumentType.PRESUPUESTO) {
      if (!treatment) throw new Error("Selecciona un tratamiento para el presupuesto.");
      const planned = proceduresTotal(treatment.procedures);
      const realized = proceduresTotal(treatment.procedures.filter((item) => item.status === ProcedureStatus.REALIZADA));
      const paid = sumMoney(treatment.payments, (item) => item.amount);
      blocks.procedures = { rows: treatment.procedures.map((item) => ({ name: item.name, details: [item.tooth ? `Pieza ${item.tooth}` : "", item.surfaces.length ? item.surfaces.map((surface) => enumLabel[surface]).join(", ") : ""].filter(Boolean).join(" · "), quantity: String(item.quantity), price: money(item.price), discount: money(item.discount), net: money(procedureNet(item)) })), planned: money(planned), realized: money(realized), paid: money(paid), balance: displayBalance(subtractMoney(realized, paid), money) };
      valuesMap.total = money(planned);
    }
    if (type === DocumentType.ESTADO_CUENTA) {
      const realized = patient.treatments.reduce((sum, item) => sum.plus(proceduresTotal(item.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA))), addMoney());
      const paid = sumMoney(patient.payments, (item) => item.amount);
      blocks.statement = { treatments: patient.treatments.map((item) => { const done = item.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA); return { name: item.title, procedures: done.map((procedure) => `${procedure.name}${procedure.quantity > 1 ? ` × ${procedure.quantity}` : ""}`).join(", "), realized: money(proceduresTotal(done)) }; }).filter((item) => item.procedures), payments: patient.payments.map((item) => ({ date: dateMx(item.date), method: enumLabel[item.method], reference: item.reference ?? "", amount: money(item.amount) })), realized: money(realized), paid: money(paid), balance: displayBalance(subtractMoney(realized, paid), money) };
      valuesMap.periodo = `Al ${dateMx(now)}`;
      valuesMap.total_realizado = money(realized);
      valuesMap.pagos = money(paid);
      valuesMap.saldo = displayBalance(subtractMoney(realized, paid), money);
    }
    let prescriptionId: string | null = existingPrescription?.id ?? null;
    let parsedItems = existingPrescription?.items.map((item) => ({ medication: item.medication, dose: item.dose, frequency: item.frequency, duration: item.duration, instructions: item.instructions ?? "" })) ?? [];
    const diagnosis = existingPrescription?.diagnosis ?? text(form, "diagnosis");
    const notes = existingPrescription?.notes ?? text(form, "notes");
    if (type === DocumentType.RECETA && !existingPrescription) {
      if (!professional) throw new Error("Selecciona al profesional que prescribe.");
      parsedItems = prescriptionItems.parse(JSON.parse(required(form, "items")) as unknown);
    }
    if (type === DocumentType.RECETA) {
      blocks.prescription = { diagnosis, notes, items: parsedItems };
      valuesMap["tratamiento.diagnostico"] = diagnosis;
      valuesMap.diagnostico = diagnosis;
      valuesMap.notas = notes;
    }
    const snapshot: DocumentSnapshot = { version: 1, type: type as DocumentKind, title: template.title, body: template.body, values: valuesMap, clinic: { name: clinic.name, legalName: clinic.legalName ?? "", rfc: clinic.rfc ?? "", address: clinic.address ?? "", phone: clinic.phone ?? "", logoUrl: clinic.logoUrl ?? "", footer: clinic.documentFooter ?? "" }, patient: { name: patientName, age: patientAge(patient.birthDate, now), birthDate: dateMx(patient.birthDate) }, ...(professional ? { professional: { name: professional.name, license: professional.licenseNumber ?? "" } } : {}), issuedAt: now.toISOString(), blocks };
    issuedId = await db.$transaction(async (tx) => {
      if (type === DocumentType.RECETA && !existingPrescription) {
        const created = await tx.prescription.create({ data: { patientId, professionalId: professional!.id, diagnosis: diagnosis || null, notes: notes || null, createdById: userId, updatedById: userId, items: { create: parsedItems.map((item, index) => ({ ...item, instructions: item.instructions || null, order: index + 1 })) } } });
        prescriptionId = created.id;
      }
      const issued = await tx.issuedDocument.create({ data: { clinicId: clinic.id, patientId, type, templateId: template.id, treatmentId: treatment?.id ?? null, prescriptionId, title: template.title, snapshot: snapshot as unknown as Prisma.InputJsonValue, createdById: userId } });
      return issued.id;
    });
    revalidatePath(`/pacientes/${patientId}`);
  } catch (error) { return fail(error, values); }
  redirect(`/documentos/${issuedId}`);
}
