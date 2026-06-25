import React from 'react';
import OperationalEmptyState, { OperationalEmptyAction } from '../ui/OperationalEmptyState';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import { patientLabel } from './receptionQueueModel';
import { RECEPTION_COPY } from './receptionCopy';
import ArrivalControlBadge from './ArrivalControlBadge';
import HighRiskComplaintFlagBadge from './HighRiskComplaintFlagBadge';
import QueueReasonBadge from '../queues/QueueReasonBadge';
import WhatHappensNextBadge from '../guidance/WhatHappensNextBadge';
import TriageBreachBadge from '../triage/TriageBreachBadge';
import { useEmergencyStore } from '../../store/emergencyStore';
import './RecentArrivalsPanel.css';

export default function RecentArrivalsPanel({ patients = [], onSelectPatient, onRegisterWalkIn, settings = null }) {
  const copy = RECEPTION_COPY.recentArrivals;
  const staff = useEmergencyStore((state) => state.staff);
  const referrals = useEmergencyStore((state) => state.referrals);

  return (
    <section className="recent-arrivals" aria-labelledby="recent-arrivals-title">
      <header className="recent-arrivals__header">
        <h2 id="recent-arrivals-title">{copy.title}</h2>
        <p>{copy.subtitle}</p>
      </header>

      {patients.length ? (
        <ul className="recent-arrivals__list">
          {patients.map((patient) => (
            <li key={patient.id}>
              <button
                type="button"
                className="recent-arrivals__item"
                onClick={() => onSelectPatient?.(patient.id)}
              >
                <span className="recent-arrivals__primary">
                  <span>{patientLabel(patient)}</span>
                  <ArrivalControlBadge patient={patient} compact />
                  <HighRiskComplaintFlagBadge patient={patient} compact />
                  <QueueReasonBadge patient={patient} referrals={referrals} staff={staff} compact showAll />
                  <WhatHappensNextBadge patient={patient} referrals={referrals} staff={staff} compact />
                  <TriageBreachBadge patient={patient} settings={settings} compact showElapsed />
                </span>
                <span>{patient.chiefComplaint || patient.complaint || patient.state}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <OperationalEmptyState
          size="inline"
          icon="○"
          title={copy.empty}
          guidance={EMPTY_STATE_COPY.reception.recentArrivals.guidance}
          status="No registrations in the last 30 minutes."
          nextSteps={EMPTY_STATE_COPY.reception.recentArrivals.nextSteps}
          helpTopicId="reception"
          actions={
            onRegisterWalkIn ? (
              <OperationalEmptyAction onClick={onRegisterWalkIn}>Register walk-in</OperationalEmptyAction>
            ) : null
          }
          className="recent-arrivals__empty"
        />
      )}
    </section>
  );
}
