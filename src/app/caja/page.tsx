import { CircleDollarSign, WalletCards } from "lucide-react";
import { createPayment } from "@/lib/actions";
import { db } from "@/lib/db";
import { addMoney, proceduresTotal, subtractMoney, sumMoney } from "@/lib/money";
import { activeWhere } from "@/lib/soft-delete";
import { dateMx, enumLabel, money } from "@/lib/utils";
import { PaymentMethod, ProcedureStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const [payments, patients] = await Promise.all([
    db.payment.findMany({
      where: { patient: { deletedAt: null } }, include: { patient: true, treatment: true },
      orderBy: { date: "desc" },
    }),
    db.patient.findMany({
      where: activeWhere(), include: { treatments: { where: activeWhere(), include: { procedures: true } }, payments: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  const income = sumMoney(payments, (payment) => payment.amount);
  const billed = addMoney(...patients.flatMap((patient) => patient.treatments.map((treatment) => proceduresTotal(treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA)))));
  const patientBalances = patients
    .map((patient) => {
      const treatmentTotal = addMoney(...patient.treatments.map((treatment) => proceduresTotal(treatment.procedures.filter((procedure) => procedure.status === ProcedureStatus.REALIZADA))));
      const paid = sumMoney(patient.payments, (payment) => payment.amount);
      return {
        id: patient.id,
        name: patient.firstName + " " + patient.lastName,
        treatmentTotal,
        paid,
        balance: subtractMoney(treatmentTotal, paid),
      };
    })
    .filter((patient) => patient.treatmentTotal.isPositive())
    .sort((a, b) => b.balance.comparedTo(a.balance));

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Finanzas</div>
          <h1 className="title">Caja y pagos</h1>
          <p className="subtitle">Cobros, métodos y saldos de pacientes</p>
        </div>
      </div>

      <div className="grid three">
        <Summary
          icon={<CircleDollarSign />}
          label="Cobrado histórico"
          value={money(income)}
        />
        <Summary
          icon={<WalletCards />}
          label="Prestaciones realizadas"
          value={money(billed)}
        />
        <Summary
          icon={<CircleDollarSign />}
          label="Saldo pendiente"
          value={money(subtractMoney(billed, income))}
        />
      </div>

      <div className="grid two section-gap">
        <div className="card">
          <h2>Movimientos recientes</h2>
          {payments.length ? (
            payments.map((payment) => (
              <div className="listitem" key={payment.id}>
                <div>
                  <b>
                    {payment.patient.firstName} {payment.patient.lastName}
                  </b>
                  <div className="small">
                    {dateMx(payment.date)} · {enumLabel[payment.method]}
                    {payment.reference ? " · " + payment.reference : ""}
                    {payment.treatment ? ` · ${payment.treatment.title}` : ""}
                  </div>
                </div>
                <b>{money(payment.amount)}</b>
              </div>
            ))
          ) : (
            <p className="small">Aún no hay movimientos.</p>
          )}
        </div>

        <div className="card">
          <h2>Registrar pago</h2>
          <form action={createPayment} className="formgrid">
            <div className="field span-all">
              <label>Paciente</label>
              <select className="input" name="patientId">
                {patients.map((patient) => (
                  <option key={patient.id} value={patient.id}>
                    {patient.firstName} {patient.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="field span-all">
              <label>Tratamiento (opcional)</label>
              <select className="input" name="treatmentId">
                <option value="">Pago general del paciente</option>
                {patients.flatMap((patient) => patient.treatments.map((treatment) => (
                  <option key={treatment.id} value={treatment.id}>{patient.firstName} {patient.lastName} · {treatment.title}</option>
                )))}
              </select>
              <span className="small">El tratamiento seleccionado debe pertenecer al paciente.</span>
            </div>
            <div className="field">
              <label>Monto MXN</label>
              <input
                className="input"
                type="number"
                name="amount"
                min="1"
                step="0.01"
                required
              />
            </div>
            <div className="field">
              <label>Método</label>
              <select className="input" name="method">
                <option value={PaymentMethod.TARJETA}>Tarjeta</option>
                <option value={PaymentMethod.TRANSFERENCIA}>Transferencia</option>
                <option value={PaymentMethod.EFECTIVO}>Efectivo</option>
              </select>
            </div>
            <div className="field span-all">
              <label>Referencia</label>
              <input
                className="input"
                name="reference"
                placeholder="Folio opcional"
              />
            </div>
            <button className="btn primary span-all">Confirmar pago</button>
          </form>
        </div>
      </div>

      <div className="card section-gap">
        <h2>Saldo por paciente</h2>
        <p className="notice">El saldo se calcula como prestaciones realizadas menos pagos registrados. Las prestaciones aún planificadas no generan saldo.</p>
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Prestaciones realizadas</th>
                <th>Pagado</th>
                <th>Saldo</th>
              </tr>
            </thead>
            <tbody>
              {patientBalances.map((patient) => (
                <tr key={patient.id}>
                  <td>
                    <b>{patient.name}</b>
                  </td>
                  <td>{money(patient.treatmentTotal)}</td>
                  <td>{money(patient.paid)}</td>
                  <td>
                    <b>{money(patient.balance)}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function Summary({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="card row">
      <span className="iconbox">{icon}</span>
      <div>
        <div className="small">{label}</div>
        <div className="summary-value">{value}</div>
      </div>
    </div>
  );
}
