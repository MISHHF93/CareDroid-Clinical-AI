import { beforeEach, describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import FeatureFlagCenter from './FeatureFlagCenter';

describe('FeatureFlagCenter', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders rollout controls for all requested categories and states', () => {
    render(<FeatureFlagCenter />);

    expect(screen.getByRole('heading', { level: 1, name: /feature flag center/i })).toBeInTheDocument();
    for (const category of ['AI', 'Tools', 'Calculators', 'Simulation', 'Maps', 'Fleet', 'IoT', 'Governance']) {
      expect(screen.getByRole('heading', { name: category })).toBeInTheDocument();
    }
    for (const state of ['Enabled', 'Disabled', 'Beta', 'Experimental', 'Locked', 'Subscription required', 'Admin only']) {
      expect(screen.getAllByRole('button', { name: state }).length).toBeGreaterThan(0);
    }
    expect(screen.getByText(/feature flags control rollout posture/i)).toBeInTheDocument();
  });

  it('updates and persists a feature flag override without changing code defaults', () => {
    render(<FeatureFlagCenter />);

    const controls = screen.getByLabelText(/AI Clinical Copilot rollout controls/i);
    fireEvent.click(within(controls).getByRole('button', { name: /disabled/i }));

    expect(within(controls).getByRole('button', { name: /disabled/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(JSON.parse(localStorage.getItem('careDroid.featureFlagOverrides.v1'))).toMatchObject({
      'ai-clinical-copilot': 'disabled',
    });
  });

  it('can reset runtime overrides back to registry defaults', () => {
    localStorage.setItem(
      'careDroid.featureFlagOverrides.v1',
      JSON.stringify({ 'ai-clinical-copilot': 'locked' })
    );

    render(<FeatureFlagCenter />);

    const controls = screen.getByLabelText(/AI Clinical Copilot rollout controls/i);
    expect(within(controls).getByRole('button', { name: /locked/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(screen.getByRole('button', { name: /reset to defaults/i }));

    expect(localStorage.getItem('careDroid.featureFlagOverrides.v1')).toBeNull();
    expect(within(controls).getByRole('button', { name: /^enabled$/i })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });
});
