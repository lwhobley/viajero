import { supabase } from './supabaseClient';
import { initialProgress, ProgressState, ReviewState } from './progress';

const TABLE = 'user_progress';

export async function pullProgress(userId: string): Promise<ProgressState | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from(TABLE).select('data').eq('user_id', userId).maybeSingle();
  if (error || !data) return null;
  return { ...initialProgress, ...(data.data as Partial<ProgressState>) };
}

export async function pushProgress(userId: string, progress: ProgressState): Promise<void> {
  if (!supabase) return;
  await supabase.from(TABLE).upsert({ user_id: userId, data: progress, updated_at: new Date().toISOString() });
}

function mergeReviews(a: ReviewState[], b: ReviewState[]): ReviewState[] {
  const byPhrase = new Map<string, ReviewState>();
  for (const review of [...a, ...b]) {
    const existing = byPhrase.get(review.phraseId);
    if (!existing || existing.attempts < review.attempts) byPhrase.set(review.phraseId, review);
  }
  return Array.from(byPhrase.values());
}

// A simple take-the-further-along merge: it never loses progress made on
// either device, at the cost of being unable to tell which side is "newer".
export function mergeProgress(local: ProgressState, remote: ProgressState): ProgressState {
  const dayIds = new Set([...Object.keys(local.completedTasks), ...Object.keys(remote.completedTasks)]);
  return {
    currentDay: Math.max(local.currentDay, remote.currentDay),
    completedDays: Array.from(new Set([...local.completedDays, ...remote.completedDays])).sort((a, b) => a - b),
    completedTasks: Object.fromEntries(Array.from(dayIds, (dayId) => [dayId, Math.max(local.completedTasks[dayId] ?? 0, remote.completedTasks[dayId] ?? 0)])),
    streak: Math.max(local.streak, remote.streak),
    lastStudyDate: [local.lastStudyDate, remote.lastStudyDate].filter(Boolean).sort().pop(),
    reviews: mergeReviews(local.reviews, remote.reviews),
  };
}
