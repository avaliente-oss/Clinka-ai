export type SerializedMoney = string;
export type ClientProcedureAmount = {
  price: SerializedMoney;
  quantity: number;
  discount?: SerializedMoney;
};

export function moneyToCents(value: string) {
  const normalized = value.trim().replace(/,/g, "");
  if (!/^\d*(?:\.\d{0,2})?$/.test(normalized)) return 0;
  const [whole = "0", fraction = ""] = normalized.split(".");
  return Number(whole || "0") * 100 + Number(fraction.padEnd(2, "0"));
}

export function centsToMoney(cents: number): SerializedMoney {
  const safe = Math.max(0, Math.trunc(cents));
  return `${Math.trunc(safe / 100)}.${String(safe % 100).padStart(2, "0")}`;
}

export function procedureNetCents(procedure: ClientProcedureAmount) {
  return Math.max(
    0,
    moneyToCents(procedure.price) * procedure.quantity -
      moneyToCents(procedure.discount ?? "0"),
  );
}

export function proceduresTotalCents(procedures: ClientProcedureAmount[]) {
  return procedures.reduce((total, procedure) => total + procedureNetCents(procedure), 0);
}
