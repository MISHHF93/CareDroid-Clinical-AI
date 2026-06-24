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
      <span className={`platform-feature-transparency__status ${statusClassName(entry.effectiveStatus)}`}>
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

  const entries = useMemo(
    () =>
      buildPlatformFeatureTransparency({
        simulationActive: active,
        includeRegistryFeatures: !compact,
        includeFeatureFlags: false,
      }).slice(0, limit),
    [active, compact, limit],
  );

  const summary = useMemo(() => summarizePlatformFeatureTransparency(entries), [entries]);

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
    </section>
  );
}