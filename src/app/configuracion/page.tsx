import { ClinicDocumentForm, NewTemplateEditor, ProfessionalDocumentForm, TemplateEditor } from "@/components/configuration-forms";
import { db } from "@/lib/db";
import { documentTypeLabel, type DocumentKind } from "@/lib/documents";
import { activeWhere } from "@/lib/soft-delete";

export const dynamic = "force-dynamic";

export default async function ConfigurationPage() {
  const clinic = await db.clinic.findFirstOrThrow({ include: { professionals: { orderBy: { name: "asc" } }, documentTemplates: { where: activeWhere(), orderBy: [{ type: "asc" }, { isDefault: "desc" }, { name: "asc" }] } } });
  return <div className="page-stack">
    <div className="pagehead"><div><div className="eyebrow">Administración</div><h1 className="title">Documentos y configuración</h1><p className="subtitle">Datos institucionales, cédulas y plantillas imprimibles.</p></div></div>
    <section className="card"><h2>Datos de la clínica</h2><ClinicDocumentForm clinic={{ name: clinic.name, legalName: clinic.legalName ?? "", rfc: clinic.rfc ?? "", address: clinic.address ?? "", phone: clinic.phone ?? "", email: clinic.email ?? "", logoUrl: clinic.logoUrl ?? "", documentFooter: clinic.documentFooter ?? "" }} /></section>
    <section className="card"><h2>Profesionales</h2><p className="small">Estos datos se incorporan a recetas, consentimientos y líneas de firma.</p><div className="professional-document-list">{clinic.professionals.map((professional) => <ProfessionalDocumentForm key={professional.id} professional={{ id: professional.id, name: professional.name, specialty: professional.specialty, licenseNumber: professional.licenseNumber ?? "", specialtyLicense: professional.specialtyLicense ?? "", university: professional.university ?? "" }} />)}</div></section>
    <section className="card"><div className="row between"><div><h2>Plantillas</h2><p className="small">El contenido se guarda como texto; las tablas y firmas son bloques seguros generados por la aplicación.</p></div><span className="badge">{clinic.documentTemplates.length} plantillas</span></div><div className="template-type-summary">{Object.entries(documentTypeLabel).map(([type, label]) => <span className="badge" key={type}>{label}: {clinic.documentTemplates.filter((item) => item.type === type).length}</span>)}</div><div className="template-list">{clinic.documentTemplates.map((template) => <TemplateEditor key={template.id} template={{ id: template.id, type: template.type as DocumentKind, name: template.name, title: template.title, body: template.body, isDefault: template.isDefault }} />)}</div><NewTemplateEditor /></section>
  </div>;
}
