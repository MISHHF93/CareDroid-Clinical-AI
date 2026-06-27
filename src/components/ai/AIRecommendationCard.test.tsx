import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CareDroidAIResponse } from '../../lib/ai/careDroidAI';
import { AIRecommendationCard } from './AIRecommendationCard';

const response: CareDroidAIResponse = {
  intent: 'triage_recommendation',
  status: 'success',
  data: {
    recommendedTriageLevel: 'P2',
    recommendation: 'Review patient with triage nurse now.',
    missingFields: ['Current medication list'],
  },
  confidence: 0.82,
  reasoning: ['Chest pain and low oxygen saturation were submitted.'],
  warnings: ['Current medication list is incomplete.'],
  nextActions: ['Confirm vitals.', 'Document clinician override if changed.'],
  requiresClinicianReview: true,
  generatedAt: '2026-06-27T12:00:00.000Z',
};

describe('AIRecommendationCard', () => {
  it('renders explainable recommendation details and review controls', () => {
    const onAccept = vi.fn();
    const onModify = vi.fn();
    const onDismiss = vi.fn();

    render(
      <AIRecommendationCard
        response={response}
        title="Triage recommendation"
        onAccept={onAccept}
        onModify={onModify}
        onDismiss={onDismiss}
      />,
    );

    expect(screen.getByRole('article', { name: /triage recommendation/i })).toBeInTheDocument();
    expect(screen.getByText('Review patient with triage nurse now.')).toBeInTheDocument();
    expect(screen.getByText(/82% confidence/i)).toBeInTheDocument();
    expect(screen.getByText('Current medication list')).toBeInTheDocument();
    expect(screen.getByText(/decision support only/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /accept/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /modify/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dismiss/i })).toBeInTheDocument();
  });
});
