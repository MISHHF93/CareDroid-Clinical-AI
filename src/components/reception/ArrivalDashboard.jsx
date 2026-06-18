import React, { useMemo } from 'react';
import { selectReceptionQueues } from './receptionQueueModel';
import EmsPreArrivalPanel from './EmsPreArrivalPanel';
import RecentArrivalsPanel from './RecentArrivalsPanel';
import ReceptionWorkQueues from './ReceptionWorkQueues';
import DataQualityRiskPanel from '../dataQuality/DataQualityRiskPanel';
import QueueOperationalPanel from '../queues/QueueOperationalPanel';
import { buildQueueAuditSnapshot } from '../../services/queueAuditDiscovery';
import { QUEUE_AUDIT_DOMAIN } from '../../config/queueAuditModel';
import { RECEPTION_COPY } from './receptionCopy';
import './ArrivalDashboard.css';

export default function ArrivalDashboard({
  patients = [],
  emsArrivals = [],
  receptionLoading = false,
  activeQueueTab = 'ems',
  canPrepareRegistration = false,
  canConvertArrival = false,
  onSelectPatient,
  onTabChange,
  onOpenVerification,
  onPrepareRegistration,
  onConvertArrival,
  onRefreshEms,
  expandedPatientId = null,
  onExpandPatient,
  onRegisterWalkIn,
  onOpenEms,
  emsFeedError = '',
  dataQualitySnapshot = null,
  queueAuditSnapshot = null,
  onVerifyPatient,
  onCaptureComplaint,
  onReviewDuplicate,
}) {
  const queues = useMemo(() => selectReceptionQueues(patients), [patients]);

  return (
    <section className="arrival-dashboard" aria-labelledby="arrival-dashboard-title">
      <h2 id="arrival-dashboard-title" className="arrival-dashboard__title">
        {RECEPTION_COPY.queues.sectionTitle}
      </h2>

      <div className="arrival-dashboard__feeds">
        <RecentArrivalsPanel
          patients={queues.recentArrivals}
          onSelectPatient={onSelectPatient}
          onRegisterWalkIn={onRegisterWalkIn}
        />
        <EmsPreArrivalPanel
          arrivals={emsArrivals}
          loading={receptionLoading}
          feedError={emsFeedError}
          canPrepareRegistration={canPrepareRegistration}
          canConvertArrival={canConvertArrival}
          onPrepareRegistration={onPrepareRegistration}
          onConvertArrival={onConvertArrival}
          onRefresh={onRefreshEms}
        />
      </div>

      <ReceptionWorkQueues
        patients={patients}
        activeTab={activeQueueTab}
        dataQualitySnapshot={dataQualitySnapshot}
        queueAuditSnapshot={queueAuditSnapshot}
        onTabChange={onTabChange}
        onOpenVerification={onOpenVerification}
        onOpenPatient={onSelectPatient}
        expandedPatientId={expandedPatientId}
        onExpandPatient={onExpandPatient}
        onRegisterWalkIn={onRegisterWalkIn}
        onOpenEms={onOpenEms}
      />

      <QueueOperationalPanel
        snapshot={queueAuditSnapshot}
        title="Reception queue audit"
        description="Queue length, longest wait, bottlenecks, and overdue patients on reception lists."
        domain={QUEUE_AUDIT_DOMAIN.RECEPTION}
        limit={6}
        className="arrival-dashboard__queue-audit"
      />

      <DataQualityRiskPanel
        snapshot={dataQualitySnapshot}
        title="Registration data quality"
        description="Patients missing demographics, arrival reason, verification, or with possible duplicate matches."
        onVerifyPatient={onVerifyPatient}
        onCaptureComplaint={onCaptureComplaint}
        onReviewDuplicate={onReviewDuplicate}
        className="arrival-dashboard__data-quality"
      />
    </section>
  );
}
