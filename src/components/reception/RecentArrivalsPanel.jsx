import React from 'react';
import { patientLabel } from './receptionQueueModel';
import './RecentArrivalsPanel.css';

export default function RecentArrivalsPanel({ patients = [], onSelectPatient }) {
  return (
    <section className="recent-arrivals" aria-labelledby="recent-arrivals-title">
      <header className="recent-arrivals__header">
        <h2 id="recent-arrivals-title">Recent arrivals</h2>
        <p>Patients who arrived in the last 30 minutes.</p>
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
        <p className="recent-arrivals__empty">No arrivals in the last 30 minutes.</p>
      )}
    </section>
  );
}
