import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import Button from './button';

describe('Button component', () => {
  it('renders default button with primary variant and md size', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: 'Click me' });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('btn', 'btn-primary', 'btn-md');
  });

  it('applies variant and size classes correctly', () => {
    const { rerender } = render(
      <Button variant="secondary" size="xs">
        Action
      </Button>,
    );
    let button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveClass('btn-secondary', 'btn-xs');

    rerender(
      <Button variant="danger" size="lg" compact fullWidth>
        Action
      </Button>,
    );
    button = screen.getByRole('button', { name: 'Action' });
    expect(button).toHaveClass('btn-danger', 'btn-lg', 'btn-compact', 'btn-full');
  });

  it('detects icon-only button and applies btn-icon-only class', () => {
    render(<Button leftIcon={<span data-testid="icon">★</span>} aria-label="Star" />);
    const button = screen.getByRole('button', { name: 'Star' });
    expect(button).toHaveClass('btn-icon-only');
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });

  it('renders loading state with spinner and disables button', () => {
    render(<Button loading>Processing</Button>);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button.querySelector('.btn-spinner')).toBeInTheDocument();
  });

  it('renders disabledReason with accessible description', () => {
    render(
      <Button disabled disabledReason="Insufficient permissions">
        Restricted
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Restricted' });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('title', 'Insufficient permissions');
    const describedBy = button.getAttribute('aria-describedby');
    expect(describedBy).toBeTruthy();
    const reasonEl = document.getElementById(describedBy!);
    expect(reasonEl).toHaveTextContent('Insufficient permissions');
  });

  it('handles user click events when enabled', async () => {
    const user = userEvent.setup();
    const handleClick = vi.fn();
    render(<Button onClick={handleClick}>Submit</Button>);
    await user.click(screen.getByRole('button', { name: 'Submit' }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
