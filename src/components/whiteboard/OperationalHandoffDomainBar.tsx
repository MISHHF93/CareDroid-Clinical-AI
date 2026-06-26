import React from 'react';
import './OperationalHandoffDomainBar.css';

export default function OperationalHandoffDomainBar({
  domains = ([] as any[]),
  onMetricSelect,
  readOnly = false,
}) {
  if (!domains.length) return null;

  return (
    <nav className="operational-handoff-domain-bar" aria-label="Operational handoff summaries">
      {domains.map((domain) => (
        <section
          key={domain.id}
          className="operational-handoff-domain-bar__domain"
          data-domain={domain.id}
          data-attention={domain.hasAttention ? 'true' : 'false'}
          aria-label={`${domain.label} handoff summary`}
        >
          <div className="operational-handoff-domain-bar__heading">
            <span className="operational-handoff-domain-bar__eyebrow">{domain.label}</span>
            <p className="operational-handoff-domain-bar__headline" title={domain.headline}>
              {domain.headline}
            </p>
          </div>
          <div className="operational-handoff-domain-bar__metrics">
            {domain.metrics.map((metric) => (
              <button
                key={metric.id}
                type="button"
                className="operational-handoff-domain-bar__metric"
                data-tone={metric.tone}
                onClick={() => onMetricSelect?.(metric)}
                disabled={readOnly || !onMetricSelect}
                title={`${metric.label}: ${metric.value}. ${metric.hint}`}
              >
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </button>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}
