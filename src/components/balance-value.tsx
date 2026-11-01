import type { MoneyValue } from "@/lib/money";
import { decimal } from "@/lib/money";
import { money } from "@/lib/utils";

export function BalanceValue({ value }: { value: MoneyValue }) {
  const balance = decimal(value);

  if (balance.isNegative()) {
    return <span className="badge balance-credit">A favor {money(balance.abs())}</span>;
  }

  return <span className="money-value">{money(balance)}</span>;
}
