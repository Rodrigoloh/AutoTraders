import {
  Clock3,
  Facebook,
  Instagram,
  Mail,
  MapPin,
  MessageCircle,
  PhoneCall,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo.jsx';

function mapQuery(address) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

function phoneHref(phone) {
  return `tel:${String(phone ?? '').replace(/[^\d+]/g, '')}`;
}

function whatsappHref(whatsapp) {
  return `https://wa.me/${String(whatsapp ?? '').replace(/\D/g, '')}`;
}

export function PublicSiteFooter({
  address,
  brandName,
  brandSubmark,
  footerLogo,
  hours,
  legal,
  phone,
  whatsapp = phone,
  email = 'contacto@autosdelnorte.mx',
  blurb,
  slug,
  variant = 'full',
}) {
  const isCompact = variant === 'compact';

  return (
    <>
      <footer className={`site-footer site-footer-${variant}`} id="contacto">
        <div className="footer-main-grid">
          <div className="footer-intro">
            <span className="section-kicker">Atención personalizada</span>
            <h2>Compra o vende tu auto con acompañamiento de principio a fin.</h2>
            <p>{blurb}</p>
          </div>

          <nav className="footer-nav" aria-label="Navegación del footer">
            <strong>Explora</strong>
            <Link to={`/${slug}`}>Inicio</Link>
            <Link to={`/${slug}/inventario`}>Inventario</Link>
            <Link to={`/${slug}/vende-tu-auto`}>Vende tu auto</Link>
            <Link to={`/${slug}/admin/login`}>Acceso administrativo</Link>
          </nav>

          <div className="footer-contact-list">
            <strong>Contacto</strong>
            <a href={phoneHref(phone)}>
              <PhoneCall size={18} />
              <span>{phone}</span>
            </a>
            <a href={whatsappHref(whatsapp)} rel="noreferrer" target="_blank">
              <MessageCircle size={18} />
              <span>WhatsApp</span>
            </a>
            <a href={`mailto:${email}`}>
              <Mail size={18} />
              <span>{email}</span>
            </a>
            <div>
              <Clock3 size={18} />
              <span>{hours}</span>
            </div>
          </div>
        </div>

        {!isCompact ? (
          <div className="footer-map-wide">
            <div className="footer-map-copy">
              <MapPin size={20} />
              <div>
                <strong>Visítanos</strong>
                <span>{address}</span>
              </div>
            </div>
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapQuery(address)}
              title="Ubicación del lote en Monterrey"
            />
          </div>
        ) : (
          <div className="footer-compact-address">
            <MapPin size={18} />
            <span>{address}</span>
          </div>
        )}

        <div className="footer-brand-row">
          <Link aria-label={`Ir al inicio de ${brandName}`} to={`/${slug}`}>
            <BrandLogo
              src={footerLogo}
              alt={`${brandName} logo footer`}
              brand={brandName}
              submark={brandSubmark}
              className="footer-logo"
            />
          </Link>
          <div className="footer-socials">
            <a href="https://www.facebook.com" aria-label="Facebook" rel="noreferrer" target="_blank">
              <Facebook size={18} />
            </a>
            <a href="https://www.instagram.com" aria-label="Instagram" rel="noreferrer" target="_blank">
              <Instagram size={18} />
            </a>
            <a href={whatsappHref(whatsapp)} aria-label="WhatsApp" rel="noreferrer" target="_blank">
              <MessageCircle size={18} />
            </a>
          </div>
        </div>
      </footer>

      <div className="copyright-strip">
        <span>{legal}</span>
        <nav aria-label="Información legal">
          <Link to={`/${slug}/aviso-de-privacidad`}>Aviso de privacidad</Link>
          <Link to={`/${slug}/terminos`}>Términos de uso</Link>
          <Link to={`/${slug}/cookies`}>Cookies</Link>
        </nav>
        <a
          className="cobalto-link"
          href="https://www.cobalto.blue"
          rel="noreferrer"
          target="_blank"
        >
          Tecnología por cobalto.blue
        </a>
      </div>
    </>
  );
}
