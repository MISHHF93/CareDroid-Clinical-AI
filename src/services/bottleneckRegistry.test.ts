import { describe, expect, it } from 'vitest';
import {
  CURRENT_SERVICE_MAP,
  adaptExistingServiceSignalsToBottlenecks,
  bottleneckEventsToAlerts,
  buildBottleneckRegistrySnapshot,
  buildThreeMinuteRiskProjection,
  detectBottleneckEvents,
  type BottleneckEvent,
  type ExistingServiceBottleneckSignals,
} from './bottleneckRegistry';
import type { Alert } from '../types/emergency';

const ISO = '2026-06-27T10:00:00.000Z';

function makeEvent(overrides: Partial<BottleneckEvent> = {}): BottleneckEvent {
  return {
    id: 'bn-test',
    category: 'clinical_workflow',
    serviceName: 'Queue Intelligence Service',
    source: 'test',
    severity: 'high',
    title: 'Test bottleneck',
    description: 'A test bottleneck.',
    affectedWorkflow: 'Triage',
    detectedAt: ISO,
    ownerRole: 'charge_nurse',
    impactsThreeMinuteTarget: true,
    fallbackAction: 'Manual triage.',
    recommendedFix: 'Fix the queue.',
    status: 'active',
    ...overrides,
  };
}

describe('CURRENT_SERVICE_MAP', () => {
  it('contains at least 30 service entries', () => {
    expect(CURRENT_SERVICE_MAP.length).toBeGreaterThanOrEqual(30);
  });

  it('marks critical care services as affecting the 3-minute loop', () => {
    const criticalNames = [
      'Emergency Operating System Service',
      'CareDroid Central Node',
      'API Client',
      'Alert Engine',
      'Queue Intelligence Service',
    ];
    for (const name of criticalNames) {
      const entry = CURRENT_SERVICE_MAP.find((s) => s.serviceName === name);
      expect(entry, `${name} must be in CURRENT_SERVICE_MAP`).toBeTruthy();
      expect(entry?.affectsThreeMinuteLoop, `${name} must affect 3-minute loop`).toBe(true);
    }
  });

  it('every entry has a filePath and at least one failure mode', () => {
    for (const entry of CURRENT_SERVICE_MAP) {
      expect(entry.filePath, `${entry.serviceName} must have filePath`).toBeTruthy();
      expect(entry.failureModes.length, `${entry.serviceName} must have failure modes`).toBeGreaterThan(0);
    }
  });
});

describe('detectBottleneckEvents', () => {
  it('returns empty array when no signals are present', () => {
    const events = detectBottleneckEvents({ generatedAt: ISO });
    expect(events).toEqual([]);
  });

  it('detects a breached queue as a clinical_workflow bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      queueHealth: [
        { id: 'triage', label: 'Triage Queue', count: 8, oldestWaitMinutes: 45, targetMinutes: 15, breached: true },
      ],
    });
    expect(events.length).toBeGreaterThan(0);
    const event = events.find((e) => e.id.includes('triage'));
    expect(event?.category).toBe('clinical_workflow');
    expect(event?.severity).toBe('critical');
    expect(event?.impactsThreeMinuteTarget).toBe(true);
    expect(event?.ownerRole).toBe('triage_nurse');
    expect(event?.fallbackAction).toBeTruthy();
  });

  it('detects a results-type queue as interoperability', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      queueHealth: [
        { id: 'results', label: 'Results Queue', count: 3, oldestWaitMinutes: 40, targetMinutes: 20, breached: true },
      ],
    });
    const event = events.find((e) => e.id.includes('results'));
    expect(event?.category).toBe('interoperability');
    expect(event?.serviceName).toBe('Lab Integration');
  });

  it('detects red capacity band as an operational bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      capacityStatus: { band: 'red', score: 95, riskLevel: 'red' },
    });
    const event = events.find((e) => e.category === 'operational');
    expect(event).toBeTruthy();
    expect(event?.severity).toBe('critical');
    expect(event?.ownerRole).toBe('patient_flow_coordinator');
    expect(event?.responseDeadline).toBeTruthy();
  });

  it('detects orange capacity band as a high operational bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      capacityStatus: { band: 'orange', score: 78, riskLevel: 'orange' },
    });
    const event = events.find((e) => e.category === 'operational');
    expect(event?.severity).toBe('high');
  });

  it('detects stale sync as a saas_backend bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      sync: { stale: true, status: 'local', message: 'Running on local snapshot.' },
    });
    const event = events.find((e) => e.category === 'saas_backend' && e.serviceName === 'CareDroid Central Node');
    expect(event).toBeTruthy();
    expect(event?.fallbackAction).toContain('emergency read-only');
  });

  it('detects sync degraded status as a saas_backend bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      sync: { status: 'degraded', stale: false },
    });
    const event = events.find((e) => e.id === 'bn-saas-central-node-sync');
    expect(event).toBeTruthy();
  });

  it('detects AI Chief disabled as a medium saas_backend bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      aiCopilotContext: { enabled: false },
    });
    const event = events.find((e) => e.id === 'bn-saas-ai-chief-disabled');
    expect(event).toBeTruthy();
    expect(event?.severity).toBe('medium');
    expect(event?.impactsThreeMinuteTarget).toBe(false);
  });

  it('does not generate AI Chief bottleneck when AI Chief is enabled', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      aiCopilotContext: { enabled: true },
    });
    expect(events.find((e) => e.id === 'bn-saas-ai-chief-disabled')).toBeUndefined();
  });

  it('detects reassessment overdue as a critical clinical_workflow bottleneck when ≥ 2', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      reassessmentStatus: { due: 3, overdue: 2 },
    });
    const event = events.find((e) => e.id === 'bn-clinical-reassessment-overdue');
    expect(event).toBeTruthy();
    expect(event?.severity).toBe('critical');
    expect(event?.impactsThreeMinuteTarget).toBe(true);
  });

  it('detects single reassessment overdue as high severity', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      reassessmentStatus: { due: 2, overdue: 1 },
    });
    const event = events.find((e) => e.id === 'bn-clinical-reassessment-overdue');
    expect(event?.severity).toBe('high');
  });

  it('ignores zero overdue reassessments', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      reassessmentStatus: { due: 1, overdue: 0 },
    });
    expect(events.find((e) => e.id === 'bn-clinical-reassessment-overdue')).toBeUndefined();
  });

  it('detects unacknowledged critical alert as a clinical_workflow bottleneck', () => {
    const criticalAlert: Alert = {
      id: 'alert-001',
      type: 'System',
      severity: 'Critical',
      title: 'Sepsis alert',
      message: 'Patient P1 has sepsis indicators.',
      createdAt: ISO,
      dismissed: false,
      acknowledged: false,
      source: 'alert-engine',
    };
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      operationalAlerts: [criticalAlert],
    });
    const event = events.find((e) => e.id === `bn-alert-unacknowledged-${criticalAlert.id}`);
    expect(event).toBeTruthy();
    expect(event?.severity).toBe('critical');
    expect(event?.ownerRole).toBe('charge_nurse');
    expect(event?.impactsThreeMinuteTarget).toBe(true);
  });

  it('ignores dismissed critical alerts', () => {
    const dismissed: Alert = {
      id: 'alert-002',
      severity: 'Critical',
      title: 'Old alert',
      message: 'Already dismissed.',
      createdAt: ISO,
      dismissed: true,
      acknowledged: false,
    };
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      operationalAlerts: [dismissed],
    });
    expect(events.find((e) => e.id.includes('alert-002'))).toBeUndefined();
  });

  it('detects referral backlog of ≥ 3 as an interoperability bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      referralStatus: { pending: 4 },
    });
    const event = events.find((e) => e.id === 'bn-interoperability-referral-backlog');
    expect(event).toBeTruthy();
    expect(event?.category).toBe('interoperability');
    expect(event?.serviceName).toBe('EHR/FHIR Sync');
  });

  it('ignores referral count below threshold', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      referralStatus: { pending: 2 },
    });
    expect(events.find((e) => e.id === 'bn-interoperability-referral-backlog')).toBeUndefined();
  });

  // HEAL referralHub-fixture-honesty: adaptReferralSignals (via
  // adaptExistingServiceSignalsToBottlenecks -> existingServiceSignals.
  // referralDashboard) previously had no way to know whether the
  // `delays` it was fed came from real referral data or from
  // ReferralHub.getReferralDashboard()'s fabricated demo fixture rows --
  // it would emit a "Cardiology referral delayed" bottleneck event either
  // way. It now checks the new `isFixtureData` flag ReferralHub's dashboard
  // carries and suppresses fabricated events entirely.
  it('emits a referral bottleneck event from real (non-fixture) referral delay data', () => {
    const events = adaptExistingServiceSignalsToBottlenecks(
      {
        referralDashboard: {
          isFixtureData: false,
          delays: [
            {
              referralId: 'ref-real-1',
              department: 'Cardiology',
              priority: 'high',
              reason: 'Real cardiology referral delayed in review.',
            },
          ],
        },
      },
      ISO,
    );

    const event = events.find((candidate) => candidate.id === 'bn-referral-service-ref-real-1');
    expect(event).toBeTruthy();
    expect(event?.title).toBe('Cardiology delayed');
  });

  it('suppresses fabricated referral bottleneck events when the dashboard is fixture-only demo data', () => {
    const events = adaptExistingServiceSignalsToBottlenecks(
      {
        referralDashboard: {
          isFixtureData: true,
          delays: [
            {
              referralId: 'REF-1002',
              department: 'Neurology',
              priority: 'critical',
              reason: 'Fabricated fixture delay -- must never surface as a real bottleneck.',
            },
          ],
        },
      },
      ISO,
    );

    expect(events.find((candidate) => candidate.id === 'bn-referral-service-REF-1002')).toBeUndefined();
    expect(events.some((candidate) => candidate.source === 'ReferralHub.getReferralDashboard')).toBe(
      false,
    );
  });

  it('sorts events with impactsThreeMinuteTarget=true first', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      reassessmentStatus: { due: 2, overdue: 1 },
      aiCopilotContext: { enabled: false },
    });
    if (events.length >= 2) {
      const firstImpacts = events[0].impactsThreeMinuteTarget;
      const lastNonImpacting = events.find((e) => !e.impactsThreeMinuteTarget);
      expect(firstImpacts).toBe(true);
      expect(lastNonImpacting).toBeTruthy();
    }
  });

  it('detects degraded OCR intake as a medium saas_backend bottleneck that never impacts the 3-minute target', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      ocrIntakeStatus: { status: 'degraded', failureRate: 0.3 },
    });
    const event = events.find((e) => e.id === 'bn-saas-ocr-intake-degraded');
    expect(event).toBeTruthy();
    expect(event?.severity).toBe('medium');
    expect(event?.impactsThreeMinuteTarget).toBe(false);
    expect(event?.fallbackAction).toContain('manual intake');
  });

  it('detects down OCR intake as a high severity bottleneck', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      ocrIntakeStatus: { status: 'down', failureRate: 0.9 },
    });
    const event = events.find((e) => e.id === 'bn-saas-ocr-intake-down');
    expect(event?.severity).toBe('high');
  });

  it('does not generate an OCR bottleneck when OCR intake is healthy', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      ocrIntakeStatus: { status: 'healthy' },
    });
    expect(events.find((e) => e.id.startsWith('bn-saas-ocr-intake'))).toBeUndefined();
  });

  it('deduplicates events with the same id', () => {
    const events = detectBottleneckEvents({
      generatedAt: ISO,
      reassessmentStatus: { due: 3, overdue: 2 },
    });
    const ids = events.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('buildThreeMinuteRiskProjection', () => {
  it('returns on_track when there are no events', () => {
    const projection = buildThreeMinuteRiskProjection([]);
    expect(projection.status).toBe('on_track');
    expect(projection.criticalBottlenecks).toBe(0);
    expect(projection.highRiskPatientsAffected).toBe(0);
    expect(projection.summary).toContain('No active bottleneck');
    expect(projection.nextOwnerRole).toBe('charge_nurse');
  });

  it('returns on_track when events do not impact the 3-minute target', () => {
    const events = [makeEvent({ impactsThreeMinuteTarget: false, severity: 'medium' })];
    const projection = buildThreeMinuteRiskProjection(events);
    expect(projection.status).toBe('on_track');
  });

  it('returns at_risk when high-severity events impact the 3-minute target', () => {
    const events = [makeEvent({ severity: 'high', impactsThreeMinuteTarget: true })];
    const projection = buildThreeMinuteRiskProjection(events);
    expect(projection.status).toBe('at_risk');
    expect(projection.criticalBottlenecks).toBe(0);
  });

  it('returns breach_likely when critical-severity events impact the 3-minute target', () => {
    const events = [
      makeEvent({ id: 'bn-a', severity: 'critical', impactsThreeMinuteTarget: true }),
      makeEvent({ id: 'bn-b', severity: 'high', impactsThreeMinuteTarget: true }),
    ];
    const projection = buildThreeMinuteRiskProjection(events);
    expect(projection.status).toBe('breach_likely');
    expect(projection.criticalBottlenecks).toBe(1);
  });

  it('counts unique affected patient IDs', () => {
    const events = [
      makeEvent({ id: 'bn-a', affectedPatientId: 'p1', impactsThreeMinuteTarget: true }),
      makeEvent({ id: 'bn-b', affectedPatientId: 'p1', impactsThreeMinuteTarget: true }),
      makeEvent({ id: 'bn-c', affectedPatientId: 'p2', impactsThreeMinuteTarget: true }),
    ];
    const projection = buildThreeMinuteRiskProjection(events);
    expect(projection.highRiskPatientsAffected).toBe(2);
  });

  it('uses the primary event owner role as nextOwnerRole', () => {
    const events = [
      makeEvent({ severity: 'critical', impactsThreeMinuteTarget: true, ownerRole: 'triage_nurse' }),
    ];
    const projection = buildThreeMinuteRiskProjection(events);
    expect(projection.nextOwnerRole).toBe('triage_nurse');
  });

  it('includes the primary fallback action', () => {
    const events = [
      makeEvent({ severity: 'high', impactsThreeMinuteTarget: true, fallbackAction: 'Call code blue.' }),
    ];
    const projection = buildThreeMinuteRiskProjection(events);
    expect(projection.fallbackAction).toBe('Call code blue.');
  });
});

describe('buildBottleneckRegistrySnapshot', () => {
  it('returns a safe snapshot with no bottlenecks for empty input', () => {
    const snapshot = buildBottleneckRegistrySnapshot({});
    expect(snapshot.activeBottlenecks).toEqual([]);
    expect(snapshot.analytics.activeCount).toBe(0);
    expect(snapshot.analytics.criticalCount).toBe(0);
    expect(snapshot.rootCauseSummary).toContain('No active');
    expect(snapshot.threeMinuteRiskProjection.status).toBe('on_track');
    expect(snapshot.currentServiceMap.length).toBeGreaterThan(0);
    expect(snapshot.generatedAt).toBeTruthy();
  });

  it('uses provided generatedAt timestamp', () => {
    const snapshot = buildBottleneckRegistrySnapshot({ generatedAt: ISO });
    expect(snapshot.generatedAt).toBe(ISO);
  });

  it('correctly counts active and critical bottlenecks in analytics', () => {
    const snapshot = buildBottleneckRegistrySnapshot({
      generatedAt: ISO,
      reassessmentStatus: { due: 3, overdue: 3 },
      capacityStatus: { band: 'red', score: 99 },
    });
    expect(snapshot.analytics.activeCount).toBe(snapshot.activeBottlenecks.length);
    expect(snapshot.analytics.criticalCount).toBeGreaterThan(0);
  });

  it('builds service health for all services in current service map', () => {
    const snapshot = buildBottleneckRegistrySnapshot({ generatedAt: ISO });
    expect(snapshot.serviceHealth.length).toBeGreaterThanOrEqual(CURRENT_SERVICE_MAP.length);
  });

  it('includes rootCauseSummary with service names when bottlenecks are present', () => {
    const snapshot = buildBottleneckRegistrySnapshot({
      generatedAt: ISO,
      reassessmentStatus: { due: 1, overdue: 1 },
    });
    if (snapshot.activeBottlenecks.length > 0) {
      expect(snapshot.rootCauseSummary).not.toBe('No active service or workflow bottlenecks detected.');
    }
  });

  it('builds 3-minute breach_likely projection when critical bottleneck present', () => {
    const snapshot = buildBottleneckRegistrySnapshot({
      generatedAt: ISO,
      capacityStatus: { band: 'red', score: 99 },
      criticalPatients: [{ id: 'p1', priority: 1, waitMinutes: 5 }],
    });
    expect(snapshot.threeMinuteRiskProjection.status).toBe('breach_likely');
  });

  it('tracks threeMinuteTargetBreachesByCause correctly', () => {
    const snapshot = buildBottleneckRegistrySnapshot({
      generatedAt: ISO,
      reassessmentStatus: { due: 2, overdue: 2 },
      referralStatus: { pending: 4 },
    });
    const causes = snapshot.analytics.threeMinuteTargetBreachesByCause;
    if (snapshot.activeBottlenecks.some((e) => e.impactsThreeMinuteTarget && e.category === 'clinical_workflow')) {
      expect(causes['clinical_workflow']).toBeGreaterThan(0);
    }
  });
});

describe('bottleneckEventsToAlerts', () => {
  it('excludes medium and low severity events', () => {
    const events = [
      makeEvent({ id: 'bn-medium', severity: 'medium', impactsThreeMinuteTarget: false }),
      makeEvent({ id: 'bn-low', severity: 'low', impactsThreeMinuteTarget: false }),
    ];
    const alerts = bottleneckEventsToAlerts(events);
    expect(alerts).toEqual([]);
  });

  it('includes high severity events as Warning alerts', () => {
    const events = [makeEvent({ id: 'bn-high', severity: 'high', impactsThreeMinuteTarget: true })];
    const alerts = bottleneckEventsToAlerts(events);
    expect(alerts.length).toBe(1);
    expect(alerts[0].severity).toBe('Warning');
    expect(alerts[0].id).toBe('alert-bottleneck-event-bn-high');
    expect(alerts[0].type).toBe('Bottleneck');
    expect(alerts[0].actionType).toBe('OPEN_BOTTLENECK');
    expect(alerts[0].dismissed).toBe(false);
  });

  it('carries canonical alert ownership metadata', () => {
    const events = [
      makeEvent({
        id: 'bn-owner',
        ownerRole: 'triage_nurse',
        ownerUserId: 'demo-sofia-alvarez',
        owningDepartment: 'dept-triage',
        owningSite: 'site-central-city',
        backupRole: 'charge_nurse',
        escalationChain: ['triage_nurse', 'charge_nurse', 'emergency_physician'],
        acknowledgementAuthority: ['triage_nurse', 'charge_nurse'],
      }),
    ];
    const alerts = bottleneckEventsToAlerts(events);

    expect(alerts[0].metadata).toMatchObject({
      ownerRole: 'triage_nurse',
      ownerUserId: 'demo-sofia-alvarez',
      owningDepartment: 'dept-triage',
      owningSite: 'site-central-city',
      backupRole: 'charge_nurse',
      responseDeadline: undefined,
      impactsThreeMinuteTarget: true,
    });
    expect(alerts[0].metadata?.escalationChain).toEqual([
      'triage_nurse',
      'charge_nurse',
      'emergency_physician',
    ]);
    expect(alerts[0].metadata?.acknowledgementAuthority).toEqual([
      'triage_nurse',
      'charge_nurse',
    ]);
  });

  it('includes critical severity events as Critical alerts', () => {
    const events = [makeEvent({ id: 'bn-critical', severity: 'critical', impactsThreeMinuteTarget: true })];
    const alerts = bottleneckEventsToAlerts(events);
    expect(alerts[0].severity).toBe('Critical');
    expect(alerts[0].autoDismissAfter).toBeUndefined();
  });

  it('sets autoDismissAfter=10 for high (non-critical) events', () => {
    const events = [makeEvent({ id: 'bn-high2', severity: 'high', impactsThreeMinuteTarget: true })];
    const alerts = bottleneckEventsToAlerts(events);
    expect(alerts[0].autoDismissAfter).toBe(10);
  });

  it('preserves createdAt from previous alert state', () => {
    const previousCreatedAt = '2026-06-27T09:00:00.000Z';
    const events = [makeEvent({ id: 'bn-prev', severity: 'high', impactsThreeMinuteTarget: true })];
    const previousAlerts: Alert[] = [
      {
        id: 'alert-bottleneck-event-bn-prev',
        severity: 'Warning',
        title: 'Old title',
        message: 'Old message.',
        createdAt: previousCreatedAt,
        dismissed: false,
        acknowledged: true,
        acknowledgedAt: ISO,
      },
    ];
    const alerts = bottleneckEventsToAlerts(events, previousAlerts);
    expect(alerts[0].createdAt).toBe(previousCreatedAt);
    expect(alerts[0].acknowledged).toBe(true);
    expect(alerts[0].acknowledgedAt).toBe(ISO);
  });

  it('preserves dismissed state from previous alert', () => {
    const events = [makeEvent({ id: 'bn-dismissed', severity: 'high', impactsThreeMinuteTarget: true })];
    const previousAlerts: Alert[] = [
      {
        id: 'alert-bottleneck-event-bn-dismissed',
        severity: 'Warning',
        title: 'Old',
        message: 'Old',
        createdAt: ISO,
        dismissed: true,
        dismissedAt: ISO,
      },
    ];
    const alerts = bottleneckEventsToAlerts(events, previousAlerts);
    expect(alerts[0].dismissed).toBe(true);
    expect(alerts[0].dismissedAt).toBe(ISO);
  });

  it('includes bottleneck metadata on the alert', () => {
    const event = makeEvent({
      id: 'bn-meta',
      severity: 'high',
      impactsThreeMinuteTarget: true,
      category: 'saas_backend',
      serviceName: 'AI Chief',
      ownerRole: 'charge_nurse',
    });
    const alerts = bottleneckEventsToAlerts([event]);
    expect(alerts[0].metadata?.category).toBe('saas_backend');
    expect(alerts[0].metadata?.serviceName).toBe('AI Chief');
    expect(alerts[0].metadata?.ownerRole).toBe('charge_nurse');
    expect(alerts[0].metadata?.impactsThreeMinuteTarget).toBe(true);
  });

  it('includes the fallback action in the alert message', () => {
    const event = makeEvent({ id: 'bn-fb', severity: 'high', fallbackAction: 'Call the backup.' });
    const alerts = bottleneckEventsToAlerts([event]);
    expect(alerts[0].message).toContain('Call the backup.');
  });

  it('handles empty events array', () => {
    expect(bottleneckEventsToAlerts([])).toEqual([]);
  });
});

describe('adaptExistingServiceSignalsToBottlenecks', () => {
  it('returns empty array for undefined signals', () => {
    expect(adaptExistingServiceSignalsToBottlenecks(undefined)).toEqual([]);
  });

  it('returns empty array for empty signals object', () => {
    const signals: ExistingServiceBottleneckSignals = {};
    expect(adaptExistingServiceSignalsToBottlenecks(signals)).toEqual([]);
  });

  it('adapts flow engine detections to clinical_workflow bottlenecks', () => {
    const signals: ExistingServiceBottleneckSignals = {
      flowEngine: {
        detections: [
          {
            type: 'stalled_patient',
            patientId: 'p1',
            severity: 'high',
            stage: 'Triage',
            message: 'Patient stalled in triage for 45 minutes.',
            recommendedAction: 'Escalate to charge nurse.',
          },
        ],
      },
    };
    const events = adaptExistingServiceSignalsToBottlenecks(signals, ISO);
    expect(events.length).toBeGreaterThan(0);
    const event = events.find((e) => e.id.includes('bn-flow-'));
    expect(event?.category).toBe('clinical_workflow');
    expect(event?.fallbackAction).toBeTruthy();
  });

  it('adapts capacity dashboard signals to operational bottlenecks', () => {
    const signals: ExistingServiceBottleneckSignals = {
      capacityDashboard: {
        score: 92,
        riskLevel: 'critical',
        recommendations: [{ action: 'Open surge protocol.' }],
      },
    };
    const events = adaptExistingServiceSignalsToBottlenecks(signals, ISO);
    const event = events.find((e) => e.category === 'operational');
    expect(event).toBeTruthy();
  });
});
