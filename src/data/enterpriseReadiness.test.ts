import { describe, expect, it } from 'vitest';
import {
  ENTERPRISE_READINESS_DIMENSIONS,
  buildEnterpriseReadinessModel,
} from './enterpriseReadiness';

describe('enterpriseReadiness', () => {
  it('tracks all required enterprise readiness dimensions', () => {
    expect(ENTERPRISE_READINESS_DIMENSIONS.map((dimension) => dimension.id)).toEqual([
      'sso',
      'rbac',
      'tenant-isolation',
      'audit',
      'governance',
      'integration',
      'security',
    ]);
  });

  it('generates a weighted readiness score with dimension statuses', () => {
    const model = buildEnterpriseReadinessModel({
      tenantContext: {
        organizationId: 'org-1',
        workspaceId: 'workspace-1',
        role: 'admin',
      },
      platformContext: {
        organization: { id: 'org-1' },
        roleProfile: { id: 'clinical-admin' },
        audit: { status: 'ready', retentionDays: 365 },
        governance: { releaseGates: true, humanReview: true },
        security: { mfaRequired: true, aiSecurityReview: true },
      },
      integrations: [
        { slug: 'identity-sso', status: 'enabled' },
        { slug: 'fhir', status: 'enabled' },
      ],
    });

    expect(model.readinessScore).toBeGreaterThanOrEqual(85);
    expect(model.status).toBe('Ready');
    expect(model.dimensions.every((dimension) => typeof dimension.score === 'number')).toBe(true);
  });
});
