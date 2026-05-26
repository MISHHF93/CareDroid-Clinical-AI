import { ArtifactRelationship, ArtifactType } from './entities/artifact.entity';

export interface ArtifactSeedRecord {
  id: string;
  type: ArtifactType;
  title: string;
  description: string;
  tags: string[];
  relationships: ArtifactRelationship[];
  version: string;
  createdAt: string;
}

export const DEFAULT_ARTIFACTS: ArtifactSeedRecord[] = [
  {
    id: 'apache-ii-calculator',
    type: ArtifactType.CALCULATOR,
    title: 'APACHE II Calculator',
    description:
      'Critical-care severity calculator for ICU risk stratification and escalation planning.',
    tags: ['critical-care', 'calculator', 'risk-score'],
    relationships: [
      {
        artifactId: 'sepsis-escalation-workflow',
        type: 'supports',
        label: 'Feeds sepsis escalation',
      },
    ],
    version: '1.2.0',
    createdAt: '2026-01-15T09:00:00.000Z',
  },
  {
    id: 'sepsis-escalation-workflow',
    type: ArtifactType.WORKFLOW,
    title: 'Sepsis Escalation Workflow',
    description:
      'Stepwise care team workflow for screening, bundle activation, reassessment, and handoff.',
    tags: ['workflow', 'sepsis', 'emergency'],
    relationships: [
      {
        artifactId: 'antimicrobial-timeout-protocol',
        type: 'uses',
        label: 'Requires protocol review',
      },
      {
        artifactId: 'triage-handoff-prompt',
        type: 'generates',
        label: 'Creates handoff prompt',
      },
    ],
    version: '2.0.0',
    createdAt: '2026-01-20T10:30:00.000Z',
  },
  {
    id: 'triage-handoff-prompt',
    type: ArtifactType.PROMPT,
    title: 'Triage Handoff Prompt',
    description:
      'Reusable prompt pattern for summarizing acute findings, pending tasks, and follow-up questions.',
    tags: ['prompt', 'handoff', 'assistant'],
    relationships: [
      {
        artifactId: 'ai-rounding-summary-output',
        type: 'produces',
        label: 'Shapes AI output',
      },
    ],
    version: '1.4.1',
    createdAt: '2026-02-03T08:15:00.000Z',
  },
  {
    id: 'clinical-operations-dashboard',
    type: ArtifactType.DASHBOARD,
    title: 'Clinical Operations Dashboard',
    description:
      'Dashboard for surfacing queue load, high-risk alerts, device freshness, and workflow throughput.',
    tags: ['dashboard', 'operations', 'telemetry'],
    relationships: [
      {
        artifactId: 'device-vitals-telemetry-schema',
        type: 'observes',
        label: 'Reads telemetry schema',
      },
      {
        artifactId: 'hospital-capacity-map',
        type: 'visualizes',
        label: 'Overlays capacity map',
      },
    ],
    version: '1.1.0',
    createdAt: '2026-02-10T14:00:00.000Z',
  },
  {
    id: 'discharge-summary-template',
    type: ArtifactType.TEMPLATE,
    title: 'Discharge Summary Template',
    description:
      'Structured note template for diagnosis, course, medication changes, follow-up, and safety netting.',
    tags: ['template', 'documentation', 'discharge'],
    relationships: [
      {
        artifactId: 'ai-rounding-summary-output',
        type: 'reuses',
        label: 'Uses summarized course',
      },
    ],
    version: '1.0.3',
    createdAt: '2026-02-12T12:45:00.000Z',
  },
  {
    id: 'antimicrobial-timeout-protocol',
    type: ArtifactType.PROTOCOL,
    title: 'Antimicrobial Timeout Protocol',
    description:
      'Clinical protocol for reassessing antimicrobial coverage, culture results, and de-escalation timing.',
    tags: ['protocol', 'medication', 'stewardship'],
    relationships: [
      {
        artifactId: 'sepsis-escalation-workflow',
        type: 'governs',
        label: 'Controls workflow checkpoint',
      },
    ],
    version: '3.1.0',
    createdAt: '2026-02-18T16:20:00.000Z',
  },
  {
    id: 'device-vitals-telemetry-schema',
    type: ArtifactType.TELEMETRY_SCHEMA,
    title: 'Device Vitals Telemetry Schema',
    description:
      'Schema for normalized bed-side device observations, freshness windows, alerts, and provenance.',
    tags: ['telemetry', 'schema', 'medical-iot'],
    relationships: [
      {
        artifactId: 'clinical-operations-dashboard',
        type: 'powers',
        label: 'Powers dashboard cards',
      },
    ],
    version: '1.5.0',
    createdAt: '2026-03-01T11:10:00.000Z',
  },
  {
    id: 'hospital-capacity-map',
    type: ArtifactType.MAP,
    title: 'Hospital Capacity Map',
    description:
      'Operational map layer for floor capacity, device locations, transport status, and bed readiness.',
    tags: ['map', 'operations', 'capacity'],
    relationships: [
      {
        artifactId: 'clinical-operations-dashboard',
        type: 'feeds',
        label: 'Feeds dashboard map view',
      },
    ],
    version: '0.9.0',
    createdAt: '2026-03-06T13:25:00.000Z',
  },
  {
    id: 'ai-rounding-summary-output',
    type: ArtifactType.AI_OUTPUT,
    title: 'AI Rounding Summary Output',
    description:
      'AI-generated clinical summary artifact with problems, overnight events, risks, and follow-up prompts.',
    tags: ['ai-output', 'rounding', 'summary'],
    relationships: [
      {
        artifactId: 'discharge-summary-template',
        type: 'informs',
        label: 'Informs documentation',
      },
      {
        artifactId: 'triage-handoff-prompt',
        type: 'derived-from',
        label: 'Derived from prompt',
      },
    ],
    version: '1.3.2',
    createdAt: '2026-03-10T09:40:00.000Z',
  },
];
