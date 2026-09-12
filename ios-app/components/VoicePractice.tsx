import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSpeechToText } from '@/lib/useSpeechToText';
import { comparePhrase, PhraseComparison } from '@/lib/speechMatch';
import { buildConversationFeedback, ConversationFeedback } from '@/lib/conversationFeedback';
import { styles } from '@/styles';
import { FeedbackPanel } from './FeedbackPanel';

export function VoicePractice({ targetPhrase, onResult }: { targetPhrase?: string; onResult: (transcript: string, comparison?: PhraseComparison, feedback?: ConversationFeedback) => void }) {
  const { status, transcript, start, stop } = useSpeechToText();
  const [result, setResult] = useState<PhraseComparison | null>(null);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);
  const wasListening = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  // Depends on transcript as well as status: the final result event can land
  // after the end event, and finalizing on status alone would drop it.
  useEffect(() => {
    if (status === 'listening') { wasListening.current = true; setResult(null); setFeedback(null); return; }
    if (status !== 'idle' || !wasListening.current || !transcript) return;
    wasListening.current = false;
    const comparison = targetPhrase ? comparePhrase(transcript, targetPhrase) : undefined;
    const newFeedback = targetPhrase && comparison ? buildConversationFeedback(transcript, targetPhrase, comparison.score) : null;
    setResult(comparison ?? null);
    setFeedback(newFeedback);
    onResultRef.current(transcript, comparison, newFeedback ?? undefined);
  }, [status, transcript, targetPhrase]);

  const toggle = () => (status === 'listening' ? stop() : start());
  const message =
    status === 'denied' ? 'Microphone or speech access is off. Enable it in iPhone Settings to use voice practice.'
    : status === 'unsupported' ? 'Speech recognition needs a development build — it is not available in Expo Go.'
    : status === 'error' ? 'Could not understand that. Try again.'
    : status === 'listening' ? 'Listening… say the phrase aloud.'
    : result ? (result.isMatch ? `¡Muy bien! You said: “${transcript}”` : `Heard: “${transcript}”. Try again to match the phrase.`)
    : transcript ? `You said: “${transcript}”`
    : 'Record yourself saying the phrase in Spanish.';

  return <View style={styles.voicePractice}>
    <Text style={styles.eyebrow}>SPEAKING PRACTICE</Text>
    <Text style={styles.copy}>{message}</Text>
    {result && <View style={styles.scoreTrack}><View style={[styles.scoreFill, { width: `${Math.round(result.score * 100)}%` }, result.isMatch ? styles.scoreFillGood : styles.scoreFillRetry]} /></View>}
    {feedback && <FeedbackPanel feedback={feedback} showConfidence />}
    <Pressable style={[styles.recordButton, status === 'listening' && styles.recordingButton]} onPress={toggle}>
      <Text style={styles.recordText}>{status === 'listening' ? 'Stop recording' : '● Record yourself'}</Text>
    </Pressable>
  </View>;
}
