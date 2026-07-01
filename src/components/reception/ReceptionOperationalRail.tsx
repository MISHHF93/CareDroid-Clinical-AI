import { Bell, FolderOpen, Timer } from 'lucide-react';
import type { Alert, Patient } from '../../types/emergency';

export type ReceptionOperationalRailProps = {
  queue: Patient[];
  criticalAlerts: Alert[];
  selectedPatient: Patient | null;
  now: number;
  onSelectPatient: (patientId: string) => void;
  onOpenProfile: (patientId: string) => void;
  patientDisplayName: (patient: Patient) => string;
  queueStatus: (patient: Patient) => string;
  nextStep: (patient: Patient) => string;
  ownerRole: (patient: Patient) => string;
  waitMinutes: (patient: Patient) => number;
  isHighRiskPatient: (patient: Patient) => boolean;
  formatTimer: (alert: Alert, now: number) => string;
  isTimerBreached: (alert: Alert, now: number) => boolean;
  activeQueueTab: string;
  emptyQueueMessage: string;
};

export default function ReceptionOperationalRail({
  queue,
  criticalAlerts,
  selectedPatient,
  now,
  onSelectPatient,
  onOpenProfile,
  patientDisplayName,
  queueStatus,
  nextStep,
  ownerRole,
  waitMinutes,
  isHighRiskPatient,
  formatTimer,
  isTimerBreached,
  activeQueueTab,
  emptyQueueMessage,
}: ReceptionOperationalRailProps) {
  return (
    <aside className="reception-operational-rail" aria-label="Reception operations">
      <section className="reception-command-panel reception-operational-rail__panel" aria-labelledby="queue-title">
        <div className="reception-command-panel__header">
          <h2 id="queue-title">Waiting list</h2>
          <span className="reception-command-chip">{queue.length}</span>
        </div>
        <p className="reception-operational-rail__tab-label" role="status">
          Showing: {activeQueueTab}
        </p>
        <div className="reception-command-queue reception-operational-rail__queue">
          {queue.length ? (
            queue.slice(0, 10).map((patient) => (
              <button
                key={patient.id}
                type="button"
                className={`reception-command-queue-row${isHighRiskPatient(patient) ? ' reception-command-queue-row--risk' : ''}${
                  selectedPatient?.id === patient.id ? ' reception-command-queue-row--selected' : ''
                }`}
                onClick={() => onSelectPatient(patient.id)}
              >
                <span>
                  <strong>{patientDisplayName(patient)}</strong>
                  <small>{patient.chiefComplaint || patient.complaint || 'Complaint pending'}</small>
                </span>
                <span>{queueStatus(patient)}</span>
                <span>{nextStep(patient)}</span>
                <span>{waitMinutes(patient)}m</span>
              </button>
            ))
          ) : (
            <div className="reception-command-empty">{emptyQueueMessage}</div>
          )}
        </div>
        {selectedPatient ? (
          <div className="reception-command-selected" role="status">
            <strong>{patientDisplayName(selectedPatient)}</strong>
            <span>
              {selectedPatient.mrn} · {ownerRole(selectedPatient)}
            </span>
            <button type="button" onClick={() => onOpenProfile(selectedPatient.id)}>
              <FolderOpen size={16} aria-hidden="true" />
              Open profile
            </button>
          </div>
        ) : null}
      </section>

      <section className="reception-command-panel reception-operational-rail__panel" aria-labelledby="alerts-title">
        <div className="reception-command-panel__header">
          <h2 id="alerts-title">Critical alerts</h2>
          <span
            className={
              criticalAlerts.length ? 'reception-command-chip reception-command-chip--critical' : 'reception-command-chip'
            }
          >
            {criticalAlerts.length}
          </span>
        </div>
        <div className="reception-command-alerts">
          {criticalAlerts.length ? (
            criticalAlerts.slice(0, 4).map((alert) => (
              <article
                key={alert.id}
                className={`reception-command-alert${isTimerBreached(alert, now) ? ' reception-command-alert--breached' : ''}`}
              >
                <div>
                  <strong>{alert.title}</strong>
                  <p>{alert.message}</p>
                </div>
                <div className="reception-command-alert__timer" aria-label="3-minute response timer">
                  <Timer size={18} aria-hidden="true" />
                  <span>{formatTimer(alert, now)}</span>
                </div>
              </article>
            ))
          ) : (
            <div className="reception-command-empty">
              <Bell size={20} aria-hidden="true" />
              <span>No active critical alerts.</span>
            </div>
          )}
        </div>
      </section>
    </aside>
  );
}