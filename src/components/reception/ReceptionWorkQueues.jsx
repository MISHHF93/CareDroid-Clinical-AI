import React, { useEffect, useMemo, useState } from 'react';
import { PatientFlag, PatientState } from '../../types/emergency';
import './ReceptionWorkQueues.css';

function patientLabel(patient) {
  const name = [patient.firstName, patient.lastName].filter(Boolean).join(' ').trim();
  return name || patient.name || patient.mrn || 'Unknown patient';
}

function isEmsRegistrationPatient(patient) {
  return patient.flags?.some((flag) =>
    typeof flag === 'string' ? flag === PatientFlag.EMSArrival : flag?.type === PatientFlag.EMSArrival,
  );
}

export const RECEPTION_QUEUE_TABS = [
  { id: 'ems', label: 'EMS registration' },
  { id: 'verification', label: 'Verification' },
  { id: 'pretriage', label: 'Pre-triage' },
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

  const queues = useMemo(() => {
    const emsRegistration = patients
      .filter(
        (patient) =>
          isEmsRegistrationPatient(patient) &&
          (patient.state === PatientState.Registration || patient.state === PatientState.Arrival),
      )
      .sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime())
      .slice(0, 8);

    const verification = patients
      .filter(
        (patient) =>
          patient.state === PatientState.Registration && !isEmsRegistrationPatient(patient),
      )
      .sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime())
      .slice(0, 8);

    const preTriage = patients
      .filter((patient) => patient.state === PatientState.Triage)
      .sort((a, b) => new Date(b.arrivalTime).getTime() - new Date(a.arrivalTime).getTime())
      .slice(0, 8);

    return { ems: emsRegistration, verification, pretriage: preTriage };
  }, [patients]);

  const counts = {
    ems: queues.ems.length,
    verification: queues.verification.length,
    pretriage: queues.pretriage.length,
  };

  const activePatients = queues[activeTab] || [];
  const emptyCopy = {
    ems: 'No EMS patients awaiting registration.',
    verification: 'No patients awaiting verification.',
    pretriage: 'No patients in pre-triage queue.',
  };

  const selectTab = (tabId) => {
    setActiveTab(tabId);
    onTabChange?.(tabId);
  };

  return (
    <section className="reception-work-queues" aria-labelledby="reception-work-queues-title">
      <header className="reception-work-queues__header">
        <h2 id="reception-work-queues-title">Registration queues</h2>
        <p>Work the next patient card without leaving the arrival dashboard.</p>
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
                        : patient.priority || 'Triage'}
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
