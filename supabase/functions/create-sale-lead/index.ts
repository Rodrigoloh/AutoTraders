import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const allowedMimeTypes = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
]);
const maxPhotoCount = 8;
const maxPhotoBytes = 10 * 1024 * 1024;
const maxTotalBytes = 40 * 1024 * 1024;
const rateLimitSalt = Deno.env.get('LEAD_RATE_LIMIT_SALT') ?? serviceRoleKey.slice(-32);

function field(formData: FormData, name: string) {
  return String(formData.get(name) ?? '').trim();
}

function nullableField(formData: FormData, name: string) {
  return field(formData, name) || null;
}

function parseOptionalNumber(value: string) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function requestFingerprint(req: Request, loteId: string) {
  const forwardedFor = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = req.headers.get('cf-connecting-ip') ?? req.headers.get('x-real-ip') ?? forwardedFor ?? 'unknown';
  const userAgent = req.headers.get('user-agent') ?? 'unknown';
  const bytes = new TextEncoder().encode(`${rateLimitSalt}|${loteId}|${ip}|${userAgent}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest))
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const uploadedPaths: string[] = [];
  let leadId = '';

  try {
    const formData = await req.formData();

    // Honeypot: responde como éxito sin almacenar spam automatizado.
    if (field(formData, 'website')) {
      return jsonResponse({ accepted: true });
    }

    const loteId = field(formData, 'loteId');
    const contactName = field(formData, 'contactName');
    const contactPhone = nullableField(formData, 'contactPhone');
    const contactEmail = nullableField(formData, 'contactEmail');
    const marca = field(formData, 'marca');
    const modelo = field(formData, 'modelo');
    const anio = Number(field(formData, 'anio'));
    const preferredContact = field(formData, 'preferredContact') || 'whatsapp';
    const photos = formData
      .getAll('photos')
      .filter((value): value is File => value instanceof File && value.size > 0);

    if (!loteId || !contactName || (!contactPhone && !contactEmail) || !marca || !modelo) {
      return jsonResponse({ error: 'Faltan datos obligatorios.' }, 400);
    }

    if (field(formData, 'consent') !== 'true') {
      return jsonResponse({ error: 'Se requiere autorización para procesar la solicitud.' }, 400);
    }

    if (!['whatsapp', 'phone', 'email'].includes(preferredContact)) {
      return jsonResponse({ error: 'El canal de contacto no es válido.' }, 400);
    }

    if (['whatsapp', 'phone'].includes(preferredContact) && !contactPhone) {
      return jsonResponse({ error: 'Se requiere un teléfono para el canal seleccionado.' }, 400);
    }

    if (preferredContact === 'email' && !contactEmail) {
      return jsonResponse({ error: 'Se requiere un correo para el canal seleccionado.' }, 400);
    }

    if (!Number.isInteger(anio) || anio < 1900 || anio > new Date().getFullYear() + 1) {
      return jsonResponse({ error: 'El año del vehículo no es válido.' }, 400);
    }

    if (!photos.length || photos.length > maxPhotoCount) {
      return jsonResponse({ error: `Adjunta entre 1 y ${maxPhotoCount} fotos.` }, 400);
    }

    let totalBytes = 0;

    for (const photo of photos) {
      totalBytes += photo.size;

      if (!allowedMimeTypes.has(photo.type) || photo.size > maxPhotoBytes) {
        return jsonResponse({ error: 'Las fotos deben ser JPG, PNG o WebP y pesar máximo 10 MB.' }, 400);
      }
    }

    if (totalBytes > maxTotalBytes) {
      return jsonResponse({ error: 'Las fotos exceden el límite total de 40 MB.' }, 400);
    }

    const { data: lote } = await adminClient
      .from('lotes')
      .select('id')
      .eq('id', loteId)
      .eq('activo', true)
      .maybeSingle();

    if (!lote) {
      return jsonResponse({ error: 'El lote no está disponible.' }, 404);
    }

    const fingerprint = await requestFingerprint(req, loteId);
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count: recentSubmissionCount } = await adminClient
      .from('sale_leads')
      .select('id', { count: 'exact', head: true })
      .eq('submission_fingerprint', fingerprint)
      .gte('created_at', oneHourAgo);

    if ((recentSubmissionCount ?? 0) >= 5) {
      return jsonResponse(
        { error: 'Alcanzaste el límite temporal de solicitudes. Intenta más tarde.' },
        429,
      );
    }

    const { data: lead, error: insertError } = await adminClient
      .from('sale_leads')
      .insert({
        lote_id: loteId,
        contact_name: contactName.slice(0, 120),
        contact_phone: contactPhone?.slice(0, 40) ?? null,
        contact_email: contactEmail?.toLowerCase().slice(0, 254) ?? null,
        preferred_contact: preferredContact,
        marca: marca.slice(0, 80),
        modelo: modelo.slice(0, 120),
        anio,
        version: nullableField(formData, 'version')?.slice(0, 120) ?? null,
        kilometraje: parseOptionalNumber(field(formData, 'kilometraje')),
        precio_esperado: parseOptionalNumber(field(formData, 'precioEsperado')),
        ciudad: nullableField(formData, 'ciudad')?.slice(0, 120) ?? null,
        estado: nullableField(formData, 'estado')?.slice(0, 120) ?? null,
        descripcion: nullableField(formData, 'descripcion')?.slice(0, 5000) ?? null,
        submission_fingerprint: fingerprint,
      })
      .select('id')
      .single();

    if (insertError || !lead) {
      throw insertError ?? new Error('No se pudo crear el lead.');
    }

    leadId = lead.id;

    for (const photo of photos) {
      const extension = allowedMimeTypes.get(photo.type)!;
      const path = `${lead.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await adminClient.storage
        .from('sale-lead-media')
        .upload(path, photo, { contentType: photo.type, upsert: false });

      if (uploadError) {
        throw uploadError;
      }

      uploadedPaths.push(path);
    }

    const { error: updateError } = await adminClient
      .from('sale_leads')
      .update({ photo_paths: uploadedPaths })
      .eq('id', lead.id);

    if (updateError) {
      throw updateError;
    }

    return jsonResponse({ accepted: true, leadId: lead.id }, 201);
  } catch (error) {
    if (uploadedPaths.length) {
      await adminClient.storage.from('sale-lead-media').remove(uploadedPaths);
    }

    if (leadId) {
      await adminClient.from('sale_leads').delete().eq('id', leadId);
    }

    return jsonResponse(
      { error: error instanceof Error ? error.message : 'No se pudo enviar la solicitud.' },
      500,
    );
  }
});
