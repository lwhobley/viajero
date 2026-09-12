import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { AiChatMessage, AiFeedback, getAiFeedback, streamAiReply } from '@/lib/aiConversation';
import { loadAiHistory, saveAiHistory } from '@/lib/aiHistory';
import { extractNewSentences, flushRemainder, newSentenceSplitState } from '@/lib/sentenceSplit';
import { FeedbackCategory, weakSpotNotesFrom } from '@/lib/progress';
import { supabaseConfigured } from '@/lib/supabaseClient';
import { styles } from '@/styles';
import { NotesPanel } from './FeedbackPanel';
import { VoicePractice } from './VoicePractice';

type DisplayMessage = AiChatMessage & { id: string; feedback?: AiFeedback };
let idCounter = 0;
function nextId(): string { idCounter += 1; return `ai-msg-${Date.now()}-${idCounter}`; }

const speak = (text: string) => Speech.speak(text, { language: 'es-MX', rate: 0.85 });

export function AiConversation({
  scenarioKey,
  scenario,
  level,
  onWeakSpots,
}: {
  scenarioKey: string;
  scenario: string;
  level: number;
  onWeakSpots: (notes: { note: string; category: FeedbackCategory }[]) => void;
}) {
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const [streamingText, setStreamingText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const historyLoaded = useRef(false);

  useEffect(() => {
    // Guards against a stale load resolving after the scenario has already
    // changed again — without this, an old scenario's history can land after
    // the switch and get saved back out under the new scenario's key.
    let cancelled = false;
    historyLoaded.current = false;
    setMessages([]);
    loadAiHistory(scenarioKey).then((saved) => {
      if (cancelled) return;
      setMessages(saved.map((message) => ({ ...message, id: nextId() })));
      historyLoaded.current = true;
    });
    return () => { cancelled = true; };
  }, [scenarioKey]);

  useEffect(() => {
    if (!historyLoaded.current) return;
    saveAiHistory(scenarioKey, messages.map(({ role, content }) => ({ role, content })));
  }, [messages, scenarioKey]);

  const send = async (spokenText?: string) => {
    const text = (spokenText ?? input).trim();
    if (!text || loading) return;
    const userMessage: DisplayMessage = { id: nextId(), role: 'user', content: text };
    const contextForFeedback = messages.slice(-6).map(({ role, content }) => ({ role, content }));
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setInput('');
    setLoading(true);
    setError(null);
    setStreamingText('');

    const splitState = newSentenceSplitState();
    try {
      const fullReply = await streamAiReply(
        nextMessages.map(({ role, content }) => ({ role, content })),
        scenario,
        level,
        (_delta, soFar) => {
          setStreamingText(soFar);
          for (const sentence of extractNewSentences(soFar, splitState)) speak(sentence);
        },
      );
      const remainder = flushRemainder(fullReply, splitState);
      if (remainder) speak(remainder);

      setMessages((current) => [...current, { id: nextId(), role: 'assistant', content: fullReply }]);
      setStreamingText(null);

      getAiFeedback(text, scenario, contextForFeedback)
        .then((feedback) => {
          setMessages((current) => current.map((m) => (m.id === userMessage.id ? { ...m, feedback } : m)));
          const notes = weakSpotNotesFrom(feedback);
          if (notes.length) onWeakSpots(notes);
        })
        .catch(() => {});
    } catch (err) {
      setStreamingText(null);
      const message = err instanceof Error ? err.message : '';
      setError(message === 'rate_limited' ? "You've reached today's AI conversation limit — try again tomorrow." : 'Could not reach the AI conversation partner. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseConfigured) return <View style={styles.card}><Text style={styles.copy}>AI conversation isn't configured on this build yet — it needs Supabase credentials to reach the backend.</Text></View>;

  return <View style={styles.section}>
    <View style={styles.conversation}>
      {messages.length === 0 && !streamingText && <Text style={styles.helper}>Say hello to start a live Spanish conversation, adapted to your level.</Text>}
      {messages.map((message) => <View key={message.id} style={[styles.bubble, message.role === 'user' ? styles.youBubble : styles.serverBubble]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
        <Text style={styles.bubbleLabel}>{message.role === 'user' ? 'TÚ' : 'IA'}</Text>
        {message.feedback && <NotesPanel grammar={message.feedback.grammar} phrasing={message.feedback.phrasing} vocabulary={message.feedback.vocabulary} />}
      </View>)}
      {streamingText !== null && <View style={[styles.bubble, styles.serverBubble]}>
        <Text style={styles.bubbleText}>{streamingText || '…'}</Text>
        <Text style={styles.bubbleLabel}>IA</Text>
      </View>}
      {error && <Text style={styles.feedbackTryAgain}>{error}</Text>}
    </View>
    <View style={styles.inputRow}>
      <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => send()} placeholder="Escribe o habla..." placeholderTextColor="#9a9d94" style={styles.input} />
      <Pressable onPress={() => send()} style={styles.send}><Text style={styles.sendText}>Send</Text></Pressable>
    </View>
    <VoicePractice onResult={(transcript) => send(transcript)} />
  </View>;
}
