import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  PlatformCapabilityContractDto,
  PlatformDemoResultDto,
  PlatformSafetyDto,
  SourceProvenanceDto,
} from './dto/platform-system.dto';

interface PlatformCapabilityDefinition {
  id: string;
  name: string;
  pack: string;
  tier: string;
  route: string;
  endpoint: string;
}

const CONTRACT_VERSION = 'platform-systems.v1';
const PLATFORM_API_CLIENT = 'platformGovernanceApi';

const P0_CAPABILITY_IDS = new Set([
  'source-provenance',
  'clinical-governance',
  'clinical-release-gates',
  'clinical-safety-findings',
  'ai-security',
  'prompt-firewall',
  'model-access-policy',
  'regulatory-classification',
  'intended-use-registry',
  'equity-monitoring',
  'bias-finding-review',
  'validation-sandbox',
  'synthetic-patient-lab',
  'human-review-queue',
  'consent-center',
  'privacy-center',
  'audit-trail-spine',
  'ai-run-audit-timeline',
  'deployment-observability',
  'operations-incident-center',
]);

const GOVERNANCE_AUDIT_EVENTS = [
  'governance.policy.created',
  'governance.policy.approved',
  'review.item.created',
  'review.item.decided',
];

const SECURITY_AUDIT_EVENTS = [
  'ai.security.blocked',
  'ai.security.redacted',
  'review.item.created',
];

const INTEROPERABILITY_AUDIT_EVENTS = [
  'interoperability.import.previewed',
  'interoperability.import.committed',
];

const PRIVACY_AUDIT_EVENTS = ['consent.changed', 'privacy.request.created'];
const AUDIT_SPINE_EVENTS = ['audit.integrity.checked'];
const OPERATIONS_AUDIT_EVENTS = ['deployment.version.activated', 'operations.incident.opened'];

function permissionPolicyFor(capability: PlatformCapabilityDefinition): string[] {
  const { id, endpoint, route } = capability;
  if (endpoint.includes('/audit/patients')) return ['VIEW_PHI_AUDIT'];
  if (endpoint.includes('/audit')) return ['VIEW_AUDIT_LOGS'];
  if (endpoint.includes('/privacy')) return ['VIEW_PRIVACY_CENTER'];
  if (endpoint.includes('/consent')) return ['MANAGE_CONSENT'];
  if (endpoint.includes('/operations/incidents')) return ['MANAGE_INCIDENTS'];
  if (endpoint.includes('/operations')) return ['VIEW_OPERATIONS', 'VIEW_OBSERVABILITY'];
  if (endpoint.includes('/review')) return ['VIEW_REVIEW_QUEUE'];
  if (endpoint.includes('/integrations') || endpoint.includes('/source-provenance')) {
    return ['VIEW_INTEGRATIONS'];
  }
  if (route.includes('/patients/')) return ['READ_PHI'];
  if (id.includes('ai-security') || id.includes('prompt-firewall') || id.includes('model-access')) {
    return id === 'ai-security' ? ['VIEW_AI_SECURITY'] : ['MANAGE_AI_SECURITY'];
  }
  if (id.includes('regulatory') || id.includes('intended-use')) return ['VIEW_REGULATORY'];
  if (id.includes('equity')) return ['VIEW_EQUITY_METRICS'];
  if (id.includes('validation') || id.includes('synthetic-patient')) return ['VIEW_VALIDATION'];
  if (id.includes('safety-finding')) return ['REVIEW_SAFETY_FINDINGS'];
  return ['VIEW_GOVERNANCE'];
}

function auditEventsFor(capability: PlatformCapabilityDefinition): string[] {
  const { id, endpoint } = capability;
  if (id.includes('ai-security') || id.includes('prompt-firewall') || id.includes('model-access')) {
    return SECURITY_AUDIT_EVENTS;
  }
  if (endpoint.includes('/integrations') || endpoint.includes('/source-provenance')) {
    return INTEROPERABILITY_AUDIT_EVENTS;
  }
  if (endpoint.includes('/privacy') || endpoint.includes('/consent')) return PRIVACY_AUDIT_EVENTS;
  if (endpoint.includes('/audit')) return AUDIT_SPINE_EVENTS;
  if (endpoint.includes('/operations')) return OPERATIONS_AUDIT_EVENTS;
  return GOVERNANCE_AUDIT_EVENTS;
}

function dashboardPlacementFor(capability: PlatformCapabilityDefinition): string[] {
  if (capability.endpoint.includes('/operations'))
    return ['/dashboard', '/operations/observability'];
  if (capability.endpoint.includes('/audit')) return ['/dashboard', '/audit'];
  if (capability.endpoint.includes('/review')) return ['/dashboard', '/review'];
  if (capability.endpoint.includes('/privacy') || capability.endpoint.includes('/consent')) {
    return ['/dashboard', '/privacy', '/consent'];
  }
  if (
    capability.endpoint.includes('/integrations') ||
    capability.endpoint.includes('/source-provenance')
  ) {
    return ['/integrations', '/tools/catalog'];
  }
  return ['/dashboard', '/governance'];
}

function riskLevelFor(
  capability: PlatformCapabilityDefinition,
): PlatformCapabilityContractDto['riskLevel'] {
  if (P0_CAPABILITY_IDS.has(capability.id)) return 'critical';
  if (capability.pack === 'AI Workflow' || capability.pack === 'Documentation') return 'high';
  if (capability.route.includes('/patients/')) return 'high';
  return 'moderate';
}

const PLATFORM_CAPABILITIES: PlatformCapabilityDefinition[] = [
  [
    'fhir-connector',
    'FHIR Connector',
    'Interoperability',
    'C',
    '/integrations/fhir',
    '/api/integrations/fhir/connections',
  ],
  [
    'hl7-bridge',
    'HL7 Bridge',
    'Interoperability',
    'C',
    '/integrations/hl7',
    '/api/integrations/hl7/interfaces',
  ],
  [
    'ehr-patient-import',
    'EHR Patient Import',
    'Interoperability',
    'A',
    '/patients/import',
    '/api/patients/import/ehr',
  ],
  [
    'lab-result-import',
    'Lab Result Import',
    'Interoperability',
    'A',
    '/patients/:patientId/labs/import',
    '/api/patients/:patientId/import/labs',
  ],
  [
    'medication-list-import',
    'Medication List Import',
    'Interoperability',
    'A',
    '/patients/:patientId/medications/import',
    '/api/patients/:patientId/import/medications',
  ],
  [
    'observation-vitals-import',
    'Observation And Vitals Import',
    'Interoperability',
    'A',
    '/patients/:patientId/observations/import',
    '/api/patients/:patientId/import/observations',
  ],
  [
    'source-provenance',
    'Source Provenance',
    'Interoperability',
    'C',
    '/integrations/source-provenance',
    '/api/source-provenance/:sourceId',
  ],
  [
    'calculator-recommender-ai',
    'Calculator Recommender AI',
    'AI Workflow',
    'B',
    '/tools/calculator-recommender',
    '/api/clinical-intelligence/calculator-recommender/suggest',
  ],
  [
    'workflow-builder-ai',
    'Workflow Builder AI',
    'AI Workflow',
    'B',
    '/tools/workflow-builder-ai',
    '/api/clinical-intelligence/workflow-builder/generate',
  ],
  [
    'clinical-reasoning-engine',
    'Clinical Reasoning Engine',
    'AI Workflow',
    'B',
    '/tools/clinical-reasoning-engine',
    '/api/clinical-intelligence/reasoning/analyze',
  ],
  [
    'guideline-rag',
    'Guideline RAG',
    'AI Workflow',
    'C',
    '/tools/guideline-rag',
    '/api/clinical-intelligence/guideline-rag/query',
  ],
  [
    'why-engine',
    'Why Engine',
    'AI Workflow',
    'B',
    '/tools/why-engine',
    '/api/clinical-intelligence/why-engine/explain',
  ],
  [
    'audit-trail-ai',
    'Audit Trail AI',
    'AI Workflow',
    'C',
    '/tools/audit-trail-ai',
    '/api/clinical-intelligence/audit-trail/summarize',
  ],
  [
    'patient-workspace',
    'Patient Workspace',
    'Patient Workspace',
    'C',
    '/patients/:patientId/workspace',
    '/api/patients/:patientId/workspace',
  ],
  [
    'patient-summary-ai',
    'Patient Summary AI',
    'Patient Workspace',
    'B/C',
    '/patients/:patientId/summary',
    '/api/clinical-intelligence/patient-summary-ai/generate',
  ],
  [
    'timeline-live',
    'Timeline Live',
    'Patient Workspace',
    'C',
    '/patients/:patientId/timeline',
    '/api/patients/:patientId/timeline',
  ],
  [
    'clinical-event-ai',
    'Clinical Event AI',
    'Patient Workspace',
    'B',
    '/patients/:patientId/events',
    '/api/clinical-intelligence/clinical-event-ai/draft',
  ],
  [
    'risk-score-history',
    'Risk Score History',
    'Patient Workspace',
    'A/C',
    '/patients/:patientId/risk-history',
    '/api/patients/:patientId/risk-scores',
  ],
  [
    'care-plan-view',
    'Care Plan View',
    'Patient Workspace',
    'C',
    '/patients/:patientId/care-plan',
    '/api/patients/:patientId/care-plan',
  ],
  [
    'soap-builder',
    'SOAP Builder',
    'Documentation',
    'B',
    '/tools/soap-builder',
    '/api/documentation/soap/draft',
  ],
  [
    'ambient-scribe',
    'Ambient Scribe',
    'Documentation',
    'B/C',
    '/tools/ambient-scribe',
    '/api/clinical-intelligence/ambient-scribe/generate',
  ],
  [
    'clinical-dictation',
    'Clinical Dictation',
    'Documentation',
    'B',
    '/tools/clinical-dictation',
    '/api/documentation/dictation/transcribe',
  ],
  [
    'discharge-summary-ai',
    'Discharge Summary AI',
    'Documentation',
    'B',
    '/tools/discharge-summary-ai',
    '/api/documentation/discharge-summary/draft',
  ],
  [
    'referral-ai',
    'Referral AI',
    'Documentation',
    'B',
    '/tools/referral-ai',
    '/api/documentation/referral/draft',
  ],
  [
    'prior-auth-ai',
    'Prior Authorization AI',
    'Documentation',
    'B/C',
    '/tools/prior-auth-ai',
    '/api/documentation/prior-auth/draft',
  ],
  [
    'ai-governance',
    'AI Governance',
    'Governance',
    'C',
    '/governance/ai',
    '/api/governance/ai/policies',
  ],
  [
    'clinical-governance',
    'Clinical Governance',
    'Governance',
    'C',
    '/governance/clinical',
    '/api/governance/clinical/readiness',
  ],
  [
    'clinical-release-gates',
    'Clinical Release Gates',
    'Governance',
    'C',
    '/governance/clinical/release-gates',
    '/api/governance/clinical/release-gates',
  ],
  [
    'clinical-safety-findings',
    'Clinical Safety Findings',
    'Governance',
    'C',
    '/governance/clinical/safety-findings',
    '/api/governance/clinical/safety-findings',
  ],
  [
    'ai-security',
    'AI Security',
    'Governance',
    'C',
    '/governance/ai-security',
    '/api/governance/ai-security/summary',
  ],
  [
    'prompt-firewall',
    'Prompt Firewall',
    'Governance',
    'C',
    '/governance/ai-security/prompt-firewall',
    '/api/governance/ai-security/rules',
  ],
  [
    'model-access-policy',
    'Model Access Policy',
    'Governance',
    'C',
    '/governance/ai-security/model-access',
    '/api/governance/ai-security/model-access',
  ],
  [
    'model-usage-dashboard',
    'Model Usage Dashboard',
    'Governance',
    'C',
    '/governance/model-usage',
    '/api/governance/model-usage/summary',
  ],
  [
    'cost-optimization-control-plane',
    'Cost Optimization Control Plane',
    'Governance',
    'C',
    '/governance/costs',
    '/api/governance/costs/summary',
  ],
  [
    'clinical-safety-audit',
    'Clinical Safety Audit',
    'Governance',
    'C',
    '/governance/clinical-safety',
    '/api/governance/clinical-safety/findings',
  ],
  [
    'consent-manager',
    'Consent Manager',
    'Governance',
    'C',
    '/governance/consent',
    '/api/consent/:patientId',
  ],
  [
    'privacy-center',
    'Privacy Center',
    'Governance',
    'C',
    '/governance/privacy',
    '/api/privacy/access-log',
  ],
  [
    'regulatory-classification',
    'Regulatory Classification',
    'Governance',
    'C',
    '/governance/regulatory',
    '/api/governance/regulatory/capabilities',
  ],
  [
    'intended-use-registry',
    'Intended Use Registry',
    'Governance',
    'C',
    '/governance/regulatory/intended-use',
    '/api/governance/regulatory/capabilities',
  ],
  [
    'equity-monitoring',
    'Equity Monitoring',
    'Governance',
    'C',
    '/governance/equity',
    '/api/governance/equity/summary',
  ],
  [
    'bias-finding-review',
    'Bias Finding Review',
    'Governance',
    'C',
    '/governance/equity/findings',
    '/api/governance/equity/findings',
  ],
  [
    'validation-sandbox',
    'Validation Sandbox',
    'Governance',
    'C',
    '/governance/validation',
    '/api/governance/validation/scenarios',
  ],
  [
    'synthetic-patient-lab',
    'Synthetic Patient Lab',
    'Governance',
    'C',
    '/governance/validation/synthetic-patients',
    '/api/governance/validation/synthetic-patients',
  ],
  ['human-review-queue', 'Human Review Queue', 'Governance', 'C', '/review', '/api/review/items'],
  [
    'consent-center',
    'Consent Center',
    'Governance',
    'C',
    '/patients/:patientId/consent',
    '/api/consent/:patientId',
  ],
  ['audit-trail-spine', 'Audit Trail Spine', 'Governance', 'C', '/audit', '/api/audit/events'],
  [
    'ai-run-audit-timeline',
    'AI Run Audit Timeline',
    'Governance',
    'C',
    '/audit/ai',
    '/api/audit/runs/:runId',
  ],
  [
    'deployment-observability',
    'Deployment Observability',
    'Governance',
    'C',
    '/operations/observability',
    '/api/operations/observability/summary',
  ],
  [
    'operations-incident-center',
    'Operations Incident Center',
    'Governance',
    'C',
    '/operations/incidents',
    '/api/operations/incidents',
  ],
].map(([id, name, pack, tier, route, endpoint]) => ({ id, name, pack, tier, route, endpoint }));

@Injectable()
export class PlatformSystemsService {
  getCapability(capabilityId: string): PlatformCapabilityContractDto {
    const capability = this.findCapability(capabilityId);
    return this.contractFor(capability);
  }

  getPack(pack: string) {
    const normalized = decodeURIComponent(pack).toLowerCase();
    const capabilities =
      normalized === 'all'
        ? PLATFORM_CAPABILITIES
        : PLATFORM_CAPABILITIES.filter(
            (capability) => capability.pack.toLowerCase() === normalized,
          );
    return {
      pack,
      contractVersion: CONTRACT_VERSION,
      status: capabilities.length ? 'demo_available' : 'unsupported_until_configured',
      capabilities: capabilities.map((capability) => this.contractFor(capability)),
      safety: this.safety(),
    };
  }

  getProductionReadiness() {
    const p0Capabilities = PLATFORM_CAPABILITIES.filter((capability) =>
      P0_CAPABILITY_IDS.has(capability.id),
    );
    return {
      ...this.demo('clinical-governance'),
      status: 'unsupported_until_configured',
      data: {
        criticality: 'P0',
        readiness: 'blocked_until_governance_controls_are_configured',
        autonomousActionTaken: false,
        blockers: [
          'clinical_governance_policy_required',
          'llm_security_policy_required',
          'regulatory_classification_required',
          'human_review_queue_required',
          'consent_privacy_controls_required',
          'audit_trail_spine_required',
          'deployment_observability_required',
          'validation_sandbox_required',
        ],
        p0Capabilities: p0Capabilities.map((capability) => ({
          capabilityId: capability.id,
          name: capability.name,
          route: capability.route,
          endpoint: capability.endpoint,
          status: 'demo_available',
          autonomousActionTaken: false,
          reviewRequired: true,
        })),
      },
    };
  }

  getSourceProvenance(sourceId = 'demo-source') {
    return {
      ...this.demo('source-provenance', sourceId),
      data: {
        sourceId,
        sourceSystem: 'CareDroid synthetic FHIR/HL7 source',
        sourceType: 'demo',
        freshness: 'demo',
        normalized: true,
        writebackAllowed: false,
      },
    };
  }

  getReviewItems() {
    return {
      ...this.demo('human-review-queue'),
      data: {
        items: [
          {
            id: 'review-demo-ai-draft',
            reviewType: 'clinical_ai',
            severity: 'high',
            status: 'needs_review',
            capabilityId: 'clinical-governance',
            dueAt: null,
          },
        ],
        autonomousActionTaken: false,
      },
    };
  }

  getAuditRunTimeline(runId = 'demo-run') {
    return {
      ...this.demo('ai-run-audit-timeline', runId),
      data: {
        runId,
        timeline: [
          { eventType: 'ai.run.accepted', status: 'demo', phiAccessed: false },
          { eventType: 'ai.security.checked', status: 'demo', blocked: false },
          { eventType: 'ai.response.composed', status: 'demo_review_required' },
        ],
        integrityVerified: true,
      },
    };
  }

  getAuditIntegrityStatus() {
    return {
      ...this.demo('audit-trail-spine'),
      data: {
        status: 'demo_verified',
        lastCheckedAt: new Date().toISOString(),
        gapCount: 0,
        exportReady: false,
      },
    };
  }

  getOperationsHealth() {
    return {
      ...this.demo('deployment-observability'),
      data: {
        status: 'demo_degraded_until_configured',
        services: [
          { service: 'api', status: 'demo_available' },
          { service: 'ai-gateway', status: 'demo_available' },
          { service: 'audit', status: 'demo_available' },
          { service: 'review-queue', status: 'unsupported_until_configured' },
        ],
      },
    };
  }

  getObservabilitySummary() {
    return {
      ...this.demo('deployment-observability'),
      data: {
        aiRuns: { total: 0, safetyBlocks: 0, reviewRequired: 0 },
        deployments: { currentVersion: 'demo', rollbackReady: false },
        incidents: { open: 0, critical: 0 },
        degradedMode: true,
      },
    };
  }

  getFhirConnections() {
    return {
      ...this.demo('fhir-connector'),
      data: {
        connections: [
          {
            id: 'demo-fhir',
            baseUrl: 'https://demo.fhir.caredroid.local/R4',
            smartScopes: ['patient/*.read', 'launch/patient'],
            status: 'demo_unconfigured',
            lastSyncAt: null,
          },
        ],
      },
    };
  }

  getHl7Interfaces() {
    return {
      ...this.demo('hl7-bridge'),
      data: {
        interfaces: [
          {
            id: 'demo-adt',
            messageFamilies: ['ADT', 'ORU', 'ORM', 'MDM'],
            queueDepth: 0,
            status: 'demo_listener',
          },
        ],
      },
    };
  }

  getPatientWorkspace(patientId = 'demo-patient') {
    return {
      ...this.demo('patient-workspace', patientId),
      data: {
        patientId,
        demographics: { displayName: 'Demo Patient', mrn: 'DEMO-001', source: 'mock-fhir' },
        activeEncounter: { unit: 'Demo Ward', status: 'in-progress' },
        panels: ['summary', 'timeline', 'risk-score-history', 'care-plan', 'documentation'],
      },
    };
  }

  getTimeline(patientId = 'demo-patient') {
    return {
      ...this.demo('timeline-live', patientId),
      data: {
        patientId,
        events: [
          { type: 'imported-fact', label: 'FHIR Observation bundle received', reviewed: false },
          {
            type: 'tool-output',
            label: 'Risk score ready for attachment after confirmation',
            reviewed: false,
          },
          {
            type: 'ai-draft',
            label: 'Clinical event draft requires clinician review',
            reviewed: false,
          },
        ],
      },
    };
  }

  getRiskScores(patientId = 'demo-patient') {
    return {
      ...this.demo('risk-score-history', patientId),
      data: {
        patientId,
        scores: [
          {
            toolId: 'news2',
            score: 4,
            recordedAt: new Date().toISOString(),
            source: 'demo-calculator',
          },
        ],
      },
    };
  }

  getCarePlan(patientId = 'demo-patient') {
    return {
      ...this.demo('care-plan-view', patientId),
      data: {
        patientId,
        tasks: [
          { title: 'Review imported medications', status: 'needs-review' },
          { title: 'Confirm discharge education tasks', status: 'draft' },
        ],
      },
    };
  }

  demo(
    capabilityId: string,
    patientId = 'demo-patient',
    payload: Record<string, unknown> = {},
  ): PlatformDemoResultDto {
    const capability = this.findCapability(capabilityId);
    return {
      runId: randomUUID(),
      capabilityId,
      contractVersion: CONTRACT_VERSION,
      status: 'demo_review_required',
      reviewRequired: true,
      provenance: this.provenance(capabilityId),
      safety: this.safety(),
      data: {
        patientId,
        capabilityName: capability.name,
        receivedKeys: Object.keys(payload),
        mockTelemetry: true,
        autonomousActionTaken: false,
      },
    };
  }

  private findCapability(capabilityId: string): PlatformCapabilityDefinition {
    const capability = PLATFORM_CAPABILITIES.find((item) => item.id === capabilityId);
    if (!capability) {
      throw new NotFoundException(`Unknown platform capability: ${capabilityId}`);
    }
    return capability;
  }

  private contractFor(capability: PlatformCapabilityDefinition): PlatformCapabilityContractDto {
    const isP0 = P0_CAPABILITY_IDS.has(capability.id);
    return {
      capabilityId: capability.id,
      pack: capability.pack,
      tier: capability.tier,
      route: capability.route,
      endpoint: capability.endpoint,
      sourceKind: 'platform',
      executorStatus: 'platform',
      riskLevel: riskLevelFor(capability),
      permissionPolicy: permissionPolicyFor(capability),
      apiClient: PLATFORM_API_CLIENT,
      auditEvents: auditEventsFor(capability),
      dashboardPlacement: dashboardPlacementFor(capability),
      status: 'demo_available',
      contractVersion: CONTRACT_VERSION,
      criticality: isP0 ? 'P0' : 'P1',
      implementationPhase: isP0 ? 'Phase 1' : 'Phase 2',
      requiresHumanReview: true,
      requiresConsent: ['consent-center', 'privacy-center'].includes(capability.id),
      regulatoryClassificationRequired: isP0,
      provenance: this.provenance(capability.id),
      safety: this.safety(),
    };
  }

  private provenance(sourceResourceId: string): SourceProvenanceDto {
    return {
      sourceSystem: 'CareDroid demo platform systems',
      sourceResourceId,
      observedAt: new Date().toISOString(),
      freshness: 'demo',
      normalized: true,
    };
  }

  private safety(): PlatformSafetyDto {
    return {
      reviewRequired: true,
      demoMode: true,
      blockedActions: [
        'autonomous_clinical_decision',
        'ehr_writeback_without_confirmation',
        'auto_sign_documentation',
        'submit_prior_authorization',
        'policy_change_without_admin_review',
      ],
      warnings: [
        'Demo contract only until real integrations are configured.',
        'Human review and explicit confirmation are required before action.',
        'No autonomous dispatch, clinical decision, documentation filing, export, or writeback is performed.',
      ],
    };
  }
}
