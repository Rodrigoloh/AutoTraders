import { AutoCard } from './AutoCard';

export function CatalogGrid({ autos, loteId, whatsappNumber }) {
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
          loteId={loteId}
          whatsappNumber={whatsappNumber}
        />
      ))}
    </section>
  );
}
