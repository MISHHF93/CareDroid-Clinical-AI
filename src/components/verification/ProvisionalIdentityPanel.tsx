import { PROVISIONAL_IDENTITY_PROFILES } from '../../services/provisionalIdentityIntake';
import './ProvisionalIdentityPanel.css';

export default function ProvisionalIdentityPanel({ onStart, disabled = false, compact = false }) {
  const kinds = ['unknown', 'temporary', 'identity-pending'];
  const shortcuts = ['1', '2', '3'] as const;

  return (
    <section
      className={`provisional-identity-panel${compact ? ' provisional-identity-panel--compact' : ''}`}
      aria-labelledby="provisional-identity-panel-title"
    >
      <header>
        <h3 id="provisional-identity-panel-title">Provisional identity intake</h3>
        <p>Send to triage now — identity reconciliation can finish later without blocking care.</p>
      </header>

      <div className="provisional-identity-panel__options">
        {kinds.map((kind, index) => {
          const profile = PROVISIONAL_IDENTITY_PROFILES[kind];
          return (
            <button
              key={kind}
              type="button"
              className="provisional-identity-panel__option"
              disabled={disabled}
              onClick={() => onStart?.(kind)}
              aria-keyshortcuts={shortcuts[index]}
              title={`Select ${profile.label} (${shortcuts[index]})`}
            >
              <strong>
                {profile.label}
                <span className="provisional-identity-panel__kbd" aria-hidden="true">
                  {shortcuts[index]}
                </span>
              </strong>
              <span>{profile.timelineNote}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
