import { Eye, MessageCircleMore, Percent } from 'lucide-react';

const icons = {
  views: Eye,
  whatsapp: MessageCircleMore,
  conversion: Percent,
};

export function KpiSummary({ title, value, type, helpText }) {
  const Icon = icons[type] ?? Eye;

  return (
    <article className="metric-card">
      <div className="inline-row">
        <span className="tenant-badge">
          <Icon size={18} />
          {title}
        </span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="muted">{helpText}</span>
    </article>
  );
}
