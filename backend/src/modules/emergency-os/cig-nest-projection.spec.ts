import { buildCigSnapshotFromNestBoard } from './cig-nest-projection';
import {
  emergencyAlertsFixture,
  emergencyPatientsFixture,
  emergencyRoomsFixture,
  emergencyStaffFixture,
} from './emergency-os.fixtures';
import { findCigNode } from '../../../../lib/cig';

describe('buildCigSnapshotFromNestBoard', () => {
  it('projects Nest fixtures into a Mode B CIG snapshot', () => {
    const snapshot = buildCigSnapshotFromNestBoard({
      tenantId: 'nest-demo',
      generatedAt: '2026-07-16T18:00:00.000Z',
      snapshotVersion: 1,
      patients: emergencyPatientsFixture,
      rooms: emergencyRoomsFixture,
      staff: emergencyStaffFixture,
      alerts: emergencyAlertsFixture,
    });

    expect(snapshot.meta.tenantId).toBe('nest-demo');
    expect(snapshot.durability).toBe('session');
    expect(snapshot.degraded).toBe(true);
    expect(snapshot.meta.nodeCount).toBeGreaterThan(0);

    const first = emergencyPatientsFixture[0];
    if (first) {
      const node = findCigNode(snapshot, 'patient', first.id);
      expect(node?.state.status).toBe(first.state);
      expect(node?.phiClass).toBe('direct');
    }
  });
});
