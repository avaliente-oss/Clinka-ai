"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { issueDocumentState, type DocumentActionState } from "@/lib/document-actions";
import { documentTypeLabel, type DocumentKind } from "@/lib/documents";

type Option = { id: string; name: string };
type Template = Option & { type: DocumentKind; isDefault: boolean };
type PrescriptionItem = { medication: string; dose: string; frequency: string; duration: string; instructions: string };
type PreviousPrescription = { id: string; date: string; professional: string; diagnosis: string; itemSummary: string };
type Issued = { id: string; type: DocumentKind; title: string; date: string; user: string };
const initial: DocumentActionState = {};
const emptyItem: PrescriptionItem = { medication: "", dose: "", frequency: "", duration: "", instructions: "" };

export function PatientDocuments({ patientId, available, templates, treatments, professionals, prescriptions, issued }: { patientId: string; available: DocumentKind[]; templates: Template[]; treatments: Option[]; professionals: Option[]; prescriptions: PreviousPrescription[]; issued: Issued[] }) {
  return <div className="grid patient-documents">
    <div className="document-issue-grid">{available.includes("PRESUPUESTO") && <SimpleIssueForm patientId={patientId} templates={templates} treatments={treatments} type="PRESUPUESTO" />}{available.includes("RECETA") && <PrescriptionForm patientId={patientId} professionals={professionals} templates={templates} />}{available.includes("CONSENTIMIENTO") && <SimpleIssueForm patientId={patientId} templates={templates} treatments={treatments} type="CONSENTIMIENTO" />}{available.includes("ESTADO_CUENTA") && <SimpleIssueForm patientId={patientId} templates={templates} treatments={treatments} type="ESTADO_CUENTA" />}</div>
    {available.includes("RECETA") && <div><h3>Recetas anteriores</h3>{prescriptions.length ? <div className="list">{prescriptions.map((item) => <div className="listitem" key={item.id}><span><b>{item.date} · {item.professional}</b><span className="small block">{item.diagnosis || "Sin diagnóstico"} · {item.itemSummary}</span></span><ReissuePrescription patientId={patientId} prescriptionId={item.id} templates={templates} /></div>)}</div> : <p className="small">No hay recetas registradas.</p>}</div>}
    <div><h3>Documentos emitidos</h3>{issued.length ? <div className="list">{issued.map((item) => <div className="listitem" key={item.id}><span><span className="badge">{documentTypeLabel[item.type]}</span> <b>{item.title}</b><span className="small block">{item.date} · {item.user}</span></span><Link className="btn ghost" href={`/documentos/${item.id}`}>Volver a imprimir</Link></div>)}</div> : <p className="small">Aún no se han emitido documentos para este paciente.</p>}</div>
  </div>;
}

function templatesFor(templates: Template[], type: DocumentKind) { return templates.filter((item) => item.type === type); }
function Feedback({ state }: { state: DocumentActionState }) { return state.error ? <p className="form-error" role="alert">{state.error}</p> : null; }

function SimpleIssueForm({ patientId, templates, treatments, type }: { patientId: string; templates: Template[]; treatments: Option[]; type: "PRESUPUESTO" | "CONSENTIMIENTO" | "ESTADO_CUENTA" }) {
  const [state, action, pending] = useActionState(issueDocumentState, initial);
  const options = templatesFor(templates, type);
  const value = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  return <details className="document-issue-card"><summary><b>{documentTypeLabel[type]}</b><span className="small">Preparar e imprimir</span></summary><form action={action} className="grid"><input name="patientId" type="hidden" value={patientId} /><input name="type" type="hidden" value={type} /><label className="field"><span>Plantilla</span><select className="input" defaultValue={value("templateId", options.find((item) => item.isDefault)?.id ?? options[0]?.id)} name="templateId" required>{options.map((item) => <option key={item.id} value={item.id}>{item.name}{item.isDefault ? " · Predeterminada" : ""}</option>)}</select></label>{type !== "ESTADO_CUENTA" && <label className="field"><span>Tratamiento {type === "CONSENTIMIENTO" && "(opcional)"}</span><select className="input" defaultValue={value("treatmentId")} name="treatmentId" required={type === "PRESUPUESTO"}><option value="">{type === "PRESUPUESTO" ? "Selecciona un tratamiento" : "Sin tratamiento específico"}</option>{treatments.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>}<Feedback state={state} /><button className="btn primary" disabled={pending || !options.length}>{pending ? "Emitiendo…" : "Emitir documento"}</button>{!options.length && <p className="form-warning">No hay una plantilla disponible para este tipo.</p>}</form></details>;
}

function PrescriptionForm({ patientId, templates, professionals }: { patientId: string; templates: Template[]; professionals: Option[] }) {
  const [state, action, pending] = useActionState(issueDocumentState, initial);
  const [items, setItems] = useState<PrescriptionItem[]>([{ ...emptyItem }]);
  const options = templatesFor(templates, "RECETA");
  const value = (name: string, fallback = "") => state.values?.[name] ?? fallback;
  const update = (index: number, patch: Partial<PrescriptionItem>) => setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  return <details className="document-issue-card"><summary><b>Receta</b><span className="small">Crear receta e imprimir</span></summary><form action={action} className="grid"><input name="patientId" type="hidden" value={patientId} /><input name="type" type="hidden" value="RECETA" /><input name="items" type="hidden" value={JSON.stringify(items)} /><div className="formgrid"><label className="field"><span>Profesional</span><select className="input" defaultValue={value("professionalId", professionals[0]?.id)} name="professionalId" required>{professionals.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field"><span>Plantilla</span><select className="input" defaultValue={value("templateId", options.find((item) => item.isDefault)?.id ?? options[0]?.id)} name="templateId" required>{options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label className="field span-all"><span>Diagnóstico (opcional)</span><input className="input" defaultValue={value("diagnosis")} name="diagnosis" /></label></div><div className="row between"><b>Medicamentos</b><button className="btn ghost" onClick={() => setItems((current) => [...current, { ...emptyItem }])} type="button"><Plus size={14} /> Agregar</button></div>{items.map((item, index) => <fieldset className="prescription-item-form" key={index}>
  <div className="prescription-item-head"><legend>Medicamento {index + 1}</legend><button aria-label={`Quitar medicamento ${index + 1}`} className="btn ghost icon-btn" disabled={items.length === 1} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} title="Quitar medicamento" type="button"><Trash2 size={14} /></button></div>
  <label className="field"><span>Medicamento y presentación</span><input className="input" onChange={(event) => update(index, { medication: event.target.value })} placeholder="Ej. Ibuprofeno 400 mg tabletas" required value={item.medication} /></label>
  <div className="prescription-item-dosage">
    <label className="field"><span>Dosis</span><input className="input" onChange={(event) => update(index, { dose: event.target.value })} placeholder="1 tableta" required value={item.dose} /></label>
    <label className="field"><span>Frecuencia</span><input className="input" onChange={(event) => update(index, { frequency: event.target.value })} placeholder="Cada 8 horas" required value={item.frequency} /></label>
    <label className="field"><span>Duración</span><input className="input" onChange={(event) => update(index, { duration: event.target.value })} placeholder="3 días" required value={item.duration} /></label>
  </div>
  <label className="field"><span>Indicaciones (opcional)</span><input className="input" onChange={(event) => update(index, { instructions: event.target.value })} placeholder="Tomar con alimentos" value={item.instructions} /></label>
</fieldset>)}<label className="field"><span>Notas (opcional)</span><textarea className="input" defaultValue={value("notes")} name="notes" rows={2} /></label><Feedback state={state} /><button className="btn primary" disabled={pending || !options.length}>{pending ? "Emitiendo…" : "Guardar receta y emitir"}</button></form></details>;
}

function ReissuePrescription({ patientId, prescriptionId, templates }: { patientId: string; prescriptionId: string; templates: Template[] }) {
  const [state, action, pending] = useActionState(issueDocumentState, initial);
  const options = templatesFor(templates, "RECETA");
  return <form action={action} className="reissue-form"><input name="patientId" type="hidden" value={patientId} /><input name="prescriptionId" type="hidden" value={prescriptionId} /><input name="templateId" type="hidden" value={options.find((item) => item.isDefault)?.id ?? options[0]?.id ?? ""} /><input name="type" type="hidden" value="RECETA" /><button className="btn ghost" disabled={pending || !options.length}>{pending ? "Preparando…" : "Volver a imprimir"}</button><Feedback state={state} /></form>;
}
