import { supabase } from './supabaseClient';

export async function recordMetric({ autoId, loteId, eventType, canal = 'web' }) {
  if (!autoId || !loteId || !eventType) {
    return;
  }

  try {
    const { error } = await supabase.rpc('record_inventory_metric', {
      p_lote_id: loteId,
      p_inventario_id: autoId,
      p_event_type: eventType,
      p_canal: canal,
    });

    if (error) {
      throw error;
    }
  } catch (error) {
    console.warn('Metric tracking failed. Confirm the RPC migration has been applied.', error);
  }
}
