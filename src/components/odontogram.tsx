"use client";

import { useState } from "react";
import { saveFinding } from "@/lib/actions";

type Finding = {
  tooth: number;
  surface: string;
  condition: string;
  notes?: string | null;
};

const teeth = [
  18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28,
  48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38,
];

const surfaces = [
  ["O", "Oclusal"],
  ["V", "Vestibular"],
  ["L", "Lingual / palatina"],
  ["M", "Mesial"],
  ["D", "Distal"],
] as const;

const conditions = [
  ["SANO", "Sano / borrar hallazgo"],
  ["CARIES", "Caries"],
  ["RESTAURACION", "Restauración"],
  ["EXTRACCION", "Indicación de extracción"],
  ["ENDODONCIA", "Endodoncia"],
  ["CORONA", "Corona"],
] as const;

export function Odontogram({
  patientId,
  findings,
}: {
  patientId: string;
  findings: Finding[];
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const selectedFindings = findings.filter((item) => item.tooth === selected);

  return (
    <div className="card">
      <div className="row between odontogram-header">
        <div>
          <h2>Odontograma</h2>
          <p className="small">
            32 piezas permanentes · registra una condición por superficie
          </p>
        </div>
        <div className="row small">
          <i className="finding-key" />
          Con hallazgo
        </div>
      </div>

      <div className="toothgrid">
        {teeth.map((tooth) => {
          const toothFindings = findings.filter((item) => item.tooth === tooth);
          return (
            <button
              key={tooth}
              type="button"
              onClick={() => setSelected(tooth)}
              className={`tooth ${toothFindings.length ? "marked" : ""}`}
              aria-label={`Pieza ${tooth}, ${toothFindings.length} hallazgos`}
            >
              <svg viewBox="0 0 40 40" width="30" aria-hidden="true">
                <path
                  d="M9 7 Q20 1 31 7 Q36 16 31 31 Q25 38 20 30 Q15 38 9 31 Q4 16 9 7Z"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                />
              </svg>
              <span>{tooth}</span>
              {toothFindings.length > 0 && (
                <small>{toothFindings.map((item) => item.surface).join("·")}</small>
              )}
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="odontogram-editor">
          <div>
            <b>Pieza {selected}</b>
            <div className="surface-summary">
              {selectedFindings.length ? (
                selectedFindings.map((finding) => (
                  <span className="badge" key={finding.surface}>
                    {finding.surface}: {finding.condition}
                  </span>
                ))
              ) : (
                <span className="small">Sin hallazgos registrados.</span>
              )}
            </div>
          </div>
          <form action={saveFinding} className="formgrid">
            <input type="hidden" name="patientId" value={patientId} />
            <input type="hidden" name="tooth" value={selected} />
            <div className="field">
              <label>Superficie</label>
              <select className="input" name="surface">
                {surfaces.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Condición</label>
              <select className="input" name="condition">
                {conditions.map(([value, label]) => (
                  <option value={value} key={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field span-all">
              <label>Notas</label>
              <input className="input" name="notes" placeholder="Detalle opcional" />
            </div>
            <button className="btn primary span-all">Guardar superficie</button>
          </form>
        </div>
      )}
    </div>
  );
}
