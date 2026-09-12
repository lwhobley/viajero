import * as FileSystem from 'expo-file-system';
import { Phrase } from '@/constants/course';
import { ProgressState, topWeakSpots } from './progress';

// Anki's built-in text importer reads tab-separated "front\tback" lines
// directly — no .apkg packaging needed for a personal export like this.
function escapeField(value: string): string {
  return value.replace(/\t/g, ' ').replace(/\n/g, ' ');
}

export function buildFlashcardDeck(phrases: Phrase[], progress: ProgressState): string {
  const lines: string[] = [];
  for (const phrase of phrases) {
    lines.push(`${escapeField(phrase.spanish)}\t${escapeField(phrase.english)}`);
  }
  const weakSpots = topWeakSpots(progress, 20);
  for (const spot of weakSpots) {
    lines.push(`${escapeField(`[${spot.category}] ${spot.note}`)}\tReviewed ${spot.count}× — practice this again`);
  }
  return lines.join('\n');
}

export async function writeFlashcardFile(deck: string): Promise<string> {
  if (!FileSystem.cacheDirectory) throw new Error('no_cache_directory');
  const path = `${FileSystem.cacheDirectory}viajero-flashcards.txt`;
  await FileSystem.writeAsStringAsync(path, deck, { encoding: FileSystem.EncodingType.UTF8 });
  return path;
}
