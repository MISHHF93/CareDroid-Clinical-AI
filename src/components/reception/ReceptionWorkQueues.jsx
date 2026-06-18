import React, { useEffect, useMemo, useState } from 'react';
import { PatientState } from '../../types/emergency';
import { EMERGENCY_ACTIONS } from '../../config/emergencyRolePermissions';
import { useEmergencyRolePermissions } from '../../hooks/useEmergencyRolePermissions';
import AiTriageAssistPanel from './AiTriageAssistPanel';
import { patientLabel, selectReceptionQueues } from './receptionQueueModel';
import './ReceptionWorkQueues.css';

export const RECEPTION_QUEUE_TABS = [
  { id: 'ems', label: 'EMS registration' },
  { id: 'verification', label: 'Verification' },
  { id: 'pretriage', label: 'Awaiting triage' },
];

export default function ReceptionWorkQueues({
  patients = [],
  activeTab: activeTabProp = 'ems',
  onTabChange,
  onOpenVerification,
  onOpenPatient,
  expandedPatientId = null,
  onExpandPatient,
}) {
  const [activeTab, setActiveTab] = useState(activeTabProp);
  const emergencyRole = useEmergencyRolePermissions();
  const canReviewTriage = emergencyRole.can(EMERGENCY_ACTIONS.triage);

  useEffect(() => {
    setActiveTab(activeTabProp);
  }, [activeTabProp]);

  const queues = useMemo(() => selectReceptionQueues(patients), [patients]);

  const counts = {
    ems: queues.counts.ems,
    verification: queues.counts.verification,
    pretriage: queues.counts.pretriage,
  };

  const activePatients = queues[activeTab] || [];
  const emptyCopy = {
    ems: 'No EMS patients awaiting registration.',
    verification: 'No patients awaiting verification.',
    pretriage: 'No patients awaiting triage.',
  };

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <section className="reception-work-queues" aria-labelledby="reception-work-queues-title">
      <header className="reception-work-queues__header">
        <h2 id="reception-work-queues-title">Work queues</h2>
      </header>

      <div className="reception-work-queues__tabs" role="tablist" aria-label="Registration queue views">
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
            {activePatients.map((patient) => (
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
                  <span>{patientLabel(patient)}</span>
                  <span>
                    {activeTab === 'ems'
                      ? patient.emsUnitId || 'EMS card'
                      : activeTab === 'verification'
                        ? 'Verify'
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
            ))}
          </ul>
        ) : (
          <p className="reception-work-queues__empty">{emptyCopy[activeTab]}</p>
        )}
      </div>
    </section>
  );
}
