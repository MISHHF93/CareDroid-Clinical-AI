import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import StateSourceNotice from './StateSourceNotice';
import { DEMO_LIVE_STATES } from '../utils/demoLiveState';

describe('StateSourceNotice', () => {
  it('renders visible demo, backend-unavailable, and unsupported labels', () => {
    render(
      <StateSourceNotice
        title="Demo/live test source states"
        states={[
          DEMO_LIVE_STATES.DEMO,
          DEMO_LIVE_STATES.BACKEND_UNAVAILABLE,
          DEMO_LIVE_STATES.UNSUPPORTED,
        ]}
        details="Test source details."
      />
    );

    const notice = screen.getByRole('note', { name: /demo\/live source state/i });
    expect(within(notice).getByText(/demo\/live test source states/i)).toBeInTheDocument();
    expect(within(notice).getByText(/^demo$/i)).toBeInTheDocument();
    expect(within(notice).getByText(/^backend unavailable$/i)).toBeInTheDocument();
    expect(within(notice).getByText(/^unsupported$/i)).toBeInTheDocument();
    expect(within(notice).getByText(/test source details/i)).toBeInTheDocument();
  });
});
