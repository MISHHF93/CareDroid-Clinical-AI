import React from 'react';
import './AISourcePanel.css';

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return 'N/A';
  return `${Math.round(Number(value) * 100)}%`;
}

function formatDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return String(value);
  }
  return date.toLocaleString();
}

function formatSourceType(type) {
  return String(type || 'source')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function metadataEntries(metadata) {
  if (!metadata || typeof metadata !== 'object') return [];
  return Object.entries(metadata).filter(([, value]) => value !== undefined && value !== null && value !== '');
}

export default function AISourcePanel({ sourcePanel }) {
  const references = Array.isArray(sourcePanel?.references) ? sourcePanel.references : [];
  if (references.length === 0) {
    return null;
  }

  const retrieval = sourcePanel?.retrieval || {};
  const generatedAt = formatDate(sourcePanel?.generatedAt);

  return (
    <section className="ai-source-panel" aria-label="AI source panel">
      <header className="ai-source-panel__header">
        <div>
          <span className="ai-source-panel__eyebrow">Clinical RAG sources</span>
          <h3>References and evidence</h3>
        </div>
        <div className="ai-source-panel__confidence">
          <span>Confidence</span>
          <strong>{formatPercent(sourcePanel?.confidence)}</strong>
        </div>
      </header>

      <div className="ai-source-panel__summary" aria-label="Retrieval summary">
        <span>{retrieval.chunksRetrieved ?? references.length} chunks</span>
        <span>{retrieval.sourcesFound ?? references.length} sources</span>
        {Number.isFinite(Number(retrieval.latencyMs)) && <span>{retrieval.latencyMs}ms</span>}
        {generatedAt && <span>Generated {generatedAt}</span>}
      </div>

      <div className="ai-source-panel__list">
        {references.map((reference) => {
          const timestamp = formatDate(reference.timestamp || reference.lastUpdated || reference.date);
          const metadata = metadataEntries(reference.metadata);

          return (
            <article className="ai-source-panel__reference" key={reference.id || reference.sourceId}>
              <div className="ai-source-panel__reference-header">
                <div>
                  <div className="ai-source-panel__title">
                    <span>{reference.citationLabel || ''}</span>
                    <strong>{reference.title}</strong>
                  </div>
                  <div className="ai-source-panel__meta-line">
                    <span>{formatSourceType(reference.type)}</span>
                    {reference.organization && <span>{reference.organization}</span>}
                    {reference.specialty && <span>{reference.specialty}</span>}
                  </div>
                </div>
                <div className="ai-source-panel__relevance">
                  <span>Relevance</span>
                  <strong>{formatPercent(reference.relevance ?? reference.topScore)}</strong>
                </div>
              </div>

              <div className="ai-source-panel__detail-grid">
                {timestamp && (
                  <div>
                    <span>Timestamp</span>
                    <strong>{timestamp}</strong>
                  </div>
                )}
                {reference.evidenceLevel && (
                  <div>
                    <span>Evidence</span>
                    <strong>{reference.evidenceLevel}</strong>
                  </div>
                )}
                <div>
                  <span>Chunks</span>
                  <strong>{reference.chunkCount ?? reference.chunkIds?.length ?? 0}</strong>
                </div>
              </div>

              {metadata.length > 0 && (
                <dl className="ai-source-panel__metadata">
                  {metadata.slice(0, 4).map(([key, value]) => (
                    <div key={key}>
                      <dt>{formatSourceType(key)}</dt>
                      <dd>{Array.isArray(value) ? value.join(', ') : String(value)}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {Array.isArray(reference.excerpts) && reference.excerpts.length > 0 && (
                <p className="ai-source-panel__excerpt">{reference.excerpts[0]}</p>
              )}

              {reference.url && (
                <a
                  className="ai-source-panel__link"
                  href={reference.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View source
                </a>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
