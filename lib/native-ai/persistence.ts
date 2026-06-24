import type { ModelPerformanceSnapshot, StructuredTriageRule } from './types';

const TRIAGE_RULES_KEY = 'caredroid.nativeAi.triageRules.v1';
const DRIFT_HISTORY_KEY = 'caredroid.nativeAi.driftHistory.v1';
const ROUTING_AUDIT_KEY = 'caredroid.nativeAi.routingAudit.v1';

function canUseStorage(): boolean {
  return typeof globalThis !== 'undefined' && typeof globalThis.localStorage !== 'undefined';
}

function readJson<T>(key: string, fallback: T): T {
  if (!canUseStorage()) return fallback;
  try {
    const raw = globalThis.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (!canUseStorage()) return;
  try {
    globalThis.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage quota or privacy mode — degrade gracefully
  }
}

export function loadPersistedTriageRules(): StructuredTriageRule[] {
  return readJson<StructuredTriageRule[]>(TRIAGE_RULES_KEY, []);
}

export function persistTriageRules(rules: StructuredTriageRule[]): void {
  writeJson(TRIAGE_RULES_KEY, rules.slice(0, 100));
}

export function loadPersistedDriftHistory(): Record<string, ModelPerformanceSnapshot[]> {
  return readJson<Record<string, ModelPerformanceSnapshot[]>>(DRIFT_HISTORY_KEY, {});
}

export function persistDriftHistory(history: Record<string, ModelPerformanceSnapshot[]>): void {
  writeJson(DRIFT_HISTORY_KEY, history);
}

export function appendRoutingAuditEntry(entry: unknown): void {
  const existing = readJson<unknown[]>(ROUTING_AUDIT_KEY, []);
  existing.unshift(entry);
  writeJson(ROUTING_AUDIT_KEY, existing.slice(0, 200));
}

export function loadRoutingAuditLog(): unknown[] {
  return readJson<unknown[]>(ROUTING_AUDIT_KEY, []);
}