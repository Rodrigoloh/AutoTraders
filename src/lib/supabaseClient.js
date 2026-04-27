import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabaseClientKey = supabasePublishableKey ?? supabaseAnonKey;

if (!supabaseUrl || !supabaseClientKey) {
  console.warn(
    'Missing Supabase env vars. Define VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.',
  );
}

export const supabase = createClient(
  supabaseUrl ?? 'https://example.supabase.co',
  supabaseClientKey ?? 'public-client-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
);
