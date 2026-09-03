import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BottleneckList, BottleneckImpactCard, RootCauseSummaryPanel } from './BottleneckPanels';
import type {
  BottleneckEvent,
  BottleneckRegistrySnapshot,
} from '../../services/bottleneckRegistry';

// HEAL-209: EmergencySettings.tsx (it_admin's own default landing page --
// EMERGENCY_ROLE_DEFINITIONS.itAdmin explicitly excludes every patient
// route, "no patient clinical data") rendered patient-flow bottleneck
// titles unconditionally -- e.g. "Flow wait — James Tremblay" -- with no
// permission check at all. canViewPatients defaults to false (fail closed)
// matching this session's established PHI-gate convention.

function patientEvent(overrides: Partial<BottleneckEvent> = {}): BottleneckEvent {
  return {
    id: 'bn-flow-long-wait-p1',
    category: 'clinical_workflow',
    serviceName: 'Emergency Flow Engine',
    source: 'continuousPatientFlowEngine',
    severity: 'critical',
    title: 'Flow wait — James Tremblay',
    description: '56m wait in Waiting. Target 30m.',
    affectedWorkflow: 'waiting',
    affectedPatientId: 'patient-1',
    detectedAt: new Date().toISOString(),
    ownerRole: 'charge_nurse',
    impactsThreeMinuteTarget: true,
    fallbackAction: 'Assign a human workflow owner.',
    recommendedFix: 'n/a',
    status: 'active',
    ...overrides,
  } as BottleneckEvent;
}

function technicalEvent(overrides: Partial<BottleneckEvent> = {}): BottleneckEvent {
  return {
    id: 'bn-saas-central-node-sync',
    category: 'saas_backend',
    serviceName: 'CareDroid Central Node',
    source: 'centralNodeSync',
    severity: 'warning',
    title: 'Central node sync degraded',
    description: 'Sync status: offline.',
    affectedWorkflow: 'sync',
    detectedAt: new Date().toISOString(),
    ownerRole: 'it_admin',
    impactsThreeMinuteTarget: false,
    fallbackAction: 'Use the local intake snapshot.',
    recommendedFix: 'Check backend central-node route.',
    status: 'active',
    ...overrides,
  } as BottleneckEvent;
}

describe('BottleneckImpactCard PHI gate (HEAL-209)', () => {
  it('redacts the patient name from the title when canViewPatients is false (default)', () => {
    render(<BottleneckImpactCard event={patientEvent()} />);
    expect(screen.getByText('Flow wait')).toBeInTheDocument();
    expect(screen.queryByText(/James Tremblay/)).toBeNull();
  });

  it('shows the full patient-identifying title when canViewPatients is true', () => {
    render(<BottleneckImpactCard event={patientEvent()} canViewPatients />);
    expect(screen.getByText('Flow wait — James Tremblay')).toBeInTheDocument();
  });

  it('leaves non-patient (technical/integration) event titles untouched regardless of canViewPatients', () => {
    render(<BottleneckImpactCard event={technicalEvent()} />);
    expect(screen.getByText('Central node sync degraded')).toBeInTheDocument();
  });

  it('redacts a patient name embedded in free-text description, not just structured title', () => {
    // bottleneckRegistry.ts's unacknowledged-critical-alert adapter builds
    // description as `${alert.title}: ${alert.message}` from whatever a
    // clinical alert's own free text says -- e.g. "Deterioration risk
    // flagged: Sarah Okafor has a deterioration risk flag..." -- caught
    // live on it_admin's Settings page after the title-only fix shipped.
    const event = patientEvent({
      title: 'Critical alert unacknowledged',
      description:
        'Deterioration risk flagged: Sarah Okafor has a deterioration risk flag and should be surfaced for reassessment review.',
    });
    render(<BottleneckImpactCard event={event} />);
    expect(screen.queryByText(/Sarah Okafor/)).toBeNull();
    expect(screen.getByText(/Patient-specific details are hidden/)).toBeInTheDocument();
  });
});

describe('BottleneckList PHI gate (HEAL-209)', () => {
  it('redacts every patient-identifying title in the list by default', () => {
    render(<BottleneckList events={[patientEvent(), technicalEvent()]} />);
    expect(screen.getByText('Flow wait')).toBeInTheDocument();
    expect(screen.queryByText(/James Tremblay/)).toBeNull();
    expect(screen.getByText('Central node sync degraded')).toBeInTheDocument();
  });

  it('shows full titles when canViewPatients is true', () => {
    render(<BottleneckList events={[patientEvent()]} canViewPatients />);
    expect(screen.getByText('Flow wait — James Tremblay')).toBeInTheDocument();
  });
});

describe('RootCauseSummaryPanel PHI gate (HEAL-209)', () => {
  function registryWith(events: BottleneckEvent[]): BottleneckRegistrySnapshot {
    return {
      generatedAt: new Date().toISOString(),
      currentServiceMap: [],
      activeBottlenecks: events,
      serviceHealth: [],
      threeMinuteRiskProjection: { status: 'on_track', summary: 'ok' },
      // Pre-baked exactly like bottleneckRegistry.ts's own construction --
      // unredacted, since the registry itself has no role context.
      rootCauseSummary: events.map((e) => `${e.serviceName}: ${e.title}`).join(' | '),
      analytics: {
        activeCount: events.length,
        criticalCount: 0,
        averageServiceLatencyMs: 0,
        threeMinuteTargetBreachesByCause: {},
      },
    } as BottleneckRegistrySnapshot;
  }

  it('does not trust the pre-baked rootCauseSummary when it embeds a patient name and canViewPatients is false', () => {
    render(<RootCauseSummaryPanel registry={registryWith([patientEvent()])} />);
    expect(screen.queryByText(/James Tremblay/)).toBeNull();
  });

  it('shows the real summary (including name) when canViewPatients is true', () => {
    render(<RootCauseSummaryPanel registry={registryWith([patientEvent()])} canViewPatients />);
    expect(screen.getByText(/James Tremblay/)).toBeInTheDocument();
  });

  it('leaves a technical-only summary untouched regardless of canViewPatients', () => {
    render(<RootCauseSummaryPanel registry={registryWith([technicalEvent()])} />);
    expect(screen.getByText(/Central node sync degraded/)).toBeInTheDocument();
  });

  // Regression coverage: the "AI Chief / Root Cause Summary" header implies
  // model-generated analysis, but the summary is a deterministic string-join
  // of the top 3 active bottleneck titles (bottleneckRegistry.ts) with zero
  // truth-label disclosure.
  it('labels the root cause summary as Manual (deterministic aggregation), not silently AI-branded', () => {
    render(<RootCauseSummaryPanel registry={registryWith([technicalEvent()])} />);
    const label = screen.getByTestId('ai-truth-label-chip');
    expect(label).toHaveTextContent('Manual');
    expect(label.getAttribute('title')).toMatch(/bottleneck aggregation/i);
  });
});
