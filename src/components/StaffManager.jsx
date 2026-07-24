import { useState } from 'react';
import { LoaderCircle, Save, Trash2, UserPlus, UsersRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const emptyForm = { fullName: '', email: '', phone: '', role: 'lote_staff' };

export function StaffManager({ loteId, staff = [], onChanged }) {
  const [form, setForm] = useState(emptyForm);
  const [drafts, setDrafts] = useState({});
  const [feedback, setFeedback] = useState('');
  const [busyKey, setBusyKey] = useState('');

  const invokeUpdate = async (body) => {
    const { error } = await supabase.functions.invoke('update-lote-member', { body });
    if (error) throw error;
  };

  const invite = async (event) => {
    event.preventDefault();
    setFeedback('');
    setBusyKey('invite');
    const { error } = await supabase.functions.invoke('invite-lote-user', {
      body: {
        loteId,
        email: form.email,
        fullName: form.fullName,
        phone: form.phone,
        role: form.role,
        redirectTo: `${window.location.origin}/${window.location.pathname.split('/')[1]}/admin/login`,
      },
    });
    setBusyKey('');
    if (error) {
      setFeedback(error.message ?? 'No se pudo agregar al integrante.');
      return;
    }
    setForm(emptyForm);
    setFeedback('Integrante agregado. Si era una cuenta nueva, recibirá una invitación por correo.');
    await onChanged?.();
  };

  const updateProfile = async (member) => {
    const draft = drafts[member.user_id] ?? member;
    setBusyKey(`profile-${member.user_id}`);
    try {
      await invokeUpdate({
        loteId,
        userId: member.user_id,
        action: 'update_profile',
        fullName: draft.full_name,
        phone: draft.phone,
      });
      setFeedback('Datos del asesor actualizados.');
      await onChanged?.();
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo actualizar al asesor.');
    } finally {
      setBusyKey('');
    }
  };

  const changeRole = async (member, role) => {
    setBusyKey(`role-${member.user_id}`);
    try {
      await invokeUpdate({ loteId, userId: member.user_id, action: 'change_role', role });
      await onChanged?.();
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo cambiar el rol.');
    } finally {
      setBusyKey('');
    }
  };

  const removeAccess = async (member) => {
    if (!window.confirm(`¿Quitar el acceso de ${member.full_name || member.email}?`)) return;
    setBusyKey(`remove-${member.user_id}`);
    try {
      await invokeUpdate({ loteId, userId: member.user_id, action: 'remove_access' });
      setFeedback('Acceso retirado.');
      await onChanged?.();
    } catch (error) {
      setFeedback(error.message ?? 'No se pudo retirar el acceso.');
    } finally {
      setBusyKey('');
    }
  };

  const patchDraft = (member, field, value) => {
    setDrafts((current) => ({
      ...current,
      [member.user_id]: { ...member, ...current[member.user_id], [field]: value },
    }));
  };

  return (
    <section className="panel-card stack-md">
      <div>
        <h2 className="heading-md">Equipo y asesores</h2>
        <p className="muted">
          Agrega staff, registra su WhatsApp y luego asigna sus vehículos desde el inventario.
        </p>
      </div>
      <form className="form-grid" onSubmit={invite}>
        <div className="field">
          <label htmlFor="staff-name">Nombre</label>
          <input id="staff-name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="staff-email">Correo</label>
          <input id="staff-email" required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="staff-phone">WhatsApp / teléfono</label>
          <input id="staff-phone" required type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor="staff-role">Permiso</label>
          <select id="staff-role" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="lote_staff">Staff</option>
            <option value="lote_editor">Editor</option>
          </select>
        </div>
        <button className="btn" disabled={busyKey === 'invite'} type="submit">
          {busyKey === 'invite' ? <LoaderCircle className="spin" size={17} /> : <UserPlus size={17} />}
          Agregar al equipo
        </button>
      </form>
      {feedback ? <div className="form-feedback panel-card">{feedback}</div> : null}
      {!staff.length ? <div className="empty-state">Todavía no hay staff registrado.</div> : null}
      <div className="team-grid">
        {staff.map((member) => {
          const draft = drafts[member.user_id] ?? member;
          return (
            <article className="inventory-item stack-md" key={member.user_id}>
              <span className="tenant-badge"><UsersRound size={16} />{member.email}</span>
              <div className="field">
                <label htmlFor={`member-name-${member.user_id}`}>Nombre</label>
                <input id={`member-name-${member.user_id}`} value={draft.full_name ?? ''} onChange={(e) => patchDraft(member, 'full_name', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`member-phone-${member.user_id}`}>Teléfono</label>
                <input id={`member-phone-${member.user_id}`} value={draft.phone ?? ''} onChange={(e) => patchDraft(member, 'phone', e.target.value)} />
              </div>
              <div className="field">
                <label htmlFor={`member-role-${member.user_id}`}>Rol</label>
                <select id={`member-role-${member.user_id}`} value={member.role} onChange={(e) => changeRole(member, e.target.value)}>
                  <option value="lote_staff">Staff</option>
                  <option value="lote_editor">Editor</option>
                </select>
              </div>
              <div className="inventory-actions">
                <button className="btn-soft" disabled={busyKey === `profile-${member.user_id}`} onClick={() => updateProfile(member)} type="button">
                  <Save size={16} /> Guardar datos
                </button>
                <button className="btn-outline" disabled={busyKey === `remove-${member.user_id}`} onClick={() => removeAccess(member)} type="button">
                  <Trash2 size={16} /> Quitar acceso
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
