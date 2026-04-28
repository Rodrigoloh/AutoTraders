import { useEffect, useMemo, useState } from 'react';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Fuel,
  Gauge,
  MapPin,
  Settings2,
  ShieldCheck,
} from 'lucide-react';

function placeholderImage() {
  return 'https://images.unsplash.com/photo-1494976688153-cbe2305abf84?auto=format&fit=crop&w=1400&q=80';
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

export function CarDetail({ auto, onReserve }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const images = useMemo(() => {
    if (Array.isArray(auto?.imagenes) && auto.imagenes.length > 0) {
      return auto.imagenes;
    }

    return [placeholderImage(), placeholderImage(), placeholderImage()];
  }, [auto?.imagenes]);

  useEffect(() => {
    setCurrentIndex(0);
  }, [auto?.id]);

  const activeImage = images[currentIndex] ?? images[0];
  const location = [auto?.ciudad, auto?.estado].filter(Boolean).join(', ') || 'Monterrey, N.L.';

  const specs = [
    { icon: CalendarDays, label: 'Año', value: auto?.anio ?? 'N/D' },
    { icon: Gauge, label: 'Kilometraje', value: formatMileage(auto?.kilometraje) },
    { icon: Settings2, label: 'Transmisión', value: auto?.transmision || 'Automática' },
    { icon: Fuel, label: 'Combustible', value: auto?.combustible || 'Gasolina' },
  ];

  const sellingPoints = [
    'Consignación directa con respuesta rápida.',
    'Crédito inmediato con solo INE.',
    'Atención por WhatsApp y video del auto al momento.',
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
    <section className="detail-shell" id="detalle-auto">
      <div className="detail-header">
        <div className="stack-sm">
          <span className="catalog-eyebrow">Ficha del auto</span>
          <h2 className="heading-lg">
            {auto?.marca} {auto?.modelo} {auto?.anio}
          </h2>
          <p className="muted">
            {auto?.version ||
              'Unidad seleccionada para demo premium. Puedes reemplazar este texto por equipamiento, historial o procedencia.'}
          </p>
        </div>
        <div className="detail-price-box">
          <strong>{formatPrice(auto?.precio, auto?.moneda)}</strong>
          <span>{location}</span>
        </div>
      </div>

      <div className="detail-gallery-grid">
        <div className="detail-gallery-main">
          <img src={activeImage} alt={`${auto?.marca} ${auto?.modelo}`} />
          <button className="gallery-nav gallery-nav-left" onClick={() => moveGallery(-1)} type="button">
            <ChevronLeft size={18} />
          </button>
          <button className="gallery-nav gallery-nav-right" onClick={() => moveGallery(1)} type="button">
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="detail-gallery-thumbs">
          {images.map((image, index) => (
            <button
              className={`detail-thumb ${index === currentIndex ? 'detail-thumb-active' : ''}`}
              key={`${image}-${index}`}
              onClick={() => setCurrentIndex(index)}
              type="button"
            >
              <img src={image} alt={`${auto?.marca} vista ${index + 1}`} />
            </button>
          ))}
        </div>
      </div>

      <div className="detail-actions">
        <button className="btn" onClick={() => onReserve(auto)} type="button">
          Reservar Ahora!
        </button>
        <a className="btn-outline" href="#contacto">
          Solicitar llamada
        </a>
        <a className="btn-outline" href="#inventario">
          Volver al inventario
        </a>
      </div>

      <div className="detail-spec-grid">
        {specs.map(({ icon: Icon, label, value }) => (
          <article className="detail-spec-card" key={label}>
            <Icon size={18} />
            <span>{label}</span>
            <strong>{value}</strong>
          </article>
        ))}
      </div>

      <div className="detail-editorial-grid">
        <article className="editorial-card">
          <h3 className="heading-md">Venta directa en Monterrey</h3>
          <p className="muted">
            Unidades publicadas con atención rápida, seguimiento comercial y coordinación de
            citas en la zona metropolitana.
          </p>
        </article>
        <article className="editorial-card">
          <h3 className="heading-md">Mensajes cortos y claros</h3>
          <ul className="catalog-bullet-list">
            {sellingPoints.map((item) => (
              <li key={item}>
                <ShieldCheck size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </article>
        <article className="editorial-card">
          <h3 className="heading-md">Descripción</h3>
          <p className="muted">
            {auto?.descripcion ||
              'Agrega aquí una descripción breve: equipamiento, historial, documentación, estética o mensaje comercial enfocado al perfil del comprador.'}
          </p>
        </article>
        <article className="editorial-card">
          <h3 className="heading-md">Ubicación y entrega</h3>
          <p className="muted">
            <MapPin size={16} style={{ verticalAlign: 'text-bottom', marginRight: 6 }} />
            {location}. Entrega o revisión por cita en Monterrey y área metropolitana.
          </p>
        </article>
      </div>
    </section>
  );
}
