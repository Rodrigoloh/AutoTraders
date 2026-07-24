import { useMemo, useState } from 'react';
import { Helmet } from 'react-helmet';
import { CheckCircle2, ImagePlus, LoaderCircle, Send } from 'lucide-react';
import { PublicSiteHeader } from '../components/PublicSiteHeader.jsx';
import { demoCatalogContent } from '../lib/demoCatalogContent.js';
import { supabaseConfig } from '../lib/supabaseClient.js';
import { useTenantTheme } from '../styles/themeContext.jsx';

const initialForm = {
  contactName: '',
  contactPhone: '',
  contactEmail: '',
  preferredContact: 'whatsapp',
  marca: '',
  modelo: '',
  anio: '',
  version: '',
  kilometraje: '',
  precioEsperado: '',
  ciudad: '',
  estado: '',
  descripcion: '',
  consent: false,
  website: '',
};

async function submitSaleLead(body) {
  if (!supabaseConfig.url || !supabaseConfig.key) {
    throw new Error('El formulario no está configurado. Contacta al lote por teléfono.');
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 90000);

  try {
    const response = await fetch(`${supabaseConfig.url}/functions/v1/create-sale-lead`, {
      method: 'POST',
      headers: {
        apikey: supabaseConfig.key,
        Authorization: `Bearer ${supabaseConfig.key}`,
      },
      body,
      signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok || data?.error) {
      throw new Error(data?.error || 'No se pudo enviar la solicitud.');
    }

    return data;
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('La carga tardó demasiado. Revisa tu conexión e intenta nuevamente.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export function SellYourCarPage() {
  const { tenant, theme, slug } = useTenantTheme();
  const brandName = tenant?.nombre ?? theme.brandName ?? demoCatalogContent.brand.wordmark;
  const brandSubmark = demoCatalogContent.brand.submark;
  const logoSrc = demoCatalogContent.logos.header;
  const [form, setForm] = useState(initialForm);
  const [photos, setPhotos] = useState([]);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wasSubmitted, setWasSubmitted] = useState(false);
  const photoLabel = useMemo(
    () => photos.length ? `${photos.length} foto(s) seleccionada(s)` : 'Selecciona de 1 a 8 fotos',
    [photos.length],
  );

  const handleChange = (event) => {
    const { checked, name, type, value } = event.target;
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }));
  };

  const handlePhotos = (event) => {
    const selected = Array.from(event.target.files ?? []).slice(0, 8);
    setPhotos(selected);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setFeedback('');

    if (!tenant?.id) {
      setFeedback('Este lote no está disponible para recibir solicitudes.');
      return;
    }

    if (!form.contactPhone.trim() && !form.contactEmail.trim()) {
      setFeedback('Agrega al menos un teléfono o correo de contacto.');
      return;
    }

    if (
      ['whatsapp', 'phone'].includes(form.preferredContact) &&
      !form.contactPhone.trim()
    ) {
      setFeedback('Agrega un teléfono para usar el canal de contacto seleccionado.');
      return;
    }

    if (form.preferredContact === 'email' && !form.contactEmail.trim()) {
      setFeedback('Agrega un correo para usarlo como canal preferido.');
      return;
    }

    if (!photos.length) {
      setFeedback('Adjunta al menos una foto del vehículo.');
      return;
    }

    const oversizedPhoto = photos.find((photo) => photo.size > 10 * 1024 * 1024);
    const totalPhotoBytes = photos.reduce((total, photo) => total + photo.size, 0);

    if (oversizedPhoto) {
      setFeedback(`La foto "${oversizedPhoto.name}" supera 10 MB.`);
      return;
    }

    if (totalPhotoBytes > 40 * 1024 * 1024) {
      setFeedback('Las fotos superan el límite total de 40 MB.');
      return;
    }

    setIsSubmitting(true);
    const body = new FormData();
    body.set('loteId', tenant.id);

    Object.entries(form).forEach(([key, value]) => body.set(key, String(value)));
    photos.forEach((photo) => body.append('photos', photo));

    try {
      await submitSaleLead(body);
      setForm(initialForm);
      setPhotos([]);
      setWasSubmitted(true);
    } catch (error) {
      setFeedback(error?.message ?? 'No se pudo enviar la solicitud. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>{brandName} | Vende tu auto</title>
      </Helmet>

      <main className="site-shell">
        <section className="secondary-hero">
          <PublicSiteHeader
            brandName={brandName}
            brandSubmark={brandSubmark}
            homeHref={`/${slug}`}
            inventoryHref={`/${slug}/inventario`}
            logoSrc={logoSrc}
            mode="secondary"
            sellHref={`/${slug}/vende-tu-auto`}
          />
        </section>
        <section className="sell-lead-section edge-pad">
          <div className="sell-lead-layout">
            <div className="stack-md">
              <span className="eyebrow">Solicitud sin cuenta</span>
              <h1 className="heading-lg">{demoCatalogContent.sell.title}</h1>
              <p className="muted">
                Comparte la información de tu auto. El equipo la revisará y te contactará para
                evaluar la compra o consignación. Enviar esta solicitud no publica un anuncio.
              </p>
              <div className="panel-card stack-sm">
                <strong>¿Qué sucede después?</strong>
                <span className="muted">1. Recibimos tus datos y fotos de forma privada.</span>
                <span className="muted">2. Un admin asigna tu solicitud al staff indicado.</span>
                <span className="muted">3. El responsable te contacta y actualiza el seguimiento.</span>
              </div>
            </div>

            {wasSubmitted ? (
              <div className="form-card stack-md sell-success-card">
                <CheckCircle2 size={42} />
                <h2 className="heading-md">Solicitud recibida</h2>
                <p className="muted">
                  El equipo de {brandName} revisará la información y se pondrá en contacto contigo.
                </p>
                <button className="btn-outline" onClick={() => setWasSubmitted(false)} type="button">
                  Enviar otro vehículo
                </button>
              </div>
            ) : (
              <form className="form-card stack-md" onSubmit={handleSubmit}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="sale-contact-name">Nombre</label>
                    <input
                      autoComplete="name"
                      id="sale-contact-name"
                      name="contactName"
                      onChange={handleChange}
                      required
                      value={form.contactName}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-contact-phone">Teléfono / WhatsApp</label>
                    <input
                      autoComplete="tel"
                      id="sale-contact-phone"
                      inputMode="tel"
                      name="contactPhone"
                      onChange={handleChange}
                      value={form.contactPhone}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-contact-email">Correo</label>
                    <input
                      autoComplete="email"
                      id="sale-contact-email"
                      name="contactEmail"
                      onChange={handleChange}
                      type="email"
                      value={form.contactEmail}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-preferred-contact">Contacto preferido</label>
                    <select
                      id="sale-preferred-contact"
                      name="preferredContact"
                      onChange={handleChange}
                      value={form.preferredContact}
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="phone">Llamada</option>
                      <option value="email">Correo</option>
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="sale-brand">Marca</label>
                    <input id="sale-brand" name="marca" onChange={handleChange} required value={form.marca} />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-model">Modelo</label>
                    <input id="sale-model" name="modelo" onChange={handleChange} required value={form.modelo} />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-year">Año</label>
                    <input
                      id="sale-year"
                      max={new Date().getFullYear() + 1}
                      min="1900"
                      name="anio"
                      onChange={handleChange}
                      required
                      type="number"
                      value={form.anio}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-version">Versión</label>
                    <input id="sale-version" name="version" onChange={handleChange} value={form.version} />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-mileage">Kilometraje</label>
                    <input
                      id="sale-mileage"
                      min="0"
                      name="kilometraje"
                      onChange={handleChange}
                      type="number"
                      value={form.kilometraje}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-price">Precio esperado</label>
                    <input
                      id="sale-price"
                      min="0"
                      name="precioEsperado"
                      onChange={handleChange}
                      type="number"
                      value={form.precioEsperado}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-city">Ciudad</label>
                    <input id="sale-city" name="ciudad" onChange={handleChange} value={form.ciudad} />
                  </div>
                  <div className="field">
                    <label htmlFor="sale-state">Estado</label>
                    <input id="sale-state" name="estado" onChange={handleChange} value={form.estado} />
                  </div>
                  <div className="field" data-span="full">
                    <label htmlFor="sale-description">Descripción y condiciones</label>
                    <textarea
                      id="sale-description"
                      maxLength={5000}
                      name="descripcion"
                      onChange={handleChange}
                      placeholder="Estado general, servicios, adeudos, detalles o modificaciones."
                      value={form.descripcion}
                    />
                  </div>
                  <div className="field" data-span="full">
                    <label htmlFor="sale-photos">Fotos privadas</label>
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      id="sale-photos"
                      multiple
                      onChange={handlePhotos}
                      required
                      type="file"
                    />
                    <span className="muted inline-row">
                      <ImagePlus size={16} />
                      {photoLabel}. Máximo 10 MB por foto y 40 MB en total.
                    </span>
                  </div>
                  <div className="visually-hidden" aria-hidden="true">
                    <label htmlFor="sale-website">Sitio web</label>
                    <input
                      autoComplete="off"
                      id="sale-website"
                      name="website"
                      onChange={handleChange}
                      tabIndex={-1}
                      value={form.website}
                    />
                  </div>
                  <label className="consent-field inline-row" data-span="full">
                    <input
                      checked={form.consent}
                      name="consent"
                      onChange={handleChange}
                      required
                      type="checkbox"
                    />
                    <span className="muted">
                      Autorizo que el lote use estos datos y fotos para evaluar mi vehículo y
                      contactarme sobre esta solicitud.
                    </span>
                  </label>
                </div>
                {feedback ? (
                  <div aria-live="polite" className="panel-card form-feedback" role="alert">
                    {feedback}
                  </div>
                ) : null}
                <button className="btn" disabled={isSubmitting} type="submit">
                  {isSubmitting ? <LoaderCircle className="spin" size={18} /> : <Send size={18} />}
                  {isSubmitting ? 'Enviando...' : 'Enviar para revisión'}
                </button>
              </form>
            )}
          </div>
        </section>
      </main>
    </>
  );
}
