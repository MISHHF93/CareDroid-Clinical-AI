import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Priority, PatientState, type Patient } from '../../types/emergency';
import { buildPreTriagePatientFromVoiceInterview } from '../../services/voiceInterviewAssistant';
import './VoiceInterviewKiosk.css';

type VoiceInterviewKioskProps = {
  onPreTriageReady?: (payload: {
    patient: Patient;
    suggestedPriority: Priority;
    transcript: string;
  }) => void;
  className?: string;
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<{ 0?: { transcript?: string } }> }) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const win = window as Window & {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  };
  return win.SpeechRecognition || win.webkitSpeechRecognition || null;
}

function seedPreTriagePatient(): Patient {
  const now = new Date().toISOString();
  return {
    id: `pre-triage-${Date.now()}`,
    mrn: `PRE-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
    firstName: 'Pre-Triage',
    lastName: 'Guest',
    dob: '1990-01-01',
    age: 35,
    sex: 'Unknown',
    arrivalTime: now,
    chiefComplaint: '',
    complaintCategory: 'Unassigned',
    state: PatientState.Arrival,
    priority: Priority.P4,
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    triagePending: true,
    source: 'voice-interview',
    arrival: {
      arrivalMode: 'self-check-in',
      arrivalTimestamp: now,
      chiefComplaint: '',
      triageAcuity: 'P4',
      waitingRoomStatus: 'waiting',
      registrationStatus: 'provisional',
      queueDestination: 'triage-queue',
      triagePending: true,
    },
  };
}

export default function VoiceInterviewKiosk({ onPreTriageReady, className = '' }: VoiceInterviewKioskProps) {
  const [patientLabel, setPatientLabel] = useState('Waiting room guest');
  const [transcript, setTranscript] = useState(
    'I have had chest pain for about 45 minutes. It radiates to my left arm and I feel sweaty.',
  );
  const [status, setStatus] = useState('Voice-native interview ready');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const speechSupported = Boolean(getSpeechRecognitionConstructor());

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setListening(false);
  }, []);

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionCtor) {
      setStatus('Speech recognition unavailable — enter transcript manually or use demo text.');
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.onresult = (event) => {
      const spoken = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join(' ')
        .trim();
      if (spoken) setTranscript(spoken);
    };
    recognition.onerror = () => {
      setStatus('Voice capture interrupted — review transcript and submit.');
      setListening(false);
    };
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
    setStatus('Listening — describe your symptoms. Tap stop when finished.');
  }, []);

  useEffect(() => () => stopListening(), [stopListening]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    stopListening();
    const result = buildPreTriagePatientFromVoiceInterview(
      { patientLabel, transcript, sourceState: speechSupported ? 'live' : 'demo' },
      seedPreTriagePatient(),
    );
    setStatus(
      `Pre-triage card created with suggested ${result.suggestedPriority}. Charge nurse review required.`,
    );
    onPreTriageReady?.({
      patient: result.patient,
      suggestedPriority: result.suggestedPriority,
      transcript: result.transcript.transcript,
    });
  };

  return (
    <section className={['voice-interview-kiosk', className].filter(Boolean).join(' ')} aria-label="Voice interview kiosk">
      <header>
        <h3>Voice-Native AI Interview Assistant</h3>
        <p>
          {speechSupported
            ? 'Mobile-first kiosk — voice capture structures symptoms into pre-triage signals for charge nurse review.'
            : 'Demo kiosk — structures spoken symptoms into pre-triage signals for charge nurse review.'}
        </p>
      </header>
      <form onSubmit={handleSubmit}>
        <label htmlFor="voice-patient-label">Patient label</label>
        <input
          id="voice-patient-label"
          value={patientLabel}
          onChange={(event) => setPatientLabel(event.target.value)}
        />
        <label htmlFor="voice-transcript">Interview transcript</label>
        <textarea
          id="voice-transcript"
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          rows={5}
        />
        <div className="voice-interview-kiosk__actions">
          {speechSupported ? (
            <button type="button" onClick={listening ? stopListening : startListening}>
              {listening ? 'Stop listening' : 'Start voice interview'}
            </button>
          ) : null}
          <button type="submit">Create pre-triage patient card</button>
        </div>
      </form>
      <p className="voice-interview-kiosk__status">{status}</p>
    </section>
  );
}