import { describe, expect, it } from 'vitest';
import { TARGET_FEATURE_MODULE_IDS } from '../features/featureModuleContract';
import {
  PAGE_DISPOSITION_FIXTURES,
  PAGE_INVENTORY_EXPECTED_TOTAL,
  PAGE_SOURCE_EXPECTED_TOTAL,
  PAGE_STYLE_EXPECTED_TOTAL,
  PAGE_TOOLS_INVENTORY_EXPECTED_TOTAL,
  PAGE_TOOLS_SOURCE_EXPECTED_TOTAL,
  getPageDispositionGaps,
  getPageInventorySummary,
} from './pageDispositionFixture';

describe('pageDispositionFixture', () => {
  it('keeps the generated page inventory counts explicit', () => {
    const summary = getPageInventorySummary();

    expect(summary.total).toBe(PAGE_INVENTORY_EXPECTED_TOTAL);
    expect(summary.sourceFiles).toBe(PAGE_SOURCE_EXPECTED_TOTAL);
    expect(summary.styleFiles).toBe(PAGE_STYLE_EXPECTED_TOTAL);
    expect(summary.toolsInventoryFiles).toBe(PAGE_TOOLS_INVENTORY_EXPECTED_TOTAL);
    expect(summary.toolsSourceFiles).toBe(PAGE_TOOLS_SOURCE_EXPECTED_TOTAL);
  });

  it('assigns every page inventory file to a target feature module and disposition', () => {
    expect(getPageDispositionGaps()).toEqual([]);

    const targetIds = new Set(TARGET_FEATURE_MODULE_IDS);
    const sourceFiles = new Set(PAGE_DISPOSITION_FIXTURES.map((fixture) => fixture.sourceFile));

    expect(sourceFiles.size).toBe(PAGE_DISPOSITION_FIXTURES.length);
    for (const fixture of PAGE_DISPOSITION_FIXTURES) {
      expect(fixture.path, fixture.sourceFile).toMatch(/^\//);
      expect(fixture.sourceFile).toMatch(/^src\/pages\//);
      expect(targetIds.has(fixture.ownerModule), fixture.sourceFile).toBe(true);
      expect(fixture.roles.length, fixture.sourceFile).toBeGreaterThan(0);
      expect(fixture.backendCapabilities.length, fixture.sourceFile).toBeGreaterThan(0);
      expect(fixture.testIds.length, fixture.sourceFile).toBeGreaterThan(0);
    }
  });

  it('keeps tool and calculator pages distinct for the module migration', () => {
    const tools = PAGE_DISPOSITION_FIXTURES.filter((fixture) => fixture.ownerModule === 'tools');
    const calculators = PAGE_DISPOSITION_FIXTURES.filter(
      (fixture) => fixture.ownerModule === 'calculators',
    );

    expect(tools.length).toBeGreaterThan(0);
    expect(calculators.length).toBeGreaterThan(0);
    expect([...tools, ...calculators].every((fixture) => fixture.sourceFile.startsWith('src/pages/tools/'))).toBe(
      false,
    );
    expect(
      PAGE_DISPOSITION_FIXTURES.filter((fixture) => fixture.sourceFile.startsWith('src/pages/tools/')).every(
        (fixture) => fixture.disposition === 'tool-compatibility' || fixture.fileRole !== 'route-source',
      ),
    ).toBe(true);
  });
});
