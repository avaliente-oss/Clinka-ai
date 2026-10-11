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

const colors = ["#005864", "#FE7D00", "#79A919", "#E3261B", "#5B8F99"];

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
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip
                formatter={(value) =>
                  `$${Number(value).toLocaleString("es-MX")}`
                }
              />
              <Bar dataKey="total" fill="#005864" radius={[7, 7, 0, 0]} />
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
                {statuses.map((item, index) => (
                  <Cell
                    fill={colors[index % colors.length]}
                    key={item.name}
                  />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="row chart-legend">
          {statuses.map((item, index) => (
            <span className="small" key={item.name}>
              <i
                className="legend-dot"
                style={{ background: colors[index % colors.length] }}
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
                  background: colors[index % colors.length],
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
