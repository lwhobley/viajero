import { Text, View } from 'react-native';
import { ScoreEntry, todayKey } from '@/lib/progress';
import { styles } from '@/styles';

const DAYS_SHOWN = 14;

function bucketByDay(history: ScoreEntry[]): number[] {
  const byDay = new Map<string, number[]>();
  for (const entry of history) {
    const day = todayKey(new Date(entry.date));
    const bucket = byDay.get(day) ?? [];
    bucket.push(entry.score);
    byDay.set(day, bucket);
  }
  const days: number[] = [];
  const now = new Date();
  for (let offset = DAYS_SHOWN - 1; offset >= 0; offset--) {
    const date = new Date(now);
    date.setDate(date.getDate() - offset);
    const scores = byDay.get(todayKey(date));
    days.push(scores && scores.length ? scores.reduce((sum, s) => sum + s, 0) / scores.length : -1);
  }
  return days;
}

function colorFor(score: number): string {
  if (score < 0) return '#e5e5db';
  if (score >= 0.85) return '#337256';
  if (score >= 0.6) return '#f1a184';
  return '#a4473d';
}

export function TrendSparkline({ history }: { history: ScoreEntry[] }) {
  if (history.length === 0) return <Text style={styles.trendEmpty}>Practice a phrase aloud to start tracking your pronunciation trend.</Text>;
  const days = bucketByDay(history);
  return <View style={styles.sparklineRow}>
    {days.map((score, index) => <View key={index} style={styles.sparklineBarTrack}>
      {score >= 0 && <View style={[styles.sparklineBarFill, { height: `${Math.max(8, Math.round(score * 100))}%`, backgroundColor: colorFor(score) }]} />}
    </View>)}
  </View>;
}
