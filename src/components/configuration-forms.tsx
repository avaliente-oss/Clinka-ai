/* eslint-disable @next/next/no-img-element */
"use client";

import { useActionState, useMemo, useRef, useState } from "react";
import { Copy, Plus, Trash2 } from "lucide-react";
import { DocumentRenderer } from "./document-renderer";
import { blockPlaceholder, documentTypeLabel, scalarPlaceholders, unknownPlaceholders, type DocumentKind } from "@/lib/documents";
import { deleteTemplateState, duplicateTemplateState, saveTemplateState, setDefaultTemplateState, updateClinicDocumentState, updateProfessionalDocumentState, type DocumentActionState } from "@/lib/document-actions";

const initial: DocumentActionState = {};
const val = (state: DocumentActionState, field: string, fallback = "") => state.values?.[field] ?? fallback;

function Feedback({ state }: { state: DocumentActionState }) { return state.error ? <p className="form-error" role="alert">{state.error}</p> : state.success ? <p className="form-success" role="status">{state.success}</p> : null; }
function Field({ label, children, wide = false }: { label: string; children: React.ReactNode; wide?: boolean }) { return <div className={`field${wide ? " span-all" : ""}`}><label>{label}</label>{children}</div>; }

export function ClinicDocumentForm({ clinic }: { clinic: Record<string, string> }) {
  const [state, action, pending] = useActionState(updateClinicDocumentState, initial);
  const [logo, setLogo] = useState(clinic.logoUrl);
  return <form action={action} className="formgrid" key={state.submissionId ?? "clinic"}>
    <Field label="Nombre comercial"><input className="input" defaultValue={val(state, "name", clinic.name)} name="name" required /></Field>
    <Field label="Razón social"><input className="input" defaultValue={val(state, "legalName", clinic.legalName)} name="legalName" /></Field>
    <Field label="RFC"><input className="input" defaultValue={val(state, "rfc", clinic.rfc)} name="rfc" /></Field>
    <Field label="Teléfono"><input className="input" defaultValue={val(state, "phone", clinic.phone)} name="phone" /></Field>
    <Field label="Correo"><input className="input" defaultValue={val(state, "email", clinic.email)} name="email" type="email" /></Field>
    <Field label="Dirección" wide><input className="input" defaultValue={val(state, "address", clinic.address)} name="address" /></Field>
    <Field label="URL del logotipo" wide><input className="input" defaultValue={val(state, "logoUrl", clinic.logoUrl)} name="logoUrl" onChange={(event) => setLogo(event.target.value)} placeholder="https://… o /logo.png" /><div className="logo-preview">{logo ? <img alt="Vista previa del logotipo" src={logo} /> : <b>{val(state, "name", clinic.name)}</b>}</div><span className="small">Si se deja vacío, los documentos muestran el nombre de la clínica.</span></Field>
    <Field label="Pie de documento" wide><textarea className="input" defaultValue={val(state, "documentFooter", clinic.documentFooter)} name="documentFooter" rows={3} /></Field>
    <div className="span-all"><Feedback state={state} /></div><button className="btn primary span-all" disabled={pending}>{pending ? "Guardando…" : "Guardar datos"}</button>
  </form>;
}

export function ProfessionalDocumentForm({ professional }: { professional: { id: string; name: string; specialty: string; licenseNumber: string; specialtyLicense: string; university: string } }) {
  const [state, action, pending] = useActionState(updateProfessionalDocumentState, initial);
  return <form action={action} className="professional-document-form" key={state.submissionId ?? professional.id}><input name="id" type="hidden" value={professional.id} /><div><b>{professional.name}</b><span className="small block">{professional.specialty}</span></div><input aria-label="Cédula profesional" className="input" defaultValue={val(state, "licenseNumber", professional.licenseNumber)} name="licenseNumber" placeholder="Cédula profesional" /><input aria-label="Cédula de especialidad" className="input" defaultValue={val(state, "specialtyLicense", professional.specialtyLicense)} name="specialtyLicense" placeholder="Cédula de especialidad" /><input aria-label="Universidad" className="input" defaultValue={val(state, "university", professional.university)} name="university" placeholder="Universidad" /><button className="btn" disabled={pending}>{pending ? "Guardando…" : "Guardar"}</button><Feedback state={state} /></form>;
}

type TemplateValue = { id?: string; type: DocumentKind; name: string; title: string; body: string; isDefault: boolean };
const blank: TemplateValue = { type: "PRESUPUESTO", name: "", title: "", body: "", isDefault: false };

export function TemplateEditor({ template, open = false }: { template?: TemplateValue; open?: boolean }) {
  const source = template ?? blank;
  const [state, action, pending] = useActionState(saveTemplateState, initial);
  const [type, setType] = useState<DocumentKind>(source.type);
  const [name, setName] = useState(source.name);
  const [title, setTitle] = useState(source.title);
  const [body, setBody] = useState(source.body);
  const [isDefault, setIsDefault] = useState(source.isDefault);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const unknown = useMemo(() => unknownPlaceholders(body, type), [body, type]);
  const placeholders = [...scalarPlaceholders, ...blockPlaceholder[type]];
  function insert(token: string) { const element = textarea.current; const start = element?.selectionStart ?? body.length; const end = element?.selectionEnd ?? body.length; const next = `${body.slice(0, start)}{{${token}}}${body.slice(end)}`; setBody(next); requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(start + token.length + 4, start + token.length + 4); }); }
  return <details className="template-editor" open={open}><summary><span><b>{template ? template.name : "Nueva plantilla"}</b><span className="small block">{documentTypeLabel[type]}{isDefault ? " · Predeterminada" : ""}</span></span><span className="small">{template ? "Editar" : "Crear"}</span></summary><form action={action} className="template-editor-grid">{template?.id && <><input name="id" type="hidden" value={template.id} /><input name="type" type="hidden" value={type} /></>}<div className="grid template-fields"><div className="formgrid"><Field label="Tipo"><select className="input" disabled={Boolean(template)} name={template ? undefined : "type"} onChange={(event) => setType(event.target.value as DocumentKind)} value={type}>{Object.entries(documentTypeLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></Field><Field label="Nombre"><input className="input" name="name" onChange={(event) => setName(event.target.value)} required value={name} /></Field><Field label="Título" wide><input className="input" name="title" onChange={(event) => setTitle(event.target.value)} required value={title} /></Field><Field label="Contenido" wide><textarea className="input template-body-input" name="body" onChange={(event) => setBody(event.target.value)} ref={textarea} required rows={15} value={body} /></Field></div><label className="row small"><input checked={isDefault} name="isDefault" onChange={(event) => setIsDefault(event.target.checked)} type="checkbox" /> Usar como predeterminada para este tipo</label>{unknown.length ? <div className="form-warning"><b>Marcadores desconocidos:</b> {unknown.map((item) => `{{${item}}}`).join(", ")}. Permanecerán visibles al imprimir.</div> : null}<Feedback state={state} /><button className="btn primary" disabled={pending}>{pending ? "Guardando…" : "Guardar plantilla"}</button></div><aside className="placeholder-sidebar"><h3>Marcadores disponibles</h3><p className="small">Haz clic para insertarlos en la posición del cursor.</p>{placeholders.map((token) => <button className="placeholder-chip" key={token} onClick={() => insert(token)} type="button">{`{{${token}}}`}</button>)}</aside><div className="document-preview"><div className="small">Vista previa con datos demo</div><article><h2>{title || "Título del documento"}</h2><DocumentRenderer body={body} preview type={type} /></article></div></form>{template?.id && <TemplateActions id={template.id} isDefault={template.isDefault} />}</details>;
}

function TemplateActions({ id, isDefault }: { id: string; isDefault: boolean }) {
  const [copyState, copyAction, copying] = useActionState(duplicateTemplateState, initial);
  const [deleteState, deleteAction, deleting] = useActionState(deleteTemplateState, initial);
  const [defaultState, defaultAction, setting] = useActionState(setDefaultTemplateState, initial);
  return <div className="template-actions"><form action={copyAction}><input name="id" type="hidden" value={id} /><button className="btn ghost" disabled={copying}><Copy size={14} /> Duplicar</button></form>{!isDefault && <form action={defaultAction}><input name="id" type="hidden" value={id} /><button className="btn" disabled={setting}>Hacer predeterminada</button></form>}<form action={deleteAction}><input name="id" type="hidden" value={id} /><button className="btn danger" disabled={deleting}><Trash2 size={14} /> Eliminar</button></form><div className="span-all"><Feedback state={copyState.error ? copyState : deleteState.error ? deleteState : defaultState} /></div></div>;
}

export function NewTemplateEditor() { return <div className="new-template"><div className="row"><Plus size={16} /><b>Agregar plantilla</b></div><TemplateEditor open /></div>; }
