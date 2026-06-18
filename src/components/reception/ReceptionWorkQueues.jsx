import React, { useEffect, useMemo, useState } from 'react';
import { PatientState } from '../../types/emergency';
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
}) {
  const [activeTab, setActiveTab] = useState(activeTabProp);

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
        <h2 id="reception-work-queues-title">Registration queues</h2>
        <p>Verification, triage handoff, and EMS registration cards in one place.</p>
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
                    if (activeTab === 'pretriage') onOpenPatient?.(patient.id);
                    else onOpenVerification?.(patient.id, activeTab === 'ems' ? patient.emsUnitId : '');
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
