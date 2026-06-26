import React, { useMemo } from 'react';
import { selectReceptionQueues } from './receptionQueueModel';
import ArrivalControlSummaryStrip from './ArrivalControlSummaryStrip';
import EmsPreArrivalPanel from './EmsPreArrivalPanel';
import PreArrivalForm from '../ems/PreArrivalForm';
import RecentArrivalsPanel from './RecentArrivalsPanel';
import ReceptionWorkQueues from './ReceptionWorkQueues';
import DataQualityRiskPanel from '../dataQuality/DataQualityRiskPanel';
import QueueOperationalPanel from '../queues/QueueOperationalPanel';
import TriageBreachPanel from '../triage/TriageBreachPanel';
import { buildQueueAuditSnapshot } from '../../services/queueAuditDiscovery';
import { QUEUE_AUDIT_DOMAIN } from '../../config/queueAuditModel';
import { RECEPTION_COPY } from './receptionCopy';
import { RECEPTION_DESK_UI } from '../../config/receptionDeskUi.config';
import useReceptionDeskUi from '../../hooks/useReceptionDeskUi';
import './ArrivalDashboard.css';

export default function ArrivalDashboard({
  patients = [] as any[],
  emsArrivals = [] as any[],
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
  onPreArrivalSubmitted,
  canSubmitPreArrival = false,
  preArrivalStore = null,
  preArrivalActorName = 'Reception',
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
  settings = null,
  onQueueMetricSelect,
}) {
  const deskUi = useReceptionDeskUi();
  const queues = useMemo(() => selectReceptionQueues(patients), [patients]);
  const showQueueAudit = deskUi.show(RECEPTION_DESK_UI.surfaces.queueAuditPanel);
  const showDataQuality = deskUi.show(RECEPTION_DESK_UI.surfaces.dataQualityPanel);
  const showTabBadges = deskUi.show(RECEPTION_DESK_UI.surfaces.queueTabBadges);

  return (
    <section
      className={`arrival-dashboard${deskUi.slim ? ' arrival-dashboard--desk-slim' : ''}`}
      aria-labelledby="arrival-dashboard-title"
    >
      <h2 id="arrival-dashboard-title" className="arrival-dashboard__title">
        {RECEPTION_COPY.queues.sectionTitle}
      </h2>

      <ArrivalControlSummaryStrip
        patients={patients}
        onMetricSelect={onQueueMetricSelect}
        className="arrival-dashboard__control-summary"
      />

      {preArrivalStore ? (
        <PreArrivalForm
          store={preArrivalStore}
          canSubmit={canSubmitPreArrival}
          actorName={preArrivalActorName}
          notificationSource="call-in"
          onSubmitted={onPreArrivalSubmitted}
          className="arrival-dashboard__pre-arrival-form"
        />
      ) : null}

      <div className="arrival-dashboard__feeds">
        <RecentArrivalsPanel
          patients={queues.recentArrivals}
          onSelectPatient={onSelectPatient}
          onRegisterWalkIn={onRegisterWalkIn}
          settings={settings}
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

      {!deskUi.slim ? (
        <TriageBreachPanel patients={patients} settings={settings} className="arrival-dashboard__triage-breach" />
      ) : null}

      <ReceptionWorkQueues
        patients={patients}
        settings={settings}
        activeTab={activeQueueTab}
        dataQualitySnapshot={dataQualitySnapshot}
        queueAuditSnapshot={queueAuditSnapshot}
        showTabBadges={showTabBadges}
        onTabChange={onTabChange}
        onOpenVerification={onOpenVerification}
        onOpenPatient={onSelectPatient}
        expandedPatientId={expandedPatientId}
        onExpandPatient={onExpandPatient}
        onRegisterWalkIn={onRegisterWalkIn}
        onOpenEms={onOpenEms}
      />

      {showQueueAudit ? (
      <QueueOperationalPanel
        snapshot={queueAuditSnapshot}
        title="Reception queue audit"
        description="Queue length, longest wait, bottlenecks, and overdue patients on reception lists."
        domain={QUEUE_AUDIT_DOMAIN.RECEPTION as any}
        limit={6}
        className="arrival-dashboard__queue-audit"
      />
      ) : null}

      {showDataQuality ? (
      <DataQualityRiskPanel
        snapshot={dataQualitySnapshot}
        title="Registration data quality"
        description="Patients missing demographics, arrival reason, verification, or with possible duplicate matches."
        onVerifyPatient={onVerifyPatient}
        onCaptureComplaint={onCaptureComplaint}
        onReviewDuplicate={onReviewDuplicate}
        className="arrival-dashboard__data-quality"
      />
      ) : null}
    </section>
  );
}
