import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type BuyerLeadPayload = {
  loteId: string;
  inventoryId: string;
  contactName: string;
  contactPhone: string;
  intent: 'reserve' | 'test_drive' | 'contact';
};

function normalizePhone(value: string | null | undefined) {
  return String(value ?? '').replace(/\D/g, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed.' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = (await req.json()) as BuyerLeadPayload;
    const contactName = payload.contactName?.trim();
    const contactPhone = payload.contactPhone?.trim();

    if (
      !payload.loteId ||
      !payload.inventoryId ||
      !contactName ||
      !contactPhone ||
      !['reserve', 'test_drive', 'contact'].includes(payload.intent)
    ) {
      return new Response(JSON.stringify({ error: 'Completa nombre, teléfono, vehículo e intención.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: inventory, error: inventoryError } = await adminClient
      .from('inventario')
      .select(
        'id, lote_id, marca, modelo, anio, estatus, assigned_staff_id, advisor_name, advisor_phone, lotes!inner(nombre, whatsapp, activo)',
      )
      .eq('id', payload.inventoryId)
      .eq('lote_id', payload.loteId)
      .single();

    const lote = Array.isArray(inventory?.lotes) ? inventory?.lotes[0] : inventory?.lotes;

    if (inventoryError || !inventory || inventory.estatus !== 'disponible' || !lote?.activo) {
      return new Response(JSON.stringify({ error: 'El vehículo ya no está disponible.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const whatsappTarget = normalizePhone(inventory.advisor_phone || lote.whatsapp);

    if (!whatsappTarget) {
      return new Response(JSON.stringify({ error: 'No hay un WhatsApp configurado para esta unidad.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: lead, error: insertError } = await adminClient
      .from('buyer_leads')
      .insert({
        lote_id: payload.loteId,
        inventario_id: payload.inventoryId,
        assigned_staff_id: inventory.assigned_staff_id,
        contact_name: contactName,
        contact_phone: contactPhone,
        intent: payload.intent,
        status: 'whatsapp_opened',
        whatsapp_target: whatsappTarget,
      })
      .select('id')
      .single();

    if (insertError) throw insertError;

    const intentLabels = {
      reserve: 'reservar',
      test_drive: 'agendar una prueba de manejo para',
      contact: 'recibir información sobre',
    };
    const advisorGreeting = inventory.advisor_name
      ? `Hola ${inventory.advisor_name},`
      : `Hola ${lote.nombre},`;
    const message = `${advisorGreeting} soy ${contactName} (${contactPhone}) y quiero ${intentLabels[payload.intent]} el ${inventory.marca} ${inventory.modelo} ${inventory.anio}. Folio: ${lead.id}.`;

    await adminClient.rpc('record_inventory_metric', {
      p_lote_id: payload.loteId,
      p_inventario_id: payload.inventoryId,
      p_event_type: 'click_whatsapp',
      p_canal: 'web',
    });

    return new Response(
      JSON.stringify({
        accepted: true,
        leadId: lead.id,
        whatsappUrl: `https://wa.me/${whatsappTarget}?text=${encodeURIComponent(message)}`,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'No se pudo registrar el lead.' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  }
});
