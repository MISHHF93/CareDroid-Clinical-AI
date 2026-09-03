import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AccountableRecommendationCard } from './AccountableRecommendationCard';
import {
  createAccountableRecommendation,
  createAiUnavailableAbstention,
} from '../../contracts/accountableAi';

describe('AccountableRecommendationCard', () => {
  it('renders evidence, model, prompt version, and AI badge for ok assist', () => {
    const rec = createAccountableRecommendation({
      content: 'Consider sepsis workup if criteria met',
      evidence: [{ sourceId: 's1', citation: 'Sepsis Hour-1 Bundle', score: 0.9 }],
      confidence: 0.84,
      model: { provider: 'offline', name: 'hash-assist', version: '1' },
      promptVersion: 'clinical@3',
      corpusVersion: 2,
    });

    render(<AccountableRecommendationCard recommendation={rec} />);

    expect(screen.getByTestId('accountable-recommendation-card')).toBeInTheDocument();
    expect(screen.getByText(/Sepsis Hour-1 Bundle/i)).toBeInTheDocument();
    expect(screen.getByText(/offline\/hash-assist@1/i)).toBeInTheDocument();
    expect(screen.getByText(/Prompt: clinical@3/i)).toBeInTheDocument();
    expect(screen.getByText(/Decision support only/i)).toBeInTheDocument();
    expect(screen.getByTestId('accountable-safety-status')).toHaveTextContent(/Assist/i);
  });

  it('renders abstain state with human review required', () => {
    const rec = createAiUnavailableAbstention({ reason: 'circuit_open', provider: 'groq' });
    render(<AccountableRecommendationCard recommendation={rec} />);
    expect(screen.getByTestId('accountable-safety-status')).toHaveTextContent(/Abstained/i);
    expect(screen.getByText(/Human review required/i)).toBeInTheDocument();
    expect(screen.getByText(/No confidence score/i)).toBeInTheDocument();
  });
});
