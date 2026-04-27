import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type UpdatePayload = {
  loteId: string;
  userId: string;
  action: 'change_role' | 'remove_access';
  role?: 'lote_admin' | 'lote_editor' | 'lote_viewer';
};

async function authenticateRequest(req: Request, loteId: string) {
  const authHeader = req.headers.get('Authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    throw new Response(JSON.stringify({ error: 'Missing bearer token.' }), { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '');
  const {
    data: { user },
    error,
  } = await adminClient.auth.getUser(token);

  if (error || !user) {
    throw new Response(JSON.stringify({ error: 'Invalid session token.' }), { status: 401 });
  }

  const isPlatformAdmin = user.app_metadata?.platform_role === 'super_admin';

  if (isPlatformAdmin) {
    return { user, isPlatformAdmin, membershipRole: 'super_admin' };
  }

  const { data: membership } = await adminClient
    .from('lote_usuarios')
    .select('role')
    .eq('lote_id', loteId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) {
    throw new Response(JSON.stringify({ error: 'No access to this lote.' }), { status: 403 });
  }

  return { user, isPlatformAdmin, membershipRole: membership.role };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const payload = (await req.json()) as UpdatePayload;

    if (!payload.loteId || !payload.userId || !payload.action) {
      return new Response(JSON.stringify({ error: 'Missing loteId, userId or action.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const caller = await authenticateRequest(req, payload.loteId);
    const { data: targetMembership } = await adminClient
      .from('lote_usuarios')
      .select('id, role')
      .eq('lote_id', payload.loteId)
      .eq('user_id', payload.userId)
      .single();

    if (!targetMembership) {
      return new Response(JSON.stringify({ error: 'Membership not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!caller.isPlatformAdmin && targetMembership.role === 'lote_admin') {
      return new Response(JSON.stringify({ error: 'Only superadmin can change another lote_admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (payload.action === 'remove_access') {
      const { error } = await adminClient.from('lote_usuarios').delete().eq('id', targetMembership.id);

      if (error) {
        throw error;
      }

      return new Response(JSON.stringify({ status: 'removed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!payload.role) {
      return new Response(JSON.stringify({ error: 'Missing target role.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!caller.isPlatformAdmin && payload.role === 'lote_admin') {
      return new Response(JSON.stringify({ error: 'Only superadmin can assign lote_admin.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { error } = await adminClient
      .from('lote_usuarios')
      .update({ role: payload.role })
      .eq('id', targetMembership.id);

    if (error) {
      throw error;
    }

    return new Response(JSON.stringify({ status: 'updated' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const response =
      error instanceof Response
        ? error
        : new Response(
            JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error.' }),
            { status: 500 },
          );

    return new Response(await response.text(), {
      status: response.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
