import type { CommandCenterSurgeSnapshot } from '../../services/commandCenterSurgeModel';
import './CommandCenterSurgePanel.css';

type CommandCenterSurgePanelProps = {
  snapshot: CommandCenterSurgeSnapshot;
  className?: string;
};

export default function CommandCenterSurgePanel({
  snapshot,
  className = '',
}: CommandCenterSurgePanelProps) {
  if (!snapshot.active && snapshot.level === 'normal') return null;

  return (
    <section
      className={['command-center-surge', `command-center-surge--${snapshot.level}`, className]
        .filter(Boolean)
        .join(' ')}
      aria-label="Department surge status"
      role="status"
    >
      <header>
        <h3>{snapshot.level === 'crisis' ? 'Crisis mode' : 'Surge mode'}</h3>
        <p>{snapshot.headline}</p>
      </header>

      <p className="command-center-surge__bottleneck">{snapshot.bottleneckLabel}</p>

      <div className="command-center-surge__metrics">
        {snapshot.metrics.map((metric) => (
          <article key={metric.id} className={`command-center-surge__metric--${metric.tone}`}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.thresholdLabel}</small>
          </article>
        ))}
      </div>

      {snapshot.zoneOccupancy.length ? (
        <ul className="command-center-surge__zones" aria-label="Bed occupancy by zone">
          {snapshot.zoneOccupancy.map((zone) => (
            <li key={zone.zoneId} className={`command-center-surge__zone--${zone.tone}`}>
              <span>{zone.zoneLabel}</span>
              <strong>
                {zone.occupied}/{zone.total}
              </strong>
              <small>{zone.availabilityPercent}% available</small>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
