# Modelo de datos clínico

Clinika AI separa el seguimiento clínico del cobro. La unidad clínica principal es el tratamiento; sus evoluciones documentan sesiones y sus prestaciones expresan el plan y lo realizado. Los importes se almacenan en MXN con precisión decimal.

```mermaid
erDiagram
  Clinic ||--o{ User : integra
  Clinic ||--o{ Professional : integra
  Clinic ||--o{ Patient : atiende
  Patient ||--o{ Appointment : agenda
  Professional ||--o{ Appointment : atiende
  Clinic ||--o{ ScheduleBlock : bloquea
  Professional o|--o{ ScheduleBlock : restringe
  Patient ||--o{ ClinicalNote : conserva
  Patient ||--o{ OdontogramFinding : registra
  Patient ||--o{ Treatment : recibe
  Treatment ||--o{ Evolution : documenta
  Treatment ||--o{ Procedure : incluye
  Evolution o|--o{ Procedure : realiza
  Professional ||--o{ Evolution : firma
  Professional o|--o{ Procedure : ejecuta
  Appointment o|--o{ Evolution : origina
  Appointment o|--o{ Reminder : recibe
  Patient ||--o{ Payment : paga
  Treatment o|--o{ Payment : aplica
  PriceItem o|--o{ Procedure : cataloga
  Clinic ||--o{ Supply : almacena
  Supply ||--o{ SupplyMovement : registra
  PriceItem ||--o{ PriceItemSupply : consume
  Supply ||--o{ PriceItemSupply : integra
  Procedure o|--o{ SupplyMovement : origina
  Clinic ||--o{ DocumentTemplate : configura
  Patient ||--o{ Prescription : recibe
  Professional ||--o{ Prescription : prescribe
  Prescription ||--o{ PrescriptionItem : contiene
  Clinic ||--o{ IssuedDocument : emite
  Patient ||--o{ IssuedDocument : recibe
  User o|--o{ ClinicalNote : audita
  User o|--o{ Treatment : audita
  User o|--o{ Evolution : audita
  User o|--o{ Procedure : audita
  User o|--o{ OdontogramFinding : audita
  User o|--o{ Payment : audita
```

## Entidades

- `Clinic`, `User` y `Professional`: delimitan la organización, la identidad de sesión y la responsabilidad profesional.
- `Patient`: expediente maestro. Usa borrado lógico para que su historia nunca desaparezca por una eliminación accidental.
- `Appointment` y `Reminder`: agenda y comunicación. Un recordatorio puede señalar una cita exacta; si la cita desaparece, la referencia queda nula.
- `ClinicalNote`: nota SOAP independiente, firmada por profesional y con trazabilidad de usuario.
- `OdontogramFinding`: condición por pieza y superficie; la combinación paciente/pieza/superficie es única.
- `Treatment`: objetivo clínico macro, profesional responsable, estado y fechas.
- `Evolution`: sesión ordenada por fecha, avance acumulado, notas y próximos pasos.
- `Procedure`: prestación planificada o realizada, superficies, precio, cantidad, descuento y metadatos de realización.
- `Payment`: pago de paciente, opcionalmente aplicado a un tratamiento.
- `PriceItem`: tarifario reutilizable. `PatientFile` conserva metadatos de documentos.
- `ScheduleBlock`: indisponibilidad de toda la clínica o de un profesional. Puede ser única, diaria o semanal; las recurrencias conservan la hora y, para semanal, el día derivado de `start`.
- `Supply`, `SupplyMovement` y `PriceItemSupply`: existencias, kardex de deltas con fotografía opcional del saldo y receta de insumos por concepto del tarifario. `Supply` usa borrado lógico.
- `DocumentTemplate`: plantilla por clínica con marcadores `{{nombre}}` y borrado lógico. `Prescription`/`PrescriptionItem` conservan la receta clínica; `IssuedDocument` es el registro inmutable con el JSON exacto renderizado al emitir.

## Agenda y bloqueos

Un bloqueo aplica si es de toda la clínica (`professionalId` nulo) o del profesional de la cita y si sus rangos se traslapan con la regla `inicio < finBloqueo AND fin > inicioBloqueo`. `src/lib/schedule.ts` expande recurrencias para el rango solicitado y es compartido por las acciones, la agenda y el contexto de agenda inteligente. La base exige `end > start`.

## Inventario

Existencias y cantidades usan `Decimal(12,3)`; costos unitarios usan `Decimal(12,2)`. `SupplyMovement.quantity` es un delta firmado y nunca puede ser cero. `PriceItemSupply.quantity` debe ser positiva. Los movimientos conservan autor, fecha, motivo, saldo resultante opcional y referencia opcional a la prestación que consumió el material.

## Documentos

`Clinic` contiene razón social, domicilio, contacto, RFC, logotipo y pie documental opcionales. `Professional` contiene cédula, cédula de especialidad y universidad. Las plantillas cubren presupuesto, receta, consentimiento y estado de cuenta. Cada emisión crea un `IssuedDocument`; sus referencias opcionales usan `SET NULL`, pero el `snapshot` JSON mantiene el contenido histórico.

## Reglas de Tratamiento → Evolución → Prestación

1. Una prestación `PLANIFICADA` pertenece al tratamiento y no tiene evolución.
2. Al realizarla pasa a `REALIZADA`, se enlaza a la evolución y copia su fecha y profesional en `performedAt`/`performedById`.
3. El avance de una evolución está entre 0 y 100 y no puede ser menor al de la sesión anterior. La interfaz sugiere el porcentaje por valor neto realizado, pero el profesional lo confirma.
4. Cantidad debe ser positiva. Precio y descuento no pueden ser negativos; el descuento de una línea no puede superar `precio × cantidad`.
5. Un tratamiento terminado debe llegar clínicamente a 100 %. El seed cumple esta regla; las acciones terminan automáticamente al registrar 100 %.
6. Saldo de tratamiento = prestaciones realizadas netas − pagos ligados al tratamiento. Las prestaciones planificadas no generan deuda.

## Dinero, catálogos y auditoría

Todo importe usa `Decimal(12,2)` y las cantidades de inventario `Decimal(12,3)`. La aritmética decimal de servidor vive en `src/lib/money.ts` con `Prisma.Decimal`; hacia componentes cliente se serializa como texto. No se suman importes con `number`.

Los conjuntos cerrados son enums Prisma. Las etiquetas visibles en español están centralizadas en `src/lib/utils.ts`; nunca se persisten etiquetas como si fueran valores del enum.

Todos los modelos de negocio tienen `createdAt` y `updatedAt`. Notas, tratamientos, evoluciones, prestaciones, hallazgos y pagos incluyen `createdById`/`updatedById` con `SET NULL`: una baja de usuario no borra la autoría histórica. Paciente, tratamiento, evolución y nota clínica usan `deletedAt`; las consultas normales agregan `deletedAt: null` mediante `src/lib/soft-delete.ts`.

## Eliminación e integridad

Las relaciones que sostienen historia clínica usan `RESTRICT`, en particular desde paciente, tratamiento y evolución. Las referencias opcionales y reemplazables —cita de recordatorio/evolución, catálogo, profesional ejecutor, pago aplicado y usuarios de auditoría— usan `SET NULL`. No se usa cascada para expedientes clínicos. Las restricciones `CHECK` de la base protegen avance, cantidad, importes y descuentos aunque una escritura no pase por la UI.

Cada llave foránea tiene índice. Además existen índices compuestos para agenda por clínica/profesional y fecha, tratamientos por estado, evoluciones por tratamiento/fecha, pagos por clínica/fecha y recordatorios pendientes.

Los `CHECK` agregados en SQL garantizan: fin posterior al inicio en bloqueos, movimiento de inventario distinto de cero y consumo por concepto mayor que cero.

## Migraciones seguras

1. Partir del último esquema desplegado y no reescribir migraciones ya aplicadas. La excepción actual es `20261101180000_procedure_parity`, consolidada antes de su primer despliegue.
2. Para un enum, normalizar primero valores desconocidos y después convertir con `USING`; agregar el default nuevamente al final.
3. Para columnas obligatorias, agregar con un valor seguro, rellenar datos existentes y luego instalar restricciones/FK/índices.
4. Convertir dinero con `ROUND(valor::numeric, 2)` y validar los datos antes de crear `CHECK`.
5. Ejecutar `prisma validate`, `prisma generate`, lint y build. En un entorno con PostgreSQL de prueba, aplicar desde cero y también desde una copia en la versión productiva antes de desplegar.
