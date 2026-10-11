import { Trash2 } from "lucide-react";
import { BudgetForm } from "@/components/budget-form";
import { TreatmentPlanner } from "@/components/treatment-planner";
import { deleteTreatmentPlan, updatePlanStatus } from "@/lib/actions";
import { db } from "@/lib/db";
import { money, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function BudgetsPage() {
  const [plans, patients] = await Promise.all([
    db.treatmentPlan.findMany({
      include: { patient: true, items: { orderBy: { phase: "asc" } } },
      orderBy: { createdAt: "desc" },
    }),
    db.patient.findMany({
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    }),
  ]);
  const patientOptions = patients.map((patient) => ({
    id: patient.id,
    name: patient.firstName + " " + patient.lastName,
  }));

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Atención y venta clínica</div>
          <h1 className="title">Tratamientos y presupuestos</h1>
          <p className="subtitle">Planes por fases, aceptación y avance</p>
        </div>
        <a className="btn primary" href="#nuevo-presupuesto">
          + Nuevo presupuesto
        </a>
      </div>

      <div className="grid two budget-layout">
        <div className="grid">
          <div className="card">
            <div className="tablewrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Paciente / plan</th>
                    <th>Partidas</th>
                    <th>Estado</th>
                    <th>Total</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id}>
                      <td>
                        <b>
                          {plan.patient.firstName} {plan.patient.lastName}
                        </b>
                        <div className="small">{plan.title}</div>
                      </td>
                      <td>{plan.items.length}</td>
                      <td>
                        <form action={updatePlanStatus} className="row">
                          <input type="hidden" name="id" value={plan.id} />
                          <select
                            className="input"
                            name="status"
                            defaultValue={plan.status}
                          >
                            {[
                              "PROPUESTO",
                              "ACEPTADO",
                              "EN_CURSO",
                              "TERMINADO",
                            ].map((status) => (
                              <option value={status} key={status}>
                                {statusLabel[status]}
                              </option>
                            ))}
                          </select>
                          <button className="btn">✓</button>
                        </form>
                      </td>
                      <td>
                        <b>{money(plan.total)}</b>
                      </td>
                      <td>
                        <form action={deleteTreatmentPlan}>
                          <input type="hidden" name="id" value={plan.id} />
                          <button
                            className="btn danger"
                            aria-label={"Eliminar " + plan.title}
                          >
                            <Trash2 size={14} />
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {plans.map((plan) => (
            <details className="card" key={"edit-" + plan.id}>
              <summary className="row between details-summary">
                <span>
                  Editar <b>{plan.title}</b>
                </span>
                <span className="badge">{money(plan.total)}</span>
              </summary>
              <BudgetForm
                patients={patientOptions}
                plan={{
                  id: plan.id,
                  patientId: plan.patientId,
                  title: plan.title,
                  status: plan.status,
                  items: plan.items.map((item) => ({
                    description: item.description,
                    tooth: item.tooth ?? "",
                    phase: item.phase,
                    quantity: item.quantity,
                    unitPrice: item.unitPrice,
                  })),
                }}
              />
            </details>
          ))}

          <section className="card" id="nuevo-presupuesto">
            <h2>Nuevo presupuesto</h2>
            <BudgetForm patients={patientOptions} />
          </section>
        </div>

        <TreatmentPlanner patients={patientOptions} />
      </div>
    </>
  );
}
