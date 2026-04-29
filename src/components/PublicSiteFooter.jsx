import { Clock3, Facebook, Instagram, MapPin, PhoneCall } from 'lucide-react';
import { BrandLogo } from './BrandLogo.jsx';

function mapQuery(address) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

export function PublicSiteFooter({
  address,
  brandName,
  brandSubmark,
  footerLogo,
  hours,
  legal,
  phone,
  blurb,
}) {
  return (
    <>
      <footer className="site-footer" id="contacto">
        <div className="footer-grid">
          <div className="footer-block">
            <BrandLogo
              src={footerLogo}
              alt={`${brandName} logo footer`}
              brand={brandName}
              submark={brandSubmark}
              className="footer-logo"
            />
            <p>{blurb}</p>
          </div>

          <div className="footer-block">
            <div className="footer-contact-list">
              <div>
                <PhoneCall size={18} />
                <span>{phone}</span>
              </div>
              <div>
                <MapPin size={18} />
                <span>{address}</span>
              </div>
              <div>
                <Clock3 size={18} />
                <span>{hours}</span>
              </div>
            </div>
            <div className="footer-socials">
              <a href="#contacto" aria-label="Facebook">
                <Facebook size={18} />
              </a>
              <a href="#contacto" aria-label="Instagram">
                <Instagram size={18} />
              </a>
            </div>
          </div>

          <div className="footer-block footer-map-block">
            <iframe
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              src={mapQuery(address)}
              title="Ubicación del lote en Monterrey"
            />
          </div>
        </div>
      </footer>

      <div className="copyright-strip">
        <span>{legal}</span>
        <a href="https://cobalto.blue" rel="noreferrer" target="_blank">
          Powered by cobalto.blue software
        </a>
      </div>
    </>
  );
}
