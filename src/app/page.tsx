import Link from "next/link";
import {
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { AIDisclaimer } from "@/components/ai-disclaimer";
import { businessInsights } from "@/lib/ai/insights";
import { db } from "@/lib/db";
import { dateMx, money, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  const [appointments, payments, noShows, pendingBalance] = await Promise.all([
    db.appointment.findMany({
      where: { start: { gte: today, lt: tomorrow } },
      include: { patient: true, professional: true },
      orderBy: { start: "asc" },
    }),
    db.payment.aggregate({
      where: { date: { gte: today, lt: tomorrow } },
      _sum: { amount: true },
    }),
    db.appointment.count({
      where: { status: "NO_ASISTIO", start: { gte: monthStart } },
    }),
    db.treatmentPlan.aggregate({
      where: { status: { in: ["ACEPTADO", "EN_CURSO"] } },
      _sum: { total: true },
    }),
  ]);

  const confirmed = appointments.filter(
    (appointment) => appointment.status === "CONFIRMADA",
  ).length;
  const insights = await businessInsights(
    JSON.stringify({
      todayAppointments: appointments.length,
      confirmed,
      todayIncome: payments._sum.amount ?? 0,
      monthNoShows: noShows,
      activeTreatmentValue: pendingBalance._sum.total ?? 0,
    }),
  );

  return (
    <>
      <div className="pagehead">
        <div>
          <div className="eyebrow">
            {dateMx(new Date(), {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </div>
          <h1 className="title">Buenos días, Ana</h1>
          <p className="subtitle">
            Tu clínica está lista. Esto es lo más importante de hoy.
          </p>
        </div>
        <Link className="btn primary" href="/agenda">
          + Nueva cita
        </Link>
      </div>

      <section className="grid kpis">
        <Kpi
          icon={<CalendarCheck />}
          label="Citas de hoy"
          value={String(appointments.length)}
          note="Agenda del día"
        />
        <Kpi
          icon={<CheckCircle2 />}
          label="Confirmadas"
          value={String(confirmed)}
          note={`${appointments.length
            ? Math.round((confirmed / appointments.length) * 100)
            : 0}% de la agenda`}
        />
        <Kpi
          icon={<CircleDollarSign />}
          label="Ingresos hoy"
          value={money(payments._sum.amount || 0)}
          note="Pagos registrados"
        />
        <Kpi
          icon={<TriangleAlert />}
          label="No-shows del mes"
          value={String(noShows)}
          note="Requieren seguimiento"
        />
      </section>

      <section className="grid two section-gap">
        <div className="card">
          <div className="row between">
            <h2>Agenda de hoy</h2>
            <Link href="/agenda" className="small">
              Ver agenda →
            </Link>
          </div>
          <div className="list">
            {appointments.length ? (
              appointments.map((appointment) => (
                <div className="listitem" key={appointment.id}>
                  <div className="row">
                    <b>
                      {dateMx(appointment.start, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </b>
                    <span className="avatar">
                      {appointment.patient.firstName[0]}
                      {appointment.patient.lastName[0]}
                    </span>
                    <div>
                      <b>
                        {appointment.patient.firstName} {appointment.patient.lastName}
                      </b>
                      <div className="small">
                        {appointment.reason} · {appointment.professional.name}
                      </div>
                    </div>
                  </div>
                  <span className={`badge ${appointment.status}`}>
                    {statusLabel[appointment.status]}
                  </span>
                </div>
              ))
            ) : (
              <p className="small">
                Sin citas para hoy. Consulta la agenda de los próximos días.
              </p>
            )}
          </div>
        </div>

        <div className="card ai">
          <div className="row">
            <span className="iconbox">
              <Sparkles />
            </span>
            <div>
              <div className="eyebrow">Insights IA</div>
              <h2>Pulso de la semana</h2>
            </div>
          </div>
          <p className="insight-summary">{insights.summary}</p>
          <ol className="insight-list">
            {insights.recommendations.map((recommendation) => (
              <li key={recommendation}>{recommendation}</li>
            ))}
          </ol>
          <AIDisclaimer />
        </div>
      </section>
    </>
  );
}

function Kpi({
  icon,
  label,
  value,
  note,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
}) {
  return (
    <div className="card kpi">
      <div className="row between">
        <span className="small">{label}</span>
        <span className="iconbox">{icon}</span>
      </div>
      <div className="value">{value}</div>
      <div className="delta">{note}</div>
    </div>
  );
}
