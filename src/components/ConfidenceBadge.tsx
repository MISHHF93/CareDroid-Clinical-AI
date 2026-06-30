import React from 'react';
import { AIConfidenceBadge } from './ai/AIConfidenceBadge';

/**
 * Confidence indicator for RAG-augmented responses — uses canonical AIConfidenceBadge tokens.
 */
const ConfidenceBadge = ({ confidence }: { confidence?: number | null }) => {
  if (confidence === undefined || confidence === null) {
    return null;
  }

  return <AIConfidenceBadge confidence={confidence} label="confidence" />;
};

export default ConfidenceBadge;
