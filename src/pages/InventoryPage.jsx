import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate, useParams } from 'react-router-dom';
import { CatalogGrid } from '../components/CatalogGrid';
import { CarDetail } from '../components/CarDetail.jsx';
import { PublicSiteFooter } from '../components/PublicSiteFooter.jsx';
import { PublicSiteHeader } from '../components/PublicSiteHeader.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import {
  buildBudgetOptions,
  inferVehicleType,
  usePublicInventory,
} from '../lib/publicCatalogUtils.js';
import { recordMetric } from '../lib/metrics';
import { useTenantTheme } from '../styles/themeContext.jsx';

function normalizeBudgetValue(value, fallback = '') {
  const cleaned = String(value ?? '').replace(/[^\d]/g, '');

  if (!cleaned) {
    return fallback;
  }

  return cleaned;
}

export function InventoryPage() {
  const { tenant, theme, isLoading, slug } = useTenantTheme();
  const { autoId } = useParams();
  const navigate = useNavigate();
  const { autos, loadingAutos, maxBudget } = usePublicInventory(tenant?.id, {
    includeDemoAutos: slug === 'demo-lote-norte',
  });
  const [selectedAutoId, setSelectedAutoId] = useState(autoId ?? null);
  const inventoryAnchorRef = useRef(null);
  const recordedDetailIdRef = useRef('');
  const [filters, setFilters] = useState({
    vehicleType: 'all',
    minPrice: '0',
    maxPrice: 'all',
    brandQuery: '',
    modelQuery: '',
  });
  const deferredFilters = useDeferredValue(filters);

  useEffect(() => {
    setFilters((current) => ({
      ...current,
      maxPrice: current.maxPrice === 'all' ? String(maxBudget) : current.maxPrice,
    }));
  }, [maxBudget]);

  useEffect(() => {
    setSelectedAutoId(autoId ?? null);
  }, [autoId]);

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

  const selectedAuto =
    autos.find((auto) => auto.id === selectedAutoId) ??
    null;
  const remainingAutos = selectedAuto
    ? filteredAutos.filter((auto) => auto.id !== selectedAuto.id)
    : filteredAutos;

  useEffect(() => {
    if (!selectedAuto || recordedDetailIdRef.current === selectedAuto.id) {
      return;
    }

    recordedDetailIdRef.current = selectedAuto.id;
    void recordMetric({
      autoId: selectedAuto.id,
      loteId: tenant?.id,
      eventType: 'view_detail',
    });

    window.requestAnimationFrame(() => {
      setTimeout(() => {
        document.getElementById('detalle-auto')?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 60);
    });
  }, [selectedAuto, tenant?.id]);

  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const brandSubmark = demoCatalogContent.brand.submark;
  const logoSrc = demoCatalogContent.logos.header;
  const whatsappNumber = (
    slug === 'demo-lote-norte'
      ? demoCatalogContent.footer.whatsapp
      : tenant?.whatsapp ?? demoCatalogContent.footer.whatsapp
  ).replace(/\D/g, '');
  const heroImage = demoCatalogContent.heroImage;

  const handleFilterChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => ({
      ...current,
      [name]:
        name === 'maxPrice'
          ? normalizeBudgetValue(value, 'all')
          : name === 'minPrice'
            ? normalizeBudgetValue(value, '0')
            : value,
    }));
  };

  const openWhatsappIntent = (auto, intent) => {
    const messages = {
      reserva: `Hola ${brandName}, quiero reservar el ${auto.marca} ${auto.modelo} ${auto.anio} con ID ${auto.id}.`,
      prueba: `Hola ${brandName}, quiero agendar una prueba para el ${auto.marca} ${auto.modelo} ${auto.anio} con ID ${auto.id}.`,
      contacto: `Hola ${brandName}, quiero más información sobre el ${auto.marca} ${auto.modelo} ${auto.anio} con ID ${auto.id}.`,
    };

    if (whatsappNumber) {
      const text = encodeURIComponent(messages[intent] ?? messages.contacto);
      window.open(`https://wa.me/${whatsappNumber}?text=${text}`, '_blank', 'noopener,noreferrer');
    }

    void recordMetric({
      autoId: auto.id,
      loteId: tenant?.id,
      eventType: 'click_whatsapp',
    });
  };

  const handleSelectAuto = (auto) => {
    setSelectedAutoId(auto.id);
    void recordMetric({
      autoId: auto.id,
      loteId: tenant?.id,
      eventType: 'click_card',
    });
    navigate(`/${slug}/inventario/${encodeURIComponent(auto.id)}`);
  };

  const handleBackToInventory = () => {
    setSelectedAutoId(null);
    recordedDetailIdRef.current = '';
    navigate(`/${slug}/inventario`);
    window.requestAnimationFrame(() => {
      setTimeout(() => {
        inventoryAnchorRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 60);
    });
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
        <title>{brandName} | Busca un auto</title>
      </Helmet>

      <main className="site-shell">
        <section
          className="secondary-hero"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(0, 0, 0, 0.24) 0%, rgba(0, 0, 0, 0.7) 100%), url("${heroImage}")`,
          }}
        >
          <PublicSiteHeader
            brandName={brandName}
            brandSubmark={brandSubmark}
            homeHref={`/${slug}`}
            inventoryHref={`/${slug}/inventario`}
            logoSrc={logoSrc}
            mode="secondary"
            sellHref={`/${slug}/vende-tu-auto`}
          />
        </section>

        {selectedAuto ? (
          <CarDetail
            auto={selectedAuto}
            onBack={handleBackToInventory}
            onContact={(auto) => openWhatsappIntent(auto, 'contacto')}
            onReserve={(auto) => openWhatsappIntent(auto, 'reserva')}
            onTestDrive={(auto) => openWhatsappIntent(auto, 'prueba')}
          />
        ) : null}

        <section className="quick-filter-strip secondary-search-strip">
          <div className="advanced-filter-shell edge-pad">
            <div className="inventory-filter-grid">
              <label className="filter-field">
                <span>Tipo</span>
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
                  list="inventory-min-price-options"
                  inputMode="numeric"
                  name="minPrice"
                  onChange={handleFilterChange}
                  placeholder="Ej. 500000"
                  type="text"
                  value={filters.minPrice === '0' ? '' : filters.minPrice}
                />
                <datalist id="inventory-min-price-options">
                  {budgetOptions.map((option) => (
                    <option key={`inv-min-${option.value}`} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </datalist>
              </label>
              <label className="filter-field">
                <span>{demoCatalogContent.inventory.topPriceLabel}</span>
                <input
                  list="inventory-max-price-options"
                  inputMode="numeric"
                  name="maxPrice"
                  onChange={handleFilterChange}
                  placeholder="Sin tope"
                  type="text"
                  value={filters.maxPrice === 'all' ? '' : filters.maxPrice}
                />
                <datalist id="inventory-max-price-options">
                  <option value="">Sin tope</option>
                  {budgetOptions
                    .filter((option) => option.value !== '0')
                    .map((option) => (
                      <option key={`inv-max-${option.value}`} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                </datalist>
              </label>
            </div>
          </div>
        </section>

        <section className="inventory-section" ref={inventoryAnchorRef}>
          <div className="inventory-results-head edge-pad">
            <div>
              <span className="section-kicker">
                {selectedAuto ? 'Más opciones para ti' : 'Inventario disponible'}
              </span>
              <h2>
                {selectedAuto ? 'Continúa explorando' : 'Encuentra tu próximo auto'}
              </h2>
            </div>
            <span className="inventory-result-count">
              {remainingAutos.length} unidad(es)
            </span>
          </div>
          <CatalogGrid
            autos={remainingAutos}
            emptyMessage="No encontramos unidades con esa combinación de búsqueda."
            onSelect={handleSelectAuto}
            variant="inventory"
          />
        </section>

        <PublicSiteFooter
          {...demoCatalogContent.footer}
          brandName={brandName}
          brandSubmark={brandSubmark}
          email={tenant?.email_contacto ?? demoCatalogContent.footer.email}
          footerLogo={demoCatalogContent.logos.footer}
          slug={slug}
          variant="compact"
        />
      </main>
    </>
  );
}
