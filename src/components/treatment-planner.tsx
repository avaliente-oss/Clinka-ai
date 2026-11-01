"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { createTreatment } from "@/lib/actions";
import { localDateTimeValue, money } from "@/lib/utils";
import { AIDisclaimer } from "./ai-disclaimer";

type Plan = {
  title: string;
  diagnosis: string;
  notes: string;
  procedures: { name: string; tooth?: string; surface?: string; price: number; quantity: number }[];
  total: number;
};

type PatientOption = {
  id: string;
  name: string;
};

export function AITreatmentProposal({ patients, professionals }: { patients: PatientOption[]; professionals: PatientOption[] }) {
  const [patientId, setPatientId] = useState(patients[0]?.id ?? "");
  const [context, setContext] = useState(
    "Analiza los hallazgos del odontograma y prioriza control de enfermedad.",
  );
  const [plan, setPlan] = useState<Plan | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!patientId) return;
    setBusy(true);
    const response = await fetch("/api/ai/treatment-plan", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, context }),
    });
    setPlan((await response.json()) as Plan);
    setBusy(false);
  }

  const procedures = plan?.procedures.map((item) => ({
    name: item.name, tooth: item.tooth ?? "", surface: item.surface ?? "",
    quantity: item.quantity, price: item.price, priceItemId: "",
  }));

  return (
    <aside className="card ai">
      <div className="row">
        <Sparkles />
        <h2>Plan de tratamiento IA</h2>
      </div>
      <p className="small">
        Combina odontograma, notas clínicas y tarifario para proponer un tratamiento.
      </p>
      <div className="field">
        <label>Paciente</label>
        <select
          className="input"
          value={patientId}
          onChange={(event) => setPatientId(event.target.value)}
        >
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.name}
            </option>
          ))}
        </select>
      </div>
      <div className="field top-gap">
        <label>Objetivo clínico</label>
        <textarea
          className="input"
          rows={3}
          value={context}
          onChange={(event) => setContext(event.target.value)}
        />
      </div>
      <button
        className="btn primary top-gap"
        type="button"
        onClick={generate}
        disabled={busy || !patientId}
      >
        {busy ? "Analizando…" : "Generar propuesta"}
      </button>

      {plan && procedures && (
        <div className="generated-plan">
          <b>{plan.title}</b>
          <p className="small">{plan.diagnosis}</p>
          {plan.procedures.map((procedure, index) => (
            <div className="listitem" key={`${procedure.name}-${index}`}><span>{procedure.name}{procedure.tooth ? ` · pieza ${procedure.tooth}` : ""}</span><b>{procedure.quantity} × {money(procedure.price)}</b></div>
          ))}
          <div className="row between">
            <b>Total estimado</b>
            <b>{money(plan.total)}</b>
          </div>
          <AIDisclaimer />
          <form action={createTreatment}>
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="professionalId" value={professionals[0]?.id ?? ""} />
            <input type="hidden" name="title" value={plan.title} />
            <input type="hidden" name="diagnosis" value={plan.diagnosis} />
            <input type="hidden" name="notes" value={plan.notes} />
            <input type="hidden" name="status" value="PLANIFICADO" />
            <input type="hidden" name="startDate" value={localDateTimeValue(new Date()).slice(0, 10)} />
            <input type="hidden" name="procedures" value={JSON.stringify(procedures)} />
            <button className="btn ghost full-button">
              Confirmar y guardar tratamiento
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
