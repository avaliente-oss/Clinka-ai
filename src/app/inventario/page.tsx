import { Package } from "lucide-react";

export default function InventoryPlaceholderPage() {
  return (
    <div className="page-stack">
      <div className="pagehead"><div><div className="eyebrow">Administración</div><h1 className="title">Inventario</h1><p className="subtitle">Control de insumos y existencias.</p></div></div>
      <section className="card empty-state"><Package size={32} /><h2>Disponible en la siguiente versión</h2><p>El modelo de insumos ya está preparado; la interfaz llegará en la etapa 2.</p></section>
    </div>
  );
}
