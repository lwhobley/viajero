import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_HISTORY = 12;
const MAX_MESSAGE_LENGTH = 500;

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
  return (role === 'user' || role === 'assistant') && typeof content === 'string' && content.length > 0 && content.length <= MAX_MESSAGE_LENGTH;
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method_not_allowed' }), { status: 405, headers: { 'content-type': 'application/json' } });
  }
  if (!GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY secret is not set');
    return new Response(JSON.stringify({ error: 'server_misconfigured' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }

  let body: { scenario?: unknown; level?: unknown; messages?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid_json' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }

  const rawMessages = Array.isArray(body.messages) ? body.messages.slice(-MAX_HISTORY) : [];
  if (rawMessages.length === 0 || !rawMessages.every(isValidMessage)) {
    return new Response(JSON.stringify({ error: 'invalid_messages' }), { status: 400, headers: { 'content-type': 'application/json' } });
  }
  const messages = rawMessages as ChatMessage[];

  const scenario = typeof body.scenario === 'string' && body.scenario.length > 0 ? body.scenario.slice(0, 200) : 'general travel conversation';
  const level = typeof body.level === 'number' && Number.isFinite(body.level) ? body.level : 2;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildSystemPrompt(scenario, level) }] },
      contents: messages.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
      generationConfig: { maxOutputTokens: 300 },
    }),
  });

  if (!response.ok) {
    console.error('Gemini API error', response.status, await response.text());
    return new Response(JSON.stringify({ error: 'upstream_error' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.find((part: { text?: string }) => typeof part.text === 'string')?.text ?? '';
  if (!reply) {
    return new Response(JSON.stringify({ error: 'empty_reply' }), { status: 502, headers: { 'content-type': 'application/json' } });
  }

  return new Response(JSON.stringify({ reply }), { headers: { 'content-type': 'application/json' } });
});
