import { apiFetch, parseApiResponse } from './apiClient';
import type { Patient } from '../types/emergency';

const NATIVE_AI_BASE = '/api/native-ai';

export function unwrapNativeAiEnvelope<T = unknown>(envelope: unknown): T | null {
  if (!envelope || typeof envelope !== 'object') return null;
  const root = envelope as Record<string, unknown>;
  if (root.data !== undefined && root.data !== null) {
    return root.data as T;
  }
  return envelope as T;
}

export async function fetchNativeAiRegistry() {
  const response = await apiFetch(`${NATIVE_AI_BASE}/registry`);
  const envelope = await parseApiResponse(response);
  return unwrapNativeAiEnvelope(envelope) ?? envelope;
}

export async function fetchNativeAiDriftEnvelope() {
  const response = await apiFetch(`${NATIVE_AI_BASE}/drift`);
  const envelope = await parseApiResponse(response);
  return unwrapNativeAiEnvelope(envelope) ?? envelope;
}

export async function evaluateNativeAiDrift() {
  const response = await apiFetch(`${NATIVE_AI_BASE}/drift/evaluate`, { method: 'POST' });
  const envelope = await parseApiResponse(response);
  return unwrapNativeAiEnvelope(envelope) ?? envelope;
}

export async function routePatientViaNativeAi(patient: Patient) {
  const response = await apiFetch(`${NATIVE_AI_BASE}/route`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient }),
  });
  return parseApiResponse(response);
}

export async function fetchClinicalAcuityLeaderboard(patients: Patient[]) {
  const response = await apiFetch(`${NATIVE_AI_BASE}/clinical-acuity`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patients }),
  });
  const envelope = await parseApiResponse(response);
  return unwrapNativeAiEnvelope(envelope) ?? envelope;
}

export async function fetchTriageRules() {
  const response = await apiFetch(`${NATIVE_AI_BASE}/triage-rules`);
  return parseApiResponse(response);
}

export async function addTriageRuleViaApi(naturalLanguage: string, createdBy?: string) {
  const response = await apiFetch(`${NATIVE_AI_BASE}/triage-rules`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ naturalLanguage, createdBy }),
  });
  return parseApiResponse(response);
}

export async function evaluateTriageViaApi(patient: Patient) {
  const response = await apiFetch(`${NATIVE_AI_BASE}/triage-rules/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient }),
  });
  return parseApiResponse(response);
}

export async function inferSpecialistsViaApi(patient: Patient) {
  const response = await apiFetch(`${NATIVE_AI_BASE}/specialists/infer`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ patient }),
  });
  return parseApiResponse(response);
}