import { Prisma } from "@prisma/client";

export type MoneyValue = Prisma.Decimal | string | number;
export type ProcedureAmount = {
  price: MoneyValue;
  quantity: number;
  discount?: MoneyValue | null;
};

export const ZERO_MONEY = new Prisma.Decimal(0);

export function decimal(value: MoneyValue = ZERO_MONEY) {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(typeof value === "number" ? value.toString() : value);
}

export function addMoney(...values: MoneyValue[]) {
  return values.reduce<Prisma.Decimal>((total, value) => total.plus(decimal(value)), ZERO_MONEY);
}

export function subtractMoney(left: MoneyValue, right: MoneyValue) {
  return decimal(left).minus(decimal(right));
}

export function procedureNet(procedure: ProcedureAmount) {
  const net = decimal(procedure.price)
    .times(procedure.quantity)
    .minus(decimal(procedure.discount ?? 0));
  return net.isNegative() ? ZERO_MONEY : net;
}

export function proceduresTotal(procedures: ProcedureAmount[]) {
  return procedures.reduce<Prisma.Decimal>(
    (total, procedure) => total.plus(procedureNet(procedure)),
    ZERO_MONEY,
  );
}

export function sumMoney<T>(values: T[], select: (value: T) => MoneyValue) {
  return values.reduce<Prisma.Decimal>(
    (total, value) => total.plus(decimal(select(value))),
    ZERO_MONEY,
  );
}

/** Decimal crosses a server/client or JSON boundary as a canonical string. */
export function serializeMoney(value: MoneyValue) {
  return decimal(value).toFixed(2);
}
