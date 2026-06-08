import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { CareDroidBusinessBrainPage } from './PlatformOSPages';

describe('CareDroidBusinessBrainPage', () => {
  it('renders business analytics aggregates and recommendations', () => {
    render(<CareDroidBusinessBrainPage />);

    expect(screen.getByRole('heading', { level: 1, name: /business brain/i })).toBeInTheDocument();
    expect(screen.getByText('SaaS analytics')).toBeInTheDocument();
    expect(screen.getByText('Organization analytics')).toBeInTheDocument();
    expect(screen.getByText('Workspace analytics')).toBeInTheDocument();
    expect(screen.getByText('Asset analytics')).toBeInTheDocument();
    expect(screen.getByText('AI analytics')).toBeInTheDocument();
    expect(screen.getByText('Automation analytics')).toBeInTheDocument();
    expect(screen.getByText('Simulation analytics')).toBeInTheDocument();
    expect(screen.getAllByText(/Expand Emergency Flow Intelligence Platform/).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Retire low-signal legacy protocol pack').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Merge protocol lookup and workflow builder assets').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Onboard customers with low activation and high expansion fit').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Train .* on measurable platform outcomes/).length).toBeGreaterThan(0);
  });
});
