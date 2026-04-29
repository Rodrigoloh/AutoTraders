import { Helmet } from 'react-helmet';
import { PublicSiteHeader } from '../components/PublicSiteHeader.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

export function SellYourCarPage() {
  const { tenant, theme, slug } = useTenantTheme();
  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const brandSubmark = demoCatalogContent.brand.submark;
  const logoSrc = theme.logoUrl || demoCatalogContent.logos.header;

  return (
    <>
      <Helmet>
        <title>{brandName} | Vende tu auto</title>
      </Helmet>

      <main className="site-shell">
        <section className="sell-page-shell">
          <PublicSiteHeader
            brandName={brandName}
            brandSubmark={brandSubmark}
            homeHref={`/${slug}`}
            inventoryHref={`/${slug}/inventario`}
            logoSrc={logoSrc}
            mode="secondary"
            sellHref={`/${slug}/vende-tu-auto`}
          />

          <div className="sell-message">
            <h2>{demoCatalogContent.sell.title}</h2>
            <p>{demoCatalogContent.sell.body}</p>
          </div>
        </section>
      </main>
    </>
  );
}
