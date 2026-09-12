import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import { course, phrases, scene } from '@/constants/course';
import { dueReviews, initialProgress, loadProgress, ProgressState, saveProgress, scheduleReview, todayKey } from '@/lib/progress';
import { useSpeechToText } from '@/lib/useSpeechToText';
import { comparePhrase, PhraseComparison } from '@/lib/speechMatch';
import { buildConversationFeedback, ConversationFeedback } from '@/lib/conversationFeedback';
import { AiChatMessage, sendAiMessage } from '@/lib/aiConversation';
import { supabaseConfigured } from '@/lib/supabaseClient';
import { getSession, isRealAccount, signInWithPassword, signOut, signUpWithPassword, subscribeToAuth } from '@/lib/auth';
import { mergeProgress, pullProgress, pushProgress } from '@/lib/cloudSync';
import type { Session } from '@supabase/supabase-js';

type Tab = 'today' | 'practice' | 'conversation' | 'progress' | 'profile';
const ink = '#173f35'; const muted = '#6e756f'; const cream = '#f7f4ec'; const paper = '#fffdf7'; const peach = '#f1a184';
const confidenceLabels: Record<ConversationFeedback['pronunciationConfidence'], string> = { high: 'High', medium: 'Medium', low: 'Low' };

function FeedbackPanel({ feedback, showConfidence }: { feedback: ConversationFeedback; showConfidence: boolean }) {
  const notes = [...feedback.grammar, ...feedback.phrasing, ...feedback.vocabulary];
  if (!notes.length && !feedback.tryAgain && !showConfidence) return null;
  return <View style={styles.feedback}>
    {showConfidence && <Text style={styles.feedbackConfidence}>Pronunciation confidence: {confidenceLabels[feedback.pronunciationConfidence]}</Text>}
    {notes.map((note, index) => <Text key={index} style={styles.feedbackNote}>• {note}</Text>)}
    {feedback.tryAgain && <Text style={styles.feedbackTryAgain}>{feedback.tryAgain}</Text>}
  </View>;
}

function VoicePractice({ targetPhrase, onResult }: { targetPhrase?: string; onResult: (transcript: string, comparison?: PhraseComparison) => void }) {
  const { status, transcript, start, stop } = useSpeechToText();
  const [result, setResult] = useState<PhraseComparison | null>(null);
  const [feedback, setFeedback] = useState<ConversationFeedback | null>(null);
  const wasListening = useRef(false);

  useEffect(() => {
    if (status === 'listening') { wasListening.current = true; setResult(null); setFeedback(null); }
    else if (status === 'idle' && wasListening.current) {
      wasListening.current = false;
      if (transcript) {
        const comparison = targetPhrase ? comparePhrase(transcript, targetPhrase) : undefined;
        setResult(comparison ?? null);
        setFeedback(targetPhrase && comparison ? buildConversationFeedback(transcript, targetPhrase, comparison.score) : null);
        onResult(transcript, comparison);
      }
    }
  }, [status]);

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

function AiConversation({ scenario, level }: { scenario: string; level: number }) {
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const speak = (text: string) => Speech.speak(text, { language: 'es-MX', rate: 0.85 });

  const send = async (spokenText?: string) => {
    const text = (spokenText ?? input).trim();
    if (!text || loading) return;
    const nextMessages: AiChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages); setInput(''); setLoading(true); setError(null);
    try {
      const reply = await sendAiMessage(nextMessages, scenario, level);
      setMessages((current) => [...current, { role: 'assistant', content: reply }]);
      speak(reply);
    } catch {
      setError('Could not reach the AI conversation partner. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!supabaseConfigured) return <View style={styles.card}><Text style={styles.copy}>AI conversation isn't configured on this build yet — it needs Supabase credentials to reach the backend.</Text></View>;

  return <View style={styles.section}>
    <View style={styles.conversation}>
      {messages.length === 0 && <Text style={styles.helper}>Say hello to start a live Spanish conversation, adapted to your level.</Text>}
      {messages.map((message, index) => <View key={index} style={[styles.bubble, message.role === 'user' ? styles.youBubble : styles.serverBubble]}>
        <Text style={styles.bubbleText}>{message.content}</Text>
        <Text style={styles.bubbleLabel}>{message.role === 'user' ? 'TÚ' : 'IA'}</Text>
      </View>)}
      {loading && <Text style={styles.helper}>Pensando…</Text>}
      {error && <Text style={styles.feedbackTryAgain}>{error}</Text>}
    </View>
    <View style={styles.inputRow}>
      <TextInput value={input} onChangeText={setInput} onSubmitEditing={() => send()} placeholder="Escribe o habla..." placeholderTextColor="#9a9d94" style={styles.input} />
      <Pressable onPress={() => send()} style={styles.send}><Text style={styles.sendText}>Send</Text></Pressable>
    </View>
    <VoicePractice onResult={(transcript) => send(transcript)} />
  </View>;
}

type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

function AccountPanel({ session, syncStatus }: { session: Session | null; syncStatus: SyncStatus }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const loggedIn = isRealAccount(session?.user);

  const submit = async () => {
    if (!email.trim() || !password) { setMessage('Enter an email and password.'); return; }
    setBusy(true); setMessage(null);
    const result = mode === 'signup' ? await signUpWithPassword(email.trim(), password) : await signInWithPassword(email.trim(), password);
    setBusy(false);
    if (result.error) setMessage(result.error);
    else if (mode === 'signup') setMessage('Check your email to confirm your account, then sign in.');
  };

  if (!supabaseConfigured) return null;

  if (loggedIn) {
    return <View style={styles.card}>
      <Text style={styles.cardTitle}>Signed in</Text>
      <Text style={styles.profileLine}>{session?.user.email}</Text>
      <Text style={styles.helper}>{syncStatus === 'syncing' ? 'Syncing progress…' : syncStatus === 'error' ? 'Could not sync — check your connection.' : 'Progress syncs automatically across your devices.'}</Text>
      <Pressable style={styles.outlineButton} onPress={() => signOut()}><Text style={styles.outlineText}>Sign out</Text></Pressable>
    </View>;
  }

  return <View style={styles.card}>
    <Text style={styles.cardTitle}>Sync across devices</Text>
    <Text style={styles.copy}>Sign in to back up your progress and pick up where you left off on another device. This is optional — the app keeps working fully offline without an account.</Text>
    <TextInput value={email} onChangeText={setEmail} placeholder="Email" placeholderTextColor="#9a9d94" autoCapitalize="none" keyboardType="email-address" style={styles.input} />
    <TextInput value={password} onChangeText={setPassword} placeholder="Password" placeholderTextColor="#9a9d94" secureTextEntry style={styles.input} />
    {message && <Text style={styles.feedbackTryAgain}>{message}</Text>}
    <View style={styles.buttonRow}>
      <Pressable style={styles.peachButton} disabled={busy} onPress={submit}><Text style={styles.peachText}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</Text></Pressable>
      <Pressable style={styles.outlineButton} onPress={() => { setMode(mode === 'signup' ? 'signin' : 'signup'); setMessage(null); }}><Text style={styles.outlineText}>{mode === 'signup' ? 'Have an account? Sign in' : 'New? Create account'}</Text></Pressable>
    </View>
  </View>;
}

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('today');
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [reply, setReply] = useState('');
  const [messages, setMessages] = useState<{ text: string; from: 'server' | 'you'; feedback?: ConversationFeedback; fromVoice?: boolean }[]>([{ text: 'Buenas tardes. ¿Qué le gustaría?', from: 'server' }]);
  const [step, setStep] = useState(0);
  const [conversationMode, setConversationMode] = useState<'scripted' | 'ai'>('scripted');
  const expectedByStep = [scene[1].es, scene[3].es, scene[5].es];
  const [loaded, setLoaded] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('idle');
  const day = course[Math.min(progress.currentDay, course.length) - 1];
  const dayPhrases = useMemo(() => phrases.filter((phrase) => phrase.day === day.day), [day.day]);
  const done = progress.completedTasks[day.id] ?? 0;
  const reviewCount = dueReviews(progress.reviews).length;
  const aiLevel = Math.min(5, Math.max(1, Math.floor(progress.completedDays.length / 10) + 1));
  const syncUserId = isRealAccount(session?.user) ? session!.user.id : null;

  useEffect(() => { loadProgress().then((saved) => { setProgress(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) saveProgress(progress); }, [progress, loaded]);

  useEffect(() => {
    getSession().then(setSession);
    return subscribeToAuth(setSession);
  }, []);

  // On sign-in, merge whatever is in the cloud into local progress once.
  useEffect(() => {
    if (!loaded || !syncUserId) return;
    let cancelled = false;
    setSyncStatus('syncing');
    pullProgress(syncUserId)
      .then((remote) => { if (!cancelled) { if (remote) setProgress((current) => mergeProgress(current, remote)); setSyncStatus('synced'); } })
      .catch(() => { if (!cancelled) setSyncStatus('error'); });
    return () => { cancelled = true; };
  }, [loaded, syncUserId]);

  // Push local changes to the cloud (debounced) whenever signed in.
  useEffect(() => {
    if (!loaded || !syncUserId) return;
    const timeout = setTimeout(() => {
      pushProgress(syncUserId, progress).then(() => setSyncStatus('synced')).catch(() => setSyncStatus('error'));
    }, 1000);
    return () => clearTimeout(timeout);
  }, [progress, loaded, syncUserId]);

  const speak = (text: string, slow = false) => Speech.speak(text, { language: 'es-MX', rate: slow ? 0.64 : 0.85 });
  const completeTask = (phraseId?: string, correct = true) => {
    setProgress((current) => {
      const next: ProgressState = { ...current, completedTasks: { ...current.completedTasks, [day.id]: Math.min(6, (current.completedTasks[day.id] ?? 0) + 1) } };
      if (phraseId) { const existing = current.reviews.find((item) => item.phraseId === phraseId); next.reviews = [...current.reviews.filter((item) => item.phraseId !== phraseId), scheduleReview(existing, phraseId, correct)]; }
      if (next.completedTasks[day.id] === 6 && !next.completedDays.includes(day.day)) { next.completedDays = [...next.completedDays, day.day]; }
      return next;
    });
  };
  const sendReply = (spokenText?: string, fromVoice = false) => {
    const text = (spokenText ?? reply).trim(); if (!text) return;
    const expected = expectedByStep[Math.min(step, expectedByStep.length - 1)];
    const feedback = buildConversationFeedback(text, expected, comparePhrase(text, expected).score);
    setMessages((items) => [...items, { text, from: 'you', feedback, fromVoice }]); setReply(''); completeTask();
    const lower = text.toLowerCase(); let answer = 'Perfecto. ¿Algo más?';
    if (step === 0) { answer = lower.includes('quis') || lower.includes('quier') ? '¡Muy bien! ¿Para tomar?' : 'Puede decir: “Quisiera los tacos, por favor.”'; setStep(lower.includes('quis') || lower.includes('quier') ? 1 : 0); }
    else if (step === 1) { answer = 'Perfecto. ¿Algo más?'; setStep(2); } else { answer = '¡Excelente! Has terminado el pedido.'; setStep(0); }
    setTimeout(() => { setMessages((items) => [...items, { text: answer, from: 'server' }]); speak(answer); }, 250);
  };
  const selectDay = (nextDay: number) => { setProgress((current) => ({ ...current, currentDay: nextDay })); setTab('today'); };

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.header}><View style={styles.brandRow}><Image source={require('../assets/viajero-logo.png')} style={styles.logo} /><Text style={styles.brand}>Viajero</Text></View><Text style={styles.streak}>🔥 {progress.streak || 1} day streak</Text></View>
    <View style={styles.hero}><Text style={styles.eyebrow}>DAY {String(day.day).padStart(2, '0')} · {day.unit.toUpperCase()}</Text><Text style={styles.heroTitle}>{day.title}.</Text><Text style={styles.heroCopy}>Two focused hours: listen, repeat, speak, and use Spanish in a real travel situation.</Text><View style={styles.progressLabel}><Text>Today's lesson</Text><Text>{done} / 6 tasks</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(done / 6) * 100}%` }]} /></View></View>
    <View style={styles.tabs}>{(['today', 'practice', 'conversation', 'progress', 'profile'] as Tab[]).map((name) => <Pressable key={name} onPress={() => setTab(name)} style={[styles.tab, tab === name && styles.activeTab]}><Text style={[styles.tabText, tab === name && styles.activeTabText]}>{name === 'today' ? 'Today' : name === 'practice' ? 'Practice' : name === 'conversation' ? 'Talk' : name === 'progress' ? 'Progress' : 'Profile'}</Text></Pressable>)}</View>

    {tab === 'today' && <View style={styles.section}><Text style={styles.eyebrow}>YOUR NEXT 30 MINUTES</Text><Text style={styles.sectionTitle}>{day.focus}</Text><Text style={styles.copy}>{day.mission}</Text><View style={styles.card}><Text style={styles.cardTitle}>Today's 2-hour rhythm</Text>{[['20 min', 'Recall yesterday'], ['30 min', 'Learn the scene'], ['30 min', 'Talk back'], ['25 min', 'Listen and shadow'], ['15 min', 'Spaced review']].map(([time, label], index) => <View key={label} style={styles.taskRow}><Text style={styles.time}>{time}</Text><Text style={styles.task}>{label}</Text><Text style={styles.check}>{done > index ? '✓' : '○'}</Text></View>)}</View><Pressable style={styles.darkButton} onPress={() => setTab('practice')}><Text style={styles.darkButtonText}>Start practice →</Text></Pressable><View style={styles.callout}><Text style={styles.eyebrow}>REVIEW QUEUE</Text><Text style={styles.challengeTitle}>{reviewCount ? `${reviewCount} phrases are ready to review.` : 'Your review queue is clear.'}</Text><Text style={styles.copy}>Short reviews keep phrases available when you need them in a real conversation.</Text></View></View>}

    {tab === 'practice' && <View style={styles.section}><View style={styles.sectionHeader}><View><Text style={styles.eyebrow}>SCENE · {day.focus.toUpperCase()}</Text><Text style={styles.sectionTitle}>Listen, then speak</Text></View><Pressable style={styles.darkButton} onPress={() => scene.forEach((line, index) => setTimeout(() => speak(line.es), index * 1450))}><Text style={styles.darkButtonText}>▶ Play scene</Text></Pressable></View><View style={styles.card}>{scene.map((line) => <View key={line.es} style={styles.line}><Text style={styles.speaker}>{line.who}</Text><Text style={styles.spanish}>{line.es}</Text><Pressable onPress={() => speak(line.es)} style={styles.play}><Text>▶</Text></Pressable><Text style={styles.english}>{line.en}</Text></View>)}</View><View style={styles.phraseGrid}>{dayPhrases.map((phrase) => <Pressable key={phrase.id} onPress={() => { speak(phrase.spanish); completeTask(phrase.id); }} style={styles.phrase}><Text style={styles.phraseSound}>🔊</Text><Text style={styles.phraseEs}>{phrase.spanish}</Text><Text style={styles.phraseEn}>{phrase.english}</Text></Pressable>)}</View><View style={styles.challenge}><Text style={styles.eyebrow}>SAY IT ALOUD</Text><Text style={styles.challengeTitle}>Quisiera los tacos al pastor, por favor.</Text><Text style={styles.copy}>Hear it at two speeds, then say it yourself.</Text><View style={styles.buttonRow}><Pressable style={styles.peachButton} onPress={() => speak('Quisiera los tacos al pastor, por favor.')}><Text style={styles.peachText}>Hear normally</Text></Pressable><Pressable style={styles.outlineButton} onPress={() => { speak('Quisiera los tacos al pastor, por favor.', true); completeTask(); }}><Text style={styles.outlineText}>Hear slowly</Text></Pressable></View><VoicePractice targetPhrase="Quisiera los tacos al pastor, por favor." onResult={() => completeTask()} /></View></View>}

    {tab === 'conversation' && <View style={styles.section}>
      <View style={styles.sectionHeader}><View><Text style={styles.eyebrow}>LIVE PRACTICE</Text><Text style={styles.sectionTitle}>Talk to the server</Text></View><Text style={styles.ready}>● Voice ready</Text></View>
      <View style={styles.modeRow}>
        <Pressable onPress={() => setConversationMode('scripted')} style={[styles.modeTab, conversationMode === 'scripted' && styles.modeTabActive]}><Text style={[styles.modeTabText, conversationMode === 'scripted' && styles.modeTabTextActive]}>Guided scene</Text></Pressable>
        <Pressable onPress={() => setConversationMode('ai')} style={[styles.modeTab, conversationMode === 'ai' && styles.modeTabActive]}><Text style={[styles.modeTabText, conversationMode === 'ai' && styles.modeTabTextActive]}>AI conversation</Text></Pressable>
      </View>
      {conversationMode === 'scripted' ? <>
        <View style={styles.conversation}>{messages.map((message, index) => <View key={`${message.text}-${index}`} style={[styles.bubble, message.from === 'you' ? styles.youBubble : styles.serverBubble]}><Text style={styles.bubbleText}>{message.text}</Text><Text style={styles.bubbleLabel}>{message.from === 'you' ? 'TÚ' : 'SERVIDOR'}</Text>{message.feedback && <FeedbackPanel feedback={message.feedback} showConfidence={!!message.fromVoice} />}</View>)}</View>
        <Text style={styles.helper}>Type an answer or record yourself. The server still speaks back in Spanish.</Text>
        <View style={styles.inputRow}><TextInput value={reply} onChangeText={setReply} onSubmitEditing={() => sendReply()} placeholder="Escribe tu respuesta..." placeholderTextColor="#9a9d94" style={styles.input} /><Pressable onPress={() => sendReply()} style={styles.send}><Text style={styles.sendText}>Send</Text></Pressable></View>
        <VoicePractice onResult={(transcript) => sendReply(transcript, true)} />
      </> : <AiConversation scenario={`${day.focus}: ${day.mission}`} level={aiLevel} />}
    </View>}

    {tab === 'progress' && <View style={styles.section}><Text style={styles.eyebrow}>YOUR 90-DAY PATH</Text><Text style={styles.sectionTitle}>{progress.completedDays.length} days completed</Text><Text style={styles.copy}>Each day is a complete travel conversation. Tap any day to revisit it and build listening confidence.</Text><View style={styles.dayGrid}>{course.map((item) => <Pressable key={item.id} onPress={() => selectDay(item.day)} style={[styles.dayCard, day.day === item.day && styles.selectedDay]}><Text style={styles.dayNumber}>{String(item.day).padStart(2, '0')}</Text><Text style={styles.dayTitle}>{item.title}</Text><Text style={styles.dayUnit}>{item.unit}</Text>{progress.completedDays.includes(item.day) && <Text style={styles.complete}>✓ complete</Text>}</Pressable>)}</View></View>}

    {tab === 'profile' && <View style={styles.section}><Text style={styles.eyebrow}>TRAVELER PROFILE</Text><Text style={styles.sectionTitle}>Spanish for real life</Text><Text style={styles.copy}>Your plan is tuned for Mexico, Costa Rica, and Spain, with restaurants, transportation, hotels, and meeting locals as the core situations.</Text><View style={styles.card}><Text style={styles.cardTitle}>Your practice preferences</Text><Text style={styles.profileLine}>✓ Listening + speaking first</Text><Text style={styles.profileLine}>✓ Repetition with visual phrase cards</Text><Text style={styles.profileLine}>✓ Two hours available each day</Text><Text style={styles.profileLine}>✓ Goal: understand and join everyday conversations</Text></View><AccountPanel session={session} syncStatus={syncStatus} /><Text style={styles.helper}>The app works fully offline. Progress is always stored on this device; signing in is optional and only adds a cloud backup.</Text></View>}
  </ScrollView>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: cream }, content: { padding: 20, gap: 18, paddingBottom: 48 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, logo: { width: 30, height: 30, borderRadius: 15 }, brand: { color: ink, fontSize: 21, fontWeight: '700' }, streak: { color: muted, fontSize: 13 }, hero: { backgroundColor: '#d9e7d9', borderRadius: 22, padding: 22, gap: 10 }, eyebrow: { color: '#897e67', letterSpacing: 1.4, fontSize: 10, fontWeight: '700' }, heroTitle: { color: ink, fontSize: 34, fontWeight: '700', letterSpacing: -1 }, heroCopy: { color: '#456057', fontSize: 14, lineHeight: 21 }, progressLabel: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 7 }, progressTrack: { height: 7, borderRadius: 5, backgroundColor: '#f3f5ed', overflow: 'hidden' }, progressFill: { height: 7, backgroundColor: peach, borderRadius: 5 }, tabs: { flexDirection: 'row', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#e5e5db' }, tab: { paddingBottom: 11 }, activeTab: { borderBottomWidth: 3, borderColor: peach }, tabText: { color: '#9a9d94', fontSize: 11, fontWeight: '700' }, activeTabText: { color: ink }, section: { gap: 16 }, sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, sectionTitle: { color: ink, fontSize: 27, fontWeight: '700', marginTop: 4 }, copy: { color: muted, lineHeight: 20 }, card: { backgroundColor: paper, borderRadius: 15, padding: 15, gap: 3, borderWidth: 1, borderColor: '#e5e5db' }, cardTitle: { color: ink, fontWeight: '700', fontSize: 16, marginBottom: 8 }, taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#efeee7' }, time: { color: '#a47766', fontSize: 12, width: 65, fontWeight: '700' }, task: { color: ink, flex: 1 }, check: { color: peach, fontSize: 18 }, darkButton: { backgroundColor: ink, paddingVertical: 11, paddingHorizontal: 14, borderRadius: 9, alignSelf: 'flex-start' }, darkButtonText: { color: paper, fontWeight: '700', fontSize: 12 }, callout: { backgroundColor: '#f6e5d6', borderRadius: 15, padding: 18, gap: 7 }, challengeTitle: { color: ink, fontSize: 20, fontWeight: '700' }, phraseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9 }, phrase: { backgroundColor: '#edeadf', borderRadius: 12, padding: 13, width: '48%', minHeight: 94 }, phraseSound: { fontSize: 13 }, phraseEs: { color: ink, fontWeight: '700', marginTop: 5 }, phraseEn: { color: muted, fontSize: 12, marginTop: 3 }, line: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#efeee7', flexWrap: 'wrap' }, speaker: { color: '#a47766', fontSize: 9, fontWeight: '700', width: 48 }, spanish: { color: ink, fontSize: 16, fontWeight: '500', flex: 1 }, english: { color: muted, fontSize: 12, width: '100%', marginLeft: 56 }, play: { backgroundColor: '#f8e4d8', borderRadius: 18, width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }, challenge: { backgroundColor: '#f6e5d6', borderRadius: 15, padding: 18, gap: 7 }, buttonRow: { flexDirection: 'row', gap: 9 }, peachButton: { backgroundColor: peach, borderRadius: 9, padding: 12, alignSelf: 'flex-start' }, peachText: { color: paper, fontWeight: '700' }, outlineButton: { borderWidth: 1, borderColor: peach, borderRadius: 9, padding: 12 }, outlineText: { color: '#9a5d49', fontWeight: '700' }, ready: { color: '#337256', fontSize: 12, fontWeight: '700' }, modeRow: { flexDirection: 'row', gap: 8 }, modeTab: { paddingVertical: 8, paddingHorizontal: 13, borderRadius: 20, backgroundColor: '#edeadf' }, modeTabActive: { backgroundColor: ink }, modeTabText: { color: muted, fontSize: 12, fontWeight: '700' }, modeTabTextActive: { color: paper }, conversation: { backgroundColor: paper, borderRadius: 15, padding: 16, gap: 12, minHeight: 300, borderWidth: 1, borderColor: '#e5e5db' }, bubble: { maxWidth: '86%', padding: 12, borderRadius: 14 }, serverBubble: { backgroundColor: '#e8eee6', alignSelf: 'flex-start' }, youBubble: { backgroundColor: '#f4d7c8', alignSelf: 'flex-end' }, bubbleText: { color: ink, fontSize: 15, lineHeight: 21 }, bubbleLabel: { color: '#897e67', fontSize: 9, marginTop: 5 }, helper: { color: muted, fontSize: 13, lineHeight: 19 }, inputRow: { flexDirection: 'row', gap: 8 }, input: { flex: 1, backgroundColor: paper, borderWidth: 1, borderColor: '#e5e5db', borderRadius: 9, paddingHorizontal: 11, paddingVertical: 10, color: ink }, send: { backgroundColor: ink, borderRadius: 9, paddingHorizontal: 15, justifyContent: 'center' }, sendText: { color: paper, fontWeight: '700' }, voicePractice: { backgroundColor: '#e8eee6', borderRadius: 15, padding: 16, gap: 9 }, recordButton: { backgroundColor: ink, borderRadius: 9, padding: 12, alignSelf: 'flex-start' }, recordingButton: { backgroundColor: '#a4473d' }, recordText: { color: paper, fontWeight: '700' }, scoreTrack: { height: 7, borderRadius: 5, backgroundColor: '#f3f5ed', overflow: 'hidden' }, scoreFill: { height: 7, borderRadius: 5 }, scoreFillGood: { backgroundColor: '#337256' }, scoreFillRetry: { backgroundColor: peach }, feedback: { marginTop: 8, gap: 3 }, feedbackConfidence: { color: '#897e67', fontSize: 11, fontWeight: '700' }, feedbackNote: { color: ink, fontSize: 12, lineHeight: 17 }, feedbackTryAgain: { color: '#9a5d49', fontSize: 12, fontWeight: '700', marginTop: 2 }, dayGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, dayCard: { backgroundColor: paper, borderRadius: 11, borderWidth: 1, borderColor: '#e5e5db', padding: 12, width: '31%', minHeight: 105, gap: 4 }, selectedDay: { borderColor: peach, borderWidth: 2 }, dayNumber: { color: '#aa806d', fontSize: 10, fontWeight: '700', letterSpacing: 1 }, dayTitle: { color: ink, fontSize: 12, fontWeight: '700', lineHeight: 15 }, dayUnit: { color: muted, fontSize: 10 }, complete: { color: '#337256', fontSize: 10, fontWeight: '700' }, profileLine: { color: ink, paddingVertical: 6 },
});

