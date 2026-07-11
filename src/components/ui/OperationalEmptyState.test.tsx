import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import OperationalEmptyState, { OperationalEmptyAction } from './OperationalEmptyState';

describe('OperationalEmptyState', () => {
  it('renders guidance, status, next steps, and actions', () => {
    render(
      <OperationalEmptyState
        title="No patients"
        guidance="Register walk-ins from reception."
        status="Board is clear"
        nextSteps={['Open reception', 'Check EMS feed']}
        actions={<OperationalEmptyAction onClick={() => {}}>Register walk-in</OperationalEmptyAction>}
      />,
    );

    expect(screen.getByRole('status', { name: 'No patients' })).toBeTruthy();
    expect(screen.getByText('Register walk-ins from reception.')).toBeTruthy();
    expect(screen.getByText('Board is clear')).toBeTruthy();
    expect(screen.getByText('Open reception')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Register walk-in' })).toBeTruthy();
  });
});
