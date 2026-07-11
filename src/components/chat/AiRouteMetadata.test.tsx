import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import AiRouteMetadata from './AiRouteMetadata';

describe('AiRouteMetadata', () => {
  it('renders selected experts, score, cost, and review state', () => {
    const props = {
      aiFoundation: {
        route: 'medical_reference',
        selectedExpert: 'cardiology',
        selectedExperts: [
          {
            expertId: 'cardiology',
            role: 'primary',
            confidence: 0.82,
            score: 6.42,
          },
          {
            expertId: 'pulmonology',
            role: 'supporting',
            confidence: 0.58,
            score: 4.11,
          },
        ],
        retrievalPolicy: 'guideline',
        confidence: 0.82,
        routeScore: 6.42,
        estimatedCost: 0.14,
        routingMode: 'multi_expert',
        requiresHumanReview: true,
      },
      aiGateway: {
        pipeline: [
          { stage: 'ai_gateway', status: 'complete' },
          { stage: 'intent_classifier', status: 'complete' },
          { stage: 'tool_orchestrator', status: 'planned' },
        ],
      },
    } as unknown as React.ComponentProps<typeof AiRouteMetadata>;
    render(<AiRouteMetadata {...props} />);

    const panel = screen.getByLabelText(/ai routing metadata/i);
    expect(within(panel).getByText(/expert: cardiology/i)).toBeInTheDocument();
    expect(within(panel).getByText(/support: pulmonology/i)).toBeInTheDocument();
    expect(within(panel).getByText(/intent: medical reference/i)).toBeInTheDocument();
    expect(within(panel).getByText(/retrieval: guideline/i)).toBeInTheDocument();
    expect(within(panel).getByText(/mode: multi expert/i)).toBeInTheDocument();
    expect(within(panel).getByText(/ai gateway: complete/i)).toBeInTheDocument();
    expect(within(panel).getByText(/tool orchestrator: planned/i)).toBeInTheDocument();
    expect(within(panel).getByText('82%')).toBeInTheDocument();
    expect(within(panel).getByText('6.42')).toBeInTheDocument();
    expect(within(panel).getByText('$0.1400')).toBeInTheDocument();
    expect(within(panel).getByText(/human review/i)).toBeInTheDocument();
  });

  it('does not render when metadata is absent', () => {
    const { container } = render(
      <AiRouteMetadata {...({} as unknown as React.ComponentProps<typeof AiRouteMetadata>)} />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
