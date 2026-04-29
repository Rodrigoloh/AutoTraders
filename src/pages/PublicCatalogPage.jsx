import { useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { Link, useNavigate } from 'react-router-dom';
import { CatalogGrid } from '../components/CatalogGrid';
import { PublicSiteFooter } from '../components/PublicSiteFooter.jsx';
import { PublicSiteHeader } from '../components/PublicSiteHeader.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { usePublicInventory } from '../lib/publicCatalogUtils.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

export function PublicCatalogPage() {
  const { tenant, theme, isLoading, slug } = useTenantTheme();
  const navigate = useNavigate();
  const { autos, loadingAutos } = usePublicInventory(tenant?.id);

  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const brandSubmark = demoCatalogContent.brand.submark;
  const logoSrc = demoCatalogContent.logos.header;
  const footerLogo = demoCatalogContent.logos.footer;
  const featuredAutos = autos.slice(0, 4);
  const primaryCtaHref = `/${slug}/inventario`;
  const secondaryCtaHref = `/${slug}/vende-tu-auto`;
  const heroImage = demoCatalogContent.heroImage;
  const phone = tenant?.telefono ?? demoCatalogContent.footer.phone;
  const handleFeaturedSelect = () => {
    navigate(primaryCtaHref);
  };

  const seo = useMemo(() => ({
    title: `${brandName} | Seminuevos premium en Monterrey`,
    description:
      `Explora el inventario de ${brandName} y encuentra autos con atención directa desde Monterrey.`,
  }), [brandName]);

  if (isLoading || loadingAutos) {
    return (
      <main className="app-shell">
        <div className="loading-state">Cargando inventario del lote...</div>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta content={seo.description} name="description" />
        <meta content={seo.title} property="og:title" />
        <meta content={seo.description} property="og:description" />
      </Helmet>

      <main className="site-shell">
        <section
          className="immersive-hero"
          id="inicio"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.2) 0%, rgba(0, 0, 0, 0.68) 72%, rgba(0, 0, 0, 0.92) 100%), url("${heroImage}")`,
          }}
        >
          <PublicSiteHeader
            brandName={brandName}
            brandSubmark={brandSubmark}
            homeHref={`/${slug}`}
            inventoryHref={primaryCtaHref}
            logoSrc={logoSrc}
            mode="home"
            sellHref={secondaryCtaHref}
          />

          <div className="hero-copy-block">
            <h1 className="hero-title">{demoCatalogContent.hero.title}</h1>
            <p className="hero-subtext">{demoCatalogContent.hero.subtitle}</p>
            <div className="hero-action-row">
              <Link className="edge-button" to={primaryCtaHref}>
                {demoCatalogContent.hero.primaryCta}
              </Link>
              <Link className="edge-button edge-button-ghost" to={secondaryCtaHref}>
                {demoCatalogContent.hero.secondaryCta}
              </Link>
            </div>
          </div>
        </section>

        <section className="featured-section">
          <CatalogGrid
            autos={featuredAutos}
            emptyMessage="No hay autos destacados por ahora."
            onSelect={handleFeaturedSelect}
            variant="featured"
          />
        </section>

        <section className="editorial-section edge-pad">
          <div className="editorial-matrix">
            {demoCatalogContent.bodyBlocks.map((block) => (
              <article className="editorial-cell" key={block.title}>
                <h3>{block.title}</h3>
                <p>{block.body}</p>
              </article>
            ))}
          </div>
        </section>

        <PublicSiteFooter
          address={demoCatalogContent.footer.address}
          blurb={demoCatalogContent.footer.blurb}
          brandName={brandName}
          brandSubmark={brandSubmark}
          footerLogo={footerLogo}
          hours={demoCatalogContent.footer.hours}
          legal={demoCatalogContent.footer.legal}
          phone={phone}
        />
      </main>
    </>
  );
}
