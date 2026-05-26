import { describe, expect, it } from 'vitest';
import {
  PLATFORM_EXECUTOR_STATUS,
  PLATFORM_SYSTEM_CAPABILITIES,
  PLATFORM_SYSTEM_PACKS,
  getPlatformSystemCapabilityByPath,
} from './platformSystems';
import { getMedicalToolsCatalogRows } from './medicalToolsCatalogIndex';
import { resolveToolInventoryRecord } from './toolInventory';

const EXPECTED_PACK_COUNTS = Object.freeze({
  [PLATFORM_SYSTEM_PACKS.INTEROPERABILITY]: 7,
  [PLATFORM_SYSTEM_PACKS.AI_WORKFLOW]: 6,
  [PLATFORM_SYSTEM_PACKS.PATIENT_WORKSPACE]: 6,
  [PLATFORM_SYSTEM_PACKS.DOCUMENTATION]: 6,
  [PLATFORM_SYSTEM_PACKS.GOVERNANCE]: 24,
});

describe('platform systems expansion plan metadata', () => {
  it('defines canonical IDs across all five platform packs', () => {
    const ids = PLATFORM_SYSTEM_CAPABILITIES.map((capability) => capability.id);
    expect(ids).toHaveLength(49);
    expect(new Set(ids).size).toBe(ids.length);

    for (const [pack, count] of Object.entries(EXPECTED_PACK_COUNTS)) {
      expect(PLATFORM_SYSTEM_CAPABILITIES.filter((capability) => capability.pack === pack)).toHaveLength(
        count
      );
    }
  });

  it('classifies each capability with launch metadata and backend contract shape', () => {
    for (const capability of PLATFORM_SYSTEM_CAPABILITIES) {
      expect(capability.id).toMatch(/^[a-z0-9-]+$/);
      expect(capability.name).toBeTruthy();
      expect(capability.tier).toMatch(/^(A|B|C|A\/C|B\/C)$/);
      expect(capability.route).toMatch(/^\//);
      expect(capability.endpoint).toMatch(/^\/api\//);
      expect(capability.apiClient).toBeTruthy();
      expect(capability.requestDto).toBeTruthy();
      expect(capability.responseDto).toBeTruthy();
      expect(capability.permissionPolicy?.permissions?.length).toBeGreaterThan(0);
      expect(capability.safetyCopy).toMatch(/Human review|Decision support/i);
      expect(capability.criticality).toMatch(/^P[0-3]$/);
      expect(capability.implementationPhase).toMatch(/^Phase \d+$/);
      expect(typeof capability.requiresHumanReview).toBe('boolean');
      expect(typeof capability.requiresConsent).toBe('boolean');
      expect(typeof capability.regulatoryClassificationRequired).toBe('boolean');
      expect(capability.auditEvents.length).toBeGreaterThan(0);
      expect(capability.dashboardPlacement.length).toBeGreaterThan(0);
    }
  });

  it('marks the production-blocking blind spots as P0 capabilities', () => {
    const p0Ids = PLATFORM_SYSTEM_CAPABILITIES.filter(
      (capability) => capability.criticality === 'P0'
    ).map((capability) => capability.id);

    expect(p0Ids).toEqual(
      expect.arrayContaining([
        'clinical-governance',
        'ai-security',
        'regulatory-classification',
        'equity-monitoring',
        'validation-sandbox',
        'human-review-queue',
        'consent-center',
        'privacy-center',
        'audit-trail-spine',
        'deployment-observability',
        'source-provenance',
      ])
    );
  });

  it('keeps platform systems out of false orchestrator executor advertising', () => {
    for (const capability of PLATFORM_SYSTEM_CAPABILITIES) {
      expect(capability.executorStatus).toBe(PLATFORM_EXECUTOR_STATUS.PLATFORM);
      expect(capability.endpoint).not.toMatch(/^\/api\/tools\/.+\/execute$/);
    }
  });

  it('wires every platform capability into inventory and catalog discovery', () => {
    const catalogRows = getMedicalToolsCatalogRows();
    const catalogIds = new Set(catalogRows.map((row) => row.primaryId));

    for (const capability of PLATFORM_SYSTEM_CAPABILITIES) {
      const inventoryRecord = resolveToolInventoryRecord(capability.id);
      expect(inventoryRecord).toBeTruthy();
      expect(inventoryRecord.route || capability.route).toBeTruthy();
      expect(inventoryRecord.endpoint || capability.endpoint).toBeTruthy();
      expect(inventoryRecord.executorStatus).not.toBe('registered');
      expect(catalogIds.has(capability.id)).toBe(true);
    }
  });

  it('resolves both exact and patient-scoped routes back to capabilities', () => {
    expect(getPlatformSystemCapabilityByPath('/integrations/fhir')?.id).toBe('fhir-connector');
    expect(getPlatformSystemCapabilityByPath('/patients/demo-123/workspace')?.id).toBe(
      'patient-workspace'
    );
    expect(getPlatformSystemCapabilityByPath('/patients/demo-123/labs/import')?.id).toBe(
      'lab-result-import'
    );
    expect(getPlatformSystemCapabilityByPath('/review/clinical')?.id).toBe('human-review-queue');
    expect(getPlatformSystemCapabilityByPath('/ai-governance')?.id).toBe('clinical-governance');
    expect(getPlatformSystemCapabilityByPath('/security')?.id).toBe('ai-security');
    expect(getPlatformSystemCapabilityByPath('/human-review')?.id).toBe('human-review-queue');
    expect(getPlatformSystemCapabilityByPath('/system-health')?.id).toBe('deployment-observability');
    expect(getPlatformSystemCapabilityByPath('/operations/observability')?.id).toBe(
      'deployment-observability'
    );
  });
});

