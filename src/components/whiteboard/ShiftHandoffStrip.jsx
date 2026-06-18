import React from 'react';
import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';
import './ChargeNurseOperationalStrip.css';

export default function ShiftHandoffStrip({
  metrics = [],
  onMetricSelect,
  readOnly = false,
}) {
  const clearCopy = EMPTY_STATE_COPY.strips.shiftClear;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="Shift snapshot"
      className="charge-nurse-operational-strip--shift-handoff"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      emptyLabel={clearCopy.label}
      emptyHint={clearCopy.hint}
    />
  );
}
