/**
 * Security audit service — queues local ED audit entries and syncs to backend /api/audit/sync.
 */

import { apiFetch, getStoredAccessToken, parseApiResponse } from './apiClient';
import logger from '../utils/logger';
import type { EmergencyAuditLogEntry } from '../store/emergencyStore';

const MAX_PENDING_AUDIT_ENTRIES = 100;
const SYNC_INTERVAL_MS = 30_000;

type PendingAuditEntry = EmergencyAuditLogEntry & {
  synced?: boolean;
};

let pendingEntries: PendingAuditEntry[] = [];
let syncTimer: ReturnType<typeof setInterval> | null = null;
let syncInFlight: Promise<void> | null = null;

export function recordSecurityAuditEvent(entry: {
  action: string;
  patientId?: string;
  staffId: string;
  details?: Record<string, unknown>;
}): EmergencyAuditLogEntry {
  const auditEntry: PendingAuditEntry = {
    id: `sec-audit-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    action: entry.action,
    patientId: entry.patientId,
    staffId: entry.staffId,
    timestamp: new Date().toISOString(),
    details: entry.details || {},
    synced: false,
  };

  pendingEntries = [...pendingEntries.slice(-(MAX_PENDING_AUDIT_ENTRIES - 1)), auditEntry];
  scheduleAuditSync();
  return auditEntry;
}

export function ingestEmergencyAuditEntries(entries: readonly EmergencyAuditLogEntry[]): void {
  if (!entries.length) return;
  const unsynced = entries
    .filter((entry) => !pendingEntries.some((pending) => pending.id === entry.id))
    .map((entry) => ({ ...entry, synced: false }));
  if (!unsynced.length) return;
  pendingEntries = [...pendingEntries, ...unsynced].slice(-MAX_PENDING_AUDIT_ENTRIES);
  scheduleAuditSync();
}

export function getPendingSecurityAuditCount(): number {
  return pendingEntries.filter((entry) => !entry.synced).length;
}

function scheduleAuditSync(): void {
  if (typeof window === 'undefined') return;
  if (syncTimer) return;
  syncTimer = setInterval(() => {
    void flushPendingSecurityAudits();
  }, SYNC_INTERVAL_MS);
}

export async function flushPendingSecurityAudits(): Promise<void> {
  if (syncInFlight) return syncInFlight;

  syncInFlight = (async () => {
    const token = getStoredAccessToken();
    if (!token) return;

    const batch = pendingEntries.filter((entry) => !entry.synced);
    if (!batch.length) return;

    for (const entry of batch) {
      try {
        const response = await apiFetch('/api/audit/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: entry.action,
            resourceType: entry.patientId ? 'patient' : 'security',
            resourceId: entry.patientId || entry.id,
            timestamp: entry.timestamp,
            metadata: {
              staffId: entry.staffId,
              ...entry.details,
              phiAccessed: Boolean(entry.patientId && entry.action.startsWith('phi.')),
            },
          }),
        });

        const data = await parseApiResponse(response, { fallback: {} });
        if (response.ok || data?.success) {
          pendingEntries = pendingEntries.map((pending) =>
            pending.id === entry.id ? { ...pending, synced: true } : pending,
          );
        }
      } catch (error) {
        logger.warn('Security audit sync failed', { entryId: entry.id, error });
        break;
      }
    }
  })().finally(() => {
    syncInFlight = null;
  });

  return syncInFlight;
}