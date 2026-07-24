import { Link } from 'react-router-dom';
import { BrandLogo } from './BrandLogo.jsx';

export function PublicSiteHeader({
  homeHref,
  inventoryHref,
  sellHref,
  logoSrc,
  brandName,
  brandSubmark,
  mode = 'home',
}) {
  return (
    <header className={`immersive-header ${mode === 'secondary' ? 'immersive-header-secondary' : ''}`}>
      <Link aria-label={`Ir al inicio de ${brandName}`} className="site-logo-link" to={homeHref}>
        <BrandLogo
          src={logoSrc}
          alt={`${brandName} logo`}
          brand={brandName}
          submark={brandSubmark}
          className="site-logo"
        />
      </Link>

      {mode === 'secondary' ? (
        <nav className="header-nav" aria-label="Navegacion secundaria">
          <Link to={homeHref}>Home</Link>
          <Link to={inventoryHref}>Busca un auto</Link>
          <Link to={sellHref}>Vende tu auto</Link>
        </nav>
      ) : null}
    </header>
  );
}
