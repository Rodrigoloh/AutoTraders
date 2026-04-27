import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { ChevronRight, MessageCircle, SearchCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { CatalogGrid } from '../components/CatalogGrid';
import { useTenantTheme } from '../styles/themeContext.jsx';

export function PublicCatalogPage() {
  const { tenant, theme, isLoading } = useTenantTheme();
  const [autos, setAutos] = useState([]);
  const [loadingAutos, setLoadingAutos] = useState(true);
  const content = tenant?.config_contenido ?? {};

  useEffect(() => {
    let ignore = false;

    async function loadAutos() {
      if (!tenant?.id) {
        setAutos([]);
        setLoadingAutos(false);
        return;
      }

      setLoadingAutos(true);

      const { data, error } = await supabase
        .from('inventario')
        .select(
          'id, lote_id, marca, modelo, anio, version, precio, moneda, kilometraje, ciudad, estado, estatus, imagenes, meta_tags',
        )
        .eq('lote_id', tenant.id)
        .eq('estatus', 'disponible')
        .order('created_at', { ascending: false });

      if (!ignore) {
        setAutos(error ? [] : data ?? []);
        setLoadingAutos(false);
      }
    }

    loadAutos();

    return () => {
      ignore = true;
    };
  }, [tenant?.id]);

  const seo = useMemo(() => {
    const featuredMeta = autos[0]?.meta_tags ?? {};

    return {
      title: featuredMeta.title ?? `${tenant?.nombre ?? theme.brandName} | Autos en venta`,
      description:
        featuredMeta.description ??
        `Explora el catálogo móvil de ${tenant?.nombre ?? theme.brandName} y contacta por WhatsApp.`,
    };
  }, [autos, tenant?.nombre, theme.brandName]);

  if (isLoading || loadingAutos) {
    return (
      <main className="app-shell">
        <div className="container loading-state">Cargando catálogo del lote...</div>
      </main>
    );
  }

  return (
    <>
      <Helmet>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
      </Helmet>
      <main className="app-shell">
        <div className="container stack-lg">
          <section className="hero-card">
            <div className="tenant-topbar">
              <div className="tenant-badge">
                <div className="tenant-logo" />
                <div className="stack-sm" style={{ gap: 4 }}>
                  <strong>{tenant?.nombre ?? theme.brandName}</strong>
                  <span className="muted">Catálogo en vivo</span>
                </div>
              </div>
              <a className="btn-outline" href={`/${tenant?.slug ?? 'demo'}/admin`}>
                Admin
              </a>
            </div>
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="eyebrow">Plantilla ecommerce para lotes de autos</span>
                <h1 className="heading-xl">
                  {content.hero_title ?? 'Inventario listo para vender desde el celular.'}
                </h1>
                <p className="muted">
                  {content.hero_subtitle ??
                    'Diseño mobile-first, contacto inmediato por WhatsApp y base para SEO, campañas y administración multi-tenant.'}
                </p>
                <div className="hero-actions">
                  <a className="btn" href="#catalogo">
                    <SearchCheck size={18} />
                    {content.cta_primary_label ?? 'Ver autos'}
                  </a>
                  <a
                    className="btn-outline"
                    href={tenant?.whatsapp ? `https://wa.me/${tenant.whatsapp.replace(/\D/g, '')}` : '#'}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle size={18} />
                    {content.cta_secondary_label ?? 'Contactar lote'}
                  </a>
                </div>
              </div>
              <div className="panel-card stack-md">
                <span className="eyebrow">Personalizable por cliente</span>
                <h2 className="heading-md">
                  {content.intro_title ?? 'Marca, colores y operación centralizada.'}
                </h2>
                <p className="muted">
                  {content.intro_body ??
                    'Cada lote puede tener identidad propia y tú conservas el control de SEO, campañas y distribución hacia Facebook o WhatsApp.'}
                </p>
                <div className="inline-row">
                  <span className="status-pill">{autos.length} autos publicados</span>
                  <span className="inline-row muted">
                    Explorar
                    <ChevronRight size={16} />
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className="stack-md" id="catalogo">
            <div className="inline-row">
              <div>
                <h2 className="heading-lg">Catálogo público</h2>
                <p className="muted">Optimizado para consulta rápida desde móvil.</p>
              </div>
            </div>
            <CatalogGrid
              autos={autos}
              loteId={tenant?.id}
              whatsappNumber={tenant?.whatsapp}
            />
          </section>

          <section className="dashboard-grid">
            <article className="panel-card stack-md">
              <div>
                <h2 className="heading-md">{content.about_title ?? '¿Por qué este lote?'}</h2>
                <p className="muted">
                  {content.about_body ??
                    'Atención rápida, inventario visible y seguimiento comercial centralizado.'}
                </p>
              </div>
            </article>
            <article className="panel-card stack-md">
              <div>
                <h2 className="heading-md">
                  {content.contact_title ?? 'Contacto e información del lote'}
                </h2>
                <p className="muted">
                  {content.contact_body ??
                    'Edita este texto desde el dashboard del lote para personalizar la demo por cliente.'}
                </p>
              </div>
              <div className="stack-sm">
                {tenant?.whatsapp ? <span className="muted">WhatsApp: {tenant.whatsapp}</span> : null}
                {tenant?.telefono ? <span className="muted">Teléfono: {tenant.telefono}</span> : null}
                {tenant?.email_contacto ? (
                  <span className="muted">Email: {tenant.email_contacto}</span>
                ) : null}
                <span className="muted">{content.powered_by_label ?? 'Powered by cobalto.blue'}</span>
              </div>
            </article>
          </section>
        </div>
      </main>
    </>
  );
}
