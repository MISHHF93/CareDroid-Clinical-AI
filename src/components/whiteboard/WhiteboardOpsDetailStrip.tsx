import { useMemo, useState } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { buildDataQualitySnapshot } from '../../services/dataQualityDiscovery';
import { buildQueueAuditSnapshot } from '../../services/queueAuditDiscovery';
import { selectEmsInboundCount } from '../reception/receptionQueueModel';
import { QUEUE_AUDIT_DOMAIN } from '../../config/queueAuditModel';
import { OPERATIONAL_AUDIT_DOMAIN } from '../../config/operationalAuditModel';
import OperationalHistoryPanel from '../audit/OperationalHistoryPanel';
import DataQualityRiskPanelBase from '../dataQuality/DataQualityRiskPanel';
const DataQualityRiskPanel = DataQualityRiskPanelBase as any;
import QueueOperationalPanel from '../queues/QueueOperationalPanel';
import './WhiteboardOpsDetailStrip.css';

function countOpsDetailSignals({ workflowLogs, dataQuality, queueAudit }) {
  let count = 0;
  if (workflowLogs.length) count += 1;
  if (dataQuality.summary.patientsWithRisks) count += 1;
  if (queueAudit.summary.totalLength || queueAudit.summary.totalOverdue) count += 1;
  return count;
}

export default function WhiteboardOpsDetailStrip({
  defaultExpanded = false,
  historyLimit = 5,
  qualityLimit = 4,
  queueLimit = 4,
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const patients = useEmergencyStore((state) => state.patients);
  const referrals = useEmergencyStore((state) => state.referrals);
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);
  const emsInbound = useEmergencyStore(selectEmsInboundCount);

  const dataQuality = useMemo(() => buildDataQualitySnapshot(patients), [patients]);
  const queueAudit = useMemo(
    () => buildQueueAuditSnapshot({ patients, referrals, emsInbound }),
    [emsInbound, patients, referrals],
  );

  const signalCount = countOpsDetailSignals({ workflowLogs, dataQuality, queueAudit });
  const summaryParts = useMemo(() => {
    const parts = [] as any[];
    if (queueAudit.summary.totalOverdue) {
      parts.push(`${queueAudit.summary.totalOverdue} queue overdue`);
    } else if (queueAudit.summary.totalLength) {
      parts.push(`${queueAudit.summary.totalLength} in queues`);
    }
    if (dataQuality.summary.patientsWithRisks) {
      parts.push(`${dataQuality.summary.patientsWithRisks} data gaps`);
    }
    if (workflowLogs.length) {
      parts.push(`${Math.min(historyLimit, workflowLogs.length)} recent actions`);
    }
    return parts;
  }, [
    dataQuality.summary.patientsWithRisks,
    historyLimit,
    queueAudit.summary.totalLength,
    queueAudit.summary.totalOverdue,
    workflowLogs.length,
  ]);

  if (!signalCount) return null;

  return (
    <section className="whiteboard-ops-detail-strip" aria-label="Operational detail">
      <button
        type="button"
        className="whiteboard-ops-detail-strip__toggle"
        aria-expanded={expanded}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="whiteboard-ops-detail-strip__title">Ops detail</span>
        <span className="whiteboard-ops-detail-strip__summary">
          {summaryParts.join(' · ') || `${signalCount} operational signals`}
        </span>
        <span className="whiteboard-ops-detail-strip__chevron" aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>

      {expanded ? (
        <div className="whiteboard-ops-detail-strip__panels">
          {queueAudit.summary.totalLength || queueAudit.summary.totalOverdue ? (
            <QueueOperationalPanel
              snapshot={queueAudit}
              title="Queue pressure"
              description="Length, longest wait, bottlenecks, and overdue items."
              domain={QUEUE_AUDIT_DOMAIN.ED as any}
              compact
              limit={queueLimit}
              className="whiteboard-ops-detail-strip__panel"
            />
          ) : null}
          {dataQuality.summary.patientsWithRisks ? (
            <DataQualityRiskPanel
              snapshot={{
                ...dataQuality,
                topRisks: dataQuality.topRisks.slice(0, qualityLimit),
              }}
              title="Registration data gaps"
              description="Missing demographics, arrival reason, verification, or duplicates."
              compact
              limit={qualityLimit}
              className="whiteboard-ops-detail-strip__panel"
            />
          ) : null}
          {workflowLogs.length ? (
            <OperationalHistoryPanel
              logs={workflowLogs}
              title="Recent operational history"
              description="Patient actions, queue moves, reassessments, and referrals."
              domains={[
                OPERATIONAL_AUDIT_DOMAIN.PATIENT,
                OPERATIONAL_AUDIT_DOMAIN.QUEUE,
                OPERATIONAL_AUDIT_DOMAIN.REASSESSMENT,
                OPERATIONAL_AUDIT_DOMAIN.REFERRAL,
              ]}
              limit={historyLimit}
              compact
              className="whiteboard-ops-detail-strip__panel"
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
