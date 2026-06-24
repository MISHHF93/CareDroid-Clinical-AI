import { Priority } from '../types/emergency';
import { inferTriageFromExpertSystem } from '../../lib/native-ai';
import type { NativeAiSourceState, VoiceInterviewTranscript } from '../../lib/native-ai/types';
import type { Patient } from '../types/emergency';

function createSessionId(): string {
  return `voice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function extractSymptoms(transcript: string): string[] {
  const symptoms: string[] = [];
  const patterns = [
    { label: 'Chest pain', pattern: /chest pain/i },
    { label: 'Shortness of breath', pattern: /shortness of breath|trouble breathing|dyspnea/i },
    { label: 'Abdominal pain', pattern: /abdominal|stomach pain/i },
    { label: 'Headache', pattern: /headache|head pain/i },
    { label: 'Fever', pattern: /fever|chills/i },
    { label: 'Dizziness', pattern: /dizzy|lightheaded|syncope/i },
  ];
  patterns.forEach((entry) => {
    if (entry.pattern.test(transcript)) symptoms.push(entry.label);
  });
  return symptoms.length ? symptoms : ['Unspecified symptoms'];
}

export type VoiceInterviewInput = {
  patientLabel: string;
  transcript: string;
  sourceState?: NativeAiSourceState;
};

export function structureVoiceInterviewTranscript(input: VoiceInterviewInput): VoiceInterviewTranscript {
  const structuredSymptoms = extractSymptoms(input.transcript);
  return {
    sessionId: createSessionId(),
    patientLabel: input.patientLabel,
    transcript: input.transcript,
    structuredSymptoms,
    preTriageConfidence: structuredSymptoms[0] === 'Unspecified symptoms' ? 0.42 : 0.72,
    sourceState: input.sourceState || 'demo',
    capturedAt: new Date().toISOString(),
  };
}

export function buildPreTriagePatientFromVoiceInterview(
  input: VoiceInterviewInput,
  basePatient: Patient,
): { patient: Patient; transcript: VoiceInterviewTranscript; suggestedPriority: Priority } {
  const transcript = structureVoiceInterviewTranscript(input);
  const patient: Patient = {
    ...basePatient,
    chiefComplaint: transcript.structuredSymptoms.join(', '),
    complaint: transcript.transcript.slice(0, 240),
    triagePending: true,
    arrival: basePatient.arrival
      ? {
          ...basePatient.arrival,
          chiefComplaint: transcript.structuredSymptoms.join(', '),
          triagePending: true,
        }
      : undefined,
  };

  const inference = inferTriageFromExpertSystem(patient, { sourceState: input.sourceState });
  return {
    patient,
    transcript,
    suggestedPriority: inference.suggestedPriority,
  };
}