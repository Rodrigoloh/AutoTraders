import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { CatalogGrid } from '../components/CatalogGrid';
import { PublicSiteFooter } from '../components/PublicSiteFooter.jsx';
import { PublicSiteHeader } from '../components/PublicSiteHeader.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { recordMetric } from '../lib/metrics.js';
import { usePublicInventory } from '../lib/publicCatalogUtils.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

export function PublicCatalogPage() {
  const { tenant, theme, isLoading, slug } = useTenantTheme();
  const navigate = useNavigate();
  const { autos, loadingAutos } = usePublicInventory(tenant?.id, {
    includeDemoAutos: slug === 'demo-lote-norte',
  });

  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const brandSubmark = demoCatalogContent.brand.submark;
  const logoSrc = demoCatalogContent.logos.header;
  const footerLogo = demoCatalogContent.logos.footer;
  const featuredPool = autos.slice(0, 12);
  const [featuredPage, setFeaturedPage] = useState(0);
  const featuredPageCount = Math.max(1, Math.ceil(featuredPool.length / 4));
  const featuredAutos = featuredPool.slice(featuredPage * 4, featuredPage * 4 + 4);
  const primaryCtaHref = `/${slug}/inventario`;
  const secondaryCtaHref = `/${slug}/vende-tu-auto`;
  const heroImage = demoCatalogContent.heroImage;
  const phone = tenant?.telefono ?? demoCatalogContent.footer.phone;
  useEffect(() => {
    setFeaturedPage(0);
  }, [tenant?.id, featuredPool.length]);

  useEffect(() => {
    if (featuredPageCount <= 1) {
      return undefined;
    }

    const rotationId = window.setInterval(() => {
      setFeaturedPage((current) => (current + 1) % featuredPageCount);
    }, 8000);

    return () => window.clearInterval(rotationId);
  }, [featuredPageCount]);

  const moveFeaturedPage = (direction) => {
    setFeaturedPage((current) => (
      (current + direction + featuredPageCount) % featuredPageCount
    ));
  };

  const handleFeaturedSelect = (auto) => {
    void recordMetric({
      autoId: auto.id,
      loteId: tenant?.id,
      eventType: 'click_card',
    });
    navigate(`/${slug}/inventario/${encodeURIComponent(auto.id)}`);
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
          <div className="featured-toolbar edge-pad">
            <div>
              <span className="section-kicker">Selección del lote</span>
              <h2>Más vistos y destacados</h2>
            </div>
            {featuredPageCount > 1 ? (
              <div className="featured-rotation-controls" aria-label="Rotar autos destacados">
                <button
                  aria-label="Ver autos anteriores"
                  onClick={() => moveFeaturedPage(-1)}
                  type="button"
                >
                  <ChevronLeft size={20} />
                </button>
                <span>{featuredPage + 1} / {featuredPageCount}</span>
                <button
                  aria-label="Ver autos siguientes"
                  onClick={() => moveFeaturedPage(1)}
                  type="button"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            ) : null}
          </div>
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
