import { describe, expect, it } from 'vitest';
import {
  TARGET_FEATURE_MODULE_CONTRACTS,
  TARGET_FEATURE_MODULE_CONTRACTS_BY_ID,
  TARGET_FEATURE_MODULE_IDS,
  getFeatureModuleContract,
  isFeatureModuleId,
} from './featureModuleContract';

const FEATURE_INDEX_FILES = Object.freeze(
  Object.keys(import.meta.glob('./*/index.ts')).map((path) =>
    path.replace(/^\.\//, 'src/features/'),
  ),
);

describe('featureModuleContract', () => {
  it('tracks the target module list from the full-score plan', () => {
    expect(TARGET_FEATURE_MODULE_IDS).toEqual([
      'reception',
      'triage',
      'whiteboard',
      'waiting-room',
      'ems',
      'command',
      'copilot',
      'tools',
      'calculators',
      'shift',
      'admin',
      'platform',
      'team',
      'settings',
      'auth',
    ]);
  });

  it('keeps one complete contract per target module', () => {
    const ids = TARGET_FEATURE_MODULE_CONTRACTS.map((contract) => contract.id);

    expect(ids).toHaveLength(TARGET_FEATURE_MODULE_IDS.length);
    expect(new Set(ids).size).toBe(ids.length);

    for (const id of TARGET_FEATURE_MODULE_IDS) {
      const contract = getFeatureModuleContract(id);

      expect(contract.id).toBe(id);
      expect(contract.label).toBeTruthy();
      expect(contract.primaryRoute).toMatch(/^\//);
      expect(contract.sourceDirectory).toBe(`src/features/${id}`);
      expect(FEATURE_INDEX_FILES).toContain(`${contract.sourceDirectory}/index.ts`);
      expect(contract.pageFamilies.length).toBeGreaterThan(0);
      expect(contract.backendCapabilities.length).toBeGreaterThan(0);
      expect(contract.notes).toBeTruthy();
      expect(TARGET_FEATURE_MODULE_CONTRACTS_BY_ID[id]).toBe(contract);
      expect(isFeatureModuleId(id)).toBe(true);
    }
  });

  it('marks legacy compatibility modules before physical migration', () => {
    expect(getFeatureModuleContract('ems')).toMatchObject({
      status: 'compatibility',
      legacyDirectories: ['src/features/ems-module'],
    });
    expect(getFeatureModuleContract('triage')).toMatchObject({
      status: 'compatibility',
      legacyDirectories: ['src/features/triage-queue'],
    });
  });
});
