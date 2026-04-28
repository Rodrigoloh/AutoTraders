import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import {
  Eye,
  LayoutDashboard,
  LogOut,
  Palette,
  Save,
  Smartphone,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useTenantTheme } from '../styles/themeContext.jsx';
import { InventoryForm } from '../components/InventoryForm';
import { InventoryList } from '../components/InventoryList';
import { KpiSummary } from '../components/KpiSummary';
import { KpiChart } from '../components/KpiChart';
import { BrandLogo } from '../components/BrandLogo.jsx';
import { inviteLoteUser, updateLoteMember } from '../lib/loteUsers';

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
  const [members, setMembers] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [sessionRole, setSessionRole] = useState('');
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    fullName: '',
    role: 'lote_editor',
  });
  const [contentForm, setContentForm] = useState({
    email_contacto: '',
    telefono: '',
    whatsapp: '',
    hero_title: '',
    hero_subtitle: '',
    intro_title: '',
    intro_body: '',
    about_title: '',
    about_body: '',
    contact_title: '',
    contact_body: '',
    powered_by_label: 'Powered by cobalto.blue',
  });

  const loadDashboard = async () => {
    if (!tenant?.id) {
      return;
    }

    setIsLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const [
      { data: autosData },
      { data: metricsData },
      { data: membersData },
      { data: profilesData },
      { data: loteData },
      { data: ownMembership },
    ] = await Promise.all([
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
      supabase
        .from('lote_usuarios')
        .select('id, user_id, role, created_at')
        .eq('lote_id', tenant.id)
        .order('created_at', { ascending: true }),
      supabase.from('profiles').select('id, email, full_name'),
      supabase
        .from('lotes')
        .select('email_contacto, telefono, whatsapp, config_contenido')
        .eq('id', tenant.id)
        .single(),
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
    setMembers(membersData ?? []);
    setProfiles(profilesData ?? []);
    setSessionRole(ownMembership?.role ?? '');
    setContentForm({
      email_contacto: loteData?.email_contacto ?? '',
      telefono: loteData?.telefono ?? '',
      whatsapp: loteData?.whatsapp ?? '',
      hero_title: loteData?.config_contenido?.hero_title ?? '',
      hero_subtitle: loteData?.config_contenido?.hero_subtitle ?? '',
      intro_title: loteData?.config_contenido?.intro_title ?? '',
      intro_body: loteData?.config_contenido?.intro_body ?? '',
      about_title: loteData?.config_contenido?.about_title ?? '',
      about_body: loteData?.config_contenido?.about_body ?? '',
      contact_title: loteData?.config_contenido?.contact_title ?? '',
      contact_body: loteData?.config_contenido?.contact_body ?? '',
      powered_by_label:
        loteData?.config_contenido?.powered_by_label ?? 'Powered by cobalto.blue',
    });
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

  const canManageLote = ['lote_admin', 'super_admin'].includes(sessionRole);
  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const handleInviteChange = (event) => {
    const { name, value } = event.target;
    setInviteForm((current) => ({ ...current, [name]: value }));
  };

  const handleContentChange = (event) => {
    const { name, value } = event.target;
    setContentForm((current) => ({ ...current, [name]: value }));
  };

  const handleInvite = async (event) => {
    event.preventDefault();
    setFeedback('');

    try {
      await inviteLoteUser({
        loteId: tenant.id,
        email: inviteForm.email,
        role: inviteForm.role,
        fullName: inviteForm.fullName,
        redirectTo: `${window.location.origin}/${slug}/admin/login`,
      });
      setInviteForm({ email: '', fullName: '', role: 'lote_editor' });
      setFeedback('Invitación enviada o usuario vinculado.');
      await loadDashboard();
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo invitar al usuario.');
    }
  };

  const handleMemberAction = async ({ userId, action, role }) => {
    setFeedback('');

    try {
      await updateLoteMember({
        loteId: tenant.id,
        userId,
        action,
        role,
      });
      setFeedback(action === 'remove_access' ? 'Acceso removido.' : 'Rol actualizado.');
      await loadDashboard();
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo actualizar el usuario.');
    }
  };

  const saveContent = async (event) => {
    event.preventDefault();
    setFeedback('');

    const payload = {
      email_contacto: contentForm.email_contacto || null,
      telefono: contentForm.telefono || null,
      whatsapp: contentForm.whatsapp || null,
      config_contenido: {
        hero_title: contentForm.hero_title,
        hero_subtitle: contentForm.hero_subtitle,
        intro_title: contentForm.intro_title,
        intro_body: contentForm.intro_body,
        about_title: contentForm.about_title,
        about_body: contentForm.about_body,
        contact_title: contentForm.contact_title,
        contact_body: contentForm.contact_body,
        powered_by_label: contentForm.powered_by_label,
        cta_primary_label: 'Ver inventario',
        cta_secondary_label: 'Hablar por WhatsApp',
      },
    };

    const { error } = await supabase.from('lotes').update(payload).eq('id', tenant.id);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setFeedback('Contenido del lote actualizado.');
    await loadDashboard();
  };

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
                  src={tenant?.config_estetica?.logo_url}
                  alt={`${tenant?.nombre ?? 'Lote'} logo`}
                  brand={tenant?.nombre ?? 'Lote Demo'}
                  submark="Panel del lote"
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
                  Administra inventario, usuarios y contenido sin salir del mismo flujo.
                </h1>
                <p className="muted">
                  El dashboard mantiene la demo para admins, pero ahora con una jerarquía más
                  clara para publicar unidades, mover leads y editar el look del lote.
                </p>
                <div className="admin-summary-strip">
                  <article className="admin-summary-card">
                    <strong>{autos.length}</strong>
                    <span>unidades registradas</span>
                  </article>
                  <article className="admin-summary-card">
                    <strong>{autos.filter((auto) => auto.estatus === 'disponible').length}</strong>
                    <span>disponibles</span>
                  </article>
                  <article className="admin-summary-card">
                    <strong>{autos.filter((auto) => auto.estatus === 'vendido').length}</strong>
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
                  <span className="muted">conversion reciente</span>
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
              <h2 className="heading-md">Sube unidades, revisa leads y ajusta el demo sin fricción.</h2>
              <p className="muted">
                El panel sigue siendo operativo para admins, pero con una lectura más amable y
                secciones mejor separadas para móvil y escritorio.
              </p>
              <div className="status-pill">{isLoading ? 'Sincronizando...' : 'Datos al día'}</div>
            </div>
          </section>

          <InventoryForm loteId={tenant?.id} onCreated={loadDashboard} />
          <InventoryList autos={autos} canDelete={canManageLote} onRefresh={loadDashboard} />
          {feedback ? <div className="panel-card muted">{feedback}</div> : null}
          {canManageLote ? (
            <section className="dashboard-grid">
              <form className="form-card stack-md" onSubmit={handleInvite}>
                <div className="inline-row">
                  <div>
                    <h2 className="heading-md">Invitar usuario del lote</h2>
                    <p className="muted">Da acceso a editores y visualizadores desde aquí.</p>
                  </div>
                  <UserPlus size={20} />
                </div>
                <div className="field">
                  <label htmlFor="invite-email">Email</label>
                  <input
                    id="invite-email"
                    name="email"
                    onChange={handleInviteChange}
                    required
                    type="email"
                    value={inviteForm.email}
                  />
                </div>
                <div className="field">
                  <label htmlFor="invite-full-name">Nombre</label>
                  <input
                    id="invite-full-name"
                    name="fullName"
                    onChange={handleInviteChange}
                    value={inviteForm.fullName}
                  />
                </div>
                <div className="field">
                  <label htmlFor="invite-role">Rol</label>
                  <select
                    id="invite-role"
                    name="role"
                    onChange={handleInviteChange}
                    value={inviteForm.role}
                  >
                    <option value="lote_editor">Lote Editor</option>
                    <option value="lote_viewer">Lote Viewer</option>
                    {sessionRole === 'super_admin' ? (
                      <option value="lote_admin">Lote Admin</option>
                    ) : null}
                  </select>
                </div>
                <button className="btn" type="submit">
                  <UserPlus size={18} />
                  Invitar usuario
                </button>
                <div className="stack-sm">
                  {members.map((member) => (
                    <div className="inventory-item" key={member.id}>
                      {/** lote_admin members are only manageable by super_admin. */}
                      <div className="inline-row">
                        <strong>
                          {profileMap.get(member.user_id)?.full_name ||
                            profileMap.get(member.user_id)?.email ||
                            member.user_id}
                        </strong>
                        <span className="status-pill">{member.role}</span>
                      </div>
                      <div className="inventory-actions">
                        {member.role === 'lote_admin' && sessionRole !== 'super_admin' ? (
                          <span className="status-pill">Solo superadmin</span>
                        ) : (
                          <>
                            <select
                              value={member.role}
                              onChange={(event) =>
                                handleMemberAction({
                                  userId: member.user_id,
                                  action: 'change_role',
                                  role: event.target.value,
                                })
                              }
                            >
                              {sessionRole === 'super_admin' || member.role === 'lote_admin' ? (
                                <option value="lote_admin">Lote Admin</option>
                              ) : null}
                              <option value="lote_editor">Lote Editor</option>
                              <option value="lote_viewer">Lote Viewer</option>
                            </select>
                            <button
                              className="btn-outline"
                              onClick={() =>
                                handleMemberAction({
                                  userId: member.user_id,
                                  action: 'remove_access',
                                })
                              }
                              type="button"
                            >
                              <Trash2 size={16} />
                              Quitar acceso
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </form>

              <form className="form-card stack-md" onSubmit={saveContent}>
                <div className="inline-row">
                  <div>
                    <h2 className="heading-md">Textos, contacto y look del lote</h2>
                    <p className="muted">
                      Aquí ajustas el copy visible en la demo. Los placeholders base viven en
                      <code> src/lib/demoCatalogContent.js</code>.
                    </p>
                  </div>
                  <Palette size={20} />
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="email_contacto">Email de contacto</label>
                    <input
                      id="email_contacto"
                      name="email_contacto"
                      onChange={handleContentChange}
                      type="email"
                      value={contentForm.email_contacto}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="telefono">Teléfono</label>
                    <input
                      id="telefono"
                      name="telefono"
                      onChange={handleContentChange}
                      value={contentForm.telefono}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="whatsapp">WhatsApp</label>
                    <input
                      id="whatsapp"
                      name="whatsapp"
                      onChange={handleContentChange}
                      value={contentForm.whatsapp}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="powered_by_label">Powered by</label>
                    <input
                      id="powered_by_label"
                      name="powered_by_label"
                      onChange={handleContentChange}
                      value={contentForm.powered_by_label}
                    />
                  </div>
                  <div className="field" data-span="full">
                    <label htmlFor="hero_title">Titulo principal del hero</label>
                    <input
                      id="hero_title"
                      name="hero_title"
                      onChange={handleContentChange}
                      value={contentForm.hero_title}
                    />
                  </div>
                  <div className="field" data-span="full">
                    <label htmlFor="hero_subtitle">Subtitulo del hero</label>
                    <textarea
                      id="hero_subtitle"
                      name="hero_subtitle"
                      onChange={handleContentChange}
                      value={contentForm.hero_subtitle}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="intro_title">Titulo de introduccion</label>
                    <input
                      id="intro_title"
                      name="intro_title"
                      onChange={handleContentChange}
                      value={contentForm.intro_title}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="about_title">Titulo de seccion informativa</label>
                    <input
                      id="about_title"
                      name="about_title"
                      onChange={handleContentChange}
                      value={contentForm.about_title}
                    />
                  </div>
                  <div className="field" data-span="full">
                    <label htmlFor="intro_body">Texto de introduccion</label>
                    <textarea
                      id="intro_body"
                      name="intro_body"
                      onChange={handleContentChange}
                      value={contentForm.intro_body}
                    />
                  </div>
                  <div className="field" data-span="full">
                    <label htmlFor="about_body">Texto de seccion informativa</label>
                    <textarea
                      id="about_body"
                      name="about_body"
                      onChange={handleContentChange}
                      value={contentForm.about_body}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="contact_title">Titulo de contacto</label>
                    <input
                      id="contact_title"
                      name="contact_title"
                      onChange={handleContentChange}
                      value={contentForm.contact_title}
                    />
                  </div>
                  <div className="field" data-span="full">
                    <label htmlFor="contact_body">Texto de contacto</label>
                    <textarea
                      id="contact_body"
                      name="contact_body"
                      onChange={handleContentChange}
                      value={contentForm.contact_body}
                    />
                  </div>
                </div>
                <button className="btn" type="submit">
                  <Save size={18} />
                  Guardar contenido
                </button>
              </form>
            </section>
          ) : null}
        </div>
      </main>
    </>
  );
}
