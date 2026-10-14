import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import { DensityProvider } from '../../contexts/DensityContext';
import DensityToggle from './DensityToggle';

describe('DensityToggle', () => {
  it('renders toggle button with accessible label and title', () => {
    render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );

    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button.getAttribute('aria-label')).toMatch(/Switch to (compact|comfortable) density/);
  });

  it('toggles density and aria-label when clicked', async () => {
    const user = userEvent.setup();
    render(
      <DensityProvider>
        <DensityToggle />
      </DensityProvider>,
    );

    const button = screen.getByRole('button');
    const initialLabel = button.getAttribute('aria-label');

    await user.click(button);
    const newLabel = button.getAttribute('aria-label');
    expect(newLabel).not.toBe(initialLabel);
  });
});
