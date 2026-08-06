import { EMPTY_STATE_COPY } from '../../config/emptyStateCopy';
import ChargeNurseOperationalStrip from './ChargeNurseOperationalStrip';

export default function ShiftHandoffStrip({
  metrics = [] as any[],
  onMetricSelect,
  readOnly = false,
}) {
  const clearCopy = EMPTY_STATE_COPY.strips.shiftClear;

  return (
    <ChargeNurseOperationalStrip
      metrics={metrics}
      eyebrow="Shift snapshot"
      accent="shift-handoff"
      onMetricSelect={onMetricSelect}
      readOnly={readOnly}
      emptyLabel={clearCopy.label}
      emptyHint={clearCopy.hint}
    />
  );
}
