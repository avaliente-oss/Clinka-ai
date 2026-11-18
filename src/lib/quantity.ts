import { Prisma } from "@prisma/client";

export type QuantityValue = Prisma.Decimal | string | number;

export const ZERO_QUANTITY = new Prisma.Decimal(0);

export function quantity(value: QuantityValue = ZERO_QUANTITY) {
  return value instanceof Prisma.Decimal
    ? value
    : new Prisma.Decimal(typeof value === "number" ? value.toString() : value);
}

export function serializeQuantity(value: QuantityValue) {
  return quantity(value).toFixed(3);
}

export function formatQuantity(value: QuantityValue) {
  return new Intl.NumberFormat("es-MX", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3,
  }).format(Number(quantity(value).toString()));
}
