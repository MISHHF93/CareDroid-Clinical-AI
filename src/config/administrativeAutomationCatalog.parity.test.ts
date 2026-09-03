import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AUTOMATION_ENTITLEMENT_ASSET_MAP } from './automationEntitlement.config';
import {
  ADMINISTRATIVE_AUTOMATION_CATEGORIES,
  ADMIN_AUTOMATION_ENTITLEMENT_ASSET_MAP,
  CATEGORY_AUTOMATION_IDS,
} from './administrativeAutomationCatalog';

describe('administrativeAutomationCatalog parity', () => {
  it('maps every automation category to a platform automation id', () => {
    for (const category of ADMINISTRATIVE_AUTOMATION_CATEGORIES) {
      expect(
        CATEGORY_AUTOMATION_IDS[category],
        `missing automation id for ${category}`,
      ).toBeTruthy();
    }
  });

  it('maps every category automation id to an entitlement asset', () => {
    for (const automationId of Object.values(CATEGORY_AUTOMATION_IDS)) {
      expect(
        AUTOMATION_ENTITLEMENT_ASSET_MAP[automationId] ||
          ADMIN_AUTOMATION_ENTITLEMENT_ASSET_MAP[automationId],
        `missing entitlement asset for automation id ${automationId}`,
      ).toBeTruthy();
    }
  });

  it('keeps backend orchestration category automation ids aligned', () => {
    const backendSource = readFileSync(
      path.join(
        process.cwd(),
        'backend/src/modules/emergency-os/administrative-automation-orchestration.lib.ts',
      ),
      'utf8',
    );

    for (const [category, automationId] of Object.entries(CATEGORY_AUTOMATION_IDS)) {
      expect(
        backendSource.includes(`category: '${category}'`) ||
          backendSource.includes(`'${category}'`),
        `backend snapshot should reference category ${category}`,
      ).toBe(true);
      expect(
        backendSource.includes(automationId) ||
          backendSource.includes('administrativeAutomationCatalog'),
        `backend should use automation id ${automationId} via shared catalog`,
      ).toBe(true);
    }
  });
});
