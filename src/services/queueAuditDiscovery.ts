import type { Patient, Referral } from '../types/emergency';
import {
  auditAllQueues,
  summarizeQueueAudit,
  type QUEUE_AUDIT_DOMAIN,
} from '../config/queueAuditModel.js';

export type QueueAuditSnapshot = {
  rows: ReturnType<typeof auditAllQueues>;
  summary: ReturnType<typeof summarizeQueueAudit>;
};

export function buildQueueAuditSnapshot({
  patients = [],
  emsInbound = 0,
  referrals = [] as Referral[],
  reassessmentOverdueGraceMinutes = 10,
}: {
  patients?: Patient[];
  emsInbound?: number;
  referrals?: Referral[];
  reassessmentOverdueGraceMinutes?: number;
} = {}): QueueAuditSnapshot {
  const rows = (auditAllQueues as Function)({
    patients,
    emsInbound,
    referrals,
    reassessmentOverdueGraceMinutes,
  }) as ReturnType<typeof auditAllQueues>;
  return {
    rows,
    summary: summarizeQueueAudit(rows),
  };
}

export type { QUEUE_AUDIT_DOMAIN };
