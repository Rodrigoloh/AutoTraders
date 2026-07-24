import { useCallback, useEffect, useState } from 'react';
import { CarFront, CheckCircle2, Image, Phone, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const statusLabels = {
  new: 'Nuevo',
  reviewing: 'En revisión',
  contacted: 'Contactado',
  qualified: 'Calificado',
  won: 'Ganado',
  lost: 'Perdido',
  rejected: 'Rechazado',
};

const nextStatusOptions = {
  new: ['reviewing', 'contacted', 'rejected'],
  reviewing: ['contacted', 'qualified', 'rejected'],
  contacted: ['qualified', 'lost', 'rejected'],
  qualified: ['won', 'lost'],
};

function formatMoney(value) {
  if (value === null || value === undefined) return 'Sin expectativa';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

export function SaleLeadManager({ isAdmin, loteId, onChanged, staffOptions = [] }) {
  const [leads, setLeads] = useState([]);
  const [photoUrls, setPhotoUrls] = useState({});
  const [feedback, setFeedback] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const loadLeads = useCallback(async () => {
    if (!loteId) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from('sale_leads')
      .select(
        'id, assigned_staff_id, status, contact_name, contact_phone, contact_email, preferred_contact, marca, modelo, anio, version, kilometraje, precio_esperado, ciudad, estado, descripcion, photo_paths, created_at',
      )
      .eq('lote_id', loteId)
      .order('created_at', { ascending: false });

    if (error) {
      setFeedback(error.message);
      setLeads([]);
      setIsLoading(false);
      return;
    }

    setLeads(data ?? []);
    const paths = (data ?? []).flatMap((lead) => lead.photo_paths ?? []);

    if (paths.length) {
      const { data: signedData } = await supabase.storage
        .from('sale-lead-media')
        .createSignedUrls(paths, 3600);
      const urlMap = {};

      signedData?.forEach((entry, index) => {
        if (entry.signedUrl) urlMap[paths[index]] = entry.signedUrl;
      });

      setPhotoUrls(urlMap);
    } else {
      setPhotoUrls({});
    }

    setIsLoading(false);
  }, [loteId]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const assignLead = async (leadId, staffId) => {
    setFeedback('');
    const { error } = await supabase.rpc('assign_sale_lead_staff', {
      target_lead_id: leadId,
      target_staff_id: staffId || null,
    });

    if (error) {
      setFeedback(error.message);
      return;
    }

    await loadLeads();
    await onChanged?.();
  };

  const updateStatus = async (leadId, status) => {
    setFeedback('');
    const { error } = await supabase.rpc('update_sale_lead_status', {
      target_lead_id: leadId,
      target_status: status,
      status_note: null,
    });

    if (error) {
      setFeedback(error.message);
      return;
    }

    await loadLeads();
    await onChanged?.();
  };

  return (
    <section className="panel-card stack-md">
      <div>
        <h2 className="heading-md">Leads para vender un auto</h2>
        <p className="muted">
          {isAdmin
            ? 'Vista completa del lote. Asigna cada solicitud a un miembro de staff.'
            : 'Sólo aparecen las solicitudes que tienes asignadas.'}
        </p>
      </div>
      {feedback ? <div className="panel-card muted">{feedback}</div> : null}
      {isLoading ? <div className="loading-state">Cargando leads...</div> : null}
      {!isLoading && !leads.length ? (
        <div className="empty-state">No hay leads asignados en este momento.</div>
      ) : null}
      <div className="lead-grid">
        {leads.map((lead) => (
          <article className="inventory-item stack-md" key={lead.id}>
            <div className="inline-row">
              <span className="tenant-badge">
                <CarFront size={16} />
                {lead.marca} {lead.modelo} {lead.anio}
              </span>
              <span className="status-pill" data-status={lead.status}>
                {statusLabels[lead.status] ?? lead.status}
              </span>
            </div>
            <div className="stack-sm">
              <span className="inline-row">
                <UserRound size={16} />
                <strong>{lead.contact_name}</strong>
              </span>
              {lead.contact_phone ? (
                <a className="muted inline-row" href={`tel:${lead.contact_phone}`}>
                  <Phone size={16} />
                  {lead.contact_phone}
                </a>
              ) : null}
              {lead.contact_email ? (
                <a className="muted" href={`mailto:${lead.contact_email}`}>
                  {lead.contact_email}
                </a>
              ) : null}
            </div>
            <div className="muted">
              {lead.kilometraje ? `${Number(lead.kilometraje).toLocaleString('es-MX')} km · ` : ''}
              {formatMoney(lead.precio_esperado)}
            </div>
            {lead.descripcion ? <p className="muted">{lead.descripcion}</p> : null}
            {lead.photo_paths?.length ? (
              <div className="lead-photo-strip">
                {lead.photo_paths.map((path, index) => (
                  photoUrls[path] ? (
                    <a href={photoUrls[path]} key={path} rel="noreferrer" target="_blank">
                      <img
                        alt={`${lead.marca} ${lead.modelo}, foto ${index + 1}`}
                        src={photoUrls[path]}
                      />
                    </a>
                  ) : null
                ))}
              </div>
            ) : (
              <span className="muted inline-row"><Image size={16} /> Sin fotos disponibles</span>
            )}
            {isAdmin ? (
              <div className="field">
                <label htmlFor={`lead-staff-${lead.id}`}>Staff asignado</label>
                <select
                  id={`lead-staff-${lead.id}`}
                  onChange={(event) => assignLead(lead.id, event.target.value)}
                  value={lead.assigned_staff_id ?? ''}
                >
                  <option value="">Sin asignar</option>
                  {staffOptions.map((staff) => (
                    <option key={staff.user_id} value={staff.user_id}>
                      {staff.full_name || staff.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="inventory-actions">
              {(nextStatusOptions[lead.status] ?? []).map((status) => (
                <button
                  className={status === 'won' ? 'btn' : 'btn-soft'}
                  key={`${lead.id}-${status}`}
                  onClick={() => updateStatus(lead.id, status)}
                  type="button"
                >
                  <CheckCircle2 size={16} />
                  {statusLabels[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
