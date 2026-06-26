import React, { useEffect, useMemo } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { resolveOperationalPresentation } from '../../config/emergencyOperationalPresentationModel';
import { PUBLIC_WAITING_ESCALATION_MESSAGE } from '../../services/waitingRoomStatusMessaging';
import { PUBLIC_WAIT_URGENCY_DISCLAIMER } from '../../engine/safeWaitRangeMessaging';
import OperationalPresentationFrame from '../emergency/OperationalPresentationFrame';
import DisplayRefreshStatusBar from '../emergency/DisplayRefreshStatusBar';
import WaitingRoomProcessEducation from '../patient-experience/WaitingRoomProcessEducation';
import './PublicWaitingDisplay.css';

function buildPublicWaitingFallbackSnapshot(updatedAt = null) {
  return {
    waitRange: {
      label: 'Typical wait to clinician',
      value: 'Updating',
      detail: 'Wait information will return shortly.',
      disclaimer: PUBLIC_WAIT_URGENCY_DISCLAIMER,
    },
    crowdLevel: {
      label: 'Updating',
      tone: 'neutral',
      detail: 'Crowd level is reconnecting.',
    },
    triageWait: {
      label: 'Estimated wait to triage',
      value: 'Not available',
      detail: 'Triage wait estimate is reconnecting.',
      disclaimer: PUBLIC_WAIT_URGENCY_DISCLAIMER,
      available: false,
    },
    careStages: [],
    processEducation: null,
    statusMessaging: { statusLines: [], advisories: [], escalationMessage: PUBLIC_WAITING_ESCALATION_MESSAGE },
    guidanceMessages: [],
    escalationMessage: PUBLIC_WAITING_ESCALATION_MESSAGE,
    waitDisclaimer: PUBLIC_WAIT_URGENCY_DISCLAIMER,
    emsCrowdingImpact: { active: false },
    summaryLine: 'Waiting room information is temporarily unavailable — please ask staff if you need help.',
    updatedAt,
  };
}
export default function PublicWaitingDisplay({
  snapshot,
  title = 'Emergency waiting room',
  refreshIntervalMs = 30000,
  refreshStatus = (null as any),
  kioskMode = false,
  liveClock = (null as any),
  showWaitRange = true,
  showCrowdLevel = true,
  showTriageWait = true,
  showCareProcessStages = true,
  showPatientGuidance = true,
  showSymptomEscalation = true,
  showEmsCrowdingImpact = false,
  className = '',
}) {
  const presentation = resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.publicWaiting);
  const displayTitle = title || presentation.pageTitle;
  const resolvedSnapshot = useMemo(
    () => snapshot || buildPublicWaitingFallbackSnapshot(refreshStatus?.lastUpdatedAt || null),
    [refreshStatus?.lastUpdatedAt, snapshot],
  );

  const hasPrimaryTiles = useMemo(
    () =>
      Boolean(resolvedSnapshot) &&
      ((showWaitRange && resolvedSnapshot.waitRange) ||
        (showCrowdLevel && resolvedSnapshot.crowdLevel) ||
        (showTriageWait && resolvedSnapshot.triageWait)),
    [showCrowdLevel, showTriageWait, showWaitRange, resolvedSnapshot],
  );

  useEffect(() => {
    if (!kioskMode || typeof document === 'undefined') return undefined;
    const previousTitle = document.title;
    document.title = `${displayTitle} · ${EMERGENCY_OS_BRANDING.productName}`;
    document.documentElement.classList.add('public-waiting-kiosk-active');
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove('public-waiting-kiosk-active');
    };
  }, [displayTitle, kioskMode]);

  if (!resolvedSnapshot) return null;

  return (
    <OperationalPresentationFrame
      screenMode={CARE_DROID_SCREEN_MODES.publicWaiting}
      as="section"
      className={[
        'public-waiting-display',
        kioskMode ? 'public-waiting-display--kiosk' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Emergency waiting room public information"
    >
      <header className="public-waiting-display__header">
        <div>
          <p className="public-waiting-display__eyebrow">{presentation.pageEyebrow}</p>
          <h2>{displayTitle}</h2>
          <p className="public-waiting-display__subtitle">{presentation.pageSubtitle}</p>
        </div>
        <div className="public-waiting-display__meta">
          <DisplayRefreshStatusBar
            refreshStatus={
              refreshStatus || {
                enabled: true,
                refreshIntervalMs,
                lastUpdatedAt: resolvedSnapshot.updatedAt,
                lastAttemptAt: null,
                isRefreshing: false,
                errorMessage: null,
                tone: 'ok',
                showStaleBanner: false,
                hasCachedContent: Boolean(snapshot),
              }
            }
            liveClock={liveClock}
            showLiveClock={Boolean(liveClock)}
          />
          {kioskMode ? (
            <span className="public-waiting-display__kiosk-note">Public information only</span>
          ) : null}
        </div>
      </header>

      <p className="public-waiting-display__summary" role="status">
        {resolvedSnapshot.summaryLine}
      </p>

      <p className="public-waiting-display__disclaimer" role="note">
        {resolvedSnapshot.waitDisclaimer}
      </p>

      {hasPrimaryTiles ? (
        <div className="public-waiting-display__grid">
          {showWaitRange ? (
            <article
              className="public-waiting-display__tile"
              data-tone="info"
              aria-label={resolvedSnapshot.waitRange.label}
            >
              <strong className="public-waiting-display__value">{resolvedSnapshot.waitRange.value}</strong>
              <span className="public-waiting-display__label">{resolvedSnapshot.waitRange.label}</span>
              <small className="public-waiting-display__detail">{resolvedSnapshot.waitRange.detail}</small>
              <small className="public-waiting-display__disclaimer-inline">
                {resolvedSnapshot.waitRange.disclaimer}
              </small>
            </article>
          ) : null}
          {showCrowdLevel ? (
            <article
              className="public-waiting-display__tile"
              data-tone={resolvedSnapshot.crowdLevel.tone}
              aria-label={`Current crowd level: ${resolvedSnapshot.crowdLevel.label}`}
            >
              <strong className="public-waiting-display__value">{resolvedSnapshot.crowdLevel.label}</strong>
              <span className="public-waiting-display__label">Current crowd level</span>
              <small className="public-waiting-display__detail">{resolvedSnapshot.crowdLevel.detail}</small>
            </article>
          ) : null}
          {showTriageWait ? (
            <article
              className="public-waiting-display__tile"
              data-tone={resolvedSnapshot.triageWait.available ? 'watch' : 'stable'}
              aria-label={resolvedSnapshot.triageWait.label}
            >
              <strong className="public-waiting-display__value">{resolvedSnapshot.triageWait.value}</strong>
              <span className="public-waiting-display__label">{resolvedSnapshot.triageWait.label}</span>
              <small className="public-waiting-display__detail">{resolvedSnapshot.triageWait.detail}</small>
              {resolvedSnapshot.triageWait.available ? (
                <small className="public-waiting-display__disclaimer-inline">
                  {resolvedSnapshot.triageWait.disclaimer}
                </small>
              ) : null}
            </article>
          ) : null}
        </div>
      ) : null}

      {showEmsCrowdingImpact && resolvedSnapshot.emsCrowdingImpact?.active ? (
        <article
          className="public-waiting-display__tile public-waiting-display__tile--ems-impact"
          data-tone={resolvedSnapshot.emsCrowdingImpact.tone}
          aria-label={resolvedSnapshot.emsCrowdingImpact.label}
        >
          <strong className="public-waiting-display__value">{resolvedSnapshot.emsCrowdingImpact.label}</strong>
          <span className="public-waiting-display__label">Ambulance crowding impact</span>
          <small className="public-waiting-display__detail">{resolvedSnapshot.emsCrowdingImpact.detail}</small>
        </article>
      ) : null}

      {showCareProcessStages && resolvedSnapshot.processEducation ? (
        <WaitingRoomProcessEducation
          audience="patient"
          className="public-waiting-display__process-education"
        />
      ) : null}

      {showCareProcessStages && resolvedSnapshot.statusMessaging?.statusLines?.length ? (
        <section className="public-waiting-display__stages" aria-label="Waiting room status messages">
          <h3>Right now in the waiting room</h3>
          <p className="public-waiting-display__stages-note">
            General status messages only — counts, no names or clinical details
          </p>
          <ol className="public-waiting-display__stage-list">
            {resolvedSnapshot.statusMessaging.statusLines.map((line) => (
              <li key={line.id}>
                <span className="public-waiting-display__stage-label">{line.message}</span>
                <span className="public-waiting-display__stage-count" aria-hidden="true">
                  {line.count}
                </span>
              </li>
            ))}
          </ol>
        </section>
      ) : showCareProcessStages && resolvedSnapshot.careStages.length ? (
        <section className="public-waiting-display__stages" aria-label="Care process stages">
          <h3>Care process stages</h3>
          <p className="public-waiting-display__stages-note">
            Where patients are in the emergency visit — counts only, no identifiers
          </p>
          <ol className="public-waiting-display__stage-list">
            {resolvedSnapshot.careStages.map((stage) => (
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

      {showSymptomEscalation && resolvedSnapshot.statusMessaging?.advisories?.length ? (
        <section className="public-waiting-display__advisories" aria-label="Waiting room advisories">
          {resolvedSnapshot.statusMessaging.advisories.map((line) => (
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

      {showPatientGuidance && resolvedSnapshot.guidanceMessages.length ? (
        <section className="public-waiting-display__guidance" aria-label="Patient guidance">
          <h3>While you wait</h3>
          <ul>
            {resolvedSnapshot.guidanceMessages.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {showSymptomEscalation && !resolvedSnapshot.statusMessaging?.advisories?.length ? (
        <aside
          className="public-waiting-display__escalation"
          role="note"
          aria-label="Symptom escalation guidance"
        >
          <strong>Important</strong>
          <p>{resolvedSnapshot.escalationMessage}</p>
        </aside>
      ) : null}

      {kioskMode ? (
        <footer className="public-waiting-display__footer" aria-label="Waiting room safety notice">
          <p>{EMERGENCY_OS_BRANDING.safetyLine}</p>
        </footer>
      ) : null}
    </OperationalPresentationFrame>
  );
}
