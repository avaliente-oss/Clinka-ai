"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createSupplyState,
  deactivateSupply,
  deleteSupplyState,
  editSupplyState,
  registerSupplyMovementState,
  savePriceItemRecipeState,
  type InventoryActionState,
} from "@/lib/inventory-actions";

type SupplyOption = {
  id: string;
  name: string;
  unit: string;
};

type EditableSupply = SupplyOption & {
  category: string;
  sku: string;
  minStock: string;
  unitCost: string;
  active: boolean;
};

type RecipeRow = { supplyId: string; quantity: string };
const initialState: InventoryActionState = {};

function Feedback({ state }: { state: InventoryActionState }) {
  if (state.error) return <p className="form-error" role="alert">{state.error}</p>;
  if (state.success) return <p className="form-success" role="status">{state.success}</p>;
  return null;
}

export function SupplyForm({ supply }: { supply?: EditableSupply }) {
  const serverAction = supply ? editSupplyState : createSupplyState;
  const [state, action, pending] = useActionState(serverAction, initialState);
  const value = (field: string, fallback = "") => state.values?.[field] ?? fallback;

  return (
    <form action={action} className="formgrid" key={state.submissionId ?? "initial"}>
      {supply && <input name="id" type="hidden" value={supply.id} />}
      <Field label="Nombre"><input className="input" defaultValue={value("name", supply?.name)} name="name" required /></Field>
      <Field label="Categoría"><input className="input" defaultValue={value("category", supply?.category)} name="category" placeholder="Restauración, protección…" required /></Field>
      <Field label="Unidad"><input className="input" defaultValue={value("unit", supply?.unit)} name="unit" placeholder="pieza, ml, caja…" required /></Field>
      <Field label="SKU (opcional)"><input className="input" defaultValue={value("sku", supply?.sku)} name="sku" /></Field>
      <Field label="Existencia mínima"><input className="input" defaultValue={value("minStock", supply?.minStock ?? "0.000")} min="0" name="minStock" required step="0.001" type="number" /></Field>
      <Field label="Costo unitario (opcional)"><input className="input" defaultValue={value("unitCost", supply?.unitCost)} min="0" name="unitCost" step="0.01" type="number" /></Field>
      <label className="row small span-all"><input defaultChecked={state.values ? state.values.active === "on" : (supply?.active ?? true)} name="active" type="checkbox" /> Insumo activo</label>
      <div className="span-all"><Feedback state={state} /></div>
      <button className="btn primary span-all" disabled={pending}>{pending ? "Guardando…" : supply ? "Guardar cambios" : "Crear insumo"}</button>
    </form>
  );
}

export function MovementForm({ supplies }: { supplies: SupplyOption[] }) {
  const [state, action, pending] = useActionState(registerSupplyMovementState, initialState);
  const [type, setType] = useState(state.values?.type ?? "ENTRADA");
  const value = (field: string, fallback = "") => state.values?.[field] ?? fallback;
  const quantityLabel = type === "AJUSTE" ? "Existencia contada" : "Cantidad";

  return (
    <form action={action} className="formgrid" key={state.submissionId ?? "initial"}>
      <Field label="Insumo"><select className="input" defaultValue={value("supplyId", supplies[0]?.id)} name="supplyId" required>{supplies.map((supply) => <option key={supply.id} value={supply.id}>{supply.name} · {supply.unit}</option>)}</select></Field>
      <Field label="Movimiento"><select className="input" name="type" onChange={(event) => setType(event.target.value)} value={type}><option value="ENTRADA">Entrada · compra</option><option value="SALIDA">Salida · merma / uso interno</option><option value="AJUSTE">Ajuste por conteo</option></select></Field>
      <Field label={quantityLabel}><input className="input" defaultValue={value("quantity")} min="0" name="quantity" required step="0.001" type="number" /></Field>
      {type === "ENTRADA" && <Field label="Nuevo costo unitario (opcional)"><input className="input" defaultValue={value("unitCost")} min="0" name="unitCost" step="0.01" type="number" /></Field>}
      <div className="field span-all"><label>Motivo</label><input className="input" defaultValue={value("reason")} name="reason" placeholder={type === "ENTRADA" ? "Compra a proveedor" : type === "SALIDA" ? "Merma o uso interno" : "Conteo físico"} required /></div>
      <div className="span-all"><Feedback state={state} /></div>
      <button className="btn primary span-all" disabled={pending}>{pending ? "Guardando…" : "Registrar movimiento"}</button>
    </form>
  );
}

export function SupplyDeleteControls({ supplyId }: { supplyId: string }) {
  const [state, action, pending] = useActionState(deleteSupplyState, initialState);
  return (
    <div className="inventory-delete">
      <form action={action}><input name="id" type="hidden" value={supplyId} /><button className="btn danger" disabled={pending}>{pending ? "Revisando…" : "Eliminar"}</button></form>
      {state.error && <div className="form-warning"><span>{state.error}</span>{state.canDeactivate && <form action={deactivateSupply}><input name="id" type="hidden" value={supplyId} /><button className="btn" type="submit">Desactivar en su lugar</button></form>}</div>}
      {state.success && <p className="form-success">{state.success}</p>}
    </div>
  );
}

export function RecipeEditor({
  priceItem,
  supplies,
}: {
  priceItem: { id: string; name: string; category: string; recipe: RecipeRow[] };
  supplies: SupplyOption[];
}) {
  const [rows, setRows] = useState<RecipeRow[]>(priceItem.recipe);
  const [state, action, pending] = useActionState(savePriceItemRecipeState, initialState);

  function update(index: number, patch: Partial<RecipeRow>) {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...patch } : row));
  }

  return (
    <details className="recipe-card">
      <summary className="row between"><span><b>{priceItem.name}</b><span className="small block">{priceItem.category} · {rows.length || "sin"} insumo{rows.length === 1 ? "" : "s"}</span></span><span className="small">Editar receta</span></summary>
      <form action={action} className="grid recipe-form">
        <input name="priceItemId" type="hidden" value={priceItem.id} />
        <input name="recipe" type="hidden" value={JSON.stringify(rows)} />
        {rows.map((row, index) => (
          <div className="recipe-row" key={`${index}-${row.supplyId}`}>
            <select aria-label="Insumo" className="input" onChange={(event) => update(index, { supplyId: event.target.value })} value={row.supplyId} required><option value="">Selecciona un insumo</option>{supplies.map((supply) => <option key={supply.id} value={supply.id}>{supply.name} · {supply.unit}</option>)}</select>
            <input aria-label="Cantidad por prestación" className="input" min="0.001" onChange={(event) => update(index, { quantity: event.target.value })} step="0.001" type="number" value={row.quantity} />
            <button aria-label="Quitar insumo" className="btn danger icon-btn" onClick={() => setRows((current) => current.filter((_, rowIndex) => rowIndex !== index))} type="button"><Trash2 size={14} /></button>
          </div>
        ))}
        <div className="row between">
          <button className="btn ghost" disabled={!supplies.length} onClick={() => setRows((current) => [...current, { supplyId: supplies[0]?.id ?? "", quantity: "1.000" }])} type="button"><Plus size={14} /> Agregar insumo</button>
          <button className="btn primary" disabled={pending}>{pending ? "Guardando…" : "Guardar receta"}</button>
        </div>
        <Feedback state={state} />
      </form>
    </details>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
