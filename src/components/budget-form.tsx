"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  createTreatmentPlan,
  updateTreatmentPlan,
} from "@/lib/actions";
import { money } from "@/lib/utils";

type PatientOption = {
  id: string;
  name: string;
};

type LineItem = {
  description: string;
  tooth: string;
  phase: number;
  quantity: number;
  unitPrice: number;
};

type ExistingPlan = {
  id: string;
  patientId: string;
  title: string;
  status: string;
  items: LineItem[];
};

const emptyItem: LineItem = {
  description: "Consulta de valoración",
  tooth: "",
  phase: 1,
  quantity: 1,
  unitPrice: 650,
};

export function BudgetForm({
  patients,
  plan,
}: {
  patients: PatientOption[];
  plan?: ExistingPlan;
}) {
  const [items, setItems] = useState<LineItem[]>(
    plan?.items.length ? plan.items : [{ ...emptyItem }],
  );
  const action = plan ? updateTreatmentPlan : createTreatmentPlan;
  const total = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );

  function updateItem(index: number, patch: Partial<LineItem>) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  return (
    <form action={action} className="grid budget-form">
      {plan && <input type="hidden" name="id" value={plan.id} />}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      <div className="formgrid">
        <div className="field">
          <label>Paciente</label>
          <select
            className="input"
            name="patientId"
            defaultValue={plan?.patientId}
            required
          >
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patient.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label>Estado</label>
          <select
            className="input"
            name="status"
            defaultValue={plan?.status ?? "PROPUESTO"}
          >
            <option value="PROPUESTO">Propuesto</option>
            <option value="ACEPTADO">Aceptado</option>
            <option value="EN_CURSO">En curso</option>
            <option value="TERMINADO">Terminado</option>
          </select>
        </div>
        <div className="field span-all">
          <label>Nombre del plan</label>
          <input
            className="input"
            name="title"
            defaultValue={plan?.title ?? "Nuevo plan de tratamiento"}
            required
          />
        </div>
      </div>

      <div>
        <div className="row between">
          <b>Partidas</b>
          <button
            className="btn ghost"
            type="button"
            onClick={() => setItems((current) => [...current, { ...emptyItem }])}
          >
            <Plus size={14} />
            Agregar
          </button>
        </div>
        {items.map((item, index) => (
          <div className="budget-line" key={`${index}-${items.length}`}>
            <input
              className="input line-description"
              aria-label="Descripción"
              value={item.description}
              onChange={(event) =>
                updateItem(index, { description: event.target.value })
              }
              required
            />
            <input
              className="input"
              aria-label="Pieza"
              placeholder="Pieza"
              value={item.tooth}
              onChange={(event) => updateItem(index, { tooth: event.target.value })}
            />
            <input
              className="input"
              type="number"
              min="1"
              aria-label="Fase"
              value={item.phase}
              onChange={(event) =>
                updateItem(index, { phase: Number(event.target.value) })
              }
            />
            <input
              className="input"
              type="number"
              min="1"
              aria-label="Cantidad"
              value={item.quantity}
              onChange={(event) =>
                updateItem(index, { quantity: Number(event.target.value) })
              }
            />
            <input
              className="input"
              type="number"
              min="0"
              aria-label="Precio unitario"
              value={item.unitPrice}
              onChange={(event) =>
                updateItem(index, { unitPrice: Number(event.target.value) })
              }
            />
            <button
              className="btn danger"
              type="button"
              onClick={() => removeItem(index)}
              disabled={items.length === 1}
              aria-label="Eliminar partida"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="row between">
        <b>Total: {money(total)}</b>
        <button className="btn primary">
          {plan ? "Guardar cambios" : "Crear presupuesto"}
        </button>
      </div>
    </form>
  );
}
