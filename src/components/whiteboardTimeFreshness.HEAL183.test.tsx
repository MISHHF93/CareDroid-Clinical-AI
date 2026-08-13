import { describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

/**
 * HEAL-183: 5 whiteboard strip components (TriageBreachStrip, ProviderWaitBreachStrip,
 * WaitingRoomSafetyBoard, WaitingRoomSafetyEscalationStrip, EmsOffloadAggregateStrip) memoized
 * their time-dependent snapshot on patient/settings-shaped deps alone, so a patient could cross
 * a breach/overdue threshold purely from time passing and the strip would never notice until an
 * unrelated mutation forced a re-render — the same bug class HEAL-182 fixed for
 * FullJourneyOperatingPage. Rather than reconstructing each service's full breach-threshold
 * fixture (heavy, and not what's actually being verified), these tests mock each builder and
 * assert it's invoked with a fresh `now` when the component's `now` prop changes across a
 * rerender with the same patients array — proving the prop is actually threaded into the memo
 * dependency, which is the exact mechanism that was missing.
 */

vi.mock('../services/triageBreachTimer', () => ({
  buildTriageBreachAttentionSnapshot: vi.fn(() => ({ summary: { breachedCount: 0, breachRiskCount: 0 } })),
}));
vi.mock('../services/triageBreachVisibilityModel', () => ({
  buildTriageBreachVisibilitySnapshot: vi.fn(() => ({})),
  hasTriageBreachVisibilityActivity: vi.fn(() => false),
}));

vi.mock('../services/providerWaitBreachTimer', () => ({
  buildProviderWaitBreachAttentionSnapshot: vi.fn(() => ({
    summary: { approachingThresholdCount: 0, breachedCount: 0 },
  })),
}));
vi.mock('../services/providerWaitVisibilityModel', () => ({
  buildProviderWaitVisibilitySnapshot: vi.fn(() => ({})),
  hasProviderWaitVisibilityActivity: vi.fn(() => false),
}));

vi.mock('./whiteboard/waitingRoomSafetyBoardModel', () => ({
  buildWaitingRoomSafetyBoard: vi.fn(() => ({ summary: { patientCount: 0 }, rows: [] })),
  shouldShowWaitingRoomSafetyBoard: vi.fn(() => false),
}));

vi.mock('../services/waitingRoomSafetyEscalationVisibilityModel', () => ({
  buildWaitingRoomSafetyEscalationSnapshot: vi.fn(() => ({ escalatedPatientCount: 0 })),
  hasWaitingRoomSafetyEscalationActivity: vi.fn(() => false),
}));

vi.mock('../services/emsOffloadVisibilityModel', () => ({
  buildEmsOffloadVisibilitySnapshot: vi.fn(() => ({ offloadDelaysCount: 0 })),
  hasEmsOffloadVisibilityActivity: vi.fn(() => false),
}));

const patients = [{ id: 'p1' }] as never;

describe('Whiteboard strip components thread now into their builders (HEAL-183)', () => {
  it('TriageBreachStrip re-invokes its builder with an updated now on rerender', async () => {
    const { buildTriageBreachAttentionSnapshot } = await import('../services/triageBreachTimer');
    const TriageBreachStrip = (await import('./triage/TriageBreachStrip')).default;
    const mock = vi.mocked(buildTriageBreachAttentionSnapshot);
    mock.mockClear();

    const { rerender } = render(<TriageBreachStrip patients={patients} now={1000} />);
    const firstNow = mock.mock.calls.at(-1)?.[1]?.now;

    rerender(<TriageBreachStrip patients={patients} now={2000} />);
    const secondNow = mock.mock.calls.at(-1)?.[1]?.now;

    expect(firstNow).toBeInstanceOf(Date);
    expect(secondNow).toBeInstanceOf(Date);
    expect((secondNow as Date).getTime()).not.toBe((firstNow as Date).getTime());
  });

  it('ProviderWaitBreachStrip re-invokes its builder with an updated now on rerender', async () => {
    const { buildProviderWaitBreachAttentionSnapshot } = await import(
      '../services/providerWaitBreachTimer'
    );
    const ProviderWaitBreachStrip = (await import('./provider-wait/ProviderWaitBreachStrip')).default;
    const mock = vi.mocked(buildProviderWaitBreachAttentionSnapshot);
    mock.mockClear();

    const { rerender } = render(<ProviderWaitBreachStrip patients={patients} now={1000} />);
    const firstNow = mock.mock.calls.at(-1)?.[1]?.now;

    rerender(<ProviderWaitBreachStrip patients={patients} now={2000} />);
    const secondNow = mock.mock.calls.at(-1)?.[1]?.now;

    expect(firstNow).toBeInstanceOf(Date);
    expect((secondNow as Date).getTime()).not.toBe((firstNow as Date).getTime());
  });

  it('WaitingRoomSafetyBoard re-invokes its builder with an updated now on rerender', async () => {
    const { buildWaitingRoomSafetyBoard } = await import('./whiteboard/waitingRoomSafetyBoardModel');
    const WaitingRoomSafetyBoard = (await import('./whiteboard/WaitingRoomSafetyBoard')).default;
    const mock = vi.mocked(buildWaitingRoomSafetyBoard);
    mock.mockClear();

    const { rerender } = render(<WaitingRoomSafetyBoard patients={patients} now={1000} />);
    const firstNow = mock.mock.calls.at(-1)?.[1]?.now;

    rerender(<WaitingRoomSafetyBoard patients={patients} now={2000} />);
    const secondNow = mock.mock.calls.at(-1)?.[1]?.now;

    expect(firstNow).toBeInstanceOf(Date);
    expect((secondNow as Date).getTime()).not.toBe((firstNow as Date).getTime());
  });

  it('WaitingRoomSafetyEscalationStrip re-invokes its builder with an updated now on rerender', async () => {
    const { buildWaitingRoomSafetyEscalationSnapshot } = await import(
      '../services/waitingRoomSafetyEscalationVisibilityModel'
    );
    const WaitingRoomSafetyEscalationStrip = (
      await import('./waiting-room/WaitingRoomSafetyEscalationStrip')
    ).default;
    const mock = vi.mocked(buildWaitingRoomSafetyEscalationSnapshot);
    mock.mockClear();

    const { rerender } = render(<WaitingRoomSafetyEscalationStrip patients={patients} now={1000} />);
    const firstNow = mock.mock.calls.at(-1)?.[1]?.now;

    rerender(<WaitingRoomSafetyEscalationStrip patients={patients} now={2000} />);
    const secondNow = mock.mock.calls.at(-1)?.[1]?.now;

    expect(firstNow).toBeInstanceOf(Date);
    expect((secondNow as Date).getTime()).not.toBe((firstNow as Date).getTime());
  });

  it('EmsOffloadAggregateStrip re-invokes its builder with an updated now on rerender', async () => {
    const { buildEmsOffloadVisibilitySnapshot } = await import('../services/emsOffloadVisibilityModel');
    const EmsOffloadAggregateStrip = (await import('./ems/EmsOffloadAggregateStrip')).default;
    const mock = vi.mocked(buildEmsOffloadVisibilitySnapshot);
    mock.mockClear();

    const { rerender } = render(<EmsOffloadAggregateStrip emsArrivals={patients} now={1000} />);
    const firstNow = mock.mock.calls.at(-1)?.[1]?.now;

    rerender(<EmsOffloadAggregateStrip emsArrivals={patients} now={2000} />);
    const secondNow = mock.mock.calls.at(-1)?.[1]?.now;

    expect(firstNow).toBeInstanceOf(Date);
    expect((secondNow as Date).getTime()).not.toBe((firstNow as Date).getTime());
  });
});
