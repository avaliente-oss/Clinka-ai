import Link from "next/link";
import { BrainCircuit, Clock3 } from "lucide-react";
import { AIDisclaimer } from "@/components/ai-disclaimer";
import {
  createAppointment,
  editAppointment,
  updateAppointmentStatus,
} from "@/lib/actions";
import { suggestSlots } from "@/lib/ai/smart-schedule";
import { db } from "@/lib/db";
import {
  dateMx,
  localDateTimeValue,
  noShowRisk,
  statusLabel,
} from "@/lib/utils";

type AgendaSearch = {
  view?: string;
  date?: string;
  professional?: string;
};

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<AgendaSearch>;
}) {
  const query = await searchParams;
  const view = query.view === "day" ? "day" : "week";
  const selectedDate = query.date ? new Date(query.date + "T00:00:00") : new Date();
  selectedDate.setHours(0, 0, 0, 0);
  const endDate = new Date(selectedDate);
  endDate.setDate(endDate.getDate() + (view === "day" ? 1 : 7));

  const [patients, professionals, appointments, pastNoShows] = await Promise.all([
    db.patient.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.professional.findMany({ orderBy: { name: "asc" } }),
    db.appointment.findMany({
      where: {
        start: { gte: selectedDate, lt: endDate },
        professionalId: query.professional || undefined,
      },
      include: { patient: true, professional: true },
      orderBy: { start: "asc" },
    }),
    db.appointment.groupBy({
      by: ["patientId"],
      where: { status: "NO_ASISTIO" },
      _count: true,
    }),
  ]);

  const noShowsByPatient = new Map(
    pastNoShows.map((item) => [item.patientId, item._count]),
  );
  const schedule = await suggestSlots(
    JSON.stringify({
      range: [selectedDate.toISOString(), endDate.toISOString()],
      appointments: appointments.map((appointment) => ({
        start: appointment.start,
        duration: appointment.duration,
        professional: appointment.professional.name,
      })),
    }),
  );
  const previous = new Date(selectedDate);
  const next = new Date(selectedDate);
  const currentTime = new Date().getTime();
  previous.setDate(previous.getDate() - (view === "day" ? 1 : 7));
  next.setDate(next.getDate() + (view === "day" ? 1 : 7));

  function linkFor(date: Date) {
    const base =
      "/agenda?view=" +
      view +
      "&date=" +
      date.toISOString().slice(0, 10);
    return base + (query.professional ? "&professional=" + query.professional : "");
  }

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Operación clínica</div>
          <h1 className="title">Agenda</h1>
          <p className="subtitle">
            {view === "day" ? "Vista diaria" : "Vista semanal"} ·{" "}
            {dateMx(selectedDate)}
          </p>
        </div>
        <div className="row agenda-controls">
          <Link
            className={"btn " + (view === "day" ? "primary" : "ghost")}
            href={
              "/agenda?view=day&date=" +
              selectedDate.toISOString().slice(0, 10)
            }
          >
            Día
          </Link>
          <Link
            className={"btn " + (view === "week" ? "primary" : "ghost")}
            href={
              "/agenda?view=week&date=" +
              selectedDate.toISOString().slice(0, 10)
            }
          >
            Semana
          </Link>
          <Link className="btn ghost" href={linkFor(previous)}>
            ←
          </Link>
          <Link className="btn ghost" href={linkFor(next)}>
            →
          </Link>
        </div>
      </div>

      <form className="card agenda-filter">
        <input type="hidden" name="view" value={view} />
        <div className="field">
          <label>Fecha inicial</label>
          <input
            className="input"
            type="date"
            name="date"
            defaultValue={selectedDate.toISOString().slice(0, 10)}
          />
        </div>
        <div className="field">
          <label>Profesional</label>
          <select
            className="input"
            name="professional"
            defaultValue={query.professional ?? ""}
          >
            <option value="">Todos los profesionales</option>
            {professionals.map((professional) => (
              <option value={professional.id} key={professional.id}>
                {professional.name} · {professional.specialty}
              </option>
            ))}
          </select>
        </div>
        <button className="btn">Aplicar vista</button>
      </form>

      <div className="grid two section-gap">
        <div className="card">
          <h2>Citas del periodo</h2>
          <p className="small">
            El riesgo combina historial, anticipación, horario y confirmación.
          </p>
          <AIDisclaimer />
          <div className="list">
            {appointments.length ? (
              appointments.map((appointment) => {
                const daysAhead = Math.ceil(
                  (appointment.start.getTime() - currentTime) / 86_400_000,
                );
                const risk = noShowRisk({
                  noShows: noShowsByPatient.get(appointment.patientId) ?? 0,
                  daysAhead,
                  hour: appointment.start.getHours(),
                  confirmed: appointment.status === "CONFIRMADA",
                });

                return (
                  <article className="appointment" key={appointment.id}>
                    <div className="appointment-main">
                      <div className="appointment-time">
                        <b>
                          {dateMx(appointment.start, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
                        </b>
                        <span className="small">
                          {dateMx(appointment.start, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <span className="avatar">
                        {appointment.patient.firstName[0]}
                        {appointment.patient.lastName[0]}
                      </span>
                      <div>
                        <b>
                          {appointment.patient.firstName}{" "}
                          {appointment.patient.lastName}
                        </b>
                        <div className="small">
                          {appointment.reason} · {appointment.professional.name}
                        </div>
                        <span
                          className={
                            "risk risk-" + risk.level.toLocaleLowerCase("es-MX")
                          }
                        >
                          Riesgo de inasistencia {risk.level} · {risk.score}/100
                        </span>
                      </div>
                    </div>

                    <div className="appointment-actions">
                      <form action={updateAppointmentStatus} className="row">
                        <input type="hidden" name="id" value={appointment.id} />
                        <select
                          className="input"
                          name="status"
                          defaultValue={appointment.status}
                          aria-label="Estado"
                        >
                          {[
                            "AGENDADA",
                            "CONFIRMADA",
                            "ATENDIDA",
                            "NO_ASISTIO",
                            "CANCELADA",
                          ].map((status) => (
                            <option key={status} value={status}>
                              {statusLabel[status]}
                            </option>
                          ))}
                        </select>
                        <button className="btn">Guardar</button>
                      </form>
                      <details>
                        <summary className="small">Editar cita</summary>
                        <form action={editAppointment} className="edit-appointment">
                          <input
                            type="hidden"
                            name="id"
                            value={appointment.id}
                          />
                          <input
                            className="input"
                            type="datetime-local"
                            name="start"
                            defaultValue={localDateTimeValue(appointment.start)}
                            required
                          />
                          <input
                            className="input"
                            name="reason"
                            defaultValue={appointment.reason}
                            required
                          />
                          <select
                            className="input"
                            name="professionalId"
                            defaultValue={appointment.professionalId}
                          >
                            {professionals.map((professional) => (
                              <option value={professional.id} key={professional.id}>
                                {professional.name}
                              </option>
                            ))}
                          </select>
                          <select
                            className="input"
                            name="duration"
                            defaultValue={appointment.duration}
                          >
                            <option value="30">30 min</option>
                            <option value="60">60 min</option>
                            <option value="90">90 min</option>
                          </select>
                          <button className="btn">Confirmar cambios</button>
                        </form>
                      </details>
                    </div>
                  </article>
                );
              })
            ) : (
              <p className="small">No hay citas en este periodo.</p>
            )}
          </div>
        </div>

        <aside className="grid aside-stack">
          <div className="card">
            <h2>Nueva cita</h2>
            <form action={createAppointment} className="formgrid">
              <Field label="Paciente">
                <select className="input" name="patientId" required>
                  {patients.map((patient) => (
                    <option value={patient.id} key={patient.id}>
                      {patient.firstName} {patient.lastName}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Profesional">
                <select className="input" name="professionalId">
                  {professionals.map((professional) => (
                    <option value={professional.id} key={professional.id}>
                      {professional.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha y hora">
                <input
                  className="input"
                  name="start"
                  type="datetime-local"
                  required
                />
              </Field>
              <Field label="Duración">
                <select className="input" name="duration">
                  <option value="30">30 min</option>
                  <option value="60">60 min</option>
                  <option value="90">90 min</option>
                </select>
              </Field>
              <div className="field span-all">
                <label>Motivo</label>
                <input
                  className="input"
                  name="reason"
                  defaultValue="Consulta de valoración"
                  required
                />
              </div>
              <button className="btn primary span-all">Crear cita</button>
            </form>
          </div>

          <div className="card ai">
            <div className="row">
              <BrainCircuit size={20} />
              <h3>Agenda inteligente</h3>
            </div>
            <p className="small">
              Sugerencias para una consulta de 30 minutos según la ocupación visible.
            </p>
            {schedule.slots.map((slot, index) => (
              <div className="listitem" key={slot.datetime}>
                <span className="row">
                  <Clock3 size={15} />
                  <span>
                    <b>{slot.datetime}</b>
                    <span className="small block">{slot.reason}</span>
                  </span>
                </span>
                <span className="badge">
                  {index === 0 ? "Óptimo" : "Disponible"}
                </span>
              </div>
            ))}
            <AIDisclaimer />
          </div>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
    </div>
  );
}
