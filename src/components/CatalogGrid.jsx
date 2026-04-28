import { AutoCard } from './AutoCard';

export function CatalogGrid({ autos, onReserve, onSelect }) {
  if (!autos.length) {
    return (
      <div className="empty-state">
        No hay autos publicados con esos filtros. Ajusta la busqueda o carga nuevas
        unidades desde el panel admin.
      </div>
    );
  }

  return (
    <section className="catalog-grid">
      {autos.map((auto) => (
        <AutoCard
          key={auto.id}
          auto={auto}
          onReserve={onReserve}
          onSelect={onSelect}
        />
      ))}
    </section>
  );
}
