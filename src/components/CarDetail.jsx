import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  CarFront,
  ChevronLeft,
  ChevronRight,
  Cog,
  Fuel,
  Gauge,
  GitBranch,
  Settings2,
  Users,
} from 'lucide-react';

function placeholderImage() {
  return 'https://images.unsplash.com/photo-1494976688153-cbe2305abf84?auto=format&fit=crop&w=1600&q=80';
}

function formatPrice(price, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));
}

function formatMileage(kilometraje) {
  if (!kilometraje) {
    return 'Por confirmar';
  }

  return `${Number(kilometraje).toLocaleString('es-MX')} km`;
}

function specValue(auto, key, fallback) {
  return auto?.meta_tags?.[key] || fallback;
}

export function CarDetail({ auto, onBack, onContact, onReserve, onTestDrive }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = useMemo(() => {
    if (Array.isArray(auto?.imagenes) && auto.imagenes.length > 0) {
      return auto.imagenes.slice(0, 8);
    }

    return [placeholderImage(), placeholderImage(), placeholderImage()];
  }, [auto?.imagenes]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [auto?.id]);

  const activeImage = images[currentIndex] ?? images[0];
  const specs = [
    { icon: CalendarDays, label: 'Año', value: auto?.anio ?? 'N/D' },
    { icon: Gauge, label: 'KM', value: formatMileage(auto?.kilometraje) },
    { icon: CarFront, label: 'Carrocería', value: specValue(auto, 'body_shape', 'Sedán') },
    { icon: Settings2, label: 'Transmisión', value: auto?.transmision || 'Automática' },
    { icon: Cog, label: 'Motor', value: specValue(auto, 'motor', 'Turbo') },
    { icon: GitBranch, label: 'Tracción', value: specValue(auto, 'traccion', 'Delantera') },
    { icon: Users, label: 'Asientos', value: specValue(auto, 'asientos', '5') },
    { icon: Fuel, label: 'Combustible', value: auto?.combustible || 'Gasolina' },
  ];

  const moveGallery = (direction) => {
    setCurrentIndex((current) => {
      const next = current + direction;

      if (next < 0) {
        return images.length - 1;
      }

      if (next >= images.length) {
        return 0;
      }

      return next;
    });
  };

  return (
    <section className="detail-microsite" id="detalle-auto">
      <div className="section-head edge-pad">
        <h2>
          {auto?.marca} {auto?.modelo}
          {auto?.version ? ` · ${auto.version}` : ''}
        </h2>
        <p>{formatPrice(auto?.precio, auto?.moneda)}</p>
      </div>

      <div className="detail-hero-grid edge-pad">
        <div className="detail-carousel">
          <div className="detail-stage">
            <img alt={`${auto?.marca} ${auto?.modelo}`} src={activeImage} />
            <button
              aria-label="Imagen anterior"
              className="carousel-nav carousel-nav-left"
              onClick={() => moveGallery(-1)}
              type="button"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              aria-label="Imagen siguiente"
              className="carousel-nav carousel-nav-right"
              onClick={() => moveGallery(1)}
              type="button"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          <div className="detail-thumb-track">
            {images.map((image, index) => (
              <button
                className={`detail-thumb-button ${index === currentIndex ? 'detail-thumb-active' : ''}`}
                key={`${image}-${index}`}
                onClick={() => setCurrentIndex(index)}
                type="button"
              >
                <img alt={`${auto?.marca} imagen ${index + 1}`} src={image} />
              </button>
            ))}
          </div>
        </div>

        <div className="detail-summary">
          <div className="detail-summary-copy">
            <h3>{auto?.marca} {auto?.modelo} {auto?.anio}</h3>
            <p>
              {auto?.descripcion ||
                'Unidad lista para entrega, consignación directa y atención inmediata en Monterrey.'}
            </p>
          </div>

          <div className="detail-action-row">
            <button className="edge-button" onClick={() => onReserve(auto)} type="button">
              Reserva ahora
            </button>
            <button className="edge-button" onClick={() => onTestDrive(auto)} type="button">
              Agenda una prueba
            </button>
            <button className="edge-button edge-button-ghost" onClick={() => onContact(auto)} type="button">
              Contacto
            </button>
          </div>
        </div>
      </div>

      <div className="detail-spec-strip edge-pad">
        {specs.map(({ icon: Icon, label, value }) => (
          <article className="detail-spec-item" key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="detail-description edge-pad">
        <div className="detail-description-grid">
          <div>
            <p className="detail-description-copy">
              {auto?.descripcion ||
                'Bloque de texto preparado para una descripción más extensa del vehículo: procedencia, equipamiento, historial, detalles de manejo y puntos de valor para compradores en Monterrey.'}
            </p>
          </div>
          <div>
            <span className="section-kicker">Mensajes de venta</span>
            <ul className="detail-selling-list">
              <li>Consignación directa.</li>
              <li>Crédito inmediato con solo INE.</li>
              <li>Agenda visita o video por WhatsApp.</li>
            </ul>
          </div>
        </div>
        <button className="edge-button edge-button-ghost detail-back-button" onClick={onBack} type="button">
          Volver
        </button>
      </div>
    </section>
  );
}
