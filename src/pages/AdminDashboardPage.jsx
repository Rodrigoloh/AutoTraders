import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { LayoutDashboard, LogOut, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTenantTheme } from '../styles/themeContext.jsx';
import { InventoryForm } from '../components/InventoryForm';
import { InventoryList } from '../components/InventoryList';
import { KpiSummary } from '../components/KpiSummary';
import { KpiChart } from '../components/KpiChart';

function formatCompact(number) {
  return new Intl.NumberFormat('es-MX', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(number ?? 0));
}

function getLast7DaysRange() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date.toISOString().slice(0, 10);
}

function normalizeMetrics(metrics) {
  const byDate = new Map();

  for (let index = 6; index >= 0; index -= 1) {
    const date = new Date();
    date.setDate(date.getDate() - index);
    const isoDate = date.toISOString().slice(0, 10);

    byDate.set(isoDate, {
      date: isoDate,
      label: date.toLocaleDateString('es-MX', { weekday: 'short' }),
      visitas: 0,
      whatsapp: 0,
    });
  }

  metrics.forEach((row) => {
    const bucket = byDate.get(row.fecha);

    if (!bucket) {
      return;
    }

    bucket.visitas += Number(row.vistas_totales ?? 0);
    bucket.whatsapp += Number(row.interesados_whatsapp ?? 0);
  });

  return Array.from(byDate.values());
}

export function AdminDashboardPage() {
  const { tenant, slug } = useTenantTheme();
  const [autos, setAutos] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboard = async () => {
    if (!tenant?.id) {
      return;
    }

    setIsLoading(true);

    const [{ data: autosData }, { data: metricsData }] = await Promise.all([
      supabase
        .from('inventario')
        .select('id, marca, modelo, anio, version, precio, moneda, ciudad, estado, estatus, imagenes')
        .eq('lote_id', tenant.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('metricas')
        .select('fecha, vistas_totales, interesados_whatsapp')
        .eq('lote_id', tenant.id)
        .gte('fecha', getLast7DaysRange())
        .order('fecha', { ascending: true }),
    ]);

    setAutos(autosData ?? []);
    setMetrics(metricsData ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadDashboard();
  }, [tenant?.id]);

  const summary = useMemo(() => {
    const totalViews = metrics.reduce((sum, row) => sum + Number(row.vistas_totales ?? 0), 0);
    const totalWhatsapp = metrics.reduce(
      (sum, row) => sum + Number(row.interesados_whatsapp ?? 0),
      0,
    );
    const conversion = totalViews > 0 ? (totalWhatsapp / totalViews) * 100 : 0;

    return {
      totalViews,
      totalWhatsapp,
      conversion,
      chart: normalizeMetrics(metrics),
    };
  }, [metrics]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.assign(`/${slug}/admin/login`);
  };

  return (
    <>
      <Helmet>
        <title>{tenant?.nombre ?? 'Lote'} | Dashboard</title>
      </Helmet>
      <main className="app-shell">
        <div className="container stack-lg">
          <section className="hero-card">
            <div className="tenant-topbar">
              <div className="tenant-badge">
                <div className="tenant-logo" />
                <div className="stack-sm" style={{ gap: 4 }}>
                  <strong>{tenant?.nombre}</strong>
                  <span className="muted">Lote admin</span>
                </div>
              </div>
              <button className="btn-outline" onClick={handleLogout} type="button">
                <LogOut size={18} />
                Salir
              </button>
            </div>
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="eyebrow">Panel protegido por Supabase RLS</span>
                <h1 className="heading-lg">
                  Opera anuncios, seguimiento comercial y SEO desde un solo lugar.
                </h1>
                <p className="muted">
                  Esta base está pensada para lotes que publican desde el piso de ventas y
                  necesitan respuesta rápida en móvil.
                </p>
              </div>
              <div className="panel-card stack-sm">
                <span className="tenant-badge">
                  <LayoutDashboard size={18} />
                  Resumen del lote
                </span>
                <div className="inline-row">
                  <strong>{autos.length}</strong>
                  <span className="muted">autos totales</span>
                </div>
                <div className="inline-row">
                  <strong>{autos.filter((auto) => auto.estatus === 'disponible').length}</strong>
                  <span className="muted">disponibles</span>
                </div>
                <div className="inline-row">
                  <strong>{autos.filter((auto) => auto.estatus === 'vendido').length}</strong>
                  <span className="muted">vendidos</span>
                </div>
              </div>
            </div>
          </section>

          <section className="kpi-grid">
            <KpiSummary
              helpText="Suma de visitas de detalle en la última semana."
              title="Vistas Totales"
              type="views"
              value={formatCompact(summary.totalViews)}
            />
            <KpiSummary
              helpText="Clicks de intención comercial por WhatsApp."
              title="Interesados (WhatsApp)"
              type="whatsapp"
              value={formatCompact(summary.totalWhatsapp)}
            />
            <KpiSummary
              helpText="Interesados / vistas de detalle."
              title="Tasa de Conversión"
              type="conversion"
              value={`${summary.conversion.toFixed(1)}%`}
            />
          </section>

          <section className="dashboard-grid">
            <KpiChart data={summary.chart} />
            <div className="panel-card stack-md">
              <span className="tenant-badge">
                <Smartphone size={18} />
                Flujo mobile-first
              </span>
              <h2 className="heading-md">Carga autos y publica sin depender de escritorio.</h2>
              <p className="muted">
                El panel está optimizado para operar desde celular, con acciones rápidas y
                formularios compactos.
              </p>
              <div className="status-pill">{isLoading ? 'Sincronizando...' : 'Datos al día'}</div>
            </div>
          </section>

          <InventoryForm loteId={tenant?.id} onCreated={loadDashboard} />
          <InventoryList autos={autos} onRefresh={loadDashboard} />
        </div>
      </main>
    </>
  );
}
