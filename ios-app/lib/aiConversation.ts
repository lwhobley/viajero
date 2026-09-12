import { supabase, supabaseConfigured } from './supabaseClient';

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };

async function ensureSession(): Promise<void> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { data } = await supabase.auth.getSession();
  if (!data.session) {
    const { error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
  }
}

export async function sendAiMessage(messages: AiChatMessage[], scenario: string, level: number): Promise<string> {
  if (!supabaseConfigured || !supabase) throw new Error('supabase_not_configured');
  await ensureSession();

  const { data, error } = await supabase.functions.invoke<{ reply?: string; error?: string }>('ai-conversation', {
    body: { messages, scenario, level },
  });
  if (error) throw error;
  if (!data?.reply) throw new Error(data?.error ?? 'empty_reply');
  return data.reply;
}
