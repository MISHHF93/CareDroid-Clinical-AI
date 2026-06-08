import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { WorkspaceDependencyGraphPage } from './PlatformOSPages';

vi.mock('./PlatformOSPages.css', () => ({}));

describe('WorkspaceDependencyGraphPage', () => {
  it('renders required cross-workspace dependency relationships', () => {
    render(<WorkspaceDependencyGraphPage />);

    expect(screen.getByRole('heading', { level: 1, name: /workspace dependency graph/i })).toBeInTheDocument();
    expect(screen.getAllByText('Emergency -> ICU').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Laboratory -> Cardiology').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Medical IoT -> Fleet -> Operations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Emergency -> ICU', { selector: 'strong' }).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Laboratory -> Cardiology', { selector: 'strong' }).length).toBeGreaterThan(0);
    expect(screen.getByText('Medical IoT -> Fleet', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('Fleet -> Operations', { selector: 'strong' })).toBeInTheDocument();
  });
});
