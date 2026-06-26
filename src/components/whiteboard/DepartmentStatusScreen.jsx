import React, { useEffect, useMemo, useState } from 'react';
import { CARE_DROID_SCREEN_MODES } from '../../config/careDroidScreenModes';
import { EMERGENCY_OS_BRANDING } from '../../config/emergencyOsBranding.config';
import { buildDepartmentStatusFallbackSnapshot } from '../../config/displayAutoRefreshModel';
import { resolveOperationalPresentation } from '../../config/emergencyOperationalPresentationModel';
import OperationalPresentationFrame from '../emergency/OperationalPresentationFrame';
import DisplayRefreshStatusBar from '../emergency/DisplayRefreshStatusBar';
import './DepartmentStatusScreen.css';

export default function DepartmentStatusScreen({
  snapshot,
  title = 'Department status',
  refreshIntervalMs = 30000,
  refreshStatus = /** @type {any} */ (null),
  privacyLabel,
  layout = 'default',
  kioskMode = false,
  liveClock: liveClockProp,
  className = '',
}) {
  const isWallLayout = layout === 'wall' || kioskMode;
  const presentation = resolveOperationalPresentation(CARE_DROID_SCREEN_MODES.readOnlyWhiteboard);
  const displayTitle = title || presentation.pageTitle;
  const [liveClock, setLiveClock] = useState(() => liveClockProp || Date.now());

  useEffect(() => {
    if (!isWallLayout) return undefined;
    setLiveClock(liveClockProp || Date.now());
    const timer = window.setInterval(() => setLiveClock(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [isWallLayout, liveClockProp]);

  useEffect(() => {
    if (!kioskMode || typeof document === 'undefined') return undefined;
    const previousTitle = document.title;
    document.title = `${displayTitle} · ${EMERGENCY_OS_BRANDING.productName}`;
    document.documentElement.classList.add('read-only-whiteboard-kiosk-active');
    return () => {
      document.title = previousTitle;
      document.documentElement.classList.remove('read-only-whiteboard-kiosk-active');
    };
  }, [displayTitle, kioskMode]);

  const resolvedSnapshot = useMemo(() => {
    if (snapshot?.metrics?.length) return snapshot;
    if (snapshot) return snapshot;
    return buildDepartmentStatusFallbackSnapshot(refreshStatus?.lastUpdatedAt || null);
  }, [refreshStatus?.lastUpdatedAt, snapshot]);

  if (!resolvedSnapshot?.metrics?.length) return null;

  return (
    <OperationalPresentationFrame
      screenMode={CARE_DROID_SCREEN_MODES.readOnlyWhiteboard}
      as="section"
      className={[
        'department-status-screen',
        isWallLayout ? 'department-status-screen--wall' : '',
        kioskMode ? 'department-status-screen--kiosk' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label="Emergency department live status"
    >
      <header className="department-status-screen__header">
        <div>
          <p className="department-status-screen__eyebrow">
            {kioskMode ? presentation.pageEyebrow : 'Live departmental status'}
          </p>
          <h2>{displayTitle}</h2>
          <p className="department-status-screen__subtitle">
            {kioskMode ? presentation.pageSubtitle : 'Aggregate operational metrics only · no patient names or clinical details'}
            {privacyLabel ? ` · ${privacyLabel}` : ''}
          </p>
        </div>
        <div className="department-status-screen__meta">
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
                hasCachedContent: Boolean(snapshot?.metrics?.length),
              }
            }
            liveClock={isWallLayout ? liveClock : null}
            showLiveClock={isWallLayout}
          />
          {kioskMode ? (
            <span className="department-status-screen__kiosk-note">Read-only operations wall</span>
          ) : null}
        </div>
      </header>

      <p className="department-status-screen__summary" role="status">
        {resolvedSnapshot.summaryLine}
      </p>

      <div className="department-status-screen__grid">
        {resolvedSnapshot.metrics.map((metric) => (
          <article
            key={metric.id}
            className="department-status-screen__tile"
            data-tone={metric.tone}
            aria-label={`${metric.label}: ${metric.value}`}
          >
            <strong className="department-status-screen__value">{metric.value}</strong>
            <span className="department-status-screen__label">{metric.label}</span>
            <small className="department-status-screen__detail">{metric.detail}</small>
          </article>
        ))}
      </div>

      {kioskMode ? (
        <footer className="department-status-screen__footer" aria-label="Department monitor notice">
          <p>
            {privacyLabel
              ? `${privacyLabel} · ${EMERGENCY_OS_BRANDING.safetyLine}`
              : EMERGENCY_OS_BRANDING.safetyLine}
          </p>
        </footer>
      ) : null}
    </OperationalPresentationFrame>
  );
}
