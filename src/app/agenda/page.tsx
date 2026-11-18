import Link from "next/link";
import { BrainCircuit } from "lucide-react";
import { AIDisclaimer } from "@/components/ai-disclaimer";
import { AppointmentForm, EditAppointmentForm, ScheduleBlockForm } from "@/components/agenda-forms";
import { deleteScheduleBlock, deleteScheduleBlockGroup, updateAppointmentStatus } from "@/lib/actions";
import { SmartSlots } from "@/components/smart-slots";
import { db } from "@/lib/db";
import { activeWhere } from "@/lib/soft-delete";
import { expandScheduleBlocks, getBlockOccurrences, rangesOverlap } from "@/lib/schedule";
import { AppointmentStatus, BlockRecurrence } from "@prisma/client";
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

function localDayNumber(date: Date) {
  return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86_400_000;
}

function allDayCount(start: Date, end: Date) {
  if (
    start.getHours() !== 0 || start.getMinutes() !== 0 || start.getSeconds() !== 0 ||
    end.getHours() !== 0 || end.getMinutes() !== 0 || end.getSeconds() !== 0
  ) return 0;
  return Math.max(0, localDayNumber(end) - localDayNumber(start));
}

function timeMx(date: Date) {
  return dateMx(date, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
}

function blockTiming(start: Date, end: Date) {
  const days = allDayCount(start, end);
  if (days === 1) return "Todo el día";
  if (days > 1) {
    const finalDay = new Date(end);
    finalDay.setDate(finalDay.getDate() - 1);
    return `Todo el día · ${dateMx(start)}–${dateMx(finalDay)}`;
  }
  return `${timeMx(start)}–${timeMx(end)}`;
}

function blockPeriod(start: Date, end: Date) {
  return allDayCount(start, end) > 1
    ? blockTiming(start, end)
    : `${dateMx(start)} · ${blockTiming(start, end)}`;
}

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
  const clinic = await db.clinic.findFirstOrThrow();
  const now = new Date();

  const [patients, professionals, appointments, pastNoShows, blockOccurrences, upcomingBlocks, recurringBlocks] = await Promise.all([
    db.patient.findMany({
      where: activeWhere(),
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
    db.professional.findMany({ orderBy: { name: "asc" } }),
    db.appointment.findMany({
      where: {
        start: { gte: selectedDate, lt: endDate }, patient: { deletedAt: null },
        professionalId: query.professional || undefined,
      },
      include: { patient: true, professional: true },
      orderBy: { start: "asc" },
    }),
    db.appointment.groupBy({
      by: ["patientId"],
      where: { status: AppointmentStatus.NO_ASISTIO },
      _count: true,
    }),
    getBlockOccurrences({
      clinicId: clinic.id,
      professionalId: query.professional || undefined,
      rangeStart: selectedDate,
      rangeEnd: endDate,
    }),
    db.scheduleBlock.findMany({
      where: {
        clinicId: clinic.id,
        recurrence: BlockRecurrence.NONE,
        end: { gte: now },
      },
      include: { professional: true },
      orderBy: { start: "asc" },
    }),
    db.scheduleBlock.findMany({
      where: {
        clinicId: clinic.id,
        recurrence: { not: BlockRecurrence.NONE },
        start: { lt: endDate },
        AND: [
          { OR: [{ recurrenceUntil: null }, { recurrenceUntil: { gte: selectedDate } }] },
          ...(query.professional
            ? [{ OR: [{ professionalId: query.professional }, { professionalId: null }] }]
            : []),
        ],
      },
      include: { professional: true },
      orderBy: [{ start: "asc" }, { professional: { name: "asc" } }],
    }),
  ]);

  const noShowsByPatient = new Map(
    pastNoShows.map((item) => [item.patientId, item._count]),
  );
  const upcomingHorizon = new Date(now);
  upcomingHorizon.setFullYear(upcomingHorizon.getFullYear() + 1);
  const nextBlockById = new Map<string, Date>();
  for (const occurrence of expandScheduleBlocks(upcomingBlocks, now, upcomingHorizon)) {
    if (!nextBlockById.has(occurrence.blockId)) nextBlockById.set(occurrence.blockId, occurrence.start);
  }
  const inlineBlocks = blockOccurrences.filter((block) => block.recurrence === BlockRecurrence.NONE);
  const recurringGroupMap = new Map<string, {
    ids: string[];
    reason: string;
    start: Date;
    end: Date;
    recurrence: BlockRecurrence;
    recurrenceUntil: Date | null;
    weekday: string | null;
    professionals: string[];
  }>();
  for (const block of recurringBlocks) {
    const key = [
      block.reason.trim().toLocaleLowerCase("es-MX"),
      timeMx(block.start),
      timeMx(block.end),
      block.recurrence,
      block.recurrence === BlockRecurrence.WEEKLY ? block.start.getDay() : "",
      block.recurrenceUntil?.toISOString() ?? "",
    ].join("|");
    const group = recurringGroupMap.get(key) ?? {
      ids: [],
      reason: block.reason,
      start: block.start,
      end: block.end,
      recurrence: block.recurrence,
      recurrenceUntil: block.recurrenceUntil,
      weekday: block.recurrence === BlockRecurrence.WEEKLY
        ? dateMx(block.start, { weekday: "long" })
        : null,
      professionals: [],
    };
    group.ids.push(block.id);
    group.professionals.push(block.professional?.name ?? "Toda la clínica");
    recurringGroupMap.set(key, group);
  }
  const recurringGroups = [...recurringGroupMap.values()];
  const scheduleContext = JSON.stringify({
      range: [selectedDate.toISOString(), endDate.toISOString()],
      appointments: appointments.map((appointment) => ({
        start: appointment.start,
        duration: appointment.duration,
        professional: appointment.professional.name,
      })),
      blockedRanges: blockOccurrences.map((block) => ({
        start: block.start.toISOString(),
        end: block.end.toISOString(),
        reason: block.reason,
        professional: block.professionalId
          ? professionals.find((item) => item.id === block.professionalId)?.name
          : "Toda la clínica",
      })),
    });
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
    <div className="page-stack">
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

      <div className="grid-2">
        <div className="card">
          <h2>Agenda del periodo</h2>
          <p className="small">
            El riesgo combina historial, anticipación, horario y confirmación.
          </p>
          <AIDisclaimer />
          {recurringGroups.length ? (
            <section className="fixed-hours" aria-label="Horarios fijos">
              <h3>Horarios fijos</h3>
              {recurringGroups.map((group) => (
                <div className="fixed-hours-row" key={group.ids.join("-")}>
                  <div>
                    <b>{group.reason}</b>
                    <span className="small">
                      {blockTiming(group.start, group.end)} · {group.recurrence === BlockRecurrence.DAILY ? "Diario" : `Semanal (${group.weekday})`} · {group.professionals.join(", ")}
                      {group.recurrenceUntil ? ` · hasta ${dateMx(group.recurrenceUntil)}` : ""}
                    </span>
                  </div>
                  <form action={deleteScheduleBlockGroup}>
                    {group.ids.map((id) => <input key={id} name="ids" type="hidden" value={id} />)}
                    <button className="btn danger">Eliminar</button>
                  </form>
                </div>
              ))}
            </section>
          ) : null}
          <div className="list">
            {inlineBlocks.map((block) => (
              <article className="appointment schedule-block" key={`${block.blockId}-${block.start.toISOString()}`}>
                <div className="appointment-main">
                  <div className="appointment-time"><b>{dateMx(block.start, { weekday: "short", day: "numeric", month: "short" })}</b><span className="small">{blockTiming(block.start, block.end)}</span></div>
                  <span className="block-mark" aria-hidden="true">×</span>
                  <div className="appointment-patient"><b>{block.reason}</b><div className="small">Horario bloqueado · {block.professionalId ? professionals.find((item) => item.id === block.professionalId)?.name : "Toda la clínica"}</div></div>
                </div>
              </article>
            ))}
            {appointments.map((appointment) => {
                const daysAhead = Math.ceil(
                  (appointment.start.getTime() - currentTime) / 86_400_000,
                );
                const risk = noShowRisk({
                  noShows: noShowsByPatient.get(appointment.patientId) ?? 0,
                  daysAhead,
                  hour: appointment.start.getHours(),
                  confirmed: appointment.status === AppointmentStatus.CONFIRMADA,
                  reminderSent: appointment.status === AppointmentStatus.RECORDATORIO_ENVIADO,
                });
                const appointmentEnd = new Date(appointment.start.getTime() + appointment.duration * 60_000);
                const insideBlock = blockOccurrences.some((block) =>
                  (!block.professionalId || block.professionalId === appointment.professionalId) &&
                  rangesOverlap(appointment.start, appointmentEnd, block.start, block.end),
                );

                return (
                  <article className="appointment" id={`cita-${appointment.id}`} key={appointment.id}>
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
                      <div className="appointment-patient">
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
                        {insideBlock && <span className="badge blocked-appointment-badge">Dentro de horario bloqueado</span>}
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
                          {Object.values(AppointmentStatus).map((status) => (
                            <option key={status} value={status}>
                              {statusLabel[status]}
                            </option>
                          ))}
                        </select>
                        <button className="btn">Guardar</button>
                      </form>
                      <details>
                        <summary className="small">Editar cita</summary>
                        <EditAppointmentForm appointment={{ id: appointment.id, start: localDateTimeValue(appointment.start), reason: appointment.reason, professionalId: appointment.professionalId, duration: appointment.duration }} professionals={professionals.map((item) => ({ id: item.id, name: item.name }))} />
                      </details>
                    </div>
                  </article>
                );
              })}
            {!appointments.length && !inlineBlocks.length && (
              <p className="small">No hay citas en este periodo.</p>
            )}
          </div>
        </div>

        <aside className="grid aside-stack">
          <div className="card">
            <h2>Nueva cita</h2>
            <AppointmentForm patients={patients.map((item) => ({ id: item.id, name: `${item.firstName} ${item.lastName}` }))} professionals={professionals.map((item) => ({ id: item.id, name: item.name }))} />
          </div>

          <div className="card">
            <h2>Bloquear horario</h2>
            <ScheduleBlockForm professionals={professionals.map((item) => ({ id: item.id, name: item.name }))} />
          </div>

          <div className="card ai">
            <div className="row">
              <BrainCircuit size={20} />
              <h3>Agenda inteligente</h3>
            </div>
            <p className="small">
              Sugerencias para una consulta de 30 minutos según la ocupación visible.
            </p>
            <SmartSlots context={scheduleContext} />
          </div>
        </aside>
      </div>

      <section className="card">
        <h2>Próximos bloqueos</h2>
        {upcomingBlocks.length ? <div className="list">{upcomingBlocks.map((block) => <div className="listitem schedule-block-row" key={block.id}><div><b>{block.reason}</b><div className="small">{block.professional?.name ?? "Toda la clínica"} · {blockPeriod(nextBlockById.get(block.id) ?? block.start, block.end)}</div></div><form action={deleteScheduleBlock}><input type="hidden" name="id" value={block.id} /><button className="btn danger">Eliminar</button></form></div>)}</div> : <p className="small">No hay bloqueos próximos.</p>}
      </section>
    </div>
  );
}
