import { useCallback, useEffect, useRef, useState } from 'react';
import type { ExpoSpeechRecognitionErrorEvent, ExpoSpeechRecognitionResultEvent } from 'expo-speech-recognition';

export type SpeechToTextStatus = 'idle' | 'listening' | 'denied' | 'unsupported' | 'error';

type SpeechRecognitionApi = typeof import('expo-speech-recognition');

// The library resolves its native module at import time and throws when it is
// missing, which is the case in Expo Go — so it has to be required defensively
// or the whole app fails to start there.
function loadSpeechRecognition(): SpeechRecognitionApi | null {
  try {
    return require('expo-speech-recognition') as SpeechRecognitionApi;
  } catch {
    return null;
  }
}

const speech = loadSpeechRecognition();

export const speechRecognitionAvailable = speech !== null;

type SpeechEventPayloads = {
  start: undefined;
  end: undefined;
  result: ExpoSpeechRecognitionResultEvent;
  error: ExpoSpeechRecognitionErrorEvent;
};

// Subscribes directly rather than via the library's own hook so the hook count
// stays constant whether or not the native module loaded.
function useSpeechEvent<E extends keyof SpeechEventPayloads>(event: E, handler: (payload: SpeechEventPayloads[E]) => void) {
  const saved = useRef(handler);
  saved.current = handler;
  useEffect(() => {
    if (!speech) return;
    const subscription = speech.ExpoSpeechRecognitionModule.addListener(event, ((payload: SpeechEventPayloads[E]) => saved.current(payload)) as never);
    return () => subscription.remove();
  }, [event]);
}

export function useSpeechToText(lang = 'es-MX') {
  const [status, setStatus] = useState<SpeechToTextStatus>(speech ? 'idle' : 'unsupported');
  const [transcript, setTranscript] = useState('');

  useSpeechEvent('start', () => setStatus('listening'));
  useSpeechEvent('end', () => setStatus((current) => (current === 'listening' ? 'idle' : current)));
  useSpeechEvent('result', (event) => {
    const text = event.results[0]?.transcript;
    if (text) setTranscript(text);
  });
  useSpeechEvent('error', (event) => setStatus(event.error === 'not-allowed' ? 'denied' : 'error'));

  const start = useCallback(async () => {
    setTranscript('');
    if (!speech || !speech.ExpoSpeechRecognitionModule.isRecognitionAvailable()) { setStatus('unsupported'); return; }
    const permission = await speech.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) { setStatus('denied'); return; }
    speech.ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous: false });
  }, [lang]);

  const stop = useCallback(() => speech?.ExpoSpeechRecognitionModule.stop(), []);

  return { status, transcript, start, stop };
}
