"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const chartColors = [
  "var(--chart-primary)",
  "var(--chart-neutral)",
  "var(--chart-neutral-strong)",
];

function statusColor(name: string) {
  const status = name.toLocaleLowerCase("es-MX");
  if (status.includes("confirm") || status.includes("atendid")) return "var(--success)";
  if (status.includes("no asist") || status.includes("cancel")) return "var(--danger)";
  if (status.includes("pend")) return "var(--warning)";
  return "var(--chart-primary)";
}

type ChartItem = {
  name: string;
  value: number;
};

export function ReportCharts({
  monthly,
  statuses,
  treatments,
}: {
  monthly: { name: string; total: number }[];
  statuses: ChartItem[];
  treatments: ChartItem[];
}) {
  const maximum = Math.max(1, ...treatments.map((item) => item.value));

  return (
    <div className="grid two">
      <div className="card">
        <h2>Ingresos por mes</h2>
        <div className="chart-container">
          <ResponsiveContainer>
            <BarChart data={monthly}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="var(--text-muted)" />
              <YAxis stroke="var(--text-muted)" />
              <Tooltip
                contentStyle={{
                  background: "var(--surface-raised)",
                  border: "1px solid var(--border)",
                  borderRadius: "6px",
                  color: "var(--text)",
                }}
                formatter={(value) =>
                  `$${Number(value).toLocaleString("es-MX")}`
                }
              />
              <Bar dataKey="total" fill="var(--chart-primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Citas por estado</h2>
        <div className="chart-container">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={statuses}
                dataKey="value"
                nameKey="name"
                innerRadius={55}
                outerRadius={90}
                paddingAngle={3}
              >
                {statuses.map((item) => (
                  <Cell
                    fill={statusColor(item.name)}
                    key={item.name}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="row chart-legend">
          {statuses.map((item) => (
            <span className="small" key={item.name}>
              <i
                className="legend-dot"
                style={{ background: statusColor(item.name) }}
              />
              {item.name}: {item.value}
            </span>
          ))}
        </div>
      </div>

      <div className="card span-all">
        <h2>Tratamientos más frecuentes</h2>
        {treatments.map((item, index) => (
          <div className="treatment-rank" key={item.name}>
            <div className="row between">
              <b>{item.name}</b>
              <span className="small">{item.value}</span>
            </div>
            <div className="progress">
              <i
                style={{
                  width: `${Math.max(8, (item.value / maximum) * 100)}%`,
                  background: chartColors[index % chartColors.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
