export type ReviewState = { phraseId: string; dueAt: string; interval: number; ease: number; correct: number; attempts: number };
export type ProgressState = { currentDay: number; completedDays: number[]; completedTasks: Record<string, number>; streak: number; lastStudyDate?: string; reviews: ReviewState[] };

export const initialProgress: ProgressState = { currentDay: 1, completedDays: [], completedTasks: {}, streak: 0, reviews: [] };
const KEY = 'viajero.progress.v1';
let database: Promise<SQLite.SQLiteDatabase> | undefined;
async function getDatabase() {
  database ??= SQLite.openDatabaseAsync('viajero.db');
  const db = await database;
  await db.runAsync('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)');
  return db;
}

export async function loadProgress(): Promise<ProgressState> {
  try { const db = await getDatabase(); const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', KEY); return row?.value ? { ...initialProgress, ...JSON.parse(row.value) } : initialProgress; } catch { return initialProgress; }
}
export async function saveProgress(progress: ProgressState) { const db = await getDatabase(); await db.runAsync('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', KEY, JSON.stringify(progress)); }
export function todayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
export function scheduleReview(state: ReviewState | undefined, phraseId: string, correct: boolean, now = new Date()): ReviewState {
  const previous = state ?? { phraseId, dueAt: now.toISOString(), interval: 0, ease: 2.5, correct: 0, attempts: 0 };
  const interval = correct ? Math.max(1, Math.round((previous.interval || 1) * previous.ease)) : 1;
  const ease = correct ? Math.min(3, previous.ease + 0.1) : Math.max(1.3, previous.ease - 0.2);
  const due = new Date(now); due.setDate(due.getDate() + interval);
  return { phraseId, dueAt: due.toISOString(), interval, ease, correct: previous.correct + (correct ? 1 : 0), attempts: previous.attempts + 1 };
}
export function dueReviews(reviews: ReviewState[], now = new Date()) { return reviews.filter((review) => new Date(review.dueAt) <= now); }
import * as SQLite from 'expo-sqlite';
