import { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { selectEmsInboundCount } from '../reception/receptionQueueModel';
import { buildQueueAuditSnapshot } from '../../services/queueAuditDiscovery';
import { QUEUE_AUDIT_DOMAIN } from '../../config/queueAuditModel';
import QueueOperationalPanel from '../queues/QueueOperationalPanel';
import './QueueAuditStrip.css';

export default function QueueAuditStrip({ domain = QUEUE_AUDIT_DOMAIN.ED, limit = 4 }) {
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsInbound = useEmergencyStore(selectEmsInboundCount);

  const snapshot = useMemo(
    () => buildQueueAuditSnapshot({ patients, referrals, emsInbound }),
    [emsInbound, patients, referrals],
  );

  if (!snapshot.summary.totalLength && !snapshot.summary.totalOverdue) return null;

  return (
    <div className="queue-audit-strip" aria-label="Queue audit summary">
      <QueueOperationalPanel
        snapshot={snapshot}
        title="Queue pressure"
        description="Length, longest wait, bottlenecks, and overdue items across active queues."
        domain={domain as any}
        compact
        limit={limit}
        className="queue-audit-strip__panel"
      />
    </div>
  );
}
