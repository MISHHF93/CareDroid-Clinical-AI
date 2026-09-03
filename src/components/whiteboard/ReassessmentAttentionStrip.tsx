import React, { useMemo } from 'react';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import { buildReassessmentAttentionStripMetrics } from './reassessmentVisibilityModel';

export default function ReassessmentAttentionStrip({
  patients = [] as any[],
  onMetricSelect,
  readOnly = false,
}) {
  const metrics = useMemo(() => buildReassessmentAttentionStripMetrics(patients), [patients]);
  const clearCopy = EMPTY_STATE_COPY.strips.reassessClear;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="Reassess now"
      accent="reassessment"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      emptyLabel={clearCopy.label}
      emptyHint={clearCopy.hint}
    />
  );
}
