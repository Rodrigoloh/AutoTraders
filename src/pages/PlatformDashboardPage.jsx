import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { Building2, LogOut, PlusCircle, Shield, UserPlus, Users, Pencil, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { KpiSummary } from '../components/KpiSummary';
import { inviteLoteUser, updateLoteMember } from '../lib/loteUsers';

const initialLoteForm = {
  nombre: '',
  slug: '',
  whatsapp: '',
  telefono: '',
  emailContacto: '',
  adminEmail: '',
  adminFullName: '',
};

const initialMemberForm = {
  loteId: '',
  email: '',
  role: 'lote_editor',
  fullName: '',
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
        .select('id, nombre, slug, telefono, whatsapp, email_contacto, activo, created_at')
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
      email_contacto: loteForm.emailContacto || null,
      activo: true,
      config_estetica: {
        nombre_marca: loteForm.nombre,
      },
      config_contenido: {
        hero_title: `Explora ${loteForm.nombre}`,
        hero_subtitle: 'Seminuevos con atención rápida y contacto directo por WhatsApp.',
        intro_title: 'Catálogo listo para convertir',
        intro_body: 'Cada lote puede editar estos textos para presentar mejor su inventario.',
        about_title: 'Compra con claridad',
        about_body: 'Información simple, visual y orientada a cerrar conversaciones reales.',
        contact_title: 'Agenda una visita',
        contact_body: 'Escríbenos y recibe respuesta del equipo del lote.',
        cta_primary_label: 'Ver inventario',
        cta_secondary_label: 'Contactar por WhatsApp',
        powered_by_label: 'Powered by cobalto.blue',
      },
    };

    const { data, error } = await supabase.from('lotes').insert(payload).select('id, slug').single();

    if (error) {
      setFeedback(error.message);
      return;
    }

    if (loteForm.adminEmail) {
      try {
        await inviteLoteUser({
          loteId: data.id,
          email: loteForm.adminEmail,
          role: 'lote_admin',
          fullName: loteForm.adminFullName,
          redirectTo: `${window.location.origin}/${data.slug}/admin/login`,
        });
      } catch (inviteError) {
        setFeedback(
          `Lote creado, pero la invitación no se pudo enviar: ${inviteError.message ?? inviteError}`,
        );
        await loadPlatform();
        return;
      }
    }

    setLoteForm(initialLoteForm);
    setFeedback('Lote creado y flujo de invitación preparado.');
    await loadPlatform();
  };

  const assignUserToLote = async (event) => {
    event.preventDefault();
    setFeedback('');

    try {
      const lote = lotes.find((entry) => entry.id === memberForm.loteId);
      await inviteLoteUser({
        loteId: memberForm.loteId,
        email: memberForm.email,
        role: memberForm.role,
        fullName: memberForm.fullName,
        redirectTo: `${window.location.origin}/${lote?.slug ?? ''}/admin/login`,
      });
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo procesar la invitación.');
      return;
    }

    setMemberForm(initialMemberForm);
    setFeedback('Invitación procesada correctamente.');
    await loadPlatform();
  };

  const handleRoleChange = async (loteId, userId, role) => {
    setFeedback('');
    try {
      await updateLoteMember({
        loteId,
        userId,
        action: 'change_role',
        role,
      });
      setFeedback('Rol actualizado.');
      await loadPlatform();
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo actualizar el rol.');
    }
  };

  const handleRemoveAccess = async (loteId, userId) => {
    setFeedback('');
    try {
      await updateLoteMember({
        loteId,
        userId,
        action: 'remove_access',
      });
      setFeedback('Acceso removido.');
      await loadPlatform();
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo remover el acceso.');
    }
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
              <div className="field">
                <label htmlFor="lote-email-contacto">Email de contacto</label>
                <input
                  id="lote-email-contacto"
                  name="emailContacto"
                  onChange={handleLoteChange}
                  type="email"
                  value={loteForm.emailContacto}
                />
              </div>
              <div className="field">
                <label htmlFor="lote-admin-email">Email del gerente</label>
                <input
                  id="lote-admin-email"
                  name="adminEmail"
                  onChange={handleLoteChange}
                  type="email"
                  value={loteForm.adminEmail}
                />
              </div>
              <div className="field">
                <label htmlFor="lote-admin-full-name">Nombre del gerente</label>
                <input
                  id="lote-admin-full-name"
                  name="adminFullName"
                  onChange={handleLoteChange}
                  value={loteForm.adminFullName}
                />
              </div>
              <button className="btn" type="submit">
                <PlusCircle size={18} />
                Crear cliente e invitar admin
              </button>
            </form>

            <form className="form-card stack-md" onSubmit={assignUserToLote}>
              <div className="inline-row">
                <div>
                  <h2 className="heading-md">Asignar usuario</h2>
                  <p className="muted">Invita o reasigna usuarios dentro de cada lote.</p>
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
                <label htmlFor="member-full-name">Nombre</label>
                <input
                  id="member-full-name"
                  name="fullName"
                  onChange={handleMemberChange}
                  value={memberForm.fullName}
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
                  <option value="lote_editor">Lote Editor</option>
                  <option value="lote_viewer">Lote Viewer</option>
                  <option value="lote_admin">Lote Admin</option>
                </select>
              </div>
              <button className="btn" type="submit">
                <Users size={18} />
                Invitar / vincular usuario
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
                        <div className="stack-sm" key={member.id}>
                          <div className="inline-row muted">
                            <span>
                              {member.profile?.full_name || member.profile?.email || member.user_id}
                            </span>
                            <span>{member.role}</span>
                          </div>
                          <div className="inline-row">
                            <select
                              value={member.role}
                              onChange={(event) =>
                                handleRoleChange(lote.id, member.user_id, event.target.value)
                              }
                            >
                              <option value="lote_admin">Lote Admin</option>
                              <option value="lote_editor">Lote Editor</option>
                              <option value="lote_viewer">Lote Viewer</option>
                            </select>
                            <button
                              className="btn-outline"
                              onClick={() => handleRemoveAccess(lote.id, member.user_id)}
                              type="button"
                            >
                              <Trash2 size={16} />
                              Quitar acceso
                            </button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="muted">Sin usuarios asignados.</span>
                    )}
                  </div>
                  <div className="hero-actions">
                    <a className="btn" href={`/${lote.slug}/admin`}>
                      <Pencil size={16} />
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
