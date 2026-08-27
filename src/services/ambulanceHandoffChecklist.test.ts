import { describe, expect, it } from 'vitest';
import { PatientFlag, PatientState, Priority } from '../types/emergency';
import {
  AMBULANCE_HANDOFF_CHECKLIST_FIELDS,
  AMBULANCE_HANDOFF_DESTINATION_LABELS,
  buildAmbulanceHandoffChecklistSteps,
  buildAmbulanceHandoffChecklist,
  buildEmsHandoffChecklistSyncPayload,
  buildPatientPatchFromHandoffChecklist,
  deriveAmbulanceHandoffDestination,
  mergeAmbulanceHandoffChecklistPatch,
  normalizeAmbulanceHandoffChecklist,
  parseMedicationsEnRoute,
  resolveAmbulanceHandoffChecklist,
} from './ambulanceHandoffChecklist';

const baseArrival = {
  id: 'ems-handoff-1',
  unitId: 'Medic 4',
  unitName: 'Medic 4',
  crewNames: ['C. Park'],
  patientAge: 62,
  patientSex: 'M' as const,
  chiefComplaint: 'Chest pain',
  prearrivalComplaint: 'Chest pain radiating to jaw',
  eta: 0,
  severity: 'Critical' as const,
  dispatchTime: '2026-06-20T11:30:00.000Z',
  estimatedArrivalTime: '2026-06-20T11:45:00.000Z',
  notes: 'Crew gave aspirin 325mg and nitro x1 en route.',
  handoffSummary: 'STEMI concern. 12-lead transmitted.',
  status: 'Handoff' as const,
  priority: Priority.P1,
  patientId: 'patient-ems-1',
  arrivedAt: '2026-06-20T11:45:00.000Z',
  vitals: { hr: 98, sbp: 142, dbp: 88, spo2: 94, recordedAt: '2026-06-20T11:40:00.000Z' },
  criticalChecklist: {
    type: 'stemi' as const,
    title: 'STEMI Preparation Checklist',
    triggeredAt: '2026-06-20T11:40:00.000Z',
    completions: [],
  },
};

describe('ambulanceHandoffChecklist', () => {
  it('derives complaint, vitals, medications, and critical flags from EMS data', () => {
    const checklist = buildAmbulanceHandoffChecklist(baseArrival);

    expect(checklist.complaintSummary).toBe('Chest pain');
    expect(checklist.vitalsReceived).toBe(true);
    expect(checklist.medicationsEnRoute).toEqual(
      expect.arrayContaining(['Aspirin', 'Nitroglycerin']),
    );
    expect(checklist.criticalFlags.some((flag) => flag.id === 'ems-critical')).toBe(true);
    expect(checklist.criticalFlags.some((flag) => flag.label === 'Chest pain')).toBe(true);
    expect(checklist.criticalFlags.some((flag) => flag.source === 'critical-checklist')).toBe(true);
  });

  it('parses explicit medications and administered phrases', () => {
    expect(parseMedicationsEnRoute(['Morphine 4mg'], 'Administered ondansetron for nausea')).toEqual(
      expect.arrayContaining(['Morphine 4mg', 'Ondansetron']),
    );
  });

  it('does not throw when an explicit medications array contains a non-string entry', () => {
    // Regression (HEAL-078): EMSArrival.medicationsEnRoute is typed string[],
    // but that's only a compile-time guarantee -- a real/persisted record
    // with a non-string entry (null, a number, an object) previously crashed
    // `entry.trim()` here, taking down every page rendering the EMS offload
    // tracker (buildEmsOffloadTrackerSummary), not just the one bad record.
    expect(() =>
      parseMedicationsEnRoute(['Aspirin', null, 42, { name: 'Nitro' }] as never, undefined),
    ).not.toThrow();
    expect(parseMedicationsEnRoute(['Aspirin', null, 42] as never)).toEqual(['Aspirin']);
  });

  it('derives patient destination from room, waiting state, and location hints', () => {
    expect(
      deriveAmbulanceHandoffDestination(baseArrival, null, [
        { id: 'resus-1', name: 'Resus 1', type: 'Resus' },
      ]),
    ).toMatchObject({
      patientDestination: 'offload-area',
    });

    expect(
      deriveAmbulanceHandoffDestination(
        { ...baseArrival, preparedRoomId: 'resus-1' },
        {
          id: 'patient-ems-1',
          roomId: 'resus-1',
          state: PatientState.Assessment,
        } as never,
        [{ id: 'resus-1', name: 'Resus 1', type: 'Resus' }],
      ),
    ).toMatchObject({
      patientDestination: 'room',
      destinationLabel: 'Resus 1',
    });

    expect(
      deriveAmbulanceHandoffDestination(baseArrival, {
        state: PatientState.Waiting,
        location: 'Waiting room chair 3',
      } as never),
    ).toMatchObject({
      patientDestination: 'monitored-chair',
    });
  });

  it('merges staff overrides while preserving derived EMS fields', () => {
    const derived = buildAmbulanceHandoffChecklist(baseArrival);
    const merged = resolveAmbulanceHandoffChecklist(
      {
        ...baseArrival,
        ambulanceHandoffChecklist: mergeAmbulanceHandoffChecklistPatch(derived, {
          identityStatus: 'verified',
          patientDestination: 'room',
          destinationLabel: 'Resus 2',
          handoffAccepted: true,
          handoffAcceptedByStaffName: 'Dr. Lee',
        }),
      },
      {
        patient: {
          id: 'patient-ems-1',
          firstName: 'Sam',
          lastName: 'Rivera',
          registrationStatus: 'complete',
          flags: [PatientFlag.EMSArrival],
        } as never,
      },
    );

    expect(merged.identityStatus).toBe('verified');
    expect(merged.handoffAccepted).toBe(true);
    expect(merged.handoffAcceptedByStaffName).toBe('Dr. Lee');
    expect(merged.destinationLabel).toBe('Resus 2');
  });

  it('builds the exact EMS-handoff sync payload from a resolved checklist, omitting the accepting clinician identity (server-derived, never client-sent)', () => {
    // Regression: EMSPipeline.tsx's "Complete Handoff" click used to send
    // only {handoffAccepted, handoffAcceptedAt} to POST /ems/handoff -- the
    // identity/vitals/medications/critical-flags/destination a clinician
    // actually documented during handoff were thrown away and never reached
    // the backend at all.
    const checklist = mergeAmbulanceHandoffChecklistPatch(buildAmbulanceHandoffChecklist(baseArrival), {
      handoffAccepted: true,
      handoffAcceptedAt: '2026-06-20T12:00:00.000Z',
      // Exactly like the local optimistic store update
      // (emergencyStore.ts's updateAmbulanceHandoffChecklist), the resolved
      // checklist itself does carry an acceptor identity by this point --
      // proving the payload builder strips it, not that it was never set.
      handoffAcceptedByStaffId: 'staff-should-not-be-sent',
      handoffAcceptedByStaffName: 'Should Not Be Sent',
    });

    const payload = buildEmsHandoffChecklistSyncPayload(checklist, '2026-06-20T12:00:00.000Z');

    // The real checklist content the clinician documented.
    expect(payload.identityStatus).toBe(checklist.identityStatus);
    expect(payload.vitalsReceived).toBe(true);
    expect(payload.medicationsEnRoute).toEqual(
      expect.arrayContaining(['Aspirin', 'Nitroglycerin']),
    );
    expect(Array.isArray(payload.criticalFlags)).toBe(true);
    expect((payload.criticalFlags as unknown[]).length).toBeGreaterThan(0);
    expect(payload.patientDestination).toBe(checklist.patientDestination);
    expect(payload.handoffAccepted).toBe(true);
    expect(payload.handoffAcceptedAt).toBe('2026-06-20T12:00:00.000Z');

    // The accepting clinician's identity is never sent from the client --
    // the backend derives handoffAcceptedByStaffId/Name from the
    // authenticated session instead (EmergencyOsController.postEmsHandoff's
    // own doc comment).
    expect(payload).not.toHaveProperty('handoffAcceptedByStaffId');
    expect(payload).not.toHaveProperty('handoffAcceptedByStaffName');
  });

  it('falls back to a minimal {handoffAccepted, handoffAcceptedAt} payload when no checklist has been resolved yet', () => {
    const payload = buildEmsHandoffChecklistSyncPayload(undefined, '2026-06-20T12:00:00.000Z');
    expect(payload).toEqual({
      handoffAccepted: true,
      handoffAcceptedAt: '2026-06-20T12:00:00.000Z',
    });
  });

  it('does not throw when a staff patch carries a non-string medicationsEnRoute entry', () => {
    // Regression (HEAL-078): same sanitize-at-the-boundary fix applied to the
    // staff-edit merge path, which has the identical `entry.trim()` shape.
    const derived = buildAmbulanceHandoffChecklist(baseArrival);
    expect(() =>
      mergeAmbulanceHandoffChecklistPatch(derived, {
        medicationsEnRoute: ['Naloxone', null, 7] as never,
      }),
    ).not.toThrow();
    const merged = mergeAmbulanceHandoffChecklistPatch(derived, {
      medicationsEnRoute: ['Naloxone', null, 7] as never,
    });
    expect(merged.medicationsEnRoute).toEqual(['Naloxone']);
    expect(merged.vitalsReceived).toBe(true);
    expect(merged.complaintSummary).toBe('Chest pain');
  });

  it('exposes destination labels for all supported destinations', () => {
    expect(AMBULANCE_HANDOFF_DESTINATION_LABELS.waiting).toMatch(/waiting/i);
    expect(AMBULANCE_HANDOFF_DESTINATION_LABELS['monitored-chair']).toMatch(/chair/i);
    expect(AMBULANCE_HANDOFF_DESTINATION_LABELS['offload-area']).toMatch(/offload/i);
    expect(AMBULANCE_HANDOFF_DESTINATION_LABELS.hallway).toMatch(/hallway/i);
    expect(AMBULANCE_HANDOFF_DESTINATION_LABELS.room).toMatch(/room/i);
  });

  it('defines structured checklist fields for all required handoff steps', () => {
    expect(AMBULANCE_HANDOFF_CHECKLIST_FIELDS.map((field) => field.id)).toEqual([
      'identity-status',
      'complaint-summary',
      'vitals-received',
      'medications-en-route',
      'critical-flags',
      'handoff-accepted',
      'patient-destination',
    ]);
  });

  it('builds structured step status from resolved checklist', () => {
    const checklist = buildAmbulanceHandoffChecklist(baseArrival);
    const steps = buildAmbulanceHandoffChecklistSteps(checklist);

    expect(steps.find((step) => step.id === 'vitals-received')?.status).toBe('complete');
    expect(steps.find((step) => step.id === 'handoff-accepted')?.status).toBe('pending');
    expect(steps.find((step) => step.id === 'critical-flags')?.status).toBe('warning');
  });

  it('normalizes legacy checklist payloads', () => {
    const normalized = normalizeAmbulanceHandoffChecklist(
      {
        identityStatus: 'verified',
        complaintSummary: 'Stroke symptoms',
        vitalsReceived: true,
        handoffAccepted: true,
        patientDestination: 'room',
        destinationLabel: 'Resus 1',
      },
      'ems-handoff-legacy',
    );

    expect(normalized?.arrivalId).toBe('ems-handoff-legacy');
    expect(normalized?.patientDestination).toBe('room');
    expect(normalized?.handoffAccepted).toBe(true);
  });

  it('maps confirmed destination to patient location and waiting state', () => {
    const patch = buildPatientPatchFromHandoffChecklist({
      arrivalId: 'ems-handoff-1',
      identityStatus: 'verified',
      complaintSummary: 'Chest pain',
      vitalsReceived: true,
      medicationsEnRoute: [],
      criticalFlags: [],
      handoffAccepted: true,
      patientDestination: 'waiting',
      destinationLabel: 'Waiting room',
      updatedAt: '2026-06-20T12:00:00.000Z',
    });

    expect(patch.state).toBe(PatientState.Waiting);
    expect(patch.location).toBe('Waiting room');
  });

  it('builds structured checklist steps for the ems-pipeline/reception-ems/whiteboard views', () => {
    const checklist = buildAmbulanceHandoffChecklist(baseArrival);
    const steps = buildAmbulanceHandoffChecklistSteps(checklist);

    expect(steps).toHaveLength(AMBULANCE_HANDOFF_CHECKLIST_FIELDS.length);
  });
});
