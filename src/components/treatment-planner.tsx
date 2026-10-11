"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { createTreatmentPlan } from "@/lib/actions";
import { money } from "@/lib/utils";
import { AIDisclaimer } from "./ai-disclaimer";

type Plan = {
  summary: string;
  phases: {
    name: string;
    items: { description: string; price: number }[];
  }[];
  total: number;
};

type PatientOption = {
  id: string;
  name: string;
};

export function TreatmentPlanner({ patients }: { patients: PatientOption[] }) {
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

  const items = plan?.phases.flatMap((phase, phaseIndex) =>
    phase.items.map((item) => ({
      description: item.description,
      tooth: "",
      phase: phaseIndex + 1,
      quantity: 1,
      unitPrice: item.price,
    })),
  );

  return (
    <aside className="card ai">
      <div className="row">
        <Sparkles />
        <h2>Plan de tratamiento IA</h2>
      </div>
      <p className="small">
        Combina odontograma, notas clínicas y tarifario para proponer fases.
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

      {plan && items && (
        <div className="generated-plan">
          <b>{plan.summary}</b>
          {plan.phases.map((phase) => (
            <div className="listitem" key={phase.name}>
              <div>
                <b>{phase.name}</b>
                <div className="small">
                  {phase.items
                    .map((item) => `${item.description} (${money(item.price)})`)
                    .join(" · ")}
                </div>
              </div>
            </div>
          ))}
          <div className="row between">
            <b>Total estimado</b>
            <b>{money(plan.total)}</b>
          </div>
          <AIDisclaimer />
          <form action={createTreatmentPlan}>
            <input type="hidden" name="patientId" value={patientId} />
            <input
              type="hidden"
              name="title"
              value="Plan sugerido por IA"
            />
            <input type="hidden" name="status" value="PROPUESTO" />
            <input type="hidden" name="items" value={JSON.stringify(items)} />
            <button className="btn ghost full-button">
              Confirmar y guardar como borrador
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
