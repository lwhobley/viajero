import { MATCH_THRESHOLD, normalizePhrase } from './speechMatch';

export type PronunciationConfidence = 'high' | 'medium' | 'low';

export type ConversationFeedback = {
  score: number;
  pronunciationConfidence: PronunciationConfidence;
  grammar: string[];
  phrasing: string[];
  vocabulary: string[];
  tryAgain?: string;
};

// Gender of the nouns used in this app's course vocabulary (constants/course.ts),
// so gender-agreement checks stay accurate without a general Spanish dictionary.
const MASCULINE_NOUNS = new Set(['autobus', 'boleto', 'centro', 'aire', 'acondicionado', 'desayuno', 'lugar', 'placer', 'permiso']);
const FEMININE_NOUNS = new Set(['estacion', 'cuenta', 'reservacion', 'comida', 'ida', 'ayuda', 'vez']);

const ARTICLE_GENDER: Record<string, 'm' | 'f'> = { el: 'm', un: 'm', los: 'm', unos: 'm', la: 'f', una: 'f', las: 'f', unas: 'f' };
const ARTICLE_PAIR: Record<string, string> = { el: 'la', la: 'el', un: 'una', una: 'un', los: 'las', las: 'los', unos: 'unas', unas: 'unos' };

// Correct but less natural word choices this course's model phrases prefer instead.
const PHRASING_UPGRADES: Record<string, string> = { quiero: 'quisiera', puedes: 'puede', dame: 'me da' };

function tokenize(text: string): string[] {
  return normalizePhrase(text).split(' ').filter(Boolean);
}

function checkGenderAgreement(words: string[]): string[] {
  const notes: string[] = [];
  for (let i = 0; i < words.length - 1; i++) {
    const article = words[i];
    const noun = words[i + 1];
    const gender = ARTICLE_GENDER[article];
    if (!gender) continue;
    const mismatch = (gender === 'm' && FEMININE_NOUNS.has(noun)) || (gender === 'f' && MASCULINE_NOUNS.has(noun));
    if (mismatch) notes.push(`"${article} ${noun}" should be "${ARTICLE_PAIR[article]} ${noun}".`);
  }
  return notes;
}

function checkPhrasing(words: string[]): string[] {
  const notes: string[] = [];
  for (const word of words) {
    const upgrade = PHRASING_UPGRADES[word];
    if (upgrade) notes.push(`"${word}" works, but "${upgrade}" sounds more polite for travel situations.`);
  }
  return notes;
}

function diffWords(spoken: string[], target: string[]): { missing: string[]; extra: string[] } {
  const spokenCounts = new Map<string, number>();
  spoken.forEach((word) => spokenCounts.set(word, (spokenCounts.get(word) ?? 0) + 1));
  const targetCounts = new Map<string, number>();
  target.forEach((word) => targetCounts.set(word, (targetCounts.get(word) ?? 0) + 1));

  const missing: string[] = [];
  targetCounts.forEach((count, word) => {
    for (let i = spokenCounts.get(word) ?? 0; i < count; i++) missing.push(word);
  });
  const extra: string[] = [];
  spokenCounts.forEach((count, word) => {
    for (let i = targetCounts.get(word) ?? 0; i < count; i++) extra.push(word);
  });
  return { missing, extra };
}

function confidenceFromScore(score: number, wordCount: number): PronunciationConfidence {
  if (wordCount === 0) return 'low';
  if (score >= 0.85) return 'high';
  if (score >= 0.6) return 'medium';
  return 'low';
}

export function buildConversationFeedback(spoken: string, target: string, score: number): ConversationFeedback {
  const spokenWords = tokenize(spoken);
  const targetWords = tokenize(target);
  const { missing, extra } = diffWords(spokenWords, targetWords);

  const vocabulary: string[] = [];
  if (missing.length) vocabulary.push(`Missing: ${missing.map((word) => `"${word}"`).join(', ')}.`);
  if (extra.length) vocabulary.push(`Not needed here: ${extra.map((word) => `"${word}"`).join(', ')}.`);

  const grammar = checkGenderAgreement(spokenWords);
  const phrasing = checkPhrasing(spokenWords);
  const pronunciationConfidence = confidenceFromScore(score, spokenWords.length);

  let tryAgain: string | undefined;
  if (score < MATCH_THRESHOLD) {
    if (missing.length) tryAgain = `Try again and include ${missing.map((word) => `"${word}"`).join(', ')}.`;
    else if (pronunciationConfidence === 'low') tryAgain = 'Try again a little slower so the words come through clearly.';
    else tryAgain = 'Close! Try again and match the word order of the model phrase.';
  }

  return { score, pronunciationConfidence, grammar, phrasing, vocabulary, tryAgain };
}
