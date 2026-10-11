import { PrismaClient } from "@prisma/client";

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

async function clearDatabase() {
  await db.patientFile.deleteMany();
  await db.odontogramFinding.deleteMany();
  await db.clinicalNote.deleteMany();
  await db.treatmentItem.deleteMany();
  await db.treatmentPlan.deleteMany();
  await db.payment.deleteMany();
  await db.reminder.deleteMany();
  await db.appointment.deleteMany();
  await db.priceItem.deleteMany();
  await db.patient.deleteMany();
  await db.professional.deleteMany();
  await db.user.deleteMany();
  await db.clinic.deleteMany();
}

async function main() {
  await clearDatabase();

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

  const professionals = await db.professional.findMany();
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
          birthDate: new Date(1970 + (index % 30), index % 12, 2 + (index % 25)),
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
    const treatment = await db.treatmentPlan.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        title: index % 2 ? "Plan restaurador" : "Rehabilitación integral",
        status: ["PROPUESTO", "ACEPTADO", "EN_CURSO", "TERMINADO"][index % 4],
        total: 2_050 + index * 750,
        items: {
          create: [
            {
              description: "Consulta y diagnóstico",
              phase: 1,
              unitPrice: 650,
            },
            {
              description: index % 2 ? "Resina dental" : "Limpieza dental",
              tooth: index % 2 ? String(11 + index) : null,
              phase: 2,
              unitPrice: index % 2 ? 1_400 : 850,
            },
          ],
        },
      },
    });

    await db.payment.create({
      data: {
        clinicId: clinic.id,
        patientId: patient.id,
        amount: Math.min(treatment.total, 650 + index * 100),
        method: index % 2 ? "Tarjeta" : "Transferencia",
        reference: "PAGO-" + (1_000 + index),
      },
    });
    await db.clinicalNote.create({
      data: {
        patientId: patient.id,
        professionalId: professionals[index % professionals.length].id,
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
