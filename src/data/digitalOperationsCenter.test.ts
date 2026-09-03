import { describe, expect, it } from 'vitest';
import {
  getOperationsCenterRoleView,
  getOperationsCenterSnapshot,
  OPERATIONS_CENTER_SURFACE_IDS,
  searchOperationsCenterSurfaces,
} from './digitalOperationsCenter';

describe('digitalOperationsCenter', () => {
  it('covers all requested operational surfaces', () => {
    expect(OPERATIONS_CENTER_SURFACE_IDS).toEqual([
      'digital-twin',
      'hospital-map',
      'medical-iot',
      'fleet',
      'notifications',
      'system-health',
    ]);

    const snapshot = getOperationsCenterSnapshot();
    expect(snapshot.surfaceCount).toBe(6);
    expect(snapshot.combinedSurfaceLabels).toEqual(
      expect.arrayContaining([
        'Digital Twin',
        'Hospital Map',
        'Medical IoT',
        'Fleet',
        'Notifications',
        'System Health',
      ]),
    );
  });

  it('builds role-based priority views', () => {
    const adminView = getOperationsCenterRoleView({
      role: 'admin',
      hasPermission: () => true,
    });
    const nurseView = getOperationsCenterRoleView({
      role: 'nurse',
      hasPermission: (permission) => permission === 'VIEW_OPERATIONS',
    });

    expect(adminView.prioritySurfaces.map((surface) => surface.id)).toEqual(
      OPERATIONS_CENTER_SURFACE_IDS,
    );
    expect(nurseView.label).toBe('Care team operations');
    expect(nurseView.prioritySurfaces.map((surface) => surface.id)).toEqual(
      expect.arrayContaining(['hospital-map', 'medical-iot', 'fleet', 'notifications']),
    );
    expect(nurseView.prioritySurfaces.map((surface) => surface.id)).not.toContain('system-health');
  });

  it('searches combined operational surfaces', () => {
    const results = searchOperationsCenterSurfaces('observability');

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      id: 'system-health',
      path: '/system-health',
    });
  });
});
