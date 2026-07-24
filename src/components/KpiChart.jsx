import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

export function KpiChart({ data, title, subtitle, variant = 'bar' }) {
  return (
    <div className="panel-card chart-shell">
      <div className="stack-sm" style={{ padding: '0 8px 12px' }}>
        <h2 className="heading-md">{title}</h2>
        <span className="muted">{subtitle}</span>
        {variant === 'line' ? (
          <div className="chart-legend" aria-label="Series de la gráfica">
            <span><i data-series="views" />Vistas</span>
            <span><i data-series="whatsapp" />WhatsApp</span>
          </div>
        ) : null}
      </div>
      <div style={{ width: '100%', height: 280 }}>
        <ResponsiveContainer>
          {variant === 'line' ? (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="label" minTickGap={34} stroke="var(--brand-muted)" tickLine={false} />
              <YAxis stroke="var(--brand-muted)" tickLine={false} width={34} />
              <Tooltip contentStyle={{ background: '#090909', border: '1px solid rgba(255,255,255,.16)' }} />
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
          ) : (
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
              <XAxis dataKey="label" minTickGap={20} stroke="var(--brand-muted)" tickLine={false} />
              <YAxis stroke="var(--brand-muted)" tickLine={false} width={34} />
              <Tooltip contentStyle={{ background: '#090909', border: '1px solid rgba(255,255,255,.16)' }} />
              <Bar
                dataKey="autos"
                fill="var(--brand-primary)"
                radius={[0, 0, 0, 0]}
                stroke="var(--brand-secondary)"
                strokeWidth={1.5}
              />
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
