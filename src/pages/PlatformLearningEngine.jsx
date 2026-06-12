import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useToolPreferences } from '../contexts/ToolPreferencesContext';
import { useUserIdentity } from '../contexts/UserIdentityContext';
import {
  PLATFORM_LEARNING_SUGGESTION_TYPES,
  buildLearningEventsFromSignals,
  buildPlatformLearningEngine,
} from '../data/platformLearningEngine';
import './PlatformLearningEngine.css';

const FILTERS = [
  { id: 'all', label: 'All suggestions' },
  { id: PLATFORM_LEARNING_SUGGESTION_TYPES.MERGE_TOOLS, label: 'Merge tools' },
  { id: PLATFORM_LEARNING_SUGGESTION_TYPES.HIDE_UNUSED_ASSET, label: 'Hide unused' },
  { id: PLATFORM_LEARNING_SUGGESTION_TYPES.PROMOTE_HIGH_VALUE_ASSET, label: 'Promote' },
  { id: PLATFORM_LEARNING_SUGGESTION_TYPES.IMPROVE_DISCOVERY, label: 'Discovery' },
  { id: PLATFORM_LEARNING_SUGGESTION_TYPES.REPAIR_FAILED_LAUNCH, label: 'Repair launches' },
];

function titleize(value) {
  return String(value || '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function SuggestionCard({ suggestion }) {
  return (
    <article className={`learning-card learning-card--${suggestion.priority}`}>
      <div className="learning-card__header">
        <span>{titleize(suggestion.type)}</span>
        <strong>{suggestion.impact}</strong>
      </div>
      <h3>{suggestion.title}</h3>
      <p>{suggestion.rationale}</p>
      <div className="learning-card__signals" aria-label={`${suggestion.title} source signals`}>
        {suggestion.sourceSignals.slice(0, 4).map((signal) => (
          <span key={signal}>{signal}</span>
        ))}
      </div>
      <footer>
        <span>{Math.round(suggestion.confidence * 100)}% confidence</span>
        <Link to={suggestion.route || '/platform-admin'}>Review</Link>
      </footer>
    </article>
  );
}

function SignalStat({ label, value }) {
  return (
    <article className="learning-stat">
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

export default function PlatformLearningEngine() {
  const toolPreferences = useToolPreferences();
  const { memoryFabricContext, activity } = useUserIdentity();
  const [filter, setFilter] = useState('all');

  const learningSignals = useMemo(
    () => ({
      successfulWorkflows: [
        ...(memoryFabricContext?.userMemory?.savedWorkflows || []),
        ...(activity?.recentWorkflows || []),
      ],
      successfulSimulations: activity?.recentSimulations || activity?.simulationsCompleted || [],
      commonSearches: [
        ...(memoryFabricContext?.organizationMemory?.commonSearches || []),
        ...(memoryFabricContext?.userMemory?.commonSearches || []),
      ],
      abandonedPages: activity?.abandonedPages || undefined,
      failedLaunches: activity?.failedLaunches || undefined,
    }),
    [activity, memoryFabricContext],
  );

  const model = useMemo(() => {
    const signalEvents = buildLearningEventsFromSignals(learningSignals);
    return buildPlatformLearningEngine({
      events: signalEvents.length ? signalEvents : undefined,
      recentTools: toolPreferences.recentTools,
      learningSignals,
    });
  }, [learningSignals, toolPreferences.recentTools]);

  const suggestions = useMemo(
    () =>
      filter === 'all'
        ? model.suggestions
        : model.suggestions.filter((suggestion) => suggestion.type === filter),
    [filter, model.suggestions],
  );

  return (
    <section className="learning-page">
      <section className="learning-hero" aria-labelledby="platform-learning-title">
        <div>
          <p className="learning-eyebrow">Platform learning engine</p>
          <h1 id="platform-learning-title">CareDroid Self-Optimization</h1>
          <p>
            CareDroid learns from safe usage patterns, then recommends human-reviewed platform
            optimizations such as merging tools, hiding unused assets, and promoting high-value
            capabilities.
          </p>
          <p className="learning-support-copy">
            Suggestions are advisory. The platform does not automatically remove, hide, merge, or
            promote assets without an operator review.
          </p>
        </div>
        <div className="learning-loop" aria-label="Learning loop">
          {model.learningLoop.map((step, index) => (
            <span key={step}>{index + 1}. {step}</span>
          ))}
        </div>
      </section>

      <section className="learning-stats" aria-label="Learning signal summary">
        <SignalStat label="Optimization Suggestions" value={model.summary.optimizationSuggestions} />
        <SignalStat label="High Priority" value={model.summary.highPrioritySuggestions} />
        <SignalStat label="Successful Workflows" value={model.summary.successfulWorkflows} />
        <SignalStat label="Successful Simulations" value={model.summary.successfulSimulations} />
        <SignalStat label="Common Searches" value={model.summary.commonSearches} />
        <SignalStat label="Failed Launches" value={model.summary.failedLaunches} />
      </section>

      <section className="learning-panel" aria-label="Optimization suggestion filters">
        <div className="learning-filter-row">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={filter === item.id ? 'is-active' : ''}
              onClick={() => setFilter(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      <section className="learning-panel" aria-labelledby="optimization-suggestions-title">
        <header>
          <div>
            <p className="learning-eyebrow">Optimization suggestions</p>
            <h2 id="optimization-suggestions-title">Continuously improve CareDroid</h2>
          </div>
          <span>{suggestions.length} suggestions</span>
        </header>
        {suggestions.length ? (
          <div className="learning-grid">
            {suggestions.map((suggestion) => (
              <SuggestionCard key={suggestion.id} suggestion={suggestion} />
            ))}
          </div>
        ) : (
          <p className="learning-empty">No suggestions match this filter yet.</p>
        )}
      </section>

      <section className="learning-panel" aria-labelledby="learning-evidence-title">
        <header>
          <div>
            <p className="learning-eyebrow">Evidence model</p>
            <h2 id="learning-evidence-title">Privacy-safe learning inputs</h2>
          </div>
          <span>{model.privacy.mode}</span>
        </header>
        <div className="learning-evidence-grid">
          {model.byType.map((row) => (
            <article key={row.type}>
              <strong>{row.count}</strong>
              <span>{titleize(row.type)}</span>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
