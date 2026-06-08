import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ProductIntelligenceLayerPage } from './CommercialPages';

vi.mock('./CommercialPages.css', () => ({}));

describe('ProductIntelligenceLayerPage', () => {
  it('renders product value metrics and value-chain evidence', () => {
    render(<ProductIntelligenceLayerPage />);

    expect(screen.getByRole('heading', { level: 1, name: /product intelligence/i })).toBeInTheDocument();
    expect(screen.getByText('Products measured')).toBeInTheDocument();
    expect(screen.getByText('Avg adoption')).toBeInTheDocument();
    expect(screen.getByText('Avg ROI')).toBeInTheDocument();
    expect(screen.getByText('Avg health')).toBeInTheDocument();
    expect(screen.getByText('Avg engagement')).toBeInTheDocument();
    expect(screen.getByText('Emergency Department Solution')).toBeInTheDocument();
    expect(screen.getByText('Hospital Operations Command Center')).toBeInTheDocument();
    expect(screen.getByText('AI Governance Suite')).toBeInTheDocument();
    expect(screen.getAllByText('Packs').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Assets').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Outcomes').length).toBeGreaterThan(0);
    expect(screen.getByText('qSOFA calculator (calculator)')).toBeInTheDocument();
    expect(screen.getByText(/Triage standardization:/)).toBeInTheDocument();
  });
});
