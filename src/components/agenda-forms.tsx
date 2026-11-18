"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  createAppointmentState,
  createScheduleBlockState,
  editAppointmentState,
  type AgendaActionState,
} from "@/lib/actions";

type Option = { id: string; name: string };
const initialState: AgendaActionState = {};

function SubmitButton({ children, className = "btn" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button className={className} disabled={pending}>{pending ? "Guardando…" : children}</button>;
}

function Feedback({ state }: { state: AgendaActionState }) {
  if (state.error) return <p className="form-error" role="alert">{state.error}</p>;
  if (state.success) return (
    <div className="form-feedback" role="status">
      <p className="form-success">{state.success}</p>
      {state.affectedAppointments?.length ? (
        <div className="form-warning">
          <b>Hay citas dentro del nuevo bloqueo:</b>
          <ul>
            {state.affectedAppointments.map((appointment) => (
              <li key={appointment.id}>
                <a href={appointment.href}>
                  {appointment.patient} · {new Intl.DateTimeFormat("es-MX", { dateStyle: "medium", timeStyle: "short" }).format(new Date(appointment.start))} · {appointment.professional}
                </a>
              </li>
            ))}
          </ul>
          <span>Reprograma estas citas desde la agenda.</span>
        </div>
      ) : null}
    </div>
  );
  return null;
}

export function AppointmentForm({ patients, professionals }: { patients: Option[]; professionals: Option[] }) {
  const [state, action] = useActionState(createAppointmentState, initialState);
  return (
    <form action={action} className="formgrid" key={state.submissionId ?? "initial"}>
      <Field label="Paciente"><select className="input" defaultValue={state.values?.patientId ?? patients[0]?.id} name="patientId" required>{patients.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Profesional"><select className="input" defaultValue={state.values?.professionalId ?? professionals[0]?.id} name="professionalId" required>{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Fecha y hora"><input className="input" defaultValue={state.values?.start ?? ""} name="start" type="datetime-local" required /></Field>
      <Field label="Duración"><DurationSelect defaultValue={state.values?.duration ?? "30"} /></Field>
      <div className="field span-all"><label>Motivo</label><input className="input" name="reason" defaultValue={state.values?.reason ?? "Consulta de valoración"} required /></div>
      <div className="span-all"><Feedback state={state} /></div>
      <SubmitButton className="btn primary span-all">Crear cita</SubmitButton>
    </form>
  );
}

export function EditAppointmentForm({
  appointment,
  professionals,
}: {
  appointment: { id: string; start: string; reason: string; professionalId: string; duration: number };
  professionals: Option[];
}) {
  const [state, action] = useActionState(editAppointmentState, initialState);
  return (
    <form action={action} className="edit-appointment" key={state.submissionId ?? "initial"}>
      <input type="hidden" name="id" value={appointment.id} />
      <input className="input" type="datetime-local" name="start" defaultValue={state.values?.start ?? appointment.start} required />
      <input className="input" name="reason" defaultValue={state.values?.reason ?? appointment.reason} required />
      <select className="input" name="professionalId" defaultValue={state.values?.professionalId ?? appointment.professionalId}>{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
      <DurationSelect defaultValue={state.values?.duration ?? String(appointment.duration)} />
      <Feedback state={state} />
      <SubmitButton>Confirmar cambios</SubmitButton>
    </form>
  );
}

export function ScheduleBlockForm({ professionals }: { professionals: Option[] }) {
  const [state, action] = useActionState(createScheduleBlockState, initialState);
  return (
    <form action={action} className="formgrid block-form" key={state.submissionId ?? "initial"}>
      <Field label="Profesional"><select className="input" defaultValue={state.values?.professionalId ?? ""} name="professionalId"><option value="">Toda la clínica</option>{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></Field>
      <Field label="Motivo"><input className="input" defaultValue={state.values?.reason ?? ""} name="reason" placeholder="Comida, congreso, día inhábil…" required /></Field>
      <Field label="Inicio"><input className="input" defaultValue={state.values?.start ?? ""} name="start" type="datetime-local" required /></Field>
      <Field label="Fin"><input className="input" defaultValue={state.values?.end ?? ""} name="end" type="datetime-local" required /></Field>
      <Field label="Repetición"><select className="input" name="recurrence" defaultValue={state.values?.recurrence ?? "NONE"}><option value="NONE">No se repite</option><option value="DAILY">Diario</option><option value="WEEKLY">Semanal</option></select></Field>
      <Field label="Hasta (opcional)"><input className="input" defaultValue={state.values?.recurrenceUntil ?? ""} name="recurrenceUntil" type="date" /></Field>
      <div className="span-all"><Feedback state={state} /></div>
      <SubmitButton className="btn primary span-all">Bloquear horario</SubmitButton>
    </form>
  );
}

function DurationSelect({ defaultValue = "30" }: { defaultValue?: string }) {
  return <select className="input" name="duration" defaultValue={defaultValue}><option value="30">30 min</option><option value="60">60 min</option><option value="90">90 min</option></select>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
