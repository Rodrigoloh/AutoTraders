import { AutoCard } from './AutoCard';

export function CatalogGrid({
  autos,
  emptyMessage,
  onSelect,
  variant = 'featured',
}) {
  if (!autos.length) {
    return <div className="empty-state edge-pad">{emptyMessage}</div>;
  }

  return (
    <section className={`vehicle-grid vehicle-grid-${variant}`}>
      {autos.map((auto) => (
        <AutoCard
          key={auto.id}
          auto={auto}
          onSelect={onSelect}
          variant={variant}
        />
      ))}
    </section>
  );
}
