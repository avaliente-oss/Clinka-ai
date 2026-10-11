import { CircleDollarSign, WalletCards } from "lucide-react";
import { createPayment } from "@/lib/actions";
import { db } from "@/lib/db";
import { dateMx, money } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const [payments, patients] = await Promise.all([
    db.payment.findMany({
      include: { patient: true },
      orderBy: { date: "desc" },
    }),
    db.patient.findMany({
      include: { treatments: true, payments: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  const income = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const billed = patients.reduce(
    (sum, patient) =>
      sum + patient.treatments.reduce((value, plan) => value + plan.total, 0),
    0,
  );
  const patientBalances = patients
    .map((patient) => {
      const treatmentTotal = patient.treatments.reduce(
        (sum, plan) => sum + plan.total,
        0,
      );
      const paid = patient.payments.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );
      return {
        id: patient.id,
        name: patient.firstName + " " + patient.lastName,
        treatmentTotal,
        paid,
        balance: Math.max(0, treatmentTotal - paid),
      };
    })
    .filter((patient) => patient.treatmentTotal > 0)
    .sort((a, b) => b.balance - a.balance);

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
          label="Tratamientos"
          value={money(billed)}
        />
        <Summary
          icon={<CircleDollarSign />}
          label="Saldo pendiente"
          value={money(Math.max(0, billed - income))}
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
                    {dateMx(payment.date)} · {payment.method}
                    {payment.reference ? " · " + payment.reference : ""}
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
                <option>Tarjeta</option>
                <option>Transferencia</option>
                <option>Efectivo</option>
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
        <div className="tablewrap">
          <table className="table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Tratamientos</th>
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
