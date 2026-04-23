import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function KpiChart({ data }) {
  return (
    <div className="panel-card chart-shell">
      <div className="stack-sm" style={{ padding: '0 8px 12px' }}>
        <h2 className="heading-md">Actividad últimos 7 días</h2>
        <span className="muted">Comparativo entre vistas de detalle e interesados por WhatsApp.</span>
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(27, 31, 59, 0.12)" />
            <XAxis dataKey="label" stroke="var(--brand-muted)" />
            <YAxis stroke="var(--brand-muted)" />
            <Tooltip />
            <Line
              type="monotone"
              dataKey="visitas"
              stroke="var(--brand-secondary)"
              strokeWidth={3}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="whatsapp"
              stroke="var(--brand-primary)"
              strokeWidth={3}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
