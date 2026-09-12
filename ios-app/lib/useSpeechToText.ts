import { useCallback, useState } from 'react';
import { ExpoSpeechRecognitionModule, useSpeechRecognitionEvent } from 'expo-speech-recognition';

export type SpeechToTextStatus = 'idle' | 'listening' | 'denied' | 'unsupported' | 'error';

export function useSpeechToText(lang = 'es-MX') {
  const [status, setStatus] = useState<SpeechToTextStatus>('idle');
  const [transcript, setTranscript] = useState('');

  useSpeechRecognitionEvent('start', () => setStatus('listening'));
  useSpeechRecognitionEvent('end', () => setStatus((current) => (current === 'listening' ? 'idle' : current)));
  useSpeechRecognitionEvent('result', (event) => {
    const text = event.results[0]?.transcript;
    if (text) setTranscript(text);
  });
  useSpeechRecognitionEvent('error', (event) => setStatus(event.error === 'not-allowed' ? 'denied' : 'error'));

  const start = useCallback(async () => {
    setTranscript('');
    if (!ExpoSpeechRecognitionModule.isRecognitionAvailable()) { setStatus('unsupported'); return; }
    const permission = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
    if (!permission.granted) { setStatus('denied'); return; }
    ExpoSpeechRecognitionModule.start({ lang, interimResults: true, continuous: false });
  }, [lang]);

  const stop = useCallback(() => ExpoSpeechRecognitionModule.stop(), []);

  return { status, transcript, start, stop };
}
