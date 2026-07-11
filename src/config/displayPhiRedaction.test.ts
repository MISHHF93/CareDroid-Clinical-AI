import { describe, expect, it } from 'vitest';
import { PatientState, Priority, type Patient } from '../types/emergency';
import { resolveEmergencyDisplayPrivacyPolicy } from './emergencyDisplayPrivacyPolicy';
import {
  assertDisplayPayloadIsPhiSafe,
  collectDisplayPhiTokens,
  formatPrivacySafeHealthCard,
  formatPrivacySafeNoteText,
  formatPrivacySafeStaffComment,
} from './displayPhiRedaction';
import { CARE_DROID_SCREEN_MODES } from './careDroidScreenModes';
import {
  READ_ONLY_WHITEBOARD_PRIVACY_MODE,
  normalizeWallDisplayMonitorPrivacy,
  resolveReadOnlyWhiteboardPrivacyLabel,
} from './wallDisplayMonitorPrivacyModel';

const patient = {
  id: 'patient-1',
  mrn: 'MRN-SECRET',
  firstName: 'Avery',
  lastName: 'Stone',
  healthCardNumber: 'HC-9922-441',
  state: PatientState.Waiting,
  priority: Priority.P3,
  arrivalTime: '2026-06-20T10:00:00.000Z',
  chiefComplaint: 'Chest pain',
  flags: [],
  notes: [{ id: 'n1', text: 'Patient anxious in waiting room', timestamp: '2026-06-20T10:05:00.000Z' }],
  timeline: [],
} as unknown as Patient;

describe('displayPhiRedaction', () => {
  it('collects patient PHI tokens for display validation', () => {
    const tokens = collectDisplayPhiTokens([patient]);
    expect(tokens).toContain('Avery');
    expect(tokens).toContain('MRN-SECRET');
    expect(tokens).toContain('Chest pain');
  });

  it('rejects serialized payloads that contain PHI tokens', () => {
    expect(assertDisplayPayloadIsPhiSafe({ label: 'Busy' }, collectDisplayPhiTokens([patient]))).toBe(
      true,
    );
    expect(
      assertDisplayPayloadIsPhiSafe({ label: 'Waiting for Avery' }, collectDisplayPhiTokens([patient])),
    ).toBe(false);
  });

  it('redacts health cards, notes, and staff comments under public policy', () => {
    const policy = resolveEmergencyDisplayPrivacyPolicy({
      screenMode: CARE_DROID_SCREEN_MODES.publicWaiting,
    });

    expect(formatPrivacySafeHealthCard(patient, policy)).toContain('hidden');
    expect(formatPrivacySafeNoteText('Staff checked in', policy)).toContain('hidden');
    expect(formatPrivacySafeStaffComment('Nurse updated patient', policy)).toContain('hidden');
  });
});

describe('read-only whiteboard privacy modes', () => {
  it('normalizes configured privacy mode aliases', () => {
    expect(normalizeWallDisplayMonitorPrivacy('staff-private')).toBe(
      READ_ONLY_WHITEBOARD_PRIVACY_MODE.staffPrivate,
    );
    expect(normalizeWallDisplayMonitorPrivacy('semi-private-hallway')).toBe(
      READ_ONLY_WHITEBOARD_PRIVACY_MODE.semiPrivateHallway,
    );
    expect(normalizeWallDisplayMonitorPrivacy('public-safe-aggregate')).toBe(
      READ_ONLY_WHITEBOARD_PRIVACY_MODE.publicSafeAggregate,
    );
  });

  it('exposes human-readable privacy labels', () => {
    expect(resolveReadOnlyWhiteboardPrivacyLabel('minimal')).toContain('Public-safe');
    expect(resolveReadOnlyWhiteboardPrivacyLabel('restricted')).toContain('Semi-private');
    expect(resolveReadOnlyWhiteboardPrivacyLabel('operational')).toContain('Staff-private');
  });
});
