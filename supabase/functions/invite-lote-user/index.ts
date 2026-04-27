import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const adminClient = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

type InvitePayload = {
  loteId: string;
  email: string;
  role: 'lote_admin' | 'lote_editor' | 'lote_viewer';
  fullName?: string;
  redirectTo?: string;
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
    const payload = (await req.json()) as InvitePayload;
    const email = payload.email?.trim().toLowerCase();

    if (!payload.loteId || !email || !payload.role) {
      return new Response(JSON.stringify({ error: 'Missing loteId, email or role.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const caller = await authenticateRequest(req, payload.loteId);

    if (
      !caller.isPlatformAdmin &&
      (caller.membershipRole !== 'lote_admin' ||
        !['lote_editor', 'lote_viewer'].includes(payload.role))
    ) {
      return new Response(
        JSON.stringify({ error: 'Only superadmin or lote_admin can invite this role.' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: lote } = await adminClient
      .from('lotes')
      .select('slug, nombre')
      .eq('id', payload.loteId)
      .single();

    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id, email')
      .ilike('email', email)
      .maybeSingle();

    if (existingProfile?.id) {
      const { error: upsertError } = await adminClient.from('lote_usuarios').upsert(
        {
          lote_id: payload.loteId,
          user_id: existingProfile.id,
          role: payload.role,
        },
        { onConflict: 'lote_id,user_id' },
      );

      if (upsertError) {
        throw upsertError;
      }

      return new Response(
        JSON.stringify({
          status: 'assigned_existing',
          message: 'User already exists and was assigned to the lote.',
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const redirectTo =
      payload.redirectTo ?? `${new URL(req.url).origin}/${lote?.slug ?? ''}/admin/login`;

    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(
      email,
      {
        redirectTo,
        data: {
          full_name: payload.fullName ?? null,
          lote_id: payload.loteId,
          lote_nombre: lote?.nombre ?? null,
          invited_role: payload.role,
        },
      },
    );

    if (inviteError || !inviteData.user) {
      throw inviteError ?? new Error('Invite did not return a user.');
    }

    const { error: membershipError } = await adminClient.from('lote_usuarios').upsert(
      {
        lote_id: payload.loteId,
        user_id: inviteData.user.id,
        role: payload.role,
      },
      { onConflict: 'lote_id,user_id' },
    );

    if (membershipError) {
      throw membershipError;
    }

    return new Response(
      JSON.stringify({
        status: 'invited',
        message: 'Invitation sent successfully.',
        userId: inviteData.user.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
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
