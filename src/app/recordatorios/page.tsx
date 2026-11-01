import { Suspense } from "react";
import { MessageCircleMore } from "lucide-react";
import { AIDisclaimer } from "@/components/ai-disclaimer";
import { ReminderActions } from "@/components/reminder-actions";
import { generateMessage } from "@/lib/ai/messages";
import { ReminderStatus, type ReminderType } from "@prisma/client";
import { db } from "@/lib/db";
import { dateMx, enumLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const reminders = await db.reminder.findMany({
    where: { status: ReminderStatus.PENDIENTE, patient: { deletedAt: null } },
    include: {
      patient: true,
      appointment: { include: { professional: true } },
    },
    orderBy: { scheduledFor: "asc" },
  });
  const generated = reminders;

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Comunicación</div>
          <h1 className="title">Recordatorios</h1>
          <p className="subtitle">
            Mensajes generados para revisar, copiar y abrir en WhatsApp
          </p>
        </div>
        <span className="btn primary">
          <MessageCircleMore size={16} />
          {generated.length} mensajes listos
        </span>
      </div>

      <div className="grid">
        {generated.map((reminder) => (
          <article className="card" key={reminder.id}>
            <div className="row between reminder-header">
              <div className="row">
                <span className="avatar">
                  {reminder.patient.firstName[0]}
                  {reminder.patient.lastName[0]}
                </span>
                <div>
                  <b>
                    {reminder.patient.firstName} {reminder.patient.lastName}
                  </b>
                  <div className="small">
                    {enumLabel[reminder.type]} · programado{" "}
                    {dateMx(reminder.scheduledFor, {
                      weekday: "long",
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              </div>
              <span className="badge">Pendiente</span>
            </div>
            <Suspense
              fallback={
                <div aria-busy="true" aria-label="Redactando mensaje">
                  <div className="skeleton skeleton-row" />
                </div>
              }
            >
              <ReminderMessage
                name={reminder.patient.firstName}
                phone={reminder.patient.phone}
                reminderId={reminder.id}
                type={reminder.type}
                details={
                  reminder.appointment
                    ? `${dateMx(reminder.appointment.start, { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })} con ${reminder.appointment.professional.name} (${reminder.appointment.reason})`
                    : undefined
                }
              />
            </Suspense>
          </article>
        ))}
        {!generated.length && (
          <div className="card">
            <p className="small">No hay recordatorios pendientes.</p>
          </div>
        )}
      </div>
    </>
  );
}

// Each message streams in on its own, so the list renders immediately.
async function ReminderMessage({
  name,
  phone,
  reminderId,
  type,
  details,
}: {
  name: string;
  phone: string;
  reminderId: string;
  type: ReminderType;
  details?: string;
}) {
  const { message } = await generateMessage(name, enumLabel[type] ?? type, details);
  return (
    <>
      <p className="message-preview">{message}</p>
      <div className="row between reminder-footer">
        <AIDisclaimer />
        <ReminderActions phone={phone} message={message} reminderId={reminderId} />
      </div>
    </>
  );
}
