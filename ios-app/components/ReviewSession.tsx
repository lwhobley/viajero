import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Phrase } from '@/constants/course';
import { ReviewState } from '@/lib/progress';
import { styles } from '@/styles';

export function ReviewSession({
  due,
  phraseById,
  onGrade,
  onSpeak,
}: {
  due: ReviewState[];
  phraseById: Map<string, Phrase>;
  onGrade: (phraseId: string, correct: boolean) => void;
  onSpeak: (spanish: string) => void;
}) {
  // Grading a review reschedules it, which removes it from the parent's live
  // `due` list on the very next render — indexing into that shrinking list
  // would skip whichever item follows the one just graded. Snapshotting once
  // on mount keeps this session's order stable; the caller remounts this
  // component (via a changing `key`) to start a genuinely fresh session.
  const [queue] = useState(due);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const review = queue[index];
  const phrase = review ? phraseById.get(review.phraseId) : undefined;

  if (!queue.length) return <View style={styles.reviewCard}><Text style={styles.reviewEmpty}>Your review queue is clear. Come back tomorrow, or keep practicing today's scene.</Text></View>;
  if (!review || !phrase) return <View style={styles.reviewCard}><Text style={styles.reviewEmpty}>Session complete — nice work!</Text></View>;

  const grade = (correct: boolean) => {
    onGrade(phrase.id, correct);
    setRevealed(false);
    setIndex((current) => current + 1);
  };

  return <View style={styles.reviewCard}>
    <Text style={styles.reviewCounter}>{index + 1} of {queue.length}</Text>
    <Text style={styles.reviewCategory}>{phrase.category}</Text>
    <Text style={styles.reviewPrompt}>{phrase.english}</Text>
    {revealed
      ? <Text style={styles.reviewRevealed}>{phrase.spanish}</Text>
      : <Pressable style={styles.revealButton} onPress={() => { setRevealed(true); onSpeak(phrase.spanish); }}>
          <Text style={styles.revealButtonText}>Reveal</Text>
        </Pressable>}
    {revealed && <View style={styles.reviewActions}>
      <Pressable style={styles.reviewMissedButton} onPress={() => grade(false)}><Text style={styles.reviewButtonText}>Missed it</Text></Pressable>
      <Pressable style={styles.reviewGoodButton} onPress={() => grade(true)}><Text style={styles.reviewButtonText}>Got it</Text></Pressable>
    </View>}
  </View>;
}
