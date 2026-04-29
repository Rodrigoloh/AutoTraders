import { useMemo, useState } from 'react';
import {
  CarFront,
  Trash2,
  CheckCheck,
  Pencil,
  Save,
  X,
  LoaderCircle,
  ImagePlus,
  ArrowLeft,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { uploadInventoryImages } from '../lib/inventoryImages.js';

const statusOptions = ['disponible', 'apartado', 'vendido'];

function formatStatusLabel(status) {
  if (!status) {
    return 'Disponible';
  }

  return status.charAt(0).toUpperCase() + status.slice(1);
}

function getImage(auto) {
  if (Array.isArray(auto.imagenes) && auto.imagenes[0]) {
    return auto.imagenes[0];
  }

  return 'https://images.unsplash.com/photo-1494976688153-cbe2305abf84?auto=format&fit=crop&w=900&q=80';
}

function money(amount, currency = 'MXN') {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount ?? 0));
}

function isPlaceholderAuto(auto) {
  const id = String(auto?.id ?? '');
  return id === 'demo-base' || id.includes('-demo-');
}

function formatEntryDate(value) {
  if (!value) {
    return 'Sin fecha';
  }

  return new Date(value).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function weeksInInventory(value) {
  if (!value) {
    return null;
  }

  const diff = Date.now() - new Date(value).getTime();
  const weeks = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24 * 7)));
  return weeks;
}

function buildDraft(auto) {
  return {
    marca: auto.marca ?? '',
    modelo: auto.modelo ?? '',
    anio: auto.anio ?? '',
    version: auto.version ?? '',
    precio: auto.precio ?? '',
    kilometraje: auto.kilometraje ?? '',
    combustible: auto.combustible ?? '',
    transmision: auto.transmision ?? '',
    bodyShape: auto.meta_tags?.body_shape ?? '',
    motor: auto.meta_tags?.motor ?? '',
    traccion: auto.meta_tags?.traccion ?? '',
    asientos: auto.meta_tags?.asientos ?? '',
    ciudad: auto.ciudad ?? '',
    estado: auto.estado ?? '',
    descripcion: auto.descripcion ?? '',
    imagenes: Array.isArray(auto.imagenes) ? [...auto.imagenes] : [],
  };
}

export function InventoryList({
  autos,
  canDelete = false,
  canEdit = false,
  canManageImages = false,
  canMarkSold = false,
  loteId = '',
  onRefresh,
}) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [savingId, setSavingId] = useState('');
  const [pendingFiles, setPendingFiles] = useState([]);
  const [statusMessage, setStatusMessage] = useState('');
  const [modelQuery, setModelQuery] = useState('');
  const [statusMenuId, setStatusMenuId] = useState(null);
  const [statusSavingId, setStatusSavingId] = useState('');

  const filteredAutos = useMemo(() => {
    const query = modelQuery.trim().toLowerCase();

    if (!query) {
      return autos;
    }

    return autos.filter((auto) =>
      String(auto.modelo ?? '').toLowerCase().includes(query),
    );
  }, [autos, modelQuery]);

  const handleStatusChange = async (autoId, nextStatus) => {
    setStatusMessage('');
    setStatusSavingId(autoId);
    const { error } = await supabase
      .from('inventario')
      .update({ estatus: nextStatus })
      .eq('id', autoId);

    setStatusSavingId('');

    if (!error) {
      setStatusMenuId(null);
      onRefresh?.();
      return;
    }

    setStatusMessage(error.message ?? 'No se pudo actualizar el estatus del auto.');
  };

  const handleDelete = async (autoId) => {
    setStatusMessage('');
    const { error } = await supabase.from('inventario').delete().eq('id', autoId);

    if (!error) {
      onRefresh?.();
      return;
    }

    setStatusMessage(error.message ?? 'No se pudo eliminar el auto.');
  };

  const startEdit = (auto) => {
    setEditingId(auto.id);
    setDraft(buildDraft(auto));
    setPendingFiles([]);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft(null);
    setPendingFiles([]);
  };

  const handleDraftChange = (event) => {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
  };

  const handleFilesChange = (event) => {
    setPendingFiles(Array.from(event.target.files ?? []));
  };

  const moveImage = (index, direction) => {
    setDraft((current) => {
      if (!current || !Array.isArray(current.imagenes)) {
        return current;
      }

      const nextImages = [...current.imagenes];
      const targetIndex = direction === 'left' ? index - 1 : index + 1;

      if (targetIndex < 0 || targetIndex >= nextImages.length) {
        return current;
      }

      [nextImages[index], nextImages[targetIndex]] = [nextImages[targetIndex], nextImages[index]];

      return { ...current, imagenes: nextImages };
    });
  };

  const removeImage = (index) => {
    setDraft((current) => {
      if (!current || !Array.isArray(current.imagenes)) {
        return current;
      }

      return {
        ...current,
        imagenes: current.imagenes.filter((_, imageIndex) => imageIndex !== index),
      };
    });
  };

  const saveEdit = async (autoId) => {
    if (!draft) {
      return;
    }

    setStatusMessage('');
    setSavingId(autoId);

    let uploadedImages = [];

    try {
      if (canManageImages && pendingFiles.length && loteId) {
        uploadedImages = await uploadInventoryImages(loteId, pendingFiles);
      }
    } catch (error) {
      setStatusMessage(error.message ?? 'No se pudieron subir las imágenes.');
      setSavingId('');
      return;
    }

    const payload = {
      marca: draft.marca,
      modelo: draft.modelo,
      anio: Number(draft.anio),
      version: draft.version || null,
      precio: Number(draft.precio || 0),
      kilometraje: draft.kilometraje ? Number(draft.kilometraje) : null,
      combustible: draft.combustible || null,
      transmision: draft.transmision || null,
      meta_tags: {
        body_shape: draft.bodyShape || null,
        motor: draft.motor || null,
        traccion: draft.traccion || null,
        asientos: draft.asientos || null,
      },
      ciudad: draft.ciudad || null,
      estado: draft.estado || null,
      descripcion: draft.descripcion || null,
    };

    if (canManageImages) {
      payload.imagenes = [...(draft.imagenes ?? []), ...uploadedImages];
    }

    const { error } = await supabase.from('inventario').update(payload).eq('id', autoId);

    setSavingId('');

    if (!error) {
      cancelEdit();
      onRefresh?.();
      return;
    }

    setStatusMessage(error.message ?? 'No se pudo actualizar el auto.');
  };

  if (!autos.length) {
    return (
      <div className="panel-card empty-state">
        El inventario todavía está vacío. Usa el formulario para cargar el primer auto.
      </div>
    );
  }

  return (
    <div className="panel-card stack-md">
      <div>
        <h2 className="heading-md">Inventario actual</h2>
        <p className="muted">Acciones rápidas para lotes que operan desde celular.</p>
      </div>
      <div className="field">
        <label htmlFor="inventory-model-search">Buscar por modelo</label>
        <input
          id="inventory-model-search"
          onChange={(event) => setModelQuery(event.target.value)}
          placeholder="Ej. X5, A45, Urus"
          type="text"
          value={modelQuery}
        />
      </div>
      {statusMessage ? <div className="muted">{statusMessage}</div> : null}
      {!filteredAutos.length ? (
        <div className="panel-card muted">
          No encontramos autos con ese modelo.
        </div>
      ) : null}
      <div className="inventory-grid">
        {filteredAutos.map((auto) => (
          <article className="inventory-item" key={auto.id}>
            {isPlaceholderAuto(auto) ? (
              <span className="tenant-badge">Demo visual</span>
            ) : null}
            <div className="inventory-thumb">
              <img src={getImage(auto)} alt={`${auto.marca} ${auto.modelo}`} />
            </div>
            <div className="stack-sm">
              <div className="inline-row">
                <div>
                  <strong>
                    {auto.marca} {auto.modelo}
                  </strong>
                  <div className="muted">
                    {auto.anio} {auto.version ? `· ${auto.version}` : ''}
                  </div>
                </div>
                <span className="status-pill" data-status={auto.estatus}>
                  {auto.estatus}
                </span>
              </div>
              <div className="inline-row">
                <span className="price-tag">{money(auto.precio, auto.moneda)}</span>
                <span className="muted inline-row">
                  <CarFront size={16} />
                  {[auto.ciudad, auto.estado].filter(Boolean).join(', ') || 'Sin ubicación'}
                </span>
              </div>
              <div className="stack-sm" style={{ gap: 4 }}>
                <span className="muted">Ingreso: {formatEntryDate(auto.created_at)}</span>
                <span className="muted">
                  {weeksInInventory(auto.created_at) === null
                    ? 'Sin antigüedad disponible'
                    : `${weeksInInventory(auto.created_at)} semana(s) en inventario`}
                </span>
              </div>
              <div className="inventory-actions">
                {canEdit && !isPlaceholderAuto(auto) ? (
                  <button className="btn-soft" onClick={() => startEdit(auto)} type="button">
                    <Pencil size={16} />
                    Editar specs
                  </button>
                ) : null}
                {canEdit && !isPlaceholderAuto(auto) ? (
                  <button
                    className="btn-soft"
                    onClick={() =>
                      setStatusMenuId((current) => (current === auto.id ? null : auto.id))
                    }
                    type="button"
                  >
                    <CheckCheck size={16} />
                    {statusSavingId === auto.id
                      ? 'Guardando...'
                      : `Status: ${formatStatusLabel(auto.estatus)}`}
                    <ChevronDown size={16} />
                  </button>
                ) : null}
                {canDelete && !isPlaceholderAuto(auto) ? (
                  <button className="btn-outline" onClick={() => handleDelete(auto.id)} type="button">
                    <Trash2 size={16} />
                    Eliminar
                  </button>
                ) : null}
              </div>
              {canEdit && !isPlaceholderAuto(auto) && statusMenuId === auto.id ? (
                <div className="inventory-actions">
                  {statusOptions.map((status) => (
                    <button
                      className={status === auto.estatus ? 'btn' : 'btn-outline'}
                      disabled={statusSavingId === auto.id}
                      key={`${auto.id}-${status}`}
                      onClick={() => handleStatusChange(auto.id, status)}
                      type="button"
                    >
                      {formatStatusLabel(status)}
                    </button>
                  ))}
                </div>
              ) : null}
              {canEdit && !isPlaceholderAuto(auto) && editingId === auto.id && draft ? (
                <div className="panel-card stack-md">
                  <div>
                    <strong>Editar tarjeta y specs</strong>
                    <p className="muted">
                      Ajusta solo la información visible del auto para la tarjeta y la ficha.
                    </p>
                  </div>
                  <div className="form-grid">
                    <div className="field">
                      <label htmlFor={`marca-${auto.id}`}>Marca</label>
                      <input id={`marca-${auto.id}`} name="marca" onChange={handleDraftChange} value={draft.marca} />
                    </div>
                    <div className="field">
                      <label htmlFor={`modelo-${auto.id}`}>Modelo</label>
                      <input id={`modelo-${auto.id}`} name="modelo" onChange={handleDraftChange} value={draft.modelo} />
                    </div>
                    <div className="field">
                      <label htmlFor={`anio-${auto.id}`}>Año</label>
                      <input id={`anio-${auto.id}`} name="anio" onChange={handleDraftChange} type="number" value={draft.anio} />
                    </div>
                    <div className="field">
                      <label htmlFor={`version-${auto.id}`}>Versión</label>
                      <input id={`version-${auto.id}`} name="version" onChange={handleDraftChange} value={draft.version} />
                    </div>
                    <div className="field">
                      <label htmlFor={`precio-${auto.id}`}>Precio</label>
                      <input id={`precio-${auto.id}`} name="precio" onChange={handleDraftChange} type="number" value={draft.precio} />
                    </div>
                    <div className="field">
                      <label htmlFor={`kilometraje-${auto.id}`}>Kilometraje</label>
                      <input id={`kilometraje-${auto.id}`} name="kilometraje" onChange={handleDraftChange} type="number" value={draft.kilometraje} />
                    </div>
                    <div className="field">
                      <label htmlFor={`combustible-${auto.id}`}>Combustible</label>
                      <input id={`combustible-${auto.id}`} name="combustible" onChange={handleDraftChange} value={draft.combustible} />
                    </div>
                    <div className="field">
                      <label htmlFor={`transmision-${auto.id}`}>Transmisión</label>
                      <input id={`transmision-${auto.id}`} name="transmision" onChange={handleDraftChange} value={draft.transmision} />
                    </div>
                    <div className="field">
                      <label htmlFor={`bodyShape-${auto.id}`}>Carrocería</label>
                      <input id={`bodyShape-${auto.id}`} name="bodyShape" onChange={handleDraftChange} value={draft.bodyShape} />
                    </div>
                    <div className="field">
                      <label htmlFor={`motor-${auto.id}`}>Motor</label>
                      <input id={`motor-${auto.id}`} name="motor" onChange={handleDraftChange} value={draft.motor} />
                    </div>
                    <div className="field">
                      <label htmlFor={`traccion-${auto.id}`}>Tracción</label>
                      <input id={`traccion-${auto.id}`} name="traccion" onChange={handleDraftChange} value={draft.traccion} />
                    </div>
                    <div className="field">
                      <label htmlFor={`asientos-${auto.id}`}>Asientos</label>
                      <input id={`asientos-${auto.id}`} name="asientos" onChange={handleDraftChange} value={draft.asientos} />
                    </div>
                    <div className="field">
                      <label htmlFor={`ciudad-${auto.id}`}>Ciudad</label>
                      <input id={`ciudad-${auto.id}`} name="ciudad" onChange={handleDraftChange} value={draft.ciudad} />
                    </div>
                    <div className="field">
                      <label htmlFor={`estado-${auto.id}`}>Estado</label>
                      <input id={`estado-${auto.id}`} name="estado" onChange={handleDraftChange} value={draft.estado} />
                    </div>
                    <div className="field" data-span="full">
                      <label htmlFor={`descripcion-${auto.id}`}>Descripción</label>
                      <textarea
                        id={`descripcion-${auto.id}`}
                        name="descripcion"
                        onChange={handleDraftChange}
                        value={draft.descripcion}
                      />
                    </div>
                    {canManageImages ? (
                      <div className="field" data-span="full">
                        <label htmlFor={`imagenes-${auto.id}`}>Imágenes del auto</label>
                        <input
                          accept="image/*"
                          id={`imagenes-${auto.id}`}
                          multiple
                          onChange={handleFilesChange}
                          type="file"
                        />
                        <span className="muted">
                          La primera imagen del arreglo se usa como portada de la tarjeta pública.
                        </span>
                        {draft.imagenes?.length ? (
                          <div className="inventory-image-grid">
                            {draft.imagenes.map((image, index) => (
                              <article className="inventory-image-card" key={`${image}-${index}`}>
                                <img alt={`${auto.marca} ${auto.modelo} ${index + 1}`} src={image} />
                                <div className="inventory-image-meta">
                                  <strong>{index === 0 ? 'Portada actual' : `Imagen ${index + 1}`}</strong>
                                  <div className="inventory-actions">
                                    <button
                                      className="btn-soft"
                                      disabled={index === 0}
                                      onClick={() => moveImage(index, 'left')}
                                      type="button"
                                    >
                                      <ArrowLeft size={16} />
                                      Subir
                                    </button>
                                    <button
                                      className="btn-soft"
                                      disabled={index === draft.imagenes.length - 1}
                                      onClick={() => moveImage(index, 'right')}
                                      type="button"
                                    >
                                      <ArrowRight size={16} />
                                      Bajar
                                    </button>
                                    <button
                                      className="btn-outline"
                                      onClick={() => removeImage(index)}
                                      type="button"
                                    >
                                      <Trash2 size={16} />
                                      Quitar
                                    </button>
                                  </div>
                                </div>
                              </article>
                            ))}
                          </div>
                        ) : (
                          <div className="panel-card muted">Este auto no tiene imágenes cargadas todavía.</div>
                        )}
                        {pendingFiles.length ? (
                          <span className="muted inline-row">
                            <ImagePlus size={16} />
                            {pendingFiles.length} archivo(s) listo(s) para agregar al final del carrusel
                          </span>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                  <div className="inventory-actions">
                    <button className="btn" disabled={savingId === auto.id} onClick={() => saveEdit(auto.id)} type="button">
                      {savingId === auto.id ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}
                      Guardar cambios
                    </button>
                    <button className="btn-outline" onClick={cancelEdit} type="button">
                      <X size={16} />
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
