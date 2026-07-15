import { PlatformSystemsController } from './platform-systems.controller';

describe('PlatformSystemsController', () => {
  const buildController = () => {
    const emergencyPatientService = {
      listPatients: jest.fn(() => [{ id: 'pt-001', firstName: 'Maya', lastName: 'Singh' }]),
      getPatient: jest.fn((patientId: string) =>
        patientId === 'pt-001' ? { id: 'pt-001', firstName: 'Maya', lastName: 'Singh' } : undefined,
      ),
      createPatient: jest.fn((input: Record<string, unknown>) => ({ id: 'pt-002', ...input })),
      updatePatient: jest.fn((patientId: string, patch: Record<string, unknown>) => {
        if (patientId !== 'pt-001') throw new Error('not found');
        return { id: patientId, ...patch };
      }),
      listStaff: jest.fn(() => [{ id: 'staff-1', active: true }]),
      listRooms: jest.fn(() => [{ id: 'room-1', status: 'Available' }]),
    };
    const referralService = {
      getReferrals: jest.fn(() => ({ data: { referrals: [{ id: 'ref-1' }] } })),
      createReferral: jest.fn((input: Record<string, unknown>) => ({
        data: { referral: { id: 'ref-2', ...input } },
      })),
    };
    const emsIntakeService = {
      getEMSIntake: jest.fn(() => ({ data: { arrivals: [], emsArrivals: [] } })),
    };

    return {
      controller: new PlatformSystemsController(
        emergencyPatientService as any,
        referralService as any,
        emsIntakeService as any,
      ),
      emergencyPatientService,
      referralService,
      emsIntakeService,
    };
  };

  describe('emergency patient/staff/rooms/ems/referrals — delegate to the shared EmergencyPatientService', () => {
    it('lists and fetches patients through the shared service, not a local array', () => {
      const { controller, emergencyPatientService } = buildController();

      expect(controller.getEmergencyPatients()).toEqual([
        { id: 'pt-001', firstName: 'Maya', lastName: 'Singh' },
      ]);
      expect(emergencyPatientService.listPatients).toHaveBeenCalled();

      expect(controller.getEmergencyPatient('pt-001')).toEqual({
        id: 'pt-001',
        firstName: 'Maya',
        lastName: 'Singh',
      });
      expect(() => controller.getEmergencyPatient('missing')).toThrow(
        'Emergency patient missing was not found',
      );
    });

    it('creates a patient via the shared service and requires a chief complaint', () => {
      const { controller, emergencyPatientService } = buildController();

      expect(() => controller.createEmergencyPatient({})).toThrow(
        'chiefComplaint or complaint is required',
      );

      const created = controller.createEmergencyPatient({ complaint: 'Fever' });
      expect(emergencyPatientService.createPatient).toHaveBeenCalledWith(
        expect.objectContaining({ chiefComplaint: 'Fever' }),
      );
      expect(created).toEqual(expect.objectContaining({ chiefComplaint: 'Fever' }));
    });

    it('patches a patient via the shared service and 404s when not found', () => {
      const { controller } = buildController();

      expect(controller.updateEmergencyPatient('pt-001', { priority: 'P1' })).toEqual(
        expect.objectContaining({ id: 'pt-001', priority: 'P1' }),
      );
      expect(() => controller.updateEmergencyPatient('missing', {})).toThrow(
        'Emergency patient missing was not found',
      );
    });

    it('lists staff and rooms through the shared service', () => {
      const { controller, emergencyPatientService } = buildController();

      expect(controller.getEmergencyStaff()).toEqual([{ id: 'staff-1', active: true }]);
      expect(emergencyPatientService.listStaff).toHaveBeenCalled();

      expect(controller.getEmergencyRooms()).toEqual([{ id: 'room-1', status: 'Available' }]);
      expect(emergencyPatientService.listRooms).toHaveBeenCalled();
    });

    it('derives the active shift from on-shift staff instead of a static fixture', () => {
      const { controller } = buildController();

      expect(controller.getEmergencyShift()).toEqual(
        expect.objectContaining({ status: 'Active', staffIds: ['staff-1'] }),
      );
    });

    it('delegates EMS state to the shared EMSIntakeService', () => {
      const { controller, emsIntakeService } = buildController();

      expect(controller.getEmergencyEms()).toEqual({ data: { arrivals: [], emsArrivals: [] } });
      expect(emsIntakeService.getEMSIntake).toHaveBeenCalled();
    });

    it('lists and creates referrals through the shared ReferralService, validating the patient exists', () => {
      const { controller, referralService } = buildController();

      expect(controller.getEmergencyReferrals()).toEqual({
        data: { referrals: [{ id: 'ref-1' }] },
      });
      expect(referralService.getReferrals).toHaveBeenCalled();

      expect(() => controller.createEmergencyReferral({ patientId: 'missing' })).toThrow(
        'Emergency patient missing was not found',
      );

      const created = controller.createEmergencyReferral({
        patientId: 'pt-001',
        targetDepartment: 'Cardiology',
      });
      expect(created).toEqual(expect.objectContaining({ id: 'ref-2', patientId: 'pt-001' }));
    });
  });
});
