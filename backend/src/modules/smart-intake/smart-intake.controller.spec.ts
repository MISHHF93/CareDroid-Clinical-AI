import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { SmartIntakeController } from './smart-intake.controller';
import type { SmartIntakeService } from '../../services/smart-intake.service';

describe('SmartIntakeController', () => {
  let controller: SmartIntakeController;
  let service: Record<string, jest.Mock>;
  const originalReadyState = mongoose.connection.readyState;

  beforeEach(() => {
    service = {
      createSession: jest.fn(async () => ({ _id: 'session-1' })),
      addManualEntry: jest.fn(async () => ({ ok: true })),
      addDocument: jest.fn(async () => ({ ok: true })),
      ingestOcrResult: jest.fn(async () => ({ ok: true })),
      addEMSEvidence: jest.fn(async () => ({ ok: true })),
      match: jest.fn(async () => ({ ok: true })),
      verifyField: jest.fn(async () => ({ ok: true })),
      linkPatient: jest.fn(async () => ({ ok: true })),
      createPatient: jest.fn(async () => ({ ok: true })),
      continueUnknown: jest.fn(async () => ({ ok: true })),
      reconcileUnknown: jest.fn(async () => ({ ok: true })),
      captureBiometricConsent: jest.fn(async () => ({ ok: true })),
      withdrawBiometricConsent: jest.fn(async () => ({ ok: true })),
      getAuditLog: jest.fn(async () => [{ id: 'audit-1' }]),
    };
    controller = new SmartIntakeController(service as unknown as SmartIntakeService);
    (mongoose.connection as any).readyState = 1;
  });

  afterEach(() => {
    (mongoose.connection as any).readyState = originalReadyState;
  });

  it('createSession() resolves actor from staff and returns sessionId + session', async () => {
    const result = await controller.createSession({ staff: 'Nurse Joy' });
    expect(service.createSession).toHaveBeenCalledWith('Nurse Joy', undefined);
    expect(result).toEqual({ sessionId: 'session-1', session: { _id: 'session-1' } });
  });

  it('createSession() falls back to the x-caredroid-user-id header when no staff/clinician given', async () => {
    await controller.createSession({}, 'user-header-id');
    expect(service.createSession).toHaveBeenCalledWith('user-header-id', undefined);
  });

  it('createSession() falls back to unknown-staff when nothing identifies the actor', async () => {
    await controller.createSession({});
    expect(service.createSession).toHaveBeenCalledWith('unknown-staff', undefined);
  });

  it('createSession() throws ServiceUnavailableException when MongoDB is not connected', async () => {
    (mongoose.connection as any).readyState = 0;
    await expect(controller.createSession({})).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('manualEntry() unwraps the manual field before delegating', async () => {
    await controller.manualEntry('s1', { manual: { firstName: 'Jo' }, staff: 'a' });
    expect(service.addManualEntry).toHaveBeenCalledWith('s1', { firstName: 'Jo' }, 'a', undefined);
  });

  it('documents() unwraps the document field before delegating', async () => {
    await controller.documents('s1', { document: { type: 'id_card' }, staff: 'a' });
    expect(service.addDocument).toHaveBeenCalledWith('s1', { type: 'id_card' }, 'a', undefined);
  });

  it('ocrResults() passes the whole body through, matching the real caller spread shape', async () => {
    await controller.ocrResults('s1', { demographics: { firstName: 'Jo' }, staff: 'a' });
    expect(service.ingestOcrResult).toHaveBeenCalledWith(
      's1',
      { demographics: { firstName: 'Jo' }, staff: 'a' },
      'a',
      undefined,
    );
  });

  it('emsEvidence() unwraps the ems field before delegating', async () => {
    await controller.emsEvidence('s1', { ems: { emsUnitId: 'unit-1' }, staff: 'a' });
    expect(service.addEMSEvidence).toHaveBeenCalledWith(
      's1',
      { emsUnitId: 'unit-1' },
      'a',
      undefined,
    );
  });

  // Regression for HEAL-347.59: this Mongoose intake-session model (and its
  // getSession() chokepoint every method below reads/writes through) had no
  // organizationId field or check at all before this fix -- these tests
  // prove the resolved tenant context now reaches the service on every
  // write path, same pattern as HEAL-347.49's match()/createPatient()/etc.
  // regression tests just below.
  it('forwards the resolved tenant organizationId on createSession/manualEntry/documents/ocrResults/emsEvidence', async () => {
    const tenantContext = { organizationId: 'org-1' } as never;

    await controller.createSession({ staff: 'a' }, undefined, tenantContext);
    expect(service.createSession).toHaveBeenCalledWith('a', 'org-1');

    await controller.manualEntry(
      's1',
      { manual: { firstName: 'Jo' }, staff: 'a' },
      undefined,
      tenantContext,
    );
    expect(service.addManualEntry).toHaveBeenCalledWith('s1', { firstName: 'Jo' }, 'a', 'org-1');

    await controller.documents(
      's1',
      { document: { type: 'id_card' }, staff: 'a' },
      undefined,
      tenantContext,
    );
    expect(service.addDocument).toHaveBeenCalledWith('s1', { type: 'id_card' }, 'a', 'org-1');

    await controller.ocrResults('s1', { staff: 'a' }, undefined, tenantContext);
    expect(service.ingestOcrResult).toHaveBeenCalledWith('s1', { staff: 'a' }, 'a', 'org-1');

    await controller.emsEvidence(
      's1',
      { ems: { emsUnitId: 'unit-1' }, staff: 'a' },
      undefined,
      tenantContext,
    );
    expect(service.addEMSEvidence).toHaveBeenCalledWith(
      's1',
      { emsUnitId: 'unit-1' },
      'a',
      'org-1',
    );
  });

  it('match() delegates to the service', async () => {
    await controller.match('s1', { staff: 'a' });
    expect(service.match).toHaveBeenCalledWith('s1', 'a', undefined);
  });

  // Regression for HEAL-347.49: match()/createPatient()/continueUnknown()/
  // reconcileUnknown() all reach the Mongoose UnifiedPatient model with zero
  // organizationId before this fix -- proves the tenant context now threads
  // through to the service instead of being silently dropped.
  it('match() forwards the resolved tenant organizationId to the service', async () => {
    await controller.match('s1', { staff: 'a' }, undefined, { organizationId: 'org-1' } as never);
    expect(service.match).toHaveBeenCalledWith('s1', 'a', 'org-1');
  });

  it('verifyField() throws BadRequestException when field or decision is missing', async () => {
    await expect(controller.verifyField('s1', { staff: 'a' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('verifyField() delegates with the edited value', async () => {
    await controller.verifyField('s1', {
      field: 'lastName',
      decision: 'edited',
      edited_value: 'Smith',
      staff: 'a',
    });
    expect(service.verifyField).toHaveBeenCalledWith(
      's1',
      'lastName',
      'edited',
      'a',
      'Smith',
      undefined,
    );
  });

  it('verifyField() forwards the resolved tenant organizationId to the service', async () => {
    await controller.verifyField(
      's1',
      { field: 'lastName', decision: 'edited', edited_value: 'Smith', staff: 'a' },
      undefined,
      { organizationId: 'org-1' } as never,
    );
    expect(service.verifyField).toHaveBeenCalledWith(
      's1',
      'lastName',
      'edited',
      'a',
      'Smith',
      'org-1',
    );
  });

  it('linkPatient() throws BadRequestException when patientId is missing', async () => {
    await expect(controller.linkPatient('s1', { staff: 'a' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('linkPatient() delegates to the service', async () => {
    await controller.linkPatient('s1', { patientId: 'p1', staff: 'a' });
    expect(service.linkPatient).toHaveBeenCalledWith('s1', 'p1', 'a', undefined);
  });

  it('linkPatient() forwards the resolved tenant organizationId to the service', async () => {
    await controller.linkPatient('s1', { patientId: 'p1', staff: 'a' }, undefined, {
      organizationId: 'org-1',
    } as never);
    expect(service.linkPatient).toHaveBeenCalledWith('s1', 'p1', 'a', 'org-1');
  });

  it('createPatient() delegates to the service', async () => {
    await controller.createPatient('s1', { staff: 'a' });
    expect(service.createPatient).toHaveBeenCalledWith('s1', 'a', undefined);
  });

  it('createPatient() forwards the resolved tenant organizationId to the service', async () => {
    await controller.createPatient('s1', { staff: 'a' }, undefined, {
      organizationId: 'org-1',
    } as never);
    expect(service.createPatient).toHaveBeenCalledWith('s1', 'a', 'org-1');
  });

  it('continueUnknown() defaults the label to Unknown Patient', async () => {
    await controller.continueUnknown('s1', { staff: 'a' });
    expect(service.continueUnknown).toHaveBeenCalledWith('s1', 'Unknown Patient', 'a', undefined);
  });

  it('continueUnknown() forwards the resolved tenant organizationId to the service', async () => {
    await controller.continueUnknown('s1', { staff: 'a' }, undefined, {
      organizationId: 'org-1',
    } as never);
    expect(service.continueUnknown).toHaveBeenCalledWith('s1', 'Unknown Patient', 'a', 'org-1');
  });

  it('reconcileUnknown() throws BadRequestException when patientId is missing', async () => {
    await expect(controller.reconcileUnknown('s1', { staff: 'a' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('reconcileUnknown() delegates to the service', async () => {
    await controller.reconcileUnknown('s1', { patientId: 'p1', staff: 'a' });
    expect(service.reconcileUnknown).toHaveBeenCalledWith('s1', 'p1', 'a', undefined);
  });

  it('reconcileUnknown() forwards the resolved tenant organizationId to the service', async () => {
    await controller.reconcileUnknown('s1', { patientId: 'p1', staff: 'a' }, undefined, {
      organizationId: 'org-1',
    } as never);
    expect(service.reconcileUnknown).toHaveBeenCalledWith('s1', 'p1', 'a', 'org-1');
  });

  it('biometricConsent() delegates to the service', async () => {
    await controller.biometricConsent('s1', { consentGranted: true, staff: 'a' });
    expect(service.captureBiometricConsent).toHaveBeenCalledWith(
      's1',
      { consentGranted: true, staff: 'a' },
      'a',
      undefined,
    );
  });

  it('withdrawBiometricConsent() delegates to the service', async () => {
    await controller.withdrawBiometricConsent('s1', { staff: 'a' });
    expect(service.withdrawBiometricConsent).toHaveBeenCalledWith('s1', 'a', undefined);
  });

  it('auditLog() wraps the result with a count', async () => {
    const result = await controller.auditLog('s1');
    expect(result).toEqual({ count: 1, auditLog: [{ id: 'audit-1' }] });
    expect(service.getAuditLog).toHaveBeenCalledWith('s1', undefined);
  });

  it('forwards the resolved tenant organizationId on biometricConsent/withdrawBiometricConsent/auditLog', async () => {
    const tenantContext = { organizationId: 'org-1' } as never;

    await controller.biometricConsent(
      's1',
      { consentGranted: true, staff: 'a' },
      undefined,
      tenantContext,
    );
    expect(service.captureBiometricConsent).toHaveBeenCalledWith(
      's1',
      { consentGranted: true, staff: 'a' },
      'a',
      'org-1',
    );

    await controller.withdrawBiometricConsent('s1', { staff: 'a' }, undefined, tenantContext);
    expect(service.withdrawBiometricConsent).toHaveBeenCalledWith('s1', 'a', 'org-1');

    await controller.auditLog('s1', tenantContext);
    expect(service.getAuditLog).toHaveBeenCalledWith('s1', 'org-1');
  });

  it('maps a "not found" service error to NotFoundException', async () => {
    service.match.mockRejectedValueOnce(new Error('Intake session not found'));
    await expect(controller.match('missing', {})).rejects.toBeInstanceOf(NotFoundException);
  });

  it('maps a duplicate/state-conflict service error to ConflictException', async () => {
    service.createPatient.mockRejectedValueOnce(
      new Error('High-confidence duplicate requires manual override before creating a new patient'),
    );
    await expect(controller.createPatient('s1', {})).rejects.toBeInstanceOf(ConflictException);
  });

  it('maps an invalid-input service error to BadRequestException', async () => {
    // "invalid field" hits only the 3rd classifier bucket -- unlike a message
    // containing "pending", which the classifier checks first and maps to 409,
    // matching the legacy Express smartIntakeErrorStatus() regex order exactly.
    service.verifyField.mockRejectedValueOnce(new Error('invalid field provided'));
    await expect(
      controller.verifyField('s1', { field: 'x', decision: 'approved' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('SmartIntakeController — requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, SmartIntakeController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('every write handler requires WRITE_PHI', () => {
    for (const handlerName of [
      'createSession',
      'manualEntry',
      'documents',
      'ocrResults',
      'emsEvidence',
      'match',
      'verifyField',
      'linkPatient',
      'createPatient',
      'continueUnknown',
      'reconcileUnknown',
      'biometricConsent',
      'withdrawBiometricConsent',
    ] as const) {
      const handler = SmartIntakeController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.WRITE_PHI]);
    }
  });

  it('auditLog requires READ_PHI', () => {
    const metadata = Reflect.getMetadata(PERMISSIONS_KEY, SmartIntakeController.prototype.auditLog);
    expect(metadata).toEqual([Permission.READ_PHI]);
  });
});
