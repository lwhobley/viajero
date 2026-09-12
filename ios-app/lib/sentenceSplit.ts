// Speech.speak() takes a whole utterance, not incremental audio, so streamed
// text is queued to speech one *complete* sentence at a time as it arrives —
// this is what gives a streaming reply an audible "streaming" feel.
export type SentenceSplitState = { spokenLength: number };

export function newSentenceSplitState(): SentenceSplitState {
  return { spokenLength: 0 };
}

const SENTENCE_END = /[.!?…]["')¿¡]?\s+/g;

// Returns any newly-completed sentences in `fullText` since the last call,
// and advances state past them. Trailing text with no terminator yet is left
// for the next call (or the caller's final flush).
export function extractNewSentences(fullText: string, state: SentenceSplitState): string[] {
  const unspoken = fullText.slice(state.spokenLength);
  const sentences: string[] = [];
  let lastEnd = 0;
  SENTENCE_END.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = SENTENCE_END.exec(unspoken))) {
    const sentence = unspoken.slice(lastEnd, match.index + 1).trim();
    if (sentence) sentences.push(sentence);
    lastEnd = SENTENCE_END.lastIndex;
  }
  state.spokenLength += lastEnd;
  return sentences;
}

// Call once the stream is done to flush any trailing text with no terminator.
export function flushRemainder(fullText: string, state: SentenceSplitState): string | null {
  const remainder = fullText.slice(state.spokenLength).trim();
  state.spokenLength = fullText.length;
  return remainder || null;
}
