// TypeScript replacement for VoiceInputManager.kt
// Uses the Web Speech API which is available in the Capacitor WebView (Chromium engine).
// VoiceResult discriminated union mirrors the Kotlin sealed class exactly.

// Inline declarations because SpeechRecognition types are not on Window in lib.dom
interface WebSpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}
interface WebSpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface WebSpeechRecognition extends EventTarget {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  continuous: boolean;
  onstart: (() => void) | null;
  onspeechstart: (() => void) | null;
  onspeechend: (() => void) | null;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  abort(): void;
}
type WebSpeechRecognitionCtor = new () => WebSpeechRecognition;

export type VoiceResult =
  | { type: 'ready' }
  | { type: 'speaking' }
  | { type: 'processing' }
  | { type: 'partial'; text: string }
  | { type: 'success'; text: string }
  | { type: 'error'; message: string };

type VoiceResultCallback = (result: VoiceResult) => void;

function getSpeechRecognitionCtor(): WebSpeechRecognitionCtor | undefined {
  const w = window as unknown as Record<string, unknown>;
  return (w['SpeechRecognition'] ?? w['webkitSpeechRecognition']) as
    | WebSpeechRecognitionCtor
    | undefined;
}

function isAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  return !!getSpeechRecognitionCtor();
}

function startListening(onResult: VoiceResultCallback): () => void {
  const Ctor = getSpeechRecognitionCtor();
  if (!Ctor) {
    onResult({ type: 'error', message: 'Speech recognition not supported in this browser' });
    return () => {};
  }

  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;
  recognition.continuous = false;

  recognition.onstart = () => onResult({ type: 'ready' });
  recognition.onspeechstart = () => onResult({ type: 'speaking' });
  recognition.onspeechend = () => onResult({ type: 'processing' });

  recognition.onresult = (event: WebSpeechRecognitionEvent) => {
    const last = event.results[event.resultIndex];
    const text = last[0].transcript;
    if (last.isFinal) {
      onResult({ type: 'success', text });
    } else {
      onResult({ type: 'partial', text });
    }
  };

  recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
    const messages: Record<string, string> = {
      'audio-capture': 'Audio recording error',
      network: 'Network error during speech recognition',
      'not-allowed': 'Microphone permission denied',
      'no-speech': 'No speech detected — please try again',
      aborted: 'Speech recognition aborted',
    };
    onResult({ type: 'error', message: messages[event.error] ?? `Speech error: ${event.error}` });
  };

  recognition.start();

  return () => {
    try {
      recognition.abort();
    } catch {
      // already stopped
    }
  };
}

export const voiceInput = { isAvailable, startListening };
