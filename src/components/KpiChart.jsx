import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function KpiChart({ data }) {
  return (
    <div className="panel-card chart-shell">
      <div className="stack-sm" style={{ padding: '0 8px 12px' }}>
        <h2 className="heading-md">Tiempo de inventario</h2>
        <span className="muted">
          Unidades disponibles que llevan al menos 1, 2, 4 y 8 semanas dentro del lote.
        </span>
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(27, 31, 59, 0.12)" />
            <XAxis dataKey="label" stroke="var(--brand-muted)" />
            <YAxis stroke="var(--brand-muted)" />
            <Tooltip />
            <Bar
              dataKey="autos"
              fill="var(--brand-primary)"
              radius={[0, 0, 0, 0]}
              stroke="var(--brand-secondary)"
              strokeWidth={1.5}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
