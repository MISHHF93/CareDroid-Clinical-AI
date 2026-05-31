import { useMemo, useState } from 'react';
import {
  buildFeatureFlagStateMap,
  FEATURE_FLAG_STATE_LABELS,
  FEATURE_FLAG_STATES,
  getFeatureFlagsByCategory,
  summarizeFeatureFlags,
} from '../config/featureFlags.config';
import './FeatureFlagCenter.css';

const STORAGE_KEY = 'careDroid.featureFlagOverrides.v1';

function readStoredOverrides() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (_error) {
    return {};
  }
}

function persistOverrides(overrides) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
}

export default function FeatureFlagCenter() {
  const [overrides, setOverrides] = useState(readStoredOverrides);
  const stateMap = useMemo(() => buildFeatureFlagStateMap(overrides), [overrides]);
  const groupedFlags = useMemo(() => getFeatureFlagsByCategory(stateMap), [stateMap]);
  const summary = useMemo(() => summarizeFeatureFlags(stateMap), [stateMap]);

  const setFlagState = (flagId, state) => {
    setOverrides((prev) => {
      const next = { ...prev, [flagId]: state };
      persistOverrides(next);
      return next;
    });
  };

  const resetFlags = () => {
    setOverrides({});
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <div className="feature-flag-center">
      <header className="feature-flag-hero">
        <div>
          <p className="feature-flag-eyebrow">Governance rollout control</p>
          <h1>Feature Flag Center</h1>
          <p>
            Enable, disable, beta, experiment with, or hide platform features without modifying
            application code. Runtime overrides are stored separately from the bundled defaults.
          </p>
        </div>
        <button type="button" className="feature-flag-reset" onClick={resetFlags}>
          Reset to defaults
        </button>
      </header>

      <section className="feature-flag-summary" aria-label="Feature flag summary">
        <div>
          <span>Total flags</span>
          <strong>{summary.total}</strong>
        </div>
        <div>
          <span>Live rollout</span>
          <strong>{summary.liveRolloutCount}</strong>
        </div>
        <div>
          <span>Hidden or disabled</span>
          <strong>{summary.hiddenOrDisabledCount}</strong>
        </div>
        {Object.entries(FEATURE_FLAG_STATE_LABELS).map(([state, label]) => (
          <div key={state}>
            <span>{label}</span>
            <strong>{summary.stateCounts[state]}</strong>
          </div>
        ))}
      </section>

      <section className="feature-flag-grid" aria-label="Feature flag categories">
        {groupedFlags.map(({ category, flags }) => (
          <article key={category} className="feature-flag-category">
            <header>
              <h2>{category}</h2>
              <span>{flags.length} flags</span>
            </header>

            <div className="feature-flag-list">
              {flags.map((flag) => (
                <div key={flag.id} className={`feature-flag-card feature-flag-card--${flag.state}`}>
                  <div className="feature-flag-card__main">
                    <div>
                      <h3>{flag.name}</h3>
                      <p>{flag.description}</p>
                    </div>
                    <span className={`feature-flag-state feature-flag-state--${flag.state}`}>
                      {FEATURE_FLAG_STATE_LABELS[flag.state]}
                    </span>
                  </div>
                  <dl className="feature-flag-meta">
                    <div>
                      <dt>Owner</dt>
                      <dd>{flag.owner}</dd>
                    </div>
                    <div>
                      <dt>Route</dt>
                      <dd>{flag.route}</dd>
                    </div>
                  </dl>
                  <p className="feature-flag-notes">{flag.rolloutNotes}</p>
                  <div className="feature-flag-actions" aria-label={`${flag.name} rollout controls`}>
                    {Object.values(FEATURE_FLAG_STATES).map((state) => (
                      <button
                        key={state}
                        type="button"
                        className={flag.state === state ? 'active' : ''}
                        onClick={() => setFlagState(flag.id, state)}
                        aria-pressed={flag.state === state}
                      >
                        {FEATURE_FLAG_STATE_LABELS[state]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
