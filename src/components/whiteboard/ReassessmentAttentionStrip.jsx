import React, { useMemo } from 'react';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import { buildReassessmentAttentionStripMetrics } from './reassessmentVisibilityModel';
import './ChargeNurseOperationalStrip.css';

export default function ReassessmentAttentionStrip({
  patients = [],
  onMetricSelect,
  readOnly = false,
}) {
  const metrics = useMemo(() => buildReassessmentAttentionStripMetrics(patients), [patients]);
  const clearCopy = EMPTY_STATE_COPY.strips.reassessClear;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="Reassess now"
      className="charge-nurse-operational-strip--reassessment"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      emptyLabel={clearCopy.label}
      emptyHint={clearCopy.hint}
    />
  );
}
