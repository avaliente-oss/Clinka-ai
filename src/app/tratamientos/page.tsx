import Link from "next/link";
import { BalanceValue } from "@/components/balance-value";
import { DeleteTreatmentButton } from "@/components/delete-treatment-button";
import { TreatmentForm } from "@/components/treatment-form";
import { AITreatmentProposal } from "@/components/treatment-planner";
import { updateTreatmentStatus } from "@/lib/actions";
import { db } from "@/lib/db";
import { proceduresTotal, serializeMoney, subtractMoney, sumMoney } from "@/lib/money";
import { activeWhere } from "@/lib/soft-delete";
import { money, statusLabel } from "@/lib/utils";
import { ProcedureStatus, TreatmentStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function TreatmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; professional?: string }>;
}) {
  const filters = await searchParams;
  const status = Object.values(TreatmentStatus).find((item) => item === filters.status);
  const [treatments, patients, professionals, prices] = await Promise.all([
    db.treatment.findMany({
      where: {
        ...activeWhere(status ? { status, patient: { deletedAt: null } } : { patient: { deletedAt: null } }),
        ...(filters.professional ? { responsibleProfessionalId: filters.professional } : {}),
      },
      include: {
        patient: true,
        responsibleProfessional: true,
        procedures: true,
        payments: true,
        evolutions: { where: activeWhere(), orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.patient.findMany({ where: activeWhere(), orderBy: [{ firstName: "asc" }, { lastName: "asc" }] }),
    db.professional.findMany({ orderBy: { name: "asc" } }),
    db.priceItem.findMany({ orderBy: { name: "asc" } }),
  ]);
  const patientOptions = patients.map((patient) => ({ id: patient.id, name: `${patient.firstName} ${patient.lastName}` }));
  const professionalOptions = professionals.map((professional) => ({ id: professional.id, name: professional.name }));
  const priceOptions = prices.map((price) => ({ id: price.id, name: price.name, price: serializeMoney(price.price) }));
  const treatmentRows = treatments.map((treatment) => ({
    treatment,
    planned: proceduresTotal(treatment.procedures),
    realized: proceduresTotal(treatment.procedures.filter((item) => item.status === ProcedureStatus.REALIZADA)),
    paid: sumMoney(treatment.payments, (payment) => payment.amount),
    progress: treatment.evolutions[0]?.cumulativeProgress ?? 0,
  })).map((row) => ({ ...row, balance: subtractMoney(row.realized, row.paid) }));

  const statusControl = (treatment: (typeof treatments)[number]) => {
    const hasActivity =
      treatment.evolutions.length > 0 ||
      treatment.payments.length > 0 ||
      treatment.procedures.some((procedure) => procedure.status === ProcedureStatus.REALIZADA);
    return (
      <div className="status-cell">
        <form action={updateTreatmentStatus} className="status-control">
          <input type="hidden" name="id" value={treatment.id} />
          <select aria-label={`Estado de ${treatment.title}`} className="input" name="status" defaultValue={treatment.status}>
            {Object.values(TreatmentStatus).map((item) => <option value={item} key={item}>{statusLabel[item]}</option>)}
          </select>
          <button className="btn" aria-label={`Guardar estado de ${treatment.title}`}>✓</button>
        </form>
        <DeleteTreatmentButton
          compact
          id={treatment.id}
          title={treatment.title}
          blockedReason={hasActivity ? "Tiene evoluciones, prestaciones realizadas o pagos; márcalo como suspendido." : undefined}
        />
      </div>
    );
  };

  return (
    <div className="page-stack">
      <div className="pagehead">
        <div><div className="eyebrow">Atención clínica</div><h1 className="title">Tratamientos</h1><p className="subtitle">Seguimiento por evoluciones y prestaciones</p></div>
        <a className="btn primary" href="#nuevo-tratamiento">+ Nuevo tratamiento</a>
      </div>

      <form className="card filterbar">
        <div className="field"><label>Estado</label><select className="input" name="status" defaultValue={filters.status ?? ""}><option value="">Todos</option>{["PLANIFICADO", "EN_CURSO", "TERMINADO", "SUSPENDIDO"].map((status) => <option value={status} key={status}>{statusLabel[status]}</option>)}</select></div>
        <div className="field"><label>Profesional</label><select className="input" name="professional" defaultValue={filters.professional ?? ""}><option value="">Todos</option>{professionalOptions.map((item) => <option value={item.id} key={item.id}>{item.name}</option>)}</select></div>
        <button className="btn">Filtrar</button>
        <Link className="btn ghost" href="/tratamientos">Limpiar</Link>
      </form>

      <div className="card treatment-desktop-table">
        <div className="tablewrap">
        <table className="table treatment-table">
          <thead><tr><th>Paciente / tratamiento</th><th>Responsable</th><th>Estado</th><th>Avance</th><th>Total</th><th>Realizado</th><th>Pagado</th><th>Saldo</th></tr></thead>
          <tbody>{treatmentRows.map(({ treatment, planned, realized, paid, balance, progress }) => <tr key={treatment.id}>
              <td><Link href={`/pacientes/${treatment.patientId}#tratamiento-${treatment.id}`}><b>{treatment.patient.firstName} {treatment.patient.lastName}</b><div className="small">{treatment.title}</div></Link></td>
              <td>{treatment.responsibleProfessional.name}</td>
              <td>{statusControl(treatment)}</td>
              <td><div className="progress-inline"><div className="progress"><span style={{ width: `${progress}%` }} /></div><b>{progress}%</b></div></td>
              <td className="money-cell">{money(planned)}</td><td className="money-cell"><b>{money(realized)}</b></td><td className="money-cell">{money(paid)}</td><td className="money-cell"><b><BalanceValue value={balance} /></b></td>
            </tr>)}</tbody>
        </table>
        </div>
        {!treatments.length && <p className="empty-state">No hay tratamientos con estos filtros.</p>}
        <p className="notice table-help">Saldo = prestaciones realizadas netas − pagos ligados al tratamiento.</p>
      </div>

      <div className="treatment-mobile-list">
        {treatmentRows.map(({ treatment, planned, realized, paid, balance, progress }) => (
          <article className="card treatment-mobile-card" key={treatment.id}>
            <div className="treatment-mobile-header">
              <Link href={`/pacientes/${treatment.patientId}#tratamiento-${treatment.id}`}>
                <b>{treatment.patient.firstName} {treatment.patient.lastName}</b>
                <span className="small block">{treatment.title}</span>
              </Link>
              <span className={`badge ${treatment.status}`}>{statusLabel[treatment.status]}</span>
            </div>
            <span className="small">Responsable: {treatment.responsibleProfessional.name}</span>
            {statusControl(treatment)}
            <div className="progress-inline"><div className="progress"><span style={{ width: `${progress}%` }} /></div><b>{progress}%</b></div>
            <div className="treatment-mobile-metrics">
              <div><span className="small block">Total</span><b>{money(planned)}</b></div>
              <div><span className="small block">Realizado</span><b>{money(realized)}</b></div>
              <div><span className="small block">Pagado</span><b>{money(paid)}</b></div>
              <div><span className="small block">Saldo</span><b><BalanceValue value={balance} /></b></div>
            </div>
          </article>
        ))}
        {!treatmentRows.length && <div className="card empty-state">No hay tratamientos con estos filtros.</div>}
        <p className="notice">Saldo = prestaciones realizadas netas − pagos ligados al tratamiento.</p>
      </div>

      <div className="grid-2 budget-layout">
        <section className="card" id="nuevo-tratamiento"><h2>Nuevo tratamiento</h2><TreatmentForm patients={patientOptions} professionals={professionalOptions} prices={priceOptions} /></section>
        <AITreatmentProposal patients={patientOptions} professionals={professionalOptions} />
      </div>
    </div>
  );
}
