import type { Patient, Referral } from '../types/emergency';
import type { CareDroidCentralNodeSnapshot } from '../central-node/careDroidCentralNode';
import { buildQueueAuditSnapshot } from './queueAuditDiscovery';
import {
  auditCopilotRecommendations,
  buildCopilotRecommendations,
  resolveCopilotQuickAction,
} from '../config/copilotRecommendationModel';

export type CopilotRecommendationSnapshot = {
  recommendations: ReturnType<typeof buildCopilotRecommendations>;
  audit: ReturnType<typeof auditCopilotRecommendations>;
};

export function buildCopilotRecommendationSnapshot({
  centralSnapshot,
  patients = [] as any[],
  referrals = [] as Referral[],
  emsInbound = 0,
  generatedAt,
}: {
  centralSnapshot: CareDroidCentralNodeSnapshot;
  patients?: Patient[];
  referrals?: Referral[];
  emsInbound?: number;
  generatedAt?: string;
}): CopilotRecommendationSnapshot {
  const queueAudit = buildQueueAuditSnapshot({ patients, referrals, emsInbound });
  const recommendations = buildCopilotRecommendations({
    centralSnapshot,
    queueAuditSummary: queueAudit.summary,
    primaryBottleneck: queueAudit.summary.primaryBottleneck,
    breachedQueues: centralSnapshot.queueHealth.filter((queue) => queue.breached),
    generatedAt,
  });

  return {
    recommendations,
    audit: auditCopilotRecommendations(recommendations as any[]),
  };
}

export function resolveCopilotQuickActionFromSnapshot(
  query: string,
  {
    centralSnapshot,
    patients = [] as any[],
    referrals = [] as Referral[],
    emsInbound = 0,
  }: {
    centralSnapshot: CareDroidCentralNodeSnapshot;
    patients?: Patient[];
    referrals?: Referral[];
    emsInbound?: number;
  },
) {
  const queueAudit = buildQueueAuditSnapshot({ patients, referrals, emsInbound });
  return resolveCopilotQuickAction(query, {
    centralSnapshot,
    queueAuditSummary: queueAudit.summary,
    primaryBottleneck: queueAudit.summary.primaryBottleneck,
    breachedQueues: centralSnapshot.queueHealth.filter((queue) => queue.breached),
  });
}
