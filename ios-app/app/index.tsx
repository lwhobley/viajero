import { useEffect, useMemo, useState } from 'react';
import { Alert, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Speech from 'expo-speech';
import * as Sharing from 'expo-sharing';
import { course, phrases, scene } from '@/constants/course';
import {
  dueReviews, initialProgress, loadProgress, ProgressState,
  recordScore, recordWeakSpots, saveProgress, scheduleReview, topWeakSpots, weakSpotNotesFrom,
} from '@/lib/progress';
import { comparePhrase, PhraseComparison } from '@/lib/speechMatch';
import { buildConversationFeedback, ConversationFeedback } from '@/lib/conversationFeedback';
import { buildFlashcardDeck, writeFlashcardFile } from '@/lib/flashcards';
import { disableStreakReminder, enableStreakReminder } from '@/lib/streakReminder';
import { styles } from '@/styles';
import { FeedbackPanel } from '@/components/FeedbackPanel';
import { VoicePractice } from '@/components/VoicePractice';
import { AiConversation } from '@/components/AiConversation';
import { ReviewSession } from '@/components/ReviewSession';
import { TrendSparkline } from '@/components/TrendSparkline';
import { WeakSpotsList } from '@/components/WeakSpotsList';

type Tab = 'today' | 'practice' | 'conversation' | 'progress' | 'profile';

export default function HomeScreen() {
  const [tab, setTab] = useState<Tab>('today');
  const [progress, setProgress] = useState<ProgressState>(initialProgress);
  const [reply, setReply] = useState('');
  const [messages, setMessages] = useState<{ text: string; from: 'server' | 'you'; feedback?: ConversationFeedback; fromVoice?: boolean }[]>([{ text: 'Buenas tardes. ¿Qué le gustaría?', from: 'server' }]);
  const [step, setStep] = useState(0);
  const [conversationMode, setConversationMode] = useState<'scripted' | 'ai'>('scripted');
  const expectedByStep = [scene[1].es, scene[3].es, scene[5].es];
  const [loaded, setLoaded] = useState(false);
  const [listeningOnly, setListeningOnly] = useState(false);
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [reviewing, setReviewing] = useState(false);
  const [reviewSessionId, setReviewSessionId] = useState(0);

  const day = course[Math.min(progress.currentDay, course.length) - 1];
  const dayPhrases = useMemo(() => phrases.filter((phrase) => phrase.day === day.day), [day.day]);
  const phraseById = useMemo(() => new Map(phrases.map((phrase) => [phrase.id, phrase])), []);
  const done = progress.completedTasks[day.id] ?? 0;
  const due = dueReviews(progress.reviews);
  const aiLevel = Math.min(5, Math.max(1, Math.floor(progress.completedDays.length / 10) + 1));

  useEffect(() => { loadProgress().then((saved) => { setProgress(saved); setLoaded(true); }); }, []);
  useEffect(() => { if (loaded) saveProgress(progress); }, [progress, loaded]);

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
    const comparison = comparePhrase(text, expected);
    const feedback = buildConversationFeedback(text, expected, comparison.score);
    setMessages((items) => [...items, { text, from: 'you', feedback, fromVoice }]); setReply(''); completeTask();
    setProgress((current) => {
      const scored = fromVoice ? recordScore(current, comparison.score) : current;
      const notes = weakSpotNotesFrom(feedback);
      return notes.length ? recordWeakSpots(scored, notes) : scored;
    });
    const lower = text.toLowerCase(); let answer = 'Perfecto. ¿Algo más?';
    if (step === 0) { answer = lower.includes('quis') || lower.includes('quier') ? '¡Muy bien! ¿Para tomar?' : 'Puede decir: “Quisiera los tacos, por favor.”'; setStep(lower.includes('quis') || lower.includes('quier') ? 1 : 0); }
    else if (step === 1) { answer = 'Perfecto. ¿Algo más?'; setStep(2); } else { answer = '¡Excelente! Has terminado el pedido.'; setStep(0); }
    setTimeout(() => { setMessages((items) => [...items, { text: answer, from: 'server' }]); speak(answer); }, 250);
  };

  const selectDay = (nextDay: number) => { setProgress((current) => ({ ...current, currentDay: nextDay })); setTab('today'); };

  const toggleListeningOnly = () => { setListeningOnly((current) => !current); setRevealedLines(new Set()); };
  const revealLine = (index: number) => setRevealedLines((current) => new Set(current).add(index));

  const startReview = () => { setReviewSessionId((id) => id + 1); setReviewing(true); };
  const gradeReview = (phraseId: string, correct: boolean) => {
    setProgress((current) => {
      const existing = current.reviews.find((item) => item.phraseId === phraseId);
      return { ...current, reviews: [...current.reviews.filter((item) => item.phraseId !== phraseId), scheduleReview(existing, phraseId, correct)] };
    });
  };

  const toggleStreakReminder = async () => {
    if (progress.reminderEnabled) {
      await disableStreakReminder();
      setProgress((current) => ({ ...current, reminderEnabled: false }));
      return;
    }
    const result = await enableStreakReminder();
    if (result.enabled) setProgress((current) => ({ ...current, reminderEnabled: true }));
    else Alert.alert('Could not enable reminder', result.error ?? 'Notifications are unavailable.');
  };

  const exportFlashcards = async () => {
    try {
      const deck = buildFlashcardDeck(phrases, progress);
      const path = await writeFlashcardFile(deck);
      if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(path, { mimeType: 'text/plain', dialogTitle: 'Export Viajero flashcards' });
      else Alert.alert('Saved', `Flashcards saved to ${path}`);
    } catch (error) {
      Alert.alert('Export failed', error instanceof Error ? error.message : 'Unknown error');
    }
  };

  return <ScrollView contentInsetAdjustmentBehavior="automatic" style={styles.page} contentContainerStyle={styles.content}>
    <View style={styles.header}><View style={styles.brandRow}><Image source={require('../assets/viajero-logo.png')} style={styles.logo} /><Text style={styles.brand}>Viajero</Text></View><Text style={styles.streak}>🔥 {progress.streak || 1} day streak</Text></View>

    {reviewing ? <View style={styles.section}>
      <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Review queue</Text><Pressable onPress={() => setReviewing(false)}><Text style={styles.outlineText}>Done</Text></Pressable></View>
      <ReviewSession key={reviewSessionId} due={due} phraseById={phraseById} onGrade={gradeReview} onSpeak={(spanish) => speak(spanish)} />
    </View> : <>
      <View style={styles.hero}><Text style={styles.eyebrow}>DAY {String(day.day).padStart(2, '0')} · {day.unit.toUpperCase()}</Text><Text style={styles.heroTitle}>{day.title}.</Text><Text style={styles.heroCopy}>Two focused hours: listen, repeat, speak, and use Spanish in a real travel situation.</Text><View style={styles.progressLabel}><Text>Today's lesson</Text><Text>{done} / 6 tasks</Text></View><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${(done / 6) * 100}%` }]} /></View></View>
      <View style={styles.tabs}>{(['today', 'practice', 'conversation', 'progress', 'profile'] as Tab[]).map((name) => <Pressable key={name} onPress={() => setTab(name)} style={[styles.tab, tab === name && styles.activeTab]}><Text style={[styles.tabText, tab === name && styles.activeTabText]}>{name === 'today' ? 'Today' : name === 'practice' ? 'Practice' : name === 'conversation' ? 'Talk' : name === 'progress' ? 'Progress' : 'Profile'}</Text></Pressable>)}</View>

      {tab === 'today' && <View style={styles.section}><Text style={styles.eyebrow}>YOUR NEXT 30 MINUTES</Text><Text style={styles.sectionTitle}>{day.focus}</Text><Text style={styles.copy}>{day.mission}</Text><View style={styles.card}><Text style={styles.cardTitle}>Today's 2-hour rhythm</Text>{[['20 min', 'Recall yesterday'], ['30 min', 'Learn the scene'], ['30 min', 'Talk back'], ['25 min', 'Listen and shadow'], ['15 min', 'Spaced review']].map(([time, label], index) => <View key={label} style={styles.taskRow}><Text style={styles.time}>{time}</Text><Text style={styles.task}>{label}</Text><Text style={styles.check}>{done > index ? '✓' : '○'}</Text></View>)}</View><Pressable style={styles.darkButton} onPress={() => setTab('practice')}><Text style={styles.darkButtonText}>Start practice →</Text></Pressable><View style={styles.callout}><Text style={styles.eyebrow}>REVIEW QUEUE</Text><Text style={styles.challengeTitle}>{due.length ? `${due.length} phrases are ready to review.` : 'Your review queue is clear.'}</Text><Text style={styles.copy}>Short reviews keep phrases available when you need them in a real conversation.</Text>{due.length > 0 && <Pressable style={styles.darkButton} onPress={startReview}><Text style={styles.darkButtonText}>Start review →</Text></Pressable>}</View></View>}

      {tab === 'practice' && <View style={styles.section}>
        <View style={styles.sectionHeader}><View><Text style={styles.eyebrow}>SCENE · {day.focus.toUpperCase()}</Text><Text style={styles.sectionTitle}>Listen, then speak</Text></View><View style={styles.buttonRow}><Pressable style={styles.outlineButton} onPress={toggleListeningOnly}><Text style={styles.outlineText}>{listeningOnly ? 'Show text' : 'Listening only'}</Text></Pressable><Pressable style={styles.darkButton} onPress={() => scene.forEach((line, index) => setTimeout(() => speak(line.es), index * 1450))}><Text style={styles.darkButtonText}>▶ Play scene</Text></Pressable></View></View>
        <View style={styles.card}>{scene.map((line, index) => <View key={line.es} style={styles.line}>
          <Text style={styles.speaker}>{line.who}</Text>
          {listeningOnly && !revealedLines.has(index) ? <>
            <Text style={styles.hiddenLinePlaceholder}>••• ••• •••</Text>
            <Pressable onPress={() => { speak(line.es); revealLine(index); }} style={styles.play}><Text>▶</Text></Pressable>
            <Pressable onPress={() => revealLine(index)} style={styles.revealButton}><Text style={styles.revealButtonText}>Reveal</Text></Pressable>
          </> : <>
            <Text style={styles.spanish}>{line.es}</Text>
            <Pressable onPress={() => speak(line.es)} style={styles.play}><Text>▶</Text></Pressable>
            <Text style={styles.english}>{line.en}</Text>
          </>}
        </View>)}</View>
        <View style={styles.phraseGrid}>{dayPhrases.map((phrase) => <Pressable key={phrase.id} onPress={() => { speak(phrase.spanish); completeTask(phrase.id); }} style={styles.phrase}><Text style={styles.phraseSound}>🔊</Text><Text style={styles.phraseEs}>{phrase.spanish}</Text><Text style={styles.phraseEn}>{phrase.english}</Text></Pressable>)}</View>
        <View style={styles.challenge}><Text style={styles.eyebrow}>SAY IT ALOUD</Text><Text style={styles.challengeTitle}>Quisiera los tacos al pastor, por favor.</Text><Text style={styles.copy}>Hear it at two speeds, then say it yourself.</Text><View style={styles.buttonRow}><Pressable style={styles.peachButton} onPress={() => speak('Quisiera los tacos al pastor, por favor.')}><Text style={styles.peachText}>Hear normally</Text></Pressable><Pressable style={styles.outlineButton} onPress={() => { speak('Quisiera los tacos al pastor, por favor.', true); completeTask(); }}><Text style={styles.outlineText}>Hear slowly</Text></Pressable></View>
          <VoicePractice targetPhrase="Quisiera los tacos al pastor, por favor." onResult={(_transcript, comparison, feedback) => {
            completeTask();
            setProgress((current) => {
              const scored = comparison ? recordScore(current, comparison.score) : current;
              const notes = feedback ? weakSpotNotesFrom(feedback) : [];
              return notes.length ? recordWeakSpots(scored, notes) : scored;
            });
          }} />
        </View>
      </View>}

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
        </> : <AiConversation scenarioKey={day.id} scenario={`${day.focus}: ${day.mission}`} level={aiLevel} onWeakSpots={(notes) => setProgress((current) => recordWeakSpots(current, notes))} />}
      </View>}

      {tab === 'progress' && <View style={styles.section}>
        <Text style={styles.eyebrow}>YOUR 90-DAY PATH</Text>
        <Text style={styles.sectionTitle}>{progress.completedDays.length} days completed</Text>
        <Text style={styles.copy}>Each day is a complete travel conversation. Tap any day to revisit it and build listening confidence.</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>Review queue</Text><Text style={styles.copy}>{due.length ? `${due.length} phrases are ready to review.` : 'Nothing due right now — check back later.'}</Text>{due.length > 0 && <Pressable style={styles.darkButton} onPress={startReview}><Text style={styles.darkButtonText}>Start review →</Text></Pressable>}</View>
        <View style={styles.card}><Text style={styles.cardTitle}>Pronunciation trend</Text><TrendSparkline history={progress.scoreHistory} /></View>
        <View style={styles.card}><Text style={styles.cardTitle}>Weak spots</Text><WeakSpotsList weakSpots={topWeakSpots(progress, 6)} /></View>
        <View style={styles.dayGrid}>{course.map((item) => <Pressable key={item.id} onPress={() => selectDay(item.day)} style={[styles.dayCard, day.day === item.day && styles.selectedDay]}><Text style={styles.dayNumber}>{String(item.day).padStart(2, '0')}</Text><Text style={styles.dayTitle}>{item.title}</Text><Text style={styles.dayUnit}>{item.unit}</Text>{progress.completedDays.includes(item.day) && <Text style={styles.complete}>✓ complete</Text>}</Pressable>)}</View>
      </View>}

      {tab === 'profile' && <View style={styles.section}>
        <Text style={styles.eyebrow}>TRAVELER PROFILE</Text>
        <Text style={styles.sectionTitle}>Spanish for real life</Text>
        <Text style={styles.copy}>Your plan is tuned for Mexico, Costa Rica, and Spain, with restaurants, transportation, hotels, and meeting locals as the core situations.</Text>
        <View style={styles.card}><Text style={styles.cardTitle}>Your practice preferences</Text><Text style={styles.profileLine}>✓ Listening + speaking first</Text><Text style={styles.profileLine}>✓ Repetition with visual phrase cards</Text><Text style={styles.profileLine}>✓ Two hours available each day</Text><Text style={styles.profileLine}>✓ Goal: understand and join everyday conversations</Text></View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Daily reminder</Text>
          <Text style={styles.copy}>{progress.reminderEnabled ? 'A reminder fires at 7pm if you have not studied today.' : 'Get a daily nudge so your streak does not lapse.'}</Text>
          <Pressable style={styles.outlineButton} onPress={toggleStreakReminder}><Text style={styles.outlineText}>{progress.reminderEnabled ? 'Turn off reminder' : 'Turn on reminder'}</Text></Pressable>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Export flashcards</Text>
          <Text style={styles.copy}>Export the full course vocabulary and your weak spots as a tab-separated deck you can import into Anki.</Text>
          <Pressable style={styles.outlineButton} onPress={exportFlashcards}><Text style={styles.outlineText}>Export deck</Text></Pressable>
        </View>
        <Text style={styles.helper}>The app works fully offline. Progress is stored on this device; no account is required.</Text>
      </View>}
    </>}
  </ScrollView>;
}
