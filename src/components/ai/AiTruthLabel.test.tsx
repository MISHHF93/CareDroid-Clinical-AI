import { render, screen } from '@testing-library/react';
import {
  AiTruthLabel,
  DEFAULT_PROHIBITED_ACTION_COPY,
  DEFAULT_REVIEW_COPY,
  fromAiChiefRecommendation,
  fromEnhancementMaturity,
  fromNativeAiSourceState,
  hospitalCommandCenterRecommendationsTruthLabel,
  sentinelAiRecommendationsTruthLabel,
} from './AiTruthLabel';

describe('AiTruthLabel', () => {
  it('renders the state chip, source context, review copy, and prohibited-action copy by default', () => {
    render(<AiTruthLabel state="Live" sourceContext="Real trained model" reviewRequired />);

    expect(screen.getByTestId('ai-truth-label-chip')).toHaveTextContent('Live');
    expect(screen.getByTestId('ai-truth-label-context')).toHaveTextContent('Real trained model');
    expect(screen.getByTestId('ai-truth-label-review')).toHaveTextContent(DEFAULT_REVIEW_COPY);
    expect(screen.getByTestId('ai-truth-label-prohibited')).toHaveTextContent(
      DEFAULT_PROHIBITED_ACTION_COPY,
    );
  });

  it('omits the review line entirely when reviewRequired is false', () => {
    render(<AiTruthLabel state="Manual" sourceContext="Deterministic" reviewRequired={false} />);
    expect(screen.queryByTestId('ai-truth-label-review')).not.toBeInTheDocument();
  });

  it('honors custom review and prohibited-action copy', () => {
    render(
      <AiTruthLabel
        state="Stale"
        sourceContext="Degraded model"
        reviewRequired
        reviewCopy="Custom review sentence."
        prohibitedActionCopy="Custom prohibited sentence."
      />,
    );
    expect(screen.getByTestId('ai-truth-label-review')).toHaveTextContent(
      'Custom review sentence.',
    );
    expect(screen.getByTestId('ai-truth-label-prohibited')).toHaveTextContent(
      'Custom prohibited sentence.',
    );
  });

  it('in compact mode, hides the visible detail lines but keeps them in the chip tooltip/aria-label', () => {
    render(<AiTruthLabel state="Demo" sourceContext="Sample data only" reviewRequired compact />);
    expect(screen.queryByTestId('ai-truth-label-context')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-truth-label-review')).not.toBeInTheDocument();
    expect(screen.queryByTestId('ai-truth-label-prohibited')).not.toBeInTheDocument();

    const chip = screen.getByTestId('ai-truth-label-chip');
    expect(chip.getAttribute('title')).toContain('Sample data only');
    expect(chip.getAttribute('title')).toContain(DEFAULT_REVIEW_COPY);
    expect(chip.getAttribute('title')).toContain(DEFAULT_PROHIBITED_ACTION_COPY);
  });

  it('applies a data-truth-state attribute for CSS/test targeting', () => {
    render(<AiTruthLabel state="Stale" sourceContext="x" reviewRequired={false} />);
    expect(screen.getByTestId('ai-truth-label')).toHaveAttribute('data-truth-state', 'Stale');
  });
});

describe('fromNativeAiSourceState', () => {
  it('maps demo and simulated to Demo', () => {
    expect(fromNativeAiSourceState('demo', { sourceContext: 'x' }).state).toBe('Demo');
    expect(fromNativeAiSourceState('simulated', { sourceContext: 'x' }).state).toBe('Demo');
  });

  it('maps shadow to Stale', () => {
    expect(fromNativeAiSourceState('shadow', { sourceContext: 'x' }).state).toBe('Stale');
  });

  it('maps live to Manual by default, NOT Live, since native-ai "live" means actively computing, not model-backed', () => {
    expect(fromNativeAiSourceState('live', { sourceContext: 'x' }).state).toBe('Manual');
  });

  it('maps live to Live only when the caller proves the source is a real trained model', () => {
    expect(
      fromNativeAiSourceState('live', { sourceContext: 'x', backedByTrainedModel: true }).state,
    ).toBe('Live');
  });

  it('defaults reviewRequired to true and honors an explicit override', () => {
    expect(fromNativeAiSourceState('live', { sourceContext: 'x' }).reviewRequired).toBe(true);
    expect(
      fromNativeAiSourceState('live', { sourceContext: 'x', reviewRequired: false }).reviewRequired,
    ).toBe(false);
  });
});

describe('fromEnhancementMaturity', () => {
  it('maps demo, planned, and missing to Demo', () => {
    expect(fromEnhancementMaturity('demo', { sourceContext: 'x' }).state).toBe('Demo');
    expect(fromEnhancementMaturity('planned', { sourceContext: 'x' }).state).toBe('Demo');
    expect(fromEnhancementMaturity('missing', { sourceContext: 'x' }).state).toBe('Demo');
  });

  it('maps partial to Stale', () => {
    expect(fromEnhancementMaturity('partial', { sourceContext: 'x' }).state).toBe('Stale');
  });

  it('maps live to Manual by default, and to Live only when model-backed is proven', () => {
    expect(fromEnhancementMaturity('live', { sourceContext: 'x' }).state).toBe('Manual');
    expect(
      fromEnhancementMaturity('live', { sourceContext: 'x', backedByTrainedModel: true }).state,
    ).toBe('Live');
  });
});

describe('fromAiChiefRecommendation', () => {
  it('maps every real modelOrRuleId shape (rule-x, ai-chief-v1, operational-workflow-v1) to Manual', () => {
    expect(fromAiChiefRecommendation({ modelOrRuleId: 'rule-operational-baseline-v1' }).state).toBe(
      'Manual',
    );
    expect(fromAiChiefRecommendation({ modelOrRuleId: 'ai-chief-v1' }).state).toBe('Manual');
    expect(fromAiChiefRecommendation({ modelOrRuleId: 'operational-workflow-v1' }).state).toBe(
      'Manual',
    );
  });

  it('maps to Live only when modelOrRuleId names one of the 2 real trained models', () => {
    expect(fromAiChiefRecommendation({ modelOrRuleId: 'nlu-classifier-v2' }).state).toBe('Live');
    expect(fromAiChiefRecommendation({ modelOrRuleId: 'artifact-router' }).state).toBe('Live');
  });

  it('always requires review', () => {
    expect(fromAiChiefRecommendation({ modelOrRuleId: 'rule-x' }).reviewRequired).toBe(true);
  });
});

describe('sentinelAiRecommendationsTruthLabel', () => {
  it('reports Manual with a rule-based, review-required source context', () => {
    const info = sentinelAiRecommendationsTruthLabel();
    expect(info.state).toBe('Manual');
    expect(info.sourceContext).toMatch(/rule-based/i);
    expect(info.sourceContext).toMatch(/not a trained model/i);
    expect(info.reviewRequired).toBe(true);
  });
});

describe('hospitalCommandCenterRecommendationsTruthLabel', () => {
  it('reports Manual with a rule-based, review-required source context', () => {
    const info = hospitalCommandCenterRecommendationsTruthLabel();
    expect(info.state).toBe('Manual');
    expect(info.sourceContext).toMatch(/rule-based/i);
    expect(info.sourceContext).toMatch(/not a trained model/i);
    expect(info.reviewRequired).toBe(true);
  });
});
