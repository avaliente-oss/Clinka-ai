import Link from "next/link";
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

  return (
    <>
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

      <div className="card section-gap tablewrap">
        <table className="table">
          <thead><tr><th>Paciente / tratamiento</th><th>Responsable</th><th>Estado</th><th>Avance</th><th>Total</th><th>Realizado</th><th>Pagado</th><th>Saldo</th></tr></thead>
          <tbody>{treatments.map((treatment) => {
            const planned = proceduresTotal(treatment.procedures);
            const realized = proceduresTotal(treatment.procedures.filter((item) => item.status === ProcedureStatus.REALIZADA));
            const paid = sumMoney(treatment.payments, (payment) => payment.amount);
            const balance = subtractMoney(realized, paid);
            const progress = treatment.evolutions[0]?.cumulativeProgress ?? 0;
            return <tr key={treatment.id}>
              <td><Link href={`/pacientes/${treatment.patientId}#tratamiento-${treatment.id}`}><b>{treatment.patient.firstName} {treatment.patient.lastName}</b><div className="small">{treatment.title}</div></Link></td>
              <td>{treatment.responsibleProfessional.name}</td>
              <td><form action={updateTreatmentStatus} className="row"><input type="hidden" name="id" value={treatment.id} /><select className="input" name="status" defaultValue={treatment.status}>{["PLANIFICADO", "EN_CURSO", "TERMINADO", "SUSPENDIDO"].map((status) => <option value={status} key={status}>{statusLabel[status]}</option>)}</select><button className="btn" aria-label="Guardar estado">✓</button></form></td>
              <td><div className="progress"><span style={{ width: `${progress}%` }} /></div><b>{progress}%</b></td>
              <td>{money(planned)}</td><td><b>{money(realized)}</b></td><td>{money(paid)}</td><td><b>{money(balance)}</b></td>
            </tr>;
          })}</tbody>
        </table>
        {!treatments.length && <p className="empty-state">No hay tratamientos con estos filtros.</p>}
        <p className="small table-help">Saldo = prestaciones realizadas netas − pagos ligados al tratamiento.</p>
      </div>

      <div className="grid two section-gap budget-layout">
        <section className="card" id="nuevo-tratamiento"><h2>Nuevo tratamiento</h2><TreatmentForm patients={patientOptions} professionals={professionalOptions} prices={priceOptions} /></section>
        <AITreatmentProposal patients={patientOptions} professionals={professionalOptions} />
      </div>
    </>
  );
}
