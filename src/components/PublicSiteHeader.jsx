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
      <BrandLogo
        src={logoSrc}
        alt={`${brandName} logo`}
        brand={brandName}
        submark={brandSubmark}
        className="site-logo"
      />

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
