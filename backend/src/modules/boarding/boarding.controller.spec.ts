import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import mongoose from 'mongoose';
import { AuthorizationGuard } from '../auth/guards/authorization.guard';
import { PERMISSIONS_KEY } from '../auth/decorators/permissions.decorator';
import { Permission } from '../auth/enums/permission.enum';
import { BoardingController } from './boarding.controller';
import type { BoardingService } from '../../services/boarding.service';
import type { DischargePredictionService } from '../../services/discharge-prediction.service';

describe('BoardingController', () => {
  let controller: BoardingController;
  let boardingService: {
    trackDecisionToAdmit: jest.Mock;
    calculateBoardMetrics: jest.Mock;
    generateBoardReport: jest.Mock;
    getBoardedPatients: jest.Mock;
  };
  let dischargeService: {
    calculateDischargeReadiness: jest.Mock;
    identifySameDayDischarges: jest.Mock;
  };
  const originalReadyState = mongoose.connection.readyState;

  beforeEach(() => {
    boardingService = {
      trackDecisionToAdmit: jest.fn(async () => ({
        patient: { id: 'p1' },
        boardingStartTime: new Date('2026-08-05T00:00:00Z'),
        clinicianId: 'clin-1',
      })),
      calculateBoardMetrics: jest.fn(async () => ({ medianBoardTime: 100 })),
      generateBoardReport: jest.fn(async () => ({ colorCode: 'green' })),
      getBoardedPatients: jest.fn(async () => [{ id: 'p1' }]),
    };
    dischargeService = {
      calculateDischargeReadiness: jest.fn(async () => ({ patientId: 'p1', readinessScore: 80 })),
      identifySameDayDischarges: jest.fn(async () => [{ id: 'p1' }]),
    };
    controller = new BoardingController(
      boardingService as unknown as BoardingService,
      dischargeService as unknown as DischargePredictionService,
    );
    (mongoose.connection as any).readyState = 1;
  });

  afterEach(() => {
    (mongoose.connection as any).readyState = originalReadyState;
  });

  it('trackDecision() delegates and spreads the decision result', async () => {
    const result = await controller.trackDecision({ patientId: 'p1', clinicianId: 'clin-1' });
    expect(boardingService.trackDecisionToAdmit).toHaveBeenCalledWith('p1', 'clin-1', undefined);
    expect(result).toMatchObject({
      success: true,
      message: 'Decision to admit tracked',
      clinicianId: 'clin-1',
    });
  });

  // Regression for HEAL-347.57: trackDecision()/metrics()/report()/boarded()
  // and HEAL-347.57's discharge-prediction sibling dischargeReadiness()/
  // sameDayDischarges() previously never forwarded the resolved tenant
  // organizationId to the service at all, so any WRITE_PHI/READ_PHI caller
  // from ANY hospital could start another org's patient's boarding clock or
  // read/aggregate every org's boarding queue. Proves the resolved tenant
  // context now reaches every service call, same pattern as reassessment's
  // HEAL-347.55 regression tests.
  it('forwards the resolved tenant organizationId to every boarding/discharge service call', async () => {
    const tenantContext = { organizationId: 'org-1' } as any;

    await controller.trackDecision({ patientId: 'p1', clinicianId: 'clin-1' }, tenantContext);
    expect(boardingService.trackDecisionToAdmit).toHaveBeenCalledWith('p1', 'clin-1', 'org-1');

    await controller.metrics(tenantContext);
    expect(boardingService.calculateBoardMetrics).toHaveBeenCalledWith('org-1');

    await controller.report(tenantContext);
    expect(boardingService.generateBoardReport).toHaveBeenCalledWith('org-1');

    await controller.boarded(tenantContext);
    expect(boardingService.getBoardedPatients).toHaveBeenCalledWith('org-1');

    await controller.dischargeReadiness('p1', tenantContext);
    expect(dischargeService.calculateDischargeReadiness).toHaveBeenCalledWith('p1', 'org-1');

    await controller.sameDayDischarges(tenantContext);
    expect(dischargeService.identifySameDayDischarges).toHaveBeenCalledWith('org-1');
  });

  it('trackDecision() maps a "not found" service error to NotFoundException', async () => {
    boardingService.trackDecisionToAdmit.mockRejectedValueOnce(new Error('Patient not found'));
    await expect(
      controller.trackDecision({ patientId: 'missing', clinicianId: 'clin-1' }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('trackDecision() throws ServiceUnavailableException when MongoDB is not connected', async () => {
    (mongoose.connection as any).readyState = 0;
    await expect(
      controller.trackDecision({ patientId: 'p1', clinicianId: 'clin-1' }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('metrics() delegates to the service', async () => {
    await expect(controller.metrics()).resolves.toEqual({ medianBoardTime: 100 });
  });

  it('report() delegates to the service', async () => {
    await expect(controller.report()).resolves.toEqual({ colorCode: 'green' });
  });

  it('boarded() delegates to the service', async () => {
    await expect(controller.boarded()).resolves.toEqual([{ id: 'p1' }]);
  });

  it('dischargeReadiness() delegates to the service', async () => {
    await expect(controller.dischargeReadiness('p1')).resolves.toEqual({
      patientId: 'p1',
      readinessScore: 80,
    });
  });

  it('dischargeReadiness() maps a "not found" service error to NotFoundException', async () => {
    dischargeService.calculateDischargeReadiness.mockRejectedValueOnce(
      new Error('Patient not found'),
    );
    await expect(controller.dischargeReadiness('missing')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('sameDayDischarges() wraps the result with a count', async () => {
    await expect(controller.sameDayDischarges()).resolves.toEqual({
      count: 1,
      patients: [{ id: 'p1' }],
    });
  });
});

describe('BoardingController — requires a permission', () => {
  it('requires AuthorizationGuard on the controller', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, BoardingController) || [];
    expect(guards).toContain(AuthorizationGuard);
  });

  it('trackDecision requires WRITE_PHI', () => {
    const metadata = Reflect.getMetadata(
      PERMISSIONS_KEY,
      BoardingController.prototype.trackDecision,
    );
    expect(metadata).toEqual([Permission.WRITE_PHI]);
  });

  it('every read handler requires READ_PHI', () => {
    for (const handlerName of [
      'metrics',
      'report',
      'boarded',
      'dischargeReadiness',
      'sameDayDischarges',
    ] as const) {
      const handler = BoardingController.prototype[handlerName];
      const metadata = Reflect.getMetadata(PERMISSIONS_KEY, handler);
      expect(metadata).toEqual([Permission.READ_PHI]);
    }
  });
});
