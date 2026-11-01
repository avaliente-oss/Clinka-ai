import { Activity, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { AIScribe } from "@/components/ai-scribe";
import { EvolutionForm } from "@/components/evolution-form";
import { Odontogram } from "@/components/odontogram";
import { PatientCopilot } from "@/components/patient-copilot";
import { TreatmentForm } from "@/components/treatment-form";
import { addPatientFile, updateTreatmentStatus } from "@/lib/actions";
import { db } from "@/lib/db";
import { dateMx, money, statusLabel } from "@/lib/utils";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [patient, professionals, prices] = await Promise.all([
    db.patient.findUnique({ where: { id }, include: {
      notes: {
        include: { professional: true },
        orderBy: { date: "desc" },
      },
      odontogram: { orderBy: [{ tooth: "asc" }, { surface: "asc" }] },
      treatments: {
        include: {
          responsibleProfessional: true,
          procedures: true,
          evolutions: {
            include: { professional: true, procedures: true },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { createdAt: "desc" },
      },
      appointments: { orderBy: { start: "desc" }, take: 30 },
      payments: { orderBy: { date: "desc" } },
      files: { orderBy: { date: "desc" } },
    } }),
    db.professional.findMany({ orderBy: { name: "asc" } }),
    db.priceItem.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!patient) notFound();

  const treatmentTotal = patient.treatments.reduce((sum, treatment) =>
    sum + treatment.procedures.filter((procedure) => procedure.status === "REALIZADA").reduce((subtotal, procedure) => subtotal + procedure.price * procedure.quantity, 0), 0);
  const paidTotal = patient.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0,
  );
  const balance = Math.max(0, treatmentTotal - paidTotal);

  return (
    <>
      <div className="pagehead">
        <div className="row">
          <span className="avatar patient-avatar">
            {patient.firstName[0]}
            {patient.lastName[0]}
          </span>
          <div>
            <div className="eyebrow">Ficha clínica</div>
            <h1 className="title">
              {patient.firstName} {patient.lastName}
            </h1>
            <div className="row small patient-contact">
              <span className="row">
                <Phone size={12} />
                {patient.phone}
              </span>
              {patient.email && (
                <span className="row">
                  <Mail size={12} />
                  {patient.email}
                </span>
              )}
            </div>
          </div>
        </div>
        <span className="badge">
          {patient.type === "DENTAL"
            ? "Paciente dental"
            : "Medicina general"}
        </span>
      </div>

      <nav className="tabs" aria-label="Secciones del expediente">
        <a className="tab active" href="#datos">
          Datos
        </a>
        <a className="tab" href="#historia">
          Historia clínica
        </a>
        {patient.type === "DENTAL" && (
          <a className="tab" href="#odontograma">
            Odontograma
          </a>
        )}
        <a className="tab" href="#tratamientos">
          Tratamientos
        </a>
        <a className="tab" href="#pagos">
          Pagos
        </a>
        <a className="tab" href="#archivos">
          Archivos
        </a>
      </nav>

      <div className="grid two patient-layout">
        <main className="grid">
          <section className="card" id="datos">
            <h2>Resumen clínico</h2>
            <div className="grid three">
              <Info
                label="Fecha de nacimiento"
                value={dateMx(patient.birthDate)}
              />
              <Info label="Sexo" value={patient.gender} />
              <Info
                label="Tipo de atención"
                value={patient.type === "DENTAL" ? "Dental" : "Médica"}
              />
              <Info
                label="Alergias"
                value={patient.allergies || "Sin registro"}
              />
              <Info
                label="Antecedentes"
                value={patient.conditions || "Sin registro"}
              />
              <Info label="Saldo pendiente" value={money(balance)} />
            </div>
          </section>

          <section id="historia">
            <AIScribe patientId={patient.id} />
            <div className="card section-gap">
              <h2>Historia clínica · notas SOAP</h2>
              {patient.notes.length ? (
                patient.notes.map((note) => (
                  <article className="clinical-note" key={note.id}>
                    <div className="row between">
                      <b>{dateMx(note.date)}</b>
                      <div className="row">
                        {note.aiGenerated && (
                          <span className="badge">Revisada desde IA</span>
                        )}
                        <span className="small">{note.professional.name}</span>
                      </div>
                    </div>
                    <p>
                      <b>S:</b> {note.subjective}
                    </p>
                    <p>
                      <b>O:</b> {note.objective}
                    </p>
                    <p>
                      <b>A:</b> {note.assessment}
                    </p>
                    <p>
                      <b>P:</b> {note.plan}
                    </p>
                    {note.diagnoses && (
                      <span className="badge">{note.diagnoses}</span>
                    )}
                  </article>
                ))
              ) : (
                <p className="small">Aún no hay notas clínicas.</p>
              )}
            </div>
          </section>

          {patient.type === "DENTAL" && (
            <section id="odontograma">
              <Odontogram
                patientId={patient.id}
                findings={patient.odontogram}
              />
            </section>
          )}

          <section className="card" id="tratamientos">
            <div className="row between"><h2>Tratamientos</h2><details><summary className="btn primary">Nuevo tratamiento</summary><div className="modal-like"><TreatmentForm
              patients={[{ id: patient.id, name: `${patient.firstName} ${patient.lastName}` }]}
              professionals={professionals.map((item) => ({ id: item.id, name: item.name }))}
              prices={prices.map((item) => ({ id: item.id, name: item.name, price: item.price }))}
              patientId={patient.id}
            /></div></details></div>
            {patient.treatments.length ? (
              patient.treatments.map((treatment) => {
                const plannedTotal = treatment.procedures.reduce((sum, procedure) => sum + procedure.price * procedure.quantity, 0);
                const realizedTotal = treatment.procedures.filter((procedure) => procedure.status === "REALIZADA").reduce((sum, procedure) => sum + procedure.price * procedure.quantity, 0);
                const progress = treatment.evolutions.at(-1)?.cumulativeProgress ?? 0;
                const pending = treatment.procedures.filter((procedure) => procedure.status === "PLANIFICADA");
                return (
                <details className="treatment-card" key={treatment.id} id={`tratamiento-${treatment.id}`}>
                  <summary className="details-summary">
                  <div className="row between">
                    <div>
                      <b>{treatment.title}</b>
                      <span className={"badge " + treatment.status}>
                        {statusLabel[treatment.status]}
                      </span>
                    </div>
                    <span className="small">Responsable: {treatment.responsibleProfessional.name}</span>
                  </div>
                  <div className="progress"><span style={{ width: `${progress}%` }} /></div>
                  <div className="row between small"><b>{progress}% de avance</b><span>Planificado {money(plannedTotal)} · Realizado {money(realizedTotal)}</span></div>
                  </summary>
                  <div className="treatment-detail">
                    {treatment.diagnosis && <p><b>Diagnóstico / motivo:</b> {treatment.diagnosis}</p>}
                    {treatment.notes && <p className="small">{treatment.notes}</p>}
                    <form action={updateTreatmentStatus} className="row"><input type="hidden" name="id" value={treatment.id} /><label className="small" htmlFor={`status-${treatment.id}`}>Estado</label><select id={`status-${treatment.id}`} className="input" name="status" defaultValue={treatment.status}>{["PLANIFICADO", "EN_CURSO", "TERMINADO", "SUSPENDIDO"].map((status) => <option value={status} key={status}>{statusLabel[status]}</option>)}</select><button className="btn">Guardar estado</button></form>
                    <h3>Evoluciones</h3>
                    {treatment.evolutions.length ? <ol className="timeline">{treatment.evolutions.map((evolution, index) => <li key={evolution.id}>
                      <div className="row between"><b>Sesión {index + 1} · {dateMx(evolution.date)}</b><span className="badge">Avance {evolution.cumulativeProgress}%</span></div>
                      <div className="small">{evolution.professional.name}</div><p>{evolution.clinicalNotes}</p>
                      {evolution.nextSteps && <p className="small"><b>Próximos pasos:</b> {evolution.nextSteps}</p>}
                      {evolution.procedures.length > 0 && <ul className="compact-list">{evolution.procedures.map((procedure) => <li key={procedure.id}>{procedure.name}{procedure.tooth ? ` · pieza ${procedure.tooth}` : ""}{procedure.surface ? ` · ${procedure.surface}` : ""} · {procedure.quantity} × {money(procedure.price)}</li>)}</ul>}
                    </li>)}</ol> : <p className="small">Aún no hay evoluciones.</p>}
                    <h3>Prestaciones pendientes</h3>
                    {pending.length ? <ul className="compact-list">{pending.map((procedure) => <li key={procedure.id}>{procedure.name}{procedure.tooth ? ` · pieza ${procedure.tooth}` : ""}{procedure.surface ? ` · ${procedure.surface}` : ""} · {procedure.quantity} × {money(procedure.price)}</li>)}</ul> : <p className="small">No hay prestaciones planificadas pendientes.</p>}
                    <details className="details-form"><summary className="btn primary">Registrar evolución</summary><EvolutionForm
                      treatmentId={treatment.id}
                      previousProgress={progress}
                      defaultProfessionalId={treatment.responsibleProfessional.id}
                      professionals={professionals.map((item) => ({ id: item.id, name: item.name }))}
                      appointments={patient.appointments.map((appointment) => ({ id: appointment.id, name: `${dateMx(appointment.start)} · ${appointment.reason}` }))}
                      pending={pending.map((procedure) => ({ id: procedure.id, name: procedure.name, tooth: procedure.tooth, surface: procedure.surface, price: procedure.price, quantity: procedure.quantity }))}
                      prices={prices.map((item) => ({ id: item.id, name: item.name, price: item.price }))}
                    /></details>
                  </div>
                </details>
              );})
            ) : (
              <p className="small">Sin tratamientos registrados.</p>
            )}
          </section>

          <section className="card" id="pagos">
            <div className="row between">
              <h2>Pagos</h2>
              <span className="badge">Saldo {money(balance)}</span>
            </div>
            {patient.payments.length ? (
              patient.payments.map((payment) => (
                <div className="listitem" key={payment.id}>
                  <span>
                    {dateMx(payment.date)} · {payment.method}
                    {payment.reference ? " · " + payment.reference : ""}
                    {payment.treatmentId ? " · aplicado a tratamiento" : ""}
                  </span>
                  <b>{money(payment.amount)}</b>
                </div>
              ))
            ) : (
              <p className="small">Sin pagos registrados.</p>
            )}
          </section>

          <section className="card" id="archivos">
            <h2>Archivos · metadatos</h2>
            {patient.files.length ? (
              patient.files.map((file) => (
                <div className="listitem" key={file.id}>
                  <span className="row">
                    <Activity size={15} />
                    {file.name}
                  </span>
                  <span className="small">
                    {file.kind} · {file.size} · {dateMx(file.date)}
                  </span>
                </div>
              ))
            ) : (
              <p className="small">Sin archivos registrados.</p>
            )}
            <details className="details-form">
              <summary className="btn ghost">Agregar metadatos</summary>
              <form action={addPatientFile} className="formgrid">
                <input type="hidden" name="patientId" value={patient.id} />
                <InfoField label="Nombre">
                  <input className="input" name="name" required />
                </InfoField>
                <InfoField label="Tipo">
                  <input
                    className="input"
                    name="kind"
                    placeholder="Radiografía, estudio…"
                    required
                  />
                </InfoField>
                <InfoField label="Tamaño">
                  <input
                    className="input"
                    name="size"
                    placeholder="2.4 MB"
                    required
                  />
                </InfoField>
                <button className="btn primary">Guardar metadatos</button>
              </form>
            </details>
          </section>
        </main>

        <aside>
          <PatientCopilot patientId={patient.id} />
        </aside>
      </div>
    </>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="small">{label}</div>
      <b className="info-value">{value}</b>
    </div>
  );
}

function InfoField({
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
