import { useState } from 'react';
import { LoaderCircle, MessageCircleMore, X } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const titles = {
  reserve: 'Reservar esta unidad',
  test_drive: 'Agendar una prueba',
  contact: 'Solicitar información',
};

export function BuyerLeadCapture({ auto, intent, loteId, onClose }) {
  const [form, setForm] = useState({ name: '', phone: '' });
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setFeedback('');
    setSubmitting(true);
    const popup = window.open('', '_blank');
    const { data, error } = await supabase.functions.invoke('create-buyer-lead', {
      body: {
        loteId,
        inventoryId: auto.id,
        contactName: form.name,
        contactPhone: form.phone,
        intent,
      },
    });
    setSubmitting(false);

    if (error || !data?.whatsappUrl) {
      popup?.close();
      setFeedback(error?.message ?? data?.error ?? 'No se pudo abrir WhatsApp.');
      return;
    }

    if (popup) popup.location.href = data.whatsappUrl;
    else window.location.assign(data.whatsappUrl);
    onClose?.();
  };

  return (
    <div className="lead-modal-backdrop" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <section aria-modal="true" className="lead-modal panel-card stack-md" role="dialog">
        <div className="inline-row lead-modal-head">
          <div>
            <span className="catalog-eyebrow">Contacto directo</span>
            <h2 className="heading-md">{titles[intent]}</h2>
            <p className="muted">{auto.marca} {auto.modelo} {auto.anio}</p>
          </div>
          <button aria-label="Cerrar" className="btn-outline" onClick={onClose} type="button"><X size={18} /></button>
        </div>
        <p className="muted">Déjanos tus datos para que el asesor identifique tu solicitud. Después abriremos WhatsApp con el mensaje listo.</p>
        <form className="stack-md" onSubmit={submit}>
          <div className="field">
            <label htmlFor="buyer-name">Nombre</label>
            <input autoFocus id="buyer-name" minLength={2} required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="field">
            <label htmlFor="buyer-phone">WhatsApp / teléfono</label>
            <input id="buyer-phone" inputMode="tel" minLength={8} required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          {feedback ? <div className="form-feedback panel-card">{feedback}</div> : null}
          <button className="btn" disabled={submitting} type="submit">
            {submitting ? <LoaderCircle className="spin" size={18} /> : <MessageCircleMore size={18} />}
            Continuar a WhatsApp
          </button>
        </form>
      </section>
    </div>
  );
}
