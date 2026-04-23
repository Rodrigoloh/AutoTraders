import { MessageCircle, Gauge, MapPin } from 'lucide-react';
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
    <article className="vehicle-card">
      <div className="vehicle-media">
        <img
          src={primaryImage(auto)}
          alt={`${auto.marca} ${auto.modelo} ${auto.anio}`}
          loading="lazy"
        />
      </div>
      <div className="vehicle-body">
        <div className="inline-row">
          <span className="status-pill" data-status={auto.estatus}>
            {auto.estatus}
          </span>
          <span className="muted">{auto.anio}</span>
        </div>
        <div>
          <h3 className="heading-md">
            {auto.marca} {auto.modelo}
          </h3>
          <p className="muted">{auto.version || 'Disponible ahora'}</p>
        </div>
        <div className="stack-sm">
          <div className="inline-row muted">
            <span className="inline-row">
              <Gauge size={16} />
              {auto.kilometraje ? `${auto.kilometraje.toLocaleString('es-MX')} km` : 'Kilometraje por confirmar'}
            </span>
            <span className="inline-row">
              <MapPin size={16} />
              {[auto.ciudad, auto.estado].filter(Boolean).join(', ') || 'México'}
            </span>
          </div>
          <div className="price-row">
            <span className="price-tag">{formatPrice(auto.precio, auto.moneda)}</span>
          </div>
        </div>
        <button className="btn-whatsapp" onClick={handleWhatsappClick} type="button">
          <MessageCircle size={18} />
          Preguntar por WhatsApp
        </button>
      </div>
    </article>
  );
}
