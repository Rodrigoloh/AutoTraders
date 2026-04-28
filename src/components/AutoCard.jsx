import { Gauge, MapPin, MessageCircle, Sparkles } from 'lucide-react';
import { recordMetric } from '../lib/metrics';

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

export function AutoCard({ auto, loteId, whatsappNumber }) {
  const handleWhatsappClick = async () => {
    await recordMetric({
      autoId: auto.id,
      loteId,
      eventType: 'click_whatsapp',
    });

    const text = encodeURIComponent(
      `Hola, me interesa el ${auto.marca} ${auto.modelo} ${auto.anio}.`,
    );
    const phone = (whatsappNumber ?? '').replace(/\D/g, '');

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <article className="catalog-vehicle-card">
      <div className="catalog-vehicle-media">
        <img
          src={primaryImage(auto)}
          alt={`${auto.marca} ${auto.modelo} ${auto.anio}`}
          loading="lazy"
        />
      </div>
      <div className="catalog-vehicle-body">
        <div className="inline-row">
          <span className="status-pill" data-status={auto.estatus}>
            {auto.estatus}
          </span>
          <strong className="catalog-card-price">{formatPrice(auto.precio, auto.moneda)}</strong>
        </div>
        <div className="stack-sm">
          <p className="catalog-card-kicker">
            {auto.marca} · {auto.anio}
          </p>
          <h3 className="heading-md">
            {auto.modelo}
            {auto.version ? ` ${auto.version}` : ''}
          </h3>
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
          <button className="btn" onClick={handleWhatsappClick} type="button">
            <MessageCircle size={18} />
            Preguntar
          </button>
          <a className="btn-outline" href="#contacto">
            <Sparkles size={18} />
            Ver mas
          </a>
        </div>
      </div>
    </article>
  );
}
