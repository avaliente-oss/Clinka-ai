-- CreateTable
CREATE TABLE "Treatment" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "diagnosis" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PLANIFICADO',
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "patientId" TEXT NOT NULL,
    "clinicId" TEXT NOT NULL,
    "responsibleProfessionalId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Treatment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evolution" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cumulativeProgress" INTEGER NOT NULL,
    "clinicalNotes" TEXT NOT NULL,
    "nextSteps" TEXT,
    "treatmentId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "appointmentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evolution_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_cumulativeProgress_check"
CHECK ("cumulativeProgress" BETWEEN 0 AND 100);

-- CreateTable
CREATE TABLE "Procedure" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tooth" TEXT,
    "surface" TEXT,
    "price" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PLANIFICADA',
    "treatmentId" TEXT NOT NULL,
    "evolutionId" TEXT,
    "priceItemId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Procedure_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN "treatmentId" TEXT;

-- Preserve every legacy plan. A clinic's first professional becomes responsible
-- because the former budget model did not store that clinical relationship.
INSERT INTO "Treatment" (
    "id", "title", "diagnosis", "status", "startDate", "endDate", "notes",
    "patientId", "clinicId", "responsibleProfessionalId", "createdAt", "updatedAt"
)
SELECT
    plan."id",
    plan."title",
    NULL,
    CASE plan."status"
      WHEN 'EN_CURSO' THEN 'EN_CURSO'
      WHEN 'TERMINADO' THEN 'TERMINADO'
      ELSE 'PLANIFICADO'
    END,
    plan."createdAt",
    CASE WHEN plan."status" = 'TERMINADO' THEN plan."createdAt" ELSE NULL END,
    NULL,
    plan."patientId",
    plan."clinicId",
    (SELECT professional."id" FROM "Professional" professional
      WHERE professional."clinicId" = plan."clinicId"
      ORDER BY professional."id" LIMIT 1),
    plan."createdAt",
    plan."createdAt"
FROM "TreatmentPlan" plan;

-- Preserve every legacy line as a planned procedure. Legacy phases are omitted:
-- ordering now comes from clinical evolutions rather than budget phases.
INSERT INTO "Procedure" (
    "id", "name", "tooth", "surface", "price", "quantity", "status",
    "treatmentId", "evolutionId", "priceItemId", "createdAt"
)
SELECT
    item."id", item."description", item."tooth", NULL, item."unitPrice",
    item."quantity", 'PLANIFICADA', item."planId", NULL, NULL, CURRENT_TIMESTAMP
FROM "TreatmentItem" item;

-- CreateIndex
CREATE INDEX "Evolution_treatmentId_date_idx" ON "Evolution"("treatmentId", "date");
CREATE INDEX "Procedure_treatmentId_status_idx" ON "Procedure"("treatmentId", "status");

-- AddForeignKey
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_responsibleProfessionalId_fkey" FOREIGN KEY ("responsibleProfessionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_evolutionId_fkey" FOREIGN KEY ("evolutionId") REFERENCES "Evolution"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_priceItemId_fkey" FOREIGN KEY ("priceItemId") REFERENCES "PriceItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- DropForeignKey / DropTable only after the copy has completed.
ALTER TABLE "TreatmentItem" DROP CONSTRAINT "TreatmentItem_planId_fkey";
ALTER TABLE "TreatmentPlan" DROP CONSTRAINT "TreatmentPlan_patientId_fkey";
ALTER TABLE "TreatmentPlan" DROP CONSTRAINT "TreatmentPlan_clinicId_fkey";
DROP TABLE "TreatmentItem";
DROP TABLE "TreatmentPlan";
