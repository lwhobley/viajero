import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Anonymous auth sessions are re-created each launch — this app has a single
// user and no accounts, so there's nothing to persist across restarts.
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  : null;
