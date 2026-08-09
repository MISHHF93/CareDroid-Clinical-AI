import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { EmergencySettingsService } from './emergency-os.services';
import { EmergencyOsSettingsEntity } from './entities/emergency-os-settings.entity';

// Regression coverage for HEAL-019: EmergencySettingsService used to be entirely
// in-memory (a bare Map), so a hospital's tuned safety thresholds (reassessment
// intervals, capacity warnings, EMS offload targets) silently reverted to
// hardcoded defaults on every backend restart. Verifies the fix actually
// persists and reads back real settings overrides.

describe('EmergencySettingsService persistence', () => {
  let service: EmergencySettingsService;
  const savedRows: Record<string, unknown>[] = [];

  const repository = {
    create: jest.fn((row) => row),
    save: jest.fn((row) => {
      savedRows.push(row);
      return Promise.resolve(row);
    }),
    find: jest.fn(() => Promise.resolve([])),
  };

  beforeEach(async () => {
    savedRows.length = 0;
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencySettingsService,
        { provide: getRepositoryToken(EmergencyOsSettingsEntity), useValue: repository },
      ],
    }).compile();

    service = module.get<EmergencySettingsService>(EmergencySettingsService);
  });

  it('persists an updateSettings() call to the repository, not only an in-memory map', () => {
    service.updateSettings({ tenantName: 'Riverside General' }, 'org-1');

    expect(repository.create).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(savedRows[0]).toEqual(expect.objectContaining({ organizationId: 'org-1' }));
    const persisted = JSON.parse(String((savedRows[0] as { settingsJson: string }).settingsJson));
    expect(persisted.tenantName).toBe('Riverside General');
  });

  it('falls back to the "__global__" key when no organizationId is supplied', () => {
    service.updateSettings({ tenantName: 'Fallback Hospital' });

    expect(savedRows[0]).toEqual(expect.objectContaining({ organizationId: '__global__' }));
  });

  it('rehydrates a tuned reassessment threshold from the repository on module init, surviving a restart', async () => {
    const persistedSettings = {
      reassessmentThresholds: { P1: 5, P2: 10, P3: 20, P4: 30, P5: 40, overdueGraceMinutes: 3 },
    };

    const rehydrateRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          { organizationId: 'org-2', settingsJson: JSON.stringify(persistedSettings) },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencySettingsService,
        { provide: getRepositoryToken(EmergencyOsSettingsEntity), useValue: rehydrateRepository },
      ],
    }).compile();

    const rehydratedService = module.get<EmergencySettingsService>(EmergencySettingsService);
    await rehydratedService.onModuleInit();

    const result = rehydratedService.getSettings('org-2');
    expect(result.data.reassessmentThresholds.P1).toBe(5);
    expect(result.data.reassessmentThresholds.overdueGraceMinutes).toBe(3);
    // Fields never overridden still fall back to today's defaults, not undefined --
    // proves rehydration merges onto current defaults rather than replacing wholesale.
    expect(result.data.tenantName).toBeTruthy();
  });

  it("does not affect a different organization's settings (per-tenant isolation)", async () => {
    const rehydrateRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([
          {
            organizationId: 'org-3',
            settingsJson: JSON.stringify({ tenantName: 'Org Three Hospital' }),
          },
        ]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencySettingsService,
        { provide: getRepositoryToken(EmergencyOsSettingsEntity), useValue: rehydrateRepository },
      ],
    }).compile();

    const rehydratedService = module.get<EmergencySettingsService>(EmergencySettingsService);
    await rehydratedService.onModuleInit();

    const otherOrgResult = rehydratedService.getSettings('org-4');
    expect(otherOrgResult.data.tenantName).not.toBe('Org Three Hospital');
  });

  it('does not throw when no repository is available (graceful degradation, matching ReferralService/EMSIntakeService)', async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmergencySettingsService],
    }).compile();

    const bareService = module.get<EmergencySettingsService>(EmergencySettingsService);
    expect(() => bareService.updateSettings({ tenantName: 'No DB Hospital' })).not.toThrow();
    await expect(bareService.onModuleInit()).resolves.not.toThrow();
  });

  it('warns but does not throw when a persisted settings row has malformed JSON', async () => {
    const malformedRepository = {
      create: jest.fn((row) => row),
      save: jest.fn((row) => Promise.resolve(row)),
      find: jest.fn(() =>
        Promise.resolve([{ organizationId: 'org-5', settingsJson: '{not valid json' }]),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmergencySettingsService,
        { provide: getRepositoryToken(EmergencyOsSettingsEntity), useValue: malformedRepository },
      ],
    }).compile();

    const rehydratedService = module.get<EmergencySettingsService>(EmergencySettingsService);
    await expect(rehydratedService.onModuleInit()).resolves.not.toThrow();
    // Falls back to defaults for that organization rather than crashing the whole boot.
    const result = rehydratedService.getSettings('org-5');
    expect(result.data.tenantName).toBeTruthy();
  });
});
