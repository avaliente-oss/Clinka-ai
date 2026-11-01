"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { createTreatment } from "@/lib/actions";
import { localDateTimeValue, money } from "@/lib/utils";

type Option = { id: string; name: string };
type Price = Option & { price: number };
type ProcedureInput = {
  name: string;
  tooth: string;
  surface: string;
  quantity: number;
  price: number;
  priceItemId: string;
};

const emptyProcedure: ProcedureInput = {
  name: "",
  tooth: "",
  surface: "",
  quantity: 1,
  price: 0,
  priceItemId: "",
};

export function TreatmentForm({
  patients,
  professionals,
  prices,
  patientId,
}: {
  patients: Option[];
  professionals: Option[];
  prices: Price[];
  patientId?: string;
}) {
  const [procedures, setProcedures] = useState<ProcedureInput[]>([
    { ...emptyProcedure },
  ]);
  const total = procedures.reduce(
    (sum, procedure) => sum + procedure.price * procedure.quantity,
    0,
  );

  function update(index: number, patch: Partial<ProcedureInput>) {
    setProcedures((current) =>
      current.map((procedure, procedureIndex) =>
        procedureIndex === index ? { ...procedure, ...patch } : procedure,
      ),
    );
  }

  function choosePrice(index: number, id: string) {
    const price = prices.find((item) => item.id === id);
    update(index, {
      priceItemId: id,
      name: price?.name ?? "",
      price: price?.price ?? 0,
    });
  }

  return (
    <form action={createTreatment} className="grid treatment-form">
      <input type="hidden" name="procedures" value={JSON.stringify(procedures)} />
      <div className="formgrid">
        <div className="field">
          <label>Paciente</label>
          <select className="input" name="patientId" defaultValue={patientId} required>
            {patients.map((patient) => (
              <option value={patient.id} key={patient.id}>{patient.name}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Profesional responsable</label>
          <select className="input" name="professionalId" required>
            {professionals.map((professional) => (
              <option value={professional.id} key={professional.id}>{professional.name}</option>
            ))}
          </select>
        </div>
        <div className="field span-all">
          <label>Tratamiento</label>
          <input className="input" name="title" placeholder="Ej. Ortodoncia" required />
        </div>
        <div className="field span-all">
          <label>Diagnóstico o motivo</label>
          <textarea className="input" name="diagnosis" rows={2} />
        </div>
        <div className="field">
          <label>Estado</label>
          <select className="input" name="status" defaultValue="PLANIFICADO">
            <option value="PLANIFICADO">Planificado</option>
            <option value="EN_CURSO">En curso</option>
            <option value="TERMINADO">Terminado</option>
            <option value="SUSPENDIDO">Suspendido</option>
          </select>
        </div>
        <div className="field">
          <label>Fecha de inicio</label>
          <input className="input" type="date" name="startDate" defaultValue={localDateTimeValue(new Date()).slice(0, 10)} required />
        </div>
        <div className="field">
          <label>Fecha de término (opcional)</label>
          <input className="input" type="date" name="endDate" />
        </div>
        <div className="field span-all">
          <label>Notas</label>
          <textarea className="input" name="notes" rows={2} />
        </div>
      </div>

      <div>
        <div className="row between">
          <b>Prestaciones planificadas</b>
          <button className="btn ghost" type="button" onClick={() => setProcedures((current) => [...current, { ...emptyProcedure }])}>
            <Plus size={14} /> Agregar
          </button>
        </div>
        {procedures.map((procedure, index) => (
          <div className="procedure-line" key={index}>
            <select className="input" aria-label="Catálogo" value={procedure.priceItemId} onChange={(event) => choosePrice(index, event.target.value)}>
              <option value="">Texto libre</option>
              {prices.map((price) => <option value={price.id} key={price.id}>{price.name}</option>)}
            </select>
            <input className="input line-description" aria-label="Nombre" placeholder="Prestación" value={procedure.name} onChange={(event) => update(index, { name: event.target.value })} required />
            <input className="input" aria-label="Pieza" placeholder="Pieza" value={procedure.tooth} onChange={(event) => update(index, { tooth: event.target.value })} />
            <input className="input" aria-label="Superficie" placeholder="Sup." value={procedure.surface} onChange={(event) => update(index, { surface: event.target.value })} />
            <input className="input" type="number" min="1" aria-label="Cantidad" value={procedure.quantity} onChange={(event) => update(index, { quantity: Number(event.target.value) })} />
            <input className="input" type="number" min="0" step="0.01" aria-label="Precio" value={procedure.price} onChange={(event) => update(index, { price: Number(event.target.value) })} />
            <button className="btn danger" type="button" disabled={procedures.length === 1} onClick={() => setProcedures((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label="Eliminar prestación"><Trash2 size={14} /></button>
          </div>
        ))}
      </div>
      <div className="row between">
        <b>Total planificado: {money(total)}</b>
        <button className="btn primary">Crear tratamiento</button>
      </div>
    </form>
  );
}
