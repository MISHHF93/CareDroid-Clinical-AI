import { RAGContext } from '../../rag/dto/rag-context.dto';

/**
 * Confidence Scorer
 *
 * Calculates and interprets confidence scores for RAG-augmented responses.
 * Helps determine when to add disclaimers or suggest additional resources.
 */

export interface ConfidenceScore {
  /**
   * Overall confidence level (0-1)
   */
  score: number;

  /**
   * Confidence level category
   */
  level: 'high' | 'moderate' | 'low' | 'very-low';

  /**
   * Whether a disclaimer should be added
   */
  requiresDisclaimer: boolean;

  /**
   * Suggested actions based on confidence
   */
  suggestedActions: string[];

  /**
   * Explanation of confidence score
   */
  explanation: string;
}

/**
 * Calculate confidence score from RAG context
 */
export function calculateConfidence(ragContext: RAGContext): ConfidenceScore {
  const { confidence, chunks, sources, totalRetrieved } = ragContext;

  // Base confidence from RAG retrieval
  let adjustedConfidence = confidence;

  // Adjust based on number of chunks
  if (chunks.length === 0) {
    adjustedConfidence = 0;
  } else if (chunks.length < 2) {
    adjustedConfidence *= 0.8; // Reduce confidence if only 1 chunk
  }

  // Adjust based on sources
  if (sources.length === 0) {
    adjustedConfidence = 0;
  } else if (sources.length >= 3) {
    adjustedConfidence = Math.min(1.0, adjustedConfidence * 1.1); // Boost if multiple sources
  }

  // Adjust based on source quality (authoritative organizations)
  const authoritativeSources = sources.filter(
    (s) =>
      s.authoritative ||
      [
        'American Heart Association',
        'American College of Cardiology',
        'FDA',
        'CDC',
        'WHO',
        'NIH',
      ].some((org) => s.organization?.includes(org)),
  ).length;

  if (authoritativeSources >= 2) {
    adjustedConfidence = Math.min(1.0, adjustedConfidence * 1.15);
  }

  // Adjust based on source recency
  const recentSources = sources.filter((s) => {
    if (!s.date) return false;
    const year = parseInt(s.date.substring(0, 4));
    return year >= new Date().getFullYear() - 3; // Within 3 years
  }).length;

  if (sources.length > 0 && recentSources === 0) {
    adjustedConfidence *= 0.9; // Slight reduction if no recent sources
  }

  // Determine level
  let level: ConfidenceScore['level'];
  if (adjustedConfidence >= 0.8) {
    level = 'high';
  } else if (adjustedConfidence >= 0.6) {
    level = 'moderate';
  } else if (adjustedConfidence >= 0.3) {
    level = 'low';
  } else {
    level = 'very-low';
  }

  // Determine if disclaimer is required
  const requiresDisclaimer = adjustedConfidence < 0.7;

  // Generate suggested actions
  const suggestedActions: string[] = [];

  if (level === 'very-low' || level === 'low') {
    suggestedActions.push('Consult current guidelines or textbooks');
    suggestedActions.push('Consider specialist consultation');
    suggestedActions.push('Review institutional protocols');
  }

  if (level === 'moderate') {
    suggestedActions.push('Verify with current guidelines for critical decisions');
    suggestedActions.push('Consider additional evidence sources');
  }

  if (chunks.length === 0) {
    suggestedActions.push('Try rephrasing your query');
    suggestedActions.push('Search specific protocols or guidelines');
  }

  if (recentSources === 0 && sources.length > 0) {
    suggestedActions.push('Check for updated guidelines (sources may be outdated)');
  }

  // Generate explanation
  let explanation = '';

  if (level === 'high') {
    explanation = `High-quality evidence retrieved from ${sources.length} authoritative source${sources.length > 1 ? 's' : ''}. `;
    if (authoritativeSources > 0) {
      explanation += `Includes ${authoritativeSources} authoritative organization${authoritativeSources > 1 ? 's' : ''}. `;
    }
    explanation += 'Response is well-supported by current evidence.';
  } else if (level === 'moderate') {
    explanation = `Moderate confidence based on ${chunks.length} retrieved chunk${chunks.length > 1 ? 's' : ''} from ${sources.length} source${sources.length > 1 ? 's' : ''}. `;
    if (chunks.length < 3) {
      explanation += 'Limited specific evidence available. ';
    }
    explanation += 'Response should be verified with current guidelines for critical decisions.';
  } else if (level === 'low') {
    explanation = `Low confidence. `;
    if (chunks.length === 0) {
      explanation += 'No specific evidence retrieved. ';
    } else {
      explanation += `Only ${chunks.length} relevant chunk${chunks.length > 1 ? 's' : ''} found. `;
    }
    explanation +=
      'Response is based on general principles. Consult specialists or current resources.';
  } else {
    explanation = `Very low confidence. `;
    if (totalRetrieved === 0) {
      explanation += 'No relevant evidence found in knowledge base. ';
    }
    explanation +=
      'Strongly recommend consulting authoritative sources or specialists before making clinical decisions.';
  }

  return {
    score: adjustedConfidence,
    level,
    requiresDisclaimer,
    suggestedActions,
    explanation,
  };
}

/**
 * Get confidence badge for UI display
 */
export function getConfidenceBadge(score: number): {
  label: string;
  color: string;
  icon: string;
} {
  if (score >= 0.8) {
    return {
      label: 'High Confidence',
      color: 'green',
      icon: '✓',
    };
  } else if (score >= 0.6) {
    return {
      label: 'Moderate Confidence',
      color: 'yellow',
      icon: '⚠',
    };
  } else if (score >= 0.3) {
    return {
      label: 'Low Confidence',
      color: 'orange',
      icon: '⚠',
    };
  } else {
    return {
      label: 'Very Low Confidence',
      color: 'red',
      icon: '⚠️',
    };
  }
}

/**
 * Determine if response should include additional warnings
 */
export function requiresAdditionalWarnings(confidenceScore: ConfidenceScore): boolean {
  return confidenceScore.level === 'low' || confidenceScore.level === 'very-low';
}

/**
 * Generate confidence disclaimer text
 */
export function getConfidenceDisclaimer(confidenceScore: ConfidenceScore): string | null {
  if (!confidenceScore.requiresDisclaimer) {
    return null;
  }

  switch (confidenceScore.level) {
    case 'moderate':
      return '⚠️ **Note:** This response is based on available evidence, but may not comprehensively cover all aspects. Consider consulting current guidelines or specialists for critical clinical decisions.';

    case 'low':
      return '⚠️ **Limited Evidence:** Specific evidence-based resources were limited for this query. This response is based on general clinical principles. Please consult current guidelines, textbooks, or specialists for authoritative guidance.';

    case 'very-low':
      return '⚠️ **Important:** Very limited evidence was found for this specific query. This response should NOT be used for clinical decision-making without consulting authoritative sources or specialists. Consider seeking guidance from experienced clinicians.';

    default:
      return null;
  }
}
