import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, MessageCircleMore, Phone, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const labels = {
  whatsapp_opened: 'WhatsApp abierto',
  contacted: 'Contactado',
  qualified: 'Calificado',
  won: 'Ganado',
  lost: 'Perdido',
};

const intentLabels = {
  reserve: 'Reserva',
  test_drive: 'Prueba de manejo',
  contact: 'Información',
};

export function BuyerLeadManager({ loteId }) {
  const [leads, setLeads] = useState([]);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    if (!loteId) return;
    const { data, error } = await supabase
      .from('buyer_leads')
      .select('id, contact_name, contact_phone, intent, status, created_at, inventario(marca, modelo, anio)')
      .eq('lote_id', loteId)
      .order('created_at', { ascending: false });
    if (error) setFeedback(error.message);
    setLeads(data ?? []);
  }, [loteId]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    const { error } = await supabase.rpc('update_buyer_lead_status', {
      target_lead_id: id,
      target_status: status,
    });
    if (error) setFeedback(error.message);
    else await load();
  };

  return (
    <section className="panel-card stack-md">
      <div>
        <h2 className="heading-md">Interesados del inventario</h2>
        <p className="muted">Personas que dejaron sus datos antes de abrir WhatsApp. El estado inicial confirma la apertura, no el envío del mensaje.</p>
      </div>
      {feedback ? <div className="form-feedback panel-card">{feedback}</div> : null}
      {!leads.length ? <div className="empty-state">Aún no hay interesados registrados en tu alcance.</div> : null}
      <div className="lead-grid">
        {leads.map((lead) => (
          <article className="inventory-item stack-md" key={lead.id}>
            <div className="inline-row">
              <span className="tenant-badge"><MessageCircleMore size={16} />{intentLabels[lead.intent]}</span>
              <span className="status-pill">{labels[lead.status]}</span>
            </div>
            <strong>{lead.inventario?.marca} {lead.inventario?.modelo} {lead.inventario?.anio}</strong>
            <span className="inline-row"><UserRound size={16} />{lead.contact_name}</span>
            <a className="muted inline-row" href={`https://wa.me/${lead.contact_phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer">
              <Phone size={16} />{lead.contact_phone}
            </a>
            <small className="muted">{new Date(lead.created_at).toLocaleString('es-MX')}</small>
            <div className="inventory-actions">
              {['contacted', 'qualified', 'won', 'lost'].map((status) => (
                <button className={status === lead.status ? 'btn' : 'btn-soft'} key={status} onClick={() => updateStatus(lead.id, status)} type="button">
                  <CheckCircle2 size={15} />{labels[status]}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
