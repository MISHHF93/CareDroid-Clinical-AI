import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReceptionJourneyTimeline, { type ReceptionJourneyStage } from './ReceptionJourneyTimeline';

const STAGES: ReceptionJourneyStage[] = [
  { id: 'arrived', label: 'Arrived (30m)', count: 2, avgWaitMinutes: null, queueTab: null, tone: 'neutral' },
  {
    id: 'registration',
    label: 'Registration / ID check',
    count: 1,
    avgWaitMinutes: 12,
    queueTab: 'verification',
    tone: 'attention',
  },
  {
    id: 'waiting-for-triage',
    label: 'Waiting for triage nurse',
    count: 3,
    avgWaitMinutes: 49,
    queueTab: 'pretriage',
    tone: 'critical',
    badge: '1 rapid review',
  },
];

describe('ReceptionJourneyTimeline', () => {
  it('renders every stage with its label, count, and wait context', () => {
    render(<ReceptionJourneyTimeline stages={STAGES} />);

    expect(screen.getByText('Arrived (30m)')).toBeInTheDocument();
    expect(screen.getByText('Not yet waiting')).toBeInTheDocument();
    expect(screen.getByText('Avg wait 12m')).toBeInTheDocument();
    expect(screen.getByText('Avg wait 49m')).toBeInTheDocument();
    expect(screen.getByText('1 rapid review')).toBeInTheDocument();
  });

  it('renders stages without a queueTab as non-interactive, and stages with one as buttons', () => {
    render(<ReceptionJourneyTimeline stages={STAGES} onSelectStage={vi.fn()} />);

    const arrivedStage = screen.getByText('Arrived (30m)').closest('div');
    expect(arrivedStage?.tagName).toBe('DIV');

    const registrationStage = screen.getByText('Registration / ID check').closest('button');
    expect(registrationStage).not.toBeNull();
  });

  it('calls onSelectStage with the stage\'s queueTab when a clickable stage is activated', async () => {
    const user = userEvent.setup();
    const onSelectStage = vi.fn();
    render(<ReceptionJourneyTimeline stages={STAGES} onSelectStage={onSelectStage} />);

    await user.click(screen.getByText('Waiting for triage nurse'));
    expect(onSelectStage).toHaveBeenCalledWith('pretriage');
  });

  it('marks the stage matching activeQueueTab with aria-current="step"', () => {
    render(<ReceptionJourneyTimeline stages={STAGES} activeQueueTab="verification" onSelectStage={vi.fn()} />);

    const activeStage = screen.getByText('Registration / ID check').closest('button');
    expect(activeStage).toHaveAttribute('aria-current', 'step');

    const inactiveStage = screen.getByText('Waiting for triage nurse').closest('button');
    expect(inactiveStage).not.toHaveAttribute('aria-current');
  });

  it('does not throw and renders no stages when given an empty list', () => {
    render(<ReceptionJourneyTimeline stages={[]} />);
    expect(screen.getByLabelText('Reception patient flow')).toBeEmptyDOMElement();
  });
});
