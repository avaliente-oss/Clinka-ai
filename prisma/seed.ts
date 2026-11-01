import { Prisma, PrismaClient } from "@prisma/client";

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
  surface?: string;
};

type DemoTreatment = {
  patientType: "DENTAL" | "MEDICO";
  title: string;
  diagnosis: string;
  status: "PLANIFICADO" | "EN_CURSO" | "TERMINADO";
  progress: number[];
  procedures: DemoProcedure[];
  performedBySession: number[][];
};

const clinicalDemo: DemoTreatment[] = [
  {
    patientType: "DENTAL",
    title: "Ortodoncia",
    diagnosis: "Maloclusión dental con apiñamiento anterior.",
    status: "EN_CURSO",
    progress: [10, 20, 35],
    procedures: [
      { name: "Limpieza dental", price: 850 },
      { name: "Resina", tooth: "36", surface: "O", price: 1_200 },
      { name: "Control de ortodoncia", price: 900 },
      { name: "Ajuste de aparatología", price: 900 },
    ],
    performedBySession: [[0, 1], [2], []],
  },
  {
    patientType: "DENTAL",
    title: "Endodoncia pieza 46",
    diagnosis: "Pulpitis irreversible sintomática en pieza 46.",
    status: "TERMINADO",
    progress: [50, 100],
    procedures: [
      { name: "Endodoncia", tooth: "46", price: 4_500 },
      { name: "Resina", tooth: "46", surface: "O", price: 1_200 },
    ],
    performedBySession: [[0], [1]],
  },
  {
    patientType: "DENTAL",
    title: "Limpieza y resinas",
    diagnosis: "Gingivitis leve y lesiones cariosas oclusales.",
    status: "EN_CURSO",
    progress: [30, 70],
    procedures: [
      { name: "Limpieza dental", price: 850 },
      { name: "Resina", tooth: "16", surface: "O", price: 1_200 },
      { name: "Resina", tooth: "26", surface: "O", price: 1_200 },
    ],
    performedBySession: [[0], [1]],
  },
  {
    patientType: "DENTAL",
    title: "Rehabilitación integral",
    diagnosis: "Pérdida de estructura dental; pendiente de aceptación clínica.",
    status: "PLANIFICADO",
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
    status: "EN_CURSO",
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
    status: "PLANIFICADO",
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
  const [patients, professionals, prices] = await Promise.all([
    client.patient.findMany({ where: { clinicId }, orderBy: { createdAt: "asc" } }),
    client.professional.findMany({ where: { clinicId }, orderBy: { name: "asc" } }),
    client.priceItem.findMany({ where: { clinicId } }),
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
    DENTAL: patients.filter((patient) => patient.type === "DENTAL"),
    MEDICO: patients.filter((patient) => patient.type === "MEDICO"),
  };
  const patientCursor = { DENTAL: 0, MEDICO: 0 };

  for (let index = 0; index < clinicalDemo.length; index += 1) {
    const blueprint = clinicalDemo[index];
    const typedPatients = patientsByType[blueprint.patientType];
    const patient = typedPatients[patientCursor[blueprint.patientType]++];
    if (!patient) throw new Error(`No hay pacientes ${blueprint.patientType} suficientes para la demo.`);
    if (blueprint.status === "TERMINADO" && blueprint.progress.at(-1) !== 100) {
      throw new Error(`El tratamiento terminado ${blueprint.title} debe concluir al 100%.`);
    }
    if (blueprint.status === "PLANIFICADO" && blueprint.progress.length) {
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
        },
      });
      const procedureIds = blueprint.performedBySession[sessionIndex].map(
        (procedureIndex) => procedures[procedureIndex].id,
      );
      if (procedureIds.length) {
        await client.procedure.updateMany({
          where: { id: { in: procedureIds } },
          data: { status: "REALIZADA", evolutionId: evolution.id },
        });
      }
    }
    if (blueprint.status === "TERMINADO") {
      await client.treatment.update({
        where: { id: treatment.id },
        data: { endDate: finalEvolutionDate },
      });
    }

    const plannedTotal = blueprint.procedures.reduce((sum, procedure) => sum + procedure.price, 0);
    const paymentData = {
      treatmentId: treatment.id,
      amount: Math.min(plannedTotal, 650 + index * 150),
      method: index % 2 ? "Tarjeta" : "Transferencia",
      reference: `PAGO-${1_000 + index}`,
      date: new Date(),
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

async function main() {
  const existingClinic = await db.clinic.findFirst({ select: { id: true } });

  if (existingClinic) {
    const evolutionCount = await db.evolution.count({
      where: { treatment: { clinicId: existingClinic.id } },
    });
    if (evolutionCount === 0) {
      await db.$transaction(async (tx) => {
        await tx.payment.updateMany({
          where: { clinicId: existingClinic.id },
          data: { treatmentId: null },
        });
        await tx.treatment.deleteMany({ where: { clinicId: existingClinic.id } });
        await createClinicalDemo(existingClinic.id, tx);
      }, { timeout: 20_000 });
      console.log("Tratamientos legados reemplazados por la demo clínica consistente.");
    } else {
      console.log("La demo clínica ya contiene evoluciones; no se hicieron cambios.");
    }
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
          gender: index % 2 ? "Femenino" : "Masculino",
          type: index % 4 === 0 ? "MEDICO" : "DENTAL",
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
    start.setHours(9 + (index % 8), index % 2 ? 30 : 0, 0, 0);
    const reasons = [
      "Valoración y diagnóstico",
      "Limpieza / control",
      "Consulta general",
      "Seguimiento",
    ];
    const status =
      index < 24
        ? index % 3 === 0
          ? "CONFIRMADA"
          : "AGENDADA"
        : index % 7 === 0
          ? "NO_ASISTIO"
          : "ATENDIDA";

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
    await db.clinicalNote.create({
      data: {
        patientId: patient.id,
        professionalId: professionals.find((professional) =>
          patient.type === "MEDICO"
            ? professional.specialty.includes("Medicina")
            : professional.specialty.includes("Odontología"),
        )!.id,
        subjective: "Paciente refiere molestia leve y sensibilidad.",
        objective: "Exploración clínica realizada; signos vitales estables.",
        assessment:
          index % 2 ? "Caries dental superficial" : "Control preventivo",
        plan: "Seguimiento en 7 días y continuar higiene.",
        diagnoses: index % 2 ? "K02.9" : "Z01.2",
      },
    });
    if (patient.type === "DENTAL") {
      await db.odontogramFinding.create({
        data: {
          patientId: patient.id,
          tooth: 11 + index,
          surface: "O",
          condition: index % 2 ? "CARIES" : "RESTAURACION",
        },
      });
    }
  }

  for (let index = 0; index < 12; index += 1) {
    const patient = patients[index];
    const scheduledFor = new Date(now);
    scheduledFor.setDate(now.getDate() + (index % 7) + 1);
    await db.reminder.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        type: index % 3 === 0 ? "CONFIRMACION" : "RECORDATORIO",
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
