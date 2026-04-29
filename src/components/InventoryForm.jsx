import { useMemo, useState } from 'react';
import { ImagePlus, LoaderCircle, Save } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { uploadInventoryImages } from '../lib/inventoryImages.js';

const initialForm = {
  marca: '',
  modelo: '',
  anio: '',
  version: '',
  precio: '',
  kilometraje: '',
  combustible: '',
  transmision: '',
  bodyShape: '',
  motor: '',
  traccion: '',
  asientos: '',
  ciudad: '',
  estado: '',
  descripcion: '',
};

export function InventoryForm({ loteId, onCreated }) {
  const [form, setForm] = useState(initialForm);
  const [files, setFiles] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const fileLabel = useMemo(() => {
    if (!files.length) {
      return 'Selecciona imágenes del auto';
    }

    return `${files.length} archivo(s) listo(s) para subir`;
  }, [files]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleFilesChange = (event) => {
    setFiles(Array.from(event.target.files ?? []));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setIsSaving(true);

    try {
      const imagenes = files.length ? await uploadInventoryImages(loteId, files) : [];

      const payload = {
        lote_id: loteId,
        marca: form.marca,
        modelo: form.modelo,
        anio: Number(form.anio),
        version: form.version || null,
        precio: Number(form.precio || 0),
        kilometraje: form.kilometraje ? Number(form.kilometraje) : null,
        combustible: form.combustible || null,
        transmision: form.transmision || null,
        meta_tags: {
          body_shape: form.bodyShape || null,
          motor: form.motor || null,
          traccion: form.traccion || null,
          asientos: form.asientos || null,
        },
        ciudad: form.ciudad || null,
        estado: form.estado || null,
        descripcion: form.descripcion || null,
        imagenes,
      };

      const { error } = await supabase.from('inventario').insert(payload);

      if (error) {
        throw error;
      }

      setForm(initialForm);
      setFiles([]);
      onCreated?.();
    } catch (error) {
      setErrorMessage(error.message ?? 'No se pudo guardar el auto.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form className="form-card stack-md" onSubmit={handleSubmit}>
      <div className="inline-row">
        <div>
          <h2 className="heading-md">Subir auto</h2>
          <p className="muted">Carga el inventario desde el celular y publícalo al instante.</p>
        </div>
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="marca">Marca</label>
          <input id="marca" name="marca" onChange={handleChange} required value={form.marca} />
        </div>
        <div className="field">
          <label htmlFor="modelo">Modelo</label>
          <input id="modelo" name="modelo" onChange={handleChange} required value={form.modelo} />
        </div>
        <div className="field">
          <label htmlFor="anio">Año</label>
          <input
            id="anio"
            name="anio"
            onChange={handleChange}
            required
            type="number"
            value={form.anio}
          />
        </div>
        <div className="field">
          <label htmlFor="version">Versión</label>
          <input id="version" name="version" onChange={handleChange} value={form.version} />
        </div>
        <div className="field">
          <label htmlFor="precio">Precio</label>
          <input
            id="precio"
            min="0"
            name="precio"
            onChange={handleChange}
            required
            type="number"
            value={form.precio}
          />
        </div>
        <div className="field">
          <label htmlFor="kilometraje">Kilometraje</label>
          <input
            id="kilometraje"
            min="0"
            name="kilometraje"
            onChange={handleChange}
            type="number"
            value={form.kilometraje}
          />
        </div>
        <div className="field">
          <label htmlFor="combustible">Combustible</label>
          <input
            id="combustible"
            name="combustible"
            onChange={handleChange}
            value={form.combustible}
          />
        </div>
        <div className="field">
          <label htmlFor="transmision">Transmisión</label>
          <input
            id="transmision"
            name="transmision"
            onChange={handleChange}
            value={form.transmision}
          />
        </div>
        <div className="field">
          <label htmlFor="bodyShape">Carrocería</label>
          <input
            id="bodyShape"
            name="bodyShape"
            onChange={handleChange}
            value={form.bodyShape}
          />
        </div>
        <div className="field">
          <label htmlFor="motor">Motor</label>
          <input id="motor" name="motor" onChange={handleChange} value={form.motor} />
        </div>
        <div className="field">
          <label htmlFor="traccion">Tracción</label>
          <input
            id="traccion"
            name="traccion"
            onChange={handleChange}
            value={form.traccion}
          />
        </div>
        <div className="field">
          <label htmlFor="asientos">Asientos</label>
          <input
            id="asientos"
            name="asientos"
            onChange={handleChange}
            value={form.asientos}
          />
        </div>
        <div className="field">
          <label htmlFor="ciudad">Ciudad</label>
          <input id="ciudad" name="ciudad" onChange={handleChange} value={form.ciudad} />
        </div>
        <div className="field">
          <label htmlFor="estado">Estado</label>
          <input id="estado" name="estado" onChange={handleChange} value={form.estado} />
        </div>
        <div className="field" data-span="full">
          <label htmlFor="descripcion">Descripción</label>
          <textarea
            id="descripcion"
            name="descripcion"
            onChange={handleChange}
            value={form.descripcion}
          />
        </div>
        <div className="field" data-span="full">
          <label htmlFor="imagenes">Imágenes</label>
          <input
            accept="image/*"
            id="imagenes"
            multiple
            onChange={handleFilesChange}
            type="file"
          />
          <span className="muted inline-row">
            <span className="inline-row">
              <ImagePlus size={16} />
              {fileLabel}
            </span>
          </span>
        </div>
      </div>
      {errorMessage ? <div className="muted">{errorMessage}</div> : null}
      <button className="btn" disabled={isSaving} type="submit">
        {isSaving ? <LoaderCircle className="spin" size={18} /> : <Save size={18} />}
        Guardar auto
      </button>
    </form>
  );
}
