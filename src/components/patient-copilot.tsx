"use client";

import { useState } from "react";
import { Bot, Send } from "lucide-react";
import { AIDisclaimer } from "./ai-disclaimer";

type Answer = {
  answer: string;
  citations: string[];
};

export function PatientCopilot({ patientId }: { patientId: string }) {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [busy, setBusy] = useState(false);

  async function ask() {
    if (!question.trim()) return;
    setBusy(true);
    const response = await fetch("/api/ai/copilot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientId, question }),
    });
    setAnswer((await response.json()) as Answer);
    setBusy(false);
  }

  return (
    <div className="card ai sticky-card">
      <div className="row">
        <Bot size={20} />
        <h3>Copiloto del paciente</h3>
      </div>
      <p className="small">
        Responde únicamente con información de este expediente y cita sus fuentes.
      </p>
      <div className="chat" aria-live="polite">
        {answer ? (
          <div className="bubble">
            {answer.answer}
            <div className="small citation-list">
              Fuentes: {answer.citations.join(" · ")}
            </div>
          </div>
        ) : (
          <div className="small">Prueba: “¿Cuál fue el último diagnóstico?”</div>
        )}
      </div>
      <div className="row top-gap">
        <input
          className="input"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void ask();
          }}
          placeholder="Pregunta sobre el expediente…"
        />
        <button
          className="btn primary"
          type="button"
          onClick={ask}
          disabled={busy}
          aria-label="Enviar"
        >
          <Send size={15} />
        </button>
      </div>
      <AIDisclaimer />
    </div>
  );
}
