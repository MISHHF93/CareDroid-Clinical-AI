import type { ReactNode } from 'react';

export type OperationalStripMetric = {
  id: string;
  label: string;
  value: string | number;
  tone?: 'critical' | 'warning' | 'info' | 'success' | 'neutral' | 'stable';
  hint?: string;
  interactive?: boolean;
  queueTab?: string;
  patientId?: string;
};

export type OperationalStripProps = {
  metrics?: OperationalStripMetric[];
  screenMode?: string | null;
  layout?: string | null;
  emphasis?: string | null;
  eyebrow?: ReactNode;
  ariaLabel?: string | null;
  accent?: string;
  emptyLabel?: string | null;
  emptyHint?: string | null;
  showEmptyState?: boolean | null;
  metricLabelsUppercase?: boolean | null;
  onMetricSelect?: ((metric: OperationalStripMetric) => void) | null;
  readOnly?: boolean;
  shiftSummaryPath?: string | null;
  showShiftLink?: boolean;
  className?: string;
};

declare function OperationalStrip(props: OperationalStripProps): JSX.Element;

export default OperationalStrip;