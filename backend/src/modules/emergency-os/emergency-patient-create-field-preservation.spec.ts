import { EmergencyPatientService } from './emergency-os.services';

function makeService() {
  const workflowLogService = { record: jest.fn() } as unknown as { record: jest.Mock };
  const service = new EmergencyPatientService(workflowLogService as any);
  return { service };
}

describe('EmergencyPatientService.createPatient — field preservation (Cycle 223 regression)', () => {
  // createPatient used to build its return value from a hand-picked object
  // literal covering only ~28 of the Patient type's ~50+ fields, even though
  // ensurePatientArrivalBlock()/syncPatientFromArrival() already preserve
  // every field the caller sent via their own spread. Any real caller field
  // not on that literal's allowlist — phone, healthCardNumber, healthCard,
  // source, location, symptoms, waitTimeMinutes, lastAssessedTime, and any
  // future Patient field — was silently dropped on creation, even though
  // updatePatient's own (spread-based) construction never had this gap.

  it('preserves phone, healthCardNumber, and healthCard captured during Smart Intake OCR review', () => {
    const { service } = makeService();
    const created = service.createPatient({
      firstName: 'Priya',
      lastName: 'Nandakumar',
      phone: '555-0142',
      healthCardNumber: 'ON-1234-567-890',
      healthCard: 'ON-1234-567-890',
    } as any);

    expect((created as any).phone).toBe('555-0142');
    expect((created as any).healthCardNumber).toBe('ON-1234-567-890');
    expect((created as any).healthCard).toBe('ON-1234-567-890');
  });

  it('preserves source, location, symptoms, waitTimeMinutes, and lastAssessedTime', () => {
    const { service } = makeService();
    const created = service.createPatient({
      firstName: 'Marcus',
      lastName: 'Delgado',
      source: 'WalkIn',
      location: 'Waiting Room B',
      symptoms: ['chest pain', 'nausea'],
      waitTimeMinutes: 12,
      lastAssessedTime: '2026-07-28T10:00:00.000Z',
    } as any);

    expect((created as any).source).toBe('WalkIn');
    expect((created as any).location).toBe('Waiting Room B');
    expect((created as any).symptoms).toEqual(['chest pain', 'nausea']);
    expect((created as any).waitTimeMinutes).toBe(12);
    expect((created as any).lastAssessedTime).toBe('2026-07-28T10:00:00.000Z');
  });

  it('still applies every existing default/normalization rule unchanged', () => {
    const { service } = makeService();
    const created = service.createPatient({ priority: 'P1' } as any);

    expect(created.firstName).toBe('Unknown');
    expect(created.lastName).toBe('Patient');
    expect(created.complaintCategory).toBe('Other');
    expect(created.flags).toEqual(['HighRisk']);
    expect(created.state).toBe('Triage');
    expect(created.timeline).toHaveLength(1);
    expect(created.timeline[0].note).toBe('Created through Smart Intake.');
  });

  it('still lets the normalized/defaulted values win over raw spread input, not the other way around', () => {
    const { service } = makeService();
    // A raw, pre-normalization vitals shape (bpSystolic/bpDiastolic, no sbp/dbp)
    // landing on `created.vitals` unnormalized would mean the post-spread
    // `vitals: normalizePatientVitals(...)` override stopped running after
    // the spread — exactly the regression this ordering guards against.
    const created = service.createPatient({
      firstName: 'Order',
      lastName: 'Matters',
      vitals: [{ hr: 80, bpSystolic: 118, bpDiastolic: 76, recordedAt: 'x' }] as any,
    } as any);

    expect(created.vitals[0].sbp).toBe(118);
    expect(created.vitals[0].dbp).toBe(76);
  });
});
