export function normalizePhrase(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ñ\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function levenshtein(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const distances = Array.from({ length: rows }, (_, i) => [i, ...new Array(cols - 1).fill(0)]);
  for (let col = 1; col < cols; col++) distances[0][col] = col;
  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < cols; col++) {
      const cost = a[row - 1] === b[col - 1] ? 0 : 1;
      distances[row][col] = Math.min(
        distances[row - 1][col] + 1,
        distances[row][col - 1] + 1,
        distances[row - 1][col - 1] + cost,
      );
    }
  }
  return distances[rows - 1][cols - 1];
}

export function similarity(spoken: string, target: string): number {
  const normSpoken = normalizePhrase(spoken);
  const normTarget = normalizePhrase(target);
  if (!normSpoken && !normTarget) return 1;
  const distance = levenshtein(normSpoken, normTarget);
  const maxLength = Math.max(normSpoken.length, normTarget.length) || 1;
  return 1 - distance / maxLength;
}

export const MATCH_THRESHOLD = 0.8;

export type PhraseComparison = { score: number; isMatch: boolean };

export function comparePhrase(spoken: string, target: string): PhraseComparison {
  const score = similarity(spoken, target);
  return { score, isMatch: score >= MATCH_THRESHOLD };
}
