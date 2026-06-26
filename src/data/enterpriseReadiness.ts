export const ENTERPRISE_READINESS_DIMENSIONS = Object.freeze([
  {
    id: 'sso',
    label: 'SSO readiness',
    weight: 12,
    baseScore: 72,
    evidence: 'Enterprise identity supports SAML, OIDC, Azure AD, Okta, and Google Workspace setup.',
    nextStep: 'Confirm identity provider metadata, domain mapping, and role claim strategy.',
  },
  {
    id: 'rbac',
    label: 'RBAC readiness',
    weight: 14,
    baseScore: 78,
    evidence: 'Role-aware permissions and role profiles gate app routes, tools, and administration.',
    nextStep: 'Map buyer personas to organization roles and validate least-privilege access.',
  },
  {
    id: 'tenant-isolation',
    label: 'Tenant isolation',
    weight: 18,
    baseScore: 86,
    evidence: 'Tenant context is required before authenticated app surfaces render customer data.',
    nextStep: 'Review tenant, organization, and workspace context during implementation kickoff.',
  },
  {
    id: 'audit',
    label: 'Audit readiness',
    weight: 14,
    baseScore: 80,
    evidence: 'Audit routes cover PHI, policy, integration, AI, and platform governance activity.',
    nextStep: 'Confirm audit retention, export, and customer compliance review requirements.',
  },
  {
    id: 'governance',
    label: 'Governance readiness',
    weight: 14,
    baseScore: 76,
    evidence: 'Governance workspaces expose policy state, release gates, human review, and safety findings.',
    nextStep: 'Define customer governance owners and clinical policy approval workflow.',
  },
  {
    id: 'integration',
    label: 'Integration readiness',
    weight: 14,
    baseScore: 74,
    evidence: 'Integration readiness tracks interoperability, identity, scheduling, and operational connectors.',
    nextStep: 'Prioritize SSO, FHIR or HL7, and analytics connectors for the sales engineering plan.',
  },
  {
    id: 'security',
    label: 'Security readiness',
    weight: 14,
    baseScore: 82,
    evidence: 'Security surfaces include AI security review, privacy center, regulatory evidence, and access controls.',
    nextStep: 'Prepare security questionnaire evidence and review customer deployment constraints.',
  },
]);

function clampScore(value) {
  const score = Number(value);
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(100, Math.round(score)));
}

function statusForScore(score) {
  if (score >= 85) return 'Ready';
  if (score >= 70) return 'Needs Work';
  return 'At Risk';
}

function dimensionSignalScore(dimension, context: any = {}) {
  const { tenantContext, platformContext, organization, integrations = [] as any[] } = context;
  let score = dimension.baseScore;

  if (dimension.id === 'sso') {
    const ssoIntegrations = integrations.filter((item) =>
      ['sso', 'saml', 'oidc', 'identity'].some((term) =>
        `${item.slug || item.id || item.name || ''}`.toLowerCase().includes(term),
      ),
    );
    if (ssoIntegrations.some((item) => item.status === 'enabled')) score += 18;
    else if (ssoIntegrations.some((item) => item.status === 'requested')) score += 8;
  }

  if (dimension.id === 'rbac') {
    if (tenantContext?.role) score += 8;
    if (platformContext?.roleProfile || platformContext?.roleProfiles?.length) score += 8;
  }

  if (dimension.id === 'tenant-isolation') {
    if (tenantContext?.organizationId || organization?.id || platformContext?.organization?.id) score += 8;
    if (tenantContext?.workspaceId || platformContext?.activeWorkspace?.id) score += 6;
  }

  if (dimension.id === 'audit') {
    if (platformContext?.audit?.status === 'ready') score += 10;
    if (platformContext?.audit?.retentionDays >= 365) score += 6;
  }

  if (dimension.id === 'governance') {
    if (platformContext?.governance?.releaseGates) score += 8;
    if (platformContext?.governance?.humanReview) score += 6;
  }

  if (dimension.id === 'integration') {
    if (integrations.some((item) => item.status === 'enabled')) score += 10;
    if (integrations.length >= 2) score += 6;
  }

  if (dimension.id === 'security') {
    if (platformContext?.security?.mfaRequired) score += 6;
    if (platformContext?.security?.aiSecurityReview) score += 6;
  }

  return clampScore(score);
}

export function buildEnterpriseReadinessModel(context: any = {}) {
  const dimensions = ENTERPRISE_READINESS_DIMENSIONS.map((dimension) => {
    const score = dimensionSignalScore(dimension, context);
    return {
      ...dimension,
      score,
      status: statusForScore(score),
    };
  });

  const totalWeight = dimensions.reduce((sum, dimension) => sum + dimension.weight, 0);
  const readinessScore = clampScore(
    dimensions.reduce((sum, dimension) => sum + dimension.score * dimension.weight, 0) / totalWeight,
  );

  return {
    readinessScore,
    status: statusForScore(readinessScore),
    dimensions,
  };
}
