import { CarFront, Eye, MessageCircleMore, Percent } from 'lucide-react';

const icons = {
  inventory: CarFront,
  views: Eye,
  whatsapp: MessageCircleMore,
  conversion: Percent,
};

export function KpiSummary({ title, value, type, helpText }) {
  const Icon = icons[type] ?? Eye;

  return (
    <article
      aria-label={`${title}: ${value}. ${helpText}`}
      className="metric-card"
      tabIndex={0}
    >
      <div className="metric-topline">
        <span className="metric-icon-shell">
          <Icon size={17} />
        </span>
        <span className="metric-label">{title}</span>
      </div>
      <strong className="metric-value">{value}</strong>
      <span className="metric-help" role="tooltip">{helpText}</span>
    </article>
  );
}
