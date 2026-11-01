-- Consolidated hardening migration from 20261101120000_tratamientos (b30ec39).
CREATE TYPE "AppointmentStatus" AS ENUM ('AGENDADA','CONFIRMADA','RECORDATORIO_ENVIADO','REPROGRAMADA','ATENDIDA','NO_ASISTIO','CANCELADA');
CREATE TYPE "TreatmentStatus" AS ENUM ('PLANIFICADO','EN_CURSO','TERMINADO','SUSPENDIDO');
CREATE TYPE "ProcedureStatus" AS ENUM ('PLANIFICADA','REALIZADA');
CREATE TYPE "ReminderStatus" AS ENUM ('PENDIENTE','ENVIADO','CANCELADO');
CREATE TYPE "ReminderType" AS ENUM ('CONFIRMACION','RECORDATORIO');
CREATE TYPE "PaymentMethod" AS ENUM ('EFECTIVO','TARJETA','TRANSFERENCIA');
CREATE TYPE "PatientType" AS ENUM ('DENTAL','MEDICO');
CREATE TYPE "Gender" AS ENUM ('FEMENINO','MASCULINO','NO_ESPECIFICADO');
CREATE TYPE "DentalSurface" AS ENUM ('O','M','D','V','L','P','L/P');
CREATE TYPE "OdontogramCondition" AS ENUM ('CARIES','RESTAURACION','EXTRACCION','ENDODONCIA','CORONA');

-- Normalize every legacy closed value before USING casts.
UPDATE "Appointment" SET "status"=CASE UPPER(TRIM("status")) WHEN 'CONFIRMADA' THEN 'CONFIRMADA' WHEN 'RECORDATORIO_ENVIADO' THEN 'RECORDATORIO_ENVIADO' WHEN 'REPROGRAMADA' THEN 'REPROGRAMADA' WHEN 'ATENDIDA' THEN 'ATENDIDA' WHEN 'NO_ASISTIO' THEN 'NO_ASISTIO' WHEN 'CANCELADA' THEN 'CANCELADA' ELSE 'AGENDADA' END;
ALTER TABLE "Appointment" ALTER "status" DROP DEFAULT, ALTER "status" TYPE "AppointmentStatus" USING "status"::"AppointmentStatus", ALTER "status" SET DEFAULT 'AGENDADA';
UPDATE "Treatment" SET "status"=CASE UPPER(TRIM("status")) WHEN 'EN_CURSO' THEN 'EN_CURSO' WHEN 'TERMINADO' THEN 'TERMINADO' WHEN 'SUSPENDIDO' THEN 'SUSPENDIDO' ELSE 'PLANIFICADO' END;
ALTER TABLE "Treatment" ALTER "status" DROP DEFAULT, ALTER "status" TYPE "TreatmentStatus" USING "status"::"TreatmentStatus", ALTER "status" SET DEFAULT 'PLANIFICADO';
UPDATE "Procedure" SET "status"=CASE UPPER(TRIM("status")) WHEN 'REALIZADA' THEN 'REALIZADA' ELSE 'PLANIFICADA' END;
ALTER TABLE "Procedure" ALTER "status" DROP DEFAULT, ALTER "status" TYPE "ProcedureStatus" USING "status"::"ProcedureStatus", ALTER "status" SET DEFAULT 'PLANIFICADA';
UPDATE "Reminder" SET "status"=CASE UPPER(TRIM("status")) WHEN 'ENVIADO' THEN 'ENVIADO' WHEN 'CANCELADO' THEN 'CANCELADO' ELSE 'PENDIENTE' END, "type"=CASE UPPER(TRIM("type")) WHEN 'CONFIRMACION' THEN 'CONFIRMACION' ELSE 'RECORDATORIO' END;
ALTER TABLE "Reminder" ALTER "status" DROP DEFAULT, ALTER "status" TYPE "ReminderStatus" USING "status"::"ReminderStatus", ALTER "status" SET DEFAULT 'PENDIENTE', ALTER "type" TYPE "ReminderType" USING "type"::"ReminderType";
UPDATE "Payment" SET "method"=CASE UPPER(TRIM("method")) WHEN 'TARJETA' THEN 'TARJETA' WHEN 'TRANSFERENCIA' THEN 'TRANSFERENCIA' ELSE 'EFECTIVO' END;
ALTER TABLE "Payment" ALTER "method" TYPE "PaymentMethod" USING "method"::"PaymentMethod";
UPDATE "Patient" SET "type"=CASE UPPER(TRIM("type")) WHEN 'MEDICO' THEN 'MEDICO' ELSE 'DENTAL' END, "gender"=CASE UPPER(TRIM("gender")) WHEN 'FEMENINO' THEN 'FEMENINO' WHEN 'MASCULINO' THEN 'MASCULINO' ELSE 'NO_ESPECIFICADO' END;
ALTER TABLE "Patient" ALTER "type" DROP DEFAULT, ALTER "type" TYPE "PatientType" USING "type"::"PatientType", ALTER "type" SET DEFAULT 'DENTAL', ALTER "gender" TYPE "Gender" USING "gender"::"Gender";
UPDATE "OdontogramFinding" SET "surface"=CASE UPPER(TRIM("surface")) WHEN 'M' THEN 'M' WHEN 'D' THEN 'D' WHEN 'V' THEN 'V' WHEN 'L' THEN 'L' WHEN 'P' THEN 'P' ELSE 'O' END, "condition"=CASE UPPER(TRIM("condition")) WHEN 'CARIES' THEN 'CARIES' WHEN 'EXTRACCION' THEN 'EXTRACCION' WHEN 'ENDODONCIA' THEN 'ENDODONCIA' WHEN 'CORONA' THEN 'CORONA' ELSE 'RESTAURACION' END;
ALTER TABLE "OdontogramFinding" ALTER "surface" TYPE "DentalSurface" USING "surface"::"DentalSurface", ALTER "condition" TYPE "OdontogramCondition" USING "condition"::"OdontogramCondition";

-- Procedure parity, exact money, and removal of the obsolete scalar surface.
ALTER TABLE "Procedure" ADD "surfaces" "DentalSurface"[] NOT NULL DEFAULT ARRAY[]::"DentalSurface"[], ADD "discount" DECIMAL(12,2) NOT NULL DEFAULT 0, ADD "performedAt" TIMESTAMP(3), ADD "performedById" TEXT;
UPDATE "Procedure" SET "surfaces"=ARRAY[CASE UPPER(TRIM("surface")) WHEN 'M' THEN 'M'::"DentalSurface" WHEN 'D' THEN 'D'::"DentalSurface" WHEN 'V' THEN 'V'::"DentalSurface" WHEN 'L' THEN 'L'::"DentalSurface" WHEN 'P' THEN 'P'::"DentalSurface" WHEN 'L/P' THEN 'L/P'::"DentalSurface" ELSE 'O'::"DentalSurface" END] WHERE "surface" IS NOT NULL AND TRIM("surface")<>'';
UPDATE "Procedure" p SET "performedAt"=e."date", "performedById"=e."professionalId" FROM "Evolution" e WHERE p."status"='REALIZADA' AND p."evolutionId"=e."id";
ALTER TABLE "Procedure" ALTER "price" TYPE DECIMAL(12,2) USING ROUND("price"::numeric,2), DROP "surface";
ALTER TABLE "Payment" ALTER "amount" TYPE DECIMAL(12,2) USING ROUND("amount"::numeric,2);
ALTER TABLE "PriceItem" ALTER "price" TYPE DECIMAL(12,2) USING ROUND("price"::numeric,2);

-- Timestamps, audit columns, soft deletes, and Reminder -> Appointment.
ALTER TABLE "Clinic" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Professional" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "Patient" ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "deletedAt" TIMESTAMP(3);
ALTER TABLE "Appointment" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ClinicalNote" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "deletedAt" TIMESTAMP(3), ADD "createdById" TEXT, ADD "updatedById" TEXT;
ALTER TABLE "OdontogramFinding" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "createdById" TEXT, ADD "updatedById" TEXT;
ALTER TABLE "Treatment" ADD "deletedAt" TIMESTAMP(3), ADD "createdById" TEXT, ADD "updatedById" TEXT;
ALTER TABLE "Evolution" ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "deletedAt" TIMESTAMP(3), ADD "createdById" TEXT, ADD "updatedById" TEXT;
ALTER TABLE "Procedure" ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "createdById" TEXT, ADD "updatedById" TEXT;
ALTER TABLE "Payment" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "createdById" TEXT, ADD "updatedById" TEXT;
ALTER TABLE "Reminder" ADD "appointmentId" TEXT, ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PatientFile" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PriceItem" ADD "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, ADD "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Attribute migrated clinical records to the first user in their clinic.
UPDATE "ClinicalNote" n SET "createdById"=u."id","updatedById"=u."id" FROM "Patient" p JOIN LATERAL (SELECT "id" FROM "User" WHERE "clinicId"=p."clinicId" ORDER BY "id" LIMIT 1) u ON TRUE WHERE n."patientId"=p."id";
UPDATE "OdontogramFinding" f SET "createdById"=u."id","updatedById"=u."id" FROM "Patient" p JOIN LATERAL (SELECT "id" FROM "User" WHERE "clinicId"=p."clinicId" ORDER BY "id" LIMIT 1) u ON TRUE WHERE f."patientId"=p."id";
UPDATE "Treatment" t SET "createdById"=(SELECT "id" FROM "User" WHERE "clinicId"=t."clinicId" ORDER BY "id" LIMIT 1),"updatedById"=(SELECT "id" FROM "User" WHERE "clinicId"=t."clinicId" ORDER BY "id" LIMIT 1);
UPDATE "Evolution" e SET "createdById"=u."id","updatedById"=u."id" FROM "Treatment" t JOIN LATERAL (SELECT "id" FROM "User" WHERE "clinicId"=t."clinicId" ORDER BY "id" LIMIT 1) u ON TRUE WHERE e."treatmentId"=t."id";
UPDATE "Procedure" p SET "createdById"=u."id","updatedById"=u."id" FROM "Treatment" t JOIN LATERAL (SELECT "id" FROM "User" WHERE "clinicId"=t."clinicId" ORDER BY "id" LIMIT 1) u ON TRUE WHERE p."treatmentId"=t."id";
UPDATE "Payment" p SET "createdById"=(SELECT "id" FROM "User" WHERE "clinicId"=p."clinicId" ORDER BY "id" LIMIT 1),"updatedById"=(SELECT "id" FROM "User" WHERE "clinicId"=p."clinicId" ORDER BY "id" LIMIT 1);

-- Link each reminder to the closest appointment of exactly the same patient.
UPDATE "Reminder" r SET "appointmentId"=(SELECT a."id" FROM "Appointment" a WHERE a."patientId"=r."patientId" ORDER BY ABS(EXTRACT(EPOCH FROM (a."start"-r."scheduledFor"))),a."start" LIMIT 1);

-- Normalize and then enforce clinical/financial invariants.
UPDATE "Procedure" SET "price"=GREATEST("price",0),"quantity"=GREATEST("quantity",1),"discount"=LEAST(GREATEST("discount",0),GREATEST("price",0)*GREATEST("quantity",1));
UPDATE "Payment" SET "amount"=0.01 WHERE "amount"<=0;
ALTER TABLE "Evolution" DROP CONSTRAINT IF EXISTS "Evolution_cumulativeProgress_check";
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_cumulativeProgress_check" CHECK ("cumulativeProgress" BETWEEN 0 AND 100);
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_quantity_check" CHECK ("quantity">0), ADD CONSTRAINT "Procedure_price_check" CHECK ("price">=0), ADD CONSTRAINT "Procedure_discount_check" CHECK ("discount">=0 AND "discount"<="price"*"quantity");
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_amount_check" CHECK ("amount">0);

-- Clinical history is restricted; nullable attribution/catalog links use SET NULL.
ALTER TABLE "Evolution" DROP CONSTRAINT "Evolution_treatmentId_fkey";
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Procedure" DROP CONSTRAINT "Procedure_treatmentId_fkey";
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_treatmentId_fkey" FOREIGN KEY ("treatmentId") REFERENCES "Treatment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "Professional"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Reminder" ADD CONSTRAINT "Reminder_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ClinicalNote" ADD CONSTRAINT "ClinicalNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "ClinicalNote_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Treatment" ADD CONSTRAINT "Treatment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "Treatment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "Evolution_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Procedure" ADD CONSTRAINT "Procedure_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "Procedure_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OdontogramFinding" ADD CONSTRAINT "OdontogramFinding_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "OdontogramFinding_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE, ADD CONSTRAINT "Payment_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Every FK plus the requested hot query paths.
CREATE INDEX "User_clinicId_idx" ON "User"("clinicId"); CREATE INDEX "Professional_clinicId_idx" ON "Professional"("clinicId");
CREATE INDEX "Patient_clinicId_idx" ON "Patient"("clinicId"); CREATE INDEX "Patient_clinicId_deletedAt_idx" ON "Patient"("clinicId","deletedAt");
CREATE INDEX "Appointment_patientId_idx" ON "Appointment"("patientId"); CREATE INDEX "Appointment_clinicId_start_idx" ON "Appointment"("clinicId","start"); CREATE INDEX "Appointment_professionalId_start_idx" ON "Appointment"("professionalId","start");
CREATE INDEX "ClinicalNote_patientId_date_idx" ON "ClinicalNote"("patientId","date"); CREATE INDEX "ClinicalNote_professionalId_idx" ON "ClinicalNote"("professionalId");
CREATE INDEX "Treatment_clinicId_status_idx" ON "Treatment"("clinicId","status"); CREATE INDEX "Treatment_patientId_idx" ON "Treatment"("patientId"); CREATE INDEX "Treatment_responsibleProfessionalId_idx" ON "Treatment"("responsibleProfessionalId");
CREATE INDEX "Evolution_professionalId_idx" ON "Evolution"("professionalId"); CREATE INDEX "Evolution_appointmentId_idx" ON "Evolution"("appointmentId");
CREATE INDEX "Procedure_evolutionId_idx" ON "Procedure"("evolutionId"); CREATE INDEX "Procedure_priceItemId_idx" ON "Procedure"("priceItemId"); CREATE INDEX "Procedure_performedById_idx" ON "Procedure"("performedById");
CREATE INDEX "Payment_clinicId_date_idx" ON "Payment"("clinicId","date"); CREATE INDEX "Payment_patientId_idx" ON "Payment"("patientId"); CREATE INDEX "Payment_treatmentId_idx" ON "Payment"("treatmentId");
CREATE INDEX "Reminder_clinicId_scheduledFor_status_idx" ON "Reminder"("clinicId","scheduledFor","status"); CREATE INDEX "Reminder_patientId_idx" ON "Reminder"("patientId"); CREATE INDEX "Reminder_appointmentId_idx" ON "Reminder"("appointmentId");
CREATE INDEX "PatientFile_patientId_idx" ON "PatientFile"("patientId"); CREATE INDEX "PriceItem_clinicId_idx" ON "PriceItem"("clinicId");
CREATE INDEX "ClinicalNote_createdById_idx" ON "ClinicalNote"("createdById"); CREATE INDEX "ClinicalNote_updatedById_idx" ON "ClinicalNote"("updatedById");
CREATE INDEX "Treatment_createdById_idx" ON "Treatment"("createdById"); CREATE INDEX "Treatment_updatedById_idx" ON "Treatment"("updatedById");
CREATE INDEX "Evolution_createdById_idx" ON "Evolution"("createdById"); CREATE INDEX "Evolution_updatedById_idx" ON "Evolution"("updatedById");
CREATE INDEX "Procedure_createdById_idx" ON "Procedure"("createdById"); CREATE INDEX "Procedure_updatedById_idx" ON "Procedure"("updatedById");
CREATE INDEX "OdontogramFinding_createdById_idx" ON "OdontogramFinding"("createdById"); CREATE INDEX "OdontogramFinding_updatedById_idx" ON "OdontogramFinding"("updatedById");
CREATE INDEX "Payment_createdById_idx" ON "Payment"("createdById"); CREATE INDEX "Payment_updatedById_idx" ON "Payment"("updatedById");

-- @updatedAt is written by Prisma; defaults were only needed to backfill rows.
ALTER TABLE "Clinic" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "User" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "Professional" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "Patient" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "Appointment" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "ClinicalNote" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "Evolution" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "Procedure" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "Payment" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "Reminder" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "PatientFile" ALTER "updatedAt" DROP DEFAULT;
ALTER TABLE "PriceItem" ALTER "updatedAt" DROP DEFAULT;
