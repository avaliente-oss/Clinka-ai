"use server";

import { revalidatePath } from "next/cache";
import { Prisma, SupplyMovementType } from "@prisma/client";
import { z } from "zod";
import { getSessionUserId } from "./audit";
import { db } from "./db";
import { decimal } from "./money";
import { quantity, serializeQuantity } from "./quantity";
import { activeWhere } from "./soft-delete";

export type InventoryActionState = {
  error?: string;
  success?: string;
  submissionId?: string;
  values?: Record<string, string>;
  canDeactivate?: boolean;
};

const quantityInput = z.string().regex(/^\d+(?:\.\d{1,3})?$/, "Usa hasta tres decimales.").transform(quantity);
const moneyInput = z.string().regex(/^\d+(?:\.\d{1,2})?$/, "Usa hasta dos decimales.").transform(decimal);

function required(form: FormData, name: string) {
  const value = String(form.get(name) ?? "").trim();
  if (!value) throw new Error(`El campo ${name} es obligatorio.`);
  return value;
}

function valuesFrom(form: FormData, fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, String(form.get(field) ?? "")])) as Record<string, string>;
}

function errorMessage(error: unknown) {
  if (error instanceof z.ZodError) return error.issues[0]?.message ?? "Revisa los datos capturados.";
  return error instanceof Error ? error.message : "No fue posible guardar los cambios.";
}

function rejected(error: unknown, values: Record<string, string>, canDeactivate = false): InventoryActionState {
  return { error: errorMessage(error), values, canDeactivate, submissionId: crypto.randomUUID() };
}

function revalidateInventory() {
  revalidatePath("/inventario");
  revalidatePath("/");
}

const supplyFields = ["id", "name", "category", "unit", "sku", "minStock", "unitCost", "active"];

export async function createSupplyState(
  _state: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  const values = valuesFrom(form, supplyFields);
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    const minStock = quantityInput.parse(required(form, "minStock"));
    const unitCostInput = String(form.get("unitCost") ?? "").trim();
    await db.supply.create({
      data: {
        clinicId: clinic.id,
        name: required(form, "name"),
        category: required(form, "category"),
        unit: required(form, "unit"),
        sku: String(form.get("sku") ?? "").trim() || null,
        minStock,
        unitCost: unitCostInput ? moneyInput.parse(unitCostInput) : null,
        active: form.get("active") === "on",
      },
    });
    revalidateInventory();
    return { success: "Insumo creado.", submissionId: crypto.randomUUID() };
  } catch (error) {
    return rejected(error, values);
  }
}

export async function editSupplyState(
  _state: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  const values = valuesFrom(form, supplyFields);
  try {
    const id = required(form, "id");
    const minStock = quantityInput.parse(required(form, "minStock"));
    const unitCostInput = String(form.get("unitCost") ?? "").trim();
    await db.supply.findFirstOrThrow({ where: activeWhere({ id }) });
    await db.supply.update({
      where: { id },
      data: {
        name: required(form, "name"),
        category: required(form, "category"),
        unit: required(form, "unit"),
        sku: String(form.get("sku") ?? "").trim() || null,
        minStock,
        unitCost: unitCostInput ? moneyInput.parse(unitCostInput) : null,
        active: form.get("active") === "on",
      },
    });
    revalidateInventory();
    return { success: "Insumo actualizado.", submissionId: crypto.randomUUID() };
  } catch (error) {
    return rejected(error, values);
  }
}

export async function deleteSupplyState(
  _state: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  const id = required(form, "id");
  try {
    const supply = await db.supply.findFirstOrThrow({
      where: activeWhere({ id }),
      include: { _count: { select: { priceItems: true } } },
    });
    if (supply._count.priceItems) {
      throw new Error("No se puede eliminar porque forma parte de una receta. Puedes desactivarlo.");
    }
    await db.supply.update({ where: { id }, data: { deletedAt: new Date(), active: false } });
    revalidateInventory();
    return { success: "Insumo eliminado." };
  } catch (error) {
    return rejected(error, { id }, true);
  }
}

export async function deactivateSupply(form: FormData) {
  const id = required(form, "id");
  await db.supply.update({ where: { id }, data: { active: false } });
  revalidateInventory();
}

const movementFields = ["supplyId", "type", "quantity", "reason", "unitCost"];

export async function registerSupplyMovementState(
  _state: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  const values = valuesFrom(form, movementFields);
  try {
    const userId = await getSessionUserId();
    const supplyId = required(form, "supplyId");
    const type = z.nativeEnum(SupplyMovementType).parse(required(form, "type"));
    if (type === SupplyMovementType.CONSUMO) throw new Error("El consumo se registra desde una prestación clínica.");
    const input = quantityInput.parse(required(form, "quantity"));
    const reason = required(form, "reason");
    const unitCostInput = String(form.get("unitCost") ?? "").trim();
    if (input.isNegative()) throw new Error("La cantidad capturada no puede ser negativa.");
    if (type !== SupplyMovementType.AJUSTE && input.isZero()) throw new Error("La cantidad debe ser mayor que cero.");

    const result = await db.$transaction(async (tx) => {
      const supply = await tx.supply.findFirstOrThrow({ where: activeWhere({ id: supplyId }) });
      const delta = type === SupplyMovementType.AJUSTE
        ? input.minus(supply.stock)
        : type === SupplyMovementType.SALIDA
          ? input.negated()
          : input;
      if (delta.isZero()) throw new Error("La existencia contada coincide con la registrada; no hay ajuste que guardar.");
      const updated = await tx.supply.update({
        where: { id: supply.id },
        data: {
          stock: type === SupplyMovementType.AJUSTE ? input : { increment: delta },
          ...(type === SupplyMovementType.ENTRADA && unitCostInput
            ? { unitCost: moneyInput.parse(unitCostInput) }
            : {}),
        },
      });
      await tx.supplyMovement.create({
        data: {
          supplyId,
          type,
          quantity: delta,
          resultingStock: updated.stock,
          reason,
          createdById: userId,
        },
      });
      return updated;
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    revalidateInventory();
    return {
      success: `Movimiento guardado. Existencia: ${serializeQuantity(result.stock)} ${result.unit}.`,
      submissionId: crypto.randomUUID(),
    };
  } catch (error) {
    return rejected(error, values);
  }
}

const recipeSchema = z.array(z.object({
  supplyId: z.string().min(1),
  quantity: z.string().regex(/^\d+(?:\.\d{1,3})?$/).transform(quantity),
}));

export async function savePriceItemRecipeState(
  _state: InventoryActionState,
  form: FormData,
): Promise<InventoryActionState> {
  const priceItemId = String(form.get("priceItemId") ?? "");
  const recipeJson = String(form.get("recipe") ?? "[]");
  try {
    const clinic = await db.clinic.findFirstOrThrow();
    const recipe = recipeSchema.parse(JSON.parse(recipeJson) as unknown);
    if (new Set(recipe.map((item) => item.supplyId)).size !== recipe.length) {
      throw new Error("Cada insumo sólo puede aparecer una vez en la receta.");
    }
    await db.priceItem.findFirstOrThrow({ where: { id: priceItemId, clinicId: clinic.id } });
    const validSupplies = await db.supply.count({
      where: activeWhere({ id: { in: recipe.map((item) => item.supplyId) }, clinicId: clinic.id, active: true }),
    });
    if (validSupplies !== recipe.length) throw new Error("La receta contiene un insumo inactivo o no disponible.");
    await db.$transaction(async (tx) => {
      await tx.priceItemSupply.deleteMany({ where: { priceItemId } });
      if (recipe.length) {
        await tx.priceItemSupply.createMany({
          data: recipe.map((item) => ({ priceItemId, supplyId: item.supplyId, quantity: item.quantity })),
        });
      }
    });
    revalidateInventory();
    return { success: "Receta actualizada." };
  } catch (error) {
    return rejected(error, { priceItemId, recipe: recipeJson });
  }
}
