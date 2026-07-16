import React from 'react';
import ToolVisualization from '../ToolVisualization';
import OperationalResultCard from './OperationalResultCard';
import { AccountableRecommendationCard } from '../ai/AccountableRecommendationCard';

function getDisplayVisualizations(message) {
  if (!Array.isArray(message?.visualizations)) return [];
  if (!message.toolResult) return message.visualizations;
  return message.visualizations.filter((visualization) => visualization?.type !== 'tool-result');
}

function getToolResultParameters(message, explicitParameters) {
  return (
    explicitParameters ||
    message?.metadata?.parameters ||
    message?.toolResult?.parameters ||
    message?.toolResult?.result?.parameters
  );
}

export default function AssistantResultRenderer({
  message,
  parameters,
  timestamp,
  followUpSuggestions,
  onRetry,
  onEdit,
  visualizationsClassName,
  visualizationsStyle,
}) {
  if (!message) return null;

  const visualizations = getDisplayVisualizations(message);
  const resultParameters = getToolResultParameters(message, parameters);

  return (
    <>
      {message.accountableRecommendation ? (
        <AccountableRecommendationCard
          recommendation={message.accountableRecommendation}
          compact
        />
      ) : null}
      {message.toolResult && (
        <OperationalResultCard
          toolResult={message.toolResult}
          parameters={resultParameters}
          timestamp={timestamp || message.timestamp}
          followUpSuggestions={
            followUpSuggestions || message.followUpSuggestions || message.suggestions || message.metadata?.followUpSuggestions
          }
          onRetry={onRetry}
          onEdit={onEdit}
        />
      )}
      {visualizations.length > 0 && (
        <div className={visualizationsClassName} style={visualizationsStyle}>
          {visualizations.map((visualization, index) => (
            <ToolVisualization
              key={`${visualization.type || 'viz'}-${index}`}
              visualization={visualization}
            />
          ))}
        </div>
      )}
    </>
  );
}
