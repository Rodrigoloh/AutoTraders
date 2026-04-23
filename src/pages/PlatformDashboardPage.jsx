import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Building2, LogOut, PlusCircle, Shield, UserPlus, Users } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { KpiSummary } from '../components/KpiSummary';

const initialLoteForm = {
  nombre: '',
  slug: '',
  whatsapp: '',
  telefono: '',
};

const initialMemberForm = {
  loteId: '',
  email: '',
  role: 'lote_admin',
};

function slugify(value) {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

export function PlatformDashboardPage() {
  const [lotes, setLotes] = useState([]);
  const [memberships, setMemberships] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [metrics, setMetrics] = useState([]);
  const [loteForm, setLoteForm] = useState(initialLoteForm);
  const [memberForm, setMemberForm] = useState(initialMemberForm);
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState('');

  const loadPlatform = async () => {
    setIsLoading(true);

    const [
      { data: lotesData },
      { data: membershipsData },
      { data: profilesData },
      { data: inventoryData },
      { data: metricsData },
    ] = await Promise.all([
      supabase
        .from('lotes')
        .select('id, nombre, slug, telefono, whatsapp, activo, created_at')
        .order('created_at', { ascending: false }),
      supabase
        .from('lote_usuarios')
        .select('id, lote_id, user_id, role, created_at')
        .order('created_at', { ascending: true }),
      supabase
        .from('profiles')
        .select('id, email, full_name')
        .order('created_at', { ascending: true }),
      supabase
        .from('inventario')
        .select('id, lote_id, estatus'),
      supabase
        .from('metricas')
        .select('lote_id, vistas_totales, interesados_whatsapp'),
    ]);

    setLotes(lotesData ?? []);
    setMemberships(membershipsData ?? []);
    setProfiles(profilesData ?? []);
    setInventory(inventoryData ?? []);
    setMetrics(metricsData ?? []);
    setIsLoading(false);
  };

  useEffect(() => {
    loadPlatform();
  }, []);

  const profileMap = useMemo(
    () => new Map(profiles.map((profile) => [profile.id, profile])),
    [profiles],
  );

  const lotesEnriched = useMemo(() => {
    return lotes.map((lote) => {
      const loteInventory = inventory.filter((auto) => auto.lote_id === lote.id);
      const loteMemberships = memberships
        .filter((membership) => membership.lote_id === lote.id)
        .map((membership) => ({
          ...membership,
          profile: profileMap.get(membership.user_id) ?? null,
        }));
      const loteMetrics = metrics.filter((metric) => metric.lote_id === lote.id);

      return {
        ...lote,
        autosTotal: loteInventory.length,
        autosDisponibles: loteInventory.filter((auto) => auto.estatus === 'disponible').length,
        members: loteMemberships,
        views: loteMetrics.reduce((sum, row) => sum + Number(row.vistas_totales ?? 0), 0),
        leads: loteMetrics.reduce(
          (sum, row) => sum + Number(row.interesados_whatsapp ?? 0),
          0,
        ),
      };
    });
  }, [inventory, lotes, memberships, metrics, profileMap]);

  const summary = useMemo(() => {
    return {
      clients: lotes.length,
      users: memberships.length,
      autos: inventory.length,
    };
  }, [inventory.length, lotes.length, memberships.length]);

  const handleLoteChange = (event) => {
    const { name, value } = event.target;
    setLoteForm((current) => {
      if (name === 'nombre') {
        return {
          ...current,
          nombre: value,
          slug: current.slug ? current.slug : slugify(value),
        };
      }

      return { ...current, [name]: value };
    });
  };

  const handleMemberChange = (event) => {
    const { name, value } = event.target;
    setMemberForm((current) => ({ ...current, [name]: value }));
  };

  const createLote = async (event) => {
    event.preventDefault();
    setFeedback('');

    const payload = {
      nombre: loteForm.nombre,
      slug: slugify(loteForm.slug || loteForm.nombre),
      whatsapp: loteForm.whatsapp || null,
      telefono: loteForm.telefono || null,
      activo: true,
      config_estetica: {
        nombre_marca: loteForm.nombre,
      },
    };

    const { error } = await supabase.from('lotes').insert(payload);

    if (error) {
      setFeedback(error.message);
      return;
    }

    setLoteForm(initialLoteForm);
    setFeedback('Lote creado.');
    await loadPlatform();
  };

  const assignUserToLote = async (event) => {
    event.preventDefault();
    setFeedback('');

    const profile = profiles.find(
      (candidate) => candidate.email?.toLowerCase() === memberForm.email.toLowerCase(),
    );

    if (!profile) {
      setFeedback('Ese correo no existe en profiles. Debe registrarse primero en Auth.');
      return;
    }

    const { error } = await supabase.from('lote_usuarios').upsert(
      {
        lote_id: memberForm.loteId,
        user_id: profile.id,
        role: memberForm.role,
      },
      { onConflict: 'lote_id,user_id' },
    );

    if (error) {
      setFeedback(error.message);
      return;
    }

    setMemberForm(initialMemberForm);
    setFeedback('Usuario asignado al lote.');
    await loadPlatform();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.assign('/platform/login');
  };

  return (
    <>
      <Helmet>
        <title>Platform | Dashboard</title>
      </Helmet>
      <main className="app-shell">
        <div className="container stack-lg">
          <section className="hero-card">
            <div className="tenant-topbar">
              <div className="tenant-badge">
                <Shield size={18} />
                Plataforma multi-tenant
              </div>
              <button className="btn-outline" onClick={handleLogout} type="button">
                <LogOut size={18} />
                Salir
              </button>
            </div>
            <div className="hero-grid">
              <div className="hero-copy">
                <span className="eyebrow">Superadmin central</span>
                <h1 className="heading-lg">
                  Administra clientes, usuarios y lotes aislados desde un solo panel.
                </h1>
                <p className="muted">
                  Cada lote conserva su propio inventario, métricas, branding y usuarios; la
                  plataforma solo centraliza operación y supervisión.
                </p>
              </div>
              <div className="panel-card stack-sm">
                <span className="tenant-badge">
                  <Building2 size={18} />
                  Estado global
                </span>
                <div className="inline-row">
                  <strong>{isLoading ? '...' : summary.clients}</strong>
                  <span className="muted">clientes</span>
                </div>
                <div className="inline-row">
                  <strong>{isLoading ? '...' : summary.users}</strong>
                  <span className="muted">usuarios asignados</span>
                </div>
                <div className="inline-row">
                  <strong>{isLoading ? '...' : summary.autos}</strong>
                  <span className="muted">autos totales</span>
                </div>
              </div>
            </div>
          </section>

          <section className="kpi-grid">
            <KpiSummary
              title="Clientes"
              type="views"
              value={summary.clients}
              helpText="Número total de lotes/tenants activos en la plataforma."
            />
            <KpiSummary
              title="Usuarios"
              type="whatsapp"
              value={summary.users}
              helpText="Usuarios vinculados a tenants mediante lote_usuarios."
            />
            <KpiSummary
              title="Inventario Global"
              type="conversion"
              value={summary.autos}
              helpText="Conteo agregado de autos publicados y administrados."
            />
          </section>

          <section className="dashboard-grid">
            <form className="form-card stack-md" onSubmit={createLote}>
              <div className="inline-row">
                <div>
                  <h2 className="heading-md">Crear lote</h2>
                  <p className="muted">Nuevo cliente, slug y branding base.</p>
                </div>
                <PlusCircle size={20} />
              </div>
              <div className="field">
                <label htmlFor="lote-nombre">Nombre</label>
                <input
                  id="lote-nombre"
                  name="nombre"
                  onChange={handleLoteChange}
                  required
                  value={loteForm.nombre}
                />
              </div>
              <div className="field">
                <label htmlFor="lote-slug">Slug</label>
                <input
                  id="lote-slug"
                  name="slug"
                  onChange={handleLoteChange}
                  required
                  value={loteForm.slug}
                />
              </div>
              <div className="field">
                <label htmlFor="lote-whatsapp">WhatsApp</label>
                <input
                  id="lote-whatsapp"
                  name="whatsapp"
                  onChange={handleLoteChange}
                  value={loteForm.whatsapp}
                />
              </div>
              <div className="field">
                <label htmlFor="lote-telefono">Teléfono</label>
                <input
                  id="lote-telefono"
                  name="telefono"
                  onChange={handleLoteChange}
                  value={loteForm.telefono}
                />
              </div>
              <button className="btn" type="submit">
                <PlusCircle size={18} />
                Crear cliente
              </button>
            </form>

            <form className="form-card stack-md" onSubmit={assignUserToLote}>
              <div className="inline-row">
                <div>
                  <h2 className="heading-md">Asignar usuario</h2>
                  <p className="muted">Vincula cuentas existentes a un tenant.</p>
                </div>
                <UserPlus size={20} />
              </div>
              <div className="field">
                <label htmlFor="member-lote">Lote</label>
                <select
                  id="member-lote"
                  name="loteId"
                  onChange={handleMemberChange}
                  required
                  value={memberForm.loteId}
                >
                  <option value="">Selecciona un lote</option>
                  {lotes.map((lote) => (
                    <option key={lote.id} value={lote.id}>
                      {lote.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="member-email">Email del usuario</label>
                <input
                  id="member-email"
                  name="email"
                  onChange={handleMemberChange}
                  required
                  type="email"
                  value={memberForm.email}
                />
              </div>
              <div className="field">
                <label htmlFor="member-role">Rol</label>
                <select
                  id="member-role"
                  name="role"
                  onChange={handleMemberChange}
                  value={memberForm.role}
                >
                  <option value="lote_admin">Lote Admin</option>
                  <option value="lote_editor">Lote Editor</option>
                  <option value="lote_viewer">Lote Viewer</option>
                </select>
              </div>
              <button className="btn" type="submit">
                <Users size={18} />
                Vincular usuario
              </button>
            </form>
          </section>

          {feedback ? <div className="panel-card muted">{feedback}</div> : null}

          <section className="stack-md">
            <div>
              <h2 className="heading-lg">Clientes</h2>
              <p className="muted">Vista consolidada con acceso rápido a cada tenant.</p>
            </div>
            <div className="catalog-grid">
              {lotesEnriched.map((lote) => (
                <article className="panel-card stack-md" key={lote.id}>
                  <div className="inline-row">
                    <div>
                      <strong>{lote.nombre}</strong>
                      <div className="muted">/{lote.slug}</div>
                    </div>
                    <span className="status-pill">{lote.activo ? 'activo' : 'inactivo'}</span>
                  </div>
                  <div className="inline-row">
                    <span className="muted">{lote.autosTotal} autos</span>
                    <span className="muted">{lote.autosDisponibles} disponibles</span>
                  </div>
                  <div className="inline-row">
                    <span className="muted">{lote.views} vistas</span>
                    <span className="muted">{lote.leads} interesados</span>
                  </div>
                  <div className="stack-sm">
                    <strong>Usuarios</strong>
                    {lote.members.length ? (
                      lote.members.map((member) => (
                        <div className="inline-row muted" key={member.id}>
                          <span>
                            {member.profile?.full_name || member.profile?.email || member.user_id}
                          </span>
                          <span>{member.role}</span>
                        </div>
                      ))
                    ) : (
                      <span className="muted">Sin usuarios asignados.</span>
                    )}
                  </div>
                  <div className="hero-actions">
                    <a className="btn" href={`/${lote.slug}/admin`}>
                      Entrar al lote
                    </a>
                    <a className="btn-outline" href={`/${lote.slug}`} target="_blank" rel="noreferrer">
                      Ver catálogo
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
