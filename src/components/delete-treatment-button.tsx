"use client";

import { Trash2 } from "lucide-react";
import { deleteTreatment } from "@/lib/actions";

export function DeleteTreatmentButton({
  id,
  title,
  blockedReason,
  compact = false,
}: {
  id: string;
  title: string;
  blockedReason?: string;
  compact?: boolean;
}) {
  if (blockedReason) {
    return (
      <button
        aria-label={`No se puede eliminar ${title}`}
        className={`btn ghost${compact ? " icon-btn" : ""}`}
        disabled
        title={blockedReason}
        type="button"
      >
        <Trash2 size={14} />
        {!compact && "Eliminar"}
      </button>
    );
  }

  return (
    <form
      action={deleteTreatment}
      onSubmit={(event) => {
        if (!window.confirm(`¿Eliminar el tratamiento "${title}"? Ya no aparecerá en el expediente ni en los reportes.`)) {
          event.preventDefault();
        }
      }}
    >
      <input name="id" type="hidden" value={id} />
      <button
        aria-label={`Eliminar ${title}`}
        className={`btn danger${compact ? " icon-btn" : ""}`}
        title="Eliminar tratamiento"
        type="submit"
      >
        <Trash2 size={14} />
        {!compact && "Eliminar"}
      </button>
    </form>
  );
}
