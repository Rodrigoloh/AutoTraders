import { ArrowRight, Gauge, MapPin } from 'lucide-react';

function formatPrice(price, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));
}

function primaryImage(auto) {
  if (Array.isArray(auto.imagenes) && auto.imagenes.length > 0) {
    return auto.imagenes[0];
  }

  return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80';
}

export function AutoCard({ auto, onReserve, onSelect }) {
  return (
    <article className="catalog-vehicle-card">
      <button className="catalog-vehicle-media catalog-vehicle-hitbox" onClick={() => onSelect(auto)} type="button">
        <img
          src={primaryImage(auto)}
          alt={`${auto.marca} ${auto.modelo} ${auto.anio}`}
          loading="lazy"
        />
      </button>
      <div className="catalog-vehicle-body">
        <div className="inline-row">
          <span className="catalog-card-kicker">{auto.marca}</span>
          <strong className="catalog-card-price">{formatPrice(auto.precio, auto.moneda)}</strong>
        </div>
        <div className="stack-sm">
          <button className="catalog-title-button" onClick={() => onSelect(auto)} type="button">
            <h3 className="heading-md">
              {auto.modelo} {auto.anio}
            </h3>
          </button>
          <p className="muted">
            {auto.version || 'Seminuevo disponible para entrega inmediata.'}
          </p>
        </div>
        <div className="catalog-card-specs">
          <span>
            <Gauge size={15} />
            {auto.kilometraje
              ? `${auto.kilometraje.toLocaleString('es-MX')} km`
              : 'Kilometraje por confirmar'}
          </span>
          <span>
            <MapPin size={15} />
            {[auto.ciudad, auto.estado].filter(Boolean).join(', ') || 'Monterrey'}
          </span>
        </div>
        <div className="catalog-card-actions">
          <button className="btn" onClick={() => onReserve(auto)} type="button">
            Reservar Ahora!
          </button>
          <button className="btn-outline" onClick={() => onSelect(auto)} type="button">
            Ver ficha
            <ArrowRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
