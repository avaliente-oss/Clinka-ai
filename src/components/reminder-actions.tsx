"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { markReminderSent } from "@/lib/actions";

export function ReminderActions({
  phone,
  message,
  reminderId,
}: {
  phone: string;
  message: string;
  reminderId: string;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    `https://wa.me/${phone.replace(/\D/g, "")}` +
    `?text=${encodeURIComponent(message)}`;

  async function copyMessage() {
    const marking = markReminderSent(reminderId);
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      window.prompt("Copia el mensaje:", message);
    }
    await marking;
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="row">
      <button className="btn ghost" type="button" onClick={copyMessage}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
      <a className="btn primary" href={url} target="_blank" rel="noreferrer" onClick={() => { void markReminderSent(reminderId); }}>
        <ExternalLink size={14} />
        Abrir WhatsApp
      </a>
    </div>
  );
}
