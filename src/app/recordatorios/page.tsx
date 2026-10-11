import { MessageCircleMore } from "lucide-react";
import { AIDisclaimer } from "@/components/ai-disclaimer";
import { ReminderActions } from "@/components/reminder-actions";
import { generateMessage } from "@/lib/ai/messages";
import { db } from "@/lib/db";
import { dateMx } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function RemindersPage() {
  const reminders = await db.reminder.findMany({
    where: { status: "PENDIENTE" },
    include: { patient: true },
    orderBy: { scheduledFor: "asc" },
  });
  const generated = await Promise.all(
    reminders.map(async (reminder) => {
      const name = reminder.patient.firstName;
      const result = await generateMessage(name, reminder.type);
      return { ...reminder, generatedMessage: result.message };
    }),
  );

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
                    {reminder.type} · programado{" "}
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
            <p className="message-preview">{reminder.generatedMessage}</p>
            <div className="row between reminder-footer">
              <AIDisclaimer />
              <ReminderActions
                phone={reminder.patient.phone}
                message={reminder.generatedMessage}
              />
            </div>
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
