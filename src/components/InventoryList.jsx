import { CarFront, Trash2, CheckCheck } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

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

export function InventoryList({ autos, onRefresh }) {
  const handleMarkSold = async (autoId) => {
    const { error } = await supabase.from('inventario').update({ estatus: 'vendido' }).eq('id', autoId);

    if (!error) {
      onRefresh?.();
    }
  };

  const handleDelete = async (autoId) => {
    const { error } = await supabase.from('inventario').delete().eq('id', autoId);

    if (!error) {
      onRefresh?.();
    }
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
      <div className="inventory-grid">
        {autos.map((auto) => (
          <article className="inventory-item" key={auto.id}>
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
              <div className="inventory-actions">
                <button className="btn-soft" onClick={() => handleMarkSold(auto.id)} type="button">
                  <CheckCheck size={16} />
                  Marcar como Vendido
                </button>
                <button className="btn-outline" onClick={() => handleDelete(auto.id)} type="button">
                  <Trash2 size={16} />
                  Eliminar
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
