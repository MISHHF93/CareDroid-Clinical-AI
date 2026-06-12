import { useMemo, useState } from 'react';
import { getAiModelRegistry } from '../data/aiModelRegistry';
import { NavIcon } from '../navigation/NavIcon';
import { CHROME_ICONS } from '../navigation/iconRegistry';
import './AiModelsPage.css';

const RISK_ORDER = Object.freeze(['critical', 'high', 'medium', 'low']);

export default function AiModelsPage() {
  const models = getAiModelRegistry();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskFilter, setRiskFilter] = useState('all');

  const statuses = useMemo(() => [...new Set(models.map((model) => model.status))].sort(), [models]);
  const risks = useMemo(
    () => [...new Set(models.map((model) => model.riskLevel))].sort(
      (a, b) => RISK_ORDER.indexOf(a) - RISK_ORDER.indexOf(b)
    ),
    [models]
  );

  const filteredModels = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return models.filter((model) => {
      if (statusFilter !== 'all' && model.status !== statusFilter) return false;
      if (riskFilter !== 'all' && model.riskLevel !== riskFilter) return false;
      if (!normalizedQuery) return true;
      return [
        model.modelId,
        model.name,
        model.purpose,
        model.input,
        model.output,
        model.owner,
        model.costProfile,
        ...(model.artifactDependencies || []),
      ]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [models, query, riskFilter, statusFilter]);

  const highRiskCount = models.filter((model) => ['critical', 'high'].includes(model.riskLevel)).length;

  return (
    <section className="ai-models-page" aria-labelledby="ai-models-title">
      <section className="ai-models-hero">
        <div className="ai-models-hero__icon" aria-hidden>
          <NavIcon icon={CHROME_ICONS.sparkles} size={28} />
        </div>
        <div>
          <p className="ai-models-eyebrow">Artifact Intelligence Layer</p>
          <h1 id="ai-models-title">AI Model Registry</h1>
          <p>
            Unified view of CareDroid AI gateway, routing, RAG, tool calling, resonance, simulation,
            cost, guardrail, and evaluation systems. This registry tracks readiness and dependencies;
            it does not claim a trained artifact model exists.
          </p>
        </div>
      </section>

      <section className="ai-models-stats" aria-label="AI model registry summary">
        <div>
          <strong>{models.length}</strong>
          <span>AI systems</span>
        </div>
        <div>
          <strong>{highRiskCount}</strong>
          <span>High or critical risk</span>
        </div>
        <div>
          <strong>{statuses.length}</strong>
          <span>Readiness states</span>
        </div>
      </section>

      <section className="ai-models-controls" aria-label="AI model filters">
        <label>
          <span>Search AI systems</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search RAG, guardrails, resonance..."
          />
        </label>
        <label>
          <span>Status</span>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span>Risk</span>
          <select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value)}>
            <option value="all">All risk levels</option>
            {risks.map((riskLevel) => (
              <option key={riskLevel} value={riskLevel}>
                {riskLevel}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="ai-models-grid" aria-label="AI model registry">
        {filteredModels.map((model) => (
          <article key={model.modelId} className="ai-models-card">
            <div className="ai-models-card__header">
              <div>
                <p>{model.modelId}</p>
                <h2>{model.name}</h2>
              </div>
              <span className={`ai-models-risk ai-models-risk--${model.riskLevel}`}>
                {model.riskLevel}
              </span>
            </div>
            <p>{model.purpose}</p>
            <dl>
              <div>
                <dt>Input</dt>
                <dd>{model.input}</dd>
              </div>
              <div>
                <dt>Output</dt>
                <dd>{model.output}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>{model.status}</dd>
              </div>
              <div>
                <dt>Cost profile</dt>
                <dd>{model.costProfile}</dd>
              </div>
              <div>
                <dt>Owner</dt>
                <dd>{model.owner}</dd>
              </div>
            </dl>
            <div className="ai-models-dependencies">
              <strong>Artifact dependencies</strong>
              <div>
                {model.artifactDependencies.map((dependency) => (
                  <span key={dependency}>{dependency}</span>
                ))}
              </div>
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}
