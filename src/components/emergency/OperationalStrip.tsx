import React from 'react';
import { Link } from 'react-router-dom';
import {
  resolveOperationalPresentation,
  resolveOperationalStripAccentClass,
} from '../../config/emergencyOperationalPresentationModel';
import { shouldForceCompactOperationalStrip } from '../../config/practitionerCleanup.config';
import { compactOperationalStripMetrics } from '../../config/stationKpiPolicy';
import './OperationalStrip.css';

export default function OperationalStrip({
  metrics = [] as any[],
  screenMode = null,
  layout = null,
  emphasis = null,
  eyebrow = null,
  ariaLabel = null,
  accent = 'default',
  emptyLabel = null,
  emptyHint = null,
  showEmptyState = null,
  metricLabelsUppercase = null,
  onMetricSelect = null,
  readOnly = false,
  shiftSummaryPath = null,
  showShiftLink = true,
  className = '',
}) {
  const profile = resolveOperationalPresentation(screenMode);
  const resolvedLayout = layout || profile.stripLayout;
  const resolvedEmphasis = emphasis || profile.emphasis;
  const resolvedEyebrow = eyebrow ?? profile.stripEyebrow;
  const resolvedAriaLabel = ariaLabel ?? profile.stripAriaLabel;
  const resolvedEmptyLabel = emptyLabel ?? profile.emptyLabel;
  const resolvedEmptyHint = emptyHint ?? profile.emptyHint;
  const resolvedShowEmptyState = showEmptyState ?? profile.showStripEmptyState;
  const resolvedUppercase = metricLabelsUppercase ?? profile.metricLabelsUppercase;
  const showEyebrow = profile.showStripEyebrow && resolvedLayout === 'command';
  const dense = shouldForceCompactOperationalStrip();
  const displayMetrics = dense ? compactOperationalStripMetrics(metrics) : metrics;

  if (!displayMetrics.length && !resolvedShowEmptyState) return null;

  const rootClassName = [
    'operational-strip',
    `operational-strip--${resolvedLayout}`,
    dense ? 'operational-strip--dense' : '',
    resolveOperationalStripAccentClass(accent as any),
    resolvedUppercase ? '' : 'operational-strip--labels-normal',
    !displayMetrics.length && resolvedShowEmptyState ? 'operational-strip--clear' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!displayMetrics.length) {
    return (
      <nav className={rootClassName} aria-label={resolvedAriaLabel} data-emphasis={resolvedEmphasis}>
        {showEyebrow ? <span className="operational-strip__eyebrow">{resolvedEyebrow}</span> : null}
        <span
          className="operational-strip__metric operational-strip__metric--clear"
          data-tone="stable"
          title={resolvedEmptyHint}
        >
          <strong>{resolvedEmptyLabel}</strong>
          <span>{resolvedEmptyHint}</span>
        </span>
      </nav>
    );
  }

  return (
    <nav className={rootClassName} aria-label={resolvedAriaLabel} data-emphasis={resolvedEmphasis}>
      {showEyebrow ? <span className="operational-strip__eyebrow">{resolvedEyebrow}</span> : null}
      {displayMetrics.map((metric) => {
        const interactive = metric.interactive ?? Boolean(metric.queueTab && onMetricSelect);
        const tone = metric.tone || 'neutral';
        return (
          <button
            key={metric.id}
            type="button"
            className="operational-strip__metric"
            data-metric-id={metric.id}
            data-tone={tone}
            onClick={() => interactive && (onMetricSelect as any)?.(metric)}
            disabled={readOnly || !interactive}
            title={[metric.label, metric.hint].filter(Boolean).join(' · ')}
          >
            <strong>{metric.value}</strong>
            <span>{metric.label}</span>
          </button>
        );
      })}
      {shiftSummaryPath && showShiftLink ? (
        <Link
          to={shiftSummaryPath}
          className="operational-strip__action"
          title="Open shift summary"
        >
          <strong>Shift</strong>
          <span>Today&apos;s handoff</span>
        </Link>
      ) : null}
    </nav>
  );
}
