import {
  AppointmentStatus,
  BlockRecurrence,
  DentalSurface,
  DocumentType,
  Gender,
  OdontogramCondition,
  PatientType,
  PaymentMethod,
  Prisma,
  PrismaClient,
  ProcedureStatus,
  ReminderType,
  TreatmentStatus,
} from "@prisma/client";
import { decimal, proceduresTotal } from "../src/lib/money";

const db = new PrismaClient();

const firstNames = [
  "Sofía",
  "Mateo",
  "Valentina",
  "Santiago",
  "Regina",
  "Sebastián",
  "Camila",
  "Leonardo",
  "Ximena",
  "Emiliano",
  "Mariana",
  "Diego",
  "Renata",
  "Daniel",
  "Luciana",
  "Alejandro",
  "Natalia",
  "Gael",
  "Fernanda",
  "Rodrigo",
  "Elena",
  "Jorge",
  "Paula",
  "Miguel",
  "Andrea",
];

const lastNames = [
  "Hernández",
  "García",
  "Martínez",
  "López",
  "González",
  "Pérez",
  "Rodríguez",
  "Sánchez",
];

type DemoProcedure = {
  name: string;
  price: number;
  tooth?: string;
  surfaces?: DentalSurface[];
  discount?: number;
};

type DemoTreatment = {
  patientType: "DENTAL" | "MEDICO";
  title: string;
  diagnosis: string;
  status: TreatmentStatus;
  progress: number[];
  procedures: DemoProcedure[];
  performedBySession: number[][];
};

const clinicalDemo: DemoTreatment[] = [
  {
    patientType: "DENTAL",
    title: "Ortodoncia",
    diagnosis: "Maloclusión dental con apiñamiento anterior.",
    status: TreatmentStatus.EN_CURSO,
    progress: [10, 20, 35],
    procedures: [
      { name: "Limpieza dental", price: 850 },
      { name: "Resina", tooth: "36", surfaces: ["O", "M"], price: 1_200, discount: 150 },
      { name: "Control de ortodoncia", price: 900 },
      { name: "Ajuste de aparatología", price: 900 },
    ],
    performedBySession: [[0, 1], [2], []],
  },
  {
    patientType: "DENTAL",
    title: "Endodoncia pieza 46",
    diagnosis: "Pulpitis irreversible sintomática en pieza 46.",
    status: TreatmentStatus.TERMINADO,
    progress: [50, 100],
    procedures: [
      { name: "Endodoncia", tooth: "46", price: 4_500 },
      { name: "Resina", tooth: "46", surfaces: ["O", "D"], price: 1_200 },
    ],
    performedBySession: [[0], [1]],
  },
  {
    patientType: "DENTAL",
    title: "Limpieza y resinas",
    diagnosis: "Gingivitis leve y lesiones cariosas oclusales.",
    status: TreatmentStatus.EN_CURSO,
    progress: [30, 70],
    procedures: [
      { name: "Limpieza dental", price: 850 },
      { name: "Resina", tooth: "16", surfaces: ["O", "M"], price: 1_200 },
      { name: "Resina", tooth: "26", surfaces: ["O"], price: 1_200 },
    ],
    performedBySession: [[0], [1]],
  },
  {
    patientType: "DENTAL",
    title: "Rehabilitación integral",
    diagnosis: "Pérdida de estructura dental; pendiente de aceptación clínica.",
    status: TreatmentStatus.PLANIFICADO,
    progress: [],
    procedures: [
      { name: "Consulta de valoración", price: 650 },
      { name: "Corona de zirconia", tooth: "11", price: 7_800 },
    ],
    performedBySession: [],
  },
  {
    patientType: "MEDICO",
    title: "Control de hipertensión",
    diagnosis: "Hipertensión arterial sistémica controlada.",
    status: TreatmentStatus.EN_CURSO,
    progress: [25, 60],
    procedures: [
      { name: "Consulta de valoración", price: 650 },
      { name: "Consulta de seguimiento", price: 650 },
      { name: "Consulta de seguimiento", price: 650 },
    ],
    performedBySession: [[0], [1]],
  },
  {
    patientType: "MEDICO",
    title: "Seguimiento metabólico",
    diagnosis: "Vigilancia de glucosa y hábitos; pendiente de inicio.",
    status: TreatmentStatus.PLANIFICADO,
    progress: [],
    procedures: [
      { name: "Consulta de valoración", price: 650 },
      { name: "Consulta de seguimiento", price: 650 },
    ],
    performedBySession: [],
  },
];

function demoDate(daysAgo: number) {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysAgo, 12));
}

function calendarDate(year: number, month: number, day: number) {
  return new Date(Date.UTC(year, month, day, 12));
}

async function createClinicalDemo(clinicId: string, client: Prisma.TransactionClient) {
  const [patients, professionals, prices, user] = await Promise.all([
    client.patient.findMany({ where: { clinicId }, orderBy: { createdAt: "asc" } }),
    client.professional.findMany({ where: { clinicId }, orderBy: { name: "asc" } }),
    client.priceItem.findMany({ where: { clinicId } }),
    client.user.findFirstOrThrow({ where: { clinicId }, orderBy: { createdAt: "asc" } }),
  ]);
  const dentalProfessional = professionals.find((professional) =>
    professional.specialty.toLocaleLowerCase("es-MX").includes("odont"),
  );
  const medicalProfessional = professionals.find((professional) =>
    professional.specialty.toLocaleLowerCase("es-MX").includes("medicina"),
  );
  if (!dentalProfessional || !medicalProfessional) {
    throw new Error("La demo requiere profesionales de odontología y medicina general.");
  }

  const patientsByType = {
    DENTAL: patients.filter((patient) => patient.type === PatientType.DENTAL),
    MEDICO: patients.filter((patient) => patient.type === PatientType.MEDICO),
  };
  const patientCursor = { DENTAL: 0, MEDICO: 0 };

  for (let index = 0; index < clinicalDemo.length; index += 1) {
    const blueprint = clinicalDemo[index];
    const typedPatients = patientsByType[blueprint.patientType];
    const patient = typedPatients[patientCursor[blueprint.patientType]++];
    if (!patient) throw new Error(`No hay pacientes ${blueprint.patientType} suficientes para la demo.`);
    if (blueprint.status === TreatmentStatus.TERMINADO && blueprint.progress.at(-1) !== 100) {
      throw new Error(`El tratamiento terminado ${blueprint.title} debe concluir al 100%.`);
    }
    if (blueprint.status === TreatmentStatus.PLANIFICADO && blueprint.progress.length) {
      throw new Error(`El tratamiento planificado ${blueprint.title} no debe tener evoluciones.`);
    }

    const professional = blueprint.patientType === "DENTAL" ? dentalProfessional : medicalProfessional;
    const treatment = await client.treatment.create({
      data: {
        clinicId,
        patientId: patient.id,
        responsibleProfessionalId: professional.id,
        title: blueprint.title,
        diagnosis: blueprint.diagnosis,
        status: blueprint.status,
        startDate: demoDate(90 - index * 5),
        notes: "Ejemplo clínico demo revisado y asignado al profesional responsable.",
        createdById: user.id,
        updatedById: user.id,
      },
    });
    const procedures: { id: string }[] = [];
    for (const procedure of blueprint.procedures) {
      procedures.push(
        await client.procedure.create({
          data: {
            treatmentId: treatment.id,
            ...procedure,
            quantity: 1,
            priceItemId: prices.find((price) => price.name === procedure.name)?.id,
            createdById: user.id,
            updatedById: user.id,
          },
        }),
      );
    }

    let finalEvolutionDate: Date | null = null;
    for (let sessionIndex = 0; sessionIndex < blueprint.progress.length; sessionIndex += 1) {
      const evolutionDate = demoDate((blueprint.progress.length - sessionIndex) * 14);
      finalEvolutionDate = evolutionDate;
      const evolution = await client.evolution.create({
        data: {
          treatmentId: treatment.id,
          professionalId: professional.id,
          date: evolutionDate,
          cumulativeProgress: blueprint.progress[sessionIndex],
          clinicalNotes:
            blueprint.patientType === "DENTAL"
              ? sessionIndex === 0
                ? "Valoración clínica y procedimientos programados realizados sin complicaciones."
                : "Seguimiento favorable; tejidos estables y buena tolerancia al tratamiento."
              : "Control clínico con signos vitales estables, buena respuesta al manejo y sin datos de alarma.",
          nextSteps:
            blueprint.progress[sessionIndex] === 100
              ? "Alta del tratamiento y control preventivo."
              : "Continuar el plan y reevaluar en la siguiente consulta.",
          createdById: user.id,
          updatedById: user.id,
        },
      });
      const procedureIds = blueprint.performedBySession[sessionIndex].map(
        (procedureIndex) => procedures[procedureIndex].id,
      );
      if (procedureIds.length) {
        await client.procedure.updateMany({
          where: { id: { in: procedureIds } },
          data: {
            status: ProcedureStatus.REALIZADA,
            evolutionId: evolution.id,
            performedAt: evolutionDate,
            performedById: professional.id,
            updatedById: user.id,
          },
        });
      }
    }
    if (blueprint.status === TreatmentStatus.TERMINADO) {
      await client.treatment.update({
        where: { id: treatment.id },
        data: { endDate: finalEvolutionDate },
      });
    }

    const plannedTotal = proceduresTotal(blueprint.procedures.map((procedure) => ({ ...procedure, quantity: 1 })));
    const paymentData = {
      treatmentId: treatment.id,
      amount: Prisma.Decimal.min(plannedTotal, decimal(650 + index * 150)),
      method: index % 2 ? PaymentMethod.TARJETA : PaymentMethod.TRANSFERENCIA,
      reference: `PAGO-${1_000 + index}`,
      date: new Date(),
      createdById: user.id,
      updatedById: user.id,
    };
    const reusablePayment = await client.payment.findFirst({
      where: { clinicId, patientId: patient.id, treatmentId: null },
      orderBy: { date: "asc" },
    });
    if (reusablePayment) {
      await client.payment.update({
        where: { id: reusablePayment.id },
        data: paymentData,
      });
    } else {
      await client.payment.create({
        data: {
          clinicId,
          patientId: patient.id,
          ...paymentData,
        },
      });
    }
  }
}

async function ensureParityExamples(clinicId: string) {
  const missingMetadata = await db.procedure.findMany({
    where: {
      treatment: { clinicId },
      status: ProcedureStatus.REALIZADA,
      OR: [{ performedAt: null }, { performedById: null }],
    },
    include: { evolution: true },
  });
  for (const procedure of missingMetadata) {
    if (!procedure.evolution) continue;
    await db.procedure.update({
      where: { id: procedure.id },
      data: {
        performedAt: procedure.performedAt ?? procedure.evolution.date,
        performedById: procedure.performedById ?? procedure.evolution.professionalId,
      },
    });
  }

  const discountExample = await db.procedure.findFirst({
    where: {
      treatment: { clinicId, title: "Ortodoncia" },
      name: "Resina",
      tooth: "36",
      discount: decimal(0),
    },
  });
  if (discountExample) {
    await db.procedure.update({
      where: { id: discountExample.id },
      data: {
        discount: 150,
        surfaces: discountExample.surfaces.includes("M")
          ? discountExample.surfaces
          : [...discountExample.surfaces, "M"],
      },
    });
  }

  const appointmentStatuses = [AppointmentStatus.RECORDATORIO_ENVIADO, AppointmentStatus.REPROGRAMADA];
  const missingStatuses: AppointmentStatus[] = [];
  for (const status of appointmentStatuses) {
    if ((await db.appointment.count({ where: { clinicId, status } })) === 0) {
      missingStatuses.push(status);
    }
  }
  const scheduledAppointments = await db.appointment.findMany({
    where: { clinicId, status: AppointmentStatus.AGENDADA },
    orderBy: { start: "asc" },
    take: missingStatuses.length,
  });
  for (let index = 0; index < scheduledAppointments.length; index += 1) {
    await db.appointment.update({
      where: { id: scheduledAppointments[index].id },
      data: { status: missingStatuses[index] },
    });
  }

  const debtExample = await db.treatment.findFirst({
    where: { clinicId, title: "Ortodoncia" },
    include: { procedures: true, payments: true },
  });
  if (debtExample && debtExample.payments.length === 0) {
    const realized = debtExample.procedures
      .filter((procedure) => procedure.status === ProcedureStatus.REALIZADA);
    const realizedTotal = proceduresTotal(realized);
    if (realizedTotal.isPositive()) {
      const user = await db.user.findFirstOrThrow({ where: { clinicId }, orderBy: { createdAt: "asc" } });
      await db.payment.create({
        data: {
          clinicId,
          patientId: debtExample.patientId,
          treatmentId: debtExample.id,
          amount: Prisma.Decimal.max(decimal(1), realizedTotal.div(2).toDecimalPlaces(2)),
          method: PaymentMethod.TRANSFERENCIA,
          reference: "PAGO-DEUDA-DEMO",
          createdById: user.id,
          updatedById: user.id,
        },
      });
    }
  }
}

const suppliesDemo = [
  { name: "Resina compuesta universal", category: "Restauración", unit: "jeringa", sku: "RES-UNI-A2", stock: "8.000", minStock: "3.000", unitCost: "620.00" },
  { name: "Ácido grabador 37%", category: "Restauración", unit: "jeringa", sku: "ACI-37", stock: "2.000", minStock: "3.000", unitCost: "145.00" },
  { name: "Adhesivo dental", category: "Restauración", unit: "frasco", sku: "ADH-5G", stock: "4.000", minStock: "2.000", unitCost: "890.00" },
  { name: "Puntas aplicadoras", category: "Consumibles", unit: "caja", sku: "PUN-MICRO", stock: "6.000", minStock: "2.000", unitCost: "180.00" },
  { name: "Pasta profiláctica", category: "Profilaxis", unit: "tubo", sku: "PAS-PRO", stock: "1.000", minStock: "3.000", unitCost: "210.00" },
  { name: "Cepillo profiláctico", category: "Profilaxis", unit: "pieza", sku: "CEP-PRO", stock: "18.000", minStock: "10.000", unitCost: "18.50" },
  { name: "Guantes de nitrilo", category: "Protección", unit: "caja", sku: "GUA-NIT-M", stock: "7.000", minStock: "4.000", unitCost: "235.00" },
  { name: "Cubrebocas tricapa", category: "Protección", unit: "caja", sku: "CUB-3C", stock: "3.000", minStock: "4.000", unitCost: "120.00" },
  { name: "Anestésico con epinefrina", category: "Anestesia", unit: "caja", sku: "ANE-EPI", stock: "5.000", minStock: "2.000", unitCost: "780.00" },
  { name: "Aguja dental corta", category: "Anestesia", unit: "caja", sku: "AGU-COR", stock: "4.000", minStock: "2.000", unitCost: "290.00" },
  { name: "Gasas estériles", category: "Curación", unit: "caja", sku: "GAS-EST", stock: "12.000", minStock: "5.000", unitCost: "165.00" },
  { name: "Rollos de algodón", category: "Consumibles", unit: "bolsa", sku: "ALG-ROL", stock: "10.000", minStock: "4.000", unitCost: "95.00" },
  { name: "Hipoclorito de sodio dental", category: "Endodoncia", unit: "frasco", sku: "HIPO-ENDO", stock: "3.000", minStock: "2.000", unitCost: "190.00" },
] as const;

const templateDemo = [
  { type: DocumentType.PRESUPUESTO, name: "Presupuesto general", title: "Presupuesto de tratamiento", body: "Paciente: {{paciente}}\nFecha: {{fecha}}\n\nPor medio del presente se detallan los procedimientos propuestos, sus importes y condiciones de pago.\n\n{{procedimientos}}\n\nTotal: {{total}}\nVigencia: 30 días naturales." },
  { type: DocumentType.RECETA, name: "Receta general", title: "Receta médica", body: "Paciente: {{paciente}}\nFecha: {{fecha}}\nProfesional: {{profesional}} · Cédula: {{cedula}}\n\nDiagnóstico: {{diagnostico}}\n\n{{medicamentos}}\n\nIndicaciones: {{notas}}" },
  { type: DocumentType.CONSENTIMIENTO, name: "Consentimiento general", title: "Consentimiento informado", body: "PROCEDIMIENTO\nSe me ha explicado en lenguaje claro el procedimiento {{procedimiento}}, su finalidad y alcance.\n\nRIESGOS\nComprendo los riesgos previsibles, incluidas molestias, inflamación, infección, sangrado y la posible necesidad de atención adicional.\n\nALTERNATIVAS\nSe me informaron las alternativas razonables, incluida la opción de no realizar el procedimiento y sus posibles consecuencias.\n\nDECLARACIÓN\nDeclaro haber proporcionado información veraz, haber resuelto mis dudas y otorgar mi consentimiento libre y voluntario.\n\nFIRMAS\nPaciente o representante: ____________________\nProfesional: ____________________\nFecha: {{fecha}}" },
  { type: DocumentType.ESTADO_CUENTA, name: "Estado de cuenta general", title: "Estado de cuenta", body: "Paciente: {{paciente}}\nPeriodo: {{periodo}}\n\n{{movimientos}}\n\nTotal realizado: {{total_realizado}}\nPagos: {{pagos}}\nSaldo: {{saldo}}" },
] as const;

async function ensureStageOneDemo(clinicId: string) {
  const [clinic, professionals, user, patient] = await Promise.all([
    db.clinic.findUniqueOrThrow({ where: { id: clinicId } }),
    db.professional.findMany({ where: { clinicId }, orderBy: { name: "asc" } }),
    db.user.findFirstOrThrow({ where: { clinicId }, orderBy: { createdAt: "asc" } }),
    db.patient.findFirst({ where: { clinicId, deletedAt: null }, orderBy: { createdAt: "asc" } }),
  ]);

  const clinicUpdates = {
    ...(!clinic.legalName ? { legalName: "Clínica Horizonte, S.C." } : {}),
    ...(!clinic.address ? { address: "Av. Constitución 2450, Col. Obispado, Monterrey, N.L., C.P. 64060" } : {}),
    ...(!clinic.phone ? { phone: "+52 81 5555 1200" } : {}),
    ...(!clinic.email ? { email: "contacto@clinicahorizonte.mx" } : {}),
    ...(!clinic.rfc ? { rfc: "CHO241101AB3" } : {}),
    ...(!clinic.logoUrl ? { logoUrl: "/davalsy-mark.png" } : {}),
    ...(!clinic.documentFooter ? { documentFooter: "Documento emitido por Clínica Horizonte. La información clínica es confidencial." } : {}),
  };
  if (Object.keys(clinicUpdates).length) {
    await db.clinic.update({ where: { id: clinicId }, data: clinicUpdates });
  }

  for (let index = 0; index < professionals.length; index += 1) {
    const professional = professionals[index];
    const professionalUpdates = {
      ...(!professional.licenseNumber ? { licenseNumber: `12${String(345678 + index).padStart(6, "0")}` } : {}),
      ...(!professional.specialtyLicense && professional.specialty.toLocaleLowerCase("es-MX").includes("odont") ? { specialtyLicense: `AE-${202400 + index}` } : {}),
      ...(!professional.university ? { university: "Universidad Autónoma de Nuevo León" } : {}),
    };
    if (Object.keys(professionalUpdates).length) {
      await db.professional.update({ where: { id: professional.id }, data: professionalUpdates });
    }
  }

  const today = new Date();
  today.setHours(14, 0, 0, 0);
  for (const professional of professionals) {
    const lunch = await db.scheduleBlock.findFirst({ where: { clinicId, professionalId: professional.id, reason: "Comida", recurrence: BlockRecurrence.DAILY } });
    if (!lunch) {
      await db.scheduleBlock.create({ data: { clinicId, professionalId: professional.id, reason: "Comida", start: today, end: new Date(today.getTime() + 60 * 60_000), recurrence: BlockRecurrence.DAILY, createdById: user.id, updatedById: user.id } });
    }
  }

  const nextMonday = new Date(today);
  nextMonday.setDate(today.getDate() + ((8 - today.getDay()) % 7 || 7));
  nextMonday.setHours(0, 0, 0, 0);
  const dentist = professionals.find((item) => item.specialty.toLocaleLowerCase("es-MX").includes("odont")) ?? professionals[0];
  if (dentist && !(await db.scheduleBlock.findFirst({ where: { clinicId, professionalId: dentist.id, reason: "Congreso" } }))) {
    await db.scheduleBlock.create({ data: { clinicId, professionalId: dentist.id, reason: "Congreso", start: nextMonday, end: new Date(nextMonday.getTime() + 24 * 60 * 60_000), createdById: user.id, updatedById: user.id } });
  }
  if (!(await db.scheduleBlock.findFirst({ where: { clinicId, professionalId: null, reason: "Día inhábil" } }))) {
    const holiday = new Date(nextMonday);
    holiday.setDate(holiday.getDate() + 4);
    await db.scheduleBlock.create({ data: { clinicId, reason: "Día inhábil", start: holiday, end: new Date(holiday.getTime() + 24 * 60 * 60_000), createdById: user.id, updatedById: user.id } });
  }

  for (const item of suppliesDemo) {
    if (!(await db.supply.findFirst({ where: { clinicId, name: item.name } }))) {
      await db.supply.create({ data: { clinicId, ...item, stock: decimal(item.stock), minStock: decimal(item.minStock), unitCost: decimal(item.unitCost) } });
    }
  }
  const supplies = await db.supply.findMany({ where: { clinicId, deletedAt: null } });
  const prices = await db.priceItem.findMany({ where: { clinicId } });
  const recipes = [
    { price: "Resina", supplies: [["Resina compuesta universal", "0.200"], ["Ácido grabador 37%", "0.050"], ["Adhesivo dental", "0.050"], ["Puntas aplicadoras", "2.000"]] },
    { price: "Limpieza", supplies: [["Pasta profiláctica", "0.100"], ["Cepillo profiláctico", "1.000"]] },
  ] as const;
  for (const recipe of recipes) {
    const priceItem = prices.find((item) => item.name.toLocaleLowerCase("es-MX").includes(recipe.price.toLocaleLowerCase("es-MX")));
    if (!priceItem) continue;
    for (const [name, quantity] of recipe.supplies) {
      const supply = supplies.find((item) => item.name === name);
      if (!supply) continue;
      await db.priceItemSupply.upsert({ where: { priceItemId_supplyId: { priceItemId: priceItem.id, supplyId: supply.id } }, create: { priceItemId: priceItem.id, supplyId: supply.id, quantity: decimal(quantity) }, update: {} });
    }
  }

  for (const template of templateDemo) {
    if (!(await db.documentTemplate.findFirst({ where: { clinicId, type: template.type, name: template.name, deletedAt: null } }))) {
      const hasDefault = await db.documentTemplate.findFirst({ where: { clinicId, type: template.type, isDefault: true, deletedAt: null } });
      await db.documentTemplate.create({ data: { clinicId, ...template, isDefault: !hasDefault } });
    }
  }
  if (!(await db.documentTemplate.findFirst({ where: { clinicId, type: DocumentType.CONSENTIMIENTO, name: "Consentimiento para endodoncia", deletedAt: null } }))) {
    await db.documentTemplate.create({ data: { clinicId, type: DocumentType.CONSENTIMIENTO, name: "Consentimiento para endodoncia", title: "Consentimiento informado para tratamiento de endodoncia", body: "PROCEDIMIENTO\nSe realizará tratamiento de conductos en la pieza {{pieza}}.\n\nRIESGOS\nComprendo que pueden presentarse dolor, inflamación, fractura de instrumentos, perforación, persistencia de infección o necesidad de cirugía/extracción.\n\nALTERNATIVAS\nSe explicaron retratamiento, extracción, rehabilitación posterior y la opción de no tratar.\n\nDECLARACIÓN\nHe resuelto mis dudas y autorizo el procedimiento y las medidas clínicamente necesarias.\n\nFIRMAS\nPaciente o representante: ____________________\nProfesional: ____________________\nFecha: {{fecha}}", isDefault: false } });
  }

  if (patient && dentist && !(await db.prescription.findFirst({ where: { patientId: patient.id, notes: "Receta demostrativa", deletedAt: null } }))) {
    await db.prescription.create({ data: { patientId: patient.id, professionalId: dentist.id, diagnosis: "Dolor dental posterior a procedimiento restaurador", notes: "Receta demostrativa", createdById: user.id, updatedById: user.id, items: { create: [{ medication: "Paracetamol 500 mg", dose: "1 tableta", frequency: "Cada 8 horas", duration: "3 días", instructions: "Tomar después de alimentos. No exceder la dosis indicada.", order: 1 }] } } });
  }
}

async function main() {
  const existingClinic = await db.clinic.findFirst({ select: { id: true } });

  if (existingClinic) {
    await ensureStageOneDemo(existingClinic.id);
    console.log("La clínica existente recibió sólo los datos demo faltantes de agenda, inventario y documentos.");
    return;
  }

  const clinic = await db.clinic.create({
    data: {
      name: "Clínica Horizonte",
      users: {
        create: {
          name: "Dra. Ana López",
          email: "demo@clinika.mx",
          password: "demo123",
        },
      },
      professionals: {
        create: [
          {
            name: "Dra. Ana López",
            specialty: "Odontología general",
            color: "#0f9f94",
          },
          {
            name: "Dr. Carlos Rivera",
            specialty: "Medicina general",
            color: "#3b82f6",
          },
        ],
      },
      prices: {
        create: [
          { name: "Consulta de valoración", category: "Consulta", price: 650 },
          { name: "Limpieza dental", category: "Preventivo", price: 850 },
          { name: "Resina", category: "Restaurador", price: 1_200 },
          { name: "Endodoncia", category: "Especialidad", price: 4_500 },
          {
            name: "Corona de zirconia",
            category: "Prótesis",
            price: 7_800,
          },
          {
            name: "Extracción simple",
            category: "Cirugía",
            price: 1_600,
          },
        ],
      },
    },
  });

  const professionals = await db.professional.findMany({
    where: { clinicId: clinic.id },
  });
  const patients = [];

  for (let index = 0; index < firstNames.length; index += 1) {
    const firstName = firstNames[index];
    patients.push(
      await db.patient.create({
        data: {
          clinicId: clinic.id,
          firstName,
          lastName:
            lastNames[index % lastNames.length] +
            " " +
            lastNames[(index + 3) % lastNames.length],
          phone: "+52 81 5555 " + String(1_200 + index).padStart(4, "0"),
          email: firstName.toLowerCase() + index + "@correo.mx",
          birthDate: calendarDate(1970 + (index % 30), index % 12, 2 + (index % 25)),
          gender: index % 2 ? Gender.FEMENINO : Gender.MASCULINO,
          type: index % 4 === 0 ? PatientType.MEDICO : PatientType.DENTAL,
          allergies: index % 7 === 0 ? "Penicilina" : "Ninguna conocida",
          conditions:
            index % 5 === 0
              ? "Hipertensión controlada"
              : "Sin antecedentes relevantes",
        },
      }),
    );
  }

  const now = new Date();
  for (let index = 0; index < 38; index += 1) {
    const patient = patients[index % patients.length];
    const start = new Date(now);
    start.setDate(now.getDate() + (index < 24 ? index % 14 : -(index - 22)));
    const appointmentHour = 9 + (index % 8);
    start.setHours(appointmentHour >= 14 ? appointmentHour + 1 : appointmentHour, index % 2 ? 30 : 0, 0, 0);
    const reasons = [
      "Valoración y diagnóstico",
      "Limpieza / control",
      "Consulta general",
      "Seguimiento",
    ];
    const status =
      index < 24
        ? index % 3 === 0
          ? AppointmentStatus.CONFIRMADA
          : AppointmentStatus.AGENDADA
        : index % 7 === 0
          ? AppointmentStatus.NO_ASISTIO
          : AppointmentStatus.ATENDIDA;

    await db.appointment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        professionalId: professionals[index % professionals.length].id,
        start,
        duration: index % 3 === 0 ? 60 : 30,
        reason: reasons[index % reasons.length],
        status,
      },
    });
  }

  for (let index = 0; index < 10; index += 1) {
    const patient = patients[index];
    const seedUser = await db.user.findFirstOrThrow({ where: { clinicId: clinic.id } });
    await db.clinicalNote.create({
      data: {
        patientId: patient.id,
        professionalId: professionals.find((professional) =>
          patient.type === PatientType.MEDICO
            ? professional.specialty.includes("Medicina")
            : professional.specialty.includes("Odontología"),
        )!.id,
        subjective: "Paciente refiere molestia leve y sensibilidad.",
        objective: "Exploración clínica realizada; signos vitales estables.",
        assessment:
          index % 2 ? "Caries dental superficial" : "Control preventivo",
        plan: "Seguimiento en 7 días y continuar higiene.",
        diagnoses: index % 2 ? "K02.9" : "Z01.2",
        createdById: seedUser.id,
        updatedById: seedUser.id,
      },
    });
    if (patient.type === PatientType.DENTAL) {
      await db.odontogramFinding.create({
        data: {
          patientId: patient.id,
          tooth: 11 + index,
          surface: "O",
          condition: index % 2 ? OdontogramCondition.CARIES : OdontogramCondition.RESTAURACION,
          createdById: seedUser.id,
          updatedById: seedUser.id,
        },
      });
    }
  }

  for (let index = 0; index < 12; index += 1) {
    const patient = patients[index];
    const scheduledFor = new Date(now);
    scheduledFor.setDate(now.getDate() + (index % 7) + 1);
    const patientAppointments = await db.appointment.findMany({
      where: { patientId: patient.id },
    });
    const appointment = patientAppointments.sort(
      (left, right) =>
        Math.abs(left.start.getTime() - scheduledFor.getTime()) -
        Math.abs(right.start.getTime() - scheduledFor.getTime()),
    )[0];
    await db.reminder.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        type: index % 3 === 0 ? ReminderType.CONFIRMACION : ReminderType.RECORDATORIO,
        appointmentId: appointment?.id,
        scheduledFor,
        message:
          "Hola " +
          patient.firstName +
          " 👋 Te recordamos tu próxima cita en Clínica Horizonte. " +
          "¿Nos confirmas tu asistencia?",
      },
    });
  }

  await db.patientFile.create({
    data: {
      patientId: patients[0].id,
      name: "radiografia-panoramica.jpg",
      kind: "Radiografía",
      size: "2.4 MB",
    },
  });

  await db.$transaction((tx) => createClinicalDemo(clinic.id, tx), {
    timeout: 20_000,
  });
  await ensureParityExamples(clinic.id);
  await ensureStageOneDemo(clinic.id);

  console.log("Demo listo: demo@clinika.mx / demo123");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
