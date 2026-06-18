import React, { useEffect, useMemo, useState } from 'react';
import { PatientState } from '../../types/emergency';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import OperationalEmptyState, { OperationalEmptyAction } from '../ui/OperationalEmptyState';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import { RECEPTION_COPY } from './receptionCopy';
import AiTriageAssistPanel from './AiTriageAssistPanel';
import { patientLabel, selectReceptionQueues } from './receptionQueueModel';
import { QueueAuditBadge } from '../queues/QueueOperationalPanel';
import DataQualityRiskBadge from '../dataQuality/DataQualityRiskBadge';
import { buildQueueAuditSnapshot } from '../../services/queueAuditDiscovery';
import { getPatientDataQualityRisks } from '../../services/dataQualityDiscovery';
import { QUEUE_AUDIT_DOMAIN } from '../../config/queueAuditModel';
import './ReceptionWorkQueues.css';

export const RECEPTION_QUEUE_TABS = [
  { id: 'ems', label: RECEPTION_COPY.queues.tabs.ems },
  { id: 'verification', label: RECEPTION_COPY.queues.tabs.verification },
  { id: 'pretriage', label: RECEPTION_COPY.queues.tabs.pretriage },
];

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
}) {
  const [activeTab, setActiveTab] = useState(activeTabProp);
  const emergencyRole = useEmergencyRolePermissions();
  const canReviewTriage = emergencyRole.can(EMERGENCY_ACTIONS.triage);

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
  };

  const activePatients = queues[activeTab] || [];
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
            {queueRowByTab[tab.id] ? (
              <QueueAuditBadge row={queueRowByTab[tab.id]} limit={1} />
            ) : null}
          </button>
        ))}
      </div>

      <div
        id={`reception-queue-panel-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`reception-queue-tab-${activeTab}`}
        className="reception-work-queues__panel"
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
                  <span>
                    {patientLabel(patient)}
                    {qualityRisks.length ? (
                      <DataQualityRiskBadge risks={qualityRisks} limit={2} />
                    ) : null}
                  </span>
                  <span>
                    {activeTab === 'ems'
                      ? patient.emsUnitId || RECEPTION_COPY.queues.rowActionEms
                      : activeTab === 'verification'
                        ? RECEPTION_COPY.queues.rowActionVerify
                        : patient.priority || PatientState.Triage}
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
            actions={
              <>
                {onRegisterWalkIn ? (
                  <OperationalEmptyAction onClick={onRegisterWalkIn}>
                    Register walk-in
                  </OperationalEmptyAction>
                ) : null}
                {activeTab === 'ems' && onOpenEms ? (
                  <OperationalEmptyAction secondary onClick={onOpenEms}>
                    Open EMS Intake
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
