import React, { useMemo } from 'react';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import { buildReassessmentAttentionStripMetrics } from './reassessmentVisibilityModel';
import './ChargeNurseOperationalStrip.css';

export default function ReassessmentAttentionStrip({
  patients = [],
  onMetricSelect,
  readOnly = false,
}) {
  const metrics = useMemo(() => buildReassessmentAttentionStripMetrics(patients), [patients]);

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="Reassess now"
      className="charge-nurse-operational-strip--reassessment"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
    />
  );
}
