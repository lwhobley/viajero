import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

export type AuthResult = { error?: string };

export async function signUpWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { error: 'Cloud sync is not configured on this build.' };
  const { error } = await supabase.auth.signUp({ email, password });
  return error ? { error: error.message } : {};
}

export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { error: 'Cloud sync is not configured on this build.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  if (!supabase) return;
  await supabase.auth.signOut();
}

// Every device gets an anonymous session for AI conversation mode (Phase 3);
// only a password account counts as a real, syncable sign-in.
export function isRealAccount(user: User | null | undefined): boolean {
  return !!user && !user.is_anonymous;
}

export async function getSession(): Promise<Session | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session;
}

export function subscribeToAuth(callback: (session: Session | null) => void): () => void {
  if (!supabase) return () => {};
  const { data } = supabase.auth.onAuthStateChange((_event, session) => callback(session));
  return () => data.subscription.unsubscribe();
}
