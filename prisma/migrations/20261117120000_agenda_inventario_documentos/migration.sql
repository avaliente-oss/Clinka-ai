-- CreateEnum
CREATE TYPE "BlockRecurrence" AS ENUM ('NONE', 'DAILY', 'WEEKLY');

-- CreateEnum
CREATE TYPE "SupplyMovementType" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE', 'CONSUMO');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('PRESUPUESTO', 'RECETA', 'CONSENTIMIENTO', 'ESTADO_CUENTA');

-- AlterTable
ALTER TABLE "Clinic" ADD COLUMN     "address" TEXT,
ADD COLUMN     "documentFooter" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "rfc" TEXT;

-- AlterTable
ALTER TABLE "Professional" ADD COLUMN     "licenseNumber" TEXT,
ADD COLUMN     "specialtyLicense" TEXT,
ADD COLUMN     "university" TEXT;

-- CreateTable
CREATE TABLE "ScheduleBlock" (
    "id" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "start" TIMESTAMP(3) NOT NULL,
    "end" TIMESTAMP(3) NOT NULL,
    "recurrence" "BlockRecurrence" NOT NULL DEFAULT 'NONE',
    "recurrenceUntil" TIMESTAMP(3),
    "clinicId" TEXT NOT NULL,
    "professionalId" TEXT,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ScheduleBlock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supply" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "sku" TEXT,
    "stock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "minStock" DECIMAL(12,3) NOT NULL DEFAULT 0,
    "unitCost" DECIMAL(12,2),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "clinicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Supply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplyMovement" (
    "id" TEXT NOT NULL,
    "type" "SupplyMovementType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "resultingStock" DECIMAL(12,3),
    "reason" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,
    "procedureId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupplyMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceItemSupply" (
    "id" TEXT NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "priceItemId" TEXT NOT NULL,
    "supplyId" TEXT NOT NULL,

    CONSTRAINT "PriceItemSupply_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentTemplate" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "clinicId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "DocumentTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescription" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "diagnosis" TEXT,
    "notes" TEXT,
    "patientId" TEXT NOT NULL,
    "professionalId" TEXT NOT NULL,
    "createdById" TEXT,
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Prescription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrescriptionItem" (
    "id" TEXT NOT NULL,
    "medication" TEXT NOT NULL,
    "dose" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "instructions" TEXT,
    "order" INTEGER NOT NULL,
    "prescriptionId" TEXT NOT NULL,

    CONSTRAINT "PrescriptionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IssuedDocument" (
    "id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "title" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "clinicId" TEXT NOT NULL,
    "patientId" TEXT NOT NULL,
    "templateId" TEXT,
    "treatmentId" TEXT,
    "prescriptionId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssuedDocument_pkey" PRIMARY KEY ("id")
);

-- Database-level business invariants not expressible in Prisma Schema Language.
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_end_after_start_check" CHECK ("end" > "start");
ALTER TABLE "SupplyMovement" ADD CONSTRAINT "SupplyMovement_quantity_nonzero_check" CHECK ("quantity" <> 0);
ALTER TABLE "PriceItemSupply" ADD CONSTRAINT "PriceItemSupply_quantity_positive_check" CHECK ("quantity" > 0);

-- CreateIndex
CREATE INDEX "ScheduleBlock_clinicId_start_idx" ON "ScheduleBlock"("clinicId", "start");

-- CreateIndex
CREATE INDEX "ScheduleBlock_professionalId_start_idx" ON "ScheduleBlock"("professionalId", "start");

-- CreateIndex
CREATE INDEX "ScheduleBlock_createdById_idx" ON "ScheduleBlock"("createdById");

-- CreateIndex
CREATE INDEX "ScheduleBlock_updatedById_idx" ON "ScheduleBlock"("updatedById");

-- CreateIndex
CREATE INDEX "Supply_clinicId_idx" ON "Supply"("clinicId");

-- CreateIndex
CREATE INDEX "Supply_clinicId_deletedAt_idx" ON "Supply"("clinicId", "deletedAt");

-- CreateIndex
CREATE INDEX "SupplyMovement_supplyId_createdAt_idx" ON "SupplyMovement"("supplyId", "createdAt");

-- CreateIndex
CREATE INDEX "SupplyMovement_procedureId_idx" ON "SupplyMovement"("procedureId");

-- CreateIndex
CREATE INDEX "SupplyMovement_createdById_idx" ON "SupplyMovement"("createdById");

-- CreateIndex
CREATE INDEX "PriceItemSupply_priceItemId_idx" ON "PriceItemSupply"("priceItemId");

-- CreateIndex
CREATE INDEX "PriceItemSupply_supplyId_idx" ON "PriceItemSupply"("supplyId");

-- CreateIndex
CREATE UNIQUE INDEX "PriceItemSupply_priceItemId_supplyId_key" ON "PriceItemSupply"("priceItemId", "supplyId");

-- CreateIndex
CREATE INDEX "DocumentTemplate_clinicId_type_idx" ON "DocumentTemplate"("clinicId", "type");

-- CreateIndex
CREATE INDEX "DocumentTemplate_clinicId_deletedAt_idx" ON "DocumentTemplate"("clinicId", "deletedAt");

-- CreateIndex
CREATE INDEX "Prescription_patientId_date_idx" ON "Prescription"("patientId", "date");

-- CreateIndex
CREATE INDEX "Prescription_professionalId_idx" ON "Prescription"("professionalId");

-- CreateIndex
CREATE INDEX "Prescription_createdById_idx" ON "Prescription"("createdById");

-- CreateIndex
CREATE INDEX "Prescription_updatedById_idx" ON "Prescription"("updatedById");

-- CreateIndex
CREATE INDEX "PrescriptionItem_prescriptionId_idx" ON "PrescriptionItem"("prescriptionId");

-- CreateIndex
CREATE INDEX "IssuedDocument_clinicId_createdAt_idx" ON "IssuedDocument"("clinicId", "createdAt");

-- CreateIndex
CREATE INDEX "IssuedDocument_patientId_createdAt_idx" ON "IssuedDocument"("patientId", "createdAt");

-- CreateIndex
CREATE INDEX "IssuedDocument_templateId_idx" ON "IssuedDocument"("templateId");

-- CreateIndex
CREATE INDEX "IssuedDocument_treatmentId_idx" ON "IssuedDocument"("treatmentId");

-- CreateIndex
CREATE INDEX "IssuedDocument_prescriptionId_idx" ON "IssuedDocument"("prescriptionId");

-- CreateIndex
CREATE INDEX "IssuedDocument_createdById_idx" ON "IssuedDocument"("createdById");

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduleBlock" ADD CONSTRAINT "ScheduleBlock_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Supply" ADD CONSTRAINT "Supply_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyMovement" ADD CONSTRAINT "SupplyMovement_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyMovement" ADD CONSTRAINT "SupplyMovement_procedureId_fkey" FOREIGN KEY ("procedureId") REFERENCES "Procedure"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplyMovement" ADD CONSTRAINT "SupplyMovement_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceItemSupply" ADD CONSTRAINT "PriceItemSupply_priceItemId_fkey" FOREIGN KEY ("priceItemId") REFERENCES "PriceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceItemSupply" ADD CONSTRAINT "PriceItemSupply_supplyId_fkey" FOREIGN KEY ("supplyId") REFERENCES "Supply"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentTemplate" ADD CONSTRAINT "DocumentTemplate_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_professionalId_fkey" FOREIGN KEY ("professionalId") REFERENCES "Professional"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescription" ADD CONSTRAINT "Prescription_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrescriptionItem" ADD CONSTRAINT "PrescriptionItem_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_clinicId_fkey" FOREIGN KEY ("clinicId") REFERENCES "Clinic"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_patientId_fkey" FOREIGN KEY ("patientId") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "DocumentTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
