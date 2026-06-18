import React from 'react';
import OperationalEmptyState, { OperationalEmptyAction } from '../ui/OperationalEmptyState';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import { patientLabel } from './receptionQueueModel';
import { RECEPTION_COPY } from './receptionCopy';
import './RecentArrivalsPanel.css';

export default function RecentArrivalsPanel({ patients = [], onSelectPatient, onRegisterWalkIn }) {
  const copy = RECEPTION_COPY.recentArrivals;

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
                <span>{patientLabel(patient)}</span>
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
