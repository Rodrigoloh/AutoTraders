import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Eye, LayoutDashboard, LogOut, Plus, Smartphone } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTenantTheme } from '../styles/themeContext.jsx';
import { InventoryForm } from '../components/InventoryForm';
import { InventoryList } from '../components/InventoryList';
import { KpiSummary } from '../components/KpiSummary';
import { KpiChart } from '../components/KpiChart';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';

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
  const [sessionRole, setSessionRole] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const loadDashboard = async () => {
    if (!tenant?.id) {
      return;
    }

    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const [{ data: autosData }, { data: metricsData }, { data: ownMembership }] =
      await Promise.all([
        supabase
          .from('inventario')
          .select(
            'id, marca, modelo, anio, version, precio, moneda, kilometraje, combustible, transmision, descripcion, ciudad, estado, estatus, imagenes, meta_tags',
          )
          .eq('lote_id', tenant.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('metricas')
          .select('fecha, vistas_totales, interesados_whatsapp')
          .eq('lote_id', tenant.id)
          .gte('fecha', getLast7DaysRange())
          .order('fecha', { ascending: true }),
        session?.user.app_metadata?.platform_role === 'super_admin'
          ? Promise.resolve({ data: { role: 'super_admin' } })
          : supabase
              .from('lote_usuarios')
              .select('role')
              .eq('lote_id', tenant.id)
              .eq('user_id', session?.user.id ?? '')
              .maybeSingle(),
      ]);

    setAutos(autosData ?? []);
    setMetrics(metricsData ?? []);
    setSessionRole(ownMembership?.role ?? '');
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

  const handleCreated = async () => {
    setFeedback('Auto cargado correctamente.');
    setIsCreateOpen(false);
    await loadDashboard();
  };

  const canManageInventory = ['lote_admin', 'lote_editor', 'super_admin'].includes(sessionRole);
  const publishedAutos = autos.filter((auto) => auto.estatus === 'disponible').length;
  const soldAutos = autos.filter((auto) => auto.estatus === 'vendido').length;

  return (
    <>
      <Helmet>
        <title>{tenant?.nombre ?? 'Lote'} | Dashboard</title>
      </Helmet>
      <main className="app-shell">
        <div className="container stack-lg">
          <section className="hero-card admin-hero-card">
            <div className="tenant-topbar admin-topbar">
              <div className="admin-brand-lockup">
                <BrandLogo
                  src={demoCatalogContent.logos.header}
                  alt={`${tenant?.nombre ?? 'Lote'} logo`}
                  brand={tenant?.nombre ?? demoCatalogContent.brand.wordmark}
                  submark="Panel de inventario"
                  className="admin-brand-image"
                  compact
                />
                <div className="stack-sm" style={{ gap: 4 }}>
                  <strong>{tenant?.nombre}</strong>
                  <span className="muted">Dashboard operativo del lote</span>
                </div>
              </div>
              <div className="admin-topbar-actions">
                <a className="btn-outline" href={`/${slug}`} target="_blank" rel="noreferrer">
                  <Eye size={18} />
                  Ver demo publica
                </a>
                <button className="btn-outline" onClick={handleLogout} type="button">
                  <LogOut size={18} />
                  Salir
                </button>
              </div>
            </div>
            <div className="hero-grid admin-hero-grid">
              <div className="hero-copy stack-md">
                <span className="catalog-eyebrow">Panel protegido con Supabase y RLS</span>
                <h1 className="heading-lg">
                  Controla el inventario, las fotos y las fichas del lote desde un mismo panel.
                </h1>
                <p className="muted">
                  Aquí el equipo solo opera autos: publica nuevas unidades, ajusta textos de
                  tarjetas, actualiza specs y ordena las imágenes que ve el cliente.
                </p>
                <div className="admin-summary-strip">
                  <article className="admin-summary-card">
                    <strong>{autos.length}</strong>
                    <span>unidades registradas</span>
                  </article>
                  <article className="admin-summary-card">
                    <strong>{publishedAutos}</strong>
                    <span>visibles al público</span>
                  </article>
                  <article className="admin-summary-card">
                    <strong>{soldAutos}</strong>
                    <span>vendidos</span>
                  </article>
                </div>
              </div>
              <div className="panel-card admin-side-panel stack-sm">
                <span className="tenant-badge">
                  <LayoutDashboard size={18} />
                  Vista general del lote
                </span>
                <div className="inline-row">
                  <strong>{formatCompact(summary.totalViews)}</strong>
                  <span className="muted">vistas acumuladas</span>
                </div>
                <div className="inline-row">
                  <strong>{formatCompact(summary.totalWhatsapp)}</strong>
                  <span className="muted">leads por WhatsApp</span>
                </div>
                <div className="inline-row">
                  <strong>{summary.conversion.toFixed(1)}%</strong>
                  <span className="muted">conversión reciente</span>
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
                Flujo diario del equipo
              </span>
              <h2 className="heading-md">Todo el trabajo del lote pasa por inventario.</h2>
              <p className="muted">
                La gestión de usuarios queda fuera de este panel. Los textos del sitio y logos
                públicos se editan directamente en código.
              </p>
              <div className="stack-sm">
                <div className="muted">
                  Textos públicos: <code>src/lib/demoCatalogContent.js</code>
                </div>
                <div className="muted">
                  Logos públicos: <code>public/branding/demo-lote/logo-light.svg</code> y{' '}
                  <code>public/branding/demo-lote/logo-dark.svg</code>
                </div>
              </div>
              <div className="status-pill">{isLoading ? 'Sincronizando...' : 'Datos al día'}</div>
            </div>
          </section>

          <section className="panel-card stack-md">
            <div className="inline-row" style={{ justifyContent: 'space-between' }}>
              <div className="stack-sm" style={{ gap: 4 }}>
                <h2 className="heading-md">Inventario del lote</h2>
                <p className="muted">
                  Carga nuevas unidades y edita modelo, versión, descripción, specs e imágenes.
                </p>
              </div>
              {canManageInventory ? (
                <button className="btn" onClick={() => setIsCreateOpen((current) => !current)} type="button">
                  <Plus size={18} />
                  {isCreateOpen ? 'Cerrar alta' : 'Cargar nuevo auto'}
                </button>
              ) : null}
            </div>
            {feedback ? <div className="muted">{feedback}</div> : null}
            {isCreateOpen && canManageInventory ? (
              <InventoryForm loteId={tenant?.id} onCreated={handleCreated} />
            ) : null}
          </section>

          <InventoryList
            autos={autos}
            canEdit={canManageInventory}
            canManageImages={canManageInventory}
            loteId={tenant?.id}
            onRefresh={loadDashboard}
          />
        </div>
      </main>
    </>
  );
}
