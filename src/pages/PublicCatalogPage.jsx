import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  ArrowRight,
  Facebook,
  Instagram,
  MapPin,
  PhoneCall,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { recordMetric } from '../lib/metrics';
import { CatalogGrid } from '../components/CatalogGrid';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { CarDetail } from '../components/CarDetail.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

function formatPrice(price, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(price ?? 0));
}

function primaryImage(auto) {
  if (Array.isArray(auto?.imagenes) && auto.imagenes.length > 0) {
    return auto.imagenes[0];
  }

  return demoCatalogContent.heroImage;
}

function inferVehicleType(auto) {
  const haystack = [
    auto?.version,
    auto?.descripcion,
    auto?.modelo,
    auto?.meta_tags?.body_shape,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    haystack.includes('suv') ||
    haystack.includes('pickup') ||
    haystack.includes('camioneta') ||
    haystack.includes('crossover')
  ) {
    return 'SUV';
  }

  if (
    haystack.includes('amg') ||
    haystack.includes('m ') ||
    haystack.includes('gt') ||
    haystack.includes('sport') ||
    haystack.includes('deportivo') ||
    haystack.includes('coupe') ||
    haystack.includes('turbo')
  ) {
    return 'Deportivo';
  }

  return 'Sedán';
}

export function PublicCatalogPage() {
  const { tenant, theme, isLoading } = useTenantTheme();
  const [autos, setAutos] = useState([]);
  const [loadingAutos, setLoadingAutos] = useState(true);
  const [selectedAutoId, setSelectedAutoId] = useState(null);
  const [filters, setFilters] = useState({
    vehicleType: 'all',
    budgetCap: 'all',
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
          'id, lote_id, marca, modelo, anio, version, precio, moneda, kilometraje, ciudad, estado, estatus, imagenes, meta_tags, combustible, transmision, descripcion',
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

  const maxBudget = useMemo(() => {
    const prices = autos.map((auto) => Number(auto.precio ?? 0)).filter(Boolean);

    if (!prices.length) {
      return 1200000;
    }

    const rawMax = Math.max(...prices);
    return Math.ceil(rawMax / 100000) * 100000;
  }, [autos]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      budgetCap: current.budgetCap === 'all' ? String(maxBudget) : current.budgetCap,
    }));
  }, [maxBudget]);

  const filteredAutos = useMemo(() => {
    return autos.filter((auto) => {
      const matchesType =
        deferredFilters.vehicleType === 'all' ||
        inferVehicleType(auto) === deferredFilters.vehicleType;
      const matchesBudget =
        deferredFilters.budgetCap === 'all' ||
        Number(auto.precio ?? 0) <= Number(deferredFilters.budgetCap);

      return matchesType && matchesBudget;
    });
  }, [autos, deferredFilters]);

  const featuredAuto = filteredAutos[0] ?? autos[0] ?? null;

  useEffect(() => {
    if (!selectedAutoId && featuredAuto?.id) {
      setSelectedAutoId(featuredAuto.id);
      return;
    }

    if (selectedAutoId && !filteredAutos.some((auto) => auto.id === selectedAutoId)) {
      setSelectedAutoId(filteredAutos[0]?.id ?? autos[0]?.id ?? null);
    }
  }, [selectedAutoId, filteredAutos, autos, featuredAuto]);

  const selectedAuto =
    filteredAutos.find((auto) => auto.id === selectedAutoId) ??
    autos.find((auto) => auto.id === selectedAutoId) ??
    featuredAuto;

  const seo = useMemo(() => {
    const featuredMeta = featuredAuto?.meta_tags ?? {};

    return {
      title:
        featuredMeta.title ??
        `${tenant?.nombre ?? theme.brandName} | Seminuevos premium en Monterrey`,
      description:
        featuredMeta.description ??
        `Explora el inventario de ${tenant?.nombre ?? theme.brandName} y aparta tu siguiente auto desde Monterrey.`,
    };
  }, [featuredAuto, tenant?.nombre, theme.brandName]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({ ...current, [name]: value }));
  };

  const clearFilters = () => {
    setFilters({
      vehicleType: 'all',
      budgetCap: String(maxBudget),
    });
  };

  const handleReservation = async (auto) => {
    await recordMetric({
      autoId: auto.id,
      loteId: tenant?.id,
      eventType: 'click_whatsapp',
    });

    const phone = (tenant?.whatsapp ?? '').replace(/\D/g, '');
    const text = encodeURIComponent(
      `Hola Lote del Norte, me interesa el ${auto.marca} ${auto.modelo} ${auto.anio} ID: ${auto.id}. ¿Sigue disponible?`,
    );

    if (phone) {
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank', 'noopener,noreferrer');
    }
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
            </header>

            <div className="catalog-hero-grid prompt-hero-grid">
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
                    <PhoneCall size={18} />
                    {content.cta_secondary_label ?? demoCatalogContent.hero.secondaryCta}
                  </a>
                </div>
              </div>

              <div
                className="hero-stage"
                style={{
                  backgroundImage: `linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.38)), url("${featuredAuto ? primaryImage(featuredAuto) : demoCatalogContent.heroImage}")`,
                }}
              >
                <div className="hero-stage-overlay">
                  <span className="catalog-eyebrow">Placeholder 16:9 para portada</span>
                  <strong>
                    Coloca aquí una foto horizontal HD del auto cargada hacia la derecha.
                  </strong>
                </div>
              </div>
            </div>
          </section>

          <section className="catalog-search-strip" id="inventario">
            <div className="catalog-section-head">
              <div>
                <span className="catalog-eyebrow">Buscador minimalista</span>
                <h2 className="heading-lg">{demoCatalogContent.filters.title}</h2>
              </div>
              <p className="muted">{demoCatalogContent.filters.subtitle}</p>
            </div>

            <div className="catalog-filter-grid prompt-filter-grid">
              <label className="field">
                <span>{demoCatalogContent.filters.typeLabel}</span>
                <select
                  name="vehicleType"
                  onChange={handleFilterChange}
                  value={filters.vehicleType}
                >
                  <option value="all">Todos</option>
                  <option value="SUV">SUV</option>
                  <option value="Sedán">Sedán</option>
                  <option value="Deportivo">Deportivo</option>
                </select>
              </label>

              <label className="field field-range">
                <span>{demoCatalogContent.filters.priceLabel}</span>
                <div className="range-shell">
                  <input
                    max={maxBudget}
                    min="200000"
                    name="budgetCap"
                    onChange={handleFilterChange}
                    step="50000"
                    type="range"
                    value={filters.budgetCap === 'all' ? maxBudget : filters.budgetCap}
                  />
                  <strong>
                    Ver autos de $200k a{' '}
                    {formatPrice(
                      filters.budgetCap === 'all' ? maxBudget : filters.budgetCap,
                      'MXN',
                    )}
                  </strong>
                </div>
              </label>

              <button className="btn-soft" onClick={clearFilters} type="button">
                <SlidersHorizontal size={18} />
                {demoCatalogContent.filters.clearLabel}
              </button>
            </div>
          </section>

          <CatalogGrid autos={filteredAutos} onReserve={handleReservation} onSelect={(auto) => setSelectedAutoId(auto.id)} />

          {selectedAuto ? <CarDetail auto={selectedAuto} onReserve={handleReservation} /> : null}

          <section className="editorial-grid prompt-editorial-grid" id="servicios">
            <article className="editorial-card">
              <h3 className="heading-md">Compra con confianza</h3>
              <p className="muted">
                Unidades con atención directa, seguimiento ágil y presentación pensada para
                compradores en Monterrey y San Pedro.
              </p>
            </article>
            <article className="editorial-card">
              <h3 className="heading-md">Aparta sin fricción</h3>
              <ul className="catalog-bullet-list">
                <li>
                  <ShieldCheck size={16} />
                  <span>Reserva digital y contacto inmediato con el asesor.</span>
                </li>
                <li>
                  <ShieldCheck size={16} />
                  <span>Crédito inmediato con solo INE.</span>
                </li>
                <li>
                  <ShieldCheck size={16} />
                  <span>Consignación directa y toma de seminuevo.</span>
                </li>
              </ul>
            </article>
            <article className="editorial-card">
              <h3 className="heading-md">Demo editable por cliente</h3>
              <p className="muted">
                Los textos base viven en <code>src/lib/demoCatalogContent.js</code> y el copy
                visible del lote también puede editarse desde el dashboard admin.
              </p>
            </article>
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
              <h2 className="heading-lg">Lote de Autos del Norte</h2>
              <p className="muted">
                Atención directa para compradores en Monterrey. Agenda visita, pide video o
                solicita inventario desde WhatsApp.
              </p>
            </div>

            <div className="catalog-footer-grid">
              <article className="catalog-footer-card">
                <span className="catalog-eyebrow">Dirección demo</span>
                <strong>{demoCatalogContent.footer.address}</strong>
                <span>{demoCatalogContent.footer.hours}</span>
              </article>
              <article className="catalog-footer-card">
                <span className="catalog-eyebrow">Contacto</span>
                <div className="stack-sm">
                  {tenant?.whatsapp ? <strong>WhatsApp: {tenant.whatsapp}</strong> : null}
                  {tenant?.telefono ? <span>{tenant.telefono}</span> : null}
                  {tenant?.email_contacto ? <span>{tenant.email_contacto}</span> : null}
                </div>
              </article>
              <article className="catalog-footer-card">
                <span className="catalog-eyebrow">Redes</span>
                <div className="social-row">
                  <a href="#contacto" aria-label="Facebook demo">
                    <Facebook size={18} />
                  </a>
                  <a href="#contacto" aria-label="Instagram demo">
                    <Instagram size={18} />
                  </a>
                </div>
                <span className="muted">
                  Reemplaza estos enlaces por los perfiles reales del lote.
                </span>
              </article>
            </div>

            <div className="catalog-footer-legal">
              <span className="inline-row">
                <MapPin size={15} />
                {demoCatalogContent.footer.address}
              </span>
              <a href="https://cobalto.blue" rel="noreferrer" target="_blank">
                Powered by Cobalto.blue
              </a>
            </div>
          </footer>
        </div>
      </main>
    </>
  );
}
