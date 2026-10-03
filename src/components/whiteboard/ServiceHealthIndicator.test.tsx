import { describe, expect, it } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import ServiceHealthIndicator from './ServiceHealthIndicator';
import type { BottleneckRegistrySnapshot } from '../../services/bottleneckRegistry';

describe('ServiceHealthIndicator', () => {
  const healthySnapshot: BottleneckRegistrySnapshot = {
    generatedAt: new Date().toISOString(),
    currentServiceMap: [],
    activeBottlenecks: [],
    serviceHealth: [],
    threeMinuteRiskProjection: {
      status: 'on_track',
      criticalBottlenecks: 0,
      highRiskPatientsAffected: 0,
      nextOwnerRole: 'triage_nurse',
      fallbackAction: 'Normal operations',
      summary: 'All services nominal',
    },
    rootCauseSummary: 'No bottlenecks',
    analytics: {
      activeCount: 0,
      criticalCount: 0,
      averageServiceLatencyMs: 45,
      threeMinuteTargetBreachesByCause: {},
    },
  };

  it('renders healthy state when no bottlenecks are present', () => {
    render(
      <BrowserRouter>
        <ServiceHealthIndicator bottleneckRegistry={healthySnapshot} />
      </BrowserRouter>,
    );

    expect(screen.getByText('Service Health')).toBeInTheDocument();
    expect(screen.getByText('All Core Services Healthy')).toBeInTheDocument();
  });

  it('renders degraded state and expands to show bottleneck details and fallback', () => {
    const degradedSnapshot: BottleneckRegistrySnapshot = {
      ...healthySnapshot,
      activeBottlenecks: [
        {
          id: 'btn-1',
          category: 'saas_backend',
          serviceName: 'Labs Service',
          source: 'lab-integration',
          severity: 'medium',
          title: 'Lab delivery latency',
          description: 'Chemistry panel turnaround delayed by 25 minutes.',
          affectedWorkflow: 'Lab results review',
          detectedAt: new Date().toISOString(),
          ownerRole: 'lab_technician',
          impactsThreeMinuteTarget: false,
          fallbackAction: 'Call stat lab directly on extension 4400',
          recommendedFix: 'Restart integration worker pool',
          status: 'active',
        },
      ],
    };

    render(
      <BrowserRouter>
        <ServiceHealthIndicator bottleneckRegistry={degradedSnapshot} />
      </BrowserRouter>,
    );

    expect(screen.getByText('1 Service Degraded')).toBeInTheDocument();

    const toggleBtn = screen.getByRole('button', { name: /Service Health/i });
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'false');

    // Click to expand
    fireEvent.click(toggleBtn);
    expect(toggleBtn).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Labs Service')).toBeInTheDocument();
    expect(
      screen.getByText('Chemistry panel turnaround delayed by 25 minutes.'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Call stat lab directly on extension 4400/i)).toBeInTheDocument();
  });

  it('displays critical status and 3-minute SLA risk warning when target is at risk', () => {
    const criticalSnapshot: BottleneckRegistrySnapshot = {
      ...healthySnapshot,
      activeBottlenecks: [
        {
          id: 'btn-crit',
          category: 'clinical_workflow',
          serviceName: 'Triage Service',
          source: 'triage-engine',
          severity: 'critical',
          title: 'Triage queue offline',
          description: 'Acuity assignment API connection interrupted.',
          affectedWorkflow: 'Immediate CTAS assignment',
          detectedAt: new Date().toISOString(),
          ownerRole: 'triage_nurse',
          impactsThreeMinuteTarget: true,
          fallbackAction: 'Switch to manual paper triage sheet and verbal handoff',
          recommendedFix: 'Failover to secondary triage database',
          status: 'active',
        },
      ],
      threeMinuteRiskProjection: {
        status: 'breach_likely',
        criticalBottlenecks: 1,
        highRiskPatientsAffected: 3,
        nextOwnerRole: 'charge_nurse',
        fallbackAction: 'Verbal overhead page for incoming criticals',
        summary: 'Triage service interruption directly affects 3-minute response target.',
      },
    };

    render(
      <BrowserRouter>
        <ServiceHealthIndicator bottleneckRegistry={criticalSnapshot} />
      </BrowserRouter>,
    );

    expect(screen.getByText('1 Critical Bottleneck')).toBeInTheDocument();
    expect(screen.getByText('3-min SLA at risk')).toBeInTheDocument();

    // Click to expand
    const toggleBtn = screen.getByRole('button', { name: /Service Health/i });
    fireEvent.click(toggleBtn);

    expect(
      screen.getByText(/Triage service interruption directly affects 3-minute response target/i),
    ).toBeInTheDocument();
    expect(screen.getByText('Impacts 3-Min SLA')).toBeInTheDocument();
  });
});
