"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, RotateCcw, Send } from "lucide-react";
import { AIDisclaimer } from "./ai-disclaimer";

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: string[];
  suggestions?: string[];
};

const STARTERS = [
  "¿Cómo va su tratamiento?",
  "¿Cuál fue el último diagnóstico?",
  "¿Cuánto debe?",
];

export function PatientCopilot({ patientId }: { patientId: string }) {
  const storageKey = `clinika-copilot-${patientId}`;
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const threadRef = useRef<HTMLDivElement>(null);

  // Keep the conversation while the user moves between tabs or pages in this browser session.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restoring client-only storage after mount
      if (saved) setMessages(JSON.parse(saved) as Message[]);
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy, storageKey]);

  async function send(text: string) {
    const content = text.trim();
    if (!content || busy) return;
    const next: Message[] = [...messages, { role: "user", content }];
    setMessages(next);
    setDraft("");
    setBusy(true);
    try {
      const response = await fetch("/api/ai/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          patientId,
          messages: next.map(({ role, content: body }) => ({ role, content: body })),
        }),
      });
      if (!response.ok) throw new Error(String(response.status));
      const answer = (await response.json()) as { answer: string; citations?: string[]; suggestions?: string[] };
      setMessages([...next, { role: "assistant", content: answer.answer, citations: answer.citations, suggestions: answer.suggestions }]);
    } catch {
      setMessages([...next, { role: "assistant", content: "No pude responder en este momento. Intenta de nuevo en unos segundos." }]);
    } finally {
      setBusy(false);
    }
  }

  const last = messages.at(-1);
  const suggestions = messages.length === 0 ? STARTERS : last?.role === "assistant" ? last.suggestions ?? [] : [];

  return (
    <div className="card ai copilot">
      <div className="row between">
        <div className="row">
          <Bot size={20} />
          <h3>Copiloto del paciente</h3>
        </div>
        {messages.length > 0 && (
          <button className="btn ghost icon-btn" type="button" onClick={() => setMessages([])} aria-label="Nueva conversación" title="Nueva conversación">
            <RotateCcw size={14} />
          </button>
        )}
      </div>
      <p className="small">Conversa sobre este expediente; las respuestas citan sus fuentes.</p>

      <div className="chat-thread" ref={threadRef} aria-live="polite">
        {messages.length === 0 && (
          <div className="bubble assistant">Hola, ¿qué necesitas saber de este paciente?</div>
        )}
        {messages.map((message, index) => (
          <div className={`bubble ${message.role}`} key={index}>
            {message.content}
            {message.citations && message.citations.length > 0 && (
              <div className="citation-list">{message.citations.join(" · ")}</div>
            )}
          </div>
        ))}
        {busy && (
          <div className="bubble assistant typing" aria-label="Escribiendo">
            <span /><span /><span />
          </div>
        )}
      </div>

      {suggestions.length > 0 && !busy && (
        <div className="chip-row">
          {suggestions.map((suggestion) => (
            <button className="chip" type="button" key={suggestion} onClick={() => void send(suggestion)}>
              {suggestion}
            </button>
          ))}
        </div>
      )}

      <form
        className="chat-input"
        onSubmit={(event) => {
          event.preventDefault();
          void send(draft);
        }}
      >
        <textarea
          aria-label="Mensaje para el copiloto"
          className="input"
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void send(draft);
            }
          }}
          placeholder="Escribe tu pregunta…"
          rows={1}
          value={draft}
        />
        <button className="btn primary icon-btn" type="submit" disabled={busy || !draft.trim()} aria-label="Enviar">
          <Send size={15} />
        </button>
      </form>
      <AIDisclaimer />
    </div>
  );
}
