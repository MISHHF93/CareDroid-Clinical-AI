import React, { useMemo } from 'react';
import OperationalEmptyState from '../ui/OperationalEmptyState';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import {
  buildWaitingRoomSafetyBoard,
  shouldShowWaitingRoomSafetyBoard,
} from './waitingRoomSafetyBoardModel';
import FitToWaitClassificationSelect from '../waiting-room/FitToWaitClassificationSelect';
import LwbsRiskBadge from '../waiting-room/LwbsRiskBadge';
import DeteriorationWatchBadge from '../waiting-room/DeteriorationWatchBadge';
import PatientExperienceStatusBadge from '../patient-experience/PatientExperienceStatusBadge';
import QueueReasonBadge from '../queues/QueueReasonBadge';
import HighRiskComplaintFlagBadge from '../reception/HighRiskComplaintFlagBadge';
import ReassessmentTimerBadge from '../reassessment/ReassessmentTimerBadge';
import ReassessmentTimerStrip from '../reassessment/ReassessmentTimerStrip';
import WaitingRoomSafetyEscalationStrip from '../waiting-room/WaitingRoomSafetyEscalationStrip';
import WaitingRoomStatusMessagingStrip from '../patient-experience/WaitingRoomStatusMessagingStrip';
import './WaitingRoomSafetyBoard.css';

function StatusBadge({ label, tone = 'neutral', title = undefined }: { label?: any; tone?: any; title?: string | undefined }) {
  if (!label || label === '—') return <span className="waiting-room-safety-board__muted">—</span>;
  return (
    <span
      className="waiting-room-safety-board__badge"
      data-tone={tone}
      title={title || label}
    >
      {label}
    </span>
  );
}

function FlagList({ patient, flags = [] as any[] }) {
  if (patient) {
    return <HighRiskComplaintFlagBadge patient={patient} compact />;
  }
  if (!flags.length) {
    return <span className="waiting-room-safety-board__muted">None</span>;
  }
  return (
    <span className="waiting-room-safety-board__flags">
      {flags.map((flag) => (
        <span key={flag} className="waiting-room-safety-board__flag">
          {flag}
        </span>
      ))}
    </span>
  );
}

export default function WaitingRoomSafetyBoard({
  patients = ([] as any[]),
  staff = ([] as any[]),
  referrals = ([] as any[]),
  emsArrivals = ([] as any[]),
  workflowLogs = ([] as any[]),
  alerts = ([] as any[]),
  capacity = (null as any),
  activeQueueFilter = (null as any),
  settings = (null as any),
  displayMode = false,
  readOnly = false,
  variant = 'full',
  onSelectPatient,
  onOpenReassessment,
  onClassifyFitToWait,
  className = '',
}) {
  const board = useMemo(
    () => buildWaitingRoomSafetyBoard(patients, { staff, referrals, emsArrivals, settings, workflowLogs }),
    [patients, referrals, staff, emsArrivals, settings, workflowLogs],
  );

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [patient.id, patient])),
    [patients],
  );

  const visible = shouldShowWaitingRoomSafetyBoard({
    waitingPatientCount: board.summary.patientCount,
    displayMode,
    activeQueueFilter,
  });

  if (!visible) return null;

  const focused = variant === 'focused';

  return (
    <section
      className={[
        'waiting-room-safety-board',
        focused ? 'waiting-room-safety-board--focused' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-labelledby="waiting-room-safety-board-title"
    >
      <header className="waiting-room-safety-board__header">
        <div>
          <p className="waiting-room-safety-board__eyebrow">Waiting room safety</p>
          <h2 id="waiting-room-safety-board-title">Waiting Room Safety Board</h2>
          <p className="waiting-room-safety-board__subtitle">
            {focused
              ? 'Post-triage waiting patients — arrival, acuity, vitals, reassessment, fit-to-wait seating, provider and test status.'
              : 'Post-triage waiting patients with vitals, reassessment, provider, test status, and fit-to-sit / fit-to-wait seating review.'}
          </p>
        </div>
        <div className="waiting-room-safety-board__summary" aria-label="Waiting room safety summary">
          <span data-tone={board.summary.criticalSafety ? 'critical' : 'stable'}>
            <strong>{board.summary.patientCount}</strong>
            <small>Waiting</small>
          </span>
          <span data-tone={board.summary.overdueReassessment ? 'critical' : 'stable'}>
            <strong>{board.summary.overdueReassessment}</strong>
            <small>Reassess overdue</small>
          </span>
          <span data-tone={board.summary.staleVitals ? 'warning' : 'stable'}>
            <strong>{board.summary.staleVitals}</strong>
            <small>Stale vitals</small>
          </span>
          <span data-tone={board.summary.awaitingProvider ? 'warning' : 'stable'}>
            <strong>{board.summary.awaitingProvider}</strong>
            <small>Awaiting provider</small>
          </span>
          <span data-tone={board.summary.fitToWaitUnclassified ? 'warning' : 'stable'}>
            <strong>{board.summary.fitToWaitUnclassified}</strong>
            <small>Seating review</small>
          </span>
          <span data-tone={board.summary.providerWaitBreachedCount ? 'critical' : board.summary.providerWaitApproachingCount ? 'warning' : 'stable'}>
            <strong>{board.summary.providerWaitBreachedCount}</strong>
            <small>Provider breached</small>
          </span>
          <span data-tone={board.summary.providerWaitApproachingCount ? 'warning' : 'stable'}>
            <strong>{board.summary.providerWaitApproachingCount}</strong>
            <small>Provider approaching</small>
          </span>
          <span data-tone={board.summary.providerWaitHighRiskExceptionCount ? 'watch' : 'stable'}>
            <strong>{board.summary.providerWaitHighRiskExceptionCount}</strong>
            <small>Provider HR exceptions</small>
          </span>
          <span data-tone={board.summary.deteriorationWatchUrgent ? 'critical' : board.summary.deteriorationWatchReview ? 'warning' : 'stable'}>
            <strong>{board.summary.deteriorationWatchActive}</strong>
            <small>Deterioration watch</small>
          </span>
          <span data-tone={board.summary.lwbsRiskElevated ? 'critical' : board.summary.lwbsRiskHigh ? 'warning' : 'stable'}>
            <strong>{board.summary.lwbsRiskElevated + board.summary.lwbsRiskHigh}</strong>
            <small>LWBS advisory</small>
          </span>
          <span data-tone={board.summary.communicationOverdueCount ? 'critical' : board.summary.communicationStaleCount ? 'warning' : 'stable'}>
            <strong>{board.summary.communicationOverdueCount + board.summary.communicationStaleCount}</strong>
            <small>Stale contact</small>
          </span>
          <span data-tone={board.summary.fitToWaitImmediateRoom ? 'critical' : 'stable'}>
            <strong>{board.summary.fitToWaitImmediateRoom}</strong>
            <small>Room needed</small>
          </span>
        </div>
      </header>

      <WaitingRoomSafetyEscalationStrip
        patients={patients}
        workflowLogs={workflowLogs}
        staff={staff}
        alerts={alerts}
        onSelectPatient={onSelectPatient}
        className="waiting-room-safety-board__escalation-strip"
      />
      <WaitingRoomStatusMessagingStrip
        patients={patients}
        referrals={referrals}
        capacity={capacity}
        audience="staff"
        className="waiting-room-safety-board__status-strip"
      />

      {board.rows.length ? (
        <div className="waiting-room-safety-board__table-wrap">
          <table className="waiting-room-safety-board__table">
            <thead>
              <tr>
                <th scope="col">Patient</th>
                <th scope="col">Arrival</th>
                <th scope="col">Triage</th>
                <th scope="col">Complaint</th>
                <th scope="col">Waiting</th>
                {!focused ? <th scope="col">Last nurse</th> : null}
                <th scope="col">Staff contact</th>
                <th scope="col">Last vitals</th>
                <th scope="col">Last reassess</th>
                {!focused ? <th scope="col">Due</th> : null}
                <th scope="col">Overdue</th>
                <th scope="col">Provider</th>
                <th scope="col">Tests</th>
                <th scope="col">Fit / wait</th>
                <th scope="col">Experience</th>
                <th scope="col">Queue reason</th>
                {!focused ? <th scope="col">Next step</th> : null}
                <th scope="col">LWBS · advisory</th>
                <th scope="col">Deterioration · advisory</th>
                <th scope="col">Risk flags</th>
                {focused ? <th scope="col">Timers</th> : null}
              </tr>
            </thead>
            <tbody>
              {board.rows.map((row) => {
                const patient = patientById.get(row.patientId);
                return (
                <tr key={row.patientId} data-safety-tone={row.safetyTone}>
                  <th scope="row">
                    <button
                      type="button"
                      className="waiting-room-safety-board__patient"
                      onClick={() => onSelectPatient?.(row.patientId)}
                      disabled={readOnly || !onSelectPatient}
                    >
                      {row.displayName}
                    </button>
                  </th>
                  <td>{row.arrivalTimeLabel}</td>
                  <td>{row.triageLevel || '—'}</td>
                  <td className="waiting-room-safety-board__complaint">{row.presentingComplaint}</td>
                  <td>
                    <StatusBadge
                      label={row.waitingDurationLabel}
                      tone={row.waitingMinutes >= 45 ? 'warning' : 'neutral'}
                    />
                  </td>
                  {!focused ? (
                  <td>
                    <StatusBadge label={row.timer.lastNurseContactAgeLabel} tone="neutral" />
                  </td>
                  ) : null}
                  <td>
                    <StatusBadge
                      label={row.communicationRecencyLabel}
                      tone={
                        row.communicationRecencyTone === 'critical'
                          ? 'critical'
                          : row.communicationRecencyTone === 'warning'
                            ? 'warning'
                            : row.communicationRecencyTone === 'watch'
                              ? 'info'
                              : 'neutral'
                      }
                      title={row.communicationStaffDetail}
                    />
                  </td>
                  <td>
                    <StatusBadge
                      label={row.vitalsAgeLabel}
                      tone={row.vitalsAgeMinutes >= 30 ? 'warning' : 'neutral'}
                    />
                  </td>
                  <td>
                    <StatusBadge
                      label={row.reassessmentAgeLabel}
                      tone={row.reassessmentOverdue ? 'critical' : 'neutral'}
                    />
                  </td>
                  {!focused ? (
                  <td>
                    <StatusBadge
                      label={row.timer.dueInLabel}
                      tone={row.timer.stage === 'due' ? 'warning' : 'neutral'}
                    />
                  </td>
                  ) : null}
                  <td>
                    <span className="waiting-room-safety-board__reassess-cell">
                      {row.reassessmentOverdue && patient ? (
                        <ReassessmentTimerBadge patient={patient} thresholds={settings?.thresholds} />
                      ) : null}
                      {row.reassessmentOverdue ? (
                        <button
                          type="button"
                          className="waiting-room-safety-board__overdue-badge"
                          onClick={() => onOpenReassessment?.(row.patientId)}
                          disabled={readOnly || !onOpenReassessment}
                          title="Open reassessment workflow"
                        >
                          Overdue
                        </button>
                      ) : (
                        <span className="waiting-room-safety-board__muted">—</span>
                      )}
                    </span>
                  </td>
                  <td>
                    <StatusBadge label={row.providerWaitingStatus} tone={row.providerWaitingTone} />
                  </td>
                  <td>
                    <StatusBadge
                      label={row.testWaitingStatus}
                      tone={row.testWaitingTone}
                      title={row.testWaitingStatus === 'No tests ordered' ? undefined : row.testWaitingStatus}
                    />
                  </td>
                  <td>
                    <FitToWaitClassificationSelect
                      patient={patient}
                      readOnly={readOnly}
                      compact
                      onClassify={onClassifyFitToWait}
                    />
                  </td>
                  <td>
                    {patient ? (
                      <PatientExperienceStatusBadge
                        patient={patient}
                        referrals={referrals}
                        compact
                        showStaffDetail
                      />
                    ) : (
                      <StatusBadge
                        label={row.experienceStatusLabel}
                        tone={row.experienceStatusTone === 'stable' ? 'info' : row.experienceStatusTone}
                        title={row.experienceStaffDetail}
                      />
                    )}
                  </td>
                  <td>
                    {patient ? (
                      <QueueReasonBadge
                        patient={patient}
                        referrals={referrals}
                        staff={staff}
                        compact
                        showAll
                      />
                    ) : row.queueReasonPrimaryLabel ? (
                      <StatusBadge
                        label={row.queueReasonPrimaryLabel}
                        tone={
                          row.queueReasonPrimaryId === 'verification-incomplete' ||
                          row.queueReasonPrimaryId === 'triage-pending' ||
                          row.queueReasonPrimaryId === 'provider-pending'
                            ? 'warning'
                            : row.queueReasonPrimaryId === 'discharge-paperwork-pending' ||
                                row.queueReasonPrimaryId === 'admission-bed-pending'
                              ? 'info'
                              : 'info'
                        }
                        title={[
                          row.queueReasonPrimaryLabel,
                          row.queueReasonStaffDetail,
                          row.queueReasonLabels.length > 1
                            ? `Also: ${row.queueReasonLabels.slice(1).join(', ')}`
                            : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    ) : (
                      <span className="waiting-room-safety-board__muted">—</span>
                    )}
                  </td>
                  {!focused ? (
                  <td>
                    {row.nextStepLabel ? (
                      <StatusBadge
                        label={row.nextStepShortLabel || row.nextStepLabel}
                        tone={
                          row.nextStepTone === 'critical'
                            ? 'critical'
                            : row.nextStepTone === 'watch'
                              ? 'warning'
                              : 'info'
                        }
                        title={[row.nextStepLabel, row.nextStepGuidance, row.nextStepStaffDetail]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    ) : (
                      <span className="waiting-room-safety-board__muted">—</span>
                    )}
                  </td>
                  ) : null}
                  <td>
                    {patient ? (
                      <LwbsRiskBadge
                        patient={patient}
                        waitingPatientCount={board.summary.patientCount}
                        compact
                      />
                    ) : row.lwbsRiskLabel ? (
                      <StatusBadge
                        label={`${row.lwbsRiskShortLabel || row.lwbsRiskLabel} · advisory`}
                        tone={
                          row.lwbsRiskTone === 'critical'
                            ? 'critical'
                            : row.lwbsRiskTone === 'watch'
                              ? 'warning'
                              : 'info'
                        }
                        title={[row.lwbsRiskLabel, row.lwbsRiskStaffDetail, row.lwbsRiskScore ? `Score ${row.lwbsRiskScore}/100` : null]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    ) : (
                      <span className="waiting-room-safety-board__muted">—</span>
                    )}
                  </td>
                  <td>
                    {patient ? (
                      <DeteriorationWatchBadge patient={patient} emsArrivals={emsArrivals} compact />
                    ) : row.deteriorationWatchLabel ? (
                      <StatusBadge
                        label={`${row.deteriorationWatchShortLabel || row.deteriorationWatchLabel} · advisory`}
                        tone={
                          row.deteriorationWatchTone === 'critical'
                            ? 'critical'
                            : row.deteriorationWatchTone === 'watch'
                              ? 'warning'
                              : 'info'
                        }
                        title={[row.deteriorationWatchLabel, row.deteriorationWatchStaffDetail]
                          .filter(Boolean)
                          .join(' · ')}
                      />
                    ) : (
                      <span className="waiting-room-safety-board__muted">—</span>
                    )}
                  </td>
                  <td>
                    <FlagList patient={patient} flags={row.highRiskFlags} />
                  </td>
                  {focused ? (
                    <td>
                      <ReassessmentTimerStrip timer={row.timer} showDueTimes />
                    </td>
                  ) : null}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <OperationalEmptyState
          size="inline"
          icon="✓"
          title="Waiting room clear"
          guidance={EMPTY_STATE_COPY.reception?.recentArrivals?.guidance || 'No patients are waiting post-triage.'}
          status="All waiting-room safety signals are within target."
          className="waiting-room-safety-board__empty"
        />
      )}
    </section>
  );
}
