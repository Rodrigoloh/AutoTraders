import { CalendarDays, Fuel, Gauge, Settings2 } from 'lucide-react';

function formatPrice(price, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));
}

function primaryImage(auto) {
  if (Array.isArray(auto?.imagenes) && auto.imagenes.length > 0) {
    return auto.imagenes[0];
  }

  return 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=900&q=80';
}

function shortMileage(value) {
  if (!value) {
    return 'Por confirmar';
  }

  return `${Number(value).toLocaleString('es-MX')} km`;
}

export function AutoCard({ auto, onSelect, variant = 'featured' }) {
  const title =
    variant === 'inventory'
      ? `${auto.marca} ${auto.modelo}${auto.version ? ` · ${auto.version}` : ''}`
      : auto.modelo;

  const specs = [
    { icon: CalendarDays, label: 'Año', value: auto.anio ?? 'N/D' },
    { icon: Gauge, label: 'KM', value: shortMileage(auto.kilometraje) },
    { icon: Fuel, label: 'Combustible', value: auto.combustible || 'Gasolina' },
    { icon: Settings2, label: 'Transmisión', value: auto.transmision || 'Automática' },
  ];

  return (
    <article className={`vehicle-card vehicle-card-${variant}`}>
      <button className="vehicle-media" onClick={() => onSelect(auto)} type="button">
        <img
          alt={`${auto.marca} ${auto.modelo} ${auto.anio}`}
          loading="lazy"
          src={primaryImage(auto)}
        />
      </button>

      <div className="vehicle-content">
        <div className="vehicle-headline">
          <span className="vehicle-brand">{auto.marca}</span>
          <strong className="vehicle-price">{formatPrice(auto.precio, auto.moneda)}</strong>
        </div>

        <button className="vehicle-title-button" onClick={() => onSelect(auto)} type="button">
          <h3 className="vehicle-model">{title}</h3>
        </button>

        <div className="vehicle-spec-grid">
          {specs.map(({ icon: Icon, label, value }) => (
            <div className="vehicle-spec" key={label}>
              <span>
                <Icon size={14} />
                {label}
              </span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <button className="edge-button edge-button-block" onClick={() => onSelect(auto)} type="button">
          Ver Vehículo
        </button>
      </div>
    </article>
  );
}
