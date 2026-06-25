import React, { useEffect, useMemo, useState } from 'react';
import { PatientState } from '../../types/emergency';
import useTriageScreen from '../../hooks/useTriageScreen';
import useReceptionScreen from '../../hooks/useReceptionScreen';
import OperationalEmptyState, { OperationalEmptyAction } from '../ui/OperationalEmptyState';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import { RECEPTION_COPY } from './receptionCopy';
import AiTriageAssistPanel from './AiTriageAssistPanel';
import { patientLabel, selectReceptionQueues } from './receptionQueueModel';
import ArrivalControlBadge from './ArrivalControlBadge';
import ReceptionQueueBadgeStack from './ReceptionQueueBadgeStack';
import HighRiskComplaintFlagBadge from './HighRiskComplaintFlagBadge';
import { QueueAuditBadge } from '../queues/QueueOperationalPanel';
import DataQualityRiskBadge from '../dataQuality/DataQualityRiskBadge';
import { buildQueueAuditSnapshot } from '../../services/queueAuditDiscovery';
import { getPatientDataQualityRisks } from '../../services/dataQualityDiscovery';
import { QUEUE_AUDIT_DOMAIN } from '../../config/queueAuditModel';
import { useEmergencyStore } from '../../store/emergencyStore';
import QueueReasonBadge from '../queues/QueueReasonBadge';
import TriageBreachBadge from '../triage/TriageBreachBadge';
import WhatHappensNextBadge from '../guidance/WhatHappensNextBadge';
import DeteriorationWatchBadge from '../waiting-room/DeteriorationWatchBadge';
import FitToWaitBadge from '../waiting-room/FitToWaitBadge';
import PatientExperienceStatusBadge from '../patient-experience/PatientExperienceStatusBadge';
import ReassessmentTimerBadge from '../reassessment/ReassessmentTimerBadge';
import PatientQueueTimingBadge from '../queues/PatientQueueTimingBadge';
import { buildQueueTimingSummary } from '../../services/patientQueueTimingModel';
import useScreenDensityMode from '../../hooks/useScreenDensityMode';
import './ReceptionWorkQueues.css';

export const RECEPTION_QUEUE_TABS = [
  { id: 'ems', label: RECEPTION_COPY.queues.tabs.ems },
  { id: 'verification', label: RECEPTION_COPY.queues.tabs.verification },
  { id: 'pretriage', label: RECEPTION_COPY.queues.tabs.pretriage },
];

const RECEPTION_QUEUE_HELP_TOPIC = {
  ems: 'ems',
  verification: 'reception',
  pretriage: 'reception',
};

export default function ReceptionWorkQueues({
  patients = [],
  activeTab: activeTabProp = 'ems',
  dataQualitySnapshot = null,
  queueAuditSnapshot = null,
  onTabChange,
  onOpenVerification,
  onOpenPatient,
  expandedPatientId = null,
  onExpandPatient,
  onRegisterWalkIn,
  onOpenEms,
  showTabBadges = true,
  settings = null,
}) {
  const [activeTab, setActiveTab] = useState(activeTabProp);
  const reception = useReceptionScreen();
  const triage = useTriageScreen();
  const screenDensity = useScreenDensityMode();
  const queueDensity = screenDensity.queue;
  const canReviewTriage = triage.showClinicalTriageAssist;
  const staff = useEmergencyStore((state) => state.staff);
  const referrals = useEmergencyStore((state) => state.referrals);
  const emsArrivals = useEmergencyStore((state) => state.emsArrivals);

  useEffect(() => {
    setActiveTab(activeTabProp);
  }, [activeTabProp]);

  const queues = useMemo(() => selectReceptionQueues(patients), [patients]);
  const resolvedQueueAudit = useMemo(
    () => queueAuditSnapshot || buildQueueAuditSnapshot({ patients }),
    [patients, queueAuditSnapshot],
  );
  const receptionQueueRows = useMemo(
    () =>
      resolvedQueueAudit.rows.filter((row) => row.domain === QUEUE_AUDIT_DOMAIN.RECEPTION),
    [resolvedQueueAudit.rows],
  );
  const queueRowByTab = useMemo(
    () => Object.fromEntries(receptionQueueRows.map((row) => [row.tab, row])),
    [receptionQueueRows],
  );

  const counts = {
    ems: queues.counts.ems,
    verification: queues.counts.verification,
    pretriage: queues.counts.pretriage,
    rapidReview: queues.counts.rapidReview,
  };

  const activePatients = queues[activeTab] || [];
  const queueTimingSummary = useMemo(
    () => buildQueueTimingSummary(patients, { settings }),
    [patients, settings],
  );
  const emptyCopy = RECEPTION_COPY.queues.empty;
  const queueGuidanceKey = { ems: 'queueEms', verification: 'queueVerification', pretriage: 'queuePretriage' }[
    activeTab
  ];
  const emptyGuidance = queueGuidanceKey ? EMPTY_STATE_COPY.reception[queueGuidanceKey] : null;

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <section className="reception-work-queues" aria-labelledby="reception-work-queues-title">
      <header className="reception-work-queues__header">
        <h2 id="reception-work-queues-title">{RECEPTION_COPY.queues.listsTitle}</h2>
        <p className="reception-work-queues__online-summary" role="status">
          {queueTimingSummary.onlineCount} patient{queueTimingSummary.onlineCount === 1 ? '' : 's'} online
          {queueTimingSummary.dueSoonCount
            ? ` · ${queueTimingSummary.dueSoonCount} due soon`
            : ''}
          {queueTimingSummary.breachedCount
            ? ` · ${queueTimingSummary.breachedCount} overdue`
            : ''}
        </p>
      </header>

      <div className="reception-work-queues__tabs" role="tablist" aria-label="Patient waiting lists">
        {RECEPTION_QUEUE_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={`reception-queue-tab-${tab.id}`}
            aria-selected={activeTab === tab.id}
            aria-controls={`reception-queue-panel-${tab.id}`}
            className={[
              'reception-work-queues__tab',
              activeTab === tab.id ? 'reception-work-queues__tab--active' : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
            <span className="reception-work-queues__count">{counts[tab.id]}</span>
            {tab.id === 'pretriage' && counts.rapidReview > 0 ? (
              <span className="reception-work-queues__rapid-review" title="Rapid review needed">
                {counts.rapidReview} rapid
              </span>
            ) : null}
            {showTabBadges && queueRowByTab[tab.id] ? (
              <QueueAuditBadge row={queueRowByTab[tab.id]} limit={1} />
            ) : null}
          </button>
        ))}
      </div>

      <div
        id={`reception-queue-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`reception-queue-tab-${activeTab}`}
        className={[
          'reception-work-queues__panel',
          queueDensity.compact ? 'reception-work-queues__panel--compact' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {activePatients.length ? (
          <ul className="reception-work-queues__list">
            {activePatients.map((patient) => {
              const qualityRisks = dataQualitySnapshot
                ? getPatientDataQualityRisks(patient, dataQualitySnapshot)
                : [];

              return (
              <li key={patient.id}>
                <button
                  type="button"
                  className="reception-work-queues__item"
                  onClick={() => {
                    if (activeTab === 'pretriage') {
                      onExpandPatient?.(patient.id);
                      onOpenPatient?.(patient.id);
                    } else {
                      onOpenVerification?.(patient.id, activeTab === 'ems' ? patient.emsUnitId : '');
                    }
                  }}
                >
                  <span className="reception-work-queues__primary">
                    <span>
                      {patientLabel(patient)}
                      <ReceptionQueueBadgeStack>
                        {showTabBadges && qualityRisks.length ? (
                          <DataQualityRiskBadge risks={qualityRisks} limit={2} />
                        ) : null}
                        <HighRiskComplaintFlagBadge patient={patient} compact />
                        {queueDensity.showSafetyBadges ? (
                          <>
                            <PatientExperienceStatusBadge
                              patient={patient}
                              referrals={referrals}
                              compact
                              showStaffDetail
                            />
                            <TriageBreachBadge patient={patient} settings={settings} compact showElapsed />
                          </>
                        ) : null}
                        {queueDensity.showQueueReason ? (
                          <QueueReasonBadge patient={patient} referrals={referrals} staff={staff} compact showAll />
                        ) : null}
                        {queueDensity.showSafetyBadges ? (
                          <WhatHappensNextBadge
                            patient={patient}
                            referrals={referrals}
                            staff={staff}
                            compact
                          />
                        ) : null}
                        {queueDensity.showSafetyBadges && activeTab === 'pretriage' ? (
                          <>
                            <DeteriorationWatchBadge
                              patient={patient}
                              emsArrivals={emsArrivals}
                              compact
                            />
                            <FitToWaitBadge patient={patient} compact />
                            <ReassessmentTimerBadge patient={patient} thresholds={settings?.thresholds} />
                          </>
                        ) : null}
                      </ReceptionQueueBadgeStack>
                    </span>
                    <ArrivalControlBadge patient={patient} compact />
                  </span>
                  <span>
                    <PatientQueueTimingBadge
                      patient={patient}
                      settings={settings}
                      layout="row"
                      showOnlineDot
                    />
                  </span>
                </button>
                {activeTab === 'pretriage' &&
                canReviewTriage &&
                expandedPatientId === patient.id ? (
                  <AiTriageAssistPanel
                    patient={patient}
                    compact
                    onEdit={(patientId) => onOpenPatient?.(patientId)}
                  />
                ) : null}
              </li>
            );
            })}
          </ul>
        ) : (
          <OperationalEmptyState
            size="inline"
            icon="○"
            title={emptyCopy[activeTab]}
            guidance={emptyGuidance?.guidance}
            status="Queue is clear for this lane."
            nextSteps={emptyGuidance?.nextSteps || []}
            helpTopicId={RECEPTION_QUEUE_HELP_TOPIC[activeTab] || 'reception'}
            actions={
              <>
                {onRegisterWalkIn ? (
                  <OperationalEmptyAction onClick={onRegisterWalkIn}>
                    Register walk-in
                  </OperationalEmptyAction>
                ) : null}
                {activeTab === 'ems' && onOpenEms ? (
                  <OperationalEmptyAction secondary onClick={onOpenEms}>
                    Open EMS coordination
                  </OperationalEmptyAction>
                ) : null}
              </>
            }
            className="reception-work-queues__empty"
          />
        )}
      </div>
    </section>
  );
}
