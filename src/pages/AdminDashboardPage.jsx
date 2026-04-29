import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Eye, LogOut, Plus } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTenantTheme } from '../styles/themeContext.jsx';
import { InventoryForm } from '../components/InventoryForm';
import { InventoryList } from '../components/InventoryList';
import { KpiSummary } from '../components/KpiSummary';
import { KpiChart } from '../components/KpiChart';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { expandDemoAutos } from '../lib/publicCatalogUtils.js';

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

function buildInventoryAging(autos) {
  const activeAutos = autos.filter((auto) => auto.estatus !== 'vendido');
  const now = Date.now();

  const countOlderThan = (days) =>
    activeAutos.filter((auto) => {
      if (!auto.created_at) {
        return false;
      }

      const ageInDays = (now - new Date(auto.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return ageInDays >= days;
    }).length;

  return [
    { label: '1 semana', autos: countOlderThan(7) },
    { label: '2 semanas', autos: countOlderThan(14) },
    { label: '4 semanas', autos: countOlderThan(28) },
    { label: '8 semanas', autos: countOlderThan(56) },
  ];
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

function applyDemoDashboardTimeline(autos, slug) {
  if (slug !== 'demo-lote-norte') {
    return autos;
  }

  const realAutos = autos.filter((auto) => {
    const id = String(auto?.id ?? '');
    return id !== 'demo-base' && !id.includes('-demo-');
  });

  const baseTimestamp = realAutos.length
    ? Math.max(
        ...realAutos
          .map((auto) => new Date(auto.created_at ?? Date.now()).getTime())
          .filter(Boolean),
      )
    : Date.now();

  const realOffsets = [0, 6, 13];
  const demoOffsets = [0, 30, 58, 84];

  let realIndex = 0;
  let demoIndex = 0;

  return autos.map((auto) => {
    const id = String(auto?.id ?? '');
    const isDemo = id === 'demo-base' || id.includes('-demo-');
    const offsets = isDemo ? demoOffsets : realOffsets;
    const pointer = isDemo ? demoIndex++ : realIndex++;
    const offsetDays = offsets[pointer] ?? offsets[offsets.length - 1] + (pointer - offsets.length + 1) * 14;

    return {
      ...auto,
      created_at: new Date(baseTimestamp - offsetDays * 24 * 60 * 60 * 1000).toISOString(),
    };
  });
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
            'id, marca, modelo, anio, version, precio, moneda, kilometraje, combustible, transmision, descripcion, ciudad, estado, estatus, imagenes, meta_tags, created_at',
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

  const dashboardAutos = useMemo(
    () => applyDemoDashboardTimeline(expandDemoAutos(autos, 6), slug),
    [autos, slug],
  );

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
      inventoryAging: buildInventoryAging(dashboardAutos),
      activityChart: normalizeMetrics(metrics),
    };
  }, [dashboardAutos, metrics]);

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
  const publishedAutos = dashboardAutos.filter((auto) => auto.estatus === 'disponible').length;
  const soldAutos = dashboardAutos.filter((auto) => auto.estatus === 'vendido').length;

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
            <div className="hero-copy stack-md">
              <span className="catalog-eyebrow">Panel protegido con Supabase y RLS</span>
              <h1 className="heading-lg">Dashboard de rendimiento de inventario y leads</h1>
              <p className="muted">
                Revisa el rendimiento del inventario, el interés comercial y la permanencia de
                cada unidad para rotar mejor el lote.
              </p>
            </div>
          </section>

          <section className="kpi-grid admin-kpi-grid">
            <KpiSummary
              helpText="Todas las unidades dadas de alta en el lote."
              title="Inventario Total"
              type="inventory"
              value={formatCompact(dashboardAutos.length)}
            />
            <KpiSummary
              helpText="Autos visibles hoy para cualquier visitante del sitio."
              title="Publicados"
              type="inventory"
              value={formatCompact(publishedAutos)}
            />
            <KpiSummary
              helpText="Visitas acumuladas a fichas durante la última semana."
              title="Vistas"
              type="views"
              value={formatCompact(summary.totalViews)}
            />
            <KpiSummary
              helpText="Clicks de intención comercial por WhatsApp."
              title="Leads WhatsApp"
              type="whatsapp"
              value={formatCompact(summary.totalWhatsapp)}
            />
            <KpiSummary
              helpText="Relación entre leads y vistas de detalle."
              title="Conversión"
              type="conversion"
              value={`${summary.conversion.toFixed(1)}%`}
            />
            <KpiSummary
              helpText="Unidades marcadas como vendidas en este lote."
              title="Vendidos"
              type="inventory"
              value={formatCompact(soldAutos)}
            />
          </section>

          <section className="dashboard-grid admin-insight-grid">
            <KpiChart
              data={summary.inventoryAging}
              subtitle="Unidades visibles en el dashboard que llevan al menos 1, 2, 4 y 8 semanas dentro del lote."
              title="Tiempo de inventario"
            />
            <KpiChart
              data={summary.activityChart}
              subtitle="Comparativo entre vistas de detalle e interesados por WhatsApp en los últimos 7 días."
              title="Actividad últimos 7 días"
              variant="line"
            />
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
            autos={dashboardAutos}
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
