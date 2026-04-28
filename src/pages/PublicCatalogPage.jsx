import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  ArrowRight,
  Building2,
  CarFront,
  CircleDollarSign,
  MapPin,
  MessageCircle,
  PhoneCall,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { CatalogGrid } from '../components/CatalogGrid';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

function formatPrice(price, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));
}

function formatMileage(kilometraje) {
  if (!kilometraje) {
    return 'Kilometraje por confirmar';
  }

  return `${Number(kilometraje).toLocaleString('es-MX')} km`;
}

function locationLabel(auto) {
  return [auto?.ciudad, auto?.estado].filter(Boolean).join(', ') || 'Monterrey, Nuevo Leon';
}

function primaryImage(auto) {
  if (Array.isArray(auto?.imagenes) && auto.imagenes.length > 0) {
    return auto.imagenes[0];
  }

  return 'https://images.unsplash.com/photo-1494976688153-cbe2305abf84?auto=format&fit=crop&w=1400&q=80';
}

export function PublicCatalogPage() {
  const { tenant, theme, isLoading } = useTenantTheme();
  const [autos, setAutos] = useState([]);
  const [loadingAutos, setLoadingAutos] = useState(true);
  const [filters, setFilters] = useState({
    make: 'all',
    model: 'all',
    priceCap: 'all',
  });
  const deferredFilters = useDeferredValue(filters);
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

  const makeOptions = useMemo(
    () => ['all', ...new Set(autos.map((auto) => auto.marca).filter(Boolean))],
    [autos],
  );

  const modelOptions = useMemo(() => {
    const scopedAutos =
      filters.make === 'all' ? autos : autos.filter((auto) => auto.marca === filters.make);

    return ['all', ...new Set(scopedAutos.map((auto) => auto.modelo).filter(Boolean))];
  }, [autos, filters.make]);

  const filteredAutos = useMemo(() => {
    return autos.filter((auto) => {
      const matchesMake =
        deferredFilters.make === 'all' || auto.marca === deferredFilters.make;
      const matchesModel =
        deferredFilters.model === 'all' || auto.modelo === deferredFilters.model;
      const matchesPrice =
        deferredFilters.priceCap === 'all' ||
        Number(auto.precio ?? 0) <= Number(deferredFilters.priceCap);

      return matchesMake && matchesModel && matchesPrice;
    });
  }, [autos, deferredFilters]);

  const featuredAuto = filteredAutos[0] ?? autos[0] ?? null;
  const seo = useMemo(() => {
    const featuredMeta = featuredAuto?.meta_tags ?? {};

    return {
      title:
        featuredMeta.title ??
        `${tenant?.nombre ?? theme.brandName} | Seminuevos en Monterrey`,
      description:
        featuredMeta.description ??
        `Explora el inventario de ${tenant?.nombre ?? theme.brandName} y agenda por WhatsApp desde Monterrey.`,
    };
  }, [featuredAuto, tenant?.nombre, theme.brandName]);

  const heroStats = useMemo(() => {
    const uniqueBrands = new Set(autos.map((auto) => auto.marca).filter(Boolean)).size;

    return [
      { label: 'Inventario activo', value: `${autos.length} unidades` },
      { label: 'Marcas visibles', value: `${uniqueBrands || 1} marcas` },
      { label: 'Atencion', value: 'WhatsApp y llamada' },
    ];
  }, [autos]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      if (name === 'make') {
        return { ...current, make: value, model: 'all' };
      }

      return { ...current, [name]: value };
    });
  };

  const clearFilters = () => {
    setFilters({
      make: 'all',
      model: 'all',
      priceCap: 'all',
    });
  };

  const whatsappHref = tenant?.whatsapp
    ? `https://wa.me/${tenant.whatsapp.replace(/\D/g, '')}`
    : '#contacto';

  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const brandSubmark = demoCatalogContent.brand.submark;
  const headerLogo = theme.logoUrl || demoCatalogContent.logos.header;
  const footerLogo = theme.logoUrl || demoCatalogContent.logos.footer;

  if (isLoading || loadingAutos) {
    return (
      <main className="app-shell catalog-shell">
        <div className="container loading-state">Cargando catalogo del lote...</div>
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
      <main className="app-shell catalog-shell">
        <div className="container stack-lg">
          <section className="catalog-hero" id="inicio">
            <header className="catalog-header">
              <BrandLogo
                src={headerLogo}
                alt={`${brandName} logo`}
                brand={brandName}
                submark={brandSubmark}
                className="brand-logo-image"
              />
              <nav className="catalog-nav" aria-label="Navegacion principal del lote">
                {demoCatalogContent.nav.map((item) => (
                  <a key={item.href} href={item.href}>
                    {item.label}
                  </a>
                ))}
              </nav>
              <a className="btn-outline" href={`/${tenant?.slug ?? 'demo'}/admin`}>
                Panel admin
              </a>
            </header>

            <div className="catalog-hero-grid">
              <div className="catalog-copy stack-md">
                <span className="catalog-eyebrow">
                  {content.hero_eyebrow ?? demoCatalogContent.hero.eyebrow}
                </span>
                <h1 className="catalog-display">
                  {content.hero_title ?? demoCatalogContent.hero.title}
                </h1>
                <p className="catalog-lead">
                  {content.hero_subtitle ?? demoCatalogContent.hero.subtitle}
                </p>
                <div className="catalog-actions">
                  <a className="btn" href="#inventario">
                    {content.cta_primary_label ?? demoCatalogContent.hero.primaryCta}
                    <ArrowRight size={18} />
                  </a>
                  <a className="btn-outline" href={whatsappHref} target="_blank" rel="noreferrer">
                    <MessageCircle size={18} />
                    {content.cta_secondary_label ?? demoCatalogContent.hero.secondaryCta}
                  </a>
                </div>
                <div className="catalog-stat-row">
                  {heroStats.map((stat) => (
                    <article className="catalog-stat-card" key={stat.label}>
                      <strong>{stat.value}</strong>
                      <span>{stat.label}</span>
                    </article>
                  ))}
                </div>
              </div>

              <div className="featured-vehicle-shell">
                {featuredAuto ? (
                  <>
                    <div className="featured-vehicle-media">
                      <img
                        src={primaryImage(featuredAuto)}
                        alt={`${featuredAuto.marca} ${featuredAuto.modelo}`}
                      />
                    </div>
                    <div className="featured-vehicle-card">
                      <div className="inline-row">
                        <span className="catalog-eyebrow">
                          {demoCatalogContent.featured.eyebrow}
                        </span>
                        <span className="featured-price">
                          {formatPrice(featuredAuto.precio, featuredAuto.moneda)}
                        </span>
                      </div>
                      <div className="stack-sm">
                        <h2 className="heading-lg">
                          {featuredAuto.marca} {featuredAuto.modelo}
                        </h2>
                        <p className="muted">
                          {featuredAuto.version || demoCatalogContent.featured.summaryTitle}
                        </p>
                      </div>
                      <div className="featured-spec-grid">
                        <div>
                          <span>Ano</span>
                          <strong>{featuredAuto.anio}</strong>
                        </div>
                        <div>
                          <span>Kilometraje</span>
                          <strong>{formatMileage(featuredAuto.kilometraje)}</strong>
                        </div>
                        <div>
                          <span>Ubicacion</span>
                          <strong>{locationLabel(featuredAuto)}</strong>
                        </div>
                        <div>
                          <span>Estatus</span>
                          <strong>{featuredAuto.estatus}</strong>
                        </div>
                      </div>
                      <ul className="catalog-bullet-list">
                        {demoCatalogContent.featured.detailItems.map((item) => (
                          <li key={item}>
                            <ShieldCheck size={16} />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="catalog-actions">
                        <a className="btn" href={whatsappHref} target="_blank" rel="noreferrer">
                          <PhoneCall size={18} />
                          {demoCatalogContent.featured.reserveLabel}
                        </a>
                        <a className="btn-outline" href="#contacto">
                          <Sparkles size={18} />
                          {demoCatalogContent.featured.viewLabel}
                        </a>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="featured-vehicle-card">
                    <h2 className="heading-lg">Tu inventario aparecera aqui</h2>
                    <p className="muted">
                      Carga autos desde el panel admin para ver esta portada con look premium.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="catalog-filter-card" id="inventario">
            <div className="catalog-section-head">
              <div>
                <span className="catalog-eyebrow">Inventario publico</span>
                <h2 className="heading-lg">{demoCatalogContent.filters.title}</h2>
              </div>
              <p className="muted">{demoCatalogContent.filters.subtitle}</p>
            </div>
            <div className="catalog-filter-grid">
              <label className="field">
                <span>{demoCatalogContent.filters.makeLabel}</span>
                <select name="make" onChange={handleFilterChange} value={filters.make}>
                  {makeOptions.map((item) => (
                    <option key={item} value={item}>
                      {item === 'all' ? 'Todas' : item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{demoCatalogContent.filters.modelLabel}</span>
                <select name="model" onChange={handleFilterChange} value={filters.model}>
                  {modelOptions.map((item) => (
                    <option key={item} value={item}>
                      {item === 'all' ? 'Todos' : item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>{demoCatalogContent.filters.priceLabel}</span>
                <select name="priceCap" onChange={handleFilterChange} value={filters.priceCap}>
                  {demoCatalogContent.filters.priceOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <button className="btn-soft" onClick={clearFilters} type="button">
                <SlidersHorizontal size={18} />
                {demoCatalogContent.filters.clearLabel}
              </button>
            </div>
          </section>

          <CatalogGrid
            autos={filteredAutos}
            loteId={tenant?.id}
            whatsappNumber={tenant?.whatsapp}
          />

          <section className="catalog-info-grid" id="servicios">
            {demoCatalogContent.trustSection.cards.map((card, index) => {
              const icons = [CarFront, CircleDollarSign, Building2];
              const Icon = icons[index] ?? Sparkles;

              return (
                <article className="catalog-info-card" key={card.title}>
                  <span className="catalog-icon-badge">
                    <Icon size={18} />
                  </span>
                  <h3 className="heading-md">{card.title}</h3>
                  <p className="muted">{card.body}</p>
                </article>
              );
            })}
          </section>

          <section className="editorial-grid">
            {demoCatalogContent.editorialSections.map((section) => (
              <article className="editorial-card" key={section.title}>
                <h3 className="heading-md">{section.title}</h3>
                <p className="muted">{section.body}</p>
              </article>
            ))}
          </section>

          <footer className="catalog-footer" id="contacto">
            <div className="catalog-footer-brand">
              <BrandLogo
                src={footerLogo}
                alt={`${brandName} footer logo`}
                brand={brandName}
                submark={brandSubmark}
                className="brand-logo-image"
              />
              <h2 className="heading-lg">{demoCatalogContent.footer.title}</h2>
              <p className="muted">
                {content.contact_body ?? demoCatalogContent.footer.body}
              </p>
            </div>
            <div className="catalog-footer-grid">
              <article className="catalog-footer-card">
                <span className="catalog-eyebrow">Contacto</span>
                <div className="stack-sm">
                  {tenant?.whatsapp ? <strong>WhatsApp: {tenant.whatsapp}</strong> : null}
                  {tenant?.telefono ? <span>{tenant.telefono}</span> : null}
                  {tenant?.email_contacto ? <span>{tenant.email_contacto}</span> : null}
                </div>
              </article>
              <article className="catalog-footer-card">
                <span className="catalog-eyebrow">Ubicacion demo</span>
                <strong>{demoCatalogContent.footer.address}</strong>
                <span>{demoCatalogContent.footer.hours}</span>
              </article>
              <article className="catalog-footer-card catalog-map-placeholder">
                <span className="catalog-eyebrow">Mapa</span>
                <strong>{demoCatalogContent.footer.mapLabel}</strong>
                <span className="muted">
                  Sustituye este bloque por un iframe o imagen del showroom.
                </span>
              </article>
            </div>
            <div className="catalog-footer-legal">
              <span>{content.powered_by_label ?? 'Powered by cobalto.blue'}</span>
              <span>{demoCatalogContent.footer.legal}</span>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
