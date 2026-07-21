import React from 'react';
import './AiRouteMetadata.css';

const EXPERT_LABELS = {
  emergency: 'Emergency',
  cardiology: 'Cardiology',
  pulmonology: 'Pulmonology',
  nephrology: 'Nephrology',
  gastroenterology: 'Gastroenterology',
  neurology: 'Neurology',
  psychiatry: 'Psychiatry',
  fleet: 'Fleet',
  'medical-iot': 'Medical IoT',
  operations: 'Operations',
  'hospital-map': 'Hospital map',
  documentation: 'Documentation',
};

function formatLabel(value) {
  if (!value) return 'Unknown';
  return (
    EXPERT_LABELS[value] ||
    String(value)
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase())
  );
}

function formatPercent(value) {
  if (!Number.isFinite(Number(value))) return null;
  return `${Math.round(Number(value) * 100)}%`;
}

function formatScore(value) {
  if (!Number.isFinite(Number(value))) return null;
  return Number(value).toFixed(2);
}

function formatCost(value) {
  if (!Number.isFinite(Number(value))) return null;
  return `$${Number(value).toFixed(4)}`;
}

export default function AiRouteMetadata({ aiFoundation, routePlan, aiGateway }) {
  if (!aiFoundation) return null;

  const selectedExperts =
    Array.isArray(aiFoundation.selectedExperts) && aiFoundation.selectedExperts.length > 0
      ? aiFoundation.selectedExperts
      : Array.isArray(routePlan?.selectedExperts) && routePlan.selectedExperts.length > 0
        ? routePlan.selectedExperts
        : aiFoundation.selectedExpert
          ? [{ expertId: aiFoundation.selectedExpert, role: 'primary' }]
          : [];

  const unifiedNode = aiFoundation.unifiedNode || aiGateway?.unifiedNode || null;

  if (!selectedExperts.length && !aiFoundation.route && !unifiedNode) return null;

  const primaryExpert = selectedExperts[0];
  const routeScore = formatScore(aiFoundation.routeScore ?? primaryExpert?.score);
  const confidence = formatPercent(
    aiFoundation.confidence ?? unifiedNode?.confidence ?? primaryExpert?.confidence
  );
  const estimatedCost = formatCost(
    aiFoundation.estimatedCost ?? routePlan?.costPlan?.estimatedCost
  );
  const reviewRequired =
    aiFoundation.requiresHumanReview ?? routePlan?.safetyPlan?.requiresHumanReview;
  const pipeline = Array.isArray(aiGateway?.pipeline) ? aiGateway.pipeline : [];
  const nodeConf = formatPercent(unifiedNode?.confidence);
  const artifactConf = formatPercent(unifiedNode?.artifactRouteConfidence);

  return (
    <section className="ai-route-metadata" aria-label="AI routing metadata">
      <div className="ai-route-metadata__header">
        <span className="ai-route-metadata__eyebrow">AI route</span>
        {reviewRequired && <span className="ai-route-metadata__review">Human review</span>}
      </div>
      {unifiedNode && (
        <div
          className="ai-route-metadata__node"
          aria-label="CareDroid unified AI node"
        >
          <span className="ai-route-metadata__node-badge">1-node</span>
          <span className="ai-route-metadata__node-id">
            {unifiedNode.nodeId || 'caredroid-unified-ai-node'}
          </span>
          {unifiedNode.method && (
            <span className="ai-route-metadata__chip ai-route-metadata__chip--node">
              Method: {formatLabel(unifiedNode.method)}
            </span>
          )}
          {unifiedNode.artifactType && (
            <span className="ai-route-metadata__chip ai-route-metadata__chip--node">
              Artifact: {formatLabel(unifiedNode.artifactType)}
              {artifactConf ? ` · ${artifactConf}` : ''}
            </span>
          )}
          {unifiedNode.toolId && (
            <span className="ai-route-metadata__chip ai-route-metadata__chip--node">
              Tool: {formatLabel(unifiedNode.toolId)}
            </span>
          )}
          {nodeConf && (
            <span className="ai-route-metadata__chip ai-route-metadata__chip--node">
              Node conf: {nodeConf}
            </span>
          )}
        </div>
      )}
      <div className="ai-route-metadata__chips">
        {selectedExperts.slice(0, 3).map((expert) => (
          <span className="ai-route-metadata__chip" key={`${expert.expertId}-${expert.role}`}>
            {expert.role === 'supporting' ? 'Support' : 'Expert'}: {formatLabel(expert.expertId)}
          </span>
        ))}
        {aiFoundation.route && (
          <span className="ai-route-metadata__chip">Intent: {formatLabel(aiFoundation.route)}</span>
        )}
        {aiFoundation.retrievalPolicy && (
          <span className="ai-route-metadata__chip">
            Retrieval: {formatLabel(aiFoundation.retrievalPolicy)}
          </span>
        )}
        {(aiFoundation.routingMode || routePlan?.routingMode) && (
          <span className="ai-route-metadata__chip">
            Mode: {formatLabel(aiFoundation.routingMode || routePlan.routingMode)}
          </span>
        )}
        {(aiFoundation.fallbackApplied || routePlan?.fallbackApplied) && (
          <span className="ai-route-metadata__chip">Fallback route</span>
        )}
      </div>
      <dl className="ai-route-metadata__metrics">
        {confidence && (
          <div>
            <dt>Confidence</dt>
            <dd>{confidence}</dd>
          </div>
        )}
        {routeScore && (
          <div>
            <dt>Route score</dt>
            <dd>{routeScore}</dd>
          </div>
        )}
        {estimatedCost && (
          <div>
            <dt>Estimated cost</dt>
            <dd>{estimatedCost}</dd>
          </div>
        )}
      </dl>
      {pipeline.length > 0 && (
        <div className="ai-route-metadata__pipeline" aria-label="AI gateway pipeline">
          {pipeline.map((item) => (
            <span
              className="ai-route-metadata__pipeline-step"
              key={`${item.stage}-${item.status}`}
            >
              {formatLabel(item.stage)}: {formatLabel(item.status)}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}
