import { fetch as streamingFetch } from 'expo/fetch';
import { supabase, supabaseConfigured } from './supabaseClient';

export type AiChatMessage = { role: 'user' | 'assistant'; content: string };
export type AiFeedback = { grammar: string[]; phrasing: string[]; vocabulary: string[] };

async function ensureSession(): Promise<string> {
  if (!supabase) throw new Error('supabase_not_configured');
  const { data } = await supabase.auth.getSession();
  if (data.session) return data.session.access_token;
  const { data: signInData, error } = await supabase.auth.signInAnonymously();
  if (error || !signInData.session) throw error ?? new Error('no_session');
  return signInData.session.access_token;
}

function functionUrl(name: string): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error('supabase_not_configured');
  return `${base}/functions/v1/${name}`;
}

// Streams the character's reply token-by-token via SSE so it can be displayed
// (and spoken sentence-by-sentence) as it arrives, rather than waiting for the
// whole response. Structured feedback (getAiFeedback below) is a separate,
// non-streaming call — Gemini's JSON-schema output mode isn't compatible with
// incremental streaming, so splitting the two calls is what makes both a fast
// visible reply and grammar feedback possible for the same turn.
export async function streamAiReply(
  messages: AiChatMessage[],
  scenario: string,
  level: number,
  onDelta: (delta: string, soFar: string) => void,
): Promise<string> {
  if (!supabaseConfigured) throw new Error('supabase_not_configured');
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  if (!anonKey) throw new Error('supabase_not_configured');
  const accessToken = await ensureSession();

  const response = await streamingFetch(functionUrl('ai-conversation'), {
    method: 'POST',
    headers: { 'content-type': 'application/json', apikey: anonKey, authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ messages, scenario, level }),
  });

  if (!response.ok || !response.body) {
    if (response.status === 429) throw new Error('rate_limited');
    throw new Error(`http_${response.status}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullText = '';
  let sawDone = false;
  let finishReason: string | undefined;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
    let boundary: number;
    while ((boundary = buffer.indexOf('\n\n')) !== -1) {
      const rawEvent = buffer.slice(0, boundary);
      buffer = buffer.slice(boundary + 2);
      const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data: '));
      if (!dataLine) continue;
      let event: { delta?: string; done?: boolean; finishReason?: string; error?: string };
      try { event = JSON.parse(dataLine.slice(6)); } catch { continue; }
      if (event.error) throw new Error(event.error);
      if (typeof event.delta === 'string' && event.delta) {
        fullText += event.delta;
        onDelta(event.delta, fullText);
      }
      if (event.done) { sawDone = true; finishReason = event.finishReason; }
    }
  }

  if (!sawDone || !fullText) throw new Error('empty_reply');
  // A truncated (MAX_TOKENS) or safety-blocked reply must not be accepted as
  // a complete answer — the learner would see and hear a cut-off sentence
  // with no indication anything went wrong.
  if (finishReason && finishReason !== 'STOP') throw new Error('incomplete_reply');
  return fullText;
}

export async function getAiFeedback(userMessage: string, scenario: string, context: AiChatMessage[]): Promise<AiFeedback> {
  if (!supabaseConfigured || !supabase) throw new Error('supabase_not_configured');
  await ensureSession();

  const { data, error } = await supabase.functions.invoke<AiFeedback & { error?: string }>('ai-feedback', {
    body: { userMessage, scenario, context },
  });
  if (error) throw error;
  if (!data || data.error) throw new Error(data?.error ?? 'empty_reply');
  return { grammar: data.grammar ?? [], phrasing: data.phrasing ?? [], vocabulary: data.vocabulary ?? [] };
}
