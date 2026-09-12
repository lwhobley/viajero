import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_HISTORY = 12;
// Learner input is short by nature; model replies are not, and rejecting a
// long reply that came back from this same function would wedge the
// conversation on every subsequent turn.
const MAX_USER_LENGTH = 500;
const MAX_ASSISTANT_LENGTH = 4000;
const DAILY_REQUEST_LIMIT = 200;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

// Levels are driven by the learner's on-device progress (see lib/aiConversation.ts
// on the client) so the model adapts without the client ever seeing a system prompt.
const LEVEL_GUIDANCE: Record<number, string> = {
  1: 'Use only the simplest present-tense sentences, common travel vocabulary, and short replies (under 12 words). Avoid idioms.',
  2: 'Use short present-tense sentences with everyday travel vocabulary. Occasionally introduce one new common word per reply.',
  3: 'Use natural present and near-future tense sentences of normal conversational length. Introduce some regional expressions.',
  4: 'Use varied tenses (present, past, near-future), natural connectors, and some idiomatic expressions. A full conversational turn is fine.',
  5: 'Speak as a native speaker would to another adult: natural pace, idioms, varied tenses, and regional flavor, without simplifying for a learner.',
};

function buildSystemPrompt(scenario: string, level: number): string {
  const clampedLevel = Math.min(5, Math.max(1, Math.round(level)));
  return [
    'You are a friendly Spanish conversation partner for a language-learning app called Viajero.',
    `Scenario: ${scenario}.`,
    'Stay in character for the scenario and reply only in Spanish — no English, no translations, no stage directions.',
    `Difficulty level ${clampedLevel}/5: ${LEVEL_GUIDANCE[clampedLevel]}`,
    'Keep replies to 1-3 sentences so the learner has room to respond.',
  ].join(' ');
}

function isValidMessage(message: unknown): message is ChatMessage {
  if (typeof message !== 'object' || message === null) return false;
  const { role, content } = message as Record<string, unknown>;
  if (role !== 'user' && role !== 'assistant') return false;
  if (typeof content !== 'string' || content.length === 0) return false;
  return content.length <= (role === 'user' ? MAX_USER_LENGTH : MAX_ASSISTANT_LENGTH);
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

// The gateway already verified this JWT (verify_jwt is on), so the payload is
// only being read here, not trusted for authentication.
function userIdFromRequest(req: Request): string | null {
  const header = req.headers.get('Authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const payload = header.slice(7).split('.')[1];
  if (!payload) return null;
  try {
    const padded = payload.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(payload.length / 4) * 4, '=');
    const claims = JSON.parse(atob(padded));
    return typeof claims.sub === 'string' ? claims.sub : null;
  } catch {
    return null;
  }
}

// Fails open: a rate-limiter outage should not take the app down, and the
// backstop for runaway cost is the spend cap on the Gemini key itself.
async function withinDailyLimit(userId: string): Promise<boolean> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return true;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/claim_ai_request`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', apikey: SERVICE_ROLE_KEY, authorization: `Bearer ${SERVICE_ROLE_KEY}` },
      body: JSON.stringify({ p_user: userId, p_limit: DAILY_REQUEST_LIMIT }),
    });
    if (!response.ok) {
      console.error('rate limit check failed', response.status, await response.text());
      return true;
    }
    return await response.json() !== false;
  } catch (error) {
    console.error('rate limit check threw', error);
    return true;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY secret is not set');
    return json({ error: 'server_misconfigured' }, 500);
  }

  const userId = userIdFromRequest(req);
  if (!userId) return json({ error: 'unauthorized' }, 401);
  if (!await withinDailyLimit(userId)) return json({ error: 'rate_limited' }, 429);

  let body: { scenario?: unknown; level?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  if (rawMessages.length === 0 || !rawMessages.every(isValidMessage)) return json({ error: 'invalid_messages' }, 400);
  const messages = rawMessages as ChatMessage[];

  const scenario = typeof body.scenario === 'string' && body.scenario.length > 0 ? body.scenario.slice(0, 200) : 'general travel conversation';
  const level = typeof body.level === 'number' && Number.isFinite(body.level) ? body.level : 2;

  const upstream = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:streamGenerateContent?alt=sse`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(scenario, level) }] },
      contents: messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
      // Reasoning tokens are drawn from the same budget as the reply, so this
      // has to leave room for both or replies come back truncated mid-word.
      generationConfig: { maxOutputTokens: 2000, thinkingConfig: { thinkingLevel: 'low' } },
    }),
  });

  if (!upstream.ok || !upstream.body) {
    console.error('Gemini stream error', upstream.status, await upstream.text().catch(() => ''));
    return json({ error: 'upstream_error' }, 502);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  const reader = upstream.body.getReader();

  // Re-emits a normalized SSE stream to the client: one `data: {"delta": "..."}`
  // event per usable text chunk (thinking parts are skipped, never forwarded),
  // then a final `data: {"done": true, "finishReason": "..."}` event.
  const relay = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = '';
      let finishReason: string | undefined;
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Gemini's SSE stream uses CRLF ("\r\n\r\n") event separators, not "\n\n".
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          let boundary: number;
          while ((boundary = buffer.indexOf('\n\n')) !== -1) {
            const rawEvent = buffer.slice(0, boundary);
            buffer = buffer.slice(boundary + 2);
            const dataLine = rawEvent.split('\n').find((line) => line.startsWith('data: '));
            if (!dataLine) continue;
            const payload = dataLine.slice(6).trim();
            if (!payload || payload === '[DONE]') continue;
            let chunk: { candidates?: Array<{ content?: { parts?: Array<{ thought?: boolean; text?: string }> }; finishReason?: string }> };
            try { chunk = JSON.parse(payload); } catch { continue; }
            const candidate = chunk.candidates?.[0];
            for (const part of candidate?.content?.parts ?? []) {
              if (part.thought) continue;
              if (typeof part.text === 'string' && part.text) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: part.text })}\n\n`));
              }
            }
            if (candidate?.finishReason) finishReason = candidate.finishReason;
          }
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true, finishReason: finishReason ?? 'STOP' })}\n\n`));
      } catch (error) {
        console.error('stream relay error', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'stream_error' })}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(relay, { headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' } });
});
