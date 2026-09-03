import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import PublicDisplaySituationBrief from './PublicDisplaySituationBrief';
import type { PublicWaitingDisplaySnapshot } from './publicWaitingDisplayModel';

const snapshot: PublicWaitingDisplaySnapshot = {
  waitRange: {
    label: 'Typical wait',
    value: '30–60 min',
    detail: 'Varies by urgency',
    disclaimer: 'Estimate only',
  },
  crowdLevel: { label: 'Moderate', tone: 'watch', detail: 'Busy but flowing' },
  triageWait: {
    label: 'Triage wait',
    value: '15 min',
    detail: 'Estimate',
    available: true,
    disclaimer: 'Estimate only',
  },
  careStages: [{ id: 'registration', label: 'Registration', count: 3 }],
  processEducation: null as any,
  statusMessaging: {
    statusLines: [],
    advisories: ['Crowding may extend waits'],
    escalationMessage: 'Ask staff if worse',
  } as any,
  guidanceMessages: [],
  escalationMessage: 'Ask staff if symptoms worsen',
  waitDisclaimer: 'Not personal status',
  emsCrowdingImpact: { active: false } as any,
  summaryLine: 'Department is moderately busy',
  updatedAt: new Date().toISOString(),
};

describe('PublicDisplaySituationBrief', () => {
  it('renders PHI-safe four-question strip', () => {
    render(<PublicDisplaySituationBrief snapshot={snapshot} />);
    expect(screen.getByLabelText('Waiting room status summary')).toBeTruthy();
    expect(screen.getByText('Happening now')).toBeTruthy();
    expect(screen.getByText('Needs attention')).toBeTruthy();
    expect(screen.getByText('Who can help')).toBeTruthy();
    expect(screen.getByText('What happens next')).toBeTruthy();
    expect(screen.getByText('Department is moderately busy')).toBeTruthy();
    expect(screen.getByText('Front desk and triage staff')).toBeTruthy();
  });
});
