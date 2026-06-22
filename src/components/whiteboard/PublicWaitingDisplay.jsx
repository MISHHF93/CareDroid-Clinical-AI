import React from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { resolveOperationalPresentation } from '../../config/emergencyOperationalPresentationModel';
import OperationalPresentationFrame from '../emergency/OperationalPresentationFrame';
import './PublicWaitingDisplay.css';

function formatUpdatedAt(timestamp) {
  if (!timestamp) return '—';
  try {
    return new Date(timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '—';
  }
}

export default function PublicWaitingDisplay({
  snapshot,
  title = 'Emergency waiting room',
  refreshIntervalMs = 30000,
  showWaitRange = true,
  showCrowdLevel = true,
  showTriageWait = true,
  showCareProcessStages = true,
  showPatientGuidance = true,
  showSymptomEscalation = true,
  className = '',
}) {
  if (!snapshot) return null;

  const presentation = resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.publicWaiting);

  const hasPrimaryTiles =
    (showWaitRange && snapshot.waitRange) ||
    (showCrowdLevel && snapshot.crowdLevel) ||
    (showTriageWait && snapshot.triageWait);

  return (
    <OperationalPresentationFrame
      screenMode={CARE_DROID_SCREEN_MODES.publicWaiting}
      as="section"
      className={['public-waiting-display', className].filter(Boolean).join(' ')}
      aria-label="Emergency waiting room public information"
    >
      <header className="public-waiting-display__header">
        <div>
          <p className="public-waiting-display__eyebrow">{presentation.pageEyebrow}</p>
          <h2>{title || presentation.pageTitle}</h2>
          <p className="public-waiting-display__subtitle">{presentation.pageSubtitle}</p>
        </div>
        <div className="public-waiting-display__meta">
          <span>Updated {formatUpdatedAt(snapshot.updatedAt)}</span>
          <span>Refresh every {Math.round(refreshIntervalMs / 1000)}s</span>
        </div>
      </header>

      <p className="public-waiting-display__summary" role="status">
        {snapshot.summaryLine}
      </p>

      {hasPrimaryTiles ? (
        <div className="public-waiting-display__grid">
          {showWaitRange ? (
            <article className="public-waiting-display__tile" data-tone="info" aria-label={snapshot.waitRange.label}>
              <strong className="public-waiting-display__value">{snapshot.waitRange.value}</strong>
              <span className="public-waiting-display__label">{snapshot.waitRange.label}</span>
              <small className="public-waiting-display__detail">{snapshot.waitRange.detail}</small>
            </article>
          ) : null}
          {showCrowdLevel ? (
            <article
              className="public-waiting-display__tile"
              data-tone={snapshot.crowdLevel.tone}
              aria-label={`Current crowd level: ${snapshot.crowdLevel.label}`}
            >
              <strong className="public-waiting-display__value">{snapshot.crowdLevel.label}</strong>
              <span className="public-waiting-display__label">Current crowd level</span>
              <small className="public-waiting-display__detail">{snapshot.crowdLevel.detail}</small>
            </article>
          ) : null}
          {showTriageWait ? (
            <article
              className="public-waiting-display__tile"
              data-tone={snapshot.triageWait.available ? 'watch' : 'stable'}
              aria-label={snapshot.triageWait.label}
            >
              <strong className="public-waiting-display__value">{snapshot.triageWait.value}</strong>
              <span className="public-waiting-display__label">{snapshot.triageWait.label}</span>
              <small className="public-waiting-display__detail">{snapshot.triageWait.detail}</small>
            </article>
          ) : null}
        </div>
      ) : null}

      {showCareProcessStages && snapshot.statusMessaging?.statusLines?.length ? (
        <section className="public-waiting-display__stages" aria-label="Waiting room status messages">
          <h3>Where patients are in their visit</h3>
          <p className="public-waiting-display__stages-note">
            General status messages only — counts, no names or clinical details
          </p>
          <ol className="public-waiting-display__stage-list">
            {snapshot.statusMessaging.statusLines.map((line) => (
              <li key={line.id}>
                <span className="public-waiting-display__stage-label">{line.message}</span>
                <span className="public-waiting-display__stage-count" aria-hidden="true">
                  {line.count}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : showCareProcessStages && snapshot.careStages.length ? (
        <section className="public-waiting-display__stages" aria-label="Care process stages">
          <h3>Care process stages</h3>
          <p className="public-waiting-display__stages-note">
            Where patients are in the emergency visit — counts only, no identifiers
          </p>
          <ol className="public-waiting-display__stage-list">
            {snapshot.careStages.map((stage) => (
              <li key={stage.id}>
                <span className="public-waiting-display__stage-label">{stage.label}</span>
                <span className="public-waiting-display__stage-count" aria-hidden="true">
                  {stage.count}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : null}

      {showSymptomEscalation && snapshot.statusMessaging?.advisories?.length ? (
        <section className="public-waiting-display__advisories" aria-label="Waiting room advisories">
          {snapshot.statusMessaging.advisories.map((line) => (
            <aside
              key={line.id}
              className="public-waiting-display__escalation"
              data-tone={line.tone}
              role="note"
            >
              <strong>{line.kind === 'safety' ? 'Important' : 'Notice'}</strong>
              <p>{line.message}</p>
            </aside>
          ))}
        </section>
      ) : null}

      {showPatientGuidance && snapshot.guidanceMessages.length ? (
        <section className="public-waiting-display__guidance" aria-label="Patient guidance">
          <h3>While you wait</h3>
          <ul>
            {snapshot.guidanceMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showSymptomEscalation && !snapshot.statusMessaging?.advisories?.length ? (
        <aside
          className="public-waiting-display__escalation"
          role="note"
          aria-label="Symptom escalation guidance"
        >
          <strong>Important</strong>
          <p>{snapshot.escalationMessage}</p>
        </aside>
      ) : null}
    </OperationalPresentationFrame>
  );
}
