import Link from "next/link";
import { cookies } from "next/headers";
import {
  CalendarCheck,
  CheckCircle2,
  CircleDollarSign,
  PackageSearch,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { InsightsBody } from "@/components/insights-body";
import { db } from "@/lib/db";
import { proceduresTotal, serializeMoney } from "@/lib/money";
import { dateMx, money, statusLabel } from "@/lib/utils";
import { AppointmentStatus, ProcedureStatus, TreatmentStatus } from "@prisma/client";
import { parseDemoView } from "@/lib/demo-view";
import { activeWhere } from "@/lib/soft-delete";
import { formatQuantity } from "@/lib/quantity";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const demoView = parseDemoView((await cookies()).get("clinika_view")?.value);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - 6);

  const [appointments, payments, noShows, realizedProcedures, weeklyEvolutions, activeTreatments, supplies] = await Promise.all([
    db.appointment.findMany({
      where: { start: { gte: today, lt: tomorrow }, patient: { deletedAt: null } },
      include: { patient: true, professional: true },
      orderBy: { start: "asc" },
    }),
    db.payment.aggregate({
      where: { date: { gte: today, lt: tomorrow }, patient: { deletedAt: null } },
      _sum: { amount: true },
    }),
    db.appointment.count({
      where: { status: AppointmentStatus.NO_ASISTIO, start: { gte: monthStart } },
    }),
    db.procedure.findMany({ where: { status: ProcedureStatus.REALIZADA, treatment: { deletedAt: null, patient: { deletedAt: null } } }, select: { price: true, quantity: true, discount: true } }),
    db.evolution.count({ where: { date: { gte: weekStart }, deletedAt: null, treatment: { deletedAt: null } } }),
    db.treatment.findMany({
      where: { status: TreatmentStatus.EN_CURSO, deletedAt: null, patient: { deletedAt: null } },
      include: {
        patient: true,
        responsibleProfessional: true,
        evolutions: { where: { deletedAt: null }, orderBy: [{ date: "desc" }, { createdAt: "desc" }], take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    db.supply.findMany({
      where: activeWhere({ active: true }),
      orderBy: { name: "asc" },
    }),
  ]);
  const realizedValue = proceduresTotal(realizedProcedures);
  const lowSupplies = supplies
    .filter((supply) => supply.stock.lt(supply.minStock))
    .sort((left, right) => left.stock.minus(left.minStock).comparedTo(right.stock.minus(right.minStock)))
    .slice(0, 5);

  const confirmed = appointments.filter(
    (appointment) => appointment.status === AppointmentStatus.CONFIRMADA,
  ).length;
  const insightsContext = JSON.stringify({
      todayAppointments: appointments.length,
      confirmed,
      monthNoShows: noShows,
      ...(demoView !== "clinica" ? {
        todayIncome: serializeMoney(payments._sum.amount ?? 0),
        realizedTreatmentValue: serializeMoney(realizedValue),
      } : {}),
      ...(demoView !== "administracion" ? { weeklyEvolutions } : {}),
    });

  return (
    <div className="page-stack">
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

      <section className="grid-kpi">
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
        {demoView !== "clinica" ? <Kpi
          icon={<CircleDollarSign />}
          label="Ingresos hoy"
          value={money(payments._sum.amount || 0)}
          note="Pagos registrados"
        /> : <Kpi
          icon={<Sparkles />}
          label="Evoluciones esta semana"
          value={String(weeklyEvolutions)}
          note="Seguimiento clínico"
        />}
        <Kpi
          icon={<TriangleAlert />}
          label="No-shows del mes"
          value={String(noShows)}
          note="Requieren seguimiento"
        />
      </section>

      <section className="grid-2">
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
          <InsightsBody context={insightsContext} />
        </div>
      </section>

      {demoView !== "clinica" && (
        <section className="card dashboard-inventory">
          <div className="row between">
            <div className="row"><span className="iconbox"><PackageSearch /></span><div><h2>Insumos bajo mínimo</h2><p className="small">Requieren compra o ajuste de existencia.</p></div></div>
            <Link className="small" href="/inventario?low=1">Ver inventario →</Link>
          </div>
          {lowSupplies.length ? <div className="dashboard-inventory-list">{lowSupplies.map((supply) => <Link href={`/inventario?supply=${supply.id}#kardex`} key={supply.id}><span><b>{supply.name}</b><span className="small block">Mínimo {formatQuantity(supply.minStock)} {supply.unit}</span></span><span className={`badge inventory-status ${supply.stock.isNegative() ? "danger" : "warning"}`}>{supply.stock.isNegative() ? "Existencia negativa" : "Bajo mínimo"} · {formatQuantity(supply.stock)} {supply.unit}</span></Link>)}</div> : <p className="small">Todos los insumos activos están en nivel adecuado.</p>}
        </section>
      )}

      {demoView !== "administracion" && activeTreatments.length > 0 && (
        <section className="card">
          <div className="row between">
            <div>
              <h2>Tratamientos en curso</h2>
              <p className="small">Seguimientos clínicos actualizados recientemente</p>
            </div>
            <Link href="/tratamientos" className="small">Ver todos →</Link>
          </div>
          <div className="grid dashboard-treatments">
            {activeTreatments.map((treatment) => {
              const progress = treatment.evolutions[0]?.cumulativeProgress ?? 0;
              return (
                <Link className="dashboard-treatment" href={`/pacientes/${treatment.patientId}#tratamiento-${treatment.id}`} key={treatment.id}>
                  <div className="row between">
                    <b>{treatment.title}</b>
                    <span className="small">{progress}%</span>
                  </div>
                  <div className="progress"><span style={{ width: `${progress}%` }} /></div>
                  <span className="small">{treatment.patient.firstName} {treatment.patient.lastName} · {treatment.responsibleProfessional.name}</span>
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
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
