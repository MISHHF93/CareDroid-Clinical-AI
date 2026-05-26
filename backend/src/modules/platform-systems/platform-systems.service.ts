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
    return {
      capabilityId: capability.id,
      pack: capability.pack,
      tier: capability.tier,
      route: capability.route,
      endpoint: capability.endpoint,
      status: 'demo_available',
      contractVersion: CONTRACT_VERSION,
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
