import Link from "next/link";
import { Boxes, CircleDollarSign, TriangleAlert } from "lucide-react";
import { Prisma, SupplyMovementType } from "@prisma/client";
import { MovementForm, RecipeEditor, SupplyDeleteControls, SupplyForm } from "@/components/inventory-forms";
import { db } from "@/lib/db";
import { decimal, serializeMoney } from "@/lib/money";
import { formatQuantity, serializeQuantity } from "@/lib/quantity";
import { activeWhere } from "@/lib/soft-delete";
import { dateMx, money } from "@/lib/utils";

type InventorySearch = { q?: string; category?: string; low?: string; supply?: string };
type MovementWithRelations = Prisma.SupplyMovementGetPayload<{ include: { supply: true; createdBy: true; procedure: { include: { treatment: { include: { patient: true } } } } } }>;

export const dynamic = "force-dynamic";

export default async function InventoryPage({ searchParams }: { searchParams: Promise<InventorySearch> }) {
  const query = await searchParams;
  const clinic = await db.clinic.findFirstOrThrow();
  const movementInclude = { supply: true, createdBy: true, procedure: { include: { treatment: { include: { patient: true } } } } } as const;
  const [supplies, priceItems, recentMovements, selectedMovements] = await Promise.all([
    db.supply.findMany({ where: activeWhere({ clinicId: clinic.id }), include: { _count: { select: { priceItems: true } } }, orderBy: [{ active: "desc" }, { name: "asc" }] }),
    db.priceItem.findMany({ where: { clinicId: clinic.id }, include: { supplies: { orderBy: { supply: { name: "asc" } } } }, orderBy: [{ category: "asc" }, { name: "asc" }] }),
    db.supplyMovement.findMany({ where: { supply: { clinicId: clinic.id } }, include: movementInclude, orderBy: { createdAt: "desc" }, take: 20 }),
    query.supply ? db.supplyMovement.findMany({ where: { supplyId: query.supply, supply: { clinicId: clinic.id } }, include: movementInclude, orderBy: { createdAt: "desc" }, take: 100 }) : Promise.resolve([]),
  ]);
  const categories = [...new Set(supplies.map((supply) => supply.category))].sort((a, b) => a.localeCompare(b, "es-MX"));
  const underMinimum = supplies.filter((supply) => supply.stock.lt(supply.minStock));
  const inventoryValue = supplies.reduce((total, supply) => total.plus(decimal(supply.stock).times(supply.unitCost ?? 0)), new Prisma.Decimal(0));
  const search = query.q?.trim().toLocaleLowerCase("es-MX") ?? "";
  const filteredSupplies = supplies.filter((supply) => (!search || supply.name.toLocaleLowerCase("es-MX").includes(search)) && (!query.category || supply.category === query.category) && (query.low !== "1" || supply.stock.lt(supply.minStock)));
  const activeSupplyOptions = supplies.filter((supply) => supply.active).map((supply) => ({ id: supply.id, name: supply.name, unit: supply.unit }));
  const recipeSupplyOptions = supplies.map((supply) => ({ id: supply.id, name: `${supply.name}${supply.active ? "" : " (inactivo)"}`, unit: supply.unit }));
  const selectedSupply = supplies.find((supply) => supply.id === query.supply);

  return <div className="page-stack">
    <div className="pagehead"><div><div className="eyebrow">Administración</div><h1 className="title">Inventario</h1><p className="subtitle">Existencias, movimientos y consumo por prestación.</p></div><details className="panel-header-form"><summary className="btn primary">+ Nuevo insumo</summary><div className="modal-like inventory-form-panel"><SupplyForm /></div></details></div>
    <section className="grid-kpi inventory-kpis"><Kpi icon={<Boxes />} label="Insumos registrados" value={String(supplies.length)} note={`${supplies.filter((supply) => supply.active).length} activos`} /><Kpi icon={<TriangleAlert />} label="Bajo mínimo" value={String(underMinimum.length)} note="Incluye existencias negativas" /><Kpi icon={<CircleDollarSign />} label="Valor del inventario" value={money(inventoryValue)} note="Existencia × costo unitario" /></section>
    <section className="card">
      <div className="inventory-section-head"><h2>Existencias</h2><p className="small">Los estados siempre comparan la existencia actual contra el mínimo.</p></div>
      <form className="inventory-filters"><input className="input" defaultValue={query.q ?? ""} name="q" placeholder="Buscar por nombre" /><select className="input" defaultValue={query.category ?? ""} name="category"><option value="">Todas las categorías</option>{categories.map((category) => <option key={category}>{category}</option>)}</select><label className="row small"><input defaultChecked={query.low === "1"} name="low" type="checkbox" value="1" /> Solo bajo mínimo</label><button className="btn">Aplicar</button>{(query.q || query.category || query.low) && <Link className="btn ghost" href="/inventario">Limpiar</Link>}</form>
      <div className="tablewrap inventory-desktop-table"><table className="table"><thead><tr><th>Insumo</th><th>Categoría</th><th>Unidad</th><th className="money-cell">Existencia</th><th className="money-cell">Mínimo</th><th className="money-cell">Costo</th><th>Estado</th><th>Acciones</th></tr></thead><tbody>{filteredSupplies.map((supply) => <tr key={supply.id}><td><Link href={`/inventario?supply=${supply.id}#kardex`}><b>{supply.name}</b></Link>{supply.sku && <span className="small block">SKU {supply.sku}</span>}</td><td>{supply.category}</td><td>{supply.unit}</td><td className="money-cell">{formatQuantity(supply.stock)}</td><td className="money-cell">{formatQuantity(supply.minStock)}</td><td className="money-cell">{supply.unitCost ? money(supply.unitCost) : "—"}</td><td><StockBadges stock={supply.stock} minStock={supply.minStock} active={supply.active} /></td><td><details className="inventory-edit"><summary className="btn ghost">Editar</summary><div className="modal-like"><SupplyForm supply={editableSupply(supply)} /><SupplyDeleteControls supplyId={supply.id} /></div></details></td></tr>)}</tbody></table></div>
      <div className="inventory-mobile-list">{filteredSupplies.map((supply) => <article className="card inventory-mobile-card" key={supply.id}><div className="row between"><div><Link href={`/inventario?supply=${supply.id}#kardex`}><b>{supply.name}</b></Link><span className="small block">{supply.category} · {supply.unit}</span></div><StockBadges stock={supply.stock} minStock={supply.minStock} active={supply.active} /></div><div className="grid three"><Metric label="Existencia" value={formatQuantity(supply.stock)} /><Metric label="Mínimo" value={formatQuantity(supply.minStock)} /><Metric label="Costo" value={supply.unitCost ? money(supply.unitCost) : "—"} /></div><details className="inventory-edit"><summary className="btn ghost">Editar insumo</summary><div className="modal-like"><SupplyForm supply={editableSupply(supply)} /><SupplyDeleteControls supplyId={supply.id} /></div></details></article>)}</div>
      {!filteredSupplies.length && <div className="empty-state">No hay insumos que coincidan con los filtros.</div>}
    </section>
    <section className="grid-2 inventory-operations"><div className="card"><h2>Registrar movimiento</h2><p className="small">Las salidas se guardan como delta negativo. En un ajuste captura la existencia física contada.</p>{activeSupplyOptions.length ? <MovementForm supplies={activeSupplyOptions} /> : <p className="empty-state">No hay insumos activos.</p>}</div><div className="card"><div className="row between"><h2>Movimientos recientes</h2><span className="small">Últimos 20</span></div><MovementList movements={recentMovements} /></div></section>
    {selectedSupply && <section className="card" id="kardex"><div className="row between"><div><h2>Kardex · {selectedSupply.name}</h2><p className="small">Historial de deltas y existencia resultante.</p></div><Link className="btn ghost" href="/inventario#kardex">Cerrar</Link></div><MovementList movements={selectedMovements} /></section>}
    <section className="card" id="recetas"><div className="row between"><div><h2>Insumos por prestación</h2><p className="small">La cantidad configurada se multiplica por la cantidad realizada de la prestación.</p></div><span className="badge">Consumo automático</span></div><div className="recipe-list">{priceItems.map((priceItem) => <RecipeEditor key={priceItem.id} priceItem={{ id: priceItem.id, name: priceItem.name, category: priceItem.category, recipe: priceItem.supplies.map((item) => ({ supplyId: item.supplyId, quantity: serializeQuantity(item.quantity) })) }} supplies={recipeSupplyOptions} />)}</div></section>
  </div>;
}

function editableSupply(supply: { id: string; name: string; category: string; unit: string; sku: string | null; minStock: Prisma.Decimal; unitCost: Prisma.Decimal | null; active: boolean }) {
  return { id: supply.id, name: supply.name, category: supply.category, unit: supply.unit, sku: supply.sku ?? "", minStock: serializeQuantity(supply.minStock), unitCost: supply.unitCost ? serializeMoney(supply.unitCost) : "", active: supply.active };
}

function StockBadges({ stock, minStock, active }: { stock: Prisma.Decimal; minStock: Prisma.Decimal; active: boolean }) {
  const status = stock.isNegative() ? "Existencia negativa" : stock.isZero() ? "Sin existencia" : stock.lt(minStock) ? "Bajo mínimo" : "OK";
  const className = stock.isNegative() || stock.isZero() ? "danger" : stock.lt(minStock) ? "warning" : "success";
  return <span className="inventory-badges"><span className={`badge inventory-status ${className}`}>{status}</span>{!active && <span className="badge">Inactivo</span>}</span>;
}

function MovementList({ movements }: { movements: MovementWithRelations[] }) {
  if (!movements.length) return <p className="empty-state">Aún no hay movimientos.</p>;
  return <div className="inventory-movements">{movements.map((movement) => { const patient = movement.procedure?.treatment.patient; const treatment = movement.procedure?.treatment; const delta = movement.quantity.isPositive() ? `+${formatQuantity(movement.quantity)}` : formatQuantity(movement.quantity); return <article className="inventory-movement" key={movement.id}><div className="row between"><div><b>{movement.supply.name}</b><span className="small block">{movementTypeLabel[movement.type]} · {movement.reason}</span></div><div className="inventory-movement-amount"><b>{delta} {movement.supply.unit}</b><span className="small block">Saldo {movement.resultingStock === null ? "—" : formatQuantity(movement.resultingStock)}</span></div></div><div className="row between small"><span>{dateMx(movement.createdAt, { dateStyle: "medium", timeStyle: "short" })} · {movement.createdBy?.name ?? "Sistema"}</span>{patient && treatment && <Link href={`/pacientes/${patient.id}#tratamiento-${treatment.id}`}>{patient.firstName} {patient.lastName} · {treatment.title} →</Link>}</div></article>; })}</div>;
}

const movementTypeLabel: Record<SupplyMovementType, string> = { ENTRADA: "Entrada", SALIDA: "Salida", AJUSTE: "Ajuste", CONSUMO: "Consumo clínico" };
function Kpi({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) { return <div className="card kpi"><div className="row between"><span className="small">{label}</span><span className="iconbox">{icon}</span></div><div className="value">{value}</div><div className="delta">{note}</div></div>; }
function Metric({ label, value }: { label: string; value: string }) { return <div><span className="small block">{label}</span><b>{value}</b></div>; }
