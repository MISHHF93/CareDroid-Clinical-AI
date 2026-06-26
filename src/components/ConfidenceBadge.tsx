import React from 'react';

/**
 * ConfidenceBadge Component
 * 
 * Displays a confidence indicator for RAG-augmented responses.
 */
const ConfidenceBadge = ({ confidence }) => {
  if (confidence === undefined || confidence === null) {
    return null;
  }

  // Determine confidence level
  let color, bgColor, borderColor, icon, label;
  
  if (confidence >= 0.8) {
    color = '#00FF88';
    bgColor = 'rgba(0, 255, 136, 0.1)';
    borderColor = 'rgba(0, 255, 136, 0.3)';
    icon = '✓';
    label = 'High Confidence';
  } else if (confidence >= 0.6) {
    color = '#FFB800';
    bgColor = 'rgba(255, 184, 0, 0.1)';
    borderColor = 'rgba(255, 184, 0, 0.3)';
    icon = '⚠';
    label = 'Moderate Confidence';
  } else if (confidence >= 0.3) {
    color = '#FF8800';
    bgColor = 'rgba(255, 136, 0, 0.1)';
    borderColor = 'rgba(255, 136, 0, 0.3)';
    icon = '⚠';
    label = 'Low Confidence';
  } else {
    color = '#FF4444';
    bgColor = 'rgba(255, 68, 68, 0.1)';
    borderColor = 'rgba(255, 68, 68, 0.3)';
    icon = '⚠️';
    label = 'Very Low Confidence';
  }

  const percentage = Math.round(confidence * 100);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 12px',
      borderRadius: '12px',
      background: bgColor,
      border: `1px solid ${borderColor}`,
      fontSize: '11px',
      fontWeight: 500,
      color: color,
    }}>
      <span>{icon}</span>
      <span>{label}</span>
      <span style={{
        opacity: 0.7,
        fontSize: '10px',
      }}>
        ({percentage}%)
      </span>
    </div>
  );
};

export default ConfidenceBadge;
