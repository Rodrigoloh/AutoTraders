import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Clock3,
  Facebook,
  Instagram,
  MapPin,
  PhoneCall,
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

function mapQuery(address) {
  return `https://www.google.com/maps?q=${encodeURIComponent(address)}&output=embed`;
}

function buildBudgetOptions(maxBudget) {
  const values = Array.from(
    new Set([0, 200000, 400000, 600000, 800000, 1200000, maxBudget].filter((value) => value <= maxBudget)),
  ).sort((left, right) => left - right);

  return values.map((value) => ({
    value: String(value),
    label: value === 0 ? 'Sin mínimo' : formatPrice(value),
  }));
}

export function PublicCatalogPage() {
  const { tenant, theme, isLoading } = useTenantTheme();
  const [autos, setAutos] = useState([]);
  const [loadingAutos, setLoadingAutos] = useState(true);
  const [selectedAutoId, setSelectedAutoId] = useState(null);
  const [filters, setFilters] = useState({
    vehicleType: 'all',
    minPrice: '0',
    maxPrice: 'all',
    brandQuery: '',
    modelQuery: '',
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

    return Math.ceil(Math.max(...prices) / 100000) * 100000;
  }, [autos]);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      maxPrice: current.maxPrice === 'all' ? String(maxBudget) : current.maxPrice,
    }));
  }, [maxBudget]);

  const budgetOptions = useMemo(() => buildBudgetOptions(maxBudget), [maxBudget]);

  const filteredAutos = useMemo(() => {
    return autos.filter((auto) => {
      const brand = String(auto.marca ?? '').toLowerCase();
      const model = String(auto.modelo ?? '').toLowerCase();
      const matchesType =
        deferredFilters.vehicleType === 'all' ||
        inferVehicleType(auto) === deferredFilters.vehicleType;
      const matchesBrand =
        !deferredFilters.brandQuery ||
        brand.includes(deferredFilters.brandQuery.trim().toLowerCase());
      const matchesModel =
        !deferredFilters.modelQuery ||
        model.includes(deferredFilters.modelQuery.trim().toLowerCase());
      const matchesMinPrice = Number(auto.precio ?? 0) >= Number(deferredFilters.minPrice || 0);
      const matchesMaxPrice =
        deferredFilters.maxPrice === 'all' ||
        Number(auto.precio ?? 0) <= Number(deferredFilters.maxPrice);

      return matchesType && matchesBrand && matchesModel && matchesMinPrice && matchesMaxPrice;
    });
  }, [autos, deferredFilters]);

  const featuredAutos = filteredAutos.slice(0, 8);

  useEffect(() => {
    if (!selectedAutoId && filteredAutos[0]?.id) {
      setSelectedAutoId(filteredAutos[0].id);
      return;
    }

    if (selectedAutoId && !filteredAutos.some((auto) => auto.id === selectedAutoId)) {
      setSelectedAutoId(filteredAutos[0]?.id ?? autos[0]?.id ?? null);
    }
  }, [selectedAutoId, filteredAutos, autos]);

  const selectedAuto =
    filteredAutos.find((auto) => auto.id === selectedAutoId) ??
    autos.find((auto) => auto.id === selectedAutoId) ??
    filteredAutos[0] ??
    autos[0] ??
    null;

  const seo = useMemo(() => {
    return {
      title:
        `${tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark} | ` +
        'Seminuevos premium en Monterrey',
      description:
        `Explora el inventario de ${tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark} ` +
        'y agenda contacto inmediato desde Monterrey.',
    };
  }, [tenant?.nombre, theme.brandName]);

  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const brandSubmark = demoCatalogContent.brand.submark;
  const headerLogo = theme.logoUrl || demoCatalogContent.logos.header;
  const footerLogo = theme.logoUrl || demoCatalogContent.logos.footer;
  const whatsappNumber = (tenant?.whatsapp ?? '').replace(/\D/g, '');
  const address = demoCatalogContent.footer.address;
  const phone = tenant?.telefono ?? demoCatalogContent.footer.phone;

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]:
        name === 'maxPrice'
          ? value || 'all'
          : name === 'minPrice'
            ? value || '0'
            : value,
    }));
  };

  const handleQuickSearch = (event) => {
    event.preventDefault();
    scrollToSection('busca-auto');
  };

  const handleSelectAuto = (auto) => {
    setSelectedAutoId(auto.id);
    window.requestAnimationFrame(() => {
      setTimeout(() => scrollToSection('detalle-auto'), 40);
    });
  };

  const openWhatsappIntent = async (auto, intent) => {
    await recordMetric({
      autoId: auto.id,
      loteId: tenant?.id,
      eventType: 'click_whatsapp',
    });

    const messages = {
      reserva: `Hola ${brandName}, quiero reservar el ${auto.marca} ${auto.modelo} ${auto.anio} con ID ${auto.id}.`,
      prueba: `Hola ${brandName}, quiero agendar una prueba para el ${auto.marca} ${auto.modelo} ${auto.anio} con ID ${auto.id}.`,
      contacto: `Hola ${brandName}, quiero más información sobre el ${auto.marca} ${auto.modelo} ${auto.anio} con ID ${auto.id}.`,
    };

    if (whatsappNumber) {
      const text = encodeURIComponent(messages[intent] ?? messages.contacto);
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
      return;
    }

    scrollToSection('contacto');
  };

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
        <meta name="description" content={seo.description} />
        <meta property="og:title" content={seo.title} />
        <meta property="og:description" content={seo.description} />
      </Helmet>

      <main className="site-shell">
        <section
          className="immersive-hero"
          id="inicio"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.22) 0%, rgba(0, 0, 0, 0.68) 72%, rgba(0, 0, 0, 0.92) 100%), url("${selectedAuto ? primaryImage(selectedAuto) : demoCatalogContent.heroImage}")`,
          }}
        >
          <header className="immersive-header">
            <BrandLogo
              src={headerLogo}
              alt={`${brandName} logo`}
              brand={brandName}
              submark={brandSubmark}
              className="site-logo"
            />
            <nav className="header-nav" aria-label="Navegacion principal">
              {demoCatalogContent.nav.map((item) => (
                <a key={item.href} href={item.href}>
                  {item.label}
                </a>
              ))}
            </nav>
          </header>

          <div className="hero-copy-block">
            <span className="hero-kicker">
              {content.hero_eyebrow ?? demoCatalogContent.hero.eyebrow}
            </span>
            <h1 className="hero-title">
              {content.hero_title ?? demoCatalogContent.hero.title}
            </h1>
            <p className="hero-subtext">
              {content.hero_subtitle ?? demoCatalogContent.hero.subtitle}
            </p>
            <div className="hero-action-row">
              <a className="edge-button" href="#busca-auto">
                {demoCatalogContent.hero.primaryCta}
              </a>
              <a className="edge-button edge-button-ghost" href="#vende-tu-auto">
                {demoCatalogContent.hero.secondaryCta}
              </a>
            </div>
          </div>
        </section>

        <section className="quick-filter-strip" aria-label="Filtro rápido del home">
          <form className="quick-filter-grid" onSubmit={handleQuickSearch}>
            <label className="filter-field">
              <span>{demoCatalogContent.quickFilters.typeLabel}</span>
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

            <label className="filter-field">
              <span>{demoCatalogContent.quickFilters.minLabel}</span>
              <select name="minPrice" onChange={handleFilterChange} value={filters.minPrice}>
                {budgetOptions.map((option) => (
                  <option key={`min-${option.value}`} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="filter-field">
              <span>{demoCatalogContent.quickFilters.maxLabel}</span>
              <select name="maxPrice" onChange={handleFilterChange} value={filters.maxPrice}>
                <option value="all">Sin tope</option>
                {budgetOptions
                  .filter((option) => option.value !== '0')
                  .map((option) => (
                    <option key={`max-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
              </select>
            </label>

            <button className="edge-button edge-button-block" type="submit">
              BUSCAR
            </button>
          </form>
        </section>

        <section className="featured-section">
          <div className="section-head edge-pad">
            <span className="section-kicker">{demoCatalogContent.featured.kicker}</span>
            <h2>{demoCatalogContent.featured.title}</h2>
            <p>{demoCatalogContent.featured.subtitle}</p>
          </div>
          <CatalogGrid
            autos={featuredAutos}
            emptyMessage="No hay destacados con esos filtros por ahora."
            onSelect={handleSelectAuto}
            variant="featured"
          />
        </section>

        <section className="editorial-section edge-pad">
          <div className="editorial-matrix">
            {demoCatalogContent.bodyBlocks.map((block) => (
              <article className="editorial-cell" key={block.title}>
                <span className="section-kicker">{block.kicker}</span>
                <h3>{block.title}</h3>
                <p>{block.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="inventory-section" id="busca-auto">
          <div className="section-head edge-pad">
            <span className="section-kicker">{demoCatalogContent.inventory.kicker}</span>
            <h2>{demoCatalogContent.inventory.title}</h2>
            <p>{demoCatalogContent.inventory.subtitle}</p>
          </div>

          <div className="advanced-filter-shell edge-pad">
            <div className="inventory-filter-grid">
              <label className="filter-field">
                <span>{demoCatalogContent.inventory.brandLabel}</span>
                <input
                  name="brandQuery"
                  onChange={handleFilterChange}
                  placeholder="Ej. BMW, Audi, Mercedes"
                  type="text"
                  value={filters.brandQuery}
                />
              </label>
              <label className="filter-field">
                <span>{demoCatalogContent.inventory.modelLabel}</span>
                <input
                  name="modelQuery"
                  onChange={handleFilterChange}
                  placeholder="Ej. X5, A45, GLB"
                  type="text"
                  value={filters.modelQuery}
                />
              </label>
              <label className="filter-field">
                <span>{demoCatalogContent.inventory.basePriceLabel}</span>
                <input
                  min="0"
                  name="minPrice"
                  onChange={handleFilterChange}
                  step="50000"
                  type="number"
                  value={filters.minPrice}
                />
              </label>
              <label className="filter-field">
                <span>{demoCatalogContent.inventory.topPriceLabel}</span>
                <input
                  min="0"
                  name="maxPrice"
                  onChange={handleFilterChange}
                  placeholder="Sin tope"
                  step="50000"
                  type="number"
                  value={filters.maxPrice === 'all' ? '' : filters.maxPrice}
                />
              </label>
            </div>
          </div>

          <CatalogGrid
            autos={filteredAutos}
            emptyMessage="No encontramos unidades con esa combinación de búsqueda."
            onSelect={handleSelectAuto}
            variant="inventory"
          />
        </section>

        {selectedAuto ? (
          <CarDetail
            auto={selectedAuto}
            onContact={(auto) => openWhatsappIntent(auto, 'contacto')}
            onReserve={(auto) => openWhatsappIntent(auto, 'reserva')}
            onTestDrive={(auto) => openWhatsappIntent(auto, 'prueba')}
          />
        ) : null}

        <section className="sell-section" id="vende-tu-auto">
          <div className="sell-message">
            <span className="section-kicker">{demoCatalogContent.sell.kicker}</span>
            <h2>{demoCatalogContent.sell.title}</h2>
            <p>{demoCatalogContent.sell.body}</p>
          </div>
        </section>

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
              <p>{demoCatalogContent.footer.blurb}</p>
            </div>

            <div className="footer-block">
              <span className="section-kicker">Contacto</span>
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
                  <span>{demoCatalogContent.footer.hours}</span>
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
          <span>{demoCatalogContent.footer.legal}</span>
          <a href="https://cobalto.blue" rel="noreferrer" target="_blank">
            Powered by cobalto.blue software
          </a>
        </div>
      </main>
    </>
  );
}
