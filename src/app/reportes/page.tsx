import { AIDisclaimer } from "@/components/ai-disclaimer";
import { ReportCharts } from "@/components/report-charts";
import { businessInsights } from "@/lib/ai/insights";
import { db } from "@/lib/db";
import { sumMoney } from "@/lib/money";
import { statusLabel } from "@/lib/utils";
import { ProcedureStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const start = new Date();
  start.setMonth(start.getMonth() - 5, 1);
  start.setHours(0, 0, 0, 0);

  const [payments, appointments, procedures] = await Promise.all([
    db.payment.findMany({ where: { date: { gte: start }, patient: { deletedAt: null } } }),
    db.appointment.groupBy({ by: ["status"], _count: true }),
    db.procedure.groupBy({
      by: ["name"],
      where: { status: ProcedureStatus.REALIZADA, treatment: { deletedAt: null, patient: { deletedAt: null } } },
      _count: true,
      orderBy: { _count: { name: "desc" } },
      take: 5,
    }),
  ]);

  const formatter = new Intl.DateTimeFormat("es-MX", { month: "short" });
  const monthly = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start);
    date.setMonth(start.getMonth() + index);
    const total = sumMoney(payments.filter(
        (payment) =>
          payment.date.getFullYear() === date.getFullYear() &&
          payment.date.getMonth() === date.getMonth(),
      ), (payment) => payment.amount).toNumber();
    return { name: formatter.format(date), total };
  });
  const statuses = appointments.map((item) => ({
    name: statusLabel[item.status] || item.status,
    value: item._count,
  }));
  const treatments = procedures.map((item) => ({
    name: item.name,
    value: item._count,
  }));
  const insights = await businessInsights(
    JSON.stringify({ monthly, statuses, treatments }),
  );

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">Inteligencia del negocio</div>
          <h1 className="title">Reportes</h1>
          <p className="subtitle">Desempeño clínico y financiero</p>
        </div>
        <span className="badge report-period">Últimos 6 meses</span>
      </div>

      <div className="card ai report-insight">
        <h3>Resumen ejecutivo IA</h3>
        <p>{insights.summary}</p>
        <div className="row recommendation-list">
          {insights.recommendations.map((recommendation, index) => (
            <span className="badge" key={recommendation}>
              {index + 1}. {recommendation}
            </span>
          ))}
        </div>
        <AIDisclaimer />
      </div>

      <ReportCharts
        monthly={monthly}
        statuses={statuses}
        treatments={treatments}
      />
    </>
  );
}
