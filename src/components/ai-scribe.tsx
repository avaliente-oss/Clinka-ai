"use client";

import { useState } from "react";
import { Mic, Sparkles } from "lucide-react";
import { saveSoap } from "@/lib/actions";
import { AIDisclaimer } from "./ai-disclaimer";

type Soap = {
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  diagnoses: { code: string; label: string }[];
};

type SpeechRecognitionConstructor = new () => {
  lang: string;
  onresult: (event: {
    results: { 0: { transcript: string } }[];
  }) => void;
  start: () => void;
};

const fieldLabels = {
  subjective: "Subjetivo",
  objective: "Objetivo",
  assessment: "Evaluación",
  plan: "Plan",
};

export function AIScribe({ patientId }: { patientId: string }) {
  const [text, setText] = useState("");
  const [soap, setSoap] = useState<Soap | null>(null);
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!text.trim()) return;
    setBusy(true);
    const response = await fetch("/api/ai/scribe", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setSoap((await response.json()) as Soap);
    setBusy(false);
  }

  function dictate() {
    const SpeechRecognition = (
      window as unknown as {
        webkitSpeechRecognition?: SpeechRecognitionConstructor;
      }
    ).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      window.alert("El dictado no está disponible en este navegador.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX";
    recognition.onresult = (event) => {
      setText(event.results[0][0].transcript);
    };
    recognition.start();
  }

  return (
    <div className="card ai">
      <div className="row">
        <Sparkles size={19} />
        <h2>Escriba clínico IA</h2>
      </div>
      <p className="small">
        Pega o dicta la consulta. El resultado no se guarda hasta que lo confirmes.
      </p>
      <textarea
        className="input"
        rows={4}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Paciente refiere dolor al masticar…"
      />
      <div className="row top-gap">
        <button className="btn ghost" type="button" onClick={dictate}>
          <Mic size={15} />
          Dictar
        </button>
        <button
          className="btn primary"
          type="button"
          onClick={generate}
          disabled={busy || !text.trim()}
        >
          {busy ? "Estructurando…" : "Generar SOAP"}
        </button>
      </div>

      {soap && (
        <form action={saveSoap} className="formgrid generated-form">
          <input type="hidden" name="patientId" value={patientId} />
          <input type="hidden" name="aiGenerated" value="true" />
          {(Object.keys(fieldLabels) as (keyof typeof fieldLabels)[]).map(
            (field) => (
              <div className="field" key={field}>
                <label>{fieldLabels[field]}</label>
                <textarea
                  className="input"
                  name={field}
                  rows={3}
                  defaultValue={soap[field]}
                  required
                />
              </div>
            ),
          )}
          <div className="field span-all">
            <label>Diagnósticos CIE-10 sugeridos</label>
            <input
              className="input"
              name="diagnoses"
              defaultValue={soap.diagnoses
                .map((diagnosis) => `${diagnosis.code} · ${diagnosis.label}`)
                .join(", ")}
            />
          </div>
          <AIDisclaimer />
          <button className="btn primary span-all">
            Confirmar y guardar nota
          </button>
        </form>
      )}
    </div>
  );
}
