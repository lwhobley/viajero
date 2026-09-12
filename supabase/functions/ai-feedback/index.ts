import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const GEMINI_MODEL = 'gemini-3.6-flash';
const MAX_USER_LENGTH = 500;
const MAX_ASSISTANT_LENGTH = 4000;
const MAX_CONTEXT = 6;
const DAILY_REQUEST_LIMIT = 200;
const MAX_NOTES_PER_CATEGORY = 5;

type ChatMessage = { role: 'user' | 'assistant'; content: string };

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
// only being read here, not trusted for authentication. Duplicated from
// ai-conversation/index.ts: each Edge Function is deployed independently, and
// this is small enough that a shared-module import isn't worth the deploy
// complexity.
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

const FEEDBACK_SCHEMA = {
  type: 'OBJECT',
  properties: {
    grammar: { type: 'ARRAY', items: { type: 'STRING' } },
    phrasing: { type: 'ARRAY', items: { type: 'STRING' } },
    vocabulary: { type: 'ARRAY', items: { type: 'STRING' } },
  },
  required: ['grammar', 'phrasing', 'vocabulary'],
};

function buildFeedbackPrompt(scenario: string): string {
  return [
    "You are a Spanish teacher reviewing one message a language learner wrote or said during a roleplay conversation.",
    `Scenario: ${scenario}.`,
    "Review only the learner's final message in the conversation, not any earlier turns or the assistant's own lines.",
    'Return short, specific notes as plain English sentences, one per real issue found: "grammar" for verb conjugation, gender/number agreement, or wrong tense; "phrasing" for correct but unnatural or overly literal wording (suggest a more natural alternative); "vocabulary" for a wrong or missing word choice for the context.',
    'If a category has no issues, return an empty array for it — do not invent problems that are not there. Do not comment on punctuation, capitalization, or accent marks, since the learner may be dictating by voice.',
  ].join(' ');
}

function sanitizeNotes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.length > 0).slice(0, MAX_NOTES_PER_CATEGORY);
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

  let body: { userMessage?: unknown; scenario?: unknown; context?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const userMessage = typeof body.userMessage === 'string' ? body.userMessage.slice(0, MAX_USER_LENGTH) : '';
  if (!userMessage) return json({ error: 'invalid_messages' }, 400);

  const scenario = typeof body.scenario === 'string' && body.scenario.length > 0 ? body.scenario.slice(0, 200) : 'general travel conversation';
  const context = (Array.isArray(body.context) ? body.context.slice(-MAX_CONTEXT) : []).filter(isValidMessage) as ChatMessage[];

  const contents = [
    ...context.map((message) => ({ role: message.role === 'assistant' ? 'model' : 'user', parts: [{ text: message.content }] })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: buildFeedbackPrompt(scenario) }] },
      contents,
      generationConfig: {
        maxOutputTokens: 1000,
        thinkingConfig: { thinkingLevel: 'low' },
        responseMimeType: 'application/json',
        responseSchema: FEEDBACK_SCHEMA,
      },
    }),
  });

  if (!response.ok) {
    console.error('Gemini API error', response.status, await response.text());
    return json({ error: 'upstream_error' }, 502);
  }

  const data = await response.json();
  const candidate = data.candidates?.[0];
  const textPart = candidate?.content?.parts?.find((part: { thought?: boolean; text?: string }) => !part.thought && typeof part.text === 'string');
  if (!textPart) {
    console.error('Gemini returned no usable text', candidate?.finishReason);
    return json({ error: 'empty_reply' }, 502);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(textPart.text);
  } catch {
    console.error('Gemini structured output was not valid JSON', textPart.text);
    return json({ error: 'invalid_upstream_json' }, 502);
  }

  const { grammar, phrasing, vocabulary } = parsed as Record<string, unknown>;
  return json({ grammar: sanitizeNotes(grammar), phrasing: sanitizeNotes(phrasing), vocabulary: sanitizeNotes(vocabulary) });
});
