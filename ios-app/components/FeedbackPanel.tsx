import { Text, View } from 'react-native';
import { ConversationFeedback } from '@/lib/conversationFeedback';
import { styles } from '@/styles';

const confidenceLabels: Record<ConversationFeedback['phraseMatchConfidence'], string> = { high: 'High', medium: 'Medium', low: 'Low' };

export function FeedbackPanel({ feedback, showConfidence }: { feedback: ConversationFeedback; showConfidence: boolean }) {
  const notes = [...feedback.grammar, ...feedback.phrasing, ...feedback.vocabulary];
  if (!notes.length && !feedback.tryAgain && !showConfidence) return null;
  return <View style={styles.feedback}>
    {showConfidence && <Text style={styles.feedbackConfidence}>Phrase match: {confidenceLabels[feedback.phraseMatchConfidence]}</Text>}
    {notes.map((note, index) => <Text key={index} style={styles.feedbackNote}>• {note}</Text>)}
    {feedback.tryAgain && <Text style={styles.feedbackTryAgain}>{feedback.tryAgain}</Text>}
  </View>;
}

// A simpler variant for AI-conversation feedback, which has no phrase-match
// score or phrase-match confidence — just grammar/phrasing/vocabulary notes.
export function NotesPanel({ grammar, phrasing, vocabulary }: { grammar: string[]; phrasing: string[]; vocabulary: string[] }) {
  const notes = [...grammar, ...phrasing, ...vocabulary];
  if (!notes.length) return null;
  return <View style={styles.feedback}>
    {notes.map((note, index) => <Text key={index} style={styles.feedbackNote}>• {note}</Text>)}
  </View>;
}
