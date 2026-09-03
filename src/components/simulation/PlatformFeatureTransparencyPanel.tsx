import { useMemo } from 'react';
import {
  buildPlatformFeatureTransparency,
  summarizePlatformFeatureTransparency,
  type PlatformFeatureTransparencyEntry,
  type TransparencyStatus,
} from '../../services/platformFeatureTransparency';
import { useSimulationMode } from '../../contexts/SimulationModeContext';
import './PlatformFeatureTransparencyPanel.css';

const STATUS_LABELS: Record<TransparencyStatus, string> = {
  live: 'Live',
  demo: 'Demo',
  partial: 'Partial',
  planned: 'Planned',
};

type PlatformFeatureTransparencyPanelProps = {
  compact?: boolean;
  limit?: number;
};

function statusClassName(status: TransparencyStatus): string {
  return `platform-feature-transparency__chip platform-feature-transparency__chip--${status}`;
}

function FeatureRow({ entry }: { entry: PlatformFeatureTransparencyEntry }) {
  const overridden = entry.baseStatus !== entry.effectiveStatus;
  return (
    <div className="platform-feature-transparency__row">
      <div>
        <div className="platform-feature-transparency__title">{entry.title}</div>
        <div className="platform-feature-transparency__meta">
          {entry.category}
          {overridden ? ' · shown as demo while simulation is active' : null}
        </div>
      </div>
      <span
        className={`platform-feature-transparency__status ${statusClassName(entry.effectiveStatus)}`}
      >
        {STATUS_LABELS[entry.effectiveStatus]}
      </span>
    </div>
  );
}

export default function PlatformFeatureTransparencyPanel({
  compact = false,
  limit = compact ? 6 : 12,
}: PlatformFeatureTransparencyPanelProps) {
  const { active } = useSimulationMode();

  // Summary counts come from the FULL set, the list from a capped slice.
  // Summarizing the slice made the chips read as platform-wide totals while
  // actually describing only the first `limit` rows -- on a transparency
  // panel that is the one thing that must not be off.
  const allEntries = useMemo(
    () =>
      buildPlatformFeatureTransparency({
        simulationActive: active,
        includeRegistryFeatures: !compact,
        includeFeatureFlags: false,
      }),
    [active, compact],
  );

  const entries = useMemo(() => allEntries.slice(0, limit), [allEntries, limit]);

  const summary = useMemo(() => summarizePlatformFeatureTransparency(allEntries), [allEntries]);

  return (
    <section className="platform-feature-transparency" aria-label="Platform feature transparency">
      <div className="platform-feature-transparency__summary">
        {(Object.keys(STATUS_LABELS) as TransparencyStatus[]).map((status) =>
          summary[status] > 0 ? (
            <span key={status} className={statusClassName(status)}>
              {STATUS_LABELS[status]} {summary[status]}
            </span>
          ) : null,
        )}
      </div>
      <div className="platform-feature-transparency__list">
        {entries.map((entry) => (
          <FeatureRow key={entry.id} entry={entry} />
        ))}
      </div>
      {allEntries.length > entries.length ? (
        <p className="platform-feature-transparency__more">
          Showing {entries.length} of {allEntries.length} tracked features. The counts above cover
          all {allEntries.length}.
        </p>
      ) : null}
    </section>
  );
}
