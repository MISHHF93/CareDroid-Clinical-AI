import { describe, expect, it } from 'vitest';
import { CARE_DROID_SCREEN_MODES } from '../../central-node/careDroidCentralNode';
import { EMERGENCY_ROLE_IDS } from '../../config/emergencyRolePermissions';
import { EMS_SCREEN_WIDGETS } from '../../config/emsScreenModel';
import {
  EMS_WORKFLOW_SURFACES,
  selectEmsOperationalStrip,
  shouldShowEmsOperationalStrip,
} from './emsWorkflowModel';

const baseArrival = {
  id: 'ems-1',
  unitId: 'Medic 12',
  status: 'Inbound',
  severity: 'Critical',
  chiefComplaint: 'Chest pain',
  estimatedArrivalTime: new Date(Date.now() + 8 * 60000).toISOString(),
  vitals: { hr: 110, sbp: 140, dbp: 90, spo2: 94 },
};

describe('emsWorkflowModel', () => {
  it('defines EMS workflow surfaces aligned to screen widgets', () => {
    expect(EMS_WORKFLOW_SURFACES).toEqual([
      EMS_SCREEN_WIDGETS.inboundAmbulances,
      EMS_SCREEN_WIDGETS.etaDisplay,
      EMS_SCREEN_WIDGETS.receivingArea,
      EMS_SCREEN_WIDGETS.offloadTimers,
      EMS_SCREEN_WIDGETS.emsPressure,
    ]);
  });

  it('shows the strip for EMS screen mode and role', () => {
    expect(
      shouldShowEmsOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.ems,
        roleId: EMERGENCY_ROLE_IDS.physician,
      }),
    ).toBe(true);
    expect(
      shouldShowEmsOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
        roleId: EMERGENCY_ROLE_IDS.emsUser,
      }),
    ).toBe(true);
    expect(
      shouldShowEmsOperationalStrip({
        screenMode: CARE_DROID_SCREEN_MODES.chargeNurse,
        roleId: EMERGENCY_ROLE_IDS.chargeNurse,
        displayMode: true,
      }),
    ).toBe(false);
  });

  it('builds EMS operational strip metrics', () => {
    const metrics = selectEmsOperationalStrip({
      emsArrivals: [
        baseArrival,
        {
          ...baseArrival,
          id: 'ems-2',
          status: 'Arrived',
          arrivedAt: new Date(Date.now() - 20 * 60000).toISOString(),
        },
      ],
    });

    expect(metrics.map((metric) => metric.surface)).toEqual(EMS_WORKFLOW_SURFACES);
    expect(metrics.find((metric) => metric.id === 'inbound')?.value).toBeGreaterThan(0);
    expect(metrics.find((metric) => metric.id === 'receiving')?.value).toBeGreaterThan(0);
    expect(metrics.find((metric) => metric.id === 'pressure')).toBeTruthy();
  });

  it('filters strip metrics to visible EMS surfaces', () => {
    const metrics = selectEmsOperationalStrip({
      emsArrivals: [baseArrival],
      visibleSurfaces: [
        EMS_SCREEN_WIDGETS.inboundAmbulances,
        EMS_SCREEN_WIDGETS.emsPressure,
      ],
    });

    expect(metrics.map((metric) => metric.surface)).toEqual([
      EMS_SCREEN_WIDGETS.inboundAmbulances,
      EMS_SCREEN_WIDGETS.emsPressure,
    ]);
  });
});
