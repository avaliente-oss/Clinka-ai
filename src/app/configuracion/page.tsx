import { Settings2 } from "lucide-react";

export default function ConfigurationPlaceholderPage() {
  return (
    <div className="page-stack">
      <div className="pagehead"><div><div className="eyebrow">Administración</div><h1 className="title">Documentos y configuración</h1><p className="subtitle">Plantillas, recetas y datos de la clínica.</p></div></div>
      <section className="card empty-state"><Settings2 size={32} /><h2>Disponible en la siguiente versión</h2><p>El modelo documental ya está preparado; la interfaz llegará en la etapa 3.</p></section>
    </div>
  );
}
