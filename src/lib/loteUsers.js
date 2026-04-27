import { supabase } from './supabaseClient';

export async function inviteLoteUser({ loteId, email, role, fullName, redirectTo }) {
  const { data, error } = await supabase.functions.invoke('invite-lote-user', {
    body: {
      loteId,
      email,
      role,
      fullName,
      redirectTo,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function updateLoteMember({ loteId, userId, action, role }) {
  const { data, error } = await supabase.functions.invoke('update-lote-member', {
    body: {
      loteId,
      userId,
      action,
      role,
    },
  });

  if (error) {
    throw error;
  }

  return data;
}
