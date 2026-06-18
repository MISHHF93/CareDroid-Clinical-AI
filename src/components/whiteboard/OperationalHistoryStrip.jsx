import { useMemo } from 'react';
import { useEmergencyStore } from '../../store/emergencyStore';
import { OPERATIONAL_AUDIT_DOMAIN } from '../../config/operationalAuditModel';
import OperationalHistoryPanel from '../audit/OperationalHistoryPanel';
import './OperationalHistoryStrip.css';

export default function OperationalHistoryStrip({
  domains = [
    OPERATIONAL_AUDIT_DOMAIN.PATIENT,
    OPERATIONAL_AUDIT_DOMAIN.QUEUE,
    OPERATIONAL_AUDIT_DOMAIN.REASSESSMENT,
    OPERATIONAL_AUDIT_DOMAIN.REFERRAL,
  ],
  limit = 5,
}) {
  const workflowLogs = useEmergencyStore((state) => state.workflowLogs);

  if (!workflowLogs.length) return null;

  return (
    <div className="operational-history-strip" aria-label="Recent operational history">
      <OperationalHistoryPanel
        logs={workflowLogs}
        title="Recent operational history"
        description="Patient actions, queue moves, reassessments, and referrals from workflow audit data."
        domains={domains}
        limit={limit}
        compact
        className="operational-history-strip__panel"
      />
    </div>
  );
}
