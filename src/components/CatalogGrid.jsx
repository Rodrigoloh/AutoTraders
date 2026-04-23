import { AutoCard } from './AutoCard';

export function CatalogGrid({ autos, loteId, whatsappNumber }) {
  if (!autos.length) {
    return (
      <div className="empty-state">
        No hay autos publicados en este momento. El inventario aparecerá aquí cuando el
        lote suba sus anuncios.
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
