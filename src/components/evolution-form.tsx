"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { registerEvolution } from "@/lib/actions";
import { localDateTimeValue, money } from "@/lib/utils";

type Option = { id: string; name: string };
type Price = Option & { price: number };
type Pending = { id: string; name: string; tooth: string | null; surface: string | null; price: number; quantity: number };
type NewProcedure = { name: string; tooth: string; surface: string; price: number; quantity: number; priceItemId: string };
const empty: NewProcedure = { name: "", tooth: "", surface: "", price: 0, quantity: 1, priceItemId: "" };

export function EvolutionForm({
  treatmentId,
  previousProgress,
  defaultProfessionalId,
  professionals,
  appointments,
  pending,
  prices,
}: {
  treatmentId: string;
  previousProgress: number;
  defaultProfessionalId?: string;
  professionals: Option[];
  appointments: Option[];
  pending: Pending[];
  prices: Price[];
}) {
  const [newProcedures, setNewProcedures] = useState<NewProcedure[]>([]);
  function update(index: number, patch: Partial<NewProcedure>) {
    setNewProcedures((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }
  function choose(index: number, id: string) {
    const item = prices.find((price) => price.id === id);
    update(index, { priceItemId: id, name: item?.name ?? "", price: item?.price ?? 0 });
  }

  return (
    <form action={registerEvolution} className="grid evolution-form">
      <input type="hidden" name="treatmentId" value={treatmentId} />
      <input type="hidden" name="newProcedures" value={JSON.stringify(newProcedures)} />
      <div className="formgrid">
        <div className="field"><label>Fecha</label><input className="input" type="date" name="date" defaultValue={localDateTimeValue(new Date()).slice(0, 10)} required /></div>
        <div className="field"><label>Profesional</label><select className="input" name="professionalId" required defaultValue={defaultProfessionalId}>{professionals.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
        <div className="field"><label>Avance acumulado</label><input className="input" type="number" name="cumulativeProgress" min={previousProgress} max="100" defaultValue={previousProgress} required /><span className="small">Mínimo: {previousProgress}%</span></div>
        <div className="field"><label>Cita relacionada (opcional)</label><select className="input" name="appointmentId"><option value="">Sin cita</option>{appointments.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
        <div className="field span-all"><label>Notas clínicas</label><textarea className="input" name="clinicalNotes" rows={3} placeholder="Qué se realizó y observó" required /></div>
        <div className="field span-all"><label>Próximos pasos</label><textarea className="input" name="nextSteps" rows={2} /></div>
      </div>
      {pending.length > 0 && <fieldset className="procedure-checklist"><legend>Prestaciones planificadas realizadas hoy</legend>{pending.map((procedure) => <label className="row" key={procedure.id}><input type="checkbox" name="completedProcedureIds" value={procedure.id} /><span>{procedure.name}{procedure.tooth ? ` · pieza ${procedure.tooth}` : ""}{procedure.surface ? ` · ${procedure.surface}` : ""} · {procedure.quantity} × {money(procedure.price)}</span></label>)}</fieldset>}
      <div>
        <div className="row between"><b>Nuevas prestaciones realizadas</b><button className="btn ghost" type="button" onClick={() => setNewProcedures((current) => [...current, { ...empty }])}><Plus size={14} /> Agregar</button></div>
        {newProcedures.map((procedure, index) => <div className="procedure-line" key={index}>
          <select className="input" aria-label="Catálogo" value={procedure.priceItemId} onChange={(event) => choose(index, event.target.value)}><option value="">Texto libre</option>{prices.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select>
          <input className="input line-description" aria-label="Nombre" placeholder="Prestación" value={procedure.name} onChange={(event) => update(index, { name: event.target.value })} required />
          <input className="input" aria-label="Pieza" placeholder="Pieza" value={procedure.tooth} onChange={(event) => update(index, { tooth: event.target.value })} />
          <input className="input" aria-label="Superficie" placeholder="Sup." value={procedure.surface} onChange={(event) => update(index, { surface: event.target.value })} />
          <input className="input" type="number" min="1" aria-label="Cantidad" value={procedure.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} />
          <input className="input" type="number" min="0" step="0.01" aria-label="Precio" value={procedure.price} onChange={(event) => update(index, { price: Number(event.target.value) })} />
          <button className="btn danger" type="button" onClick={() => setNewProcedures((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Eliminar prestación"><Trash2 size={14} /></button>
        </div>)}
      </div>
      <button className="btn primary">Guardar evolución</button>
    </form>
  );
}
