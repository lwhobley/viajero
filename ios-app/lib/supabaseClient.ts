import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// Anonymous auth sessions are re-created each launch, so there is nothing to
// persist across app restarts yet — that lands with Phase 4's account sync.
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
  : null;
