import { BLANK_FIELD, demoValues, legacyPlaceholderAliases, splitTemplate, type DocumentKind, type DocumentSnapshot } from "@/lib/documents";

type Props = { body: string; type: DocumentKind; values?: Record<string, string>; blocks?: DocumentSnapshot["blocks"]; preview?: boolean };

// A line such as "Indicaciones: {{notas}}" is dropped when every value placeholder on it is empty.
function withoutEmptyLines(body: string, values: Record<string, string>) {
  return body
    .split("\n")
    .filter((line) => {
      const tokens = splitTemplate(line).filter((part) => part.kind === "placeholder").map((part) => part.value);
      if (!tokens.length) return true;
      const resolved = tokens.map((token) => values[token] ?? values[legacyPlaceholderAliases[token] ?? token]);
      return !resolved.every((value) => value !== undefined && value.trim() === "");
    })
    .join("\n");
}

export function DocumentRenderer({ body, values = demoValues, blocks, preview = false }: Props) {
  return <div className="document-body">{splitTemplate(withoutEmptyLines(body, values)).map((part, index) => {
    if (part.kind === "text") return <span className="document-text" key={index}>{part.value}</span>;
    const token = legacyPlaceholderAliases[part.value] ?? part.value;
    if (part.value in values) return <span key={index}>{values[part.value]}</span>;
    if (token in values) return <span key={index}>{values[token]}</span>;
    if (token === "tabla_prestaciones") return <Procedures key={index} data={blocks?.procedures} preview={preview} />;
    if (token === "receta_medicamentos") return <Prescription key={index} data={blocks?.prescription} preview={preview} />;
    if (token === "estado_cuenta") return <Statement key={index} data={blocks?.statement} preview={preview} />;
    if (token === "firmas") return <Signatures key={index} data={blocks?.signatures} preview={preview} />;
    // Only the editor preview highlights unknown placeholders; issued documents print a blank to fill by hand.
    if (!preview) return <span key={index}>{BLANK_FIELD}</span>;
    return <span className="unknown-placeholder" key={index}>{`{{${part.value}}}`}</span>;
  })}</div>;
}

function Procedures({ data, preview }: { data?: DocumentSnapshot["blocks"]["procedures"]; preview: boolean }) {
  const value = data ?? (preview ? { rows: [{ name: "Resina", details: "Pieza 16 · O, M", quantity: "1", price: "$1,200", discount: "$0", net: "$1,200" }], planned: "$1,200", realized: "$0", paid: "$0", balance: "$0" } : undefined);
  if (!value) return null;
  return <div className="document-block"><table><thead><tr><th>Prestación</th><th>Detalle</th><th>Cant.</th><th>Precio</th><th>Desc.</th><th>Neto</th></tr></thead><tbody>{value.rows.map((row, index) => <tr key={index}><td>{row.name}</td><td>{row.details || "—"}</td><td>{row.quantity}</td><td>{row.price}</td><td>{row.discount}</td><td>{row.net}</td></tr>)}</tbody></table><div className="document-totals"><span>Planificado <b>{value.planned}</b></span><span>Realizado <b>{value.realized}</b></span><span>Pagado <b>{value.paid}</b></span><span>Saldo <b>{value.balance}</b></span></div></div>;
}

function Prescription({ data, preview }: { data?: DocumentSnapshot["blocks"]["prescription"]; preview: boolean }) {
  const value = data ?? (preview ? { diagnosis: "Diagnóstico de ejemplo", notes: "Seguir las indicaciones del profesional.", items: [{ medication: "Paracetamol 500 mg", dose: "1 tableta", frequency: "Cada 8 horas", duration: "3 días", instructions: "Después de alimentos" }] } : undefined);
  if (!value) return null;
  return <div className="document-block"><ol className="prescription-list">{value.items.map((item, index) => <li key={index}><b>{item.medication}</b><div>{item.dose} · {item.frequency} · {item.duration}</div>{item.instructions && <small>{item.instructions}</small>}</li>)}</ol></div>;
}

function Statement({ data, preview }: { data?: DocumentSnapshot["blocks"]["statement"]; preview: boolean }) {
  const value = data ?? (preview ? { treatments: [{ name: "Rehabilitación dental", procedures: "2 prestaciones realizadas", realized: "$2,050" }], payments: [{ date: "10 nov 2026", method: "Tarjeta", reference: "REF-01", amount: "$1,000" }], realized: "$2,050", paid: "$1,000", balance: "$1,050" } : undefined);
  if (!value) return null;
  return <div className="document-block"><h3>Prestaciones realizadas</h3><table><thead><tr><th>Tratamiento</th><th>Detalle</th><th>Importe</th></tr></thead><tbody>{value.treatments.map((row, index) => <tr key={index}><td>{row.name}</td><td>{row.procedures}</td><td>{row.realized}</td></tr>)}</tbody></table><h3>Pagos</h3><table><thead><tr><th>Fecha</th><th>Método</th><th>Referencia</th><th>Importe</th></tr></thead><tbody>{value.payments.map((row, index) => <tr key={index}><td>{row.date}</td><td>{row.method}</td><td>{row.reference || "—"}</td><td>{row.amount}</td></tr>)}</tbody></table></div>;
}

function Signatures({ data, preview }: { data?: DocumentSnapshot["blocks"]["signatures"]; preview: boolean }) {
  const value = data ?? (preview ? { patient: "María González", professional: "Dra. Ana López" } : { patient: "Paciente", professional: "Profesional" });
  return <div className="signature-grid"><div><span />{value.patient}<small>Paciente o representante</small></div><div><span />{value.professional}<small>Profesional</small></div></div>;
}
