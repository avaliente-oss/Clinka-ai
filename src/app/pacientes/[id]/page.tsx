import { Activity, Mail, Phone } from "lucide-react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { BalanceValue } from "@/components/balance-value";
import { DeleteTreatmentButton } from "@/components/delete-treatment-button";
import { AIScribe } from "@/components/ai-scribe";
import { EvolutionForm } from "@/components/evolution-form";
import { Odontogram } from "@/components/odontogram";
import { PatientCopilot } from "@/components/patient-copilot";
import { PatientDocuments } from "@/components/patient-documents";
import { PatientTabs } from "@/components/patient-tabs";
import { TreatmentForm } from "@/components/treatment-form";
import { addPatientFile, updateTreatmentStatus } from "@/lib/actions";
import { db } from "@/lib/db";
import { addMoney, procedureNet, proceduresTotal, serializeMoney, subtractMoney, sumMoney } from "@/lib/money";
import { activeWhere } from "@/lib/soft-delete";
import { dateMx, enumLabel, money, statusLabel } from "@/lib/utils";
import { parseDemoView } from "@/lib/demo-view";
import { type DocumentKind } from "@/lib/documents";
import { DocumentType, PatientType, ProcedureStatus } from "@prisma/client";

export default async function PatientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const demoView = parseDemoView((await cookies()).get("clinika_view")?.value);
  const administrationOnly = demoView === "administracion";
  const clinicalOnly = demoView === "clinica";
  const [patient, professionals, prices, documentTemplates] = await Promise.all([
    db.patient.findFirst({ where: activeWhere({ id }), include: {
      notes: {
        where: activeWhere(),
        include: { professional: true },
        orderBy: { date: "desc" },
      },
      odontogram: { orderBy: [{ tooth: "asc" }, { surface: "asc" }] },
      treatments: {
        where: activeWhere(),
        include: {
          responsibleProfessional: true,
          procedures: true,
          payments: true,
          evolutions: {
            where: activeWhere(),
            include: { professional: true, procedures: { include: { performedBy: true } } },
            orderBy: [{ date: "asc" }, { createdAt: "asc" }],
          },
        },
        orderBy: { createdAt: "desc" },
      },
      appointments: { orderBy: { start: "desc" }, take: 30 },
      payments: { orderBy: { date: "desc" } },
      files: { orderBy: { date: "desc" } },
      prescriptions: { where: activeWhere(), include: { professional: true, items: { orderBy: { order: "asc" } } }, orderBy: { date: "desc" } },
      issuedDocuments: { include: { createdBy: true }, orderBy: { createdAt: "desc" } },
    } }),
    db.professional.findMany({ orderBy: { name: "asc" } }),
    db.priceItem.findMany({ orderBy: { name: "asc" } }),
    db.documentTemplate.findMany({ where: activeWhere(), orderBy: [{ type: "asc" }, { isDefault: "desc" }, { name: "asc" }] }),
  ]);

  if (!patient) notFound();

  const treatmentTotal = patient.treatments.reduce((sum, treatment) =>
    sum.plus(proceduresTotal(treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA))), addMoney());
  const paidTotal = sumMoney(patient.payments, (payment) => payment.amount);
  const balance = subtractMoney(treatmentTotal, paidTotal);
  const availableDocuments: DocumentKind[] = clinicalOnly
    ? [DocumentType.RECETA, DocumentType.CONSENTIMIENTO]
    : administrationOnly
      ? [DocumentType.PRESUPUESTO, DocumentType.ESTADO_CUENTA]
      : [DocumentType.PRESUPUESTO, DocumentType.RECETA, DocumentType.CONSENTIMIENTO, DocumentType.ESTADO_CUENTA];
  const tabs = [
    { id: "datos", label: "Datos" },
    ...(!administrationOnly ? [{ id: "historia", label: "Historia clínica" }] : []),
    ...(!administrationOnly && patient.type === PatientType.DENTAL ? [{ id: "odontograma", label: "Odontograma" }] : []),
    { id: "tratamientos", label: "Tratamientos" },
    ...(!clinicalOnly ? [{ id: "pagos", label: "Pagos" }] : []),
    { id: "documentos", label: "Documentos" },
    { id: "archivos", label: "Archivos" },
  ];

  return (
    <div className="page-stack">
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
          {patient.type === PatientType.DENTAL
            ? "Paciente dental"
            : "Medicina general"}
        </span>
      </div>

      <PatientTabs tabs={tabs} />

      <div className={administrationOnly ? "patient-layout" : "grid-2 patient-layout"}>
        <main className="patient-panel-stack">
          <section aria-labelledby="tab-datos" data-patient-panel id="datos" role="tabpanel" tabIndex={0}>
            <div className="card">
            <h2>{administrationOnly ? "Datos del paciente" : "Resumen clínico"}</h2>
            <div className="grid three">
              <Info
                label="Fecha de nacimiento"
                value={dateMx(patient.birthDate)}
              />
              <Info label="Sexo" value={enumLabel[patient.gender]} />
              <Info
                label="Tipo de atención"
                value={patient.type === PatientType.DENTAL ? "Dental" : "Médica"}
              />
              {!administrationOnly && <Info label="Alergias" value={patient.allergies || "Sin registro"} />}
              {!administrationOnly && <Info label="Antecedentes" value={patient.conditions || "Sin registro"} />}
              {!clinicalOnly && <Info label="Saldo pendiente" value={<BalanceValue value={balance} />} />}
            </div>
            </div>
            {!administrationOnly && <AIScribe patientId={patient.id} />}
          </section>

          {!administrationOnly && <section aria-labelledby="tab-historia" data-patient-panel hidden id="historia" role="tabpanel" tabIndex={0}>
            <div className="card">
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
          </section>}

          {!administrationOnly && patient.type === PatientType.DENTAL && (
            <section aria-labelledby="tab-odontograma" data-patient-panel hidden id="odontograma" role="tabpanel" tabIndex={0}>
              <Odontogram
                patientId={patient.id}
                findings={patient.odontogram}
              />
            </section>
          )}

          <section aria-labelledby="tab-tratamientos" className="card" data-patient-panel hidden id="tratamientos" role="tabpanel" tabIndex={0}>
            {!administrationOnly ? <details className="panel-header-form"><summary className="row between"><h2>Tratamientos</h2><span className="btn primary">Nuevo tratamiento</span></summary><div className="modal-like"><TreatmentForm
              patients={[{ id: patient.id, name: `${patient.firstName} ${patient.lastName}` }]}
              professionals={professionals.map((item) => ({ id: item.id, name: item.name }))}
              prices={prices.map((item) => ({ id: item.id, name: item.name, price: serializeMoney(item.price) }))}
              patientId={patient.id}
            /></div></details> : <><h2>Tratamientos · resumen financiero</h2><p className="small">Vista de consulta: importes realizados, pagos y saldo por tratamiento.</p></>}
            {patient.treatments.length ? (
              patient.treatments.map((treatment) => {
                const plannedTotal = proceduresTotal(treatment.procedures);
                const realizedTotal = proceduresTotal(treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA));
                const paidTotal = sumMoney(treatment.payments, (payment) => payment.amount);
                const treatmentBalance = subtractMoney(realizedTotal, paidTotal);
                const progress = treatment.evolutions.at(-1)?.cumulativeProgress ?? 0;
                const pending = treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.PLANIFICADA);
                const deleteBlockedReason = treatment.evolutions.length || treatment.procedures.some((procedure) => procedure.status === ProcedureStatus.REALIZADA) || treatment.payments.length
                  ? "Tiene evoluciones, prestaciones realizadas o pagos; márcalo como suspendido."
                  : undefined;
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
                  {!administrationOnly && <div className="progress"><span style={{ width: `${progress}%` }} /></div>}
                  <div className="row between small">{!administrationOnly && <b>{progress}% de avance</b>}<span className="row treatment-totals"><span>Total {money(plannedTotal)} · Realizado {money(realizedTotal)} · Pagado {money(paidTotal)} · Saldo</span><BalanceValue value={treatmentBalance} /></span></div>
                  </summary>
                  <div className="treatment-detail">
                    {administrationOnly ? (
                      <div className="grid three">
                        <Info label="Total planificado" value={money(plannedTotal)} />
                        <Info label="Realizado" value={money(realizedTotal)} />
                        <Info label="Pagado" value={money(paidTotal)} />
                        <Info label="Saldo" value={<BalanceValue value={treatmentBalance} />} />
                      </div>
                    ) : <>
                    {treatment.diagnosis && <p><b>Diagnóstico / motivo:</b> {treatment.diagnosis}</p>}
                    {treatment.notes && <p className="small">{treatment.notes}</p>}
                    <p className="notice">Saldo = prestaciones realizadas netas − pagos ligados a este tratamiento.</p>
                    <form action={updateTreatmentStatus} className="row"><input type="hidden" name="id" value={treatment.id} /><label className="small" htmlFor={`status-${treatment.id}`}>Estado</label><select id={`status-${treatment.id}`} className="input" name="status" defaultValue={treatment.status}>{["PLANIFICADO", "EN_CURSO", "TERMINADO", "SUSPENDIDO"].map((status) => <option value={status} key={status}>{statusLabel[status]}</option>)}</select><button className="btn">Guardar estado</button></form>
                    <div className="row treatment-actions"><DeleteTreatmentButton id={treatment.id} title={treatment.title} blockedReason={deleteBlockedReason} />{deleteBlockedReason && <span className="small">{deleteBlockedReason}</span>}</div>
                    <h3>Evoluciones</h3>
                    {treatment.evolutions.length ? <ol className="timeline">{treatment.evolutions.map((evolution, index) => <li key={evolution.id}>
                      <div className="row between"><b>Sesión {index + 1} · {dateMx(evolution.date)}</b><span className="badge">Avance {evolution.cumulativeProgress}%</span></div>
                      <div className="small">{evolution.professional.name}</div><p>{evolution.clinicalNotes}</p>
                      {evolution.nextSteps && <p className="small"><b>Próximos pasos:</b> {evolution.nextSteps}</p>}
                      {evolution.procedures.length > 0 && <ul className="compact-list">{evolution.procedures.map((procedure) => <li key={procedure.id}><span>{procedure.name}{procedure.tooth ? ` · Pieza ${procedure.tooth}` : ""}{procedure.surfaces.length ? ` · ${procedure.surfaces.map((surface) => enumLabel[surface]).join(", ")}` : ""} · neto {money(procedureNet(procedure))}</span>{procedure.performedAt && procedure.performedBy && <div className="small">Realizada el {dateMx(procedure.performedAt)} por {procedure.performedBy.name}</div>}</li>)}</ul>}
                    </li>)}</ol> : <p className="small">Aún no hay evoluciones.</p>}
                    <h3>Prestaciones pendientes</h3>
                    {pending.length ? <ul className="compact-list">{pending.map((procedure) => <li key={procedure.id}>{procedure.name}{procedure.tooth ? ` · Pieza ${procedure.tooth}` : ""}{procedure.surfaces.length ? ` · ${procedure.surfaces.map((surface) => enumLabel[surface]).join(", ")}` : ""} · neto {money(procedureNet(procedure))}</li>)}</ul> : <p className="small">No hay prestaciones planificadas pendientes.</p>}
                    <details className="details-form"><summary className="btn primary">Registrar evolución</summary><EvolutionForm
                      treatmentId={treatment.id}
                      previousProgress={progress}
                      defaultProfessionalId={treatment.responsibleProfessional.id}
                      professionals={professionals.map((item) => ({ id: item.id, name: item.name }))}
                      appointments={patient.appointments.map((appointment) => ({ id: appointment.id, name: `${dateMx(appointment.start)} · ${appointment.reason}` }))}
                      pending={pending.map((procedure) => ({ id: procedure.id, name: procedure.name, tooth: procedure.tooth, surfaces: procedure.surfaces, price: serializeMoney(procedure.price), quantity: procedure.quantity, discount: serializeMoney(procedure.discount) }))}
                      prices={prices.map((item) => ({ id: item.id, name: item.name, price: serializeMoney(item.price) }))}
                      treatmentTotal={serializeMoney(plannedTotal)}
                      realizedTotal={serializeMoney(realizedTotal)}
                    /></details>
                    </>}
                  </div>
                </details>
              );})
            ) : (
              <p className="small">Sin tratamientos registrados.</p>
            )}
          </section>

          {!clinicalOnly && <section aria-labelledby="tab-pagos" className="card" data-patient-panel hidden id="pagos" role="tabpanel" tabIndex={0}>
            <div className="row between">
              <h2>Pagos</h2>
              <BalanceValue value={balance} />
            </div>
            {patient.payments.length ? (
              patient.payments.map((payment) => (
                <div className="listitem" key={payment.id}>
                  <span>
                    {dateMx(payment.date)} · {enumLabel[payment.method]}
                    {payment.reference ? " · " + payment.reference : ""}
                    {payment.treatmentId ? " · aplicado a tratamiento" : ""}
                  </span>
                  <b className="payment-amount">{money(payment.amount)}</b>
                </div>
              ))
            ) : (
              <p className="small">Sin pagos registrados.</p>
            )}
          </section>}

          <section aria-labelledby="tab-documentos" className="card" data-patient-panel hidden id="documentos" role="tabpanel" tabIndex={0}>
            <div className="row between"><div><h2>Documentos del paciente</h2><p className="small">Cada emisión conserva una copia inmutable para reimpresión.</p></div><span className="badge">{patient.issuedDocuments.length} emitidos</span></div>
            <PatientDocuments
              patientId={patient.id}
              available={availableDocuments}
              templates={documentTemplates.filter((template) => availableDocuments.includes(template.type)).map((template) => ({ id: template.id, name: template.name, type: template.type, isDefault: template.isDefault }))}
              treatments={patient.treatments.map((treatment) => ({ id: treatment.id, name: treatment.title }))}
              professionals={professionals.map((professional) => ({ id: professional.id, name: `${professional.name}${professional.licenseNumber ? ` · Céd. ${professional.licenseNumber}` : ""}` }))}
              prescriptions={patient.prescriptions.map((prescription) => ({ id: prescription.id, date: dateMx(prescription.date), professional: prescription.professional.name, diagnosis: prescription.diagnosis ?? "", itemSummary: prescription.items.map((item) => item.medication).join(", ") }))}
              issued={patient.issuedDocuments.filter((document) => availableDocuments.includes(document.type)).map((document) => ({ id: document.id, type: document.type, title: document.title, date: dateMx(document.createdAt, { dateStyle: "medium", timeStyle: "short" }), user: document.createdBy?.name ?? "Sistema" }))}
            />
          </section>

          <section aria-labelledby="tab-archivos" className="card" data-patient-panel hidden id="archivos" role="tabpanel" tabIndex={0}>
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

        {!administrationOnly && <aside className="patient-aside"><PatientCopilot patientId={patient.id} /></aside>}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
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
