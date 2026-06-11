import React from 'react';
import OperationalResultCard from './chat/OperationalResultCard';
import './ToolVisualization.css';

const renderKeyValue = (data) => (
  <div className="viz-grid">
    {Object.entries(data || {}).map(([key, value]) => (
      <div key={key} className="viz-item">
        <div className="viz-label">{key}</div>
        <div className="viz-value">{String(value)}</div>
      </div>
    ))}
  </div>
);

const ToolVisualization = ({ visualization }) => {
  if (!visualization) return null;

  const { type, data } = visualization;

  switch (type) {
    case 'drug-interaction':
      return (
        <div className="viz-card">
          <h4>Drug Interaction</h4>
          {(data?.interactions || []).map((item, index) => (
            <div key={index} className={`viz-alert viz-${item.severity || 'moderate'}`}>
              <strong>{item.drugs?.join(' + ') || 'Interaction'}</strong>
              <div>{item.description || item.summary}</div>
            </div>
          ))}
        </div>
      );
    case 'calculator':
      return (
        <div className="viz-card">
          <h4>Calculator Result</h4>
          {renderKeyValue(data || {})}
        </div>
      );
    case 'protocol':
      return (
        <div className="viz-card">
          <h4>Protocol Steps</h4>
          <ol className="viz-list">
            {(data?.steps || []).map((step, index) => (
              <li key={index}>{step}</li>
            ))}
          </ol>
        </div>
      );
    case 'lab-order':
      return (
        <div className="viz-card">
          <h4>Suggested Labs</h4>
          <ul className="viz-list">
            {(data?.labs || []).map((lab, index) => (
              <li key={index}>{lab}</li>
            ))}
          </ul>
        </div>
      );
    case 'vitals':
      return (
        <div className="viz-card">
          <h4>Vitals Snapshot</h4>
          {renderKeyValue(data || {})}
        </div>
      );
    case 'tool-preview':
      return (
        <div className="viz-card">
          <h4>Tool Preview</h4>
          <div>
            {data?.toolName || data?.toolId || 'This tool needs more input before it can execute.'}
          </div>
        </div>
      );
    case 'tool-result':
      return (
        <OperationalResultCard
          toolResult={{
            toolId: data?.toolId,
            toolName: data?.toolName,
            parameters: data?.parameters,
            result: data?.result,
          }}
          parameters={data?.parameters}
        />
      );
    case 'anomaly-detection':
      return (
        <div className="viz-card viz-alert viz-critical">
          <h4>Anomaly Alert</h4>
          <div>{data?.message || 'Potential anomaly detected.'}</div>
        </div>
      );
    case 'ed-copilot-response':
      return (
        <div className="viz-card">
          <h4>ED Copilot Summary</h4>
          {renderKeyValue({
            command: data?.command,
            patientCount: data?.patientCount,
            capacityScore: data?.capacityScore,
            requiresHumanReview: data?.requiresHumanReview ? 'Yes' : 'No',
            whiteboardAction: data?.whiteboardAction?.type || 'None',
          })}
          {Array.isArray(data?.items) && data.items.length > 0 && (
            <ul className="viz-list">
              {data.items.slice(0, 5).map((item, index) => (
                <li key={item.id || index}>
                  {item.name || item.patientName || item.id} - {item.state || item.complaint || 'review'}
                </li>
              ))}
            </ul>
          )}
          <div className="viz-alert viz-moderate">
            {data?.safetyBoundary || 'Human review required before action.'}
          </div>
        </div>
      );
    default:
      return (
        <div className="viz-card">
          <h4>Visualization</h4>
          {renderKeyValue(data || {})}
        </div>
      );
  }
};

export default ToolVisualization;
