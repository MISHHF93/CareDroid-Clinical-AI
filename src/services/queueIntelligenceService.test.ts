import { describe, expect, it } from 'vitest';
import QueueIntelligenceService, {
  EMERGENCY_QUEUE_IDS,
  getQueueBottlenecks,
  getQueueDashboard,
  getQueueMetrics,
  getQueueRecommendations,
  getQueues,
} from './queueIntelligenceService';

describe('QueueIntelligenceService', () => {
  it('defines the canonical Emergency Department queues', () => {
    expect(EMERGENCY_QUEUE_IDS).toEqual([
      'waiting-room',
      'triage-queue',
      'provider-queue',
      'results-queue',
      'reassessment-queue',
      'referral-queue',
      'admission-queue',
      'discharge-queue',
      'ems-pre-arrival-queue',
    ]);
    expect(QueueIntelligenceService.getQueues().map((queue) => queue.label)).toEqual([
      'Waiting Room',
      'Triage Queue',
      'Provider Queue',
      'Results Queue',
      'Reassessment Queue',
      'Referral Queue',
      'Admission Queue',
      'Discharge Queue',
      'EMS Pre-Arrival Queue',
    ]);
  });

  it('tracks count, wait time, oldest patient, risk level, and throughput for every queue', () => {
    for (const queue of getQueues()) {
      expect(queue).toEqual(
        expect.objectContaining({
          count: expect.any(Number),
          waitTime: expect.any(Number),
          oldestPatient: expect.objectContaining({
            id: expect.any(String),
            waitMinutes: expect.any(Number),
          }),
          riskLevel: expect.stringMatching(/low|medium|high|critical/),
          throughput: expect.any(Number),
        }),
      );
    }
  });

  it('detects bottlenecks before staff notice downstream queue growth', () => {
    const queueState = {
      'waiting-room': {
        count: 5,
        waitTime: 21,
        oldestPatient: { id: 'ED-1', waitMinutes: 41, acuity: 'ESI 3' },
        riskLevel: 'medium',
        throughput: 6,
      },
      'triage-queue': {
        count: 2,
        waitTime: 10,
        oldestPatient: { id: 'ED-2', waitMinutes: 14, acuity: 'ESI 4' },
        riskLevel: 'low',
        throughput: 5,
      },
    };

    const bottlenecks = getQueueBottlenecks(queueState);
    const metrics = getQueueMetrics(queueState);
    const recommendations = getQueueRecommendations(queueState);

    expect(bottlenecks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          queueId: 'waiting-room',
          severity: 'high',
        }),
      ]),
    );
    expect(bottlenecks.find((bottleneck) => bottleneck.queueId === 'waiting-room')).toEqual(
      expect.objectContaining({
        reason: expect.stringMatching(/over target/i),
      }),
    );
    expect(metrics.bottleneckCount).toBeGreaterThan(0);
    expect(recommendations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          queueId: 'waiting-room',
          action: expect.stringMatching(/before downstream queues degrade/i),
        }),
      ]),
    );
  });

  it('builds a dashboard payload with bottlenecks attached to queues', () => {
    const dashboard = getQueueDashboard();

    expect(dashboard.queues).toHaveLength(9);
    expect(dashboard.metrics).toEqual(
      expect.objectContaining({
        queueCount: 9,
        patientsToday: expect.any(Number),
        patientsWaiting: expect.any(Number),
        averageWaitTime: expect.any(Number),
        longestWait: expect.any(Number),
        patientsNeedingReassessment: expect.any(Number),
        bottleneckQueue: expect.any(String),
        bottleneckCount: expect.any(Number),
        highestRiskQueue: expect.objectContaining({
          queueId: expect.any(String),
        }),
      }),
    );
    expect(dashboard.queues.some((queue) => queue.bottleneck)).toBe(true);
  });
});
