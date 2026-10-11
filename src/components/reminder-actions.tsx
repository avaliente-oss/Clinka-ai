"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";

export function ReminderActions({
  phone,
  message,
}: {
  phone: string;
  message: string;
}) {
  const [copied, setCopied] = useState(false);
  const url =
    `https://wa.me/${phone.replace(/\D/g, "")}` +
    `?text=${encodeURIComponent(message)}`;

  async function copyMessage() {
    await navigator.clipboard.writeText(message);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1_500);
  }

  return (
    <div className="row">
      <button className="btn ghost" type="button" onClick={copyMessage}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {copied ? "Copiado" : "Copiar"}
      </button>
      <a className="btn primary" href={url} target="_blank" rel="noreferrer">
        <ExternalLink size={14} />
        Abrir WhatsApp
      </a>
    </div>
  );
}
