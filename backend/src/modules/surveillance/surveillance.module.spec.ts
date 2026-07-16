import { buildSurveillanceNexusSnapshot } from './surveillance.data';
import { SURVEILLANCE_ADAPTER_CONTRACTS } from './surveillance-nexus.contracts';
import { SurveillanceService } from './surveillance.service';

describe('surveillance nexus module', () => {
  it('builds a complete nexus snapshot', () => {
    const snapshot = buildSurveillanceNexusSnapshot();
    expect(snapshot.demo).toBe(true);
    expect(snapshot.zones.length).toBeGreaterThanOrEqual(3);
    expect(snapshot.cameras.length).toBeGreaterThanOrEqual(4);
    expect(snapshot.iotDevices.length).toBeGreaterThanOrEqual(5);
    expect(snapshot.integrationContracts.length).toBeGreaterThanOrEqual(5);
  });

  it('requires welfare-safe adapter approval', () => {
    const welfare = SURVEILLANCE_ADAPTER_CONTRACTS.find(
      (entry) => entry.adapterId === 'trackmind-welfare-safe-vms',
    );
    expect(welfare?.welfareSafeRequired).toBe(true);
    expect(welfare?.requiredHumanApproval).toBe(true);
  });

  it('serves the canonical nexus snapshot for request-scoped callers', async () => {
    const service = new SurveillanceService();

    const snapshot = await service.getNexusSnapshot({
      user: { id: 'user-1', role: 'security-operator' },
      ip: '127.0.0.1',
    });

    expect(snapshot).toEqual(buildSurveillanceNexusSnapshot());
  });
});
