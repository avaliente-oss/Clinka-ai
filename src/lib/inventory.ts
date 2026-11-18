import { Prisma, SupplyMovementType } from "@prisma/client";
import { formatQuantity, quantity } from "./quantity";

export type LowStockNotice = {
  supplyId: string;
  message: string;
};

export async function consumeProcedureSupplies(
  tx: Prisma.TransactionClient,
  procedureIds: string[],
  createdById: string,
) {
  if (!procedureIds.length) return [];

  const procedures = await tx.procedure.findMany({
    where: { id: { in: procedureIds } },
    include: {
      supplyMovements: {
        where: { type: SupplyMovementType.CONSUMO },
        select: { id: true },
      },
      priceItem: {
        include: {
          supplies: { include: { supply: true } },
        },
      },
    },
  });
  const finalStocks = new Map<string, {
    name: string;
    unit: string;
    stock: Prisma.Decimal;
    minStock: Prisma.Decimal;
  }>();

  for (const procedure of procedures) {
    if (procedure.supplyMovements.length || !procedure.priceItem) continue;
    for (const recipe of procedure.priceItem.supplies) {
      const delta = quantity(recipe.quantity).times(procedure.quantity).negated();
      const updated = await tx.supply.update({
        where: { id: recipe.supplyId },
        data: { stock: { increment: delta } },
      });
      await tx.supplyMovement.create({
        data: {
          supplyId: recipe.supplyId,
          procedureId: procedure.id,
          type: SupplyMovementType.CONSUMO,
          quantity: delta,
          resultingStock: updated.stock,
          reason: `Consumo automático: ${procedure.name}`,
          createdById,
        },
      });
      finalStocks.set(updated.id, {
        name: updated.name,
        unit: updated.unit,
        stock: updated.stock,
        minStock: updated.minStock,
      });
    }
  }

  return [...finalStocks.entries()]
    .filter(([, supply]) => supply.stock.lt(supply.minStock))
    .map(([supplyId, supply]): LowStockNotice => ({
      supplyId,
      message: `Quedan ${formatQuantity(supply.stock)} ${supply.unit} de ${supply.name.toLocaleLowerCase("es-MX")}; mínimo ${formatQuantity(supply.minStock)}.`,
    }));
}
