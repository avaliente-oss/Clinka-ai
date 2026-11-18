export type DocumentKind = "PRESUPUESTO" | "RECETA" | "CONSENTIMIENTO" | "ESTADO_CUENTA";

export const documentTypeLabel: Record<DocumentKind, string> = {
  PRESUPUESTO: "Presupuesto",
  RECETA: "Receta",
  CONSENTIMIENTO: "Consentimiento",
  ESTADO_CUENTA: "Estado de cuenta",
};

export const scalarPlaceholders = [
  "clinica.nombre", "clinica.direccion", "clinica.telefono",
  "paciente.nombre", "paciente.edad", "paciente.fechaNacimiento",
  "profesional.nombre", "profesional.cedula", "fecha",
  "tratamiento.nombre", "tratamiento.diagnostico", "tratamiento.piezas",
] as const;

// Printed in place of a missing value so the line can be completed by hand.
export const BLANK_FIELD = "________";

export const blockPlaceholder: Record<DocumentKind, string[]> = {
  PRESUPUESTO: ["tabla_prestaciones", "firmas"],
  RECETA: ["receta_medicamentos", "firmas"],
  CONSENTIMIENTO: ["firmas"],
  ESTADO_CUENTA: ["estado_cuenta", "firmas"],
};

export const demoValues: Record<string, string> = {
  "clinica.nombre": "Clínica Horizonte",
  "clinica.direccion": "Av. Constitución 2450, Monterrey, N.L.",
  "clinica.telefono": "+52 81 5555 1200",
  "paciente.nombre": "María González",
  "paciente.edad": "34 años",
  "paciente.fechaNacimiento": "15 ene 1992",
  "profesional.nombre": "Dra. Ana López",
  "profesional.cedula": "12345678",
  fecha: "17 nov 2026",
  "tratamiento.nombre": "Rehabilitación dental",
  "tratamiento.diagnostico": "Caries dental",
  "tratamiento.piezas": "16, 26",
  total: "$1,200",
  notas: "Seguir las indicaciones del profesional.",
  periodo: "Al 17 nov 2026",
  total_realizado: "$2,050",
  pagos: "$1,000",
  saldo: "$1,050",
};

export type DocumentSnapshot = {
  version: 1;
  type: DocumentKind;
  title: string;
  body: string;
  values: Record<string, string>;
  clinic: { name: string; legalName: string; rfc: string; address: string; phone: string; logoUrl: string; footer: string };
  patient: { name: string; age: string; birthDate: string };
  professional?: { name: string; license: string };
  issuedAt: string;
  blocks: {
    procedures?: { rows: Array<{ name: string; details: string; quantity: string; price: string; discount: string; net: string }>; planned: string; realized: string; paid: string; balance: string };
    prescription?: { diagnosis: string; notes: string; items: Array<{ medication: string; dose: string; frequency: string; duration: string; instructions: string }> };
    statement?: { treatments: Array<{ name: string; procedures: string; realized: string }>; payments: Array<{ date: string; method: string; reference: string; amount: string }>; realized: string; paid: string; balance: string };
    signatures?: { patient: string; professional: string };
  };
};

const placeholderPattern = /{{\s*([^{}]+?)\s*}}/g;
export const legacyPlaceholderAliases: Record<string, string> = {
  paciente: "paciente.nombre", profesional: "profesional.nombre", cedula: "profesional.cedula",
  diagnostico: "tratamiento.diagnostico", procedimiento: "tratamiento.nombre", pieza: "tratamiento.piezas", piezas: "tratamiento.piezas",
  procedimientos: "tabla_prestaciones", medicamentos: "receta_medicamentos", movimientos: "estado_cuenta",
};

export function templateTokens(body: string) {
  return [...body.matchAll(placeholderPattern)].map((match) => match[1].trim());
}

export function unknownPlaceholders(body: string, type: DocumentKind) {
  const allowed = new Set<string>([...scalarPlaceholders, ...blockPlaceholder[type], ...Object.keys(legacyPlaceholderAliases), "total", "notas", "periodo", "total_realizado", "pagos", "saldo"]);
  return [...new Set(templateTokens(body).filter((token) => !allowed.has(token)))];
}

export function splitTemplate(body: string) {
  const parts: Array<{ kind: "text" | "placeholder"; value: string }> = [];
  let index = 0;
  for (const match of body.matchAll(placeholderPattern)) {
    const offset = match.index ?? 0;
    if (offset > index) parts.push({ kind: "text", value: body.slice(index, offset) });
    parts.push({ kind: "placeholder", value: match[1].trim() });
    index = offset + match[0].length;
  }
  if (index < body.length) parts.push({ kind: "text", value: body.slice(index) });
  return parts;
}

export function patientAge(birthDate: Date, at = new Date()) {
  let years = at.getFullYear() - birthDate.getFullYear();
  if (at.getMonth() < birthDate.getMonth() || (at.getMonth() === birthDate.getMonth() && at.getDate() < birthDate.getDate())) years -= 1;
  return `${Math.max(0, years)} años`;
}

export function displayBalance(value: { isNegative(): boolean; abs(): { toString(): string }; toString(): string }, format: (value: { toString(): string } | string) => string) {
  return value.isNegative() ? `A favor ${format(value.abs())}` : format(value);
}
