import React from 'react';
import { Link } from 'react-router-dom';
import {
  resolveOperationalPresentation,
  resolveOperationalStripAccentClass,
} from '../../config/emergencyOperationalPresentationModel';
import './OperationalStrip.css';

export default function OperationalStrip({
  metrics = [],
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

  if (!metrics.length && !resolvedShowEmptyState) return null;

  const rootClassName = [
    'operational-strip',
    `operational-strip--${resolvedLayout}`,
    resolveOperationalStripAccentClass(accent),
    resolvedUppercase ? '' : 'operational-strip--labels-normal',
    !metrics.length && resolvedShowEmptyState ? 'operational-strip--clear' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!metrics.length) {
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
      {metrics.map((metric) => {
        const interactive = metric.interactive ?? Boolean(metric.queueTab && onMetricSelect);
        const tone = metric.tone || 'neutral';
        return (
          <button
            key={metric.id}
            type="button"
            className="operational-strip__metric"
            data-tone={tone}
            onClick={() => interactive && onMetricSelect?.(metric)}
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
