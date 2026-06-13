import React, { useMemo, useState } from 'react';
import { PatientState, Priority } from '../types/emergency';
import { movePatientToState } from '../../engine/journeyEngine';
import './JourneyTimeline.css';

const STATE_FLOW = Object.values(PatientState);

function formatClock(timestamp) {
  if (!timestamp) return '--';
  return new Intl.DateTimeFormat(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp));
}

function minutesBetween(start, end) {
  if (!start || !end) return null;
  const startMs = new Date(start).getTime();
  const endMs = new Date(end).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs)) return null;
  return Math.max(0, Math.round((endMs - startMs) / 60000));
}

function formatDuration(minutes) {
  if (minutes === null) return '';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return remainder ? `${hours}h ${remainder}m` : `${hours}h`;
}

function terminalTimestamp(patient) {
  const terminalEvent = [...patient.timeline]
    .reverse()
    .find((event) => event.to === patient.state || event.toState === patient.state);
  return (
    terminalEvent?.timestamp ||
    patient.lastAssessedTime ||
    patient.triageTime ||
    patient.arrivalTime
  );
}

function stateTimestamp(patient, state) {
  if (state === PatientState.Arrival) return patient.arrivalTime;
  if (state === PatientState.Triage) return patient.triageTime;
  if (state === patient.state) return terminalTimestamp(patient);

  const event = patient.timeline.find(
    (item) =>
      item.to === state ||
      item.toState === state ||
      item.summary.toLowerCase().includes(`to ${state.toLowerCase()}`)
  );

  return event?.timestamp || null;
}

function priorityClass(priority) {
  if (priority === Priority.P1) return 'journey-timeline--p1';
  if (priority === Priority.P2) return 'journey-timeline--p2';
  if (priority === Priority.P3) return 'journey-timeline--p3';
  if (priority === Priority.P4) return 'journey-timeline--p4';
  return 'journey-timeline--p5';
}

function transitionErrorMessage(error) {
  return error instanceof Error ? error.message : 'Unable to move patient state.';
}

export default function JourneyTimeline({ patient, staffId, onTransitionError, canTransitionState }) {
  const [pendingState, setPendingState] = useState(null);
  const currentIndex = STATE_FLOW.indexOf(patient.state);

  const stateEntries = useMemo(
    () =>
      STATE_FLOW.map((state, index) => ({
        state,
        index,
        timestamp: stateTimestamp(patient, state),
        isComplete: index < currentIndex,
        isCurrent: index === currentIndex,
        isFuture: index > currentIndex,
      })),
    [currentIndex, patient]
  );

  const totalMinutes = minutesBetween(
    patient.arrivalTime,
    patient.state === PatientState.Discharge || patient.state === PatientState.Deceased
      ? terminalTimestamp(patient)
      : new Date().toISOString()
  );

  const confirmMove = () => {
    if (!pendingState) return;
    try {
      movePatientToState(patient.id, pendingState, {
        staffId,
        note: `Moved from JourneyTimeline confirmation to ${pendingState}.`,
      });
      onTransitionError?.('');
      setPendingState(null);
    } catch (error) {
      onTransitionError?.(transitionErrorMessage(error));
    }
  };

  return (
    <div className={`journey-timeline ${priorityClass(patient.priority)}`}>
      <div className="journey-timeline__scroller" aria-label="Patient journey timeline">
        {stateEntries.map((entry, index) => {
          const previous = stateEntries[index - 1];
          const connectorSolid =
            previous &&
            (previous.isComplete || previous.isCurrent) &&
            (entry.isComplete || entry.isCurrent);
          const duration =
            previous?.isComplete && entry.isComplete
              ? formatDuration(minutesBetween(previous.timestamp, entry.timestamp))
              : '';

          return (
            <React.Fragment key={entry.state}>
              {previous ? (
                <div
                  className={`journey-timeline__connector${
                    connectorSolid ? ' journey-timeline__connector--solid' : ''
                  }`}
                  aria-hidden
                >
                  {duration ? <span>{duration}</span> : null}
                </div>
              ) : null}
              <button
                type="button"
                className={[
                  'journey-timeline__node',
                  entry.isComplete ? 'journey-timeline__node--complete' : '',
                  entry.isCurrent ? 'journey-timeline__node--current' : '',
                  entry.isFuture ? 'journey-timeline__node--future' : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  entry.isFuture && canTransitionState?.(entry.state) !== false
                    ? setPendingState(entry.state)
                    : null
                }
                disabled={!entry.isFuture || canTransitionState?.(entry.state) === false}
              >
                <span className="journey-timeline__dot" />
                <strong>{entry.state}</strong>
                <small>
                  {entry.isCurrent
                    ? 'NOW'
                    : entry.isComplete
                      ? formatClock(entry.timestamp)
                      : 'Future'}
                </small>
              </button>
            </React.Fragment>
          );
        })}
        <div className="journey-timeline__total">
          <span>Total</span>
          <strong>{formatDuration(totalMinutes)}</strong>
        </div>
      </div>

      {pendingState ? (
        <div className="journey-timeline__confirm" role="status">
          <span>Move to {pendingState}?</span>
          <button type="button" onClick={confirmMove}>
            Confirm
          </button>
          <button type="button" onClick={() => setPendingState(null)}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}
