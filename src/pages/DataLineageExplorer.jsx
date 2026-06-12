import { useMemo, useState } from 'react';
import {
  DATA_LINEAGE_STAGE_LABELS,
  buildDataLineageExplorer,
  filterDataLineageFlows,
} from '../data/dataLineageExplorer';
import './DataLineageExplorer.css';

function StageTimeline({ flow }) {
  return (
    <ol className="data-lineage-timeline" aria-label={`${flow.title} data lineage`}>
      {flow.stages.map((stage) => (
        <li key={stage.stage}>
          <div className="data-lineage-stage-header">
            <span>{stage.label}</span>
            <time dateTime={stage.timestamp}>{new Date(stage.timestamp).toLocaleString()}</time>
          </div>
          <strong>{stage.source}</strong>
          <ul>
            {stage.transformations.map((transformation) => (
              <li key={transformation}>{transformation}</li>
            ))}
          </ul>
          <dl>
            {stage.model && (
              <div>
                <dt>Model</dt>
                <dd>{stage.model}</dd>
              </div>
            )}
            {stage.calculator && (
              <div>
                <dt>Calculator</dt>
                <dd>{stage.calculator}</dd>
              </div>
            )}
            {Object.entries(stage.metadata || {})
              .filter(([, value]) => value)
              .slice(0, 3)
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{String(value)}</dd>
                </div>
              ))}
          </dl>
        </li>
      ))}
    </ol>
  );
}

function FlowCard({ flow }) {
  return (
    <article className="data-lineage-card">
      <header>
        <div>
          <span>{flow.category}</span>
          <h2>{flow.title}</h2>
        </div>
        <time dateTime={flow.timestamps.completedAt}>
          Completed {new Date(flow.timestamps.completedAt).toLocaleTimeString()}
        </time>
      </header>

      <div className="data-lineage-card-meta">
        <div>
          <span>Source</span>
          <strong>{flow.source}</strong>
        </div>
        <div>
          <span>Model</span>
          <strong>{flow.model || 'No AI model'}</strong>
        </div>
        <div>
          <span>Calculator</span>
          <strong>{flow.calculator || 'None'}</strong>
        </div>
        <div>
          <span>Backend</span>
          <strong>{flow.endpoint || 'Local only'}</strong>
        </div>
      </div>

      <p>{flow.output}</p>
      <StageTimeline flow={flow} />
    </article>
  );
}

export default function DataLineageExplorer() {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');
  const lineage = useMemo(() => buildDataLineageExplorer(), []);
  const categories = useMemo(
    () => ['all', ...new Set(lineage.flows.map((flow) => flow.category))],
    [lineage.flows]
  );
  const visibleFlows = useMemo(
    () => filterDataLineageFlows(lineage.flows, query, category),
    [lineage.flows, query, category]
  );

  return (
    <section className="data-lineage-page">
      <section className="data-lineage-hero">
        <div>
          <p>Data Lineage Explorer</p>
          <h1>Data Lineage Explorer</h1>
          <span>{'Input -> AI -> Tool -> Backend -> Output'}</span>
        </div>
        <p>
          Trace clinical data from source input through AI orchestration, tool execution, backend
          touchpoints, and final output so every transformation is visible and timestamped.
        </p>
      </section>

      <section className="data-lineage-summary" aria-label="Data lineage summary">
        <div><span>Flows</span><strong>{lineage.summary.flows}</strong></div>
        <div><span>Sources</span><strong>{lineage.summary.sources}</strong></div>
        <div><span>Transformations</span><strong>{lineage.summary.transformations}</strong></div>
        <div><span>Models</span><strong>{lineage.summary.models}</strong></div>
        <div><span>Calculators</span><strong>{lineage.summary.calculators}</strong></div>
        <div><span>Backend</span><strong>{lineage.summary.backendTouchpoints}</strong></div>
      </section>

      <section className="data-lineage-controls" aria-label="Lineage filters">
        <label>
          <span>Search lineage</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search source, model, calculator, transformation..."
          />
        </label>
        <label>
          <span>Category</span>
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item === 'all' ? 'All categories' : item}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="data-lineage-stage-key" aria-label="Lineage stage key">
        {Object.entries(DATA_LINEAGE_STAGE_LABELS).map(([stage, label]) => (
          <span key={stage}>{label}</span>
        ))}
      </section>

      <section className="data-lineage-grid" aria-label="Lineage flows">
        {visibleFlows.map((flow) => (
          <FlowCard key={flow.id} flow={flow} />
        ))}
      </section>
    </section>
  );
}
