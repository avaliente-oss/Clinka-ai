import { Activity, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { AIScribe } from "@/components/ai-scribe";
import { Odontogram } from "@/components/odontogram";
import { PatientCopilot } from "@/components/patient-copilot";
import { addPatientFile } from "@/lib/actions";
import { db } from "@/lib/db";
import { dateMx, money, statusLabel } from "@/lib/utils";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const patient = await db.patient.findUnique({
    where: { id },
    include: {
      notes: {
        include: { professional: true },
        orderBy: { date: "desc" },
      },
      odontogram: { orderBy: [{ tooth: "asc" }, { surface: "asc" }] },
      treatments: {
        include: { items: true },
        orderBy: { createdAt: "desc" },
      },
      payments: { orderBy: { date: "desc" } },
      files: { orderBy: { date: "desc" } },
    },
  });

  if (!patient) notFound();

  const treatmentTotal = patient.treatments.reduce(
    (sum, treatment) => sum + treatment.total,
    0,
  );
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
            <h2>Tratamientos y presupuestos</h2>
            {patient.treatments.length ? (
              patient.treatments.map((treatment) => (
                <div className="treatment-card" key={treatment.id}>
                  <div className="row between">
                    <div>
                      <b>{treatment.title}</b>
                      <span className={"badge " + treatment.status}>
                        {statusLabel[treatment.status]}
                      </span>
                    </div>
                    <b>{money(treatment.total)}</b>
                  </div>
                  <ul className="compact-list">
                    {treatment.items.map((item) => (
                      <li key={item.id}>
                        Fase {item.phase} · {item.description}
                        {item.tooth ? " · pieza " + item.tooth : ""} ·{" "}
                        {item.quantity} × {money(item.unitPrice)}
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            ) : (
              <p className="small">Sin planes de tratamiento registrados.</p>
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
