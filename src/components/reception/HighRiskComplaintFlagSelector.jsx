import React, { useMemo } from 'react';
import {
  detectHighRiskComplaintFlags,
  HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS,
} from '../../services/highRiskComplaintFlags';
import HighRiskComplaintFlagBadge from './HighRiskComplaintFlagBadge';
import './HighRiskComplaintFlagSelector.css';

export default function HighRiskComplaintFlagSelector({
  complaint = '',
  complaintCategory = 'Other',
  selectedFlagIds = [],
  onChange,
  disabled = false,
}) {
  const detectedFlags = useMemo(
    () =>
      detectHighRiskComplaintFlags({
        complaint,
        complaintCategory,
        selectedFlagIds,
      }),
    [complaint, complaintCategory, selectedFlagIds],
  );

  const toggleFlag = (flagId) => {
    if (disabled || !onChange) return;
    const active = selectedFlagIds.includes(flagId);
    onChange(
      active
        ? selectedFlagIds.filter((entry) => entry !== flagId)
        : [...selectedFlagIds, flagId],
    );
  };

  return (
    <div className="high-risk-complaint-selector">
      <div className="high-risk-complaint-selector__header">
        <span className="high-risk-complaint-selector__title">High-risk complaint fast flags</span>
        <span className="high-risk-complaint-selector__advisory">
          Staff alert only — does not assign triage level
        </span>
      </div>

      <div
        className="high-risk-complaint-selector__chips"
        role="group"
        aria-label="High-risk complaint fast flags"
      >
        {HIGH_RISK_COMPLAINT_FLAG_DEFINITIONS.map((definition) => {
          const active = selectedFlagIds.includes(definition.id);
          const autoDetected = detectedFlags.some(
            (flag) => flag.id === definition.id && flag.source !== 'staff-selected',
          );
          return (
            <button
              key={definition.id}
              type="button"
              className={[
                'high-risk-complaint-selector__chip',
                active ? 'high-risk-complaint-selector__chip--active' : '',
                autoDetected ? 'high-risk-complaint-selector__chip--detected' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => toggleFlag(definition.id)}
              disabled={disabled}
              title={
                autoDetected
                  ? `${definition.label} detected from complaint text`
                  : definition.label
              }
            >
              {definition.label}
            </button>
          );
        })}
      </div>

      {detectedFlags.length ? (
        <div className="high-risk-complaint-selector__preview">
          <HighRiskComplaintFlagBadge
            patient={{
              id: 'draft',
              highRiskComplaintFlags: detectedFlags,
              triagePending: true,
              state: 'Registration',
            }}
          />
          <span className="high-risk-complaint-selector__routing">
            Routes to rapid review / triage-needed queue for staff assessment.
          </span>
        </div>
      ) : null}
    </div>
  );
}
