import { getDatabase } from './db';
import { AiChatMessage } from './aiConversation';

// Caps how many turns are kept per scenario so a long-running conversation
// doesn't grow the stored blob without bound.
const MAX_MESSAGES = 40;

let ready: Promise<void> | undefined;
async function ensureTable() {
  ready ??= getDatabase().then((db) => db.runAsync('CREATE TABLE IF NOT EXISTS ai_history (scenario_key TEXT PRIMARY KEY NOT NULL, messages TEXT NOT NULL, updated_at TEXT NOT NULL)').then(() => undefined));
  return ready;
}

export async function loadAiHistory(scenarioKey: string): Promise<AiChatMessage[]> {
  try {
    await ensureTable();
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ messages: string }>('SELECT messages FROM ai_history WHERE scenario_key = ?', scenarioKey);
    return row?.messages ? JSON.parse(row.messages) : [];
  } catch {
    return [];
  }
}

export async function saveAiHistory(scenarioKey: string, messages: AiChatMessage[]): Promise<void> {
  await ensureTable();
  const db = await getDatabase();
  const trimmed = messages.slice(-MAX_MESSAGES);
  await db.runAsync(
    'INSERT OR REPLACE INTO ai_history (scenario_key, messages, updated_at) VALUES (?, ?, ?)',
    scenarioKey, JSON.stringify(trimmed), new Date().toISOString(),
  );
}
