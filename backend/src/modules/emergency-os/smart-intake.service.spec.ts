import { ConflictException } from '@nestjs/common';
import { SmartIntakeService } from './emergency-os.services';
import type { EmergencyPatient } from './emergency-os.types';

function makeExistingPatient(overrides: Partial<EmergencyPatient> = {}): EmergencyPatient {
  return {
    id: 'existing-1',
    mrn: 'ED-100001',
    firstName: 'Marcus',
    lastName: 'Chen',
    dob: '1965-03-14',
    age: 60,
    sex: 'M',
    arrivalTime: '2026-07-24T08:00:00.000Z',
    chiefComplaint: 'Chest pain',
    complaintCategory: 'Cardiac',
    state: 'Waiting',
    priority: 'P3',
    vitals: [],
    flags: [],
    notes: [],
    timeline: [],
    ...overrides,
  } as EmergencyPatient;
}

function makeServices(existingPatients: EmergencyPatient[] = []) {
  const patients = [...existingPatients];
  const record = jest.fn();
  const patientService = {
    listPatients: jest.fn(() => patients),
    createPatient: jest.fn((input: Partial<EmergencyPatient>) => {
      const created = {
        ...makeExistingPatient(),
        ...input,
        id: input.id || `created-${patients.length + 1}`,
      } as EmergencyPatient;
      patients.push(created);
      return created;
    }),
    movePatientToState: jest.fn((patientId: string, to: EmergencyPatient['state']) => {
      const patient = patients.find((entry) => entry.id === patientId)!;
      patient.state = to;
      return patient;
    }),
  };
  const workflowLogService = { record } as unknown as { record: jest.Mock };
  const service = new SmartIntakeService(patientService as any, workflowLogService as any);
  return { service, patientService, workflowLogService, patients };
}

describe('SmartIntakeService duplicate gate', () => {
  describe('createFromIntake', () => {
    it('creates normally and returns an empty duplicateCandidates list when nothing matches', () => {
      const { service, patientService, workflowLogService } = makeServices([makeExistingPatient()]);

      const result = service.createFromIntake({
        firstName: 'Nobody',
        lastName: 'Nowhere',
        dob: '2000-01-01',
      });

      expect(patientService.createPatient).toHaveBeenCalledTimes(1);
      expect(result.data.duplicateCandidates).toEqual([]);
      expect(workflowLogService.record).not.toHaveBeenCalled();
    });

    it('blocks a high-confidence duplicate with a ConflictException instead of creating', () => {
      const { service, patientService, workflowLogService } = makeServices([makeExistingPatient()]);

      expect(() =>
        service.createFromIntake({
          firstName: 'Marcus',
          lastName: 'Chen',
          dob: '1965-03-14',
          mrn: 'ED-100001',
        }),
      ).toThrow(ConflictException);

      expect(patientService.createPatient).not.toHaveBeenCalled();
      expect(workflowLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'patient_duplicate_flagged',
          metadata: expect.objectContaining({ blocked: true }),
        }),
      );
    });

    it('surfaces the candidate list on the thrown ConflictException response body', () => {
      const { service } = makeServices([makeExistingPatient()]);

      try {
        service.createFromIntake({
          firstName: 'Marcus',
          lastName: 'Chen',
          dob: '1965-03-14',
          mrn: 'ED-100001',
        });
        throw new Error('expected ConflictException to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(ConflictException);
        const response = (error as ConflictException).getResponse() as {
          duplicateCandidates: Array<{ patientId: string }>;
        };
        expect(response.duplicateCandidates[0].patientId).toBe('existing-1');
      }
    });

    it('proceeds when a high-confidence duplicate is explicitly overridden, and logs the override', () => {
      const { service, patientService, workflowLogService } = makeServices([makeExistingPatient()]);

      const result = service.createFromIntake({
        firstName: 'Marcus',
        lastName: 'Chen',
        dob: '1965-03-14',
        mrn: 'ED-100001',
        confirmDuplicateOverride: true,
      });

      expect(patientService.createPatient).toHaveBeenCalledTimes(1);
      expect(result.data.duplicateCandidates[0].patientId).toBe('existing-1');
      expect(workflowLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'patient_duplicate_flagged',
          title: 'Duplicate patient creation confirmed by caller',
          metadata: expect.objectContaining({ blocked: false, overrideConfirmed: true }),
        }),
      );
    });

    it('creates and logs (non-blocking) for a below-high-confidence match with no override needed', () => {
      const { service, patientService, workflowLogService } = makeServices([makeExistingPatient()]);

      const result = service.createFromIntake({ firstName: 'Marcus' });

      expect(patientService.createPatient).toHaveBeenCalledTimes(1);
      expect(result.data.duplicateCandidates).toEqual([]);
      expect(workflowLogService.record).not.toHaveBeenCalled();

      const result2 = service.createFromIntake({ mrn: 'ED-100001' });
      expect(patientService.createPatient).toHaveBeenCalledTimes(2);
      expect(result2.data.duplicateCandidates.length).toBeGreaterThan(0);
      expect(workflowLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Possible duplicate patient created',
          severity: 'Info',
        }),
      );
    });
  });

  describe('createVerticalSlice', () => {
    it('blocks a high-confidence duplicate before any state transition happens', () => {
      const { service, patientService, workflowLogService } = makeServices([makeExistingPatient()]);

      expect(() =>
        service.createVerticalSlice({
          firstName: 'Marcus',
          lastName: 'Chen',
          dob: '1965-03-14',
          mrn: 'ED-100001',
        }),
      ).toThrow(ConflictException);

      expect(patientService.createPatient).not.toHaveBeenCalled();
      expect(patientService.movePatientToState).not.toHaveBeenCalled();
      expect(workflowLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: expect.objectContaining({ blocked: true }) }),
      );
    });

    it('proceeds through create + triage transition when override is confirmed', () => {
      const { service, patientService } = makeServices([makeExistingPatient()]);

      const result = service.createVerticalSlice({
        firstName: 'Marcus',
        lastName: 'Chen',
        dob: '1965-03-14',
        mrn: 'ED-100001',
        confirmDuplicateOverride: true,
      });

      expect(patientService.createPatient).toHaveBeenCalledTimes(1);
      expect(patientService.movePatientToState).toHaveBeenCalledTimes(1);
      expect(result.duplicateCandidates[0].patientId).toBe('existing-1');
    });
  });
});

describe('SmartIntakeService organization tenant scoping (BOLA audit)', () => {
  // Neither createFromIntake nor createVerticalSlice used to accept an
  // organizationId parameter at all, and none of their 3 HTTP callers
  // (POST /emergency/patients, /emergency/intake, /emergency/intake/
  // vertical-slice) passed one -- EmergencyPatientService.createPatient()'s
  // own fallback for a missing organizationId is `?? normalized.organizationId`,
  // i.e. whatever the CLIENT put in the request body (SmartIntakeCreateInput
  // is a plain type, not a validated class-DTO, so nothing strips it). Any
  // authenticated WRITE_PHI caller could therefore create a patient directly
  // inside a different hospital's roster by setting organizationId in their
  // own POST body.

  it('createFromIntake threads the caller-resolved organizationId to createPatient, not whatever the request body claims', () => {
    const { service, patientService } = makeServices();

    service.createFromIntake(
      { firstName: 'Org', lastName: 'A', organizationId: 'org-spoofed' } as any,
      'org-real',
    );

    expect(patientService.createPatient).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-spoofed' }),
      'org-real',
    );
  });

  it('createVerticalSlice threads the caller-resolved organizationId to createPatient, not whatever the request body claims', () => {
    const { service, patientService } = makeServices();

    service.createVerticalSlice(
      { firstName: 'Org', lastName: 'A', organizationId: 'org-spoofed' } as any,
      'org-real',
    );

    expect(patientService.createPatient).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 'org-spoofed' }),
      'org-real',
    );
  });

  it('createFromIntake only matches duplicate candidates within the caller\'s own organization', () => {
    const { service, patientService } = makeServices([makeExistingPatient()]);

    service.createFromIntake(
      { firstName: 'Nobody', lastName: 'Nowhere', dob: '2000-01-01' },
      'org-a',
    );

    expect(patientService.listPatients).toHaveBeenCalledWith('org-a');
  });
});
