import { useMemo } from 'react';
import type { Patient } from '../../types/emergency';
import {
  resolveReceptionQueueRowModel,
  type ReceptionQueueRowAction,
} from './receptionAttentionModel';
import ReceptionAttentionStrip from './ReceptionAttentionStrip';
import type { ReceptionAttentionRow, ReceptionAttentionSnapshot } from './receptionAttentionModel';

/** "578" -> "9h 38m" so long waits read as a duration, not a raw minute count. */
function formatWaitDisplay(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes < 60) return `${Math.max(0, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

export type ReceptionOperationalRailProps = {
  queue: Patient[];
  attention: ReceptionAttentionSnapshot;
  selectedPatient: Patient | null;
  onSelectPatient: (patientId: string) => void;
  onAttentionSelect: (row: ReceptionAttentionRow) => void;
  onRowAction: (patientId: string, action: ReceptionQueueRowAction) => void;
  patientDisplayName: (patient: Patient) => string;
  queueStatus: (patient: Patient) => string;
  nextStep: (patient: Patient) => string;
  waitMinutes: (patient: Patient) => number;
  isHighRiskPatient: (patient: Patient) => boolean;
  activeQueueTab: string;
  emptyQueueMessage: string;
};

export default function ReceptionOperationalRail({
  queue,
  attention,
  selectedPatient,
  onSelectPatient,
  onAttentionSelect,
  onRowAction,
  patientDisplayName,
  queueStatus,
  nextStep,
  waitMinutes,
  isHighRiskPatient,
  activeQueueTab,
  emptyQueueMessage,
}: ReceptionOperationalRailProps) {
  const rowModels = useMemo(
    () =>
      queue.slice(0, 12).map((patient) => ({
        patient,
        model: resolveReceptionQueueRowModel({
          patientId: patient.id,
          isHighRisk: isHighRiskPatient(patient),
          registrationStatus: patient.registrationStatus,
          triagePending: patient.triagePending,
          state: patient.state,
        }),
      })),
    [isHighRiskPatient, queue],
  );

  return (
    <aside
      data-testid="reception-operational-rail"
      className="reception-operational-rail"
      aria-label="Reception operations"
    >
      <ReceptionAttentionStrip snapshot={attention} onSelectRow={onAttentionSelect} />

      <section
        className="reception-command-panel reception-operational-rail__panel"
        aria-labelledby="queue-title"
      >
        <div className="reception-command-panel__header">
          <h2 id="queue-title">Waiting list</h2>
          <span className="reception-command-chip">{queue.length}</span>
        </div>
        <p className="reception-operational-rail__tab-label" role="status">
          Showing: {activeQueueTab}
        </p>
        <div className="reception-command-queue reception-operational-rail__queue" role="list">
          {rowModels.length ? (
            rowModels.map(({ patient, model }) => {
              const selected = selectedPatient?.id === patient.id;
              return (
                <div
                  key={patient.id}
                  role="listitem"
                  className={[
                    'reception-command-queue-row',
                    'reception-queue-row',
                    model.riskTone === 'critical' ? 'reception-command-queue-row--risk' : '',
                    model.riskTone === 'warning' ? 'reception-queue-row--warning' : '',
                    selected ? 'reception-command-queue-row--selected' : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <button
                    type="button"
                    className="reception-queue-row__select"
                    onClick={() => onSelectPatient(patient.id)}
                    aria-pressed={selected ? 'true' : 'false'}
                    aria-label={`${patientDisplayName(patient)}, ${queueStatus(patient)}, ${waitMinutes(patient)} minutes, next ${nextStep(patient)}`}
                  >
                    <span className="reception-queue-row__who">
                      <strong>{patientDisplayName(patient)}</strong>
                      <small
                        title={patient.chiefComplaint || patient.complaint || 'Complaint pending'}
                      >
                        {patient.chiefComplaint || patient.complaint || 'Complaint pending'}
                      </small>
                    </span>
                    <span className="reception-queue-row__meta">
                      <span
                        className={`reception-queue-row__chip reception-queue-row__chip--${model.riskTone}`}
                        data-tone={model.riskTone === 'neutral' ? 'neutral' : model.riskTone}
                      >
                        {model.riskLabel}
                      </span>
                      <span className="reception-queue-row__status" title={queueStatus(patient)}>
                        {queueStatus(patient)}
                      </span>
                    </span>
                    <span className="reception-queue-row__wait">
                      Wait {formatWaitDisplay(waitMinutes(patient))}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`reception-queue-row__cta${
                      model.primaryAction === 'escalate'
                        ? ' reception-queue-row__cta--critical'
                        : ''
                    }`}
                    onClick={(event) => {
                      event.stopPropagation();
                      onRowAction(patient.id, model.primaryAction);
                    }}
                  >
                    {model.primaryLabel}
                  </button>
                </div>
              );
            })
          ) : (
            <div className="reception-command-empty">{emptyQueueMessage}</div>
          )}
        </div>
      </section>
    </aside>
  );
}
