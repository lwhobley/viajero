import { getDatabase } from './db';

export type ReviewState = { phraseId: string; dueAt: string; interval: number; ease: number; correct: number; attempts: number };
export type ScoreEntry = { date: string; score: number };
export type FeedbackCategory = 'grammar' | 'phrasing' | 'vocabulary';
export type WeakSpot = { note: string; category: FeedbackCategory; count: number; lastSeen: string };
export type ProgressState = {
  currentDay: number;
  completedDays: number[];
  completedTasks: Record<string, number>;
  completedSteps: Record<string, string[]>;
  streak: number;
  lastStudyDate?: string;
  reviews: ReviewState[];
  scoreHistory: ScoreEntry[];
  weakSpots: Record<string, WeakSpot>;
  reminderEnabled: boolean;
};

export const initialProgress: ProgressState = {
  currentDay: 1,
  completedDays: [],
  completedTasks: {},
  completedSteps: {},
  streak: 0,
  reviews: [],
  scoreHistory: [],
  weakSpots: {},
  reminderEnabled: false,
};

// Caps keep the single JSON blob (see saveProgress) from growing without bound
// over months of daily use.
const MAX_SCORE_HISTORY = 200;

const KEY = 'viajero.progress.v1';
let ready: Promise<void> | undefined;
async function ensureTable() {
  ready ??= getDatabase().then((db) => db.runAsync('CREATE TABLE IF NOT EXISTS app_state (key TEXT PRIMARY KEY NOT NULL, value TEXT NOT NULL)').then(() => undefined));
  return ready;
}

export async function loadProgress(): Promise<ProgressState> {
  await ensureTable();
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM app_state WHERE key = ?', KEY);
  if (!row?.value) return initialProgress;
  const saved = JSON.parse(row.value) as Partial<ProgressState>;
  const savedTaskCounts = saved.completedTasks && typeof saved.completedTasks === 'object' ? saved.completedTasks : {};
  const completedSteps = saved.completedSteps && typeof saved.completedSteps === 'object'
    ? saved.completedSteps
    : Object.fromEntries(Object.entries(savedTaskCounts).map(([dayId, count]) => [dayId, Array.from({ length: Math.min(6, count) }, (_, index) => `legacy-${index + 1}`)]));
  return {
    ...initialProgress,
    ...saved,
    completedDays: Array.isArray(saved.completedDays) ? saved.completedDays : [],
    completedTasks: savedTaskCounts,
    completedSteps,
    reviews: Array.isArray(saved.reviews) ? saved.reviews : [],
    scoreHistory: Array.isArray(saved.scoreHistory) ? saved.scoreHistory : [],
    weakSpots: saved.weakSpots && typeof saved.weakSpots === 'object' ? saved.weakSpots : {},
  };
}
export async function saveProgress(progress: ProgressState) { await ensureTable(); const db = await getDatabase(); await db.runAsync('INSERT OR REPLACE INTO app_state (key, value) VALUES (?, ?)', KEY, JSON.stringify(progress)); }
export function todayKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function markStudyStep(progress: ProgressState, dayId: string, dayNumber: number, stepId: string, now = new Date()): ProgressState {
  const steps = progress.completedSteps[dayId] ?? [];
  if (steps.includes(stepId)) return progress;
  const nextSteps = [...steps, stepId];
  const today = todayKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const streak = progress.lastStudyDate === today
    ? progress.streak
    : progress.lastStudyDate === todayKey(yesterday) ? progress.streak + 1 : 1;
  const completedDays = nextSteps.length >= 6 && !progress.completedDays.includes(dayNumber)
    ? [...progress.completedDays, dayNumber]
    : progress.completedDays;
  return {
    ...progress,
    completedSteps: { ...progress.completedSteps, [dayId]: nextSteps },
    completedTasks: { ...progress.completedTasks, [dayId]: Math.min(6, nextSteps.length) },
    completedDays,
    streak,
    lastStudyDate: today,
  };
}

export function queuePhraseForReview(progress: ProgressState, phraseId: string, now = new Date()): ProgressState {
  if (progress.reviews.some((review) => review.phraseId === phraseId)) return progress;
  return { ...progress, reviews: [...progress.reviews, { phraseId, dueAt: now.toISOString(), interval: 0, ease: 2.5, correct: 0, attempts: 0 }] };
}

export function scheduleReview(state: ReviewState | undefined, phraseId: string, correct: boolean, now = new Date()): ReviewState {
  const previous = state ?? { phraseId, dueAt: now.toISOString(), interval: 0, ease: 2.5, correct: 0, attempts: 0 };
  const interval = correct ? Math.max(1, Math.round((previous.interval || 1) * previous.ease)) : 1;
  const ease = correct ? Math.min(3, previous.ease + 0.1) : Math.max(1.3, previous.ease - 0.2);
  const due = new Date(now); due.setDate(due.getDate() + interval);
  return { phraseId, dueAt: due.toISOString(), interval, ease, correct: previous.correct + (correct ? 1 : 0), attempts: previous.attempts + 1 };
}
export function dueReviews(reviews: ReviewState[], now = new Date()) { return reviews.filter((review) => new Date(review.dueAt) <= now); }

export function recordScore(progress: ProgressState, score: number, now = new Date()): ProgressState {
  const entry: ScoreEntry = { date: now.toISOString(), score };
  return { ...progress, scoreHistory: [...progress.scoreHistory, entry].slice(-MAX_SCORE_HISTORY) };
}

// Tracks recurring grammar/phrasing/vocabulary notes so the app can surface a
// learner's most persistent mistakes rather than a one-off comparison result.
export function recordWeakSpots(progress: ProgressState, notes: { note: string; category: FeedbackCategory }[], now = new Date()): ProgressState {
  if (notes.length === 0) return progress;
  const weakSpots = { ...progress.weakSpots };
  for (const { note, category } of notes) {
    const key = `${category}:${note}`;
    const existing = weakSpots[key];
    weakSpots[key] = { note, category, count: (existing?.count ?? 0) + 1, lastSeen: now.toISOString() };
  }
  return { ...progress, weakSpots };
}

export function topWeakSpots(progress: ProgressState, limit = 5): WeakSpot[] {
  return Object.values(progress.weakSpots).sort((a, b) => b.count - a.count).slice(0, limit);
}

// Shared by scripted-practice feedback (ConversationFeedback) and AI-conversation
// feedback (AiFeedback) — both carry the same three note categories.
export function weakSpotNotesFrom(feedback: { grammar: string[]; phrasing: string[]; vocabulary: string[] }): { note: string; category: FeedbackCategory }[] {
  return [
    ...feedback.grammar.map((note) => ({ note, category: 'grammar' as const })),
    ...feedback.phrasing.map((note) => ({ note, category: 'phrasing' as const })),
    ...feedback.vocabulary.map((note) => ({ note, category: 'vocabulary' as const })),
  ];
}
