import { describe, expect, it } from 'vitest';
import {
  auditIntegrationDiscovery,
  buildIntegrationCategorySummaries,
  INTEGRATION_CATEGORY,
  INTEGRATION_POINT_REGISTRY,
  INTEGRATION_STATUS,
  summarizeCategoryStatus,
} from './integrationStatusModel';

describe('integrationStatusModel', () => {
  it('covers all five integration categories', () => {
    const summaries = buildIntegrationCategorySummaries();
    expect(summaries.map((entry) => entry.category)).toEqual(Object.values(INTEGRATION_CATEGORY));
  });

  it('rolls up FHIR and HL7 category status from integration points', () => {
    const summaries = buildIntegrationCategorySummaries();
    const fhir = summaries.find((entry) => entry.category === INTEGRATION_CATEGORY.FHIR);
    const hl7 = summaries.find((entry) => entry.category === INTEGRATION_CATEGORY.HL7);
    expect(fhir?.status).toBe(INTEGRATION_STATUS.PARTIAL);
    // HL7 has hub persistence (partial) alongside placeholder interfaces
    expect(hl7?.status).toBe(INTEGRATION_STATUS.PARTIAL);
    expect(hl7?.counts.placeholder).toBeGreaterThan(0);
  });

  it('audits discovery registry size', () => {
    const audit = auditIntegrationDiscovery();
    expect(audit.passesAudit).toBe(true);
    expect(INTEGRATION_POINT_REGISTRY.length).toBeGreaterThanOrEqual(20);
  });

  it('summarizes category from highest point status', () => {
    expect(
      summarizeCategoryStatus([
        { status: INTEGRATION_STATUS.PLACEHOLDER },
        { status: INTEGRATION_STATUS.IMPLEMENTED },
      ]),
    ).toBe(INTEGRATION_STATUS.PARTIAL);
  });
});
